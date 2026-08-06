import { fromDisplay, toDisplay } from '@/engine/units'
import type { Exercise, LoadingStyle, Settings, Units } from '@/types'

/**
 * Plate maths.
 *
 * Pure and deterministic like the rest of `src/engine/`. Two jobs:
 *
 *  1. Given a total you want on the bar, say what to hang on each side — so
 *     nobody has to do mental arithmetic between sets.
 *  2. Given the plates you actually put on, say what the total is — so you can
 *     log what you lifted without doing that arithmetic in the other direction.
 *
 * Everything is stored in kilograms, but plate selection happens in DISPLAY
 * units. That is not a stylistic choice: a gym stocks 45 lb plates or 20 kg
 * plates, never 20.4117 kg plates, so rounding in kg produces combinations that
 * do not exist on the rack.
 */

/** Plates a normal gym stocks, per side, largest first, in display units. */
export const PLATE_LADDER: Record<Units, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}

/** Standard Olympic bar, in display units. */
export const DEFAULT_BAR: Record<Units, number> = { kg: 20, lb: 45 }

export interface PlateGroup {
  /** Plate size in display units. */
  plate: number
  count: number
}

export interface PlatePlan {
  /** What to load on ONE side, largest first. */
  perSide: PlateGroup[]
  /** Bar weight used, in display units. */
  bar: number
  /** Total actually achievable with these plates, in display units. */
  total: number
  /** Requested total, in display units. */
  requested: number
  /** True when the plates hit the request exactly. */
  exact: boolean
  /**
   * Why the plan is not exact, when it isn't. Null when exact, or when the
   * request is simply below the bar.
   */
  note: string | null
  /** True when the requested total is lighter than the bar itself. */
  belowBar: boolean
}

const EPSILON = 0.001

/** Round to 2dp and kill float noise like 47.499999999999996. */
function clean(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Work out the plates for a target total.
 *
 * Greedy from the largest plate, which is optimal for every real plate ladder
 * (each plate divides evenly into the ones above it) and is also what a human
 * does at the rack.
 */
export function planPlates(input: {
  /** Target total including the bar, in display units. */
  totalDisplay: number
  /** Bar weight in display units. */
  barDisplay: number
  /** Available plate sizes per side, display units. Defaults to the ladder. */
  plates: number[]
  units: Units
}): PlatePlan {
  const { totalDisplay, barDisplay, units } = input
  const plates = [...input.plates].filter((p) => p > 0).sort((a, b) => b - a)
  const requested = clean(totalDisplay)

  if (requested < barDisplay - EPSILON) {
    return {
      perSide: [],
      bar: barDisplay,
      total: barDisplay,
      requested,
      exact: false,
      note: null,
      belowBar: true,
    }
  }

  // Everything above the bar is split between two sides.
  let remainingPerSide = (requested - barDisplay) / 2
  const perSide: PlateGroup[] = []

  for (const plate of plates) {
    if (remainingPerSide < plate - EPSILON) continue
    const count = Math.floor((remainingPerSide + EPSILON) / plate)
    if (count > 0) {
      perSide.push({ plate, count })
      remainingPerSide = clean(remainingPerSide - count * plate)
    }
  }

  const loadedPerSide = perSide.reduce((s, g) => s + g.plate * g.count, 0)
  const total = clean(barDisplay + loadedPerSide * 2)
  const exact = Math.abs(total - requested) < EPSILON

  return {
    perSide,
    bar: barDisplay,
    total,
    requested,
    exact,
    note: exact
      ? null
      : `Closest loadable weight is ${clean(total)} ${units} — you are ${clean(Math.abs(requested - total))} ${units} short of ${requested}. Adjust the target or add a smaller plate to your gym's list in settings.`,
    belowBar: false,
  }
}

/** Total (display units) for a given per-side selection. */
export function totalFromPlates(perSide: PlateGroup[], barDisplay: number): number {
  return clean(barDisplay + perSide.reduce((s, g) => s + g.plate * g.count, 0) * 2)
}

/** One-line summary: "45 bar + 25, 10, 2.5 per side". */
export function describePlan(plan: PlatePlan, units: Units): string {
  if (plan.belowBar) return `Lighter than the ${clean(plan.bar)} ${units} bar`
  if (!plan.perSide.length) return `Empty bar (${clean(plan.bar)} ${units})`
  const list = plan.perSide
    .map((g) => (g.count > 1 ? `${g.count}×${clean(g.plate)}` : `${clean(g.plate)}`))
    .join(' + ')
  return `${clean(plan.bar)} bar + ${list} per side`
}

// ---------------------------------------------------------------------------
// Loading style helpers
// ---------------------------------------------------------------------------

/** Bar weight in kg for an exercise, honouring a per-exercise override. */
export function barKgFor(exercise: Pick<Exercise, 'barKg'> | null, settings: Settings, units: Units): number {
  if (exercise?.barKg != null) return exercise.barKg
  if (settings.barbellKg != null) return settings.barbellKg
  return fromDisplay(DEFAULT_BAR[units], units)
}

/** Plate sizes available per side, in display units. */
export function platesFor(settings: Settings, units: Units): number[] {
  const stored = settings.plateInventoryKg
  if (stored?.length) {
    return [...new Set(stored.map((kg) => clean(toDisplay(kg, units))))].sort((a, b) => b - a)
  }
  return PLATE_LADDER[units]
}

/**
 * How many of the implement are moving.
 *
 * Only a dumbbell PAIR gets a 2× multiplier: you are lifting two 30 kg
 * dumbbells, so the tonnage is 60 kg per rep, not 30. Everything else logs the
 * whole load in one number already.
 */
export function implementCount(loading: LoadingStyle): number {
  return loading === 'dumbbell_pair' ? 2 : 1
}

/** The label that goes above the weight box, so the number is never ambiguous. */
export function weightLabel(loading: LoadingStyle, units: Units): string {
  switch (loading) {
    case 'barbell':
      return `Total on the bar (${units})`
    case 'dumbbell_pair':
      return `Per dumbbell (${units})`
    case 'dumbbell_single':
      return `Weight (${units})`
    case 'stack':
      return `Stack setting (${units})`
    case 'bodyweight':
      return `Added weight (${units})`
    default:
      return `Weight (${units})`
  }
}

/** Short clarifier shown under the box. Null when nothing needs saying. */
export function weightHint(loading: LoadingStyle, displayWeight: number, units: Units): string | null {
  switch (loading) {
    case 'barbell':
      return 'Bar included'
    case 'dumbbell_pair':
      return displayWeight > 0
        ? `Two dumbbells — ${clean(displayWeight * 2)} ${units} total`
        : 'Enter the number on one dumbbell'
    case 'bodyweight':
      return displayWeight > 0 ? 'On top of your body weight' : 'Body weight only'
    default:
      return null
  }
}
