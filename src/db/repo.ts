import { SCHEMA_VERSION, createDefaultAppData } from '@/db/defaults'
import { STORE_RECORDS, idbClear, idbGet, idbPut, isUsingFallback } from '@/db/idb'
import type { AppData } from '@/types'

/**
 * Persistence repository.
 *
 * This is the ONLY module that knows where data physically lives. Everything
 * above it works with a plain `AppData` object. Adding Supabase later means
 * writing a second implementation of this interface and choosing between them at
 * startup — the recommendation engine, the screens, and the store never change.
 */

export interface ForgedRepository {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  clear(): Promise<void>
  /** True when the backing store is volatile, so the UI can warn the user. */
  isEphemeral(): boolean
}

const ROOT_KEY = 'app-data'

/** Upgrade older persisted payloads in place. */
export function migrate(data: AppData): AppData {
  const next: AppData = { ...createDefaultAppData(), ...data }
  if (!next.schemaVersion || next.schemaVersion < SCHEMA_VERSION) {
    next.schemaVersion = SCHEMA_VERSION
  }
  // Defensive: a partially written record should never crash the app.
  next.sessions ??= []
  next.runs ??= []
  next.checkins ??= []
  next.proteinEntries ??= []
  next.deloads ??= []
  next.scheduleOverrides ??= []
  next.game = { ...createDefaultAppData().game, ...next.game }
  return next
}

export class IndexedDbRepository implements ForgedRepository {
  async load(): Promise<AppData> {
    const stored = await idbGet<AppData>(STORE_RECORDS, ROOT_KEY)
    if (!stored) return createDefaultAppData()
    try {
      return migrate(stored)
    } catch (error) {
      console.error('[forged] Failed to migrate stored data, starting fresh:', error)
      return createDefaultAppData()
    }
  }

  async save(data: AppData): Promise<void> {
    // Structured-clone chokes on anything non-plain; JSON round-trip guarantees
    // the payload is serialisable, which also matches what a backup exports.
    await idbPut(STORE_RECORDS, ROOT_KEY, JSON.parse(JSON.stringify(data)))
  }

  async clear(): Promise<void> {
    await idbClear(STORE_RECORDS)
  }

  isEphemeral(): boolean {
    return isUsingFallback()
  }
}

export const repository: ForgedRepository = new IndexedDbRepository()
