import type { Dict } from '@/i18n'
import { COMMON } from '@/i18n/es/common'
import { SHELL } from '@/i18n/es/shell'
import { TODAY } from '@/i18n/es/today'
import { TRAIN } from '@/i18n/es/train'
import { SESSION } from '@/i18n/es/session'
import { NUTRITION } from '@/i18n/es/nutrition'
import { PROGRESS } from '@/i18n/es/progress'
import { ONBOARDING } from '@/i18n/es/onboarding'
import { PROFILE } from '@/i18n/es/profile'
import { FORGE } from '@/i18n/es/forge'
import { MISC } from '@/i18n/es/misc'
import { DATA } from '@/i18n/es/data'
import { ITEMS } from '@/i18n/es/items'
import { ENGINE } from '@/i18n/es/engine'

/**
 * Spanish.
 *
 * One module per surface so translating a screen touches one file and several
 * people can work at once without colliding. The merge is a plain spread:
 * duplicates across namespaces are harmless rather than an error, because the
 * same English string means the same thing wherever it appears — which is the
 * assumption the English-as-key design rests on anyway.
 *
 * Neutral, non-regional Spanish. This is read mid-set by somebody out of
 * breath, so the register is plain and the sentences are short. "Tú"
 * throughout rather than "usted": the English is direct, and a formal
 * register would make it a different app.
 */
export const ES: Dict = {
  ...COMMON,
  ...SHELL,
  ...TODAY,
  ...TRAIN,
  ...SESSION,
  ...NUTRITION,
  ...PROGRESS,
  ...ONBOARDING,
  ...PROFILE,
  ...FORGE,
  ...MISC,
  ...DATA,
  ...ITEMS,
  ...ENGINE,
}
