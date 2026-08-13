import { describe, expect, it } from 'vitest'
import { CITATION_BY_ID } from '@/data/citations'
import { EXERCISE_BY_ID } from '@/data/exercises'
import { LEVEL_PERCENTILE, LIFT_STANDARDS, STRENGTH_LEVELS, bandFor, comparisonGroupFor, ladderFor, newBandCrossings, percentileForLift, strengthProfile } from '@/engine/percentile'

const BENCH = LIFT_STANDARDS.find((s) => s.exerciseId === 'barbell-bench-press')!

describe('strength standards data', () => {
  it('points every standard at a movement in the library', () => {
    for (const standard of LIFT_STANDARDS) {
      expect(EXERCISE_BY_ID[standard.exerciseId], standard.exerciseId).toBeDefined()
    }
  })

  it('climbs monotonically through the levels', () => {
    for (const standard of LIFT_STANDARDS) {
      for (const sex of ['male', 'female'] as const) {
        const ladder = standard[sex]
        for (let i = 1; i < ladder.length; i += 1) {
          expect(ladder[i], `${standard.exerciseId} ${sex} ${i}`).toBeGreaterThan(ladder[i - 1])
        }
      }
    }
  })
})

describe('body-weight scaling', () => {
  it('asks a heavier lifter for more weight but a smaller multiple', () => {
    const light = ladderFor(BENCH, 'male', 60)
    const heavy = ladderFor(BENCH, 'male', 110)
    // Smaller multiple of body weight...
    expect(heavy[2]).toBeLessThan(light[2])
    // ...but a bigger absolute bar.
    expect(heavy[2] * 110).toBeGreaterThan(light[2] * 60)
  })

  it('reproduces the published ratio at the reference body weight', () => {
    const ladder = ladderFor(BENCH, 'male', 80)
    expect(ladder).toEqual(BENCH.male)
  })

  it('does not let an implausible body weight blow up the ladder', () => {
    const silly = ladderFor(BENCH, 'male', 1)
    expect(silly.every((r) => Number.isFinite(r) && r > 0 && r < 20)).toBe(true)
  })
})

describe('placing a lift', () => {
  it('puts each anchor on its own percentile', () => {
    const ladder = ladderFor(BENCH, 'male', 80)
    STRENGTH_LEVELS.forEach((level, i) => {
      const result = percentileForLift(BENCH, 'male', 80, ladder[i] * 80)
      expect(result.percentile, level).toBe(LEVEL_PERCENTILE[level])
      expect(result.level).toBe(level)
    })
  })

  it('interpolates between anchors instead of stepping', () => {
    const ladder = ladderFor(BENCH, 'male', 80)
    const midpoint = ((ladder[1] + ladder[2]) / 2) * 80
    const result = percentileForLift(BENCH, 'male', 80, midpoint)
    expect(result.percentile).toBeGreaterThan(LEVEL_PERCENTILE.novice)
    expect(result.percentile).toBeLessThan(LEVEL_PERCENTILE.intermediate)
  })

  it('never claims the 0th or the 100th percentile', () => {
    expect(percentileForLift(BENCH, 'male', 80, 1).percentile).toBeGreaterThanOrEqual(1)
    expect(percentileForLift(BENCH, 'male', 80, 500).percentile).toBeLessThanOrEqual(99)
  })

  it('rises monotonically with the weight lifted', () => {
    let last = -1
    for (let kg = 20; kg <= 220; kg += 10) {
      const p = percentileForLift(BENCH, 'male', 80, kg).percentile
      expect(p, `${kg} kg`).toBeGreaterThanOrEqual(last)
      last = p
    }
  })

  it('names the exact bar needed for the next level, not just the level', () => {
    const ladder = ladderFor(BENCH, 'male', 80)
    const justPastNovice = ladder[1] * 80 + 1
    const result = percentileForLift(BENCH, 'male', 80, justPastNovice)
    expect(result.nextLevel).toBe('intermediate')
    expect(result.nextLoadKg).toBeGreaterThan(justPastNovice)
    // The number is actionable: it is the bar, in kg, not a ratio to work out.
    expect(result.nextLoadKg).toBeCloseTo(ladder[2] * 80, 0)
  })

  it('stops promising a next level at the top of the ladder', () => {
    const result = percentileForLift(BENCH, 'male', 80, 300)
    expect(result.nextLevel).toBeNull()
    expect(result.nextLoadKg).toBeNull()
  })
})

