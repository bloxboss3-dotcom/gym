import { RULES } from '@/config/rules'
import type { Checkin, DeloadRecord, IsoDate, Program, RunLog, Session } from '@/types'
import { addDays, daysBetween, lastNDays, toIsoDate, weekdayOf } from '@/lib/date'

/**
 * Consistency, not a fragile streak.
 *
 * A single missed day must never delete weeks of work. FORGED tracks a rolling
 * consistency score over a 28-day window and backs it with a small number of
 * "shields" that silently absorb a missed planned day. Prescribed rest days and
 * deload days count as successful adherence, because they are part of the plan.
 */

export type DayStatus = 'trained' | 'ran' | 'rest' | 'deload' | 'missed' | 'future' | 'untracked'

export interface DayRecord {
  date: IsoDate
  status: DayStatus
  planned: boolean
}

export interface ConsistencyResult {
  /** 0–1 over the rolling window. */
  score: number
  /** Days credited / days that expected something. */
  credited: number
  expected: number
  streakDays: number
  bestStreakDays: number
  shieldsRemaining: number
  shieldsUsed: number
  days: DayRecord[]
  message: string
  messageTemplate: string
  messageVars: Record<string, string | number>
}

export interface ConsistencyInput {
  sessions: Session[]
  runs: RunLog[]
  checkins: Checkin[]
  deloads: DeloadRecord[]
  program: Program | null
  /** Days per week the user committed to in onboarding. */
  daysPerWeek: number
  today?: IsoDate
  windowDays?: number
  bestStreakDays?: number
  /**
   * The day the account started. Nothing before this counts as a missed day —
   * a new user has not "missed" the three weeks before they installed the app.
   */
  sinceDate?: IsoDate | null
}

function plannedWeekdays(program: Program | null, daysPerWeek: number): Set<number> {
  const set = new Set<number>()
  if (program) {
    for (const day of program.days) if (day.weekday !== null) set.add(day.weekday)
  }
  if (!set.size) {
    // Fall back to an even spread across the week (Mon/Wed/Fri style).
    const spread = [1, 3, 5, 2, 4, 6, 0]
    for (let i = 0; i < Math.min(daysPerWeek, 7); i++) set.add(spread[i])
  }
  return set
}

export function computeConsistency(input: ConsistencyInput): ConsistencyResult {
  const today = input.today ?? toIsoDate()
  const windowDays = input.windowDays ?? RULES.consistency.windowDays
  const planned = plannedWeekdays(input.program, input.daysPerWeek)

  const sessionDates = new Set(
    input.sessions.filter((s) => s.status === 'completed').map((s) => s.date),
  )
  const runDates = new Set(input.runs.map((r) => r.date))
  const checkinDates = new Set(input.checkins.map((c) => c.date))
  const deloadDates = new Set<IsoDate>()
  for (const d of input.deloads) {
    if (d.status !== 'accepted' && d.status !== 'completed') continue
    const end = d.endDate ?? addDays(d.startDate, 6)
    for (let cursor = d.startDate; daysBetween(cursor, end) >= 0; cursor = addDays(cursor, 1)) {
      deloadDates.add(cursor)
    }
  }

  const since = input.sinceDate ?? null
  const dates = lastNDays(windowDays, today).filter((date) => !since || date >= since)
  const days: DayRecord[] = dates.map((date) => {
    const weekday = weekdayOf(date)
    const isPlanned = planned.has(weekday)
    if (deloadDates.has(date)) return { date, status: 'deload', planned: isPlanned }
    if (sessionDates.has(date)) return { date, status: 'trained', planned: isPlanned }
    if (runDates.has(date)) return { date, status: 'ran', planned: isPlanned }
    if (!isPlanned) {
      // A non-training day is a rest day. It counts as adherence when the user
      // checked in, and is simply untracked otherwise — never a failure.
      return {
        date,
        status: RULES.consistency.restCountsAsAdherence && checkinDates.has(date) ? 'rest' : 'untracked',
        planned: false,
      }
    }
    return { date, status: 'missed', planned: true }
  })

  const expectedDays = days.filter((d) => d.planned)
  const creditedDays = expectedDays.filter(
    (d) => d.status === 'trained' || d.status === 'ran' || d.status === 'deload',
  )
  const missed = expectedDays.filter((d) => d.status === 'missed')

  // Shields refill over time and quietly cover recent misses.
  const refilled = Math.min(
    RULES.consistency.maxShields,
    Math.floor(windowDays / RULES.consistency.shieldRefillDays) + 1,
  )
  const shieldsUsed = Math.min(refilled, missed.length)
  const shieldsRemaining = Math.max(0, refilled - shieldsUsed)

  const effectiveCredited = creditedDays.length + shieldsUsed
  const score = expectedDays.length
    ? Math.min(1, effectiveCredited / expectedDays.length)
    : creditedDays.length > 0
      ? 1
      : 0

  // Streak = consecutive days back from today that were not a missed planned day.
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    if (d.status === 'missed') break
    if (d.status === 'trained' || d.status === 'ran' || d.status === 'deload' || d.status === 'rest') {
      streak++
    } else if (d.planned) {
      break
    } else {
      streak++
    }
  }

  const message = missed.length
    ? shieldsUsed >= missed.length
      ? `You missed ${missed.length} planned day${missed.length === 1 ? '' : 's'} — streak protection covered ${shieldsUsed === 1 ? 'it' : 'them'}. Nothing lost.`
      : `${missed.length} planned days missed in the last ${days.length}. ${shieldsUsed} covered by streak protection. Consistency is a rolling average, so a good week pulls it straight back up.`
    : expectedDays.length === 0
      ? 'No planned training days yet. Your consistency score starts building with your first scheduled session.'
      : `Every planned day in the last ${days.length} accounted for. This is the part that actually drives progress.`
  const messageTemplate = missed.length
    ? shieldsUsed >= missed.length
      ? missed.length === 1
        ? 'You missed 1 planned day — streak protection covered it. Nothing lost.'
        : 'You missed {missed} planned days — streak protection covered them. Nothing lost.'
      : '{missed} planned days missed in the last {days}. {shields} covered by streak protection. Consistency is a rolling average, so a good week pulls it straight back up.'
    : expectedDays.length === 0
      ? 'No planned training days yet. Your consistency score starts building with your first scheduled session.'
      : 'Every planned day in the last {days} accounted for. This is the part that actually drives progress.'
  const messageVars: Record<string, string | number> = {
    missed: missed.length,
    days: days.length,
    shields: shieldsUsed,
  }

  return {
    score: Number(score.toFixed(3)),
    credited: creditedDays.length,
    expected: expectedDays.length,
    streakDays: streak,
    bestStreakDays: Math.max(input.bestStreakDays ?? 0, streak),
    shieldsRemaining,
    messageTemplate,
    messageVars,
    shieldsUsed,
    days,
    message,
  }
}

