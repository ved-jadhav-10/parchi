"""Curated interaction rules that say how a pair interacts must quote the label behind them, word for word.

Labels are cached by `python data/tests/test_ddi_evidence.py --fetch` (or by data/limit_evidence.py) in the gitignored
data/raw/label_cache/; on a fresh clone the word-for-word cases skip and the shape checks still run.
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # data/, when run as a script with --fetch
import limit_evidence as le  # noqa: E402

SUPPLEMENT = Path(__file__).resolve().parents[2] / "public" / "data" / "ddi_supplement.json"
RULES = [r for r in json.loads(SUPPLEMENT.read_text(encoding="utf-8"))["rules"] if "effect" in r]
EVIDENCE = [(r["id"], e) for r in RULES for e in r["evidence"]]


def test_there_are_effect_rules():
    assert len(RULES) >= 12


@pytest.mark.parametrize("rule", RULES, ids=lambda r: r["id"])
def test_effect_rule_shape(rule):
    assert rule["effect"] in ("reduces_effect", "adds_effect")
    assert rule["mechanism"] in ("activation_blocked", "opposing_action", "absorption_blocked", "faster_breakdown", "same_action")
    assert rule["evidence"], "an effect rule needs at least one label quote"
    assert rule["pharmacist_approved"] is False
    if rule["effect"] == "reduces_effect":
        assert rule["reduces"] and set(rule["reduces"]) <= set(rule["a"]) | set(rule["b"])
    for id_ in rule.get("non_systemic", []):
        assert id_ in rule["a"] + rule["b"]
    for e in rule["evidence"]:
        assert e["set_id"] in rule["source"]


@pytest.mark.parametrize("rule_id,ev", EVIDENCE, ids=lambda x: x if isinstance(x, str) else x["set_id"][:8])
def test_quote_is_in_label(rule_id, ev):
    text = le.cached("fda_spl", ev["set_id"])
    if text is None:
        pytest.skip("label not cached; run python data/tests/test_ddi_evidence.py --fetch")
    assert le.normalise(ev["quote"]) in text, f"{rule_id}: quote not found in {ev['set_id']}"


if __name__ == "__main__" and "--fetch" in sys.argv:
    for rule_id, ev in EVIDENCE:
        le.fetch("fda_spl", ev["set_id"])
    print(f"cached {len({e['set_id'] for _, e in EVIDENCE})} labels")
