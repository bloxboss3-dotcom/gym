import { RULES } from '@/config/rules'
import type { Exercise, Goal, IsoDate, MuscleKey, Session, SessionEntry, Units } from '@/types'
import type { Confidence } from '@/engine/progression'
import { toDisplay, roundToIncrement } from '@/engine/units'

/**
 * Intensity techniques — the "advanced" methods, held to the same standard as
 * everything else in `src/engine/`.
 *
 * The honest summary of the evidence, which the UI repeats rather than hides:
 *
 *   Drop sets and rest-pause are TIME-EFFICIENT, not SUPERIOR. Trials that
 *   equate volume find growth comparable to ordinary straight sets, achieved
 *   in less time (Fink 2018; Krzysztofik 2019). So FORGED offers one when
 *   weekly volume for a muscle is short — never as a way to "grow faster",
 *   and never as a default.
 *
 *   Long-length partials are the one technique with a positive signal of its
 *   own. Training at long muscle lengths beats matched short-length work
 *   (Maeo 2021), and stretched-position partials hold up against full range
 *   while shortened-position partials do not (Kassiano 2023).
 *
 * Safety is a hard gate, not a preference. Nothing here is offered on a
 * loaded spine or on a barbell held over the body, because the failure mode
 * of a drop set on a back squat is being pinned under it.
 */

export type TechniqueKind = 'drop_set' | 'rest_pause' | 'long_length_partials'

export interface IntensityTechnique {
  kind: TechniqueKind
  /** Short name for a chip or heading. */
  name: string
  /** One line describing the action, with the actual numbers in it. */
  headline: string
  /** Exact steps, already resolved into display units. */
  steps: string[]
  /** Plain-language reason, including what this does NOT do. */
  reason: string
  /** The named rule that fired, so a decision can be audited. */
  rule: string
  citationIds: string[]
  confidence: Confidence
  missingData: string[]
  warning: string | null
  /** Hard-set credit toward the weekly volume tally. */
  countsAsSets: number
}

export interface FinisherContext {
  goal: Goal
  exercise: Exercise
  entry: SessionEntry
  /**
   * Weekly hard sets already done for this exercise's primary muscle, and the
   * range the volume engine thinks that muscle should be in. Null when the
   * caller has not computed them — the technique is then not offered, because
   * "your volume is short" is the entire justification.
   */
  weeklySets: number | null
  weeklyRange: { min: number; max: number } | null
  /** Finishers already suggested-and-accepted this session. */
  finishersUsedThisSession: number
  /** A deload week is a deliberate reduction. Do not undermine it. */
  deloadActive: boolean
  units: Units
}

/** The primary muscle a movement trains — the highest contribution, ties broken by key order. */
export function primaryMuscle(exercise: Exercise): MuscleKey | null {
  let best: MuscleKey | null = null
  let bestValue = 0
  for (const [muscle, value] of Object.entries(exercise.contributions) as [MuscleKey, number][]) {
    if (value > bestValue) {
      best = muscle
      bestValue = value
    }
  }
  return best
}

/**
 * Whether a movement loads the target muscle in its stretched position.
 *
 * Derived from the movement pattern rather than stored per exercise, so a
 * custom exercise gets a sane answer without the user filling in a field they
 * have no way to judge.
 */
export function loadsLongLengths(exercise: Exercise): boolean {
  // Isolation work at a cable or machine holds tension through the stretch;
  // pulls and presses with a full range do the same for the prime movers.
  return (
    exercise.pattern === 'isolation' ||
    exercise.pattern === 'horizontal_pull' ||
    exercise.pattern === 'vertical_pull' ||
    exercise.pattern === 'horizontal_push'
  )
}

/** Why no technique was offered — surfaced so the absence is explainable too. */
export type FinisherBlock =
  | 'goal'
  | 'deload'
  | 'pain'
  | 'unsafe_movement'
  | 'session_budget'
  | 'already_used'
  | 'sets_incomplete'
  | 'volume_not_short'
  | 'unknown_volume'

export interface FinisherResult {
  technique: IntensityTechnique | null
  blockedBy: FinisherBlock | null
}

/**
 * Decide whether to offer an intensity technique after the final working set.
 *
 * Returns the reason for a refusal as well as the suggestion, because "why is
 * this not offering me a drop set" deserves an answer as much as "why is it".
 */
