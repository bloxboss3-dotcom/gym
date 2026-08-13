import type { BodyWeightEntry, RewardLedgerEntry, Session, Sex } from '@/types'
import { entryBestE1RM } from '@/engine/stats'

/**
 * Strength percentiles.
 *
 * What this is: your best estimated one-rep max on a lift, expressed as a
 * multiple of your body weight, placed against published strength-standard
 * tables and scaled for body weight.
 *
 * What this is NOT, and the UI says so in as many words:
 *
 *   • It is not a percentile against the general population. The tables
 *     describe people who log barbell lifts — a self-selected group who train.
 *     Being "40th percentile" here still puts you well above a random adult.
 *   • It is not a measurement. An estimated 1RM from a set of ten carries real
 *     error, and the standards themselves are ranges presented as numbers.
 *   • Height is deliberately absent. Limb length genuinely changes the bar
 *     path on a bench press and a deadlift, but there is no accepted normative
 *     correction for it, and inventing one would dress a guess up as data.
 *     Body weight, which the model does use, already carries much of it.
 *
 * Body-weight scaling is allometric: absolute strength scales roughly with
 * body mass to the two-thirds power, so strength-to-weight scales with body
 * mass to the power of (2/3 − 1). One transparent exponent, applied the same
 * way to everyone, instead of a table of ratios per weight class.
 */

/** The five anchors every standard table is built from. */
export type StrengthLevel = 'untrained' | 'novice' | 'intermediate' | 'advanced' | 'elite'

export const STRENGTH_LEVELS: StrengthLevel[] = [
  'untrained',
  'novice',
  'intermediate',
  'advanced',
  'elite',
]

/**
 * Where each anchor sits within the *lifting* population, as a percentile.
 * Deliberately not evenly spaced: "intermediate" is the middle of the pack by
 * construction, and the tails are narrow.
 */
export const LEVEL_PERCENTILE: Record<StrengthLevel, number> = {
  untrained: 5,
  novice: 20,
  intermediate: 50,
  advanced: 80,
  elite: 95,
}

/** Strength scales with body mass to about this power. */
export const ALLOMETRIC_EXPONENT = 2 / 3

/** Body weight the ratios below are quoted at, kg. */
export const REFERENCE_BODYWEIGHT: Record<'male' | 'female', number> = { male: 80, female: 60 }

export interface LiftStandard {
  exerciseId: string
  label: string
  /** Multiples of body weight at the reference body weight, in level order. */
  male: [number, number, number, number, number]
  female: [number, number, number, number, number]
}

/**
 * The shapes of widely published strength-standard tables, rounded to the
 * precision they actually deserve. Every number here is a population summary
 * with a wide spread behind it, not a threshold anyone should feel judged by.
 */
export const LIFT_STANDARDS: LiftStandard[] = [
  {
    exerciseId: 'barbell-bench-press',
    label: 'Bench press',
    male: [0.5, 0.75, 1.15, 1.55, 2.0],
    female: [0.3, 0.45, 0.7, 1.0, 1.4],
  },
  {
    exerciseId: 'back-squat',
    label: 'Back squat',
    male: [0.6, 0.95, 1.5, 2.1, 2.75],
    female: [0.45, 0.7, 1.15, 1.6, 2.1],
  },
  {
    exerciseId: 'deadlift',
    label: 'Deadlift',
    male: [0.85, 1.2, 1.85, 2.5, 3.15],
    female: [0.55, 0.9, 1.35, 1.85, 2.4],
  },
  {
    exerciseId: 'overhead-press',
    label: 'Overhead press',
    male: [0.35, 0.5, 0.7, 0.95, 1.2],
    female: [0.2, 0.3, 0.45, 0.65, 0.85],
  },
  {
    exerciseId: 'barbell-row',
    label: 'Barbell row',
    male: [0.5, 0.7, 1.0, 1.3, 1.6],
    female: [0.3, 0.45, 0.65, 0.9, 1.15],
  },
]

