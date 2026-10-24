"""Compare our incomplete brand compositions with the Kaggle "India Medicines and Drug Info" (1mg 2025) dataset.

    python data/review_diff.py            # writes data/raw/kaggle_1mg_2025/pharmacist_review_diff.json

The Kaggle file is CC BY-NC-SA 4.0. It never feeds the app: build.py does not read it, and this script writes
nothing to data/curated/ or public/data/. Its output is a review list for a pharmacist, kept in the gitignored
data/raw/ because it quotes Kaggle compositions. Only counts (no Kaggle content) go to data/reports/.
A brand changes only when a person checks the pack and adds a row to data/curated/brands.csv with the pack as source.

Kaggle rows are scraped with the first ingredient glued to the manufacturer ("Type of Medicine" =
"strip of 10 tabletsAlpic Biotech LtdAspirin", "Composition" = "(75mg) + Rosuvastatin (20mg)"). The first
ingredient is recovered only when the end of that text is one of our curated ingredient names; otherwise the row is
"unparsed", never guessed.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from rxdata.brands import DEFAULT_SOURCE, Brand, Component, display_name, read_curated, read_dataset, select, split_salt_composition  # noqa: E402
from rxdata.export import popularity_tier  # noqa: E402
from rxdata.forms import detect_form  # noqa: E402
from rxdata.ingredients import SALT_WORDS, Registry, normalise_text  # noqa: E402
from rxdata.units import parse_strength, split_component  # noqa: E402

csv.field_size_limit(10**9)

KAGGLE_DIR = HERE / "raw" / "kaggle_1mg_2025"
KAGGLE_CSV = KAGGLE_DIR / "India Medicines and Drug Info Dataset.csv"
OUT = KAGGLE_DIR / "pharmacist_review_diff.json"
SUMMARY = HERE / "reports" / "kaggle_review_summary.json"
LICENCE = (
    "Contains compositions from 'India Medicines and Drug Info Dataset' (Kaggle, apkaayush, scraped from 1mg 2025), "
    "CC BY-NC-SA 4.0. For pharmacist review only: do not copy into data/curated or public/data. Confirm on the pack."
)
STATUSES = ("adds_ingredients", "strength_conflict", "contradicts", "agrees", "ambiguous", "unparsed")


@dataclass
class KaggleRow:
    name: str
    display: str
    form: str
    components: list[Component] | None  # None = first ingredient not recognised


class FirstIngredient:
    """Find a curated ingredient name at the end of glued text ("...Remedies" + "Gabapentin")."""

    def __init__(self, reg: Registry):
        curated = {a: i for a, i in reg.aliases.items() if i in reg.meta and len(a) >= 4}
        self.by_len = sorted(curated.items(), key=lambda kv: -len(kv[0]))
        self.reg = reg

    def find(self, glued: str) -> tuple[str, str] | None:
        text = normalise_text(glued)
        words = text.split()
        while len(words) > 1 and words[-1] in SALT_WORDS:  # "...Chlorpheniramine Maleate"
            words.pop()
        text = " ".join(words)
        for alias, iid in self.by_len:
            if text.endswith(alias):
                return alias, iid
        return None


_TRAILER = re.compile(r"\s*(?:add|not available)\s*$", re.I)  # the shop button text scraped onto every row
_FIRST_STRENGTH = re.compile(r"\s*\((?=[^)]*\d)")


def composition_text(row: dict) -> tuple[str, str] | None:
    """(glued text ending in the first ingredient name, composition from its strength on).

    "Product Name" carries the whole scrape on every row; "Type of Medicine" and "Composition" are empty for
    out-of-stock rows. The composition starts at the first bracket holding a digit: "...LtdDomperidone (30mg) + ...".
    """
    text = _TRAILER.sub("", row.get("Product Name") or "")
    m = _FIRST_STRENGTH.search(text)
    return (text[: m.start()], text[m.start():].strip()) if m else None


def parse_kaggle(row: dict, first: FirstIngredient, reg: Registry) -> KaggleRow:
    name = (row.get("Medicine Name") or "").strip()
    form, _ = detect_form(name, row.get("Type of Medicine") or "")
    split = composition_text(row)
    found = first.find(split[0]) if split else None
    comps: list[Component] | None = None
    if found:
        parts = split_salt_composition(split[1])
        if parts:
            parts[0] = f"{found[0]} {parts[0]}"
            comps, seen = [], set()
            for part in parts:
                ing, strength = split_component(part)
                iid = reg.canonical(ing)
                if iid and iid not in seen:
                    seen.add(iid)
                    comps.append(Component(iid, parse_strength(strength)))
    return KaggleRow(name, display_name(name) or name, form, comps)


def key(display: str, form: str) -> tuple[str, str]:
    return re.sub(r"\s+", " ", display.lower()).strip(), form


def load_kaggle(path: Path, wanted: set[tuple[str, str]], reg: Registry) -> dict[tuple[str, str], list[KaggleRow]]:
    """Only rows whose name and form match a brand under review (the file has ~350k rows)."""
    first = FirstIngredient(reg)
    out: dict[tuple[str, str], list[KaggleRow]] = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            name = (row.get("Medicine Name") or "").strip()
            if not name:
                continue
            k = key(display_name(name) or name, detect_form(name, row.get("Type of Medicine") or "")[0])
            if k in wanted:
                out.setdefault(k, []).append(parse_kaggle(row, first, reg))
    return out


def _strength(c: Component) -> str:
    s = c.strength
    if not s.known:
        return "?"
    if s.other_unit:
        return f"{s.other_unit[1]:g} {s.other_unit[0]}"
    return f"{s.mg:g} mg" + (f"/{s.per_volume_ml:g} mL" if s.per_volume_ml else "")


def _same_mg(a: Component, b: Component) -> bool:
    x, y = a.strength, b.strength
    if not (x.known and y.known) or x.other_unit or y.other_unit:
        return True  # cannot compare, so not a conflict
    if x.per_volume_ml and y.per_volume_ml:  # 15 mg/5 mL is 30 mg/10 mL
        return abs(x.mg / x.per_volume_ml - y.mg / y.per_volume_ml) < 1e-6
    return abs(x.mg - y.mg) < 1e-6


def compare(ours: Brand, rows: list[KaggleRow]) -> dict:
    parsed = [r for r in rows if r.components]
    entry = {
        "brand": ours.display,
        "form": ours.form,
        "popularity_tier": popularity_tier(ours.rank),
        "ours": [{"id": c.id, "strength": _strength(c)} for c in ours.components],
        "kaggle": [],
        "added": [],
        "missing_in_kaggle": [],
        "strength_conflicts": [],
        "review": {"status": "pending", "pack_checked": None, "reviewer": None, "date": None, "note": None},
    }
    if not parsed:
        entry["status"] = "unparsed"
        entry["kaggle_names"] = sorted({r.name for r in rows})
        return entry
    sigs = {tuple(sorted(c.id for c in r.components)) for r in parsed}
    if len(sigs) > 1:
        entry["status"] = "ambiguous"
        entry["kaggle"] = [[{"id": c.id, "strength": _strength(c)} for c in r.components] for r in parsed]
        return entry
    k = parsed[0].components
    entry["kaggle"] = [{"id": c.id, "strength": _strength(c)} for c in k]
    ours_by = {c.id: c for c in ours.components}
    k_by = {c.id: c for c in k}
    entry["added"] = [{"id": c.id, "strength": _strength(c)} for c in k if c.id not in ours_by]
    entry["missing_in_kaggle"] = [i for i in ours_by if i not in k_by]
    entry["strength_conflicts"] = [
        {"id": i, "ours": _strength(ours_by[i]), "kaggle": _strength(k_by[i])}
        for i in ours_by if i in k_by and not _same_mg(ours_by[i], k_by[i])
    ]
    if entry["missing_in_kaggle"]:
        entry["status"] = "contradicts"
    elif entry["strength_conflicts"]:
        entry["status"] = "strength_conflict"
    elif entry["added"]:
        entry["status"] = "adds_ingredients"
    else:
        entry["status"] = "agrees"
    return entry


def build_diff(incomplete: list[Brand], kaggle: dict[tuple[str, str], list[KaggleRow]], reg: Registry) -> list[dict]:
    def risky(e: dict) -> bool:
        ids = [c["id"] for c in e["ours"] + e["added"]]
        return any(i == "paracetamol" or "nsaid" in reg.meta.get(i, {}).get("classes", []) for i in ids)

    out = []
    for b in incomplete:
        rows = kaggle.get(key(b.display, b.form))
        if rows:
            e = compare(b, rows)
            e["paracetamol_or_nsaid"] = risky(e)
            out.append(e)
    order = {s: n for n, s in enumerate(STATUSES)}
    out.sort(key=lambda e: (order[e["status"]], not e["paracetamol_or_nsaid"], e["popularity_tier"], e["brand"]))
    return out


def incomplete_brands(reg: Registry, top_per_letter: int = 1000) -> list[Brand]:
    """The incomplete, still-marketed brands the app actually ships (same selection as build.py)."""
    dataset = read_dataset(DEFAULT_SOURCE, reg)
    brands = select(dataset, read_curated(HERE / "curated" / "brands.csv", reg), top_per_letter)
    return [b for b in brands if not b.complete and not b.discontinued]


def summary(diff: list[dict], n_incomplete: int) -> dict:
    by = Counter(e["status"] for e in diff)
    return {
        "_note": "Counts only; no Kaggle content. Regenerate with python data/review_diff.py.",
        "incomplete_brands_in_app": n_incomplete,
        "matched_in_kaggle": len(diff),
        "by_status": {s: by.get(s, 0) for s in STATUSES},
        "adds_ingredients_paracetamol_or_nsaid": sum(1 for e in diff if e["status"] == "adds_ingredients" and e["paracetamol_or_nsaid"]),
        "added_ingredient_ids": dict(Counter(a["id"] for e in diff if e["status"] == "adds_ingredients" for a in e["added"]).most_common(15)),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kaggle", type=Path, default=KAGGLE_CSV)
    ap.add_argument("--out", type=Path, default=OUT)
    a = ap.parse_args()
    if not a.kaggle.exists():
        print(f"missing {a.kaggle}; unzip the Kaggle download into {KAGGLE_DIR}", file=sys.stderr)
        return 1
    reg = Registry.load()
    incomplete = incomplete_brands(reg)
    kaggle = load_kaggle(a.kaggle, {key(b.display, b.form) for b in incomplete}, reg)
    diff = build_diff(incomplete, kaggle, reg)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps({"_licence": LICENCE, "brands": diff}, indent=1, ensure_ascii=False), encoding="utf-8")
    s = summary(diff, len(incomplete))
    SUMMARY.write_text(json.dumps(s, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(s, indent=1))
    print(f"review list -> {a.out} (gitignored); counts -> {SUMMARY}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
