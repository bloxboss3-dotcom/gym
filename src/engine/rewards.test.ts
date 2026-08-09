import { describe, expect, it } from 'vitest'
import { ECONOMY, levelFromXp, xpForLevel } from '@/config/economy'
import {
  alreadyAwarded,
  applyLedgerEntry,
  consistencyMultiplier,
  evaluateRunReward,
  evaluateSessionReward,
  grantReward,
  simpleGrant,
  todaysEarnings,
} from '@/engine/rewards'
import { defaultGameState } from '@/db/defaults'
import { toIsoDate } from '@/lib/date'
import { entry, session, set } from '@/test/factories'
import type { RewardLedgerEntry, RunLog } from '@/types'

const today = toIsoDate()

function realSession(sets = 9, minutes = 45) {
  const startedAt = Date.now() - minutes * 60_000
  return session({
    startedAt,
    endedAt: startedAt + minutes * 60_000,
    entries: [
      entry({
        exerciseId: 'barbell-bench-press',
        plannedSets: sets,
        sets: Array.from({ length: sets }, () => set(60, 10, 2)),
      }),
    ],
  })
}

function ledgerEntry(overrides: Partial<RewardLedgerEntry> = {}): RewardLedgerEntry {
  return {
    id: 'l',
    date: today,
    reason: 'workout_completed',
    xp: 60,
    coins: 25,
    sourceId: 'src',
    detail: '',
    createdAt: 0,
    ...overrides,
  }
}

describe('levelling curve', () => {
  it('starts at level 1 with zero XP', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(xpForLevel(1)).toBe(0)
  })

  it('is monotonically increasing and never returns a fractional level', () => {
    let previous = 1
    for (const xp of [0, 100, 500, 2_000, 10_000, 100_000]) {
      const { level } = levelFromXp(xp)
      expect(Number.isInteger(level)).toBe(true)
      expect(level).toBeGreaterThanOrEqual(previous)
      previous = level
    }
  })

  it('clamps at the configured maximum level', () => {
    expect(levelFromXp(50_000_000).level).toBe(ECONOMY.leveling.maxLevel)
    expect(levelFromXp(50_000_000).progress).toBe(1)
  })

  it('handles negative or nonsense XP without breaking', () => {
    expect(levelFromXp(-500).level).toBe(1)
  })
})

describe('session reward calculation', () => {
  it('pays out for a real session and scales slightly with volume', () => {
    const small = evaluateSessionReward(realSession(4))
    const large = evaluateSessionReward(realSession(16))
    expect(small.rejection).toBeNull()
    expect(large.grants[0].xp).toBeGreaterThan(small.grants[0].xp)
  })

  it('rewards honest effort logging separately', () => {
    const result = evaluateSessionReward(realSession(9))
    expect(result.grants.map((g) => g.reason)).toContain('rir_logged')
  })

  it('withholds the effort reward when RIR is mostly missing', () => {
    const startedAt = Date.now() - 40 * 60_000
    const s = session({
      startedAt,
      endedAt: startedAt + 40 * 60_000,
      entries: [
        entry({
          exerciseId: 'bench',
          plannedSets: 6,
          sets: Array.from({ length: 6 }, () => set(60, 10, null)),
        }),
      ],
    })
    expect(evaluateSessionReward(s).grants.map((g) => g.reason)).not.toContain('rir_logged')
  })

  it('does not pay for an unfinished session', () => {
    const s = { ...realSession(), status: 'active' as const }
    expect(evaluateSessionReward(s).grants).toHaveLength(0)
  })
})