export function suggestFinisher(ctx: FinisherContext): FinisherResult {
  const cfg = RULES.intensity
  const { exercise, entry } = ctx

  const no = (blockedBy: FinisherBlock): FinisherResult => ({ technique: null, blockedBy })

  if (!(cfg.goals as readonly string[]).includes(ctx.goal)) return no('goal')
  if (ctx.deloadActive) return no('deload')
  if (entry.pain >= cfg.painBlock) return no('pain')

  const working = entry.sets.filter((s) => !s.warmup)
  if (working.length < entry.plannedSets) return no('sets_incomplete')

  const safeLoading = (cfg.safeLoading as readonly string[]).includes(exercise.loading)
  const safePattern = !(cfg.unsafePatterns as readonly string[]).includes(exercise.pattern)
  if (!safeLoading || !safePattern) return no('unsafe_movement')

  if (ctx.finishersUsedThisSession >= cfg.maxPerSession) return no('session_budget')

  if (ctx.weeklySets === null || ctx.weeklyRange === null) return no('unknown_volume')
  const shortBy = ctx.weeklyRange.min - ctx.weeklySets
  if (shortBy < cfg.setsShortOfRange) return no('volume_not_short')

  const lastSet = working[working.length - 1]
  const missingData: string[] = []
  if (working.some((s) => s.rir === null)) {
    missingData.push('Reps in reserve were not logged on every set, so how close to failure you finished is a guess.')
  }

  // Confidence tracks how much the caller actually knew. A suggestion built on
  // a full week of logged volume and reported effort is a different claim from
  // one built on a single session.
  const confidence: Confidence = missingData.length === 0 ? 'medium' : 'low'

  const shared = {
    confidence,
    missingData,
    warning: null as string | null,
  }

  // Which technique, decided by how the movement is loaded rather than by
  // which one is fashionable.
  //
  // A pin-loaded stack changes weight in one second, and that setup cost is
  // the entire reason a drop set is worth doing at all — spend ninety seconds
  // stripping plates and you have simply done a slow second set. So a stack
  // gets the drop. Anything else that loads the stretch gets partials, which
  // need no equipment change whatsoever. What is left gets rest-pause.
  const quickToStrip = exercise.loading === 'stack'
  if (quickToStrip) {
    // entry.incrementKg, NOT exercise.incrementKg. The library value is a
    // kilogram constant; the entry carries the unit-native one the rest of the
    // app already resolved. Rounding a drop target on a converted 2.5 kg step
    // produces "33.1 lb", a number no pin-loaded stack has ever had.
    const dropped = dropTarget(lastSet.weightKg, entry.incrementKg, ctx.units)
    return {
      blockedBy: null,
      technique: {
        ...shared,
        kind: 'drop_set',
        name: 'Drop set',
        headline: `Drop to ${dropped.label} and go again`,
        steps: [
          `Move the pin to about ${dropped.label} — roughly ${Math.round(cfg.dropLoadPct * 100)}% lighter.`,
          // The target is a landmark, not a requirement. Machines have the
          // pins they have, and somebody standing at a stack should not be
          // wondering whether the nearest hole counts.
          `The nearest pin either side is fine — anywhere from ${dropped.rangeLabel} does the job. The number is a landmark, not a rule.`,
          'Go straight back to work with no rest, and take it to the point where the next rep would break down.',
          `One drop is enough. ${shortByPhrase(shortBy)}`,
        ],
        reason:
          'A drop set is not a bigger stimulus per set — trials that match total work find growth much the same as ordinary straight sets. What it does buy is volume per minute, which is worth having only because your weekly sets for this muscle are short. If you have the time, another straight set is the simpler answer.',
        rule: 'intensity.drop_set_volume_short',
        citationIds: ['fink-2018-dropset', 'krzysztofik-2019-techniques', 'schoenfeld-2017-volume'],
        countsAsSets: RULES.intensity.countsAsSets.drop_set,
      },
    }
  }

  if (loadsLongLengths(exercise)) {
    return {
      blockedBy: null,
      technique: {
        ...shared,
        kind: 'long_length_partials',
        name: 'Long-length partials',
        headline: 'Add partials in the stretched half',
        steps: [
          'You have finished your last full set. Stay on the movement.',
          'Keep going with partial reps in the bottom, stretched half of the range only.',
          'Stop when you cannot control the lowering any more — not when it merely burns.',
          'Never shorten the range at the stretch. Cutting the top is fine; cutting the bottom throws away the part that works.',
        ],
        reason:
          'Training a muscle in its stretched position produces more growth than matched work in the shortened position, and stretched-position partials hold up well against full-range sets. This is the one intensity technique with evidence in its own right rather than evidence of being quicker.',
        rule: 'intensity.long_length_partials',
        citationIds: ['maeo-2021-long-length', 'kassiano-2023-rom', 'schoenfeld-2017-volume'],
        countsAsSets: RULES.intensity.countsAsSets.long_length_partials,
      },
    }
  }

  return {
    blockedBy: null,
    technique: {
      ...shared,
      kind: 'rest_pause',
      name: 'Rest-pause',
      headline: `Rest ${cfg.restPauseSec}s, then ${cfg.restPauseBursts} more mini-sets`,
      steps: [
        `Rack the weight and rest ${cfg.restPauseSec} seconds — no longer.`,
        'Pick it back up at the same load and do as many clean reps as you can.',
        `Repeat that once more, ${cfg.restPauseBursts} bursts in total, then stop.`,
        shortByPhrase(shortBy),
      ],
      reason:
        'Rest-pause squeezes extra reps out of a load you are already using, at the same weight. Like drop sets it reads as time-efficient rather than superior, so it is here because your weekly volume for this muscle is short — not because it beats doing another set properly.',
      rule: 'intensity.rest_pause_volume_short',
      citationIds: ['krzysztofik-2019-techniques', 'refalo-2023-failure', 'schoenfeld-2017-volume'],
      countsAsSets: RULES.intensity.countsAsSets.rest_pause,
    },
  }
}

