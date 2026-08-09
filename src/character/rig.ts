/**
 * A skeletal rig for the warrior.
 *
 * The cosmetic renderer in `Warrior.tsx` draws a fixed pose. That is right for
 * an inventory thumbnail and useless for fighting: a kick that reads as a kick
 * needs joints that move independently, and it needs the animation principles
 * that make motion feel like it has mass — anticipation before the strike, a
 * fast extension, a slower recovery, and follow-through past the contact point.
 *
 * So limbs are computed by forward kinematics from joint ANGLES rather than
 * drawn as fixed paths, and animations are keyframed poses interpolated over
 * time. Pure maths, no dependencies, no React — testable like anything else in
 * this codebase.
 *
 * Angles are absolute, in degrees, measured from straight down:
 *   0 = down, 90 = right, -90 = left, 180 = up.
 * Absolute rather than relative-to-parent because it makes poses far easier to
 * author by hand — "the kicking leg points 95°" beats composing three offsets.
 */

export interface Point {
  x: number
  y: number
}

/** Bone lengths, matched to the proportions of the cosmetic renderer. */
export const BONES = {
  spine: 60,
  neck: 16,
  head: 21,
  upperArm: 30,
  forearm: 28,
  thigh: 52,
  shin: 40,
  foot: 14,
  shoulderSpread: 22,
  hipSpread: 10,
} as const

/** Where the pelvis sits when standing on the ground plane. */
export const ROOT: Point = { x: 100, y: 148 }

export interface Limb {
  /** [shoulder or hip, elbow or knee, hand or foot] absolute angles. */
  upper: number
  lower: number
}

export interface Pose {
  /** Pelvis offset from ROOT. Positive y is downward (crouch). */
  dx: number
  dy: number
  /** Spine angle: 0 is upright, positive leans right. */
  lean: number
  headTilt: number
  armFar: Limb
  armNear: Limb
  legFar: Limb
  legNear: Limb
  /** Whole-body rotation about the pelvis, for spins and jumps. */
  rotate: number
}

export interface Skeleton {
  pelvis: Point
  chest: Point
  neck: Point
  head: Point
  shoulderFar: Point
  shoulderNear: Point
  elbowFar: Point
  elbowNear: Point
  handFar: Point
  handNear: Point
  hipFar: Point
  hipNear: Point
  kneeFar: Point
  kneeNear: Point
  footFar: Point
  footNear: Point
}

const rad = (degrees: number) => (degrees * Math.PI) / 180

/** Step `length` from `from` at absolute `angle` (0 = down). */
export function step(from: Point, angle: number, length: number): Point {
  return {
    x: from.x + Math.sin(rad(angle)) * length,
    y: from.y + Math.cos(rad(angle)) * length,
  }
}

function rotateAbout(point: Point, pivot: Point, degrees: number): Point {
  if (!degrees) return point
  const s = Math.sin(rad(degrees))
  const c = Math.cos(rad(degrees))
  const dx = point.x - pivot.x
  const dy = point.y - pivot.y
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c }
}

/** Resolve a pose into concrete joint positions. */
export function solve(pose: Pose): Skeleton {
  const pelvis = { x: ROOT.x + pose.dx, y: ROOT.y + pose.dy }
  // Spine points up, so 180 is upright; lean tilts it.
  const chest = step(pelvis, 180 + pose.lean, BONES.spine)
  const neck = step(chest, 180 + pose.lean, BONES.neck)
  const head = step(neck, 180 + pose.lean + pose.headTilt, BONES.head)

  const shoulderFar = { x: chest.x - BONES.shoulderSpread * 0.5, y: chest.y + 4 }
  const shoulderNear = { x: chest.x + BONES.shoulderSpread * 0.5, y: chest.y + 4 }
  const hipFar = { x: pelvis.x - BONES.hipSpread, y: pelvis.y }
  const hipNear = { x: pelvis.x + BONES.hipSpread, y: pelvis.y }

  const elbowFar = step(shoulderFar, pose.armFar.upper, BONES.upperArm)
  const elbowNear = step(shoulderNear, pose.armNear.upper, BONES.upperArm)
  const kneeFar = step(hipFar, pose.legFar.upper, BONES.thigh)
  const kneeNear = step(hipNear, pose.legNear.upper, BONES.thigh)

  const raw: Skeleton = {
    pelvis,
    chest,
    neck,
    head,
    shoulderFar,
    shoulderNear,
    elbowFar,
    elbowNear,
    handFar: step(elbowFar, pose.armFar.lower, BONES.forearm),
    handNear: step(elbowNear, pose.armNear.lower, BONES.forearm),
    hipFar,
    hipNear,
    kneeFar,
    kneeNear,
    footFar: step(kneeFar, pose.legFar.lower, BONES.shin),
    footNear: step(kneeNear, pose.legNear.lower, BONES.shin),
  }

  if (!pose.rotate) return raw
  const out = {} as Skeleton
  for (const [key, point] of Object.entries(raw) as [keyof Skeleton, Point][]) {
    out[key] = rotateAbout(point, pelvis, pose.rotate)
  }
  return out
}

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------

