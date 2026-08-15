import { RULES } from '@/config/rules'
import type {
  EnduranceGoal,
  Experience,
  IsoDate,
  Priority,
  RunLog,
  RunType,
  Session,
} from '@/types'
import { addDays, daysBetween, startOfWeek, toIsoDate, weekdayName, weekdayOf } from '@/lib/date'
import type { Confidence } from '@/engine/progression'

/**
 * The running engine — deliberately separate from strength progression.
 *
 * Running load is NOT governed by a blind 10% rule. The evidence linking any
 * fixed weekly percentage to injury is weak and inconsistent, so FORGED caps
 * increases by experience and then gates them on things it can actually observe:
 * did you complete last week, how hard did it feel, did anything hurt, and how
 * much hard lower-body lifting is competing for the same recovery.
 */

export type RunAction = 'start_conservative' | 'increase' | 'hold' | 'reduce' | 'recover' | 'benchmark'

export interface PlannedRun {
  type: RunType
  /** Either distance or duration is set, depending on run type. */
  distanceKm: number | null
  durationMin: number | null
  description: string
  /** The same line as a template plus its numbers, for translation. */
  descriptionTemplate: string
  descriptionVars?: Record<string, string | number>
  /** Suggested weekday (0=Sun). Null means "wherever it fits". */
  weekday: number | null
}

export interface RunRecommendation {
  action: RunAction
  headline: string
  headlineTemplate: string
  headlineVars: Record<string, string | number>
  targetWeeklyKm: number
  previousWeeklyKm: number
  sessions: PlannedRun[]
  reason: string
  reasonTemplate: string
  reasonVars: Record<string, string | number>
  warningTemplate: string | null
  rule: string
  confidence: Confidence
  missingData: string[]
  warning: string | null
  citationIds: string[]
  /** Scheduling note for concurrent-training interference. */
  schedulingNote: string | null
  schedulingNoteTemplate: string | null
  schedulingNoteVars: Record<string, string | number>
}

export interface RunningInput {
  runs: RunLog[]
  sessions: Session[]
  experience: Experience
  priority: Priority
  enduranceGoal: EnduranceGoal
  /** Baseline from onboarding, used until there is real logged data. */
  baselineWeeklyKm: number
  today?: IsoDate
}

export interface WeeklyRunSummary {
  weekStart: IsoDate
  distanceKm: number
  durationSec: number
  runs: number
  plannedRuns: number
  completedPlanned: number
  meanRpe: number | null
  maxPain: number
  longestKm: number
}

export function summariseWeek(runs: RunLog[], weekStart: IsoDate): WeeklyRunSummary {
  const inWeek = runs.filter((r) => {
    const diff = daysBetween(weekStart, r.date)
    return diff >= 0 && diff < 7
  })
  const rpes = inWeek.map((r) => r.rpe).filter((v) => v > 0)
  return {
    weekStart,
    distanceKm: Number(inWeek.reduce((s, r) => s + r.distanceKm, 0).toFixed(2)),
    durationSec: inWeek.reduce((s, r) => s + r.durationSec, 0),
    runs: inWeek.length,
    plannedRuns: inWeek.filter((r) => r.planned).length,
    completedPlanned: inWeek.filter((r) => r.planned).length,
    meanRpe: rpes.length ? Number((rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1)) : null,
    maxPain: inWeek.reduce((m, r) => Math.max(m, r.pain), 0),
    longestKm: inWeek.reduce((m, r) => Math.max(m, r.distanceKm), 0),
  }
}

function qualitySessionsAllowed(priority: Priority): number {
  return RULES.running.qualitySessionsByPriority[priority]
}

/** Weekdays where hard lower-body lifting is scheduled, from recent history. */
function hardLegDays(sessions: Session[], today: IsoDate): number[] {
  const recent = sessions.filter((s) => {
    const age = daysBetween(s.date, today)
    return age >= 0 && age < 14 && s.status === 'completed'
  })
  const legPatterns = new Set(['squat', 'hinge'])
  const days = new Set<number>()
  for (const s of recent) {
    const isLegDay = s.entries.some((e) => legPatterns.has(inferPattern(e.exerciseId)))
    if (isLegDay) days.add(weekdayOf(s.date))
  }
  return [...days].sort((a, b) => a - b)
}

/** Cheap pattern inference so this module stays free of the exercise import. */
function inferPattern(exerciseId: string): string {
  if (/squat|leg-press|hack|lunge|split/.test(exerciseId)) return 'squat'
  if (/deadlift|romanian|hip-thrust|back-extension|leg-curl/.test(exerciseId)) return 'hinge'
  return 'other'
}

