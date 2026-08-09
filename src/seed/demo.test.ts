import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { assessDeload } from '@/engine/deload'
import { historyFor, detectPlateau, recommendNextSession } from '@/engine/progression'
import { calculateMacroTargets, totalsForEntries } from '@/engine/nutrition'
import { calculateProteinTarget, proteinAdherence } from '@/engine/protein'
import { compareBenchmark } from '@/engine/running'
import { weeklyMuscleVolume } from '@/engine/volume'
import { unopenedPacks } from '@/engine/packs'
import { lastNDays, startOfWeek, toIsoDate, addDays } from '@/lib/date'
import { buildDemoData } from '@/seed/demo'

/**
 * The demo dataset is a fixture the whole product is judged on, so it gets the
 * same scrutiny as the engines: every claim it makes must actually be true when
 * the real engines read it.
 */
describe('seeded demo data', () => {
  const data = buildDemoData()

  it('is deterministic across builds', () => {
    const again = buildDemoData()
    expect(again.sessions.length).toBe(data.sessions.length)
    expect(again.game.xp).toBe(data.game.xp)
  })

  it('has a complete profile and an active program', () => {
    expect(data.profile).not.toBeNull()
    expect(data.profile!.onboardedAt).toBeTruthy()
    expect(data.activeProgramId).toBe(data.programs[0].id)
    expect(data.programs[0].days.length).toBe(data.profile!.daysPerWeek)
    expect(data.settings.demoMode).toBe(true)
  })

  it('contains several weeks of completed sessions', () => {
    const completed = data.sessions.filter((s) => s.status === 'completed')
    expect(completed.length).toBeGreaterThanOrEqual(18)
    expect(completed.every((s) => s.entries.length > 0)).toBe(true)
    expect(completed.every((s) => s.endedAt !== null)).toBe(true)
  })

  it('shows real strength progression on the lifts in the program', () => {
    const exerciseIds = [...new Set(data.programs[0].days.flatMap((d) => d.slots.map((s) => s.exerciseId)))]
    const progressed = exerciseIds.filter((exerciseId) => {
      const history = historyFor(data.sessions, exerciseId, 20)
      if (history.length < 4) return false
      return history[0].sets[0].weightKg > history[history.length - 1].sets[0].weightKg
    })
    // Most lifts moved; the deliberately stalled one did not.
    expect(progressed.length).toBeGreaterThanOrEqual(exerciseIds.length - 2)
    expect(progressed).not.toContain('barbell-row')
  })

  it('includes a genuinely stalled exercise', () => {
    const rows = historyFor(data.sessions, 'barbell-row', 8)
    expect(rows.length).toBeGreaterThanOrEqual(RULES.plateau.sessionsToStall + 1)
    const plateau = detectPlateau(rows)
    expect(plateau.stalled).toBe(true)

    const rec = recommendNextSession(rows, {
      sets: 3,
      repMin: rows[0].repMin,
      repMax: rows[0].repMax,
      targetRIR: rows[0].targetRIR,
      incrementKg: 2.5,
      lowerBody: false,
      units: 'kg',
    })
    expect(['hold_and_check_recovery', 'substitute_exercise']).toContain(rec.action)
  })

  it('trips the deload detector', () => {
    const assessment = assessDeload({
      sessions: data.sessions,
      checkins: data.checkins,
      deloads: data.deloads,
    })
    expect(assessment.triggeredCount).toBeGreaterThanOrEqual(RULES.deload.triggerCount)
    expect(assessment.suggested).toBe(true)
  })

  it('has protein adherence that is good but not perfect', () => {
    const target = calculateProteinTarget(data.profile!)
    const week = proteinAdherence(data.proteinEntries, lastNDays(7), target.targetG)
    expect(week.daysTracked).toBeGreaterThan(4)
    expect(week.daysHit).toBeGreaterThan(2)
    expect(week.daysHit).toBeLessThan(8)
  })

  it('shows running improvement against a real benchmark', () => {
    const benchmark = compareBenchmark(data.runs)
    expect(benchmark).not.toBeNull()
    expect(benchmark!.improved).toBe(true)
    expect(benchmark!.deltaSec!).toBeLessThan(0)
  })

  it('produces meaningful weekly muscle volume', () => {
    const weekStart = startOfWeek(toIsoDate())
    const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const volume = weeklyMuscleVolume(data.sessions, data.exercises, dates)
    const total = Object.values(volume).reduce((sum, v) => sum + v.hardSets, 0)
    expect(total).toBeGreaterThan(10)
  })

  it('has earned equipment, unopened packs and a customised warrior', () => {
    expect(data.game.owned.length).toBeGreaterThan(20)
    expect(unopenedPacks(data.game).length).toBeGreaterThanOrEqual(2)
    expect(data.game.equipped.weapon).not.toBe('weapon-none')
    expect(data.game.equipped.body).not.toBe('body-tunic')
    expect(data.game.equipped.title).toBeTruthy()
    expect(data.game.xp).toBeGreaterThan(1000)
  })

  it('has a reward ledger that adds up to the XP on the account', () => {
    const ledgerXp = data.game.ledger.reduce((s, e) => s + e.xp, 0)
    expect(data.game.xp).toBe(ledgerXp)
    expect(data.game.ledger.every((e) => e.sourceId)).toBe(true)
  })

  it('includes deload history so the feature is not an empty screen', () => {
    expect(data.deloads.length).toBeGreaterThan(0)
    expect(data.deloads.some((d) => d.status === 'completed')).toBe(true)
  })

  it('never dates anything in the future', () => {
    const today = toIsoDate()
    expect(data.sessions.every((s) => s.date <= today)).toBe(true)
    expect(data.runs.every((r) => r.date <= today)).toBe(true)
    expect(data.checkins.every((c) => c.date <= today)).toBe(true)
  })

  it('shows a full nutrition day, not just protein', () => {
    const today = toIsoDate()
    const dates = [...new Set(data.proteinEntries.map((e) => e.date))].sort()
    expect(dates.length).toBeGreaterThan(0)
    expect(dates[dates.length - 1] <= today).toBe(true)

    // Assert on a representative FULL day, not simply the latest one. The demo
    // deliberately under-eats one day a week, and depending on which weekday
    // the suite runs, that lean day can be the most recent — which made this
    // test pass or fail based on the calendar.
    const byDate = new Map<string, typeof data.proteinEntries>()
    for (const entry of data.proteinEntries) {
      byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry])
    }
    const fullest = [...byDate.values()].sort((a, b) => b.length - a.length)[0]
    const day = fullest
    const totals = totalsForEntries(day)
    expect(totals.hasUnknownEnergy).toBe(false)
    expect(totals.kcal).toBeGreaterThan(1200)
    expect(totals.carbsG).toBeGreaterThan(50)
    expect(totals.fatG).toBeGreaterThan(20)

    // Every entry lands in a real meal slot so the day view is not all snacks.
    expect(day.every((e) => e.meal)).toBe(true)
    const slots = new Set(data.proteinEntries.map((e) => e.meal))
    expect(slots.size).toBeGreaterThanOrEqual(3)
  })

  it('carries the profile fields the calorie engine needs', () => {
    expect(data.profile?.sex).toBeTruthy()
    expect(data.profile?.dailyActivity).toBeTruthy()
    const plan = calculateMacroTargets(data.profile!)
    expect(plan.targets.kcal).toBeGreaterThan(2000)
    expect(plan.targets.carbsG).toBeGreaterThan(0)
  })
})
