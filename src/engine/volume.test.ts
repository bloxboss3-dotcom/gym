import { describe, expect, it } from 'vitest'
import { RULES } from '@/config/rules'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import {
  assessMuscleVolume,
  plannedMuscleVolume,
  startingVolumeRange,
  suggestVolumeProgression,
  weeklyCompletion,
  weeklyMuscleVolume,
} from '@/engine/volume'
import { toIsoDate } from '@/lib/date'
import { entry, session, set } from '@/test/factories'
import type { Program } from '@/types'

const today = toIsoDate()
const week = [today]

describe('weekly muscle volume', () => {
  it('credits fractional contributions from the central exercise map', () => {
    // Barbell row: upper_back 1, lats 1, rear_delts 0.5, biceps 0.5, lower_back 0.5
    const sessions = [
      session({
        date: today,
        entries: [entry({ exerciseId: 'barbell-row', sets: [set(80, 8, 2), set(80, 8, 2)] })],
      }),
    ]
    const volume = weeklyMuscleVolume(sessions, EXERCISE_LIBRARY, week)
    expect(volume.upper_back.hardSets).toBe(2)
    expect(volume.lats.hardSets).toBe(2)
    expect(volume.biceps.hardSets).toBe(1)
    expect(volume.rear_delts.hardSets).toBe(1)
  })

  it('excludes warm-up sets', () => {
    const sessions = [
      session({
        date: today,
        entries: [
          entry({
            exerciseId: 'barbell-bench-press',
            sets: [set(40, 10, null, true), set(80, 8, 2), set(80, 8, 2)],
          }),
        ],
      }),
    ]
    expect(weeklyMuscleVolume(sessions, EXERCISE_LIBRARY, week).chest.hardSets).toBe(2)
  })

  it('excludes sets taken too far from failure to count as hard', () => {
    const sessions = [
      session({
        date: today,
        entries: [
          entry({
            exerciseId: 'barbell-bench-press',
            sets: [set(60, 8, 2), set(60, 8, RULES.volume.hardSetRirCutoff + 2)],
          }),
        ],
      }),
    ]
    expect(weeklyMuscleVolume(sessions, EXERCISE_LIBRARY, week).chest.hardSets).toBe(1)
  })

  it('counts unrated sets but flags them separately', () => {
    const sessions = [
      session({
        date: today,
        entries: [entry({ exerciseId: 'barbell-bench-press', sets: [set(60, 8, null)] })],
      }),
    ]
    const volume = weeklyMuscleVolume(sessions, EXERCISE_LIBRARY, week)
    expect(volume.chest.hardSets).toBe(1)
    expect(volume.chest.unratedSets).toBe(1)
  })

  it('ignores abandoned sessions and sessions outside the week', () => {
    const sessions = [
      session({
        date: today,
        status: 'abandoned',
        entries: [entry({ exerciseId: 'barbell-bench-press', sets: [set(60, 8, 2)] })],
      }),
      session({
        date: '2020-01-01',
        entries: [entry({ exerciseId: 'barbell-bench-press', sets: [set(60, 8, 2)] })],
      }),
    ]
    expect(weeklyMuscleVolume(sessions, EXERCISE_LIBRARY, week).chest.hardSets).toBe(0)
  })

  it('accumulates volume load and lists contributing exercises', () => {
    const sessions = [
      session({
        date: today,
        entries: [
          entry({ exerciseId: 'barbell-bench-press', sets: [set(60, 10, 2)] }),
          entry({ exerciseId: 'machine-chest-press', sets: [set(50, 10, 2)] }),
        ],
      }),
    ]
    const chest = weeklyMuscleVolume(sessions, EXERCISE_LIBRARY, week).chest
    expect(chest.volumeLoadKg).toBe(600 + 500)
    expect(chest.contributors.map((c) => c.exerciseId).sort()).toEqual([
      'barbell-bench-press',
      'machine-chest-press',
    ])
  })

  it('drops contributions below the minimum so noise does not inflate totals', () => {
    // 0.25 contributions are below the 0.25 cutoff boundary check (>= is kept).
    const sessions = [
      session({ date: today, entries: [entry({ exerciseId: 'push-up', sets: [set(0, 20, 2)] })] }),
    ]
    const volume = weeklyMuscleVolume(sessions, EXERCISE_LIBRARY, week)
    expect(volume.chest.hardSets).toBe(1)
    // abs contribution on a push-up is 0.25 — exactly at the cutoff, so kept.
    expect(volume.abs.hardSets).toBe(0.3)
  })
})

