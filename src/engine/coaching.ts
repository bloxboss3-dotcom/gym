import { RULES } from '@/config/rules'
import { interpolate } from '@/i18n'
import { historyFor } from '@/engine/progression'
import { estimateOneRepMax } from '@/engine/stats'
import { daysBetween } from '@/lib/date'
import type { Exercise, IsoDate, Session } from '@/types'

/**
 * The coaching verdict: are you actually getting anywhere, and are you
 * training hard enough to?
 *
 * Everything else in this engine answers a local question — what should I do
 * on THIS movement NEXT session. That is the right unit for a prescription
 * and the wrong unit for a judgement. Somebody can follow a correct
 * recommendation on every exercise for two months and still be going
 * nowhere, and nothing in the app would have said so, because nothing was
 * looking across movements or across weeks.
 *
 * So this asks two questions per movement, over a month of training:
 *
 *   Is the load going up? Estimated 1RM early in the window against late.
 *   Movement to movement this is noisy, which is why it is only ever
 *   reported alongside how many sessions it is built on.
 *
 *   Is the effort there? Median reps in reserve across working sets. Sets
 *   taken close to failure drive growth; comfortable ones largely do not
 *   (Refalo 2023). A movement that is not progressing AND is being trained
 *   three reps shy of failure has an obvious explanation, and saying the two
 *   things separately buries it.
 *
 * Deliberately not a score. A single number would be easy to put on a card
 * and impossible to act on, and it would invite the app to tell somebody they
 * are "72% optimised", which means nothing.
 */

const WINDOW_DAYS: number = RULES.coaching.windowDays
const MIN_SESSIONS: number = RULES.coaching.minSessions

export type ProgressTrend = 'gaining' | 'holding' | 'slipping' | 'unknown'
export type EffortVerdict = 'hard_enough' | 'leaving_reps' | 'grinding' | 'unknown'

export interface MovementVerdict {
  exerciseId: string
  name: string
  sessions: number
  /** Change in best estimated 1RM across the window, as a fraction. */
  trendPct: number | null
  trend: ProgressTrend
  /** Median reps in reserve across working sets in the window. */
  medianRir: number | null
  effort: EffortVerdict
  /** One line naming what is happening and what it means, in English. */
  note: string
  /**
   * The same line before interpolation, plus its values.
   *
   * The engine has no business knowing what language anybody reads — it stays
   * pure and English — but a finished sentence cannot be looked up in a
   * catalogue. Emitting the template alongside the sentence lets the screen
   * translate it and fill in the numbers afterwards, which is also the only
   * way word order can differ between languages.
   */
  noteTemplate: string
  noteVars: Record<string, string | number>
}

export interface TrainingVerdict {
  /** The one sentence somebody should read if they read nothing else. */
  headline: string
  detail: string
  /** The same two before interpolation, so a screen can translate them. */
  headlineTemplate: string
  detailTemplate: string
  verdictVars: Record<string, string | number>
  status: 'good' | 'attention' | 'unknown'
  movements: MovementVerdict[]
  gaining: number
  stalled: number
  leavingReps: number
  grinding: number
  /** What could not be judged, and why. */
  missingData: string[]
  citationIds: string[]
  windowDays: number
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
}

/**
 * Trend across the window, and whether more than one session backs it up.
 *
 * Half-against-half rather than first-against-last, so a single heavy day at
 * either end cannot decide it on its own. That is not enough by itself: a
 * month of weekly training only fits four or five sessions inside the
 * window, so each half is two or three, and one outlier in a half of two
 * still moves the mean past any sensible threshold.
 *
 * Hence `supported`. A direction is only called when MOST of the later half
 * individually sits on that side of the earlier half's median — so five flat
 * weeks and one good day reads as flat, which is what it is, and two good
 * sessions in a row reads as progress, which is also what it is.
 *
 * `e1rms` arrives newest first.
 */
function trendOf(e1rms: number[]): { pct: number; supported: boolean } | null {
  if (e1rms.length < MIN_SESSIONS) return null
  const split = Math.floor(e1rms.length / 2)
  const earlier = e1rms.slice(e1rms.length - split)
  const later = e1rms.slice(0, split)
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const from = mean(earlier)
  if (from <= 0) return null
  const pct = Number(((mean(later) - from) / from).toFixed(4))
  const baseline = median(earlier) ?? from
  const agreeing = later.filter((v) => (pct >= 0 ? v > baseline : v < baseline)).length
  return { pct, supported: agreeing > later.length / 2 }
}

