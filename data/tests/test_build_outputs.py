"""Checks on the committed public/data/*.json (what the app actually ships)."""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "public" / "data"
FIXTURE = json.loads((ROOT / "tests" / "fixtures" / "demo_rx.json").read_text(encoding="utf-8"))
WORKBOX_LIMIT = 2 * 1024 * 1024


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def brands():
    return load("brands.json")


@pytest.fixture(scope="module")
def ingredients():
    return load("ingredients.json")


@pytest.fixture(scope="module")
def banned():
    return load("banned_fdc.json")


def decode(doc, display):
    """All variants with this display name -> [(form, [(id, mg, per_ml)], flags)]."""
    out = []
    for name, ci, fi, flags, _tier in doc["brands"]:
        if name == display:
            comps = [(doc["ingredients"][c[0]], c[1], c[2] if len(c) > 2 else None) for c in doc["compositions"][ci]]
            out.append((doc["forms"][fi], comps, flags))
    return out


@pytest.mark.parametrize("name", ["brands.json", "ingredients.json", "banned_fdc.json"])
def test_files_fit_the_offline_precache(name):
    assert (DATA / name).stat().st_size < WORKBOX_LIMIT


def test_demo_fixture_brands_have_verified_compositions(brands):
    for line in FIXTURE["expected"]["resolver"]:
        variants = decode(brands, line["brand"])
        assert variants, f"{line['brand']} missing from brands.json"
        curated = [v for v in variants if v[2] & brands["flag_bits"]["curated"]]
        assert len(curated) == 1, line["brand"]
        _form, comps, flags = curated[0]
        expected = sorted((i["id"], i["mg"]) for i in line["ingredients"])
        assert sorted((c[0], c[1]) for c in comps) == expected
        assert not flags & brands["flag_bits"]["composition_incomplete"]


def test_truncated_dataset_compositions_are_replaced_by_curated(brands):
    # The dataset lists 2 of Sinarest-CCF's 5 ingredients; the curated row must win.
    (form, comps, _flags), = [v for v in decode(brands, "Sinarest-CCF")]
    assert {c[0] for c in comps} == {"paracetamol", "chlorphenamine", "ambroxol", "guaifenesin", "phenylephrine"}


def test_syrup_strengths_keep_their_volume(brands):
    # "Ascoril LS" is also sold as oral drops (7.5 mg/mL); forms are separate variants.
    variants = {form: comps for form, comps, _ in decode(brands, "Ascoril LS")}
    assert ("ambroxol", 30, 5) in variants["syrup"]
    assert ("ambroxol", 7.5, 1) in variants["oral_drops"]


def test_every_referenced_ingredient_is_registered(brands, ingredients, banned):
    known = set(ingredients["ingredients"])
    assert set(brands["ingredients"]) <= known
    assert {i for e in banned["entries"] for i in e["ingredients"]} <= known
    assert set(ingredients["aliases"].values()) <= known


def test_fixture_ids_are_curated(ingredients):
    for line in FIXTURE["expected"]["resolver"]:
        for ing in line["ingredients"]:
            assert ingredients["ingredients"][ing["id"]]["curated"], ing["id"]


def test_banned_lists_are_complete(banned):
    entries = banned["entries"]
    assert len(entries) == 172
    assert sum(e["list"].startswith("CDSCO 156") for e in entries) == 156
    assert sum(e["list"].startswith("16 FDCs") for e in entries) == 16
    assert len({e["so"] for e in entries}) == 172
    combos = {tuple(e["ingredients"]) for e in entries}
    assert ("cetirizine", "paracetamol", "phenylephrine") in combos
    assert ("amoxicillin", "serratiopeptidase") in combos


def test_strength_specific_ban_does_not_cover_other_strengths(banned):
    (entry,) = [e for e in banned["entries"] if e["so"] == "S.O. 3409(E)"]
    assert entry["strengths_mg"] == {"aceclofenac": 50, "paracetamol": 125}
    assert entry["form"] == "tablet"


def test_form_route_mapping_marks_topicals_non_systemic(brands):
    systemic = set(brands["systemic_routes"])
    route = brands["form_route"]
    assert route["tablet"] in systemic and route["syrup"] in systemic
    for form in ("cream", "gel", "eye_drops", "ear_drops", "ointment"):
        assert route[form] not in systemic
