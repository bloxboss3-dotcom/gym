import type { BodyWeightEntry, IsoDate, LoggedSet, Session, SessionEntry } from '@/types'
import { daysBetween, toIsoDate } from '@/lib/date'

/**
 * Derived training statistics.
 *
 * Everything here is explicitly an *estimate*. FORGED never claims to measure
 * muscle mass, and estimated 1RM is a formula fitted to group data, not a
 * measurement of your maximum.
 */

/**
 * Epley estimated 1RM, RIR-adjusted.
 *
 * A set of 8 with 2 reps in reserve is treated as an 8+2 = 10-rep capability.
 * The formula degrades badly at very high rep counts, so anything above 15
 * effective reps is clamped and flagged by callers as low-confidence.
 */
export function estimateOneRepMax(weightKg: number, reps: number, rir: number | null = 0): number {
  if (weightKg <= 0 || reps <= 0) return 0
  const effective = Math.min(15, reps + Math.max(0, rir ?? 0))
  if (effective === 1) return weightKg
  return Number((weightKg * (1 + effective / 30)).toFixed(2))
}

export function bestSetOf(sets: LoggedSet[]): LoggedSet | null {
  const working = sets.filter((s) => !s.warmup && s.reps > 0)
  if (!working.length) return null
  return working.reduce((best, s) =>
    estimateOneRepMax(s.weightKg, s.reps, s.rir) > estimateOneRepMax(best.weightKg, best.reps, best.rir)
      ? s
      : best,
  )
}

export function entryBestE1RM(entry: SessionEntry): number {
  const best = bestSetOf(entry.sets)
  return best ? estimateOneRepMax(best.weightKg, best.reps, best.rir) : 0
}

/** Sum of weight × reps across working sets — the classic volume-load proxy. */
export function volumeLoad(sets: LoggedSet[]): number {
  return sets
    .filter((s) => !s.warmup)
    .reduce((sum, s) => sum + s.weightKg * s.reps, 0)
}

export function sessionVolumeLoad(session: Session): number {
  return session.entries.reduce((sum, e) => sum + volumeLoad(e.sets), 0)
}

export function workingSetsOf(session: Session): LoggedSet[] {
  return session.entries.flatMap((e) => e.sets.filter((s) => !s.warmup))
}

export interface PersonalRecord {
  exerciseId: string
  /** Heaviest working set, any rep count. */
  topWeightKg: number
  topWeightReps: number
  /** Best estimated 1RM. */
  bestE1RM: number
  /** Best volume load in a single session. */
  bestSessionVolume: number
  date: IsoDate
}

export function personalRecords(sessions: Session[]): PersonalRecord[] {
  const byExercise = new Map<string, PersonalRecord>()
  for (const session of sessions) {
    if (session.status !== 'completed') continue
    for (const entry of session.entries) {
      const working = entry.sets.filter((s) => !s.warmup && s.reps > 0)
      if (!working.length) continue
      const heaviest = working.reduce((a, b) => (b.weightKg > a.weightKg ? b : a))
      const e1rm = entryBestE1RM(entry)
      const vol = volumeLoad(entry.sets)
      const current = byExercise.get(entry.exerciseId)
      if (!current) {
        byExercise.set(entry.exerciseId, {
          exerciseId: entry.exerciseId,
          topWeightKg: heaviest.weightKg,
          topWeightReps: heaviest.reps,
          bestE1RM: e1rm,
          bestSessionVolume: vol,
          date: session.date,
        })
        continue
      }
      let changed = false
      if (heaviest.weightKg > current.topWeightKg) {
        current.topWeightKg = heaviest.weightKg
        current.topWeightReps = heaviest.reps
        changed = true
      }
      if (e1rm > current.bestE1RM) {
        current.bestE1RM = e1rm
        changed = true
      }
      if (vol > current.bestSessionVolume) {
        current.bestSessionVolume = vol
        changed = true
      }
      if (changed) current.date = session.date
    }
  }
  return [...byExercise.values()]
}

export interface TrendPoint {
  date: IsoDate
  value: number
}

export function e1rmTrend(sessions: Session[], exerciseId: string): TrendPoint[] {
  return sessions
    .filter((s) => s.status === 'completed')
    .flatMap((s) =>
      s.entries
        .filter((e) => e.exerciseId === exerciseId)
        .map((e) => ({ date: s.date, value: entryBestE1RM(e) })),
    )
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Simple linear-regression slope per day. Returns 0 when there is too little data. */
export function trendSlope(points: TrendPoint[]): number {
  if (points.length < 2) return 0
  const base = points[0].date
  const xs = points.map((p) => daysBetween(base, p.date))
  const ys = points.map((p) => p.value)
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  return den === 0 ? 0 : num / den
}

/** Centred rolling average — the standard way to read a noisy body-weight line. */
export function rollingAverage(points: TrendPoint[], window: number): TrendPoint[] {
  if (!points.length) return []
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((p, i) => {
    const from = Math.max(0, i - window + 1)
    const slice = sorted.slice(from, i + 1)
    const avg = slice.reduce((s, q) => s + q.value, 0) / slice.length
    return { date: p.date, value: Number(avg.toFixed(2)) }
  })
}

export function bodyWeightSeries(entries: BodyWeightEntry[]): TrendPoint[] {
  const byDate = new Map<IsoDate, number[]>()
  for (const e of entries) {
    const list = byDate.get(e.date) ?? []
    list.push(e.weightKg)
    byDate.set(e.date, list)
  }
  return [...byDate.entries()]
    .map(([date, values]) => ({
      date,
      value: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function sevenDayAverageWeight(entries: BodyWeightEntry[], endIso: IsoDate = toIsoDate()): number | null {
  const recent = entries.filter((e) => {
    const diff = daysBetween(e.date, endIso)
    return diff >= 0 && diff < 7
  })
  if (!recent.length) return null
  return Number((recent.reduce((s, e) => s + e.weightKg, 0) / recent.length).toFixed(2))
}

export interface RirQuality {
  ratedSets: number
  totalSets: number
  averageRir: number | null
  /** Fraction of working sets with no RIR reported. */
  missingFraction: number
  /** Fraction of rated sets taken to 0 RIR. */
  toFailureFraction: number
}

export function rirQuality(sets: LoggedSet[]): RirQuality {
  const working = sets.filter((s) => !s.warmup)
  const rated = working.filter((s) => s.rir !== null)
  const avg = rated.length
    ? Number((rated.reduce((s, x) => s + (x.rir as number), 0) / rated.length).toFixed(2))
    : null
  return {
    ratedSets: rated.length,
    totalSets: working.length,
    averageRir: avg,
    missingFraction: working.length ? 1 - rated.length / working.length : 0,
    toFailureFraction: rated.length ? rated.filter((s) => s.rir === 0).length / rated.length : 0,
  }
}
