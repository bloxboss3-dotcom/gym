import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { assessMovement, assessTraining } from '@/engine/coaching'
import { EXERCISE_BY_ID, EXERCISE_LIBRARY } from '@/data/exercises'
import { addDays, toIsoDate } from '@/lib/date'
import type { Session } from '@/types'

/**
 * The coaching verdict.
 *
 * These assert the presence of a correct judgement, not the absence of a
 * wrong one. The failure mode that matters is silence — an engine that
 * returns "unknown" for everything passes any test written as "does not say
 * something false", which is why every case here demands a specific verdict.
 */

const TODAY = '2026-08-13'
const BENCH = 'barbell-bench-press'

function sessionOn(
  date: string,
  opts: { weightKg: number; reps: number; rir: number | null; exerciseId?: string },
): Session {
  const exerciseId = opts.exerciseId ?? BENCH
  return {
    id: `s-${date}-${exerciseId}`,
    date,
    programId: null,
    programDayId: null,
    title: 'Session',
    status: 'completed',
    startedAt: 0,
    endedAt: 1,
    entries: [
      {
        id: `e-${date}-${exerciseId}`,
        exerciseId,
        plannedSets: 3,
        repMin: 6,
        repMax: 10,
        targetRIR: 2,
        restSec: 150,
        incrementKg: 2.5,
        pain: 0,
        technique: 'clean',
        sets: [0, 1, 2].map((i) => ({
          id: `set-${date}-${i}`,
          weightKg: opts.weightKg,
          reps: opts.reps,
          rir: opts.rir,
          warmup: false,
          completedAt: 1,
        })),
      },
    ],
  }
}

/** Sessions going back weekly from TODAY, newest load last in the list. */
function weekly(loads: number[], rir: number | null, exerciseId = BENCH): Session[] {
  return loads.map((weightKg, i) =>
    sessionOn(addDays(TODAY, -(loads.length - 1 - i) * 7), { weightKg, reps: 8, rir, exerciseId }),
  )
}

describe('judging one movement', () => {
  const bench = EXERCISE_BY_ID[BENCH]

  it('calls a rising load progress', () => {
    const v = assessMovement(bench, weekly([60, 62.5, 65, 67.5], 2), TODAY)
    expect(v?.trend).toBe('gaining')
    expect(v?.trendPct).toBeGreaterThan(0)
    expect(v?.note).toMatch(/going up/i)
  })

  it('calls a flat load flat, and says so out loud', () => {
    // The important half: an app that only ever says encouraging things is
    // not analysing anything.
    const v = assessMovement(bench, weekly([60, 60, 60, 60], 2), TODAY)
    expect(v?.trend).toBe('holding')
    expect(v?.note).toMatch(/flat/i)
  })

  it('calls a falling load what it is', () => {
    const v = assessMovement(bench, weekly([70, 67.5, 65, 62.5], 2), TODAY)
    expect(v?.trend).toBe('slipping')
    expect(v?.note).toMatch(/backwards/i)
  })

  it('names effort as the cause when the sets are easy and nothing is moving', () => {
    // This is the whole point of the engine: joining the two findings up.
    // Reported separately, nobody connects "flat" to "five reps in reserve".
    const v = assessMovement(bench, weekly([60, 60, 60, 60], 5), TODAY)
    expect(v?.effort).toBe('leaving_reps')
    expect(v?.note).toMatch(/reps in reserve/i)
    expect(v?.note).toMatch(/not a hard set/i)
  })

  it('does not blame effort when the sets are already going to failure', () => {
    // Opposite fix. Telling somebody grinding every set to try harder is
    // worse than saying nothing.
    const v = assessMovement(bench, weekly([60, 60, 60, 60], 0), TODAY)
    expect(v?.effort).toBe('grinding')
    expect(v?.note).toMatch(/more effort is not the missing ingredient/i)
  })

  it('refuses to call a trend on too little data', () => {
    const v = assessMovement(bench, weekly([60, 65], 2), TODAY)
    expect(v?.trend).toBe('unknown')
    expect(v?.note).toMatch(/not enough/i)
  })

  it('ignores sessions outside the window', () => {
    const old = [sessionOn(addDays(TODAY, -120), { weightKg: 100, reps: 8, rir: 2 })]
    expect(assessMovement(bench, old, TODAY)).toBeNull()
  })

  it('does not let one heavy day at the end decide the verdict', () => {
    // First-to-last comparison would call this progress. It is one good day
    // on top of a flat month, which is exactly what people most want to read
    // as a trend.
    const v = assessMovement(bench, weekly([60, 60, 60, 60, 60, 62.5], 2), TODAY)
    expect(v?.trend).not.toBe('gaining')
  })
})

