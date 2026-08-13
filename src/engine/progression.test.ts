import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import {
  analyseSession,
  detectPlateau,
  historyFor,
  recommendNextSession,
  type Prescription,
} from '@/engine/progression'
import { daysAgo, entry, performed, session, set } from '@/test/factories'

const prescription: Prescription = {
  sets: 3,
  repMin: 8,
  repMax: 12,
  targetRIR: 2,
  incrementKg: 2.5,
  lowerBody: false,
  units: 'kg',
}

describe('session analysis', () => {
  it('identifies the working load as the load used for most sets', () => {
    const analysis = analyseSession(
      performed({ reps: [12, 12, 11], weightKg: 60 }),
    )
    expect(analysis.workingLoadKg).toBe(60)
    expect(analysis.workingSets).toBe(3)
    expect(analysis.totalReps).toBe(35)
  })

  it('counts sets at the top of the range against planned sets, not logged sets', () => {
    // Only two of three planned sets were logged, both at the top.
    const analysis = analyseSession(performed({ reps: [12, 12], plannedSets: 3 }))
    expect(analysis.setsAtTop).toBe(2)
    expect(analysis.metTopOfRange).toBe(false)
  })

  it('tracks how much effort data is missing', () => {
    const analysis = analyseSession(performed({ reps: [10, 10, 10], rir: [2, null, null] }))
    expect(analysis.ratedSets).toBe(1)
    expect(analysis.missingRirFraction).toBeCloseTo(2 / 3, 5)
  })
})

describe('double progression — the documented example', () => {
  it('holds the load and chases 12/12/12 after 12, 12, 11 at ~2 RIR', () => {
    const history = [performed({ reps: [12, 12, 11], rir: 2, weightKg: 60 })]
    const rec = recommendNextSession(history, prescription)

    expect(rec.action).toBe('add_reps')
    expect(rec.target.loadKg).toBe(60)
    expect(rec.target.totalRepsTarget).toBe(35 + RULES.progression.repIncrementTarget)
    expect(rec.reason).toMatch(/double progression/i)
  })

  it('adds the smallest available increment once every set reaches the top', () => {
    const history = [performed({ reps: [12, 12, 12], rir: 2, weightKg: 60 })]
    const rec = recommendNextSession(history, prescription)

    expect(rec.action).toBe('increase_load')
    expect(rec.target.loadKg).toBe(62.5)
    expect(rec.headline).toMatch(/add/i)
  })

  it('keeps an upper-body jump inside the configured percentage band', () => {
    const history = [performed({ reps: [12, 12, 12], rir: 2, weightKg: 60 })]
    const rec = recommendNextSession(history, prescription)
    const pct = (rec.target.loadKg! - 60) / 60
    expect(pct).toBeLessThanOrEqual(RULES.progression.upperBodyStepPct.max + 1e-9)
  })

  it('uses a larger step for lower-body movements when the set was easy', () => {
    const history = [performed({ reps: [12, 12, 12], rir: 4, weightKg: 100 })]
    const lower = recommendNextSession(history, { ...prescription, lowerBody: true, incrementKg: 5 })
    expect(lower.action).toBe('increase_load')
    const pct = (lower.target.loadKg! - 100) / 100
    expect(pct).toBeGreaterThanOrEqual(RULES.progression.lowerBodyStepPct.min - 1e-9)
    expect(pct).toBeLessThanOrEqual(RULES.progression.lowerBodyStepPct.max + 1e-9)
  })
})

describe('rule 3 — do not reward reckless progression', () => {
  it('holds the load when the top of the range was only reached at 0 RIR', () => {
    const history = [performed({ reps: [12, 12, 12], rir: 0, weightKg: 60 })]
    const rec = recommendNextSession(history, prescription)

    expect(rec.action).toBe('hold_load')
    expect(rec.target.loadKg).toBe(60)
    expect(rec.reason).toMatch(/failure/i)
  })

  it('reduces the load when most sets fall below the bottom of the range', () => {
    const history = [performed({ reps: [6, 5, 5], rir: 0, weightKg: 60 })]
    const rec = recommendNextSession(history, prescription)

    expect(rec.action).toBe('reduce_load')
    expect(rec.target.loadKg!).toBeLessThan(60)
    expect(rec.target.loadKg!).toBeGreaterThanOrEqual(60 * (1 - RULES.progression.backoffPct) - 2.5)
  })

  it('does not reduce when only one of three sets dips under the range', () => {
    const history = [performed({ reps: [10, 9, 7], rir: 2, weightKg: 60 })]
    const rec = recommendNextSession(history, prescription)
    expect(rec.action).toBe('add_reps')
  })
})

