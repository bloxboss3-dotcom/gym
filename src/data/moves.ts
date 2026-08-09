import type { Rarity } from '@/types'

/**
 * Fighting moves.
 *
 * Every move is a data row: frame timings, reach, height, damage and which rig
 * animation plays it. Adding a technique is adding a row plus a pose, which is
 * the same deal the cosmetic catalogue gets.
 *
 * Two rules keep this honest as a game rather than a slot machine:
 *
 *   1. The starting two moves are enough to win the first bout. Nothing you
 *      unlock is required, only different.
 *   2. Rarer is not strictly stronger. A legendary trades something real away
 *      — reach, recovery, or the ability to be jumped over — so a full deck of
 *      legendaries is a worse deck than a balanced one. If rarity simply
 *      bought damage, the fight would be decided in the Forge.
 */

/**
 * Where a strike lands, which is what makes movement matter.
 *
 *  - `low`  travels along the floor. Jump it.
 *  - `mid`  chest height. Block it or back out of range.
 *  - `high` head height. Duck it.
 *  - `air`  can only be thrown while airborne.
 *  - `anti_air` reaches up; hits an airborne opponent that `mid` would miss.
 */
export type MoveHeight = 'low' | 'mid' | 'high' | 'air' | 'anti_air'

export interface FightMove {
  id: string
  name: string
  rarity: Rarity
  height: MoveHeight
  /** Rig animation key, resolved in the arena renderer. */
  animation: string
  /** Wind-up before the strike can hit, ms. */
  startupMs: number
  /** How long it can connect, ms. */
  activeMs: number
  /** Committed and helpless after it, ms. */
  recoveryMs: number
  damage: number
  /** Horizontal reach measured from the fighter's centre, world units. */
  reach: number
  /** How far the fighter is shoved when hit by it. */
  knockback: number
  /** Distance the attacker travels while throwing it. */
  advance: number
  /** Puts the opponent on the floor. */
  knocksDown?: boolean
  /** One line the player reads before choosing it. */
  hint: string
  lore: string
}

export const MOVES: FightMove[] = [
  // --- Starting kit ---------------------------------------------------------
  {
    id: 'jab',
    name: 'Jab',
    rarity: 'common',
    height: 'mid',
    animation: 'CROSS',
    startupMs: 90,
    activeMs: 70,
    recoveryMs: 130,
    damage: 6,
    reach: 74,
    knockback: 10,
    advance: 6,
    hint: 'Quick, safe, short. The move you throw when unsure.',
    lore: 'The first thing anyone is taught, and the last thing anyone stops using.',
  },
  {
    id: 'front-kick',
    name: 'Front kick',
    rarity: 'common',
    height: 'mid',
    animation: 'FRONT_KICK',
    startupMs: 150,
    activeMs: 90,
    recoveryMs: 210,
    damage: 10,
    reach: 104,
    knockback: 42,
    advance: 4,
    hint: 'Long. Pushes them away rather than hurting much.',
    lore: 'Range is a weapon. This is how you keep it.',
  },

  // --- Unlockable -----------------------------------------------------------
  {
    id: 'roundhouse',
    name: 'Roundhouse',
    rarity: 'uncommon',
    height: 'mid',
    animation: 'ROUNDHOUSE',
    startupMs: 230,
    activeMs: 110,
    recoveryMs: 300,
    damage: 17,
    reach: 100,
    knockback: 26,
    advance: 10,
    hint: 'Heavy and long, but you are wide open after it.',
    lore: 'Everything the hips have, delivered at once.',
  },
  {
    id: 'sweep',
    name: 'Sweep',
    rarity: 'uncommon',
    height: 'low',
    animation: 'SWEEP',
    startupMs: 200,
    activeMs: 120,
    recoveryMs: 330,
    damage: 12,
    reach: 92,
    knockback: 18,
    advance: 8,
    knocksDown: true,
    hint: 'Takes their legs and puts them down — unless they jump it.',
    lore: 'The floor has never lost a fight.',
  },
  {
    id: 'uppercut',
    name: 'Uppercut',
    rarity: 'rare',
    height: 'anti_air',
    animation: 'UPPERCUT',
    startupMs: 130,
    activeMs: 100,
    recoveryMs: 320,
    damage: 15,
    reach: 68,
    knockback: 30,
    advance: 4,
    hint: 'Reaches up. The answer to anyone who jumps at you.',
    lore: 'Whatever comes down has to be met on the way.',
  },
  {
    id: 'axe-kick',
    name: 'Axe kick',
    rarity: 'rare',
    height: 'high',
    animation: 'AXE_KICK',
    startupMs: 300,
    activeMs: 110,
    recoveryMs: 300,
    damage: 20,
    reach: 88,
    knockback: 20,
    advance: 6,
    knocksDown: true,
    hint: 'Comes down from above. Slow, and duckable.',
    lore: 'Raised slowly on purpose. They know what is coming and it lands anyway.',
  },
  {
    id: 'flying-knee',
    name: 'Flying knee',
    rarity: 'epic',
    height: 'air',
    animation: 'FLYING_KNEE',
    startupMs: 120,
    activeMs: 130,
    recoveryMs: 240,
    damage: 22,
    reach: 78,
    knockback: 36,
    advance: 26,
    hint: 'Only in the air. Closes distance and lands hard.',
    lore: 'You have to leave the ground to throw it, which is the whole risk.',
  },
  {
    id: 'spinning-kick',
    name: 'Spinning kick',
    rarity: 'legendary',
    height: 'mid',
    animation: 'SPIN_KICK',
    startupMs: 380,
    activeMs: 120,
    recoveryMs: 380,
    damage: 30,
    reach: 108,
    knockback: 60,
    advance: 12,
    knocksDown: true,
    hint: 'Ends bouts. Telegraphed for a very long time first.',
    lore: 'Turn your back on someone and finish them with it. Or miss, and explain yourself.',
  },
]