describe('anti-exploitation limits', () => {
  it('refuses to pay for a token one-set "workout"', () => {
    const result = evaluateSessionReward(realSession(1))
    expect(result.grants).toHaveLength(0)
    expect(result.rejection).toMatch(new RegExp(`${ECONOMY.limits.minWorkingSetsForReward} working sets`))
  })

  it('refuses to pay for an implausibly short session', () => {
    const result = evaluateSessionReward(realSession(9, 2))
    expect(result.grants).toHaveLength(0)
    expect(result.rejection).toMatch(/minutes/i)
  })

  it('still saves the training — only the currency is withheld', () => {
    const result = evaluateSessionReward(realSession(1))
    expect(result.rejection).toMatch(/still saved|still counts/i)
  })

  it('caps the volume bonus so a 60-set session is not a jackpot', () => {
    const capped = evaluateSessionReward(realSession(ECONOMY.limits.volumeBonusSetCap + 40))
    const atCap = evaluateSessionReward(realSession(ECONOMY.limits.volumeBonusSetCap))
    expect(capped.grants[0].xp).toBe(atCap.grants[0].xp)
  })

  it('never pays twice for the same source', () => {
    const ledger = [ledgerEntry({ sourceId: 'sessionA' })]
    expect(alreadyAwarded(ledger, 'workout_completed', 'sessionA')).toBe(true)
    const decision = grantReward(simpleGrant('workout_completed', 'sessionA', 'again'), {
      date: today,
      ledger,
    })
    expect(decision.granted).toBe(false)
    expect(decision.note).toMatch(/already/i)
  })

  it('enforces the per-reason daily limit even for distinct sources', () => {
    const ledger = [ledgerEntry({ sourceId: 'sessionA' })]
    const decision = grantReward(simpleGrant('workout_completed', 'sessionB', 'second workout'), {
      date: today,
      ledger,
    })
    expect(decision.granted).toBe(false)
    expect(decision.note).toMatch(/Daily limit/i)
  })

  it('clamps a payout to the remaining daily XP and coin room', () => {
    const ledger: RewardLedgerEntry[] = [
      ledgerEntry({ reason: 'quest_completed', sourceId: 'q1', xp: ECONOMY.limits.dailyXpCap - 10, coins: ECONOMY.limits.dailyCoinCap - 5 }),
    ]
    const decision = grantReward(simpleGrant('workout_completed', 'sessionZ', 'big one', { xp: 500, coins: 500 }), {
      date: today,
      ledger,
    })
    expect(decision.granted).toBe(true)
    expect(decision.entry!.xp).toBe(10)
    expect(decision.entry!.coins).toBe(5)
    expect(decision.note).toMatch(/cap/i)
  })

  it('refuses entirely once the daily cap is exhausted', () => {
    const ledger: RewardLedgerEntry[] = [
      ledgerEntry({ reason: 'quest_completed', sourceId: 'q1', xp: ECONOMY.limits.dailyXpCap, coins: ECONOMY.limits.dailyCoinCap }),
    ]
    const decision = grantReward(simpleGrant('workout_completed', 'sessionZ', 'nope'), { date: today, ledger })
    expect(decision.granted).toBe(false)
  })

  it('does not let yesterday’s payouts eat today’s budget', () => {
    const ledger: RewardLedgerEntry[] = [
      ledgerEntry({ date: '2020-01-01', xp: ECONOMY.limits.dailyXpCap, coins: ECONOMY.limits.dailyCoinCap }),
    ]
    const decision = grantReward(simpleGrant('workout_completed', 'newSession', 'today'), { date: today, ledger })
    expect(decision.granted).toBe(true)
  })
})

describe('run rewards', () => {
  const baseRun: RunLog = {
    id: 'r1',
    date: today,
    type: 'easy',
    distanceKm: 6,
    durationSec: 2000,
    rpe: 4,
    pain: 0,
    surface: 'road',
    planned: true,
    createdAt: 0,
  }

  it('pays for a real run', () => {
    expect(evaluateRunReward(baseRun).grants).toHaveLength(1)
  })

  it('refuses a 30-second "run"', () => {
    const result = evaluateRunReward({ ...baseRun, durationSec: 30, distanceKm: 0.1 })
    expect(result.grants).toHaveLength(0)
    expect(result.rejection).toMatch(/minutes/i)
  })
})

describe('consistency multiplier', () => {
  it('rewards sustained consistency but never punishes a low score', () => {
    expect(consistencyMultiplier(0.9)).toBeGreaterThan(1)
    expect(consistencyMultiplier(0.7)).toBeGreaterThan(1)
    expect(consistencyMultiplier(0)).toBe(1)
  })

  it('is applied to the granted XP', () => {
    const plain = grantReward(simpleGrant('run_completed', 'a', ''), { date: today, ledger: [] })
    const boosted = grantReward(simpleGrant('run_completed', 'b', ''), {
      date: today,
      ledger: [],
      consistencyScore: 0.95,
    })
    expect(boosted.entry!.xp).toBeGreaterThan(plain.entry!.xp)
  })
})

