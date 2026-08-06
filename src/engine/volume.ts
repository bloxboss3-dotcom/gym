import { RULES } from '@/config/rules'
import { MUSCLES, PRIMARY_MUSCLES } from '@/data/muscles'
import type { Exercise, Experience, IsoDate, MuscleKey, Program, Session } from '@/types'

/**
 * Weekly volume accounting.
 *
 * "Hard sets" are the currency: a working (non-warm-up) set taken close enough
 * to failure to drive adaptation. Each exercise contributes fractionally to each
 * muscle via the centralised map in `src/data/exercises.ts`, so the dashboard can
 * show exactly which movements produced each number.
 *
 * The ~10 sets/muscle/week reference point is a group average, not a personal
 * requirement. FORGED starts conservatively based on experience and adds at most
 * a couple of sets per week — it will never auto-escalate anyone toward extreme
 * volume, because more is not automatically better.
 */

export interface MuscleVolume {
  muscle: MuscleKey
  /** Fractional hard sets credited this week. */
  hardSets: number
  /** Sets the active program planned for this muscle in a week. */
  plannedSets: number
  /** Sum of weight × reps across contributing sets. */
  volumeLoadKg: number
  /** Working sets with no RIR reported — counted, but flagged as uncertain. */
  unratedSets: number
  contributors: { exerciseId: string; sets: number }[]
}

export type VolumeStatus = 'below' | 'within' | 'above' | 'high'

export interface MuscleVolumeAssessment extends MuscleVolume {
  range: { min: number; max: number }
  status: VolumeStatus
  message: string
}

function emptyVolume(muscle: MuscleKey): MuscleVolume {
  return {
    muscle,
    hardSets: 0,
    plannedSets: 0,
    volumeLoadKg: 0,
    unratedSets: 0,
    contributors: [],
  }
}

/**
 * Count completed hard sets per muscle across a set of dates.
 * `dates` is normally the current training week.
 */
export function weeklyMuscleVolume(
  sessions: Session[],
  exercises: Exercise[],
  dates: IsoDate[],
): Record<MuscleKey, MuscleVolume> {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const dateSet = new Set(dates)
  const result = {} as Record<MuscleKey, MuscleVolume>
  for (const m of MUSCLES) result[m.key] = emptyVolume(m.key)

  for (const session of sessions) {
    if (session.status !== 'completed' || !dateSet.has(session.date)) continue
    for (const entry of session.entries) {
      const exercise = byId.get(entry.exerciseId)
      if (!exercise) continue
      const working = entry.sets.filter((s) => !s.warmup && s.reps > 0)
      const hard = working.filter((s) => s.rir === null || s.rir <= RULES.volume.hardSetRirCutoff)
      if (!hard.length) continue
      const unrated = hard.filter((s) => s.rir === null).length
      const load = hard.reduce((sum, s) => sum + s.weightKg * s.reps, 0)

      for (const [muscle, contribution] of Object.entries(exercise.contributions) as [
        MuscleKey,
        number,
      ][]) {
        if (contribution < RULES.volume.minContribution) continue
        const bucket = result[muscle]
        if (!bucket) continue
        bucket.hardSets += hard.length * contribution
        bucket.volumeLoadKg += load * contribution
        bucket.unratedSets += unrated * contribution
        const existing = bucket.contributors.find((c) => c.exerciseId === exercise.id)
        if (existing) existing.sets += hard.length * contribution
        else bucket.contributors.push({ exerciseId: exercise.id, sets: hard.length * contribution })
      }
    }
  }

  for (const m of MUSCLES) {
    const bucket = result[m.key]
    bucket.hardSets = Number(bucket.hardSets.toFixed(1))
    bucket.volumeLoadKg = Math.round(bucket.volumeLoadKg)
    bucket.unratedSets = Number(bucket.unratedSets.toFixed(1))
    bucket.contributors.sort((a, b) => b.sets - a.sets)
  }
  return result
}

/** Sets per muscle the active program plans across a full week. */
export function plannedMuscleVolume(
  program: Program | null,
  exercises: Exercise[],
): Record<MuscleKey, number> {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const out = {} as Record<MuscleKey, number>
  for (const m of MUSCLES) out[m.key] = 0
  if (!program) return out
  for (const day of program.days) {
    for (const slot of day.slots) {
      const exercise = byId.get(slot.exerciseId)
      if (!exercise) continue
      for (const [muscle, contribution] of Object.entries(exercise.contributions) as [
        MuscleKey,
        number,
      ][]) {
        if (contribution < RULES.volume.minContribution) continue
        out[muscle] = Number(((out[muscle] ?? 0) + slot.sets * contribution).toFixed(1))
      }
    }
  }
  return out
}

