import { useId, type ReactNode } from 'react'
import { ITEM_BY_ID } from '@/data/items'
import { CLOTH, SKIN, SKIN_SHADE, paletteOf, type Palette } from '@/character/palette'
import type { CosmeticItem, Figure, Slot } from '@/types'
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

// Skin, cloth and the palette helper live in `palette.ts` so this renderer and
// the rigged one in `Fighter.tsx` cannot drift apart. A character that looks
// like a different person once it starts fighting is not your character.

// ---------------------------------------------------------------------------
// Base body
// ---------------------------------------------------------------------------

/**
 * The bare body, sized by `build` (0 → 1, from level).
 *
 * The character is a record of training, so it puts on muscle as you level —
 * and level comes only from logged sessions, never from anything bought.
 *
 * Where the mass goes is constrained by the armour drawn on top of it. Torso
 * armour paths span x 76–124 (or 70–130 for the plate variants), so the torso
 * outline can only grow to meet them and no further, or bare skin shows
 * through at the shoulders. The growth people actually read as muscle —
 * deltoid caps, arm and leg thickness, trapezius, a narrower waist — sits
 * outside those paths and is free to move.
 */
function Body({
  heavy,
  build,
  frame,
  legsOnly,
  upperOnly,
}: {
  heavy: boolean
  build: number
  frame: Figure
  /** Everything below the hips, which stays planted. */
  legsOnly?: boolean
  /** Everything above them, which breathes. */
  upperOnly?: boolean
}) {
  const b = Math.min(1, Math.max(0, build))
  const fem = frame === 'feminine'

  /**
   * The two frames differ in proportion, never in how much training shows.
   *
   * Every `b` coefficient below is identical across both — a feminine figure
   * at level 30 has gained exactly as much deltoid, arm, back and leg as a
   * masculine one, off the same curve. Only the starting proportions move:
   * narrower shoulders, a shorter waist, a wider hip. Scaling the growth down
   * for one of them would quietly tell half the users their training counts
   * for less, which is both untrue and the opposite of the point.
   */
  const shoulder = (fem ? (heavy ? 23 : 20) : heavy ? 24 : 21) + b * 3
  /**
   * Deltoid caps are drawn proud of the torso edge, and the torso edge is
   * where the armour is. Narrowing the feminine shoulder without widening the
   * cap to compensate hid the delts behind the breastplate entirely — the
   * figure gained a level and nothing on screen changed. The cap base is
   * nudged up so both frames show the same amount of shoulder outside the
   * armour at the same build.
   */
  const delt = (fem ? 6.3 : 6.5) + b * 6
  const upperArm = (fem ? 9.4 : 10) + b * 5
  const foreArm = (fem ? 8 : 8.5) + b * 3.5
  const thigh = (fem ? 12.8 : 12.5) + b * 4
  const calf = (fem ? 10.2 : 10.5) + b * 3
  const waist = (fem ? 13.5 : 16) - b * 2.5 // half-width at the navel
  const trap = b * 7 // how far the neck line flares out to the shoulders
  const hip = fem ? 21 : 18 // half-width at the widest point of the pelvis
  const neckW = (fem ? 10 : 12) + b * 2
  const headRx = fem ? 17.6 : 19
  /** Where the waist pinches, as a fraction down the torso. Higher on a
      feminine frame, which is most of what reads as the shape. */
  const waistY = fem ? 116 : 120

  const leftShoulderX = 100 - shoulder + 2
  const rightShoulderX = 100 + shoulder - 2

  const legs = (
    <>
      {/* legs */}
      <path d="M90 148 L87 196" stroke={SKIN} strokeWidth={thigh} strokeLinecap="round" fill="none" />
      <path d="M87 196 L85 238" stroke={SKIN} strokeWidth={calf} strokeLinecap="round" fill="none" />
      <path d="M110 148 L113 196" stroke={SKIN} strokeWidth={thigh} strokeLinecap="round" fill="none" />
      <path d="M113 196 L115 238" stroke={SKIN} strokeWidth={calf} strokeLinecap="round" fill="none" />
      {/* hips — a straight block on one frame, flared on the other */}
      <path
        d={
          fem
            ? `M${100 - hip + 4} 136 Q${100 - hip} 146 ${100 - hip + 5} 157 L${100 + hip - 5} 157 Q${100 + hip} 146 ${100 + hip - 4} 136 Z`
            : 'M82 138 L118 138 L116 156 L84 156 Z'
        }
        fill={SKIN_SHADE}
      />
    </>
  )
  if (legsOnly) return <g>{legs}</g>

  return (
    <g>
      {!upperOnly && legs}
      {/* torso — shoulders out to the armour, waist drawn in */}
      <path
        d={`M${100 - shoulder} 88 Q100 82 ${100 + shoulder} 88 L${100 + waist} ${waistY} L${100 + hip - 4} 144 L${100 - hip + 4} 144 L${100 - waist} ${waistY} Z`}
        fill={SKIN}
      />
      {/* Bust, on the feminine frame only. Drawn in the shade tone rather than
          as an outline so it reads as form under whatever is worn over it. */}
      {fem && (
        <path
          d="M88 96 Q84 106 91 109 Q97 110 98 100 Q101 110 109 109 Q116 106 112 96 Z"
          fill={SKIN_SHADE}
          opacity="0.75"
        />
      )}
      {/* trapezius: a filled wedge from the neck out to each shoulder */}
      {trap > 0.5 && (
        <path
          d={`M94 78 L${100 - shoulder + 3} ${88 + 2} L100 92 L${100 + shoulder - 3} ${88 + 2} L106 78 Z`}
          fill={SKIN_SHADE}
          opacity={0.55 + b * 0.35}
        />
      )}
      {/* arms */}
      <path
        d={`M${leftShoulderX} 92 L72 122`}
        stroke={SKIN}
        strokeWidth={upperArm}
        strokeLinecap="round"
        fill="none"
      />
      <path d="M72 122 L67 150" stroke={SKIN} strokeWidth={foreArm} strokeLinecap="round" fill="none" />
      <path
        d={`M${rightShoulderX} 92 L128 122`}
        stroke={SKIN}
        strokeWidth={upperArm}
        strokeLinecap="round"
        fill="none"
      />
      <path d="M128 122 L133 150" stroke={SKIN} strokeWidth={foreArm} strokeLinecap="round" fill="none" />
      {/* deltoid caps, drawn last so they sit proud of the torso edge */}
      <ellipse cx={leftShoulderX - 1} cy={92} rx={delt} ry={delt * 0.86} fill={SKIN} />
      <ellipse cx={rightShoulderX + 1} cy={92} rx={delt} ry={delt * 0.86} fill={SKIN} />
      {/* neck + head */}
      <rect x={100 - neckW / 2} y="74" width={neckW} height="12" fill={SKIN_SHADE} rx="3" />
      <ellipse cx="100" cy="58" rx={headRx} ry="21" fill={SKIN} />
    </g>
  )
}

