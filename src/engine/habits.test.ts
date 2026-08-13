import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import { findUsualSessions, mostOverdue, nameFor, toProgramDay } from '@/engine/habits'
import { addDays, toIsoDate } from '@/lib/date'
import type { LoggedSet, Session, SessionEntry } from '@/types'

/**
 * Habit detection decides what the app OFFERS, never how hard to train. These
 * tests pin two things: that it finds a genuine pattern, and that it refuses to
 * invent one out of noise — a wrong suggestion here is worse than none, because
 * it teaches the user not to trust the button.
 */

const TODAY = '2026-03-01'

function set(reps: number, warmup = false): LoggedSet {
  return { id: Math.random().toString(36).slice(2), weightKg: 60, reps, rir: 2, warmup, completedAt: 0 }
}

function entry(exerciseId: string, sets = 3, reps = 10): SessionEntry {
  return {
    id: `entry-${exerciseId}-${Math.random().toString(36).slice(2)}`,
    exerciseId,
    plannedSets: sets,
    repMin: 8,
    repMax: 12,
    targetRIR: 2,
    restSec: 120,
    incrementKg: 2.5,
    sets: Array.from({ length: sets }, () => set(reps)),
    pain: 0,
    technique: 'clean',
  }
}

function session(date: string, exerciseIds: string[], title = 'Session', sets = 3, reps = 10): Session {
  return {
    id: `s-${date}-${title}`,
    date,
    programId: null,
    programDayId: null,
    title,
    status: 'completed',
    startedAt: 0,
    endedAt: 0,
    entries: exerciseIds.map((id) => entry(id, sets, reps)),
    note: undefined,
  } as Session
}

const PUSH = ['barbell-bench-press', 'dumbbell-shoulder-press', 'lateral-raise', 'triceps-pushdown']
const PULL = ['lat-pulldown', 'barbell-row', 'face-pull', 'dumbbell-curl']

describe('findUsualSessions', () => {
  it('finds a repeated combination and counts it correctly', () => {
    const sessions = [
      session(addDays(TODAY, -2), PUSH),
      session(addDays(TODAY, -9), PUSH),
      session(addDays(TODAY, -16), PUSH),
    ]
    const usuals = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    expect(usuals).toHaveLength(1)
    expect(usuals[0].timesDone).toBe(3)
    expect(usuals[0].daysSince).toBe(2)
    expect(usuals[0].exercises.map((e) => e.exerciseId).sort()).toEqual([...PUSH].sort())
  })

  it('keeps two different routines apart', () => {
    const sessions = [
      session(addDays(TODAY, -1), PUSH, 'Push'),
      session(addDays(TODAY, -3), PULL, 'Pull'),
      session(addDays(TODAY, -8), PUSH, 'Push'),
      session(addDays(TODAY, -10), PULL, 'Pull'),
    ]
    const usuals = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    expect(usuals).toHaveLength(2)
    const names = usuals.map((u) => u.exercises.map((e) => e.exerciseId).sort().join(','))
    expect(names).toContain([...PUSH].sort().join(','))
    expect(names).toContain([...PULL].sort().join(','))
  })

  it('tolerates swapping one movement without splitting the pattern', () => {
    // Same day, machine lateral raise instead of dumbbell — still your push day.
    const swapped = ['barbell-bench-press', 'dumbbell-shoulder-press', 'machine-lateral-raise', 'triceps-pushdown']
    const sessions = [
      session(addDays(TODAY, -2), PUSH),
      session(addDays(TODAY, -9), swapped),
      session(addDays(TODAY, -16), PUSH),
    ]
    const usuals = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    expect(usuals).toHaveLength(1)
    expect(usuals[0].timesDone).toBe(3)
    // The occasional swap stays out of the core; the movements you always do stay in.
    const core = usuals[0].exercises.map((e) => e.exerciseId)
    expect(core).toContain('barbell-bench-press')
    expect(core).toContain('lateral-raise')
    expect(core).not.toContain('machine-lateral-raise')
  })

  it('refuses to call a one-off a habit', () => {
    const sessions = [session(addDays(TODAY, -3), PUSH)]
    expect(findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })).toEqual([])
  })

  it('ignores sessions outside the window', () => {
    const sessions = [
      session(addDays(TODAY, -70), PUSH),
      session(addDays(TODAY, -80), PUSH),
      session(addDays(TODAY, -90), PUSH),
    ]
    expect(findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })).toEqual([])
  })

  it('ignores abandoned sessions and warm-up-only entries', () => {
    const abandoned = { ...session(addDays(TODAY, -2), PUSH), status: 'abandoned' } as Session
    const warmupOnly: Session = {
      ...session(addDays(TODAY, -4), PUSH),
      entries: PUSH.map((id) => ({ ...entry(id), sets: [set(10, true), set(8, true)] })),
    }
    const usuals = findUsualSessions({
      sessions: [abandoned, warmupOnly, session(addDays(TODAY, -6), PUSH)],
      exercises: EXERCISE_LIBRARY,
      today: TODAY,
    })
    expect(usuals).toEqual([])
  })

  it('records the typical set and rep counts you actually use', () => {
    const sessions = [
      session(addDays(TODAY, -2), PUSH, 'Push', 4, 8),
      session(addDays(TODAY, -9), PUSH, 'Push', 4, 8),
    ]
    const usuals = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    const bench = usuals[0].exercises.find((e) => e.exerciseId === 'barbell-bench-press')!
    expect(bench.typicalSets).toBe(4)
    expect(bench.typicalReps).toBe(8)
    expect(bench.frequency).toBe(1)
  })

  it('names a pattern from the muscles it actually trains', () => {
    const sessions = [session(addDays(TODAY, -2), PULL), session(addDays(TODAY, -9), PULL)]
    const usuals = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    expect(usuals[0].name).toMatch(/Lats|Back|Biceps/i)
  })

  it('carries an auditable reason and a confidence that grows with repetition', () => {
    const twice = findUsualSessions({
      sessions: [session(addDays(TODAY, -2), PUSH), session(addDays(TODAY, -9), PUSH)],
      exercises: EXERCISE_LIBRARY,
      today: TODAY,
    })
    expect(twice[0].confidence).toBe('low')
    expect(twice[0].reason).toMatch(/trained this combination 2 times/)

    const often = findUsualSessions({
      sessions: [-2, -9, -16, -23, -30].map((d) => session(addDays(TODAY, d), PUSH)),
      exercises: EXERCISE_LIBRARY,
      today: TODAY,
    })
    expect(often[0].confidence).toBe('high')
  })

  it('is deterministic', () => {
    const sessions = [
      session(addDays(TODAY, -1), PUSH),
      session(addDays(TODAY, -3), PULL),
      session(addDays(TODAY, -8), PUSH),
      session(addDays(TODAY, -10), PULL),
    ]
    const a = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    const b = findUsualSessions({ sessions: [...sessions].reverse(), exercises: EXERCISE_LIBRARY, today: TODAY })
    expect(a.map((u) => u.id)).toEqual(b.map((u) => u.id))
  })

  it('gives a stable id so the UI does not remount on every render', () => {
    const sessions = [session(addDays(TODAY, -2), PUSH), session(addDays(TODAY, -9), PUSH)]
    const first = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    const second = findUsualSessions({ sessions, exercises: EXERCISE_LIBRARY, today: TODAY })
    expect(first[0].id).toBe(second[0].id)
  })
})

