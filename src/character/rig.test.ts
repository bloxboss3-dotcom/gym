import { describe, expect, it } from 'vitest'
import {
  ANIMATIONS,
  ATTACKS,
  BONES,
  ROOT,
  STANCE,
  blend,
  sample,
  solve,
  step,
} from '@/character/rig'

/**
 * Animation is judged by eye, but the rig underneath it is maths and can be
 * pinned. These catch the failures that look like "the character is broken":
 * limbs detaching, bones changing length, feet through the floor.
 */
describe('forward kinematics', () => {
  it('steps in the documented direction', () => {
    const origin = { x: 0, y: 0 }
    expect(step(origin, 0, 10).y).toBeCloseTo(10) // 0 = down
    expect(step(origin, 90, 10).x).toBeCloseTo(10) // 90 = right
    expect(step(origin, 180, 10).y).toBeCloseTo(-10) // 180 = up
  })

  it('keeps every bone at a fixed length in every frame of every animation', () => {
    const length = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y)

    for (const animation of ANIMATIONS) {
      for (let i = 0; i <= 40; i++) {
        const s = solve(sample(animation, i / 40).pose)
        const label = `${animation.name} @${i}`
        expect(length(s.hipNear, s.kneeNear), label).toBeCloseTo(BONES.thigh, 4)
        expect(length(s.kneeNear, s.footNear), label).toBeCloseTo(BONES.shin, 4)
        expect(length(s.shoulderNear, s.elbowNear), label).toBeCloseTo(BONES.upperArm, 4)
        expect(length(s.elbowNear, s.handNear), label).toBeCloseTo(BONES.forearm, 4)
        expect(length(s.pelvis, s.chest), label).toBeCloseTo(BONES.spine, 4)
      }
    }
  })

  it('leaves the standing pose standing on the ground plane', () => {
    const s = solve(STANCE)
    expect(s.pelvis).toEqual(ROOT)
    // Feet near the ground line at 252, not floating or buried.
    for (const foot of [s.footNear, s.footFar]) {
      expect(foot.y).toBeGreaterThan(220)
      expect(foot.y).toBeLessThan(258)
    }
    expect(s.head.y).toBeLessThan(s.chest.y)
  })

  it('rotates the whole body about the pelvis without stretching it', () => {
    const spun = solve({ ...STANCE, rotate: 90 })
    expect(spun.pelvis).toEqual(ROOT)
    expect(Math.hypot(spun.pelvis.x - spun.chest.x, spun.pelvis.y - spun.chest.y)).toBeCloseTo(
      BONES.spine,
      4,
    )
  })
})

describe('animation sampling', () => {
  it('starts and ends on a settled pose so attacks can chain', () => {
    for (const animation of ATTACKS) {
      const start = sample(animation, 0).pose
      const end = sample(animation, 1).pose
      // Spins deliberately end rotated; everything else returns to stance.
      expect(start.lean).toBeCloseTo(STANCE.lean, 3)
      expect(end.legNear.upper).toBeCloseTo(STANCE.legNear.upper, 3)
    }
  })

  it('is continuous — sampling twice as finely halves the largest step', () => {
    // A spinning kick genuinely moves the foot a long way per unit time, so a
    // fixed distance threshold would flag correct motion. Continuity is the
    // real property: refine the sampling and the largest gap must shrink with
    // it. A teleport would not shrink at all.
    const largestStep = (animation: (typeof ANIMATIONS)[number], samples: number) => {
      let previous = solve(sample(animation, 0).pose)
      let worst = 0
      for (let i = 1; i <= samples; i++) {
        const current = solve(sample(animation, i / samples).pose)
        for (const joint of ['footNear', 'handNear', 'head'] as const) {
          worst = Math.max(worst, Math.hypot(
            current[joint].x - previous[joint].x,
            current[joint].y - previous[joint].y,
          ))
        }
        previous = current
      }
      return worst
    }

    for (const animation of ANIMATIONS) {
      const coarse = largestStep(animation, 120)
      const fine = largestStep(animation, 480)
      expect(fine, `${animation.name} is smooth under refinement`).toBeLessThan(coarse * 0.45)
    }
  })

  it('fires exactly one impact per attack, at the strike', () => {
    for (const animation of ATTACKS) {
      const impacts = animation.frames.filter((f) => f.impact)
      expect(impacts, animation.name).toHaveLength(1)
      const at = impacts[0].t
      expect(at).toBeGreaterThan(0.2)
      expect(at).toBeLessThan(0.8)
      expect(sample(animation, at).impact).toBeGreaterThan(0.9)
      expect(sample(animation, 0).impact).toBe(0)
      expect(sample(animation, 1).impact).toBe(0)
    }
  })

  it('front-loads the strike and gives recovery more time', () => {
    // Anticipation → fast strike → slower recovery is what reads as weight.
    for (const animation of ATTACKS) {
      const impactAt = animation.frames.find((f) => f.impact)!.t
      expect(impactAt, `${animation.name} strikes before the halfway point-ish`).toBeLessThan(0.6)
      expect(1 - impactAt, `${animation.name} leaves room to recover`).toBeGreaterThan(0.35)
    }
  })

  it('clamps out-of-range progress instead of exploding', () => {
    for (const animation of ANIMATIONS) {
      expect(() => sample(animation, -1)).not.toThrow()
      expect(() => sample(animation, 5)).not.toThrow()
      expect(sample(animation, -1).pose).toEqual(sample(animation, 0).pose)
    }
  })
})

describe('blend', () => {
  it('returns the endpoints exactly', () => {
    const a = STANCE
    const b = { ...STANCE, lean: 40 }
    expect(blend(a, b, 0).lean).toBe(a.lean)
    expect(blend(a, b, 1).lean).toBe(b.lean)
    expect(blend(a, b, 0.5).lean).toBeCloseTo((a.lean + b.lean) / 2)
  })
})
