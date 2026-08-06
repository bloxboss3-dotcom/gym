import { beforeEach, describe, expect, it } from 'vitest'
import { IndexedDbRepository, migrate } from '@/db/repo'
import { SCHEMA_VERSION, createDefaultAppData } from '@/db/defaults'
import { buildDemoData } from '@/seed/demo'
import type { AppData } from '@/types'

/**
 * These run against fake-indexeddb, so they exercise the real storage path
 * rather than a mock — losing someone's training history is the worst bug this
 * app could have.
 */
describe('IndexedDB persistence', () => {
  const repo = new IndexedDbRepository()

  beforeEach(async () => {
    await repo.clear()
  })

  it('returns default data on a fresh install', async () => {
    const loaded = await repo.load()
    expect(loaded.profile).toBeNull()
    expect(loaded.exercises.length).toBeGreaterThan(0)
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('round-trips a full dataset', async () => {
    const data = buildDemoData()
    await repo.save(data)
    const loaded = await repo.load()
    expect(loaded.sessions.length).toBe(data.sessions.length)
    expect(loaded.profile?.name).toBe(data.profile?.name)
    expect(loaded.game.xp).toBe(data.game.xp)
    expect(loaded.game.equipped.weapon).toBe(data.game.equipped.weapon)
  })

  it('survives repeated saves — the last write wins', async () => {
    const data = createDefaultAppData()
    await repo.save({ ...data, activeProgramId: 'first' })
    await repo.save({ ...data, activeProgramId: 'second' })
    expect((await repo.load()).activeProgramId).toBe('second')
  })

  it('clears everything on request', async () => {
    await repo.save(buildDemoData())
    await repo.clear()
    expect((await repo.load()).profile).toBeNull()
  })
})

describe('migration', () => {
  it('fills in collections that an older payload did not have', () => {
    const partial = { schemaVersion: 0, sessions: [] } as unknown as AppData
    const migrated = migrate(partial)
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(Array.isArray(migrated.runs)).toBe(true)
    expect(Array.isArray(migrated.deloads)).toBe(true)
    expect(migrated.game.equipped).toBeDefined()
    expect(migrated.settings).toBeDefined()
  })

  it('preserves data that is already present', () => {
    const data = buildDemoData()
    const migrated = migrate(data)
    expect(migrated.sessions.length).toBe(data.sessions.length)
    expect(migrated.game.xp).toBe(data.game.xp)
  })

  it('back-fills a game state that was written before new fields existed', () => {
    const data = { ...createDefaultAppData(), game: { xp: 500 } } as unknown as AppData
    const migrated = migrate(data)
    expect(migrated.game.xp).toBe(500)
    expect(Array.isArray(migrated.game.owned)).toBe(true)
    expect(Array.isArray(migrated.game.ledger)).toBe(true)
  })

  it('upgrades stored starter foods that predate calorie tracking', () => {
    const base = createDefaultAppData()
    const stale: AppData = {
      ...base,
      foods: [
        // What a device that installed the protein-only build is holding.
        { id: 'food-chicken-breast', name: 'Chicken breast', proteinG: 46, serving: '150 g cooked', tags: ['omnivore'], budgetFriendly: true },
        { id: 'food-my-thing', name: 'My thing', proteinG: 30, serving: '1 bowl', tags: ['omnivore'], budgetFriendly: false, custom: true },
      ],
    }
    const upgraded = migrate(stale)

    const chicken = upgraded.foods.find((f) => f.id === 'food-chicken-breast')!
    expect(chicken.kcal).toBeGreaterThan(0)
    expect(chicken.carbsG).toBeDefined()

    // Custom foods are never rewritten, and foods that shipped later appear.
    const mine = upgraded.foods.find((f) => f.id === 'food-my-thing')!
    expect(mine.name).toBe('My thing')
    expect(mine.kcal).toBeUndefined()
    expect(upgraded.foods.length).toBeGreaterThan(50)
  })

  it('keeps a user edit to a built-in food while still adding the new fields', () => {
    const base = createDefaultAppData()
    const edited: AppData = {
      ...base,
      foods: [{ ...base.foods.find((f) => f.id === 'food-whey')!, proteinG: 27, kcal: 130 }],
    }
    const upgraded = migrate(edited)
    const whey = upgraded.foods.find((f) => f.id === 'food-whey')!
    expect(whey.proteinG).toBe(27)
    expect(whey.kcal).toBe(130)
  })

  it('upgrades stored exercises that predate loading styles', () => {
    const base = createDefaultAppData()
    const bench = base.exercises.find((e) => e.id === 'barbell-bench-press')!
    // Strip the field the way a pre-update device would have stored it.
    const { loading: _dropped, ...legacy } = bench
    const stale: AppData = { ...base, exercises: [legacy as typeof bench] }

    const upgraded = migrate(stale)
    const restored = upgraded.exercises.find((e) => e.id === 'barbell-bench-press')!
    expect(restored.loading).toBe('barbell')
    // And movements that shipped later are added rather than lost.
    expect(upgraded.exercises.length).toBe(base.exercises.length)
    expect(upgraded.exercises.every((e) => e.loading)).toBe(true)
  })

  it('gives a legacy custom exercise a loading style without overwriting it', () => {
    const base = createDefaultAppData()
    const legacy = {
      id: 'ex_mine',
      name: 'My movement',
      contributions: { chest: 1 },
      equipment: ['bodyweight'],
      pattern: 'isolation',
      unilateral: false,
      lowerBody: false,
      incrementKg: 2.5,
      cue: 'x',
      custom: true,
    }
    const upgraded = migrate({ ...base, exercises: [legacy as never] })
    const mine = upgraded.exercises.find((e) => e.id === 'ex_mine')!
    expect(mine.loading).toBe('other')
    expect(mine.name).toBe('My movement')
  })
})
