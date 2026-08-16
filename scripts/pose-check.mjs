import { build } from 'esbuild'
import { chromium } from 'playwright'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Does the warrior actually hold the pose?
 *
 * This exists because the pose slot shipped broken twice while a green test
 * suite watched. Both times the tests read the SVG markup — transform strings,
 * attribute counts, path data — and both times the markup was fine and the
 * drawing was not. The second bug put a second sword through the figure's own
 * skull, and every assertion passed.
 *
 * So this one rasterises. It renders each pose to pixels the way a phone does
 * and compares images:
 *
 *   · The weapon must not be drawn across the face. Checked by rendering the
 *     same pose armed and bare and comparing the head region — if a blade
 *     crosses it, those pixels differ.
 *   · Nothing may be drawn twice. Two swords is what "clip each copy to its
 *     own half" produced when the clip silently did nothing.
 *
 * What is deliberately NOT here is "the pose changed the picture". It was,
 * and it could not do its job: a whole-figure tilt with no limb movement at
 * all moves 11-17% of the pixels, and real articulation moves 14-18%. The
 * measure cannot tell them apart, so it would have passed on the exact bug it
 * was written for. Limb movement is asserted geometrically in `pose.test.tsx`
 * instead, by following the transform chain to each joint — that one does
 * fail against an unarticulated figure, which is the test that matters.
 *
 * Rasterising is the whole point of what IS here. Do not replace these with
 * markup checks.
 */

// Inside node_modules so the bundle can resolve react-dom/server, and so it
// is ignored by git without adding a rule for it.
const OUT = join(process.cwd(), 'node_modules', '.forged-pose-check')
const SIZE = 240

async function renderer() {
  // Bundle the character renderer so this script can call it directly, rather
  // than standing up the whole app to look at one component.
  const entry = join(OUT, 'entry.jsx')
  writeFileSync(
    entry,
    `import { createElement } from 'react'
     import { renderToStaticMarkup } from 'react-dom/server'
     import { Warrior } from '${join(process.cwd(), 'src/character/Warrior.tsx')}'
     import { ITEMS } from '${join(process.cwd(), 'src/data/items.ts')}'
     export const poses = ITEMS.filter((i) => i.slot === 'pose').map((i) => ({ id: i.id, art: i.art, name: i.name }))
     const TOP = ['legendary', 'mythical', 'secret']
     export const topTier = ITEMS
       .filter((i) => TOP.includes(i.rarity) && i.slot !== 'title')
       .map((i) => ({ id: i.id, slot: i.slot, art: i.art, name: i.name, rarity: i.rarity }))
     const BARE = { face: 'face-recruit', head: 'head-none', body: 'body-tunic', hands: 'hands-wraps',
       feet: 'feet-wraps', weapon: 'weapon-none', back: 'back-none', aura: 'aura-none',
       companion: 'companion-none', pose: 'pose-ready' }
     export function wearing(slot, id) {
       return renderToStaticMarkup(
         createElement(Warrior, {
           equipped: { ...BARE, [slot]: id },
           frame: 'masculine', build: 0.6, still: true,
         }),
       )
     }
     export function draw(pose, weapon) {
       // createElement, not a direct call: the renderer uses hooks, and calling
       // a component as a plain function skips the dispatcher they need.
       return renderToStaticMarkup(
         createElement(Warrior, {
           equipped: { face: 'face-recruit', head: 'head-none', body: 'body-tunic', hands: 'hands-wraps',
             feet: 'feet-wraps', weapon, back: 'back-none', aura: 'aura-none', companion: 'companion-none', pose },
           frame: 'masculine', build: 0.5, still: true,
         }),
       )
     }`,
  )
  const outfile = join(OUT, 'bundle.cjs')
  await build({
    entryPoints: [entry],
    bundle: true,
    outfile,
    format: 'cjs',
    platform: 'node',
    jsx: 'automatic',
    logLevel: 'silent',
    // The app's own `@/` alias, so the component resolves its imports the
    // same way Vite gives it.
    alias: { '@': join(process.cwd(), 'src') },
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server'],
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
  })
  return import(pathToFileURL(outfile).href)
}

/**
 * Rasterise an SVG to real RGBA pixels.
 *
 * Through a canvas rather than a screenshot, because a screenshot comes back
 * as PNG and comparing compressed bytes only ever answers "identical or not" —
 * which reads as 0% or 100% and makes any threshold meaningless.
 */
