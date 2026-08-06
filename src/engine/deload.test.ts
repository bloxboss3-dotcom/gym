import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { activeDeload, assessDeload } from '@/engine/deload'
import { addDays, toIsoDate } from '@/lib/date'
import { checkin, daysAgo, entry, session, set } from '@/test/factories'
import type { Checkin, DeloadRecord, Session } from '@/types'

const today = toIsoDate()

/** N weeks of two-plus sessions a week with no back-off. */
function hardBlock(weeks: number): Session[] {
  const sessions: Session[] = []
  for (let w = 0; w < weeks; w++) {
    for (const dayOffset of [0, 3]) {
      sessions.push(
        session({
          date: addDays(today, -(w * 7 + dayOffset)),
          entries: [
            entry({
              exerciseId: 'bench',
              targetRIR: 2,
              sets: [set(60, 10, 2), set(60, 10, 2), set(60, 9, 2)],
            }),
          ],
        }),
      )
    }
  }
  return sessions
}

function fatiguedCheckins(days: number): Checkin[] {
  return Array.from({ length: days }, (_, i) =>
    checkin({ date: daysAgo(i), soreness: 4, readiness: 2, jointPain: 4 }),
  )
}

describe('deload detection', () => {
  it('stays quiet when nothing is wrong', () => {
    const result = assessDeload({
      sessions: hardBlock(2),
      checkins: Array.from({ length: 6 }, (_, i) => checkin({ date: daysAgo(i) })),
      deloads: [],
      today,
    })
    expect(result.suggested).toBe(false)
    expect(result.triggeredCount).toBeLessThan(RULES.deload.triggerCount)
  })

  it('fires when enough independent fatigue signals stack up', () => {
    const result = assessDeload({
      sessions: hardBlock(RULES.deload.weeksBeforeDeload + 1),
      checkins: fatiguedCheckins(8),
      deloads: [],
      today,
    })
    expect(result.triggeredCount).toBeGreaterThanOrEqual(RULES.deload.triggerCount)
    expect(result.suggested).toBe(true)
    expect(result.signals.find((s) => s.key === 'soreness')?.triggered).toBe(true)
    expect(result.signals.find((s) => s.key === 'readiness')?.triggered).toBe(true)
    expect(result.signals.find((s) => s.key === 'joint_pain')?.triggered).toBe(true)
    expect(result.signals.find((s) => s.key === 'accumulated_weeks')?.triggered).toBe(true)
  })

  it('detects sessions that ran much harder than prescribed', () => {
    const grinders = Array.from({ length: 4 }, (_, i) =>
      session({
        date: daysAgo(i * 2),
        entries: [
          entry({
            exerciseId: 'squat',
            targetRIR: 3,
            sets: [set(100, 8, 0), set(100, 7, 0), set(100, 6, 0)],
          }),
        ],
      }),
    )
    const result = assessDeload({ sessions: grinders, checkins: [], deloads: [], today })
    expect(result.signals.find((s) => s.key === 'hard_sessions')?.triggered).toBe(true)
  })

  it('reports low confidence and names the gap when there are no check-ins', () => {
    const result = assessDeload({ sessions: hardBlock(2), checkins: [], deloads: [], today })
    expect(result.confidence).toBe('low')
    expect(result.missingData.join(' ')).toMatch(/check-ins/i)
  })

  it('honours the cooldown so it does not nag after a recent deload', () => {
    const recent: DeloadRecord = {
      id: 'd1',
      startDate: daysAgo(3),
      endDate: null,
      reason: 'test',
      status: 'accepted',
      createdAt: 0,
    }
    const result = assessDeload({
      sessions: hardBlock(RULES.deload.weeksBeforeDeload + 1),
      checkins: fatiguedCheckins(8),
      deloads: [recent],
      today,
    })
    expect(result.suggested).toBe(false)
    expect(result.reason).toMatch(/cooldown|holding off/i)
  })

  it('describes a plan that cuts both load and volume', () => {
    const result = assessDeload({ sessions: hardBlock(2), checkins: [], deloads: [], today })
    expect(result.plan.loadReductionPct).toBe(RULES.deload.loadReductionPct)
    expect(result.plan.volumeReductionPct).toBe(RULES.deload.volumeReductionPct)
    expect(result.plan.description).toMatch(/sets/i)
    expect(result.plan.description).toMatch(/load/i)
  })

  it('cites its evidence', () => {
    const result = assessDeload({ sessions: [], checkins: [], deloads: [], today })
    expect(result.citationIds).toContain('bell-2020-overreaching')
  })
})

describe('active deload window', () => {
  it('finds an accepted deload that has started and not ended', () => {
    const record: DeloadRecord = {
      id: 'd',
      startDate: daysAgo(2),
      endDate: addDays(today, 3),
      reason: 'test',
      status: 'accepted',
      createdAt: 0,
    }
    expect(activeDeload([record], today)?.id).toBe('d')
  })

  it('ignores declined and completed deloads', () => {
    const declined: DeloadRecord = {
      id: 'x',
      startDate: daysAgo(1),
      endDate: null,
      reason: 'test',
      status: 'declined',
      createdAt: 0,
    }
    expect(activeDeload([declined], today)).toBeNull()
    expect(activeDeload([{ ...declined, status: 'completed' }], today)).toBeNull()
  })

  it('ignores a deload that has not started yet', () => {
    const future: DeloadRecord = {
      id: 'f',
      startDate: addDays(today, 2),
      endDate: null,
      reason: 'test',
      status: 'accepted',
      createdAt: 0,
    }
    expect(activeDeload([future], today)).toBeNull()
  })
})
