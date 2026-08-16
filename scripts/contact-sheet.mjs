import { build } from 'esbuild'
import { chromium } from 'playwright'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Render every item to a PNG contact sheet, so somebody can LOOK at it.
 *
 * Not a test and not wired into `verify`. It exists because this repo has
 * twice shipped artwork that every automated check approved and that was
 * visibly broken on screen — a second sword through the figure's skull passed
 * a suite that read the markup. An assertion can tell you a shape is present.
 * It cannot tell you the shape is a helmet.
 *
 * Usage:
 *   node scripts/contact-sheet.mjs                     # everything
 *   node scripts/contact-sheet.mjs legendary mythical  # only those rarities
 *   node scripts/contact-sheet.mjs --slot=aura
 *
 * Writes to node_modules/.forged-contact/sheet-*.png, which is outside git.
 */

const OUT = join(process.cwd(), 'node_modules', '.forged-contact')
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const CELL = Number(arg('cell', 200))
const COLS = Number(arg('cols', 6))

async function renderer() {
  mkdirSync(OUT, { recursive: true })
  const entry = join(OUT, 'entry.jsx')
  writeFileSync(
    entry,
    `import { createElement } from 'react'
     import { renderToStaticMarkup } from 'react-dom/server'
     import { Warrior } from '${join(process.cwd(), 'src/character/Warrior.tsx')}'
     import { ITEMS } from '${join(process.cwd(), 'src/data/items.ts')}'
     export const items = ITEMS.map((i) => ({ id: i.id, slot: i.slot, art: i.art, name: i.name, rarity: i.rarity }))
     const BASE = { face: 'face-recruit', head: 'head-none', body: 'body-tunic', hands: 'hands-wraps',
       feet: 'feet-wraps', weapon: 'weapon-katana', back: 'back-none', aura: 'aura-none',
       companion: 'companion-none', pose: 'pose-ready' }
     export function draw(item) {
       return renderToStaticMarkup(
         createElement(Warrior, {
           equipped: { ...BASE, [item.slot]: item.id },
           frame: 'masculine', build: 0.6, still: true,
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
    alias: { '@': join(process.cwd(), 'src') },
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server'],
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
  })
  return import(pathToFileURL(outfile).href)
}

async function main() {
  rmSync(OUT, { recursive: true, force: true })
  const { items, draw } = await renderer()

  const args = process.argv.slice(2)
  const slotArg = arg('slot')
  const onlyArg = arg('only')
  const rarities = args.filter((a) => !a.startsWith('--'))
  let picked = items
  if (rarities.length) picked = picked.filter((i) => rarities.includes(i.rarity))
  if (slotArg) picked = picked.filter((i) => i.slot === slotArg)
  if (onlyArg) {
    const wanted = new Set(onlyArg.split(','))
    picked = picked.filter((i) => wanted.has(i.id) || wanted.has(i.art))
  }
  // Titles are text; there is nothing to draw and a cell of them is noise.
  picked = picked.filter((i) => i.slot !== 'title')
  if (!picked.length) {
    console.log('nothing matched')
    return
  }

  const browser = await chromium.launch({
    ...(process.env.SMOKE_CHROMIUM ? { executablePath: process.env.SMOKE_CHROMIUM } : {}),
    args: ['--no-sandbox'],
  })

  // One sheet per rarity, so a page is a tier and the ladder is comparable
  // side by side rather than scattered through a 158-cell grid. `--only`
  // collapses that into a single sheet, which is the zoomed-in mode.
  const byRarity = new Map()
  if (onlyArg) byRarity.set('picked', picked)
  else
    for (const item of picked) {
      if (!byRarity.has(item.rarity)) byRarity.set(item.rarity, [])
      byRarity.get(item.rarity).push(item)
    }

  for (const [rarity, group] of byRarity) {
    const rows = Math.ceil(group.length / COLS)
    const cells = group
      .map((item) => {
        const svg = draw(item)
          .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
          .replace(/class="[^"]*"/, '')
        return `<figure><div class="art">${svg}</div><figcaption>${item.name}<br><span>${item.slot} · ${item.art}</span></figcaption></figure>`
      })
      .join('')
    const page = await browser.newPage({
      viewport: { width: COLS * CELL + 40, height: rows * (CELL * 1.4 + 46) + 60 },
      deviceScaleFactor: 2,
    })
    await page.setContent(
      `<!doctype html><meta charset="utf-8">
       <style>
         body { margin:0; padding:20px; background:#0b0b0f; font:11px system-ui,sans-serif; color:#cfc9b6; }
         h1 { font-size:14px; margin:0 0 10px; text-transform:uppercase; letter-spacing:2px; color:#fb923c; }
         .grid { display:grid; grid-template-columns:repeat(${COLS},${CELL}px); }
         figure { margin:0; text-align:center; }
         .art { height:${Math.round(CELL * 1.4)}px; display:grid; place-items:center; }
         svg { width:${CELL - 24}px; height:auto; }
         figcaption { line-height:1.4; padding-bottom:8px; }
         figcaption span { color:#6b7280; font-size:9px; }
       </style>
       <h1>${rarity} — ${group.length}</h1>
       <div class="grid">${cells}</div>`,
    )
    const file = join(OUT, `sheet-${rarity}.png`)
    await page.screenshot({ path: file, fullPage: true })
    await page.close()
    console.log(file)
  }

  await browser.close()
}

await main()
