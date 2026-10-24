// Where the data behind the checks comes from. Facts are from docs/track-a-data.md; update both together.

export interface Source {
  name: string
  usedFor: string
  asOf: string
  terms: string
}

export const SOURCES: Source[] = [
  {
    name: 'Indian Medicine Dataset (junioralive), from 1mg',
    usedFor: 'Brand names and compositions: about 32,000 brands in the index. The source lists at most two ingredients for about a third of brands.',
    asOf: 'A catalogue snapshot; prices of Nov 2022',
    terms: 'MIT licence',
  },
  {
    name: 'Curated brands',
    usedFor: '37 brands checked against their pack pages. They override the dataset.',
    asOf: 'Pharmacist approval pending',
    terms: 'Own work',
  },
  {
    name: 'CDSCO banned fixed-dose combinations',
    usedFor: 'The banned combination flag: 172 notifications.',
    asOf: 'S.O. 3285 to 3440(E) of 2 Aug 2024 (156); S.O. 3068 to 3083(E) of 11 Jun 2026 (16)',
    terms: 'Government notifications',
  },
  {
    name: 'CDSCO NSQ and spurious drug alerts',
    usedFor: 'Failed or spurious batches, matched by brand name. A batch alert: the pharmacist checks the strip.',
    asOf: 'Monthly lists, Apr to Sep 2026: 1,272 rows, 652 of them name a brand',
    terms: 'Government notices',
  },
  {
    name: 'Jan Aushadhi (PMBJP) product list',
    usedFor: 'A generic with the same ingredients and strengths. Not a safety flag; the list has no prices.',
    asOf: '31 Dec 2025: 1,475 of 2,110 items matched',
    terms: 'Government list',
  },
  {
    name: 'DDInter (ddinter.scbdd.com)',
    usedFor: 'Drug interactions: 70,144 pairs among 770 ingredients. Some groups, such as cardiovascular-only pairs, are not covered, and "no interaction found" is not "safe".',
    asOf: 'Bulk files, ATC groups A, B, D, H, L, P, R and V',
    terms: 'CC BY-NC-SA 4.0: credit required, non-commercial',
  },
  {
    name: 'WHO ATC/DDD index',
    usedFor: 'Drug classes and ATC codes for the 275 curated ingredients.',
    asOf: 'Each code verified against the index',
    terms: 'Reference only',
  },
]
