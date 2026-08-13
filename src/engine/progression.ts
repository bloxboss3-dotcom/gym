import { RULES } from '@/config/rules'
import type { IsoDate, Session, SessionEntry, TechniqueRating, Units } from '@/types'
import { estimateOneRepMax } from '@/engine/stats'
import { increaseWithinPct, roundToIncrement, stepUp } from '@/engine/units'

/**
 * The progression engine.
 *
 * This file is deterministic, dependency-free TypeScript. No language model is
 * ever asked to make a training decision — an LLM cannot be unit-tested, cannot
 * explain itself reproducibly, and cannot be held to a safety threshold. Every
 * threshold used here lives in `src/config/rules.ts`.
 *
 * Primary model: DOUBLE PROGRESSION.
 *   Stay at a load until every working set reaches the top of the prescribed rep
 *   range at an appropriate effort with acceptable technique and low pain. Only
 *   then add the smallest useful increment and work back up through the range.
 */

export type RecommendationAction =
  | 'establish_baseline'
  | 'increase_load'
  | 'add_reps'
  | 'hold_load'
  | 'reduce_load'
  | 'hold_and_check_recovery'
  | 'substitute_exercise'
  | 'stop_and_seek_guidance'

export type Confidence = 'low' | 'medium' | 'high'

export interface NextTarget {
  loadKg: number | null
  sets: number
  repMin: number
  repMax: number
  targetRIR: number
  /** Total reps to beat, when the recommendation is rep-based. */
  totalRepsTarget: number | null
  description: string
}

export interface Recommendation {
  action: RecommendationAction
  /**
   * What the recommendation is looking at, when that is not obvious.
   *
   * Set when last session used more than one weight. Which of two loads is
   * being judged is a decision the engine made, not a gap in the data, and
   * burying it behind a disclosure headed "data gaps" is how you get an app
   * that looks like it did not notice you lifted two different weights.
   */
  judgedOn?: string
  /** One-line recommended action, e.g. "Add 2.5 kg". */
  headline: string
  target: NextTarget
  /** Plain-language explanation with no jargon. */
  reason: string
  /** The specific rule that fired, named so it can be audited. */
  rule: string
  citationIds: string[]
  confidence: Confidence
  /** Anything the engine wanted but did not have. */
  missingData: string[]
  /** Non-null when the user should be careful or stop. */
  warning: string | null
}

/** One past performance of a single exercise, newest first when in a list. */
export interface PerformedSession {
  date: IsoDate
  sessionId: string
  /** Working sets only — warm-ups never influence progression. */
  sets: { weightKg: number; reps: number; rir: number | null }[]
  pain: number
  technique: TechniqueRating
  plannedSets: number
  repMin: number
  repMax: number
  targetRIR: number
}

export interface Prescription {
  sets: number
  repMin: number
  repMax: number
  targetRIR: number
  incrementKg: number
  lowerBody: boolean
  units: Units
}

// ---------------------------------------------------------------------------
// History assembly
// ---------------------------------------------------------------------------

export function summariseEntry(entry: SessionEntry, date: IsoDate, sessionId: string): PerformedSession {
  return {
    date,
    sessionId,
    sets: entry.sets
      .filter((s) => !s.warmup && s.reps > 0)
      .map((s) => ({ weightKg: s.weightKg, reps: s.reps, rir: s.rir })),
    pain: entry.pain,
    technique: entry.technique,
    plannedSets: entry.plannedSets,
    repMin: entry.repMin,
    repMax: entry.repMax,
    targetRIR: entry.targetRIR,
  }
}

/** Newest-first history for one exercise across all completed sessions. */
export function historyFor(sessions: Session[], exerciseId: string, limit = 8): PerformedSession[] {
  const out: PerformedSession[] = []
  const ordered = [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date) || (b.endedAt ?? 0) - (a.endedAt ?? 0))
  for (const session of ordered) {
    for (const entry of session.entries) {
      if (entry.exerciseId !== exerciseId) continue
      const summary = summariseEntry(entry, session.date, session.id)
      if (summary.sets.length) out.push(summary)
    }
    if (out.length >= limit) break
  }
  return out.slice(0, limit)
}

// ---------------------------------------------------------------------------
// Session analysis
// ---------------------------------------------------------------------------

