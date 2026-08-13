import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { ECONOMY } from '@/config/economy'
import { CITATION_BY_ID } from '@/data/citations'
import { EXERCISE_BY_ID } from '@/data/exercises'
import {
  auditHypertrophy,
  collectAuditInput,
  loadsLongLengths,
  primaryMuscle,
  BLOCK_EXPLANATION,
  suggestFinisher,
  type FinisherContext,
} from '@/engine/intensity'
import type { Exercise, LoggedSet, Session, SessionEntry } from '@/types'

function set(weightKg: number, reps: number, rir: number | null = 1, warmup = false): LoggedSet {
  return { id: `s${weightKg}-${reps}-${Math.random()}`, weightKg, reps, rir, warmup, completedAt: 0 }
}

function entryFor(exercise: Exercise, sets: LoggedSet[], overrides: Partial<SessionEntry> = {}): SessionEntry {
  return {
    id: 'e1',
    exerciseId: exercise.id,
    plannedSets: 3,
    repMin: 8,
    repMax: 12,
    targetRIR: 2,
    restSec: 120,
    incrementKg: exercise.incrementKg,
    sets,
    pain: 0,
    technique: 'clean',
    ...overrides,
  }
}

/** A machine movement, short on volume, everything else nominal. */
function context(overrides: Partial<FinisherContext> = {}): FinisherContext {
  const exercise = EXERCISE_BY_ID['triceps-pushdown']
  return {
    goal: 'hypertrophy',
    exercise,
    entry: entryFor(exercise, [set(30, 12), set(30, 11), set(30, 10)]),
    weeklySets: 4,
    weeklyRange: { min: 8, max: 14 },
    finishersUsedThisSession: 0,
    deloadActive: false,
    units: 'kg',
    ...overrides,
  }
}

