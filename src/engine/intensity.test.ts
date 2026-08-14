import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { ECONOMY } from '@/config/economy'
import { CITATION_BY_ID } from '@/data/citations'
import { EXERCISE_BY_ID } from '@/data/exercises'
import {
  auditHypertrophy,
  collectAuditInput,
  detectDropSet,
  loadsLongLengths,
  primaryMuscle,
  suggestFinisher,
  type FinisherContext,
} from '@/engine/intensity'
import type { Exercise, LoggedSet, Session, SessionEntry } from '@/types'

function set(weightKg: number, reps: number, rir: number | null = 1, warmup = false): LoggedSet {
  return { id: `s${weightKg}-${reps}-${Math.random()}`, weightKg, reps, rir, warmup, completedAt: 0 }
}

/** A set logged `atSec` seconds into the exercise, for the timing rules. */
function setAt(atSec: number, weightKg: number, reps: number, warmup = false): LoggedSet {
  return { ...set(weightKg, reps, 1, warmup), completedAt: atSec * 1000 }
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

describe('a finisher is offered whenever the evidence-based conditions hold', () => {
  /*
    There is no session cap, and there never should have been one.

    The old rule refused a third finisher in a session. It was a judgement
    call written in the same voice as the rules that ARE sourced, and it
    turned away a technique on movements where every condition with evidence
    behind it — volume short for the muscle, safe loading, no pain, not
    deloading — was satisfied.

    What actually guards against overdoing it is measured rather than
    guessed, and all of it is still here: the offer only appears when the
    week is SHORT for that muscle, and the deload engine watches accumulated
    fatigue across the week regardless.
  */
  /* Six machine movements, each one its own entry with its own finished
     sets — a real session, walked the way the screen walks it. */
  const walkSession = (movements: number) => {
    const exercise = EXERCISE_BY_ID['triceps-pushdown']
    const taken: string[] = []
    for (let i = 0; i < movements; i += 1) {
      const entry = entryFor(exercise, [set(30, 12), set(30, 11), set(30, 10)], { id: `e${i}` })
      const result = suggestFinisher(context({ entry }))
      if (result.technique) taken.push(result.technique.kind)
    }
    return taken
  }

  it('keeps offering across a whole session', () => {
    expect(walkSession(6).length).toBe(6)
  })

  it('takes no count of how many were taken before it', () => {
    // The strong version of "no session cap": there is no input to carry one.
    // A finisher already accepted on five other movements cannot reach this
    // decision, because nothing in the context describes it.
    expect(Object.keys(context())).not.toContain('finishersUsedThisSession')
  })

  it('still refuses for every reason that has evidence behind it', () => {
    // Removing the arbitrary cap must not have loosened the real gates.
    expect(suggestFinisher(context({ deloadActive: true })).blockedBy).toBe('deload')
    expect(suggestFinisher(context({ goal: 'strength' })).blockedBy).toBe('goal')
    expect(suggestFinisher(context({ weeklySets: 20 })).blockedBy).toBe('volume_not_short')
  })
})

describe('how many drops one drop set carries', () => {
  const dropSet = (dropCount?: number) => {
    const result = suggestFinisher(context(dropCount === undefined ? {} : { dropCount }))
    if (!result.technique) throw new Error('expected a finisher')
    return result.technique
  }

  it('prescribes the number the research actually used, not one', () => {
    // The trial this cites (Fink 2018) ran a set to failure and then three
    // consecutive drops. Prescribing a single drop was not that protocol.
    expect(RULES.intensity.dropCount).toBeGreaterThanOrEqual(2)
    expect(RULES.intensity.dropCount).toBeLessThanOrEqual(RULES.intensity.dropCountRange.max)
  })

  it('lets somebody pick how many drops', () => {
    for (const n of [1, 2, 3]) {
      const steps = dropSet(n).steps.join(' ')
      expect(steps, `${n} drops`).toMatch(new RegExp(`${n} drops? on this set`))
    }
  })

  it('gets lighter every drop', () => {
    const steps = dropSet(3).steps.join(' ')
    const weights = [...steps.matchAll(/([\d.]+) kg/g)].map((m) => Number(m[1]))
    expect(weights.length).toBeGreaterThanOrEqual(3)
    // Each named target has to be below the one before it, or a "drop" is
    // just another straight set with extra steps.
    const targets = weights.filter((_, i) => i % 2 === 0)
    for (let i = 1; i < targets.length; i += 1) {
      expect(targets[i], `drop ${i + 1} of ${targets.join(', ')}`).toBeLessThan(targets[i - 1])
    }
  })

  it('names every drop in the headline when there is more than one', () => {
    expect(dropSet(3).headline).toMatch(/→/)
    expect(dropSet(1).headline).not.toMatch(/→/)
  })

  it('never names a weight at or above the working set', () => {
    const steps = dropSet(3).steps.join(' ')
    for (const m of steps.matchAll(/([\d.]+) kg/g)) expect(Number(m[1])).toBeLessThan(60)
  })
})

describe('what a finished challenge is worth', () => {
  it('pays for a few and then stops, without forbidding more', () => {
    /*
      The reward cap is not permission any more.

      There is no session limit on doing drop sets, so the economy must not
      reintroduce one by the back door — but an uncapped payout would make
      the coins, rather than the training, the reason to add a fourth. So it
      pays for the first few and goes quiet: you can keep doing them, they
      just stop being worth anything.
    */
    expect(ECONOMY.limits.perDay.challenge_completed).toBeGreaterThan(1)
    expect(ECONOMY.limits.perDay.challenge_completed).toBeLessThanOrEqual(6)
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

describe('recognising a drop set that was simply logged', () => {
  const exercise = EXERCISE_BY_ID['triceps-pushdown']
  /** Three planned sets at 40 kg, done, at ten-second intervals. */
  const planned = () => [setAt(0, 40, 12), setAt(120, 40, 11), setAt(240, 40, 10)]

  it('reads the drops straight out of the sets', () => {
    const evidence = detectDropSet(
      entryFor(exercise, [...planned(), setAt(250, 30, 8), setAt(262, 22.5, 6)]),
    )
    expect(evidence).not.toBeNull()
    expect(evidence!.fromKg).toBe(40)
    expect(evidence!.drops.map((d) => d.weightKg)).toEqual([30, 22.5])
    expect(evidence!.dropReps).toBe(14)
  })

  it('recognises a single drop as well as a ladder', () => {
    const evidence = detectDropSet(entryFor(exercise, [...planned(), setAt(252, 30, 9)]))
    expect(evidence!.drops).toHaveLength(1)
  })

  it('says nothing when the weight never came down', () => {
    expect(detectDropSet(entryFor(exercise, [...planned(), setAt(255, 40, 7)]))).toBeNull()
  })

  it('ignores a cut too small to be a drop', () => {
    // 40 → 38 is a 5% trim, under `detectMinDropPct`. Somebody nudged the
    // weight, they did not drop it.
    expect(detectDropSet(entryFor(exercise, [...planned(), setAt(250, 38, 9)]))).toBeNull()
  })

  it('ignores a cut too big to have come off that set', () => {
    // 40 → 10 is 75% off. More likely a typo or a different movement than a
    // drop; the prescription itself never cuts anywhere near that far.
    expect(detectDropSet(entryFor(exercise, [...planned(), setAt(250, 10, 9)]))).toBeNull()
  })

  it('is a back-off set, not a drop set, once you have rested', () => {
    const rested = RULES.intensity.detectWindowSec + 30
    expect(detectDropSet(entryFor(exercise, [...planned(), setAt(240 + rested, 30, 9)]))).toBeNull()
  })

  it('does not turn a descending session into one long drop set', () => {
    // The plan itself goes down in weight — a pyramid, not a finisher.
    const pyramid = entryFor(exercise, [setAt(0, 60, 6), setAt(180, 45, 8), setAt(360, 32.5, 10)])
    expect(detectDropSet(pyramid)).toBeNull()
  })

  it('waits until the planned work is actually finished', () => {
    // Two of three planned sets done, then the weight comes down. That is
    // somebody struggling, not somebody adding a finisher.
    const short = entryFor(exercise, [setAt(0, 40, 12), setAt(120, 40, 9), setAt(130, 30, 6)])
    expect(detectDropSet(short)).toBeNull()
  })

  it('reads sets logged in one batch at the end', () => {
    // Every timestamp within a few seconds, because they were typed in
    // together afterwards. The load still came down, in order.
    const batched = entryFor(exercise, [
      setAt(600, 40, 12),
      setAt(602, 40, 11),
      setAt(604, 40, 10),
      setAt(606, 30, 8),
    ])
    expect(detectDropSet(batched)).not.toBeNull()
  })

  it('does not let a warm-up ramp stand in for planned work', () => {
    // Two warm-ups and only two of three planned sets, then the weight comes
    // down. Counting the warm-ups toward the plan would call this a finisher
    // when it is really somebody cutting a set short.
    const withWarmups = entryFor(exercise, [
      setAt(0, 20, 10, true),
      setAt(60, 30, 8, true),
      setAt(120, 40, 12),
      setAt(240, 40, 9),
      setAt(250, 30, 8),
    ])
    expect(detectDropSet(withWarmups)).toBeNull()
  })

  it('still finds the drops when the ramp is logged in front of them', () => {
    const withWarmups = entryFor(exercise, [
      setAt(0, 20, 10, true),
      setAt(60, 30, 8, true),
      ...planned(),
      setAt(250, 30, 8),
    ])
    const evidence = detectDropSet(withWarmups)
    expect(evidence!.fromKg).toBe(40)
    expect(evidence!.drops).toHaveLength(1)
  })

  it('needs reps on the drop, not just a lighter number typed in', () => {
    expect(detectDropSet(entryFor(exercise, [...planned(), setAt(250, 30, 0)]))).toBeNull()
  })
})
