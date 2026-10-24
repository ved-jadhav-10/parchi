"""A curated brand can correct a wrong dataset row through its `replaces` column."""
import json
from pathlib import Path

from rxdata.brands import Brand, Component, select
from rxdata.units import parse_strength

ROOT = Path(__file__).resolve().parents[2]


def brand(display, form, *ids, source="dataset", replaces=()):
    return Brand(display=display, form=form, route="oral", components=[Component(i, parse_strength("1mg")) for i in ids],
                 complete=True, discontinued=False, rank=0, source=source, curated={"replaces": list(replaces)} if replaces else {})


def test_a_row_with_the_wrong_ingredient_is_dropped_but_a_different_product_stays():
    wrong = brand("Testmist", "respules", "salbutamol", "ipratropium")
    other_form = brand("Testmist", "inhaler", "salbutamol", "ipratropium")
    other_product = brand("Testmist", "respules", "budesonide")
    fixed = brand("Testmist", "respules", "levosalbutamol", "ipratropium", source="curated", replaces=["salbutamol"])
    kept = select([wrong, other_form, other_product], [fixed], 1000)
    assert fixed in kept and wrong not in kept
    assert other_form in kept and other_product in kept


def test_without_replaces_a_wrong_ingredient_row_is_kept():
    wrong = brand("Testmist", "respules", "salbutamol", "ipratropium")
    fixed = brand("Testmist", "respules", "levosalbutamol", "ipratropium", source="curated")
    assert wrong in select([wrong], [fixed], 1000)


def test_shipped_data_has_the_corrected_brands_once():
    b = json.loads((ROOT / "public" / "data" / "brands.json").read_text(encoding="utf-8"))
    ids, comps, forms = b["ingredients"], b["compositions"], b["forms"]

    def rows(name, form):
        return [sorted(ids[i] for i, _ in comps[r[1]]) for r in b["brands"] if r[0] == name and forms[r[2]] == form]

    assert rows("Combimist-L", "respules") == [["ipratropium", "levosalbutamol"]]
    assert rows("Florina L", "tablet") == [["ethinylestradiol", "levonorgestrel"]]