const limb = (upper: number, lower: number): Limb => ({ upper, lower })

/** Weight slightly back, guard up — a fighting stance, not a standing pose. */
export const STANCE: Pose = {
  dx: 0,
  dy: 0,
  lean: 4,
  headTilt: -2,
  armFar: limb(150, 120),
  armNear: limb(160, 130),
  legFar: limb(-14, -4),
  legNear: limb(16, 6),
  rotate: 0,
}

export function pose(overrides: Partial<Pose>): Pose {
  return { ...STANCE, ...overrides }
}

export interface Keyframe {
  /** 0–1 through the animation. */
  t: number
  pose: Pose
  /** Draw a motion arc from this joint while passing through. */
  trail?: keyof Skeleton
  /** Fire the impact flash at this joint. */
  impact?: keyof Skeleton
}

export interface Animation {
  name: string
  durationMs: number
  frames: Keyframe[]
}

/**
 * Roundhouse kick.
 *
 * The shape that sells it is entirely in the timing: a slow coil away from the
 * target, a very fast chamber-to-extension, then a recovery roughly twice as
 * long as the strike. Keyframes are bunched accordingly rather than spread
 * evenly — evenly spaced keys are exactly what makes an animation feel floaty.
 */
export const ROUNDHOUSE: Animation = {
  name: 'Roundhouse kick',
  durationMs: 900,
  frames: [
    { t: 0, pose: STANCE },
    // Coil: weight drops, body turns away, arms wind across.
    { t: 0.22, pose: pose({ dy: 6, lean: -10, armFar: limb(120, 90), armNear: limb(-160, -120), legNear: limb(30, 20), legFar: limb(-8, 0) }) },
    // Chamber: knee snaps up and across, hip opening.
    { t: 0.38, pose: pose({ dy: 2, lean: 14, armFar: limb(200, 170), armNear: limb(-140, -90), legNear: limb(78, 20), legFar: limb(-6, 2) }), trail: 'footNear' },
    // Extension — the money frame. Leg straight, hip fully turned over.
    { t: 0.5, pose: pose({ dy: -2, lean: 26, armFar: limb(215, 200), armNear: limb(-120, -70), legNear: limb(96, 96), legFar: limb(-10, 0) }), trail: 'footNear', impact: 'footNear' },
    // Follow-through past the contact point.
    { t: 0.62, pose: pose({ dy: 0, lean: 30, armFar: limb(220, 205), armNear: limb(-110, -60), legNear: limb(110, 104), legFar: limb(-12, -2) }), trail: 'footNear' },
    // Retract, then settle.
    { t: 0.8, pose: pose({ dy: 5, lean: 12, armFar: limb(175, 140), armNear: limb(-170, -140), legNear: limb(52, 24), legFar: limb(-10, 0) }) },
    { t: 1, pose: STANCE },
  ],
}

