import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import {
  calculateEnergyTarget,
  calculateMacroTargets,
  defaultMealSlot,
  energyAdherence,
  estimateBmr,
  estimateMaintenance,
  groupByMeal,
  scaleServing,
  totalsForDate,
} from '@/engine/nutrition'
import type { Profile, ProteinEntry } from '@/types'

/**
 * The energy engine is the part of FORGED most likely to be wrong in a way that
 * matters, because a bad calorie floor is a safety problem rather than a
 * training-quality problem. These tests pin the caps and floors specifically.
 */

const BASE: Pick<
  Profile,
  | 'bodyWeightKg'
  | 'heightCm'
  | 'age'
  | 'sex'
  | 'dailyActivity'
  | 'daysPerWeek'
  | 'sessionMinutes'
  | 'weeklyRunKm'
  | 'goal'
  | 'proteinOverrideG'
  | 'calorieOverrideKcal'
> = {
  bodyWeightKg: 80,
  heightCm: 180,
  age: 30,
  sex: 'male',
  dailyActivity: 'desk',
  daysPerWeek: 4,
  sessionMinutes: 60,
  weeklyRunKm: 10,
  goal: 'general',
  proteinOverrideG: null,
  calorieOverrideKcal: null,
}

describe('estimateBmr', () => {
  it('matches Mifflin-St Jeor by hand for a male profile', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5
    expect(estimateBmr({ bodyWeightKg: 80, heightCm: 180, age: 30, sex: 'male' })).toBe(1780)
  })

  it('matches Mifflin-St Jeor by hand for a female profile', () => {
    // 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161
    expect(estimateBmr({ bodyWeightKg: 65, heightCm: 165, age: 30, sex: 'female' })).toBe(1370)
  })

  it('uses the midpoint constant when sex is not given, landing between the two', () => {
    const male = estimateBmr({ bodyWeightKg: 70, heightCm: 170, age: 35, sex: 'male' })
    const female = estimateBmr({ bodyWeightKg: 70, heightCm: 170, age: 35, sex: 'female' })
    const unknown = estimateBmr({ bodyWeightKg: 70, heightCm: 170, age: 35 })
    expect(unknown).toBeGreaterThan(female)
    expect(unknown).toBeLessThan(male)
  })

  it('never returns a negative value for extreme inputs', () => {
    expect(estimateBmr({ bodyWeightKg: 1, heightCm: 1, age: 120, sex: 'female' })).toBe(0)
  })
})

describe('estimateMaintenance', () => {
  it('adds training on top of non-exercise activity rather than baking it in', () => {
    const sedentary = estimateMaintenance({ ...BASE, daysPerWeek: 0, sessionMinutes: 0, weeklyRunKm: 0 })
    const training = estimateMaintenance(BASE)
    expect(sedentary.trainingKcal).toBe(0)
    expect(training.trainingKcal).toBeGreaterThan(150)
    expect(training.maintenanceKcal - sedentary.maintenanceKcal).toBe(training.trainingKcal)
  })

  it('scales with the daily activity setting', () => {
    const desk = estimateMaintenance({ ...BASE, dailyActivity: 'desk' })
    const physical = estimateMaintenance({ ...BASE, dailyActivity: 'physical' })
    expect(physical.maintenanceKcal).toBeGreaterThan(desk.maintenanceKcal)
    expect(desk.bmrKcal).toBe(physical.bmrKcal)
  })

  it('assumes a desk day when activity is unset rather than guessing high', () => {
    const unset = estimateMaintenance({ ...BASE, dailyActivity: undefined })
    const desk = estimateMaintenance({ ...BASE, dailyActivity: 'desk' })
    expect(unset.maintenanceKcal).toBe(desk.maintenanceKcal)
  })
})

