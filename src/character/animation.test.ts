import { describe, expect, it } from 'vitest'
import {
  ATTACKS,
  BACKFLIP_KICK,
  BUTTERFLY_KICK,
  STANCE,
  TORNADO_KICK,
  sample,
  solve,
  type Animation,
  type Skeleton,
} from '@/character/rig'
import { MOVES, MOVE_BY_ID, STARTING_MOVES, UNLOCKABLE_MOVES, animationFor } from '@/data/moves'

/**
 * Animation quality, held to numbers.
 *
 * "The animation has to be good" is not directly testable, but most of the
 * ways an animation is BAD are. A floaty strike moves at a constant speed. A
 * teleporting limb has no motion arc. A kick with no wind-up reads as a twitch.
 * A foot through the floor is a foot through the floor. Each of those is a
 * measurement, and each one below caught something real while this was built.
 */

/** Total joint movement per sampled step — the animation's speed over time. */
function speedProfile(animation: Animation, steps = 300): number[] {
  const out: number[] = []
  let previous = solve(sample(animation, 0).pose)
  for (let i = 1; i <= steps; i += 1) {
    const current = solve(sample(animation, i / steps).pose)
    let total = 0
    for (const key of Object.keys(current) as (keyof Skeleton)[]) {
      total += Math.hypot(current[key].x - previous[key].x, current[key].y - previous[key].y)
    }
    out.push(total)
    previous = current
  }
  return out
}

function extremes(animation: Animation, steps = 240) {
  let lowestFoot = 0
  let highestPelvis = Number.POSITIVE_INFINITY
  let frontSwapped = false
  const firstFrame = solve(sample(animation, 0).pose)
  const startsNearInFront = firstFrame.footNear.x > firstFrame.footFar.x
  for (let i = 0; i <= steps; i += 1) {
    const s = solve(sample(animation, i / steps).pose)
    lowestFoot = Math.max(lowestFoot, s.footNear.y, s.footFar.y)
    highestPelvis = Math.min(highestPelvis, s.pelvis.y)
    if (s.footNear.x > s.footFar.x !== startsNearInFront) frontSwapped = true
  }
  return { lowestFoot, highestPelvis, frontSwapped }
}

const impactFrame = (a: Animation) => a.frames.find((f) => f.impact)
const impactIndex = (a: Animation) => a.frames.findIndex((f) => f.impact)

describe('every strike is built like a strike', () => {
  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s has exactly one contact frame', (_name, animation) => {
    const hits = animation.frames.filter((f) => f.impact)
    expect(hits).toHaveLength(1)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s winds up before it strikes', (_name, animation) => {
    // At least one authored key between the stance and the contact. A strike
    // that lerps straight from guard to full extension is a twitch, not a
    // technique — and it is exactly what you get by default.
    expect(impactIndex(animation)).toBeGreaterThanOrEqual(2)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s lands in the middle of its timeline', (_name, animation) => {
    // Early enough to leave room for follow-through, late enough to have had
    // an anticipation. Both ends of this window are failures people can see.
    const t = impactFrame(animation)!.t
    expect(t).toBeGreaterThanOrEqual(0.25)
    expect(t).toBeLessThanOrEqual(0.6)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s follows through and recovers', (_name, animation) => {
    const t = impactFrame(animation)!.t
    // A quarter of the animation, minimum, spent after the contact.
    expect(1 - t).toBeGreaterThanOrEqual(0.25)
    // And at least two authored keys in there, so the recovery is shaped.
    expect(animation.frames.filter((f) => f.t > t).length).toBeGreaterThanOrEqual(2)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s holds its contact pose', (_name, animation) => {
    // The frame you actually see is the one that stops. Without a hold, full
    // extension exists for a single rendered frame and the eye never gets it.
    expect(impactFrame(animation)!.ease).toBe('hold')
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s accelerates into the contact', (_name, animation) => {
    // The segment arriving at the strike must be fast-in, not symmetric.
    const before = animation.frames[impactIndex(animation) - 1]
    expect(['snap', 'linear'], `${animation.name} eases into its strike with "${before.ease}"`).toContain(before.ease)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s is not floaty', (_name, animation) => {
    // The anti-uniform-interpolation test. A constant-speed animation sits
    // near 1.5; everything here should be several times its own average at
    // the moment of the strike.
    const profile = speedProfile(animation)
    const mean = profile.reduce((s, v) => s + v, 0) / profile.length
    const peak = Math.max(...profile)
    expect(peak / mean, `${animation.name} moves too evenly to read as a strike`).toBeGreaterThan(2.4)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s draws a motion arc', (_name, animation) => {
    // A limb moving this fast without a trail reads as a teleport.
    expect(animation.frames.some((f) => f.trail)).toBe(true)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s never puts a foot through the floor', (_name, animation) => {
    // The ground line is 252. A rounded foot cap contacting it sits a few
    // units past; anything beyond that is a leg buried in the boards.
    expect(extremes(animation).lowestFoot, `${animation.name} sinks below the floor`).toBeLessThanOrEqual(258)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s moves without teleporting', (_name, animation) => {
    // Sampling twice as finely should roughly halve the largest single step.
    // If it does not, something is discontinuous rather than merely fast.
    const coarse = Math.max(...speedProfile(animation, 120))
    const fine = Math.max(...speedProfile(animation, 240))
    expect(fine).toBeLessThan(coarse * 0.75)
  })

  it.each(ATTACKS.map((a) => [a.name, a] as const))('%s returns to a settled stance', (_name, animation) => {
    // So it can be replayed, looped, or followed by another without a snap.
    const end = sample(animation, 1).pose
    expect(end.legNear.upper).toBeCloseTo(STANCE.legNear.upper, 3)
    expect(end.armNear.upper).toBeCloseTo(STANCE.armNear.upper, 3)
  })
})