const HAIR = '#322530'
const HAIR_LIT = '#41303c'

/**
 * Hair that belongs to the figure rather than to a head slot.
 *
 * Two layers, and it needs both. The fall goes behind everything so a helmet
 * sits over it rather than fighting it; the crown goes on top of the skull,
 * under any headgear. The first attempt drew only the back layer, and because
 * the head ellipse covers the middle of it, all that reached the screen was
 * two dark slabs floating either side of the face — it read as ears, not hair.
 *
 * The fall sways on the same idle clock as cloaks and tails.
 */
function FrameHair({
  frame,
  layer,
  animate,
}: {
  frame: Figure
  layer: 'behind' | 'crown'
  animate: boolean
}) {
  if (frame !== 'feminine') return null

  if (layer === 'crown') {
    // A crescent hugging the top of the skull (cx 100, cy 58, rx 17.6, ry 21),
    // so the hairline frames the temples instead of cutting across the eyes.
    return (
      <g className="warrior-hair">
        <path
          d="M82.6 60 C82.6 42 90 36.5 100 36.5 C110 36.5 117.4 42 117.4 60 C115.5 48.5 109 44.5 100 44.5 C91 44.5 84.5 48.5 82.6 60 Z"
          fill={HAIR_LIT}
        />
      </g>
    )
  }

  return (
    <g className={animate ? 'warrior-hair anim-sway' : 'warrior-hair'}>
      {/* One connected mass. Solid rather than hollow because the head, neck
          and torso all draw over the middle of it anyway. */}
      <path
        d="M100 26 C76 26 69.5 48 70.5 72 C71.3 92 74.5 108 77.5 120 L84 124 L92 120 C89 106 87.5 92 87.5 74 L112.5 74 C112.5 92 111 106 108 120 L116 124 L122.5 120 C125.5 108 128.7 92 129.5 72 C130.5 48 124 26 100 26 Z"
        fill={HAIR}
      />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Body armour
// ---------------------------------------------------------------------------

function BodyArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  const torso = 'M76 88 Q100 80 124 88 L118 146 L82 146 Z'
  const wide = 'M70 88 Q100 78 130 88 L120 148 L80 148 Z'

  switch (art) {
    case 'shinobi':
      return (
        <g>
          <path d={torso} fill={p.base} />
          {/* Cross-wrapped straps and a wide obi — read as bound, not buckled. */}
          <path d="M80 92 L120 126" stroke={p.accent} strokeWidth="3.5" opacity="0.85" />
          <path d="M120 92 L80 126" stroke={p.accent} strokeWidth="3.5" opacity="0.85" />
          <rect x="79" y="128" width="42" height="12" rx="2" fill={p.accent} opacity="0.95" />
          <rect x="96" y="126" width="8" height="16" rx="1.5" fill={p.base} />
          {[100, 110, 120].map((y) => (
            <path key={y} d={`M82 ${y} L118 ${y}`} stroke={p.base} strokeWidth="1" opacity="0.5" />
          ))}
        </g>
      )
    case 'haori':
      return (
        <g>
          {/* Open at the front, so the sleeves are the silhouette. */}
          <path d="M74 88 Q86 82 92 88 L94 150 L78 154 Z" fill={p.base} />
          <path d="M126 88 Q114 82 108 88 L106 150 L122 154 Z" fill={p.base} />
          <path d="M92 88 L108 88 L106 140 L94 140 Z" fill={p.base} opacity="0.35" />
          <g className={animate ? 'anim-sway' : undefined}>
            <path d="M74 92 L66 140 L80 146 L82 96 Z" fill={p.base} opacity="0.9" />
          </g>
          <g className={animate ? 'anim-sway' : undefined}>
            <path d="M126 92 L134 140 L120 146 L118 96 Z" fill={p.base} opacity="0.9" />
          </g>
          {/* Petal print, which is the whole reason it is a sakura haori. */}
          {[[82, 104], [116, 116], [86, 132], [112, 96]].map(([x, y]) => (
            <g key={`${x}-${y}`} opacity="0.85">
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx={x + Math.sin((a * Math.PI) / 180) * 3.2}
                  cy={y - Math.cos((a * Math.PI) / 180) * 3.2}
                  rx="2"
                  ry="2.8"
                  fill={p.accent}
                  transform={`rotate(${a} ${x} ${y})`}
                />
              ))}
            </g>
          ))}
        </g>
      )
    case 'mecha':
      return (
        <g>
          <path d={wide} fill={p.base} />
          <path d="M70 88 L130 88 L128 100 L72 100 Z" fill={p.accent} opacity="0.85" />
          {/* Panel seams and a reactor core that never quite settles. */}
          <path d="M78 108 L122 108 M78 126 L122 126" stroke="#0b0b12" strokeWidth="2" opacity="0.7" />
          <path d="M100 88 L100 148" stroke="#0b0b12" strokeWidth="2" opacity="0.5" />
          <g className={animate ? 'anim-glow' : undefined}>
            <circle cx="100" cy="117" r="9" fill={p.glow ?? p.accent} opacity="0.7" />
            <circle cx="100" cy="117" r="4.5" fill="#f8fafc" />
          </g>
          <ellipse cx="72" cy="94" rx="12" ry="9" fill={p.accent} />
          <ellipse cx="128" cy="94" rx="12" ry="9" fill={p.accent} />
          <path d="M82 148 L118 148 L114 160 L86 160 Z" fill={p.base} />
        </g>
      )
    case 'celestial':
      return (
        <g>
          <path d="M74 88 Q100 78 126 88 L124 152 Q100 162 76 152 Z" fill={p.base} />
          <g className={animate ? 'anim-glow' : undefined}>
            <path d="M74 88 Q100 78 126 88 L124 152 Q100 162 76 152 Z" fill={p.glow ?? p.accent} opacity="0.28" />
          </g>
          {/* Constellation, drawn once and left alone. */}
          {[[86, 100], [96, 112], [110, 104], [118, 122], [92, 132], [106, 142]].map(([x, y], i, all) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} fill="#f8fafc" />
              {i > 0 && (
                <path
                  d={`M${all[i - 1][0]} ${all[i - 1][1]} L${x} ${y}`}
                  stroke={p.accent}
                  strokeWidth="0.9"
                  opacity="0.55"
                />
              )}
            </g>
          ))}
          <rect x="78" y="136" width="44" height="7" rx="2" fill={p.accent} opacity="0.8" />
        </g>
      )
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

function HeadArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  switch (art) {
    case 'spiked':
      return (
        <g>
          <path d="M81 52 Q100 30 119 52 L114 44 L108 56 L100 38 L92 56 L86 44 Z" fill={p.base} />
          {[[84, 44, 74, 20], [92, 38, 88, 12], [100, 34, 104, 8], [110, 40, 118, 16], [116, 48, 128, 28]].map(
            ([x1, y1, x2, y2]) => (
              <path
                key={`${x1}-${y1}`}
                d={`M${x1} ${y1} L${x2} ${y2} L${x1 + 7} ${y1 - 3} Z`}
                fill={p.base}
              />
            ),
          )}
          <path d="M84 46 Q100 34 116 46" stroke={p.accent} strokeWidth="1.6" fill="none" opacity="0.7" />
        </g>
      )
    case 'ponytail':
      return (
        <g>
          {/* Drawn behind the head, and it lags — hair that holds still is
              the single most doll-like thing a character can do. */}
          <g className={animate ? 'anim-sway-wide' : undefined}>
            <path
              d="M99 38 Q74 56 68 96 Q62 128 78 148 Q70 118 80 88 Q88 60 106 44 Z"
              fill={p.base}
            />
            <path d="M97 44 Q76 62 72 96 Q68 122 78 140" stroke={p.accent} strokeWidth="2.2" fill="none" opacity="0.5" />
          </g>
          <path d="M81 50 Q100 32 119 50 L118 44 Q100 36 82 44 Z" fill={p.base} />
          <ellipse cx="98" cy="41" rx="6" ry="4" fill={p.accent} />
        </g>
      )
    case 'kabuto':
      return (
        <g>
          <path d="M78 52 Q100 30 122 52 L122 60 L78 60 Z" fill={p.base} />
          {/* Maedate — the crescent on the brow. */}
          <path d="M88 34 Q100 22 112 34 Q100 30 88 34 Z" fill={p.accent} />
          <path d="M100 24 L100 40" stroke={p.accent} strokeWidth="2.5" />
          {/* Shikoro: the layered neck guard flaring out at the sides. */}
          {[62, 70, 78].map((y, i) => (
            <path
              key={y}
              d={`M${76 - i * 3} ${y} L${124 + i * 3} ${y} L${122 + i * 3} ${y + 7} L${78 - i * 3} ${y + 7} Z`}
              fill={i % 2 ? p.accent : p.base}
              opacity={0.95 - i * 0.1}
            />
          ))}
        </g>
      )
    case 'halo':
      return (
        <g className={animate ? 'anim-glow' : undefined}>
          <ellipse cx="100" cy="28" rx="21" ry="6" fill="none" stroke={p.glow ?? p.accent} strokeWidth="3" />
          <ellipse cx="100" cy="28" rx="15" ry="4" fill="none" stroke={p.accent} strokeWidth="1.2" opacity="0.6" />
        </g>
      )
  }
  return <LegacyHeadArt art={art} p={p} />
}