export const STANDARD_BY_EXERCISE: Record<string, LiftStandard> = LIFT_STANDARDS.reduce(
  (acc, s) => {
    acc[s.exerciseId] = s
    return acc
  },
  {} as Record<string, LiftStandard>,
)

/**
 * The ladder of body-weight multiples for one person on one lift.
 *
 * A heavier lifter needs a higher absolute load for the same percentile but a
 * *lower* multiple of their own body weight, which is what the negative
 * exponent below encodes.
 */
export function ladderFor(
  standard: LiftStandard,
  sex: Sex,
  bodyWeightKg: number,
): [number, number, number, number, number] {
  const scale = (reference: number) =>
    Math.pow(Math.max(30, bodyWeightKg) / reference, ALLOMETRIC_EXPONENT - 1)

  if (sex === 'male' || sex === 'female') {
    const base = standard[sex]
    const factor = scale(REFERENCE_BODYWEIGHT[sex])
    return base.map((r) => r * factor) as [number, number, number, number, number]
  }

  // Sex not given. Averaging the two ladders is the least-wrong option, and
  // the caller downgrades confidence rather than pretending this is the same
  // answer as a stated one.
  const maleFactor = scale(REFERENCE_BODYWEIGHT.male)
  const femaleFactor = scale(REFERENCE_BODYWEIGHT.female)
  return standard.male.map(
    (r, i) => (r * maleFactor + standard.female[i] * femaleFactor) / 2,
  ) as [number, number, number, number, number]
}

export interface LiftPercentile {
  exerciseId: string
  label: string
  /** Best estimated 1RM used, kg. */
  oneRepMaxKg: number
  /** That 1RM as a multiple of body weight. */
  ratio: number
  /** 1–99 within the lifting population. */
  percentile: number
  level: StrengthLevel
  /** The multiple needed for the next level up, and which level that is. */
  nextLevel: StrengthLevel | null
  nextRatio: number | null
  /** Absolute load at the next level, kg — the actionable number. */
  nextLoadKg: number | null
}

/**
 * Place one lift on the ladder.
 *
 * Interpolates linearly between anchors, extrapolates gently past the ends and
 * clamps to 1–99: nobody is the 0th or the 100th percentile of anything, and a
 * number that says so is a bug wearing a confident face.
 */
export function percentileForLift(
  standard: LiftStandard,
  sex: Sex,
  bodyWeightKg: number,
  oneRepMaxKg: number,
): LiftPercentile {
  const ladder = ladderFor(standard, sex, bodyWeightKg)
  const ratio = oneRepMaxKg / bodyWeightKg
  const percentiles = STRENGTH_LEVELS.map((l) => LEVEL_PERCENTILE[l])

  let percentile: number
  if (ratio <= ladder[0]) {
    // Below the first anchor: scale down toward 1 rather than cliff-edging.
    percentile = Math.max(1, (ratio / ladder[0]) * percentiles[0])
  } else if (ratio >= ladder[4]) {
    const overshoot = (ratio - ladder[4]) / (ladder[4] - ladder[3])
    percentile = Math.min(99, percentiles[4] + overshoot * (99 - percentiles[4]))
  } else {
    percentile = percentiles[0]
    for (let i = 0; i < ladder.length - 1; i += 1) {
      if (ratio >= ladder[i] && ratio < ladder[i + 1]) {
        const t = (ratio - ladder[i]) / (ladder[i + 1] - ladder[i])
        percentile = percentiles[i] + t * (percentiles[i + 1] - percentiles[i])
        break
      }
    }
  }

  let levelIndex = 0
  for (let i = 0; i < ladder.length; i += 1) if (ratio >= ladder[i]) levelIndex = i
  const level = STRENGTH_LEVELS[levelIndex]
  const nextIndex = ratio >= ladder[4] ? null : levelIndex + (ratio >= ladder[levelIndex] ? 1 : 0)
  const nextRatio = nextIndex !== null && nextIndex <= 4 ? ladder[nextIndex] : null

  return {
    exerciseId: standard.exerciseId,
    label: standard.label,
    oneRepMaxKg: Math.round(oneRepMaxKg * 10) / 10,
    ratio: Math.round(ratio * 100) / 100,
    percentile: Math.round(percentile),
    level,
    nextLevel: nextIndex !== null && nextIndex <= 4 ? STRENGTH_LEVELS[nextIndex] : null,
    nextRatio: nextRatio === null ? null : Math.round(nextRatio * 100) / 100,
    nextLoadKg: nextRatio === null ? null : Math.round(nextRatio * bodyWeightKg * 10) / 10,
  }
}

