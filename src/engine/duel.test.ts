import { describe, expect, it } from 'vitest'
import { ITEMS, ITEM_BY_ID } from '@/data/items'
import {
  ATTACKS,
  BASE_HEALTH,
  MOVES,
  OPPONENTS,
  combatStats,
  resolveRound,
  rng,
  type Combatant,
  type Move,
} from '@/engine/duel'

function fighter(health: number, damage = 0): Combatant {
  return { health, maxHealth: health, damage }
}

describe('gear stats', () => {
  it('starts everyone at the same base with nothing equipped', () => {
    const stats = combatStats({})
    expect(stats.health).toBe(BASE_HEALTH)
    expect(stats.damage).toBe(0)
    expect(stats.sources).toHaveLength(0)
  })

  it('adds up only the items that carry stats, and names them', () => {
    const stats = combatStats({ weapon: 'weapon-ember-blade', body: 'body-tunic' })
    expect(stats.damage).toBe(ITEM_BY_ID['weapon-ember-blade'].stats!.damage)
    // The plain tunic has no stats, so it must not appear in the breakdown.
    expect(stats.sources.map((s) => s.item.id)).toEqual(['weapon-ember-blade'])
  })

  it('ignores an unknown or empty slot rather than throwing', () => {
    expect(() => combatStats({ weapon: 'does-not-exist', body: null })).not.toThrow()
    expect(combatStats({ weapon: 'does-not-exist' }).health).toBe(BASE_HEALTH)
  })

  it('leaves most of the catalogue stat-free, so gear stays a wardrobe', () => {
    // If everything carried stats there would be exactly one correct outfit.
    const withStats = ITEMS.filter((i) => i.stats).length
    expect(withStats).toBeGreaterThan(0)
    expect(withStats).toBeLessThan(ITEMS.length / 2)
  })

  it('never lets an item carry a negative stat', () => {
    for (const item of ITEMS) {
      if (!item.stats) continue
      expect(item.stats.health ?? 0, item.id).toBeGreaterThanOrEqual(0)
      expect(item.stats.damage ?? 0, item.id).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('the seeded generator', () => {
  it('replays identically from the same seed', () => {
    const a = rng(1234)
    const b = rng(1234)
    for (let i = 0; i < 50; i += 1) expect(a()).toBe(b())
  })

  it('stays inside 0–1', () => {
    const r = rng(99)
    for (let i = 0; i < 500; i += 1) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('resolving a round', () => {
  it('replays a whole bout identically from one seed', () => {
    const play = () => {
      let you = fighter(120, 5)
      let them = fighter(120, 5)
      let seed = 42
      const log: string[] = []
      const moves: Move[] = ['cross', 'roundhouse', 'guard', 'spin_kick', 'cross', 'flying_knee']
      for (const move of moves) {
        const result = resolveRound(you, them, move, seed, 0.3)
        log.push(`${result.strikes[0].damage}/${result.strikes[1].damage}`)
        you = result.you
        them = result.them
        seed = result.nextSeed
        if (result.winner) break
      }
      return log.join(',')
    }
    expect(play()).toBe(play())
  })

  it('never drives health below zero', () => {
    let you = fighter(5)
    let them = fighter(5)
    let seed = 7
    for (let i = 0; i < 30; i += 1) {
      const result = resolveRound(you, them, 'spin_kick', seed, 0)
      expect(result.you.health).toBeGreaterThanOrEqual(0)
      expect(result.them.health).toBeGreaterThanOrEqual(0)
      you = result.you
      them = result.them
      seed = result.nextSeed
      if (result.winner) break
    }
  })

  it('ends the bout when someone runs out', () => {
    // A one-health opponent against a reliable strike ends in one round.
    const result = resolveRound(fighter(100), fighter(1), 'cross', 3, 0)
    expect(result.them.health).toBe(0)
    expect(result.winner).toBe('you')
  })

  it('lets a guard soak most of an incoming strike', () => {
    // Same seed, same incoming attack, only the defence differs.
    const open = resolveRound(fighter(200), fighter(200, 20), 'cross', 11, 0)
    const guarded = resolveRound(fighter(200), fighter(200, 20), 'guard', 11, 0)
    if (open.strikes[1].landed && guarded.strikes[1].landed) {
      expect(guarded.strikes[1].damage).toBeLessThan(open.strikes[1].damage)
    }
  })

  it('makes a landed strike hurt more when you carry damage gear', () => {
    const bare = resolveRound(fighter(200, 0), fighter(200), 'cross', 5, 0)
    const armed = resolveRound(fighter(200, 15), fighter(200), 'cross', 5, 0)
    expect(bare.strikes[0].landed).toBe(armed.strikes[0].landed)
    if (bare.strikes[0].landed) {
      expect(armed.strikes[0].damage).toBeGreaterThan(bare.strikes[0].damage)
    }
  })

  it('keeps every strike worth throwing over a long bout', () => {
    // Expected damage per round should be close enough between moves that no
    // single button is simply correct. Measured, not asserted by eye.
    const expected = ATTACKS.map((move) => {
      let total = 0
      const rounds = 4000
      for (let i = 0; i < rounds; i += 1) {
        const result = resolveRound(fighter(9999), fighter(9999), move, i * 7919 + 1, 0)
        total += result.strikes[0].damage
      }
      return { move, mean: total / rounds }
    })
    const best = Math.max(...expected.map((e) => e.mean))
    const worst = Math.min(...expected.map((e) => e.mean))
    expect(best / worst, JSON.stringify(expected)).toBeLessThan(1.6)
  })

  it('always leaves at least a scratch when a strike lands', () => {
    const result = resolveRound(fighter(200), fighter(200), 'cross', 5, 0)
    if (result.strikes[0].landed) expect(result.strikes[0].damage).toBeGreaterThanOrEqual(1)
  })
})

describe('opponents', () => {
  it('gets harder down the list', () => {
    for (let i = 1; i < OPPONENTS.length; i += 1) {
      expect(OPPONENTS[i].health).toBeGreaterThan(OPPONENTS[i - 1].health)
    }
  })

  it('leaves the first one beatable with no gear at all', () => {
    // A new account has nothing equipped. The opening bout must be winnable
    // with base stats, or the whole mode reads as pay-to-play.
    const straw = OPPONENTS[0]
    let wins = 0
    for (let trial = 0; trial < 200; trial += 1) {
      let you = fighter(BASE_HEALTH, 0)
      let them = fighter(straw.health, straw.damage)
      let seed = trial * 104729 + 13
      for (let round = 0; round < 40; round += 1) {
        const result = resolveRound(you, them, 'cross', seed, straw.caution)
        you = result.you
        them = result.them
        seed = result.nextSeed
        if (result.winner === 'you') {
          wins += 1
          break
        }
        if (result.winner) break
      }
    }
    expect(wins / 200).toBeGreaterThan(0.9)
  })

  it('points every move at an animation the rig actually has', async () => {
    const rig = await import('@/character/rig')
    for (const move of Object.values(MOVES)) {
      expect(rig[move.animation as keyof typeof rig], move.key).toBeDefined()
    }
  })
})

describe('the wall between gear and coaching', () => {
  it('keeps item stats out of every training decision path', async () => {
    // The whole promise of the reward layer is that it cannot buy better
    // coaching. This asserts it structurally rather than by good intentions:
    // no engine that produces a recommendation, target or threshold may so
    // much as mention the stats field.
    const { readdirSync, readFileSync } = await import('node:fs')
    const { join } = await import('node:path')

    const engineDir = join(process.cwd(), 'src/engine')
    const offenders: string[] = []
    for (const file of readdirSync(engineDir)) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
      if (file === 'duel.ts') continue // the one file allowed to read them
      const source = readFileSync(join(engineDir, file), 'utf8')
      if (/\.stats\b|stats\?\.\s*(health|damage)/.test(source)) offenders.push(file)
    }
    expect(offenders, `engine files reading item stats: ${offenders.join(', ')}`).toEqual([])
  })

  it('keeps the rules and economy config free of combat stats too', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const rules = readFileSync(join(process.cwd(), 'src/config/rules.ts'), 'utf8')
    expect(/health|damage/i.test(rules), 'training thresholds must not know about combat').toBe(false)
  })
})
