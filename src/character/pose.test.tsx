import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Warrior } from '@/character/Warrior'
import { ITEMS } from '@/data/items'

/**
 * Do the poses actually pose anything?
 *
 * The tests this replaces read the pose transform out of the markup and
 * checked the number in it was bigger than three. That is a test of the
 * config, not of the figure: every pose passed it while the drawing itself
 * never changed shape, because a whole-figure rotation tilts a picture and
 * calls it a stance. Somebody who unlocked a mythical pose saw the same
 * warrior at a slightly different angle, which is the complaint.
 *
 * So these work the other way round. They render the warrior, follow the
 * transform chain from the root down to the forearm the way a browser does,
 * and report where the hand ends up in canvas coordinates. A pose that does
 * nothing puts the hand where `ready` puts it, and fails.
 */

const LOADOUT = {
  face: 'face-recruit',
  head: 'head-none',
  body: 'body-tunic',
  hands: 'hands-wraps',
  feet: 'feet-wraps',
  weapon: 'weapon-katana',
  back: 'back-none',
  aura: 'aura-none',
  companion: 'companion-none',
  pose: 'pose-ready',
}

const POSES = ITEMS.filter((i) => i.slot === 'pose')

// --- the smallest SVG transform engine that can answer the question --------

type Matrix = [number, number, number, number, number, number]
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

function parseTransform(value: string | null): Matrix {
  if (!value) return IDENTITY
  let out = IDENTITY
  const ops = value.matchAll(/(rotate|translate|scale|matrix)\(([^)]*)\)/g)
  for (const [, name, rawArgs] of ops) {
    const a = rawArgs.trim().split(/[\s,]+/).map(Number)
    if (name === 'translate') out = multiply(out, [1, 0, 0, 1, a[0], a[1] ?? 0])
    else if (name === 'scale') out = multiply(out, [a[0], 0, 0, a[1] ?? a[0], 0, 0])
    else if (name === 'matrix') out = multiply(out, a as Matrix)
    else if (name === 'rotate') {
      const r = (a[0] * Math.PI) / 180
      const [cos, sin] = [Math.cos(r), Math.sin(r)]
      const [cx, cy] = [a[1] ?? 0, a[2] ?? 0]
      out = multiply(out, [1, 0, 0, 1, cx, cy])
      out = multiply(out, [cos, sin, -sin, cos, 0, 0])
      out = multiply(out, [1, 0, 0, 1, -cx, -cy])
    }
  }
  return out
}

function at(m: Matrix, x: number, y: number) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }
}

/** Compose every transform from the document root down to this element. */
function chainOf(el: Element): Matrix {
  const stack: Element[] = []
  for (let node: Element | null = el; node; node = node.parentElement) stack.unshift(node)
  return stack.reduce((m, node) => multiply(m, parseTransform(node.getAttribute('transform'))), IDENTITY)
}

function render(poseId: string, weapon = 'weapon-katana') {
  const markup = renderToStaticMarkup(
    <Warrior equipped={{ ...LOADOUT, weapon, pose: poseId }} frame="masculine" build={0.5} still />,
  )
  return new DOMParser().parseFromString(markup, 'image/svg+xml')
}

/** The forearm paths are drawn between fixed elbow and wrist points. */
const FOREARM = { left: 'M72 122 L67 150', right: 'M128 122 L133 150' }

function forearm(doc: Document, side: 'left' | 'right'): Element {
  const found = [...doc.querySelectorAll('path')].find(
    (p) => p.getAttribute('d') === FOREARM[side],
  )
  if (!found) throw new Error(`no ${side} forearm in the markup`)
  return found
}

/** Where the hand ends up on the 200×280 canvas. */
function wrist(doc: Document, side: 'left' | 'right') {
  const point = side === 'left' ? { x: 67, y: 150 } : { x: 133, y: 150 }
  return at(chainOf(forearm(doc, side)), point.x, point.y)
}

