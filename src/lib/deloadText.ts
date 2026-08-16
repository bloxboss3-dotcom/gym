import type { DeloadAssessment } from '@/engine/deload'

/**
 * The deload reason, with its signal list translated.
 *
 * `assessDeload` is pure and takes no language, so it joins the firing signal
 * names into one string and hands it over as a placeholder value:
 * "5 fatigue signals are firing at once: {signals}". Interpolation happens
 * AFTER translation, so that value goes onto the screen exactly as the engine
 * wrote it — which is how a fully translated Spanish sentence ended up reading
 * "Hay 5 señales de fatiga activas a la vez: elevated soreness, low readiness,
 * persistent joint discomfort…".
 *
 * The labels themselves are translated and always were; nothing was missing
 * from the catalogue. The bug was that the list was assembled one step too
 * early. So it is assembled again here, from the same signals the verdict
 * carries, once a translator is available.
 *
 * `t` is a parameter rather than an import so this stays out of the engine's
 * dependency graph in both directions.
 */
export function deloadReasonVars(
  verdict: DeloadAssessment,
  t: (english: string) => string,
): Record<string, string | number> {
  if (!('signals' in verdict.reasonVars)) return verdict.reasonVars
  return {
    ...verdict.reasonVars,
    signals: verdict.signals
      .filter((s) => s.triggered)
      .map((s) => t(s.label).toLowerCase())
      .join(', '),
  }
}
