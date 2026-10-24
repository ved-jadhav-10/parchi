"""Banned fixed-dose combinations (FDCs) prohibited by the Government of India under Section 26A.

Sources (downloaded by data/fetch_raw.py into data/raw/cdsco/):
  * CDSCO list of 156 prohibited FDCs, S.O. 3285(E)-3440(E) dated 02.08.2024 (official PDF)
  * 16 FDCs prohibited by S.O. 3068(E)-3083(E) issued 11.06.2026 (table in the Medical
    Dialogues report of 20 Jun 2026, which links the gazette copy)

Matching rule used by the app: a product is flagged when its set of active ingredients equals a
banned combination (excipient-like entries such as HPMC or boric acid are ignored on both sides),
and, where the notification names strengths or a dosage form, those must match too.
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from pathlib import Path

from .ingredients import Registry
from .units import parse_strength

LIST_2024 = {
    "list": "CDSCO 156 FDCs (Aug 2024)",
    "date": "2024-08-02",
    "source": "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadNewsFiles/List%20of%20Prohibited%20FDC%20drugs_%20156%20FDCs_%20dated%2002.08.2024.pdf",
}
LIST_2026 = {
    "list": "16 FDCs (Jun 2026)",
    "date": "2026-06-11",
    "source": "https://medicaldialogues.in/news/industry/pharma/health-ministry-bans-16-fdcs-including-amoxicillin-serratiopeptidase-see-full-list-173339",
}

# Listed in some notifications but not therapeutically active; dataset compositions omit them.
EXCIPIENT_LIKE = frozenset(
    {
        "hydroxy_propyl_methyl_cellulose", "hpmc", "methyl_cellulose", "hydroxy_methyl_cellulose",
        "sodium_chloride", "boric_acid", "phenyl_ethyl_alcohol", "glycerine", "glycerin",
        "starch", "soap_noodles", "alcohol", "herbal",
    }
)

# Dosage-form words that may close a banned combination ("... Injection", "... oral liquid").
_FORM_HINTS = [
    ("eye ointment", "eye_ointment"), ("eye drops", "eye_drops"), ("eye drop", "eye_drops"),
    ("ear drops", "ear_drops"), ("topical spray", "spray"), ("oral liquid", "oral_liquid"), ("injection", "injection"), ("tablets", "tablet"),
    ("tablet", "tablet"), ("capsule", "capsule"), ("syrup", "oral_liquid"), ("suspension", "oral_liquid"),
    ("soap", "soap"), ("cream", "cream"), ("gel", "gel"), ("ointment", "ointment"), ("lotion", "lotion"),
    ("shampoo", "shampoo"), ("dusting powder", "dusting_powder"),
]
# Form words printed after a single component: "Aloe vera gel", "Chlorhexidine Gluconate solution".
_COMPONENT_FORM_TAIL = re.compile(r"\s+(?:topical\s+)?(?:spray|solution|gel|eye|cream)$", re.I)
_STRENGTH_IN_NAME = re.compile(r"\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|%\s*w/[wv]|%))\b", re.I)


@dataclass
class BannedFdc:
    so_number: str
    date: str
    list: str
    source: str
    text: str  # combination as printed in the notification (after artifact repair)
    ingredients: list[str] = field(default_factory=list)  # canonical ids, excipients removed
    strengths: dict[str, float] = field(default_factory=dict)  # id -> mg, only where printed
    form: str | None = None
    notes: list[str] = field(default_factory=list)

    def as_json(self) -> dict:
        out = {
            "so": self.so_number,
            "date": self.date,
            "list": self.list,
            "text": self.text,
            "ingredients": self.ingredients,
        }
        if self.strengths:
            out["strengths_mg"] = self.strengths
        if self.form:
            out["form"] = self.form
        return out


# -- 156-FDC PDF -----------------------------------------------------------------------------


def parse_pdf_2024(path: Path) -> list[tuple[str, str]]:
    """Return [(combination text, "S.O.3285 (E)"), ...] in list order (1..156)."""
    import pdfplumber  # only needed when rebuilding from the raw PDF

    rows: list[tuple[str, str]] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_rows = []
            for table in page.extract_tables():
                for r in table:
                    if r and r[0] and re.match(r"^\d+\.?$", r[0].strip()):
                        name = re.sub(r"\s+", " ", (r[1] or "").replace("\n", " ")).strip()
                        notif = re.sub(r"\s+", " ", (r[2] or "").replace("\n", " ")).strip()
                        page_rows.append((name, notif))
            rows.extend(repair_split_first_words(page_rows))
    return rows


def repair_split_first_words(page_rows: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Some PDF pages extract with the first word split: "Cetir izine HCl", "Para cetamol".

    A page is treated as affected when most of its rows start "<short fragment> <lowercase...>";
    on such pages that pattern is re-joined. Genuine two-word names ("Cetyl Myristoleate") keep
    their capitalised second word and are left alone.
    """
    pattern = re.compile(r"^([A-Z][a-z]{1,5}) ([a-z]\w*)")
    hits = sum(1 for name, _ in page_rows if pattern.match(name))
    if not page_rows or hits < len(page_rows) / 2:
        return page_rows
    return [(pattern.sub(r"\1\2", name, count=1), notif) for name, notif in page_rows]