export function assessMovement(
  exercise: Exercise,
  sessions: Session[],
  today: IsoDate,
  windowDays = WINDOW_DAYS,
): MovementVerdict | null {
  const history = historyFor(sessions, exercise.id, 12).filter(
    (h) => daysBetween(h.date, today) <= windowDays,
  )
  if (!history.length) return null

  // Newest first, which is what historyFor gives.
  const e1rms = history.map((h) =>
    h.sets.reduce((max, s) => Math.max(max, estimateOneRepMax(s.weightKg, s.reps, s.rir)), 0),
  )
  const moved = trendOf(e1rms)
  const trendPct = moved?.pct ?? null
  const trend: ProgressTrend =
    moved === null
      ? 'unknown'
      : !moved.supported
        ? 'holding'
        : moved.pct >= RULES.coaching.meaningfulTrendPct
          ? 'gaining'
          : moved.pct <= -RULES.coaching.meaningfulTrendPct
            ? 'slipping'
            : 'holding'

  const rirs = history.flatMap((h) =>
    h.sets.map((s) => s.rir).filter((r): r is number => r !== null),
  )
  const medianRir = median(rirs)
  const effort: EffortVerdict =
    medianRir === null
      ? 'unknown'
      : medianRir > RULES.progression.rirWindow.max
        ? 'leaving_reps'
        : medianRir < RULES.progression.rirWindow.min
          ? 'grinding'
          : 'hard_enough'

  const pct = trendPct === null ? null : `${trendPct >= 0 ? '+' : ''}${(trendPct * 100).toFixed(1)}%`

  /*
    Why the two findings are written as one sentence.

    "Not progressing" and "training three reps shy of failure" are the same
    story told twice, and reported as separate rows nobody joins them up. The
    note names the cause when there is one to name.

    Built from a template with {placeholders} rather than assembled inline.
    The engine stays pure and still emits English; the template is also the
    lookup key for a translation, which a finished sentence could never be —
    interpolate first and there is nothing left to look up, and word order
    differs between languages anyway.
  */
  const movingWord =
    trend === 'slipping' ? 'Going backwards ({pct})' : 'Flat ({pct})'
  let template: string
  if (trend === 'unknown') {
    template =
      history.length === 1
        ? 'Only 1 session in the last {days} days — not enough to call a trend yet.'
        : 'Only {sessions} sessions in the last {days} days — not enough to call a trend yet.'
  } else if (trend === 'gaining' && effort === 'hard_enough') {
    template = 'Going up ({pct}) and the sets are landing in the right effort window. Leave it alone.'
  } else if (trend === 'gaining') {
    template =
      effort === 'leaving_reps'
        ? 'Going up ({pct}), and at a median of {rir} reps in reserve there is more in the tank.'
        : 'Going up ({pct}), though the sets are running very close to failure.'
  } else if (effort === 'leaving_reps') {
    template = `${movingWord}, at a median of {rir} reps in reserve. That is the likely reason — a set you could have doubled is not a hard set.`
  } else if (effort === 'grinding') {
    template = `${movingWord}, and the sets are going to failure or past it. More effort is not the missing ingredient here; recovery or volume might be.`
  } else if (trend === 'slipping') {
    template =
      'Going backwards ({pct}) despite the effort being in the right window. Worth checking sleep, food and how much else is being trained.'
  } else {
    template =
      'Flat ({pct}) at a reasonable effort. Normal for a stretch — if it holds another few weeks, change the rep range or the movement.'
  }
  const vars = {
    pct: pct ?? '',
    rir: medianRir ?? 0,
    days: windowDays,
    sessions: history.length,
  }
  const note = interpolate(template, vars)

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    sessions: history.length,
    trendPct,
    trend,
    medianRir,
    effort,
    note,
    /** The un-interpolated sentence and its values, so the UI can translate. */
    noteTemplate: template,
    noteVars: vars,
  }
}