/** Flying knee — the whole body leaves the ground. */
export const FLYING_KNEE: Animation = {
  name: 'Flying knee',
  durationMs: 850,
  frames: [
    { t: 0, pose: STANCE },
    { t: 0.2, pose: pose({ dy: 14, lean: -6, legNear: limb(26, 30), legFar: limb(-22, -10), armFar: limb(130, 100), armNear: limb(150, 120) }) },
    { t: 0.42, pose: pose({ dy: -48, lean: 16, legNear: limb(72, 10), legFar: limb(-40, -70), armFar: limb(215, 190), armNear: limb(-150, -120) }), trail: 'kneeNear' },
    { t: 0.52, pose: pose({ dy: -58, lean: 22, legNear: limb(86, 4), legFar: limb(-46, -84), armFar: limb(225, 205), armNear: limb(-140, -110) }), trail: 'kneeNear', impact: 'kneeNear' },
    { t: 0.72, pose: pose({ dy: -20, lean: 10, legNear: limb(40, 20), legFar: limb(-26, -30), armFar: limb(180, 150), armNear: limb(170, 140) }) },
    { t: 0.88, pose: pose({ dy: 10, lean: 2, legNear: limb(24, 14), legFar: limb(-20, -8) }) },
    { t: 1, pose: STANCE },
  ],
}

/**
 * Spinning back kick.
 *
 * The first attempt drove this off `rotate`, turning the whole body through
 * 360°. In a side-on 2D view that does not read as a pivot — it reads as a
 * CARTWHEEL, because rotating in the picture plane puts the fighter's head on
 * the floor halfway through.
 *
 * A turn about the vertical axis has to be implied instead: the torso winds
 * away, the legs trade places, `rotate` stays small enough to be a lean, and
 * the kick fires backwards on the far leg. Same trick a 2D animator uses.
 */
export const SPIN_KICK: Animation = {
  name: 'Spinning back kick',
  durationMs: 1000,
  frames: [
    { t: 0, pose: STANCE },
    // Wind away from the target, weight loading the front leg.
    { t: 0.2, pose: pose({ dy: 8, lean: -18, rotate: -8, armFar: limb(110, 70), armNear: limb(-165, -135), legNear: limb(26, 14), legFar: limb(-20, -6) }) },
    // Mid-turn: legs trade, arms cross the body, torso hides the shoulders.
    { t: 0.36, pose: pose({ dy: 4, lean: -4, rotate: 4, armFar: limb(160, 140), armNear: limb(-150, -160), legNear: limb(-30, -18), legFar: limb(40, 24) }) },
    // Chamber the far leg behind, knee tucked.
    { t: 0.46, pose: pose({ dy: 0, lean: 20, rotate: 8, armFar: limb(190, 175), armNear: limb(-140, -150), legFar: limb(70, 16), legNear: limb(-18, -6) }), trail: 'footFar' },
    // Extension: heel drives straight out.
    { t: 0.56, pose: pose({ dy: -4, lean: 30, rotate: 10, armFar: limb(205, 195), armNear: limb(-125, -140), legFar: limb(98, 98), legNear: limb(-16, -4) }), trail: 'footFar', impact: 'footFar' },
    { t: 0.68, pose: pose({ dy: -2, lean: 32, rotate: 8, armFar: limb(208, 198), armNear: limb(-120, -135), legFar: limb(106, 102), legNear: limb(-18, -6) }), trail: 'footFar' },
    // Recover, legs trade back to the original stance.
    { t: 0.86, pose: pose({ dy: 6, lean: 10, rotate: 2, legFar: limb(30, 12), legNear: limb(-4, 2) }) },
    { t: 1, pose: STANCE },
  ],
}

/** Straight punch — short, sharp, mostly hips and shoulder. */
export const CROSS: Animation = {
  name: 'Cross',
  durationMs: 520,
  frames: [
    { t: 0, pose: STANCE },
    { t: 0.24, pose: pose({ lean: -6, armNear: limb(178, 150), armFar: limb(140, 110), dy: 4 }) },
    { t: 0.42, pose: pose({ lean: 16, armNear: limb(96, 92), armFar: limb(168, 150), dy: 0 }), trail: 'handNear', impact: 'handNear' },
    { t: 0.56, pose: pose({ lean: 18, armNear: limb(92, 90), armFar: limb(172, 152) }), trail: 'handNear' },
    { t: 0.78, pose: pose({ lean: 8, armNear: limb(150, 126), armFar: limb(160, 130) }) },
    { t: 1, pose: STANCE },
  ],
}

