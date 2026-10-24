// FIX_PLAN 3.6: Indian pharmacists rarely get through to the prescriber, and a hold usually means asking the customer or sending
// a message. These build a short note from the alerts that stopped the order, ready to paste. They quote the reasons already
// on screen; they never add advice, a dose or a diagnosis.
import type { Alert } from '../../engine/contracts'

export type Audience = 'prescriber' | 'customer'

const REVIEW_TAIL = /\s*Pharmacist to (?:review|check|confirm)[^.]*\.?\s*$/i

/** The reason without the instruction to the pharmacist at its end. */
const plain = (reason: string) => reason.replace(REVIEW_TAIL, '').replace(/\.$/, '')

export function buildNote(audience: Audience, who: { name?: string; age_years: number }, alerts: Alert[], opts: { pharmacy?: string } = {}): string {
  const stops = alerts.filter((a) => a.tier === 'interrupt')
  const points = (stops.length ? stops : alerts.filter((a) => a.tier === 'inform')).map((a, i) => `${i + 1}. ${plain(a.reason)}.`)
  const from = opts.pharmacy ?? 'the dispensing pharmacist'
  if (!points.length) return ''
  if (audience === 'prescriber') {
    return [
      `Query from ${from}`,
      `Patient: ${who.name ? `${who.name}, ` : ''}${who.age_years} years`,
      'The prescription was checked before dispensing. Points to clarify:',
      ...points,
      'Please confirm whether the prescription is as intended. This note is from a checking tool and a pharmacist; it is not a diagnosis.',
    ].join('\n')
  }
  return [
    `Hello${who.name ? ` ${who.name}` : ''}, this is ${from}.`,
    'Before your order is sent we would like to check a few things with you:',
    ...points,
    'Please reply, or speak to your doctor if you are unsure. We have not changed anything on your prescription.',
  ].join('\n')
}
