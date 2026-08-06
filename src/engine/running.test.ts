import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { compareBenchmark, recommendRunning, summariseWeek, type RunningInput } from '@/engine/running'
import { addDays, startOfWeek, toIsoDate } from '@/lib/date'
import type { RunLog, RunType } from '@/types'

const today = toIsoDate()
const lastWeekStart = addDays(startOfWeek(today), -7)
const priorWeekStart = addDays(startOfWeek(today), -14)

let runCounter = 0
function run(options: {
  date: string
  distanceKm: number
  durationSec?: number
  rpe?: number
  pain?: number
  type?: RunType
}): RunLog {
  return {
    id: `run${runCounter++}`,
    date: options.date,
    type: options.type ?? 'easy',
    distanceKm: options.distanceKm,
    durationSec: options.durationSec ?? Math.round(options.distanceKm * 330),
    avgHr: null,
    rpe: options.rpe ?? 4,
    pain: options.pain ?? 0,
    surface: 'road',
    planned: true,
    createdAt: 0,
  }
}

/** A completed week of the given total distance, split across three runs. */
function completedWeek(start: string, totalKm: number, overrides: Partial<Parameters<typeof run>[0]> = {}) {
  return [0, 2, 5].map((offset) =>
    run({ date: addDays(start, offset), distanceKm: totalKm / 3, ...overrides }),
  )
}

const baseInput: Omit<RunningInput, 'runs'> = {
  sessions: [],
  experience: 'intermediate',
  priority: 'balanced',
  enduranceGoal: 'conditioning',
  baselineWeeklyKm: 20,
  today,
}

describe('weekly summary', () => {
  it('totals distance, duration and effort inside the week', () => {
    const runs = [...completedWeek(lastWeekStart, 30), run({ date: addDays(lastWeekStart, 9), distanceKm: 99 })]
    const summary = summariseWeek(runs, lastWeekStart)
    expect(summary.distanceKm).toBe(30)
    expect(summary.runs).toBe(3)
    expect(summary.meanRpe).toBe(4)
  })
})

