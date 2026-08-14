import { describe, expect, it } from 'vitest'
import { ES } from '@/i18n/es'
import { DEFAULT_LANG, LANGUAGES, interpolate, isLang, translate, translateWith } from '@/i18n'
import { assessMovement } from '@/engine/coaching'
import { BLOCK_EXPLANATION } from '@/engine/intensity'
import { EXERCISE_BY_ID } from '@/data/exercises'
import { addDays } from '@/lib/date'
import type { Session } from '@/types'

/**
 * The i18n contract.
 *
 * The property that matters more than coverage: a missing or broken
 * translation must render readable English, never a blank, never a key. An
 * app that is half translated is usable; one that shows `screens.today.title`
 * to somebody is not.
 */

describe('falling back to English', () => {
  it('returns the English unchanged when the language is English', () => {
    expect(translate('Log set', 'en')).toBe('Log set')
  })

  it('returns the English when no translation exists', () => {
    expect(translate('a string nobody has translated', 'es')).toBe(
      'a string nobody has translated',
    )
  })

  it('never renders an empty string, even if the catalogue has one', () => {
    // An empty entry is a mistake, and showing nothing is the worst possible
    // way to surface it.
    const withHole = Object.entries(ES).find(([, v]) => v === '')
    expect(withHole, 'the catalogue should not contain empty translations').toBeUndefined()
    expect(translate('', 'es')).toBe('')
  })

  it('defaults to English', () => {
    expect(DEFAULT_LANG).toBe('en')
  })
})

describe('the catalogue', () => {
  it('translates something', () => {
    expect(Object.keys(ES).length).toBeGreaterThan(0)
  })

  it('never leaves a translation identical to the English', () => {
    // An entry that matches its key is either an oversight or a word that
    // needs no translation; the second is fine but should be deliberate, so
    // the exceptions are listed.
    const SAME_IN_BOTH = new Set(['FORGED', 'RIR', 'XP', 'kg', 'lb', 'kcal', 'IMC', 'BMI'])
    const identical = Object.entries(ES)
      .filter(([en, es]) => en === es && !SAME_IN_BOTH.has(en))
      .map(([en]) => en)
    expect(identical, `untranslated entries: ${identical.slice(0, 10).join(', ')}`).toEqual([])
  })

  it('keeps every placeholder that the English had', () => {
    // Drop a {placeholder} in translation and the number never appears —
    // "Rest {seconds}s" becoming "Descansa" silently loses the whole point.
    const broken: string[] = []
    for (const [en, es] of Object.entries(ES)) {
      const wanted = [...en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      const got = [...es.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      if (wanted.join(',') !== got.join(',')) broken.push(`${en} → ${es}`)
    }
    expect(broken, `placeholders lost: ${broken.slice(0, 5).join(' | ')}`).toEqual([])
  })
})

describe('interpolation', () => {
  it('fills placeholders after translating', () => {
    expect(interpolate('Rest {seconds}s', { seconds: 90 })).toBe('Rest 90s')
  })

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}')
  })

  it('works through translateWith', () => {
    expect(translateWith('Rest {seconds}s', 'en', { seconds: 60 })).toBe('Rest 60s')
  })
})

describe('language codes', () => {
  it('recognises the ones it ships', () => {
    expect(isLang('en')).toBe(true)
    expect(isLang('es')).toBe(true)
    expect(isLang('fr')).toBe(false)
    expect(isLang(undefined)).toBe(false)
  })

  it('offers Spanish in its own language, not in English', () => {
    // Somebody who cannot read the English chrome has to be able to find it.
    const es = LANGUAGES.find((l) => l.code === 'es')
    expect(es?.label).toBe('Español')
  })
})

describe('the engine prose is genuinely reachable', () => {
  /*
    A translation keyed on a sentence the engine never emits is dead weight
    that reads like coverage. So this asserts the other direction: take the
    English the engines actually produce, and check it is translated.

    The engines are pure and take no language, which is what makes this
    possible — the sentence they return IS the lookup key.
  */
  const TODAY = '2026-08-13'
  const bench = EXERCISE_BY_ID['barbell-bench-press']

  const sessionOn = (date: string, weightKg: number, rir: number | null): Session => ({
    id: `s-${date}`,
    date,
    programId: null,
    programDayId: null,
    title: 'Session',
    status: 'completed',
    startedAt: 0,
    endedAt: 1,
    entries: [
      {
        id: `e-${date}`,
        exerciseId: 'barbell-bench-press',
        plannedSets: 3,
        repMin: 6,
        repMax: 10,
        targetRIR: 2,
        restSec: 150,
        incrementKg: 2.5,
        pain: 0,
        technique: 'clean',
        sets: [0, 1, 2].map((i) => ({
          id: `set-${date}-${i}`,
          weightKg,
          reps: 8,
          rir,
          warmup: false,
          completedAt: 1,
        })),
      },
    ],
  })

  const weekly = (loads: number[], rir: number | null) =>
    loads.map((w, i) => sessionOn(addDays(TODAY, -(loads.length - 1 - i) * 7), w, rir))

  it('translates every coaching note the engine can produce', () => {
    const untranslated: string[] = []
    const cases: [number[], number | null][] = [
      [[60, 62.5, 65, 67.5], 2],
      [[60, 60, 60, 60], 2],
      [[70, 67.5, 65, 62.5], 2],
      [[60, 60, 60, 60], 5],
      [[60, 60, 60, 60], 0],
      [[70, 67.5, 65, 62.5], 5],
      [[70, 67.5, 65, 62.5], 0],
      [[60, 62.5, 65, 67.5], 5],
      [[60, 65], 2],
    ]
    for (const [loads, rir] of cases) {
      const v = assessMovement(bench, weekly(loads, rir), TODAY)
      if (!v) continue
      if (translate(v.noteTemplate, 'es') === v.noteTemplate) untranslated.push(v.noteTemplate)
    }
    expect(untranslated, `no Spanish for: ${untranslated.join(' | ')}`).toEqual([])
  })

  it('translates every reason a finisher can be refused', () => {
    const untranslated = Object.values(BLOCK_EXPLANATION).filter(
      (english) => translate(english, 'es') === english,
    )
    expect(untranslated, `no Spanish for: ${untranslated.join(' | ')}`).toEqual([])
  })
})