export const MOVE_BY_ID: Record<string, FightMove> = MOVES.reduce(
  (acc, m) => {
    acc[m.id] = m
    return acc
  },
  {} as Record<string, FightMove>,
)

/** Everyone starts with these, and they are enough. */
export const STARTING_MOVES = ['jab', 'front-kick']

/** How many can be taken into a bout. */
export const LOADOUT_SIZE = 4

/** Moves that can come out of a crate, in the order rarity should surface them. */
export const UNLOCKABLE_MOVES = MOVES.filter((m) => !STARTING_MOVES.includes(m.id))

export const HEIGHT_LABEL: Record<MoveHeight, string> = {
  low: 'Low — jumpable',
  mid: 'Mid — blockable',
  high: 'High — duckable',
  air: 'Air only',
  anti_air: 'Anti-air',
}

/** Total committed time. The number that actually decides whether a move is safe. */
export function moveDurationMs(move: FightMove): number {
  return move.startupMs + move.activeMs + move.recoveryMs
}

/**
 * A rough, honest efficiency figure: damage per second of commitment.
 *
 * Shown in the loadout so nobody has to reverse-engineer the frame data, and
 * asserted in tests so a "legendary" cannot quietly become strictly better
 * than a common at everything.
 */
export function damagePerSecond(move: FightMove): number {
  return Math.round((move.damage / moveDurationMs(move)) * 1000 * 10) / 10
}

/** Fill a loadout from what is unlocked, keeping the player's chosen order. */
export function resolveLoadout(chosen: string[] | undefined, unlocked: string[]): string[] {
  const available = new Set([...STARTING_MOVES, ...unlocked])
  const picked = (chosen ?? []).filter((id) => available.has(id) && MOVE_BY_ID[id])
  for (const id of [...STARTING_MOVES, ...unlocked]) {
    if (picked.length >= LOADOUT_SIZE) break
    if (!picked.includes(id) && MOVE_BY_ID[id]) picked.push(id)
  }
  return picked.slice(0, LOADOUT_SIZE)
}
