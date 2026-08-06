import type { IsoDate } from '@/types'

/**
 * Date helpers. Everything is LOCAL calendar time — a workout logged at 11pm
 * belongs to that day for the person doing it, regardless of UTC.
 */

export function toIsoDate(d: Date = new Date()): IsoDate {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = fromIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

export function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = fromIsoDate(b).getTime() - fromIsoDate(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function isSameDay(a: IsoDate, b: IsoDate): boolean {
  return a === b
}

export function weekdayOf(iso: IsoDate): number {
  return fromIsoDate(iso).getDay()
}

/** Monday-based week start, matching how most training weeks are planned. */
export function startOfWeek(iso: IsoDate): IsoDate {
  const d = fromIsoDate(iso)
  const dow = d.getDay()
  const back = dow === 0 ? 6 : dow - 1
  return addDays(iso, -back)
}

export function endOfWeek(iso: IsoDate): IsoDate {
  return addDays(startOfWeek(iso), 6)
}

/** Stable key for "which week is this" — the Monday of that week. */
export function weekKey(iso: IsoDate): string {
  return startOfWeek(iso)
}

export function lastNDays(n: number, endIso: IsoDate = toIsoDate()): IsoDate[] {
  const out: IsoDate[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endIso, -i))
  return out
}

export function isWithinDays(iso: IsoDate, days: number, refIso: IsoDate = toIsoDate()): boolean {
  const diff = daysBetween(iso, refIso)
  return diff >= 0 && diff < days
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayName(n: number, short = false): string {
  return (short ? WEEKDAY_SHORT : WEEKDAY_NAMES)[((n % 7) + 7) % 7]
}

export function formatDateLabel(iso: IsoDate, today: IsoDate = toIsoDate()): string {
  const diff = daysBetween(iso, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  const d = fromIsoDate(iso)
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === fromIsoDate(today).getFullYear()
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }
  return d.toLocaleDateString(undefined, opts)
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`
  return `${sec}s`
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/** Local calendar day for a millisecond timestamp. */
export function isoDateOf(ms: number | null | undefined): IsoDate | null {
  if (!ms) return null
  return toIsoDate(new Date(ms))
}
