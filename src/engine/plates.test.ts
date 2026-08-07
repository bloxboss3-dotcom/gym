import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BAR,
  PLATE_LADDER,
  barKgFor,
  describePlan,
  implementCount,
  planPlates,
  platesFor,
  totalFromPlates,
  weightHint,
  weightLabel,
} from '@/engine/plates'
import { volumeLoad } from '@/engine/stats'
import { toDisplay } from '@/engine/units'
import { defaultSettings } from '@/db/defaults'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import type { LoggedSet } from '@/types'

/**
 * The plate calculator exists so nobody does arithmetic between sets. If it is
 * wrong it is worse than useless — you load the wrong weight and the whole
 * progression record is polluted. These tests pin the arithmetic hard.
 */

const kg = (totalDisplay: number, plates = PLATE_LADDER.kg, barDisplay = 20) =>
  planPlates({ totalDisplay, barDisplay, plates, units: 'kg' })
const lb = (totalDisplay: number, plates = PLATE_LADDER.lb, barDisplay = 45) =>
  planPlates({ totalDisplay, barDisplay, plates, units: 'lb' })

describe('planPlates — kilograms', () => {
  it('loads a clean 100 kg', () => {
    const plan = kg(100)
    expect(plan.exact).toBe(true)
    expect(plan.total).toBe(100)
    // 40 kg per side: 25 + 15
    expect(plan.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ])
  })

  it('uses the fewest plates, largest first', () => {
    const plan = kg(140) // 60 per side
    expect(plan.exact).toBe(true)
    expect(plan.perSide).toEqual([
      { plate: 25, count: 2 },
      { plate: 10, count: 1 },
    ])
  })

  it('returns an empty bar for the bar weight itself', () => {
    const plan = kg(20)
    expect(plan.exact).toBe(true)
    expect(plan.perSide).toEqual([])
    expect(describePlan(plan, 'kg')).toBe('Empty bar (20 kg)')
  })

  it('flags a target lighter than the bar instead of returning nonsense', () => {
    const plan = kg(15)
    expect(plan.belowBar).toBe(true)
    expect(plan.perSide).toEqual([])
    expect(plan.total).toBe(20)
    expect(describePlan(plan, 'kg')).toMatch(/Lighter than the 20 kg bar/)
  })

  it('handles the smallest plate', () => {
    const plan = kg(22.5)
    expect(plan.exact).toBe(true)
    expect(plan.perSide).toEqual([{ plate: 1.25, count: 1 }])
  })

  it('reports the closest loadable weight when the target is impossible', () => {
    // 21 kg needs 0.5 kg per side; the lightest plate is 1.25.
    const plan = kg(21)
    expect(plan.exact).toBe(false)
    expect(plan.total).toBe(20)
    expect(plan.note).toMatch(/Closest loadable weight is 20 kg/)
    expect(plan.note).toMatch(/1 kg short of 21/)
  })

  it('respects a restricted plate set', () => {
    const plan = kg(100, [20, 10]) // only 20s and 10s
    expect(plan.perSide).toEqual([
      { plate: 20, count: 2 },
    ])
    expect(plan.total).toBe(100)
    expect(plan.exact).toBe(true)
  })

  it('never returns a fractional plate count', () => {
    for (let total = 20; total <= 300; total += 2.5) {
      const plan = kg(total)
      for (const group of plan.perSide) {
        expect(Number.isInteger(group.count)).toBe(true)
        expect(group.count).toBeGreaterThan(0)
      }
    }
  })
})

describe('planPlates — pounds', () => {
  it('loads the classic 225', () => {
    const plan = lb(225)
    expect(plan.exact).toBe(true)
    expect(plan.perSide).toEqual([{ plate: 45, count: 2 }])
    expect(describePlan(plan, 'lb')).toBe('45 bar + 2×45 per side')
  })

  it('loads 135 as one plate a side', () => {
    const plan = lb(135)
    expect(plan.perSide).toEqual([{ plate: 45, count: 1 }])
    expect(plan.exact).toBe(true)
  })

  it('mixes plates for 185', () => {
    const plan = lb(185) // 70 per side: 45 + 25
    expect(plan.exact).toBe(true)
    expect(plan.perSide).toEqual([
      { plate: 45, count: 1 },
      { plate: 25, count: 1 },
    ])
  })

  it('uses a 35 when it beats the alternative', () => {
    const plan = lb(115) // 35 per side
    expect(plan.exact).toBe(true)
    expect(plan.perSide).toEqual([{ plate: 35, count: 1 }])
  })
})

