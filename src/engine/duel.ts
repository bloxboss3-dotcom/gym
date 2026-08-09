import { ITEM_BY_ID } from '@/data/items'
import type { BotProfile } from '@/engine/arena'
import type { CosmeticItem, Slot } from '@/types'

/**
 * Sparring — the bot duel the gear stats feed.
 *
 * The line this file sits on the safe side of: gear affects THIS, and nothing
 * else. No recommendation, target, threshold or safety message anywhere in the
 * app reads a `stats` field. Losing a bout does not change a single number in
 * your programme, and no item can be bought to make training advice better,
 * because there is no such thing as better training advice for money.
 *
 * Deterministic like everything else in `src/engine/`: given a seed and a list
 * of moves, the whole bout replays identically. That is what makes it
 * testable, and it also means the bot cannot be accused of cheating — you can
 * read exactly what it will do.
 */

export type Move = 'cross' | 'roundhouse' | 'spin_kick' | 'flying_knee' | 'guard'

export interface MoveProfile {
  key: Move
  name: string
  /** Base damage before gear. */
  power: number
  /** 0–1 chance the strike lands cleanly when unguarded. */
  accuracy: number
  /** How much of an incoming strike this absorbs when chosen instead. */
  block: number
  /** Animation key in `src/character/rig.ts`. */
  animation: 'CROSS' | 'ROUNDHOUSE' | 'SPIN_KICK' | 'FLYING_KNEE' | 'STANCE'
  hint: string
}

/**
 * Four strikes and a guard, tuned so no single button wins.
 *
 * Fast and accurate beats slow and heavy over a long bout; slow and heavy ends
 * it early when it lands. Guard trades your turn for absorbing most of theirs.
 */
export const MOVES: Record<Move, MoveProfile> = {
  cross: {
    key: 'cross',
    name: 'Cross',
    power: 9,
    accuracy: 0.92,
    block: 0.15,
    animation: 'CROSS',
    hint: 'Fast and reliable. Almost always lands.',
  },
  roundhouse: {
    key: 'roundhouse',
    name: 'Roundhouse',
    power: 16,
    accuracy: 0.74,
    block: 0.1,
    animation: 'ROUNDHOUSE',
    hint: 'Heavy. Misses more than it should.',
  },
  flying_knee: {
    key: 'flying_knee',
    name: 'Flying knee',
    power: 21,
    accuracy: 0.6,
    block: 0,
    animation: 'FLYING_KNEE',
    hint: 'All or nothing, and no guard behind it.',
  },
  spin_kick: {
    key: 'spin_kick',
    name: 'Spinning kick',
    power: 26,
    accuracy: 0.48,
    block: 0,
    animation: 'SPIN_KICK',
    hint: 'Ends bouts. Usually ends up hitting air.',
  },
  guard: {
    key: 'guard',
    name: 'Guard',
    power: 0,
    accuracy: 0,
    block: 0.75,
    animation: 'STANCE',
    hint: 'Give up your turn to absorb most of theirs.',
  },
}

export const ATTACKS: Move[] = ['cross', 'roundhouse', 'flying_knee', 'spin_kick']

/** Health and damage before any gear is counted. */
export const BASE_HEALTH = 100
export const BASE_DAMAGE = 0

export interface CombatStats {
  health: number
  damage: number
  /** Which equipped items contributed, so the total is never a mystery. */
  sources: { item: CosmeticItem; health: number; damage: number }[]
}

/**
 * Sum the stats off whatever is equipped.
 *
 * Levelling adds nothing here on purpose. Training already moves the build of
 * the figure and everything else in the app; letting it also stack combat
 * numbers would make a long-time user unbeatable and a new one pointless.
 */
