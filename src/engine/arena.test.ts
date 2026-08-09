import { describe, expect, it } from 'vitest'
import { LOADOUT_SIZE, MOVES, MOVE_BY_ID, STARTING_MOVES, damagePerSecond, moveDurationMs, resolveLoadout } from '@/data/moves'
import * as RIG from '@/character/rig'
import {
  ARENA,
  IDLE_INTENT,
  TICK_MS,
  attackPhase,
  botIntent,
  connects,
  createArena,
  isAirborne,
  makeFighter,
  step,
  type ArenaState,
  type Intent,
} from '@/engine/arena'

const ALL = MOVES.map((m) => m.id)

function arena(overrides: { youX?: number; themX?: number; health?: number; loadout?: string[] } = {}): ArenaState {
  const you = makeFighter({
    x: overrides.youX ?? 400,
    facing: 1,
    health: overrides.health ?? 100,
    loadout: overrides.loadout ?? ALL,
  })
  const them = makeFighter({
    x: overrides.themX ?? 700,
    facing: -1,
    health: overrides.health ?? 100,
    loadout: overrides.loadout ?? ALL,
  })
  return createArena(you, them, 7)
}

/** Run n ticks with fixed intents. */
function run(state: ArenaState, yours: Intent, theirs: Intent, ticks: number): ArenaState {
  let s = state
  for (let i = 0; i < ticks && !s.winner; i += 1) s = step(s, yours, theirs, TICK_MS)
  return s
}

const attack = (id: string): Intent => ({ ...IDLE_INTENT, attack: id })

describe('move catalogue', () => {
  it('points every move at an animation the rig actually has', () => {
    for (const move of MOVES) {
      expect(RIG[move.animation as keyof typeof RIG], `${move.id} → ${move.animation}`).toBeDefined()
    }
  })

  it('has unique ids and a full set of frame data', () => {
    expect(new Set(ALL).size).toBe(MOVES.length)
    for (const move of MOVES) {
      expect(move.startupMs, move.id).toBeGreaterThan(0)
      expect(move.activeMs, move.id).toBeGreaterThan(0)
      expect(move.recoveryMs, move.id).toBeGreaterThan(0)
      expect(move.damage, move.id).toBeGreaterThan(0)
      expect(move.reach, move.id).toBeGreaterThan(0)
      expect(move.hint.length, move.id).toBeGreaterThan(0)
    }
  })

  it('gives everyone a starting kit that is genuinely usable', () => {
    for (const id of STARTING_MOVES) expect(MOVE_BY_ID[id], id).toBeDefined()
    expect(STARTING_MOVES.length).toBeGreaterThanOrEqual(2)
  })

  it('never makes a rarer move strictly better than a common one', () => {
    // The guard against pay-to-win: the legendary must give something up. It
    // is slower per point of damage than the plain jab, and every heavy move
    // leaves you committed for longer.
    const jab = MOVE_BY_ID.jab
    for (const move of MOVES) {
      if (move.rarity === 'common') continue
      const worseSomewhere =
        damagePerSecond(move) <= damagePerSecond(jab) ||
        move.startupMs > jab.startupMs ||
        move.recoveryMs > jab.recoveryMs ||
        move.height === 'air'
      expect(worseSomewhere, `${move.id} is better than the jab at everything`).toBe(true)
    }
  })

  it('keeps the legendary honest — slowest commitment of the lot', () => {
    const legendary = MOVES.filter((m) => m.rarity === 'legendary')
    expect(legendary.length).toBeGreaterThan(0)
    const slowest = Math.max(...MOVES.map(moveDurationMs))
    for (const move of legendary) expect(moveDurationMs(move)).toBe(slowest)
  })

  it('fills a loadout from what is unlocked and never invents a move', () => {
    const filled = resolveLoadout([], [])
    expect(filled.length).toBeGreaterThan(0)
    expect(filled.every((id) => STARTING_MOVES.includes(id))).toBe(true)

    const chosen = resolveLoadout(['spinning-kick', 'nonsense'], ['spinning-kick'])
    expect(chosen[0]).toBe('spinning-kick')
    expect(chosen).not.toContain('nonsense')
    expect(chosen.length).toBeLessThanOrEqual(LOADOUT_SIZE)
  })

  it('refuses to equip a move that has not been unlocked', () => {
    expect(resolveLoadout(['spinning-kick'], [])).not.toContain('spinning-kick')
  })
})