describe('rule 5 — pain overrides everything', () => {
  it('stops the movement and warns at or above the stop threshold', () => {
    const history = [
      performed({ reps: [12, 12, 12], rir: 2, pain: RULES.progression.painStopThreshold }),
    ]
    const rec = recommendNextSession(history, prescription)

    expect(rec.action).toBe('stop_and_seek_guidance')
    expect(rec.target.loadKg).toBeNull()
    expect(rec.warning).toBeTruthy()
    expect(rec.warning).toMatch(/physio|physician/i)
  })

  it('blocks a load increase at moderate pain even when every set hit the top', () => {
    const history = [
      performed({ reps: [12, 12, 12], rir: 2, pain: RULES.progression.painBlockThreshold }),
    ]
    const rec = recommendNextSession(history, prescription)

    expect(rec.action).not.toBe('increase_load')
    expect(rec.target.loadKg === null || rec.target.loadKg <= 60).toBe(true)
    expect(rec.warning).toBeTruthy()
  })

  it('suggests substituting when pain repeats across sessions', () => {
    const history = [
      performed({ reps: [10, 10, 10], pain: 4 }),
      performed({ reps: [10, 10, 10], pain: 4, date: daysAgo(3) }),
    ]
    const rec = recommendNextSession(history, prescription)
    expect(rec.action).toBe('substitute_exercise')
  })

  it('blocks progression when technique breaks down repeatedly', () => {
    const history = [
      performed({ reps: [12, 12, 12], rir: 2, technique: 'breakdown' }),
      performed({ reps: [12, 12, 12], rir: 2, technique: 'breakdown', date: daysAgo(3) }),
    ]
    const rec = recommendNextSession(history, prescription)
    expect(rec.action).toBe('substitute_exercise')
    expect(rec.reason).toMatch(/technique/i)
  })
})

describe('plateau detection', () => {
  const flat = (n: number) =>
    Array.from({ length: n }, (_, i) => performed({ reps: [10, 10, 10], weightKg: 60, date: daysAgo(i * 3) }))

  it('needs at least two sessions to say anything', () => {
    expect(detectPlateau([]).stalled).toBe(false)
    expect(detectPlateau(flat(1)).stalled).toBe(false)
  })

  it('counts consecutive sessions without meaningful improvement', () => {
    const result = detectPlateau(flat(4))
    expect(result.stalledSessions).toBe(3)
    expect(result.stalled).toBe(true)
  })

  it('does not call a plateau when the most recent session improved', () => {
    const history = [
      performed({ reps: [11, 11, 11], weightKg: 62.5 }),
      ...flat(3).map((h, i) => ({ ...h, date: daysAgo((i + 1) * 3) })),
    ]
    const result = detectPlateau(history)
    expect(result.stalledSessions).toBe(0)
    expect(result.stalled).toBe(false)
  })

  it('holds load and audits recovery once stalled', () => {
    const rec = recommendNextSession(flat(RULES.plateau.sessionsToStall + 1), prescription, {
      recentSoreness: 4.2,
      recentReadiness: 2.1,
      recentRunKm: 22,
    })
    expect(rec.action).toBe('hold_and_check_recovery')
    expect(rec.target.loadKg).toBe(60)
    expect(rec.reason).toMatch(/soreness/i)
    expect(rec.reason).toMatch(/22.0 km|22 km/)
  })

  it('recommends changing the stimulus after a longer stall', () => {
    const rec = recommendNextSession(flat(RULES.plateau.sessionsToSubstitute + 1), prescription)
    expect(rec.action).toBe('substitute_exercise')
  })
})

describe('confidence and missing data', () => {
  it('is low with a single session and rises with history', () => {
    const one = recommendNextSession([performed({ reps: [10, 10, 10] })], prescription)
    expect(one.confidence).toBe('low')

    const many = recommendNextSession(
      Array.from({ length: 3 }, (_, i) =>
        performed({ reps: [10, 10, 10 + i], weightKg: 60 + i * 2.5, date: daysAgo(i * 3) }),
      ),
      prescription,
    )
    expect(many.confidence).toBe('high')
  })

  it('downgrades confidence and reports the gap when RIR is missing', () => {
    const history = Array.from({ length: 3 }, (_, i) =>
      performed({ reps: [10, 10, 10 + i], weightKg: 60 + i * 2.5, rir: null, date: daysAgo(i * 3) }),
    )
    const rec = recommendNextSession(history, prescription)
    expect(rec.confidence).toBe('medium')
    expect(rec.missingData.join(' ')).toMatch(/reps in reserve/i)
  })

  it('reports partially logged sessions as a data gap', () => {
    const rec = recommendNextSession([performed({ reps: [10, 10], plannedSets: 3 })], prescription)
    expect(rec.missingData.join(' ')).toMatch(/2 of 3 planned sets/)
  })
})

