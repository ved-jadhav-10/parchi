# Track A: brand resolver and data (how to use it)

Owner: Track A (`data/`, `src/engine/resolver/`). Everything runs offline from `public/data/*.json`.

## Use it (Track C pipeline, Track D UI)

```ts
import { loadResolver } from './engine/resolver'          // browser: fetches public/data once, SW-cached
const resolver = await loadResolver()
const lines = resolver.resolveText(rxText, { age_years: patient.age_years })
// -> [{ resolved: ResolvedBrand, sig_text: '1-1-1 x5d' }, ...]  sig_text goes to Track B's sig parser
resolver.resolve('Brufan 400')                  // one brand string
resolver.canonicalId('Chlorpheniramine Maleate') // 'chlorphenamine' (never hand-type ids)
resolver.ingredient('chlorphenamine')            // { name: 'Chlorpheniramine', atc: ['R06AB04'], classes: [...] }
resolver.sameComposition(resolved)               // other brands with the identical composition

import { loadDdi } from './engine/resolver/ddi'    // DDInter interactions (Track C)
const ddi = await loadDdi()
ddi.among(['ibuprofen', 'aspirin', 'omeprazole']) // [{ a, b, level: 'major', source: 'DDInter20 / DDInter900' }]
ddi.covers('domperidone')                        // false: not in DDInter, so "no hit" means unknown, not safe
```

`splitRx` / `splitBrandAndSig` (in `segment.ts`) cut each line at the first token that can only be dosing (`1-0-1`, `OD`, `SOS`, `x5d`, `khane ke baad`...). Track B may replace them.

## ResolvedBrand fields (contract + optional Track A detail)

| Field | Meaning | Who uses it |
|---|---|---|
| `ingredients[].mg` | mg per tablet/capsule, or per `per_volume_ml` mL for liquids (Ascoril LS: ambroxol 30 mg / 5 mL) | B ledger |
| `ingredients[].other_unit`, `strength_unknown` | strength not in mg (IU, % w/w) or missing; `mg` is 0 then. Do not treat as 0 mg | B |
| `route`, `systemic` | only `systemic: true` lines count toward daily mg (gels, eye/ear drops are excluded) | B |
| `confidence`, `match` | 1.0 curated exact, 0.97 dataset exact, lower for fuzzy (`Brufan` -> Brufen 400) | C, D |
| `needs_pharmacist` | ask before trusting the line: low confidence, look-alike brands, assumed strength, unknown form | C, D |
| `flags` | `banned_fdc`, `lasa` (look-alike with different ingredients), `discontinued`, `nsq` | C |
| `banned_fdc[]` | `{so, date, list, text, certain}` for the source chip, e.g. `S.O. 3385(E)`. `certain: false` = composition may be incomplete | C |
| `nsq[]` | `{batch, month, result, product, manufacturer, spurious}`: CDSCO failed/spurious batches (Apr-Sep 2026) of this brand name. Batch-specific, so Silent/Inform and "check the batch on the strip", never Interrupt. Matches by brand name (and strength when the alert names one); ~half the CDSCO rows name no brand and are not matched. Demo Rx: Pan-D has one (Jul 2026) | C, D |
| `jan_aushadhi[]` | `{code, name, unit, release?}`: PMBJP generics with the same ingredients and strengths (list of 31.12.2025, no prices). Only for complete compositions with mg strengths; modified-release and plain are kept apart. `release` (e.g. gastro-resistant) is for the pharmacist to confirm. Not a safety flag | D |
| `composition_complete` | `false` = source shows at most two ingredients and may hide more. ~34% of dataset brands. Suggest Silent/Inform, never Interrupt by itself | C, D |
| `candidates`, `notes` | what else the text could mean, and one-line reasons for the pharmacist | D |

Rules worth knowing:
- **Strength not written:** if the exact base product exists ("Zerodol P" -> Zerodol-P 325) it wins and other strengths go in `candidates`; otherwise the highest strength is assumed and `needs_pharmacist` is set ("Dolo" -> Dolo 1000mg).
- **Form not written:** oral solids for adults, liquids when `age_years < 12`.
- **Generic input** ("Paracetamol 500", "Cetirizine + Paracetamol + Phenylephrine") gives `brand: null, match: 'generic'` with real ingredients. Unresolved text gives `brand: null, match: 'none', ingredients: []`.
- **Class duplication:** `ingredients.json` has `classes` (e.g. `nsaid`, `ppi`, `antihistamine`, `sedating_antihistamine`) and WHO `atc` codes for 271 curated ingredients. Aspirin is `antiplatelet|salicylate`, not `nsaid`.
- **DDI gaps:** DDInter bulk files cover ATC groups A, B, D, H, L, P, R, V only, so some cardiovascular-only pairs (spironolactone + ramipril) are missing, and Indian-only drugs (aceclofenac, nimesulide, domperidone, etoricoxib, ambroxol) are not in DDInter. Use `ddi.covers(id)` before saying "no interaction".

## Liquids, schedules and systemic (for Track B/C)

