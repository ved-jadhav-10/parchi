"""PMBJP (Jan Aushadhi) generic product list -> items with canonical ingredient ids and strengths.

Source: Annexure "The list of 2110 generic medicines under PMBJP till 31.12.2025" (PIB, Lok Sabha reply,
Feb 2026). It has drug code, generic name and unit size, no prices. The name is free text
("Metformin Hydrochloride Prolonged-release 500mg and Glimepiride 2mg Tablets IP"), so items are kept
only when every ingredient has a mass strength we can read; the rest go to a report for review.
A match to a brand is by identical ingredient set and strengths: the pharmacist confirms equivalence.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .forms import detect_form
from .ingredients import Registry
from .units import parse_strength

SOURCE_URL = "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781701.pdf"

# Release modifiers: same mg is not necessarily the same product, so they are carried on the item.
_RELEASE = [
    (r"gastro[- ]?resistant|enteric", "gastro-resistant"),
    (r"prolonged[- ]?release|extended[- ]?release|sustained[- ]?release|modified[- ]?release|controlled[- ]?release", "modified-release"),
    (r"dispersible|oro[- ]?dispersible|mouth dissolving", "dispersible"),
    (r"chewable", "chewable"),
    (r"film[- ]?coated|sublingual|effervescent|soluble", None),
]
_NOISE = re.compile(
    r"\b(tablets?|tabs?|capsules?|caps?|injection|infusion|syrup|oral|suspension|solution|powder|for|vial|wfi|i\.?p\.?|b\.?p\.?|"
    r"u\.?s\.?p\.?|per|ml|film|coated|sublingual|effervescent|soluble|dispersible|chewable|"
    r"gastro[- ]?resistant|enteric|prolonged[- ]?release|extended[- ]?release|sustained[- ]?release|modified[- ]?release|"
    r"controlled[- ]?release|release|dry|gel|cream|ointment|drops?|eye|ear|nasal|spray|lotion|shampoo|sachet)\b",
    re.I,
)
_STRENGTH = re.compile(r"(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|gm|g|iu)\b(?:\s*(?:/|per)\s*(\d+(?:\.\d+)?)?\s*(ml|l)\b)?", re.I)
_SPLIT = re.compile(r"\s+and\s+|\s*\+\s*|\s*,\s*(?![^()]*\))|\s*&\s*", re.I)


@dataclass
class Item:
    code: int
    name: str
    unit: str
    form: str
    route: str
    release: str | None
    ingredients: list[tuple[str, float, float | None]] = field(default_factory=list)  # (id, mg, per_volume_ml)


# Column starts on every page of the annexure (checked on pages 1, 2, 51 and 97).
_X_CODE, _X_NAME, _X_UNIT = 100, 160, 445


def read_rows(pdf_path: Path) -> list[tuple[int, str, str]]:
    """(drug code, name, unit size) for every row of the annexure, read by word position.

    pdfplumber's table finder glues neighbouring rows, so words are bucketed into columns instead.
    A wrapped name continues on a line with nothing left of the name column; it is appended to the row above.
    """
    import pdfplumber  # only needed when rebuilding from the raw PDF

    rows: list[list] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            lines: dict[int, list[dict]] = {}
            for w in page.extract_words():
                lines.setdefault(round(w["top"] / 3), []).append(w)
            for key in sorted(lines):
                ws = sorted(lines[key], key=lambda w: w["x0"])
                left = [w["text"] for w in ws if w["x0"] < _X_NAME]
                name = " ".join(w["text"] for w in ws if _X_NAME <= w["x0"] < _X_UNIT)
                unit = " ".join(w["text"] for w in ws if w["x0"] >= _X_UNIT)
                if len(left) == 2 and all(t.isdigit() for t in left):
                    rows.append([int(left[1]), name, unit])
                elif not left and rows and (name or unit):
                    rows[-1][1] = f"{rows[-1][1]} {name}".strip()
                    rows[-1][2] = f"{rows[-1][2]} {unit}".strip()
    return [(c, re.sub(r"\binection\b", "Injection", n, flags=re.I), u) for c, n, u in rows]


def _release(name: str) -> str | None:
    found = [label for rx, label in _RELEASE if label and re.search(rx, name, re.I)]
    return ", ".join(found) or None


def _component(part: str, reg: Registry) -> tuple[str, float, float | None] | None:
    m = _STRENGTH.search(part)
    if not m:
        return None
    unit = m.group(2).lower()
    amount = float(m.group(1))
    text = m.group(0).lower()
    if m.group(4):  # "25mg per ml", "100 mg per 2 ml"
        text = f"{amount:g}{unit}/{m.group(3) or 1}{m.group(4).lower()}"
    elif unit == "iu":
        return None
    s = parse_strength(text.replace(" ", ""))
    if not s.known or s.other_unit or s.mg <= 0:
        return None
    head = _NOISE.sub(" ", part[: m.start()] or "")
    head = re.sub(r"[()]", " ", head)
    if not head.strip(" -"):  # "Aceclofenac Tablets IP 100 mg": name sits after the strength? no: before the noise words
        head = _NOISE.sub(" ", part[m.end():])
    name = re.sub(r"\s+", " ", re.sub(r"[^A-Za-z \-]", " ", head)).strip(" -")
    if not name:
        return None
    iid = reg.canonical(name)
    return (iid, round(s.mg, 6), s.per_volume_ml) if iid else None


def parse_item(code: int, name: str, unit: str, reg: Registry) -> Item | None:
    form, route = detect_form(name)
    # Strengths that follow the form words ("Aceclofenac Tablets IP 100 mg") belong to the one ingredient.
    parts = [p for p in _SPLIT.split(name) if p.strip()]
    comps = []
    for p in parts:
        c = _component(p if len(parts) > 1 else re.sub(r"\(.*?\)", lambda x: x.group(0) if _STRENGTH.search(x.group(0)) else " ", p), reg)
        if c is None:
            return None
        comps.append(c)
    if not comps or len({c[0] for c in comps}) != len(comps):
        return None
    return Item(code, name, unit, form, route, _release(name), sorted(comps))


def load_items(pdf_path: Path, reg: Registry) -> tuple[list[Item], list[tuple[int, str, str]]]:
    items, unparsed = [], []
    for code, name, unit in read_rows(pdf_path):
        item = parse_item(code, name, unit, reg)
        if item:
            items.append(item)
        else:
            unparsed.append((code, name, unit))
    return items, unparsed