describe('intensity finishers', () => {
  it('offers a technique when weekly volume for the muscle is short', () => {
    const { technique, blockedBy } = suggestFinisher(context())
    expect(blockedBy).toBeNull()
    expect(technique).not.toBeNull()
    expect(technique!.headline.length).toBeGreaterThan(0)
    expect(technique!.steps.length).toBeGreaterThan(1)
  })

  it('refuses when volume is already inside the range, and says so', () => {
    // The whole justification is "you are short on sets". Take that away and
    // the honest answer is no — a finisher is not free growth.
    const { technique, blockedBy } = suggestFinisher(context({ weeklySets: 12 }))
    expect(technique).toBeNull()
    expect(blockedBy).toBe('volume_not_short')
  })

  it('never offers one on a loaded spine, however short the volume', () => {
    for (const id of ['back-squat', 'romanian-deadlift', 'conventional-deadlift']) {
      const exercise = EXERCISE_BY_ID[id]
      if (!exercise) continue
      const { technique, blockedBy } = suggestFinisher(
        context({
          exercise,
          entry: entryFor(exercise, [set(100, 10), set(100, 10), set(100, 10)]),
          weeklySets: 0,
        }),
      )
      expect(technique, `${id} must not get a finisher`).toBeNull()
      expect(blockedBy).toBe('unsafe_movement')
    }
  })

  it('never offers one on a barbell you have to escape from', () => {
    const exercise = EXERCISE_BY_ID['barbell-bench-press']
    const { technique, blockedBy } = suggestFinisher(
      context({ exercise, entry: entryFor(exercise, [set(80, 10), set(80, 10), set(80, 10)]), weeklySets: 0 }),
    )
    expect(technique).toBeNull()
    expect(blockedBy).toBe('unsafe_movement')
  })

  it('blocks on reported pain at the configured threshold', () => {
    const ctx = context()
    const { blockedBy } = suggestFinisher({
      ...ctx,
      entry: { ...ctx.entry, pain: RULES.intensity.painBlock },
    })
    expect(blockedBy).toBe('pain')
  })

  it('allows it just below the pain threshold', () => {
    const ctx = context()
    const { technique } = suggestFinisher({
      ...ctx,
      entry: { ...ctx.entry, pain: RULES.intensity.painBlock - 1 },
    })
    expect(technique).not.toBeNull()
  })

  it('does not undermine a deload', () => {
    expect(suggestFinisher(context({ deloadActive: true })).blockedBy).toBe('deload')
  })

  it('caps how many one session can carry', () => {
    expect(
      suggestFinisher(context({ finishersUsedThisSession: RULES.intensity.maxPerSession })).blockedBy,
    ).toBe('session_budget')
    expect(
      suggestFinisher(context({ finishersUsedThisSession: RULES.intensity.maxPerSession - 1 })).technique,
    ).not.toBeNull()
  })

  it('waits until the planned sets are actually done', () => {
    const exercise = EXERCISE_BY_ID['triceps-pushdown']
    expect(
      suggestFinisher(context({ entry: entryFor(exercise, [set(30, 12), set(30, 11)]) })).blockedBy,
    ).toBe('sets_incomplete')
  })

  it('does not count warm-ups toward the planned sets', () => {
    const exercise = EXERCISE_BY_ID['triceps-pushdown']
    const sets = [set(10, 12, 4, true), set(30, 12), set(30, 11)]
    expect(suggestFinisher(context({ entry: entryFor(exercise, sets) })).blockedBy).toBe('sets_incomplete')
  })

  it('only fires for muscle-building goals', () => {
    expect(suggestFinisher(context({ goal: 'fatloss' })).blockedBy).toBe('goal')
    expect(suggestFinisher(context({ goal: 'strength' })).blockedBy).toBe('goal')
    for (const goal of RULES.intensity.goals) {
      expect(suggestFinisher(context({ goal })).technique, goal).not.toBeNull()
    }
  })

  it('says nothing rather than guessing when weekly volume is unknown', () => {
    expect(suggestFinisher(context({ weeklySets: null })).blockedBy).toBe('unknown_volume')
    expect(suggestFinisher(context({ weeklyRange: null })).blockedBy).toBe('unknown_volume')
  })

  it('picks the drop set on a pin-loaded stack, where changing the load is free', () => {
    const exercise = EXERCISE_BY_ID['triceps-pushdown']
    expect(exercise.loading).toBe('stack')
    const { technique } = suggestFinisher(context({ exercise }))
    expect(technique!.kind).toBe('drop_set')
  })

  it('states a drop target that is genuinely lighter and lands on a real setting', () => {
    const exercise = EXERCISE_BY_ID['leg-extension']
    const { technique } = suggestFinisher(
      context({ exercise, entry: entryFor(exercise, [set(40, 12), set(40, 11), set(40, 10)]) }),
    )
    expect(technique!.kind).toBe('drop_set')
    const number = Number(technique!.headline.match(/([\d.]+)\s*kg/)?.[1])
    expect(number).toBeGreaterThan(0)
    expect(number).toBeLessThan(40)
    // On the increment, not a number no machine can actually be set to.
    expect(Math.abs(number / exercise.incrementKg - Math.round(number / exercise.incrementKg))).toBeLessThan(1e-6)
  })

  it('drops to a weight a pound gym actually stocks', () => {
    // The fifth appearance of this bug class in this app: a kilogram constant
    // converted literally into pounds. A 2.5 kg step becomes 5.512 lb, and
    // rounding a drop target on it lands on 33.1 lb — a setting no pin-loaded
    // stack has ever had. The entry carries the unit-native step; use it.
    const exercise = EXERCISE_BY_ID['machine-lateral-raise']
    const fiveLbInKg = 5 * 0.45359237
    const fortyFiveLbInKg = 45 * 0.45359237
    const { technique } = suggestFinisher(
      context({
        exercise,
        units: 'lb',
        entry: entryFor(
          exercise,
          [
            set(fortyFiveLbInKg, 12),
            set(fortyFiveLbInKg, 11),
            set(fortyFiveLbInKg, 10),
          ],
          { incrementKg: fiveLbInKg },
        ),
      }),
    )
    expect(technique!.kind).toBe('drop_set')
    const shown = Number(technique!.headline.match(/([\d.]+)\s*lb/)?.[1])
    expect(shown % 5, `${shown} lb is not a real stack setting`).toBe(0)
    expect(shown).toBeLessThan(45)
    expect(shown).toBeGreaterThan(0)
  })

  it('picks stretched-position partials on free weights, where nothing has to be changed', () => {
    const exercise = EXERCISE_BY_ID['lateral-raise']
    expect(exercise.loading).toBe('dumbbell_pair')
    const { technique } = suggestFinisher(
      context({ exercise, entry: entryFor(exercise, [set(10, 15), set(10, 13), set(10, 12)]) }),
    )
    expect(technique!.kind).toBe('long_length_partials')
  })

  it('falls back to rest-pause when neither of the others fits', () => {
    const exercise = EXERCISE_BY_ID['dumbbell-shoulder-press']
    const { technique } = suggestFinisher(
      context({ exercise, entry: entryFor(exercise, [set(20, 12), set(20, 10), set(20, 9)]) }),
    )
    expect(technique!.kind).toBe('rest_pause')
  })

  it('is honest in writing that these are efficient rather than superior', () => {
    // The sales pitch for drop sets is the thing to guard against. If this
    // sentence ever disappears, the app is overselling the technique.
    for (const id of ['triceps-pushdown', 'dumbbell-shoulder-press']) {
      const exercise = EXERCISE_BY_ID[id]
      const { technique } = suggestFinisher(
        context({ exercise, entry: entryFor(exercise, [set(30, 12), set(30, 11), set(30, 10)]) }),
      )
      expect(technique!.reason.toLowerCase(), id).toMatch(
        /not a bigger stimulus|time-efficient|rather than superior/,
      )
    }
  })

  it('carries the full recommendation contract', () => {
    const { technique } = suggestFinisher(context())
    expect(technique!.rule).toMatch(/^intensity\./)
    expect(technique!.citationIds.length).toBeGreaterThan(0)
    for (const id of technique!.citationIds) {
      expect(CITATION_BY_ID[id], `unknown citation ${id}`).toBeDefined()
    }
    expect(['low', 'medium', 'high']).toContain(technique!.confidence)
    expect(Array.isArray(technique!.missingData)).toBe(true)
    expect(technique!.countsAsSets).toBeGreaterThan(0)
    expect(technique!.countsAsSets).toBeLessThan(1)
  })

  it('lowers confidence and names the gap when effort was not logged', () => {
    const exercise = EXERCISE_BY_ID['triceps-pushdown']
    const withRir = suggestFinisher(context()).technique!
    const withoutRir = suggestFinisher(
      context({ entry: entryFor(exercise, [set(30, 12, null), set(30, 11, null), set(30, 10, null)]) }),
    ).technique!
    expect(withRir.confidence).toBe('medium')
    expect(withoutRir.confidence).toBe('low')
    expect(withoutRir.missingData.length).toBeGreaterThan(0)
  })
})