export type PercentileConfidence = 'low' | 'medium' | 'high'

export interface StrengthProfile {
  lifts: LiftPercentile[]
  /** Median of the lifts above. Null when nothing could be placed. */
  overall: number | null
  confidence: PercentileConfidence
  missingData: string[]
  /** What the number does and does not mean — shown, not buried. */
  caveat: string
  /**
   * Exactly who the percentile is against, in words fit for the screen.
   *
   * A bare percentile is read as "against everyone". It is not: it is against
   * one sex's published standards, and a woman at the 70th is at the 70th of
   * women. Saying so is the difference between a number that means something
   * and a number that flatters or insults at random.
   */
  comparisonGroup: string
  citationIds: string[]
}

/** Who a percentile places you among, given the sex used to look it up. */
export function comparisonGroupFor(sex: Sex): string {
  if (sex === 'male') return 'men who log lifts'
  if (sex === 'female') return 'women who log lifts'
  return 'people who log lifts, averaged across both standards'
}

export interface StrengthProfileInput {
  sex: Sex
  bodyWeightKg: number | null
  /** Best estimated 1RM per exercise id, kg. */
  bestE1rmByExercise: Record<string, number>
  /** How many comparable sessions fed each estimate, for confidence. */
  sessionsByExercise?: Record<string, number>
}

export const PERCENTILE_CAVEAT =
  'Compared with other people who log barbell lifts, not with the general population — so an ordinary-looking number here still puts you ahead of most adults. Estimated one-rep maxes carry real error, and the standards behind this are ranges printed as tidy numbers. Height is not in the maths: limb length does change the bar path, but there is no agreed correction for it and inventing one would dress a guess up as data.'

export function strengthProfile(input: StrengthProfileInput): StrengthProfile {
  const missingData: string[] = []

  if (input.bodyWeightKg === null || input.bodyWeightKg <= 0) {
    return {
      lifts: [],
      overall: null,
      confidence: 'low',
      missingData: ['Log a body weight — every strength standard is relative to it.'],
      caveat: PERCENTILE_CAVEAT,
      comparisonGroup: comparisonGroupFor(input.sex),
      citationIds: ['acsm-2009-progression'],
    }
  }

  if (input.sex === 'unspecified') {
    missingData.push(
      'Sex is not set, so this averages the male and female standards. Setting it in your profile sharpens the number considerably.',
    )
  }

  const lifts: LiftPercentile[] = []
  for (const standard of LIFT_STANDARDS) {
    const e1rm = input.bestE1rmByExercise[standard.exerciseId]
    if (!e1rm || e1rm <= 0) continue
    lifts.push(percentileForLift(standard, input.sex, input.bodyWeightKg, e1rm))
  }

  if (lifts.length === 0) {
    missingData.push(
      `No logged sets on any of the benchmark lifts yet (${LIFT_STANDARDS.map((s) => s.label).join(', ')}).`,
    )
  } else if (lifts.length < 3) {
    missingData.push(
      'Only some of the benchmark lifts have data, so the overall figure leans on a narrow sample.',
    )
  }

  const sorted = lifts.map((l) => l.percentile).sort((a, b) => a - b)
  const overall = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : null

  const thinEvidence = Object.values(input.sessionsByExercise ?? {}).some((n) => n < 2)
  const confidence: PercentileConfidence =
    lifts.length >= 3 && input.sex !== 'unspecified' && !thinEvidence
      ? 'high'
      : lifts.length >= 2
        ? 'medium'
        : 'low'

  return {
    lifts,
    overall,
    confidence,
    missingData,
    caveat: PERCENTILE_CAVEAT,
    comparisonGroup: comparisonGroupFor(input.sex),
    citationIds: ['acsm-2009-progression', 'schoenfeld-2017-load'],
  }
}

