// Weekly / monthly drugs (data/curated/schedule_hints.csv, every rule sourced).
// A daily sig on one of these is a dangerous error; the ledger counts what the sig says, so
// Track C uses `ResolvedBrand.schedule_hint` to warn when the parsed sig is daily.
import type { Ingredient } from '../contracts'
import type { ScheduleRule } from './data'

export interface ScheduleIndex {
  check(ingredients: Ingredient[], form: string): { hint: 'weekly' | 'monthly'; source: string } | null
}

export function createScheduleIndex(rules: ScheduleRule[] = []): ScheduleIndex {
  return {
    check(ingredients, form) {
      for (const rule of rules) {
        if (rule.forms.length && !rule.forms.includes(form)) continue
        const hit = ingredients.some(
          (i) => i.id === rule.ingredient && !i.other_unit && (rule.mg === undefined || Math.abs(i.mg - rule.mg) < 1e-6),
        )
        if (hit) return { hint: rule.hint, source: rule.source }
      }
      return null
    },
  }
}
