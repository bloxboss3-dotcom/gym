import * as RIG from '@/character/rig'
import type { Rarity } from '@/types'

/**
 * The move collection.
 *
 * Each entry pairs a technique with the rig animation that performs it. There
 * is no fight to win with them — you unlock a move and you watch your warrior
 * do it, which is the only thing here that has to be good.
 *
 * That changes what "rarity" means. It is not power, because nothing is being
 * fought: it is how much of a showpiece the move is. A jab is common because a
 * jab is a jab. A butterfly twist is legendary because it takes a person a
 * year to learn and it looks like it.
 */

/** How the move moves, which is also how the list is grouped. */
export type MoveFamily = 'hands' | 'kick' | 'spin' | 'aerial' | 'ground'

/** Honest note on what it takes to actually do one. Flavour, clearly labelled. */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'showpiece'

export interface FightMove {
  id: string
  name: string
  rarity: Rarity
  family: MoveFamily
  difficulty: Difficulty
  /** Key into the rig's exported animations. */
  animation: keyof typeof RIG
  /** What the move actually is, plainly. */
  description: string
  /** What to watch for when it plays — the thing that makes it read. */
  watchFor: string
  lore: string
  /** Leaves the ground. */
  airborne?: boolean
  /** Turns through a full circle. */
  spins?: boolean
}

export const MOVES: FightMove[] = [
  // --- Starting kit ---------------------------------------------------------
  {
    id: 'jab',
    name: 'Cross',
    rarity: 'common',
    family: 'hands',
    difficulty: 'beginner',
    animation: 'CROSS',
    description: 'A straight punch off the rear hand, driven by the hips rather than the arm.',
    watchFor: 'The shoulder arrives before the fist does. The hand is the last thing to move.',
    lore: 'The first thing anyone is taught, and the last thing anyone stops using.',
  },
  {
    id: 'front-kick',
    name: 'Front kick',
    rarity: 'common',
    family: 'kick',
    difficulty: 'beginner',
    animation: 'FRONT_KICK',
    description: 'A straight push-kick off the lead leg. More shove than strike.',
    watchFor: 'The knee comes up first and the shin follows. It never swings.',
    lore: 'Range is a weapon. This is how you keep it.',
  },

  // --- Unlockable -----------------------------------------------------------
  {
    id: 'roundhouse',
    name: 'Roundhouse',
    rarity: 'uncommon',
    family: 'kick',
    difficulty: 'intermediate',
    animation: 'ROUNDHOUSE',
    description: 'The whole hip turned over into a horizontal shin strike.',
    watchFor: 'The coil away before it fires, and the follow-through past where the target was.',
    lore: 'Everything the hips have, delivered at once.',
  },
  {
    id: 'side-kick',
    name: 'Side kick',
    rarity: 'uncommon',
    family: 'kick',
    difficulty: 'intermediate',
    animation: 'SIDE_KICK',
    description: 'Chamber, then drive the heel out in a straight line from the hip.',
    watchFor: 'The body leans away exactly as far as the leg extends. It is a counterweight.',
    lore: 'A straight line from the heel to the shoulder, and nothing wasted.',
  },
  {
    id: 'sweep',
    name: 'Sweep',
    rarity: 'uncommon',
    family: 'ground',
    difficulty: 'intermediate',
    animation: 'SWEEP',
    description: 'Drop low and take the legs out from underneath.',
    watchFor: 'How far the body has to drop first. The height is the whole cost of the move.',
    lore: 'The floor has never lost a fight.',
  },
  {
    id: 'uppercut',
    name: 'Uppercut',
    rarity: 'rare',
    family: 'hands',
    difficulty: 'intermediate',
    animation: 'UPPERCUT',
    description: 'Sink, then drive up through the centre line with the lead hand.',
    watchFor: 'It goes down before it goes up. Everything vertical starts by loading.',
    lore: 'Whatever comes down has to be met on the way.',
  },
  {
    id: 'hook-kick',
    name: 'Hook kick',
    rarity: 'rare',
    family: 'kick',
    difficulty: 'advanced',
    animation: 'HOOK_KICK',
    description: 'Extend past the target, then whip the heel back through it.',
    watchFor: 'It misses on the way out on purpose. The strike is on the return.',
    lore: 'Aimed at where they will be once they think it has gone by.',
  },
  {
    id: 'crescent-kick',
    name: 'Crescent kick',
    rarity: 'rare',
    family: 'kick',
    difficulty: 'advanced',
    animation: 'CRESCENT_KICK',
    description: 'One continuous arc from low outside to high across the body.',
    watchFor: 'The foot never stops moving. There is no chamber and no straight line anywhere.',
    lore: 'Drawn in one stroke, like a signature.',
  },
  {
    id: 'axe-kick',
    name: 'Axe kick',
    rarity: 'rare',
    family: 'kick',
    difficulty: 'advanced',
    animation: 'AXE_KICK',
    description: 'Raise the leg high and drop the heel straight down.',
    watchFor: 'The pause at the top. It is slow on purpose, and it lands anyway.',
    lore: 'Raised where everyone can see it. Still lands.',
  },
  {
    id: 'spinning-kick',
    name: 'Spinning back kick',
    rarity: 'epic',
    family: 'spin',
    difficulty: 'advanced',
    animation: 'SPIN_KICK',
    spins: true,
    description: 'Turn away from the target, then fire the heel out backwards through it.',
    watchFor: 'The legs trade places as the body winds. That swap is the turn.',
    lore: 'Turn your back on someone and finish them with it. Or miss, and explain yourself.',
  },
  {
    id: 'dragon-tail',
    name: 'Dragon tail',
    rarity: 'epic',
    family: 'ground',
    difficulty: 'advanced',
    animation: 'DRAGON_TAIL',
    spins: true,
    description: 'Hands to the floor, rear leg swung through a full circle at ankle height.',
    watchFor: 'The weight goes entirely into the arms so the leg can travel freely.',
    lore: 'Low, wide, and impossible to see coming from standing.',
  },
  {
    id: 'flying-knee',
    name: 'Flying knee',
    rarity: 'epic',
    family: 'aerial',
    difficulty: 'advanced',
    animation: 'FLYING_KNEE',
    airborne: true,
    description: 'Leave the ground and drive the knee up into the target.',
    watchFor: 'Both feet leave together. It is a jump with a knee attached, not a step.',
    lore: 'You have to leave the ground to throw it, which is the whole risk.',
  },
  {
    id: 'flying-side-kick',
    name: 'Flying side kick',
    rarity: 'epic',
    family: 'aerial',
    difficulty: 'showpiece',
    animation: 'FLYING_SIDE_KICK',
    airborne: true,
    description: 'A running side kick that covers real ground before it lands.',
    watchFor: 'The rear knee drives up first and pulls the body after it.',
    lore: 'Crosses more distance than anything else here, and knows it.',
  },
  {
    id: 'tornado-kick',
    name: 'Tornado kick',
    rarity: 'legendary',
    family: 'aerial',
    difficulty: 'showpiece',
    animation: 'TORNADO_KICK',
    airborne: true,
    spins: true,
    description: 'A jumping turning roundhouse — leave the ground, turn a full circle, kick at the top.',
    watchFor: 'The turn and the jump happen at once. The kick fires at the peak, not on the way up.',
    lore: 'Two things at the same time, both of them difficult.',
  },
  {
    id: 'backflip-kick',
    name: 'Backflip kick',
    rarity: 'legendary',
    family: 'aerial',
    difficulty: 'showpiece',
    animation: 'BACKFLIP_KICK',
    airborne: true,
    spins: true,
    description: 'Whip the lead leg vertically through the chin, then go over backwards behind it.',
    watchFor: 'The kick lands before the flip starts. The rotation is what happens next.',
    lore: 'The kick is the excuse. Everyone is watching the flip.',
  },
  {
    id: 'butterfly-twist',
    name: 'Butterfly twist',
    rarity: 'legendary',
    family: 'aerial',
    difficulty: 'showpiece',
    animation: 'BUTTERFLY_KICK',
    airborne: true,
    spins: true,
    description: 'A horizontal aerial turn, travelling sideways, legs scissoring through it.',
    watchFor: 'It goes across as well as over. That travel is what separates it from a backflip.',
    lore: 'A year of falling over, for one second of looking weightless.',
  },
]

