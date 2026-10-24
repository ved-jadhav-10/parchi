import { useCallback, useEffect, useState } from 'react'
import type { Tier } from '../../engine/contracts'

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
}

const DB = 'parchi'
const STORE = 'overrides'

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).finally(() => db.close())
}

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