export const LEVEL_LABEL: Record<StrengthLevel, string> = {
  untrained: 'Untrained',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
}

/**
 * Percentile bands worth paying XP for.
 *
 * Paying for a percentile OUTRIGHT would hand the biggest rewards to whoever
 * walked in strongest, and hand the smallest to the person the app can help
 * most — exactly backwards. Paying for CROSSING a band pays for improvement,
 * which is available to everyone and fastest for beginners.
 */
export const PERCENTILE_BANDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95]

export function bandFor(percentile: number): number | null {
  let band: number | null = null
  for (const b of PERCENTILE_BANDS) if (percentile >= b) band = b
  return band
}

export interface BandCrossing {
  exerciseId: string
  label: string
  band: number
  detail: string
}

/**
 * Which bands were newly crossed, given the bands already recorded as paid.
 * Idempotent by design: pass the same paid set twice and you get nothing back.
 */
export function newBandCrossings(
  profile: StrengthProfile,
  alreadyPaid: ReadonlySet<string>,
): BandCrossing[] {
  const out: BandCrossing[] = []
  for (const lift of profile.lifts) {
    const band = bandFor(lift.percentile)
    if (band === null) continue
    const key = `${lift.exerciseId}:${band}`
    if (alreadyPaid.has(key)) continue
    out.push({
      exerciseId: lift.exerciseId,
      label: lift.label,
      band,
      detail: `${lift.label} passed the ${band}th percentile for your body weight.`,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Building the profile from stored data
// ---------------------------------------------------------------------------

/**
 * Assemble a strength profile straight from sessions and body weights.
 *
 * Kept here rather than in a screen so the reward path and the display path
 * can never disagree about what your percentile is.
 */
export function profileFromHistory(
  sessions: Session[],
  bodyWeights: BodyWeightEntry[],
  sex: Sex,
  fallbackBodyWeightKg: number | null = null,
): StrengthProfile {
  const best: Record<string, number> = {}
  const seen: Record<string, number> = {}

  for (const session of sessions) {
    if (session.status !== 'completed') continue
    for (const entry of session.entries) {
      if (!STANDARD_BY_EXERCISE[entry.exerciseId]) continue
      const e1rm = entryBestE1RM(entry)
      if (!e1rm) continue
      seen[entry.exerciseId] = (seen[entry.exerciseId] ?? 0) + 1
      if (e1rm > (best[entry.exerciseId] ?? 0)) best[entry.exerciseId] = e1rm
    }
  }

  // Newest logged body weight wins; the profile figure is the fallback.
  const latest = [...bodyWeights].sort((a, b) => b.date.localeCompare(a.date))[0]
  const bodyWeightKg = latest?.weightKg ?? fallbackBodyWeightKg

  return strengthProfile({
    sex,
    bodyWeightKg,
    bestE1rmByExercise: best,
    sessionsByExercise: seen,
  })
}

/** Bands already paid for, read back out of the reward ledger. */
export function paidBands(ledger: RewardLedgerEntry[]): Set<string> {
  const out = new Set<string>()
  for (const entry of ledger) {
    if (entry.reason !== 'percentile_band') continue
    // sourceId is `percentile:<exerciseId>:<band>`.
    const parts = entry.sourceId.split(':')
    if (parts.length === 3) out.add(`${parts[1]}:${parts[2]}`)
  }
  return out
}

export function bandSourceId(exerciseId: string, band: number): string {
  return `percentile:${exerciseId}:${band}`
}
