import { useEffect, useRef, useState } from 'react'
import {
  BONES,
  sample,
  solve,
  type Animation,
  type Point,
  type Skeleton,
} from '@/character/rig'
import {
  CLOTH,
  SKIN,
  SKIN_SHADE,
  bodyFamily,
  footFamily,
  handFamily,
  headFamily,
  itemIn,
  paletteOf,
  weaponShape,
  type Equipped,
  type Palette,
} from '@/character/palette'
import { useReducedMotion } from '@/components/ui'

/**
 * The warrior, animated from the skeleton — wearing your gear.
 *
 * This is deliberately NOT an anonymous silhouette. The whole point of a
 * character you build across months of training is that it is the one that
 * turns up when there is something to do with it, carrying the plate you
 * earned and the blade you pulled out of a pack. A generic shadow fighting on
 * your behalf would make every session's reward decorative in the worst sense.
 *
 * So the same equipped-items map that dresses the fixed-pose renderer dresses
 * this one, and the same `build` value that thickens that figure's arms
 * thickens these. Gear is drawn per FAMILY rather than per art variant (see
 * `palette.ts`) because eighty hand-placed paths cannot follow a moving joint.
 *
 * Motion arcs stay: a fast limb without a trail reads as a teleport, and the
 * arc is what tells the eye where it came from.
 */

const TRAIL_LENGTH = 7

