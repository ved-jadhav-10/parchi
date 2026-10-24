"""Dosage form and route from a product name and its pack label.

`route` is what Track B needs: only systemic routes count toward the daily mg ledger, so a
diclofenac gel or a ciprofloxacin eye drop must not add to oral NSAID/antibiotic load.
Rules are ordered most specific first ("eye drop" before "drop").
"""
from __future__ import annotations

import re

# (regex on "name + pack label", form, route)
_RULES: list[tuple[str, str, str]] = [
    (r"\beye\s*/\s*ear\b|\beye[- ]?ear\b", "eye_ear_drops", "ophthalmic"),
    (r"\beye\b.*\b(ointment|gel)\b|\b(ophthalmic|opthalmic) (gel|ointment)\b", "eye_ointment", "ophthalmic"),
    (r"\beye\b|\bophthalmic\b|\bopthalmic\b", "eye_drops", "ophthalmic"),
    (r"\bear\b|\botic\b", "ear_drops", "otic"),
    (r"\bnasal\b.*\bspray\b|\bnasal spray\b", "nasal_spray", "nasal"),
    (r"\bnasal\b|\bnose\b", "nasal_drops", "nasal"),
    (r"\brespules?\b|\bnebuli[sz]|\bsolution for inhalation\b", "respules", "inhaled"),
    (r"\brotacaps?\b|\brespicaps?\b|\bmdi\b|\binhaler\b|\btranshaler\b|\bdpi\b|\binhalation\b", "inhaler", "inhaled"),
    (r"\binjections?\b|\binfusion\b|\bprefilled syringe\b|\bpenfill\b|\bflexpen\b|\bcartridge\b|\bvial\b|\bampoule\b", "injection", "parenteral"),
    (r"\bvaginal\b|\bpessar(y|ies)\b|\btablet vt\b", "vaginal", "vaginal"),
    (r"\brectal\b|\bsuppositor(y|ies)\b|\benema\b", "rectal", "rectal"),
    (r"\btransdermal\b|\bpatch(es)?\b", "patch", "transdermal"),
    (r"\bmouth ?wash\b|\bgargle\b|\bmouth paint\b|\bdental\b|\boral gel\b|\bgum paint\b", "oromucosal", "topical"),
    (r"\bdusting powder\b", "dusting_powder", "topical"),
    (r"\bcream\b", "cream", "topical"),
    (r"\bointment\b", "ointment", "topical"),
    (r"\blotion\b", "lotion", "topical"),
    (r"\bshampoo\b", "shampoo", "topical"),
    (r"\bsoap\b|\bbody wash\b|\bface wash\b|\bcleanser\b", "soap", "topical"),
    (r"\bgel\b", "gel", "topical"),
    (r"\bspray\b", "spray", "topical"),
    (r"\bscalp\b|\bserum\b|\bliniment\b|\bpaint\b", "topical_solution", "topical"),
    (r"\boral drops?\b|\bpaediatric drops?\b|\bpediatric drops?\b|\bdrops?\b", "oral_drops", "oral"),
    (r"\bdry syrup\b|\bpowder for oral suspension\b", "dry_syrup", "oral"),
    (r"\bsuspension\b", "suspension", "oral"),
    (r"\bsyrup\b|\bexpectorant\b|\blinctus\b|\belixir\b|\btonic\b", "syrup", "oral"),
    (r"\boral solution\b|\boral liquid\b|\bliquid\b|\bsolution\b", "oral_solution", "oral"),
    (r"\bcapsules?\b|\bcaps?\b|\btranscaps?\b|\bsoftgels?\b", "capsule", "oral"),
    (r"\btablets?\b|\btabs?\b|\bstrips?\b", "tablet", "oral"),
    (r"\bgranules\b|\bsachets?\b|\bpowder\b", "powder", "oral"),
    (r"\blozenges?\b", "lozenge", "oral"),
    (r"\bkit\b", "kit", "oral"),
]
_COMPILED = [(re.compile(p), form, route) for p, form, route in _RULES]

FORMS = sorted({f for _, f, _ in _RULES} | {"other"})
ROUTES = sorted({r for _, _, r in _RULES} | {"other"})
SYSTEMIC_ROUTES = frozenset({"oral", "parenteral", "inhaled", "rectal", "transdermal"})


def detect_form(name: str, pack_label: str = "") -> tuple[str, str]:
    """Return (form, route). The pack label is the more reliable source; the name breaks ties."""
    label = re.sub(r"^\s*\w+ of [\d.]+\s*", "", (pack_label or "").lower())  # "bottle of 100 ml Syrup" -> "ml syrup"
    for text in (f"{label} {name.lower()}", name.lower()):
        for rx, form, route in _COMPILED:
            if rx.search(text):
                return form, route
    return "other", "other"


# Words that name a dosage form inside a product name; the display name is cut before them.
FORM_WORDS = frozenset(
    """
    tablet tablets tab tabs capsule capsules cap caps syrup suspension injection injections infusion
    drop drops cream gel ointment lotion solution spray respules respule rotacap rotacaps inhaler
    soap shampoo powder sachet sachets granules liquid expectorant linctus elixir lozenge lozenges
    kit patch suppository pessary vial ampoule softgel softgels emulsion
    """.split()
)
