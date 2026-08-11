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

/**
 * Fighting stance.
 *
 * Lead hand out in front, rear hand tucked by the chin, knees genuinely bent,
 * weight back over the rear leg. The earlier version had both arms up in the
 * same place, which reads as "surrendering" rather than "guarding" — a stance
 * has to be asymmetric or the figure looks like a doll being held up.
 */
export const STANCE: Pose = {
  dx: 0,
  dy: 6,
  lean: 5,
  headTilt: -3,
  armFar: limb(163, 132),
  armNear: limb(128, 104),
  legFar: limb(-22, 2),
  legNear: limb(24, 2),
  rotate: 0,
}

export function pose(overrides: Partial<Pose>): Pose {
  return { ...STANCE, ...overrides }
}

/**
 * How the segment LEAVING a keyframe is timed.
 *
 * This is the single biggest lever on whether a strike reads as a strike.
 * Interpolating every segment the same way — which is what the first version
 * did — makes everything drift at the same speed, and a kick that accelerates
 * like a lift door does not look like it hurts. Real striking is a slow coil,
 * a violent extension, a beat of stillness at full reach, then a lazy recover.
 *
 *  - `coil`   accelerates into the next key. Anticipation.
 *  - `snap`   arrives almost instantly and settles. The strike itself.
 *  - `settle` decelerates. Recovery and landings.
 *  - `hold`   stays put, then jumps at the last moment. A freeze at full
 *             extension, which is what gives a pose time to be read.
 *  - `smooth` the old symmetric ease. Fine for breathing and walking.
 *  - `linear` no easing at all. For constant rotation through a flip, where
 *             any easing looks like the fighter is being winched.
 */
export type Easing = 'linear' | 'smooth' | 'coil' | 'snap' | 'settle' | 'hold'