describe('totalFromPlates', () => {
  it('is the exact inverse of planPlates for loadable weights', () => {
    for (const total of [65, 95, 135, 185, 225, 315, 405]) {
      const plan = lb(total)
      expect(plan.exact).toBe(true)
      expect(totalFromPlates(plan.perSide, 45)).toBe(total)
    }
  })

  it('returns the bare bar for no plates', () => {
    expect(totalFromPlates([], 20)).toBe(20)
  })

  it('doubles the per-side selection', () => {
    expect(totalFromPlates([{ plate: 20, count: 1 }], 20)).toBe(60)
  })
})

describe('implementCount', () => {
  it('counts a dumbbell pair twice and everything else once', () => {
    expect(implementCount('dumbbell_pair')).toBe(2)
    expect(implementCount('dumbbell_single')).toBe(1)
    expect(implementCount('barbell')).toBe(1)
    expect(implementCount('stack')).toBe(1)
    expect(implementCount('bodyweight')).toBe(1)
    expect(implementCount('other')).toBe(1)
  })
})

describe('volume load with paired implements', () => {
  const sets: LoggedSet[] = [
    { id: 'a', weightKg: 30, reps: 10, rir: 2, warmup: false, completedAt: 0 },
    { id: 'b', weightKg: 30, reps: 10, rir: 1, warmup: false, completedAt: 0 },
  ]

  it('counts both dumbbells', () => {
    expect(volumeLoad(sets, 1)).toBe(600)
    // Two 30 kg dumbbells is 60 kg leaving the floor on every rep.
    expect(volumeLoad(sets, 2)).toBe(1200)
  })

  it('ignores warm-up sets regardless of the multiplier', () => {
    const withWarmup: LoggedSet[] = [
      ...sets,
      { id: 'w', weightKg: 10, reps: 10, rir: 5, warmup: true, completedAt: 0 },
    ]
    expect(volumeLoad(withWarmup, 2)).toBe(1200)
  })
})

describe('weight labelling', () => {
  it('says exactly what the number means for every loading style', () => {
    expect(weightLabel('barbell', 'lb')).toBe('Total on the bar (lb)')
    expect(weightLabel('dumbbell_pair', 'lb')).toBe('Per dumbbell (lb)')
    expect(weightLabel('stack', 'kg')).toBe('Stack setting (kg)')
    expect(weightLabel('bodyweight', 'kg')).toBe('Added weight (kg)')
  })

  it('says when a movement is trained one side at a time', () => {
    // A single-arm cable lateral raise: the pin is the pin, but the SET is
    // per side, which is a different question and needs saying.
    expect(weightHint('stack', 12, 'kg', true)).toMatch(/One side at a time/)
    expect(weightHint('dumbbell_single', 30, 'lb', true)).toMatch(/One side at a time/)
    // A machine lateral raise moves both arms on one stack — nothing to add.
    expect(weightHint('stack', 12, 'kg', false)).toBeNull()
    // Loading style still wins where it has something more specific to say.
    expect(weightHint('barbell', 100, 'kg', true)).toBe('Bar included')
  })

  it('spells out the pair total so nobody has to wonder', () => {
    expect(weightHint('dumbbell_pair', 30, 'lb')).toBe('Two dumbbells — 60 lb total')
    expect(weightHint('dumbbell_pair', 0, 'lb')).toMatch(/number on one dumbbell/)
    expect(weightHint('barbell', 100, 'kg')).toBe('Bar included')
    expect(weightHint('bodyweight', 0, 'kg')).toBe('Body weight only')
    expect(weightHint('stack', 50, 'kg')).toBeNull()
  })
})

describe('defaults', () => {
  it('uses a standard Olympic bar in both units', () => {
    expect(DEFAULT_BAR.kg).toBe(20)
    expect(DEFAULT_BAR.lb).toBe(45)
  })

  it('ships plate ladders that a real gym stocks, largest first', () => {
    for (const units of ['kg', 'lb'] as const) {
      const ladder = PLATE_LADDER[units]
      expect(ladder.length).toBeGreaterThan(3)
      expect([...ladder].sort((a, b) => b - a)).toEqual(ladder)
    }
  })
})

