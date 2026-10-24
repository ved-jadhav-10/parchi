// The buyer's catalogue on this device (IndexedDB), in a database of its own so the orders and the audit log need no migration.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createCatalogue, type Catalogue } from '../../engine/resolver/catalogue'
import type { CatalogueRecord } from '../lib/catalogueState'
import { inStore, openDb } from './idb'

const open = () => openDb('parchi-catalogue', 1, (db) => db.createObjectStore('catalogue'))
const KEY = 'current'

export const saveCatalogue = (record: CatalogueRecord) => inStore(open, 'catalogue', 'readwrite', (s) => s.put(record, KEY))
export const loadCatalogue = () => inStore(open, 'catalogue', 'readonly', (s) => s.get(KEY) as IDBRequest<CatalogueRecord | undefined>)
export const clearCatalogue = () => inStore(open, 'catalogue', 'readwrite', (s) => s.delete(KEY))

/** The saved catalogue, ready to look up and to suggest same-composition alternatives. `error` is set when this browser cannot store data. */
export function useCatalogue() {
  const [record, setRecord] = useState<CatalogueRecord | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setRecord((await loadCatalogue()) ?? null)
      setError(false)
    } catch {
      setError(true)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const catalogue: Catalogue | null = useMemo(() => (record ? createCatalogue(record.items) : null), [record])
  return { record, catalogue, ready, error, refresh, setRecord }
}
