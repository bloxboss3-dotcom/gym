import { interpolate } from '@/lib/interpolate'

/**
 * Data gaps that survive translation.
 *
 * Every engine reports what it could not judge and why, and every screen shows
 * those lines. The ones without numbers in them were translated years ago and
 * were fine. The ones WITH numbers were built with template literals —
 *
 *   `${n} movement${n === 1 ? '' : 's'} have fewer than ${MIN} sessions…`
 *
 * — which produces a finished sentence, and a finished sentence containing a
 * count is a key no catalogue can hold. Six of them shipped in English on
 * otherwise Spanish screens, appearing only when the data happened to trigger
 * them, which is why the browser leak check went so long without catching one.
 *
 * A collector rather than a convention, because the failure mode is somebody
 * adding a seventh: `push` takes the template and the values separately and
 * there is nowhere to put an interpolated string.
 *
 * Singular and plural are separate templates at the call site. Agreement rules
 * differ between languages and no amount of arithmetic in here fixes that.
 */
export interface MissingDataPart {
  template: string
  vars: Record<string, string | number>
}

export interface GapCollector {
  /** Record a gap. `template` carries `{placeholders}`; `vars` fills them. */
  push(template: string, vars?: Record<string, string | number>): void
  /** Finished English, for callers and tests that want plain sentences. */
  list: string[]
  /** The same gaps unresolved, for screens that translate before filling in. */
  parts: MissingDataPart[]
}

export function gaps(): GapCollector {
  const list: string[] = []
  const parts: MissingDataPart[] = []
  return {
    list,
    parts,
    push(template, vars = {}) {
      list.push(interpolate(template, vars))
      parts.push({ template, vars })
    },
  }
}
