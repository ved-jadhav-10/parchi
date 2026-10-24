// The ONC high-priority drug-drug interactions (Phansalkar et al., JAMIA 2012;19:735; class list reproduced in
// Kim et al., Healthc Inform Res 2016, PMC5102850): 15 pairs an expert panel said every system should alert on.
// One or more members of each class that are sold in India must hit DDInter or the curated supplement.
import { describe, it, expect } from 'vitest'
import ddiRaw from '../../../public/data/ddi.json?raw'
import supplementRaw from '../../../public/data/ddi_supplement.json?raw'
import { createDdiIndex } from './ddi'

const ddi = createDdiIndex(JSON.parse(ddiRaw), JSON.parse(supplementRaw))

// [rule, a, b]. Not in our ingredient list, so not testable: amphetamine, atazanavir, mercaptopurine, pethidine,
// ramelteon (rule 22), citalopram. Rule 23 is tested with ketoconazole + ritonavir.
const PAIRS: [string, string, string][] = [
  ['3 amphetamine-like + MAOI', 'methylphenidate', 'selegiline'],
  ['5 febuxostat + azathioprine', 'febuxostat', 'azathioprine'],
  ['8 SSRI + MAOI', 'fluoxetine', 'selegiline'],
  ['8 SSRI + MAOI', 'escitalopram', 'rasagiline'],
  ['11 irinotecan + strong CYP3A4 inhibitor', 'irinotecan', 'clarithromycin'],
  ['16 opioid + MAOI', 'tramadol', 'selegiline'],
  ['20 tricyclic + MAOI', 'amitriptyline', 'selegiline'],
  ['21 QT + QT', 'amiodarone', 'sotalol'],
  ['21 QT + QT', 'azithromycin', 'hydroxychloroquine'],
  ['21 QT + QT', 'haloperidol', 'ondansetron'],
  ['21 QT + QT', 'domperidone', 'levofloxacin'],
  ['23 strong CYP3A4 inhibitor + protease inhibitor', 'ketoconazole', 'ritonavir'],
  ['25 statin + CYP3A4 inhibitor', 'simvastatin', 'clarithromycin'],
  ['25 statin + CYP3A4 inhibitor', 'atorvastatin', 'clarithromycin'],
  ['27 CYP3A4 inhibitor + ergot', 'ergotamine', 'clarithromycin'],
  ['28 tizanidine + CYP1A2 inhibitor', 'tizanidine', 'ciprofloxacin'],
  ['30 tranylcypromine + procarbazine', 'tranylcypromine', 'procarbazine'],
  ['31 triptan + MAOI', 'sumatriptan', 'selegiline'],
]

describe('ONC high-priority interactions', () => {
  it.each(PAIRS)('rule %s: %s + %s is on file', (_rule, a, b) => {
    expect(ddi.lookup(a, b)?.level ?? 'none').not.toBe('none')
  })

  it('flags domperidone, which DDInter lacks, with strong CYP3A4 inhibitors (EMA 2014 contraindication)', () => {
    for (const other of ['clarithromycin', 'ketoconazole', 'itraconazole']) {
      expect(ddi.lookup('domperidone', other)).toMatchObject({ level: 'major', curated: true })
    }
  })
})