describe('movement classification', () => {
  it('names the muscle a movement is actually for', () => {
    expect(primaryMuscle(EXERCISE_BY_ID['lateral-raise'])).toBe('side_delts')
    expect(primaryMuscle(EXERCISE_BY_ID['barbell-bench-press'])).toBe('chest')
  })

  it('treats squats and hinges as short-length-dominant', () => {
    expect(loadsLongLengths(EXERCISE_BY_ID['back-squat'])).toBe(false)
    expect(loadsLongLengths(EXERCISE_BY_ID['lat-pulldown'])).toBe(true)
  })
})

describe('hypertrophy audit', () => {
  const full = {
    musclesInRange: 9,
    musclesAssessed: 10,
    musclesTrainedTwice: 8,
    hardSetFraction: 0.85,
    medianCompoundRestSec: 180,
  }

  it('grades every lever it can measure', () => {
    const levers = auditHypertrophy(full)
    expect(levers.map((l) => l.key)).toEqual(['volume', 'effort', 'frequency', 'rest', 'range'])
    expect(levers.every((l) => l.status === 'good')).toBe(true)
    expect(levers.every((l) => l.advice.length > 0)).toBe(true)
  })

  it('says "unknown" rather than inventing a grade', () => {
    const levers = auditHypertrophy({
      musclesInRange: 0,
      musclesAssessed: 0,
      musclesTrainedTwice: 0,
      hardSetFraction: null,
      medianCompoundRestSec: null,
    })
    const unknown = levers.filter((l) => l.status === 'unknown').map((l) => l.key)
    expect(unknown).toContain('volume')
    expect(unknown).toContain('effort')
    expect(unknown).toContain('rest')
    // An unknown lever must never carry a finding it did not measure.
    for (const lever of levers.filter((l) => l.status === 'unknown')) {
      expect(lever.finding).toBe('')
    }
  })

  it('flags rushed compound rest', () => {
    const levers = auditHypertrophy({ ...full, medianCompoundRestSec: 45 })
    expect(levers.find((l) => l.key === 'rest')!.status).toBe('attention')
  })

  it('flags easy sets', () => {
    const levers = auditHypertrophy({ ...full, hardSetFraction: 0.3 })
    expect(levers.find((l) => l.key === 'effort')!.status).toBe('attention')
  })

  it('flags once-a-week muscles', () => {
    const levers = auditHypertrophy({ ...full, musclesTrainedTwice: 2 })
    expect(levers.find((l) => l.key === 'frequency')!.status).toBe('attention')
  })

  it('measures rest from the set timestamps, not from what was prescribed', () => {
    // 150s between compound sets. The rest timer is irrelevant here — this is
    // what actually happened.
    const bench = EXERCISE_BY_ID['barbell-bench-press']
    const session: Session = {
      id: 'sess',
      date: '2026-08-03',
      programId: null,
      programDayId: null,
      title: 'Push',
      status: 'completed',
      startedAt: 0,
      endedAt: 1,
      entries: [
        {
          ...entryFor(bench, [
            { ...set(60, 8), completedAt: 0 },
            { ...set(60, 8), completedAt: 150_000 },
            { ...set(60, 7), completedAt: 300_000 },
          ]),
        },
      ],
    }
    const input = collectAuditInput([session], [bench], ['2026-08-03'], [
      { muscle: 'chest', hardSets: 3, plannedSets: 3, status: 'below' },
    ])
    expect(input.medianCompoundRestSec).toBe(150)
    expect(auditHypertrophy(input).find((l) => l.key === 'rest')!.status).toBe('good')
  })

  it('ignores a gap where someone clearly walked away', () => {
    const bench = EXERCISE_BY_ID['barbell-bench-press']
    const session: Session = {
      id: 'sess',
      date: '2026-08-03',
      programId: null,
      programDayId: null,
      title: 'Push',
      status: 'completed',
      startedAt: 0,
      endedAt: 1,
      entries: [
        {
          ...entryFor(bench, [
            { ...set(60, 8), completedAt: 0 },
            { ...set(60, 8), completedAt: 45 * 60_000 },
          ]),
        },
      ],
    }
    const input = collectAuditInput([session], [bench], ['2026-08-03'], [])
    expect(input.medianCompoundRestSec).toBeNull()
  })

  it('counts a muscle as twice-weekly only across separate days', () => {
    const bench = EXERCISE_BY_ID['barbell-bench-press']
    const make = (id: string, date: string): Session => ({
      id,
      date,
      programId: null,
      programDayId: null,
      title: 'Push',
      status: 'completed',
      startedAt: 0,
      endedAt: 1,
      entries: [entryFor(bench, [set(60, 8), set(60, 8)])],
    })
    const chest = [{ muscle: 'chest' as const, hardSets: 4, plannedSets: 4, status: 'below' }]
    const dates = ['2026-08-03', '2026-08-04']

    // Two sessions, same day: still once.
    const sameDay = collectAuditInput(
      [make('a', '2026-08-03'), make('b', '2026-08-03')],
      [bench],
      dates,
      chest,
    )
    expect(sameDay.musclesTrainedTwice).toBe(0)

    const twoDays = collectAuditInput(
      [make('a', '2026-08-03'), make('b', '2026-08-04')],
      [bench],
      dates,
      chest,
    )
    expect(twoDays.musclesTrainedTwice).toBe(1)
  })

  it('cites a real source on every lever', () => {
    for (const lever of auditHypertrophy(full)) {
      expect(lever.citationIds.length).toBeGreaterThan(0)
      for (const id of lever.citationIds) expect(CITATION_BY_ID[id], id).toBeDefined()
    }
  })
})

