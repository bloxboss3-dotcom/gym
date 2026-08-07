import { MUSCLES } from '@/data/muscles'
import type { Confidence } from '@/engine/progression'
import type { Exercise, IsoDate, MuscleKey, ProgramDay, ProgramSlot, Session } from '@/types'
import { daysBetween } from '@/lib/date'

/**
 * What you ACTUALLY train.
 *
 * The generated program is a starting point, not a contract. People swap
 * movements, skip things, add the machine their gym happens to have, and after
 * a month what they really do has drifted away from what was prescribed — at
 * which point picking exercises by hand every session is pure friction.
 *
 * This module reads the session history back and finds the sessions you keep
 * repeating, so the app can offer them instead of asking. It is deterministic
 * and explainable on purpose: no hidden model, no scores you cannot audit. The
 * UI shows how many times a pattern was seen and when, so you can disagree
 * with it.
 *
 * It NEVER changes a training recommendation. Which exercises to offer and
 * what load to lift next are separate questions — this answers the first and
 * leaves the second entirely to `engine/progression.ts`.
 */

export interface UsualExercise {
  exerciseId: string
  /** How many sessions in this pattern included it. */
  sessions: number
  /** Fraction of the pattern's sessions that included it, 0–1. */
  frequency: number
  /** Median working-set count when it appears. */
  typicalSets: number
  /** Median top-of-range reps, so a rebuilt slot matches how you train. */
  typicalReps: number
}

export interface UsualSession {
  /** Stable id derived from the movements, so it survives a reload. */
  id: string
  name: string
  /** Movements that show up in most repetitions of this pattern. */
  exercises: UsualExercise[]
  timesDone: number
  lastDate: IsoDate
  daysSince: number
  confidence: Confidence
  /** Plain-language justification, shown in the UI rather than hidden. */
  reason: string
}

/** Two sessions belong to the same pattern above this Jaccard similarity. */
const SIMILARITY_THRESHOLD = 0.5
/** A movement joins the pattern's core when it appears this often. */
const CORE_FREQUENCY = 0.5
/** Sessions older than this stop counting as "what you currently do". */
const WINDOW_DAYS = 56
/** Below this many repetitions it is not yet a habit. */
const MIN_REPEATS = 2

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const id of a) if (b.has(id)) shared++
  return shared / (a.size + b.size - shared)
}

interface Trained {
  date: IsoDate
  title: string
  ids: Set<string>
  setsByExercise: Map<string, number>
  repsByExercise: Map<string, number>
}

/** Reduce a session to the working sets it actually contains. */
function trainedFrom(session: Session): Trained | null {
  const setsByExercise = new Map<string, number>()
  const repsByExercise = new Map<string, number>()
  for (const entry of session.entries) {
    const working = entry.sets.filter((s) => !s.warmup && s.reps > 0)
    if (!working.length) continue
    setsByExercise.set(entry.exerciseId, working.length)
    repsByExercise.set(entry.exerciseId, median(working.map((s) => s.reps)))
  }
  if (!setsByExercise.size) return null
  return {
    date: session.date,
    title: session.title,
    ids: new Set(setsByExercise.keys()),
    setsByExercise,
    repsByExercise,
  }
}

/**
 * Name a pattern from the muscles its movements actually train.
 *
 * Falls back to the most common session title, because a name the user chose
 * beats one this file invented.
 */
function nameFor(exerciseIds: string[], byId: Map<string, Exercise>, titles: string[]): string {
  const totals = new Map<MuscleKey, number>()
  for (const id of exerciseIds) {
    const exercise = byId.get(id)
    if (!exercise) continue
    for (const [muscle, contribution] of Object.entries(exercise.contributions) as [MuscleKey, number][]) {
      if (contribution < 1) continue // primary movers only
      totals.set(muscle, (totals.get(muscle) ?? 0) + contribution)
    }
  }
  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([muscle]) => MUSCLES.find((m) => m.key === muscle)?.label ?? muscle)

  if (top.length) return top.join(' & ')

  const counts = new Map<string, number>()
  for (const title of titles) counts.set(title, (counts.get(title) ?? 0) + 1)
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return common?.[0] ?? 'Your usual session'
}

/**
 * Find the sessions you keep repeating.
 *
 * Greedy single-pass clustering, newest session first, comparing each session
 * against every cluster's current core. Chosen over anything cleverer because
 * it is deterministic, runs in a blink on a phone, and — most importantly —
 * can be explained in one sentence to somebody who wants to know why the app
 * is suggesting something.
 */
