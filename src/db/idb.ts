/**
 * Minimal promise wrapper over IndexedDB.
 *
 * No dependency: the surface FORGED needs is get / put / delete / clear over two
 * object stores, and a hand-written wrapper is easier to audit than a library
 * for something that must keep a person's training history safe for years.
 *
 * If IndexedDB is unavailable (private-mode quirks, very old browsers), the
 * wrapper degrades to an in-memory store and the caller shows a warning rather
 * than crashing.
 */

export const DB_NAME = 'forged'
export const DB_VERSION = 1
export const STORE_RECORDS = 'records'
export const STORE_BLOBS = 'blobs'

let dbPromise: Promise<IDBDatabase> | null = null
const memoryFallback = new Map<string, Map<string, unknown>>()
let usingFallback = false

export function isUsingFallback(): boolean {
  return usingFallback
}

function openDb(): Promise<IDBDatabase> {
  const existing = dbPromise
  if (existing) return existing
  const opened = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_RECORDS)) db.createObjectStore(STORE_RECORDS)
      if (!db.objectStoreNames.contains(STORE_BLOBS)) db.createObjectStore(STORE_BLOBS)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    request.onblocked = () => reject(new Error('IndexedDB blocked by another tab'))
  }).catch((error: unknown) => {
    usingFallback = true
    console.warn('[forged] IndexedDB unavailable, falling back to in-memory storage:', error)
    throw error
  })
  dbPromise = opened
  return opened
}

function fallbackStore(store: string): Map<string, unknown> {
  let map = memoryFallback.get(store)
  if (!map) {
    map = new Map()
    memoryFallback.set(store, map)
  }
  return map
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    throw new Error('fallback')
  }
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const request = run(tx.objectStore(store))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  try {
    return await withStore<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>)
  } catch {
    return fallbackStore(store).get(key) as T | undefined
  }
}

export async function idbPut(store: string, key: string, value: unknown): Promise<void> {
  try {
    await withStore(store, 'readwrite', (s) => s.put(value, key) as IDBRequest<IDBValidKey>)
  } catch {
    fallbackStore(store).set(key, value)
  }
}

export async function idbDelete(store: string, key: string): Promise<void> {
  try {
    await withStore(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>)
  } catch {
    fallbackStore(store).delete(key)
  }
}

export async function idbClear(store: string): Promise<void> {
  try {
    await withStore(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>)
  } catch {
    fallbackStore(store).clear()
  }
}

export async function idbKeys(store: string): Promise<string[]> {
  try {
    const keys = await withStore<IDBValidKey[]>(
      store,
      'readonly',
      (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>,
    )
    return keys.map(String)
  } catch {
    return [...fallbackStore(store).keys()]
  }
}