describe('mostOverdue', () => {
  it('picks the pattern left longest', () => {
    const usuals = findUsualSessions({
      sessions: [
        session(addDays(TODAY, -1), PUSH, 'Push'),
        session(addDays(TODAY, -8), PUSH, 'Push'),
        session(addDays(TODAY, -6), PULL, 'Pull'),
        session(addDays(TODAY, -13), PULL, 'Pull'),
      ],
      exercises: EXERCISE_LIBRARY,
      today: TODAY,
    })
    expect(mostOverdue(usuals)!.exercises.map((e) => e.exerciseId).sort()).toEqual([...PULL].sort())
  })

  it('returns null when there is nothing to go on', () => {
    expect(mostOverdue([])).toBeNull()
  })
})

describe('toProgramDay', () => {
  it('rebuilds a runnable session around how you actually train', () => {
    const usuals = findUsualSessions({
      sessions: [
        session(addDays(TODAY, -2), PUSH, 'Push', 4, 8),
        session(addDays(TODAY, -9), PUSH, 'Push', 4, 8),
      ],
      exercises: EXERCISE_LIBRARY,
      today: TODAY,
    })
    const day = toProgramDay(usuals[0], EXERCISE_LIBRARY, { restSec: 150, targetRIR: 2 })
    expect(day.slots).toHaveLength(PUSH.length)
    const bench = day.slots.find((s) => s.exerciseId === 'barbell-bench-press')!
    expect(bench.sets).toBe(4)
    expect(bench.repMax).toBe(8)
    expect(bench.repMin).toBe(4)
    expect(bench.restSec).toBe(150)
    // Slot ids must be unique or React keys collide.
    expect(new Set(day.slots.map((s) => s.id)).size).toBe(day.slots.length)
  })

  it('drops movements that no longer exist in the library', () => {
    const usuals = findUsualSessions({
      sessions: [session(addDays(TODAY, -2), PUSH), session(addDays(TODAY, -9), PUSH)],
      exercises: EXERCISE_LIBRARY,
      today: TODAY,
    })
    const day = toProgramDay(usuals[0], EXERCISE_LIBRARY.filter((e) => e.id !== 'lateral-raise'), {
      restSec: 120,
      targetRIR: 2,
    })
    expect(day.slots.map((s) => s.exerciseId)).not.toContain('lateral-raise')
    expect(day.slots.length).toBe(PUSH.length - 1)
  })

  it('never produces a rep range that is inverted or zero-length', () => {
    const usuals = findUsualSessions({
      sessions: [
        session(addDays(TODAY, -2), PUSH, 'Push', 3, 1),
        session(addDays(TODAY, -9), PUSH, 'Push', 3, 1),
      ],
      exercises: EXERCISE_LIBRARY,
      today: TODAY,
    })
    const day = toProgramDay(usuals[0], EXERCISE_LIBRARY, { restSec: 120, targetRIR: 2 })
    for (const slot of day.slots) {
      expect(slot.repMin).toBeGreaterThanOrEqual(1)
      expect(slot.repMax).toBeGreaterThanOrEqual(slot.repMin)
      expect(slot.sets).toBeGreaterThan(0)
    }
  })
})

