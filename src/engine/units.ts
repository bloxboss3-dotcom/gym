import type { Units } from '@/types'

/**
 * Unit conversion and load rounding.
 *
 * Invariant for the whole app: every persisted weight is in KILOGRAMS.
 * Pounds exist only where a number is shown to or typed by the user, so
 * switching units never mutates stored data or changes a recommendation.
 */

export const KG_PER_LB = 0.45359237
export const LB_PER_KG = 1 / KG_PER_LB

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

/** Convert a stored kg value into the user's display unit. */
export function toDisplay(kg: number, units: Units): number {
  return units === 'kg' ? kg : kgToLb(kg)
}

/** Convert a value the user typed in their unit back into storage kg. */
export function fromDisplay(value: number, units: Units): number {
  return units === 'kg' ? value : lbToKg(value)
}

/** Kill floating-point noise like 62.50000000000001. */
export function clean(n: number, decimals = 4): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

/**
 * Round a load to the nearest usable increment.
 *
 * The increment is expressed in kg, but gyms are stocked in whichever unit the
 * user trains in, so rounding happens in *display* space and converts back.
 * That keeps 5 lb jumps landing on 5 lb numbers rather than 2.27 kg drift.
 */
export function roundToIncrement(kg: number, incrementKg: number, units: Units = 'kg'): number {
  if (!Number.isFinite(kg)) return 0
  if (!incrementKg || incrementKg <= 0) return clean(Math.max(0, kg), 2)
  const step = units === 'kg' ? incrementKg : kgToLb(incrementKg)
  const value = toDisplay(Math.max(0, kg), units)
  const rounded = Math.round(value / step) * step
  // 6 decimals of kg is well below a gram, and keeps the value from drifting
  // visibly when it is converted back to pounds for display.
  return clean(fromDisplay(rounded, units), 6)
}

/** Round up to the next increment (never returns the same value). */
export function stepUp(kg: number, incrementKg: number, units: Units = 'kg'): number {
  const rounded = roundToIncrement(kg, incrementKg, units)
  if (rounded > kg + 1e-6) return rounded
  return clean(rounded + incrementKg, 4)
}

/** Round down to the previous increment (never returns the same value). */
export function stepDown(kg: number, incrementKg: number, units: Units = 'kg'): number {
  const rounded = roundToIncrement(kg, incrementKg, units)
  if (rounded < kg - 1e-6) return Math.max(0, rounded)
  return Math.max(0, clean(rounded - incrementKg, 4))
}

/**
 * Smallest increment that respects a percentage guard-rail.
 *
 * Double progression wants "the smallest available jump", but on a light
 * accessory a fixed 2.5 kg plate can be a 20% leap. This picks the number of
 * increments that lands closest to the middle of the allowed percentage band,
 * always at least one increment (you cannot add half a plate).
 */
export function increaseWithinPct(
  currentKg: number,
  incrementKg: number,
  pct: { min: number; max: number },
  units: Units = 'kg',
): number {
  const target = currentKg * (1 + (pct.min + pct.max) / 2)
  const maxAllowed = currentKg * (1 + pct.max)
  let best = stepUp(currentKg, incrementKg, units)
  let candidate = best
  // Walk up in real increments, keeping the one closest to the middle of the
  // allowed band. Ties go to the smaller jump — when in doubt, be conservative.
  for (let i = 0; i < 32; i++) {
    const next = stepUp(candidate, incrementKg, units)
    if (next > maxAllowed + 1e-9) break
    if (Math.abs(next - target) < Math.abs(best - target) - 1e-9) best = next
    candidate = next
  }
  return clean(best, 6)
}

/**
 * Snap an increment to something that actually exists in the user's gym.
 *
 * The exercise library defines increments in kilograms, but a gym stocked in
 * pounds has 2.5 / 5 / 10 lb plates, not 2.27 / 4.54. Converting a kg increment
 * literally produces targets like "44.1 lb", which is not a weight anyone can
 * load. This maps to the nearest real step in the user's own unit.
 */
export function nativeIncrementKg(incrementKg: number, units: Units): number {
  if (units === 'kg') return incrementKg
  const lb = kgToLb(incrementKg)
  const ladder = [1, 2.5, 5, 10, 25, 45]
  const chosen = ladder.reduce((best, step) => (Math.abs(step - lb) < Math.abs(best - lb) ? step : best), ladder[0])
  return clean(lbToKg(chosen), 6)
}

export function formatWeight(kg: number, units: Units, opts?: { decimals?: number; unit?: boolean }): string {
  const value = toDisplay(kg, units)
  const decimals = opts?.decimals ?? (units === 'kg' ? 1 : 0)
  const rounded = Number(value.toFixed(decimals))
  const text = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(decimals)
  return opts?.unit === false ? text : `${text} ${units}`
}

export function unitLabel(units: Units): string {
  return units
}

/** cm ↔ ft/in for the profile screen. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - feet * 12)
  return inches === 12 ? { feet: feet + 1, inches: 0 } : { feet, inches }
}

export function feetInchesToCm(feet: number, inches: number): number {
  return clean((feet * 12 + inches) * 2.54, 2)
}

export function formatHeight(cm: number, units: Units): string {
  if (units === 'kg') return `${Math.round(cm)} cm`
  const { feet, inches } = cmToFeetInches(cm)
  return `${feet}′ ${inches}″`
}

export function pacePerKm(distanceKm: number, durationSec: number): number {
  if (distanceKm <= 0) return 0
  return durationSec / distanceKm
}

export function formatPace(secPerKm: number, units: Units): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '—'
  const perUnit = units === 'kg' ? secPerKm : secPerKm * 1.609344
  const m = Math.floor(perUnit / 60)
  const s = Math.round(perUnit % 60)
  const label = units === 'kg' ? '/km' : '/mi'
  return `${m}:${s.toString().padStart(2, '0')}${label}`
}

export function formatDistance(km: number, units: Units): string {
  if (units === 'kg') return `${Number(km.toFixed(2))} km`
  return `${Number((km / 1.609344).toFixed(2))} mi`
}

export function kmToMiles(km: number): number {
  return km / 1.609344
}

export function milesToKm(mi: number): number {
  return mi * 1.609344
}
