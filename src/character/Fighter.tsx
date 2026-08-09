import { useEffect, useRef, useState } from 'react'
import {
  BONES,
  sample,
  solve,
  type Animation,
  type Skeleton,
} from '@/character/rig'
import { useReducedMotion } from '@/components/ui'

/**
 * The warrior, animated from the skeleton.
 *
 * Rendered as a silhouette on purpose. It is the same choice Shadow Fight
 * makes and it is not a shortcut — with no interior detail to keep consistent,
 * every frame of budget goes into shape and motion, which is what actually
 * reads as a kick at phone size. It also keeps the art entirely original and
 * entirely vector.
 *
 * Motion arcs are the other half. A fast limb without a trail reads as a
 * teleport; the arc is what tells the eye where it came from.
 */

const TRAIL_LENGTH = 7

export function Fighter({
  animation,
  playing,
  loop,
  onDone,
  className,
  accent = 'var(--color-ember-500)',
  silhouette = '#0b0b0d',
}: {
  animation: Animation
  playing: boolean
  loop?: boolean
  onDone?: () => void
  className?: string
  accent?: string
  silhouette?: string
}) {
  const reduced = useReducedMotion()
  const [frame, setFrame] = useState(() => sample(animation, 0))
  const trail = useRef<{ x: number; y: number }[]>([])
  const raf = useRef<number | null>(null)
  const startedAt = useRef(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    trail.current = []
    if (!playing) {
      setFrame(sample(animation, 0))
      return
    }
    // Reduced motion: show the strike frame rather than nothing, so the pose
    // still communicates, then finish immediately.
    if (reduced) {
      const strike = animation.frames.find((f) => f.impact)?.t ?? 0.5
      setFrame(sample(animation, strike))
      const timer = window.setTimeout(() => doneRef.current?.(), 400)
      return () => window.clearTimeout(timer)
    }

    startedAt.current = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startedAt.current
      const t = elapsed / animation.durationMs
      if (t >= 1) {
        if (loop) {
          startedAt.current = now
        } else {
          setFrame(sample(animation, 1))
          trail.current = []
          doneRef.current?.()
          return
        }
      }
      const next = sample(animation, t % 1)
      setFrame(next)
      if (next.trail) {
        const joint = solve(next.pose)[next.trail]
        trail.current = [...trail.current, joint].slice(-TRAIL_LENGTH)
      } else if (trail.current.length) {
        trail.current = trail.current.slice(1)
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [animation, playing, loop, reduced])

  const skeleton = solve(frame.pose)
  const impactPoint = frame.impactJoint ? skeleton[frame.impactJoint] : null
  const shake = frame.impact > 0.05 ? (Math.random() - 0.5) * frame.impact * 5 : 0

  return (
    <svg
      viewBox="0 0 200 280"
      className={className}
      role="img"
      aria-label={`Warrior performing ${animation.name}`}
    >
      <defs>
        <linearGradient id="fighter-ground" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="50%" stopColor={accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="fighter-impact">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="35%" stopColor={accent} stopOpacity="0.85" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform={`translate(${shake} 0)`}>
        {/* Ground line and contact shadow. */}
        <rect x="10" y="251" width="180" height="2" fill="url(#fighter-ground)" />
        <ellipse cx={skeleton.pelvis.x} cy="252" rx="34" ry="5" fill="#000" opacity="0.45" />

        {/* Motion arc, oldest segment faintest. */}
        {trail.current.length > 1 &&
          trail.current.slice(1).map((point, i) => {
            const previous = trail.current[i]
            const strength = (i + 1) / trail.current.length
            return (
              <line
                key={i}
                x1={previous.x}
                y1={previous.y}
                x2={point.x}
                y2={point.y}
                stroke={accent}
                strokeWidth={3 + strength * 7}
                strokeLinecap="round"
                opacity={strength * 0.45}
              />
            )
          })}

        <Silhouette skeleton={skeleton} fill={silhouette} />

        {/* Rim light along the leading edge — separates the silhouette from
            the background without adding interior detail. */}
        <Silhouette skeleton={skeleton} fill="none" stroke={accent} strokeOpacity={0.55} />

        {impactPoint && frame.impact > 0 && (
          <g opacity={frame.impact}>
            <circle cx={impactPoint.x} cy={impactPoint.y} r={26 * frame.impact} fill="url(#fighter-impact)" />
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const r = 18 + (1 - frame.impact) * 26
              const x = impactPoint.x + Math.sin((angle * Math.PI) / 180) * r
              const y = impactPoint.y + Math.cos((angle * Math.PI) / 180) * r
              return (
                <line
                  key={angle}
                  x1={impactPoint.x}
                  y1={impactPoint.y}
                  x2={x}
                  y2={y}
                  stroke={accent}
                  strokeWidth={2.5 * frame.impact}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              )
            })}
          </g>
        )}
      </g>
    </svg>
  )
}

/**
 * The body itself.
 *
 * Far-side limbs are drawn first and slightly darker so the figure still reads
 * as three-dimensional despite being one flat colour.
 */
function Silhouette({
  skeleton: s,
  fill,
  stroke,
  strokeOpacity,
}: {
  skeleton: Skeleton
  fill: string
  stroke?: string
  strokeOpacity?: number
}) {
  const solid = fill !== 'none'
  const line = (a: { x: number; y: number }, b: { x: number; y: number }, width: number, dim = false) => ({
    d: `M${a.x} ${a.y} L${b.x} ${b.y}`,
    stroke: solid ? fill : stroke,
    strokeWidth: width,
    strokeOpacity: solid ? (dim ? 0.72 : 1) : strokeOpacity,
    strokeLinecap: 'round' as const,
    fill: 'none',
  })

  return (
    <g>
      {/* Far side first. */}
      <path {...line(s.hipFar, s.kneeFar, 15, true)} />
      <path {...line(s.kneeFar, s.footFar, 12, true)} />
      <path {...line(s.shoulderFar, s.elbowFar, 12, true)} />
      <path {...line(s.elbowFar, s.handFar, 10, true)} />

      {/* Torso as a tapered slab between hips and shoulders. */}
      <path
        d={`M${s.shoulderFar.x} ${s.shoulderFar.y} L${s.shoulderNear.x} ${s.shoulderNear.y} L${s.hipNear.x + 4} ${s.hipNear.y} L${s.hipFar.x - 4} ${s.hipFar.y} Z`}
        fill={solid ? fill : 'none'}
        stroke={solid ? undefined : stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={solid ? undefined : 2}
      />
      <path {...line(s.pelvis, s.chest, 26)} />

      {/* Near side on top. */}
      <path {...line(s.hipNear, s.kneeNear, 15)} />
      <path {...line(s.kneeNear, s.footNear, 12)} />
      <path {...line(s.shoulderNear, s.elbowNear, 12)} />
      <path {...line(s.elbowNear, s.handNear, 10)} />

      {/* Neck and head. */}
      <path {...line(s.neck, s.chest, 11)} />
      <circle
        cx={s.head.x}
        cy={s.head.y}
        r={BONES.head * 0.86}
        fill={solid ? fill : 'none'}
        stroke={solid ? undefined : stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={solid ? undefined : 2}
      />
    </g>
  )
}