describe('calculateEnergyTarget', () => {
  it('sets maintenance for a general-fitness goal', () => {
    const t = calculateEnergyTarget({ ...BASE, goal: 'general' })
    expect(t.targetKcal).toBe(t.maintenanceKcal)
    expect(t.deltaKcal).toBe(0)
    expect(t.rule).toBe('energy.maintenance')
  })

  it('puts a hypertrophy goal in a surplus, capped in absolute kcal', () => {
    const t = calculateEnergyTarget({ ...BASE, goal: 'hypertrophy' })
    expect(t.deltaKcal).toBeGreaterThan(0)
    expect(t.deltaKcal).toBeLessThanOrEqual(RULES.energy.maxSurplusKcal)

    // A very large person would blow past the cap on percentage alone.
    const big = calculateEnergyTarget({
      ...BASE,
      goal: 'hypertrophy',
      bodyWeightKg: 140,
      heightCm: 200,
      dailyActivity: 'physical',
    })
    expect(big.deltaKcal).toBe(RULES.energy.maxSurplusKcal)
    expect(big.rule).toBe('energy.surplus_capped')
    expect(big.clamped).toBe(true)
  })

  it('caps a fat-loss deficit at the configured weekly body-weight fraction', () => {
    const t = calculateEnergyTarget({ ...BASE, goal: 'fatloss', bodyWeightKg: 60, dailyActivity: 'physical' })
    const maxDaily = (60 * RULES.energy.maxWeeklyLossFraction * RULES.energy.kcalPerKgTissue) / 7
    expect(t.maintenanceKcal - t.targetKcal).toBeLessThanOrEqual(Math.ceil(maxDaily))
    expect(Math.abs(t.projectedWeeklyKg)).toBeLessThanOrEqual(
      60 * RULES.energy.maxWeeklyLossFraction + 0.01,
    )
  })

  it('never returns a target below the floor, whatever the goal', () => {
    // A small, older, sedentary profile is where a percentage deficit would
    // otherwise produce an unsafe number.
    const t = calculateEnergyTarget({
      ...BASE,
      goal: 'fatloss',
      sex: 'female',
      bodyWeightKg: 45,
      heightCm: 150,
      age: 65,
      daysPerWeek: 2,
      sessionMinutes: 30,
      weeklyRunKm: 0,
      dailyActivity: 'desk',
    })
    const floor = Math.max(
      Math.round(t.bmrKcal * RULES.energy.minFractionOfBmr),
      RULES.energy.absoluteFloorKcal.female,
    )
    expect(t.targetKcal).toBeGreaterThanOrEqual(floor)
  })

  it('honours a manual override and warns when the override is below the floor', () => {
    const t = calculateEnergyTarget({ ...BASE, calorieOverrideKcal: 2400 })
    expect(t.targetKcal).toBe(2400)
    expect(t.overridden).toBe(true)
    expect(t.warning).toBeNull()

    const low = calculateEnergyTarget({ ...BASE, calorieOverrideKcal: 900 })
    expect(low.targetKcal).toBe(900)
    expect(low.warning).toMatch(/dietitian|doctor/i)
  })

  it('carries the full transparency contract on every path', () => {
    const goals: Profile['goal'][] = ['hypertrophy', 'strength', 'recomp', 'fatloss', 'general']
    for (const goal of goals) {
      const t = calculateEnergyTarget({ ...BASE, goal })
      expect(t.reason.length).toBeGreaterThan(20)
      expect(t.rule).toMatch(/^energy\./)
      expect(['low', 'medium', 'high']).toContain(t.confidence)
      expect(Array.isArray(t.missingData)).toBe(true)
      expect(t.citationIds.length).toBeGreaterThan(0)
    }
  })

  it('reports lower confidence and names the gap when sex and activity are unknown', () => {
    const t = calculateEnergyTarget({ ...BASE, sex: undefined, dailyActivity: undefined })
    expect(t.confidence).toBe('low')
    expect(t.missingData.join(' ')).toMatch(/sex/i)
    expect(t.missingData.join(' ')).toMatch(/activity/i)
  })

  it('is deterministic', () => {
    const a = calculateEnergyTarget({ ...BASE, goal: 'fatloss' })
    const b = calculateEnergyTarget({ ...BASE, goal: 'fatloss' })
    expect(a).toEqual(b)
  })
})

describe('calculateMacroTargets', () => {
  it('reconstructs the calorie target from the three macros', () => {
    const plan = calculateMacroTargets(BASE)
    const { kcalPerG } = RULES.energy
    const fromMacros =
      plan.targets.proteinG * kcalPerG.protein +
      plan.targets.carbsG * kcalPerG.carbs +
      plan.targets.fatG * kcalPerG.fat
    // Rounding each macro to whole grams costs a few kcal; anything larger
    // would mean the split is genuinely wrong.
    expect(Math.abs(fromMacros - plan.targets.kcal)).toBeLessThanOrEqual(6)
  })

  it('respects the dietary fat floor and lands above it by default', () => {
    const plan = calculateMacroTargets(BASE)
    expect(plan.targets.fatG).toBeGreaterThanOrEqual(
      Math.floor(BASE.bodyWeightKg * RULES.energy.minFatGPerKg),
    )
    expect(plan.targets.fatG * RULES.energy.kcalPerG.fat).toBeGreaterThan(
      plan.targets.kcal * RULES.energy.minFatPctOfKcal,
    )
    expect(plan.split.fat).toBeGreaterThanOrEqual(
      Math.round(RULES.energy.targetFatPctOfKcal * 100) - 2,
    )
  })

  it('lets the fat floor bind on a low target rather than dropping under it', () => {
    const plan = calculateMacroTargets({
      ...BASE,
      goal: 'fatloss',
      bodyWeightKg: 120,
      calorieOverrideKcal: 1800,
    })
    // 0.8 g/kg on 120 kg is 96 g, which is well above 27% of 1800 kcal.
    expect(plan.targets.fatG).toBeGreaterThanOrEqual(90)
  })

  it('leaves the protein target to the protein engine, including the override', () => {
    const plan = calculateMacroTargets({ ...BASE, proteinOverrideG: 190 })
    expect(plan.targets.proteinG).toBe(190)
  })

  it('never produces negative carbohydrate when protein and fat eat the budget', () => {
    const plan = calculateMacroTargets({
      ...BASE,
      goal: 'fatloss',
      proteinOverrideG: 300,
      calorieOverrideKcal: 1400,
    })
    expect(plan.targets.carbsG).toBeGreaterThanOrEqual(0)
    expect(plan.targets.fatG).toBeGreaterThanOrEqual(0)
  })

  it('reports a split that adds up to roughly 100 percent', () => {
    const plan = calculateMacroTargets(BASE)
    const sum = plan.split.protein + plan.split.carbs + plan.split.fat
    expect(sum).toBeGreaterThanOrEqual(98)
    expect(sum).toBeLessThanOrEqual(102)
  })
})

