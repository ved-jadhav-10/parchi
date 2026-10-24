import pytest

from rxdata.units import parse_strength, split_component


@pytest.mark.parametrize(
    "text, mg, per_ml",
    [
        ("500mg", 500, None),
        ("500 mg", 500, None),
        ("650mg", 650, None),
        ("0.6mg", 0.6, None),
        ("150mcg", 0.15, None),
        ("1gm", 1000, None),
        ("1g", 1000, None),
        ("30mg/5ml", 30, 5),
        ("30 mg/ 5 ml", 30, 5),
        ("2mg/ml", 2, 1),
        ("1,000mg", 1000, None),
        ("50mcg/ml", 0.05, 1),
    ],
)
def test_mass_strengths(text, mg, per_ml):
    s = parse_strength(text)
    assert s.known and s.other_unit is None
    assert s.mg == pytest.approx(mg)
    assert s.per_volume_ml == per_ml


def test_percent_w_v_becomes_mg_per_ml():
    s = parse_strength("0.05% w/v")
    assert s.mg == pytest.approx(0.5) and s.per_volume_ml == 1.0


def test_percent_w_w_is_not_a_mg_figure():
    s = parse_strength("1% w/w")
    assert s.mg == 0 and s.other_unit == ("percent_ww", 1.0)


def test_iu_and_cells_are_kept_as_other_units():
    assert parse_strength("1000iu").other_unit == ("iu", 1000.0)
    assert parse_strength("2 million spores").other_unit == ("million_spores", 2.0)


@pytest.mark.parametrize("text", ["NA", "", "na", "garbage"])
def test_unknown_strength(text):
    s = parse_strength(text)
    assert not s.known and s.mg == 0


def test_mg_per_gram_is_not_a_per_dose_mg():
    s = parse_strength("10mg/gm")
    assert s.mg == 0 and s.other_unit and s.other_unit[1] == 10


def test_as_json_omits_defaults():
    assert parse_strength("500mg").as_json() == {"mg": 500}
    assert parse_strength("30mg/5ml").as_json() == {"mg": 30, "per_volume_ml": 5}
    assert parse_strength("NA").as_json() == {"mg": 0, "strength_unknown": True}


@pytest.mark.parametrize(
    "text, name, strength",
    [
        ("Amoxycillin  (500mg) ", "Amoxycillin", "500mg"),
        ("  Clavulanic Acid (125mg)", "Clavulanic Acid", "125mg"),
        ("Progesterone (Natural Micronized) (25mg)", "Progesterone (Natural Micronized)", "25mg"),
        ("Thiamine(Vitamin B1) (100mg)", "Thiamine(Vitamin B1)", "100mg"),
        ("Guaifenesin (NA)", "Guaifenesin", "NA"),
        ("Aloe Vera", "Aloe Vera", ""),
        ("Doxorubicin (Plain)", "Doxorubicin (Plain)", ""),
    ],
)
def test_split_component(text, name, strength):
    assert split_component(text) == (name, strength)


def test_syrup_without_volume_gets_per_5ml_flagged_as_assumed():
    from rxdata.brands import Component, fill_liquid_volumes

    comps = [Component("paracetamol", parse_strength("250mg")), Component("chlorphenamine", parse_strength("2mg"))]
    out = fill_liquid_volumes(comps, "syrup")
    assert [(c.strength.per_volume_ml, c.strength.volume_assumed) for c in out] == [(5.0, True), (5.0, True)]


def test_sibling_volume_wins_and_drops_are_never_guessed():
    from rxdata.brands import Component, fill_liquid_volumes

    mixed = [Component("ambroxol", parse_strength("7.5mg/ml")), Component("levosalbutamol", parse_strength("0.25mg"))]
    out = fill_liquid_volumes(mixed, "oral_drops")
    assert out[1].strength.per_volume_ml == 1.0 and out[1].strength.volume_assumed
    assert not out[0].strength.volume_assumed  # stated volumes are untouched
    alone = fill_liquid_volumes([Component("paracetamol", parse_strength("150mg"))], "oral_drops")
    assert alone[0].strength.per_volume_ml is None  # 1/3 of stated drops are per 5 mL: no guess
    tablet = fill_liquid_volumes([Component("paracetamol", parse_strength("500mg"))], "tablet")
    assert tablet[0].strength.per_volume_ml is None