export function findUsualSessions(input: {
  sessions: Session[]
  exercises: Exercise[]
  today: IsoDate
  windowDays?: number
}): UsualSession[] {
  const { sessions, exercises, today } = input
  const windowDays = input.windowDays ?? WINDOW_DAYS
  const byId = new Map(exercises.map((e) => [e.id, e]))

  const trained = sessions
    .filter((s) => s.status === 'completed' && daysBetween(s.date, today) <= windowDays)
    .map(trainedFrom)
    .filter((t): t is Trained => t !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const clusters: Trained[][] = []
  for (const session of trained) {
    const core = (members: Trained[]) => {
      const counts = new Map<string, number>()
      for (const member of members) for (const id of member.ids) counts.set(id, (counts.get(id) ?? 0) + 1)
      return new Set(
        [...counts.entries()].filter(([, n]) => n / members.length >= CORE_FREQUENCY).map(([id]) => id),
      )
    }
    const match = clusters.find((members) => jaccard(session.ids, core(members)) >= SIMILARITY_THRESHOLD)
    if (match) match.push(session)
    else clusters.push([session])
  }

  return clusters
    .filter((members) => members.length >= MIN_REPEATS)
    .map((members) => {
      const counts = new Map<string, number>()
      for (const member of members) for (const id of member.ids) counts.set(id, (counts.get(id) ?? 0) + 1)

      const coreExercises: UsualExercise[] = [...counts.entries()]
        .filter(([, n]) => n / members.length >= CORE_FREQUENCY)
        .map(([exerciseId, n]) => ({
          exerciseId,
          sessions: n,
          frequency: Number((n / members.length).toFixed(2)),
          typicalSets: Math.max(
            1,
            median(members.map((m) => m.setsByExercise.get(exerciseId) ?? 0).filter((v) => v > 0)),
          ),
          typicalReps: Math.max(
            1,
            median(members.map((m) => m.repsByExercise.get(exerciseId) ?? 0).filter((v) => v > 0)),
          ),
        }))
        // Most-consistent first, then by how much of the session they are.
        .sort((a, b) => b.frequency - a.frequency || b.typicalSets - a.typicalSets || a.exerciseId.localeCompare(b.exerciseId))

      const lastDate = members[0].date
      const daysSince = daysBetween(lastDate, today)
      const ids = coreExercises.map((e) => e.exerciseId)

      return {
        id: `usual-${[...ids].sort().join('_').slice(0, 80)}`,
        name: nameFor(ids, byId, members.map((m) => m.title)),
        exercises: coreExercises,
        timesDone: members.length,
        lastDate,
        daysSince,
        confidence: members.length >= 4 ? 'high' : members.length >= 3 ? 'medium' : 'low',
        reason:
          `You have trained this combination ${members.length} times in the last ${windowDays} days, ` +
          `most recently ${daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`}.`,
      } satisfies UsualSession
    })
    .filter((usual) => usual.exercises.length > 0)
    .sort((a, b) => b.timesDone - a.timesDone || a.daysSince - b.daysSince)
}

/**
 * Which usual session is most overdue.
 *
 * Deliberately simple: of the patterns you actually repeat, the one you have
 * left longest. That matches how most people rotate, and it is a suggestion
 * rather than a prescription — the volume and progression engines still own
 * every decision about how hard to train.
 */
export function mostOverdue(usuals: UsualSession[]): UsualSession | null {
  if (!usuals.length) return null
  return [...usuals].sort((a, b) => b.daysSince - a.daysSince || b.timesDone - a.timesDone)[0]
}

/**
 * Turn a detected pattern into something `startSession` can run.
 *
 * Rep range is rebuilt around how you actually train the movement rather than
 * a fixed default: the median top-end rep becomes the top of the range.
 */
export function toProgramDay(
  usual: UsualSession,
  exercises: Exercise[],
  defaults: { restSec: number; targetRIR: number },
): ProgramDay {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const slots: ProgramSlot[] = usual.exercises
    .filter((e) => byId.has(e.exerciseId))
    .map((e, i) => {
      const repMax = Math.max(4, e.typicalReps)
      return {
        id: `${usual.id}-slot-${i}`,
        exerciseId: e.exerciseId,
        sets: e.typicalSets,
        repMin: Math.max(1, repMax - 4),
        repMax,
        restSec: defaults.restSec,
        targetRIR: defaults.targetRIR,
        incrementKg: byId.get(e.exerciseId)?.incrementKg ?? null,
      }
    })
  return { id: usual.id, name: usual.name, weekday: null, slots }
}