export const MOVE_BY_ID: Record<string, FightMove> = MOVES.reduce(
  (acc, m) => {
    acc[m.id] = m
    return acc
  },
  {} as Record<string, FightMove>,
)

/** Everyone starts with these. */
export const STARTING_MOVES = ['jab', 'front-kick']

/** What a scroll can contain. */
export const UNLOCKABLE_MOVES = MOVES.filter((m) => !STARTING_MOVES.includes(m.id))

export const FAMILY_LABEL: Record<MoveFamily, string> = {
  hands: 'Hands',
  kick: 'Kicks',
  spin: 'Spinning',
  ground: 'Low & ground',
  aerial: 'Aerial',
}

export const FAMILY_ORDER: MoveFamily[] = ['hands', 'kick', 'spin', 'ground', 'aerial']

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: 'Anyone can learn this',
  intermediate: 'Months of practice',
  advanced: 'Years of practice',
  showpiece: 'A showpiece',
}

/** The rig animation for a move, resolved once so nothing else has to cast. */
export function animationFor(move: FightMove): RIG.Animation {
  return RIG[move.animation] as RIG.Animation
}

export function durationMsOf(move: FightMove): number {
  return animationFor(move).durationMs
}

export function isUnlocked(move: FightMove, unlocked: string[] | undefined): boolean {
  return STARTING_MOVES.includes(move.id) || (unlocked ?? []).includes(move.id)
}