export function Fighter({
  animation,
  playing,
  loop,
  onDone,
  className,
  equipped = {},
  build = 0,
  mirror = false,
  accent = 'var(--color-ember-500)',
  label,
}: {
  animation: Animation
  playing: boolean
  loop?: boolean
  onDone?: () => void
  className?: string
  /** The same equipped map the Forge writes. Empty renders an unarmoured body. */
  equipped?: Equipped
  /** 0 → 1, from level. Same lever as the fixed-pose renderer. */
  build?: number
  /** Face left instead of right, for the opponent's side of the ring. */
  mirror?: boolean
  accent?: string
  label?: string
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

  const gear = {
    face: itemIn(equipped, 'face'),
    head: itemIn(equipped, 'head'),
    body: itemIn(equipped, 'body'),
    hands: itemIn(equipped, 'hands'),
    feet: itemIn(equipped, 'feet'),
    weapon: itemIn(equipped, 'weapon'),
    back: itemIn(equipped, 'back'),
    aura: itemIn(equipped, 'aura'),
  }

  // The accessible name names the gear on purpose. It is how a screen-reader
  // user knows the figure in the ring is the one they dressed, and it is what
  // the browser suite asserts against — "your character fights" has to be
  // checkable, not just visible.
  const described = [
    gear.body?.name ? `wearing ${gear.body.name}` : null,
    gear.weapon && gear.weapon.art !== 'none' ? `carrying ${gear.weapon.name}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <svg
      viewBox="0 0 200 280"
      className={className}
      role="img"
      aria-label={[label ?? `Your warrior performing ${animation.name}`, described].filter(Boolean).join(', ')}
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

      <g transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}>
        <g transform={`translate(${shake} 0)`}>
          {/* Ground line and contact shadow. */}
          <rect x="10" y="251" width="180" height="2" fill="url(#fighter-ground)" />
          <ellipse cx={skeleton.pelvis.x} cy="252" rx="34" ry="5" fill="#000" opacity="0.45" />

          {gear.aura && gear.aura.art !== 'none' && (
            <Aura at={skeleton.pelvis} p={paletteOf(gear.aura, { base: accent, accent })} />
          )}

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

          <RiggedWarrior skeleton={skeleton} build={build} gear={gear} accent={accent} />

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
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** SVG rotation, degrees clockwise from the +x axis. */
function angleOf(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

function along(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: to.x + (dx / length) * distance, y: to.y + (dy / length) * distance }
}

type GearSet = {
  face?: ReturnType<typeof itemIn>
  head?: ReturnType<typeof itemIn>
  body?: ReturnType<typeof itemIn>
  hands?: ReturnType<typeof itemIn>
  feet?: ReturnType<typeof itemIn>
  weapon?: ReturnType<typeof itemIn>
  back?: ReturnType<typeof itemIn>
  aura?: ReturnType<typeof itemIn>
}

// ---------------------------------------------------------------------------
// The body
// ---------------------------------------------------------------------------

/**
 * Draw order matters more here than anywhere else in the app: far-side limbs,
 * then the cape, then the torso and its armour, then near-side limbs and the
 * weapon on top. Get it wrong and an arm passes through the breastplate.
 */
function RiggedWarrior({
  skeleton: s,
  build,
  gear,
  accent,
}: {
  skeleton: Skeleton
  build: number
  gear: GearSet
  accent: string
}) {
  const b = Math.min(1, Math.max(0, build))
  // The same growth curve the fixed-pose renderer uses, in stroke widths.
  const upperArm = 10 + b * 5
  const foreArm = 8.5 + b * 3.5
  const thigh = 13 + b * 4
  const calf = 11 + b * 3
  const delt = 7 + b * 6

  const bodyPalette = paletteOf(gear.body, { base: CLOTH, accent: '#777' })
  const family = bodyFamily(gear.body?.art)

  /*
   * The rig carries a narrower frame than the Forge figure — its shoulder
   * joints sit ±11 from the spine where the cosmetic renderer puts them at
   * ±21 — because the animations were authored around joint POSITIONS, not
   * silhouette width. Widening `BONES` would silently re-time every keyframe.
   *
   * So the torso is built here instead, off the spine axis: take the direction
   * from pelvis to chest, take its perpendicular, and step out along it. That
   * keeps the shoulders square to the body through a lean, a crouch and a full
   * spin, which hard-coded x offsets would not.
   */
  const spineX = s.chest.x - s.pelvis.x
  const spineY = s.chest.y - s.pelvis.y
  const spineLength = Math.hypot(spineX, spineY) || 1
  const perp = { x: -spineY / spineLength, y: spineX / spineLength }
  // Which way the near side lies along that perpendicular, whatever the pose.
  const nearSign =
    (s.shoulderNear.x - s.chest.x) * perp.x + (s.shoulderNear.y - s.chest.y) * perp.y >= 0 ? 1 : -1
  const out = (from: Point, distance: number): Point => ({
    x: from.x + perp.x * distance * nearSign,
    y: from.y + perp.y * distance * nearSign,
  })

  const shoulderHalf = 17 + b * 4
  const hipHalf = 14 + b * 1.5
  const shoulderNear = out(s.chest, shoulderHalf)
  const shoulderFar = out(s.chest, -shoulderHalf)
  const hipNear = out(s.pelvis, hipHalf)
  const hipFar = out(s.pelvis, -hipHalf)

  const limbLine = (a: Point, c: Point, width: number, colour: string, dim = false) => (
    <path
      d={`M${a.x} ${a.y} L${c.x} ${c.y}`}
      stroke={colour}
      strokeWidth={width}
      strokeOpacity={dim ? 0.78 : 1}
      strokeLinecap="round"
      fill="none"
    />
  )

  return (
    <g>
      {gear.back && gear.back.art !== 'none' && (
        <Cape
          shoulderFar={shoulderFar}
          shoulderNear={shoulderNear}
          pelvis={s.pelvis}
          nearSign={nearSign}
          p={paletteOf(gear.back, { base: CLOTH, accent: '#666' })}
        />
      )}

      {/* Far side, dimmed so the figure still reads as three-dimensional. */}
      {limbLine(hipFar, s.kneeFar, thigh * 0.94, SKIN_SHADE, true)}
      {limbLine(s.kneeFar, s.footFar, calf * 0.94, SKIN_SHADE, true)}
      {limbLine(shoulderFar, s.elbowFar, upperArm * 0.94, SKIN_SHADE, true)}
      {limbLine(s.elbowFar, s.handFar, foreArm * 0.94, SKIN_SHADE, true)}
      <Foot at={s.footFar} from={s.kneeFar} item={gear.feet} dim />
      <Hand at={s.handFar} from={s.elbowFar} item={gear.hands} dim />
      <ellipse
        cx={shoulderFar.x}
        cy={shoulderFar.y}
        rx={delt * 0.9}
        ry={delt * 0.8}
        fill={gear.body ? bodyPalette.base : SKIN_SHADE}
        opacity="0.78"
      />

      {/* Bare torso, then the armour over it. */}
      <path
        d={`M${shoulderFar.x} ${shoulderFar.y} L${shoulderNear.x} ${shoulderNear.y} L${hipNear.x} ${hipNear.y} L${hipFar.x} ${hipFar.y} Z`}
        fill={SKIN}
      />
      {gear.body && (
        <Torso
          shoulderFar={shoulderFar}
          shoulderNear={shoulderNear}
          hipFar={hipFar}
          hipNear={hipNear}
          p={bodyPalette}
          family={family}
        />
      )}

      {/* Near side on top. */}
      {limbLine(hipNear, s.kneeNear, thigh, SKIN)}
      {limbLine(s.kneeNear, s.footNear, calf, SKIN)}
      {limbLine(shoulderNear, s.elbowNear, upperArm, SKIN)}
      {limbLine(s.elbowNear, s.handNear, foreArm, SKIN)}
      {/* The shoulder cap takes the armour's colour when armour is worn, so
          the arm reads as joined to the torso rather than as a patch of bare
          skin sitting on top of a breastplate. */}
      <ellipse
        cx={shoulderNear.x}
        cy={shoulderNear.y}
        rx={family === 'heavy' ? delt + 3 : delt}
        ry={(family === 'heavy' ? delt + 3 : delt) * 0.88}
        fill={gear.body ? (family === 'heavy' ? bodyPalette.accent : bodyPalette.base) : SKIN}
      />
      <Foot at={s.footNear} from={s.kneeNear} item={gear.feet} />
      <Hand at={s.handNear} from={s.elbowNear} item={gear.hands} />

      {/* Neck, head, face, headgear. */}
      {limbLine(s.neck, s.chest, 11 + b * 2, SKIN)}
      <circle cx={s.head.x} cy={s.head.y} r={BONES.head * 0.86} fill={SKIN} />
      <Face at={s.head} from={s.neck} item={gear.face} accent={accent} nearSign={nearSign} />
      <Headgear at={s.head} from={s.neck} item={gear.head} />

      {/* The weapon last, in the near hand. */}
      <Weapon hand={s.handNear} elbow={s.elbowNear} item={gear.weapon} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Gear modules
// ---------------------------------------------------------------------------

function Torso({
  shoulderFar,
  shoulderNear,
  hipFar,
  hipNear,
  p,
  family,
}: {
  shoulderFar: Point
  shoulderNear: Point
  hipFar: Point
  hipNear: Point
  p: Palette
  family: 'light' | 'medium' | 'heavy'
}) {
  const mid = (a: Point, c: Point): Point => ({ x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 })
  const lerp = (a: Point, c: Point, t: number): Point => ({
    x: a.x + (c.x - a.x) * t,
    y: a.y + (c.y - a.y) * t,
  })
  // The waist sits at 60% of the way down and pulls in, which is the single
  // shape that separates an armoured torso from a rectangle.
  const pinch = family === 'heavy' ? 0.9 : 0.82
  const waistNear = lerp(lerp(shoulderNear, hipNear, 0.6), mid(shoulderNear, hipNear), 1 - pinch)
  const waistFar = lerp(lerp(shoulderFar, hipFar, 0.6), mid(shoulderFar, hipFar), 1 - pinch)
  const collar = mid(shoulderFar, shoulderNear)
  const belt = mid(hipFar, hipNear)

  return (
    <g>
      <path
        d={[
          `M${shoulderFar.x} ${shoulderFar.y}`,
          `L${shoulderNear.x} ${shoulderNear.y}`,
          `L${waistNear.x} ${waistNear.y}`,
          `L${hipNear.x} ${hipNear.y}`,
          `L${hipFar.x} ${hipFar.y}`,
          `L${waistFar.x} ${waistFar.y}`,
          'Z',
        ].join(' ')}
        fill={p.base}
      />
      {/* One accent line down the sternum and a belt at the hips — enough to
          separate a tunic from a breastplate without per-variant detail. */}
      <path
        d={`M${collar.x} ${collar.y} L${belt.x} ${belt.y}`}
        stroke={p.accent}
        strokeWidth={family === 'heavy' ? 2.5 : 1.5}
        opacity="0.75"
        fill="none"
      />
      <path
        d={`M${hipFar.x} ${hipFar.y} L${hipNear.x} ${hipNear.y}`}
        stroke={p.accent}
        strokeWidth={family === 'light' ? 3 : 5}
        strokeLinecap="round"
        opacity="0.9"
        fill="none"
      />
      {p.glow && (
        <path
          d={`M${collar.x} ${collar.y} L${belt.x} ${belt.y}`}
          stroke={p.glow}
          strokeWidth="7"
          opacity="0.22"
          fill="none"
        />
      )}
    </g>
  )
}

function Headgear({ at, from, item }: { at: Point; from: Point; item?: ReturnType<typeof itemIn> }) {
  const family = headFamily(item?.art)
  if (family === 'none' || !item) return null
  const p = paletteOf(item, { base: '#2b2b31', accent: '#888' })
  const r = BONES.head * 0.86
  const rotation = angleOf(from, at) + 90

  return (
    <g transform={`rotate(${rotation} ${at.x} ${at.y})`}>
      {family === 'hair' && (
        <path
          d={`M${at.x - r} ${at.y - 2} A${r} ${r} 0 0 1 ${at.x + r} ${at.y - 2} L${at.x + r * 0.5} ${at.y - r * 0.4} L${at.x - r * 0.5} ${at.y - r * 0.4} Z`}
          fill={p.base}
        />
      )}
      {family === 'hood' && (
        <path
          d={`M${at.x - r - 3} ${at.y + 6} A${r + 3} ${r + 3} 0 0 1 ${at.x + r + 3} ${at.y + 6} L${at.x + r} ${at.y + 12} L${at.x - r} ${at.y + 12} Z`}
          fill={p.base}
        />
      )}
      {(family === 'helm' || family === 'crown' || family === 'horned') && (
        <>
          <path
            d={`M${at.x - r} ${at.y} A${r} ${r} 0 0 1 ${at.x + r} ${at.y} L${at.x + r} ${at.y + 3} L${at.x - r} ${at.y + 3} Z`}
            fill={p.base}
          />
          <path
            d={`M${at.x - r} ${at.y + 1} L${at.x + r} ${at.y + 1}`}
            stroke={p.accent}
            strokeWidth="2.5"
            fill="none"
          />
        </>
      )}
      {family === 'horned' && (
        <>
          <path d={`M${at.x - r + 2} ${at.y - 3} q-9 -8 -3 -14 q5 6 5 12 Z`} fill={p.accent} />
          <path d={`M${at.x + r - 2} ${at.y - 3} q9 -8 3 -14 q-5 6 -5 12 Z`} fill={p.accent} />
        </>
      )}
      {family === 'crown' &&
        [-8, 0, 8].map((dx) => (
          <path
            key={dx}
            d={`M${at.x + dx - 3} ${at.y - r * 0.6} L${at.x + dx} ${at.y - r * 1.25} L${at.x + dx + 3} ${at.y - r * 0.6} Z`}
            fill={p.accent}
          />
        ))}
    </g>
  )
}

function Face({
  at,
  from,
  item,
  accent,
  nearSign,
}: {
  at: Point
  from: Point
  item?: ReturnType<typeof itemIn>
  accent: string
  nearSign: number
}) {
  const art = item?.art ?? 'stoic'
  const p = paletteOf(item, { base: '#2b2b31', accent: '#888' })
  const eye = art === 'ember-eyes' ? accent : '#1b1b20'
  // Rotates with the head and shifts toward whichever way the body faces, so
  // the face does not stay stubbornly upright through a spinning kick.
  const spin = `rotate(${angleOf(from, at) + 90} ${at.x} ${at.y})`
  const lookX = at.x + nearSign * 2

  if (art === 'masked' || art === 'veiled') {
    return (
      <g transform={spin}>
        <rect x={at.x - 13} y={at.y - 6} width="26" height="13" rx="3" fill={p.base} />
        <rect x={at.x - 7} y={at.y - 2} width="4" height="2.5" fill={p.accent} />
        <rect x={at.x + 3} y={at.y - 2} width="4" height="2.5" fill={p.accent} />
      </g>
    )
  }

  return (
    <g transform={spin}>
      {art === 'warpaint' && (
        <path d={`M${at.x - 12} ${at.y - 4} L${at.x + 12} ${at.y - 4} L${at.x + 10} ${at.y + 2} L${at.x - 10} ${at.y + 2} Z`} fill={p.base} opacity="0.85" />
      )}
      {art === 'scarred' && (
        <path d={`M${at.x + 5} ${at.y - 8} L${at.x + 9} ${at.y + 4}`} stroke={SKIN_SHADE} strokeWidth="1.6" fill="none" />
      )}
      <circle cx={lookX - 5} cy={at.y - 2} r="2.1" fill={eye} />
      <circle cx={lookX + 5} cy={at.y - 2} r="2.1" fill={eye} />
      <path d={`M${lookX - 4} ${at.y + 7} q4 2 8 0`} stroke={SKIN_SHADE} strokeWidth="1.4" fill="none" />
    </g>
  )
}

function Hand({
  at,
  from,
  item,
  dim,
}: {
  at: Point
  from: Point
  item?: ReturnType<typeof itemIn>
  dim?: boolean
}) {
  if (!item) return null
  const p = paletteOf(item, { base: CLOTH, accent: '#888' })
  const heavy = handFamily(item.art) === 'gauntlet'
  const r = heavy ? 7 : 5.5
  const rotation = angleOf(from, at)
  return (
    <g opacity={dim ? 0.78 : 1} transform={`rotate(${rotation} ${at.x} ${at.y})`}>
      <ellipse cx={at.x} cy={at.y} rx={r} ry={r * 0.85} fill={p.base} />
      {heavy && <rect x={at.x - r} y={at.y - r * 0.55} width={r * 0.8} height={r * 1.1} rx="1.5" fill={p.accent} />}
    </g>
  )
}

function Foot({
  at,
  from,
  item,
  dim,
}: {
  at: Point
  from: Point
  item?: ReturnType<typeof itemIn>
  dim?: boolean
}) {
  const family = footFamily(item?.art)
  const p = paletteOf(item, { base: CLOTH, accent: '#777' })
  const rotation = angleOf(from, at) - 90
  const toe = family === 'wrap' ? 10 : 13
  return (
    <g opacity={dim ? 0.78 : 1} transform={`rotate(${rotation} ${at.x} ${at.y})`}>
      {family === 'greave' && <rect x={at.x - 5} y={at.y - 20} width="10" height="16" rx="2.5" fill={p.base} />}
      <path
        d={`M${at.x - 5} ${at.y - 4} L${at.x + 5} ${at.y - 4} L${at.x + toe * 0.55} ${at.y + 4} L${at.x - 5} ${at.y + 4} Z`}
        fill={item ? p.base : SKIN_SHADE}
      />
      {family !== 'wrap' && (
        <path d={`M${at.x - 5} ${at.y + 3.5} L${at.x + toe * 0.55} ${at.y + 3.5}`} stroke={p.accent} strokeWidth="2" fill="none" />
      )}
    </g>
  )
}

function Weapon({ hand, elbow, item }: { hand: Point; elbow: Point; item?: ReturnType<typeof itemIn> }) {
  const shape = weaponShape(item?.art)
  if (shape.family === 'none' || !item) return null
  const p = paletteOf(item, { base: '#8a8a94', accent: '#c9c9d2' })
  const rotation = angleOf(elbow, hand)
  const tip = along(elbow, hand, shape.length)
  const butt = along(hand, elbow, shape.family === 'haft' ? shape.length * 0.25 : 6)

  // Every point below is already computed in world space along the forearm
  // axis, so there is nothing left to rotate — an extra transform here was a
  // no-op at best and a mismatch with transform-origin at worst.
  void rotation
  return (
    <g>
      <g>
        {shape.family === 'haft' && (
          <>
            <line x1={butt.x} y1={butt.y} x2={tip.x} y2={tip.y} stroke={p.base} strokeWidth={shape.width} strokeLinecap="round" />
            <path
              d={`M${tip.x} ${tip.y} L${tip.x - 6} ${tip.y - 8} L${tip.x + 4} ${tip.y - 10} Z`}
              fill={p.accent}
            />
          </>
        )}
        {shape.family === 'heavy-head' && (
          <>
            <line x1={butt.x} y1={butt.y} x2={tip.x} y2={tip.y} stroke="#4a3a2c" strokeWidth="4" strokeLinecap="round" />
            <circle cx={tip.x} cy={tip.y} r={shape.width} fill={p.base} />
            <circle cx={tip.x} cy={tip.y} r={shape.width * 0.55} fill={p.accent} />
          </>
        )}
        {(shape.family === 'blade' || shape.family === 'twin') && (
          <>
            <line x1={butt.x} y1={butt.y} x2={hand.x} y2={hand.y} stroke="#3a2c24" strokeWidth="4" strokeLinecap="round" />
            <path
              d={[
                `M${hand.x} ${hand.y - shape.width}`,
                `L${tip.x - 4} ${tip.y - shape.width * 0.7}`,
                `L${tip.x} ${tip.y}`,
                `L${tip.x - 4} ${tip.y + shape.width * 0.7}`,
                `L${hand.x} ${hand.y + shape.width}`,
                'Z',
              ].join(' ')}
              fill={p.base}
            />
            <line
              x1={hand.x}
              y1={hand.y}
              x2={tip.x - 3}
              y2={tip.y}
              stroke={p.accent}
              strokeWidth="1.5"
              opacity="0.9"
            />
            {p.glow && (
              <line x1={hand.x} y1={hand.y} x2={tip.x} y2={tip.y} stroke={p.glow} strokeWidth={shape.width * 2.4} opacity="0.18" />
            )}
          </>
        )}
      </g>
    </g>
  )
}

function Cape({
  shoulderFar,
  shoulderNear,
  pelvis,
  nearSign,
  p,
}: {
  shoulderFar: Point
  shoulderNear: Point
  pelvis: Point
  nearSign: number
  p: Palette
}) {
  // Hangs from the shoulder line and trails away from the facing side, so a
  // spin swings it behind the figure rather than through it.
  const back = -nearSign
  const drop = pelvis.y + 44
  return (
    <path
      d={[
        `M${shoulderNear.x + back * 2} ${shoulderNear.y}`,
        `M${shoulderFar.x} ${shoulderFar.y}`,
        `L${shoulderNear.x} ${shoulderNear.y}`,
        `L${pelvis.x + back * 10} ${drop}`,
        `L${pelvis.x + back * 40} ${drop - 14}`,
        'Z',
      ].join(' ')}
      fill={p.base}
      opacity="0.62"
    />
  )
}

function Aura({ at, p }: { at: Point; p: Palette }) {
  const colour = p.glow ?? p.accent
  return (
    <g opacity="0.5">
      <circle cx={at.x} cy={at.y - 10} r="62" fill={colour} opacity="0.1" />
      <circle cx={at.x} cy={at.y - 10} r="38" fill={colour} opacity="0.12" />
    </g>
  )
}
