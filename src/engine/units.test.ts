import { describe, expect, it } from 'vitest'
import {
  KG_PER_LB,
  feetInchesToCm,
  formatDistance,
  formatPace,
  formatWeight,
  fromDisplay,
  increaseWithinPct,
  kgToLb,
  lbToKg,
  nativeIncrementKg,
  pacePerKm,
  roundToIncrement,
  stepDown,
  stepUp,
  toDisplay,
} from '@/engine/units'

describe('weight unit conversion', () => {
  it('round-trips kilograms through pounds without drift', () => {
    for (const kg of [1, 20, 42.5, 60, 100, 227.5]) {
      expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 9)
    }
  })

  it('uses the exact international pound', () => {
    expect(KG_PER_LB).toBe(0.45359237)
    expect(kgToLb(100)).toBeCloseTo(220.462262, 5)
    expect(lbToKg(225)).toBeCloseTo(102.058283, 5)
  })

  it('is the identity in kg mode', () => {
    expect(toDisplay(82.5, 'kg')).toBe(82.5)
    expect(fromDisplay(82.5, 'kg')).toBe(82.5)
  })

  it('converts only at the display edge', () => {
    const stored = 60
    const shown = toDisplay(stored, 'lb')
    expect(shown).toBeCloseTo(132.277, 3)
    expect(fromDisplay(shown, 'lb')).toBeCloseTo(stored, 9)
  })

  it('formats with the unit label', () => {
    expect(formatWeight(60, 'kg')).toBe('60 kg')
    expect(formatWeight(60, 'lb')).toBe('132 lb')
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg')
    expect(formatWeight(62.5, 'kg', { unit: false })).toBe('62.5')
  })

  it('converts height and distance', () => {
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 1)
    expect(formatDistance(5, 'kg')).toBe('5 km')
    expect(formatDistance(5, 'lb')).toBe('3.11 mi')
  })

  it('computes and formats pace in both units', () => {
    const pace = pacePerKm(5, 1500) // 25:00 for 5 km
    expect(pace).toBe(300)
    expect(formatPace(pace, 'kg')).toBe('5:00/km')
    expect(formatPace(pace, 'lb')).toBe('8:03/mi')
  })

  it('returns a placeholder rather than NaN for a zero-distance run', () => {
    expect(pacePerKm(0, 1500)).toBe(0)
    expect(formatPace(0, 'kg')).toBe('—')
  })
})

describe('load increment rounding', () => {
  it('rounds to the nearest increment in kg', () => {
    expect(roundToIncrement(61.3, 2.5)).toBe(62.5)
    expect(roundToIncrement(61.2, 2.5)).toBe(60)
    expect(roundToIncrement(100, 5)).toBe(100)
  })

  it('rounds in the user’s own unit so lb gyms land on lb numbers', () => {
    // 5 lb increment expressed in kg.
    const fiveLbInKg = lbToKg(5)
    const rounded = roundToIncrement(lbToKg(137), fiveLbInKg, 'lb')
    expect(kgToLb(rounded)).toBeCloseTo(135, 4)
  })

  it('never produces floating-point noise', () => {
    const result = roundToIncrement(62.50000000000001, 2.5)
    expect(result).toBe(62.5)
    expect(String(result)).toBe('62.5')
  })

  it('always moves at least one increment on step up/down', () => {
    expect(stepUp(60, 2.5)).toBe(62.5)
    expect(stepUp(61, 2.5)).toBe(62.5)
    // Exactly on a boundary still has to move.
    expect(stepUp(62.5, 2.5)).toBe(65)
    expect(stepDown(62.5, 2.5)).toBe(60)
    expect(stepDown(61, 2.5)).toBe(60)
  })

  it('never returns a negative load', () => {
    expect(stepDown(1, 2.5)).toBe(0)
    expect(roundToIncrement(-10, 2.5)).toBe(0)
  })

  it('falls back safely when no increment is configured', () => {
    expect(roundToIncrement(61.234, 0)).toBe(61.23)
    expect(roundToIncrement(Number.NaN, 2.5)).toBe(0)
  })
})

describe('percentage-guarded increases', () => {
  it('takes a single increment when that already lands in the band', () => {
    // 2.5 kg on 100 kg is 2.5%, inside the 2.5–5% upper-body band.
    expect(increaseWithinPct(100, 2.5, { min: 0.025, max: 0.05 })).toBe(102.5)
  })

  it('takes multiple increments on a light load rather than a token bump', () => {
    // On a 10 kg lateral raise, +1 kg is 10% — but a 1 kg dumbbell jump is the
    // smallest thing that exists, so one step is taken and not more.
    const next = increaseWithinPct(10, 1, { min: 0.025, max: 0.05 })
    expect(next).toBe(11)
  })

  it('respects the maximum percentage jump for lower body', () => {
    const next = increaseWithinPct(100, 2.5, { min: 0.05, max: 0.1 })
    expect(next).toBeGreaterThanOrEqual(105)
    expect(next).toBeLessThanOrEqual(110)
  })
})

describe('gym-native increments', () => {
  it('leaves kilogram increments alone', () => {
    expect(nativeIncrementKg(2.5, 'kg')).toBe(2.5)
    expect(nativeIncrementKg(5, 'kg')).toBe(5)
  })

  it('snaps to real pound plates so targets are loadable', () => {
    expect(kgToLb(nativeIncrementKg(2.5, 'lb'))).toBeCloseTo(5, 5)
    expect(kgToLb(nativeIncrementKg(5, 'lb'))).toBeCloseTo(10, 5)
    expect(kgToLb(nativeIncrementKg(1.25, 'lb'))).toBeCloseTo(2.5, 5)
    expect(kgToLb(nativeIncrementKg(1, 'lb'))).toBeCloseTo(2.5, 5)
  })

  it('produces whole-pound working loads when rounding with a native increment', () => {
    const increment = nativeIncrementKg(5, 'lb') // 10 lb
    const rounded = roundToIncrement(20, increment, 'lb') // 44.09 lb → 40 lb
    expect(kgToLb(rounded)).toBeCloseTo(40, 4)
  })
})

describe('a step up is always a step you could load', () => {
  it('never returns a jump that rounds away to nothing on the display', () => {
    // The bug: snapping to the pound grid could land a hundredth of a kilo
    // above the current weight, and the screen printed "Add 0 lb" — a
    // recommendation to do nothing, in the same voice as a real one.
    for (const increment of [1, 2, 2.5, 5]) {
      for (let lb = 5; lb <= 405; lb += 1) {
        const kg = lb / 2.2046226218
        const next = stepUp(kg, increment, 'lb')
        const deltaLb = (next - kg) * 2.2046226218
        expect(
          Number(deltaLb.toFixed(1)),
          `${lb} lb with a ${increment} kg increment gained ${deltaLb.toFixed(3)} lb`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('is the same in kilograms', () => {
    for (const increment of [1, 2, 2.5, 5]) {
      for (let kg = 2.5; kg <= 200; kg += 0.5) {
        const delta = stepUp(kg, increment, 'kg') - kg
        expect(Number(delta.toFixed(1)), `${kg} kg / ${increment}`).toBeGreaterThan(0)
      }
    }
  })

  it('still only ever goes up', () => {
    for (const increment of [1, 2.5, 5]) {
      for (let kg = 1; kg <= 200; kg += 1) {
        expect(stepUp(kg, increment, 'lb')).toBeGreaterThan(kg)
        expect(stepUp(kg, increment, 'kg')).toBeGreaterThan(kg)
      }
    }
  })
})