function shortByPhrase(shortBy: number): string {
  const sets = Math.round(shortBy)
  return `You are about ${sets} hard ${sets === 1 ? 'set' : 'sets'} short of this muscle's weekly range.`
}

/**
 * Where to drop to, and the band around it that is just as good.
 *
 * A stack has the pins it has, a rack of dumbbells jumps in fives, and the
 * research behind drop sets says nothing whatsoever about hitting a specific
 * number — the useful property is "meaningfully lighter, immediately". So the
 * band is published alongside the target, because a precise-looking figure on
 * its own reads as a requirement, and somebody standing in front of a machine
 * should not be wondering whether the nearest hole counts.
 */
function dropTarget(weightKg: number, incrementKg: number, units: Units) {
  const target = weightKg * (1 - RULES.intensity.dropLoadPct)
  const rounded = roundToIncrement(target, incrementKg, units)
  const show = (kg: number) => Number(toDisplay(kg, units).toFixed(1))
  const band = RULES.intensity.dropTolerancePct
  // Clamped below the working weight: a "drop" that is not lighter is a
  // second straight set with extra steps.
  const low = roundToIncrement(target * (1 - band), incrementKg, units)
  const high = Math.min(
    roundToIncrement(target * (1 + band), incrementKg, units),
    roundToIncrement(weightKg * 0.9, incrementKg, units),
  )
  return {
    kg: rounded,
    label: `${show(rounded)} ${units}`,
    lowKg: low,
    highKg: high,
    rangeLabel: `${show(low)} to ${show(Math.max(high, rounded))} ${units}`,
  }
}

export const BLOCK_EXPLANATION: Record<FinisherBlock, string> = {
  goal: 'Intensity techniques are offered when the goal is muscle growth. Yours is set to something else.',
  deload: 'You are in a deload. Cutting work on purpose and then adding a finisher cancels the point of it.',
  pain: `You reported pain of ${RULES.intensity.painBlock} or more on this movement. Nothing gets pushed past failure while that is true.`,
  unsafe_movement:
    'Not on this movement. Going past failure with a loaded spine, or under a barbell you have to escape from, is not worth any amount of extra growth.',
  session_budget: `You have already added ${RULES.intensity.maxPerSession} finishers today. That is the fatigue budget.`,
  already_used: 'This movement already has a finisher today.',
  sets_incomplete: 'Finish your planned working sets first.',
  volume_not_short:
    'Your weekly volume for this muscle is already inside its range. Drop sets and rest-pause are a way to buy volume cheaply when time is short, not extra growth on top — so there is nothing to buy.',
  unknown_volume: 'Not enough logged history this week to know whether your volume for this muscle is short.',
}