export function startingVolumeRange(experience: Experience): { min: number; max: number } {
  return RULES.volume.startingRange[experience] ?? RULES.volume.startingRange.beginner
}

export function assessMuscleVolume(
  volume: MuscleVolume,
  planned: number,
  experience: Experience,
): MuscleVolumeAssessment {
  const range = startingVolumeRange(experience)
  const sets = volume.hardSets
  let status: VolumeStatus
  let message: string

  if (sets === 0) {
    status = 'below'
    message = 'No hard sets logged for this muscle this week.'
  } else if (sets < range.min) {
    status = 'below'
    message = `Below your starting range of ${range.min}–${range.max} sets. Adding a set or two is reasonable if recovery is good.`
  } else if (sets <= range.max) {
    status = 'within'
    message = `Inside your ${range.min}–${range.max} set starting range for a ${experience} lifter. Progress the load before you add more sets.`
  } else if (sets <= RULES.volume.autoCeiling) {
    status = 'above'
    message = `Above your starting range. That is fine if you are recovering well — but extra sets are not free, and FORGED will not push you higher automatically.`
  } else {
    status = 'high'
    message = `Past ${RULES.volume.autoCeiling} hard sets in a week. Very high volumes raise the recovery cost sharply without a guaranteed payoff. Consider whether quality is holding up.`
  }

  return { ...volume, plannedSets: planned, range, status, message }
}

export function assessAllMuscles(
  sessions: Session[],
  exercises: Exercise[],
  dates: IsoDate[],
  program: Program | null,
  experience: Experience,
  muscles: MuscleKey[] = PRIMARY_MUSCLES,
): MuscleVolumeAssessment[] {
  const actual = weeklyMuscleVolume(sessions, exercises, dates)
  const planned = plannedMuscleVolume(program, exercises)
  return muscles.map((m) => assessMuscleVolume(actual[m], planned[m] ?? 0, experience))
}

export interface VolumeProgressionSuggestion {
  muscle: MuscleKey
  addSets: number
  reason: string
}

/**
 * Conservative volume progression: at most `weeklyAddCap` sets per muscle per
 * week, only for muscles below their starting range, only when the week was
 * actually completed, and never past the ceiling.
 */
export function suggestVolumeProgression(
  assessments: MuscleVolumeAssessment[],
  completionFraction: number,
  experience: Experience,
): VolumeProgressionSuggestion[] {
  if (completionFraction < 0.8) return []
  const range = startingVolumeRange(experience)
  return assessments
    .filter((a) => a.status === 'below' && a.hardSets > 0 && a.hardSets < RULES.volume.autoCeiling)
    .map((a) => ({
      muscle: a.muscle,
      addSets: Math.min(RULES.volume.weeklyAddCap, Math.ceil(range.min - a.hardSets)),
      reason: `${a.hardSets} hard sets last week, below your ${range.min}–${range.max} starting range, and you completed the week. Adding up to ${RULES.volume.weeklyAddCap} sets is a small, recoverable step.`,
    }))
    .filter((s) => s.addSets > 0)
}

export interface WeeklyCompletion {
  completedSets: number
  plannedSets: number
  fraction: number
  completedSessions: number
  plannedSessions: number
}

export function weeklyCompletion(
  sessions: Session[],
  dates: IsoDate[],
  program: Program | null,
): WeeklyCompletion {
  const dateSet = new Set(dates)
  const weekSessions = sessions.filter((s) => dateSet.has(s.date) && s.status === 'completed')
  const completedSets = weekSessions.reduce(
    (sum, s) => sum + s.entries.reduce((n, e) => n + e.sets.filter((x) => !x.warmup).length, 0),
    0,
  )
  const plannedSets = program
    ? program.days.reduce((sum, d) => sum + d.slots.reduce((n, slot) => n + slot.sets, 0), 0)
    : completedSets
  const plannedSessions = program ? program.days.length : weekSessions.length
  return {
    completedSets,
    plannedSets,
    fraction: plannedSets > 0 ? Math.min(1, completedSets / plannedSets) : 0,
    completedSessions: weekSessions.length,
    plannedSessions,
  }
}
