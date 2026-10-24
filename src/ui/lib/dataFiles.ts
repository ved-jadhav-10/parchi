import { useEffect, useState } from 'react'

/** Fetch a JSON data file. A missing file (or the dev server's HTML fallback) is `missing`, never an error screen. */
export function useJson(url: string): { status: 'loading' | 'ok' | 'missing'; data: unknown } {
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'missing'; data: unknown }>({ status: 'loading', data: null })
  useEffect(() => {
    let live = true
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => live && setState({ status: 'ok', data }))
      .catch(() => live && setState({ status: 'missing', data: null }))
    return () => {
      live = false
    }
  }, [url])
  return state
}

export interface DataRow {
  name: string
  detail: string
  value: string
  source: string
  approved: boolean | undefined
  /** Set when a script found the quoted label sentence behind this value. Not a pharmacist's approval. */
  checked?: string
  /** Who signed this value off, when someone did. */
  approvedBy?: string
}

type Raw = Record<string, unknown>
const str = (v: unknown) => (v == null ? '' : Array.isArray(v) ? v.join(' + ') : String(v))

/** Accepts a bare array or an object wrapping one (`{limits: [...]}`), and the field names Tracks B/C are likely to use. */
export function normalizeRows(json: unknown): DataRow[] {
  const list = Array.isArray(json)
    ? json
    : json && typeof json === 'object'
      ? (Object.values(json).find(Array.isArray) as unknown[] | undefined) ?? []
      : []
  return list
    .filter((r): r is Raw => !!r && typeof r === 'object')
    .map((r) => ({
      name: str(r.ingredient ?? r.id ?? r.ingredients ?? r.rule ?? r.pair) || '—',
      detail: str(r.population ?? r.type ?? r.reason ?? r.note),
      value: str(r.max_mg_day ?? r.limit_mg_day ?? r.max_doses_per_day ?? r.value),
      source: str(r.source),
      approved: typeof r.pharmacist_approved === 'boolean' ? r.pharmacist_approved : undefined,
    }))
}

export interface SystemResult {
  name: string
  alerts_per_rx?: number
  interrupts_per_rx?: number
  clean_fp_rate?: number
  median_ms?: number
  by_type: Record<string, { precision?: number; recall?: number }>
}

export interface Benchmark {
  n_rx?: number
  kappa?: number
  /** How the gold set was labelled (a "draft" until a pharmacist has reviewed it). */
  label_status?: string
  systems: SystemResult[]
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** Reads eval/ output: `{n_rx, kappa, systems: [{name, alerts_per_rx, interrupts_per_rx, clean_fp_rate, by_type}]}`. */
export function normalizeBenchmark(json: unknown): Benchmark | null {
  const j = json as Raw | null
  if (!j || !Array.isArray(j.systems) || j.systems.length === 0) return null
  return {
    n_rx: num(j.n_rx),
    kappa: num(j.kappa),
    label_status: str(j.label_status) || undefined,
    systems: (j.systems as Raw[]).map((s) => ({
      name: str(s.name) || 'Unnamed',
      alerts_per_rx: num(s.alerts_per_rx),
      interrupts_per_rx: num(s.interrupts_per_rx),
      clean_fp_rate: num(s.clean_fp_rate),
      median_ms: num(s.median_ms),
      by_type: Object.fromEntries(
        Object.entries((s.by_type as Record<string, Raw>) ?? {}).map(([t, m]) => [t, { precision: num(m?.precision), recall: num(m?.recall) }]),
      ),
    })),
  }
}
