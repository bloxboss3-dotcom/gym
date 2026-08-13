import { describe, expect, it } from 'vitest'
import { ECONOMY } from '@/config/economy'
import {
  ANVIL,
  createRound,
  hammerAt,
  judge,
  scoreRound,
  sweepMsFor,
  type Verdict,
} from '@/engine/anvil'

describe('the anvil round', () => {
  it('lays out one hot zone per strike, deterministically', () => {
    const a = createRound(42)
    const b = createRound(42)
    expect(a.zones).toHaveLength(ANVIL.strikes)
    expect(a.zones).toEqual(b.zones)
    expect(createRound(43).zones).not.toEqual(a.zones)
  })

  it('never parks a zone in the turnaround at either end', () => {
    // The hammer decelerates as it reverses, so a zone at the edge is a free
    // hit rather than a timing test.
    for (let seed = 1; seed < 300; seed += 1) {
      for (const zone of createRound(seed).zones) {
        expect(zone, `seed ${seed}`).toBeGreaterThanOrEqual(ANVIL.edgeMargin)
        expect(zone).toBeLessThanOrEqual(1 - ANVIL.edgeMargin)
      }
    }
  })

  it('speeds up every strike but never past a reactable pace', () => {
    let previous = Number.POSITIVE_INFINITY
    for (let i = 0; i < ANVIL.strikes; i += 1) {
      const sweep = sweepMsFor(i)
      expect(sweep).toBeLessThanOrEqual(previous)
      expect(sweep).toBeGreaterThanOrEqual(ANVIL.minSweepMs)
      previous = sweep
    }
    expect(sweepMsFor(0)).toBeGreaterThan(sweepMsFor(ANVIL.strikes - 1))
  })
})

describe('the hammer', () => {
  it('sweeps across and back rather than jumping', () => {
    // A saw wave would teleport from one edge to the other. Sampling finely,
    // no two consecutive positions should be far apart.
    let previous = hammerAt(0, 0)
    for (let t = 8; t < 6000; t += 8) {
      const at = hammerAt(t, 0)
      expect(Math.abs(at - previous), `jump at ${t}ms`).toBeLessThan(0.06)
      previous = at
    }
  })

  it('stays on the bar', () => {
    for (let t = 0; t < 4000; t += 7) {
      const at = hammerAt(t, 2)
      expect(at).toBeGreaterThanOrEqual(0)
      expect(at).toBeLessThanOrEqual(1)
    }
  })

  it('actually reaches both ends', () => {
    const samples = Array.from({ length: 900 }, (_, i) => hammerAt(i * 4, 0))
    expect(Math.min(...samples)).toBeLessThan(0.02)
    expect(Math.max(...samples)).toBeGreaterThan(0.98)
  })
})

describe('judging a strike', () => {
  it('grades by distance from the centre of the hot metal', () => {
    expect(judge(0.5, 0.5)).toBe('perfect')
    expect(judge(0.5 + ANVIL.perfectHalf * 0.9, 0.5)).toBe('perfect')
    expect(judge(0.5 + ANVIL.zoneHalf * 0.9, 0.5)).toBe('good')
    expect(judge(0.5 + ANVIL.zoneHalf * 1.4, 0.5)).toBe('miss')
  })

  it('is symmetric about the zone', () => {
    for (const offset of [0.01, 0.04, 0.08, 0.2]) {
      expect(judge(0.5 - offset, 0.5)).toBe(judge(0.5 + offset, 0.5))
    }
  })
})

describe('scoring a round', () => {
  const round = (...verdicts: Verdict[]) => scoreRound(verdicts)

  it('pays for accuracy and nothing else', () => {
    const all = round('perfect', 'perfect', 'perfect', 'perfect', 'perfect')
    expect(all.flawless).toBe(true)
    expect(all.coins).toBe(ANVIL.strikes * ANVIL.coinsPerfect + ANVIL.flawlessBonus)

    const none = round('miss', 'miss', 'miss', 'miss', 'miss')
    expect(none.coins).toBe(0)
    expect(none.xp).toBe(0)
  })

  it('never pays a negative, and a miss costs only its own strike', () => {
    const mixed = round('perfect', 'miss', 'good', 'miss', 'perfect')
    expect(mixed.coins).toBe(2 * ANVIL.coinsPerfect + ANVIL.coinsGood)
    expect(mixed.coins).toBeGreaterThan(0)
    expect(mixed.misses).toBe(2)
  })

  it('reserves the flawless bonus for an actually flawless round', () => {
    expect(round('perfect', 'perfect', 'perfect', 'perfect', 'good').flawless).toBe(false)
    expect(round('perfect', 'perfect', 'perfect', 'perfect').flawless).toBe(false)
  })

  it('cannot out-earn its own daily ceiling', () => {
    // The reward ledger caps this reason per day; the engine must not be able
    // to hand out more in one round than the economy says a round is worth.
    const best = round('perfect', 'perfect', 'perfect', 'perfect', 'perfect')
    expect(best.coins).toBeLessThanOrEqual(ECONOMY.rewards.anvil_round.coins)
    expect(best.xp).toBeLessThanOrEqual(ECONOMY.rewards.anvil_round.xp)
  })

  it('stays a coin faucet rather than a levelling route', () => {
    // A full day of perfect rounds must be worth a rounding error in XP next
    // to a single session, or the character's build stops meaning training.
    const perDay = ECONOMY.limits.perDay.anvil_round
    const best = round('perfect', 'perfect', 'perfect', 'perfect', 'perfect')
    expect(best.xp * perDay).toBeLessThan(ECONOMY.rewards.workout_completed.xp / 2)
    // And it should be a genuinely useful amount of currency.
    expect(best.coins * perDay).toBeGreaterThan(ECONOMY.rewards.workout_completed.coins * 4)
  })

  it('describes the round in words', () => {
    expect(round('perfect', 'perfect', 'perfect', 'perfect', 'perfect').headline).toMatch(/perfect/i)
    expect(round('miss', 'miss', 'miss', 'miss', 'miss').headline.length).toBeGreaterThan(0)
    expect(round('good', 'good', 'miss', 'good', 'perfect').headline.length).toBeGreaterThan(0)
  })

  it('reports heat between 0 and 1', () => {
    for (const verdicts of [
      ['miss', 'miss', 'miss', 'miss', 'miss'],
      ['good', 'good', 'good', 'good', 'good'],
      ['perfect', 'perfect', 'perfect', 'perfect', 'perfect'],
    ] as Verdict[][]) {
      const heat = scoreRound(verdicts).heat
      expect(heat).toBeGreaterThanOrEqual(0)
      expect(heat).toBeLessThanOrEqual(1)
    }
  })
})
