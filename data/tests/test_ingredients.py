import pytest

from rxdata.ingredients import Registry, strip_salt_words


@pytest.fixture(scope="module")
def reg():
    return Registry.load()


@pytest.mark.parametrize(
    "raw, expected",
    [
        # ids frozen by tests/fixtures/demo_rx.json
        ("Paracetamol", "paracetamol"),
        ("Caffeine", "caffeine"),
        ("Phenylephrine", "phenylephrine"),
        ("Aceclofenac", "aceclofenac"),
        ("Ibuprofen", "ibuprofen"),
        ("Aspirin", "aspirin"),
        ("Pantoprazole", "pantoprazole"),
        ("Domperidone", "domperidone"),
        ("Omeprazole", "omeprazole"),
        # spelling variants, synonyms and salts seen in the dataset and CDSCO lists
        ("Amoxycillin  ", "amoxicillin"),
        ("Chlorpheniramine Maleate", "chlorphenamine"),
        ("Vitamin B6 (Pyridoxine)", "pyridoxine"),
        ("Tazobactum", "tazobactam"),
        ("Diclofenac Sodium", "diclofenac"),
        ("Diclofenac Potassium", "diclofenac"),
        ("Omeprazole Magnesium", "omeprazole"),
        ("Rabeprazole Sodium (As enteric coated tablet)", "rabeprazole"),
        ("Paracetamol(Acetaminophen)", "paracetamol"),
        ("Acetaminophen", "paracetamol"),
        ("Potassium Clavulanate", "clavulanic_acid"),
        ("Dicyclomine HCl", "dicycloverine"),
        ("Acetyl Salicylic Acid", "aspirin"),
        ("Cefadroxyl", "cefadroxil"),
        ("Guaiphenesin", "guaifenesin"),
        ("Methylcobalamin", "mecobalamin"),
        ("Levo cetirizine", "levocetirizine"),
        ("Metoprolol Succinate", "metoprolol"),
        ("Cefpodoxime Proxetil", "cefpodoxime"),
        ("Paracetamol/Acetaminophen", "paracetamol"),  # slash spelling hid paracetamol in ~270 rows
        ("Methylcobalamin/Mecobalamin", "mecobalamin"),
        ("Levo-carnitine", "levocarnitine"),
        ("Ethinyl Estradiol", "ethinylestradiol"),
        ("Cyclosporine", "ciclosporin"),
    ],
)
def test_canonical_ids(reg, raw, expected):
    assert reg.canonical(raw) == expected


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("Sodium Chloride", "sodium_chloride"),  # never collapse to the bare metal
        ("Zinc Sulphate", "zinc_sulfate"),
        ("Zinc Sulfate", "zinc_sulfate"),
        ("Isosorbide Mononitrate", "isosorbide_mononitrate"),  # mono/dinitrate are different drugs
        ("Isosorbide Dinitrate", "isosorbide_dinitrate"),
    ],
)
def test_compounds_keep_their_identity(reg, raw, expected):
    assert reg.canonical(raw) == expected


def test_similar_names_are_not_merged(reg):
    # String-similar but pharmacologically different: must stay separate ids.
    pairs = [("Ofloxacin", "Levofloxacin"), ("Omeprazole", "Esomeprazole"), ("Cetirizine", "Levocetirizine")]
    for a, b in pairs:
        assert reg.canonical(a) != reg.canonical(b)


def test_unknown_names_get_stable_slugs(reg):
    assert reg.canonical("Some New Molecule HCl") == "some_new_molecule"
    assert reg.canonical("") is None


def test_salt_stripping_is_suffix_only():
    assert strip_salt_words("sodium valproate") == "sodium valproate"
    assert strip_salt_words("dexamethasone sodium phosphate") == "dexamethasone"


def test_every_curated_id_is_a_slug(reg):
    for iid in reg.meta:
        assert iid == iid.lower() and " " not in iid and "-" not in iid
