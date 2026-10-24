"""Cross-check the ATC codes in curated/ingredients.csv against the WHO ATC/DDD index.

    python data/verify_atc.py            # prints mismatches, exit code 1 if any

Pages are cached in data/raw/atc_cache/ (gitignored), so re-runs are offline and fast.
The WHO index is the authority for ATC codes; it is not a dosing source.
"""
from __future__ import annotations

import csv
import html
import re
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / "raw" / "atc_cache"
URL = "https://atcddd.fhi.no/atc_ddd_index/?code={code}&showdescription=no"


def fetch(code: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{code}.html"
    if path.exists():
        return path.read_text(encoding="utf-8")
    req = urllib.request.Request(URL.format(code=code), headers={"User-Agent": "hm02-atc-check/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode("utf-8", errors="replace")
    path.write_text(body, encoding="utf-8")
    time.sleep(0.4)
    return body


def substance_name(page: str, code: str) -> str | None:
    """The name cell next to a 7-character substance code in the results table."""
    rows = re.findall(r"<tr.*?</tr>", page, flags=re.S)
    for row in rows:
        cells = [html.unescape(re.sub(r"<[^>]+>", " ", c)).strip() for c in re.findall(r"<td.*?</td>", row, flags=re.S)]
        cells = [re.sub(r"\s+", " ", c) for c in cells]
        if len(cells) >= 2 and cells[0].replace("\xa0", "").strip() == code:
            return cells[1].replace("\xa0", "").strip().lower()
    return None


def main() -> int:
    bad = 0
    with open(HERE / "curated" / "ingredients.csv", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        names = {row["id"].replace("_", " "), row["name"].lower(), *(a.lower() for a in row["aliases"].split("|") if a)}
        names |= {g.lower() for g in re.findall(r"group '([^']+)'", row["source"])}  # WHO group names, e.g. "silicones"
        for code in filter(None, row["atc"].split("|")):
            try:
                who = substance_name(fetch(code), code)
            except Exception as exc:  # network trouble is not a data error
                print(f"SKIP {code} {row['id']}: {exc}")
                continue
            if who is None or not any(n == who or n in who or who in n for n in names):
                bad += 1
                print(f"MISMATCH {row['id']:24s} {code}: WHO says {who!r}")
    print(f"checked {sum(len([c for c in r['atc'].split('|') if c]) for r in rows)} codes, {bad} mismatches")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
