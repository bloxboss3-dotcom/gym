import { useId, useMemo } from 'react'
import { cx } from '@/components/ui'
import { formatDateLabel } from '@/lib/date'
import { useT } from '@/i18n/useT'

/**
 * Hand-rolled SVG charts.
 *
 * A charting library would be several times the size of this whole app's JS
 * budget. These render from a viewBox so they scale to any phone width, use
 * font sizes that stay readable at 360px, and never require horizontal scroll.
 * Charts are only used where a trend genuinely clarifies something.
 */

export interface Point {
  date: string
  value: number
}

function niceBounds(values: number[], padFraction = 0.12): { min: number; max: number } {
  if (!values.length) return { min: 0, max: 1 }
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  if (rawMin === rawMax) {
    const pad = Math.max(1, Math.abs(rawMin) * 0.1)
    return { min: rawMin - pad, max: rawMax + pad }
  }
  const span = rawMax - rawMin
  return { min: rawMin - span * padFraction, max: rawMax + span * padFraction }
}

export function LineChart({
  series,
  height = 160,
  format = (v: number) => `${Math.round(v)}`,
  color = 'var(--color-ember-400)',
  secondary,
  secondaryColor = 'var(--color-cool)',
  ariaLabel,
  className,
}: {
  series: Point[]
  height?: number
  format?: (value: number) => string
  color?: string
  secondary?: Point[]
  secondaryColor?: string
  ariaLabel: string
  className?: string
}) {
  const { t } = useT()
  const gradientId = useId()
  const width = 320
  const padL = 34
  const padR = 8
  const padT = 10
  const padB = 22

  const all = useMemo(
    () => [...series.map((p) => p.value), ...(secondary?.map((p) => p.value) ?? [])],
    [series, secondary],
  )
  const bounds = useMemo(() => niceBounds(all), [all])

  if (series.length === 0) {
    return (
      <div className={cx('h-40 grid place-items-center text-sm text-smoke forge-panel', className)}>
        {t('Not enough data yet.')}
      </div>
    )
  }

  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const x = (i: number, n: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => padT + plotH - ((v - bounds.min) / (bounds.max - bounds.min)) * plotH

  const toPath = (points: Point[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i, points.length).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')

  const areaPath =
    series.length > 1
      ? `${toPath(series)} L${x(series.length - 1, series.length).toFixed(1)},${padT + plotH} L${x(0, series.length).toFixed(1)},${padT + plotH} Z`
      : ''

  const ticks = [bounds.max, (bounds.max + bounds.min) / 2, bounds.min]
  const labelIdx = series.length > 1 ? [0, series.length - 1] : [0]

  return (
    <figure className={cx('m-0', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${ariaLabel}. ${series.length} points from ${format(series[0].value)} to ${format(series[series.length - 1].value)}.`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-slate)"
              strokeWidth="1"
              strokeDasharray={i === 1 ? '3 4' : undefined}
            />
            <text x={2} y={y(t) + 3.5} fill="var(--color-smoke)" fontSize="9">
              {format(t)}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {secondary && secondary.length > 1 && (
          <path
            d={toPath(secondary)}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.6"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        )}

        <path d={toPath(series)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {series.map((p, i) => (
          <circle
            key={p.date + i}
            cx={x(i, series.length)}
            cy={y(p.value)}
            r={series.length > 24 ? 1.4 : 2.6}
            fill={color}
          />
        ))}

        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i, series.length)}
            y={height - 6}
            fill="var(--color-smoke)"
            fontSize="9"
            textAnchor={i === 0 ? 'start' : 'end'}
          >
            {formatDateLabel(series[i].date)}
          </text>
        ))}
      </svg>
    </figure>
  )
}

export function BarChart({
  bars,
  height = 150,
  ariaLabel,
  format = (v: number) => `${Math.round(v)}`,
  className,
}: {
  bars: { label: string; value: number; tone?: 'ember' | 'good' | 'caution' | 'danger' | 'cool'; sub?: string }[]
  height?: number
  ariaLabel: string
  format?: (value: number) => string
  className?: string
}) {
  const { t } = useT()
  const max = Math.max(1, ...bars.map((b) => b.value))
  const tones = {
    ember: 'bg-gradient-to-t from-ember-700 to-ember-400',
    good: 'bg-gradient-to-t from-vital/50 to-vital',
    caution: 'bg-gradient-to-t from-caution/50 to-caution',
    danger: 'bg-gradient-to-t from-danger/50 to-danger',
    cool: 'bg-gradient-to-t from-cool/40 to-cool',
  }
  if (!bars.length) {
    return <div className={cx('h-32 grid place-items-center text-sm text-smoke forge-panel', className)}>{t('No data yet.')}</div>
  }
  return (
    <div className={className} role="img" aria-label={`${ariaLabel}: ${bars.map((b) => `${b.label} ${format(b.value)}`).join(', ')}`}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {bars.map((bar) => (
          <div key={bar.label} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-ash tabular leading-none">{format(bar.value)}</span>
            <div
              className={cx('w-full rounded-t-md min-h-[2px]', tones[bar.tone ?? 'ember'])}
              style={{ height: `${Math.max(2, (bar.value / max) * (height - 26))}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {bars.map((bar) => (
          <div key={bar.label} className="flex-1 min-w-0 text-center">
            <span className="block text-[10px] text-smoke truncate">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Horizontal bars with a target marker — used for weekly sets per muscle. */
export function TargetBar({
  value,
  target,
  ceiling,
  label,
  sub,
  tone = 'ember',
  onClick,
}: {
  value: number
  target: { min: number; max: number }
  ceiling: number
  label: string
  sub?: string
  tone?: 'ember' | 'good' | 'caution' | 'danger'
  onClick?: () => void
}) {
  const { t } = useT()
  const scale = Math.max(ceiling, target.max, value) || 1
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`
  const tones = {
    ember: 'bg-ember-500',
    good: 'bg-vital',
    caution: 'bg-caution',
    danger: 'bg-danger',
  }
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cx('w-full text-left block', onClick && 'touch-target')}
    >
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <span className="text-sm text-parchment truncate">{label}</span>
        <span className="text-sm tabular text-ash shrink-0">
          {Number(value.toFixed(1))} <span className="text-smoke text-xs">{t('sets')}</span>
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-steel overflow-hidden">
        {/* Target band */}
        <div
          aria-hidden
          className="absolute inset-y-0 bg-parchment/8 border-x border-parchment/20"
          style={{ left: pct(target.min), width: `calc(${pct(target.max)} - ${pct(target.min)})` }}
        />
        <div className={cx('h-full rounded-full transition-[width] duration-500', tones[tone])} style={{ width: pct(value) }} />
      </div>
      {sub && <p className="text-[11px] text-smoke mt-1 leading-snug">{sub}</p>}
    </Wrapper>
  )
}

/** Small 28-day heat strip for consistency. */
export function ConsistencyStrip({
  days,
}: {
  days: { date: string; status: string; planned: boolean }[]
}) {
  const color = (status: string) => {
    switch (status) {
      case 'trained':
        return 'bg-ember-500'
      case 'ran':
        return 'bg-cool'
      case 'deload':
        return 'bg-gold-500'
      case 'rest':
        return 'bg-vital/50'
      case 'missed':
        return 'bg-danger/45'
      default:
        return 'bg-steel'
    }
  }
  return (
    <div
      className="grid grid-cols-14 gap-1"
      style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
      role="img"
      aria-label={`Last ${days.length} days: ${days.filter((d) => d.status === 'trained').length} lifting sessions, ${days.filter((d) => d.status === 'ran').length} runs, ${days.filter((d) => d.status === 'missed').length} missed planned days.`}
    >
      {days.map((day) => (
        <span
          key={day.date}
          title={`${day.date}: ${day.status}`}
          className={cx('aspect-square rounded-[3px]', color(day.status))}
        />
      ))}
    </div>
  )
}
