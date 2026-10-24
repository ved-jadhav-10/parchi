"""Check every curated brand composition against the source page it cites.

    python data/verify_brands.py        # prints mismatches, exit code 1 if any

Pages are cached in data/raw/brand_pages/ (gitignored). 1mg and Truemeds pages state the
composition as "Composition : Paracetamol (500mg) + ..."; other sources (PDF leaflets, SmPCs)
are reported as SKIP and need a human check.
"""
from __future__ import annotations

import csv
import hashlib
import html
import re
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from rxdata.brands import parse_composition, split_salt_composition  # noqa: E402
from rxdata.ingredients import Registry  # noqa: E402

CACHE = HERE / "raw" / "brand_pages"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
_STATED = re.compile(r"Composition\s*:?\s*(.*?)\s*(?:Marketer details|Manufacturer|About |Product introduction)")


def page_text(url: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (hashlib.sha1(url.encode()).hexdigest()[:16] + ".html")
    if not path.exists():
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            path.write_bytes(r.read())
        time.sleep(1.0)
    raw = path.read_bytes().decode("utf-8", errors="replace")
    raw = re.sub(r"<script[^>]*>.*?</script>|<style.*?</style>", " ", raw, flags=re.S)
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw)))


def stated_composition(url: str) -> str | None:
    m = _STATED.search(page_text(url))
    return m.group(1) if m else None


def key(comps) -> set[tuple[str, float]]:
    return {(c.id, round(c.strength.mg, 4)) for c in comps}


def main() -> int:
    reg = Registry.load()
    bad = checked = skipped = 0
    with open(HERE / "curated" / "brands.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            url = row["source"].strip()
            if not re.match(r"https://www\.(1mg\.com|truemeds\.in)/", url):
                skipped += 1
                print(f"SKIP     {row['brand']}: {url} (not a pack page with a composition line)")
                continue
            try:
                stated = stated_composition(url)
            except Exception as exc:  # network trouble is not a data error
                skipped += 1
                print(f"SKIP     {row['brand']}: {exc}")
                continue
            checked += 1
            # Truemeds writes "Paracetamol/acetaminophen (500 Mg)"; parse_composition handles both styles.
            want = key(parse_composition(split_salt_composition(row["composition"]), reg))
            got = key(parse_composition(split_salt_composition(stated or ""), reg)) if stated else set()
            if want != got:
                bad += 1
                print(f"MISMATCH {row['brand']} [{row['form']}]: csv {sorted(want)} vs page {stated!r}")
    print(f"checked {checked} curated brands against their source pages, {bad} mismatches, {skipped} skipped")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
