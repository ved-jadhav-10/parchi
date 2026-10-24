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
| `flags` | `banned_fdc`, `lasa` (look-alike with different ingredients), `discontinued` | C |
| `banned_fdc[]` | `{so, date, list, text, certain}` for the source chip, e.g. `S.O. 3385(E)`. `certain: false` = composition may be incomplete | C |
| `composition_complete` | `false` = source shows at most two ingredients and may hide more. ~34% of dataset brands. Suggest Silent/Inform, never Interrupt by itself | C, D |
| `candidates`, `notes` | what else the text could mean, and one-line reasons for the pharmacist | D |

Rules worth knowing:
- **Strength not written:** if the exact base product exists ("Zerodol P" -> Zerodol-P 325) it wins and other strengths go in `candidates`; otherwise the highest strength is assumed and `needs_pharmacist` is set ("Dolo" -> Dolo 1000mg).
- **Form not written:** oral solids for adults, liquids when `age_years < 12`.
- **Generic input** ("Paracetamol 500", "Cetirizine + Paracetamol + Phenylephrine") gives `brand: null, match: 'generic'` with real ingredients. Unresolved text gives `brand: null, match: 'none', ingredients: []`.
- **Class duplication:** `ingredients.json` has `classes` (e.g. `nsaid`, `ppi`, `antihistamine`, `sedating_antihistamine`) and WHO `atc` codes for 264 curated ingredients. Aspirin is `antiplatelet|salicylate`, not `nsaid`.

## Data files (`public/data`, built by `python data/build.py`)

| File | Content | Size |
|---|---|---|
| `brands.json` | ~32k brands (whole product lines whose best variant is in the top 1,000 of its letter by popularity), 5.8k compositions, flags | 1.05 MB |
| `ingredients.json` | 1,378 ids, 1,612 aliases, classes, ATC, parity examples | 0.15 MB |
| `banned_fdc.json` | 172 banned FDCs: 156 (S.O. 3285-3440(E), 02.08.2024) + 16 (S.O. 3068-3083(E), 11.06.2026) | 0.04 MB |

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
python -m pytest data/tests && npm test
```

Add a brand the pharmacist verified: a row in `data/curated/brands.csv` (composition in dataset style, `Name (500mg) + Name (5mg/5ml)`), rebuild. Add a spelling: `data/curated/ingredient_aliases.csv`.
