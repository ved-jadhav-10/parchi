// One small IndexedDB helper for the review desk. Its job is honesty about saving: a write counts as saved only when the
// transaction has committed, not when the request was accepted (a full disk or a blocked database aborts after that).

export const openDb = (name: string, version: number, upgrade: (db: IDBDatabase) => void) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, version)
    req.onupgradeneeded = () => upgrade(req.result)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('The database is open in another tab and could not be updated.'))
  })

let asked = false

/** Ask the browser not to evict the audit log when space runs short. Asked once per page load; a refusal is not an error. */
export const askPersistence = () => {
  if (asked) return
  asked = true
  try {
    void navigator.storage?.persist?.().catch(() => undefined)
  } catch {
    /* no storage manager */
  }
}

/** Run one request in its own transaction and resolve with its result once the transaction has committed. */
export async function inStore<T>(open: () => Promise<IDBDatabase>, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  if (mode === 'readwrite') askPersistence()
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode)
      let value: T
      const req = fn(tx.objectStore(store))
      req.onsuccess = () => {
        value = req.result
      }
      tx.oncomplete = () => resolve(value)
      tx.onabort = () => reject(tx.error ?? new DOMException('The transaction was aborted.', 'AbortError'))
      tx.onerror = () => reject(tx.error ?? req.error)
    })
  } finally {
    db.close()
  }
}