describe('the aerial moves genuinely leave the ground', () => {
  const airborneIds = MOVES.filter((m) => m.airborne).map((m) => m.id)

  it('has aerial moves at all', () => {
    expect(airborneIds.length).toBeGreaterThanOrEqual(4)
  })

  it.each(airborneIds)('%s gets real height', (id) => {
    const { highestPelvis } = extremes(animationFor(MOVE_BY_ID[id]))
    // The standing pelvis sits at 154. Clearing 110 is unmistakable air.
    expect(highestPelvis, `${id} barely leaves the ground`).toBeLessThan(110)
  })

  it.each(MOVES.filter((m) => !m.airborne).map((m) => m.id))('%s stays on the ground', (id) => {
    const { highestPelvis } = extremes(animationFor(MOVE_BY_ID[id]))
    expect(highestPelvis, `${id} is airborne but not declared so`).toBeGreaterThan(125)
  })
})

describe('the spinning moves genuinely turn', () => {
  it.each(MOVES.filter((m) => m.spins).map((m) => m.id))('%s completes a turn', (id) => {
    const animation = animationFor(MOVE_BY_ID[id])
    const maxRotate = Math.max(...animation.frames.map((f) => Math.abs(f.pose.rotate)))
    // Either it rotates in the picture plane — a flip — or the legs trade
    // places, which is how a turn about the vertical axis reads side-on.
    const flips = maxRotate >= 300
    const trades = extremes(animation).frontSwapped
    expect(flips || trades, `${id} is called a spin but never turns`).toBe(true)
  })

  it('rotates flips at a constant rate', () => {
    // Easing a somersault makes the fighter look winched round rather than
    // thrown. Every segment through the rotation is authored linear.
    for (const animation of [BACKFLIP_KICK, BUTTERFLY_KICK]) {
      const spinning = animation.frames.filter((f) => Math.abs(f.pose.rotate) > 20 && f.t < 0.8)
      expect(spinning.length, animation.name).toBeGreaterThan(1)
      expect(spinning.every((f) => f.ease === 'linear' || f.ease === 'hold'), animation.name).toBe(true)
    }
  })

  it('keeps the tornado kick a turn rather than a somersault', () => {
    // Side on, a picture-plane rotation is a FLIP. A turning kick about the
    // vertical axis has to be implied by the legs trading, or the fighter's
    // head ends up on the floor halfway through a move that never leaves
    // vertical.
    const maxRotate = Math.max(...TORNADO_KICK.frames.map((f) => Math.abs(f.pose.rotate)))
    expect(maxRotate).toBeLessThan(40)
    expect(extremes(TORNADO_KICK).frontSwapped).toBe(true)
  })
})

describe('the collection', () => {
  it('points every move at an animation that exists', () => {
    for (const move of MOVES) {
      const animation = animationFor(move)
      expect(animation, `${move.id} → ${move.animation}`).toBeDefined()
      expect(animation.durationMs).toBeGreaterThan(0)
    }
  })

  it('has unique ids and complete copy', () => {
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(MOVES.length)
    for (const move of MOVES) {
      expect(move.description.length, move.id).toBeGreaterThan(20)
      expect(move.watchFor.length, move.id).toBeGreaterThan(20)
      expect(move.lore.length, move.id).toBeGreaterThan(10)
    }
  })

  it('gives everyone something to watch before they unlock anything', () => {
    for (const id of STARTING_MOVES) expect(MOVE_BY_ID[id], id).toBeDefined()
    expect(STARTING_MOVES.length).toBeGreaterThanOrEqual(2)
    expect(UNLOCKABLE_MOVES.length).toBeGreaterThanOrEqual(10)
  })

  it('reserves the rarest tier for the showpieces', () => {
    // Rarity here is spectacle, not power — so a legendary must be one of the
    // hardest things a person can physically do, and every one of them leaves
    // the ground.
    const legendary = MOVES.filter((m) => m.rarity === 'legendary')
    expect(legendary.length).toBeGreaterThanOrEqual(2)
    for (const move of legendary) {
      expect(move.difficulty, move.id).toBe('showpiece')
      expect(move.airborne, move.id).toBe(true)
    }
  })

  it('keeps the starting kit ordinary', () => {
    for (const id of STARTING_MOVES) {
      expect(MOVE_BY_ID[id].rarity).toBe('common')
      expect(MOVE_BY_ID[id].difficulty).toBe('beginner')
    }
  })

  it('covers every family it advertises', () => {
    const families = new Set(MOVES.map((m) => m.family))
    expect(families.size).toBeGreaterThanOrEqual(4)
  })
})