describe('space and reach', () => {
  it('misses when you are simply too far away', () => {
    const far = arena({ youX: 300, themX: 900 })
    const after = run(far, attack('jab'), IDLE_INTENT, 40)
    expect(after.them.health).toBe(after.them.maxHealth)
  })

  it('lands when you close the distance first', () => {
    let s = arena({ youX: 500, themX: 700 })
    s = run(s, { ...IDLE_INTENT, move: 1 }, IDLE_INTENT, 40)
    s = run(s, attack('jab'), IDLE_INTENT, 40)
    expect(s.them.health).toBeLessThan(s.them.maxHealth)
  })

  it('never lets a strike land behind the fighter throwing it', () => {
    const you = makeFighter({ x: 500, facing: 1, health: 100, loadout: ALL })
    const them = makeFighter({ x: 460, facing: 1, health: 100, loadout: ALL })
    expect(connects(you, MOVE_BY_ID['front-kick'], them)).toBe(false)
  })
})

describe('dodging is a real action', () => {
  it('lets a jump clear a low sweep', () => {
    // Same distance, same strike; the only difference is leaving the ground.
    const grounded = run(arena({ youX: 580, themX: 700 }), IDLE_INTENT, attack('sweep'), 60)
    expect(grounded.you.health).toBeLessThan(grounded.you.maxHealth)

    let jumped = arena({ youX: 580, themX: 700 })
    jumped = run(jumped, { ...IDLE_INTENT, jump: true }, IDLE_INTENT, 8)
    expect(isAirborne(jumped.you)).toBe(true)
    jumped = run(jumped, IDLE_INTENT, attack('sweep'), 40)
    expect(jumped.you.health).toBe(jumped.you.maxHealth)
  })

  it('lets a crouch duck a high axe kick', () => {
    const standing = run(arena({ youX: 580, themX: 700 }), IDLE_INTENT, attack('axe-kick'), 70)
    expect(standing.you.health).toBeLessThan(standing.you.maxHealth)

    const ducked = run(arena({ youX: 580, themX: 700 }), { ...IDLE_INTENT, crouch: true }, attack('axe-kick'), 70)
    expect(ducked.you.health).toBe(ducked.you.maxHealth)
  })

  it('punishes ducking under a low strike', () => {
    const ducked = run(arena({ youX: 580, themX: 700 }), { ...IDLE_INTENT, crouch: true }, attack('sweep'), 60)
    expect(ducked.you.health).toBeLessThan(ducked.you.maxHealth)
  })

  it('lets an anti-air reach someone who jumped', () => {
    let s = arena({ youX: 580, themX: 700 })
    s = run(s, { ...IDLE_INTENT, jump: true }, IDLE_INTENT, 8)
    s = run(s, IDLE_INTENT, attack('uppercut'), 30)
    expect(s.you.health).toBeLessThan(s.you.maxHealth)
  })

  it('lets backing out of range beat a strike outright', () => {
    // Asserted as a PAIR at one distance: from here, standing still is hit and
    // retreating is not. A single-sided version would pass on a distance where
    // the strike could never have reached anyway.
    const stood = run(arena({ youX: 566, themX: 700 }), IDLE_INTENT, attack('roundhouse'), 60)
    expect(stood.you.health).toBeLessThan(stood.you.maxHealth)

    const retreated = run(arena({ youX: 566, themX: 700 }), { ...IDLE_INTENT, move: -1 }, attack('roundhouse'), 60)
    expect(retreated.you.health).toBe(retreated.you.maxHealth)
  })

  it('makes blocking cost most of the damage but not all of it', () => {
    const open = run(arena({ youX: 580, themX: 700 }), IDLE_INTENT, attack('roundhouse'), 60)
    const guarded = run(arena({ youX: 580, themX: 700 }), { ...IDLE_INTENT, block: true }, attack('roundhouse'), 60)
    const openDamage = open.you.maxHealth - open.you.health
    const blockedDamage = guarded.you.maxHealth - guarded.you.health
    expect(openDamage).toBeGreaterThan(0)
    expect(blockedDamage).toBeGreaterThan(0)
    expect(blockedDamage).toBeLessThan(openDamage)
  })

  it('does not let a block work from behind', () => {
    const you = makeFighter({ x: 500, facing: -1, health: 100, loadout: ALL })
    const them = makeFighter({ x: 560, facing: -1, health: 100, loadout: ALL })
    const s = run(createArena(you, them, 3), { ...IDLE_INTENT, block: true }, attack('jab'), 30)
    // They are behind you and you are guarding the wrong way, so it lands full.
    expect(s.you.health).toBeLessThan(s.you.maxHealth)
  })
})

