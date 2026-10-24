"""Offline checks on curated/limit_evidence.csv against src/engine/limits/limits.json.

The word-for-word check against each label runs when the label is cached (python data/limit_evidence.py fills
data/raw/label_cache/); on a fresh clone those cases skip and the rest still run.
"""
import json

import pytest

import limit_evidence as le

ROWS = le.load_rows()
LIMITS = json.loads(le.LIMITS.read_text(encoding="utf-8"))

# Limits no label states as a maximum. A new limit must come with an evidence row or be added here on purpose.
KNOWN_UNSOURCED = {"aceclofenac/adult", "nimesulide/adult", "omeprazole/adult", "pantoprazole/adult"}


@pytest.mark.parametrize("row", ROWS, ids=lambda r: f"{r['ingredient']}-{r['band']}-{r['source_kind']}")
def test_row_is_consistent(row):
    assert le.row_problems(row) == []


@pytest.mark.parametrize("row", ROWS, ids=lambda r: f"{r['ingredient']}-{r['band']}-{r['source_kind']}")
def test_quote_is_in_source(row):
    text = le.cached(row["source_kind"], row["source_id"])
    if text is None:
        pytest.skip("label not cached; run python data/limit_evidence.py")
    assert le.quote_problem(row, text) is None


def test_limits_match_lowest_label_maximum():
    assert le.limits_problems(ROWS, LIMITS) == []


def test_every_limit_has_a_label_or_is_known_unsourced():
    assert set(le.unsourced(ROWS, LIMITS)) <= KNOWN_UNSOURCED


def test_every_limit_row_names_where_it_came_from():
    for r in ROWS:
        assert r["source_id"] and r["quote"] and r["notes"] and r["checked_on"]


def test_label_disagreements_are_kept_not_hidden():
    spread = {k: (e["value"], e["highest"]) for k, e in le.limit_from_evidence(ROWS).items() if e["highest"] > e["value"]}
    assert spread[("ibuprofen", "adult")] == (2400, 3200)
    assert spread[("metformin", "adult")] == (2000, 2550)
    assert spread[("diclofenac", "adult")] == (150, 200)


def test_normalise_keeps_text_next_to_less_than_signs():
    text = le.normalise("incidence <1% of patients. maximum dose 10 mg once daily. weight >50 kg")
    assert "maximum dose 10 mg once daily" in text
    assert le.normalise("<p>Do&nbsp;not exceed</p>") == "do not exceed"


def test_label_checked_marks_exactly_the_limits_with_a_label_quote():
    have = set(le.limit_from_evidence(ROWS))
    for ing, entry in LIMITS["ingredients"].items():
        for band in le.BANDS:
            limit = entry.get(band)
            if not limit:
                continue
            assert ("label_checked" in limit) == ((ing, band) in have), f"{ing}/{band}"


def test_a_label_check_is_not_a_pharmacist_approval():
    for ing, entry in LIMITS["ingredients"].items():
        for band in le.BANDS:
            limit = entry.get(band) or {}
            if "label_checked" in limit:
                assert limit["pharmacist_approved"] is False, f"{ing}/{band}: only a pharmacist sets this"
