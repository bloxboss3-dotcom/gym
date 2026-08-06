import { RULES } from '@/config/rules'
import type { Goal, IsoDate, Profile, ProteinEntry } from '@/types'

/**
 * Protein targets.
 *
 * Baseline 1.6 g/kg/day with a practical 1.6–2.2 g/kg/day range, following the
 * Morton 2018 meta-regression breakpoint and the ISSN position stand. FORGED
 * points you at a sensible spot inside that range; it never implies 2.2 g/kg is
 * mandatory, and it never prescribes a calorie deficit.
 */

export interface ProteinTarget {
  /** The number the UI counts toward. */
  targetG: number
  /** 1.6 g/kg on the reference weight — the floor of the evidence range. */
  baselineG: number
  rangeG: { min: number; max: number }
  gPerKg: number
  /** Body weight used, which may be a lean-mass estimate at high BMI. */
  referenceWeightKg: number
  usedLeanEstimate: boolean
  overridden: boolean
  rationale: string
  citationIds: string[]
}

function recommendedGPerKg(goal: Goal): number {
  return RULES.protein.recommendedGPerKgByGoal[goal] ?? RULES.protein.baselineGPerKg
}

/**
 * Reference weight for protein maths.
 *
 * Scaling straight off total body weight over-shoots at a high BMI, because fat
 * mass has little protein demand. Above the configured BMI we scale an estimated
 * lean-ish mass instead. This is an estimate and the UI says so.
 */
export function proteinReferenceWeightKg(
  bodyWeightKg: number,
  heightCm: number,
): { weightKg: number; usedLeanEstimate: boolean } {
  const heightM = heightCm / 100
  const bmi = heightM > 0 ? bodyWeightKg / (heightM * heightM) : 0
  if (bmi >= RULES.protein.useLeanEstimateBmi) {
    return {
      weightKg: bodyWeightKg * RULES.protein.highBmiLeanFactor,
      usedLeanEstimate: true,
    }
  }
  return { weightKg: bodyWeightKg, usedLeanEstimate: false }
}

export function calculateProteinTarget(
  profile: Pick<Profile, 'bodyWeightKg' | 'heightCm' | 'goal' | 'proteinOverrideG'>,
): ProteinTarget {
  const { weightKg, usedLeanEstimate } = proteinReferenceWeightKg(
    profile.bodyWeightKg,
    profile.heightCm,
  )
  const baselineG = Math.round(weightKg * RULES.protein.baselineGPerKg)
  const rangeG = {
    min: Math.round(weightKg * RULES.protein.rangeGPerKg.min),
    max: Math.round(weightKg * RULES.protein.rangeGPerKg.max),
  }
  const gPerKg = recommendedGPerKg(profile.goal)
  const recommendedG = Math.round(weightKg * gPerKg)

  const override = profile.proteinOverrideG
  const overridden = typeof override === 'number' && override > 0
  const targetG = overridden ? Math.round(override as number) : recommendedG

  const dieting = profile.goal === 'fatloss' || profile.goal === 'recomp'
  const rationale = overridden
    ? `Using your manual target of ${targetG} g/day. For reference, ${RULES.protein.baselineGPerKg} g/kg on your ${usedLeanEstimate ? 'estimated lean' : 'body'} weight is about ${baselineG} g, and the practical range is ${rangeG.min}–${rangeG.max} g.`
    : dieting
      ? `You're training in or near an energy deficit, so FORGED points to ${gPerKg} g/kg — the upper part of the practical range — to help protect lean mass. Anything from ${rangeG.min} to ${rangeG.max} g is defensible.`
      : `${gPerKg} g/kg sits just above the ${RULES.protein.baselineGPerKg} g/kg breakpoint where additional protein stops adding much. The full practical range is ${rangeG.min}–${rangeG.max} g/day.`

  return {
    targetG,
    baselineG,
    rangeG,
    gPerKg: overridden ? Number((targetG / weightKg).toFixed(2)) : gPerKg,
    referenceWeightKg: Number(weightKg.toFixed(1)),
    usedLeanEstimate,
    overridden,
    rationale,
    citationIds: dieting
      ? ['morton-2018-protein', 'issn-2017-protein', 'helms-2014-deficit-protein']
      : ['morton-2018-protein', 'issn-2017-protein'],
  }
}

export interface MealPlanSlot {
  index: number
  label: string
  grams: number
}

/**
 * Split a daily target across meals.
 *
 * Meals below ~20 g of protein are not worth planning around, so if the target
 * cannot support the requested meal count we quietly reduce the number of meals
 * and tell the user why.
 */
export function distributeProtein(targetG: number, mealsPerDay: number): {
  meals: MealPlanSlot[]
  note: string | null
} {
  const requested = Math.max(1, Math.floor(mealsPerDay || RULES.protein.defaultMeals))
  const maxMeals = Math.max(1, Math.floor(targetG / RULES.protein.minPerMealG))
  const meals = Math.min(requested, maxMeals)
  const per = targetG / meals
  const base = Math.floor(per / 5) * 5
  const slots: MealPlanSlot[] = []
  let allocated = 0
  for (let i = 0; i < meals; i++) {
    const isLast = i === meals - 1
    const grams = isLast ? Math.max(0, targetG - allocated) : base
    allocated += grams
    slots.push({ index: i, label: mealLabel(i, meals), grams: Math.round(grams) })
  }
  const note =
    meals < requested
      ? `Split across ${meals} meals instead of ${requested}: below about ${RULES.protein.minPerMealG} g a meal, the split stops being useful.`
      : null
  return { meals: slots, note }
}

function mealLabel(index: number, total: number): string {
  if (total <= 2) return index === 0 ? 'Meal 1' : 'Meal 2'
  const names = ['Breakfast', 'Lunch', 'Dinner', 'Evening', 'Snack', 'Late snack']
  if (total === 3) return ['Breakfast', 'Lunch', 'Dinner'][index]
  if (total === 4) return ['Breakfast', 'Lunch', 'Dinner', 'Evening'][index]
  return names[index] ?? `Meal ${index + 1}`
}

export function proteinForDate(entries: ProteinEntry[], date: IsoDate): number {
  return entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.grams, 0)
}

export interface ProteinAdherence {
  daysHit: number
  daysTracked: number
  fraction: number
  averageG: number
  perDay: { date: IsoDate; grams: number; hit: boolean }[]
}

/**
 * Weekly adherence. Only days with at least one entry count as "tracked" — a day
 * you forgot to log is unknown, not a failure, and the UI says so.
 */
export function proteinAdherence(
  entries: ProteinEntry[],
  dates: IsoDate[],
  targetG: number,
): ProteinAdherence {
  const perDay = dates.map((date) => {
    const grams = proteinForDate(entries, date)
    return { date, grams, hit: targetG > 0 && grams >= targetG * RULES.protein.adherenceFraction }
  })
  const tracked = perDay.filter((d) => d.grams > 0)
  const daysHit = perDay.filter((d) => d.hit).length
  const averageG = tracked.length
    ? Math.round(tracked.reduce((s, d) => s + d.grams, 0) / tracked.length)
    : 0
  return {
    daysHit,
    daysTracked: tracked.length,
    fraction: tracked.length ? daysHit / tracked.length : 0,
    averageG,
    perDay,
  }
}

export function proteinRemaining(targetG: number, consumedG: number): number {
  return Math.max(0, Math.round(targetG - consumedG))
}