describe('commitment', () => {
  it('runs a move through startup, active and recovery in order', () => {
    let s = arena({ youX: 580, themX: 700 })
    s = step(s, attack('roundhouse'), IDLE_INTENT)
    const seen: string[] = []
    for (let i = 0; i < 60 && s.you.stance === 'attack'; i += 1) {
      const phase = attackPhase(s.you)
      if (phase && seen[seen.length - 1] !== phase) seen.push(phase)
      s = step(s, IDLE_INTENT, IDLE_INTENT)
    }
    expect(seen).toEqual(['startup', 'active', 'recovery'])
  })

  it('will not let you cancel a swing into another one', () => {
    let s = arena({ youX: 580, themX: 700 })
    s = step(s, attack('roundhouse'), IDLE_INTENT)
    const started = s.you.move?.id
    s = step(s, attack('jab'), IDLE_INTENT)
    expect(s.you.move?.id).toBe(started)
  })

  it('lands each strike at most once', () => {
    // One press, then hands off — holding the button would legitimately start
    // a second roundhouse and that is not what this is testing.
    let s = step(arena({ youX: 580, themX: 700 }), attack('roundhouse'), IDLE_INTENT)
    s = run(s, IDLE_INTENT, IDLE_INTENT, 60)
    expect(s.them.maxHealth - s.them.health).toBe(MOVE_BY_ID.roundhouse.damage)
  })

  it('only allows an air move in the air, and a ground move on the ground', () => {
    const grounded = step(arena(), attack('flying-knee'), IDLE_INTENT)
    expect(grounded.you.stance).not.toBe('attack')

    let air = arena()
    air = run(air, { ...IDLE_INTENT, jump: true }, IDLE_INTENT, 8)
    air = step(air, attack('flying-knee'), IDLE_INTENT)
    expect(air.you.move?.id).toBe('flying-knee')

    const airborneJab = step(air, attack('jab'), IDLE_INTENT)
    expect(airborneJab.you.move?.id).toBe('flying-knee')
  })
})

describe('the arena itself', () => {
  it('keeps both fighters inside the ropes', () => {
    let s = arena({ youX: 200, themX: 900 })
    s = run(s, { ...IDLE_INTENT, move: -1 }, { ...IDLE_INTENT, move: 1 }, 400)
    expect(s.you.x).toBeGreaterThanOrEqual(ARENA.margin - 0.01)
    expect(s.them.x).toBeLessThanOrEqual(ARENA.width - ARENA.margin + 0.01)
  })

  it('never lets them stand inside each other', () => {
    let s = arena({ youX: 500, themX: 540 })
    s = run(s, { ...IDLE_INTENT, move: 1 }, { ...IDLE_INTENT, move: -1 }, 200)
    expect(Math.abs(s.you.x - s.them.x)).toBeGreaterThanOrEqual(ARENA.bodyWidth - 1)
  })

  it('brings a jump back down to the floor', () => {
    let s = arena()
    s = run(s, { ...IDLE_INTENT, jump: true }, IDLE_INTENT, 4)
    expect(isAirborne(s.you)).toBe(true)
    s = run(s, IDLE_INTENT, IDLE_INTENT, 200)
    expect(s.you.y).toBe(0)
  })

  it('turns fighters to face each other when they cross over', () => {
    let s = arena({ youX: 700, themX: 400 })
    s = step(s, IDLE_INTENT, IDLE_INTENT)
    expect(s.you.facing).toBe(-1)
    expect(s.them.facing).toBe(1)
  })

  it('replays identically from the same seed and inputs', () => {
    const play = () => {
      let s = arena()
      const script: Intent[] = [
        { ...IDLE_INTENT, move: 1 },
        attack('jab'),
        { ...IDLE_INTENT, jump: true },
        attack('flying-knee'),
        { ...IDLE_INTENT, block: true },
      ]
      for (const intent of script) s = run(s, intent, botIntent(s, PROFILE), 30)
      return `${s.you.health}/${s.them.health}/${Math.round(s.you.x)}/${Math.round(s.them.x)}`
    }
    expect(play()).toBe(play())
  })

  it('ends the bout when someone runs out, and never goes negative', () => {
    let s = arena({ health: 12 })
    s = run(s, { ...IDLE_INTENT, move: 1 }, IDLE_INTENT, 200)
    s = run(s, attack('spinning-kick'), IDLE_INTENT, 120)
    expect(s.them.health).toBe(0)
    expect(s.winner).toBe('you')
  })

  it('freezes once won', () => {
    let s = arena({ health: 8 })
    s = run(s, { ...IDLE_INTENT, move: 1 }, IDLE_INTENT, 200)
    s = run(s, attack('roundhouse'), IDLE_INTENT, 120)
    const settled = s
    const after = step(settled, attack('roundhouse'), IDLE_INTENT)
    expect(after).toBe(settled)
  })
})

