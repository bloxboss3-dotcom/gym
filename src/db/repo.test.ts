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
})
