/**
 * Icon generator.
 *
 * Writes the PWA PNG icons from a vector description using nothing but Node's
 * built-in zlib — no image library, no binary assets checked in that nobody can
 * regenerate. Run with `node scripts/generate-icons.mjs`.
 *
 * The mark is an original anvil silhouette under three rising embers, drawn in
 * the same ember/charcoal palette as the app.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// --- colours ---------------------------------------------------------------
const BG_OUTER = [8, 8, 10]
const BG_INNER = [26, 18, 16]
const EMBER = [249, 115, 22]
const EMBER_HOT = [253, 186, 116]
const IRON = [154, 158, 168]
const IRON_DARK = [88, 92, 102]

// --- geometry (normalised 0..1, y down) ------------------------------------
const ANVIL = [
  // top face + horn
  [
    [0.10, 0.455], [0.20, 0.415], [0.86, 0.415], [0.86, 0.505],
    [0.20, 0.505], [0.10, 0.495], [0.045, 0.475],
  ],
  // waist
  [
    [0.375, 0.505], [0.625, 0.505], [0.585, 0.665], [0.415, 0.665],
  ],
  // base
  [
    [0.255, 0.665], [0.745, 0.665], [0.795, 0.795], [0.205, 0.795],
  ],
]

const EMBERS = [
  { cx: 0.5, cy: 0.235, r: 0.075 },
  { cx: 0.315, cy: 0.305, r: 0.045 },
  { cx: 0.685, cy: 0.3, r: 0.05 },
]

function pointInPolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Teardrop-ish ember: a circle with a tapering flame above it. */
function emberAlpha(x, y, e) {
  const dx = (x - e.cx) / e.r
  const dy = (y - e.cy) / e.r
  if (dx * dx + dy * dy <= 1) return 1
  // flame tip
  const tipHeight = e.r * 2.1
  if (y < e.cy && y > e.cy - tipHeight) {
    const t = (e.cy - y) / tipHeight
    const halfWidth = e.r * (1 - t) * 0.85
    if (Math.abs(x - e.cx) <= halfWidth) return 1
  }
  return 0
}

function roundedSquare(x, y, radius) {
  const cx = Math.min(x, 1 - x)
  const cy = Math.min(y, 1 - y)
  if (cx >= radius || cy >= radius) return true
  const dx = radius - cx
  const dy = radius - cy
  return dx * dx + dy * dy <= radius * radius
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

/** Sample one pixel, supersampled 3×3 for clean edges. */
function sample(px, py, size, maskable) {
  const S = 3
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  for (let sy = 0; sy < S; sy++) {
    for (let sx = 0; sx < S; sx++) {
      const x = (px + (sx + 0.5) / S) / size
      const y = (py + (sy + 0.5) / S) / size
      // Maskable icons need their content inside a safe circle, so the mark is
      // scaled down and the background always fills the full square.
      const scale = maskable ? 0.72 : 1
      const mx = (x - 0.5) / scale + 0.5
      const my = (y - 0.5) / scale + 0.5

      const inSquare = maskable || roundedSquare(x, y, 0.22)
      if (!inSquare) continue

      // background: warm radial glow behind the anvil
      const d = Math.hypot(x - 0.5, y - 0.62)
      const [br, bg, bb] = mix(BG_INNER, BG_OUTER, Math.min(1, d / 0.62))
      let [pr, pg, pb] = [br, bg, bb]

      const insideAnvil = ANVIL.some((poly) => pointInPolygon(mx, my, poly))
      if (insideAnvil) {
        // vertical iron gradient
        const t = Math.min(1, Math.max(0, (my - 0.4) / 0.4))
        ;[pr, pg, pb] = mix(IRON, IRON_DARK, t)
      } else {
        for (const e of EMBERS) {
          if (emberAlpha(mx, my, e)) {
            const t = Math.min(1, Math.max(0, (my - e.cy + e.r) / (e.r * 2)))
            ;[pr, pg, pb] = mix(EMBER_HOT, EMBER, t)
            break
          }
        }
      }

      r += pr
      g += pg
      b += pb
      a += 255
    }
  }
  const n = S * S
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / n)]
}

// --- PNG encoding ----------------------------------------------------------
function crc32(buf) {
  let c
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0 // filter: none
    pixels.copy(raw, offset, y * size * 4, (y + 1) * size * 4)
    offset += size * 4
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function render(size, maskable = false) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = sample(x, y, size, maskable)
      const i = (y * size + x) * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = a
    }
  }
  return encodePng(size, pixels)
}

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
]

for (const [name, size, maskable] of targets) {
  writeFileSync(join(outDir, name), render(size, maskable))
  console.log(`wrote public/icons/${name} (${size}×${size})`)
}

// --- matching SVG favicon --------------------------------------------------
const polygonPoints = (poly) => poly.map(([x, y]) => `${(x * 64).toFixed(2)},${(y * 64).toFixed(2)}`).join(' ')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="FORGED">
  <defs>
    <radialGradient id="bg" cx="50%" cy="62%" r="62%">
      <stop offset="0%" stop-color="#1a1210"/>
      <stop offset="100%" stop-color="#08080a"/>
    </radialGradient>
    <linearGradient id="iron" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9a9ea8"/>
      <stop offset="100%" stop-color="#585c66"/>
    </linearGradient>
    <linearGradient id="ember" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fdba74"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <path d="M32 9 q5 7 5 11 a5 5 0 0 1-10 0 q0-4 5-11z" fill="url(#ember)"/>
  <path d="M20.2 15.6 q3 4.2 3 6.6 a3 3 0 0 1-6 0 q0-2.4 3-6.6z" fill="url(#ember)" opacity="0.85"/>
  <path d="M43.8 15.2 q3.2 4.6 3.2 7.2 a3.2 3.2 0 0 1-6.4 0 q0-2.6 3.2-7.2z" fill="url(#ember)" opacity="0.85"/>
${ANVIL.map((poly) => `  <polygon points="${polygonPoints(poly)}" fill="url(#iron)"/>`).join('\n')}
</svg>
`
writeFileSync(join(outDir, 'mark.svg'), svg)
console.log('wrote public/icons/mark.svg')
