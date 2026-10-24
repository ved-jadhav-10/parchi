"""Check every daily dose maximum against the sentence in the label it came from.

    python data/limit_evidence.py                      # verify all rows, exit code 1 on any problem
    python data/limit_evidence.py --find fda_spl <set_id> "<regex>"   # print candidate quotes from a source

Evidence rows live in curated/limit_evidence.csv: one row per (ingredient, band, source). A row is good when
its quote appears word for word in the source text, the quoted number appears in the quote, and
quoted_number x multiplier = max (multiplier turns "6 caplets" of 500 mg into 3,000 mg).

The value in src/engine/limits/limits.json must be the lowest max among the rows marked use=limit for that
ingredient and band. Rows marked use=reference are kept as evidence (an OTC cap where a prescription label allows
more, a dose for one indication only) but do not set the limit; `notes` says why. Sources are cached in
data/raw/label_cache/ (gitignored), so re-runs are offline. Source kinds: fda_spl (openFDA set id), uk_smpc (emc
product id), cfr (21 CFR section), web (any URL, for EMA pages and Indian pack inserts).
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EVIDENCE = HERE / "curated" / "limit_evidence.csv"
LIMITS = ROOT / "src" / "engine" / "limits" / "limits.json"
CACHE = HERE / "raw" / "label_cache"
BANDS = {"adult": "max_mg_day", "elderly": "max_mg_day", "paediatric": "max_mg_per_kg_day"}
UA = {"User-Agent": "Mozilla/5.0 (hm02-limit-check/1.0)"}


def source_url(kind: str, source_id: str) -> str:
    if kind == "fda_spl":
        q = urllib.parse.urlencode({"search": f'set_id:"{source_id}"'})
        return f"https://api.fda.gov/drug/label.json?{q}"
    if kind == "uk_smpc":
        return f"https://www.medicines.org.uk/emc/product/{source_id}/smpc"
    if kind == "cfr":
        part = source_id.split(".")[0]
        return f"https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-21?part={part}&section={source_id}"
    if kind == "web":
        return source_id
    raise ValueError(f"unknown source kind {kind!r}")


def normalise(text: str) -> str:
    """Lowercase, entities decoded, tags and bullets dropped, whitespace collapsed: quotes compare on words."""
    # Only real tags: label text has "<1%" and ">50 kg", which a looser pattern would eat whole sections with.
    text = html.unescape(re.sub(r"<[a-zA-Z/!][^<>]*>", " ", text))
    text = text.replace("�", " ").replace("•", " ").replace(" ", " ")
    text = re.sub(r"[‘’]", "'", text)
    text = re.sub(r"[–—]", "-", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def fetch(kind: str, source_id: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = cache_path(kind, source_id)
    if path.exists():
        return path.read_text(encoding="utf-8")
    req = urllib.request.Request(source_url(kind, source_id), headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        body = r.read().decode("utf-8", errors="replace")
    if kind == "fda_spl":
        rec = json.loads(body)["results"][0]
        body = "\n".join(" ".join(v) for v in rec.values() if isinstance(v, list) and v and isinstance(v[0], str))
    text = normalise(body)
    path.write_text(text, encoding="utf-8")
    time.sleep(0.3)
    return text


def cache_path(kind: str, source_id: str) -> Path:
    key = hashlib.sha1(source_id.encode()).hexdigest()[:16] if kind == "web" else source_id
    return CACHE / f"{kind}_{key}.txt"


def cached(kind: str, source_id: str) -> str | None:
    path = cache_path(kind, source_id)
    return path.read_text(encoding="utf-8") if path.exists() else None


def load_rows(path: Path = EVIDENCE) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["max"] = float(r["max"])
        r["quoted_number"] = r["quoted_number"].strip()
        r["multiplier"] = float(r["multiplier"] or 1)
    return rows


def row_problems(r: dict) -> list[str]:
    """Checks that need no network: the number is in the quote and the arithmetic holds."""
    out = []
    tag = f"{r['ingredient']}/{r['band']} {r['source_kind']}:{r['source_id']}"
    if r["band"] not in BANDS:
        out.append(f"{tag}: unknown band {r['band']!r}")
    if r["use"] not in ("limit", "reference"):
        out.append(f"{tag}: use must be limit or reference")
    num = r["quoted_number"].replace(",", "")
    if not re.search(rf"(?<![\d.,]){re.escape(r['quoted_number'])}(?![\d])", r["quote"]):
        out.append(f"{tag}: quoted number {r['quoted_number']!r} is not in the quote")
    if abs(float(num) * r["multiplier"] - r["max"]) > 1e-6:
        out.append(f"{tag}: {num} x {r['multiplier']:g} != max {r['max']:g}")
    return out


def quote_problem(r: dict, text: str) -> str | None:
    if normalise(r["quote"]) not in text:
        return f"{r['ingredient']}/{r['band']} {r['source_kind']}:{r['source_id']}: quote not found word for word in the source"
    return None


def limit_from_evidence(rows: list[dict]) -> dict[tuple[str, str], dict]:
    """(ingredient, band) -> {value: lowest limit-row max, highest: highest limit-row max, rows}."""
    out: dict[tuple[str, str], dict] = {}
    for r in rows:
        if r["use"] != "limit":
            continue
        e = out.setdefault((r["ingredient"], r["band"]), {"value": r["max"], "highest": r["max"], "rows": []})
        e["value"] = min(e["value"], r["max"])
        e["highest"] = max(e["highest"], r["max"])
        e["rows"].append(r)
    return out


def limits_problems(rows: list[dict], limits: dict) -> list[str]:
    out = []
    ingredients = limits["ingredients"]
    for (ing, band), e in limit_from_evidence(rows).items():
        entry = ingredients.get(ing, {}).get(band)
        key = BANDS[band]
        if not entry or key not in entry:
            out.append(f"{ing}/{band}: evidence gives {e['value']:g} but limits.json has no {key}")
        elif abs(entry[key] - e["value"]) > 1e-6:
            out.append(f"{ing}/{band}: limits.json {entry[key]:g}, lowest label max {e['value']:g}")
    return out


def unsourced(rows: list[dict], limits: dict) -> list[str]:
    """Limits in limits.json with no use=limit evidence row."""
    have = set(limit_from_evidence(rows))
    return sorted(
        f"{ing}/{band}"
        for ing, entry in limits["ingredients"].items()
        for band, key in BANDS.items()
        if key in entry.get(band, {}) and (ing, band) not in have
    )


def find(kind: str, source_id: str, pattern: str) -> None:
    text = fetch(kind, source_id)
    for m in list(re.finditer(pattern, text, re.I))[:12]:
        print("..", text[max(0, m.start() - 220): m.end() + 120])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--find", nargs=3, metavar=("KIND", "ID", "REGEX"))
    a = ap.parse_args()
    if a.find:
        find(*a.find)
        return 0
    rows = load_rows()
    limits = json.loads(LIMITS.read_text(encoding="utf-8"))
    problems = [p for r in rows for p in row_problems(r)]
    for r in rows:
        try:
            p = quote_problem(r, fetch(r["source_kind"], r["source_id"]))
        except Exception as exc:  # network or parse failure is a problem, not a pass
            p = f"{r['ingredient']}/{r['band']} {r['source_kind']}:{r['source_id']}: could not fetch ({exc})"
        if p:
            problems.append(p)
    problems += limits_problems(rows, limits)
    for p in problems:
        print("PROBLEM", p)
    missing = unsourced(rows, limits)
    print(f"{len(rows)} evidence rows, {len(problems)} problems; {len(missing)} limits with no label quote: {', '.join(missing) or 'none'}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
