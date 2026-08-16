import { useId, type ReactNode } from "react";
import { ITEM_BY_ID } from "@/data/items";
import {
  CLOTH,
  SKIN,
  SKIN_SHADE,
  paletteOf,
  type Palette,
} from "@/character/palette";
import type { CosmeticItem, Figure, Rarity, Slot } from "@/types";
import { useReducedMotion } from "@/components/ui";

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
/**
 * Where the joints are.
 *
 * Shared rather than recomputed, because the arms are drawn inside `Body` and
 * the gloves and weapon are drawn outside it, and a pose moves all three. If
 * the two ever disagreed about where a shoulder is, gear would swing about a
 * different point from the arm holding it.
 *
 * Elbows and wrists are fixed points: the drawing puts them there regardless
 * of build, and only the shoulder moves outward as the figure widens.
 */
export const JOINTS = {
  shoulderY: 92,
  elbow: { left: { x: 72, y: 122 }, right: { x: 128, y: 122 } },
  wrist: { left: { x: 67, y: 150 }, right: { x: 133, y: 150 } },
  /** The ground plane. Rotations anchor here so nobody hovers. */
  floorY: 252,
} as const;

function shoulderX(build: number, frame: Figure, heavy: boolean) {
  const b = Math.min(1, Math.max(0, build));
  const fem = frame === "feminine";
  const half = (fem ? (heavy ? 23 : 20) : heavy ? 24 : 21) + b * 3;
  return { left: 100 - half + 2, right: 100 + half - 2, half };
}

/** An arm that has not been posed. */
export const NEUTRAL_ARM = { shoulder: 0, elbow: 0 } as const;

/** One arm, as the two angles a shoulder and an elbow actually have. */
export interface ArmAngles {
  /** Degrees at the shoulder. Positive swings the LEFT arm away from the body. */
  shoulder: number;
  /** Degrees at the elbow, on top of the shoulder. */
  elbow: number;
}

/** The transform for one limb segment, plus the rotations that built it. */
function limb(rotations: { deg: number; x: number; y: number }[]) {
  const used = rotations.filter((r) => r.deg !== 0);
  return { forward: used.map((r) => `rotate(${r.deg} ${r.x} ${r.y})`).join(" "), rotations: used };
}

/** Where a point ends up after a chain of rotations, innermost last. */
function movedBy(
  point: { x: number; y: number },
  rotations: { deg: number; x: number; y: number }[],
) {
  let { x, y } = point;
  for (const r of [...rotations].reverse()) {
    const a = (r.deg * Math.PI) / 180;
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    const [dx, dy] = [x - r.x, y - r.y];
    x = dx * cos - dy * sin + r.x;
    y = dx * sin + dy * cos + r.y;
  }
  return { x, y };
}
/** Both segments of one arm, ready to hang geometry off. */
export function armTransforms(
  side: "left" | "right",
  build: number,
  frame: Figure,
  heavy: boolean,
  angles: ArmAngles | undefined,
) {
  const sx = shoulderX(build, frame, heavy)[side];
  const elbow = JOINTS.elbow[side];
  const shoulderRot = { deg: angles?.shoulder ?? 0, x: sx, y: JOINTS.shoulderY };
  const elbowRot = { deg: angles?.elbow ?? 0, x: elbow.x, y: elbow.y };
  return {
    upper: limb([shoulderRot]),
    lower: limb([shoulderRot, elbowRot]),
  };
}

