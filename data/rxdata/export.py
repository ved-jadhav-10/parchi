"""Write the compact JSON files the app loads from public/data/.

Formats are documented in docs/track-a-data.md and decoded by src/engine/resolver/data.ts.
"""
from __future__ import annotations

import json
from pathlib import Path

from .banned_fdc import EXCIPIENT_LIKE, BannedFdc
from .brands import Brand
from .forms import _RULES, SYSTEMIC_ROUTES
from .ingredients import INORGANIC_BASES, SALT_WORDS, Registry, normalise_text

SCHEMA = 1
FLAG_DISCONTINUED, FLAG_INCOMPLETE, FLAG_CURATED = 1, 2, 4

# Which product forms a banned notification's dosage-form words cover.
BANNED_FORM_RULES = {
    "injection": {"routes": ["parenteral"]},
    "tablet": {"forms": ["tablet"]},
    "capsule": {"forms": ["capsule"]},
    "oral_liquid": {"forms": ["syrup", "suspension", "oral_solution", "oral_drops", "dry_syrup"]},
    "eye_drops": {"routes": ["ophthalmic"]},
    "eye_ointment": {"routes": ["ophthalmic"]},
    "ear_drops": {"routes": ["otic"]},
    "soap": {"forms": ["soap"]},
    "cream": {"forms": ["cream"]},
    "gel": {"forms": ["gel"]},
    "ointment": {"forms": ["ointment"]},
    "lotion": {"forms": ["lotion"]},
    "shampoo": {"forms": ["shampoo"]},
    "dusting_powder": {"forms": ["dusting_powder"]},
    "spray": {"forms": ["spray"]},
}


def popularity_tier(rank: int) -> int:
    return 0 if rank < 50 else 1 if rank < 200 else 2 if rank < 1000 else 3


def _component_json(comp, index: dict[str, int]) -> list:
    s = comp.strength
    i = index[comp.id]
    if not s.known:
        return [i, 0, None, "?"]
    if s.other_unit:
        return [i, 0, None, s.other_unit[0], _num(s.other_unit[1])]
    if s.per_volume_ml is not None:
        if s.volume_assumed:
            return [i, _num(s.mg), _num(s.per_volume_ml), "~"]  # "~": volume inferred, not stated
        return [i, _num(s.mg), _num(s.per_volume_ml)]
    return [i, _num(s.mg)]


def _num(x: float):
    x = round(float(x), 6)
    return int(x) if x == int(x) else x


def write_brands(path: Path, brands: list[Brand], meta: dict) -> dict:
    ingredient_ids = sorted({c.id for b in brands for c in b.components})
    index = {iid: n for n, iid in enumerate(ingredient_ids)}
    forms = sorted({f for _, f, _ in _RULES} | {"other"} | {b.form for b in brands})
    form_route = {f: r for _, f, r in _RULES}
    form_route.setdefault("other", "other")
    for b in brands:
        form_route.setdefault(b.form, b.route)

    comp_index: dict[tuple, int] = {}
    compositions: list[list] = []
    rows: list[list] = []
    curated: dict[str, dict] = {}
    for b in brands:
        sig = tuple(tuple(_component_json(c, index)) for c in b.components)
        ci = comp_index.get(sig)
        if ci is None:
            ci = comp_index[sig] = len(compositions)
            compositions.append([list(x) for x in sig])
        flags = (FLAG_DISCONTINUED if b.discontinued else 0) | (0 if b.complete else FLAG_INCOMPLETE)
        if b.source == "curated":
            flags |= FLAG_CURATED
            curated[str(len(rows))] = b.curated
        rows.append([b.display, ci, forms.index(b.form), flags, popularity_tier(b.rank)])

    doc = {
        "schema": SCHEMA,
        **meta,
        "columns": ["display", "composition", "form", "flags", "popularity_tier"],
        "flag_bits": {"discontinued": FLAG_DISCONTINUED, "composition_incomplete": FLAG_INCOMPLETE, "curated": FLAG_CURATED},
        "forms": forms,
        "form_route": form_route,
        "systemic_routes": sorted(SYSTEMIC_ROUTES),
        "ingredients": ingredient_ids,
        "compositions": compositions,
        "brands": rows,
        "curated": curated,
    }
    _dump(path, doc)
    return {"brands": len(rows), "compositions": len(compositions), "ingredients": len(ingredient_ids)}