describe('unit-native gym hardware', () => {
  // Regression: seeding `barbellKg: 20` and kg plates into default settings
  // gave a pound user a "44.1 lb bar" and "55.12 lb plates" — the same literal
  // kg→lb conversion bug that once produced 44.1 lb load increments.
  const bare = defaultSettings()

  it('gives a pound gym a 45 lb bar and real pound plates', () => {
    expect(toDisplay(barKgFor(null, bare, 'lb'), 'lb')).toBeCloseTo(45, 1)
    expect(platesFor(bare, 'lb')).toEqual([45, 35, 25, 10, 5, 2.5])
  })

  it('gives a kilo gym a 20 kg bar and real kilo plates', () => {
    expect(toDisplay(barKgFor(null, bare, 'kg'), 'kg')).toBeCloseTo(20, 2)
    expect(platesFor(bare, 'kg')).toEqual([25, 20, 15, 10, 5, 2.5, 1.25])
  })

  it('never suggests a plate that is not a round number in the display unit', () => {
    for (const units of ['kg', 'lb'] as const) {
      for (const plate of platesFor(bare, units)) {
        // Every real plate is a multiple of the smallest fractional plate.
        expect(Math.round(plate * 4) / 4).toBe(plate)
      }
    }
  })

  it('honours an explicitly customised bar and plate set', () => {
    const custom = { ...bare, barbellKg: 15, plateInventoryKg: [20, 10] }
    expect(barKgFor(null, custom, 'kg')).toBe(15)
    expect(platesFor(custom, 'kg')).toEqual([20, 10])
  })

  it('produces loadable pound weights end to end from defaults', () => {
    const bar = toDisplay(barKgFor(null, bare, 'lb'), 'lb')
    const plan = planPlates({
      totalDisplay: 225,
      barDisplay: bar,
      plates: platesFor(bare, 'lb'),
      units: 'lb',
    })
    expect(plan.exact).toBe(true)
    expect(describePlan(plan, 'lb')).toBe('45 bar + 2×45 per side')
  })

  it('respects a per-exercise bar override such as an EZ or trap bar', () => {
    const trapBar = { barKg: 25 }
    expect(barKgFor(trapBar, bare, 'kg')).toBe(25)
    // The override wins over the user's default bar, not the other way round.
    expect(barKgFor(trapBar, { ...bare, barbellKg: 20 }, 'kg')).toBe(25)
  })
})

describe('exercise library integrity', () => {
  it('gives every movement a loading style', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      expect(exercise.loading, exercise.id).toBeTruthy()
    }
  })

  it('keeps loading style and set style independent', () => {
    // `loading` describes the implement; `unilateral` describes the set. They
    // are orthogonal, and the library has to prove it in both directions —
    // this pairing was previously conflated, which left `unilateral` meaning
    // "loaded per hand" and therefore useless.
    const byId = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e]))

    // Two dumbbells, both moving at once → not one side at a time.
    for (const id of ['dumbbell-bench-press', 'incline-dumbbell-press', 'dumbbell-shoulder-press', 'lateral-raise']) {
      const exercise = byId.get(id)!
      expect(exercise.loading, id).toBe('dumbbell_pair')
      expect(exercise.unilateral, id).toBe(false)
    }

    // Two dumbbells, one LEG at a time → both flags true, legitimately.
    const bulgarian = byId.get('bulgarian-split-squat')!
    expect(bulgarian.loading).toBe('dumbbell_pair')
    expect(bulgarian.unilateral).toBe(true)

    // A stack can be either: one arm on a cable, both arms on a machine.
    expect(byId.get('cable-lateral-raise')!.unilateral).toBe(true)
    expect(byId.get('machine-lateral-raise')!.unilateral).toBe(false)
  })

  it('offers a dumbbell, cable and machine route to the side delts', () => {
    const lateral = EXERCISE_LIBRARY.filter((e) => e.contributions.side_delts === 1)
    const styles = new Set(lateral.flatMap((e) => e.equipment))
    expect(styles.has('dumbbell')).toBe(true)
    expect(styles.has('cable')).toBe(true)
    expect(styles.has('machine')).toBe(true)
  })

  it('keeps alternative ids pointing at movements that exist', () => {
    const ids = new Set(EXERCISE_LIBRARY.map((e) => e.id))
    for (const exercise of EXERCISE_LIBRARY) {
      for (const alt of exercise.alternatives ?? []) {
        expect(ids.has(alt), `${exercise.id} → ${alt}`).toBe(true)
      }
    }
  })
})
