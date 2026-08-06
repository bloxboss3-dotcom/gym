import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import {
  calculateProteinTarget,
  distributeProtein,
  proteinAdherence,
  proteinForDate,
  proteinReferenceWeightKg,
  proteinRemaining,
} from '@/engine/protein'
import type { ProteinEntry } from '@/types'

const base = { bodyWeightKg: 80, heightCm: 180, goal: 'hypertrophy' as const, proteinOverrideG: null }

describe('protein target calculation', () => {
  it('uses 1.6 g/kg as the baseline and 1.6–2.2 g/kg as the practical range', () => {
    const target = calculateProteinTarget(base)
    expect(target.baselineG).toBe(Math.round(80 * RULES.protein.baselineGPerKg))
    expect(target.rangeG.min).toBe(Math.round(80 * 1.6))
    expect(target.rangeG.max).toBe(Math.round(80 * 2.2))
  })

  it('points inside the range rather than at the top for a hypertrophy goal', () => {
    const target = calculateProteinTarget(base)
    expect(target.targetG).toBeGreaterThanOrEqual(target.rangeG.min)
    expect(target.targetG).toBeLessThan(target.rangeG.max)
  })

  it('moves toward the upper end when dieting', () => {
    const bulking = calculateProteinTarget(base)
    const cutting = calculateProteinTarget({ ...base, goal: 'fatloss' })
    expect(cutting.targetG).toBeGreaterThan(bulking.targetG)
    expect(cutting.targetG).toBeLessThanOrEqual(cutting.rangeG.max)
    expect(cutting.citationIds).toContain('helms-2014-deficit-protein')
  })

  it('never implies the top of the range is mandatory', () => {
    const target = calculateProteinTarget(base)
    expect(target.rationale).toMatch(/range/i)
    expect(target.targetG).not.toBe(target.rangeG.max)
  })

  it('sits at the baseline for a general-fitness goal', () => {
    const target = calculateProteinTarget({ ...base, goal: 'general' })
    expect(target.targetG).toBe(target.baselineG)
  })

  it('honours a manual override and reports it as overridden', () => {
    const target = calculateProteinTarget({ ...base, proteinOverrideG: 200 })
    expect(target.targetG).toBe(200)
    expect(target.overridden).toBe(true)
    expect(target.rationale).toMatch(/manual target/i)
  })

  it('ignores a zero or negative override', () => {
    expect(calculateProteinTarget({ ...base, proteinOverrideG: 0 }).overridden).toBe(false)
    expect(calculateProteinTarget({ ...base, proteinOverrideG: -50 }).overridden).toBe(false)
  })

  it('scales off an estimated lean mass at a high BMI instead of over-shooting', () => {
    // 140 kg at 170 cm → BMI ~48.
    const highBmi = calculateProteinTarget({ ...base, bodyWeightKg: 140, heightCm: 170 })
    expect(highBmi.usedLeanEstimate).toBe(true)
    expect(highBmi.referenceWeightKg).toBeCloseTo(140 * RULES.protein.highBmiLeanFactor, 1)
    expect(highBmi.targetG).toBeLessThan(140 * RULES.protein.recommendedGPerKgByGoal.hypertrophy)
  })

  it('does not use the lean estimate at a normal BMI', () => {
    expect(proteinReferenceWeightKg(80, 180).usedLeanEstimate).toBe(false)
    expect(proteinReferenceWeightKg(80, 180).weightKg).toBe(80)
  })
})

describe('protein distribution', () => {
  it('splits the target across the requested number of meals', () => {
    const { meals, note } = distributeProtein(160, 4)
    expect(meals).toHaveLength(4)
    expect(meals.reduce((s, m) => s + m.grams, 0)).toBe(160)
    expect(note).toBeNull()
  })

  it('reduces the meal count rather than suggesting pointless 10 g meals', () => {
    const { meals, note } = distributeProtein(60, 6)
    expect(meals.length).toBeLessThan(6)
    expect(meals.every((m) => m.grams >= RULES.protein.minPerMealG - 5)).toBe(true)
    expect(note).toMatch(/instead of 6/)
  })

  it('always produces at least one meal', () => {
    expect(distributeProtein(15, 4).meals).toHaveLength(1)
  })
})

describe('protein logging and adherence', () => {
  const entries: ProteinEntry[] = [
    { id: '1', date: '2026-01-01', label: 'a', grams: 100, createdAt: 0 },
    { id: '2', date: '2026-01-01', label: 'b', grams: 60, createdAt: 0 },
    { id: '3', date: '2026-01-02', label: 'c', grams: 80, createdAt: 0 },
  ]

  it('totals a day', () => {
    expect(proteinForDate(entries, '2026-01-01')).toBe(160)
    expect(proteinForDate(entries, '2026-01-03')).toBe(0)
  })

  it('computes remaining without going negative', () => {
    expect(proteinRemaining(160, 100)).toBe(60)
    expect(proteinRemaining(160, 200)).toBe(0)
  })

  it('counts a day as hit at 90% of target', () => {
    const result = proteinAdherence(entries, ['2026-01-01', '2026-01-02'], 160)
    expect(result.perDay[0].hit).toBe(true)
    expect(result.perDay[1].hit).toBe(false)
    expect(result.daysHit).toBe(1)
  })

  it('treats untracked days as unknown, not as failures', () => {
    const result = proteinAdherence(entries, ['2026-01-01', '2026-01-05'], 160)
    expect(result.daysTracked).toBe(1)
    expect(result.fraction).toBe(1)
  })
})
