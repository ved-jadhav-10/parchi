// A polite query to the prescriber(s), drafted from the findings that put an order on hold. The pharmacist reads it,
// edits it and chooses whether to send it: Parchi never sends anything. The wording states what was found and asks one
// question; it never says a prescription is unsafe or wrong.
import { doctorName, longDate, shortDate } from './labels'
import type { HistoryAlert, HistoryResult, Order } from './types'

export interface QueryDraft {
  subject: string
  body: string
  /** Prescribers the query is addressed to, by name */
  doctors: string[]
}

const MAX_FINDINGS = 3

/** The engine's sentence without its closing instruction to the pharmacist ("Pharmacist to review before dispensing."). */
const finding = (a: HistoryAlert) => a.reason.replace(/\s*Pharmacist to [^.]*\.?\s*$/i, '').replace(/\s+/g, ' ').trim()

const names = (list: string[]) => (list.length <= 1 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`)

const prescribers = (a: HistoryAlert) => [...new Set(a.prescribed.map((p) => doctorName(p.doctor)))]

/**
 * Draft for an order. Interrupts are the findings worth a doctor's time; with none, the drafts says so and asks about the
 * lead Inform instead. Addressed to the prescribers named in those findings, else to every prescriber on the order.
 */
export function queryDraft(order: Order, result: HistoryResult): QueryDraft {
  const shown = result.alerts.filter((a) => a.tier !== 'silent')
  const urgent = shown.filter((a) => a.tier === 'interrupt')
  const chosen = (urgent.length > 0 ? urgent : shown).slice(0, MAX_FINDINGS)

  const named = [...new Set(chosen.flatMap(prescribers))]
  const doctors = named.length > 0 ? named : [...new Set(order.prescriptions.map((p) => doctorName(p.doctor)))]

  const lines = chosen.map((a, i) => {
    const who = a.prescribed.length > 0 ? ` Prescribed by ${a.prescribed.map((p) => `${doctorName(p.doctor)} (${shortDate(p.date)})`).join(' and ')}.` : ''
    return `${i + 1}. ${finding(a)}${who} Source: ${a.source}.`
  })

  const c = order.customer
  const body = [
    `Dear ${names(doctors.map((d) => (d.startsWith('Dr') ? d : `Dr ${d}`)))},`,
    '',
    `I am the verifying pharmacist reviewing an order for ${c.name} (${c.age_years} years), order ${order.id}, placed ${longDate(order.placed)}.`,
    chosen.length > 0 ? 'Before it is dispensed, I would like to confirm the following with you:' : 'Before it is dispensed, I would like to confirm the prescriptions with you.',
    '',
    ...lines,
    '',
    chosen.length > 1 ? 'Could you please confirm whether these are intended, or let me know of any change you would like made?' : 'Could you please confirm whether this is intended, or let me know of any change you would like made?',
    '',
    'Thank you for your time.',
    '',
    '[Pharmacist name and pharmacy]',
  ].join('\n')

  return { subject: `Query on prescription for ${c.name}, order ${order.id}`, body, doctors }
}

/** A mailto: link carrying the draft, for a pharmacist who wants to send it from their own mail program. */
export const mailtoFor = (d: QueryDraft) => `mailto:?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`