function buildSessionPlan(
  targetKm: number,
  action: RunAction,
  input: RunningInput,
  legDays: number[],
): PlannedRun[] {
  const { experience, priority, enduranceGoal } = input
  const quality = qualitySessionsAllowed(priority)
  const plan: PlannedRun[] = []

  // Brand-new runners: walk/run intervals rather than continuous running.
  if (targetKm < RULES.running.walkRunUnderKm && experience === 'beginner') {
    const sessionsCount = Math.max(2, Math.min(3, Math.round(targetKm / 2)))
    for (let i = 0; i < sessionsCount; i++) {
      plan.push({
        type: 'walk_run',
        distanceKm: Number((targetKm / sessionsCount).toFixed(1)),
        durationMin: 25,
        description:
          'Walk/run: 5 min brisk walk, then 6 × (2 min easy jog / 2 min walk), 5 min walk to finish. Conversational effort throughout.',
        descriptionTemplate:
          'Walk/run: 5 min brisk walk, then 6 × (2 min easy jog / 2 min walk), 5 min walk to finish. Conversational effort throughout.',
        weekday: null,
      })
    }
    return plan
  }

  const longKm = Number(Math.min(targetKm * RULES.running.longRunMaxFraction, targetKm).toFixed(1))
  const remaining = Math.max(0, targetKm - longKm)
  const easyCount = enduranceGoal === 'none' ? 1 : 2
  const easyKm = easyCount > 0 ? Number((remaining / Math.max(1, easyCount)).toFixed(1)) : 0

  plan.push({
    type: 'long',
    distanceKm: longKm,
    durationMin: null,
    description: `Long easy run — conversational pace the whole way. Keep it under ${Math.round(RULES.running.longRunMaxFraction * 100)}% of your weekly volume.`,
    descriptionTemplate:
      'Long easy run — conversational pace the whole way. Keep it under {pct}% of your weekly volume.',
    descriptionVars: { pct: Math.round(RULES.running.longRunMaxFraction * 100) },
    weekday: null,
  })

  for (let i = 0; i < easyCount && easyKm > 0.4; i++) {
    plan.push({
      type: 'easy',
      distanceKm: easyKm,
      durationMin: null,
      description: 'Easy aerobic run. If you cannot hold a conversation, slow down.',
      descriptionTemplate: 'Easy aerobic run. If you cannot hold a conversation, slow down.',
      weekday: null,
    })
  }

  const wantsQuality =
    action !== 'reduce' &&
    action !== 'recover' &&
    quality > 0 &&
    (enduranceGoal === 'run5k' || enduranceGoal === 'improve5k' || enduranceGoal === 'longer' || enduranceGoal === 'conditioning')

  if (wantsQuality) {
    const suggestedDay = [2, 4, 3].find((d) => !legDays.includes(d)) ?? null
    plan.push({
      type: enduranceGoal === 'longer' ? 'threshold' : 'intervals',
      distanceKm: null,
      durationMin: 35,
      description:
        enduranceGoal === 'longer'
          ? 'Threshold: 15 min easy, then 2 × 8 min at "comfortably hard" with 3 min easy between, 10 min easy.'
          : 'Intervals: 12 min easy, then 6 × 400 m at a strong but controlled effort with 90 s walk/jog, 10 min easy.',
      descriptionTemplate:
        enduranceGoal === 'longer'
          ? 'Threshold: 15 min easy, then 2 × 8 min at "comfortably hard" with 3 min easy between, 10 min easy.'
          : 'Intervals: 12 min easy, then 6 × 400 m at a strong but controlled effort with 90 s walk/jog, 10 min easy.',
      weekday: suggestedDay,
    })
  }

  if (action === 'recover' || action === 'reduce') {
    plan.push({
      type: 'recovery',
      distanceKm: null,
      durationMin: 25,
      description: 'Very easy shake-out. Stop early if anything is sore or painful.',
      descriptionTemplate: 'Very easy shake-out. Stop early if anything is sore or painful.',
      weekday: null,
    })
  }

  return plan
}

