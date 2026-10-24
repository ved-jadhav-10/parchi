export const mg = (n: number) => n.toLocaleString('en-IN')

export const pct = (n?: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`)

export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export type LimitState = 'ok' | 'inform' | 'interrupt'

/** < 80% of the limit is ok, 80-100% inform, above 100% interrupt. */
export const limitState = (total: number, limit: number): LimitState => {
  const ratio = total / limit
  return ratio > 1 ? 'interrupt' : ratio >= 0.8 ? 'inform' : 'ok'
}