def so_number(notif: str) -> str:
    m = re.search(r"S\.?\s*O\.?\s*(\d+)\s*\(E\)", notif)
    return f"S.O. {m.group(1)}(E)" if m else notif


# -- 16-FDC article table -----------------------------------------------------------------------


def parse_html_2026(path: Path) -> list[tuple[str, str]]:
    t = path.read_text(encoding="utf-8", errors="replace")
    tables = re.findall(r"<table.*?</table>", t, flags=re.S)
    out: list[tuple[str, str]] = []
    for table in tables:
        for row in re.findall(r"<tr.*?</tr>", table, flags=re.S):
            cells = [
                html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", c))).strip()
                for c in re.findall(r"<t[dh].*?</t[dh]>", row, flags=re.S)
            ]
            if len(cells) >= 2 and re.match(r"^\d+\(E\)$", cells[0].replace(" ", "")):
                out.append((cells[1], f"S.O. {cells[0].replace(' ', '')}"))
    return out


# -- normalisation ---------------------------------------------------------------------------------


def normalise(text: str, so: str, meta: dict, reg: Registry) -> BannedFdc:
    entry = BannedFdc(so_number=so, date=meta["date"], list=meta["list"], source=meta["source"], text=text)
    body = text.strip()
    low = body.lower()
    for word, form in _FORM_HINTS:
        if low.endswith(" " + word):
            entry.form = form
            body = body[: -len(word)].strip()
            break
    for part in re.split(r"\s*\+\s*", body):
        if not part.strip():
            continue
        name = _COMPONENT_FORM_TAIL.sub("", part.strip())
        m = _STRENGTH_IN_NAME.search(" " + name)
        mg = None
        if m:
            s = parse_strength(m.group(1))
            name = (" " + name)[: m.start()].strip()
            if s.known and not s.other_unit:
                mg = s.mg
        iid = reg.canonical(name)
        if not iid:
            entry.notes.append(f"unparsed component {part!r}")
            continue
        if iid in EXCIPIENT_LIKE:
            continue
        if iid not in entry.ingredients:
            entry.ingredients.append(iid)
        if mg is not None:
            entry.strengths[iid] = mg
    entry.ingredients.sort()
    return entry


def load_all(raw_dir: Path, reg: Registry) -> list[BannedFdc]:
    out: list[BannedFdc] = []
    pdf = raw_dir / "fdc156_2024.pdf"
    page = raw_dir / "fdc16_2026.html"
    if pdf.exists():
        for text, notif in parse_pdf_2024(pdf):
            out.append(normalise(text, so_number(notif), LIST_2024, reg))
    if page.exists():
        for text, so in parse_html_2026(page):
            out.append(normalise(text, so, LIST_2026, reg))
    return out
