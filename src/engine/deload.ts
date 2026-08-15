import { RULES } from '@/config/rules'
import type { Checkin, DeloadRecord, IsoDate, Session } from '@/types'
import { addDays, daysBetween, toIsoDate, weekKey } from '@/lib/date'
import { analyseSession, historyFor } from '@/engine/progression'
import type { Confidence } from '@/engine/progression'

/**
 * Deload detection.
 *
 * A deload is a planned reduction in load and/or volume, and it is *productive
 * training* — FORGED counts a completed deload as successful adherence and pays
 * it out like any other completed session. Nothing here is a diagnosis: there is
 * no validated consumer test for accumulated fatigue, so this is a prompt to
 * reflect, backed by the signals it actually saw.
 */

export interface DeloadSignal {
  key:
    | 'broad_decline'
    | 'soreness'
    | 'readiness'
    | 'joint_pain'
    | 'hard_sessions'
    | 'accumulated_weeks'
  label: string
  triggered: boolean
  detail: string
}

export interface DeloadAssessment {
  suggested: boolean
  triggeredCount: number
  signals: DeloadSignal[]
  reason: string
  reasonTemplate: string
  reasonVars: Record<string, string | number>
  rule: string
  confidence: Confidence
  missingData: string[]
  plan: {
    loadReductionPct: number
    volumeReductionPct: number
    description: string
    descriptionTemplate: string
    descriptionVars: Record<string, string | number>
  }
  citationIds: string[]
}

export interface DeloadInput {
  sessions: Session[]
  checkins: Checkin[]
  deloads: DeloadRecord[]
  today?: IsoDate
}

function meanOf(values: number[]): number | null {
  if (!values.length) return null
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
}

/** Exercises whose most recent session regressed against the one before it. */
function broadDecline(sessions: Session[], windowDays: number, today: IsoDate) {
  const recent = sessions.filter(
    (s) => s.status === 'completed' && daysBetween(s.date, today) >= 0 && daysBetween(s.date, today) < windowDays,
  )
  const exerciseIds = [...new Set(recent.flatMap((s) => s.entries.map((e) => e.exerciseId)))]
  let tracked = 0
  let declining = 0
  for (const id of exerciseIds) {
    const history = historyFor(sessions, id, 3)
    if (history.length < 2) continue
    tracked++
    const current = analyseSession(history[0]).bestE1RM
    const previous = analyseSession(history[1]).bestE1RM
    if (previous > 0 && current < previous * (1 - RULES.plateau.meaningfulGainPct)) declining++
  }
  return { tracked, declining, fraction: tracked ? declining / tracked : 0 }
}

/** Sessions where the logged effort was well beyond what was prescribed. */
function harderThanPrescribed(sessions: Session[], windowDays: number, today: IsoDate): number {
  return sessions.filter((s) => {
    if (s.status !== 'completed') return false
    const age = daysBetween(s.date, today)
    if (age < 0 || age >= windowDays) return false
    return s.entries.some((entry) => {
      const rated = entry.sets.filter((set) => !set.warmup && set.rir !== null)
      if (!rated.length) return false
      const avg = rated.reduce((sum, set) => sum + (set.rir as number), 0) / rated.length
      return avg < entry.targetRIR - 1
    })
  }).length
}

/** Consecutive weeks with at least two completed sessions and no deload. */
function consecutiveHardWeeks(sessions: Session[], deloads: DeloadRecord[], today: IsoDate): number {
  const completedWeeks = new Set(
    sessions.filter((s) => s.status === 'completed').map((s) => weekKey(s.date)),
  )
  const deloadWeeks = new Set(
    deloads
      .filter((d) => d.status === 'completed' || d.status === 'accepted')
      .map((d) => weekKey(d.startDate)),
  )
  let weeks = 0
  let cursor = weekKey(today)
  for (let i = 0; i < 26; i++) {
    if (deloadWeeks.has(cursor)) break
    const sessionsThisWeek = sessions.filter(
      (s) => s.status === 'completed' && weekKey(s.date) === cursor,
    ).length
    if (sessionsThisWeek < 2) {
      // The current, partially-finished week should not break the streak.
      if (i === 0 && completedWeeks.has(cursor)) {
        cursor = addDays(cursor, -7)
        continue
      }
      break
    }
    weeks++
    cursor = addDays(cursor, -7)
  }
  return weeks
}

