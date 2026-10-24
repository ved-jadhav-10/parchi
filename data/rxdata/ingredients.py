"""Canonical ingredient IDs.

An ID is a lowercase INN-style slug ("paracetamol", "clavulanic_acid"). The same ID is used by
every track, so this module is the single place that decides what two spellings are the same drug.

Resolution order for a raw name:
  1. exact match in curated/ingredient_aliases.csv (hand-reviewed, always wins)
  2. strip qualifiers ("(as ...)", salt/ester/hydrate words) and retry the alias table
  3. auto-generate a slug from the stripped name (flagged `curated: false` in the export)

Salt words are stripped because limits and duplication checks work on the active moiety, and the
dataset spells the same drug "Diclofenac", "Diclofenac Sodium" and "Diclofenac Potassium".
"""
from __future__ import annotations

import csv
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

CURATED_DIR = Path(__file__).resolve().parents[1] / "curated"

# Trailing words that name a salt, ester or hydrate rather than the drug itself.
SALT_WORDS = frozenset(
    """
    hydrochloride dihydrochloride hcl hydrobromide hbr bromide sodium potassium calcium magnesium
    succinate tartrate bitartrate besylate besilate mesylate mesilate fumarate hemifumarate maleate
    oxalate phosphate sulphate sulfate disulfate acetate citrate nitrate
    medoxomil proxetil axetil cilexetil pivoxil hexetil trometamol tromethamine
    dipropionate propionate valerate acetonide furoate butyrate decanoate stearate estolate
    ethylsuccinate palmitate pamoate embonate gluconate
    anhydrous dihydrate monohydrate trihydrate hemihydrate sesquihydrate pentahydrate hydrate
    micronized micronised extended release ip bp usp
    """.split()
)

# A metal/ion on its own is a real ingredient ("zinc", "sodium chloride"); never strip down to it.
INORGANIC_BASES = frozenset(
    "sodium potassium calcium magnesium zinc ferrous ferric iron ammonium aluminium aluminum "
    "lithium copper cupric cuprous manganese selenium chromium bismuth antimony silver cobalt "
    "barium strontium titanium".split()
)