describe('the fatigue budget, as the session player actually uses it', () => {
  /**
   * The bug this exists for.
   *
   * The engine has always capped finishers per session, the rule was written,
   * and a test asserted it — but the caller passed a hardcoded 0, so the cap
   * never fired. A finisher was offered on every movement in the workout, and
   * a session could end up carrying five of them. Every check in the suite
   * passed the whole time, because they all called the engine directly.
   *
   * So this walks a whole session the way the screen does: offer, accept,
   * feed the real count back in, offer again.
   */
  const walkSession = (movements: number) => {
    const taken: string[] = []
    const offered: boolean[] = []
    for (let i = 0; i < movements; i += 1) {
      const result = suggestFinisher(context({ finishersUsedThisSession: taken.length }))
      offered.push(result.technique !== null)
      if (result.technique) taken.push(result.technique.kind)
    }
    return { offered, taken }
  }

  it('stops offering once the budget is spent', () => {
    const { taken } = walkSession(6)
    expect(taken.length).toBe(RULES.intensity.maxPerSession)
  })

  it('never offers a third on a six-movement session', () => {
    const { offered } = walkSession(6)
    expect(offered.slice(RULES.intensity.maxPerSession).every((o) => o === false)).toBe(true)
  })

  it('keeps the budget small enough to be a garnish', () => {
    // Two is a fatigue budget. Five is a second workout, which is what
    // happens when nothing counts them.
    expect(RULES.intensity.maxPerSession).toBeLessThanOrEqual(3)
    expect(RULES.intensity.maxPerSession).toBeGreaterThanOrEqual(1)
  })

  it('explains the refusal rather than going quiet', () => {
    const spent = suggestFinisher(
      context({ finishersUsedThisSession: RULES.intensity.maxPerSession }),
    )
    expect(spent.technique).toBeNull()
    expect(spent.blockedBy).toBe('session_budget')
    expect(BLOCK_EXPLANATION[spent.blockedBy!]).toMatch(/budget/i)
  })
})

