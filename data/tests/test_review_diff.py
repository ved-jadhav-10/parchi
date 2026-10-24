"""review_diff.py: parsing the glued Kaggle scrape, classifying differences, and never touching trusted data.

Rows below are made up in the Kaggle layout (no Kaggle content is committed).
"""
import csv
import hashlib
from pathlib import Path

import pytest

import review_diff as rd
from rxdata.brands import Brand, Component
from rxdata.ingredients import Registry
from rxdata.units import parse_strength

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent


@pytest.fixture(scope="module")
def reg():
    return Registry.load()


def kaggle_row(name, product, pack="strip of 10 tablets"):
    return {"Medicine Name": name, "Product Name": product, "Type of Medicine": pack}


def brand(display, form, *comps, rank=0):
    return Brand(display=display, form=form, route="oral", components=[Component(i, parse_strength(s)) for i, s in comps],
                 complete=False, discontinued=False, rank=rank)


def test_first_ingredient_is_read_from_the_glued_manufacturer_text(reg):
    row = kaggle_row("Testra 650 Tablet", "Testra 650 TabletMRP₹30Prescription Requiredstrip of 10 tabletsSome Pharma LtdParacetamol (650mg)ADD")
    k = rd.parse_kaggle(row, rd.FirstIngredient(reg), reg)
    assert [(c.id, c.strength.mg) for c in k.components] == [("paracetamol", 650)]


def test_out_of_stock_rows_use_product_name_and_salt_words_are_dropped(reg):
    row = kaggle_row("Testcold Syrup", "Testcold SyrupMRP₹90bottle of 60 ml SyrupX RemediesChlorpheniramine Maleate (2mg/5ml) + Phenylephrine (5mg/5ml)not available", pack="")
    k = rd.parse_kaggle(row, rd.FirstIngredient(reg), reg)
    assert [c.id for c in k.components] == ["chlorphenamine", "phenylephrine"]


def test_unknown_first_ingredient_is_unparsed_not_guessed(reg):
    row = kaggle_row("Odd Tablet", "Odd TabletMRP₹10strip of 10 tabletsAcme LtdZzqvamide (5mg)ADD")
    assert rd.parse_kaggle(row, rd.FirstIngredient(reg), reg).components is None


def test_classification(reg):
    ours = brand("Testflu", "tablet", ("paracetamol", "500mg"), ("phenylephrine", "10mg"))
    adds = rd.KaggleRow("Testflu Tablet", "Testflu", "tablet", [Component("paracetamol", parse_strength("500mg")), Component("phenylephrine", parse_strength("10mg")), Component("caffeine", parse_strength("30mg"))])
    assert rd.compare(ours, [adds])["status"] == "adds_ingredients"
    conflict = rd.KaggleRow("Testflu Tablet", "Testflu", "tablet", [Component("paracetamol", parse_strength("325mg")), Component("phenylephrine", parse_strength("10mg"))])
    assert rd.compare(ours, [conflict])["status"] == "strength_conflict"
    contra = rd.KaggleRow("Testflu Tablet", "Testflu", "tablet", [Component("paracetamol", parse_strength("500mg"))])
    assert rd.compare(ours, [contra])["status"] == "contradicts"
    assert rd.compare(ours, [adds, contra])["status"] == "ambiguous"
    assert rd.compare(ours, [rd.KaggleRow("x", "Testflu", "tablet", None)])["status"] == "unparsed"


def test_same_concentration_in_different_volumes_is_not_a_conflict(reg):
    ours = brand("Testsyr", "syrup", ("ambroxol", "15mg/5ml"), ("guaifenesin", "50mg/5ml"))
    k = rd.KaggleRow("Testsyr Syrup", "Testsyr", "syrup", [Component("ambroxol", parse_strength("30mg/10ml")), Component("guaifenesin", parse_strength("100mg/10ml"))])
    assert rd.compare(ours, [k])["status"] == "agrees"


def test_every_entry_starts_pending_for_a_person(reg):
    e = rd.compare(brand("T", "tablet", ("paracetamol", "500mg")), [rd.KaggleRow("T", "T", "tablet", [Component("paracetamol", parse_strength("500mg"))])])
    assert e["review"] == {"status": "pending", "pack_checked": None, "reviewer": None, "date": None, "note": None}


def _hash_tree(*dirs):
    h = hashlib.sha256()
    for d in dirs:
        for p in sorted(d.rglob("*")):
            if p.is_file():
                h.update(str(p.relative_to(ROOT)).encode())
                h.update(p.read_bytes())
    return h.hexdigest()


def test_script_writes_nothing_to_trusted_data(reg, tmp_path, monkeypatch):
    src = tmp_path / "kaggle.csv"
    with open(src, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["Medicine Name", "Product Name", "Type of Medicine", "Composition"])
        w.writeheader()
        w.writerow({"Medicine Name": "Testflu Tablet", "Product Name": "Testflu TabletMRP₹1strip of 10 tabletsA LtdParacetamol (500mg) + Caffeine (30mg)ADD", "Type of Medicine": "strip of 10 tablets", "Composition": ""})
    trusted = (HERE / "curated", ROOT / "public" / "data")
    before = _hash_tree(*trusted)
    monkeypatch.setattr(rd, "incomplete_brands", lambda reg, top_per_letter=1000: [brand("Testflu", "tablet", ("paracetamol", "500mg"))])
    monkeypatch.setattr(rd, "SUMMARY", tmp_path / "summary.json")
    monkeypatch.setattr("sys.argv", ["review_diff.py", "--kaggle", str(src), "--out", str(tmp_path / "diff.json")])
    assert rd.main() == 0
    assert _hash_tree(*trusted) == before
    assert "CC BY-NC-SA" in (tmp_path / "diff.json").read_text(encoding="utf-8")


def test_build_never_reads_kaggle():
    sources = [HERE / "build.py", *(HERE / "rxdata").glob("*.py")]
    for p in sources:
        text = p.read_text(encoding="utf-8").lower()
        assert "kaggle" not in text and "review_diff" not in text, p.name


def test_default_output_is_gitignored():
    assert rd.OUT.is_relative_to(HERE / "raw")