/** Taking one — the reaction sells the hit as much as the strike does. */
export const HURT: Animation = {
  name: 'Hit',
  durationMs: 620,
  frames: [
    { t: 0, pose: STANCE },
    { t: 0.12, pose: pose({ dx: -8, dy: 4, lean: -22, headTilt: -14, armFar: limb(120, 70), armNear: limb(130, 80), legFar: limb(-26, -8), legNear: limb(22, 14) }), impact: 'chest' },
    { t: 0.34, pose: pose({ dx: -12, dy: 8, lean: -26, headTilt: -18, armFar: limb(110, 60), armNear: limb(125, 75), legFar: limb(-32, -12), legNear: limb(26, 16) }) },
    { t: 0.7, pose: pose({ dx: -4, dy: 4, lean: -8, headTilt: -6 }) },
    { t: 1, pose: STANCE },
  ],
}

/** Breathing stance, so the fighter is never a statue between attacks. */
export const IDLE: Animation = {
  name: 'Guard',
  durationMs: 2200,
  frames: [
    { t: 0, pose: STANCE },
    { t: 0.5, pose: pose({ dy: 3, lean: 5, armFar: limb(152, 124), armNear: limb(162, 134), headTilt: -1 }) },
    { t: 1, pose: STANCE },
  ],
}

export const ATTACKS: Animation[] = [ROUNDHOUSE, SPIN_KICK, FLYING_KNEE, CROSS]
export const ANIMATIONS: Animation[] = [...ATTACKS, HURT, IDLE]

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/**
 * Ease in and out. Applied WITHIN a keyframe segment rather than across the
 * whole animation, so the authored timing of the keys is what controls the
 * weight and this only smooths the joins.
 */
function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function blendLimb(a: Limb, b: Limb, t: number): Limb {
  return { upper: lerp(a.upper, b.upper, t), lower: lerp(a.lower, b.lower, t) }
}

export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    dx: lerp(a.dx, b.dx, t),
    dy: lerp(a.dy, b.dy, t),
    lean: lerp(a.lean, b.lean, t),
    headTilt: lerp(a.headTilt, b.headTilt, t),
    rotate: lerp(a.rotate, b.rotate, t),
    armFar: blendLimb(a.armFar, b.armFar, t),
    armNear: blendLimb(a.armNear, b.armNear, t),
    legFar: blendLimb(a.legFar, b.legFar, t),
    legNear: blendLimb(a.legNear, b.legNear, t),
  }
}

export interface Sampled {
  pose: Pose
  /** Joint to trail from, if the current segment declares one. */
  trail: keyof Skeleton | null
  /** 0–1 strength of the impact flash, peaking at the impact keyframe. */
  impact: number
  impactJoint: keyof Skeleton | null
}

/** The pose at progress `t` (0–1) through an animation. */
export function sample(animation: Animation, t: number): Sampled {
  const clamped = Math.max(0, Math.min(1, t))
  const frames = animation.frames
  let index = 0
  while (index < frames.length - 2 && clamped > frames[index + 1].t) index++

  const from = frames[index]
  const to = frames[index + 1] ?? frames[index]
  const span = Math.max(0.0001, to.t - from.t)
  const local = ease(Math.max(0, Math.min(1, (clamped - from.t) / span)))

  // The impact flash peaks on its keyframe and decays over the next 220ms of
  // animation time, which is what gives a hit its punch.
  const impactFrame = frames.find((f) => f.impact)
  let impact = 0
  let impactJoint: keyof Skeleton | null = null
  if (impactFrame) {
    const window = 220 / animation.durationMs
    const distance = clamped - impactFrame.t
    if (distance >= 0 && distance < window) {
      impact = 1 - distance / window
      impactJoint = impactFrame.impact ?? null
    }
  }

  return {
    pose: blend(from.pose, to.pose, local),
    trail: from.trail ?? to.trail ?? null,
    impact,
    impactJoint,
  }
}
