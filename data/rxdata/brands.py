"""Ingest the A-Z Indian medicine dataset into brand records.

Key facts about the source (junioralive/Indian-Medicine-Dataset, MIT, scraped from 1mg, 2022):
  * rows are grouped by first letter and ordered by popularity inside each letter block
    (Dolo 650 is row 0 of "D"), so the in-block rank is our popularity signal;
  * `short_composition1/2` hold at most two ingredients. Only ~3% of rows also carry the full
    `salt_composition`; where both short slots are filled and it is missing, a third ingredient
    may have been dropped (Sinarest-CCF lists 2 of its 5). Those rows are exported with
    `complete: False` so the app can ask the pharmacist instead of under-counting.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path

from .forms import FORM_WORDS, detect_form
from .ingredients import Registry
from .units import Strength, parse_strength, split_component

csv.field_size_limit(10**9)

DEFAULT_SOURCE = Path(__file__).resolve().parents[1] / "raw" / "junioralive" / "DATA" / "updated_indian_medicine_data.csv"


@dataclass
class Component:
    id: str
    strength: Strength

    def signature(self) -> tuple:
        s = self.strength
        return (self.id, s.mg, s.per_volume_ml, s.other_unit, s.known)


@dataclass
class Brand:
    display: str
    form: str
    route: str
    components: list[Component]
    complete: bool
    discontinued: bool
    rank: int  # popularity rank inside its first-letter block, 0 = most popular
    source: str = "dataset"
    curated: dict = field(default_factory=dict)

    @property
    def signature(self) -> tuple:
        return tuple(sorted(c.signature() for c in self.components))

    @property
    def key(self) -> str:
        return line_key(self.display)


# -- names -------------------------------------------------------------------------------

_STRENGTH_TOKEN = re.compile(r"^\d+(?:\.\d+)?(?:mg|mcg|g|gm|ml|iu|%)?(?:/\d+(?:\.\d+)?(?:mg|mcg|g|gm|ml)?)*$")


def display_name(name: str) -> str:
    """"Dolo 650 Tablet" -> "Dolo 650"; "Pan-D Capsule PR" -> "Pan-D"; keeps names that start with a form word."""
    words = name.strip().split()
    for i, w in enumerate(words):
        if i > 0 and re.sub(r"[^a-z]", "", w.lower()) in FORM_WORDS:
            words = words[:i]
            break
    out = " ".join(words).strip(" -,")
    return re.sub(r"\s+", " ", out)


def line_key(display: str) -> str:
    """Strength-free grouping key: "Zerodol-P 100mg/500mg" -> "zerodol p"."""
    t = display.lower().replace("&", " and ")
    t = re.sub(r"[^a-z0-9./%]+", " ", t)
    tokens = [tok for tok in t.split() if not _STRENGTH_TOKEN.match(tok)]
    return " ".join(re.sub(r"[./%]", "", tok) for tok in tokens if re.sub(r"[./%]", "", tok))


# -- compositions --------------------------------------------------------------------------


def parse_composition(text_parts: list[str], reg: Registry) -> list[Component]:
    comps: list[Component] = []
    seen: set[str] = set()
    for part in text_parts:
        if not part or not part.strip():
            continue
        name, strength_text = split_component(part)
        iid = reg.canonical(name)
        if not iid or iid in seen:
            continue
        seen.add(iid)
        comps.append(Component(iid, parse_strength(strength_text)))
    return comps


def split_salt_composition(text: str) -> list[str]:
    return [p for p in re.split(r"\s+\+\s+", text.strip()) if p.strip()]


def read_dataset(path: Path, reg: Registry) -> list[Brand]:
    brands: list[Brand] = []
    block_rank: dict[str, int] = {}
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            name = row["name"].strip()
            if not name:
                continue
            letter = name[:1].upper() if name[:1].isascii() and name[:1].isalpha() else "#"
            rank = block_rank.get(letter, 0)
            block_rank[letter] = rank + 1

            s1, s2 = row["short_composition1"], row["short_composition2"]
            salt = row.get("salt_composition", "").strip()
            salt_parts = split_salt_composition(salt) if salt else []
            if salt_parts and len(salt_parts) >= len([s for s in (s1, s2) if s.strip()]):
                parts, complete = salt_parts, True
            else:
                parts = [s1, s2]
                complete = not s2.strip()  # a single ingredient cannot have been truncated
            comps = parse_composition(parts, reg)
            if not comps:
                continue
            form, route = detect_form(name, row.get("pack_size_label", ""))
            brands.append(
                Brand(
                    display=display_name(name) or name,
                    form=form,
                    route=route,
                    components=comps,
                    complete=complete,
                    discontinued=row["Is_discontinued"].strip().upper() == "TRUE",
                    rank=rank,
                )
            )
    return brands


def read_curated(path: Path, reg: Registry) -> list[Brand]:
    out: list[Brand] = []
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if not row["brand"].strip() or row["brand"].startswith("#"):
                continue
            comps = parse_composition(split_salt_composition(row["composition"]), reg)
            form = row["form"].strip()
            route = detect_form(form)[1]
            out.append(
                Brand(
                    display=row["brand"].strip(),
                    form=form,
                    route=route,
                    components=comps,
                    complete=True,
                    discontinued=row["discontinued"].strip().lower() == "true",
                    rank=0,
                    source="curated",
                    curated={
                        "source": row["source"].strip(),
                        "checked_on": row["checked_on"].strip(),
                        "pharmacist_approved": row["pharmacist_approved"].strip().lower() == "true",
                        "aliases": [a.strip() for a in row["aliases"].split("|") if a.strip()],
                        "notes": row["notes"].strip(),
                    },
                )
            )
    return out


# -- selection -----------------------------------------------------------------------------


def dedupe(brands: list[Brand]) -> list[Brand]:
    """Merge rows with the same display name, form and composition (different pack sizes)."""
    best: dict[tuple, Brand] = {}
    for b in brands:
        k = (b.display.lower(), b.form, b.signature)
        cur = best.get(k)
        if cur is None:
            best[k] = b
            continue
        cur.rank = min(cur.rank, b.rank)
        cur.discontinued = cur.discontinued and b.discontinued
        cur.complete = cur.complete or b.complete
    return list(best.values())


def select(dataset: list[Brand], curated: list[Brand], top_per_letter: int) -> list[Brand]:
    """Keep whole product lines (all strengths/forms) if any variant ranks in its letter's top N.

    Curated brands replace dataset rows with the same display name and form.
    """
    curated_keys = {(b.display.lower(), b.form) for b in curated}
    curated_lines = {b.key for b in curated}
    rows = [b for b in dedupe(dataset) if (b.display.lower(), b.form) not in curated_keys]
    hot_lines = {b.key for b in rows if b.rank < top_per_letter} | curated_lines
    kept = [b for b in rows if b.key in hot_lines]
    return curated + sorted(kept, key=lambda b: (b.key, b.rank))
