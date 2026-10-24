// HOLES H6: "patients also buy at the local chemist, so your picture is incomplete." Parchi only sees this order, so for the
// medicines most often bought over the counter it tells the pharmacist the one question worth asking. A question, never a finding.

const NSAIDS = new Set(['ibuprofen', 'diclofenac', 'aceclofenac', 'naproxen', 'nimesulide', 'mefenamic_acid', 'etoricoxib', 'ketorolac', 'piroxicam'])
const COLD = new Set(['phenylephrine', 'chlorphenamine', 'dextromethorphan', 'pseudoephedrine', 'guaifenesin'])

/** Up to three questions, in order of how often the answer changes a decision. Empty when nothing on the order is commonly bought separately. */
export function askTheCustomer(ingredientIds: string[]): string[] {
  const ids = new Set(ingredientIds)
  const out: string[] = []
  if (ids.has('paracetamol')) out.push('Does the customer also take a fever, cold or pain tablet bought without a prescription? Many contain paracetamol.')
  if ([...ids].some((i) => NSAIDS.has(i))) out.push('Does the customer also take another painkiller tablet bought without a prescription?')
  if ([...ids].some((i) => COLD.has(i))) out.push('Is any cough or cold syrup being bought or taken separately?')
  return out
}