describe('strength profile', () => {
  const bests = {
    'barbell-bench-press': 100,
    'back-squat': 140,
    deadlift: 180,
    'overhead-press': 60,
  }

  it('summarises several lifts into one figure', () => {
    const profile = strengthProfile({ sex: 'male', bodyWeightKg: 80, bestE1rmByExercise: bests })
    expect(profile.lifts).toHaveLength(4)
    expect(profile.overall).toBeGreaterThan(0)
    expect(profile.overall).toBeLessThanOrEqual(99)
  })

  it('refuses to guess without a body weight, and says what is missing', () => {
    const profile = strengthProfile({ sex: 'male', bodyWeightKg: null, bestE1rmByExercise: bests })
    expect(profile.overall).toBeNull()
    expect(profile.lifts).toHaveLength(0)
    expect(profile.missingData.join(' ')).toMatch(/body weight/i)
  })

  it('flags an unspecified sex rather than silently picking one', () => {
    const profile = strengthProfile({ sex: 'unspecified', bodyWeightKg: 80, bestE1rmByExercise: bests })
    expect(profile.missingData.join(' ')).toMatch(/sex/i)
    expect(profile.confidence).not.toBe('high')
    // Still produces an answer — refusing outright would be worse.
    expect(profile.overall).not.toBeNull()
  })

  it('lands between the two ladders when sex is unspecified', () => {
    const male = strengthProfile({ sex: 'male', bodyWeightKg: 70, bestE1rmByExercise: bests }).overall!
    const female = strengthProfile({ sex: 'female', bodyWeightKg: 70, bestE1rmByExercise: bests }).overall!
    const either = strengthProfile({ sex: 'unspecified', bodyWeightKg: 70, bestE1rmByExercise: bests }).overall!
    expect(either).toBeGreaterThanOrEqual(Math.min(male, female))
    expect(either).toBeLessThanOrEqual(Math.max(male, female))
  })

  it('drops confidence when only one lift has data', () => {
    const profile = strengthProfile({
      sex: 'male',
      bodyWeightKg: 80,
      bestE1rmByExercise: { 'barbell-bench-press': 100 },
    })
    expect(profile.confidence).toBe('low')
    expect(profile.missingData.length).toBeGreaterThan(0)
  })

  it('always states what the number is compared against', () => {
    const profile = strengthProfile({ sex: 'male', bodyWeightKg: 80, bestE1rmByExercise: bests })
    expect(profile.caveat).toMatch(/log barbell lifts/i)
    expect(profile.caveat).toMatch(/height/i)
    for (const id of profile.citationIds) expect(CITATION_BY_ID[id], id).toBeDefined()
  })
})

describe('paying for improvement, not for being strong', () => {
  it('only rewards a band the first time it is crossed', () => {
    const profile = strengthProfile({
      sex: 'male',
      bodyWeightKg: 80,
      bestE1rmByExercise: { 'barbell-bench-press': 100 },
    })
    const band = bandFor(profile.lifts[0].percentile)!
    const first = newBandCrossings(profile, new Set())
    expect(first.map((c) => c.band)).toContain(band)

    const paid = new Set(first.map((c) => `${c.exerciseId}:${c.band}`))
    expect(newBandCrossings(profile, paid)).toHaveLength(0)
  })

  it('pays a beginner for the same climb it pays anyone else for', () => {
    // The point of banding: crossing 30 → 40 is worth what 80 → 90 is worth.
    // Anything else hands the biggest rewards to whoever walked in strongest.
    const weak = strengthProfile({
      sex: 'male',
      bodyWeightKg: 80,
      bestE1rmByExercise: { 'barbell-bench-press': 55 },
    })
    const strong = strengthProfile({
      sex: 'male',
      bodyWeightKg: 80,
      bestE1rmByExercise: { 'barbell-bench-press': 150 },
    })
    expect(newBandCrossings(weak, new Set())).toHaveLength(1)
    expect(newBandCrossings(strong, new Set())).toHaveLength(1)
  })

  it('reports no band below the first one', () => {
    expect(bandFor(4)).toBeNull()
    expect(bandFor(10)).toBe(10)
    expect(bandFor(99)).toBe(95)
  })
})

describe('who the percentile is against', () => {
  it('names the sex whose standards were used', () => {
    // A bare percentile is read as "against everyone". It is not — a woman at
    // the 70th is at the 70th of women, and the screen has to say so or the
    // number quietly means something else to half the people reading it.
    expect(comparisonGroupFor('female')).toMatch(/women/i)
    expect(comparisonGroupFor('male')).toMatch(/men/i)
    expect(comparisonGroupFor('female')).not.toEqual(comparisonGroupFor('male'))
  })

  it('admits when it had to average the two', () => {
    expect(comparisonGroupFor('unspecified')).toMatch(/both|average/i)
  })

  it('carries the group out on the profile, for every sex', () => {
    for (const sex of ['male', 'female', 'unspecified'] as const) {
      const profile = strengthProfile({
        sex,
        bodyWeightKg: 75,
        bestE1rmByExercise: { 'barbell-bench-press': 100 },
      })
      expect(profile.comparisonGroup, sex).toBe(comparisonGroupFor(sex))
      expect(profile.comparisonGroup.length).toBeGreaterThan(0)
    }
  })

  it('states the group even when there is nothing to compare yet', () => {
    // The no-body-weight early return is a separate code path, and an empty
    // group there would render as "percentile among ".
    const profile = strengthProfile({ sex: 'female', bodyWeightKg: null, bestE1rmByExercise: {} })
    expect(profile.comparisonGroup).toMatch(/women/i)
  })
})
