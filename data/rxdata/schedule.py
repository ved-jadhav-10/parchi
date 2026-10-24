"""Drugs whose usual labelled schedule is not daily (weekly or monthly).

A sig of "OD" on one of these is a dangerous error (7x a weekly methotrexate dose), and the dose
ledger counts what the sig says. The rules live in data/curated/schedule_hints.csv, each with a
source; nothing is added from memory. The resolver applies them to resolved brands and generics.
"""
from __future__ import annotations

import csv
from pathlib import Path

from .ingredients import Registry

HINTS = ("weekly", "monthly")


def load_hints(path: Path, reg: Registry) -> list[dict]:
    rules: list[dict] = []
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if not row["ingredient"].strip() or row["ingredient"].startswith("#"):
                continue
            iid, hint = row["ingredient"].strip(), row["hint"].strip()
            if iid not in reg.meta:
                raise ValueError(f"schedule_hints.csv: {iid!r} is not a curated ingredient id")
            if hint not in HINTS:
                raise ValueError(f"schedule_hints.csv: hint {hint!r} must be one of {HINTS}")
            if not row["source"].strip().startswith("http"):
                raise ValueError(f"schedule_hints.csv: {iid} needs a source URL")
            rule = {
                "ingredient": iid,
                "hint": hint,
                "forms": [x for x in row["forms"].split("|") if x],
                "source": row["source"].strip(),
                "pharmacist_approved": row["pharmacist_approved"].strip().lower() == "true",
            }
            if row["mg"].strip():
                rule["mg"] = float(row["mg"])
            rules.append(rule)
    return rules
