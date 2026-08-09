import { useMemo } from 'react'
import * as RIG from '@/character/rig'
import { RiggedWarrior, resolveGear } from '@/character/Fighter'
import { ARENA, attackPhase, type ArenaState, type FighterState } from '@/engine/arena'
import type { Equipped } from '@/character/palette'

/**
 * The arena, drawn.
 *
 * A side-on stage wider than the screen, with a camera that follows the pair.
 * That camera is the whole reason the fight reads as taking place somewhere:
 * with a fixed view, backing off and closing in look like the fighters
 * shrinking, and the floor never appears to move.
 *
 * Nothing here decides anything. Poses come from the simulation state — which
 * move, how far into it, on the ground or not — so what you see is exactly
 * what the engine thinks is happening, and a rendering bug can never change
 * the outcome of a bout.
 */

/** How much of the arena floor is visible at once. */
const VIEW_WIDTH = 780
const VIEW_HEIGHT = 310
/** Where the ground plane sits in the stage's own coordinates. */
const FLOOR_Y = 252
/**
 * The rig's standing feet land at about y = 242, not on its own 252 ground
 * line — the cosmetic renderer left that gap deliberately so a contact shadow
 * could sit under the figure. In an arena with a real floor the gap reads as
 * hovering, so the fighters are dropped by exactly that much.
 */
const FOOT_DROP = 10

/**
 * Which animation a fighter's current state should be showing, and how far
 * through it. Sampled rather than played on a clock, so a paused simulation
 * shows a held frame instead of drifting.
 */
export function poseFor(fighter: FighterState, elapsedMs: number): RIG.Pose {
  switch (fighter.stance) {
    case 'attack': {
      if (!fighter.move) return RIG.STANCE
      const animation = (RIG[fighter.move.animation as keyof typeof RIG] as RIG.Animation) ?? RIG.IDLE
      const total = fighter.move.startupMs + fighter.move.activeMs + fighter.move.recoveryMs
      // Map the move's own frame data onto the animation's timeline so the
      // strike frame lands during the active window rather than whenever the
      // animator happened to put it.
      const phase = attackPhase(fighter)
      const impactT = animation.frames.find((f) => f.impact)?.t ?? 0.5
      let t: number
      if (phase === 'startup') {
        t = (fighter.phaseMs / fighter.move.startupMs) * impactT
      } else if (phase === 'active') {
        t = impactT + ((fighter.phaseMs - fighter.move.startupMs) / fighter.move.activeMs) * 0.08
      } else {
        const into = fighter.phaseMs - fighter.move.startupMs - fighter.move.activeMs
        t = impactT + 0.08 + (into / fighter.move.recoveryMs) * (1 - impactT - 0.08)
      }
      void total
      return RIG.sample(animation, Math.min(1, Math.max(0, t))).pose
    }
    case 'hitstun':
      return RIG.sample(RIG.HURT, Math.min(1, fighter.phaseMs / ARENA.hitStunMs)).pose
    case 'down':
      return RIG.sample(RIG.DOWN, Math.min(1, fighter.phaseMs / ARENA.knockdownMs)).pose
    case 'block':
      return RIG.sample(RIG.BLOCK, 0.5).pose
    case 'crouch':
      return RIG.sample(RIG.CROUCH, 0.5).pose
    case 'jump':
      return RIG.sample(RIG.JUMP, 0.5).pose
    case 'walk':
      return RIG.sample(RIG.WALK, (elapsedMs % RIG.WALK.durationMs) / RIG.WALK.durationMs).pose
    case 'idle':
    default:
      return RIG.sample(RIG.IDLE, (elapsedMs % RIG.IDLE.durationMs) / RIG.IDLE.durationMs).pose
  }
}