// ---------------------------------------------------------------------------
// Logging maths
// ---------------------------------------------------------------------------

function entry(over: Partial<ProteinEntry>): ProteinEntry {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-01-05',
    label: 'Food',
    grams: 20,
    createdAt: 0,
    ...over,
  }
}

describe('daily totals', () => {
  it('sums every macro for the requested date only', () => {
    const entries = [
      entry({ grams: 40, kcal: 300, carbsG: 10, fatG: 5 }),
      entry({ grams: 20, kcal: 150, carbsG: 20, fatG: 2 }),
      entry({ date: '2026-01-06', grams: 99, kcal: 999 }),
    ]
    const totals = totalsForDate(entries, '2026-01-05')
    expect(totals.proteinG).toBe(60)
    expect(totals.kcal).toBe(450)
    expect(totals.carbsG).toBe(30)
    expect(totals.fatG).toBe(7)
    expect(totals.hasUnknownEnergy).toBe(false)
  })

  it('flags a day containing an entry with no energy recorded', () => {
    const totals = totalsForDate([entry({ grams: 30 })], '2026-01-05')
    expect(totals.kcal).toBe(0)
    expect(totals.hasUnknownEnergy).toBe(true)
  })

  it('files entries saved before meal slots existed under snacks rather than dropping them', () => {
    const groups = groupByMeal([entry({ grams: 30 }), entry({ grams: 10, meal: 'breakfast' })])
    const snack = groups.find((g) => g.slot === 'snack')!
    const breakfast = groups.find((g) => g.slot === 'breakfast')!
    expect(snack.entries).toHaveLength(1)
    expect(breakfast.totals.proteinG).toBe(10)
    expect(groups.map((g) => g.slot)).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
  })
})

describe('defaultMealSlot', () => {
  it('picks the slot most likely to be right for the time of day', () => {
    expect(defaultMealSlot(7)).toBe('breakfast')
    expect(defaultMealSlot(13)).toBe('lunch')
    expect(defaultMealSlot(19)).toBe('dinner')
    expect(defaultMealSlot(23)).toBe('snack')
  })
})

describe('energyAdherence', () => {
  const dates = ['2026-01-01', '2026-01-02', '2026-01-03']

  it('counts a day inside the tolerance band as on target', () => {
    const entries = [
      entry({ date: '2026-01-01', kcal: 2500 }),
      entry({ date: '2026-01-02', kcal: 2700 }),
      entry({ date: '2026-01-03', kcal: 1200 }),
    ]
    const a = energyAdherence(entries, dates, 2600)
    expect(a.daysOnTarget).toBe(2)
    expect(a.daysTracked).toBe(3)
  })

  it('treats an unlogged day as unknown, not as a failure', () => {
    const a = energyAdherence([entry({ date: '2026-01-01', kcal: 2600 })], dates, 2600)
    expect(a.daysTracked).toBe(1)
    expect(a.daysOnTarget).toBe(1)
    expect(a.averageKcal).toBe(2600)
  })
})

describe('scaleServing', () => {
  it('scales every macro and leaves unknown values unknown', () => {
    const scaled = scaleServing({ proteinG: 20, kcal: 200, carbsG: 5 }, 1.5)
    expect(scaled.proteinG).toBe(30)
    expect(scaled.kcal).toBe(300)
    expect(scaled.carbsG).toBe(7.5)
    expect(scaled.fatG).toBeUndefined()
  })

  it('handles a half serving without floating-point noise', () => {
    expect(scaleServing({ proteinG: 46, kcal: 248 }, 0.5)).toEqual({
      proteinG: 23,
      kcal: 124,
      carbsG: undefined,
      fatG: undefined,
    })
  })
})
