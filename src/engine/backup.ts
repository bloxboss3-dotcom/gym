import { SCHEMA_VERSION, createDefaultAppData } from '@/db/defaults'
import type { AppData, BackupFile } from '@/types'

/**
 * Backup export / import.
 *
 * FORGED stores everything on the device, so an export is the only real safety
 * net a user has. Import therefore has to be defensive: a corrupted or truncated
 * file must fail loudly with a readable message rather than half-restoring and
 * silently destroying the data that was already there.
 */

export const BACKUP_FORMAT = 'forged-backup'

export function createBackup(data: AppData): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify(createBackup(data), null, 2)
}

export function backupFilename(name?: string | null): string {
  const stamp = new Date().toISOString().slice(0, 10)
  const who = (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `forged-backup-${who || 'warrior'}-${stamp}.json`
}

export interface ImportSummary {
  sessions: number
  runs: number
  checkins: number
  proteinEntries: number
  ownedItems: number
  exercises: number
  programs: number
  hasProfile: boolean
  exportedAt: string | null
}

export interface ImportResult {
  ok: boolean
  data: AppData | null
  errors: string[]
  warnings: string[]
  summary: ImportSummary | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function arrayOr<T>(value: unknown, fallback: T[], label: string, warnings: string[]): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value !== undefined) warnings.push(`"${label}" was not a list and has been reset.`)
  return fallback
}

/**
 * Validate an untrusted parsed JSON value and normalise it into AppData.
 * Unknown extra keys are dropped; missing optional collections are defaulted.
 */