const PROFILE = { caution: 0.25, reads: 0.5, thinkMs: 220, aggression: 0.6 }

describe('the bot', () => {
  it('closes the distance when it is out of range', () => {
    // It backs off occasionally on purpose, so this asserts the tendency over
    // many decision ticks rather than one seed's answer — which is the honest
    // claim, and the one that does not go flaky.
    const s = arena({ youX: 200, themX: 900 })
    const decisions = Array.from({ length: 60 }, (_, i) => botIntent({ ...s, elapsedMs: i * 240 }, PROFILE))
    const closing = decisions.filter((d) => d.move === -1).length
    expect(closing / decisions.length).toBeGreaterThan(0.8)
  })

  it('throws something when it is in range', () => {
    const s = arena({ youX: 660, themX: 700 })
    const intents = Array.from({ length: 20 }, (_, i) =>
      botIntent({ ...s, elapsedMs: i * 300 }, { ...PROFILE, caution: 0 }),
    )
    expect(intents.some((i) => i.attack !== null)).toBe(true)
  })

  it('does not answer a strike that has not been thrown yet', () => {
    // Reaction, not precognition: with the opponent idle there is nothing to
    // block, so a purely defensive bot must not be blocking.
    const s = arena({ youX: 660, themX: 700 })
    const intent = botIntent(s, { caution: 0, reads: 1, thinkMs: 200, aggression: 1 })
    expect(intent.block).toBe(false)
  })

  it('is beatable with only the starting moves', () => {
    // A new account has a jab and a front kick. If those cannot win, the whole
    // unlock system reads as a paywall the first time you open the screen.
    let wins = 0
    const trials = 40
    for (let trial = 0; trial < trials; trial += 1) {
      const you = makeFighter({ x: 400, facing: 1, health: 100, loadout: STARTING_MOVES })
      const them = makeFighter({ x: 700, facing: -1, health: 90, loadout: STARTING_MOVES })
      let s = createArena(you, them, trial * 7919 + 11)
      // A plain, unclever human: walk in, jab, repeat.
      for (let tick = 0; tick < 4000 && !s.winner; tick += 1) {
        const gap = Math.abs(s.them.x - s.you.x)
        const inRange = gap <= MOVE_BY_ID.jab.reach + ARENA.bodyWidth * 0.5
        const mine: Intent = inRange
          ? attack('jab')
          : { ...IDLE_INTENT, move: (Math.sign(s.them.x - s.you.x) || 1) as 1 | -1 }
        s = step(s, mine, botIntent(s, PROFILE))
      }
      if (s.winner === 'you') wins += 1
    }
    expect(wins / trials).toBeGreaterThan(0.5)
  })

  it('does not simply steamroll a passive player either', () => {
    // If standing still and blocking never loses, there is no game.
    let losses = 0
    const trials = 20
    for (let trial = 0; trial < trials; trial += 1) {
      const you = makeFighter({ x: 400, facing: 1, health: 100, loadout: STARTING_MOVES })
      const them = makeFighter({ x: 700, facing: -1, health: 100, loadout: ALL })
      let s = createArena(you, them, trial * 104729 + 5)
      for (let tick = 0; tick < 6000 && !s.winner; tick += 1) {
        s = step(s, { ...IDLE_INTENT, block: true }, botIntent(s, PROFILE))
      }
      if (s.winner === 'them') losses += 1
    }
    expect(losses).toBeGreaterThan(0)
  })
})
