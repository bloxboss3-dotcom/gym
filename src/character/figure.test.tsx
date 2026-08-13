import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BodyArt, Warrior } from '@/character/Warrior'
import { ITEMS } from '@/data/items'
import { SKIN } from '@/character/palette'
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

/**
 * Limb thicknesses: arms and legs are the paths stroked in skin.
 *
 * Filtered by stroke colour rather than by "every stroke-width in the file",
 * which is what this used to do and which quietly started counting the four
 * strokes of the bust shading as limbs the moment that was added.
 */
function limbWidths(svg: string): number[] {
  return [...svg.matchAll(/<path[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes(`stroke="${SKIN}"`))
    .map((tag) => Number(tag.match(/stroke-width="([\d.]+)"/)?.[1] ?? 0))
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

describe('the wardrobe fits both figures', () => {
  const BODY_ITEMS = ITEMS.filter((i) => i.slot === 'body')
  const ART_OF = Object.fromEntries(ITEMS.map((i) => [i.id, i.art]))

  it('has body armour to test with', () => {
    expect(BODY_ITEMS.length).toBeGreaterThanOrEqual(12)
  })

  /**
   * The shapes one piece of armour is actually made of.
   *
   * Returns the path data, not the markup. Comparing markup does not work:
   * the feminine render carries an extra <g> for the clip, so the two strings
   * differ no matter what the armour does — which is how the first two
   * versions of this test managed to pass against code where the celestial
   * robe and the haori both ignored the frame entirely.
   */
  const armourShapes = (art: string, frame: Figure) => {
    const svg = renderToStaticMarkup(
      <svg>
        <BodyArt art={art} p={{ base: '#888', accent: '#ccc' }} animate={false} frame={frame} />
      </svg>,
    )
      .replace(/<defs>.*?<\/defs>/gs, '')
      .replace(/<g[^>]*class="bust-shading"[^>]*>.*?<\/g>/gs, '')
    return [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join('|')
  }

  it('cuts every piece of body armour differently for each figure', () => {
    // Two of the sixteen carried their own silhouette instead of the shared
    // one, so they came out identically shaped on both frames — a woman in
    // the celestial robe was wearing a man's robe with a different head.
    const same = BODY_ITEMS.filter(
      (item) =>
        armourShapes(ART_OF[item.id], 'feminine') === armourShapes(ART_OF[item.id], 'masculine'),
    ).map((i) => i.id)
    expect(same, `these ignore the figure: ${same.join(', ')}`).toEqual([])
  })

  it('clips armour trim to the waist it is worn on', () => {
    // Belts and bands are full-width bars at fixed coordinates, drawn for a
    // torso that goes straight down. Against a waist that comes in they hung
    // off the sides as floating tabs. Asserted on the clip being APPLIED —
    // checking the markup merely contains the string "clipPath" passes even
    // when the definition is emitted and then never referenced.
    for (const item of BODY_ITEMS) {
      const svg = renderToStaticMarkup(
        <Warrior equipped={{ ...LOADOUT, body: item.id }} frame="feminine" build={0.5} still />,
      )
      expect(svg, item.id).toMatch(/clip-path="url\(#[^)]+\)"/)
    }
  })

  it('leaves the masculine figure entirely alone', () => {
    // No clip, no bust shading, no new nodes — the frame that already shipped
    // must render exactly as it did.
    for (const item of BODY_ITEMS.slice(0, 4)) {
      const svg = renderToStaticMarkup(
        <Warrior equipped={{ ...LOADOUT, body: item.id }} frame="masculine" build={0.5} still />,
      )
      expect(svg, item.id).not.toContain('clipPath')
    }
  })
})

describe('poses do something', () => {
  const POSES = ITEMS.filter((i) => i.slot === 'pose')

  const withPose = (poseId: string) =>
    renderToStaticMarkup(
      <Warrior equipped={{ ...LOADOUT, pose: poseId }} frame="masculine" build={0.5} still />,
    ).replace(/\bid="[^"]*"|url\(#[^)]*\)/g, '')

  it('has poses to test', () => {
    expect(POSES.length).toBeGreaterThanOrEqual(6)
  })

  it('draws a visibly different figure for every one of them', () => {
    // Two of these used to render identically — `pose-braced` carried the
    // same art key as `pose-guard`, so unlocking it changed nothing at all.
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const pose of POSES) {
      const markup = withPose(pose.id)
      const already = seen.get(markup)
      if (already) clashes.push(`${pose.id} renders exactly like ${already}`)
      else seen.set(markup, pose.id)
    }
    expect(clashes, clashes.join('; ')).toEqual([])
  })

  it('moves the figure enough to notice', () => {
    // A two-degree rotation is present in the markup and invisible on a
    // phone. Every pose other than the default has to shift the figure by a
    // real amount: several degrees, several units, or several percent.
    const tooSubtle: string[] = []
    for (const pose of POSES) {
      const markup = withPose(pose.id)
      const transform = markup.match(/<g transform="([^"]*(?:rotate|translate|scale)[^"]*)"/)?.[1]
      if (pose.art === 'ready') continue
      if (!transform) {
        tooSubtle.push(`${pose.id}: no transform at all`)
        continue
      }
      const rotate = Math.abs(Number(transform.match(/rotate\((-?[\d.]+)/)?.[1] ?? 0))
      const shift = Math.abs(Number(transform.match(/translate\((-?[\d.]+)\s+(-?[\d.]+)/)?.[2] ?? 0))
      const scale = Math.abs(1 - Number(transform.match(/scale\(([\d.]+)/)?.[1] ?? 1))
      if (rotate < 3 && shift < 5 && scale < 0.03) {
        tooSubtle.push(`${pose.id}: rotate ${rotate}, shift ${shift}, scale ${scale}`)
      }
    }
    expect(tooSubtle, tooSubtle.join('; ')).toEqual([])
  })

  it('keeps every pose standing on the floor', () => {
    // Rotations are anchored at the ground plane so nothing pivots about its
    // navel and hovers.
    for (const pose of POSES) {
      const markup = withPose(pose.id)
      const rotate = markup.match(/rotate\(-?[\d.]+\s+(\d+)\s+(\d+)\)/)
      if (rotate) expect(Number(rotate[2]), pose.id).toBe(252)
    }
  })
})