// ---------------------------------------------------------------------------
// Hypertrophy audit
// ---------------------------------------------------------------------------

/**
 * The four levers that actually move hypertrophy, graded against the evidence.
 *
 * This exists because "am I training optimally for muscle" is a fair question
 * with a boring answer: volume, effort, frequency and rest, in that order.
 * Anything the app can check, it checks; anything it cannot, it says so rather
 * than inventing a grade.
 */
export type LeverStatus = 'good' | 'attention' | 'unknown'

export interface HypertrophyLever {
  key: 'volume' | 'effort' | 'frequency' | 'rest' | 'range'
  label: string
  status: LeverStatus
  /** What the app measured, in plain words. Empty when unknown. */
  finding: string
  /** What to do about it. */
  advice: string
  citationIds: string[]
}

export interface HypertrophyAuditInput {
  /** Muscles inside their weekly range, and the total assessed. */
  musclesInRange: number
  musclesAssessed: number
  /** Muscles trained on two or more separate days this week. */
  musclesTrainedTwice: number
  /** Fraction of working sets with RIR logged at or below the hard-set cutoff. */
  hardSetFraction: number | null
  /** Median rest actually taken between working sets on compound lifts, seconds. */
  medianCompoundRestSec: number | null
}

/**
 * Gather what the audit needs out of a week of sessions.
 *
 * Rest is measured from the timestamps on the sets themselves rather than from
 * the rest timer, because the timer records what was prescribed and the
 * timestamps record what happened. Gaps longer than `maxRestGapSec` are
 * dropped: that is someone walking away mid-exercise, not a rest interval.
 */