async function raster(page, markup) {
  // An SVG loaded as an image must declare its namespace. React does not emit
  // one, so a data URL built straight from the markup never decodes.
  const svg = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return page.evaluate(
    async ({ svg, size }) => {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      })
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)
      return Array.from(ctx.getImageData(0, 0, size, size).data)
    },
    { svg, size: SIZE },
  )
}

/** Share of pixels that differ, optionally only inside a mask. */
function differs(a, b, inside) {
  let counted = 0
  let changed = 0
  for (let i = 0; i < a.length; i += 4) {
    const px = (i / 4) % SIZE
    const py = Math.floor(i / 4 / SIZE)
    if (inside && !inside(px, py)) continue
    counted += 1
    if (
      Math.abs(a[i] - b[i]) > 8 ||
      Math.abs(a[i + 1] - b[i + 1]) > 8 ||
      Math.abs(a[i + 2] - b[i + 2]) > 8 ||
      Math.abs(a[i + 3] - b[i + 3]) > 8
    ) changed += 1
  }
  return counted === 0 ? 0 : changed / counted
}

/**
 * The head, as an ellipse rather than a bounding box.
 *
 * The figure is drawn on a 200x280 canvas with the skull at (100, 58), radii
 * 19 and 21, squashed here into a square raster. A box around it would flag a
 * blade passing beside the ear; the face is what must stay clear.
 */
function onTheFace(x, y) {
  const cx = (100 / 200) * SIZE
  const cy = (58 / 280) * SIZE
  const rx = (19 / 200) * SIZE * 0.95
  const ry = (21 / 280) * SIZE * 0.95
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
}

async function main() {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  const { poses, draw, topTier, wearing } = await renderer()

  const browser = await chromium.launch({
    ...(process.env.SMOKE_CHROMIUM ? { executablePath: process.env.SMOKE_CHROMIUM } : {}),
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 2 })

  const results = []
  const record = (name, ok, detail = '') => {
    results.push({ name, ok })
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  }

  for (const pose of poses) {
    const armed = draw(pose.id, 'weapon-katana')
    const bare = draw(pose.id, 'weapon-none')

    // Nothing drawn twice. The katana's blade is one path; two of it means the
    // figure is carrying two swords.
    const gloves = (armed.match(/data-part="glove-/g) ?? []).length
    const weapons = (armed.match(/data-part="weapon"/g) ?? []).length
    record(
      `${pose.art}: carries one weapon and one glove per hand`,
      weapons === 1 && gloves === 2,
      `${weapons} weapon group, ${gloves} gloves`,
    )

    // The blade must not cross the face. Same pose, armed and bare: if a
    // sword is drawn over the head, the head region differs between them.
    const armedPixels = await raster(page, armed)
    const barePixels = await raster(page, bare)
    const faceDiff = differs(armedPixels, barePixels, onTheFace)
    record(
      `${pose.art}: keeps the blade off its own face`,
      faceDiff < 0.02,
      `${(faceDiff * 100).toFixed(1)}% of the face is covered by the weapon`,
    )

  }

  /*
    Every item from legendary up has to put something on screen.

    A name in the catalogue pointing at an art key nothing handles renders an
    empty group: the markup changes, every string assertion passes, and the
    sword is missing. The unit suite counts shapes, which catches that; this
    counts PIXELS, which also catches art drawn off-canvas, drawn in the
    background colour, or drawn underneath the figure where nobody sees it.

    The baseline is the same warrior with the empty version of that slot, so
    what is being measured is the item's own contribution and nothing else.
  */
  const BARE = {
    face: 'face-recruit', head: 'head-none', body: 'body-tunic', hands: 'hands-wraps',
    feet: 'feet-wraps', weapon: 'weapon-none', back: 'back-none', aura: 'aura-none',
    companion: 'companion-none', pose: 'pose-ready',
  }
  const baseline = {}
  for (const slot of Object.keys(BARE)) {
    baseline[slot] = await raster(page, wearing(slot, BARE[slot]))
  }
  // 0.15% of a 240x240 canvas is about 86 pixels — smaller than any real piece
  // of gear and larger than antialiasing noise.
  const FLOOR = 0.0015
  for (const item of topTier) {
    if (item.id === BARE[item.slot]) continue
    const pixels = await raster(page, wearing(item.slot, item.id))
    const diff = differs(pixels, baseline[item.slot])
    record(
      `${item.rarity} ${item.name} draws something`,
      diff > FLOOR,
      `${(diff * 100).toFixed(2)}% of the canvas differs from an empty ${item.slot}`,
    )
  }

  await browser.close()
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} pose checks passed`)
  if (failed.length) process.exit(1)
}

await main()
