"""pytest for the benchmark scripts: python -m pytest eval -q"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import chatbots  # noqa: E402
import score  # noqa: E402

GROUPS = {"dose_excess": ["dose_excess"], "ddi": ["ddi"], "renal": ["nsaid_renal"], "geriatric": ["domperidone_elderly"]}


def test_extract_json_handles_fences_and_prose():
    reply = 'Sure! ```json\n{"alerts": [{"type": "ddi", "tier": "inform", "ingredients": ["aspirin"]}]}\n``` Hope that helps {not json}'
    assert chatbots.extract_json(reply)["alerts"][0]["type"] == "ddi"
    assert chatbots.extract_json('{"alerts": []} trailing') == {"alerts": []}


def test_extract_json_fails_loudly():
    for bad in ("no braces", '{"alerts": ['):
        try:
            chatbots.extract_json(bad)
        except ValueError:
            continue
        raise AssertionError(bad)


def test_canon_maps_chatbot_spellings_to_ids():
    assert score.canon("Chlorpheniramine") == "chlorphenamine"
    assert score.canon("Acetaminophen") == "paracetamol"
    assert score.canon("Mefenamic Acid") == "mefenamic_acid"


def test_matching_needs_same_group_and_a_shared_ingredient():
    exp = [{"type": "ddi", "ingredients": ["aspirin", "ibuprofen"]}]
    tp, fp, fn, _ = score.score_case([{"type": "ddi", "tier": "inform", "ingredients": ["Aspirin", "warfarin"]}], exp, GROUPS)
    assert (len(tp), len(fp), len(fn)) == (1, 0, 0)
    tp, fp, fn, _ = score.score_case([{"type": "dose_excess", "tier": "inform", "ingredients": ["aspirin"]}], exp, GROUPS)
    assert (len(tp), len(fp), len(fn)) == (0, 1, 1)


def test_silent_alerts_are_not_scored_and_raw_types_map_to_groups():
    exp = [{"type": "renal", "ingredients": ["ibuprofen"]}]
    tp, fp, fn, shown = score.score_case(
        [{"type": "nsaid_renal", "tier": "interrupt", "ingredients": ["ibuprofen"]}, {"type": "ddi", "tier": "silent", "ingredients": ["x"]}], exp, GROUPS
    )
    assert (len(tp), len(fp), len(fn), len(shown)) == (1, 0, 0, 1)


def test_a_repeat_of_a_caught_alert_is_noise_not_a_wrong_alert():
    exp = [{"type": "ddi", "ingredients": ["aspirin", "ibuprofen"]}]
    twice = [{"type": "ddi", "tier": "inform", "ingredients": ["aspirin"]}] * 2
    tp, fp, fn, shown = score.score_case(twice, exp, GROUPS)
    assert (len(tp), len(fp), len(fn), len(shown)) == (1, 0, 0, 2)


def test_clean_false_alarm_rate_and_alert_load():
    gold = {
        "meta": {"alert_groups": GROUPS},
        "cases": [
            {"id": "a", "expected": []},
            {"id": "b", "expected": []},
            {"id": "c", "expected": [{"type": "ddi", "ingredients": ["aspirin"]}]},
        ],
    }
    outputs = {
        "a": {"alerts": [{"type": "ddi", "tier": "interrupt", "ingredients": ["aspirin"]}]},
        "b": {"alerts": []},
        "c": {"alerts": [{"type": "ddi", "tier": "interrupt", "ingredients": ["aspirin"]}, {"type": "dose_excess", "tier": "inform", "ingredients": ["aspirin"]}]},
    }
    entry, misses, extras = score.score_system("claude", outputs, gold)
    assert entry["name"] == "Claude"
    assert entry["clean_fp_rate"] == 0.5
    assert entry["alerts_per_rx"] == 1.0
    assert entry["interrupts_per_rx"] == 0.67
    assert entry["by_type"]["ddi"] == {"precision": 0.5, "recall": 1.0}
    assert misses == [] and len(extras) == 2


def test_kappa_perfect_and_none():
    cases = [{"id": "a", "expected": [{"type": "ddi", "ingredients": []}]}, {"id": "b", "expected": []}]
    assert score.kappa(cases, {"a": [{"type": "ddi"}], "b": []}, GROUPS) == 1.0
    assert score.kappa(cases, {}, GROUPS) is None


def test_every_case_has_a_prompt_that_states_the_patient():
    gold = json.loads((Path(__file__).parent / "gold.json").read_text(encoding="utf-8"))
    for case in gold["cases"]:
        text = chatbots.prompt_for(case)
        assert f"{case['patient']['age_years']} years" in text
        assert "JSON only" in text