export interface SessionAnalysis {
  workingSets: number
  setsAtTop: number
  setsBelowMin: number
  topFraction: number
  belowFraction: number
  averageRir: number | null
  ratedSets: number
  missingRirFraction: number
  totalReps: number
  workingLoadKg: number
  bestE1RM: number
  /** True when every working set reached the top of the range. */
  metTopOfRange: boolean
  /**
   * The heaviest working load, and how the session's sets sat around it.
   *
   * Reps only mean something next to the load they were done at. A session of
   * 25 lb × 12 and 45 lb × 10 is not "one set at the top of the range and one
   * below it"; it is two different exercises as far as progression goes, and
   * the recommendation has to say which one it is talking about.
   */
  topLoadKg: number
  setsAtTopLoad: number
  lightestLoadKg: number
  mixedLoads: boolean
  /** Best reps achieved AT the top load. */
  bestRepsAtTopLoad: number
  /** How far that went past repMax. 0 when inside the range. */
  repsPastTop: number
}

export function analyseSession(perf: PerformedSession): SessionAnalysis {
  const sets = perf.sets
  const workingSets = sets.length

  /*
    Which sets the rep range is actually judged against.

    Only the ones at the heaviest load. Counting every working set together
    meant a light set could satisfy "reached the top of the range" on behalf
    of a heavy one — so 25 lb x 12 followed by 45 lb x 10 read as a half-met
    range and held a weight that should have moved.
  */
  const loads = sets.map((s) => s.weightKg).filter((w) => w > 0)
  const topLoadKg = loads.length ? Math.max(...loads) : 0
  const lightestLoadKg = loads.length ? Math.min(...loads) : 0
  const atTopLoad = sets.filter((s) => Math.abs(s.weightKg - topLoadKg) < 0.01)
  const mixedLoads =
    topLoadKg > 0 && lightestLoadKg < topLoadKg * (1 - RULES.progression.mixedLoadFraction)
  const judged = atTopLoad.length ? atTopLoad : sets

  const setsAtTop = judged.filter((s) => s.reps >= perf.repMax).length
  const setsBelowMin = judged.filter((s) => s.reps < perf.repMin).length
  const bestRepsAtTopLoad = judged.reduce((max, s) => Math.max(max, s.reps), 0)
  const rated = judged.filter((s) => s.rir !== null)
  const averageRir = rated.length
    ? Number((rated.reduce((sum, s) => sum + (s.rir as number), 0) / rated.length).toFixed(2))
    : null
  // The load the recommendation applies to is the one used for most working
  // sets — the mode, falling back to the heaviest.
  const counts = new Map<number, number>()
  for (const s of sets) counts.set(s.weightKg, (counts.get(s.weightKg) ?? 0) + 1)
  let workingLoadKg = 0
  let bestCount = 0
  for (const [weight, count] of counts) {
    if (count > bestCount || (count === bestCount && weight > workingLoadKg)) {
      workingLoadKg = weight
      bestCount = count
    }
  }
  const bestE1RM = sets.reduce((max, s) => Math.max(max, estimateOneRepMax(s.weightKg, s.reps, s.rir)), 0)
  // Sets that were planned but never logged count against "all sets at the
  // top". On a mixed-load session only the top-load sets are judged, so the
  // denominator is how many of those there were.
  const expected = mixedLoads ? judged.length : Math.max(workingSets, perf.plannedSets)
  return {
    workingSets,
    setsAtTop,
    setsBelowMin,
    topFraction: expected ? setsAtTop / expected : 0,
    belowFraction: judged.length ? setsBelowMin / judged.length : 0,
    averageRir,
    ratedSets: rated.length,
    missingRirFraction: judged.length ? 1 - rated.length / judged.length : 1,
    totalReps: sets.reduce((sum, s) => sum + s.reps, 0),
    workingLoadKg,
    bestE1RM,
    metTopOfRange: expected > 0 && setsAtTop / expected >= RULES.progression.topOfRangeFraction,
    topLoadKg,
    setsAtTopLoad: atTopLoad.length,
    lightestLoadKg,
    mixedLoads,
    bestRepsAtTopLoad,
    repsPastTop: Math.max(0, bestRepsAtTopLoad - perf.repMax),
  }
}

// ---------------------------------------------------------------------------
// Plateau detection
// ---------------------------------------------------------------------------

export interface PlateauResult {
  /** Consecutive recent sessions with no meaningful improvement. */
  stalledSessions: number
  stalled: boolean
  suggestSubstitution: boolean
  detail: string
}

