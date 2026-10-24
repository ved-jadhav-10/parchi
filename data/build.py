"""Build public/data/*.json from the curated CSVs and the raw sources.

    python data/fetch_raw.py      # once, downloads into data/raw/ (gitignored)
    python data/build.py          # writes public/data/{ingredients,brands,banned_fdc,ddi,nsq,janaushadhi}.json

Deterministic: same inputs, same bytes. See docs/track-a-data.md.
"""
from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from rxdata.banned_fdc import EXCIPIENT_LIKE, load_all as load_banned  # noqa: E402
from rxdata.brands import DEFAULT_SOURCE, read_curated, read_dataset, select  # noqa: E402
from rxdata.ddinter import load_pairs as load_ddi  # noqa: E402
from rxdata.export import banned_matches, popularity_tier, write_banned, write_brands, write_ddi, write_ingredients, write_janaushadhi, write_nsq  # noqa: E402
from rxdata.ingredients import Registry  # noqa: E402
from rxdata.janaushadhi import SOURCE_URL as JAN_URL, load_items as load_jan  # noqa: E402
from rxdata.nsq import load_month_files as load_nsq  # noqa: E402

ROOT = HERE.parent
SOURCES = {
    "brands": "junioralive/Indian-Medicine-Dataset (MIT; scraped from 1mg, prices Nov 2022) + data/curated/brands.csv",
    "ingredients": "data/curated/ingredients.csv (ATC codes checked against the WHO ATC/DDD index by data/verify_atc.py)",
}

DDI_SOURCE = {
    "name": "DDInter 2.0 bulk downloads",
    "url": "https://ddinter2.scbdd.com/download/",
    "licence": "CC BY-NC-SA 4.0 (non-commercial)",
    "gaps": "Bulk files cover ATC groups A, B, D, H, L, P, R, V only, so pairs where neither drug has a code "
    "in those groups (e.g. spironolactone + ramipril) are missing. Indian-only drugs (aceclofenac, "
    "nimesulide, domperidone, etoricoxib, ambroxol, serratiopeptidase...) are not in DDInter.",
}

NSQ_SOURCE = {
    "name": "CDSCO monthly NSQ (not of standard quality) and spurious drug alerts",
    "url": "https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/",
    "note": "Batch-specific. A failed batch says nothing about other batches of the same brand; about half the rows name no brand.",
}

JAN_SOURCE = {
    "name": "PMBJP list of 2110 generic medicines till 31.12.2025 (PIB annexure to a Lok Sabha reply, Feb 2026)",
    "url": JAN_URL,
    "note": "No prices. Only items with a readable mass strength for every ingredient are kept; creams, %, IU and vitamins "
    "are in data/reports/janaushadhi_unparsed.csv. A match is the same ingredients and strengths: the pharmacist confirms equivalence.",
}

