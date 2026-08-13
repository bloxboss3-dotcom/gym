import type { PerformedSession } from '@/engine/progression'
import type { Checkin, LoggedSet, Session, SessionEntry, TechniqueRating } from '@/types'
import { addDays, toIsoDate } from '@/lib/date'

/** Small builders so tests read like the scenario they describe. */

let n = 0
const nextId = (p: string) => `${p}${n++}`

export function set(
  weightKg: number,
  reps: number,
  rir: number | null = 2,
  warmup = false,
): LoggedSet {
  return { id: nextId('set'), weightKg, reps, rir, warmup, completedAt: 0 }
}

export function performed(options: {
  date?: string
  reps: number[]
  weightKg?: number
  /** Per-set loads, for sessions that were not all at one weight. */
  weightsKg?: number[]
  rir?: (number | null)[] | number | null
  pain?: number
  technique?: TechniqueRating
  plannedSets?: number
  repMin?: number
  repMax?: number
  targetRIR?: number
}): PerformedSession {
  const {
    date = toIsoDate(),
    reps,
    weightKg = 60,
    weightsKg,
    rir = 2,
    pain = 0,
    technique = 'clean',
    plannedSets = reps.length,
    repMin = 8,
    repMax = 12,
    targetRIR = 2,
  } = options
  const rirs = Array.isArray(rir) ? rir : reps.map(() => rir)
  return {
    date,
    sessionId: nextId('sess'),
    sets: reps.map((r, i) => ({ weightKg: weightsKg?.[i] ?? weightKg, reps: r, rir: rirs[i] ?? null })),
    pain,
    technique,
    plannedSets,
    repMin,
    repMax,
    targetRIR,
  }
}

export function entry(options: Partial<SessionEntry> & { exerciseId: string }): SessionEntry {
  return {
    id: nextId('entry'),
    plannedSets: 3,
    repMin: 8,
    repMax: 12,
    targetRIR: 2,
    restSec: 120,
    incrementKg: 2.5,
    sets: [],
    pain: 0,
    technique: 'clean',
    ...options,
  }
}

export function session(options: Partial<Session> & { entries: SessionEntry[] }): Session {
  const startedAt = options.startedAt ?? Date.now() - 45 * 60_000
  return {
    id: nextId('session'),
    date: toIsoDate(),
    programId: null,
    programDayId: null,
    title: 'Test session',
    status: 'completed',
    startedAt,
    endedAt: startedAt + 45 * 60_000,
    ...options,
  }
}

export function checkin(options: Partial<Checkin> & { date?: string } = {}): Checkin {
  return {
    id: nextId('chk'),
    date: options.date ?? toIsoDate(),
    sleepHours: 7.5,
    sleepQuality: 4,
    soreness: 2,
    readiness: 4,
    stress: 2,
    jointPain: 0,
    createdAt: 0,
    ...options,
  }
}

export const daysAgo = (n: number) => addDays(toIsoDate(), -n)