@dataclass
class Registry:
    """Curated ingredients plus the alias table. Mutable so the build can add auto IDs."""

    meta: dict[str, dict] = field(default_factory=dict)  # id -> {name, atc, classes, ...}
    aliases: dict[str, str] = field(default_factory=dict)  # normalised alias -> id
    auto_ids: set[str] = field(default_factory=set)
    seen_names: dict[str, Counter] = field(default_factory=dict)  # id -> raw spellings seen

    # -- loading ---------------------------------------------------------------------
    @classmethod
    def load(cls, directory: Path = CURATED_DIR) -> "Registry":
        reg = cls()
        with open(directory / "ingredients.csv", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                if not row["id"].strip() or row["id"].startswith("#"):
                    continue
                iid = row["id"].strip()
                if iid in reg.meta:
                    raise ValueError(f"duplicate ingredient id {iid!r} in ingredients.csv")
                reg.meta[iid] = {
                    "name": row["name"].strip() or iid.replace("_", " ").title(),
                    "atc": row.get("atc", "").strip(),
                    "classes": [c for c in row.get("classes", "").split("|") if c.strip()],
                    "source": row.get("source", "").strip(),
                }
                for alias in [iid.replace("_", " "), row["name"], *row.get("aliases", "").split("|")]:
                    if alias.strip():
                        reg._add_alias(alias, iid)
        alias_file = directory / "ingredient_aliases.csv"
        if alias_file.exists():
            with open(alias_file, encoding="utf-8", newline="") as f:
                for row in csv.DictReader(f):
                    if row["alias"].strip() and not row["alias"].startswith("#"):
                        if row["id"].strip() not in reg.meta:
                            raise ValueError(f"alias {row['alias']!r} points at unknown id {row['id']!r}")
                        reg._add_alias(row["alias"], row["id"].strip())
        return reg

    def _add_alias(self, alias: str, iid: str) -> None:
        key = normalise_text(alias)
        existing = self.aliases.get(key)
        if existing and existing != iid:
            raise ValueError(f"alias {alias!r} maps to both {existing!r} and {iid!r}")
        self.aliases[key] = iid

    # -- lookup ----------------------------------------------------------------------
    def canonical(self, raw: str) -> str | None:
        """Return the canonical ID for a raw ingredient name, or None if it is empty/unusable."""
        iid = self._canonical(raw)
        if iid:
            self.seen_names.setdefault(iid, Counter())[re.sub(r"\s+", " ", raw).strip()] += 1
        return iid

    def _canonical(self, raw: str) -> str | None:
        text = normalise_text(raw)
        if not text:
            return None
        if text in self.aliases:
            return self.aliases[text]
        stripped = strip_qualifiers(text)
        if stripped in self.aliases:
            return self.aliases[stripped]
        base = strip_salt_words(stripped)
        if base in self.aliases:
            return self.aliases[base]
        slug = slugify(base or stripped)
        if not slug:
            return None
        self.auto_ids.add(slug)
        return slug

    def is_curated(self, iid: str) -> bool:
        return iid in self.meta

    def display_name(self, iid: str) -> str:
        if iid in self.meta:
            return self.meta[iid]["name"]
        seen = self.seen_names.get(iid)
        if seen:
            name = strip_qualifiers(seen.most_common(1)[0][0].lower())
            return strip_salt_words(name).title()
        return iid.replace("_", " ").title()


# -- text helpers -------------------------------------------------------------------------


def normalise_text(raw: str) -> str:
    """Lowercase, unify punctuation and spacing. Keeps digits and the characters that matter."""
    t = (raw or "").lower().strip()
    t = t.replace("&", " and ").replace("’", "'")
    t = t.replace("sulph", "sulf").replace("aluminum", "aluminium")  # British/US spellings
    t = t.replace("/", " ")  # "Paracetamol/Acetaminophen" (~270 dataset rows)
    t = re.sub(r"\s*-\s*", "-", t)  # "levo - carnitine" -> "levo-carnitine"
    t = re.sub(r"\s+", " ", t)
    return t.strip(" .,;")


_QUALIFIER_RE = re.compile(
    r"\s*\((?:as|eq\.?|equivalent|expressed|in the form)[^)]*\)"  # "(as enteric coated tablet)"
    r"|\s+as\s+.*$|\s+eq\.?\s*to\b.*$|\s+equivalent to\b.*$",  # "stearate eq.to erythromycin"
    re.I,
)


# Leading descriptors that do not change the drug: "dried ferrous sulphate", "light magnesium carbonate".
_PREFIX_RE = re.compile(r"^(?:combikit of|dried|light|heavy|purified|precipitated|exsiccated|colloidal)\s+")


def strip_qualifiers(text: str) -> str:
    """Drop "(as enteric coated tablet)", "eq. to ...", "from an organic source" and similar."""
    t = _QUALIFIER_RE.sub("", text)
    t = re.sub(r"\s*\([^)]*\)", "", t)  # any remaining parenthetical
    t = re.sub(r"\s+from\s+.*$", "", t)
    t = _PREFIX_RE.sub("", t.strip())
    return re.sub(r"\s+", " ", t).strip(" .,;")


def strip_salt_words(text: str) -> str:
    """Remove trailing salt words ("chlorpheniramine maleate" -> "chlorpheniramine").

    Protected: "sodium chloride", "zinc sulphate", "magnesium hydroxide" and similar compounds
    keep their full name, otherwise they would collapse to the bare metal.
    """
    words = text.split()
    if len(words) >= 2 and words[0] in INORGANIC_BASES:
        return text
    while len(words) > 1 and words[-1] in SALT_WORDS:
        words.pop()
    # "ip"/"bp" style markers may also lead ("bp"), rare; ignore.
    return " ".join(words)


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return s