export function combatStats(equipped: Partial<Record<Slot, string | null>>): CombatStats {
  let health = BASE_HEALTH
  let damage = BASE_DAMAGE
  const sources: CombatStats['sources'] = []

  for (const id of Object.values(equipped)) {
    if (!id) continue
    const item = ITEM_BY_ID[id]
    if (!item?.stats) continue
    const h = item.stats.health ?? 0
    const d = item.stats.damage ?? 0
    if (h === 0 && d === 0) continue
    health += h
    damage += d
    sources.push({ item, health: h, damage: d })
  }

  sources.sort((a, b) => b.health + b.damage - (a.health + a.damage))
  return { health, damage, sources }
}

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** Mulberry32. Small, fast, and good enough for a fist fight. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Opponents
// ---------------------------------------------------------------------------

export interface Opponent {
  id: string
  name: string
  health: number
  damage: number
  /** How often it guards instead of striking, 0–1. Legacy turn-based knob. */
  caution: number
  /** Reaction and temperament in the real-time arena. */
  profile: BotProfile
  /** What it can actually throw. Its difficulty is mostly this list. */
  moves: string[]
  taunt: string
  /**
   * What it wears, in the same shape the Forge writes for you.
   *
   * The opponent is rendered by the same rig as your own warrior, so an
   * opponent is a costume rather than a separate art pipeline — and you can
   * see at a glance that the thing across the ring is playing by your rules.
   */
  look: Partial<Record<Slot, string | null>>
}

export const OPPONENTS: Opponent[] = [
  {
    id: 'straw',
    name: 'Straw Sentinel',
    health: 70,
    damage: 0,
    // Guards half the time. The opening bout has to be winnable with nothing
    // equipped, or the whole mode reads as pay-to-play the moment you see it.
    caution: 0.5,
    // Guards far more than it strikes. This is the first thing anyone fights,
    // and it exists to teach the controls — a bot that can chip a stationary
    // beginner to death in five seconds teaches nothing but frustration.
    profile: { caution: 0.22, reads: 0.1, thinkMs: 520, aggression: 0.22 },
    moves: ['jab'],
    taunt: 'It does not move much. That is the point.',
    look: { body: 'body-tunic', face: 'face-recruit', hands: 'hands-wraps', feet: 'feet-wraps', weapon: 'weapon-none' },
  },
  {
    id: 'recruit',
    name: 'Ashen Recruit',
    health: 100,
    damage: 3,
    caution: 0.2,
    profile: { caution: 0.24, reads: 0.34, thinkMs: 300, aggression: 0.45 },
    moves: ['jab', 'front-kick', 'roundhouse'],
    taunt: 'Started the same week you did.',
    look: {
      body: 'body-padded',
      head: 'head-bound',
      face: 'face-scarred',
      hands: 'hands-gloves',
      feet: 'feet-boots',
      weapon: 'weapon-shortsword',
    },
  },
  {
    id: 'warden',
    name: 'Forge Warden',
    health: 135,
    damage: 7,
    caution: 0.35,
    profile: { caution: 0.3, reads: 0.55, thinkMs: 240, aggression: 0.62 },
    moves: ['jab', 'front-kick', 'sweep', 'uppercut'],
    taunt: 'Holds the line on the boring weeks.',
    look: {
      body: 'body-warden',
      head: 'head-open-helm',
      face: 'face-veiled',
      hands: 'hands-heavy',
      feet: 'feet-warden',
      weapon: 'weapon-warhammer',
      back: 'back-heavy',
    },
  },
  {
    id: 'emberblade',
    name: 'The Emberblade',
    health: 170,
    damage: 12,
    caution: 0.28,
    profile: { caution: 0.26, reads: 0.75, thinkMs: 190, aggression: 0.8 },
    moves: ['jab', 'roundhouse', 'uppercut', 'axe-kick', 'spinning-kick'],
    taunt: 'Waits at the end of every long streak.',
    look: {
      body: 'body-ember-plate',
      head: 'head-ember-crown',
      face: 'face-ember-eyes',
      hands: 'hands-ember',
      feet: 'feet-ember',
      weapon: 'weapon-ember-blade',
      back: 'back-ember',
      aura: 'aura-embers',
    },
  },
]

