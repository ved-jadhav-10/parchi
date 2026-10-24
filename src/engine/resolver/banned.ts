// Banned FDC detector. Same rule as data/rxdata/export.py:banned_matches (parity-tested):
// the set of active ingredients must equal a banned combination (excipient-like ids ignored),
// and strengths / dosage form must match when the notification names them.
import type { BannedFdcRef, Ingredient } from '../contracts'
import type { BannedEntry, BannedJson } from './data'

export interface BannedIndex {
  check(ingredients: Ingredient[], form: string, route: string, compositionComplete: boolean): BannedFdcRef[]
}

export function createBannedIndex(banned: BannedJson): BannedIndex {
  const excipient = new Set(banned.excipient_like)
  const bySet = new Map<string, BannedEntry[]>()
  for (const e of banned.entries) {
    const key = e.ingredients.join('|')
    const list = bySet.get(key)
    if (list) list.push(e)
    else bySet.set(key, [e])
  }

  function formMatches(entry: BannedEntry, form: string, route: string): boolean {
    if (!entry.form) return true
    const rule = banned.form_rules[entry.form]
    if (!rule) return true
    if (rule.routes && !rule.routes.includes(route)) return false
    if (rule.forms && !rule.forms.includes(form)) return false
    return true
  }

  return {
    check(ingredients, form, route, compositionComplete) {
      const ids = [...new Set(ingredients.map((i) => i.id))].filter((id) => !excipient.has(id)).sort()
      const hits: BannedFdcRef[] = []
      for (const entry of bySet.get(ids.join('|')) ?? []) {
        const strengthsOk = Object.entries(entry.strengths_mg ?? {}).every(([id, mg]) => {
          const ing = ingredients.find((i) => i.id === id)
          return !!ing && !ing.strength_unknown && Math.abs(ing.mg - mg) < 1e-6
        })
        if (strengthsOk && formMatches(entry, form, route)) {
          hits.push({ so: entry.so, date: entry.date, list: entry.list, text: entry.text, certain: compositionComplete })
        }
      }
      return hits
    },
  }
}