- **Liquid strengths:** `per_volume_ml` is set for ~87% of liquid brands. Syrups, suspensions and dry syrups that state mg without a volume get 5 mL (98.5% of rows that state one use 5 mL) and `per_volume_assumed: true`; a sibling ingredient's stated volume is used first. Oral drops and oral solutions are never guessed (about a third of stated drops are per 5 mL, the rest per mL), so a drop line such as Sinarest Paediatric has no `per_volume_ml` and the ledger should skip it and say so. Stated per-mL drops (Calpol Paediatric drops: paracetamol 100 mg/1 mL) are stored with `per_volume_ml: 1`. Remaining gaps by popularity: `data/reports/liquid_strength_gaps.csv` (566 ingredient rows in 416 brands: 302 drops/solutions without a volume, 176 'NA' strengths, 88 in units that are not mg such as IU, % w/w, spores).
- **Dose volume in the sig text:** `splitBrandAndSig` treats a small mL amount (up to 20 mL: `5ml`, `10 ml`, `0.6 ml`) as the dose, but keeps pack sizes and concentrations in the brand (`Syrup 100ml`, `120mg/5ml`, `Calpol drops 15ml 0.6 ml TDS`: 15 mL is the pack, 0.6 mL the dose). Rule: an mL amount is the dose unless another dose quantity follows it.
- **`schedule_hint`** (`'weekly' | 'monthly'`, plus `schedule_source`): methotrexate tablets, alendronate 70 mg (weekly; the 10 mg tablet is daily and gets no hint), ibandronate 150 mg (monthly). Every rule in `data/curated/schedule_hints.csv` has a source URL and `pharmacist_approved: false`. Not sourced, so deliberately absent: risedronate 35 mg (weekly), vitamin D3 60,000 IU sachets/capsules (weekly), chloroquine/mefloquine prophylaxis. Track C should warn when `schedule_hint` is set and the parsed sig is daily.
- **`systemic`/`route` are always set** on every `ResolvedBrand`: brands and generics from the product form; fuzzy matches inherit the matched product; unresolved lines get `route: 'other', systemic: false` (they have no ingredients, so nothing reaches the ledger either way).
- **Completeness:** 37 brands are verified against their pack pages (`python data/verify_brands.py` re-checks them all; the 2 non-pack sources are skipped). 1,499 brands that contain paracetamol or an NSAID still have a possibly truncated listing (43 in the top tier): `data/reports/incomplete_paracetamol_nsaid_brands.csv`, most popular first. Until verified they carry `composition_complete: false` and the ledger shows a caveat.

## Data files (`public/data`, built by `python data/build.py`)

| File | Content | Size |
|---|---|---|
| `brands.json` | ~32k brands (whole product lines whose best variant is in the top 1,000 of its letter by popularity), 5.8k compositions, flags | 1.05 MB |
| `ingredients.json` | 1,377 ids, 1,777 aliases, classes, ATC, parity examples | 0.15 MB |
| `banned_fdc.json` | 172 banned FDCs: 156 (S.O. 3285-3440(E), 02.08.2024) + 16 (S.O. 3068-3083(E), 11.06.2026) | 0.04 MB |
| `nsq.json` | 1,272 CDSCO NSQ/spurious rows, Apr-Sep 2026 (652 name a brand). Optional at load: the resolver works without it | 0.30 MB |
| `janaushadhi.json` | 1,475 of the 2,110 PMBJP items (oral/injectable with mg strengths); creams, %, IU and vitamin mixes are in `data/reports/janaushadhi_unparsed.csv`. Optional at load | 0.14 MB |
| `ddi.json` | 70,144 DDInter pairs (major/moderate/minor/unknown) among 770 of our ingredients, CC BY-NC-SA 4.0 | 0.86 MB |

All stay under Workbox's 2 MiB per-file precache limit. Decoder: `src/engine/resolver/data.ts`.

## Sources and how they were checked

- **Brands:** junioralive/Indian-Medicine-Dataset (MIT, scraped from 1mg, prices Nov 2022). Rows are popularity-ordered inside each letter (Dolo 650 is row 0 of "D"); that rank picks the index and breaks ties. Gap: mostly Rx catalogue, so some OTC brands (Becosules, Digene, Saridon) are missing.
- **Curated brands** (`data/curated/brands.csv`, 13 rows): each checked against the pack page cited in PS_ANALYSIS; they override the dataset. The dataset was wrong on 4 (Crocin Cold & Flu Max, Sinarest-CCF, Sinarest New, Ascoril LS). `pharmacist_approved` is `false` until the pharmacist session.
- **Ingredients** (`data/curated/ingredients.csv`): ids are INN slugs (`aspirin` kept because the fixture uses it). Every ATC code is verified against the WHO ATC/DDD index by `python data/verify_atc.py`. Similar-looking names are never auto-merged (ofloxacin/levofloxacin, isosorbide mono/dinitrate).
- **Banned FDCs:** official CDSCO PDF (156) and the Medical Dialogues table of the June 2026 gazette (16). Match = same active-ingredient set (excipients like HPMC ignored), plus strength/form where the notification names them (Aceclofenac 50 + Paracetamol 125 is banned; Zerodol-P 100 + 325 is not). In the 2022 dataset, 1,098 products match a now-banned FDC (51 with fully verified compositions): `data/reports/banned_fdc_matches.csv`.

## Quality numbers (from the tests)

- Demo Rx: all 7 lines resolve as the fixture expects; hidden paracetamol totals 4,100 mg/day.
- 74 hand-written misspellings: 100% top-1. 810 held-out generated typos of popular brands: 97.9% top-1, 8.1% routed to the pharmacist, 0.25% confidently wrong. ~0.35 ms per lookup.
- TS and Python agree on every canonical id example and on every banned-FDC match in the index (parity tests).

## Rebuild

```
pip install -r requirements.txt
python data/fetch_raw.py         # raw sources -> data/raw/ (gitignored)
python data/build.py             # -> public/data/*.json + data/reports/
python data/verify_atc.py        # after editing ingredients.csv
python data/verify_brands.py     # after editing brands.csv (checks each row against its source page)
python -m pytest data/tests && npm test
```

Add a brand the pharmacist verified: a row in `data/curated/brands.csv` (composition in dataset style, `Name (500mg) + Name (5mg/5ml)`), rebuild. Add a spelling: `data/curated/ingredient_aliases.csv`.