# Fixed raw -> id pairs; the TS port of the canonicaliser must reproduce them (parity test).
PARITY_EXAMPLES = [
    "Paracetamol", "Acetaminophen", "Paracetamol(Acetaminophen)", "Amoxycillin  ", "Chlorpheniramine Maleate",
    "Vitamin B6 (Pyridoxine)", "Tazobactum", "Diclofenac Sodium", "Omeprazole Magnesium", "Potassium Clavulanate",
    "Dicyclomine HCl", "Acetyl Salicylic Acid", "Sodium Chloride", "Zinc Sulphate", "Isosorbide Mononitrate",
    "Rabeprazole Sodium (As enteric coated tablet)", "Levo cetirizine", "Dried Ferrous Sulphate",
    "Erythromycin stearate eq.to Erythromycin", "Beclomethasone Dipropionate", "Metoprolol Succinate",
    "Dexamethasone Sodium Phosphate", "Some New Molecule HCl", "Guaiphenesin", "Methylcobalamin",
    "Paracetamol/Acetaminophen", "Methylcobalamin/Mecobalamin", "Levo-carnitine", "Ethinyl Estradiol",
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", type=Path, default=DEFAULT_SOURCE)
    ap.add_argument("--raw", type=Path, default=HERE / "raw")
    ap.add_argument("--out", type=Path, default=ROOT / "public" / "data")
    ap.add_argument("--top-per-letter", type=int, default=1000, help="popularity cut-off per first letter")
    args = ap.parse_args()

    reg = Registry.load()
    curated = read_curated(HERE / "curated" / "brands.csv", reg)
    if not args.dataset.exists():
        print(f"missing {args.dataset}; run python data/fetch_raw.py first", file=sys.stderr)
        return 1
    dataset = read_dataset(args.dataset, reg)
    brands = select(dataset, curated, args.top_per_letter)

    banned = load_banned(args.raw / "cdsco", reg)
    if len(banned) < 172:
        print(f"expected 172 banned FDC entries, parsed {len(banned)}; run fetch_raw.py", file=sys.stderr)
        return 1

    ddi_pairs, ddinter_id = load_ddi(args.raw / "ddinter", reg)
    if not ddi_pairs:
        print("no DDInter files in data/raw/ddinter; run fetch_raw.py", file=sys.stderr)
        return 1

    nsq_rows = load_nsq(args.raw / "cdsco")
    if not nsq_rows:
        print("no NSQ files in data/raw/cdsco; run fetch_raw.py", file=sys.stderr)
        return 1

    jan_pdf = args.raw / "janaushadhi" / "pmbjp_list_2025-12-31.pdf"
    if not jan_pdf.exists():
        print(f"missing {jan_pdf}; run python data/fetch_raw.py", file=sys.stderr)
        return 1
    jan_items, jan_unparsed = load_jan(jan_pdf, reg)

    meta = {"sources": SOURCES, "top_per_letter": args.top_per_letter}
    b_stats = write_brands(args.out / "brands.json", brands, meta)
    used = {c.id for b in brands for c in b.components} | {i for e in banned for i in e.ingredients}
    examples = [(raw, reg.canonical(raw)) for raw in PARITY_EXAMPLES]
    i_stats = write_ingredients(args.out / "ingredients.json", reg, used, examples, {"sources": SOURCES})
    f_stats = write_banned(args.out / "banned_fdc.json", banned, {})
    d_stats = write_ddi(args.out / "ddi.json", ddi_pairs, ddinter_id, used | set(reg.meta), {"source": DDI_SOURCE})

    j_stats = write_janaushadhi(args.out / "janaushadhi.json", jan_items, used | set(reg.meta), {"source": JAN_SOURCE})
    j_stats["unparsed"] = len(jan_unparsed)
    (HERE / "reports").mkdir(exist_ok=True)
    with open(HERE / "reports" / "janaushadhi_unparsed.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["drug_code", "name", "unit"])
        w.writerows(jan_unparsed)
    n_stats = write_nsq(args.out / "nsq.json", nsq_rows, {"source": NSQ_SOURCE})

    # Report: which products in the (2022) market dataset match a banned combination.
    # A match on an incomplete (possibly truncated) composition is only a *possible* match.
    report = HERE / "reports" / "banned_fdc_matches.csv"
    report.parent.mkdir(exist_ok=True)
    by_set: dict[tuple, list] = {}
    for e in banned:
        by_set.setdefault(tuple(e.ingredients), []).append(e)
    hits = 0
    in_index = {(b.display, b.form) for b in brands}
    with open(report, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["so_number", "list", "brand", "form", "discontinued", "composition_complete", "popularity_tier", "in_app_index"])
        for b in sorted(dataset, key=lambda x: (x.display, x.form, x.rank)):
            key = tuple(sorted({c.id for c in b.components} - EXCIPIENT_LIKE))
            for e in by_set.get(key, []):
                if banned_matches(e, b):
                    hits += 1
                    w.writerow([e.so_number, e.list, b.display, b.form, b.discontinued, b.complete,
                                popularity_tier(b.rank), (b.display, b.form) in in_index])

    sizes = {p.name: p.stat().st_size for p in sorted(args.out.glob("*.json"))}
    print("brands:", b_stats)
    print("ingredients:", i_stats)
    print("ddi:", d_stats)
    print("nsq:", n_stats)
    print("janaushadhi:", j_stats)
    print("banned:", f_stats, f"- {hits} dataset rows match a banned FDC (data/reports/banned_fdc_matches.csv)")
    print("incomplete compositions in index:", sum(1 for b in brands if not b.complete), "of", len(brands))
    print("forms:", dict(Counter(b.form for b in brands).most_common(8)))
    print("sizes:", {k: f"{v / 1e6:.2f} MB" for k, v in sizes.items()})
    too_big = [k for k, v in sizes.items() if v > 2 * 1024 * 1024]
    if too_big:
        print(f"WARNING: {too_big} exceed Workbox's 2 MiB precache limit", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