function LegacyHeadArt({ art, p }: { art: string; p: Palette }) {
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

function FaceArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  /*
   * Eyes blink.
   *
   * Each eye is its own group so it can be squashed vertically about its own
   * centre — one shared group would pivot both about the midpoint of the face
   * and they would slide toward the nose as they closed.
   */
  const eyes = (fill: string) => (
    <>
      <g className={animate ? 'anim-blink' : undefined}>
        <ellipse cx="92" cy="58" rx="3" ry="2.4" fill={fill} />
      </g>
      <g className={animate ? 'anim-blink' : undefined}>
        <ellipse cx="108" cy="58" rx="3" ry="2.4" fill={fill} />
      </g>
    </>
  )
  switch (art) {
    case 'oni':
      return (
        <g>
          <path d="M79 44 Q100 36 121 44 L118 74 Q100 82 82 74 Z" fill={p.base} />
          <path d="M84 40 q-7 -12 1 -18 q5 8 4 17 Z" fill={p.accent} />
          <path d="M116 40 q7 -12 -1 -18 q-5 8 -4 17 Z" fill={p.accent} />
          <path d="M85 54 L96 58 M115 54 L104 58" stroke="#120a0a" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="92" cy="60" rx="3.4" ry="2.2" fill={p.accent} />
          <ellipse cx="108" cy="60" rx="3.4" ry="2.2" fill={p.accent} />
          {/* Bared teeth: the detail that makes it a demon rather than a mask. */}
          <path d="M88 68 L112 68 L110 74 L90 74 Z" fill="#f3ece2" />
          {[93, 100, 107].map((x) => (
            <path key={x} d={`M${x} 68 L${x} 74`} stroke={p.base} strokeWidth="1.2" />
          ))}
        </g>
      )
    case 'kitsune':
      return (
        <g>
          <path d="M80 44 Q100 38 120 44 Q120 66 100 80 Q80 66 80 44 Z" fill="#f3ece2" />
          <path d="M84 48 Q92 44 98 48" stroke={p.base} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M116 48 Q108 44 102 48" stroke={p.base} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <ellipse cx="92" cy="57" rx="3.6" ry="2.6" fill={p.base} />
          <ellipse cx="108" cy="57" rx="3.6" ry="2.6" fill={p.base} />
          <path d="M94 68 Q100 72 106 68" stroke={p.base} strokeWidth="1.8" fill="none" />
          <path d="M86 72 L94 72 M106 72 L114 72" stroke={p.base} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )
    case 'hollow':
      return (
        <g>
          <ellipse cx="100" cy="58" rx="20" ry="22" fill="#0b0b0f" opacity="0.72" />
          <g className={animate ? 'anim-glow' : undefined}>
            <ellipse cx="92" cy="57" rx="4.2" ry="3" fill={p.glow ?? p.accent} />
            <ellipse cx="108" cy="57" rx="4.2" ry="3" fill={p.glow ?? p.accent} />
          </g>
          <path d="M100 40 L100 78" stroke={p.accent} strokeWidth="1" opacity="0.35" />
          <path d="M88 46 L112 46" stroke={p.accent} strokeWidth="1" opacity="0.25" />
        </g>
      )
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

function HandsArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  switch (art) {
    case 'claws':
      return (
        <g>
          {[
            [67, 150, -1],
            [133, 150, 1],
          ].map(([x, y, dir]) => (
            <g key={x}>
              <rect x={x - 7} y={y - 12} width="14" height="18" rx="3" fill={p.base} />
              {[-5, -1, 3, 7].map((o) => (
                <path
                  key={o}
                  d={`M${x + o * dir} ${y + 4} L${x + o * dir + dir * 2} ${y + 17}`}
                  stroke={p.accent}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}
        </g>
      )
    case 'spirit-cuffs':
      return (
        <g className={animate ? 'anim-glow' : undefined}>
          {[67, 133].map((x) => (
            <g key={x}>
              <rect x={x - 8} y="138" width="16" height="9" rx="4" fill={p.base} />
              <circle cx={x} cy="154" r="6" fill={p.glow ?? p.accent} opacity="0.55" />
              <circle cx={x} cy="154" r="2.6" fill="#f8fafc" />
            </g>
          ))}
        </g>
      )
  }
  return <LegacyHandsArt art={art} p={p} />
}

function LegacyHandsArt({ art, p }: { art: string; p: Palette }) {
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

function FeetArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  switch (art) {
    case 'tabi':
      return (
        <g>
          {[85, 115].map((x) => (
            <g key={x}>
              <rect x={x - 8} y="212" width="16" height="22" rx="3" fill={p.base} />
              <path d={`M${x - 9} 234 L${x + 10} 234 L${x + 12} 244 L${x - 9} 244 Z`} fill={p.base} />
              {/* The split toe, which is the entire tell. */}
              <path d={`M${x + 4} 236 L${x + 4} 244`} stroke={p.accent} strokeWidth="1.4" />
              <path d={`M${x - 8} 226 L${x + 8} 226`} stroke={p.accent} strokeWidth="2" opacity="0.8" />
            </g>
          ))}
        </g>
      )
    case 'stormstep':
      return (
        <g>
          {[85, 115].map((x) => (
            <g key={x}>
              <rect x={x - 9} y="206" width="18" height="30" rx="4" fill={p.base} />
              <path d={`M${x - 10} 236 L${x + 11} 236 L${x + 13} 246 L${x - 10} 246 Z`} fill={p.base} />
              <path d={`M${x - 8} 214 L${x + 8} 214 M${x - 8} 224 L${x + 8} 224`} stroke={p.accent} strokeWidth="2" />
              <g className={animate ? 'anim-flicker' : undefined}>
                <path
                  d={`M${x - 6} 246 L${x - 1} 252 L${x - 4} 252 L${x + 2} 260`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            </g>
          ))}
        </g>
      )
  }
  return <LegacyFeetArt art={art} p={p} />
}

function LegacyFeetArt({ art, p }: { art: string; p: Palette }) {
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

function WeaponArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  switch (art) {
    case 'katana':
      return (
        <g>
          {/* Curved, single-edged, and the curve is the whole silhouette. */}
          <path d="M136 148 Q150 106 158 60" stroke={p.base} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M136 148 Q149 107 156 62" stroke={p.accent} strokeWidth="1.6" fill="none" />
          <rect x="130" y="146" width="14" height="4" rx="2" fill="#c9a227" transform="rotate(-16 137 148)" />
          <path d="M132 150 L128 168" stroke="#3a2c24" strokeWidth="5" strokeLinecap="round" />
          {[154, 160, 166].map((y) => (
            <path key={y} d={`M${131 - (y - 154) * 0.22} ${y} l4 -1.4`} stroke="#8a6a3a" strokeWidth="1.2" />
          ))}
        </g>
      )
    case 'nodachi':
      return (
        <g>
          <path d="M134 172 Q152 108 164 26" stroke={p.base} strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M134 172 Q151 109 162 30" stroke={p.accent} strokeWidth="2.2" fill="none" />
          <rect x="126" y="168" width="18" height="5" rx="2.5" fill={p.accent} transform="rotate(-14 135 170)" />
          <path d="M131 174 L124 198" stroke="#3a2c24" strokeWidth="6" strokeLinecap="round" />
          <circle cx="123" cy="200" r="3.5" fill={p.accent} />
        </g>
      )
    case 'kusarigama':
      return (
        <g>
          {/* Sickle in the hand, chain hanging, weight swinging at the end. */}
          <path d="M133 150 L131 176" stroke="#3a2c24" strokeWidth="5" strokeLinecap="round" />
          <path d="M133 150 Q150 142 152 124 Q146 138 133 142 Z" fill={p.base} />
          <path d="M133 148 Q148 141 151 127" stroke={p.accent} strokeWidth="1.4" fill="none" />
          <g className={animate ? 'anim-sway-wide' : undefined}>
            <path
              d="M131 176 Q142 196 136 214"
              stroke={p.accent}
              strokeWidth="1.6"
              fill="none"
              strokeDasharray="3 3"
            />
            <circle cx="136" cy="218" r="5" fill={p.base} />
            <circle cx="136" cy="218" r="2" fill={p.accent} />
          </g>
        </g>
      )
    case 'spirit-blade':
      return (
        <g>
          <g className={animate ? 'anim-glow' : undefined}>
            <path d="M136 150 L150 54" stroke={p.glow ?? p.accent} strokeWidth="14" opacity="0.22" strokeLinecap="round" />
          </g>
          <path d="M136 150 L149 58 L156 62 L142 152 Z" fill={p.base} opacity="0.9" />
          <path d="M139 148 L150 62" stroke="#f0fdfa" strokeWidth="1.6" opacity="0.9" />
          <rect x="130" y="148" width="16" height="4.5" rx="2" fill={p.accent} transform="rotate(-9 138 150)" />
          <path d="M134 152 L131 170" stroke="#243b3a" strokeWidth="5" strokeLinecap="round" />
        </g>
      )
    case 'null-blade':
      return (
        <g>
          {/* A secret should look like an absence. This is a blade-shaped hole
              with only an edge highlight to prove it is there at all. */}
          <path d="M136 150 L146 56 L154 60 L143 152 Z" fill="#05050a" />
          <path d="M146 56 L154 60" stroke="#f8fafc" strokeWidth="1.2" opacity="0.85" />
          <path d="M136 150 L146 56" stroke="#f8fafc" strokeWidth="0.8" opacity="0.55" />
          <g className={animate ? 'anim-flicker' : undefined}>
            <path d="M143 152 L154 60" stroke="#f8fafc" strokeWidth="0.7" opacity="0.5" />
          </g>
          <rect x="130" y="148" width="15" height="4" rx="2" fill="#1a1a22" transform="rotate(-8 137 150)" />
          <path d="M134 152 L131 170" stroke="#0b0b0f" strokeWidth="5" strokeLinecap="round" />
        </g>
      )
  }
  return <LegacyWeaponArt art={art} p={p} />
}

function LegacyWeaponArt({ art, p }: { art: string; p: Palette }) {
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

function BackArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
  switch (art) {
    case 'scarf':
      return (
        <g>
          <path d="M86 82 Q100 76 114 82 L112 94 Q100 88 88 94 Z" fill={p.base} />
          {/* Twice your height and permanently caught in a wind nobody else
              feels. Two tails at different rates so it never looks rigid. */}
          <g className={animate ? 'anim-sway-wide' : undefined}>
            <path d="M88 90 Q62 108 52 148 Q46 178 56 198 Q52 168 64 142 Q76 112 94 96 Z" fill={p.base} />
            <path d="M88 92 Q66 110 58 146" stroke={p.accent} strokeWidth="1.4" fill="none" opacity="0.55" />
          </g>
          <g className={animate ? 'anim-sway' : undefined}>
            <path d="M110 90 Q132 106 138 138 Q142 160 134 174 Q138 148 128 128 Q118 108 106 96 Z" fill={p.base} opacity="0.85" />
          </g>
        </g>
      )
    case 'wings':
      return (
        <g className={animate ? 'anim-sway' : undefined}>
          {[-1, 1].map((dir) => (
            <g key={dir}>
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={i}
                  d={`M100 92 Q${100 + dir * (30 + i * 12)} ${86 + i * 10} ${100 + dir * (26 + i * 16)} ${124 + i * 16}
                      Q${100 + dir * (18 + i * 8)} ${110 + i * 10} 100 96 Z`}
                  fill={i % 2 ? p.accent : p.base}
                  opacity={0.9 - i * 0.13}
                />
              ))}
            </g>
          ))}
        </g>
      )
    case 'tails':
      return (
        <g>
          {[-34, -18, 0, 18, 34].map((spread, i) => (
            <g
              key={spread}
              className={animate ? 'anim-sway-wide' : undefined}
              style={animate ? { animationDelay: `${i * 0.34}s`, animationDuration: `${2.6 + i * 0.35}s` } : undefined}
            >
              {/* They HANG. The first version splayed them horizontally at hip
                  height and the whole set read as a second pair of arms. */}
              <path
                d={`M100 138 Q${100 + spread * 0.9} ${172} ${100 + spread * 1.15} ${222 - Math.abs(spread) * 0.5}
                    Q${100 + spread * 0.55} ${180} 100 146 Z`}
                fill={p.base}
              />
              <path
                d={`M${100 + spread * 1.1} ${214 - Math.abs(spread) * 0.5} q${spread * 0.12} 10 ${spread * 0.01} 14
                    q${-spread * 0.2} -5 ${-spread * 0.16} -12 Z`}
                fill="#f8fafc"
                opacity="0.9"
              />
            </g>
          ))}
        </g>
      )
    case 'starcloak':
      return (
        <g>
          <path d="M80 84 Q100 76 120 84 L134 206 Q100 220 66 206 Z" fill={p.base} />
          <g className={animate ? 'anim-glow' : undefined}>
            <path d="M80 84 Q100 76 120 84 L134 206 Q100 220 66 206 Z" fill={p.glow ?? p.accent} opacity="0.18" />
          </g>
          {[[78, 108], [92, 126], [112, 116], [122, 150], [86, 168], [106, 186], [126, 178], [72, 190]].map(
            ([x, y], i) => (
              <g
                key={`${x}-${y}`}
                className={animate ? 'anim-glow' : undefined}
                style={animate ? { animationDelay: `${i * 0.4}s` } : undefined}
              >
                <circle cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.3} fill="#f8fafc" />
              </g>
            ),
          )}
        </g>
      )
  }
  return <LegacyBackArt art={art} p={p} />
}

function LegacyBackArt({ art, p }: { art: string; p: Palette }) {
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
  switch (art) {
    case 'sakura':
      return (
        <g>
          {Array.from({ length: 11 }, (_, i) => {
            const x = 24 + ((i * 37) % 156)
            return (
              <g
                key={i}
                className={animate ? 'anim-petal' : undefined}
                style={animate ? { animationDelay: `${(i * 0.47) % 5.2}s` } : undefined}
              >
                <ellipse cx={x} cy={40 + (i % 4) * 22} rx="3.4" ry="2.2" fill={p.accent} opacity="0.9" />
              </g>
            )
          })}
        </g>
      )
    case 'lightning':
      return (
        <g>
          {[[46, 96], [154, 108], [58, 176], [148, 168]].map(([x, y], i) => (
            <g
              key={`${x}-${y}`}
              className={animate ? 'anim-flicker' : undefined}
              style={animate ? { animationDelay: `${i * 0.53}s` } : undefined}
            >
              <path
                d={`M${x} ${y} l7 12 l-5 1 l8 15 l-13 -14 l5 -1 Z`}
                fill={p.glow ?? p.accent}
              />
            </g>
          ))}
          <g className={animate ? 'anim-glow' : undefined}>
            <ellipse cx="100" cy="150" rx="66" ry="86" fill={p.glow ?? p.accent} opacity="0.08" />
          </g>
        </g>
      )
    case 'voidbloom':
      return (
        <g>
          <g className={animate ? 'anim-glow' : undefined}>
            <ellipse cx="100" cy="150" rx="60" ry="80" fill={p.glow ?? p.accent} opacity="0.12" />
          </g>
          {Array.from({ length: 9 }, (_, i) => {
            const x = 34 + ((i * 43) % 132)
            return (
              <g
                key={i}
                className={animate ? 'anim-rise' : undefined}
                style={animate ? { animationDelay: `${(i * 0.38) % 3.4}s` } : undefined}
              >
                {/* Falls upward, which is the tell that it is not petals. */}
                <ellipse cx={x} cy={210} rx="2.8" ry="4" fill={p.accent} opacity="0.85" />
              </g>
            )
          })}
        </g>
      )
  }
  return <LegacyAuraArt art={art} p={p} animate={animate} />
}

function LegacyAuraArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
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
    case 'fox':
      return (
        <g className={animate ? 'anim-float' : undefined}>
          {/* Sits just out of reach, on the ground, watching. */}
          <ellipse cx="42" cy="238" rx="14" ry="5" fill="#000" opacity="0.35" />
          <path d="M32 236 Q34 220 44 218 Q54 220 54 234 L52 238 L34 238 Z" fill={p.base} />
          <path d="M40 220 l-4 -12 l9 5 Z" fill={p.base} />
          <path d="M50 220 l5 -11 l-1 10 Z" fill={p.base} />
          <ellipse cx="41" cy="228" rx="1.6" ry="2" fill="#0b0b0f" />
          <ellipse cx="49" cy="228" rx="1.6" ry="2" fill="#0b0b0f" />
          <path d="M45 232 l-2 2 l4 0 Z" fill="#0b0b0f" />
          {[0, 1, 2].map((i) => (
            <g
              key={i}
              className={animate ? 'anim-sway-wide' : undefined}
              style={animate ? { animationDelay: `${i * 0.4}s` } : undefined}
            >
              <path d={`M32 234 Q${18 - i * 5} ${228 - i * 8} ${14 - i * 6} ${212 - i * 10}`} stroke={p.base} strokeWidth="6" fill="none" strokeLinecap="round" />
              <circle cx={14 - i * 6} cy={212 - i * 10} r="3.4" fill="#f8fafc" />
            </g>
          ))}
        </g>
      )
    case 'phoenix':
      return (
        <g className={animate ? 'anim-float' : undefined}>
          <g className={animate ? 'anim-glow' : undefined}>
            <ellipse cx="158" cy="86" rx="26" ry="22" fill={p.glow ?? p.accent} opacity="0.2" />
          </g>
          <path d="M150 92 Q158 78 168 86 Q162 96 152 96 Z" fill={p.base} />
          <path d="M152 90 Q136 74 130 56 Q146 68 156 84 Z" fill={p.accent} opacity="0.95" />
          <path d="M164 88 Q178 76 184 60 Q172 76 166 86 Z" fill={p.accent} opacity="0.8" />
          <path d="M154 96 Q152 116 142 130 Q156 118 158 98 Z" fill={p.accent} opacity="0.7" />
          <circle cx="163" cy="86" r="1.6" fill="#0b0b0f" />
        </g>
      )
  }
  return <LegacyCompanionArt art={art} p={p} animate={animate} />
}

function LegacyCompanionArt({ art, p, animate }: { art: string; p: Palette; animate: boolean }) {
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
  sheathed: 'rotate(2 100 150) translate(-2 0)',
  ascend: 'translate(0 -6) scale(1.02)',
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
  /**
   * How much muscle the figure carries, 0 → 1. Derived from level via
   * `buildFromLevel`, so it only ever moves because sessions were logged.
   */
  build?: number
  /** Which figure to draw. Defaults to masculine for saves made before the choice existed. */
  frame?: Figure
}

export function Warrior({ equipped, className, still, title, build = 0, frame = 'masculine' }: WarriorProps) {
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

  const heavy = body?.art === 'heavy-plate' || body?.art === 'ember-plate' || body?.art === 'mecha'
  // Stagger the breath per instance so two warriors on one screen — the Forge
  // card and an inventory preview — do not inhale in lockstep.
  const breathDelay = -((glowId.replace(/\D/g, '').slice(-2) as unknown as number) % 40) / 10
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
        {back && <BackArt art={back.art} p={paletteOf(back, { base: CLOTH, accent: '#666' })} animate={animate} />}
        {/*
          Breathing.

          Everything from the hips up is inside one group that rises and falls
          about four seconds a cycle; the legs stay planted outside it. Moving
          the whole figure would read as bobbing, and moving nothing at all is
          what makes a character look like a paper doll however good the
          drawing is.

          The delay is derived from the component's own id so two warriors on
          the same screen — the Forge card and an inventory preview — are not
          inhaling in lockstep.
        */}
        <FrameHair frame={frame} layer="behind" animate={animate} />
        <Body heavy={heavy} build={build} frame={frame} legsOnly />
        {feet && <FeetArt art={feet.art} p={paletteOf(feet, { base: CLOTH, accent: '#777' })} animate={animate} />}
        <g
          className={animate ? 'anim-breathe' : undefined}
          style={animate ? { animationDelay: `${breathDelay}s` } : undefined}
        >
          <Body heavy={heavy} build={build} frame={frame} upperOnly />
          {body && <BodyArt art={body.art} p={paletteOf(body, { base: CLOTH, accent: '#777' })} animate={animate} />}
          <FrameHair frame={frame} layer="crown" animate={animate} />
          {head && head.art !== 'none' && (
            <HeadArt art={head.art} p={paletteOf(head, { base: '#2b2b31', accent: '#888' })} animate={animate} />
          )}
          <FaceArt art={face?.art ?? 'stoic'} p={paletteOf(face, { base: '#2b2b31', accent: '#888' })} animate={animate} />
          {hands && <HandsArt art={hands.art} p={paletteOf(hands, { base: CLOTH, accent: '#888' })} animate={animate} />}
          {weapon && weapon.art !== 'none' && (
            <WeaponArt art={weapon.art} p={paletteOf(weapon, { base: '#8a8a94', accent: '#c9c9d2' })} animate={animate} />
          )}
        </g>
      </g>

      {companion && (
        <CompanionArt art={companion.art} p={paletteOf(companion, { base: '#3a3a44', accent: '#888' })} animate={animate} />
      )}
    </svg>
  )
}

/** Small isolated preview of a single item, used in inventory and pack reveals. */
export function ItemPreview({
  item,
  className,
  frame = 'masculine',
}: {
  item: CosmeticItem
  className?: string
  frame?: Figure
}) {
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
  return (
    <Warrior
      equipped={{ ...base, [item.slot]: item.id }}
      className={className}
      frame={frame}
      still
      title={`Preview of ${item.name}`}
    />
  )
}