def write_ingredients(path: Path, reg: Registry, used_ids: set[str], examples: list[tuple[str, str]], meta: dict) -> dict:
    ids = sorted(used_ids | set(reg.meta))
    ingredients = {}
    for iid in ids:
        m = reg.meta.get(iid)
        entry = {"name": reg.display_name(iid), "curated": m is not None}
        if m:
            if m["atc"]:
                entry["atc"] = m["atc"].split("|")
            if m["classes"]:
                entry["classes"] = m["classes"]
        ingredients[iid] = entry
    aliases = {k: v for k, v in reg.aliases.items() if v in ingredients}
    for iid, seen in reg.seen_names.items():
        if iid in ingredients:
            for raw in seen:
                aliases.setdefault(normalise_text(raw), iid)
    doc = {
        "schema": SCHEMA,
        **meta,
        "ingredients": ingredients,
        "aliases": dict(sorted(aliases.items())),
        "normalise": {"salt_words": sorted(SALT_WORDS), "inorganic_bases": sorted(INORGANIC_BASES)},
        "examples": [list(e) for e in examples],
    }
    _dump(path, doc)
    return {"ingredients": len(ingredients), "curated": sum(1 for v in ingredients.values() if v["curated"]), "aliases": len(aliases)}


def write_banned(path: Path, entries: list[BannedFdc], meta: dict) -> dict:
    doc = {
        "schema": SCHEMA,
        **meta,
        "match_rule": "exact set of active ingredients (excipient-like ids ignored); strengths and form must match when the notification names them",
        "excipient_like": sorted(EXCIPIENT_LIKE),
        "form_rules": BANNED_FORM_RULES,
        "lists": sorted({(e.list, e.date, e.source) for e in entries}),
        "entries": [e.as_json() for e in entries],
    }
    doc["lists"] = [{"list": l, "date": d, "source": s} for l, d, s in doc["lists"]]
    _dump(path, doc)
    return {"entries": len(entries)}


def write_ddi(path: Path, pairs: dict[tuple[str, str], int], ddinter_id: dict[str, str], keep: set[str], meta: dict) -> dict:
    """Pairs where both ingredients are in `keep`, as [i, j, level] over a sorted id table."""
    from .ddinter import LEVELS

    kept = sorted((a, b, lv) for (a, b), lv in pairs.items() if a in keep and b in keep)
    ids = sorted({x for a, b, _ in kept for x in (a, b)})
    index = {iid: n for n, iid in enumerate(ids)}
    doc = {
        "schema": SCHEMA,
        **meta,
        "levels": LEVELS,
        "ingredients": ids,
        "ddinter_ids": {iid: ddinter_id[iid] for iid in ids if iid in ddinter_id},
        "pairs": [[index[a], index[b], lv] for a, b, lv in kept],
    }
    _dump(path, doc)
    return {"pairs": len(kept), "ingredients": len(ids)}


def write_nsq(path: Path, rows: list[dict], meta: dict) -> dict:
    """CDSCO NSQ / spurious rows as columns + tuples. Matched to resolved brands by name in nsq.ts."""
    columns = ["brand", "product", "batch", "mfg", "exp", "manufacturer", "result", "reported_by", "month", "spurious", "remarks"]
    doc = {
        "schema": SCHEMA,
        **meta,
        "months": sorted({r["month"] for r in rows}, key=lambda m: (m[-4:], _MONTHS.index(m[:3]))),
        "columns": columns,
        "entries": [[r.get(c) if c != "spurious" else int(r["spurious"]) for c in columns] for r in rows],
    }
    _dump(path, doc)
    return {"entries": len(rows), "with_brand": sum(1 for r in rows if r["brand"]), "spurious": sum(1 for r in rows if r["spurious"])}


_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def write_janaushadhi(path: Path, items: list, keep: set[str], meta: dict) -> dict:
    """PMBJP items whose ingredients are all known to the app, as [code, name, unit, form, release, [[ing, mg, per_ml?]...]]."""
    kept = [i for i in items if all(iid in keep for iid, _, _ in i.ingredients)]
    ids = sorted({iid for i in kept for iid, _, _ in i.ingredients})
    index = {iid: n for n, iid in enumerate(ids)}
    doc = {
        "schema": SCHEMA,
        **meta,
        "columns": ["code", "name", "unit", "form", "release", "ingredients"],
        "ingredients": ids,
        "items": [
            [i.code, i.name, i.unit, i.form, i.release,
             [[index[iid], _num(mg)] + ([_num(pv)] if pv is not None else []) for iid, mg, pv in i.ingredients]]
            for i in sorted(kept, key=lambda x: x.code)
        ],
    }
    _dump(path, doc)
    return {"items": len(kept), "ingredients": len(ids)}


def banned_matches(entry: BannedFdc, brand: Brand) -> bool:
    """Same rule as src/engine/resolver/banned.ts (kept in sync by a parity test)."""
    ids = sorted({c.id for c in brand.components} - EXCIPIENT_LIKE)
    if ids != entry.ingredients:
        return False
    by_id = {c.id: c.strength for c in brand.components}
    for iid, mg in entry.strengths.items():
        s = by_id.get(iid)
        if s is None or not s.known or abs(s.mg - mg) > 1e-6:
            return False
    if entry.form:
        rule = BANNED_FORM_RULES.get(entry.form, {})
        if "routes" in rule and brand.route not in rule["routes"]:
            return False
        if "forms" in rule and brand.form not in rule["forms"]:
            return False
    return True


def _dump(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
