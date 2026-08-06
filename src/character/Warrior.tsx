import { useId, type ReactNode } from 'react'
import { ITEM_BY_ID } from '@/data/items'
import type { CosmeticItem, Slot } from '@/types'
import { useReducedMotion } from '@/components/ui'

/**
 * The FORGED warrior.
 *
 * Entirely original, code-native SVG — no external assets, no licensed art. Each
 * equipment slot renders a small module keyed off the item's `art` string and
 * tinted with the item's palette, so new gear is a data row rather than a file.
 *
 * Coordinate space is a 200 × 280 viewBox with the ground plane at y = 252.
 */

const SKIN = '#b78a63'
const SKIN_SHADE = '#8c6647'
const CLOTH = '#3a3a44'

interface Palette {
  base: string
  accent: string
  glow?: string
}

function paletteOf(item: CosmeticItem | undefined, fallback: Palette): Palette {
  return item?.palette ?? fallback
}

// ---------------------------------------------------------------------------
// Base body
// ---------------------------------------------------------------------------

function Body({ heavy }: { heavy: boolean }) {
  const shoulder = heavy ? 26 : 22
  return (
    <g>
      {/* legs */}
      <path
        d="M90 148 L87 200 L85 238"
        stroke={SKIN}
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M110 148 L113 200 L115 238"
        stroke={SKIN}
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      {/* hips */}
      <path d="M82 138 L118 138 L116 156 L84 156 Z" fill={SKIN_SHADE} />
      {/* torso */}
      <path
        d={`M${100 - shoulder} 88 Q100 82 ${100 + shoulder} 88 L116 144 L84 144 Z`}
        fill={SKIN}
      />
      {/* arms */}
      <path
        d={`M${100 - shoulder + 2} 92 L72 122 L67 150`}
        stroke={SKIN}
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${100 + shoulder - 2} 92 L128 122 L133 150`}
        stroke={SKIN}
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      {/* neck + head */}
      <rect x="94" y="74" width="12" height="12" fill={SKIN_SHADE} rx="3" />
      <ellipse cx="100" cy="58" rx="19" ry="21" fill={SKIN} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Body armour
// ---------------------------------------------------------------------------

function BodyArt({ art, p }: { art: string; p: Palette }) {
  const torso = 'M76 88 Q100 80 124 88 L118 146 L82 146 Z'
  const wide = 'M70 88 Q100 78 130 88 L120 148 L80 148 Z'

  switch (art) {
    case 'tunic':
      return (
        <g>
          <path d={torso} fill={p.base} />
          <path d="M100 84 L100 146" stroke={p.accent} strokeWidth="2" opacity="0.5" />
          <path d="M80 140 L120 140" stroke={p.accent} strokeWidth="4" opacity="0.7" />
        </g>
      )
    case 'padded':
      return (
        <g>
          <path d={torso} fill={p.base} />
          {[98, 108, 118, 128, 138].map((y) => (
            <path key={y} d={`M79 ${y} L121 ${y}`} stroke={p.accent} strokeWidth="1.5" opacity="0.45" />
          ))}
          <path d="M80 143 L120 143" stroke={p.accent} strokeWidth="5" opacity="0.8" />
        </g>
      )
    case 'leather':
      return (
        <g>
          <path d={torso} fill={p.base} />
          <path d="M86 86 L104 146" stroke={p.accent} strokeWidth="6" opacity="0.85" />
          <path d="M114 86 L96 146" stroke={p.accent} strokeWidth="4" opacity="0.6" />
          <rect x="80" y="136" width="40" height="8" rx="2" fill={p.accent} opacity="0.9" />
          <circle cx="100" cy="140" r="3" fill={p.base} />
        </g>
      )
    case 'scale':
      return (
        <g>
          <path d={torso} fill={p.base} />
          {[96, 106, 116, 126, 136].map((y) =>
            [84, 94, 104, 114].map((x) => (
              <path
                key={`${x}-${y}`}
                d={`M${x} ${y} a5 5 0 0 1 10 0`}
                fill="none"
                stroke={p.accent}
                strokeWidth="1.6"
                opacity="0.6"
              />
            )),
          )}
        </g>
      )
    case 'brigandine':
      return (
        <g>
          <path d={torso} fill={p.base} />
          <path d="M78 96 L122 96" stroke={p.accent} strokeWidth="3" opacity="0.8" />
          <path d="M80 122 L120 122" stroke={p.accent} strokeWidth="3" opacity="0.8" />
          {[92, 108, 124, 138].map((y) =>
            [86, 100, 114].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill={p.accent} />),
          )}
          <rect x="80" y="138" width="40" height="7" rx="2" fill={p.accent} opacity="0.85" />
        </g>
      )
    case 'plate':
      return (
        <g>
          <path d={wide} fill={p.base} />
          <ellipse cx="74" cy="92" rx="13" ry="10" fill={p.accent} />
          <ellipse cx="126" cy="92" rx="13" ry="10" fill={p.accent} />
          <path d="M100 86 L100 146" stroke={p.accent} strokeWidth="2.5" opacity="0.8" />
          <path d="M84 104 Q100 112 116 104" fill="none" stroke={p.accent} strokeWidth="2.5" />
          <path d="M84 120 Q100 128 116 120" fill="none" stroke={p.accent} strokeWidth="2.5" />
          <path d="M82 146 L118 146 L114 158 L86 158 Z" fill={p.base} />
        </g>
      )
    case 'heavy-plate':
      return (
        <g>
          <path d={wide} fill={p.base} />
          <path d="M60 88 Q74 76 88 88 L86 104 L62 104 Z" fill={p.accent} />
          <path d="M140 88 Q126 76 112 88 L114 104 L138 104 Z" fill={p.accent} />
          <path d="M100 84 L100 148" stroke={p.accent} strokeWidth="3" />
          <path d="M82 100 Q100 110 118 100" fill="none" stroke={p.accent} strokeWidth="3" />
          <path d="M82 118 Q100 128 118 118" fill="none" stroke={p.accent} strokeWidth="3" />
          <path d="M80 148 L120 148 L116 166 L84 166 Z" fill={p.base} />
          <path d="M100 148 L100 166" stroke={p.accent} strokeWidth="2" />
        </g>
      )
    case 'ember-plate':
      return (
        <g>
          <path d={wide} fill="#231512" />
          <path d="M58 88 Q74 74 90 88 L88 106 L60 106 Z" fill={p.base} />
          <path d="M142 88 Q126 74 110 88 L112 106 L140 106 Z" fill={p.base} />
          <path d="M100 82 L100 150" stroke={p.glow ?? p.accent} strokeWidth="3" />
          <path d="M80 100 Q100 112 120 100" fill="none" stroke={p.glow ?? p.accent} strokeWidth="3" />
          <path d="M80 120 Q100 132 120 120" fill="none" stroke={p.glow ?? p.accent} strokeWidth="3" />
          <path d="M78 148 L122 148 L118 168 L82 168 Z" fill="#231512" />
          <path d="M86 152 L88 166 M100 152 L100 168 M114 152 L112 166" stroke={p.accent} strokeWidth="2" />
          <circle cx="100" cy="110" r="5" fill={p.glow ?? p.accent} opacity="0.9" />
        </g>
      )
    default:
      return <path d={torso} fill={p.base} />
  }
}

// ---------------------------------------------------------------------------
// Head / hair
// ---------------------------------------------------------------------------

function HeadArt({ art, p }: { art: string; p: Palette }) {
  switch (art) {
    case 'bound':
      return (
        <g>
          <path d="M81 52 Q100 30 119 52 Q100 44 81 52 Z" fill={p.base} />
          <path d="M118 50 Q132 58 128 76" stroke={p.base} strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'topknot':
      return (
        <g>
          <path d="M82 50 Q100 32 118 50 Q100 42 82 50 Z" fill={p.base} />
          <path d="M100 34 Q104 22 100 14 Q96 22 100 34 Z" fill={p.base} />
          <circle cx="100" cy="32" r="4" fill={p.accent} />
        </g>
      )
    case 'hood':
      return (
        <g>
          <path d="M74 66 Q72 26 100 24 Q128 26 126 66 Q120 48 100 46 Q80 48 74 66 Z" fill={p.base} />
          <path d="M74 66 Q78 82 88 90 L112 90 Q122 82 126 66 L120 62 Q110 74 100 74 Q90 74 80 62 Z" fill={p.accent} opacity="0.55" />
        </g>
      )
    case 'open-helm':
      return (
        <g>
          <path d="M79 60 Q79 30 100 30 Q121 30 121 60 L121 46 Q100 38 79 46 Z" fill={p.base} />
          <path d="M79 44 Q100 34 121 44 L121 52 Q100 44 79 52 Z" fill={p.accent} />
          <rect x="97" y="38" width="6" height="26" rx="2" fill={p.accent} />
        </g>
      )
    case 'horned':
      return (
        <g>
          <path d="M79 58 Q79 28 100 28 Q121 28 121 58 L121 48 Q100 40 79 48 Z" fill={p.base} />
          <path d="M80 44 Q64 34 62 16 Q76 24 84 40 Z" fill={p.accent} />
          <path d="M120 44 Q136 34 138 16 Q124 24 116 40 Z" fill={p.accent} />
          <rect x="97" y="36" width="6" height="26" rx="2" fill={p.accent} />
        </g>
      )
    case 'crowned':
      return (
        <g>
          <path d="M79 58 Q79 30 100 30 Q121 30 121 58 L121 46 Q100 38 79 46 Z" fill={p.base} />
          <path d="M76 34 L84 18 L92 30 L100 12 L108 30 L116 18 L124 34 Z" fill={p.accent} />
          <circle cx="100" cy="24" r="3" fill={p.glow ?? p.accent} />
        </g>
      )
    case 'ember-crown':
      return (
        <g>
          <path d="M79 58 Q79 30 100 30 Q121 30 121 58 L121 46 Q100 38 79 46 Z" fill="#2a1410" />
          <path d="M76 36 L84 16 L92 30 L100 8 L108 30 L116 16 L124 36 Z" fill={p.base} />
          <path d="M84 20 L86 30 M100 12 L100 28 M116 20 L114 30" stroke={p.glow ?? p.accent} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="20" r="4" fill={p.glow ?? p.accent} />
        </g>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Faces
// ---------------------------------------------------------------------------

function FaceArt({ art, p }: { art: string; p: Palette }) {
  const eyes = (fill: string) => (
    <>
      <ellipse cx="92" cy="58" rx="3" ry="2.4" fill={fill} />
      <ellipse cx="108" cy="58" rx="3" ry="2.4" fill={fill} />
    </>
  )
  switch (art) {
    case 'scarred':
      return (
        <g>
          {eyes('#20161a')}
          <path d="M88 44 L96 70" stroke={SKIN_SHADE} strokeWidth="2" opacity="0.9" />
          <path d="M92 68 Q100 72 108 68" stroke="#20161a" strokeWidth="1.6" fill="none" />
        </g>
      )
    case 'warpaint':
      return (
        <g>
          <path d="M83 50 L117 50 L113 62 L87 62 Z" fill={p.base} opacity="0.85" />
          {eyes('#f3ece2')}
          <path d="M92 70 Q100 73 108 70" stroke="#20161a" strokeWidth="1.6" fill="none" />
        </g>
      )
    case 'veiled':
      return (
        <g>
          <path d="M81 56 Q100 50 119 56 L117 74 Q100 80 83 74 Z" fill={p.base} />
          {eyes('#e8dfd2')}
        </g>
      )
    case 'masked':
      return (
        <g>
          <path d="M81 46 Q100 40 119 46 L117 72 Q100 80 83 72 Z" fill={p.base} />
          <rect x="86" y="55" width="9" height="3.5" rx="1.5" fill="#0b0b0d" />
          <rect x="105" y="55" width="9" height="3.5" rx="1.5" fill="#0b0b0d" />
          <path d="M92 68 L108 68" stroke={p.accent} strokeWidth="2" />
          <path d="M100 46 L100 72" stroke={p.accent} strokeWidth="1.5" opacity="0.6" />
        </g>
      )
    case 'ember-eyes':
      return (
        <g>
          <ellipse cx="92" cy="58" rx="4" ry="3" fill={p.glow ?? p.accent} />
          <ellipse cx="108" cy="58" rx="4" ry="3" fill={p.glow ?? p.accent} />
          <path d="M86 50 L96 54 M114 50 L104 54" stroke={p.base} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M92 70 Q100 74 108 70" stroke="#20161a" strokeWidth="1.6" fill="none" />
        </g>
      )
    default:
      return (
        <g>
          {eyes('#20161a')}
          <path d="M93 69 L107 69" stroke="#20161a" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )
  }
}

// ---------------------------------------------------------------------------
// Hands
// ---------------------------------------------------------------------------

function HandsArt({ art, p }: { art: string; p: Palette }) {
  const left = { x: 67, y: 150 }
  const right = { x: 133, y: 150 }
  const pair = (render: (x: number, y: number, flip: number) => ReactNode) => (
    <>
      {render(left.x, left.y, -1)}
      {render(right.x, right.y, 1)}
    </>
  )
  switch (art) {
    case 'wraps':
      return pair((x, y) => (
        <g key={x}>
          <circle cx={x} cy={y} r="7" fill={p.base} />
          <path d={`M${x - 6} ${y - 3} L${x + 6} ${y - 1} M${x - 6} ${y + 2} L${x + 6} ${y + 4}`} stroke={p.accent} strokeWidth="1.5" />
        </g>
      ))
    case 'gloves':
      return pair((x, y) => (
        <g key={x}>
          <circle cx={x} cy={y} r="8" fill={p.base} />
          <path d={`M${x - 7} ${y - 6} L${x + 7} ${y - 6}`} stroke={p.accent} strokeWidth="3" />
        </g>
      ))
    case 'bracers':
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="7" fill={SKIN} />
          <rect x={x - 8} y={y - 22} width="16" height="16" rx="4" fill={p.base} transform={`rotate(${flip * 8} ${x} ${y - 14})`} />
          <path d={`M${x - 6} ${y - 16} L${x + 6} ${y - 16}`} stroke={p.accent} strokeWidth="2" />
        </g>
      ))
    case 'gauntlets':
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="9" fill={p.base} />
          <rect x={x - 9} y={y - 24} width="18" height="18" rx="4" fill={p.base} transform={`rotate(${flip * 8} ${x} ${y - 15})`} />
          <path d={`M${x - 7} ${y - 3} L${x + 7} ${y - 3} M${x - 7} ${y + 3} L${x + 7} ${y + 3}`} stroke={p.accent} strokeWidth="2" />
        </g>
      ))
    case 'heavy-gauntlets':
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="11" fill={p.base} />
          <rect x={x - 11} y={y - 28} width="22" height="22" rx="5" fill={p.base} transform={`rotate(${flip * 8} ${x} ${y - 17})`} />
          <path d={`M${x - 9} ${y - 4} L${x + 9} ${y - 4} M${x - 9} ${y + 3} L${x + 9} ${y + 3}`} stroke={p.accent} strokeWidth="2.5" />
          <circle cx={x} cy={y - 17} r="3.5" fill={p.accent} />
        </g>
      ))
    case 'ember-gauntlets':
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="11" fill="#2a1410" />
          <rect x={x - 11} y={y - 28} width="22" height="22" rx="5" fill="#2a1410" transform={`rotate(${flip * 8} ${x} ${y - 17})`} />
          <path d={`M${x - 8} ${y - 5} L${x + 8} ${y - 5} M${x - 8} ${y + 3} L${x + 8} ${y + 3}`} stroke={p.glow ?? p.accent} strokeWidth="2.5" />
          <circle cx={x} cy={y - 17} r="4" fill={p.glow ?? p.accent} />
        </g>
      ))
    default:
      return pair((x, y) => <circle key={x} cx={x} cy={y} r="7" fill={SKIN} />)
  }
}

// ---------------------------------------------------------------------------
// Feet
// ---------------------------------------------------------------------------

function FeetArt({ art, p }: { art: string; p: Palette }) {
  const foot = (x: number, flip: number, render: (x: number, flip: number) => ReactNode) => render(x, flip)
  const both = (render: (x: number, flip: number) => ReactNode) => (
    <>
      {foot(85, -1, render)}
      {foot(115, 1, render)}
    </>
  )
  switch (art) {
    case 'boots':
      return both((x, flip) => (
        <g key={x}>
          <path d={`M${x - 7} 216 L${x + 7} 216 L${x + 7} 244 L${x + flip * 12} 250 L${x - 8} 250 Z`} fill={p.base} />
          <path d={`M${x - 7} 224 L${x + 7} 224`} stroke={p.accent} strokeWidth="2" />
        </g>
      ))
    case 'runner':
      return both((x, flip) => (
        <g key={x}>
          <path d={`M${x - 7} 226 L${x + 7} 226 L${x + 7} 242 L${x + flip * 13} 248 L${x - 8} 248 Z`} fill={p.base} />
          <path d={`M${x - 8} 246 L${x + flip * 13} 246`} stroke={p.accent} strokeWidth="3.5" strokeLinecap="round" />
          <path d={`M${x - 4} 230 L${x + 4} 234`} stroke={p.accent} strokeWidth="1.8" />
        </g>
      ))
    case 'greaves':
      return both((x, flip) => (
        <g key={x}>
          <rect x={x - 8} y="196" width="16" height="34" rx="4" fill={p.base} />
          <path d={`M${x - 8} 230 L${x + 8} 230 L${x + 8} 244 L${x + flip * 12} 250 L${x - 9} 250 Z`} fill={p.base} />
          <path d={`M${x - 6} 206 L${x + 6} 206 M${x - 6} 216 L${x + 6} 216`} stroke={p.accent} strokeWidth="2" />
        </g>
      ))
    case 'heavy-greaves':
      return both((x, flip) => (
        <g key={x}>
          <rect x={x - 10} y="188" width="20" height="44" rx="5" fill={p.base} />
          <path d={`M${x - 10} 232 L${x + 10} 232 L${x + 10} 244 L${x + flip * 14} 252 L${x - 11} 252 Z`} fill={p.base} />
          <path d={`M${x - 8} 198 L${x + 8} 198 M${x - 8} 212 L${x + 8} 212 M${x - 8} 224 L${x + 8} 224`} stroke={p.accent} strokeWidth="2" />
          <circle cx={x} cy="192" r="3" fill={p.accent} />
        </g>
      ))
    case 'ember-greaves':
      return both((x, flip) => (
        <g key={x}>
          <rect x={x - 10} y="186" width="20" height="46" rx="5" fill="#2a1410" />
          <path d={`M${x - 10} 232 L${x + 10} 232 L${x + 10} 244 L${x + flip * 14} 252 L${x - 11} 252 Z`} fill="#2a1410" />
          <path d={`M${x - 7} 196 L${x + 7} 196 M${x - 7} 210 L${x + 7} 210 M${x - 7} 224 L${x + 7} 224`} stroke={p.glow ?? p.accent} strokeWidth="2.5" />
        </g>
      ))
    default:
      return both((x, flip) => (
        <g key={x}>
          <path d={`M${x - 7} 232 L${x + 7} 232 L${x + 7} 244 L${x + flip * 10} 249 L${x - 8} 249 Z`} fill={p.base} />
          <path d={`M${x - 7} 236 L${x + 7} 238`} stroke={p.accent} strokeWidth="1.5" />
        </g>
      ))
  }
}

// ---------------------------------------------------------------------------
// Weapons — held in the right hand (x ≈ 133)
// ---------------------------------------------------------------------------

function WeaponArt({ art, p }: { art: string; p: Palette }) {
  const hx = 136
  const hy = 150
  switch (art) {
    case 'staff':
      return (
        <g>
          <rect x={hx - 2} y={hy - 96} width="5" height="150" rx="2.5" fill={p.base} />
          <circle cx={hx + 0.5} cy={hy - 98} r="7" fill={p.accent} />
        </g>
      )
    case 'shortsword':
      return (
        <g>
          <rect x={hx - 2} y={hy - 6} width="5" height="18" rx="2" fill="#2a2118" />
          <rect x={hx - 10} y={hy - 10} width="21" height="5" rx="2" fill={p.accent} />
          <path d={`M${hx - 4} ${hy - 10} L${hx + 5} ${hy - 10} L${hx + 3} ${hy - 60} L${hx + 0.5} ${hy - 66} L${hx - 2} ${hy - 60} Z`} fill={p.base} />
        </g>
      )
    case 'longsword':
      return (
        <g>
          <rect x={hx - 2} y={hy - 8} width="5" height="22" rx="2" fill="#2a2118" />
          <rect x={hx - 13} y={hy - 12} width="27" height="5" rx="2" fill={p.accent} />
          <path d={`M${hx - 5} ${hy - 12} L${hx + 6} ${hy - 12} L${hx + 4} ${hy - 86} L${hx + 0.5} ${hy - 94} L${hx - 3} ${hy - 86} Z`} fill={p.base} />
          <path d={`M${hx + 0.5} ${hy - 14} L${hx + 0.5} ${hy - 88}`} stroke={p.accent} strokeWidth="1.4" opacity="0.7" />
        </g>
      )
    case 'greatsword':
      return (
        <g>
          <rect x={hx - 3} y={hy - 10} width="7" height="30" rx="3" fill="#2a2118" />
          <rect x={hx - 18} y={hy - 15} width="37" height="6" rx="3" fill={p.accent} />
          <path d={`M${hx - 8} ${hy - 15} L${hx + 9} ${hy - 15} L${hx + 6} ${hy - 108} L${hx + 0.5} ${hy - 120} L${hx - 5} ${hy - 108} Z`} fill={p.base} />
          <path d={`M${hx + 0.5} ${hy - 18} L${hx + 0.5} ${hy - 110}`} stroke={p.accent} strokeWidth="2" opacity="0.75" />
        </g>
      )
    case 'axe':
      return (
        <g>
          <rect x={hx - 2} y={hy - 66} width="5" height="86" rx="2" fill="#3d2f22" />
          <path d={`M${hx + 3} ${hy - 62} Q${hx + 30} ${hy - 54} ${hx + 20} ${hy - 26} Q${hx + 10} ${hy - 34} ${hx + 3} ${hy - 30} Z`} fill={p.base} />
          <path d={`M${hx + 3} ${hy - 58} Q${hx + 24} ${hy - 52} ${hx + 17} ${hy - 32}`} fill="none" stroke={p.accent} strokeWidth="2" />
        </g>
      )
    case 'mace':
      return (
        <g>
          <rect x={hx - 2} y={hy - 52} width="5" height="72" rx="2" fill="#3d2f22" />
          <circle cx={hx + 0.5} cy={hy - 58} r="12" fill={p.base} />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = (a * Math.PI) / 180
            return (
              <path
                key={a}
                d={`M${hx + 0.5 + Math.cos(r) * 10} ${hy - 58 + Math.sin(r) * 10} L${hx + 0.5 + Math.cos(r) * 17} ${hy - 58 + Math.sin(r) * 17}`}
                stroke={p.accent}
                strokeWidth="4"
                strokeLinecap="round"
              />
            )
          })}
        </g>
      )
    case 'warhammer':
      return (
        <g>
          <rect x={hx - 3} y={hy - 62} width="6" height="84" rx="3" fill="#3d2f22" />
          <rect x={hx - 16} y={hy - 76} width="33" height="20" rx="4" fill={p.base} />
          <rect x={hx - 16} y={hy - 70} width="33" height="4" fill={p.accent} />
        </g>
      )
    case 'spear':
      return (
        <g>
          <rect x={hx - 2} y={hy - 100} width="5" height="150" rx="2" fill="#3d2f22" />
          <path d={`M${hx - 5} ${hy - 96} L${hx + 0.5} ${hy - 124} L${hx + 6} ${hy - 96} L${hx + 0.5} ${hy - 88} Z`} fill={p.base} />
          <path d={`M${hx - 6} ${hy - 92} L${hx + 7} ${hy - 92}`} stroke={p.accent} strokeWidth="2.5" />
        </g>
      )
    case 'halberd':
      return (
        <g>
          <rect x={hx - 2} y={hy - 100} width="5" height="150" rx="2" fill="#3d2f22" />
          <path d={`M${hx - 4} ${hy - 96} L${hx + 0.5} ${hy - 122} L${hx + 5} ${hy - 96} Z`} fill={p.base} />
          <path d={`M${hx + 3} ${hy - 96} Q${hx + 28} ${hy - 90} ${hx + 20} ${hy - 68} Q${hx + 10} ${hy - 76} ${hx + 3} ${hy - 72} Z`} fill={p.base} />
          <path d={`M${hx - 3} ${hy - 92} Q${hx - 18} ${hy - 84} ${hx - 12} ${hy - 72}`} fill="none" stroke={p.accent} strokeWidth="3" />
        </g>
      )
    case 'twin-blades':
      return (
        <g>
          <g>
            <rect x={hx - 2} y={hy - 6} width="5" height="18" rx="2" fill="#2a2118" />
            <rect x={hx - 9} y={hy - 10} width="19" height="4" rx="2" fill={p.accent} />
            <path d={`M${hx - 3} ${hy - 10} L${hx + 4} ${hy - 10} L${hx + 2} ${hy - 56} L${hx + 0.5} ${hy - 62} L${hx - 1} ${hy - 56} Z`} fill={p.base} />
          </g>
          <g transform="translate(-72, 0) scale(-1,1) translate(-200,0)">
            <rect x={hx - 2} y={hy - 6} width="5" height="18" rx="2" fill="#2a2118" />
            <rect x={hx - 9} y={hy - 10} width="19" height="4" rx="2" fill={p.accent} />
            <path d={`M${hx - 3} ${hy - 10} L${hx + 4} ${hy - 10} L${hx + 2} ${hy - 56} L${hx + 0.5} ${hy - 62} L${hx - 1} ${hy - 56} Z`} fill={p.base} />
          </g>
        </g>
      )
    case 'ember-blade':
      return (
        <g>
          <rect x={hx - 3} y={hy - 10} width="7" height="26" rx="3" fill="#1a0f0c" />
          <rect x={hx - 16} y={hy - 14} width="33" height="6" rx="3" fill={p.base} />
          <path d={`M${hx - 7} ${hy - 14} L${hx + 8} ${hy - 14} L${hx + 5} ${hy - 100} L${hx + 0.5} ${hy - 112} L${hx - 4} ${hy - 100} Z`} fill="#1a0f0c" />
          <path d={`M${hx + 0.5} ${hy - 18} L${hx + 0.5} ${hy - 104}`} stroke={p.glow ?? p.accent} strokeWidth="3" strokeLinecap="round" />
          <path d={`M${hx - 3} ${hy - 30} L${hx + 4} ${hy - 44} M${hx - 3} ${hy - 60} L${hx + 4} ${hy - 74}`} stroke={p.accent} strokeWidth="1.6" opacity="0.85" />
        </g>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Back items
// ---------------------------------------------------------------------------

function BackArt({ art, p }: { art: string; p: Palette }) {
  switch (art) {
    case 'short-cloak':
      return <path d="M74 90 Q100 82 126 90 L132 136 Q100 128 68 136 Z" fill={p.base} opacity="0.95" />
    case 'tattered':
      return (
        <g>
          <path d="M72 90 Q100 80 128 90 L140 176 L128 160 L118 182 L108 158 L96 180 L84 156 L72 174 L60 176 Z" fill={p.base} opacity="0.95" />
          <path d="M100 86 L100 168" stroke={p.accent} strokeWidth="1.5" opacity="0.4" />
        </g>
      )
    case 'banner':
      return (
        <g>
          <path d="M72 90 Q100 80 128 90 L138 186 Q100 176 62 186 Z" fill={p.base} />
          <path d="M100 96 L100 180" stroke={p.accent} strokeWidth="3" opacity="0.85" />
          <path d="M86 120 L114 120 M90 140 L110 140" stroke={p.accent} strokeWidth="2.5" opacity="0.7" />
        </g>
      )
    case 'heavy-cape':
      return (
        <g>
          <path d="M66 88 Q100 76 134 88 L146 200 Q100 188 54 200 Z" fill={p.base} />
          <path d="M60 194 L140 194" stroke={p.accent} strokeWidth="5" opacity="0.9" />
          <path d="M100 88 L100 192" stroke={p.accent} strokeWidth="1.5" opacity="0.35" />
        </g>
      )
    case 'ember-cape':
      return (
        <g>
          <path d="M64 88 Q100 74 136 88 L150 204 Q100 190 50 204 Z" fill="#2a1410" />
          <path d="M50 200 Q100 186 150 200" fill="none" stroke={p.glow ?? p.accent} strokeWidth="4" />
          <path d="M76 120 L72 168 M100 112 L100 176 M124 120 L128 168" stroke={p.accent} strokeWidth="2" opacity="0.75" />
        </g>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Auras & companions
// ---------------------------------------------------------------------------

function AuraArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  const motes = [
    { x: 56, d: '0s' },
    { x: 78, d: '0.7s' },
    { x: 122, d: '1.3s' },
    { x: 146, d: '0.4s' },
    { x: 100, d: '1.8s' },
  ]
  switch (art) {
    case 'dust':
    case 'embers':
    case 'starfall':
      return (
        <g>
          {motes.map((m, i) => (
            <circle
              key={m.x}
              cx={m.x}
              cy={230 - i * 6}
              r={art === 'starfall' ? 2.6 : 2}
              fill={p.glow ?? p.accent}
              className={animate ? 'animate-ember' : undefined}
              style={animate ? { animationDelay: m.d } : { opacity: 0.7 }}
            />
          ))}
          <ellipse cx="100" cy="250" rx="52" ry="8" fill={p.glow ?? p.accent} opacity="0.12" />
        </g>
      )
    case 'smoke':
      return (
        <g opacity="0.35">
          <ellipse cx="100" cy="244" rx="60" ry="14" fill={p.accent} />
          <ellipse cx="72" cy="232" rx="22" ry="10" fill={p.accent} opacity="0.6" />
          <ellipse cx="130" cy="236" rx="26" ry="11" fill={p.accent} opacity="0.5" />
        </g>
      )
    case 'frost':
      return (
        <g>
          <ellipse cx="100" cy="250" rx="54" ry="9" fill={p.accent} opacity="0.18" />
          {[62, 84, 116, 138].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${238 - i * 4} l0 -12 M${x - 5} ${232 - i * 4} l10 0`}
              stroke={p.accent}
              strokeWidth="1.6"
              opacity="0.8"
            />
          ))}
        </g>
      )
    default:
      return <ellipse cx="100" cy="250" rx="44" ry="7" fill="#000" opacity="0.35" />
  }
}

function CompanionArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  switch (art) {
    case 'wisp':
      return (
        <g className={animate ? 'animate-pulse-slow' : undefined}>
          <circle cx="42" cy="180" r="9" fill={p.glow ?? p.accent} opacity="0.35" />
          <circle cx="42" cy="180" r="4.5" fill={p.glow ?? p.accent} />
        </g>
      )
    case 'raven':
      return (
        <g>
          <ellipse cx="40" cy="196" rx="12" ry="9" fill={p.base} />
          <circle cx="30" cy="190" r="6" fill={p.base} />
          <path d="M24 189 L17 191 L24 193 Z" fill={p.accent} />
          <circle cx="28.5" cy="188.5" r="1.4" fill={p.accent} />
          <path d="M42 190 Q56 182 58 196 Q48 194 42 200 Z" fill={p.accent} opacity="0.85" />
        </g>
      )
    case 'hound':
      return (
        <g>
          <ellipse cx="42" cy="226" rx="18" ry="10" fill={p.base} />
          <circle cx="26" cy="216" r="8" fill={p.base} />
          <path d="M20 210 L18 202 L26 208 Z" fill={p.base} />
          <path d="M30 210 L32 202 L36 209 Z" fill={p.base} />
          <circle cx="22" cy="216" r="1.6" fill={p.glow ?? p.accent} />
          <path d="M58 222 Q68 214 64 208" stroke={p.base} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M32 234 L32 244 M50 234 L50 244" stroke={p.base} strokeWidth="5" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------

const POSE_TRANSFORM: Record<string, string> = {
  ready: '',
  guard: 'rotate(-2 100 140)',
  rest: 'translate(0 4) rotate(1 100 140)',
  heroic: 'translate(0 -2) scale(1.03) translate(-3 -4)',
  raised: 'rotate(-4 100 150)',
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface WarriorProps {
  equipped: Partial<Record<Slot, string | null>>
  className?: string
  /** Suppresses the ambient animation regardless of motion preference. */
  still?: boolean
  title?: string
}

export function Warrior({ equipped, className, still, title }: WarriorProps) {
  const reduced = useReducedMotion()
  const animate = !reduced && !still
  const glowId = useId()

  const item = (slot: Slot) => (equipped[slot] ? ITEM_BY_ID[equipped[slot] as string] : undefined)
  const body = item('body')
  const head = item('head')
  const face = item('face')
  const hands = item('hands')
  const feet = item('feet')
  const weapon = item('weapon')
  const back = item('back')
  const aura = item('aura')
  const companion = item('companion')
  const pose = item('pose')

  const heavy = body?.art === 'heavy-plate' || body?.art === 'ember-plate'
  const label = [
    head?.name && head.art !== 'none' ? head.name : null,
    body?.name,
    weapon?.name && weapon.art !== 'none' ? `wielding ${weapon.name}` : 'bare-handed',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <svg
      viewBox="0 0 200 280"
      className={className}
      role="img"
      aria-label={title ?? `Your warrior: ${label}`}
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="rgba(249,115,22,0.18)" />
          <stop offset="100%" stopColor="rgba(249,115,22,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="280" fill={`url(#${glowId})`} />

      {aura && <AuraArt art={aura.art} p={paletteOf(aura, { base: '#666', accent: '#999' })} animate={animate} />}

      <g transform={POSE_TRANSFORM[pose?.art ?? 'ready'] || undefined}>
        {back && <BackArt art={back.art} p={paletteOf(back, { base: CLOTH, accent: '#666' })} />}
        <Body heavy={heavy} />
        {feet && <FeetArt art={feet.art} p={paletteOf(feet, { base: CLOTH, accent: '#777' })} />}
        {body && <BodyArt art={body.art} p={paletteOf(body, { base: CLOTH, accent: '#777' })} />}
        {head && head.art !== 'none' && <HeadArt art={head.art} p={paletteOf(head, { base: '#2b2b31', accent: '#888' })} />}
        <FaceArt art={face?.art ?? 'stoic'} p={paletteOf(face, { base: '#2b2b31', accent: '#888' })} />
        {hands && <HandsArt art={hands.art} p={paletteOf(hands, { base: CLOTH, accent: '#888' })} />}
        {weapon && weapon.art !== 'none' && (
          <WeaponArt art={weapon.art} p={paletteOf(weapon, { base: '#8a8a94', accent: '#c9c9d2' })} />
        )}
      </g>

      {companion && (
        <CompanionArt art={companion.art} p={paletteOf(companion, { base: '#3a3a44', accent: '#888' })} animate={animate} />
      )}
    </svg>
  )
}

/** Small isolated preview of a single item, used in inventory and pack reveals. */
export function ItemPreview({ item, className }: { item: CosmeticItem; className?: string }) {
  const base: Partial<Record<Slot, string | null>> = {
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
  return <Warrior equipped={{ ...base, [item.slot]: item.id }} className={className} still title={`Preview of ${item.name}`} />
}