describe('against the demo dataset', () => {
  it('detects the recurring days in six weeks of real training', async () => {
    const { buildDemoData } = await import('@/seed/demo')
    const data = buildDemoData()
    const usuals = findUsualSessions({
      sessions: data.sessions,
      exercises: data.exercises,
      today: toIsoDate(),
    })
    expect(usuals.length).toBeGreaterThanOrEqual(2)
    for (const usual of usuals) {
      expect(usual.timesDone).toBeGreaterThanOrEqual(2)
      expect(usual.exercises.length).toBeGreaterThan(0)
      expect(usual.name.length).toBeGreaterThan(0)
    }
    expect(mostOverdue(usuals)).not.toBeNull()
  })
})

describe('naming a session by what was in it', () => {
  const byId = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e]))

  it('names it after the muscles it actually trained', () => {
    const name = nameFor(['barbell-bench-press', 'dumbbell-curl', 'barbell-curl'], byId)
    expect(name).toMatch(/chest/i)
    expect(name).toMatch(/biceps/i)
  })

  it('is a description, not a template slot', () => {
    // The whole point: "Upper A" is where a session came from, not what
    // happened in it, and it stops being true the moment a movement is
    // swapped. The name must never fall back to one when it has movements.
    const name = nameFor(['back-squat', 'romanian-deadlift'], byId, ['Lower B'])
    expect(name).not.toMatch(/Lower B/)
    expect(name.length).toBeGreaterThan(0)
  })

  it('falls back to the recorded title only when it knows nothing', () => {
    expect(nameFor(['not-a-real-exercise'], byId, ['Upper A'])).toBe('Upper A')
  })
})

describe('the day a pattern lands on', () => {
  const sessionOn = (date: string, ids: string[]): Session => ({
    id: `s-${date}`,
    date,
    programId: null,
    programDayId: null,
    title: 'Session',
    status: 'completed',
    startedAt: 0,
    endedAt: 1,
    entries: ids.map((id, i) => ({
      id: `e${i}`,
      exerciseId: id,
      plannedSets: 3,
      repMin: 6,
      repMax: 10,
      targetRIR: 2,
      restSec: 120,
      incrementKg: 2.5,
      sets: [{ id: `set${i}`, weightKg: 50, reps: 8, rir: 2, warmup: false, completedAt: 1 }],
      pain: 0,
      technique: 'clean' as const,
    })),
  })

  const IDS = ['barbell-bench-press', 'dumbbell-curl']

  it('reports the weekday when the pattern actually keeps to one', () => {
    // 2026-08-04, -11, -18 are all Tuesdays.
    const usuals = findUsualSessions({
      sessions: [sessionOn('2026-08-04', IDS), sessionOn('2026-08-11', IDS), sessionOn('2026-08-18', IDS)],
      exercises: EXERCISE_LIBRARY,
      today: '2026-08-20',
    })
    expect(usuals[0]?.usualWeekday).toBe('Tuesday')
  })

  it('says nothing when the day moves around', () => {
    // Telling somebody their chest day is Tuesday when it has been Tuesday
    // once in three is worse than staying quiet.
    const usuals = findUsualSessions({
      sessions: [sessionOn('2026-08-04', IDS), sessionOn('2026-08-13', IDS), sessionOn('2026-08-16', IDS)],
      exercises: EXERCISE_LIBRARY,
      today: '2026-08-20',
    })
    expect(usuals[0]?.usualWeekday).toBeNull()
  })
})
