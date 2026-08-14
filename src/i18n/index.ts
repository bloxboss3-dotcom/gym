import { ES } from '@/i18n/es'

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
 * get one translation. In an app this size that is a fair trade, and where it
 * bites the fix is to make the English distinct — which is usually an
 * improvement anyway.
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
  if (lang === 'en') return english
  const found = DICTS[lang]?.[english]
  return found && found.length > 0 ? found : english
}

/** Fill `{placeholders}` after translating. */
export function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  )
}

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
