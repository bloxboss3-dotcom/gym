import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { computeConsistency, rescheduleMissed } from '@/engine/consistency'
import { addDays, toIsoDate, weekdayOf } from '@/lib/date'
import { checkin, entry, session, set } from '@/test/factories'
import type { Program, Session } from '@/types'

const today = toIsoDate()

/** A program scheduled on the weekdays of the last N days, so tests are stable. */
function programOn(weekdays: number[]): Program {
  return {
    id: 'p',
    name: 'Test',
    description: '',
    createdAt: 0,
    generated: false,
    days: weekdays.map((weekday, i) => ({
      id: `d${i}`,
      name: `Day ${i}`,
      weekday,
      slots: [
        {
          id: `s${i}`,
          exerciseId: 'barbell-bench-press',
          sets: 3,
          repMin: 8,
          repMax: 12,
          restSec: 120,
          targetRIR: 2,
        },
      ],
    })),
  }
}

function trainedOn(dates: string[]): Session[] {
  return dates.map((date) =>
    session({ date, entries: [entry({ exerciseId: 'barbell-bench-press', sets: [set(60, 10, 2)] })] }),
  )
}

describe('consistency score', () => {
  it('is 1 when every planned day was trained', () => {
    const weekdays = [weekdayOf(today), weekdayOf(addDays(today, -3))]
    const program = programOn(weekdays)
    const dates = Array.from({ length: RULES.consistency.windowDays }, (_, i) => addDays(today, -i)).filter((d) =>
      weekdays.includes(weekdayOf(d)),
    )
    const result = computeConsistency({
      sessions: trainedOn(dates),
      runs: [],
      checkins: [],
      deloads: [],
      program,
      daysPerWeek: 2,
      today,
    })
    expect(result.score).toBe(1)
    expect(result.expected).toBe(dates.length)
  })

  it('absorbs a small number of misses with streak protection', () => {
    const weekdays = [weekdayOf(today), weekdayOf(addDays(today, -3))]
    const program = programOn(weekdays)
    const planned = Array.from({ length: RULES.consistency.windowDays }, (_, i) => addDays(today, -i)).filter((d) =>
      weekdays.includes(weekdayOf(d)),
    )
    // Miss one planned day.
    const result = computeConsistency({
      sessions: trainedOn(planned.slice(1)),
      runs: [],
      checkins: [],
      deloads: [],
      program,
      daysPerWeek: 2,
      today,
    })
    expect(result.shieldsUsed).toBe(1)
    expect(result.score).toBe(1)
    expect(result.message).toMatch(/streak protection/i)
  })

  it('does not let one missed day destroy a month of work', () => {
    const weekdays = [1, 3, 5]
    const program = programOn(weekdays)
    const planned = Array.from({ length: RULES.consistency.windowDays }, (_, i) => addDays(today, -i)).filter((d) =>
      weekdays.includes(weekdayOf(d)),
    )
    const result = computeConsistency({
      sessions: trainedOn(planned.slice(1)),
      runs: [],
      checkins: [],
      deloads: [],
      program,
      daysPerWeek: 3,
      today,
    })
    expect(result.score).toBeGreaterThan(0.9)
  })

  it('counts a run as credit for a planned day', () => {
    const weekday = weekdayOf(today)
    const result = computeConsistency({
      sessions: [],
      runs: [
        {
          id: 'r',
          date: today,
          type: 'easy',
          distanceKm: 5,
          durationSec: 1800,
          rpe: 4,
          pain: 0,
          surface: 'road',
          planned: true,
          createdAt: 0,
        },
      ],
      checkins: [],
      deloads: [],
      program: programOn([weekday]),
      daysPerWeek: 1,
      today,
    })
    expect(result.days.find((d) => d.date === today)?.status).toBe('ran')
  })

  it('counts a deload day as successful adherence', () => {
    const weekday = weekdayOf(today)
    const result = computeConsistency({
      sessions: [],
      runs: [],
      checkins: [],
      deloads: [
        { id: 'd', startDate: addDays(today, -3), endDate: today, reason: '', status: 'accepted', createdAt: 0 },
      ],
      program: programOn([weekday]),
      daysPerWeek: 1,
      today,
    })
    const day = result.days.find((d) => d.date === today)
    expect(day?.status).toBe('deload')
    expect(result.credited).toBeGreaterThan(0)
  })

  it('counts a logged rest day as adherence rather than a gap', () => {
    // Program on a weekday that is not today, so today is a rest day.
    const restWeekday = (weekdayOf(today) + 3) % 7
    const result = computeConsistency({
      sessions: [],
      runs: [],
      checkins: [checkin({ date: today })],
      deloads: [],
      program: programOn([restWeekday]),
      daysPerWeek: 1,
      today,
    })
    expect(result.days.find((d) => d.date === today)?.status).toBe('rest')
  })

  it('handles having no program at all', () => {
    const result = computeConsistency({
      sessions: [],
      runs: [],
      checkins: [],
      deloads: [],
      program: null,
      daysPerWeek: 3,
      today,
    })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.days).toHaveLength(RULES.consistency.windowDays)
  })
})