export function assessDeload(input: DeloadInput): DeloadAssessment {
  const today = input.today ?? toIsoDate()
  const window = RULES.deload.windowDays
  const recentCheckins = input.checkins.filter((c) => {
    const age = daysBetween(c.date, today)
    return age >= 0 && age < window
  })

  const decline = broadDecline(input.sessions, window, today)
  const soreness = meanOf(recentCheckins.map((c) => c.soreness))
  const readiness = meanOf(recentCheckins.map((c) => c.readiness))
  const jointPain = meanOf(recentCheckins.map((c) => c.jointPain))
  const hardSessions = harderThanPrescribed(input.sessions, window, today)
  const hardWeeks = consecutiveHardWeeks(input.sessions, input.deloads, today)

  const signals: DeloadSignal[] = [
    {
      key: 'broad_decline',
      label: 'Broad performance decline',
      triggered: decline.tracked >= 3 && decline.fraction >= RULES.deload.broadDeclineFraction,
      detail:
        decline.tracked < 3
          ? 'Not enough repeated exercises in the last 10 days to judge.'
          : `${decline.declining} of ${decline.tracked} tracked lifts went backwards.`,
    },
    {
      key: 'soreness',
      label: 'Elevated soreness',
      triggered: soreness !== null && soreness >= RULES.deload.sorenessThreshold,
      detail:
        soreness === null
          ? 'No check-ins logged recently.'
          : `Average soreness ${soreness}/5 (flag at ${RULES.deload.sorenessThreshold}).`,
    },
    {
      key: 'readiness',
      label: 'Low readiness',
      triggered: readiness !== null && readiness <= RULES.deload.readinessThreshold,
      detail:
        readiness === null
          ? 'No check-ins logged recently.'
          : `Average readiness ${readiness}/5 (flag at ${RULES.deload.readinessThreshold}).`,
    },
    {
      key: 'joint_pain',
      label: 'Persistent joint discomfort',
      triggered: jointPain !== null && jointPain >= RULES.deload.jointPainThreshold,
      detail:
        jointPain === null
          ? 'No check-ins logged recently.'
          : `Average joint pain ${jointPain}/10 (flag at ${RULES.deload.jointPainThreshold}).`,
    },
    {
      key: 'hard_sessions',
      label: 'Sessions harder than prescribed',
      triggered: hardSessions >= RULES.deload.hardSessionsThreshold,
      detail: `${hardSessions} session${hardSessions === 1 ? '' : 's'} in the last ${window} days ran well past the target effort.`,
    },
    {
      key: 'accumulated_weeks',
      label: 'Weeks of accumulated hard training',
      triggered: hardWeeks >= RULES.deload.weeksBeforeDeload,
      detail: `${hardWeeks} consecutive week${hardWeeks === 1 ? '' : 's'} of training without a planned back-off (flag at ${RULES.deload.weeksBeforeDeload}).`,
    },
  ]

  const triggeredCount = signals.filter((s) => s.triggered).length

  // Don't nag: honour the cooldown after any recent suggestion.
  const lastSuggestion = [...input.deloads]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .find((d) => d.status !== 'declined')
  const cooledDown =
    !lastSuggestion || daysBetween(lastSuggestion.startDate, today) >= RULES.deload.cooldownDays

  const missingData: string[] = []
  if (!recentCheckins.length) {
    missingData.push('No readiness check-ins in the last 10 days — soreness, readiness and joint pain are unknown.')
  }
  if (decline.tracked < 3) {
    missingData.push('Fewer than 3 repeated exercises to compare, so the performance signal is weak.')
  }

  const confidence: Confidence =
    recentCheckins.length >= 4 && decline.tracked >= 3
      ? 'high'
      : recentCheckins.length >= 2 || decline.tracked >= 2
        ? 'medium'
        : 'low'

  const suggested = triggeredCount >= RULES.deload.triggerCount && cooledDown

  const firing = signals.filter((s) => s.triggered).map((s) => s.label.toLowerCase())

  return {
    suggested,
    triggeredCount,
    signals,
    reason: suggested
      ? `${triggeredCount} fatigue signals are firing at once: ${firing.join(', ')}. That pattern usually means accumulated fatigue is masking your actual fitness. A week at roughly ${Math.round((1 - RULES.deload.loadReductionPct) * 100)}% of your usual load and ${Math.round((1 - RULES.deload.volumeReductionPct) * 100)}% of your usual sets normally brings performance back up rather than down.`
      : cooledDown
        ? `${triggeredCount} of ${RULES.deload.triggerCount} deload signals are currently firing. Keep training as planned and keep checking in — FORGED will flag it if the pattern builds.`
        : `You backed off recently, so FORGED is holding off on another deload suggestion for now (${RULES.deload.cooldownDays}-day cooldown).`,
    // The same sentence with its numbers pulled out, so it can be translated.
    reasonTemplate: suggested
      ? '{count} fatigue signals are firing at once: {signals}. That pattern usually means accumulated fatigue is masking your actual fitness. A week at roughly {load}% of your usual load and {volume}% of your usual sets normally brings performance back up rather than down.'
      : cooledDown
        ? '{count} of {needed} deload signals are currently firing. Keep training as planned and keep checking in — FORGED will flag it if the pattern builds.'
        : 'You backed off recently, so FORGED is holding off on another deload suggestion for now ({days}-day cooldown).',
    reasonVars: suggested
      ? {
          count: triggeredCount,
          signals: firing.join(', '),
          load: Math.round((1 - RULES.deload.loadReductionPct) * 100),
          volume: Math.round((1 - RULES.deload.volumeReductionPct) * 100),
        }
      : cooledDown
        ? { count: triggeredCount, needed: RULES.deload.triggerCount }
        : { days: RULES.deload.cooldownDays },
    rule: `${RULES.deload.triggerCount}+ of 6 fatigue signals inside a ${window}-day window → suggest a deload (rules.deload).`,
    confidence,
    missingData,
    plan: {
      loadReductionPct: RULES.deload.loadReductionPct,
      volumeReductionPct: RULES.deload.volumeReductionPct,
      description: `Keep the same movements. Cut working sets by about ${Math.round(RULES.deload.volumeReductionPct * 100)}% and load by about ${Math.round(RULES.deload.loadReductionPct * 100)}%, and stop every set well short of failure (4+ reps in reserve). Keep easy running, keep protein where it is, and sleep as much as you can.`,
      descriptionTemplate:
        'Keep the same movements. Cut working sets by about {volume}% and load by about {load}%, and stop every set well short of failure (4+ reps in reserve). Keep easy running, keep protein where it is, and sleep as much as you can.',
      descriptionVars: {
        volume: Math.round(RULES.deload.volumeReductionPct * 100),
        load: Math.round(RULES.deload.loadReductionPct * 100),
      },
    },
    citationIds: ['bell-2020-overreaching', 'acsm-2011-quantity'],
  }
}

export function activeDeload(deloads: DeloadRecord[], today: IsoDate = toIsoDate()): DeloadRecord | null {
  return (
    deloads.find(
      (d) =>
        d.status === 'accepted' &&
        daysBetween(d.startDate, today) >= 0 &&
        (!d.endDate || daysBetween(today, d.endDate) >= 0),
    ) ?? null
  )
}