describe('what a finished challenge is worth', () => {
  it('cannot pay for more challenges than the fatigue budget allows', () => {
    // If the daily reward cap were higher than the per-session cap, the
    // economy would be quietly arguing for a third one.
    expect(ECONOMY.limits.perDay.challenge_completed).toBeLessThanOrEqual(
      RULES.intensity.maxPerSession,
    )
  })

  it('pays less for garnishing a session than for finishing one', () => {
    const day =
      ECONOMY.rewards.challenge_completed.xp * ECONOMY.limits.perDay.challenge_completed
    expect(day).toBeLessThan(ECONOMY.rewards.workout_completed.xp)
  })

  it('pays enough to be worth taking', () => {
    // The whole point is that effort beyond the plan is recognised. A reward
    // smaller than a rest-timer puzzle would say the opposite.
    expect(ECONOMY.rewards.challenge_completed.xp).toBeGreaterThan(ECONOMY.rewards.puzzle_solved.xp)
    expect(ECONOMY.rewards.challenge_completed.coins).toBeGreaterThan(
      ECONOMY.rewards.puzzle_solved.coins,
    )
  })
})

describe('the drop target is a landmark, not a requirement', () => {
  const dropped = () => {
    const result = suggestFinisher(context({}))
    if (!result.technique) throw new Error('expected a finisher to be offered')
    return result.technique
  }

  it('publishes a band, not just a number', () => {
    // A figure printed to one decimal place reads as a requirement. Stacks
    // have the pins they have, and nobody should be standing at a machine
    // wondering whether the nearest hole counts.
    const steps = dropped().steps.join(' ')
    expect(steps).toMatch(/nearest pin either side is fine/i)
    expect(steps).toMatch(/\bto\b/)
  })

  it('never calls a weight heavier than the working set a drop', () => {
    const steps = dropped().steps.join(' ')
    const numbers = [...steps.matchAll(/([\d.]+)\s*(kg|lb)/g)].map((m) => Number(m[1]))
    expect(numbers.length).toBeGreaterThan(0)
    // Everything named has to be below the load that was just used.
    const working = 60
    for (const n of numbers) expect(n).toBeLessThan(working)
  })
})
