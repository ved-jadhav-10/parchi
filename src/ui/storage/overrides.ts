import { useCallback, useEffect, useState } from 'react'
import type { Tier } from '../../engine/contracts'
import { inStore, openDb } from './idb'

export interface OverrideRecord {
  id?: number
  at: string
  tier: Tier
  type: string
  ingredients: string[]
  alert_reason: string
  source: string
  override_reason: string
  note?: string
  /** The order the override was made on. Absent on overrides saved before this field existed and on the single-prescription checker. */
  order_id?: string
}

const DB = 'parchi'
const STORE = 'overrides'

const open = () => openDb(DB, 1, (db) => db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }))
const run = <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => inStore(open, STORE, mode, fn)

export const addOverride = (rec: OverrideRecord) => run('readwrite', (s) => s.add(rec))
export const listOverrides = () => run('readonly', (s) => s.getAll() as IDBRequest<OverrideRecord[]>)

/** Newest first. `error` is set when this browser cannot store data (private window, blocked site data). */
export function useOverrides() {
  const [rows, setRows] = useState<OverrideRecord[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setRows((await listOverrides()).sort((a, b) => b.at.localeCompare(a.at)))
      setError(false)
    } catch {
      setError(true)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { rows, ready, error, refresh }
}