export interface Keyframe {
  /** 0–1 through the animation. */
  t: number
  pose: Pose
  /** Timing of the segment from this key to the next. Defaults to `smooth`. */
  ease?: Easing
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
    { t: 0, pose: STANCE, ease: 'coil' },
    // Coil: weight drops, body turns away, arms wind across.
    { t: 0.24, pose: pose({ dy: 8, lean: -12, armFar: limb(120, 90), armNear: limb(-160, -120), legNear: limb(30, 20), legFar: limb(-8, 0) }), ease: 'snap' },
    // Chamber: knee snaps up and across, hip opening.
    { t: 0.38, pose: pose({ dy: 2, lean: 14, armFar: limb(200, 170), armNear: limb(-140, -90), legNear: limb(78, 20), legFar: limb(-6, 2) }), ease: 'snap', trail: 'footNear' },
    // Extension — the money frame. Leg straight, hip fully turned over.
    { t: 0.47, pose: pose({ dy: -2, lean: 26, armFar: limb(215, 200), armNear: limb(-120, -70), legNear: limb(96, 96), legFar: limb(-10, 0) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    // Follow-through past the contact point.
    { t: 0.62, pose: pose({ dy: 0, lean: 30, armFar: limb(220, 205), armNear: limb(-110, -60), legNear: limb(110, 104), legFar: limb(-12, -2) }), ease: 'settle', trail: 'footNear' },
    // Retract, then settle.
    { t: 0.82, pose: pose({ dy: 5, lean: 12, armFar: limb(175, 140), armNear: limb(-170, -140), legNear: limb(52, 24), legFar: limb(-10, 0) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/** Flying knee — the whole body leaves the ground. */
export const FLYING_KNEE: Animation = {
  name: 'Flying knee',
  durationMs: 850,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.2, pose: pose({ dy: 22, lean: -8, legNear: limb(26, 30), legFar: limb(-22, -10), armFar: limb(130, 100), armNear: limb(150, 120) }), ease: 'snap' },
    { t: 0.42, pose: pose({ dy: -48, lean: 16, legNear: limb(72, 10), legFar: limb(-40, -70), armFar: limb(215, 190), armNear: limb(-150, -120) }), ease: 'snap', trail: 'kneeNear' },
    { t: 0.52, pose: pose({ dy: -58, lean: 22, legNear: limb(86, 4), legFar: limb(-46, -84), armFar: limb(225, 205), armNear: limb(-140, -110) }), ease: 'hold', trail: 'kneeNear', impact: 'kneeNear' },
    { t: 0.72, pose: pose({ dy: -20, lean: 10, legNear: limb(40, 20), legFar: limb(-26, -30), armFar: limb(180, 150), armNear: limb(170, 140) }), ease: 'smooth' },
    { t: 0.88, pose: pose({ dy: 16, lean: 2, legNear: limb(38, -18), legFar: limb(-32, 16) }), ease: 'settle' },
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
    { t: 0, pose: STANCE, ease: 'coil' },
    // Wind away from the target, weight loading the front leg.
    { t: 0.2, pose: pose({ dy: 10, lean: -20, rotate: -8, armFar: limb(110, 70), armNear: limb(-165, -135), legNear: limb(26, 14), legFar: limb(-20, -6) }), ease: 'snap' },
    // Mid-turn: legs trade, arms cross the body, torso hides the shoulders.
    { t: 0.36, pose: pose({ dy: 4, lean: -4, rotate: 4, armFar: limb(160, 140), armNear: limb(-150, -160), legNear: limb(-30, -18), legFar: limb(40, 24) }), ease: 'smooth' },
    // Chamber the far leg behind, knee tucked.
    { t: 0.46, pose: pose({ dy: 0, lean: 20, rotate: 8, armFar: limb(190, 175), armNear: limb(-140, -150), legFar: limb(70, 16), legNear: limb(-18, -6) }), ease: 'snap', trail: 'footFar' },
    // Extension: heel drives straight out.
    { t: 0.56, pose: pose({ dy: -4, lean: 30, rotate: 10, armFar: limb(205, 195), armNear: limb(-125, -140), legFar: limb(98, 98), legNear: limb(-16, -4) }), ease: 'hold', trail: 'footFar', impact: 'footFar' },
    { t: 0.68, pose: pose({ dy: -2, lean: 32, rotate: 8, armFar: limb(208, 198), armNear: limb(-120, -135), legFar: limb(106, 102), legNear: limb(-18, -6) }), ease: 'settle', trail: 'footFar' },
    // Recover, legs trade back to the original stance.
    { t: 0.86, pose: pose({ dy: 8, lean: 10, rotate: 2, legFar: limb(30, 12), legNear: limb(-4, 2) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/** Straight punch — short, sharp, mostly hips and shoulder. */
export const CROSS: Animation = {
  name: 'Cross',
  durationMs: 520,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.26, pose: pose({ lean: -8, armNear: limb(178, 150), armFar: limb(140, 110), dy: 8 }), ease: 'snap' },
    { t: 0.4, pose: pose({ lean: 18, armNear: limb(96, 92), armFar: limb(168, 150), dy: 2 }), ease: 'hold', trail: 'handNear', impact: 'handNear' },
    { t: 0.56, pose: pose({ lean: 19, armNear: limb(92, 90), armFar: limb(172, 152) }), ease: 'settle', trail: 'handNear' },
    { t: 0.78, pose: pose({ lean: 8, armNear: limb(150, 126), armFar: limb(160, 130) }), ease: 'settle' },
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


// ---------------------------------------------------------------------------
// Locomotion and defence
// ---------------------------------------------------------------------------

/**
 * Walking, as a loop.
 *
 * Two-beat rather than the four-beat cycle a walk really has, because at this
 * size the extra keys read as noise. What sells it is the vertical bob: a walk
 * with no rise and fall looks like a figure on a conveyor belt.
 */
export const WALK: Animation = {
  name: 'Walk',
  durationMs: 620,
  frames: [
    { t: 0, pose: pose({ dy: 6, legNear: limb(34, 8), legFar: limb(-30, 4), armNear: limb(136, 108), armFar: limb(158, 128) }) },
    { t: 0.25, pose: pose({ dy: 1, legNear: limb(12, 2), legFar: limb(-8, 0), armNear: limb(130, 104), armFar: limb(164, 134) }) },
    { t: 0.5, pose: pose({ dy: 6, legNear: limb(-30, 4), legFar: limb(34, 8), armNear: limb(124, 100), armFar: limb(168, 138) }) },
    { t: 0.75, pose: pose({ dy: 1, legNear: limb(-8, 0), legFar: limb(12, 2), armNear: limb(130, 104), armFar: limb(164, 134) }) },
    { t: 1, pose: pose({ dy: 6, legNear: limb(34, 8), legFar: limb(-30, 4), armNear: limb(136, 108), armFar: limb(158, 128) }) },
  ],
}

/**
 * Airborne.
 *
 * Held rather than played: the arena decides how long a fighter is off the
 * ground, so this is sampled at a fixed t and the height comes from the
 * simulation, not from the animation.
 */
export const JUMP: Animation = {
  name: 'Jump',
  durationMs: 700,
  frames: [
    { t: 0, pose: pose({ dy: 14, legNear: limb(34, 16), legFar: limb(-28, 12) }) },
    { t: 0.5, pose: pose({ dy: -2, lean: 2, legNear: limb(54, 24), legFar: limb(-34, 40), armNear: limb(118, 96), armFar: limb(172, 146) }) },
    { t: 1, pose: pose({ dy: 12, legNear: limb(30, 10), legFar: limb(-26, 8) }) },
  ],
}

/** Guard up: forearms across the head, shoulders rolled forward, weight back. */
export const BLOCK: Animation = {
  name: 'Block',
  durationMs: 400,
  frames: [
    { t: 0, pose: pose({ dy: 10, lean: -8, headTilt: -8, armNear: limb(172, 214), armFar: limb(178, 208), legNear: limb(28, 0), legFar: limb(-26, 4) }) },
    { t: 1, pose: pose({ dy: 12, lean: -10, headTilt: -9, armNear: limb(174, 216), armFar: limb(180, 210), legNear: limb(30, 0), legFar: limb(-28, 4) }) },
  ],
}

/** Ducked under a high strike, hands still up. */
export const CROUCH: Animation = {
  name: 'Crouch',
  durationMs: 400,
  frames: [
    { t: 0, pose: pose({ dy: 30, lean: 8, legNear: limb(58, -34), legFar: limb(-46, 34), armNear: limb(140, 116), armFar: limb(166, 136) }) },
    { t: 1, pose: pose({ dy: 32, lean: 9, legNear: limb(60, -36), legFar: limb(-48, 36), armNear: limb(142, 118), armFar: limb(168, 138) }) },
  ],
}

/** Flat on the ground after a knockdown. */
export const DOWN: Animation = {
  name: 'Knocked down',
  durationMs: 900,
  frames: [
    { t: 0, pose: pose({ dx: -10, dy: 40, lean: -60, headTilt: -20, legNear: limb(66, 40), legFar: limb(40, 20), armNear: limb(120, 80), armFar: limb(110, 70) }) },
    { t: 0.5, pose: pose({ dx: -16, dy: 62, lean: -84, headTilt: -26, legNear: limb(78, 52), legFar: limb(52, 30), armNear: limb(104, 66), armFar: limb(96, 58) }) },
    { t: 1, pose: pose({ dx: -14, dy: 60, lean: -82, headTilt: -24, legNear: limb(76, 50), legFar: limb(50, 28), armNear: limb(106, 68), armFar: limb(98, 60) }) },
  ],
}

// ---------------------------------------------------------------------------
// Unlockable strikes
// ---------------------------------------------------------------------------

/** Teep. Straight push-kick off the lead leg — the range-control tool. */
export const FRONT_KICK: Animation = {
  name: 'Front kick',
  durationMs: 620,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.24, pose: pose({ dy: 10, lean: -10, legNear: limb(64, -22), legFar: limb(-24, 4) }), ease: 'snap' },
    { t: 0.4, pose: pose({ dy: 0, lean: 14, legNear: limb(88, 86), legFar: limb(-20, 2), armFar: limb(186, 160), armNear: limb(-160, -130) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.54, pose: pose({ dy: 0, lean: 16, legNear: limb(92, 90), legFar: limb(-22, 0), armFar: limb(190, 164), armNear: limb(-155, -125) }), ease: 'settle', trail: 'footNear' },
    { t: 0.78, pose: pose({ dy: 8, lean: 6, legNear: limb(44, -6) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/**
 * Sweep. Low and flat, and it is the reason jumping exists — the whole point
 * of a low attack is that it can be leapt over, so the leg genuinely travels
 * along the floor rather than at shin height.
 */
export const SWEEP: Animation = {
  name: 'Sweep',
  durationMs: 700,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.22, pose: pose({ dy: 32, lean: -12, legNear: limb(50, -40), legFar: limb(-44, 34), armNear: limb(120, 150), armFar: limb(150, 170) }), ease: 'snap' },
    { t: 0.42, pose: pose({ dy: 36, lean: 10, legNear: limb(96, 96), legFar: limb(-48, 40), armNear: limb(96, 150), armFar: limb(140, 176) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.56, pose: pose({ dy: 36, lean: 14, legNear: limb(104, 102), legFar: limb(-50, 42) }), ease: 'settle', trail: 'footNear' },
    { t: 0.8, pose: pose({ dy: 20, lean: 2, legNear: limb(52, -10), legFar: limb(-34, 20) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/** Uppercut. Drops, then drives up through the target — the anti-air. */
export const UPPERCUT: Animation = {
  name: 'Uppercut',
  durationMs: 620,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.24, pose: pose({ dy: 26, lean: -14, armNear: limb(20, 40), armFar: limb(160, 130), legNear: limb(46, -22), legFar: limb(-36, 24) }), ease: 'snap' },
    { t: 0.42, pose: pose({ dy: -6, lean: 10, armNear: limb(174, 196), armFar: limb(150, 120), legNear: limb(18, 0), legFar: limb(-14, 0) }), ease: 'hold', trail: 'handNear', impact: 'handNear' },
    { t: 0.56, pose: pose({ dy: -10, lean: 12, armNear: limb(180, 202), armFar: limb(148, 118) }), ease: 'settle', trail: 'handNear' },
    { t: 0.8, pose: pose({ dy: 12, lean: 2, armNear: limb(150, 124) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/** Axe kick. Rises high, then chops straight down — duckable, and it hurts. */
export const AXE_KICK: Animation = {
  name: 'Axe kick',
  durationMs: 900,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.2, pose: pose({ dy: 12, lean: -12, legNear: limb(38, -14), legFar: limb(-28, 6) }), ease: 'settle' },
    // Held at the top — the pause before it falls is the whole character.
    { t: 0.4, pose: pose({ dy: -6, lean: -22, legNear: limb(146, 150), legFar: limb(-24, 2), armFar: limb(196, 176), armNear: limb(-150, -120) }), ease: 'snap', trail: 'footNear' },
    { t: 0.54, pose: pose({ dy: 4, lean: 18, legNear: limb(76, 78), legFar: limb(-22, 2), armFar: limb(200, 180), armNear: limb(-140, -110) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.64, pose: pose({ dy: 12, lean: 24, legNear: limb(50, 46), legFar: limb(-24, 0) }), ease: 'settle', trail: 'footNear' },
    { t: 0.84, pose: pose({ dy: 10, lean: 8, legNear: limb(32, 6) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}


/**
 * Side kick.
 *
 * The silhouette is everything here: a straight line from the heel through the
 * hip to the shoulder, with the body leaned hard away as a counterweight. Get
 * the lean wrong and it reads as a stumble.
 */
export const SIDE_KICK: Animation = {
  name: 'Side kick',
  durationMs: 780,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    // Chamber: knee to the chest, foot tucked under, torso already turning.
    { t: 0.26, pose: pose({ dy: 4, lean: -16, legNear: limb(72, -46), legFar: limb(-24, 6), armNear: limb(160, 196), armFar: limb(170, 200) }), ease: 'snap' },
    // Drive: hip pushes through, leg becomes one straight line.
    { t: 0.4, pose: pose({ dy: -2, lean: -32, headTilt: 10, legNear: limb(92, 92), legFar: limb(-30, 4), armNear: limb(150, 188), armFar: limb(196, 176) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.56, pose: pose({ dy: -3, lean: -34, headTilt: 11, legNear: limb(95, 95), legFar: limb(-32, 2), armNear: limb(148, 186), armFar: limb(198, 178) }), ease: 'settle', trail: 'footNear' },
    // Re-chamber before putting it down — the mark of a controlled kick.
    { t: 0.76, pose: pose({ dy: 6, lean: -14, legNear: limb(66, -38), legFar: limb(-22, 4) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/**
 * Hook kick.
 *
 * Deliberately misses on the way out and lands on the way back — the leg
 * extends PAST the target, then whips in with the heel. The impact key is
 * therefore on the return, which is the whole character of the technique.
 */
export const HOOK_KICK: Animation = {
  name: 'Hook kick',
  durationMs: 860,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.22, pose: pose({ dy: 6, lean: -14, legNear: limb(64, -34), legFar: limb(-24, 6), armFar: limb(150, 120), armNear: limb(-170, -140) }), ease: 'snap' },
    // Out past the target, leg long, heel still trailing.
    { t: 0.4, pose: pose({ dy: -2, lean: 12, legNear: limb(112, 118), legFar: limb(-26, 2), armFar: limb(196, 172), armNear: limb(-150, -120) }), ease: 'snap', trail: 'footNear' },
    // The whip back. This is the strike.
    { t: 0.52, pose: pose({ dy: -4, lean: 20, legNear: limb(74, 22), legFar: limb(-28, 0), armFar: limb(206, 186), armNear: limb(-140, -110) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.66, pose: pose({ dy: 0, lean: 16, legNear: limb(58, 4), legFar: limb(-26, 2) }), ease: 'settle', trail: 'footNear' },
    { t: 0.84, pose: pose({ dy: 8, lean: 6, legNear: limb(34, 2), legFar: limb(-22, 2) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/**
 * Tornado kick — the jumping turning roundhouse.
 *
 * Two things happening at once, and both have to be legible: the fighter
 * leaves the ground, AND turns through a full circle about the vertical axis.
 * The turn cannot be `rotate`, which in a side-on view is a somersault; it is
 * implied by the legs trading places twice while the torso winds and unwinds.
 * `rotate` is used only as a small tilt to sell the tilt of the axis.
 */
export const TORNADO_KICK: Animation = {
  name: 'Tornado kick',
  durationMs: 1180,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    // Wind up and load: the arms cross the body, the front leg steps across.
    { t: 0.16, pose: pose({ dy: 14, lean: -22, rotate: -6, armFar: limb(100, 60), armNear: limb(-150, -120), legNear: limb(38, 10), legFar: limb(-14, 4) }), ease: 'snap' },
    // Launch. Legs swap as the turn begins, body starts climbing.
    { t: 0.3, pose: pose({ dy: -34, lean: -4, rotate: 4, armFar: limb(150, 120), armNear: limb(-176, -160), legNear: limb(-34, -26), legFar: limb(52, 30) }), ease: 'smooth' },
    // Peak of the jump, mid-turn, kicking leg chambered high and across.
    { t: 0.42, pose: pose({ dy: -62, lean: 10, rotate: 10, armFar: limb(186, 160), armNear: limb(-158, -136), legNear: limb(86, 26), legFar: limb(-16, -40) }), ease: 'snap', trail: 'footNear' },
    // Extension at the top. The money frame — held so it can be read.
    { t: 0.52, pose: pose({ dy: -58, lean: 28, rotate: 14, armFar: limb(206, 188), armNear: limb(-132, -104), legNear: limb(104, 104), legFar: limb(-20, -46) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.64, pose: pose({ dy: -44, lean: 32, rotate: 12, armFar: limb(210, 194), armNear: limb(-124, -96), legNear: limb(116, 110), legFar: limb(-18, -34) }), ease: 'settle', trail: 'footNear' },
    // Falling, legs coming back underneath.
    { t: 0.78, pose: pose({ dy: -14, lean: 16, rotate: 4, legNear: limb(46, 18), legFar: limb(-24, -6), armFar: limb(180, 150), armNear: limb(-170, -150) }), ease: 'smooth' },
    // Land heavy, absorb, stand up.
    { t: 0.88, pose: pose({ dy: 24, lean: 4, legNear: limb(44, -18), legFar: limb(-38, 20), armFar: limb(150, 118), armNear: limb(120, 96) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/**
 * Backflip kick.
 *
 * The one place a picture-plane rotation is not a mistake: a backflip really
 * is a rotation in the picture plane, so `rotate` does the work here and does
 * it honestly. The kick fires on the way UP, before the rotation gets going —
 * the leg whips vertically through where a chin would be, and the flip is what
 * happens next.
 *
 * The rotation segments are `linear` on purpose. Easing a flip makes the
 * fighter look winched round rather than thrown.
 */
export const BACKFLIP_KICK: Animation = {
  name: 'Backflip kick',
  durationMs: 1240,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    // Deep load. Everything drops before anything rises.
    { t: 0.18, pose: pose({ dy: 34, lean: 14, legNear: limb(54, -40), legFar: limb(-44, 34), armNear: limb(60, 30), armFar: limb(80, 44) }), ease: 'snap' },
    /*
     * The whip. The body arches HARD backwards, which is not decoration —
     * a straight leg reaches 92 units from the hip and the head sits 97 above
     * the pelvis, so from an upright torso the foot can never get above the
     * chin. The first version kicked to exactly head height and the flash
     * landed on the fighter's own face. Arching back drops the head and lifts
     * the hip, and the kick clears it by a clear margin.
     */
    { t: 0.3, pose: pose({ dy: 4, lean: 46, headTilt: -12, rotate: -8, legNear: limb(170, 176), legFar: limb(-18, 6), armNear: limb(-120, -90), armFar: limb(-100, -74) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.4, pose: pose({ dy: -44, lean: 16, rotate: -58, legNear: limb(150, 158), legFar: limb(-10, -6), armNear: limb(-150, -124), armFar: limb(-130, -104) }), ease: 'linear', trail: 'footNear' },
    // Tuck, and go round. Linear all the way through the rotation.
    { t: 0.54, pose: pose({ dy: -74, lean: -20, rotate: -168, legNear: limb(70, -40), legFar: limb(44, -56), armNear: limb(30, 60), armFar: limb(46, 74) }), ease: 'linear', trail: 'footNear' },
    { t: 0.68, pose: pose({ dy: -66, lean: -8, rotate: -282, legNear: limb(52, -30), legFar: limb(30, -44), armNear: limb(20, 48), armFar: limb(36, 62) }), ease: 'linear' },
    // Open out of the tuck to spot the landing.
    { t: 0.8, pose: pose({ dy: -30, lean: 6, rotate: -352, legNear: limb(30, 6), legFar: limb(-26, 10), armNear: limb(120, 96), armFar: limb(146, 118) }), ease: 'smooth' },
    // Land, absorb through the knees.
    { t: 0.9, pose: pose({ dy: 26, lean: 8, rotate: -360, legNear: limb(46, -22), legFar: limb(-42, 26), armNear: limb(110, 88), armFar: limb(140, 112) }), ease: 'settle' },
    { t: 1, pose: { ...STANCE, rotate: -360 } },
  ],
}

/**
 * Butterfly twist.
 *
 * Travels sideways while it turns, which is what separates it from the
 * backflip — same rotation, different trajectory. The legs scissor rather than
 * tuck, so the two never read as the same move even though both spend most of
 * their time upside down.
 */
export const BUTTERFLY_KICK: Animation = {
  name: 'Butterfly twist',
  durationMs: 1320,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    // Reach across and low — the wind-up travels before it rises.
    { t: 0.16, pose: pose({ dx: -12, dy: 26, lean: 34, legNear: limb(52, -30), legFar: limb(-40, 28), armNear: limb(52, 24), armFar: limb(74, 40) }), ease: 'snap' },
    // Launch sideways and up, first leg sweeping.
    { t: 0.3, pose: pose({ dx: 4, dy: -40, lean: -12, rotate: -46, legNear: limb(126, 132), legFar: limb(-46, -30), armNear: limb(-120, -96), armFar: limb(-100, -76) }), ease: 'linear', trail: 'footNear' },
    // Horizontal, both legs out. This is the frame people photograph.
    { t: 0.44, pose: pose({ dx: 18, dy: -76, lean: -6, rotate: -138, legNear: limb(112, 116), legFar: limb(-68, -70), armNear: limb(-70, -44), armFar: limb(-46, -20) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.56, pose: pose({ dx: 28, dy: -80, lean: 0, rotate: -212, legNear: limb(96, 100), legFar: limb(-80, -84), armNear: limb(-30, 0), armFar: limb(-6, 22) }), ease: 'linear', trail: 'footNear' },
    { t: 0.7, pose: pose({ dx: 34, dy: -58, lean: 8, rotate: -300, legNear: limb(58, 30), legFar: limb(-56, -40), armNear: limb(40, 70), armFar: limb(62, 92) }), ease: 'linear' },
    { t: 0.82, pose: pose({ dx: 30, dy: -22, lean: 4, rotate: -354, legNear: limb(30, 4), legFar: limb(-28, 8), armNear: limb(112, 90), armFar: limb(140, 114) }), ease: 'smooth' },
    { t: 0.9, pose: pose({ dx: 26, dy: 28, lean: 6, rotate: -360, legNear: limb(48, -24), legFar: limb(-44, 28) }), ease: 'settle' },
    { t: 1, pose: { ...STANCE, dx: 22, rotate: -360 } },
  ],
}

/**
 * Crescent kick.
 *
 * A single continuous arc — out, up, across, down — so it is authored with
 * more keys than anything else here and eased `smooth` throughout. Snapping
 * any part of it would break the arc, and the arc IS the move.
 */
export const CRESCENT_KICK: Animation = {
  name: 'Crescent kick',
  durationMs: 900,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.18, pose: pose({ dy: 10, lean: 16, legNear: limb(10, -6), legFar: limb(-26, 8), armNear: limb(150, 128), armFar: limb(168, 142) }), ease: 'smooth' },
    { t: 0.32, pose: pose({ dy: 2, lean: 6, legNear: limb(58, 46), legFar: limb(-24, 4) }), ease: 'smooth', trail: 'footNear' },
    { t: 0.44, pose: pose({ dy: -6, lean: -10, legNear: limb(126, 130), legFar: limb(-22, 2) }), ease: 'snap', trail: 'footNear' },
    { t: 0.54, pose: pose({ dy: -8, lean: -22, legNear: limb(160, 166), legFar: limb(-20, 0), armNear: limb(-160, -130), armFar: limb(-140, -112) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.66, pose: pose({ dy: -4, lean: -14, legNear: limb(-140, -150), legFar: limb(-22, 2) }), ease: 'smooth', trail: 'footNear' },
    { t: 0.8, pose: pose({ dy: 8, lean: 0, legNear: limb(-40, -18), legFar: limb(-24, 4) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

/**
 * Flying side kick.
 *
 * Covers ground. The travel is in `dx`, which means the fighter genuinely
 * arrives somewhere else — a leaping kick that lands where it took off from is
 * the flattest thing an animator can draw.
 */
export const FLYING_SIDE_KICK: Animation = {
  name: 'Flying side kick',
  durationMs: 1020,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.16, pose: pose({ dy: 20, lean: 12, legNear: limb(44, -24), legFar: limb(-40, 26), armNear: limb(70, 40), armFar: limb(94, 58) }), ease: 'snap' },
    // Off the ground, rear knee driving up first.
    { t: 0.3, pose: pose({ dx: 14, dy: -44, lean: -6, legFar: limb(76, 10), legNear: limb(40, -30), armNear: limb(130, 104), armFar: limb(-170, -140) }), ease: 'snap' },
    // Full extension in the air, body a straight diagonal line.
    { t: 0.44, pose: pose({ dx: 34, dy: -58, lean: -26, headTilt: 8, legNear: limb(96, 96), legFar: limb(24, -44), armNear: limb(120, 96), armFar: limb(-150, -120) }), ease: 'hold', trail: 'footNear', impact: 'footNear' },
    { t: 0.58, pose: pose({ dx: 44, dy: -50, lean: -28, headTilt: 8, legNear: limb(98, 98), legFar: limb(20, -40) }), ease: 'settle', trail: 'footNear' },
    { t: 0.74, pose: pose({ dx: 52, dy: -16, lean: -10, legNear: limb(54, 6), legFar: limb(-14, -6) }), ease: 'smooth' },
    { t: 0.86, pose: pose({ dx: 54, dy: 28, lean: 6, legNear: limb(48, -24), legFar: limb(-44, 28) }), ease: 'settle' },
    { t: 1, pose: { ...STANCE, dx: 52 } },
  ],
}

/**
 * Dragon tail — a full spinning low sweep, hands to the floor.
 *
 * The depth is capped on purpose. The rig's pelvis sits 104 units above the
 * ground and a whole leg is only 92 long, so a genuinely floor-level extended
 * leg is geometrically impossible without folding the fighter in half. The
 * first version simply crouched deeper until the sweeping foot passed THROUGH
 * the floor, which is worse than being a little high. What sells "low" here is
 * that the leg is the lowest thing in the silhouette and it travels through a
 * full half-circle beneath the body.
 */
export const DRAGON_TAIL: Animation = {
  name: 'Dragon tail',
  durationMs: 1000,
  frames: [
    { t: 0, pose: STANCE, ease: 'coil' },
    { t: 0.2, pose: pose({ dy: 20, lean: -16, legNear: limb(60, -52), legFar: limb(-44, 32), armNear: limb(74, 132), armFar: limb(98, 152) }), ease: 'snap' },
    // Hands planted, sweeping leg cocked behind and low.
    { t: 0.34, pose: pose({ dy: 24, lean: -32, rotate: 6, legFar: limb(-76, -14), legNear: limb(64, -58), armNear: limb(44, 122), armFar: limb(68, 142) }), ease: 'snap', trail: 'footFar' },
    // Through the bottom of the arc. The shin stays cocked forward rather
    // than hanging straight down — a vertical leg from a pelvis this low
    // reaches below the floor, and a foot through the floor is worse than a
    // sweep that skims it.
    { t: 0.46, pose: pose({ dy: 24, lean: -28, rotate: 10, legFar: limb(-6, 72), legNear: limb(66, -60) }), ease: 'hold', trail: 'footFar', impact: 'footFar' },
    // Out the far side and up, which is what makes it a full circle.
    { t: 0.6, pose: pose({ dy: 24, lean: -20, rotate: 8, legFar: limb(70, 62), legNear: limb(64, -56) }), ease: 'settle', trail: 'footFar' },
    { t: 0.78, pose: pose({ dy: 16, lean: -6, rotate: 2, legFar: limb(-24, 12), legNear: limb(46, -20) }), ease: 'settle' },
    { t: 1, pose: STANCE },
  ],
}

export const ATTACKS: Animation[] = [
  CROSS,
  FRONT_KICK,
  ROUNDHOUSE,
  SIDE_KICK,
  SWEEP,
  UPPERCUT,
  HOOK_KICK,
  CRESCENT_KICK,
  AXE_KICK,
  SPIN_KICK,
  DRAGON_TAIL,
  FLYING_KNEE,
  FLYING_SIDE_KICK,
  TORNADO_KICK,
  BACKFLIP_KICK,
  BUTTERFLY_KICK,
]
export const ANIMATIONS: Animation[] = [...ATTACKS, HURT, IDLE, WALK, JUMP, BLOCK, CROUCH, DOWN]

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/** The easing curves, applied within a keyframe segment. */
const EASINGS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  coil: (t) => t * t * t,
  // Quintic out: 60% of the distance is covered in the first 20% of the time.
  snap: (t) => 1 - (1 - t) ** 5,
  settle: (t) => 1 - (1 - t) ** 3,
  hold: (t) => (t < 0.78 ? 0 : (t - 0.78) / 0.22),
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
  const curve = EASINGS[from.ease ?? 'smooth']
  const local = curve(Math.max(0, Math.min(1, (clamped - from.t) / span)))

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
