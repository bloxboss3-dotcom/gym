import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Warrior } from '@/character/Warrior'
import type { Figure } from '@/types'

/**
 * The two figures.
 *
 * These assert on the geometry the renderer actually emits, not on a snapshot.
 * The thing that must never drift is that BOTH frames gain the same amount of
 * muscle from the same amount of training — a feminine warrior at level 30 has
 * put on exactly as much shoulder, arm and leg as a masculine one. Proportions
 * differ; the reward for training does not.
 *
 * A snapshot test would have passed happily through a change that halved one
 * frame's growth curve, because the snapshot would simply have been updated.
 */

const LOADOUT = {
  face: 'face-recruit',
  head: 'head-none',
  body: 'body-tunic',
  hands: 'hands-wraps',
  feet: 'feet-wraps',
  weapon: 'weapon-none',
  back: 'back-none',
  aura: 'aura-none',
  companion: 'companion-none',
  pose: 'pose-ready',
}

function draw(frame: Figure, build: number): string {
  return renderToStaticMarkup(<Warrior equipped={LOADOUT} frame={frame} build={build} still />)
}

/** Every `stroke-width` in the markup, which is how limbs are drawn. */
function limbWidths(svg: string): number[] {
  return [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]))
}

/** The deltoid caps: the two ellipses parked at the shoulder line. */
function deltoidRadius(svg: string): number {
  const caps = [...svg.matchAll(/<ellipse[^>]*cy="92"[^>]*rx="([\d.]+)"/g)].map((m) => Number(m[1]))
  expect(caps.length, 'expected two deltoid caps').toBe(2)
  return caps[0]
}

/** Outermost point of the shoulders, which is what reads as width. */
function shoulderSpan(svg: string): number {
  const caps = [...svg.matchAll(/<ellipse[^>]*cx="([\d.]+)"[^>]*cy="92"[^>]*rx="([\d.]+)"/g)].map(
    (m) => ({ cx: Number(m[1]), rx: Number(m[2]) }),
  )
  expect(caps.length, 'expected two deltoid caps').toBe(2)
  const left = Math.min(...caps.map((c) => c.cx - c.rx))
  const right = Math.max(...caps.map((c) => c.cx + c.rx))
  return right - left
}

describe('both figures render', () => {
  it('draws a warrior either way', () => {
    for (const frame of ['masculine', 'feminine'] as Figure[]) {
      const svg = draw(frame, 0.4)
      expect(svg, frame).toContain('<svg')
      expect(svg, frame).toContain('viewBox="0 0 200 280"')
      expect(deltoidRadius(svg)).toBeGreaterThan(0)
      expect(limbWidths(svg).length).toBeGreaterThanOrEqual(6)
    }
  })

  it('gives the feminine frame hair, and the masculine frame none', () => {
    // The default head slot is bare scalp, so without this the feminine figure
    // is a bald one with narrower shoulders and nothing else to read.
    expect(draw('feminine', 0)).toContain('warrior-hair')
    expect(draw('masculine', 0)).not.toContain('warrior-hair')
    // Both layers: the fall behind, and the crown on top of the skull. With
    // only the fall, the head covers its middle and what reaches the screen
    // is two dark slabs either side of the face.
    expect((draw('feminine', 0).match(/warrior-hair/g) ?? []).length).toBe(2)
  })

  it('defaults to masculine, so saves made before the choice existed are unchanged', () => {
    const withoutProp = renderToStaticMarkup(<Warrior equipped={LOADOUT} build={0.5} still />)
    expect(withoutProp).toBe(draw('masculine', 0.5))
  })
})

describe('training shows equally on both figures', () => {
  const AT = [0, 0.25, 0.5, 0.75, 1]

  it('grows the shoulders by the same amount on each', () => {
    const gain = (frame: Figure) => shoulderSpan(draw(frame, 1)) - shoulderSpan(draw(frame, 0))
    expect(gain('feminine')).toBeCloseTo(gain('masculine'), 5)
    expect(gain('masculine')).toBeGreaterThan(8)
  })

  it('grows the deltoid by the same amount on each', () => {
    const gain = (frame: Figure) => deltoidRadius(draw(frame, 1)) - deltoidRadius(draw(frame, 0))
    expect(gain('feminine')).toBeCloseTo(gain('masculine'), 5)
    expect(gain('masculine')).toBeGreaterThan(3)
  })

  it('grows every limb by the same amount on each', () => {
    const masc = limbWidths(draw('masculine', 1)).map(
      (w, i) => w - limbWidths(draw('masculine', 0))[i],
    )
    const fem = limbWidths(draw('feminine', 1)).map((w, i) => w - limbWidths(draw('feminine', 0))[i])
    expect(fem.length).toBe(masc.length)
    fem.forEach((f, i) => expect(f, `limb ${i}`).toBeCloseTo(masc[i], 5))
    expect(Math.max(...masc)).toBeGreaterThan(2)
  })

  it('grows monotonically on both, with no dead stretch', () => {
    for (const frame of ['masculine', 'feminine'] as Figure[]) {
      let previous = -1
      for (const build of AT) {
        const span = shoulderSpan(draw(frame, build))
        expect(span, `${frame} at ${build}`).toBeGreaterThan(previous)
        previous = span
      }
    }
  })
})

describe('the figures are actually different', () => {
  it('differs in proportion at every build level', () => {
    for (const build of [0, 0.5, 1]) {
      expect(draw('feminine', build), `build ${build}`).not.toBe(draw('masculine', build))
    }
  })

  it('gives the feminine frame a narrower shoulder and a narrower head', () => {
    expect(shoulderSpan(draw('feminine', 0))).toBeLessThan(shoulderSpan(draw('masculine', 0)))
    const headRx = (svg: string) => Number(svg.match(/<ellipse[^>]*cy="58"[^>]*rx="([\d.]+)"/)![1])
    expect(headRx(draw('feminine', 0))).toBeLessThan(headRx(draw('masculine', 0)))
  })

  it('keeps the shoulders inside the armour so no skin shows through', () => {
    // Torso armour spans x 76–124; the bare torso is drawn under it and must
    // not poke out past that edge at any build, or the figure looks torn.
    for (const frame of ['masculine', 'feminine'] as Figure[]) {
      const svg = draw(frame, 1)
      const torso = svg.match(/<path d="M([\d.]+) 88 Q100 82/)
      expect(torso, `${frame} torso`).toBeTruthy()
      expect(Number(torso![1]), `${frame} torso left edge`).toBeGreaterThanOrEqual(76)
    }
  })
})
