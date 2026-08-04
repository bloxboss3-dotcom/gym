import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, createDefaultAppData } from '@/db/defaults'
import {
  BACKUP_FORMAT,
  backupFilename,
  createBackup,
  parseBackupText,
  serializeBackup,
  validateBackup,
} from '@/engine/backup'
import { buildDemoData } from '@/seed/demo'

describe('backup export', () => {
  it('wraps the data with a format marker and version', () => {
    const backup = createBackup(createDefaultAppData())
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.version).toBe(SCHEMA_VERSION)
    expect(typeof backup.exportedAt).toBe('string')
  })

  it('serialises to valid JSON that round-trips', () => {
    const data = buildDemoData()
    const result = parseBackupText(serializeBackup(data))
    expect(result.ok).toBe(true)
    expect(result.data!.sessions.length).toBe(data.sessions.length)
    expect(result.data!.runs.length).toBe(data.runs.length)
    expect(result.data!.game.owned.length).toBe(data.game.owned.length)
    expect(result.data!.profile?.name).toBe(data.profile?.name)
  })

  it('produces a safe, dated filename', () => {
    expect(backupFilename('Kade Ironside')).toMatch(/^forged-backup-kade-ironside-\d{4}-\d{2}-\d{2}\.json$/)
    expect(backupFilename(null)).toMatch(/^forged-backup-warrior-/)
    expect(backupFilename('  ///  ')).toMatch(/^forged-backup-warrior-/)
  })
})

describe('backup import validation', () => {
  const valid = () => JSON.parse(serializeBackup(createDefaultAppData()))

  it('rejects a non-object', () => {
    expect(validateBackup(null).ok).toBe(false)
    expect(validateBackup('nope').ok).toBe(false)
    expect(validateBackup([1, 2, 3]).ok).toBe(false)
  })

  it('rejects a file that is not a FORGED backup', () => {
    const result = validateBackup({ format: 'some-other-app', version: 1, data: {} })
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/Unrecognised file format/)
  })

  it('rejects a backup with no version', () => {
    const result = validateBackup({ format: BACKUP_FORMAT, data: {} })
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/version/i)
  })

  it('refuses a backup from a newer app version rather than mangling it', () => {
    const result = validateBackup({ format: BACKUP_FORMAT, version: SCHEMA_VERSION + 5, data: {} })
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/newer version/i)
  })

  it('rejects a backup with no data section', () => {
    expect(validateBackup({ format: BACKUP_FORMAT, version: 1 }).ok).toBe(false)
  })

  it('rejects a profile that is missing fields the engine depends on', () => {
    const file = valid()
    file.data.profile = { name: 'Broken' }
    const result = validateBackup(file)
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/missing required fields/i)
  })

  it('rejects a profile with a nonsensical body weight', () => {
    const file = valid()
    file.data.profile = {
      name: 'X',
      bodyWeightKg: -5,
      heightCm: 180,
      units: 'kg',
      experience: 'beginner',
      goal: 'general',
    }
    expect(validateBackup(file).errors[0]).toMatch(/positive number/i)
  })

  it('rejects an unknown unit preference', () => {
    const file = valid()
    file.data.profile = {
      name: 'X',
      bodyWeightKg: 80,
      heightCm: 180,
      units: 'stones',
      experience: 'beginner',
      goal: 'general',
    }
    expect(validateBackup(file).errors[0]).toMatch(/"stones"/)
  })

  it('accepts a backup taken before onboarding', () => {
    const file = valid()
    file.data.profile = null
    const result = validateBackup(file)
    expect(result.ok).toBe(true)
    expect(result.summary!.hasProfile).toBe(false)
  })

  it('skips malformed sessions with a warning instead of failing the import', () => {
    const file = valid()
    file.data.sessions = [
      { id: 'good', entries: [], date: '2026-01-01', status: 'completed', startedAt: 0, endedAt: 1 },
      { nonsense: true },
      null,
    ]
    const result = validateBackup(file)
    expect(result.ok).toBe(true)
    expect(result.data!.sessions).toHaveLength(1)
    expect(result.warnings.join(' ')).toMatch(/malformed session/i)
  })

  it('skips malformed runs', () => {
    const file = valid()
    file.data.runs = [{ id: 'r', distanceKm: 5 }, { id: 'bad' }]
    const result = validateBackup(file)
    expect(result.data!.runs).toHaveLength(1)
    expect(result.warnings.join(' ')).toMatch(/malformed run/i)
  })

  it('resets collections that arrive with the wrong type', () => {
    const file = valid()
    file.data.checkins = 'not an array'
    file.data.game.owned = 'nope'
    const result = validateBackup(file)
    expect(result.ok).toBe(true)
    expect(Array.isArray(result.data!.checkins)).toBe(true)
    expect(Array.isArray(result.data!.game.owned)).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('restores the exercise library if the backup shipped an empty one', () => {
    const file = valid()
    file.data.exercises = []
    const result = validateBackup(file)
    expect(result.data!.exercises.length).toBeGreaterThan(0)
    expect(result.warnings.join(' ')).toMatch(/exercise library/i)
  })

  it('upgrades an older schema version and says so', () => {
    const file = valid()
    file.version = SCHEMA_VERSION - 1
    const result = validateBackup(file)
    expect(result.ok).toBe(true)
    expect(result.data!.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.warnings.join(' ')).toMatch(/upgraded to version/i)
  })

  it('drops unknown top-level keys rather than importing junk', () => {
    const file = valid()
    file.data.somethingWeird = { evil: true }
    const result = validateBackup(file)
    expect(result.ok).toBe(true)
    expect('somethingWeird' in result.data!).toBe(false)
  })

  it('reports a readable error for invalid JSON', () => {
    const result = parseBackupText('{ this is not json')
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/not valid JSON/i)
  })

  it('summarises what the file contains before anything is replaced', () => {
    const result = parseBackupText(serializeBackup(buildDemoData()))
    expect(result.summary!.sessions).toBeGreaterThan(0)
    expect(result.summary!.runs).toBeGreaterThan(0)
    expect(result.summary!.ownedItems).toBeGreaterThan(0)
    expect(result.summary!.exportedAt).toBeTruthy()
  })
})
