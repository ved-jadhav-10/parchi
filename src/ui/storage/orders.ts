// Orders and decisions on this device (IndexedDB). A separate database from the override log, so neither needs a migration.
import { useCallback, useEffect, useState } from 'react'
import { demoOrders } from '../history/demoOrders'
import type { Decision, Order } from '../history/types'

const DB = 'parchi-review'

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('orders', { keyPath: 'id' })
      req.result.createObjectStore('decisions', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

async function run<T>(store: 'orders' | 'decisions', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).finally(() => db.close())
}

export const saveOrder = (order: Order) => run('orders', 'readwrite', (s) => s.put(order))
export const listStoredOrders = () => run('orders', 'readonly', (s) => s.getAll() as IDBRequest<Order[]>)
export const addDecision = (d: Decision) => run('decisions', 'readwrite', (s) => s.add(d))
export const listDecisions = () => run('decisions', 'readonly', (s) => s.getAll() as IDBRequest<Decision[]>)

/** A saved copy of a sample order replaces it; new orders come after. */
export const mergeOrders = (stored: Order[]): Order[] => {
  const byId = new Map(demoOrders.map((o) => [o.id, o]))
  for (const o of stored) byId.set(o.id, o)
  return [...byId.values()]
}

/**
 * The sample account plus whatever was saved on this device. `error` is set when this browser cannot store data
 * (private window, blocked site data); the sample orders still show, but nothing new can be kept.
 */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(demoOrders)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setOrders(mergeOrders(await listStoredOrders()))
      setError(false)
    } catch {
      setOrders(demoOrders)
      setError(true)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { orders, ready, error, refresh }
}

/** Newest first. */
export function useDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setDecisions((await listDecisions()).sort((a, b) => b.at.localeCompare(a.at)))
      setError(false)
    } catch {
      setError(true)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { decisions, ready, error, refresh }
}