export function assessTraining(input: {
  sessions: Session[]
  exercises: Exercise[]
  today: IsoDate
  windowDays?: number
}): TrainingVerdict {
  const windowDays = input.windowDays ?? WINDOW_DAYS
  const citationIds = ['refalo-2023-failure', 'zourdos-2016-rir', 'acsm-2009-progression']

  const trained = new Set(
    input.sessions
      .filter((s) => s.status === 'completed' && daysBetween(s.date, input.today) <= windowDays)
      .flatMap((s) => s.entries.map((e) => e.exerciseId)),
  )
  const movements = [...trained]
    .map((id) => input.exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e))
    .map((e) => assessMovement(e, input.sessions, input.today, windowDays))
    .filter((v): v is MovementVerdict => v !== null)
    // Worst news first. Somebody scanning this should hit the problems before
    // the congratulations.
    .sort((a, b) => rank(a) - rank(b) || b.sessions - a.sessions)

  const judged = movements.filter((m) => m.trend !== 'unknown')
  const gaining = judged.filter((m) => m.trend === 'gaining').length
  const stalled = judged.filter((m) => m.trend !== 'gaining').length
  const leavingReps = movements.filter((m) => m.effort === 'leaving_reps').length
  const grinding = movements.filter((m) => m.effort === 'grinding').length

  const missingData: string[] = []
  const unknownTrend = movements.length - judged.length
  if (unknownTrend > 0) {
    missingData.push(
      `${unknownTrend} movement${unknownTrend === 1 ? '' : 's'} ${unknownTrend === 1 ? 'has' : 'have'} fewer than ${MIN_SESSIONS} sessions in the window, so no trend was called for ${unknownTrend === 1 ? 'it' : 'them'}.`,
    )
  }
  const noRir = movements.filter((m) => m.medianRir === null).length
  if (noRir > 0) {
    missingData.push(
      `Reps in reserve were not logged on ${noRir} movement${noRir === 1 ? '' : 's'}, so effort could not be judged there.`,
    )
  }

  if (!judged.length) {
    return {
      headline: 'Not enough logged yet to judge this',
      detail: interpolate(
        'A verdict needs at least {min} sessions on a movement inside {days} days. Keep logging and this fills in on its own.',
        { min: MIN_SESSIONS, days: windowDays },
      ),
      headlineTemplate: 'Not enough logged yet to judge this',
      detailTemplate:
        'A verdict needs at least {min} sessions on a movement inside {days} days. Keep logging and this fills in on its own.',
      verdictVars: { min: MIN_SESSIONS, days: windowDays },
      status: 'unknown',
      movements,
      gaining,
      stalled,
      leavingReps,
      grinding,
      missingData,
      citationIds,
      windowDays,
    }
  }

  const mostlyGaining = gaining >= Math.ceil(judged.length * RULES.coaching.gainingFraction)
  const effortProblem =
    leavingReps >= Math.ceil(movements.length * RULES.coaching.effortProblemFraction)

  /*
    Headline and detail, as templates for the same reason the note is one:
    a sentence with the numbers already in it cannot be looked up, and this
    is the single line somebody reads if they read nothing else on the screen.
  */
  const headlineTemplate = effortProblem
    ? 'You are leaving reps in the tank on {leavingReps} of {movements} movements'
    : mostlyGaining
      ? 'Progressing on {gaining} of {judged} movements'
      : '{stalled} of {judged} movements have stopped moving'

  const detailTemplate = effortProblem
    ? 'Sets finishing more than {rirMax} reps short of failure do most of the work of a warm-up and little of the work of a hard set. That is the first thing to fix, before adding sets or changing anything else.'
    : mostlyGaining
      ? stalled > 0
        ? stalled === 1
          ? 'The load is moving on most of what you train. 1 movement has stopped, which is normal — the list below says which and what is likely behind it.'
          : 'The load is moving on most of what you train. {stalled} movements have stopped, which is normal — the list below says which and what is likely behind it.'
        : 'The load is moving on everything you are training often enough to judge. This is what working looks like; the job now is to keep doing it.'
      : 'More of what you train is flat than is moving. The list below separates the ones where effort is the cause from the ones where it is not, because they need opposite fixes.'

  const verdictVars = {
    leavingReps,
    movements: movements.length,
    gaining,
    judged: judged.length,
    stalled,
    rirMax: RULES.progression.rirWindow.max,
  }
  const headline = interpolate(headlineTemplate, verdictVars)
  const detail = interpolate(detailTemplate, verdictVars)

  return {
    headline,
    detail,
    headlineTemplate,
    detailTemplate,
    verdictVars,
    status: effortProblem || !mostlyGaining ? 'attention' : 'good',
    movements,
    gaining,
    stalled,
    leavingReps,
    grinding,
    missingData,
    citationIds,
    windowDays,
  }
}

/** Sort key: problems first, then things that are merely flat, then wins. */
function rank(m: MovementVerdict): number {
  if (m.trend === 'slipping') return 0
  if (m.effort === 'leaving_reps') return 1
  if (m.trend === 'holding') return 2
  if (m.effort === 'grinding') return 3
  if (m.trend === 'unknown') return 5
  return 4
}
