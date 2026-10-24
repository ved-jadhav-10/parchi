"""Parse strength strings such as "500mg", "30mg/5ml", "0.05% w/v", "150mcg".

Output is always normalised to the contract shape: `mg` per dose unit and, for liquids,
`per_volume_ml`. Strengths that cannot be expressed in mg (IU, % w/w, spores...) are kept in
`other_unit` and `mg` is 0, so nothing downstream mistakes them for a real mg figure.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

_NUM = r"\d+(?:\.\d+)?"
_MASS = {"mg": 1.0, "g": 1000.0, "gm": 1000.0, "gms": 1000.0, "mcg": 0.001, "ug": 0.001, "µg": 0.001, "μg": 0.001}
_VOLUME = {"ml": 1.0, "l": 1000.0, "ltr": 1000.0}

_MASS_RE = re.compile(
    rf"^(?P<amt>{_NUM})(?P<unit>mg|gms|gm|g|mcg|ug|µg|μg)"
    rf"(?:/(?P<den>{_NUM})?(?P<dunit>ml|ltr|l|gm|gms|g))?$"
)
_PERCENT_RE = re.compile(rf"^(?P<amt>{_NUM})%(?P<kind>w/w|w/v|v/v)?$")
_OTHER_RE = re.compile(rf"^(?P<amt>{_NUM})(?P<unit>[a-z][a-z .\-/]*)$")


@dataclass(frozen=True)
class Strength:
    mg: float = 0.0
    per_volume_ml: float | None = None
    other_unit: tuple[str, float] | None = None
    known: bool = True
    raw: str = ""

    def as_json(self) -> dict:
        out: dict = {"mg": _clean(self.mg)}
        if self.per_volume_ml is not None:
            out["per_volume_ml"] = _clean(self.per_volume_ml)
        if self.other_unit:
            out["other_unit"] = {"unit": self.other_unit[0], "amount": _clean(self.other_unit[1])}
        if not self.known:
            out["strength_unknown"] = True
        return out


def _clean(x: float) -> float | int:
    """Round float noise away (0.1 + 0.2) and prefer ints for whole numbers."""
    x = round(float(x), 6)
    return int(x) if x == int(x) else x


def parse_strength(text: str) -> Strength:
    s = (text or "").strip().lower()
    s = s.replace(",", "")
    s = re.sub(r"\s+", " ", s)
    s = re.sub(rf"({_NUM})\s+(?=[a-zµμ%])", r"\1", s)  # "500 mg" -> "500mg"
    s = re.sub(r"\s*/\s*", "/", s)
    s = s.replace("% w/", "%w/")
    if not s or s in {"na", "n/a", "nil", "-"}:
        return Strength(known=False, raw=text or "")

    m = _MASS_RE.match(s)
    if m:
        mg = float(m["amt"]) * _MASS[m["unit"]]
        dunit = m["dunit"]
        if dunit is None:
            return Strength(mg=mg, raw=text)
        if dunit in _VOLUME:
            vol = float(m["den"] or 1) * _VOLUME[dunit]
            return Strength(mg=mg, per_volume_ml=vol, raw=text)
        # mg per gram (ointments, powders): not a per-dose figure
        grams = float(m["den"] or 1) * _MASS[dunit] / 1000.0
        return Strength(other_unit=(f"mg_per_{_clean(grams)}g", mg), raw=text)

    m = _PERCENT_RE.match(s)
    if m:
        pct = float(m["amt"])
        if m["kind"] == "w/v":
            # x% w/v = x g per 100 mL = 10x mg per mL
            return Strength(mg=pct * 10.0, per_volume_ml=1.0, raw=text)
        return Strength(other_unit=(f"percent_{(m['kind'] or 'w/w').replace('/', '')}", pct), raw=text)

    m = _OTHER_RE.match(s)
    if m:
        return Strength(other_unit=(re.sub(r"\s+", "_", m["unit"].strip()), float(m["amt"])), raw=text)

    return Strength(known=False, raw=text or "")


# --- composition components -------------------------------------------------------------

_HAS_DIGIT = re.compile(r"\d")
_TRAILING_PAREN = re.compile(r"^(?P<name>.*?)\s*\((?P<inner>[^()]*)\)\s*$", re.S)


def split_component(text: str) -> tuple[str, str]:
    """"Amoxycillin  (500mg) " -> ("Amoxycillin", "500mg").

    Only the last parenthetical counts as the strength, and only if it contains a digit or is
    the literal "NA". "Progesterone (Natural Micronized) (25mg)" keeps its qualifier in the name.
    """
    t = (text or "").strip()
    m = _TRAILING_PAREN.match(t)
    if m and (_HAS_DIGIT.search(m["inner"]) or m["inner"].strip().lower() == "na"):
        return re.sub(r"\s+", " ", m["name"]).strip(), m["inner"].strip()
    return re.sub(r"\s+", " ", t), ""
