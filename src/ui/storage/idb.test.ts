import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { inStore, openDb } from './idb'

let n = 0
const fresh = () => {
  const name = `idb-test-${++n}`
  const open = () => openDb(name, 1, (db) => db.createObjectStore('rows', { keyPath: 'id', autoIncrement: true }))
  return { open, put: (v: unknown) => inStore(open, 'rows', 'readwrite', (s) => s.add(v)), all: () => inStore(open, 'rows', 'readonly', (s) => s.getAll()) }
}

describe('inStore', () => {
  it('resolves with the request result after the transaction commits', async () => {
    const db = fresh()
    const key = await db.put({ a: 1 })
    expect(key).toBe(1)
    expect(await db.all()).toEqual([{ a: 1, id: 1 }])
  })

  it('rejects, and keeps nothing, when the transaction aborts after the request was accepted', async () => {
    const db = fresh()
    await db.put({ a: 1 })
    // add() succeeds, then the transaction is aborted before it can commit: the caller must hear about it
    await expect(
      inStore(db.open, 'rows', 'readwrite', (s) => {
        const req = s.add({ a: 2 })
        req.addEventListener('success', () => s.transaction.abort())
        return req
      }),
    ).rejects.toBeTruthy()
    expect(await db.all()).toEqual([{ a: 1, id: 1 }])
  })

  it('rejects a duplicate key instead of reporting it saved', async () => {
    const db = fresh()
    await inStore(db.open, 'rows', 'readwrite', (s) => s.add({ id: 7 }))
    await expect(inStore(db.open, 'rows', 'readwrite', (s) => s.add({ id: 7 }))).rejects.toBeTruthy()
  })
})
