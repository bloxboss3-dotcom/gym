/**
 * Fill `{placeholders}` in a string.
 *
 * Lives here rather than in `@/i18n` because the engines need it and the
 * engines may not depend on anything: importing `@/i18n` pulls the entire
 * Spanish catalogue into `src/engine/`, which is both a dependency the
 * working agreement forbids and a chunk of the bundle nothing there uses.
 *
 * An unknown placeholder is left as it was written. Printing "undefined" into
 * a sentence somebody reads mid-set is worse than printing "{reps}", which at
 * least says what went missing.
 */
export function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  )
}