export function validateBackup(raw: unknown): ImportResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isRecord(raw)) {
    return { ok: false, data: null, errors: ['That file is not a FORGED backup (expected a JSON object).'], warnings, summary: null }
  }
  if (raw.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      data: null,
      errors: [`Unrecognised file format${typeof raw.format === 'string' ? ` ("${raw.format}")` : ''}. FORGED backups have a "format" of "${BACKUP_FORMAT}".`],
      warnings,
      summary: null,
    }
  }
  const version = typeof raw.version === 'number' ? raw.version : NaN
  if (!Number.isFinite(version)) {
    return { ok: false, data: null, errors: ['Backup is missing a version number.'], warnings, summary: null }
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      data: null,
      errors: [
        `This backup was written by a newer version of FORGED (backup v${version}, this app reads up to v${SCHEMA_VERSION}). Update the app before importing.`,
      ],
      warnings,
      summary: null,
    }
  }
  if (!isRecord(raw.data)) {
    return { ok: false, data: null, errors: ['Backup has no "data" section.'], warnings, summary: null }
  }

  const incoming = raw.data
  const base = createDefaultAppData()

  // Profile is optional (a backup taken before onboarding is legitimate), but
  // if present it must have the fields the engine depends on.
  let profile = base.profile
  if (incoming.profile !== null && incoming.profile !== undefined) {
    if (!isRecord(incoming.profile)) {
      warnings.push('Profile was malformed and has been dropped — you will be asked to onboard again.')
    } else {
      const p = incoming.profile
      const missing = (['bodyWeightKg', 'heightCm', 'units', 'experience', 'goal'] as const).filter(
        (key) => p[key] === undefined || p[key] === null,
      )
      if (missing.length) {
        errors.push(`Profile is missing required fields: ${missing.join(', ')}.`)
      } else if (typeof p.bodyWeightKg !== 'number' || p.bodyWeightKg <= 0) {
        errors.push('Profile body weight is not a positive number.')
      } else if (p.units !== 'kg' && p.units !== 'lb') {
        errors.push(`Profile unit preference "${String(p.units)}" is not "kg" or "lb".`)
      } else {
        profile = { ...(p as unknown as AppData['profile']) } as AppData['profile']
      }
    }
  }

  if (errors.length) return { ok: false, data: null, errors, warnings, summary: null }

  const data: AppData = {
    schemaVersion: SCHEMA_VERSION,
    profile,
    settings: isRecord(incoming.settings)
      ? { ...base.settings, ...(incoming.settings as Partial<AppData['settings']>) }
      : base.settings,
    exercises: arrayOr(incoming.exercises, base.exercises, 'exercises', warnings),
    programs: arrayOr(incoming.programs, base.programs, 'programs', warnings),
    activeProgramId: typeof incoming.activeProgramId === 'string' ? incoming.activeProgramId : null,
    sessions: arrayOr(incoming.sessions, base.sessions, 'sessions', warnings),
    runs: arrayOr(incoming.runs, base.runs, 'runs', warnings),
    checkins: arrayOr(incoming.checkins, base.checkins, 'checkins', warnings),
    bodyWeights: arrayOr(incoming.bodyWeights, base.bodyWeights, 'bodyWeights', warnings),
    measurements: arrayOr(incoming.measurements, base.measurements, 'measurements', warnings),
    photos: arrayOr(incoming.photos, base.photos, 'photos', warnings),
    foods: arrayOr(incoming.foods, base.foods, 'foods', warnings),
    proteinEntries: arrayOr(incoming.proteinEntries, base.proteinEntries, 'proteinEntries', warnings),
    meals: arrayOr(incoming.meals, base.meals, 'meals', warnings),
    game: isRecord(incoming.game)
      ? { ...base.game, ...(incoming.game as Partial<AppData['game']>) }
      : base.game,
    deloads: arrayOr(incoming.deloads, base.deloads, 'deloads', warnings),
    scheduleOverrides: arrayOr(incoming.scheduleOverrides, base.scheduleOverrides, 'scheduleOverrides', warnings),
  }

  // Structural sanity checks on the collections the engine reads most.
  const badSessions = data.sessions.filter((s) => !s || typeof s.id !== 'string' || !Array.isArray(s.entries))
  if (badSessions.length) {
    data.sessions = data.sessions.filter((s) => s && typeof s.id === 'string' && Array.isArray(s.entries))
    warnings.push(`${badSessions.length} malformed session${badSessions.length === 1 ? '' : 's'} skipped.`)
  }
  const badRuns = data.runs.filter((r) => !r || typeof r.id !== 'string' || typeof r.distanceKm !== 'number')
  if (badRuns.length) {
    data.runs = data.runs.filter((r) => r && typeof r.id === 'string' && typeof r.distanceKm === 'number')
    warnings.push(`${badRuns.length} malformed run${badRuns.length === 1 ? '' : 's'} skipped.`)
  }
  if (!Array.isArray(data.game.owned)) {
    data.game = { ...data.game, owned: base.game.owned }
    warnings.push('Inventory was malformed and has been reset to the starter loadout.')
  }
  if (!Array.isArray(data.game.ledger)) {
    data.game = { ...data.game, ledger: [] }
    warnings.push('Reward history was malformed and has been reset.')
  }
  if (!data.exercises.length) {
    data.exercises = base.exercises
    warnings.push('Exercise library was empty and has been restored from defaults.')
  }
  if (version < SCHEMA_VERSION) {
    warnings.push(`Backup was version ${version}; upgraded to version ${SCHEMA_VERSION}.`)
  }

  return {
    ok: true,
    data,
    errors,
    warnings,
    summary: {
      sessions: data.sessions.length,
      runs: data.runs.length,
      checkins: data.checkins.length,
      proteinEntries: data.proteinEntries.length,
      ownedItems: data.game.owned.length,
      exercises: data.exercises.length,
      programs: data.programs.length,
      hasProfile: Boolean(data.profile),
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
    },
  }
}

export function parseBackupText(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return {
      ok: false,
      data: null,
      errors: [`That file is not valid JSON (${(error as Error).message}).`],
      warnings: [],
      summary: null,
    }
  }
  return validateBackup(parsed)
}
