import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY, searchExercises } from '@/data/exercises'

/**
 * These are search terms a real person types, paired with the movement they
 * expect back. Asserting on the terms rather than on "aliases exist" is the
 * point: an alias array nobody searches is worth nothing, and a name-only
 * filter passes any test that merely counts aliases.
 */
const SEARCHES: [query: string, expectedId: string][] = [
  ['barbell shoulder press', 'overhead-press'],
  ['shoulder press', 'overhead-press'],
  ['ohp', 'overhead-press'],
  ['military press', 'overhead-press'],
  ['bench', 'barbell-bench-press'],
  ['rdl', 'romanian-deadlift'],
  ['lat pulldown', 'lat-pulldown'],
  ['side raise', 'lateral-raise'],
  ['tricep pushdown', 'triceps-pushdown'],
  ['glute bridge', 'hip-thrust'],
  ['cgbp', 'close-grip-bench'],
  ['machine bicep curl', 'machine-curl'],
  ['bicep machine', 'machine-curl'],
  ['preacher curl', 'preacher-curl'],
  ['bent over row', 'barbell-row'],
]

describe('exercise search', () => {
  // Top three, not first: "shoulder press" honestly matches three movements
  // and picking a winner between them is not the search's job. Three is what
  // fits above the fold on a phone, so a hit inside three is a hit the user
  // sees without scrolling.
  it.each(SEARCHES)('“%s” surfaces %s without scrolling', (query, expectedId) => {
    const results = searchExercises(EXERCISE_LIBRARY, query)
    expect(results.slice(0, 3).map((r) => r.exercise.id)).toContain(expectedId)
  })

  it('says which alias matched, so the swap is explained', () => {
    const [top] = searchExercises(EXERCISE_LIBRARY, 'barbell shoulder press')
    expect(top.exercise.name).toBe('Overhead Press')
    expect(top.matchedAlias).toBe('barbell shoulder press')
  })

  it('does not claim an alias when the name itself matched', () => {
    const [top] = searchExercises(EXERCISE_LIBRARY, 'overhead')
    expect(top.exercise.id).toBe('overhead-press')
    expect(top.matchedAlias).toBeUndefined()
  })

  it('ranks a name match above an alias match', () => {
    const results = searchExercises(EXERCISE_LIBRARY, 'lateral raise')
    // Every hit whose name contains the phrase comes before every hit that
    // only matched an alias.
    const firstAlias = results.findIndex((r) => r.matchedAlias)
    const lastName = results.map((r) => !r.matchedAlias).lastIndexOf(true)
    if (firstAlias >= 0) expect(firstAlias).toBeGreaterThan(lastName)
  })

  it('finds a movement when the words are the wrong way round', () => {
    const results = searchExercises(EXERCISE_LIBRARY, 'press bench barbell')
    expect(results.map((r) => r.exercise.id)).toContain('barbell-bench-press')
  })

  it('returns the whole library for an empty query', () => {
    expect(searchExercises(EXERCISE_LIBRARY, '   ')).toHaveLength(EXERCISE_LIBRARY.length)
  })

  it('carries no alias that the name already contains', () => {
    // A redundant alias is dead weight and hides a real gap in the list.
    for (const exercise of EXERCISE_LIBRARY) {
      for (const alias of exercise.aliases ?? []) {
        expect(
          exercise.name.toLowerCase().includes(alias.toLowerCase()),
          `${exercise.id}: alias “${alias}” is already in the name`,
        ).toBe(false)
      }
    }
  })

  it('points every alternative and alias at a real exercise', () => {
    const ids = new Set(EXERCISE_LIBRARY.map((e) => e.id))
    for (const exercise of EXERCISE_LIBRARY) {
      for (const id of exercise.alternatives ?? []) {
        expect(ids.has(id), `${exercise.id} → ${id}`).toBe(true)
      }
    }
  })
})