export const OPPONENT_BY_ID: Record<string, Opponent> = OPPONENTS.reduce(
  (acc, o) => {
    acc[o.id] = o
    return acc
  },
  {} as Record<string, Opponent>,
)

// ---------------------------------------------------------------------------
// Resolving a round
// ---------------------------------------------------------------------------

export interface Combatant {
  health: number
  maxHealth: number
  damage: number
}

export interface Strike {
  by: 'you' | 'them'
  move: Move
  landed: boolean
  blocked: boolean
  damage: number
}

export interface RoundResult {
  you: Combatant
  them: Combatant
  strikes: [Strike, Strike]
  /** Null while the bout is live. */
  winner: 'you' | 'them' | null
  /** The seed for the next round, so a bout is one chain from one number. */
  nextSeed: number
}

function resolveStrike(
  by: 'you' | 'them',
  move: Move,
  attacker: Combatant,
  defenderMove: Move,
  roll: number,
): Strike {
  const profile = MOVES[move]
  if (profile.power === 0) {
    return { by, move, landed: false, blocked: false, damage: 0 }
  }
  const landed = roll < profile.accuracy
  if (!landed) return { by, move, landed: false, blocked: false, damage: 0 }

  const absorbed = MOVES[defenderMove].block
  const raw = profile.power + attacker.damage
  const dealt = Math.max(1, Math.round(raw * (1 - absorbed)))
  return { by, move, landed: true, blocked: absorbed > 0, damage: dealt }
}

/**
 * One exchange. Both fighters commit at the same time, so guarding is a real
 * gamble rather than a reaction — there is nothing to react to yet.
 */
export function resolveRound(
  you: Combatant,
  them: Combatant,
  yourMove: Move,
  seed: number,
  caution: number,
): RoundResult {
  const random = rng(seed)

  // Bot policy, in the open: guard by its caution, otherwise pick the heaviest
  // strike that could finish you and settle for the reliable one when it
  // cannot. Nothing hidden, nothing adaptive, nothing that reads your input.
  const guardRoll = random()
  let theirMove: Move
  if (guardRoll < caution) {
    theirMove = 'guard'
  } else {
    const finisher = ATTACKS.find((m) => MOVES[m].power + them.damage >= you.health)
    theirMove = finisher ?? (random() < 0.55 ? 'cross' : 'roundhouse')
  }

  const yourStrike = resolveStrike('you', yourMove, you, theirMove, random())
  const theirStrike = resolveStrike('them', theirMove, them, yourMove, random())

  const themAfter: Combatant = { ...them, health: Math.max(0, them.health - yourStrike.damage) }
  const youAfter: Combatant = { ...you, health: Math.max(0, you.health - theirStrike.damage) }

  // Simultaneous knockouts go to the defender of the two — if you were still
  // standing when your strike landed, it counts.
  const winner = themAfter.health <= 0 ? 'you' : youAfter.health <= 0 ? 'them' : null

  return {
    you: youAfter,
    them: themAfter,
    strikes: [yourStrike, theirStrike],
    winner,
    nextSeed: (seed * 1664525 + 1013904223) >>> 0,
  }
}

export function describeStrike(strike: Strike, youName: string, themName: string): string {
  const who = strike.by === 'you' ? youName : themName
  const move = MOVES[strike.move].name
  if (strike.move === 'guard') return `${who} braced behind a guard.`
  if (!strike.landed) return `${who} threw a ${move.toLowerCase()} and hit air.`
  if (strike.blocked) return `${who} landed a ${move.toLowerCase()} through the guard for ${strike.damage}.`
  return `${who} landed a ${move.toLowerCase()} for ${strike.damage}.`
}

/** The honest note the screen shows, rather than burying it in a settings page. */
export const SPARRING_NOTE =
  'Gear stats move this bout and nothing else. Your programme, your targets and every recommendation are calculated without ever looking at what you are wearing — winning here does not make you stronger, and losing does not cost you anything.'