describe('applying rewards to game state', () => {
  it('adds XP and coins and appends to the ledger', () => {
    const game = defaultGameState()
    const result = applyLedgerEntry(game, ledgerEntry({ xp: 100, coins: 50 }))
    expect(result.game.xp).toBe(100)
    expect(result.game.coins).toBe(game.coins + 50)
    expect(result.game.ledger).toHaveLength(1)
  })

  it('grants level-up coins and a pack at the configured interval', () => {
    const game = defaultGameState()
    const xpForLevelFour = xpForLevel(4)
    const result = applyLedgerEntry(game, ledgerEntry({ xp: xpForLevelFour, coins: 0 }))
    expect(result.leveledUp).toBe(true)
    expect(result.newLevel).toBeGreaterThanOrEqual(4)
    expect(result.packsAwarded).toBeGreaterThanOrEqual(1)
    expect(result.game.coins).toBeGreaterThan(game.coins)
  })

  it('does not mutate the game state it was given', () => {
    const game = defaultGameState()
    const before = JSON.stringify(game)
    applyLedgerEntry(game, ledgerEntry({ xp: 5000 }))
    expect(JSON.stringify(game)).toBe(before)
  })

  it('summarises today’s earnings against the caps', () => {
    const earnings = todaysEarnings([ledgerEntry({ xp: 60, coins: 25 })], today)
    expect(earnings.xp).toBe(60)
    expect(earnings.coins).toBe(25)
    expect(earnings.xpCap).toBe(ECONOMY.limits.dailyXpCap)
  })

  describe('chess must never out-earn training', () => {
    // The character is a record of physical work. Rest-timer puzzles are a
    // nice thing to do between sets, not an alternative way to earn — if a
    // day of chess ever rivalled a workout, the whole premise would be a lie.
    const puzzle = ECONOMY.rewards.puzzle_solved
    const workout = ECONOMY.rewards.workout_completed

    it('pays less per solve than a workout pays outright', () => {
      expect(puzzle.xp).toBeLessThan(workout.xp)
      expect(puzzle.coins).toBeLessThan(workout.coins)
    })

    it('caps a whole day of puzzles below a single completed workout', () => {
      const perDay = ECONOMY.limits.perDay.puzzle_solved
      expect(perDay).toBeGreaterThan(0)
      expect(puzzle.xp * perDay).toBeLessThanOrEqual(workout.xp)
      expect(puzzle.coins * perDay).toBeLessThanOrEqual(workout.coins)
    })

    it('is subject to the same daily ceiling as everything else', () => {
      const perDay = ECONOMY.limits.perDay.puzzle_solved
      expect(puzzle.xp * perDay).toBeLessThan(ECONOMY.limits.dailyXpCap)
      expect(puzzle.coins * perDay).toBeLessThan(ECONOMY.limits.dailyCoinCap)
    })

    it('refuses to pay twice for the same puzzle', () => {
      const grant = simpleGrant('puzzle_solved', 'puzzle:back-rank-1', 'solved')
      const first = grantReward(grant, { ledger: [], date: '2026-03-01' })
      expect(first.granted).toBe(true)
      const second = grantReward(grant, { ledger: [first.entry!], date: '2026-03-01' })
      expect(second.granted).toBe(false)
    })

    it('stops paying once the daily puzzle limit is reached', () => {
      const ledger: RewardLedgerEntry[] = []
      let paid = 0
      for (let i = 0; i < 20; i++) {
        const result = grantReward(simpleGrant('puzzle_solved', `puzzle:${i}`, 'solved'), {
          ledger,
          date: '2026-03-01',
        })
        if (result.granted && result.entry) {
          ledger.push(result.entry)
          paid++
        }
      }
      expect(paid).toBe(ECONOMY.limits.perDay.puzzle_solved)
    })
  })
})
