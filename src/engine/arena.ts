import { MOVE_BY_ID, type FightMove } from '@/data/moves'

/**
 * The arena: a real-time, side-on duel.
 *
 * This replaces a turn-based exchange, which could never express the thing
 * that makes a fighting game a fighting game — that a strike exists in SPACE
 * and in TIME, so you can be out of its reach, or above it, or already
 * recovering when it arrives. Dodging has to be something you do, not an
 * outcome rolled for you.
 *
 * Fixed-timestep and deterministic, like every other engine here. `step`
 * advances the world by a fixed slice given each side's intent; the same seed
 * and the same inputs replay identically, which is what makes a fight
 * testable and the bot auditable.
 *
 * Geometry is one-dimensional plus height: fighters have an `x` along the
 * floor and a `y` above it. That is all a side-on fighter has ever needed.
 */

/** Logical tick. Small enough for 100 ms of startup to be visible. */
export const TICK_MS = 16

export const ARENA = {
  /**
   * World units are RIG units — the same space the character is drawn in.
   * Keeping one scale means a reach of 104 is literally how far the leg goes
   * on a front kick, rather than a number tuned against a picture. The first
   * version used its own smaller scale and the fighters stood inside each
   * other, which no amount of tuning the reaches would have fixed.
   */
  width: 1400,
  /** Fighters cannot walk through the ropes. */
  margin: 90,
  /** Shoulder to shoulder. A rig figure is about this wide with arms out. */
  bodyWidth: 96,
  walkSpeed: 0.3,
  backpedalSpeed: 0.21,
  jumpVelocity: 0.62,
  gravity: 0.0022,
  /** Above this height a `mid` or `low` strike passes underneath you. */
  airborneClearance: 34,
  /** Crouching drops your head below a `high` strike. */
  crouchClearance: 30,
  /** Fraction of damage a block absorbs. */
  blockAbsorb: 0.78,
  /** Blocked hits still shove you back, by this fraction. */
  blockKnockback: 0.4,
  hitStunMs: 260,
  knockdownMs: 900,
  getUpMs: 380,
} as const

export type Stance = 'idle' | 'walk' | 'jump' | 'crouch' | 'block' | 'attack' | 'hitstun' | 'down'

export interface Intent {
  /** -1 back, 0 still, +1 forward — relative to the world, not to facing. */
  move: -1 | 0 | 1
  jump: boolean
  crouch: boolean
  block: boolean
  /** Move id to throw, if any. */
  attack: string | null
}

export const IDLE_INTENT: Intent = { move: 0, jump: false, crouch: false, block: false, attack: null }

export interface FighterState {
  x: number
  y: number
  vy: number
  facing: 1 | -1
  health: number
  maxHealth: number
  /** Extra damage from gear. */
  power: number
  stance: Stance
  /** Move currently being thrown. */
  move: FightMove | null
  /** Milliseconds into the current move or stun. */
  phaseMs: number
  /** Set once per swing so one strike cannot hit twice. */
  hasConnected: boolean
  loadout: string[]
}

export interface ArenaState {
  you: FighterState
  them: FighterState
  seed: number
  elapsedMs: number
  winner: 'you' | 'them' | null
  /** Events produced by the last step, for sound, flashes and the log. */
  events: ArenaEvent[]
}

export type ArenaEvent =
  | { kind: 'hit'; by: 'you' | 'them'; move: string; damage: number; blocked: boolean; knockdown: boolean }
  | { kind: 'whiff'; by: 'you' | 'them'; move: string }
  | { kind: 'ko'; winner: 'you' | 'them' }

export function makeFighter(init: {
  x: number
  facing: 1 | -1
  health: number
  power?: number
  loadout: string[]
}): FighterState {
  return {
    x: init.x,
    y: 0,
    vy: 0,
    facing: init.facing,
    health: init.health,
    maxHealth: init.health,
    power: init.power ?? 0,
    stance: 'idle',
    move: null,
    phaseMs: 0,
    hasConnected: false,
    loadout: init.loadout,
  }
}