function Body({
  heavy,
  build,
  frame,
  legsOnly,
  upperOnly,
  arms,
  head,
}: {
  heavy: boolean;
  build: number;
  frame: Figure;
  /** Everything below the hips, which stays planted. */
  legsOnly?: boolean;
  /** Everything above them, which breathes. */
  upperOnly?: boolean;
  /** Per-side arm angles from the equipped pose. */
  arms?: { left: ArmAngles; right: ArmAngles };
  /** Transform applied to the neck and skull, so the head can turn. */
  head?: string;
}) {
  const b = Math.min(1, Math.max(0, build));
  const fem = frame === "feminine";

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
  const { left: leftShoulderX, right: rightShoulderX, half: shoulder } =
    shoulderX(build, frame, heavy);
  /**
   * Deltoid caps are drawn proud of the torso edge, and the torso edge is
   * where the armour is. Narrowing the feminine shoulder without widening the
   * cap to compensate hid the delts behind the breastplate entirely — the
   * figure gained a level and nothing on screen changed. The cap base is
   * nudged up so both frames show the same amount of shoulder outside the
   * armour at the same build.
   */
  const delt = (fem ? 6.3 : 6.5) + b * 6;
  const upperArm = (fem ? 9.4 : 10) + b * 5;
  const foreArm = (fem ? 8 : 8.5) + b * 3.5;
  const thigh = (fem ? 12.8 : 12.5) + b * 4;
  const calf = (fem ? 10.2 : 10.5) + b * 3;
  const waist = (fem ? 12.5 : 16) - b * 2.5; // half-width at the navel
  const trap = b * 7; // how far the neck line flares out to the shoulders
  const hip = fem ? 22.5 : 18; // half-width at the widest point of the pelvis
  const neckW = (fem ? 10 : 12) + b * 2;
  const headRx = fem ? 17.6 : 19;
  /** Where the waist pinches, as a fraction down the torso. Higher on a
      feminine frame, which is most of what reads as the shape. */
  const waistY = fem ? 116 : 120;

  const leftArm = armTransforms("left", build, frame, heavy, arms?.left);
  const rightArm = armTransforms("right", build, frame, heavy, arms?.right);

  const legs = fem ? (
    <>
      {/*
        A wider pelvis puts the femurs further apart at the top and brings
        them back in at the knee, so the thighs angle rather than dropping
        straight. That inward line is most of what reads as a hip at this
        size — a wider block with vertical legs under it just looks padded.
      */}
      <path
        d="M88 150 L86.5 196"
        stroke={SKIN}
        strokeWidth={thigh}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M86.5 196 L85 238"
        stroke={SKIN}
        strokeWidth={calf}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M112 150 L113.5 196"
        stroke={SKIN}
        strokeWidth={thigh}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M113.5 196 L115 238"
        stroke={SKIN}
        strokeWidth={calf}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${100 - hip + 5} 134 C${100 - hip - 1} 142 ${100 - hip} 152 ${100 - hip + 6} 159 L${100 + hip - 6} 159 C${100 + hip} 152 ${100 + hip + 1} 142 ${100 + hip - 5} 134 Z`}
        fill={SKIN_SHADE}
      />
    </>
  ) : (
    <>
      {/* legs */}
      <path
        d="M90 148 L87 196"
        stroke={SKIN}
        strokeWidth={thigh}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M87 196 L85 238"
        stroke={SKIN}
        strokeWidth={calf}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M110 148 L113 196"
        stroke={SKIN}
        strokeWidth={thigh}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M113 196 L115 238"
        stroke={SKIN}
        strokeWidth={calf}
        strokeLinecap="round"
        fill="none"
      />
      {/* hips */}
      <path d="M82 138 L118 138 L116 156 L84 156 Z" fill={SKIN_SHADE} />
    </>
  );
  if (legsOnly) return <g>{legs}</g>;

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
      {/* arms — upper rotates at the shoulder, forearm at the elbow on top of it */}
      <path
        d={`M${leftShoulderX} 92 L72 122`}
        stroke={SKIN}
        strokeWidth={upperArm}
        strokeLinecap="round"
        fill="none"
        transform={leftArm.upper.forward || undefined}
      />
      <path
        d="M72 122 L67 150"
        stroke={SKIN}
        strokeWidth={foreArm}
        strokeLinecap="round"
        fill="none"
        transform={leftArm.lower.forward || undefined}
      />
      <path
        d={`M${rightShoulderX} 92 L128 122`}
        stroke={SKIN}
        strokeWidth={upperArm}
        strokeLinecap="round"
        fill="none"
        transform={rightArm.upper.forward || undefined}
      />
      <path
        d="M128 122 L133 150"
        stroke={SKIN}
        strokeWidth={foreArm}
        strokeLinecap="round"
        fill="none"
        transform={rightArm.lower.forward || undefined}
      />
      {/* deltoid caps, drawn last so they sit proud of the torso edge */}
      <ellipse
        cx={leftShoulderX - 1}
        cy={92}
        rx={delt}
        ry={delt * 0.86}
        fill={SKIN}
      />
      <ellipse
        cx={rightShoulderX + 1}
        cy={92}
        rx={delt}
        ry={delt * 0.86}
        fill={SKIN}
      />
      {/* neck + head, turning together with whatever is worn on them */}
      <g transform={head || undefined}>
        <rect
          x={100 - neckW / 2}
          y="74"
          width={neckW}
          height="12"
          fill={SKIN_SHADE}
          rx="3"
        />
        <ellipse cx="100" cy="58" rx={headRx} ry="21" fill={SKIN} />
      </g>
    </g>
  );
}

const HAIR = "#322530";
const HAIR_LIT = "#41303c";

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
  frame: Figure;
  layer: "behind" | "crown";
  animate: boolean;
}) {
  if (frame !== "feminine") return null;

  if (layer === "crown") {
    // A crescent hugging the top of the skull (cx 100, cy 58, rx 17.6, ry 21),
    // so the hairline frames the temples instead of cutting across the eyes.
    return (
      <g className="warrior-hair">
        <path
          d="M82.6 60 C82.6 42 90 36.5 100 36.5 C110 36.5 117.4 42 117.4 60 C115.5 48.5 109 44.5 100 44.5 C91 44.5 84.5 48.5 82.6 60 Z"
          fill={HAIR_LIT}
        />
      </g>
    );
  }

  return (
    <g className={animate ? "warrior-hair anim-sway" : "warrior-hair"}>
      {/* One connected mass. Solid rather than hollow because the head, neck
          and torso all draw over the middle of it anyway. */}
      <path
        d="M100 26 C76 26 69.5 48 70.5 72 C71.3 92 74.5 108 77.5 120 L84 124 L92 120 C89 106 87.5 92 87.5 74 L112.5 74 C112.5 92 111 106 108 120 L116 124 L122.5 120 C125.5 108 128.7 92 129.5 72 C130.5 48 124 26 100 26 Z"
        fill={HAIR}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Body armour
// ---------------------------------------------------------------------------

/**
 * The two torso silhouettes every piece of body armour is cut to.
 *
 * This is where the figure is actually decided. Reshaping the bare body under
 * the armour achieves nothing — the armour is drawn on top of it and the
 * armour is what you see. Eleven of the twelve body arts fill one of these two
 * paths, so cutting them differently per frame reshapes nearly the whole
 * wardrobe from one place instead of from twelve.
 *
 * The feminine cut is not "the same shape, narrower". It runs shoulder → bust
 * → a genuinely pinched waist → a flared hem, which is the waist-to-hip
 * difference that actually reads at this size. Straight taper with a smaller
 * number in front of it reads as a smaller man.
 */
const TORSO_PATH: Record<Figure, { torso: string; wide: string }> = {
  masculine: {
    torso: "M76 88 Q100 80 124 88 L118 146 L82 146 Z",
    wide: "M70 88 Q100 78 130 88 L120 148 L80 148 Z",
  },
  feminine: {
    torso:
      "M79 88 Q100 80 121 88 C123.5 95 123.5 101 121.5 106 C119 114 115 119 115 126 C115 134 117 140 120.5 146 L79.5 146 C83 140 85 134 85 126 C85 119 81 114 78.5 106 C76.5 101 76.5 95 79 88 Z",
    wide: "M73 88 Q100 78 127 88 C130 96 130 103 127 109 C122 117 117.5 121 117.5 128 C117.5 137 119 143 121 148 L79 148 C81 143 82.5 137 82.5 128 C82.5 121 78 117 73 109 C70 103 70 96 73 88 Z",
  },
};

/**
 * Chest shaping, drawn ON TOP of whatever is worn.
 *
 * Black and white at low opacity rather than a palette colour, so it works
 * over every one of the sixteen body items without being tinted per item —
 * it reads as light falling across a shaped breastplate, which is how flat
 * vector armour conveys form.
 */
function BustShading({ wide }: { wide?: boolean }) {
  const y = wide ? 2 : 0;
  return (
    <g aria-hidden className="bust-shading">
      <path
        d={`M84 ${99 + y} Q90.5 ${112 + y} 99 ${107 + y}`}
        fill="none"
        stroke="#000"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.22"
      />
      <path
        d={`M116 ${99 + y} Q109.5 ${112 + y} 101 ${107 + y}`}
        fill="none"
        stroke="#000"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.22"
      />
      <path
        d={`M86 ${96 + y} Q91 ${92 + y} 96 ${96 + y}`}
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.14"
      />
      <path
        d={`M114 ${96 + y} Q109 ${92 + y} 104 ${96 + y}`}
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.14"
      />
    </g>
  );
}

/**
 * Which arts are cut from the broad silhouette rather than the standard one.
 *
 * Kept beside `TORSO_PATH` because the clip below has to use the same shape
 * the art filled; a mismatch shows up as trim sliced off a pauldron. Guarded
 * by a test that renders every body item and checks nothing escapes its own
 * outline at the waist.
 */
const WIDE_BODY_ARTS = new Set([
  "mecha",
  "plate",
  "heavy-plate",
  "ember-plate",
  "obsidian-plate",
  "solar-plate",
]);

/** Exported so the wardrobe tests can render one piece of armour on its own —
 *  comparing whole warriors cannot tell you whether the ARMOUR responded to
 *  the frame, because the body underneath always does. */
export function BodyArt({
  art,
  p,
  animate,
  frame,
}: {
  art: string;
  p: Palette;
  animate: boolean;
  frame: Figure;
}) {
  const clipId = useId();
  const wideCut = WIDE_BODY_ARTS.has(art);

  if (frame !== "feminine") {
    return <BodyArtBase art={art} p={p} animate={animate} frame={frame} />;
  }

  /*
    Trim, belts and bands are drawn as full-width bars at fixed coordinates,
    tuned to a torso that goes straight down. Against a waist that comes in,
    they hang off the sides — the brigandine's belt ended in two red tabs
    floating in mid-air either side of the figure.

    Clipping only bites between the shoulders and the hem. Above y = 100 and
    below y = 146 the clip is the whole canvas, so pauldrons, collars, skirts
    and tassets that deliberately sit outside the torso are left alone. A
    clipPath with several children is their union, which is what makes that
    work in one shape.
  */
  const outline = wideCut
    ? TORSO_PATH.feminine.wide
    : TORSO_PATH.feminine.torso;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={outline} />
          <rect x="0" y="0" width="200" height="100" />
          <rect x="0" y={wideCut ? 148 : 146} width="200" height="132" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <BodyArtBase art={art} p={p} animate={animate} frame={frame} />
      </g>
      <BustShading wide={wideCut} />
    </g>
  );
}

function BodyArtBase({
  art,
  p,
  animate,
  frame,
}: {
  art: string;
  p: Palette;
  animate: boolean;
  frame: Figure;
}) {
  const { torso, wide } = TORSO_PATH[frame];
  // The celestial robe carries its own silhouette rather than one of the two
  // above, so it needs its own feminine cut or it is the only item in the
  // wardrobe that ignores the figure wearing it.
  const celestialRobe =
    frame === "feminine"
      ? "M77 88 Q100 78 123 88 C125 98 124 106 121 112 C117 119 115 125 115.5 132 L122 152 Q100 164 78 152 L84.5 132 C85 125 83 119 79 112 C76 106 75 98 77 88 Z"
      : "M74 88 Q100 78 126 88 L124 152 Q100 162 76 152 Z";

  switch (art) {
    /*
      Obsidian Warplate — legendary. Volcanic glass: the plate itself is almost
      black and faceted, and every joint between the facets is a lit seam. The
      seams pulse together, which is what makes it read as one piece of armour
      with something inside it rather than a set of glowing decals.
    */
    case "obsidian-plate":
      return (
        <g>
          <path d={wide} fill="#0c0b12" />
          <path d="M56 88 Q74 72 92 88 L88 108 L58 108 Z" fill={p.base} />
          <path d="M144 88 Q126 72 108 88 L112 108 L142 108 Z" fill={p.base} />
          <path d="M78 96 L100 86 L122 96 L118 130 L100 140 L82 130 Z" fill={p.base} />
          <path d="M100 86 L100 140 M78 96 L122 96 M82 130 L118 130" stroke="#0c0b12" strokeWidth="2" />
          <g className={animate ? "anim-seam" : undefined}>
            <path
              d="M100 84 L100 150 M78 96 L100 86 L122 96 M82 130 L100 140 L118 130 M58 106 L88 106 M112 106 L142 106"
              stroke={p.glow ?? p.accent}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          <path d="M78 148 L122 148 L118 168 L82 168 Z" fill="#0c0b12" />
          <g
            className={animate ? "anim-seam" : undefined}
            style={animate ? { animationDelay: "0.7s" } : undefined}
          >
            <path
              d="M88 152 L90 166 M100 152 L100 168 M112 152 L110 166"
              stroke={p.accent}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </g>
      );

    /*
      Solar Aegis — mythical. The tier above obsidian, so it does not just
      pulse: the chest disc turns, motes go round it, and a ring keeps leaving.
    */
    case "solar-plate":
      return (
        <g>
          <path d={wide} fill={p.base} />
          <path d="M56 88 Q74 72 92 88 L88 108 L58 108 Z" fill={p.accent} />
          <path d="M144 88 Q126 72 108 88 L112 108 L142 108 Z" fill={p.accent} />
          <path d="M80 112 Q100 122 120 112" fill="none" stroke={p.accent} strokeWidth="2.5" />
          <path d="M80 132 Q100 142 120 132" fill="none" stroke={p.accent} strokeWidth="2.5" />
          <path d="M78 148 L122 148 L118 168 L82 168 Z" fill={p.base} />
          <g
            className={animate ? "anim-spin" : undefined}
            style={{ transformOrigin: "100px 104px" }}
          >
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <path
                  key={i}
                  d={`M${100 + Math.cos(a) * 9} ${104 + Math.sin(a) * 9} L${100 + Math.cos(a) * (i % 2 ? 15 : 19)} ${104 + Math.sin(a) * (i % 2 ? 15 : 19)}`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <circle cx="100" cy="104" r="7.5" fill={p.glow ?? p.accent} />
          <circle cx="100" cy="104" r="3.4" fill="#fffbeb" />
          {[0, 1, 2].map((i) => (
            <g
              key={i}
              className={animate ? "anim-orbit" : undefined}
              style={
                animate
                  ? ({
                      transformOrigin: "100px 104px",
                      animationDelay: `${i * 1.9}s`,
                      ["--r" as string]: `${22 + i * 5}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <circle cx="100" cy="104" r="1.8" fill={p.glow ?? p.accent} />
            </g>
          ))}
          <circle
            cx="100"
            cy="104"
            r="18"
            fill="none"
            stroke={p.glow ?? p.accent}
            strokeWidth="1.4"
            className={animate ? "anim-ring" : undefined}
            style={{ transformOrigin: "100px 104px" }}
          />
        </g>
      );

    /*
      The Unmade — secret. Armour that is not attached to the wearer: eight
      shards holding the shape of a cuirass with gaps between them, each
      drifting on its own vector, over a body left deliberately visible
      through the middle.
    */
    case "unmade":
      return (
        <g>
          <path d={torso} fill={p.base} opacity="0.25" />
          {[
            { d: "M76 88 L98 84 L96 102 L74 104 Z", dx: "-4px", dy: "-3px", t: 0 },
            { d: "M102 84 L124 88 L126 104 L104 102 Z", dx: "4px", dy: "-3px", t: 0.6 },
            { d: "M74 110 L96 108 L96 126 L76 126 Z", dx: "-5px", dy: "2px", t: 1.2 },
            { d: "M104 108 L126 110 L124 126 L104 126 Z", dx: "5px", dy: "2px", t: 1.8 },
            { d: "M78 132 L96 132 L96 150 L80 148 Z", dx: "-3px", dy: "5px", t: 2.4 },
            { d: "M104 132 L122 132 L120 148 L104 150 Z", dx: "3px", dy: "5px", t: 3 },
            { d: "M88 152 L112 152 L110 166 L90 166 Z", dx: "0px", dy: "6px", t: 3.6 },
            { d: "M96 96 L104 96 L104 130 L96 130 Z", dx: "0px", dy: "-6px", t: 4.2 },
          ].map((shard) => (
            <g
              key={shard.d}
              className={animate ? "anim-drift" : undefined}
              style={
                animate
                  ? ({
                      animationDelay: `${shard.t}s`,
                      ["--dx" as string]: shard.dx,
                      ["--dy" as string]: shard.dy,
                    } as React.CSSProperties)
                  : { opacity: 0.8 }
              }
            >
              <path d={shard.d} fill={p.base} />
              <path d={shard.d} fill="none" stroke={p.glow ?? p.accent} strokeWidth="1.2" />
            </g>
          ))}
        </g>
      );

    case "shinobi":
      return (
        <g>
          <path d={torso} fill={p.base} />
          {/* Cross-wrapped straps and a wide obi — read as bound, not buckled. */}
          <path
            d="M80 92 L120 126"
            stroke={p.accent}
            strokeWidth="3.5"
            opacity="0.85"
          />
          <path
            d="M120 92 L80 126"
            stroke={p.accent}
            strokeWidth="3.5"
            opacity="0.85"
          />
          <rect
            x="79"
            y="128"
            width="42"
            height="12"
            rx="2"
            fill={p.accent}
            opacity="0.95"
          />
          <rect x="96" y="126" width="8" height="16" rx="1.5" fill={p.base} />
          {[100, 110, 120].map((y) => (
            <path
              key={y}
              d={`M82 ${y} L118 ${y}`}
              stroke={p.base}
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
        </g>
      );
    case "haori":
      return (
        <g>
          {/* Open at the front, so the sleeves are the silhouette. The
              panels are cut per frame: on the feminine one they draw in at
              the waist and kick back out over the hip, which is what makes a
              robe read as worn rather than hung on a peg. */}
          {frame === "feminine" ? (
            <>
              <path
                d="M76 88 Q86 82 92 88 L93 112 C90 120 88 126 88.5 134 L91 152 L77 156 C80 144 80 132 78.5 120 C77.5 110 76 98 76 88 Z"
                fill={p.base}
              />
              <path
                d="M124 88 Q114 82 108 88 L107 112 C110 120 112 126 111.5 134 L109 152 L123 156 C120 144 120 132 121.5 120 C122.5 110 124 98 124 88 Z"
                fill={p.base}
              />
              <path
                d="M92 88 L108 88 L106.5 112 L104 132 L96 132 L93.5 112 Z"
                fill={p.base}
                opacity="0.35"
              />
            </>
          ) : (
            <>
              <path d="M74 88 Q86 82 92 88 L94 150 L78 154 Z" fill={p.base} />
              <path d="M126 88 Q114 82 108 88 L106 150 L122 154 Z" fill={p.base} />
              <path
                d="M92 88 L108 88 L106 140 L94 140 Z"
                fill={p.base}
                opacity="0.35"
              />
            </>
          )}
          <g className={animate ? "anim-sway" : undefined}>
            <path
              d="M74 92 L66 140 L80 146 L82 96 Z"
              fill={p.base}
              opacity="0.9"
            />
          </g>
          <g className={animate ? "anim-sway" : undefined}>
            <path
              d="M126 92 L134 140 L120 146 L118 96 Z"
              fill={p.base}
              opacity="0.9"
            />
          </g>
          {/* Petal print, which is the whole reason it is a sakura haori. */}
          {[
            [82, 104],
            [116, 116],
            [86, 132],
            [112, 96],
          ].map(([x, y]) => (
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
      );
    case "mecha":
      return (
        <g>
          <path d={wide} fill={p.base} />
          <path
            d="M70 88 L130 88 L128 100 L72 100 Z"
            fill={p.accent}
            opacity="0.85"
          />
          {/* Panel seams and a reactor core that never quite settles. */}
          <path
            d="M78 108 L122 108 M78 126 L122 126"
            stroke="#0b0b12"
            strokeWidth="2"
            opacity="0.7"
          />
          <path
            d="M100 88 L100 148"
            stroke="#0b0b12"
            strokeWidth="2"
            opacity="0.5"
          />
          <g className={animate ? "anim-glow" : undefined}>
            <circle
              cx="100"
              cy="117"
              r="9"
              fill={p.glow ?? p.accent}
              opacity="0.7"
            />
            <circle cx="100" cy="117" r="4.5" fill="#f8fafc" />
          </g>
          <ellipse cx="72" cy="94" rx="12" ry="9" fill={p.accent} />
          <ellipse cx="128" cy="94" rx="12" ry="9" fill={p.accent} />
          <path d="M82 148 L118 148 L114 160 L86 160 Z" fill={p.base} />
        </g>
      );
    case "celestial":
      return (
        <g>
          <path d={celestialRobe} fill={p.base} />
          <g className={animate ? "anim-glow" : undefined}>
            <path d={celestialRobe} fill={p.glow ?? p.accent} opacity="0.28" />
          </g>
          {/* Constellation, drawn once and left alone. */}
          {[
            [86, 100],
            [96, 112],
            [110, 104],
            [118, 122],
            [92, 132],
            [106, 142],
          ].map(([x, y], i, all) => (
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
          <rect
            x="78"
            y="136"
            width="44"
            height="7"
            rx="2"
            fill={p.accent}
            opacity="0.8"
          />
        </g>
      );
    case "tunic":
      return (
        <g>
          <path d={torso} fill={p.base} />
          <path
            d="M100 84 L100 146"
            stroke={p.accent}
            strokeWidth="2"
            opacity="0.5"
          />
          <path
            d="M80 140 L120 140"
            stroke={p.accent}
            strokeWidth="4"
            opacity="0.7"
          />
        </g>
      );
    case "padded":
      return (
        <g>
          <path d={torso} fill={p.base} />
          {[98, 108, 118, 128, 138].map((y) => (
            <path
              key={y}
              d={`M79 ${y} L121 ${y}`}
              stroke={p.accent}
              strokeWidth="1.5"
              opacity="0.45"
            />
          ))}
          <path
            d="M80 143 L120 143"
            stroke={p.accent}
            strokeWidth="5"
            opacity="0.8"
          />
        </g>
      );
    case "leather":
      return (
        <g>
          <path d={torso} fill={p.base} />
          <path
            d="M86 86 L104 146"
            stroke={p.accent}
            strokeWidth="6"
            opacity="0.85"
          />
          <path
            d="M114 86 L96 146"
            stroke={p.accent}
            strokeWidth="4"
            opacity="0.6"
          />
          <rect
            x="80"
            y="136"
            width="40"
            height="8"
            rx="2"
            fill={p.accent}
            opacity="0.9"
          />
          <circle cx="100" cy="140" r="3" fill={p.base} />
        </g>
      );
    case "scale":
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
      );
    case "brigandine":
      return (
        <g>
          <path d={torso} fill={p.base} />
          <path
            d="M78 96 L122 96"
            stroke={p.accent}
            strokeWidth="3"
            opacity="0.8"
          />
          <path
            d="M80 122 L120 122"
            stroke={p.accent}
            strokeWidth="3"
            opacity="0.8"
          />
          {[92, 108, 124, 138].map((y) =>
            [86, 100, 114].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill={p.accent} />
            )),
          )}
          <rect
            x="80"
            y="138"
            width="40"
            height="7"
            rx="2"
            fill={p.accent}
            opacity="0.85"
          />
        </g>
      );
    case "plate":
      return (
        <g>
          <path d={wide} fill={p.base} />
          <ellipse cx="74" cy="92" rx="13" ry="10" fill={p.accent} />
          <ellipse cx="126" cy="92" rx="13" ry="10" fill={p.accent} />
          <path
            d="M100 86 L100 146"
            stroke={p.accent}
            strokeWidth="2.5"
            opacity="0.8"
          />
          <path
            d="M84 104 Q100 112 116 104"
            fill="none"
            stroke={p.accent}
            strokeWidth="2.5"
          />
          <path
            d="M84 120 Q100 128 116 120"
            fill="none"
            stroke={p.accent}
            strokeWidth="2.5"
          />
          <path d="M82 146 L118 146 L114 158 L86 158 Z" fill={p.base} />
        </g>
      );
    case "heavy-plate":
      return (
        <g>
          <path d={wide} fill={p.base} />
          <path d="M60 88 Q74 76 88 88 L86 104 L62 104 Z" fill={p.accent} />
          <path
            d="M140 88 Q126 76 112 88 L114 104 L138 104 Z"
            fill={p.accent}
          />
          <path d="M100 84 L100 148" stroke={p.accent} strokeWidth="3" />
          <path
            d="M82 100 Q100 110 118 100"
            fill="none"
            stroke={p.accent}
            strokeWidth="3"
          />
          <path
            d="M82 118 Q100 128 118 118"
            fill="none"
            stroke={p.accent}
            strokeWidth="3"
          />
          <path d="M80 148 L120 148 L116 166 L84 166 Z" fill={p.base} />
          <path d="M100 148 L100 166" stroke={p.accent} strokeWidth="2" />
        </g>
      );
    case "ember-plate":
      return (
        <g>
          <path d={wide} fill="#231512" />
          <path d="M58 88 Q74 74 90 88 L88 106 L60 106 Z" fill={p.base} />
          <path d="M142 88 Q126 74 110 88 L112 106 L140 106 Z" fill={p.base} />
          <path
            d="M100 82 L100 150"
            stroke={p.glow ?? p.accent}
            strokeWidth="3"
          />
          <path
            d="M80 100 Q100 112 120 100"
            fill="none"
            stroke={p.glow ?? p.accent}
            strokeWidth="3"
          />
          <path
            d="M80 120 Q100 132 120 120"
            fill="none"
            stroke={p.glow ?? p.accent}
            strokeWidth="3"
          />
          <path d="M78 148 L122 148 L118 168 L82 168 Z" fill="#231512" />
          <path
            d="M86 152 L88 166 M100 152 L100 168 M114 152 L112 166"
            stroke={p.accent}
            strokeWidth="2"
          />
          <circle
            cx="100"
            cy="110"
            r="5"
            fill={p.glow ?? p.accent}
            opacity="0.9"
          />
        </g>
      );
    default:
      return <path d={torso} fill={p.base} />;
  }
}

// ---------------------------------------------------------------------------
// Head / hair
// ---------------------------------------------------------------------------

function HeadArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  switch (art) {
    /*
      Drakeskull Helm — legendary. Built on the skull at (100, 58), r 19/21:
      a swept brow, two horns going back rather than up so it reads at thumbnail
      size, and eye slots that carry the only lit colour on the piece.
    */
    case "drake-helm":
      return (
        <g>
          {/* A closed skullcap, not a circlet. Every other helm in the
              wardrobe draws only a band and leaves the crown of the head bare,
              which is right for a crown and wrong for something called a
              skull. */}
          <path d="M79 52 Q79 27 100 27 Q121 27 121 52 Q100 44 79 52 Z" fill="#15100e" />
          <path d="M79 48 Q100 40 121 48 L121 55 Q100 47 79 55 Z" fill={p.base} />
          {/*
            Long horns sweeping back and out, not spikes on top. The first
            version put three triangles above the brow and the whole helm read
            as a jester's cap — the giveaway is that horns have to leave the
            silhouette sideways, or they are just a hat with points.
          */}
          {[-1, 1].map((dir) => (
            <g key={dir}>
              {/* Tapered to a point. Drawn with a blunt outer edge they were
                  the width of an ear at the tip and read as bat wings. */}
              <path
                d={`M${100 + dir * 18} 40
                    Q${100 + dir * 38} 28 ${100 + dir * 57} 22
                    Q${100 + dir * 40} 39 ${100 + dir * 20} 50 Z`}
                fill={p.base}
              />
              <path
                d={`M${100 + dir * 22} 42 Q${100 + dir * 38} 32 ${100 + dir * 52} 26`}
                stroke={p.accent}
                strokeWidth="1.4"
                fill="none"
                opacity="0.8"
              />
              {/* A short ridge horn above each brow, low enough to stay under
                  the top of a 280-tall canvas. */}
              <path
                d={`M${100 + dir * 8} 30 L${100 + dir * 13} 19 L${100 + dir * 16} 32 Z`}
                fill={p.base}
              />
            </g>
          ))}
          <path
            d="M88 38 Q100 33 112 38"
            fill="none"
            stroke={p.accent}
            strokeWidth="1.6"
            opacity="0.6"
          />
          <g className={animate ? "anim-glow" : undefined}>
            <path
              d="M85 56 L95 53 L94 60 L86 61 Z M115 56 L105 53 L106 60 L114 61 Z"
              fill={p.glow ?? p.accent}
            />
          </g>
        </g>
      );

    /*
      Astral Diadem — mythical. It does not sit on the head: a ring hovering
      above it with stars going round, so the tell is the gap between the ring
      and the skull.
    */
    case "diadem":
      return (
        <g>
          <ellipse
            cx="100"
            cy="26"
            rx="24"
            ry="7"
            fill="none"
            stroke={p.base}
            strokeWidth="3.4"
          />
          <ellipse
            cx="100"
            cy="26"
            rx="24"
            ry="7"
            fill="none"
            stroke={p.glow ?? p.accent}
            strokeWidth="1.4"
            className={animate ? "anim-shimmer" : undefined}
          />
          <path d="M100 14 L103 22 L100 26 L97 22 Z" fill={p.glow ?? p.accent} />
          {[0, 1, 2, 3].map((i) => (
            <g
              key={i}
              className={animate ? "anim-orbit" : undefined}
              style={
                animate
                  ? ({
                      transformOrigin: "100px 26px",
                      animationDelay: `${i * 2.1}s`,
                      animationDuration: "8.4s",
                      ["--r" as string]: `${20 + (i % 2) * 6}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <circle cx="100" cy="26" r={i % 2 ? 1.6 : 2.4} fill="#f8fafc" />
            </g>
          ))}
        </g>
      );

    /*
      Crown of Nothing — secret. Seven shards holding the shape of a crown with
      nothing joining them, each drifting on its own vector, over a gap where
      the band would be. The rarity tier cycles the hue on top.
    */
    case "void-crown":
      return (
        <g>
          <ellipse cx="100" cy="42" rx="23" ry="6" fill="#05030c" opacity="0.7" />
          {/* Wide shards sitting ON the skull (top of the head is y = 37), not
              hovering above it. Thin ones at y = 34 read as tally marks. */}
          {[
            { x: 80, h: 10, dx: "-3px", dy: "-3px", t: 0 },
            { x: 87, h: 17, dx: "-2px", dy: "-5px", t: 0.7 },
            { x: 94, h: 13, dx: "-1px", dy: "-4px", t: 1.4 },
            { x: 100, h: 23, dx: "0px", dy: "-6px", t: 2.1 },
            { x: 106, h: 13, dx: "1px", dy: "-4px", t: 2.8 },
            { x: 113, h: 17, dx: "2px", dy: "-5px", t: 3.5 },
            { x: 120, h: 10, dx: "3px", dy: "-3px", t: 4.2 },
          ].map((shard) => (
            <g
              key={shard.x}
              className={animate ? "anim-drift" : undefined}
              style={
                animate
                  ? ({
                      animationDelay: `${shard.t}s`,
                      ["--dx" as string]: shard.dx,
                      ["--dy" as string]: shard.dy,
                    } as React.CSSProperties)
                  : { opacity: 0.85 }
              }
            >
              <path
                d={`M${shard.x - 5} 42 L${shard.x} ${42 - shard.h} L${shard.x + 5} 42 Z`}
                fill={p.accent}
              />
              <path
                d={`M${shard.x - 5} 42 L${shard.x} ${42 - shard.h} L${shard.x + 5} 42 Z`}
                fill="none"
                stroke={p.glow ?? p.accent}
                strokeWidth="1.4"
              />
            </g>
          ))}
        </g>
      );

    case "spiked":
      return (
        <g>
          <path
            d="M81 52 Q100 30 119 52 L114 44 L108 56 L100 38 L92 56 L86 44 Z"
            fill={p.base}
          />
          {[
            [84, 44, 74, 20],
            [92, 38, 88, 12],
            [100, 34, 104, 8],
            [110, 40, 118, 16],
            [116, 48, 128, 28],
          ].map(([x1, y1, x2, y2]) => (
            <path
              key={`${x1}-${y1}`}
              d={`M${x1} ${y1} L${x2} ${y2} L${x1 + 7} ${y1 - 3} Z`}
              fill={p.base}
            />
          ))}
          <path
            d="M84 46 Q100 34 116 46"
            stroke={p.accent}
            strokeWidth="1.6"
            fill="none"
            opacity="0.7"
          />
        </g>
      );
    case "ponytail":
      return (
        <g>
          {/* Drawn behind the head, and it lags — hair that holds still is
              the single most doll-like thing a character can do. */}
          <g className={animate ? "anim-sway-wide" : undefined}>
            <path
              d="M99 38 Q74 56 68 96 Q62 128 78 148 Q70 118 80 88 Q88 60 106 44 Z"
              fill={p.base}
            />
            <path
              d="M97 44 Q76 62 72 96 Q68 122 78 140"
              stroke={p.accent}
              strokeWidth="2.2"
              fill="none"
              opacity="0.5"
            />
          </g>
          <path
            d="M81 50 Q100 32 119 50 L118 44 Q100 36 82 44 Z"
            fill={p.base}
          />
          <ellipse cx="98" cy="41" rx="6" ry="4" fill={p.accent} />
        </g>
      );
    case "kabuto":
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
      );
    case "halo":
      return (
        <g className={animate ? "anim-glow" : undefined}>
          <ellipse
            cx="100"
            cy="28"
            rx="21"
            ry="6"
            fill="none"
            stroke={p.glow ?? p.accent}
            strokeWidth="3"
          />
          <ellipse
            cx="100"
            cy="28"
            rx="15"
            ry="4"
            fill="none"
            stroke={p.accent}
            strokeWidth="1.2"
            opacity="0.6"
          />
        </g>
      );
  }
  return <LegacyHeadArt art={art} p={p} />;
}

function LegacyHeadArt({ art, p }: { art: string; p: Palette }) {
  switch (art) {
    case "bound":
      return (
        <g>
          <path d="M81 52 Q100 30 119 52 Q100 44 81 52 Z" fill={p.base} />
          <path
            d="M118 50 Q132 58 128 76"
            stroke={p.base}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "topknot":
      return (
        <g>
          <path d="M82 50 Q100 32 118 50 Q100 42 82 50 Z" fill={p.base} />
          <path d="M100 34 Q104 22 100 14 Q96 22 100 34 Z" fill={p.base} />
          <circle cx="100" cy="32" r="4" fill={p.accent} />
        </g>
      );
    case "hood":
      return (
        <g>
          <path
            d="M74 66 Q72 26 100 24 Q128 26 126 66 Q120 48 100 46 Q80 48 74 66 Z"
            fill={p.base}
          />
          <path
            d="M74 66 Q78 82 88 90 L112 90 Q122 82 126 66 L120 62 Q110 74 100 74 Q90 74 80 62 Z"
            fill={p.accent}
            opacity="0.55"
          />
        </g>
      );
    case "open-helm":
      return (
        <g>
          <path
            d="M79 60 Q79 30 100 30 Q121 30 121 60 L121 46 Q100 38 79 46 Z"
            fill={p.base}
          />
          <path
            d="M79 44 Q100 34 121 44 L121 52 Q100 44 79 52 Z"
            fill={p.accent}
          />
          <rect x="97" y="38" width="6" height="26" rx="2" fill={p.accent} />
        </g>
      );
    case "horned":
      return (
        <g>
          <path
            d="M79 58 Q79 28 100 28 Q121 28 121 58 L121 48 Q100 40 79 48 Z"
            fill={p.base}
          />
          <path d="M80 44 Q64 34 62 16 Q76 24 84 40 Z" fill={p.accent} />
          <path d="M120 44 Q136 34 138 16 Q124 24 116 40 Z" fill={p.accent} />
          <rect x="97" y="36" width="6" height="26" rx="2" fill={p.accent} />
        </g>
      );
    case "crowned":
      return (
        <g>
          <path
            d="M79 58 Q79 30 100 30 Q121 30 121 58 L121 46 Q100 38 79 46 Z"
            fill={p.base}
          />
          <path
            d="M76 34 L84 18 L92 30 L100 12 L108 30 L116 18 L124 34 Z"
            fill={p.accent}
          />
          <circle cx="100" cy="24" r="3" fill={p.glow ?? p.accent} />
        </g>
      );
    case "ember-crown":
      return (
        <g>
          <path
            d="M79 58 Q79 30 100 30 Q121 30 121 58 L121 46 Q100 38 79 46 Z"
            fill="#2a1410"
          />
          <path
            d="M76 36 L84 16 L92 30 L100 8 L108 30 L116 16 L124 36 Z"
            fill={p.base}
          />
          <path
            d="M84 20 L86 30 M100 12 L100 28 M116 20 L114 30"
            stroke={p.glow ?? p.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="100" cy="20" r="4" fill={p.glow ?? p.accent} />
        </g>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Faces
// ---------------------------------------------------------------------------

function FaceArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  /*
   * Eyes blink.
   *
   * Each eye is its own group so it can be squashed vertically about its own
   * centre — one shared group would pivot both about the midpoint of the face
   * and they would slide toward the nose as they closed.
   */
  const eyes = (fill: string) => (
    <>
      <g className={animate ? "anim-blink" : undefined}>
        <ellipse cx="92" cy="58" rx="3" ry="2.4" fill={fill} />
      </g>
      <g className={animate ? "anim-blink" : undefined}>
        <ellipse cx="108" cy="58" rx="3" ry="2.4" fill={fill} />
      </g>
    </>
  );
  switch (art) {
    /*
      Runebrand — legendary. Marks burnt into the face rather than painted on:
      three on each cheek and one on the brow, all lighting and fading
      together, and the eyes are left alone so they still blink.
    */
    case "runebrand":
      return (
        <g>
          <g className={animate ? "anim-seam" : undefined}>
            <path
              d="M100 44 L100 50 M96 47 L104 47"
              stroke={p.glow ?? p.accent}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M84 54 L88 54 M83 60 L89 60 M85 66 L90 63"
              stroke={p.glow ?? p.accent}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M116 54 L112 54 M117 60 L111 60 M115 66 L110 63"
              stroke={p.glow ?? p.accent}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
          {eyes(p.accent)}
          <path
            d="M94 70 Q100 73 106 70"
            stroke="#2a1a14"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );

    /*
      Starlit — secret. There are no eyes: two holes onto a sky, with points of
      light drifting inside them. Nothing blinks, because there is nothing
      there to close.
    */
    case "starlit":
      return (
        <g>
          <ellipse cx="92" cy="58" rx="5" ry="3.6" fill="#05030c" />
          <ellipse cx="108" cy="58" rx="5" ry="3.6" fill="#05030c" />
          {[
            { x: 90, y: 57, t: 0 },
            { x: 94, y: 59, t: 0.9 },
            { x: 92, y: 60, t: 1.8 },
            { x: 106, y: 59, t: 0.5 },
            { x: 110, y: 57, t: 1.4 },
            { x: 108, y: 60, t: 2.3 },
          ].map((s) => (
            <g
              key={`${s.x}-${s.y}`}
              className={animate ? "anim-glow" : undefined}
              style={animate ? { animationDelay: `${s.t}s` } : undefined}
            >
              <circle cx={s.x} cy={s.y} r="0.9" fill="#f8fafc" />
            </g>
          ))}
          <g className={animate ? "anim-shimmer" : undefined}>
            <ellipse
              cx="92"
              cy="58"
              rx="6.4"
              ry="4.6"
              fill="none"
              stroke={p.glow ?? p.accent}
              strokeWidth="1"
            />
            <ellipse
              cx="108"
              cy="58"
              rx="6.4"
              ry="4.6"
              fill="none"
              stroke={p.glow ?? p.accent}
              strokeWidth="1"
            />
          </g>
          <path
            d="M95 70 L105 70"
            stroke="#2a1a14"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      );

    case "oni":
      return (
        <g>
          <path
            d="M79 44 Q100 36 121 44 L118 74 Q100 82 82 74 Z"
            fill={p.base}
          />
          <path d="M84 40 q-7 -12 1 -18 q5 8 4 17 Z" fill={p.accent} />
          <path d="M116 40 q7 -12 -1 -18 q-5 8 -4 17 Z" fill={p.accent} />
          <path
            d="M85 54 L96 58 M115 54 L104 58"
            stroke="#120a0a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="92" cy="60" rx="3.4" ry="2.2" fill={p.accent} />
          <ellipse cx="108" cy="60" rx="3.4" ry="2.2" fill={p.accent} />
          {/* Bared teeth: the detail that makes it a demon rather than a mask. */}
          <path d="M88 68 L112 68 L110 74 L90 74 Z" fill="#f3ece2" />
          {[93, 100, 107].map((x) => (
            <path
              key={x}
              d={`M${x} 68 L${x} 74`}
              stroke={p.base}
              strokeWidth="1.2"
            />
          ))}
        </g>
      );
    case "kitsune":
      return (
        <g>
          <path
            d="M80 44 Q100 38 120 44 Q120 66 100 80 Q80 66 80 44 Z"
            fill="#f3ece2"
          />
          <path
            d="M84 48 Q92 44 98 48"
            stroke={p.base}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M116 48 Q108 44 102 48"
            stroke={p.base}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="92" cy="57" rx="3.6" ry="2.6" fill={p.base} />
          <ellipse cx="108" cy="57" rx="3.6" ry="2.6" fill={p.base} />
          <path
            d="M94 68 Q100 72 106 68"
            stroke={p.base}
            strokeWidth="1.8"
            fill="none"
          />
          <path
            d="M86 72 L94 72 M106 72 L114 72"
            stroke={p.base}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      );
    case "hollow":
      return (
        <g>
          <ellipse
            cx="100"
            cy="58"
            rx="20"
            ry="22"
            fill="#0b0b0f"
            opacity="0.72"
          />
          <g className={animate ? "anim-glow" : undefined}>
            <ellipse
              cx="92"
              cy="57"
              rx="4.2"
              ry="3"
              fill={p.glow ?? p.accent}
            />
            <ellipse
              cx="108"
              cy="57"
              rx="4.2"
              ry="3"
              fill={p.glow ?? p.accent}
            />
          </g>
          <path
            d="M100 40 L100 78"
            stroke={p.accent}
            strokeWidth="1"
            opacity="0.35"
          />
          <path
            d="M88 46 L112 46"
            stroke={p.accent}
            strokeWidth="1"
            opacity="0.25"
          />
        </g>
      );
    case "scarred":
      return (
        <g>
          {eyes("#20161a")}
          <path
            d="M88 44 L96 70"
            stroke={SKIN_SHADE}
            strokeWidth="2"
            opacity="0.9"
          />
          <path
            d="M92 68 Q100 72 108 68"
            stroke="#20161a"
            strokeWidth="1.6"
            fill="none"
          />
        </g>
      );
    case "warpaint":
      return (
        <g>
          <path
            d="M83 50 L117 50 L113 62 L87 62 Z"
            fill={p.base}
            opacity="0.85"
          />
          {eyes("#f3ece2")}
          <path
            d="M92 70 Q100 73 108 70"
            stroke="#20161a"
            strokeWidth="1.6"
            fill="none"
          />
        </g>
      );
    case "veiled":
      return (
        <g>
          <path
            d="M81 56 Q100 50 119 56 L117 74 Q100 80 83 74 Z"
            fill={p.base}
          />
          {eyes("#e8dfd2")}
        </g>
      );
    case "masked":
      return (
        <g>
          <path
            d="M81 46 Q100 40 119 46 L117 72 Q100 80 83 72 Z"
            fill={p.base}
          />
          <rect x="86" y="55" width="9" height="3.5" rx="1.5" fill="#0b0b0d" />
          <rect x="105" y="55" width="9" height="3.5" rx="1.5" fill="#0b0b0d" />
          <path d="M92 68 L108 68" stroke={p.accent} strokeWidth="2" />
          <path
            d="M100 46 L100 72"
            stroke={p.accent}
            strokeWidth="1.5"
            opacity="0.6"
          />
        </g>
      );
    case "ember-eyes":
      return (
        <g>
          <ellipse cx="92" cy="58" rx="4" ry="3" fill={p.glow ?? p.accent} />
          <ellipse cx="108" cy="58" rx="4" ry="3" fill={p.glow ?? p.accent} />
          <path
            d="M86 50 L96 54 M114 50 L104 54"
            stroke={p.base}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M92 70 Q100 74 108 70"
            stroke="#20161a"
            strokeWidth="1.6"
            fill="none"
          />
        </g>
      );
    default:
      return (
        <g>
          {eyes("#20161a")}
          <path
            d="M93 69 L107 69"
            stroke="#20161a"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      );
  }
}

// ---------------------------------------------------------------------------
// Hands
// ---------------------------------------------------------------------------

/**
 * Gloves, one hand at a time.
 *
 * `side` exists because a pose moves the two arms independently, and the only
 * honest way to send the left glove with the left arm is to draw one glove.
 * The previous attempt drew both and clipped each copy to half the canvas,
 * which does not work: the clip silently removed nothing, so every posed
 * figure carried two of everything — including a second sword through its own
 * skull. Rendering the side you asked for cannot fail that way.
 */
function HandsArt({
  art,
  p,
  animate,
  side,
}: {
  art: string;
  p: Palette;
  animate: boolean;
  side: "left" | "right";
}) {
  switch (art) {
    /*
      Riftgrasp — legendary. A gauntlet split down the back of the hand with a
      lit seam through the gap, one per hand. `side` matters: this component
      renders ONE hand and is called twice, once carried by each arm.
    */
    case "rift-gauntlets":
      return (
        <g>
          {(side === "left" ? [67] : [133]).map((x) => (
            <g key={x}>
              <rect x={x - 8} y="136" width="16" height="11" rx="3" fill="#120c1c" />
              <rect x={x - 8} y="141" width="16" height="17" rx="4" fill={p.base} />
              <path
                d={`M${x - 7} 158 Q${x} 168 ${x + 7} 158 L${x + 7} 150 L${x - 7} 150 Z`}
                fill={p.base}
              />
              <g className={animate ? "anim-seam" : undefined}>
                <path
                  d={`M${x} 137 L${x} 164`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d={`M${x - 5} 146 L${x + 5} 146`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="1.4"
                />
              </g>
            </g>
          ))}
        </g>
      );

    /*
      Titan Grips — mythical. Oversized: knuckle plates wider than the forearm,
      and a core in the back of each hand that turns as well as pulsing, which
      is the tier's job — one step up means a second kind of motion.
    */
    case "titan-gauntlets":
      return (
        <g>
          {(side === "left" ? [67] : [133]).map((x) => (
            <g key={x}>
              <rect x={x - 11} y="130" width="22" height="14" rx="3" fill={p.base} />
              <rect x={x - 10} y="143" width="20" height="20" rx="5" fill={p.base} />
              <path
                d={`M${x - 10} 163 Q${x} 174 ${x + 10} 163 L${x + 10} 156 L${x - 10} 156 Z`}
                fill={p.base}
              />
              <path
                d={`M${x - 8} 134 L${x + 8} 134 M${x - 8} 139 L${x + 8} 139`}
                stroke={p.accent}
                strokeWidth="2"
              />
              <path
                d={`M${x - 10} 148 L${x + 10} 148`}
                stroke="#2a0d0d"
                strokeWidth="2"
              />
              {/* A short spoked core, not a starburst. Spokes out to r = 8 on
                  a 20px-wide glove drew a red star across the whole hand. */}
              <g
                className={animate ? "anim-spin" : undefined}
                style={{ transformOrigin: `${x}px 154px`, animationDuration: "8s" }}
              >
                {Array.from({ length: 6 }, (_, i) => {
                  const a = (i / 6) * Math.PI * 2;
                  return (
                    <path
                      key={i}
                      d={`M${x + Math.cos(a) * 3.4} ${154 + Math.sin(a) * 3.4} L${x + Math.cos(a) * 5.4} ${154 + Math.sin(a) * 5.4}`}
                      stroke={p.glow ?? p.accent}
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
              <circle
                cx={x}
                cy="154"
                r="3.2"
                fill={p.glow ?? p.accent}
                className={animate ? "anim-shimmer" : undefined}
              />
            </g>
          ))}
        </g>
      );

    case "claws":
      return (
        <g>
          {(side === "left" ? [[67, 150, -1]] : [[133, 150, 1]]).map(([x, y, dir]) => (
            <g key={x}>
              <rect
                x={x - 7}
                y={y - 12}
                width="14"
                height="18"
                rx="3"
                fill={p.base}
              />
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
      );
    case "spirit-cuffs":
      return (
        <g className={animate ? "anim-glow" : undefined}>
          {(side === "left" ? [67] : [133]).map((x) => (
            <g key={x}>
              <rect
                x={x - 8}
                y="138"
                width="16"
                height="9"
                rx="4"
                fill={p.base}
              />
              <circle
                cx={x}
                cy="154"
                r="6"
                fill={p.glow ?? p.accent}
                opacity="0.55"
              />
              <circle cx={x} cy="154" r="2.6" fill="#f8fafc" />
            </g>
          ))}
        </g>
      );
  }
  return <LegacyHandsArt art={art} p={p} side={side} />;
}

function LegacyHandsArt({
  art,
  p,
  side,
}: {
  art: string;
  p: Palette;
  side: "left" | "right";
}) {
  const left = { x: 67, y: 150 };
  const right = { x: 133, y: 150 };
  // Every legacy glove is drawn through this one helper, so restricting it to
  // a single hand is a one-line change rather than eighty.
  const pair = (render: (x: number, y: number, flip: number) => ReactNode) =>
    side === "left" ? <>{render(left.x, left.y, -1)}</> : <>{render(right.x, right.y, 1)}</>;
  switch (art) {
    case "wraps":
      return pair((x, y) => (
        <g key={x}>
          <circle cx={x} cy={y} r="7" fill={p.base} />
          <path
            d={`M${x - 6} ${y - 3} L${x + 6} ${y - 1} M${x - 6} ${y + 2} L${x + 6} ${y + 4}`}
            stroke={p.accent}
            strokeWidth="1.5"
          />
        </g>
      ));
    case "gloves":
      return pair((x, y) => (
        <g key={x}>
          <circle cx={x} cy={y} r="8" fill={p.base} />
          <path
            d={`M${x - 7} ${y - 6} L${x + 7} ${y - 6}`}
            stroke={p.accent}
            strokeWidth="3"
          />
        </g>
      ));
    case "bracers":
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="7" fill={SKIN} />
          <rect
            x={x - 8}
            y={y - 22}
            width="16"
            height="16"
            rx="4"
            fill={p.base}
            transform={`rotate(${flip * 8} ${x} ${y - 14})`}
          />
          <path
            d={`M${x - 6} ${y - 16} L${x + 6} ${y - 16}`}
            stroke={p.accent}
            strokeWidth="2"
          />
        </g>
      ));
    case "gauntlets":
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="9" fill={p.base} />
          <rect
            x={x - 9}
            y={y - 24}
            width="18"
            height="18"
            rx="4"
            fill={p.base}
            transform={`rotate(${flip * 8} ${x} ${y - 15})`}
          />
          <path
            d={`M${x - 7} ${y - 3} L${x + 7} ${y - 3} M${x - 7} ${y + 3} L${x + 7} ${y + 3}`}
            stroke={p.accent}
            strokeWidth="2"
          />
        </g>
      ));
    case "heavy-gauntlets":
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="11" fill={p.base} />
          <rect
            x={x - 11}
            y={y - 28}
            width="22"
            height="22"
            rx="5"
            fill={p.base}
            transform={`rotate(${flip * 8} ${x} ${y - 17})`}
          />
          <path
            d={`M${x - 9} ${y - 4} L${x + 9} ${y - 4} M${x - 9} ${y + 3} L${x + 9} ${y + 3}`}
            stroke={p.accent}
            strokeWidth="2.5"
          />
          <circle cx={x} cy={y - 17} r="3.5" fill={p.accent} />
        </g>
      ));
    case "ember-gauntlets":
      return pair((x, y, flip) => (
        <g key={x}>
          <circle cx={x} cy={y} r="11" fill="#2a1410" />
          <rect
            x={x - 11}
            y={y - 28}
            width="22"
            height="22"
            rx="5"
            fill="#2a1410"
            transform={`rotate(${flip * 8} ${x} ${y - 17})`}
          />
          <path
            d={`M${x - 8} ${y - 5} L${x + 8} ${y - 5} M${x - 8} ${y + 3} L${x + 8} ${y + 3}`}
            stroke={p.glow ?? p.accent}
            strokeWidth="2.5"
          />
          <circle cx={x} cy={y - 17} r="4" fill={p.glow ?? p.accent} />
        </g>
      ));
    default:
      return pair((x, y) => <circle key={x} cx={x} cy={y} r="7" fill={SKIN} />);
  }
}

// ---------------------------------------------------------------------------
// Feet
// ---------------------------------------------------------------------------

function FeetArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  switch (art) {
    /*
      Magmatread — legendary. Fractured plate over a molten sole: the cracks
      brighten and dim, and the ground under each boot carries the same colour,
      so the heat reads as coming out of them rather than painted on.
    */
    case "magma-greaves":
      return (
        <g>
          {[85, 115].map((x, i) => (
            <g key={x}>
              <g
                className={animate ? "anim-glow" : undefined}
                style={animate ? { animationDelay: `${i * 0.9}s` } : undefined}
              >
                <ellipse cx={x} cy="250" rx="17" ry="5" fill={p.glow ?? p.accent} opacity="0.4" />
              </g>
              <rect x={x - 9} y="204" width="18" height="32" rx="3" fill="#1c0d0a" />
              <path
                d={`M${x - 10} 236 L${x + 11} 236 L${x + 13} 248 L${x - 10} 248 Z`}
                fill="#1c0d0a"
              />
              <g
                className={animate ? "anim-seam" : undefined}
                style={animate ? { animationDelay: `${i * 0.55}s` } : undefined}
              >
                <path
                  d={`M${x - 7} 208 L${x + 2} 214 L${x - 4} 222 L${x + 6} 230
                      M${x - 8} 244 L${x + 12} 244`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
              <path
                d={`M${x - 9} 204 L${x + 9} 204 L${x + 7} 198 L${x - 7} 198 Z`}
                fill={p.base}
              />
            </g>
          ))}
        </g>
      );

    /*
      Voidstride — mythical. The boots do not touch the ground: they hover a
      few pixels clear, with the floor shadow left behind where the foot ought
      to be, and shards orbiting each ankle.
    */
    case "void-greaves":
      return (
        <g>
          {[85, 115].map((x, i) => (
            <g key={x}>
              <ellipse cx={x} cy="250" rx="13" ry="4" fill="#05030c" opacity="0.6" />
              <g
                className={animate ? "anim-float" : undefined}
                style={
                  animate
                    ? { animationDelay: `${i * 0.8}s`, animationDuration: "3.6s" }
                    : undefined
                }
              >
                <rect x={x - 9} y="200" width="18" height="32" rx="4" fill={p.base} />
                <path
                  d={`M${x - 10} 232 L${x + 11} 232 L${x + 13} 242 L${x - 10} 242 Z`}
                  fill={p.base}
                />
                <path
                  d={`M${x - 7} 208 L${x + 7} 208 M${x - 7} 218 L${x + 7} 218`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="1.8"
                />
                <path
                  d={`M${x - 9} 242 L${x + 13} 242`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="2"
                  className={animate ? "anim-shimmer" : undefined}
                />
              </g>
              {[0, 1, 2].map((k) => (
                <g
                  key={k}
                  className={animate ? "anim-orbit" : undefined}
                  style={
                    animate
                      ? ({
                          transformOrigin: `${x}px 228px`,
                          animationDelay: `${k * 2 + i}s`,
                          animationDuration: "6s",
                          ["--r" as string]: `${14 + k * 4}px`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <rect x={x - 1.4} y="226.6" width="2.8" height="2.8" fill={p.accent} />
                </g>
              ))}
            </g>
          ))}
        </g>
      );

    case "tabi":
      return (
        <g>
          {[85, 115].map((x) => (
            <g key={x}>
              <rect
                x={x - 8}
                y="212"
                width="16"
                height="22"
                rx="3"
                fill={p.base}
              />
              <path
                d={`M${x - 9} 234 L${x + 10} 234 L${x + 12} 244 L${x - 9} 244 Z`}
                fill={p.base}
              />
              {/* The split toe, which is the entire tell. */}
              <path
                d={`M${x + 4} 236 L${x + 4} 244`}
                stroke={p.accent}
                strokeWidth="1.4"
              />
              <path
                d={`M${x - 8} 226 L${x + 8} 226`}
                stroke={p.accent}
                strokeWidth="2"
                opacity="0.8"
              />
            </g>
          ))}
        </g>
      );
    case "stormstep":
      return (
        <g>
          {[85, 115].map((x) => (
            <g key={x}>
              <rect
                x={x - 9}
                y="206"
                width="18"
                height="30"
                rx="4"
                fill={p.base}
              />
              <path
                d={`M${x - 10} 236 L${x + 11} 236 L${x + 13} 246 L${x - 10} 246 Z`}
                fill={p.base}
              />
              <path
                d={`M${x - 8} 214 L${x + 8} 214 M${x - 8} 224 L${x + 8} 224`}
                stroke={p.accent}
                strokeWidth="2"
              />
              <g className={animate ? "anim-flicker" : undefined}>
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
      );
  }
  return <LegacyFeetArt art={art} p={p} />;
}

function LegacyFeetArt({ art, p }: { art: string; p: Palette }) {
  const foot = (
    x: number,
    flip: number,
    render: (x: number, flip: number) => ReactNode,
  ) => render(x, flip);
  const both = (render: (x: number, flip: number) => ReactNode) => (
    <>
      {foot(85, -1, render)}
      {foot(115, 1, render)}
    </>
  );
  switch (art) {
    case "boots":
      return both((x, flip) => (
        <g key={x}>
          <path
            d={`M${x - 7} 216 L${x + 7} 216 L${x + 7} 244 L${x + flip * 12} 250 L${x - 8} 250 Z`}
            fill={p.base}
          />
          <path
            d={`M${x - 7} 224 L${x + 7} 224`}
            stroke={p.accent}
            strokeWidth="2"
          />
        </g>
      ));
    case "runner":
      return both((x, flip) => (
        <g key={x}>
          <path
            d={`M${x - 7} 226 L${x + 7} 226 L${x + 7} 242 L${x + flip * 13} 248 L${x - 8} 248 Z`}
            fill={p.base}
          />
          <path
            d={`M${x - 8} 246 L${x + flip * 13} 246`}
            stroke={p.accent}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d={`M${x - 4} 230 L${x + 4} 234`}
            stroke={p.accent}
            strokeWidth="1.8"
          />
        </g>
      ));
    case "greaves":
      return both((x, flip) => (
        <g key={x}>
          <rect x={x - 8} y="196" width="16" height="34" rx="4" fill={p.base} />
          <path
            d={`M${x - 8} 230 L${x + 8} 230 L${x + 8} 244 L${x + flip * 12} 250 L${x - 9} 250 Z`}
            fill={p.base}
          />
          <path
            d={`M${x - 6} 206 L${x + 6} 206 M${x - 6} 216 L${x + 6} 216`}
            stroke={p.accent}
            strokeWidth="2"
          />
        </g>
      ));
    case "heavy-greaves":
      return both((x, flip) => (
        <g key={x}>
          <rect
            x={x - 10}
            y="188"
            width="20"
            height="44"
            rx="5"
            fill={p.base}
          />
          <path
            d={`M${x - 10} 232 L${x + 10} 232 L${x + 10} 244 L${x + flip * 14} 252 L${x - 11} 252 Z`}
            fill={p.base}
          />
          <path
            d={`M${x - 8} 198 L${x + 8} 198 M${x - 8} 212 L${x + 8} 212 M${x - 8} 224 L${x + 8} 224`}
            stroke={p.accent}
            strokeWidth="2"
          />
          <circle cx={x} cy="192" r="3" fill={p.accent} />
        </g>
      ));
    case "ember-greaves":
      return both((x, flip) => (
        <g key={x}>
          <rect
            x={x - 10}
            y="186"
            width="20"
            height="46"
            rx="5"
            fill="#2a1410"
          />
          <path
            d={`M${x - 10} 232 L${x + 10} 232 L${x + 10} 244 L${x + flip * 14} 252 L${x - 11} 252 Z`}
            fill="#2a1410"
          />
          <path
            d={`M${x - 7} 196 L${x + 7} 196 M${x - 7} 210 L${x + 7} 210 M${x - 7} 224 L${x + 7} 224`}
            stroke={p.glow ?? p.accent}
            strokeWidth="2.5"
          />
        </g>
      ));
    default:
      return both((x, flip) => (
        <g key={x}>
          <path
            d={`M${x - 7} 232 L${x + 7} 232 L${x + 7} 244 L${x + flip * 10} 249 L${x - 8} 249 Z`}
            fill={p.base}
          />
          <path
            d={`M${x - 7} 236 L${x + 7} 238`}
            stroke={p.accent}
            strokeWidth="1.5"
          />
        </g>
      ));
  }
}

// ---------------------------------------------------------------------------
// Weapons — held in the right hand (x ≈ 133)
// ---------------------------------------------------------------------------

function WeaponArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  switch (art) {
    /*
      Riftcleaver — legendary. A greatsword with a tear down the middle of the
      blade, and the tear is the item: the steel is nearly black so the seam
      is the only bright thing, and it pulses rather than glows steadily so
      the eye keeps going back to it.
    */
    case "rift-blade":
      return (
        <g>
          <rect x="129.5" y="140" width="7" height="26" rx="3" fill="#120c1c" />
          <path d="M116 141 L152 141 L148 133 L120 133 Z" fill={p.accent} />
          {/* Wide. The first cut was 18px across and near-black, which left a
              purple squiggle floating where a greatsword should have been. */}
          <path d="M120 133 L146 133 L141 46 L133 26 L125 46 Z" fill={p.base} />
          <path d="M133 133 L146 133 L141 46 L133 26 Z" fill="#150c26" />
          <path
            d="M120 133 L125 46 L133 26"
            fill="none"
            stroke={p.accent}
            strokeWidth="1.8"
            opacity="0.75"
          />
          <g className={animate ? "anim-seam" : undefined}>
            <path
              d="M133 128 L128 106 L137 86 L130 64 L133 44 L133 30"
              stroke={p.glow ?? p.accent}
              strokeWidth="3.4"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          {/* What escapes through the tear, drifting up the edge of the blade. */}
          {[
            { x: 141, y: 112, d: 0 },
            { x: 125, y: 88, d: 1.4 },
            { x: 139, y: 66, d: 2.6 },
          ].map((m) => (
            <g
              key={`${m.x}-${m.y}`}
              className={animate ? "anim-rise" : undefined}
              style={
                animate
                  ? { animationDelay: `${m.d}s`, animationDuration: "4.6s" }
                  : { opacity: 0.5 }
              }
            >
              <circle cx={m.x} cy={m.y} r="2.2" fill={p.accent} />
            </g>
          ))}
        </g>
      );

    /*
      Thunderpeal — mythical. A tier above the rift blade, so it gets two kinds
      of motion instead of one: arcs that snap between the flanges, and sparks
      that orbit the head continuously.
    */
    case "storm-hammer":
      return (
        <g>
          {/* The head sits at chest height, not shoulder height. Drawn 34px
              higher it rested on the figure's own collarbone and the flange
              reached the edge of the face. */}
          <rect x="130" y="104" width="6" height="66" rx="3" fill="#1b1836" />
          <path d="M128 162 L138 162 L138 172 L128 172 Z" fill={p.base} />
          <rect x="112" y="90" width="42" height="30" rx="4" fill={p.base} />
          <path d="M112 96 L104 102 L104 108 L112 114 Z" fill={p.accent} />
          <path d="M154 96 L162 102 L162 108 L154 114 Z" fill={p.accent} />
          <rect x="118" y="96" width="30" height="18" rx="2" fill="#1b1836" />
          <circle cx="133" cy="105" r="5.5" fill={p.glow ?? p.accent} opacity="0.9" />
          {[0, 1, 2].map((i) => (
            <g
              key={i}
              className={animate ? "anim-flicker" : undefined}
              style={animate ? { animationDelay: `${i * 0.41}s` } : { opacity: 0.4 }}
            >
              <path
                d={`M${146 + i * 8} ${72 + i * 4} l6 10 l-4 1 l7 12 l-11 -12 l4 -1 Z`}
                fill={p.glow ?? p.accent}
              />
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <g
              key={i}
              className={animate ? "anim-orbit" : undefined}
              style={
                animate
                  ? ({
                      transformOrigin: "133px 105px",
                      animationDelay: `${i * 1.2}s`,
                      animationDuration: `${4.8 + (i % 2)}s`,
                      ["--r" as string]: `${26 + (i % 2) * 8}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <circle cx="133" cy="105" r="2" fill={p.glow ?? p.accent} />
            </g>
          ))}
        </g>
      );

    /*
      First Light — secret. There is no blade: the hilt is real and everything
      above it is layered light, three beams of different length shimmering out
      of phase, so the "edge" is never in quite the same place twice.
    */
    case "dawn-blade":
      return (
        <g>
          <rect x="130" y="142" width="6" height="24" rx="3" fill="#2b1a06" />
          <path d="M120 142 L148 142 L144 136 L124 136 Z" fill={p.base} />
          <circle cx="133" cy="139" r="4" fill={p.glow ?? p.accent} />
          {/* Wide enough to read as a blade. At 11px the widest beam was a
              hairline on a phone and the item looked like a bare hilt. */}
          {[
            { w: 26, top: 52, o: 0.2, d: 0 },
            { w: 15, top: 36, o: 0.42, d: 0.8 },
            { w: 6.5, top: 26, o: 0.95, d: 1.6 },
          ].map((beam) => (
            <g
              key={beam.w}
              className={animate ? "anim-shimmer" : undefined}
              style={
                animate
                  ? { animationDelay: `${beam.d}s`, animationDuration: "3.1s" }
                  : { opacity: beam.o }
              }
            >
              <path
                d={`M${133 - beam.w / 2} 136 L${133 + beam.w / 2} 136 L133 ${beam.top} Z`}
                fill={p.glow ?? p.accent}
                opacity={beam.o}
              />
            </g>
          ))}
          {/* A bar of light running the length of it, top to bottom. */}
          <g className={animate ? "anim-scan" : undefined}>
            <rect x="125" y="90" width="16" height="5" rx="2.5" fill="#fffbeb" opacity="0.8" />
          </g>
        </g>
      );

    case "katana":
      return (
        <g>
          {/* Curved, single-edged, and the curve is the whole silhouette. */}
          <path
            d="M136 148 Q150 106 158 60"
            stroke={p.base}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M136 148 Q149 107 156 62"
            stroke={p.accent}
            strokeWidth="1.6"
            fill="none"
          />
          <rect
            x="130"
            y="146"
            width="14"
            height="4"
            rx="2"
            fill="#c9a227"
            transform="rotate(-16 137 148)"
          />
          <path
            d="M132 150 L128 168"
            stroke="#3a2c24"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {[154, 160, 166].map((y) => (
            <path
              key={y}
              d={`M${131 - (y - 154) * 0.22} ${y} l4 -1.4`}
              stroke="#8a6a3a"
              strokeWidth="1.2"
            />
          ))}
        </g>
      );
    case "nodachi":
      return (
        <g>
          <path
            d="M134 172 Q152 108 164 26"
            stroke={p.base}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M134 172 Q151 109 162 30"
            stroke={p.accent}
            strokeWidth="2.2"
            fill="none"
          />
          <rect
            x="126"
            y="168"
            width="18"
            height="5"
            rx="2.5"
            fill={p.accent}
            transform="rotate(-14 135 170)"
          />
          <path
            d="M131 174 L124 198"
            stroke="#3a2c24"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="123" cy="200" r="3.5" fill={p.accent} />
        </g>
      );
    case "kusarigama":
      return (
        <g>
          {/* Sickle in the hand, chain hanging, weight swinging at the end. */}
          <path
            d="M133 150 L131 176"
            stroke="#3a2c24"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M133 150 Q150 142 152 124 Q146 138 133 142 Z"
            fill={p.base}
          />
          <path
            d="M133 148 Q148 141 151 127"
            stroke={p.accent}
            strokeWidth="1.4"
            fill="none"
          />
          <g className={animate ? "anim-sway-wide" : undefined}>
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
      );
    case "spirit-blade":
      return (
        <g>
          <g className={animate ? "anim-glow" : undefined}>
            <path
              d="M136 150 L150 54"
              stroke={p.glow ?? p.accent}
              strokeWidth="14"
              opacity="0.22"
              strokeLinecap="round"
            />
          </g>
          <path
            d="M136 150 L149 58 L156 62 L142 152 Z"
            fill={p.base}
            opacity="0.9"
          />
          <path
            d="M139 148 L150 62"
            stroke="#f0fdfa"
            strokeWidth="1.6"
            opacity="0.9"
          />
          <rect
            x="130"
            y="148"
            width="16"
            height="4.5"
            rx="2"
            fill={p.accent}
            transform="rotate(-9 138 150)"
          />
          <path
            d="M134 152 L131 170"
            stroke="#243b3a"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      );
    case "null-blade":
      return (
        <g>
          {/* A secret should look like an absence. This is a blade-shaped hole
              with only an edge highlight to prove it is there at all. */}
          <path d="M136 150 L146 56 L154 60 L143 152 Z" fill="#05050a" />
          <path
            d="M146 56 L154 60"
            stroke="#f8fafc"
            strokeWidth="1.2"
            opacity="0.85"
          />
          <path
            d="M136 150 L146 56"
            stroke="#f8fafc"
            strokeWidth="0.8"
            opacity="0.55"
          />
          <g className={animate ? "anim-flicker" : undefined}>
            <path
              d="M143 152 L154 60"
              stroke="#f8fafc"
              strokeWidth="0.7"
              opacity="0.5"
            />
          </g>
          <rect
            x="130"
            y="148"
            width="15"
            height="4"
            rx="2"
            fill="#1a1a22"
            transform="rotate(-8 137 150)"
          />
          <path
            d="M134 152 L131 170"
            stroke="#0b0b0f"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      );
  }
  return <LegacyWeaponArt art={art} p={p} />;
}

function LegacyWeaponArt({ art, p }: { art: string; p: Palette }) {
  const hx = 136;
  const hy = 150;
  switch (art) {
    case "staff":
      return (
        <g>
          <rect
            x={hx - 2}
            y={hy - 96}
            width="5"
            height="150"
            rx="2.5"
            fill={p.base}
          />
          <circle cx={hx + 0.5} cy={hy - 98} r="7" fill={p.accent} />
        </g>
      );
    case "shortsword":
      return (
        <g>
          <rect
            x={hx - 2}
            y={hy - 6}
            width="5"
            height="18"
            rx="2"
            fill="#2a2118"
          />
          <rect
            x={hx - 10}
            y={hy - 10}
            width="21"
            height="5"
            rx="2"
            fill={p.accent}
          />
          <path
            d={`M${hx - 4} ${hy - 10} L${hx + 5} ${hy - 10} L${hx + 3} ${hy - 60} L${hx + 0.5} ${hy - 66} L${hx - 2} ${hy - 60} Z`}
            fill={p.base}
          />
        </g>
      );
    case "longsword":
      return (
        <g>
          <rect
            x={hx - 2}
            y={hy - 8}
            width="5"
            height="22"
            rx="2"
            fill="#2a2118"
          />
          <rect
            x={hx - 13}
            y={hy - 12}
            width="27"
            height="5"
            rx="2"
            fill={p.accent}
          />
          <path
            d={`M${hx - 5} ${hy - 12} L${hx + 6} ${hy - 12} L${hx + 4} ${hy - 86} L${hx + 0.5} ${hy - 94} L${hx - 3} ${hy - 86} Z`}
            fill={p.base}
          />
          <path
            d={`M${hx + 0.5} ${hy - 14} L${hx + 0.5} ${hy - 88}`}
            stroke={p.accent}
            strokeWidth="1.4"
            opacity="0.7"
          />
        </g>
      );
    case "greatsword":
      return (
        <g>
          <rect
            x={hx - 3}
            y={hy - 10}
            width="7"
            height="30"
            rx="3"
            fill="#2a2118"
          />
          <rect
            x={hx - 18}
            y={hy - 15}
            width="37"
            height="6"
            rx="3"
            fill={p.accent}
          />
          <path
            d={`M${hx - 8} ${hy - 15} L${hx + 9} ${hy - 15} L${hx + 6} ${hy - 108} L${hx + 0.5} ${hy - 120} L${hx - 5} ${hy - 108} Z`}
            fill={p.base}
          />
          <path
            d={`M${hx + 0.5} ${hy - 18} L${hx + 0.5} ${hy - 110}`}
            stroke={p.accent}
            strokeWidth="2"
            opacity="0.75"
          />
        </g>
      );
    case "axe":
      return (
        <g>
          <rect
            x={hx - 2}
            y={hy - 66}
            width="5"
            height="86"
            rx="2"
            fill="#3d2f22"
          />
          <path
            d={`M${hx + 3} ${hy - 62} Q${hx + 30} ${hy - 54} ${hx + 20} ${hy - 26} Q${hx + 10} ${hy - 34} ${hx + 3} ${hy - 30} Z`}
            fill={p.base}
          />
          <path
            d={`M${hx + 3} ${hy - 58} Q${hx + 24} ${hy - 52} ${hx + 17} ${hy - 32}`}
            fill="none"
            stroke={p.accent}
            strokeWidth="2"
          />
        </g>
      );
    case "mace":
      return (
        <g>
          <rect
            x={hx - 2}
            y={hy - 52}
            width="5"
            height="72"
            rx="2"
            fill="#3d2f22"
          />
          <circle cx={hx + 0.5} cy={hy - 58} r="12" fill={p.base} />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = (a * Math.PI) / 180;
            return (
              <path
                key={a}
                d={`M${hx + 0.5 + Math.cos(r) * 10} ${hy - 58 + Math.sin(r) * 10} L${hx + 0.5 + Math.cos(r) * 17} ${hy - 58 + Math.sin(r) * 17}`}
                stroke={p.accent}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      );
    case "warhammer":
      return (
        <g>
          <rect
            x={hx - 3}
            y={hy - 62}
            width="6"
            height="84"
            rx="3"
            fill="#3d2f22"
          />
          <rect
            x={hx - 16}
            y={hy - 76}
            width="33"
            height="20"
            rx="4"
            fill={p.base}
          />
          <rect x={hx - 16} y={hy - 70} width="33" height="4" fill={p.accent} />
        </g>
      );
    case "spear":
      return (
        <g>
          <rect
            x={hx - 2}
            y={hy - 100}
            width="5"
            height="150"
            rx="2"
            fill="#3d2f22"
          />
          <path
            d={`M${hx - 5} ${hy - 96} L${hx + 0.5} ${hy - 124} L${hx + 6} ${hy - 96} L${hx + 0.5} ${hy - 88} Z`}
            fill={p.base}
          />
          <path
            d={`M${hx - 6} ${hy - 92} L${hx + 7} ${hy - 92}`}
            stroke={p.accent}
            strokeWidth="2.5"
          />
        </g>
      );
    case "halberd":
      return (
        <g>
          <rect
            x={hx - 2}
            y={hy - 100}
            width="5"
            height="150"
            rx="2"
            fill="#3d2f22"
          />
          <path
            d={`M${hx - 4} ${hy - 96} L${hx + 0.5} ${hy - 122} L${hx + 5} ${hy - 96} Z`}
            fill={p.base}
          />
          <path
            d={`M${hx + 3} ${hy - 96} Q${hx + 28} ${hy - 90} ${hx + 20} ${hy - 68} Q${hx + 10} ${hy - 76} ${hx + 3} ${hy - 72} Z`}
            fill={p.base}
          />
          <path
            d={`M${hx - 3} ${hy - 92} Q${hx - 18} ${hy - 84} ${hx - 12} ${hy - 72}`}
            fill="none"
            stroke={p.accent}
            strokeWidth="3"
          />
        </g>
      );
    case "twin-blades":
      return (
        <g>
          <g>
            <rect
              x={hx - 2}
              y={hy - 6}
              width="5"
              height="18"
              rx="2"
              fill="#2a2118"
            />
            <rect
              x={hx - 9}
              y={hy - 10}
              width="19"
              height="4"
              rx="2"
              fill={p.accent}
            />
            <path
              d={`M${hx - 3} ${hy - 10} L${hx + 4} ${hy - 10} L${hx + 2} ${hy - 56} L${hx + 0.5} ${hy - 62} L${hx - 1} ${hy - 56} Z`}
              fill={p.base}
            />
          </g>
          <g transform="translate(-72, 0) scale(-1,1) translate(-200,0)">
            <rect
              x={hx - 2}
              y={hy - 6}
              width="5"
              height="18"
              rx="2"
              fill="#2a2118"
            />
            <rect
              x={hx - 9}
              y={hy - 10}
              width="19"
              height="4"
              rx="2"
              fill={p.accent}
            />
            <path
              d={`M${hx - 3} ${hy - 10} L${hx + 4} ${hy - 10} L${hx + 2} ${hy - 56} L${hx + 0.5} ${hy - 62} L${hx - 1} ${hy - 56} Z`}
              fill={p.base}
            />
          </g>
        </g>
      );
    case "ember-blade":
      return (
        <g>
          <rect
            x={hx - 3}
            y={hy - 10}
            width="7"
            height="26"
            rx="3"
            fill="#1a0f0c"
          />
          <rect
            x={hx - 16}
            y={hy - 14}
            width="33"
            height="6"
            rx="3"
            fill={p.base}
          />
          <path
            d={`M${hx - 7} ${hy - 14} L${hx + 8} ${hy - 14} L${hx + 5} ${hy - 100} L${hx + 0.5} ${hy - 112} L${hx - 4} ${hy - 100} Z`}
            fill="#1a0f0c"
          />
          <path
            d={`M${hx + 0.5} ${hy - 18} L${hx + 0.5} ${hy - 104}`}
            stroke={p.glow ?? p.accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d={`M${hx - 3} ${hy - 30} L${hx + 4} ${hy - 44} M${hx - 3} ${hy - 60} L${hx + 4} ${hy - 74}`}
            stroke={p.accent}
            strokeWidth="1.6"
            opacity="0.85"
          />
        </g>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Back items
// ---------------------------------------------------------------------------

function BackArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  switch (art) {
    /*
      Auroral Mantle — legendary. Not cloth: six ribbons of light hanging off
      the shoulders, each leaning at its own rate, so the whole thing moves
      like a curtain in a current rather than a cape in wind.
    */
    case "aurora-cape":
      return (
        <g>
          <path
            d="M78 84 Q100 76 122 84 L128 118 Q100 110 72 118 Z"
            fill={p.base}
            opacity="0.9"
          />
          {[-38, -23, -8, 8, 23, 38].map((spread, i) => (
            <g
              key={spread}
              className={animate ? "anim-wave" : undefined}
              style={
                animate
                  ? {
                      animationDelay: `${i * 0.42}s`,
                      animationDuration: `${3.6 + i * 0.32}s`,
                    }
                  : { opacity: 0.7 }
              }
            >
              <path
                d={`M${100 + spread * 0.7} 100
                    Q${100 + spread * 1.1} ${152 + i * 4} ${100 + spread * 1.35} ${226 - Math.abs(spread) * 0.5}
                    L${100 + spread * 1.35 + 13} ${226 - Math.abs(spread) * 0.5}
                    Q${100 + spread * 1.1 + 13} ${152 + i * 4} ${100 + spread * 0.7 + 13} 100 Z`}
                fill={i % 2 ? p.accent : (p.glow ?? p.accent)}
                opacity={0.42 + (i % 3) * 0.13}
              />
            </g>
          ))}
        </g>
      );

    /*
      Seraph Wings — mythical. Six of them in three pairs, and they beat by
      compressing vertically about the shoulder line. Rotating them instead
      pivots each wing off its own root and detaches it from the back.
    */
    case "seraph":
      return (
        <g>
          {[0, 1, 2].map((row) => (
            <g
              key={row}
              className={animate ? "anim-beat" : undefined}
              style={
                animate
                  ? {
                      animationDelay: `${row * 0.28}s`,
                      animationDuration: `${2.6 + row * 0.4}s`,
                    }
                  : undefined
              }
            >
              {/* They have to clear the torso. Tips 30px out disappeared behind
                  the shoulders and six wings read as a bit of fluff. */}
              {[-1, 1].map((dir) => (
                <g key={dir}>
                  {/* Up first, then out and down. Sweeping straight outward
                      from the shoulder produced six shapes hanging off the
                      ribs that read as a feathered cape, not wings — the arc
                      above the shoulder line is the whole silhouette. */}
                  <path
                    d={`M100 ${94 + row * 12}
                        Q${100 + dir * (30 + row * 4)} ${40 + row * 20} ${100 + dir * (64 + row * 5)} ${52 + row * 26}
                        Q${100 + dir * (56 + row * 4)} ${104 + row * 22} ${100 + dir * (26 + row * 6)} ${132 + row * 20}
                        Q${100 + dir * (22 + row * 3)} ${108 + row * 16} 100 ${100 + row * 12} Z`}
                    fill={row === 1 ? (p.glow ?? p.accent) : p.base}
                    opacity={0.94 - row * 0.15}
                  />
                  {[0, 1, 2].map((f) => (
                    <path
                      key={f}
                      d={`M100 ${98 + row * 12} Q${100 + dir * (30 + f * 6 + row * 4)} ${60 + row * 20 + f * 14} ${100 + dir * (54 - f * 8 + row * 5)} ${70 + row * 24 + f * 18}`}
                      stroke={p.accent}
                      strokeWidth="1.1"
                      fill="none"
                      opacity="0.5"
                    />
                  ))}
                </g>
              ))}
            </g>
          ))}
        </g>
      );

    /*
      Riftgate — secret, so it gets everything: a hole standing open behind
      the figure, a rune ring turning one way, an inner ring turning the other,
      and light going out of it in waves. The rarity tier adds the hue cycle
      on top, which is what nothing below secret does.
    */
    case "riftgate":
      return (
        <g>
          <circle cx="100" cy="130" r="62" fill={p.glow ?? p.accent} opacity="0.1" />
          <circle cx="100" cy="130" r="52" fill="#05030c" />
          <g
            className={animate ? "anim-spin" : undefined}
            style={{ transformOrigin: "100px 130px" }}
          >
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return (
                <rect
                  key={i}
                  x={100 + Math.cos(a) * 57 - 2}
                  y={130 + Math.sin(a) * 57 - 4}
                  width="4"
                  height={i % 2 ? 8 : 5}
                  rx="1"
                  fill={p.accent}
                  opacity="0.85"
                />
              );
            })}
          </g>
          <g
            className={animate ? "anim-spin" : undefined}
            style={{ transformOrigin: "100px 130px", animationDirection: "reverse", animationDuration: "9s" }}
          >
            {Array.from({ length: 9 }, (_, i) => {
              const a = (i / 9) * Math.PI * 2;
              return (
                <circle
                  key={i}
                  cx={100 + Math.cos(a) * 41}
                  cy={130 + Math.sin(a) * 41}
                  r="2.4"
                  fill={p.glow ?? p.accent}
                />
              );
            })}
          </g>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx="100"
              cy="130"
              r="44"
              fill="none"
              stroke={p.glow ?? p.accent}
              strokeWidth="1.6"
              className={animate ? "anim-ring" : undefined}
              style={{ transformOrigin: "100px 130px", animationDelay: `${i * 1.3}s` }}
            />
          ))}
        </g>
      );

    case "scarf":
      return (
        <g>
          <path
            d="M86 82 Q100 76 114 82 L112 94 Q100 88 88 94 Z"
            fill={p.base}
          />
          {/* Twice your height and permanently caught in a wind nobody else
              feels. Two tails at different rates so it never looks rigid. */}
          <g className={animate ? "anim-sway-wide" : undefined}>
            <path
              d="M88 90 Q62 108 52 148 Q46 178 56 198 Q52 168 64 142 Q76 112 94 96 Z"
              fill={p.base}
            />
            <path
              d="M88 92 Q66 110 58 146"
              stroke={p.accent}
              strokeWidth="1.4"
              fill="none"
              opacity="0.55"
            />
          </g>
          <g className={animate ? "anim-sway" : undefined}>
            <path
              d="M110 90 Q132 106 138 138 Q142 160 134 174 Q138 148 128 128 Q118 108 106 96 Z"
              fill={p.base}
              opacity="0.85"
            />
          </g>
        </g>
      );
    case "wings":
      return (
        <g className={animate ? "anim-sway" : undefined}>
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
      );
    case "tails":
      return (
        <g>
          {[-34, -18, 0, 18, 34].map((spread, i) => (
            <g
              key={spread}
              className={animate ? "anim-sway-wide" : undefined}
              style={
                animate
                  ? {
                      animationDelay: `${i * 0.34}s`,
                      animationDuration: `${2.6 + i * 0.35}s`,
                    }
                  : undefined
              }
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
      );
    case "starcloak":
      return (
        <g>
          <path
            d="M80 84 Q100 76 120 84 L134 206 Q100 220 66 206 Z"
            fill={p.base}
          />
          <g className={animate ? "anim-glow" : undefined}>
            <path
              d="M80 84 Q100 76 120 84 L134 206 Q100 220 66 206 Z"
              fill={p.glow ?? p.accent}
              opacity="0.18"
            />
          </g>
          {[
            [78, 108],
            [92, 126],
            [112, 116],
            [122, 150],
            [86, 168],
            [106, 186],
            [126, 178],
            [72, 190],
          ].map(([x, y], i) => (
            <g
              key={`${x}-${y}`}
              className={animate ? "anim-glow" : undefined}
              style={animate ? { animationDelay: `${i * 0.4}s` } : undefined}
            >
              <circle
                cx={x}
                cy={y}
                r={i % 3 === 0 ? 2.2 : 1.3}
                fill="#f8fafc"
              />
            </g>
          ))}
        </g>
      );
  }
  return <LegacyBackArt art={art} p={p} />;
}

function LegacyBackArt({ art, p }: { art: string; p: Palette }) {
  switch (art) {
    case "short-cloak":
      return (
        <path
          d="M74 90 Q100 82 126 90 L132 136 Q100 128 68 136 Z"
          fill={p.base}
          opacity="0.95"
        />
      );
    case "tattered":
      return (
        <g>
          <path
            d="M72 90 Q100 80 128 90 L140 176 L128 160 L118 182 L108 158 L96 180 L84 156 L72 174 L60 176 Z"
            fill={p.base}
            opacity="0.95"
          />
          <path
            d="M100 86 L100 168"
            stroke={p.accent}
            strokeWidth="1.5"
            opacity="0.4"
          />
        </g>
      );
    case "banner":
      return (
        <g>
          <path
            d="M72 90 Q100 80 128 90 L138 186 Q100 176 62 186 Z"
            fill={p.base}
          />
          <path
            d="M100 96 L100 180"
            stroke={p.accent}
            strokeWidth="3"
            opacity="0.85"
          />
          <path
            d="M86 120 L114 120 M90 140 L110 140"
            stroke={p.accent}
            strokeWidth="2.5"
            opacity="0.7"
          />
        </g>
      );
    case "heavy-cape":
      return (
        <g>
          <path
            d="M66 88 Q100 76 134 88 L146 200 Q100 188 54 200 Z"
            fill={p.base}
          />
          <path
            d="M60 194 L140 194"
            stroke={p.accent}
            strokeWidth="5"
            opacity="0.9"
          />
          <path
            d="M100 88 L100 192"
            stroke={p.accent}
            strokeWidth="1.5"
            opacity="0.35"
          />
        </g>
      );
    case "ember-cape":
      return (
        <g>
          <path
            d="M64 88 Q100 74 136 88 L150 204 Q100 190 50 204 Z"
            fill="#2a1410"
          />
          <path
            d="M50 200 Q100 186 150 200"
            fill="none"
            stroke={p.glow ?? p.accent}
            strokeWidth="4"
          />
          <path
            d="M76 120 L72 168 M100 112 L100 176 M124 120 L128 168"
            stroke={p.accent}
            strokeWidth="2"
            opacity="0.75"
          />
        </g>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Auras & companions
// ---------------------------------------------------------------------------

function AuraArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  switch (art) {
    /*
      Umbral Shroud — legendary.

      Smoke rather than sparkle: plumes that grow, drift sideways and thin out
      as they climb, over a pool of shadow that never leaves the floor. Each
      plume gets its own delay and its own drift so the column never pulses in
      lockstep, which is what would make it read as a loop.
    */
    case "shadow":
      return (
        <g>
          <ellipse cx="100" cy="250" rx="58" ry="11" fill={p.base} opacity="0.55" />
          <ellipse cx="100" cy="250" rx="34" ry="6" fill="#000" opacity="0.6" />
          {/*
            `lift` is what a still frame looks like. Frozen at the pool the
            seven plumes stack into one grey puddle, which is what the item
            preview and every reduced-motion render would show — so when the
            animation is off each plume is drawn part-way up its own path
            instead, and the column reads without moving.
          */}
          {[
            { x: 62, y: 240, r: 13, delay: 0, drift: "-9px", lift: 44, fade: 0.16 },
            { x: 138, y: 244, r: 11, delay: 0.9, drift: "10px", lift: 36, fade: 0.2 },
            { x: 84, y: 246, r: 15, delay: 1.7, drift: "-4px", lift: 26, fade: 0.26 },
            { x: 118, y: 238, r: 12, delay: 2.6, drift: "7px", lift: 18, fade: 0.3 },
            { x: 100, y: 248, r: 16, delay: 3.4, drift: "-2px", lift: 10, fade: 0.34 },
            { x: 48, y: 246, r: 9, delay: 4.2, drift: "-12px", lift: 54, fade: 0.12 },
            { x: 152, y: 248, r: 10, delay: 5, drift: "13px", lift: 4, fade: 0.38 },
          ].map((plume) => (
            <g
              key={`${plume.x}-${plume.delay}`}
              className={animate ? "anim-smoke" : undefined}
              transform={
                animate
                  ? undefined
                  : `translate(${(parseFloat(plume.drift) * plume.lift) / 54} ${-plume.lift})`
              }
              style={
                animate
                  ? ({
                      animationDelay: `${plume.delay}s`,
                      ["--drift" as string]: plume.drift,
                    } as React.CSSProperties)
                  : { opacity: plume.fade }
              }
            >
              <ellipse
                cx={plume.x}
                cy={plume.y}
                rx={plume.r}
                ry={plume.r * 0.74}
                fill={p.base}
              />
              <ellipse
                cx={plume.x + plume.r * 0.3}
                cy={plume.y - plume.r * 0.4}
                rx={plume.r * 0.62}
                ry={plume.r * 0.5}
                fill={p.accent}
                opacity="0.5"
              />
            </g>
          ))}
        </g>
      );

    /*
      Solar Flare — mythical. One tier up, so it gets a second kind of motion:
      a corona that turns, motes that orbit it, and a ring that keeps going out.
    */
    case "solar":
      return (
        <g>
          <ellipse cx="100" cy="250" rx="52" ry="9" fill={p.glow ?? p.accent} opacity="0.2" />
          <g className={animate ? "anim-spin" : undefined} style={{ transformOrigin: "100px 140px" }}>
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              const inner = 44;
              const outer = i % 2 === 0 ? 64 : 54;
              return (
                <path
                  key={i}
                  d={`M${100 + Math.cos(a) * inner} ${140 + Math.sin(a) * inner} L${100 + Math.cos(a) * outer} ${140 + Math.sin(a) * outer}`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              );
            })}
          </g>
          {[0, 1, 2, 3].map((i) => (
            <g
              key={i}
              className={animate ? "anim-orbit" : undefined}
              style={
                animate
                  ? ({
                      transformOrigin: "100px 140px",
                      animationDelay: `${i * 1.75}s`,
                      ["--r" as string]: `${38 + i * 7}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <circle cx="100" cy="140" r={3 - i * 0.4} fill={p.glow ?? p.accent} />
            </g>
          ))}
          <circle
            cx="100"
            cy="140"
            r="40"
            fill="none"
            stroke={p.accent}
            strokeWidth="1.6"
            className={animate ? "anim-ring" : undefined}
            style={{ transformOrigin: "100px 140px" }}
          />
        </g>
      );

    /*
      Eclipse — secret, and the only art that gets all of it: a dark disc, a
      corona that turns the other way, orbiting motes, two rings out of phase
      and a shimmer over the top. The rarity tier adds the hue cycle.
    */
    case "eclipse":
      return (
        <g>
          <ellipse cx="100" cy="250" rx="56" ry="10" fill="#000" opacity="0.5" />
          {/*
            Big enough to be an eclipse rather than a rumour. The figure is
            about 46px across at the shoulders, so a 38px disc behind it is
            entirely hidden and only the spokes ever showed — the item looked
            like a sunburst with no sun in it.
          */}
          <circle cx="100" cy="122" r="70" fill={p.glow ?? p.accent} opacity="0.14" />
          <g className={animate ? "anim-spin" : undefined} style={{ transformOrigin: "100px 122px", animationDirection: "reverse" }}>
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return (
                <path
                  key={i}
                  d={`M${100 + Math.cos(a) * 60} ${122 + Math.sin(a) * 60} L${100 + Math.cos(a) * (i % 3 === 0 ? 86 : 72)} ${122 + Math.sin(a) * (i % 3 === 0 ? 86 : 72)}`}
                  stroke={p.glow ?? p.accent}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.75"
                />
              );
            })}
          </g>
          <circle cx="100" cy="122" r="58" fill="#05050a" />
          <circle
            cx="100"
            cy="122"
            r="58"
            fill="none"
            stroke={p.glow ?? p.accent}
            strokeWidth="3"
            className={animate ? "anim-shimmer" : undefined}
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g
              key={i}
              className={animate ? "anim-orbit" : undefined}
              style={
                animate
                  ? ({
                      transformOrigin: "100px 122px",
                      animationDelay: `${i * 1.16}s`,
                      animationDuration: `${6 + (i % 3)}s`,
                      ["--r" as string]: `${64 + (i % 3) * 10}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <circle cx="100" cy="122" r="2.8" fill={p.accent} />
            </g>
          ))}
          {[0, 1].map((i) => (
            <circle
              key={i}
              cx="100"
              cy="122"
              r="60"
              fill="none"
              stroke={p.accent}
              strokeWidth="1.6"
              className={animate ? "anim-ring" : undefined}
              style={{ transformOrigin: "100px 122px", animationDelay: `${i * 1.9}s` }}
            />
          ))}
        </g>
      );

    case "sakura":
      return (
        <g>
          {Array.from({ length: 11 }, (_, i) => {
            const x = 24 + ((i * 37) % 156);
            return (
              <g
                key={i}
                className={animate ? "anim-petal" : undefined}
                style={
                  animate
                    ? { animationDelay: `${(i * 0.47) % 5.2}s` }
                    : undefined
                }
              >
                <ellipse
                  cx={x}
                  cy={40 + (i % 4) * 22}
                  rx="3.4"
                  ry="2.2"
                  fill={p.accent}
                  opacity="0.9"
                />
              </g>
            );
          })}
        </g>
      );
    case "lightning":
      return (
        <g>
          {[
            [46, 96],
            [154, 108],
            [58, 176],
            [148, 168],
          ].map(([x, y], i) => (
            <g
              key={`${x}-${y}`}
              className={animate ? "anim-flicker" : undefined}
              style={animate ? { animationDelay: `${i * 0.53}s` } : undefined}
            >
              <path
                d={`M${x} ${y} l7 12 l-5 1 l8 15 l-13 -14 l5 -1 Z`}
                fill={p.glow ?? p.accent}
              />
            </g>
          ))}
          <g className={animate ? "anim-glow" : undefined}>
            <ellipse
              cx="100"
              cy="150"
              rx="66"
              ry="86"
              fill={p.glow ?? p.accent}
              opacity="0.08"
            />
          </g>
        </g>
      );
    case "voidbloom":
      return (
        <g>
          <g className={animate ? "anim-glow" : undefined}>
            <ellipse
              cx="100"
              cy="150"
              rx="60"
              ry="80"
              fill={p.glow ?? p.accent}
              opacity="0.12"
            />
          </g>
          {Array.from({ length: 9 }, (_, i) => {
            const x = 34 + ((i * 43) % 132);
            return (
              <g
                key={i}
                className={animate ? "anim-rise" : undefined}
                style={
                  animate
                    ? { animationDelay: `${(i * 0.38) % 3.4}s` }
                    : undefined
                }
              >
                {/* Falls upward, which is the tell that it is not petals. */}
                <ellipse
                  cx={x}
                  cy={210}
                  rx="2.8"
                  ry="4"
                  fill={p.accent}
                  opacity="0.85"
                />
              </g>
            );
          })}
        </g>
      );
  }
  return <LegacyAuraArt art={art} p={p} animate={animate} />;
}

function LegacyAuraArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  const motes = [
    { x: 56, d: "0s" },
    { x: 78, d: "0.7s" },
    { x: 122, d: "1.3s" },
    { x: 146, d: "0.4s" },
    { x: 100, d: "1.8s" },
  ];
  switch (art) {
    case "dust":
    case "embers":
    case "starfall":
      return (
        <g>
          {motes.map((m, i) => (
            <circle
              key={m.x}
              cx={m.x}
              cy={230 - i * 6}
              r={art === "starfall" ? 2.6 : 2}
              fill={p.glow ?? p.accent}
              className={animate ? "animate-ember" : undefined}
              style={animate ? { animationDelay: m.d } : { opacity: 0.7 }}
            />
          ))}
          <ellipse
            cx="100"
            cy="250"
            rx="52"
            ry="8"
            fill={p.glow ?? p.accent}
            opacity="0.12"
          />
        </g>
      );
    case "smoke":
      return (
        <g opacity="0.35">
          <ellipse cx="100" cy="244" rx="60" ry="14" fill={p.accent} />
          <ellipse
            cx="72"
            cy="232"
            rx="22"
            ry="10"
            fill={p.accent}
            opacity="0.6"
          />
          <ellipse
            cx="130"
            cy="236"
            rx="26"
            ry="11"
            fill={p.accent}
            opacity="0.5"
          />
        </g>
      );
    case "frost":
      return (
        <g>
          <ellipse
            cx="100"
            cy="250"
            rx="54"
            ry="9"
            fill={p.accent}
            opacity="0.18"
          />
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
      );
    default:
      return (
        <ellipse cx="100" cy="250" rx="44" ry="7" fill="#000" opacity="0.35" />
      );
  }
}

function CompanionArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  switch (art) {
    /*
      Cinderdrake — mythical. Perched on the left, wings folded and beating
      slowly, with heat coming off the back. Sits on the ground like the fox
      rather than hovering like the wisp, so the two never read as the same
      companion in a different colour.
    */
    case "drake":
      return (
        <g>
          <ellipse cx="42" cy="240" rx="17" ry="5" fill="#000" opacity="0.4" />
          <path
            d="M28 238 Q28 218 42 214 Q58 216 56 236 L54 240 L30 240 Z"
            fill={p.base}
          />
          {/* Neck, then a wedge skull with a snout and a swept horn. Without
              the snout it is a bird, which is what the first version was. */}
          <path d="M50 220 Q56 206 50 196 Q60 196 62 210 Q62 220 56 226 Z" fill={p.base} />
          <path d="M50 198 L64 192 L72 198 L64 204 L52 204 Z" fill={p.base} />
          <path d="M64 199 L74 201 L64 203 Z" fill={p.accent} />
          <path d="M54 194 Q50 186 44 184 Q52 188 54 196 Z" fill={p.base} />
          <circle cx="58" cy="197" r="1.7" fill={p.glow ?? p.accent} />
          <g
            className={animate ? "anim-beat" : undefined}
            style={{ transformOrigin: "40px 216px" }}
          >
            <path d="M34 218 Q18 200 12 182 Q30 194 42 212 Z" fill={p.accent} opacity="0.92" />
            <path d="M40 216 Q30 198 28 180 Q42 192 48 210 Z" fill={p.accent} opacity="0.7" />
          </g>
          <path d="M28 236 Q12 240 6 232 Q16 244 28 242 Z" fill={p.base} />
          {[0, 1, 2].map((i) => (
            <g
              key={i}
              className={animate ? "anim-rise" : undefined}
              style={
                animate
                  ? { animationDelay: `${i * 1.1}s`, animationDuration: "3.6s" }
                  : { opacity: 0.4 }
              }
            >
              <circle cx={32 + i * 9} cy="214" r="1.8" fill={p.glow ?? p.accent} />
            </g>
          ))}
        </g>
      );

    /*
      The Watcher — secret. Not an animal: an eye in a shell of rings, one
      turning each way, floating at head height. It gets three kinds of motion
      because it is the top of the ladder — float, spin and pulse — and the
      rarity tier cycles the hue over all of it.
    */
    case "watcher":
      return (
        <g className={animate ? "anim-float" : undefined}>
          <g className={animate ? "anim-glow" : undefined}>
            <circle cx="162" cy="80" r="24" fill={p.glow ?? p.accent} opacity="0.16" />
          </g>
          <g
            className={animate ? "anim-spin" : undefined}
            style={{ transformOrigin: "162px 80px", animationDuration: "11s" }}
          >
            <ellipse
              cx="162"
              cy="80"
              rx="19"
              ry="7"
              fill="none"
              stroke={p.accent}
              strokeWidth="1.6"
            />
          </g>
          <g
            className={animate ? "anim-spin" : undefined}
            style={{
              transformOrigin: "162px 80px",
              animationDuration: "7s",
              animationDirection: "reverse",
            }}
          >
            <ellipse
              cx="162"
              cy="80"
              rx="7"
              ry="19"
              fill="none"
              stroke={p.accent}
              strokeWidth="1.6"
            />
          </g>
          <circle cx="162" cy="80" r="11" fill="#05030c" />
          <circle
            cx="162"
            cy="80"
            r="6"
            fill={p.glow ?? p.accent}
            className={animate ? "anim-shimmer" : undefined}
          />
          <circle cx="162" cy="80" r="2.4" fill="#05030c" />
          {[0, 1, 2, 3].map((i) => (
            <g
              key={i}
              className={animate ? "anim-orbit" : undefined}
              style={
                animate
                  ? ({
                      transformOrigin: "162px 80px",
                      animationDelay: `${i * 2.2}s`,
                      animationDuration: "8.8s",
                      ["--r" as string]: `${24 + (i % 2) * 6}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <circle cx="162" cy="80" r="1.8" fill="#f8fafc" />
            </g>
          ))}
        </g>
      );

    case "fox":
      return (
        <g className={animate ? "anim-float" : undefined}>
          {/* Sits just out of reach, on the ground, watching. */}
          <ellipse cx="42" cy="238" rx="14" ry="5" fill="#000" opacity="0.35" />
          <path
            d="M32 236 Q34 220 44 218 Q54 220 54 234 L52 238 L34 238 Z"
            fill={p.base}
          />
          <path d="M40 220 l-4 -12 l9 5 Z" fill={p.base} />
          <path d="M50 220 l5 -11 l-1 10 Z" fill={p.base} />
          <ellipse cx="41" cy="228" rx="1.6" ry="2" fill="#0b0b0f" />
          <ellipse cx="49" cy="228" rx="1.6" ry="2" fill="#0b0b0f" />
          <path d="M45 232 l-2 2 l4 0 Z" fill="#0b0b0f" />
          {[0, 1, 2].map((i) => (
            <g
              key={i}
              className={animate ? "anim-sway-wide" : undefined}
              style={animate ? { animationDelay: `${i * 0.4}s` } : undefined}
            >
              <path
                d={`M32 234 Q${18 - i * 5} ${228 - i * 8} ${14 - i * 6} ${212 - i * 10}`}
                stroke={p.base}
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
              />
              <circle
                cx={14 - i * 6}
                cy={212 - i * 10}
                r="3.4"
                fill="#f8fafc"
              />
            </g>
          ))}
        </g>
      );
    case "phoenix":
      return (
        <g className={animate ? "anim-float" : undefined}>
          <g className={animate ? "anim-glow" : undefined}>
            <ellipse
              cx="158"
              cy="86"
              rx="26"
              ry="22"
              fill={p.glow ?? p.accent}
              opacity="0.2"
            />
          </g>
          <path d="M150 92 Q158 78 168 86 Q162 96 152 96 Z" fill={p.base} />
          <path
            d="M152 90 Q136 74 130 56 Q146 68 156 84 Z"
            fill={p.accent}
            opacity="0.95"
          />
          <path
            d="M164 88 Q178 76 184 60 Q172 76 166 86 Z"
            fill={p.accent}
            opacity="0.8"
          />
          <path
            d="M154 96 Q152 116 142 130 Q156 118 158 98 Z"
            fill={p.accent}
            opacity="0.7"
          />
          <circle cx="163" cy="86" r="1.6" fill="#0b0b0f" />
        </g>
      );
  }
  return <LegacyCompanionArt art={art} p={p} animate={animate} />;
}

function LegacyCompanionArt({
  art,
  p,
  animate,
}: {
  art: string;
  p: Palette;
  animate: boolean;
}) {
  switch (art) {
    case "wisp":
      return (
        <g className={animate ? "animate-pulse-slow" : undefined}>
          <circle
            cx="42"
            cy="180"
            r="9"
            fill={p.glow ?? p.accent}
            opacity="0.35"
          />
          <circle cx="42" cy="180" r="4.5" fill={p.glow ?? p.accent} />
        </g>
      );
    case "raven":
      return (
        <g>
          <ellipse cx="40" cy="196" rx="12" ry="9" fill={p.base} />
          <circle cx="30" cy="190" r="6" fill={p.base} />
          <path d="M24 189 L17 191 L24 193 Z" fill={p.accent} />
          <circle cx="28.5" cy="188.5" r="1.4" fill={p.accent} />
          <path
            d="M42 190 Q56 182 58 196 Q48 194 42 200 Z"
            fill={p.accent}
            opacity="0.85"
          />
        </g>
      );
    case "hound":
      return (
        <g>
          <ellipse cx="42" cy="226" rx="18" ry="10" fill={p.base} />
          <circle cx="26" cy="216" r="8" fill={p.base} />
          <path d="M20 210 L18 202 L26 208 Z" fill={p.base} />
          <path d="M30 210 L32 202 L36 209 Z" fill={p.base} />
          <circle cx="22" cy="216" r="1.6" fill={p.glow ?? p.accent} />
          <path
            d="M58 222 Q68 214 64 208"
            stroke={p.base}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M32 234 L32 244 M50 234 L50 244"
            stroke={p.base}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------

/**
 * Stance.
 *
 * Twice now this slot has been a lie. First as two-degree rotations that were
 * present in the markup and invisible on a phone; then as whole-figure tilts,
 * which are visible but are not poses — the figure leans, and a lean is not
 * the difference between standing at rest and holding a guard. Somebody
 * unlocking a mythical pose still saw the same drawing at a slightly
 * different angle.
 *
 * So the joints move. Each pose sets an angle at each shoulder and each
 * elbow, and the gloves and the weapon are carried along by the arm holding
 * them, which is what makes it read as a body doing something rather than a
 * picture being rotated. Head and stance move too.
 *
 * The angles are bounded rather than theatrical, and the reason is the
 * weapon: it is drawn in the hand's frame, so an arm swung through 150° takes
 * a sword through 150° with it and buries the point in the floor. Within
 * about sixty degrees of travel a blade still reads as held. That is the real
 * ceiling on this approach, and posing a weapon independently of the hand
 * that holds it is the job after this one.
 */
export interface PoseSpec {
  /** Whole figure, still useful for height and lean on top of the joints. */
  figure?: string;
  left?: ArmAngles;
  right?: ArmAngles;
  /** Neck and skull, about the base of the neck. */
  head?: string;
  /** Legs and boots together, about the floor. */
  stance?: string;
  /** Degrees to swing the weapon, chosen for the stance rather than inherited. */
  blade?: number;
}

const POSES: Record<string, PoseSpec> = {
  // Feet set, weight even. The reference every other pose departs from.
  ready: {},
  // Hands up, chin down: elbows out, forearms drawn in across the chest.
  guard: {
    figure: "translate(0 3) rotate(-4 100 252) scale(0.99)",
    left: { shoulder: 40, elbow: -100 },
    right: { shoulder: -40, elbow: 100 },
    blade: 12,
    head: "translate(0 4) rotate(-4 100 86)",
  },
  // Between sets, breathing. One hand to the hip, weight off one leg.
  rest: {
    figure: "translate(-4 5) rotate(4 100 252) scale(0.985)",
    left: { shoulder: 5, elbow: -70 },
    right: { shoulder: -10, elbow: 15 },
    blade: 28,
    head: "rotate(9 100 86)",
    stance: "rotate(-4 100 252)",
  },
  // Chest up. Earned it. Arms open, standing tall.
  heroic: {
    figure: "translate(0 -6) rotate(-2 100 252) scale(1.06)",
    left: { shoulder: 45, elbow: -20 },
    right: { shoulder: -45, elbow: 20 },
    blade: -40,
    head: "rotate(-3 100 86)",
  },
  // Raised blade: the weapon arm lifts and cocks back, the other stays low.
  raised: {
    figure: "translate(3 -3) rotate(-8 100 252) scale(1.02)",
    left: { shoulder: 25, elbow: 15 },
    right: { shoulder: -52, elbow: -28 },
    blade: -26,
    head: "rotate(-8 100 86)",
  },
  // Braced low and wide, ready to take a hit.
  braced: {
    figure: "translate(0 6) rotate(2 100 252) scale(1.03)",
    left: { shoulder: 36, elbow: -36 },
    right: { shoulder: -36, elbow: 36 },
    blade: 18,
    head: "translate(0 3)",
    stance: "translate(100 252) scale(1.14 0.94) translate(-100 -252)",
  },
  // Side-on, hand at the hilt, nothing drawn yet.
  sheathed: {
    figure: "translate(-5 1) rotate(9 100 252) scale(0.98)",
    left: { shoulder: 10, elbow: -60 },
    right: { shoulder: -8, elbow: -30 },
    blade: 52,
    head: "rotate(6 100 86)",
    stance: "rotate(3 100 252)",
  },
  // Legendary. Everything wide and low: arms out and away from the ribs,
  // stance spread, weapon carried point-down beside the leg.
  titan: {
    // Scaled about the ground plane, not about the origin. `scale(1.09)` on
    // its own moves the feet 22px down and the whole figure 9px right, which
    // pushed this stance off the bottom of the canvas.
    figure: "translate(100 252) scale(1.09) translate(-100 -252)",
    left: { shoulder: 24, elbow: 12 },
    right: { shoulder: -24, elbow: -12 },
    blade: 34,
    head: "translate(0 2)",
    stance: "translate(100 252) scale(1.2 0.96) translate(-100 -252)",
  },
  // Rising. Both feet still on the floor, only just.
  ascend: {
    figure: "translate(0 -13) rotate(-1 100 252) scale(1.07)",
    left: { shoulder: 55, elbow: -25 },
    right: { shoulder: -55, elbow: 25 },
    blade: -28,
    head: "rotate(-4 100 86)",
  },
  // Secret. Arms fully open, head tipped back, the whole figure lifted off
  // the floor plane — the only stance that does not stand on anything.
  apotheosis: {
    figure: "translate(100 252) scale(1.1) translate(-100 -252) translate(0 -18)",
    left: { shoulder: 62, elbow: -14 },
    right: { shoulder: -62, elbow: 14 },
    blade: -46,
    head: "rotate(-11 100 86)",
    stance: "translate(100 252) scale(0.9 1.02) translate(-100 -252)",
  },
};

/**
 * Where a pose puts the weapon.
 *
 * Deliberately NOT the arm's transform. The weapon is drawn in the hand's
 * frame, so rigidly rotating it with the arm swings a sword through however
 * many degrees the shoulder moved — which put the blade through the figure's
 * own head on two of the eight stances, and capped every arm angle at
 * something too small to read as a pose.
 *
 * So the weapon follows the hand's POSITION and takes its angle from the pose
 * itself. That is both better looking and the thing that frees the arms to
 * move properly: a raised blade can now be a raised blade.
 */
function weaponTransform(
  rightArm: ReturnType<typeof armTransforms>,
  blade: number | undefined,
) {
  const wrist = JOINTS.wrist.right;
  const moved = movedBy(wrist, rightArm.lower.rotations);
  const dx = Number((moved.x - wrist.x).toFixed(2));
  const dy = Number((moved.y - wrist.y).toFixed(2));
  const parts: string[] = [];
  if (dx !== 0 || dy !== 0) parts.push(`translate(${dx} ${dy})`);
  if (blade) parts.push(`rotate(${blade} ${wrist.x} ${wrist.y})`);
  return parts.join(" ");
}

/**
 * The rarity ladder, made visible.
 *
 * Every item from legendary up gets motion on top of whatever its own art
 * does, and the tiers escalate: legendary breathes, mythical breathes harder
 * and runs a little wider, secret does both and cycles hue. Below legendary
 * this renders nothing at all — the point of the ladder is that the top of it
 * looks different, which it cannot if everything glows.
 *
 * Wrapping rather than threading rarity through ten art components means a new
 * legendary item is still a data row, and an existing one gets the treatment
 * without being touched.
 */
const TIERED: Partial<Record<Rarity, string>> = {
  legendary: "rar-legendary",
  mythical: "rar-mythical",
  secret: "rar-secret",
};

/**
 * What a legendary stance looks like.
 *
 * A pose is the one slot with nothing of its own to draw — the stance IS the
 * item — so there is no artwork for the tier to wrap, and the ladder stopped
 * dead at the pose slot until this existed.
 *
 * Wrapping the whole figure instead was the obvious alternative and is worse:
 * the secret tier cycles hue, and applied to the warrior it turns skin green
 * on the way round. So the ground reacts rather than the person: a pool of
 * light at the feet, rings leaving it, and motes coming off the floor.
 */
function PoseGround({ p, animate }: { p: Palette; animate: boolean }) {
  const lit = p.glow ?? p.accent;
  return (
    <g>
      <ellipse cx="100" cy="252" rx="52" ry="12" fill={lit} opacity="0.16" />
      <ellipse cx="100" cy="252" rx="30" ry="7" fill={lit} opacity="0.3" />
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx="100"
          cy="252"
          rx="46"
          ry="11"
          fill="none"
          stroke={lit}
          strokeWidth="1.6"
          className={animate ? "anim-ring" : undefined}
          style={{ transformOrigin: "100px 252px", animationDelay: `${i * 1.26}s` }}
          opacity={animate ? undefined : 0.35 - i * 0.1}
        />
      ))}
      {[
        { x: 66, d: 0 },
        { x: 88, d: 1.1 },
        { x: 112, d: 2.2 },
        { x: 134, d: 3.3 },
      ].map((m) => (
        <g
          key={m.x}
          className={animate ? "anim-rise" : undefined}
          style={
            animate
              ? { animationDelay: `${m.d}s`, animationDuration: "4.4s" }
              : { opacity: 0.5 }
          }
        >
          <circle cx={m.x} cy="246" r="2.2" fill={lit} />
        </g>
      ))}
    </g>
  );
}

function Tiered({
  item,
  animate,
  children,
}: {
  item: CosmeticItem | undefined;
  animate: boolean;
  children: ReactNode;
}) {
  const tier = item ? TIERED[item.rarity] : undefined;
  if (!tier || !animate) return <>{children}</>;
  return (
    <g
      className={tier}
      data-rarity={item?.rarity}
      style={{ ["--tier-glow" as string]: item?.palette.glow ?? item?.palette.accent }}
    >
      {children}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface WarriorProps {
  equipped: Partial<Record<Slot, string | null>>;
  className?: string;
  /** Suppresses the ambient animation regardless of motion preference. */
  still?: boolean;
  title?: string;
  /**
   * How much muscle the figure carries, 0 → 1. Derived from level via
   * `buildFromLevel`, so it only ever moves because sessions were logged.
   */
  build?: number;
  /** Which figure to draw. Defaults to masculine for saves made before the choice existed. */
  frame?: Figure;
}

export function Warrior({
  equipped,
  className,
  still,
  title,
  build = 0,
  frame = "masculine",
}: WarriorProps) {
  const reduced = useReducedMotion();
  const animate = !reduced && !still;
  const glowId = useId();

  const item = (slot: Slot) =>
    equipped[slot] ? ITEM_BY_ID[equipped[slot] as string] : undefined;
  const body = item("body");
  const head = item("head");
  const face = item("face");
  const hands = item("hands");
  const feet = item("feet");
  const weapon = item("weapon");
  const back = item("back");
  const aura = item("aura");
  const companion = item("companion");
  const pose = item("pose");
  const posed = POSES[pose?.art ?? "ready"] ?? POSES.ready;

  const heavy =
    body?.art === "heavy-plate" ||
    body?.art === "ember-plate" ||
    body?.art === "mecha";
  const arms = { left: posed.left ?? NEUTRAL_ARM, right: posed.right ?? NEUTRAL_ARM };
  const leftArm = armTransforms("left", build, frame, heavy, arms.left);
  const rightArm = armTransforms("right", build, frame, heavy, arms.right);
  // Stagger the breath per instance so two warriors on one screen — the Forge
  // card and an inventory preview — do not inhale in lockstep.
  const breathDelay =
    -((glowId.replace(/\D/g, "").slice(-2) as unknown as number) % 40) / 10;
  const label = [
    head?.name && head.art !== "none" ? head.name : null,
    body?.name,
    weapon?.name && weapon.art !== "none"
      ? `wielding ${weapon.name}`
      : "bare-handed",
  ]
    .filter(Boolean)
    .join(", ");

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

      {aura && (
        <Tiered item={aura} animate={animate}>
          <AuraArt
            art={aura.art}
            p={paletteOf(aura, { base: "#666", accent: "#999" })}
            animate={animate}
          />
        </Tiered>
      )}

      {pose && TIERED[pose.rarity] && (
        <Tiered item={pose} animate={animate}>
          <PoseGround
            p={paletteOf(pose, { base: "#666", accent: "#999" })}
            animate={animate}
          />
        </Tiered>
      )}

      {/*
        Stature. Scaled about the ground plane at y = 252, so the feet stay
        planted and every piece of gear scales with the body instead of
        floating off it. Applied outside the pose group so the two transforms
        compose rather than fight.
      */}
      <g
        transform={
          frame === "feminine" ? "translate(0 8.44) scale(0.966)" : undefined
        }
      >
        <g transform={posed.figure || undefined}>
          {back && (
            <Tiered item={back} animate={animate}>
              <BackArt
                art={back.art}
                p={paletteOf(back, { base: CLOTH, accent: "#666" })}
                animate={animate}
              />
            </Tiered>
          )}
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
          <g transform={posed.head || undefined}>
            <FrameHair frame={frame} layer="behind" animate={animate} />
          </g>
          {/* Legs and boots move together, or a braced stance leaves its
              footwear standing where the feet used to be. */}
          <g transform={posed.stance || undefined}>
            <Body heavy={heavy} build={build} frame={frame} legsOnly />
            {feet && (
              <Tiered item={feet} animate={animate}>
                <FeetArt
                  art={feet.art}
                  p={paletteOf(feet, { base: CLOTH, accent: "#777" })}
                  animate={animate}
                />
              </Tiered>
            )}
          </g>
          <g
            className={animate ? "anim-breathe" : undefined}
            style={animate ? { animationDelay: `${breathDelay}s` } : undefined}
          >
            <Body
              heavy={heavy}
              build={build}
              frame={frame}
              upperOnly
              arms={arms}
              head={posed.head}
            />
            {body && (
              <Tiered item={body} animate={animate}>
                <BodyArt
                  art={body.art}
                  p={paletteOf(body, { base: CLOTH, accent: "#777" })}
                  animate={animate}
                  frame={frame}
                />
              </Tiered>
            )}
            <g transform={posed.head || undefined}>
              <FrameHair frame={frame} layer="crown" animate={animate} />
              {head && head.art !== "none" && (
                <Tiered item={head} animate={animate}>
                  <HeadArt
                    art={head.art}
                    p={paletteOf(head, { base: "#2b2b31", accent: "#888" })}
                    animate={animate}
                  />
                </Tiered>
              )}
              <Tiered item={face} animate={animate}>
                <FaceArt
                  art={face?.art ?? "stoic"}
                  p={paletteOf(face, { base: "#2b2b31", accent: "#888" })}
                  animate={animate}
                />
              </Tiered>
            </g>
            {/* One glove per hand, each carried by its own arm. */}
            {hands &&
              (["left", "right"] as const).map((side) => (
                <g
                  key={side}
                  data-part={`glove-${side}`}
                  transform={
                    (side === "left" ? leftArm : rightArm).lower.forward || undefined
                  }
                >
                  <Tiered item={hands} animate={animate}>
                    <HandsArt
                      art={hands.art}
                      p={paletteOf(hands, { base: CLOTH, accent: "#888" })}
                      animate={animate}
                      side={side}
                    />
                  </Tiered>
                </g>
              ))}
            {weapon && weapon.art !== "none" && (
              <g data-part="weapon" transform={weaponTransform(rightArm, posed.blade) || undefined}>
                <Tiered item={weapon} animate={animate}>
                  <WeaponArt
                    art={weapon.art}
                    p={paletteOf(weapon, { base: "#8a8a94", accent: "#c9c9d2" })}
                    animate={animate}
                  />
                </Tiered>
              </g>
            )}
          </g>
        </g>
      </g>

      {companion && (
        <Tiered item={companion} animate={animate}>
          <CompanionArt
            art={companion.art}
            p={paletteOf(companion, { base: "#3a3a44", accent: "#888" })}
            animate={animate}
          />
        </Tiered>
      )}
    </svg>
  );
}

/** Small isolated preview of a single item, used in inventory and pack reveals. */
export function ItemPreview({
  item,
  className,
  frame = "masculine",
}: {
  item: CosmeticItem;
  className?: string;
  frame?: Figure;
}) {
  const base: Partial<Record<Slot, string | null>> = {
    face: "face-recruit",
    head: "head-none",
    body: "body-tunic",
    hands: "hands-wraps",
    feet: "feet-wraps",
    weapon: "weapon-none",
    back: "back-none",
    aura: "aura-none",
    companion: "companion-none",
    pose: "pose-ready",
  };
  return (
    <Warrior
      equipped={{ ...base, [item.slot]: item.id }}
      className={className}
      frame={frame}
      still
      title={`Preview of ${item.name}`}
    />
  );
}