describe('the verdict across everything trained', () => {
  const exercises = EXERCISE_LIBRARY

  it('leads with effort when that is the problem', () => {
    const sessions = [
      ...weekly([60, 60, 60, 60], 5, BENCH),
      ...weekly([40, 40, 40, 40], 5, 'barbell-row'),
    ]
    const verdict = assessTraining({ sessions, exercises, today: TODAY })
    expect(verdict.headline).toMatch(/leaving reps in the tank/i)
    expect(verdict.status).toBe('attention')
    expect(verdict.leavingReps).toBe(2)
  })

  it('says plainly when things are working', () => {
    const sessions = [
      ...weekly([60, 62.5, 65, 67.5], 2, BENCH),
      ...weekly([40, 42.5, 45, 47.5], 2, 'barbell-row'),
    ]
    const verdict = assessTraining({ sessions, exercises, today: TODAY })
    expect(verdict.status).toBe('good')
    expect(verdict.gaining).toBe(2)
    expect(verdict.headline).toMatch(/progressing on 2 of 2/i)
  })

  it('counts what has stopped moving', () => {
    const sessions = [
      ...weekly([60, 60, 60, 60], 2, BENCH),
      ...weekly([40, 40, 40, 40], 2, 'barbell-row'),
      ...weekly([80, 82.5, 85, 87.5], 2, 'back-squat'),
    ]
    const verdict = assessTraining({ sessions, exercises, today: TODAY })
    expect(verdict.stalled).toBe(2)
    expect(verdict.gaining).toBe(1)
    expect(verdict.status).toBe('attention')
  })

  it('puts the problems first', () => {
    const sessions = [
      ...weekly([60, 62.5, 65, 67.5], 2, BENCH),
      ...weekly([70, 67.5, 65, 62.5], 2, 'back-squat'),
    ]
    const verdict = assessTraining({ sessions, exercises, today: TODAY })
    expect(verdict.movements[0].exerciseId).toBe('back-squat')
    expect(verdict.movements[0].trend).toBe('slipping')
  })

  it('admits what it could not judge instead of quietly dropping it', () => {
    const sessions = [...weekly([60, 65], 2, BENCH), ...weekly([40, 40, 40, 40], null, 'barbell-row')]
    const verdict = assessTraining({ sessions, exercises, today: TODAY })
    const gaps = verdict.missingData.join(' ')
    expect(gaps).toMatch(/fewer than \d+ sessions/i)
    expect(gaps).toMatch(/reps in reserve were not logged/i)
  })

  it('does not pretend to know anything from an empty log', () => {
    const verdict = assessTraining({ sessions: [], exercises, today: TODAY })
    expect(verdict.status).toBe('unknown')
    expect(verdict.movements).toEqual([])
    expect(verdict.headline).toMatch(/not enough/i)
  })

  it('cites what it is standing on', () => {
    const verdict = assessTraining({ sessions: weekly([60, 62.5, 65, 67.5], 2), exercises, today: TODAY })
    expect(verdict.citationIds.length).toBeGreaterThan(0)
  })

  it('draws its effort window from the rules, not from a number typed here', () => {
    // A movement trained at exactly the top of the allowed window must not be
    // scolded for it.
    const atLimit = weekly([60, 60, 60, 60], RULES.progression.rirWindow.max)
    expect(assessMovement(EXERCISE_BY_ID[BENCH], atLimit, TODAY)?.effort).toBe('hard_enough')
    const past = weekly([60, 60, 60, 60], RULES.progression.rirWindow.max + 1)
    expect(assessMovement(EXERCISE_BY_ID[BENCH], past, TODAY)?.effort).toBe('leaving_reps')
  })
})

describe('today is not a magic date', () => {
  it('works the same whenever it is run', () => {
    // Guards against anything reaching for the system clock.
    const shifted = assessMovement(
      EXERCISE_BY_ID[BENCH],
      weekly([60, 62.5, 65, 67.5], 2),
      TODAY,
    )
    const alsoShifted = assessMovement(
      EXERCISE_BY_ID[BENCH],
      weekly([60, 62.5, 65, 67.5], 2).map((s) => ({ ...s, date: addDays(s.date, 40) })),
      addDays(TODAY, 40),
    )
    expect(alsoShifted?.trend).toBe(shifted?.trend)
    expect(alsoShifted?.trendPct).toBe(shifted?.trendPct)
    expect(toIsoDate).toBeTypeOf('function')
  })
})

describe('the translatable template', () => {
  const bench = EXERCISE_BY_ID[BENCH]

  it('produces the same English it always did', () => {
    /*
      Exact sentences, not a regex.

      The first version of this test asserted that interpolating the template
      reproduces the note — which is true by construction, because the note is
      built FROM the template. It could not fail, and a deliberate reword sailed
      straight through it. What can actually go wrong is the refactor changing
      the English, so that is what is pinned: these strings shipped, and the
      browser suite and the user both read them.
    */
    const noteFor = (loads: number[], rir: number | null) =>
      assessMovement(bench, weekly(loads, rir), TODAY)!.note

    expect(noteFor([60, 62.5, 65, 67.5], 2)).toBe(
      'Going up (+8.2%) and the sets are landing in the right effort window. Leave it alone.',
    )
    expect(noteFor([60, 60, 60, 60], 5)).toBe(
      'Flat (+0.0%), at a median of 5 reps in reserve. That is the likely reason — a set you could have doubled is not a hard set.',
    )
    expect(noteFor([60, 60, 60, 60], 0)).toBe(
      'Flat (+0.0%), and the sets are going to failure or past it. More effort is not the missing ingredient here; recovery or volume might be.',
    )
    expect(noteFor([60, 65], 2)).toBe(
      'Only 2 sessions in the last 28 days — not enough to call a trend yet.',
    )
  })

  it('leaves no placeholder unfilled', () => {
    // A stray {rir} reaching the screen is worse than no translation at all.
    for (const rir of [0, 2, 5, null]) {
      for (const loads of [[60, 62.5, 65, 67.5], [60, 60, 60, 60], [70, 67.5, 65, 62.5]]) {
        const v = assessMovement(bench, weekly(loads, rir), TODAY)
        expect(v!.note, `rir ${rir}`).not.toMatch(/\{\w+\}/)
      }
    }
  })

  it('keeps the template free of already-interpolated numbers', () => {
    // If the trend percentage got baked in, the template stops being a key.
    const v = assessMovement(bench, weekly([60, 62.5, 65, 67.5], 2), TODAY)
    expect(v!.noteTemplate).toContain('{pct}')
    expect(v!.noteTemplate).not.toMatch(/\+\d+\.\d%/)
  })
})