export function collectAuditInput(
  sessions: Session[],
  exercises: Exercise[],
  weekDates: IsoDate[],
  volume: { muscle: MuscleKey; hardSets: number; plannedSets: number; status: string }[],
  maxRestGapSec = 600,
): HypertrophyAuditInput {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const dates = new Set(weekDates)
  const week = sessions.filter((s) => s.status === 'completed' && dates.has(s.date))

  // Distinct days each muscle was trained.
  const daysPerMuscle = new Map<MuscleKey, Set<IsoDate>>()
  let workingSets = 0
  let hardSets = 0
  const restGaps: number[] = []

  for (const session of week) {
    for (const entry of session.entries) {
      const exercise = byId.get(entry.exerciseId)
      if (!exercise) continue
      const working = entry.sets.filter((s) => !s.warmup && s.reps > 0)
      if (!working.length) continue

      for (const [muscle, contribution] of Object.entries(exercise.contributions) as [MuscleKey, number][]) {
        if (contribution < RULES.volume.minContribution) continue
        if (!daysPerMuscle.has(muscle)) daysPerMuscle.set(muscle, new Set())
        daysPerMuscle.get(muscle)!.add(session.date)
      }

      for (const set of working) {
        if (set.rir === null) continue
        workingSets += 1
        if (set.rir <= RULES.volume.hardSetRirCutoff) hardSets += 1
      }

      const compound = exercise.pattern !== 'isolation' && exercise.pattern !== 'core'
      if (compound) {
        const ordered = [...working].sort((a, b) => a.completedAt - b.completedAt)
        for (let i = 1; i < ordered.length; i += 1) {
          const gap = (ordered[i].completedAt - ordered[i - 1].completedAt) / 1000
          if (gap > 0 && gap <= maxRestGapSec) restGaps.push(gap)
        }
      }
    }
  }

  const assessed = volume.filter((v) => v.hardSets > 0 || v.plannedSets > 0)
  const trainedTwice = assessed.filter((v) => (daysPerMuscle.get(v.muscle)?.size ?? 0) >= 2).length

  return {
    musclesInRange: assessed.filter((v) => v.status === 'within').length,
    musclesAssessed: assessed.length,
    musclesTrainedTwice: trainedTwice,
    hardSetFraction: workingSets > 0 ? hardSets / workingSets : null,
    medianCompoundRestSec: restGaps.length ? median(restGaps) : null,
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function auditHypertrophy(input: HypertrophyAuditInput): HypertrophyLever[] {
  const levers: HypertrophyLever[] = []

  if (input.musclesAssessed === 0) {
    levers.push({
      key: 'volume',
      label: 'Weekly volume',
      status: 'unknown',
      finding: '',
      advice: 'Log a full week of training and this fills in.',
      citationIds: ['schoenfeld-2017-volume'],
    })
  } else {
    const inRange = input.musclesInRange
    const ok = inRange >= Math.ceil(input.musclesAssessed * 0.7)
    levers.push({
      key: 'volume',
      label: 'Weekly volume',
      status: ok ? 'good' : 'attention',
      finding: `${inRange} of ${input.musclesAssessed} muscles are inside their weekly set range.`,
      advice: ok
        ? 'Hold here. Volume is the strongest lever you have, and it is doing its job.'
        : `Add sets to the muscles below range, no more than ${RULES.volume.weeklyAddCap} per muscle per week.`,
      citationIds: ['schoenfeld-2017-volume'],
    })
  }

  levers.push(
    input.hardSetFraction === null
      ? {
          key: 'effort',
          label: 'Proximity to failure',
          status: 'unknown',
          finding: '',
          advice: 'Log reps in reserve on your sets and this fills in.',
          citationIds: ['refalo-2023-failure', 'zourdos-2016-rir'],
        }
      : {
          key: 'effort',
          label: 'Proximity to failure',
          status: input.hardSetFraction >= 0.7 ? 'good' : 'attention',
          finding: `${Math.round(input.hardSetFraction * 100)}% of your working sets finished within ${RULES.volume.hardSetRirCutoff} reps of failure.`,
          advice:
            input.hardSetFraction >= 0.7
              ? 'That is the window. Sets close to failure count; comfortable ones mostly do not.'
              : 'Take more sets to within 1–3 reps of failure. A set you could have doubled is not a hard set.',
          citationIds: ['refalo-2023-failure', 'zourdos-2016-rir'],
        },
  )

  levers.push({
    key: 'frequency',
    label: 'Frequency',
    status:
      input.musclesAssessed === 0
        ? 'unknown'
        : input.musclesTrainedTwice >= Math.ceil(input.musclesAssessed * 0.6)
          ? 'good'
          : 'attention',
    finding:
      input.musclesAssessed === 0
        ? ''
        : `${input.musclesTrainedTwice} of ${input.musclesAssessed} muscles were trained on two or more days.`,
    advice:
      'Split the same weekly sets across two days per muscle rather than one. It is the cheapest change on this list.',
    citationIds: ['schoenfeld-2016-frequency', 'acsm-2011-quantity'],
  })

  levers.push(
    input.medianCompoundRestSec === null
      ? {
          key: 'rest',
          label: 'Rest between sets',
          status: 'unknown',
          finding: '',
          advice: 'Use the rest timer on your compound lifts and this fills in.',
          citationIds: ['schoenfeld-2016-rest'],
        }
      : {
          key: 'rest',
          label: 'Rest between sets',
          status: input.medianCompoundRestSec >= 120 ? 'good' : 'attention',
          finding: `You typically rest about ${Math.round(input.medianCompoundRestSec / 15) * 15}s between compound sets.`,
          advice:
            input.medianCompoundRestSec >= 120
              ? 'Long enough. Rushing compounds costs you reps on the later sets, and lost reps are lost volume.'
              : 'Rest two to three minutes on compound lifts. Short rest is not a shortcut — it just costs you reps later in the exercise.',
          citationIds: ['schoenfeld-2016-rest'],
        },
  )

  levers.push({
    key: 'range',
    label: 'Range of motion',
    status: 'good',
    finding: 'Every movement in the library is prescribed at full range.',
    advice:
      'Keep the stretch. Full range matches or beats partial range, and if you do shorten a movement, shorten the top — never the bottom.',
    citationIds: ['kassiano-2023-rom', 'maeo-2021-long-length'],
  })

  return levers
}

/** The load question people actually ask, answered once, in one place. */
export const LOAD_RANGE_NOTE =
  'Heavy and light loads grow muscle about equally as long as the set is taken close to failure — anywhere from roughly 6 to 30 reps. Pick the range you can load and recover from; do not chase a magic number.'