describe('first session', () => {
  it('establishes a baseline instead of inventing a load', () => {
    const rec = recommendNextSession([], prescription)
    expect(rec.action).toBe('establish_baseline')
    expect(rec.target.loadKg).toBeNull()
    expect(rec.confidence).toBe('low')
  })
})

describe('every recommendation satisfies the transparency contract', () => {
  const scenarios = [
    [],
    [performed({ reps: [12, 12, 12] })],
    [performed({ reps: [12, 12, 11] })],
    [performed({ reps: [4, 4, 4] })],
    [performed({ reps: [10, 10, 10], pain: 8 })],
    [performed({ reps: [10, 10, 10], pain: 3 })],
  ]

  it.each(scenarios.map((s, i) => [i, s] as const))('scenario %i', (_i, history) => {
    const rec = recommendNextSession(history, prescription)
    expect(rec.headline).toBeTruthy()
    expect(rec.target.description).toBeTruthy()
    expect(rec.reason.length).toBeGreaterThan(40)
    expect(rec.rule).toBeTruthy()
    expect(rec.citationIds.length).toBeGreaterThan(0)
    expect(['low', 'medium', 'high']).toContain(rec.confidence)
    expect(Array.isArray(rec.missingData)).toBe(true)
  })

  it('is deterministic — identical inputs always give identical output', () => {
    const history = [performed({ reps: [12, 12, 11], weightKg: 60 })]
    const a = recommendNextSession(history, prescription)
    const b = recommendNextSession(history, prescription)
    expect(a).toEqual(b)
  })
})

describe('history assembly', () => {
  it('reads only completed sessions, newest first, ignoring warm-ups', () => {
    const sessions = [
      session({
        date: daysAgo(1),
        entries: [entry({ exerciseId: 'bench', sets: [set(40, 8, null, true), set(60, 10)] })],
      }),
      session({
        date: daysAgo(4),
        entries: [entry({ exerciseId: 'bench', sets: [set(57.5, 10)] })],
      }),
      session({
        date: daysAgo(2),
        status: 'abandoned',
        entries: [entry({ exerciseId: 'bench', sets: [set(100, 1)] })],
      }),
    ]
    const history = historyFor(sessions, 'bench')
    expect(history).toHaveLength(2)
    expect(history[0].date).toBe(daysAgo(1))
    expect(history[0].sets).toHaveLength(1)
    expect(history[0].sets[0].weightKg).toBe(60)
  })
})

describe('a session that used more than one weight', () => {
  // The reported case, in the units it was reported in: 25 lb x 12 and then
  // 45 lb x 10, against an 8–12 range. The engine used to pool both sets, see
  // "one at the top of the range, one below", and hold the weight — without
  // ever mentioning that two different weights had been used.
  const LB = 2.2046226218
  const lb = (n: number) => n / LB
  const mixed = () =>
    performed({
      reps: [12, 12, 10],
      weightsKg: [lb(25), lb(25), lb(45)],
      plannedSets: 3,
      rir: 2,
    })

  it('judges the rep range against the heaviest sets only', () => {
    const analysis = analyseSession(mixed())
    expect(Math.round(analysis.topLoadKg * LB)).toBe(45)
    expect(analysis.setsAtTopLoad).toBe(1)
    // The 25 lb sets hit 12 reps. They must not count as having reached the
    // top of the range on behalf of the 45 lb set, which reached 10.
    expect(analysis.setsAtTop).toBe(0)
    expect(analysis.metTopOfRange).toBe(false)
  })

  it('notices that the loads were different at all', () => {
    expect(analyseSession(mixed()).mixedLoads).toBe(true)
    expect(analyseSession(performed({ reps: [12, 12, 12] })).mixedLoads).toBe(false)
  })

  it('says which weight it is talking about', () => {
    // Silently picking one of two weights is what made this feel broken.
    const said = recommendNextSession([mixed()], { ...prescription, units: 'lb' }).judgedOn ?? ''
    expect(said).toMatch(/45 lb/)
    expect(said).toMatch(/25 lb/)
  })

  it('advises on the heavy sets, not the light ones', () => {
    const rec = recommendNextSession([mixed()], { ...prescription, units: 'lb' })
    // Whatever it decides, the load it names has to be the 45, never the 25.
    const named = `${rec.headline} ${rec.target.description}`
    expect(named).not.toMatch(/\b25(\.\d)? lb/)
  })

  it('leaves single-weight sessions exactly as they were', () => {
    const clean = performed({ reps: [12, 12, 12], weightKg: 60 })
    const analysis = analyseSession(clean)
    expect(analysis.mixedLoads).toBe(false)
    expect(analysis.workingLoadKg).toBe(60)
    expect(analysis.topLoadKg).toBe(60)
    expect(analysis.metTopOfRange).toBe(true)
  })
})

