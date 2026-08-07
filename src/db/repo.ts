import { SCHEMA_VERSION, createDefaultAppData } from '@/db/defaults'
import { STORE_RECORDS, idbClear, idbGet, idbPut, isUsingFallback } from '@/db/idb'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import { STARTER_FOODS } from '@/data/foods'
import type { AppData, Exercise, FoodItem } from '@/types'

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
  next.foods = reconcileStarterFoods(next.foods)
  next.exercises = reconcileExercises(next.exercises)
  return next
}

/**
 * Keep the built-in exercise list in sync with the shipped library.
 *
 * Same reasoning as the foods below: the library is copied into stored data so
 * it can be edited, which means a device that saved data before a field existed
 * is holding rows without it. A stored exercise with no `loading` predates the
 * plate calculator, so take the shipped definition.
 */
function reconcileExercises(stored: Exercise[] | undefined): Exercise[] {
  const existing = Array.isArray(stored) ? stored : []
  const canonical = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e]))
  const known = new Set(existing.map((e) => e.id))

  const merged = existing.map((exercise) => {
    if (exercise.custom) {
      // A custom movement saved before loading styles existed defaults to the
      // commonest case rather than crashing the weight label.
      return exercise.loading ? exercise : { ...exercise, loading: 'other' as const }
    }
    const fresh = canonical.get(exercise.id)
    if (!fresh) return exercise
    return exercise.loading == null ? { ...fresh } : { ...fresh, ...exercise }
  })

  for (const exercise of EXERCISE_LIBRARY) {
    if (!known.has(exercise.id)) merged.push({ ...exercise })
  }
  return merged
}

/**
 * Keep the built-in food list in sync with the shipped library.
 *
 * The starter foods are copied into stored data so that a user can edit them,
 * which means a device that saved data before calories existed is holding
 * protein-only rows. Refresh anything the user has not customised, and add
 * foods that shipped later. Custom foods are never touched.
 */
function reconcileStarterFoods(stored: FoodItem[] | undefined): FoodItem[] {
  const existing = Array.isArray(stored) ? stored : []
  const canonical = new Map(STARTER_FOODS.map((f) => [f.id, f]))
  const known = new Set(existing.map((f) => f.id))

  const merged = existing.map((food) => {
    if (food.custom) return food
    const fresh = canonical.get(food.id)
    if (!fresh) return food
    // Missing energy means this row predates calorie tracking; take the new one.
    return food.kcal == null ? { ...fresh } : { ...fresh, ...food }
  })

  for (const food of STARTER_FOODS) {
    if (!known.has(food.id)) merged.push({ ...food })
  }
  return merged
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