export function recommendRunning(input: RunningInput): RunRecommendation {
  const today = input.today ?? toIsoDate()
  const thisWeekStart = startOfWeek(today)
  const lastWeekStart = addDays(thisWeekStart, -7)
  const priorWeekStart = addDays(thisWeekStart, -14)

  const lastWeek = summariseWeek(input.runs, lastWeekStart)
  const priorWeek = summariseWeek(input.runs, priorWeekStart)
  const currentWeek = summariseWeek(input.runs, thisWeekStart)

  const legDays = hardLegDays(input.sessions, today)
  const missingData: string[] = []
  const hasHistory = lastWeek.runs > 0 || priorWeek.runs > 0

  const previousWeeklyKm = hasHistory ? lastWeek.distanceKm : input.baselineWeeklyKm
  if (!hasHistory) {
    missingData.push('No runs logged in the last two weeks — using the weekly distance from your profile.')
  }
  if (lastWeek.runs > 0 && lastWeek.meanRpe === null) {
    missingData.push('No session RPE recorded, so how hard the running felt had to be assumed.')
  }

  const cap = RULES.running.weeklyIncreaseCap[input.experience]
  const painFlag = Math.max(lastWeek.maxPain, currentWeek.maxPain) >= RULES.running.painReduceThreshold
  const rpeFlag = lastWeek.meanRpe !== null && lastWeek.meanRpe >= RULES.running.highRpeThreshold
  const completionFlag =
    priorWeek.distanceKm > 0 && lastWeek.distanceKm < priorWeek.distanceKm * RULES.running.completionHoldFraction

  let action: RunAction
  let targetWeeklyKm: number
  let rule: string
  let reason: string
  let reasonTemplate: string
  let reasonVars: Record<string, string | number> = {}
  let warning: string | null = null
  let warningTemplate: string | null = null

  if (painFlag) {
    action = 'reduce'
    targetWeeklyKm = Number((previousWeeklyKm * (1 - RULES.running.reductionPct)).toFixed(1))
    rule = `Run pain ≥ ${RULES.running.painReduceThreshold}/10 → cut weekly volume by ${Math.round(RULES.running.reductionPct * 100)}% (rules.running.painReduceThreshold).`
    reason = `You logged pain of ${Math.max(lastWeek.maxPain, currentWeek.maxPain)}/10 on a recent run. Running through a niggle is the most common way a two-week problem becomes a two-month one. Drop roughly ${Math.round(RULES.running.reductionPct * 100)}% of your volume, keep everything easy, and rebuild once you are pain-free.`
    reasonTemplate =
      'You logged pain of {pain}/10 on a recent run. Running through a niggle is the most common way a two-week problem becomes a two-month one. Drop roughly {pct}% of your volume, keep everything easy, and rebuild once you are pain-free.'
    reasonVars = {
      pain: Math.max(lastWeek.maxPain, currentWeek.maxPain),
      pct: Math.round(RULES.running.reductionPct * 100),
    }
    warning =
      'If the pain is sharp, localised to a bone, or gets worse as you run, stop running and see a physiotherapist or physician.'
    warningTemplate =
      'If the pain is sharp, localised to a bone, or gets worse as you run, stop running and see a physiotherapist or physician.'
  } else if (rpeFlag || completionFlag) {
    action = 'hold'
    targetWeeklyKm = Number(previousWeeklyKm.toFixed(1))
    rule = rpeFlag
      ? `Mean session RPE ≥ ${RULES.running.highRpeThreshold}/10 → hold volume (rules.running.highRpeThreshold).`
      : `Completed less than ${Math.round(RULES.running.completionHoldFraction * 100)}% of the previous week → hold volume (rules.running.completionHoldFraction).`
    reason = rpeFlag
      ? `Your runs last week averaged ${lastWeek.meanRpe}/10 effort. That is hard for easy running. Repeat the same volume at a genuinely conversational pace before adding anything — most easy runs should feel almost too easy.`
      : `Last week came in at ${lastWeek.distanceKm} km against ${priorWeek.distanceKm} km the week before. Adding volume on top of a week you did not finish stacks the deficit. Repeat the same target and bank a complete week first.`
    reasonTemplate = rpeFlag
      ? 'Your runs last week averaged {rpe}/10 effort. That is hard for easy running. Repeat the same volume at a genuinely conversational pace before adding anything — most easy runs should feel almost too easy.'
      : 'Last week came in at {last} km against {prior} km the week before. Adding volume on top of a week you did not finish stacks the deficit. Repeat the same target and bank a complete week first.'
    reasonVars = rpeFlag
      ? { rpe: lastWeek.meanRpe ?? 0 }
      : { last: lastWeek.distanceKm, prior: priorWeek.distanceKm }
  } else if (!hasHistory && input.baselineWeeklyKm < RULES.running.walkRunUnderKm) {
    action = 'start_conservative'
    targetWeeklyKm = Math.max(4, Number((input.baselineWeeklyKm || 4).toFixed(1)))
    rule = `New or returning runner below ${RULES.running.walkRunUnderKm} km/week → start with walk/run intervals (rules.running.walkRunUnderKm).`
    reason = `You are starting from ${input.baselineWeeklyKm || 0} km a week, so FORGED begins with walk/run intervals rather than continuous running. Impact tolerance builds more slowly than fitness does — the aim for the first few weeks is finishing every session feeling like you could have done another one.`
    reasonTemplate =
      'You are starting from {km} km a week, so FORGED begins with walk/run intervals rather than continuous running. Impact tolerance builds more slowly than fitness does — the aim for the first few weeks is finishing every session feeling like you could have done another one.'
    reasonVars = { km: input.baselineWeeklyKm || 0 }
  } else {
    action = 'increase'
    const pctAdd = previousWeeklyKm * cap
    const add =
      previousWeeklyKm < RULES.running.lowVolumeKm
        ? RULES.running.lowVolumeAddKm
        : Math.min(pctAdd, RULES.running.absoluteWeeklyAddKm)
    targetWeeklyKm = Number((previousWeeklyKm + add).toFixed(1))
    rule = `Completed last week, no pain flag, effort in range → add ${previousWeeklyKm < RULES.running.lowVolumeKm ? `${RULES.running.lowVolumeAddKm} km (flat step under ${RULES.running.lowVolumeKm} km/week)` : `up to ${Math.round(cap * 100)}% capped at ${RULES.running.absoluteWeeklyAddKm} km`} (rules.running.weeklyIncreaseCap).`
    reason = `You completed last week's running (${previousWeeklyKm} km), nothing hurt, and the effort sat in a sensible range. FORGED adds ${add.toFixed(1)} km — a ${(previousWeeklyKm > 0 ? (add / previousWeeklyKm) * 100 : 0).toFixed(0)}% step sized for a ${input.experience} runner. This is not a fixed 10% rule: the cap moves with your experience, and it only applies when you actually finished the previous week.`
    reasonTemplate =
      "You completed last week's running ({previous} km), nothing hurt, and the effort sat in a sensible range. FORGED adds {add} km — a {pct}% step sized for a {experience} runner. This is not a fixed 10% rule: the cap moves with your experience, and it only applies when you actually finished the previous week."
    reasonVars = {
      previous: previousWeeklyKm,
      add: add.toFixed(1),
      pct: (previousWeeklyKm > 0 ? (add / previousWeeklyKm) * 100 : 0).toFixed(0),
      experience: input.experience,
    }
  }

  // Benchmark: only when the goal calls for it, load is stable, and it has been
  // long enough since the last one.
  const lastBenchmark = [...input.runs]
    .filter((r) => r.type === 'benchmark')
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const benchmarkDue =
    (input.enduranceGoal === 'run5k' || input.enduranceGoal === 'improve5k') &&
    (action === 'increase' || action === 'hold') &&
    (!lastBenchmark || daysBetween(lastBenchmark.date, today) >= RULES.running.benchmarkMinDays)

  const sessions = buildSessionPlan(targetWeeklyKm, action, input, legDays)
  if (benchmarkDue) {
    action = 'benchmark'
    sessions.push({
      type: 'benchmark',
      distanceKm: 5,
      durationMin: null,
      description:
        'Benchmark 5K: 10 min easy warm-up, then 5 km as a steady hard effort you can hold to the finish. Log the time so FORGED can compare it later.',
      descriptionTemplate:
        'Benchmark 5K: 10 min easy warm-up, then 5 km as a steady hard effort you can hold to the finish. Log the time so FORGED can compare it later.',
      weekday: 6,
    })
  }

  const longRunCapped = sessions.find((s) => s.type === 'long')
  if (longRunCapped && lastWeek.longestKm > lastWeek.distanceKm * RULES.running.longRunMaxFraction && lastWeek.distanceKm > 0) {
    missingData.push(
      `Your long run was ${Math.round((lastWeek.longestKm / lastWeek.distanceKm) * 100)}% of last week's volume — FORGED caps it at ${Math.round(RULES.running.longRunMaxFraction * 100)}%.`,
    )
  }

  const schedulingNote =
    input.priority === 'muscle' && legDays.length
      ? `You lift legs on ${legDays.map((d) => weekdayName(d, true)).join(' and ')}. Because you told FORGED muscle comes first, keep hard running at least ${RULES.running.interferenceSpacingHours} hours away from those sessions — and ideally on a different day. Easy running on leg days is fine.`
      : input.priority === 'endurance'
        ? 'Endurance is your priority, so run first when a run and a lift land on the same day, and treat lower-body lifting as the session that gives ground.'
        : 'When a hard run and hard leg training land on the same day, put several hours between them and do the one that matters more to you first.'
  const schedulingNoteTemplate =
    input.priority === 'muscle' && legDays.length
      ? 'You lift legs on {days}. Because you told FORGED muscle comes first, keep hard running at least {hours} hours away from those sessions — and ideally on a different day. Easy running on leg days is fine.'
      : input.priority === 'endurance'
        ? 'Endurance is your priority, so run first when a run and a lift land on the same day, and treat lower-body lifting as the session that gives ground.'
        : 'When a hard run and hard leg training land on the same day, put several hours between them and do the one that matters more to you first.'
  const schedulingNoteVars: Record<string, string | number> =
    input.priority === 'muscle' && legDays.length
      ? {
          days: legDays.map((d) => weekdayName(d, true)).join(' and '),
          hours: RULES.running.interferenceSpacingHours,
        }
      : {}

  const confidence: Confidence =
    lastWeek.runs >= 2 && priorWeek.runs >= 1 ? 'high' : lastWeek.runs >= 1 ? 'medium' : 'low'

  return {
    action,
    headline:
      action === 'reduce'
        ? `Cut back to ${targetWeeklyKm} km this week`
        : action === 'hold'
          ? `Hold at ${targetWeeklyKm} km this week`
          : action === 'start_conservative'
            ? 'Start with walk/run intervals'
            : action === 'benchmark'
              ? `Benchmark week — ${targetWeeklyKm} km including a 5K test`
              : `Build to ${targetWeeklyKm} km this week`,
    headlineTemplate:
      action === 'reduce'
        ? 'Cut back to {km} km this week'
        : action === 'hold'
          ? 'Hold at {km} km this week'
          : action === 'start_conservative'
            ? 'Start with walk/run intervals'
            : action === 'benchmark'
              ? 'Benchmark week — {km} km including a 5K test'
              : 'Build to {km} km this week',
    headlineVars: { km: targetWeeklyKm },
    reasonTemplate,
    reasonVars,
    warningTemplate,
    schedulingNoteTemplate,
    schedulingNoteVars,
    targetWeeklyKm,
    previousWeeklyKm: Number(previousWeeklyKm.toFixed(1)),
    sessions,
    reason,
    rule,
    confidence,
    missingData,
    warning,
    citationIds: ['nielsen-2014-running-load', 'damsted-2018-load-review', 'schumann-2022-concurrent'],
    schedulingNote,
  }
}