/**
 * A session counts as "no meaningful progress" when its best estimated 1RM did
 * not beat the previous comparable session by `meaningfulGainPct`.
 */
export function detectPlateau(history: PerformedSession[]): PlateauResult {
  if (history.length < 2) {
    return {
      stalledSessions: 0,
      stalled: false,
      suggestSubstitution: false,
      detail: 'Not enough comparable sessions to judge a plateau yet.',
    }
  }
  const e1rms = history.map((h) => analyseSession(h).bestE1RM)
  let stalled = 0
  for (let i = 0; i < e1rms.length - 1; i++) {
    const current = e1rms[i]
    const previous = e1rms[i + 1]
    if (previous <= 0) break
    const gain = (current - previous) / previous
    if (gain >= RULES.plateau.meaningfulGainPct) break
    stalled++
  }
  return {
    stalledSessions: stalled,
    stalled: stalled >= RULES.plateau.sessionsToStall,
    suggestSubstitution: stalled >= RULES.plateau.sessionsToSubstitute,
    detail: stalled
      ? `${stalled} session${stalled === 1 ? '' : 's'} in a row without a meaningful change in estimated strength.`
      : 'Most recent session improved on the one before it.',
  }
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

function assessConfidence(history: PerformedSession[], analysis: SessionAnalysis): {
  confidence: Confidence
  missingData: string[]
} {
  const missingData: string[] = []
  let level: Confidence =
    history.length >= RULES.confidence.highSessions
      ? 'high'
      : history.length >= RULES.confidence.mediumSessions
        ? 'medium'
        : 'low'

  if (history.length < RULES.confidence.highSessions) {
    missingData.push(
      `Only ${history.length} comparable session${history.length === 1 ? '' : 's'} logged for this exercise — ${RULES.confidence.highSessions} gives a clearer picture.`,
    )
  }
  if (analysis.missingRirFraction > RULES.confidence.missingRirFraction) {
    missingData.push(
      `Reps in reserve missing on ${Math.round(analysis.missingRirFraction * 100)}% of working sets, so effort had to be assumed.`,
    )
    level = level === 'high' ? 'medium' : 'low'
  }
  if (analysis.workingSets < history[0].plannedSets) {
    missingData.push(
      `Only ${analysis.workingSets} of ${history[0].plannedSets} planned sets were logged last time.`,
    )
  }
  return { confidence: level, missingData }
}

function describeTarget(target: NextTarget, units: Units): string {
  const load =
    target.loadKg === null
      ? 'the weight you choose'
      : `${formatKg(target.loadKg, units)}`
  return `${target.sets} × ${target.repMin}–${target.repMax} @ ${load}, aiming for about ${target.targetRIR} reps in reserve`
}

function formatKg(kg: number, units: Units): string {
  if (units === 'kg') return `${Number(kg.toFixed(1))} kg`
  const lb = kg * 2.2046226218
  return `${Number(lb.toFixed(1))} lb`
}

// ---------------------------------------------------------------------------
// The recommendation
// ---------------------------------------------------------------------------

export interface RecommendContext {
  /** Recent readiness signals, if the user has been checking in. */
  recentSoreness?: number | null
  recentReadiness?: number | null
  /** Weekly running kilometres in the last 7 days — used for stall diagnosis. */
  recentRunKm?: number | null
  /** Set when the plan currently has the user in a deload. */
  inDeload?: boolean
}

export function recommendNextSession(
  history: PerformedSession[],
  prescription: Prescription,
  context: RecommendContext = {},
): Recommendation {
  const { sets, repMin, repMax, targetRIR, incrementKg, lowerBody, units } = prescription

  // ---- No history: establish a baseline, do not guess a load ---------------
  if (!history.length) {
    return {
      action: 'establish_baseline',
      headline: 'Find a working weight',
      target: {
        loadKg: null,
        sets,
        repMin,
        repMax,
        targetRIR,
        totalRepsTarget: null,
        description: `${sets} × ${repMin}–${repMax}, leaving about ${targetRIR} reps in reserve on the first working set`,
      },
      reason:
        'This is your first logged session for this movement, so there is nothing to progress from yet. Warm up, then pick a load you could do a couple more reps with at the top of the range. FORGED will have a real recommendation after this session.',
      rule: 'No comparable history — baseline session.',
      citationIds: ['acsm-2009-progression', 'zourdos-2016-rir'],
      confidence: 'low',
      missingData: ['No previous performance for this exercise.'],
      warning: null,
    }
  }

  const last = history[0]
  const analysis = analyseSession(last)
  const { confidence, missingData } = assessConfidence(history, analysis)
  const judgedOn = analysis.mixedLoads
    ? `Last time ran from ${formatKg(analysis.lightestLoadKg, units)} to ${formatKg(analysis.topLoadKg, units)}. Reps only mean something next to the load they were done at, so this reads the ${formatKg(analysis.topLoadKg, units)} ${analysis.setsAtTopLoad === 1 ? 'set' : `sets (${analysis.setsAtTopLoad} of them)`} and leaves the lighter ones out of it.`
    : undefined
  const plateau = detectPlateau(history)
  /*
    The load being advised on.

    On a session where every set was the same weight these are the same
    number. Where they are not — 25 lb x 12 then 45 lb x 10 — the heaviest is
    the one the rep range was judged against, so it has to be the one the
    recommendation is about too. Advising on the light one would be arithmetic
    about a set that was never the point.
  */
  const currentLoad = analysis.topLoadKg > 0 ? analysis.topLoadKg : analysis.workingLoadKg
  const painHistory = history.slice(0, 3).map((h) => h.pain)
  const techniqueHistory = history.slice(0, 3).map((h) => h.technique)
  const repeatedBreakdown = techniqueHistory.filter((t) => t === 'breakdown').length >= 2

  // ---- Rule 5a: significant pain overrides everything ---------------------
  if (last.pain >= RULES.progression.painStopThreshold) {
    return {
      judgedOn,
      action: 'stop_and_seek_guidance',
      headline: 'Stop this movement and get it looked at',
      target: {
        loadKg: null,
        sets: 0,
        repMin,
        repMax,
        targetRIR,
        totalRepsTarget: null,
        description: 'No load prescribed until the pain is assessed.',
      },
      reason: `You reported pain of ${last.pain}/10 on this exercise. FORGED will not prescribe more load on a movement that hurts that much. Swap to a pain-free alternative or leave it out, and if the pain persists, is sharp, or radiates, get it assessed by a physiotherapist or physician.`,
      rule: `Pain ≥ ${RULES.progression.painStopThreshold}/10 → stop and seek guidance (rules.progression.painStopThreshold).`,
      citationIds: ['acsm-preparticipation'],
      confidence: 'high',
      missingData,
      warning:
        'FORGED is educational software, not a clinician. Pain that is sharp, worsening, or accompanied by numbness, dizziness or chest discomfort needs assessment by a physiotherapist or physician — stop training and seek help.',
    }
  }

  // ---- Rule 5b: moderate pain or repeated technique breakdown -------------
  if (last.pain >= RULES.progression.painBlockThreshold || repeatedBreakdown) {
    const painDriven = last.pain >= RULES.progression.painBlockThreshold
    const persistent = painHistory.filter((p) => p >= RULES.progression.painBlockThreshold).length >= 2
    const shouldSubstitute = persistent || repeatedBreakdown
    return {
      judgedOn,
      action: shouldSubstitute ? 'substitute_exercise' : 'hold_load',
      headline: shouldSubstitute ? 'Swap this movement out' : 'Hold the load and clean it up',
      target: {
        loadKg: shouldSubstitute ? null : currentLoad,
        sets,
        repMin,
        repMax,
        targetRIR: Math.max(targetRIR, 2),
        totalRepsTarget: null,
        description: shouldSubstitute
          ? 'Pick a pain-free variation and rebuild from a light load.'
          : `${sets} × ${repMin}–${repMax} at ${formatKg(currentLoad, units)}, stopping any set where form breaks`,
      },
      reason: painDriven
        ? `You reported pain of ${last.pain}/10 here${persistent ? ' across more than one session' : ''}. Adding load on top of a movement that hurts is how small problems become long ones. ${shouldSubstitute ? 'Substitute a variation that does not hurt and keep training everything else.' : 'Keep the same weight, shorten the range if needed, and see whether the pain settles.'}`
        : `Technique broke down on more than one recent session. That usually means the load is ahead of your control, not that you need more weight. ${shouldSubstitute ? 'Change to a variation you can own, or drop the load and rebuild it.' : 'Hold this weight until every rep looks the same.'}`,
      rule: painDriven
        ? `Pain ≥ ${RULES.progression.painBlockThreshold}/10 blocks any load increase (rules.progression.painBlockThreshold).`
        : 'Technique breakdown reported on ≥2 recent sessions blocks load increases.',
      citationIds: ['acsm-2009-progression', 'acsm-preparticipation'],
      confidence,
      missingData,
      warning:
        'If this pain keeps coming back, is sharp, or lingers after training, see a physiotherapist or physician before pushing on.',
    }
  }

  // ---- Rule 1: all sets at the top of the range at appropriate effort ------
  if (analysis.metTopOfRange) {
    const avgRir = analysis.averageRir
    const reckless = avgRir !== null && avgRir <= RULES.progression.recklessRIR

    if (reckless) {
      // Rule 3: hitting the top of the range only by grinding to failure is not
      // a green light. Repeat the same work with more in the tank first.
      return {
        action: 'hold_load',
        headline: 'Keep the same weight — earn it with reps in the tank',
        target: {
          loadKg: currentLoad,
          sets,
          repMin,
          repMax,
          targetRIR,
          totalRepsTarget: analysis.totalReps,
          description: `${sets} × ${repMax} at ${formatKg(currentLoad, units)} with about ${targetRIR} reps left over`,
        },
        reason: `You reached ${repMax} reps on every set, but your average reps in reserve was ${avgRir} — those sets went to failure. Repeat the same weight and hit the same reps with a couple of reps still in the tank, then FORGED will add load. Progress built on grinding sets is fragile and expensive to recover from.`,
        rule: `Top of range reached but average RIR ≤ ${RULES.progression.recklessRIR} → hold load (rules.progression.recklessRIR).`,
        citationIds: ['refalo-2023-failure', 'zourdos-2016-rir'],
        confidence,
        missingData,
        warning: null,
      }
    }

    const tooEasy = avgRir !== null && avgRir > RULES.progression.rirWindow.max
    const pct = lowerBody ? RULES.progression.lowerBodyStepPct : RULES.progression.upperBodyStepPct

    /*
      How far past the range, and what that is worth in load.

      The smallest increment is the right answer for somebody who just reached
      the top of the range. It is the wrong answer for somebody who sailed
      past it — eighteen reps against a cap of twelve is not "the top of the
      range", and adding 2.5 kg to it leaves them several sessions away from a
      weight that asks anything of them.

      The size of the jump comes from how many reps past the range they went,
      at roughly three percent of load per rep. Not from the Epley estimate
      the rest of the engine uses: Epley saturates at fifteen effective reps,
      so on an eighteen-rep set — exactly the case this exists for — it hands
      back the smallest increment and nothing changes. Capped, because a rule
      of thumb applied to a very high-rep set is a rough instrument.
    */
    const wayPast = analysis.repsPastTop >= RULES.progression.repsPastTopForBigJump
    let nextLoad: number
    if (wayPast && currentLoad > 0) {
      const wanted =
        currentLoad * (1 + analysis.repsPastTop * RULES.progression.loadPerExtraRepPct)
      const ceiling = currentLoad * (1 + RULES.progression.maxSingleJumpPct)
      nextLoad = roundToIncrement(Math.min(wanted, ceiling), incrementKg, units)
      // Never go backwards or stand still because of rounding.
      if (nextLoad <= currentLoad) nextLoad = stepUp(currentLoad, incrementKg, units)
    } else {
      nextLoad = tooEasy
        ? increaseWithinPct(currentLoad, incrementKg, pct, units)
        : stepUp(currentLoad, incrementKg, units)
    }
    const delta = Number((nextLoad - currentLoad).toFixed(2))
    const deltaPct = currentLoad > 0 ? (delta / currentLoad) * 100 : 0

    return {
      judgedOn,
      action: 'increase_load',
      headline: wayPast
        ? `Jump to ${formatKg(nextLoad, units)} — that was too light`
        : `Add ${formatKg(delta, units)}`,
      target: {
        loadKg: nextLoad,
        sets,
        repMin,
        repMax,
        targetRIR,
        totalRepsTarget: null,
        description: `${sets} × ${repMin}–${repMax} at ${formatKg(nextLoad, units)}`,
      },
      reason: wayPast
        ? `You did ${analysis.bestRepsAtTopLoad} reps at ${formatKg(currentLoad, units)} against a cap of ${repMax}. That is ${analysis.repsPastTop} reps past the range, not the top of it — the load is well below what you can handle for these reps. Going up by the smallest increment would take several more sessions to reach a weight that asks anything of you, so this jump is sized from what you actually lifted${avgRir !== null ? ` at an average of ${avgRir} reps in reserve` : ''} and capped at ${Math.round(RULES.progression.maxSingleJumpPct * 100)}% in one go. Expect the reps to land near ${repMin}–${repMax}; if they come in under ${repMin}, drop back a step.`
        : `You hit the top of the range (${repMax} reps) on all ${analysis.setsAtTop} working sets${avgRir !== null ? ` at an average of ${avgRir} reps in reserve` : ''}, technique held up, and pain was ${last.pain}/10. That is the double-progression trigger. Go up by the smallest jump your equipment allows — about ${deltaPct.toFixed(1)}% — and expect the reps to drop back toward ${repMin} for a session or two. That drop is the plan working, not a setback.`,
      rule: `All working sets at ${repMax} reps, average RIR in the ${RULES.progression.rirWindow.min}–${RULES.progression.rirWindow.max} window, pain < ${RULES.progression.painBlockThreshold}/10 → increase by the smallest available increment, capped at ${Math.round(pct.max * 100)}% for ${lowerBody ? 'lower' : 'upper'}-body movements.`,
      citationIds: ['acsm-2009-progression', 'refalo-2023-failure'],
      confidence,
      missingData,
      warning: null,
    }
  }

  // ---- Rule 3: load is clearly too heavy ----------------------------------
  if (analysis.belowFraction > RULES.progression.underRangeFraction) {
    const reduced = roundToIncrement(currentLoad * (1 - RULES.progression.backoffPct), incrementKg, units)
    const nextLoad = Math.min(reduced, Math.max(0, currentLoad - incrementKg))
    return {
      judgedOn,
      action: 'reduce_load',
      headline: `Back off to ${formatKg(nextLoad, units)}`,
      target: {
        loadKg: nextLoad,
        sets,
        repMin,
        repMax,
        targetRIR,
        totalRepsTarget: null,
        description: `${sets} × ${repMin}–${repMax} at ${formatKg(nextLoad, units)}`,
      },
      reason: `${analysis.setsBelowMin} of ${analysis.workingSets} working sets finished below ${repMin} reps. When most sets fall out the bottom of the range, the load is ahead of you — you are training your ability to grind rather than accumulating quality reps. Drop about ${Math.round(RULES.progression.backoffPct * 100)}% and build back up through the range.`,
      rule: `More than ${Math.round(RULES.progression.underRangeFraction * 100)}% of sets below ${repMin} reps → reduce load by ${Math.round(RULES.progression.backoffPct * 100)}% (rules.progression.underRangeFraction).`,
      citationIds: ['acsm-2009-progression'],
      confidence,
      missingData,
      warning: null,
    }
  }

  // ---- Rule 4: stalled for several comparable sessions --------------------
  if (plateau.stalled) {
    const checks: string[] = []
    if (context.recentSoreness != null && context.recentSoreness >= RULES.deload.sorenessThreshold) {
      checks.push(`soreness has been running high (${context.recentSoreness.toFixed(1)}/5)`)
    }
    if (context.recentReadiness != null && context.recentReadiness <= RULES.deload.readinessThreshold) {
      checks.push(`readiness has been low (${context.recentReadiness.toFixed(1)}/5)`)
    }
    if (context.recentRunKm != null && context.recentRunKm > 0) {
      checks.push(`you ran ${context.recentRunKm.toFixed(1)} km in the last week, which competes for recovery`)
    }
    if (analysis.missingRirFraction > RULES.confidence.missingRirFraction) {
      checks.push('effort is not being logged consistently, so proximity to failure is unclear')
    }
    if (!checks.length) checks.push('nothing obvious in your recovery data stands out yet')

    if (plateau.suggestSubstitution) {
      return {
        action: 'substitute_exercise',
        headline: 'Change the movement or the rep target',
        target: {
          loadKg: currentLoad,
          sets,
          repMin: Math.max(3, repMin - 2),
          repMax: Math.max(6, repMax - 2),
          targetRIR,
          totalRepsTarget: null,
          description: `Either swap to a close variation and rebuild, or run ${sets} × ${Math.max(3, repMin - 2)}–${Math.max(6, repMax - 2)} at ${formatKg(currentLoad, units)}`,
        },
        reason: `This lift has not moved in ${plateau.stalledSessions} comparable sessions. Before adding weight anyway, check the inputs: ${checks.join('; ')}. A stubborn stall usually responds better to a different stimulus — a close variation, a lower rep target at the same load, or a couple of easier weeks — than to forcing the bar up.`,
        rule: `No meaningful change for ≥${RULES.plateau.sessionsToSubstitute} comparable sessions → change the stimulus (rules.plateau.sessionsToSubstitute).`,
        citationIds: ['acsm-2009-progression', 'bell-2020-overreaching'],
        confidence,
        missingData,
        warning: null,
      }
    }

    return {
      judgedOn,
      action: 'hold_and_check_recovery',
      headline: 'Hold the load and look at recovery',
      target: {
        loadKg: currentLoad,
        sets,
        repMin,
        repMax,
        targetRIR,
        totalRepsTarget: analysis.totalReps + RULES.progression.repIncrementTarget,
        description: `${sets} × ${repMin}–${repMax} at ${formatKg(currentLoad, units)} — beat ${analysis.totalReps} total reps`,
      },
      reason: `Estimated strength on this lift has been flat for ${plateau.stalledSessions} sessions. FORGED will not add weight to a stall — that is how a plateau becomes an injury. Keep the load, chase one extra rep, and check the inputs first: ${checks.join('; ')}.`,
      rule: `No meaningful change for ≥${RULES.plateau.sessionsToStall} comparable sessions → hold load and audit recovery (rules.plateau.sessionsToStall).`,
      citationIds: ['bell-2020-overreaching', 'acsm-2011-quantity'],
      confidence,
      missingData,
      warning: null,
    }
  }

  // ---- Rule 2: inside the range — keep the load, chase reps ---------------
  const repsToBeat = analysis.totalReps + RULES.progression.repIncrementTarget
  const remainingTopReps = Math.max(0, analysis.workingSets - analysis.setsAtTop)
  return {
    judgedOn,
    action: 'add_reps',
    headline: `Same weight — beat ${analysis.totalReps} total reps`,
    target: {
      loadKg: currentLoad,
      sets,
      repMin,
      repMax,
      targetRIR,
      totalRepsTarget: repsToBeat,
      description: `${sets} × ${repMin}–${repMax} at ${formatKg(currentLoad, units)}, target ${repsToBeat}+ total reps`,
    },
    reason: `You finished inside the ${repMin}–${repMax} range (${last.sets.map((s) => s.reps).join(', ')}${analysis.averageRir !== null ? ` at about ${analysis.averageRir} reps in reserve` : ''}). ${remainingTopReps > 0 ? `${remainingTopReps} set${remainingTopReps === 1 ? '' : 's'} still short of ${repMax}. ` : ''}Keep the same load and add reps: once every set reaches ${repMax} at a controlled effort, FORGED adds weight. That is double progression — the reps earn the load.`,
    rule: `Inside the rep range → hold load, target +${RULES.progression.repIncrementTarget} total rep${RULES.progression.repIncrementTarget === 1 ? '' : 's'} (rules.progression.repIncrementTarget).`,
    citationIds: ['acsm-2009-progression', 'refalo-2023-failure'],
    confidence,
    missingData,
    warning: null,
  }
}

/** Convenience wrapper used by the UI: history is derived from stored sessions. */
export function recommendForExercise(
  sessions: Session[],
  exerciseId: string,
  prescription: Prescription,
  context: RecommendContext = {},
): Recommendation {
  return recommendNextSession(historyFor(sessions, exerciseId), prescription, context)
}

export const ACTION_LABEL: Record<RecommendationAction, string> = {
  establish_baseline: 'Baseline',
  increase_load: 'Increase load',
  add_reps: 'Add reps',
  hold_load: 'Hold load',
  reduce_load: 'Reduce load',
  hold_and_check_recovery: 'Hold & recover',
  substitute_exercise: 'Change movement',
  stop_and_seek_guidance: 'Stop & seek guidance',
}

export const ACTION_TONE: Record<RecommendationAction, 'good' | 'neutral' | 'caution' | 'danger'> = {
  establish_baseline: 'neutral',
  increase_load: 'good',
  add_reps: 'good',
  hold_load: 'neutral',
  reduce_load: 'caution',
  hold_and_check_recovery: 'caution',
  substitute_exercise: 'caution',
  stop_and_seek_guidance: 'danger',
}

export function describeRecommendationTarget(rec: Recommendation, units: Units): string {
  return describeTarget(rec.target, units)
}