export function createArena(you: FighterState, them: FighterState, seed: number): ArenaState {
  return { you, them, seed: seed >>> 0 || 1, elapsedMs: 0, winner: null, events: [] }
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

export type AttackPhase = 'startup' | 'active' | 'recovery'

export function attackPhase(fighter: FighterState): AttackPhase | null {
  if (fighter.stance !== 'attack' || !fighter.move) return null
  const { startupMs, activeMs } = fighter.move
  if (fighter.phaseMs < startupMs) return 'startup'
  if (fighter.phaseMs < startupMs + activeMs) return 'active'
  return 'recovery'
}

/** True while the fighter cannot start anything new. */
export function isBusy(fighter: FighterState): boolean {
  return fighter.stance === 'attack' || fighter.stance === 'hitstun' || fighter.stance === 'down'
}

export function isAirborne(fighter: FighterState): boolean {
  return fighter.y > 0.01
}

/**
 * Can this strike reach that target right now?
 *
 * Height is the whole point. A `low` strike travels along the floor and misses
 * anyone off the ground; a `high` one passes over a crouch; only `anti_air`
 * meaningfully reaches someone in the air. This is what turns jumping and
 * ducking into decisions rather than decoration.
 */
export function connects(attacker: FighterState, move: FightMove, target: FighterState): boolean {
  const gap = Math.abs(target.x - attacker.x)
  if (gap > move.reach + ARENA.bodyWidth * 0.5) return false
  // Must be swinging toward them.
  if (Math.sign(target.x - attacker.x) !== attacker.facing && gap > 1) return false

  const targetAirborne = target.y > ARENA.airborneClearance
  const targetCrouching = target.stance === 'crouch'

  switch (move.height) {
    case 'low':
      return !targetAirborne
    case 'high':
      return !targetCrouching
    case 'anti_air':
      return true
    case 'air':
      return !targetAirborne || target.y < ARENA.airborneClearance * 2
    case 'mid':
    default:
      return !targetAirborne
  }
}

/** A block only works facing the strike, on the ground, and not while ducking. */
function isBlocking(target: FighterState, attacker: FighterState): boolean {
  if (target.stance !== 'block') return false
  if (isAirborne(target)) return false
  return Math.sign(attacker.x - target.x) === target.facing
}

// ---------------------------------------------------------------------------
// Stepping the world
// ---------------------------------------------------------------------------

function clampToArena(x: number): number {
  return Math.min(ARENA.width - ARENA.margin, Math.max(ARENA.margin, x))
}

function startMove(fighter: FighterState, moveId: string): boolean {
  const move = MOVE_BY_ID[moveId]
  if (!move) return false
  if (!fighter.loadout.includes(moveId)) return false
  if (isBusy(fighter)) return false
  if (move.height === 'air' && !isAirborne(fighter)) return false
  if (move.height !== 'air' && isAirborne(fighter)) return false
  fighter.stance = 'attack'
  fighter.move = move
  fighter.phaseMs = 0
  fighter.hasConnected = false
  return true
}

function applyIntent(fighter: FighterState, intent: Intent, dt: number) {
  if (isBusy(fighter)) return

  if (intent.attack && startMove(fighter, intent.attack)) return

  if (intent.jump && !isAirborne(fighter)) {
    fighter.vy = ARENA.jumpVelocity
    fighter.stance = 'jump'
    return
  }

  if (isAirborne(fighter)) {
    // Air control is deliberately weak — a jump is a commitment.
    fighter.x = clampToArena(fighter.x + intent.move * ARENA.walkSpeed * 0.35 * dt)
    fighter.stance = 'jump'
    return
  }

  if (intent.block) {
    fighter.stance = 'block'
    return
  }
  if (intent.crouch) {
    fighter.stance = 'crouch'
    return
  }
  if (intent.move !== 0) {
    // Walking toward the opponent is faster than backing away from them, which
    // is what stops a fight from becoming two people running in circles.
    const forward = intent.move === fighter.facing
    const speed = forward ? ARENA.walkSpeed : ARENA.backpedalSpeed
    fighter.x = clampToArena(fighter.x + intent.move * speed * dt)
    fighter.stance = 'walk'
    return
  }
  fighter.stance = 'idle'
}

function advancePhysics(fighter: FighterState, dt: number) {
  if (isAirborne(fighter) || fighter.vy > 0) {
    fighter.y += fighter.vy * dt
    fighter.vy -= ARENA.gravity * dt
    if (fighter.y <= 0) {
      fighter.y = 0
      fighter.vy = 0
      if (fighter.stance === 'jump') fighter.stance = 'idle'
    }
  }
}

function advanceTimers(fighter: FighterState, dt: number) {
  if (fighter.stance === 'attack' && fighter.move) {
    fighter.phaseMs += dt
    // Attacks carry you forward through their startup, which is what makes a
    // committed strike also a way to close distance.
    if (fighter.phaseMs < fighter.move.startupMs + fighter.move.activeMs) {
      fighter.x = clampToArena(fighter.x + (fighter.move.advance / fighter.move.startupMs) * dt * fighter.facing)
    }
    if (fighter.phaseMs >= fighter.move.startupMs + fighter.move.activeMs + fighter.move.recoveryMs) {
      fighter.stance = isAirborne(fighter) ? 'jump' : 'idle'
      fighter.move = null
      fighter.phaseMs = 0
    }
    return
  }
  if (fighter.stance === 'hitstun') {
    fighter.phaseMs += dt
    if (fighter.phaseMs >= ARENA.hitStunMs) {
      fighter.stance = 'idle'
      fighter.phaseMs = 0
    }
    return
  }
  if (fighter.stance === 'down') {
    fighter.phaseMs += dt
    if (fighter.phaseMs >= ARENA.knockdownMs + ARENA.getUpMs) {
      fighter.stance = 'idle'
      fighter.phaseMs = 0
    }
  }
}

function faceEachOther(a: FighterState, b: FighterState) {
  if (isBusy(a)) return
  const dir = Math.sign(b.x - a.x)
  if (dir !== 0) a.facing = dir as 1 | -1
}

function separate(a: FighterState, b: FighterState) {
  const gap = Math.abs(a.x - b.x)
  if (gap >= ARENA.bodyWidth) return
  const push = (ARENA.bodyWidth - gap) / 2
  const dir = Math.sign(a.x - b.x) || 1
  a.x = clampToArena(a.x + dir * push)
  b.x = clampToArena(b.x - dir * push)
}

function resolveStrike(
  attacker: FighterState,
  defender: FighterState,
  by: 'you' | 'them',
  events: ArenaEvent[],
) {
  if (attacker.hasConnected || attackPhase(attacker) !== 'active' || !attacker.move) return
  const move = attacker.move
  if (!connects(attacker, move, defender)) return

  attacker.hasConnected = true
  const blocked = isBlocking(defender, attacker)
  const raw = move.damage + attacker.power
  const damage = blocked ? Math.max(1, Math.round(raw * (1 - ARENA.blockAbsorb))) : Math.round(raw)
  defender.health = Math.max(0, defender.health - damage)

  const shove = move.knockback * (blocked ? ARENA.blockKnockback : 1)
  defender.x = clampToArena(defender.x + shove * attacker.facing)

  const knockdown = Boolean(move.knocksDown) && !blocked
  if (defender.health > 0) {
    defender.stance = knockdown ? 'down' : 'hitstun'
    defender.move = null
    defender.phaseMs = 0
    if (knockdown) {
      defender.y = 0
      defender.vy = 0
    }
  }
  events.push({ kind: 'hit', by, move: move.id, damage, blocked, knockdown })
}

function noteWhiff(fighter: FighterState, by: 'you' | 'them', events: ArenaEvent[]) {
  if (!fighter.move || fighter.hasConnected) return
  // The instant the active window closes with nothing hit.
  const { startupMs, activeMs } = fighter.move
  const before = fighter.phaseMs - TICK_MS
  if (before < startupMs + activeMs && fighter.phaseMs >= startupMs + activeMs) {
    events.push({ kind: 'whiff', by, move: fighter.move.id })
  }
}

/**
 * Advance the world by one tick.
 *
 * Pure: returns a new state, mutating only its own copies. Order matters —
 * intent, then physics, then timers, then hits, then separation — because
 * resolving hits before timers would let a strike land during its own startup.
 */
export function step(state: ArenaState, yourIntent: Intent, theirIntent: Intent, dt = TICK_MS): ArenaState {
  if (state.winner) return state

  const you: FighterState = { ...state.you }
  const them: FighterState = { ...state.them }
  const events: ArenaEvent[] = []

  faceEachOther(you, them)
  faceEachOther(them, you)

  applyIntent(you, yourIntent, dt)
  applyIntent(them, theirIntent, dt)

  advancePhysics(you, dt)
  advancePhysics(them, dt)

  advanceTimers(you, dt)
  advanceTimers(them, dt)

  resolveStrike(you, them, 'you', events)
  resolveStrike(them, you, 'them', events)
  noteWhiff(you, 'you', events)
  noteWhiff(them, 'them', events)

  separate(you, them)

  let winner: 'you' | 'them' | null = null
  if (them.health <= 0) winner = 'you'
  else if (you.health <= 0) winner = 'them'
  if (winner) events.push({ kind: 'ko', winner })

  return {
    you,
    them,
    seed: (state.seed * 1664525 + 1013904223) >>> 0,
    elapsedMs: state.elapsedMs + dt,
    winner,
    events,
  }
}

// ---------------------------------------------------------------------------
// The bot
// ---------------------------------------------------------------------------

export interface BotProfile {
  /** 0–1. How often it chooses to block rather than act. */
  caution: number
  /** 0–1. How readily it jumps a low strike or ducks a high one. */
  reads: number
  /** Milliseconds it waits between decisions — its reaction time. */
  thinkMs: number
  /**
   * 0–1. How often it commits to a strike when one is available.
   *
   * This exists because `caution` turned out to be the wrong knob for making
   * an opponent gentle. Turning caution up makes a bot BLOCK more, which makes
   * it harder to kill rather than easier to survive — the first opponent
   * became an impenetrable wall that still chipped you to death. Aggression
   * controls the rate it swings at all, which is the thing that actually
   * decides how much damage a beginner takes while learning the buttons.
   */
  aggression: number
}

function rand(seed: number): number {
  let a = seed >>> 0
  a = (a + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * The bot's whole policy, written out.
 *
 * It reads only public state — positions, health, and what you are visibly
 * doing — with a reaction delay, so it cannot respond to a strike before the
 * strike exists. There is nothing to discover by losing to it repeatedly,
 * which is deliberate: a fight you lose should teach you the game, not the
 * opponent's secret.
 */
export function botIntent(state: ArenaState, profile: BotProfile): Intent {
  const self = state.them
  const foe = state.you
  if (isBusy(self)) return IDLE_INTENT

  const gap = Math.abs(foe.x - self.x)
  const toward = (Math.sign(foe.x - self.x) || 1) as 1 | -1
  const roll = rand(state.seed + Math.floor(state.elapsedMs / profile.thinkMs))

  // React to what is already coming at you.
  const incoming = foe.stance === 'attack' && foe.move && attackPhase(foe) !== 'recovery'
  if (incoming && gap < foe.move!.reach + ARENA.bodyWidth) {
    const height = foe.move!.height
    if (height === 'low' && roll < profile.reads) return { ...IDLE_INTENT, jump: true }
    if (height === 'high' && roll < profile.reads) return { ...IDLE_INTENT, crouch: true }
    if (roll < profile.caution + profile.reads * 0.5) return { ...IDLE_INTENT, block: true }
  }

  // Punish someone stuck in recovery.
  if (foe.stance === 'attack' && attackPhase(foe) === 'recovery') {
    const punish = self.loadout
      .map((id) => MOVE_BY_ID[id])
      .filter((m) => m && m.height !== 'air' && gap <= m.reach)
      .sort((a, b) => b.damage - a.damage)[0]
    if (punish) return { ...IDLE_INTENT, attack: punish.id }
    return { ...IDLE_INTENT, move: toward }
  }

  // Anti-air.
  if (foe.y > ARENA.airborneClearance) {
    const antiAir = self.loadout.map((id) => MOVE_BY_ID[id]).find((m) => m?.height === 'anti_air')
    if (antiAir && gap <= antiAir.reach) return { ...IDLE_INTENT, attack: antiAir.id }
    return { ...IDLE_INTENT, move: -toward as -1 | 1 }
  }

  // In range: swing something it can actually reach with.
  const usable = self.loadout
    .map((id) => MOVE_BY_ID[id])
    .filter((m): m is FightMove => Boolean(m) && m.height !== 'air' && gap <= m.reach)
  if (usable.length) {
    if (roll < profile.caution) return { ...IDLE_INTENT, block: true }
    // Rolled per tick rather than per think-window, so aggression genuinely
    // sets the rate of attacks. Quantised to the window it would fire in
    // bursts of whatever fits inside one decision.
    const commit = rand((state.seed ^ Math.floor(state.elapsedMs / 60)) >>> 0)
    if (commit > profile.aggression) return IDLE_INTENT
    const pick = usable[Math.floor(roll * usable.length) % usable.length]
    return { ...IDLE_INTENT, attack: pick.id }
  }

  // Out of range: close, but back off occasionally so it is not a bulldozer.
  if (roll < 0.08) return { ...IDLE_INTENT, move: -toward as -1 | 1 }
  return { ...IDLE_INTENT, move: toward }
}