export interface BenchmarkComparison {
  improved: boolean
  currentSec: number
  previousSec: number | null
  deltaSec: number | null
  detail: string
  detailTemplate: string
  detailVars: Record<string, string | number>
}

/** Compare the newest benchmark against the best previous one at the same distance. */
export function compareBenchmark(runs: RunLog[], tolerance = 0.15): BenchmarkComparison | null {
  const benchmarks = runs
    .filter((r) => r.type === 'benchmark' && r.distanceKm > 0 && r.durationSec > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  if (!benchmarks.length) return null
  const latest = benchmarks[0]
  const comparable = benchmarks
    .slice(1)
    .filter((r) => Math.abs(r.distanceKm - latest.distanceKm) <= latest.distanceKm * tolerance)
  if (!comparable.length) {
    return {
      improved: false,
      currentSec: latest.durationSec,
      previousSec: null,
      deltaSec: null,
      detail: 'First benchmark at this distance — this is your reference point from now on.',
      detailTemplate: 'First benchmark at this distance — this is your reference point from now on.',
      detailVars: {},
    }
  }
  const best = comparable.reduce((a, b) => (b.durationSec < a.durationSec ? b : a))
  const delta = latest.durationSec - best.durationSec
  return {
    improved: delta < 0,
    currentSec: latest.durationSec,
    previousSec: best.durationSec,
    deltaSec: delta,
    detail:
      delta < 0
        ? `${Math.abs(Math.round(delta))} s faster than your previous best over this distance.`
        : `${Math.round(delta)} s slower than your best. One benchmark is noisy — heat, sleep, and how recently you trained legs all move it.`,
    detailTemplate:
      delta < 0
        ? '{seconds} s faster than your previous best over this distance.'
        : '{seconds} s slower than your best. One benchmark is noisy — heat, sleep, and how recently you trained legs all move it.',
    detailVars: { seconds: Math.abs(Math.round(delta)) },
  }
}
