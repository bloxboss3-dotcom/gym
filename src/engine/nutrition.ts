import { RULES } from '@/config/rules'
import { interpolate } from '@/lib/interpolate'
import { calculateProteinTarget } from '@/engine/protein'
import type { Confidence } from '@/engine/progression'
import type { IsoDate, MealSlot, Profile, ProteinEntry, Sex } from '@/types'

/**
 * The energy and macro engine.
 *
 * Deterministic and dependency-free, exactly like the progression engine: plain
 * data in, plain data out, no model call anywhere. Every threshold lives in
 * `src/config/rules.ts`.
 *
 * The honesty rule that governs this whole file: a predicted calorie target is
 * an ESTIMATE with roughly ±10% individual error before you even account for
 * logging accuracy. FORGED gives you a defensible starting number, tells you
 * how it got there, and expects you to adjust it from your own weight trend.
 * It does not claim to know your metabolic rate, and it never prescribes an
 * aggressive deficit.
 *
 * The protein target is NOT recalculated here — it comes from
 * `engine/protein.ts` unchanged, so adding calories did not disturb the
 * evidence-based protein logic or its tests.
 */

export interface MacroTargets {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface MacroTotals extends MacroTargets {
  /** True when at least one entry in the day had no energy recorded. */
  hasUnknownEnergy: boolean
}

export interface EnergyTarget {
  /** Estimated resting metabolic rate, Mifflin-St Jeor. */
  bmrKcal: number
  /** BMR + non-exercise activity + estimated training cost. */
  maintenanceKcal: number
  targetKcal: number
  /** targetKcal − maintenanceKcal. Negative is a deficit. */
  deltaKcal: number
  /** Roughly what the delta implies per week, in kg. Estimate only. */
  projectedWeeklyKg: number
  overridden: boolean
  /** True when a cap or floor moved the number away from the goal offset. */
  clamped: boolean
  reason: string
  reasonTemplate: string
  reasonVars: Record<string, string | number>
  rule: string
  confidence: Confidence
  missingData: string[]
  warning: string | null
  citationIds: string[]
}

export interface NutritionPlan {
  energy: EnergyTarget
  targets: MacroTargets
  /** Percent of energy from each macro, for the ring labels. */
  split: { protein: number; carbs: number; fat: number }
  proteinRationale: string
  citationIds: string[]
}

// ---------------------------------------------------------------------------
// Resting and maintenance energy
// ---------------------------------------------------------------------------

/**
 * Mifflin-St Jeor resting metabolic rate.
 *
 * Chosen over Harris-Benedict because it is the equation ADA/Academy of
 * Nutrition and Dietetics evidence analysis found most accurate in non-obese
 * and obese adults. It still misses an individual by ~10% either way.
 */
export function estimateBmr(input: {
  bodyWeightKg: number
  heightCm: number
  age: number
  sex?: Sex
}): number {
  const sex: Sex = input.sex ?? 'unspecified'
  const constant = RULES.energy.mifflinConstant[sex] ?? RULES.energy.mifflinConstant.unspecified
  const bmr = 10 * input.bodyWeightKg + 6.25 * input.heightCm - 5 * input.age + constant
  return Math.max(0, Math.round(bmr))
}

/**
 * Maintenance energy.
 *
 * Deliberately split into two parts rather than using a single "activity
 * factor". The classic ladder bakes exercise into the multiplier, which
 * double-counts it for someone who also tells us their training schedule — the
 * commonest way these calculators over-shoot for lifters.
 */
export function estimateMaintenance(
  profile: Pick<
    Profile,
    | 'bodyWeightKg'
    | 'heightCm'
    | 'age'
    | 'sex'
    | 'dailyActivity'
    | 'daysPerWeek'
    | 'sessionMinutes'
    | 'weeklyRunKm'
  >,
): { bmrKcal: number; neatKcal: number; trainingKcal: number; maintenanceKcal: number } {
  const bmrKcal = estimateBmr(profile)
  const activity = profile.dailyActivity ?? 'desk'
  const multiplier =
    RULES.energy.activityMultiplier[activity] ?? RULES.energy.activityMultiplier.desk
  const neatKcal = Math.round(bmrKcal * multiplier) - bmrKcal

  const liftingPerWeek =
    Math.max(0, profile.daysPerWeek) *
    Math.max(0, profile.sessionMinutes) *
    RULES.energy.kcalPerLiftingMinute
  const runningPerWeek =
    Math.max(0, profile.weeklyRunKm) * profile.bodyWeightKg * RULES.energy.kcalPerKgPerKm
  const trainingKcal = Math.round((liftingPerWeek + runningPerWeek) / 7)

  return {
    bmrKcal,
    neatKcal,
    trainingKcal,
    maintenanceKcal: bmrKcal + neatKcal + trainingKcal,
  }
}

// ---------------------------------------------------------------------------
// Energy target
// ---------------------------------------------------------------------------

const GOAL_WORD: Record<Profile['goal'], string> = {
  hypertrophy: 'building muscle',
  strength: 'getting stronger',
  recomp: 'a slow recomposition',
  fatloss: 'losing fat while keeping muscle',
  general: 'general fitness',
}

/**
 * Daily energy target.
 *
 * Rule order, and it is deliberately boring:
 *   1. A manual override always wins, and is only warned about if it is unsafe.
 *   2. Otherwise apply the goal offset as a fraction of maintenance.
 *   3. Cap a surplus in absolute kcal so "bulking" cannot run away.
 *   4. Cap a deficit at the configured weekly body-weight fraction.
 *   5. Floor the result at BMR × 1.1 and at the absolute floor, whichever is
 *      higher. Nothing is allowed below that, ever, for any goal.
 */
export function calculateEnergyTarget(
  profile: Pick<
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
    | 'calorieOverrideKcal'
  >,
): EnergyTarget {
  const { bmrKcal, maintenanceKcal } = estimateMaintenance(profile)
  const sex: Sex = profile.sex ?? 'unspecified'

  const floorKcal = Math.max(
    Math.round(bmrKcal * RULES.energy.minFractionOfBmr),
    RULES.energy.absoluteFloorKcal[sex] ?? RULES.energy.absoluteFloorKcal.unspecified,
  )

  const missingData: string[] = []
  if (!profile.sex || profile.sex === 'unspecified') {
    missingData.push(
      'Biological sex not given, so the estimate uses the midpoint of the two constants — expect a wider margin.',
    )
  }
  if (!profile.dailyActivity) {
    missingData.push('Daily activity not set, so a desk-based day was assumed.')
  }

  const override = profile.calorieOverrideKcal
  if (typeof override === 'number' && override > 0) {
    const targetKcal = Math.round(override)
    const deltaKcal = targetKcal - maintenanceKcal
    return {
      bmrKcal,
      maintenanceKcal,
      targetKcal,
      deltaKcal,
      projectedWeeklyKg: projectedWeeklyKg(deltaKcal),
      overridden: true,
      clamped: false,
      reason: `Using your manual target of ${targetKcal} kcal. For reference, FORGED estimates your maintenance at about ${maintenanceKcal} kcal.`,
      reasonTemplate:
        'Using your manual target of {target} kcal. For reference, FORGED estimates your maintenance at about {maintenance} kcal.',
      reasonVars: { target: targetKcal, maintenance: maintenanceKcal },
      rule: 'energy.manual_override',
      confidence: 'low',
      missingData,
      warning:
        targetKcal < floorKcal
          ? `${targetKcal} kcal is below the ${floorKcal} kcal floor FORGED would ever suggest. Very low intakes make it hard to get enough protein and micronutrients and are worth discussing with a registered dietitian or your doctor.`
          : null,
      citationIds: ['mifflin-1990-bmr'],
    }
  }

  const offsetPct = RULES.energy.goalOffsetPct[profile.goal] ?? 0
  const rawTarget = maintenanceKcal * (1 + offsetPct)
  let targetKcal = Math.round(rawTarget)
  let clamped = false
  let rule = offsetPct === 0 ? 'energy.maintenance' : offsetPct > 0 ? 'energy.surplus' : 'energy.deficit'

  // 3. Surplus cap.
  if (offsetPct > 0 && targetKcal - maintenanceKcal > RULES.energy.maxSurplusKcal) {
    targetKcal = maintenanceKcal + RULES.energy.maxSurplusKcal
    clamped = true
    rule = 'energy.surplus_capped'
  }

  // 4. Deficit cap, expressed as a rate of body-weight loss.
  if (offsetPct < 0) {
    const maxDailyDeficit =
      (profile.bodyWeightKg * RULES.energy.maxWeeklyLossFraction * RULES.energy.kcalPerKgTissue) / 7
    if (maintenanceKcal - targetKcal > maxDailyDeficit) {
      targetKcal = Math.round(maintenanceKcal - maxDailyDeficit)
      clamped = true
      rule = 'energy.deficit_capped'
    }
  }

  // 5. Absolute floor. Applies last so nothing can slip underneath it.
  let warning: string | null = null
  if (targetKcal < floorKcal) {
    targetKcal = floorKcal
    clamped = true
    rule = 'energy.floored'
    warning =
      'Your goal implied a lower intake than FORGED is willing to suggest, so the target was raised to the floor. If you want to lose weight faster than this, do it with a registered dietitian rather than by eating less.'
  }

  const deltaKcal = targetKcal - maintenanceKcal
  const direction =
    deltaKcal > 20 ? 'a small surplus' : deltaKcal < -20 ? 'a moderate deficit' : 'maintenance'

  const reasonTemplate =
    'Estimated maintenance is about {maintenance} kcal — {bmr} kcal at rest, plus your daily activity, plus roughly {training} kcal a day of training. ' +
    'For {goal}, FORGED sets {direction}: {target} kcal.' +
    (clamped ? ' The number was adjusted to stay inside the safe bounds in the rules file.' : '')
  const reasonVars = {
    maintenance: maintenanceKcal,
    bmr: bmrKcal,
    training: estimateMaintenance(profile).trainingKcal,
    goal: GOAL_WORD[profile.goal],
    direction,
    target: targetKcal,
  }
  const reason = interpolate(reasonTemplate, reasonVars)

  return {
    bmrKcal,
    maintenanceKcal,
    targetKcal,
    deltaKcal,
    projectedWeeklyKg: projectedWeeklyKg(deltaKcal),
    reasonTemplate,
    reasonVars,
    overridden: false,
    clamped,
    reason,
    rule,
    // Never "high": a predicted target you have not yet checked against a real
    // weight trend does not deserve that word.
    confidence: missingData.length ? 'low' : 'medium',
    missingData,
    warning,
    citationIds:
      offsetPct < 0
        ? ['mifflin-1990-bmr', 'hall-2012-energy-dynamics', 'garthe-2011-loss-rate']
        : ['mifflin-1990-bmr', 'hall-2012-energy-dynamics'],
  }
}

function projectedWeeklyKg(deltaKcal: number): number {
  return Number(((deltaKcal * 7) / RULES.energy.kcalPerKgTissue).toFixed(2))
}

// ---------------------------------------------------------------------------
// Macro split
// ---------------------------------------------------------------------------

/**
 * Split the energy target into protein, fat and carbohydrate.
 *
 * Order matters and reflects what the evidence actually supports:
 *   protein first (it is the macro with a real target), then a fat floor for
 *   hormonal and micronutrient reasons, then carbohydrate takes the remainder
 *   because that is the macro that fuels the training.
 */
export function calculateMacroTargets(
  profile: Pick<
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
  >,
): NutritionPlan {
  const energy = calculateEnergyTarget(profile)
  const protein = calculateProteinTarget(profile)
  const { kcalPerG } = RULES.energy

  const proteinG = protein.targetG
  const proteinKcal = proteinG * kcalPerG.protein

  const fatFloorG = Math.max(
    profile.bodyWeightKg * RULES.energy.minFatGPerKg,
    (energy.targetKcal * RULES.energy.minFatPctOfKcal) / kcalPerG.fat,
  )
  // Default sits above the floor; the floor only binds on a low target.
  let fatG = Math.round(
    Math.max(fatFloorG, (energy.targetKcal * RULES.energy.targetFatPctOfKcal) / kcalPerG.fat),
  )

  // If protein plus the fat floor already exceeds the energy target — possible
  // on a low target with a manual protein override — shave fat back to its own
  // floor rather than returning negative carbohydrate.
  let carbKcal = energy.targetKcal - proteinKcal - fatG * kcalPerG.fat
  if (carbKcal < 0) {
    const absoluteFatFloor = Math.round(
      (energy.targetKcal * RULES.energy.minFatPctOfKcal) / kcalPerG.fat,
    )
    fatG = Math.max(0, Math.min(fatG, absoluteFatFloor))
    carbKcal = Math.max(0, energy.targetKcal - proteinKcal - fatG * kcalPerG.fat)
  }
  const carbsG = Math.max(0, Math.round(carbKcal / kcalPerG.carbs))

  const targets: MacroTargets = {
    kcal: energy.targetKcal,
    proteinG,
    carbsG,
    fatG,
  }

  const total = Math.max(1, proteinKcal + carbsG * kcalPerG.carbs + fatG * kcalPerG.fat)
  return {
    energy,
    targets,
    split: {
      protein: Math.round((proteinKcal / total) * 100),
      carbs: Math.round(((carbsG * kcalPerG.carbs) / total) * 100),
      fat: Math.round(((fatG * kcalPerG.fat) / total) * 100),
    },
    proteinRationale: protein.rationale,
    citationIds: [...new Set([...energy.citationIds, ...protein.citationIds])],
  }
}

// ---------------------------------------------------------------------------
// Totals and adherence
// ---------------------------------------------------------------------------

const EMPTY: MacroTotals = {
  kcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  hasUnknownEnergy: false,
}

export function totalsForEntries(entries: ProteinEntry[]): MacroTotals {
  return entries.reduce<MacroTotals>(
    (acc, e) => ({
      kcal: acc.kcal + (e.kcal ?? 0),
      proteinG: acc.proteinG + e.grams,
      carbsG: acc.carbsG + (e.carbsG ?? 0),
      fatG: acc.fatG + (e.fatG ?? 0),
      // A logged food with protein but no energy would silently understate the
      // day's calories, so the UI needs to know it happened.
      hasUnknownEnergy: acc.hasUnknownEnergy || (e.grams > 0 && e.kcal == null),
    }),
    { ...EMPTY },
  )
}

export function totalsForDate(entries: ProteinEntry[], date: IsoDate): MacroTotals {
  return totalsForEntries(entries.filter((e) => e.date === date))
}

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

/** Group a day's entries into the four meal slots, in a stable order. */
export function groupByMeal(
  entries: ProteinEntry[],
): { slot: MealSlot; entries: ProteinEntry[]; totals: MacroTotals }[] {
  return MEAL_SLOTS.map((slot) => {
    // Anything logged before meal slots existed lands in Snacks rather than
    // vanishing from the day view.
    const inSlot = entries.filter((e) => (e.meal ?? 'snack') === slot)
    return { slot, entries: inSlot, totals: totalsForEntries(inSlot) }
  })
}

/**
 * Which meal slot a log at this time of day most likely belongs to. Purely a
 * default — the user can always change it, and getting it right most of the
 * time removes a tap from every single log.
 */
export function defaultMealSlot(hour: number): MealSlot {
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

export interface EnergyAdherence {
  daysTracked: number
  daysOnTarget: number
  averageKcal: number
  perDay: { date: IsoDate; kcal: number; onTarget: boolean }[]
}

/**
 * Weekly energy adherence.
 *
 * Same principle as protein: a day with nothing logged is unknown, not a
 * failure, and it is excluded from the denominator.
 */
export function energyAdherence(
  entries: ProteinEntry[],
  dates: IsoDate[],
  targetKcal: number,
): EnergyAdherence {
  const tolerance = RULES.energy.kcalAdherenceTolerance
  const perDay = dates.map((date) => {
    const kcal = Math.round(totalsForDate(entries, date).kcal)
    const onTarget =
      targetKcal > 0 &&
      kcal > 0 &&
      Math.abs(kcal - targetKcal) <= targetKcal * tolerance
    return { date, kcal, onTarget }
  })
  const tracked = perDay.filter((d) => d.kcal > 0)
  return {
    daysTracked: tracked.length,
    daysOnTarget: perDay.filter((d) => d.onTarget).length,
    averageKcal: tracked.length
      ? Math.round(tracked.reduce((s, d) => s + d.kcal, 0) / tracked.length)
      : 0,
    perDay,
  }
}

export function remainingKcal(targetKcal: number, consumedKcal: number): number {
  return Math.round(targetKcal - consumedKcal)
}

/** Scale a food's macros by a serving multiplier, rounded for display. */
export function scaleServing(
  food: { proteinG: number; kcal?: number; carbsG?: number; fatG?: number },
  servings: number,
): { proteinG: number; kcal?: number; carbsG?: number; fatG?: number } {
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    proteinG: round(food.proteinG * servings),
    kcal: food.kcal == null ? undefined : Math.round(food.kcal * servings),
    carbsG: food.carbsG == null ? undefined : round(food.carbsG * servings),
    fatG: food.fatG == null ? undefined : round(food.fatG * servings),
  }
}