export function ArenaStage({
  state,
  yourGear,
  yourBuild,
  theirGear,
  theirBuild,
  className,
}: {
  state: ArenaState
  yourGear: Equipped
  yourBuild: number
  theirGear: Equipped
  theirBuild: number
  className?: string
}) {
  // Camera: centred between the fighters, clamped to the arena so the view
  // never shows past the ropes.
  const midpoint = (state.you.x + state.them.x) / 2
  const camera = Math.min(
    ARENA.width - VIEW_WIDTH / 2,
    Math.max(VIEW_WIDTH / 2, midpoint),
  )
  const viewX = camera - VIEW_WIDTH / 2

  const yourPose = useMemo(() => poseFor(state.you, state.elapsedMs), [state.you, state.elapsedMs])
  const theirPose = useMemo(() => poseFor(state.them, state.elapsedMs), [state.them, state.elapsedMs])

  const impact = state.events.find((e) => e.kind === 'hit')
  const shake = impact && !impact.blocked ? (state.elapsedMs % 2 === 0 ? 3 : -3) : 0

  return (
    <svg
      viewBox={`${viewX + shake} 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={className}
      role="img"
      aria-label={`Arena. You have ${state.you.health} health, your opponent ${state.them.health}.`}
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="arena-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12121a" />
          <stop offset="100%" stopColor="#1e1a24" />
        </linearGradient>
        <linearGradient id="arena-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2028" />
          <stop offset="100%" stopColor="#15121a" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={ARENA.width} height={VIEW_HEIGHT} fill="url(#arena-sky)" />

      {/* Parallax pillars: they move slower than the camera, which is what
          tells the eye the fighters are travelling rather than the world. */}
      {Array.from({ length: 18 }, (_, i) => {
        const worldX = i * 120
        const parallax = worldX - camera * 0.45
        return (
          <g key={i} opacity="0.32">
            <rect x={parallax + camera - VIEW_WIDTH / 2} y={70} width="26" height={FLOOR_Y - 70} fill="#241d2b" />
            <rect x={parallax + camera - VIEW_WIDTH / 2 - 4} y={64} width="34" height="8" fill="#2e2534" />
          </g>
        )
      })}

      {/* Floor, and the ropes at each end so the edges of the arena are real. */}
      <rect x="0" y={FLOOR_Y} width={ARENA.width} height={VIEW_HEIGHT - FLOOR_Y} fill="url(#arena-floor)" />
      <rect x="0" y={FLOOR_Y} width={ARENA.width} height="2" fill="#4a3b52" />
      {[ARENA.margin - 26, ARENA.width - ARENA.margin + 26].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={FLOOR_Y - 120} width="6" height="120" fill="#3a2f42" />
          <rect x={x - 10} y={FLOOR_Y - 126} width="20" height="8" rx="2" fill="#4d4058" />
        </g>
      ))}

      <ArenaFighter fighter={state.them} pose={theirPose} gear={theirGear} build={theirBuild} accent="var(--color-caution)" />
      <ArenaFighter fighter={state.you} pose={yourPose} gear={yourGear} build={yourBuild} accent="var(--color-ember-500)" />
    </svg>
  )
}

function ArenaFighter({
  fighter,
  pose,
  gear,
  build,
  accent,
}: {
  fighter: FighterState
  pose: RIG.Pose
  gear: Equipped
  build: number
  accent: string
}) {
  const skeleton = RIG.solve(pose)
  // The rig draws around a pelvis at ROOT; place it in the world by shifting,
  // and mirror in place when facing left so gear never ends up back-to-front.
  const groundOffset = FLOOR_Y - 252 + FOOT_DROP
  const transform = [
    `translate(${fighter.x} ${groundOffset - fighter.y})`,
    fighter.facing === -1 ? 'scale(-1 1)' : '',
    `translate(${-RIG.ROOT.x} 0)`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <g transform={transform}>
      <ellipse
        cx={RIG.ROOT.x}
        cy={252 + fighter.y}
        rx={30 - Math.min(18, fighter.y * 0.25)}
        ry={5}
        fill="#000"
        opacity={0.45 - Math.min(0.3, fighter.y * 0.004)}
      />
      <RiggedWarrior skeleton={skeleton} build={build} gear={resolveGear(gear)} accent={accent} />
    </g>
  )
}