describe('reps well past the top of the range', () => {
  // The second reported case: a 12-rep cap, and sets of 15–18. The engine
  // called that "you hit the top of the range (12 reps)" and added the
  // smallest increment it could find.
  const past = () => performed({ reps: [18, 16, 15], weightKg: 40, rir: 3 })

  it('counts how far past the range it went', () => {
    const analysis = analyseSession(past())
    expect(analysis.bestRepsAtTopLoad).toBe(18)
    expect(analysis.repsPastTop).toBe(6)
  })

  it('does not call 18 reps "the top of the range"', () => {
    const rec = recommendNextSession([past()], prescription)
    expect(rec.reason).not.toMatch(/hit the top of the range/i)
    expect(rec.reason).toMatch(/past the range/i)
    expect(rec.reason).toMatch(/18/)
  })

  it('jumps by more than the smallest increment', () => {
    const rec = recommendNextSession([past()], prescription)
    const jump = (rec.target.loadKg ?? 0) - 40
    expect(jump).toBeGreaterThan(prescription.incrementKg)
  })

  it('never leaps further than the cap in one session', () => {
    const rec = recommendNextSession([past()], prescription)
    expect(rec.target.loadKg ?? 0).toBeLessThanOrEqual(40 * (1 + RULES.progression.maxSingleJumpPct) + 0.01)
  })

  it('still uses the smallest increment for someone who merely reached the top', () => {
    // The ordinary case must not get louder just because the loud case exists.
    const rec = recommendNextSession([performed({ reps: [12, 12, 12], weightKg: 60 })], prescription)
    expect(rec.action).toBe('increase_load')
    expect((rec.target.loadKg ?? 0) - 60).toBeLessThanOrEqual(prescription.incrementKg * 2)
    expect(rec.reason).toMatch(/top of the range/i)
  })
})

describe('saying which weight a recommendation is about', () => {
  const LB = 2.2046226218
  const lb = (n: number) => n / LB

  it('is a first-class field, not filed under missing data', () => {
    // Which of two loads is being judged is a decision, not a gap. Filed as a
    // gap it renders behind a disclosure headed "1 data gap", which is how
    // the app came to look like it had not noticed two different weights.
    const rec = recommendNextSession(
      [performed({ reps: [12, 12, 10], weightsKg: [lb(25), lb(25), lb(45)], plannedSets: 3 })],
      { ...prescription, units: 'lb' },
    )
    expect(rec.judgedOn).toBeTruthy()
    expect(rec.judgedOn).toMatch(/45 lb/)
    expect(rec.missingData.join(' ')).not.toMatch(/more than one weight/i)
  })

  it('stays quiet when there is only one weight to talk about', () => {
    const rec = recommendNextSession([performed({ reps: [12, 12, 12] })], prescription)
    expect(rec.judgedOn).toBeUndefined()
  })
})

describe('every branch says which weight it judged', () => {
  const LB = 2.2046226218
  const lb = (n: number) => n / LB

  it('never drops the note, whichever rule fires', () => {
    // There are a dozen return paths through this function and the note was
    // attached to them one at a time, which is exactly the sort of thing that
    // gets forgotten when the thirteenth is added. This sweeps rep patterns
    // that route through different rules and demands the note survives all of
    // them. Two of the branches genuinely missed it when first written.
    const patterns: { reps: number[]; pain?: number; technique?: 'clean' | 'breakdown' }[] = [
      { reps: [12, 12, 12] }, // top of range → increase
      { reps: [18, 17, 16] }, // way past → big jump
      { reps: [10, 10, 9] }, // inside range → add reps
      { reps: [5, 4, 4] }, // under range → back off
      { reps: [10, 9, 9], technique: 'breakdown' },
      { reps: [10, 9, 9], pain: 4 },
    ]
    const missed: string[] = []
    for (const p of patterns) {
      const rec = recommendNextSession(
        [
          performed({
            reps: p.reps,
            weightsKg: [lb(25), lb(25), lb(45)],
            plannedSets: 3,
            pain: p.pain ?? 0,
            technique: p.technique ?? 'clean',
          }),
        ],
        { ...prescription, units: 'lb' },
      )
      if (!rec.judgedOn) missed.push(`${rec.action} (${p.reps.join(',')})`)
    }
    expect(missed, `these branches forgot the note: ${missed.join(', ')}`).toEqual([])
  })
})
