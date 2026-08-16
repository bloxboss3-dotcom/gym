import { ES } from '@/i18n/es'
import { interpolate } from '@/lib/interpolate'

/**
 * Translation.
 *
 * The key IS the English string. That is the whole design, and it is chosen
 * for one property above all the others: a missing translation renders the
 * English, so nothing can break. There is no invented key namespace to keep in
 * sync with the markup, no `screens.today.heading.title` to mistype, and no
 * state in which a screen shows a raw key to somebody. Half-translated is a
 * legible app; half-keyed is not.
 *
 * The cost is that two different English strings that happen to be identical
 * get one translation. Usually the fix is to make the English distinct, which
 * is an improvement anyway — but not always, and "Back" is the case that
 * proved it: the navigation button and the cape slot are both correctly called
 * Back in English, and they are "Atrás" and "Espalda" in Spanish.
 *
 * So a key may carry a context after a pipe: `t('Back|slot')` looks up
 * `'Back|slot'` and, finding nothing, renders `Back`. The context never
 * reaches the screen, English or otherwise. This is gettext's msgctxt, and it
 * is deliberately the exception rather than the habit — a context on every
 * string would rebuild the invented key namespace this design exists to avoid.
 *
 * Interpolation is `{name}` placeholders rather than template literals,
 * because a template literal produces a finished sentence at runtime and there
 * is nothing left to look up. Word order differs between languages, so the
 * placeholders have to survive into the translated string.
 */

export type Lang = 'en' | 'es'

export const LANGUAGES: { code: Lang; label: string; english: string }[] = [
  { code: 'en', label: 'English', english: 'English' },
  { code: 'es', label: 'Español', english: 'Spanish' },
]

export const DEFAULT_LANG: Lang = 'en'

/** English source string → translation. */
export type Dict = Record<string, string>

const DICTS: Record<Lang, Dict> = {
  en: {},
  es: ES,
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'es'
}

/**
 * Translate one string.
 *
 * Returns the English unchanged when the language is English, when no
 * translation exists, or when the translation is empty — an empty string in a
 * catalogue is a mistake, and rendering nothing is the worst way to surface it.
 */
export function translate(english: string, lang: Lang): string {
  const found = lang === 'en' ? undefined : DICTS[lang]?.[english]
  if (found && found.length > 0) return found
  // No translation: strip any `|context` so the fallback is readable English
  // rather than the disambiguator the catalogue needed.
  const pipe = english.lastIndexOf('|')
  return pipe > 0 ? english.slice(0, pipe) : english
}

/** Fill `{placeholders}` after translating. Re-exported; see the note there. */
export { interpolate } from '@/lib/interpolate'

export function translateWith(
  english: string,
  lang: Lang,
  vars?: Record<string, string | number>,
): string {
  return interpolate(translate(english, lang), vars)
}

/** Every English string that has a translation, for coverage checks. */
export function translatedKeys(lang: Lang): string[] {
  return Object.keys(DICTS[lang] ?? {})
}