describe('running load adjustment', () => {
  it('adds volume when the week was completed with no flags', () => {
    const runs = [...completedWeek(lastWeekStart, 30), ...completedWeek(priorWeekStart, 28)]
    const rec = recommendRunning({ ...baseInput, runs })
    expect(rec.action).toBe('increase')
    expect(rec.targetWeeklyKm).toBeGreaterThan(30)
  })

  it('caps the increase by experience — never a blanket 10% rule', () => {
    const runs = [...completedWeek(lastWeekStart, 40), ...completedWeek(priorWeekStart, 38)]
    const beginner = recommendRunning({ ...baseInput, runs, experience: 'beginner' })
    const advanced = recommendRunning({ ...baseInput, runs, experience: 'advanced' })
    expect(beginner.targetWeeklyKm).toBeLessThan(advanced.targetWeeklyKm)
    expect(beginner.targetWeeklyKm - 40).toBeLessThanOrEqual(40 * RULES.running.weeklyIncreaseCap.beginner + 1e-9)
    expect(advanced.targetWeeklyKm - 40).toBeLessThanOrEqual(40 * RULES.running.weeklyIncreaseCap.advanced + 1e-9)
  })

  it('never adds more than the absolute weekly cap on a big base', () => {
    const runs = [...completedWeek(lastWeekStart, 120), ...completedWeek(priorWeekStart, 118)]
    const rec = recommendRunning({ ...baseInput, runs, experience: 'advanced' })
    expect(rec.targetWeeklyKm - 120).toBeLessThanOrEqual(RULES.running.absoluteWeeklyAddKm + 1e-9)
  })

  it('uses a flat step at low volume, where percentages are meaningless', () => {
    const runs = [...completedWeek(lastWeekStart, 6), ...completedWeek(priorWeekStart, 6)]
    const rec = recommendRunning({ ...baseInput, runs })
    expect(rec.targetWeeklyKm).toBeCloseTo(6 + RULES.running.lowVolumeAddKm, 5)
  })

  it('reduces volume when a run hurt', () => {
    const runs = [
      ...completedWeek(lastWeekStart, 30, { pain: RULES.running.painReduceThreshold }),
      ...completedWeek(priorWeekStart, 30),
    ]
    const rec = recommendRunning({ ...baseInput, runs })
    expect(rec.action).toBe('reduce')
    expect(rec.targetWeeklyKm).toBeLessThan(30)
    expect(rec.warning).toMatch(/physio|physician/i)
  })

  it('holds volume when the running felt too hard', () => {
    const runs = [
      ...completedWeek(lastWeekStart, 30, { rpe: RULES.running.highRpeThreshold }),
      ...completedWeek(priorWeekStart, 30),
    ]
    const rec = recommendRunning({ ...baseInput, runs })
    expect(rec.action).toBe('hold')
    expect(rec.targetWeeklyKm).toBe(30)
    expect(rec.reason).toMatch(/conversational/i)
  })

  it('holds volume when last week fell well short of the week before', () => {
    const runs = [...completedWeek(lastWeekStart, 15), ...completedWeek(priorWeekStart, 40)]
    const rec = recommendRunning({ ...baseInput, runs })
    expect(rec.action).toBe('hold')
  })

  it('starts a brand-new runner on walk/run intervals', () => {
    const rec = recommendRunning({
      ...baseInput,
      runs: [],
      experience: 'beginner',
      baselineWeeklyKm: 4,
    })
    expect(rec.action).toBe('start_conservative')
    expect(rec.sessions.every((s) => s.type === 'walk_run')).toBe(true)
    expect(rec.missingData.join(' ')).toMatch(/No runs logged/i)
  })

  it('caps the long run as a fraction of weekly volume', () => {
    const runs = [...completedWeek(lastWeekStart, 40), ...completedWeek(priorWeekStart, 38)]
    const rec = recommendRunning({ ...baseInput, runs })
    const long = rec.sessions.find((s) => s.type === 'long')
    expect(long?.distanceKm).toBeLessThanOrEqual(rec.targetWeeklyKm * RULES.running.longRunMaxFraction + 0.05)
  })

  it('limits quality sessions for a muscle-first user', () => {
    const runs = [...completedWeek(lastWeekStart, 30), ...completedWeek(priorWeekStart, 28)]
    const muscleFirst = recommendRunning({ ...baseInput, runs, priority: 'muscle', enduranceGoal: 'improve5k' })
    const quality = muscleFirst.sessions.filter((s) => s.type === 'intervals' || s.type === 'threshold')
    expect(quality.length).toBeLessThanOrEqual(RULES.running.qualitySessionsByPriority.muscle)
  })

  it('tells a muscle-first user to space hard running away from leg day', () => {
    const legSession = {
      id: 's1',
      date: addDays(today, -2),
      programId: null,
      programDayId: null,
      title: 'Lower',
      status: 'completed' as const,
      entries: [
        {
          id: 'e1',
          exerciseId: 'back-squat',
          plannedSets: 3,
          repMin: 5,
          repMax: 8,
          targetRIR: 2,
          restSec: 180,
          incrementKg: 5,
          sets: [],
          pain: 0,
          technique: 'clean' as const,
        },
      ],
      startedAt: 0,
      endedAt: 1,
    }
    const rec = recommendRunning({
      ...baseInput,
      runs: [...completedWeek(lastWeekStart, 25), ...completedWeek(priorWeekStart, 24)],
      sessions: [legSession],
      priority: 'muscle',
    })
    expect(rec.schedulingNote).toMatch(new RegExp(`${RULES.running.interferenceSpacingHours} hours`))
  })

  it('schedules a benchmark only when the goal calls for it', () => {
    const runs = [...completedWeek(lastWeekStart, 30), ...completedWeek(priorWeekStart, 28)]
    const withGoal = recommendRunning({ ...baseInput, runs, enduranceGoal: 'improve5k' })
    const withoutGoal = recommendRunning({ ...baseInput, runs, enduranceGoal: 'conditioning' })
    expect(withGoal.sessions.some((s) => s.type === 'benchmark')).toBe(true)
    expect(withoutGoal.sessions.some((s) => s.type === 'benchmark')).toBe(false)
  })

  it('does not schedule a benchmark too soon after the last one', () => {
    const runs = [
      ...completedWeek(lastWeekStart, 30),
      ...completedWeek(priorWeekStart, 28),
      run({ date: addDays(today, -7), distanceKm: 5, type: 'benchmark', durationSec: 1500 }),
    ]
    const rec = recommendRunning({ ...baseInput, runs, enduranceGoal: 'improve5k' })
    expect(rec.sessions.some((s) => s.type === 'benchmark')).toBe(false)
  })

  it('always reports rule, confidence and citations', () => {
    const rec = recommendRunning({ ...baseInput, runs: [] })
    expect(rec.rule).toBeTruthy()
    expect(['low', 'medium', 'high']).toContain(rec.confidence)
    expect(rec.citationIds).toContain('nielsen-2014-running-load')
    expect(rec.citationIds).toContain('damsted-2018-load-review')
  })
})

describe('benchmark comparison', () => {
  it('returns null when nothing has been benchmarked', () => {
    expect(compareBenchmark([])).toBeNull()
  })

  it('treats the first benchmark as a reference point, not a result', () => {
    const result = compareBenchmark([run({ date: today, distanceKm: 5, type: 'benchmark', durationSec: 1500 })])
    expect(result?.improved).toBe(false)
    expect(result?.previousSec).toBeNull()
    expect(result?.detail).toMatch(/first benchmark/i)
  })

  it('detects an improvement against the previous best at the same distance', () => {
    const result = compareBenchmark([
      run({ date: today, distanceKm: 5, type: 'benchmark', durationSec: 1440 }),
      run({ date: addDays(today, -35), distanceKm: 5, type: 'benchmark', durationSec: 1520 }),
    ])
    expect(result?.improved).toBe(true)
    expect(result?.deltaSec).toBe(-80)
  })

  it('does not compare across different distances', () => {
    const result = compareBenchmark([
      run({ date: today, distanceKm: 5, type: 'benchmark', durationSec: 1440 }),
      run({ date: addDays(today, -35), distanceKm: 10, type: 'benchmark', durationSec: 2900 }),
    ])
    expect(result?.previousSec).toBeNull()
  })

  it('is honest about noise when a benchmark is slower', () => {
    const result = compareBenchmark([
      run({ date: today, distanceKm: 5, type: 'benchmark', durationSec: 1560 }),
      run({ date: addDays(today, -35), distanceKm: 5, type: 'benchmark', durationSec: 1500 }),
    ])
    expect(result?.improved).toBe(false)
    expect(result?.detail).toMatch(/noisy/i)
  })
})