describe('missed session rescheduling', () => {
  it('moves a missed session to the next free day', () => {
    // Program on yesterday's weekday only, nothing logged.
    const missedWeekday = weekdayOf(addDays(today, -1))
    const results = rescheduleMissed({
      sessions: [],
      runs: [],
      checkins: [],
      deloads: [],
      program: programOn([missedWeekday]),
      daysPerWeek: 1,
      today,
    })
    expect(results).toHaveLength(1)
    expect(results[0].newDate).not.toBeNull()
    expect(results[0].reason).toMatch(/moved to the next free day/i)
  })

  it('does not reschedule a session that was completed', () => {
    const missedWeekday = weekdayOf(addDays(today, -1))
    const program = programOn([missedWeekday])
    const results = rescheduleMissed({
      sessions: [
        session({
          date: addDays(today, -1),
          programDayId: program.days[0].id,
          entries: [entry({ exerciseId: 'barbell-bench-press', sets: [set(60, 10, 2)] })],
        }),
      ],
      runs: [],
      checkins: [],
      deloads: [],
      program,
      daysPerWeek: 1,
      today,
    })
    expect(results).toHaveLength(0)
  })

  it('drops rather than stacks when there is no free slot', () => {
    // Every weekday is a training day, so nothing is free.
    const results = rescheduleMissed({
      sessions: [],
      runs: [],
      checkins: [],
      deloads: [],
      program: programOn([0, 1, 2, 3, 4, 5, 6]),
      daysPerWeek: 7,
      today,
      lookBackDays: 1,
    })
    expect(results[0].newDate).toBeNull()
    expect(results[0].reason).toMatch(/let it go|dropped session/i)
  })

  it('returns nothing when there is no program', () => {
    expect(
      rescheduleMissed({
        sessions: [],
        runs: [],
        checkins: [],
        deloads: [],
        program: null,
        daysPerWeek: 3,
        today,
      }),
    ).toHaveLength(0)
  })
})

describe('account age', () => {
  it('does not count days before the account existed as missed', () => {
    const weekdays = [0, 1, 2, 3, 4, 5, 6]
    const result = computeConsistency({
      sessions: [],
      runs: [],
      checkins: [],
      deloads: [],
      program: programOn(weekdays),
      daysPerWeek: 7,
      today,
      // Signed up today.
      sinceDate: today,
    })
    expect(result.expected).toBe(1)
    expect(result.days).toHaveLength(1)
    expect(result.message).not.toMatch(/planned days missed/)
  })

  it('does not resurrect sessions from before the account existed', () => {
    const missedWeekday = weekdayOf(addDays(today, -1))
    const results = rescheduleMissed({
      sessions: [],
      runs: [],
      checkins: [],
      deloads: [],
      program: programOn([missedWeekday]),
      daysPerWeek: 1,
      today,
      sinceDate: today,
    })
    expect(results).toHaveLength(0)
  })
})
