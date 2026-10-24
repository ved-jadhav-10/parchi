import type { ReactNode } from 'react'
import type { Alert } from '../../engine/contracts'

export interface AlertItem<A extends Alert = Alert> {
  alert: A
  key: string
}

/**
 * Shown alerts in two labelled groups, Interrupts then Informs, with each `input_needed` alert folded into the first other alert that
 * names one of its ingredients (it is the same finding, waiting on a value). One that matches nothing stays a card of its own.
 */
export const groupAlerts = <A extends Alert>(items: AlertItem<A>[]) => {
  const waiting = items.filter((x) => x.alert.type === 'input_needed')
  const main = items.filter((x) => x.alert.type !== 'input_needed')
  const nestedIn = new Map<string, AlertItem<A>[]>()
  const loose: AlertItem<A>[] = []
  for (const w of waiting) {
    const host = main.find((m) => m.alert.ingredients.some((i) => w.alert.ingredients.includes(i)))
    if (host) nestedIn.set(host.key, [...(nestedIn.get(host.key) ?? []), w])
    else loose.push(w)
  }
  const cards = [...main, ...loose]
  return {
    nestedIn,
    groups: [
      { id: 'interrupt', title: 'Review before dispensing', items: cards.filter((x) => x.alert.tier === 'interrupt') },
      { id: 'inform', title: 'Worth a note', items: cards.filter((x) => x.alert.tier !== 'interrupt') },
    ].filter((g) => g.items.length > 0),
  }
}

type Props<A extends Alert> = {
  items: AlertItem<A>[]
  render: (item: AlertItem<A>, nested: AlertItem<A>[]) => ReactNode
  /** Shown under the Interrupt heading */
  interruptNote?: ReactNode
}

export function AlertGroups<A extends Alert>({ items, render, interruptNote }: Props<A>) {
  const { groups, nestedIn } = groupAlerts(items)
  return (
    <>
      {groups.map((g) => (
        <section key={g.id} className="alertgroup" aria-labelledby={`alertgroup-${g.id}`}>
          <h3 id={`alertgroup-${g.id}`} className="alertgroup__title">
            {g.title} <span className="num">{g.items.length}</span>
          </h3>
          {g.id === 'interrupt' && interruptNote}
          <div className="alerts">{g.items.map((it) => render(it, nestedIn.get(it.key) ?? []))}</div>
        </section>
      ))}
    </>
  )
}
