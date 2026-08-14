import { useCallback } from 'react'
import { DEFAULT_LANG, isLang, translate, translateWith, type Lang } from '@/i18n'
import { useStore } from '@/state/store'

/**
 * The translator, bound to whatever language the profile is set to.
 *
 * `t('Log set')` — the English is the key, so a component reads the same as
 * it did before and a missing translation shows the English rather than a
 * placeholder. `t('Rest {seconds}s', { seconds: 90 })` interpolates after
 * translating, so word order can differ between languages.
 */
export function useT(): {
  t: (english: string, vars?: Record<string, string | number>) => string
  lang: Lang
} {
  const { data } = useStore()
  const raw = data.settings.language
  const lang: Lang = isLang(raw) ? raw : DEFAULT_LANG

  const t = useCallback(
    (english: string, vars?: Record<string, string | number>) =>
      vars ? translateWith(english, lang, vars) : translate(english, lang),
    [lang],
  )

  return { t, lang }
}