describe('volume assessment', () => {
  it('starts beginners conservatively', () => {
    expect(startingVolumeRange('beginner')).toEqual(RULES.volume.startingRange.beginner)
    expect(startingVolumeRange('beginner').max).toBeLessThan(startingVolumeRange('advanced').max)
  })

  it('labels below, within, above and very high volume', () => {
    const make = (hardSets: number) =>
      assessMuscleVolume(
        { muscle: 'chest', hardSets, plannedSets: 0, volumeLoadKg: 0, unratedSets: 0, contributors: [] },
        0,
        'beginner',
      )
    expect(make(2).status).toBe('below')
    expect(make(8).status).toBe('within')
    expect(make(14).status).toBe('above')
    expect(make(RULES.volume.autoCeiling + 5).status).toBe('high')
    expect(make(RULES.volume.autoCeiling + 5).message).toMatch(/recovery cost/i)
  })
})

describe('volume progression is deliberately conservative', () => {
  const below = [
    assessMuscleVolume(
      { muscle: 'chest' as const, hardSets: 3, plannedSets: 0, volumeLoadKg: 0, unratedSets: 0, contributors: [] },
      0,
      'beginner',
    ),
  ]

  it('adds at most the configured cap per muscle per week', () => {
    const suggestions = suggestVolumeProgression(below, 1, 'beginner')
    expect(suggestions[0].addSets).toBeLessThanOrEqual(RULES.volume.weeklyAddCap)
  })

  it('adds nothing when the week was not completed', () => {
    expect(suggestVolumeProgression(below, 0.5, 'beginner')).toHaveLength(0)
  })

  it('never suggests adding to a muscle already at or above range', () => {
    const within = [
      assessMuscleVolume(
        { muscle: 'chest' as const, hardSets: 9, plannedSets: 0, volumeLoadKg: 0, unratedSets: 0, contributors: [] },
        0,
        'beginner',
      ),
    ]
    expect(suggestVolumeProgression(within, 1, 'beginner')).toHaveLength(0)
  })
})

describe('planned volume and completion', () => {
  const program: Program = {
    id: 'p',
    name: 'Test',
    description: '',
    createdAt: 0,
    generated: false,
    days: [
      {
        id: 'd1',
        name: 'Push',
        weekday: 1,
        slots: [
          {
            id: 's1',
            exerciseId: 'barbell-bench-press',
            sets: 3,
            repMin: 8,
            repMax: 12,
            restSec: 120,
            targetRIR: 2,
          },
        ],
      },
    ],
  }

  it('sums planned sets per muscle across the program', () => {
    const planned = plannedMuscleVolume(program, EXERCISE_LIBRARY)
    expect(planned.chest).toBe(3)
    expect(planned.triceps).toBe(1.5)
  })

  it('reports completed versus planned sets', () => {
    const sessions = [
      session({
        date: today,
        entries: [entry({ exerciseId: 'barbell-bench-press', sets: [set(60, 10, 2), set(60, 10, 2)] })],
      }),
    ]
    const completion = weeklyCompletion(sessions, week, program)
    expect(completion.completedSets).toBe(2)
    expect(completion.plannedSets).toBe(3)
    expect(completion.fraction).toBeCloseTo(2 / 3, 5)
  })

  it('handles having no program without dividing by zero', () => {
    const completion = weeklyCompletion([], week, null)
    expect(completion.fraction).toBe(0)
    expect(Number.isFinite(completion.fraction)).toBe(true)
  })
})