/** And the elbow, which is most of what a guard stance actually is. */
function elbow(doc: Document, side: 'left' | 'right') {
  const point = side === 'left' ? { x: 72, y: 122 } : { x: 128, y: 122 }
  return at(chainOf(forearm(doc, side)), point.x, point.y)
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

describe('poses move the body, not just the picture', () => {
  const ready = render('pose-ready')
  const readyJoints = {
    wrist: { left: wrist(ready, 'left'), right: wrist(ready, 'right') },
    elbow: { left: elbow(ready, 'left'), right: elbow(ready, 'right') },
  }

  it('has poses to test', () => {
    expect(POSES.length).toBeGreaterThanOrEqual(6)
  })

  it('puts the hands somewhere else for every pose', () => {
    /*
      Twelve units on a 200-wide canvas is six percent of the figure's width —
      about the width of its own fist, and the smallest move that still reads
      as a different position on a phone. A whole-figure tilt of a few degrees
      does not clear this, which is the point.
    */
    const idle: string[] = []
    for (const pose of POSES) {
      if (pose.art === 'ready') continue
      const doc = render(pose.id)
      const moved = Math.max(
        distance(wrist(doc, 'left'), readyJoints.wrist.left),
        distance(wrist(doc, 'right'), readyJoints.wrist.right),
        distance(elbow(doc, 'left'), readyJoints.elbow.left),
        distance(elbow(doc, 'right'), readyJoints.elbow.right),
      )
      if (moved < 12) idle.push(`${pose.id}: joints moved ${moved.toFixed(1)}`)
    }
    expect(idle, idle.join('; ')).toEqual([])
  })

  it('gives every pose its own arrangement of the arms', () => {
    // Two poses once shared an art key, so one of them was decoration.
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const pose of POSES) {
      const doc = render(pose.id)
      const key = (['left', 'right'] as const)
        .map((s) => {
          const w = wrist(doc, s)
          return `${w.x.toFixed(1)},${w.y.toFixed(1)}`
        })
        .join('|')
      const already = seen.get(key)
      if (already) clashes.push(`${pose.id} holds its arms exactly like ${already}`)
      else seen.set(key, pose.id)
    }
    expect(clashes, clashes.join('; ')).toEqual([])
  })

  it('keeps both hands on the canvas', () => {
    // The canvas is 200 × 280 and gloves are drawn about ten units either
    // side of the wrist, so a hand at x = 195 is a hand with no fingers.
    const off: string[] = []
    for (const pose of POSES) {
      const doc = render(pose.id)
      for (const side of ['left', 'right'] as const) {
        const w = wrist(doc, side)
        if (w.x < 14 || w.x > 186 || w.y < 12 || w.y > 248) {
          off.push(`${pose.id} ${side}: ${w.x.toFixed(0)},${w.y.toFixed(0)}`)
        }
      }
    }
    expect(off, off.join('; ')).toEqual([])
  })

  it('carries the gloves and the weapon with the arm holding them', () => {
    /*
      The failure this guards against is the one that makes articulation look
      broken rather than absent: an arm swings up and its glove stays behind
      in mid-air. Gear is drawn outside the body, so the only thing keeping it
      attached is that it is given the same transform as the forearm.

      Which side is which is checked too, by reading the clip rectangle each
      group is cut by — the left half starts off-canvas at x = -200, the right
      at the centre line. Swapping the two would hand the left glove to the
      right arm, and every "does the gear move" assertion would still pass.
    */
    for (const pose of POSES) {
      if (pose.art === 'ready') continue
      const doc = render(pose.id)
      const groups = [...doc.querySelectorAll('g[clip-path]')]
      expect(groups.length, `${pose.id}: expected a left and a right gear group`).toBe(2)

      for (const group of groups) {
        const clipId = group.getAttribute('clip-path')!.replace(/^url\(#|\)$/g, '')
        const rect = doc.getElementById(clipId)?.querySelector('rect')
        expect(rect, `${pose.id}: clip ${clipId} has no rectangle`).toBeTruthy()
        const side = Number(rect!.getAttribute('x')) < 0 ? 'left' : 'right'
        const gear = chainOf(group.parentElement as Element)
        const arm = chainOf(forearm(doc, side))
        expect(
          gear.every((v, i) => Math.abs(v - arm[i]) < 1e-9),
          `${pose.id}: ${side} gear sits at [${gear.map((v) => v.toFixed(2))}] but its arm is at [${arm.map((v) => v.toFixed(2))}]`,
        ).toBe(true)
      }
    }
  })

  it('leaves the unposed figure exactly as it was, with no clipping at all', () => {
    // `ready` is the default on a new account, so it is the drawing almost
    // everybody sees. It must not pay for the machinery the others need.
    const markup = renderToStaticMarkup(
      <Warrior equipped={LOADOUT} frame="masculine" build={0.5} still />,
    )
    expect(markup).not.toContain('clipPath')
    expect(markup).not.toContain('clip-path')
  })

  it('turns the head with whatever is worn on it', () => {
    // A helmet left facing forward while the skull turns is worse than a head
    // that never turns.
    const doc = render('pose-rest')
    const skull = [...doc.querySelectorAll('ellipse')].find(
      (e) => e.getAttribute('cy') === '58' && e.getAttribute('rx') === '19',
    )
    expect(skull, 'no skull found').toBeTruthy()
    const turned = at(chainOf(skull as Element), 100, 58)
    const straight = at(chainOf(
      [...ready.querySelectorAll('ellipse')].find(
        (e) => e.getAttribute('cy') === '58' && e.getAttribute('rx') === '19',
      ) as Element,
    ), 100, 58)
    expect(distance(turned, straight)).toBeGreaterThan(2)
  })

  it('keeps every pose standing on the floor', () => {
    // Whatever else moves, the feet do not leave the ground plane.
    for (const pose of POSES) {
      const doc = render(pose.id)
      const shin = [...doc.querySelectorAll('path')].find(
        (p) => p.getAttribute('d') === 'M113 196 L115 238',
      )
      expect(shin, `${pose.id}: no right shin`).toBeTruthy()
      const foot = at(chainOf(shin as Element), 115, 238)
      expect(Math.abs(foot.y - 238), `${pose.id} floats: y ${foot.y.toFixed(1)}`).toBeLessThan(14)
    }
  })
})