/**
 * Missed-session rescheduling.
 *
 * A missed planned session gets pushed to the next free day within a few days.
 * If it cannot fit, it is dropped rather than stacked — doubling up a missed
 * week is how people get hurt.
 */
export interface RescheduleResult {
  programDayId: string
  originalDate: IsoDate
  newDate: IsoDate | null
  reason: string
}

export function rescheduleMissed(
  input: ConsistencyInput & { lookBackDays?: number },
): RescheduleResult[] {
  const today = input.today ?? toIsoDate()
  const program = input.program
  if (!program) return []
  const lookBack = input.lookBackDays ?? 7
  const sessionsByDate = new Map<IsoDate, Session[]>()
  for (const s of input.sessions) {
    const list = sessionsByDate.get(s.date) ?? []
    list.push(s)
    sessionsByDate.set(s.date, list)
  }

  const results: RescheduleResult[] = []
  const claimedDates = new Set<IsoDate>()

  for (let i = lookBack; i >= 1; i--) {
    const date = addDays(today, -i)
    // Never resurrect a "missed" session from before the account existed.
    if (input.sinceDate && date < input.sinceDate) continue
    const weekday = weekdayOf(date)
    const day = program.days.find((d) => d.weekday === weekday)
    if (!day) continue
    const done = (sessionsByDate.get(date) ?? []).some(
      (s) => s.programDayId === day.id && s.status === 'completed',
    )
    if (done) continue

    let newDate: IsoDate | null = null
    for (let offset = 0; offset <= RULES.consistency.rescheduleWithinDays; offset++) {
      const candidate = addDays(today, offset)
      const candidateWeekday = weekdayOf(candidate)
      const candidateHasPlan = program.days.some((d) => d.weekday === candidateWeekday)
      const candidateBusy = (sessionsByDate.get(candidate) ?? []).some((s) => s.status === 'completed')
      if (!candidateHasPlan && !candidateBusy && !claimedDates.has(candidate)) {
        newDate = candidate
        claimedDates.add(candidate)
        break
      }
    }

    results.push({
      programDayId: day.id,
      originalDate: date,
      newDate,
      reason: newDate
        ? `${day.name} was missed. Moved to the next free day rather than stacking it on top of another session.`
        : `${day.name} was missed and there is no free slot in the next ${RULES.consistency.rescheduleWithinDays} days. Let it go — a dropped session costs far less than a doubled-up week.`,
    })
  }

  return results
}
