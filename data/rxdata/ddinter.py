"""DDInter drug-drug interactions, subset to the app's canonical ingredients (for Track C).

Source: DDInter 2.0 bulk downloads (https://ddinter2.scbdd.com/download/, CC BY-NC-SA 4.0).
Known gaps, documented in the exported file:
  * bulk files exist only for ATC groups A, B, D, H, L, P, R, V; a pair where neither drug has a
    code in those groups (e.g. spironolactone + ramipril) is absent;
  * Indian-only drugs (aceclofenac, nimesulide, domperidone, ...) are not in DDInter at all.
"""
from __future__ import annotations

import csv
from pathlib import Path

from .ingredients import Registry

LEVELS = ["unknown", "minor", "moderate", "major"]
_LEVEL = {"Unknown": 0, "Minor": 1, "Moderate": 2, "Major": 3}


def load_pairs(raw_dir: Path, reg: Registry) -> tuple[dict[tuple[str, str], int], dict[str, str]]:
    """Return ({(id_a, id_b): level}, {id: DDInter id}). Duplicates keep the most severe level."""
    pairs: dict[tuple[str, str], int] = {}
    ddinter_id: dict[str, str] = {}
    for path in sorted(raw_dir.glob("ddinter_downloads_code_*.csv")):
        with open(path, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                a, b = reg.canonical(row["Drug_A"]), reg.canonical(row["Drug_B"])
                if not a or not b or a == b:
                    continue
                ddinter_id.setdefault(a, row["DDInterID_A"])
                ddinter_id.setdefault(b, row["DDInterID_B"])
                key = (a, b) if a < b else (b, a)
                level = _LEVEL.get(row["Level"].strip(), 0)
                if level >= pairs.get(key, -1):
                    pairs[key] = level
    return pairs, ddinter_id
