/**
 * FORGED reward economy — one file, all the knobs.
 *
 * Design constraints:
 *  • Rewards are cosmetic only. No recommendation, chart, or safety message is
 *    ever gated behind coins, levels, or payment.
 *  • Rewards pay for *honest, planned* behaviour. Padding the day with a dozen
 *    one-set "workouts" must not print currency, so every reason has a daily cap
 *    and sessions must clear a real-work threshold to pay out.
 *  • Missing a day costs momentum, never accumulated progress.
 */

import type { PackKind, Rarity, RewardReason } from '@/types'

export const ECONOMY = {
  /** XP needed for level N is `base * N^exponent`, rounded. */
  leveling: {
    base: 120,
    exponent: 1.35,
    maxLevel: 60,
    /** Coins granted per level gained. */
    coinsPerLevel: 40,
    /** Every Nth level also grants a pack. */
    packEveryLevels: 3,
    packOnLevelKind: 'warband' as PackKind,
  },

  /** Base payouts before multipliers. */
  rewards: {
    workout_completed: { xp: 60, coins: 25 },
    run_completed: { xp: 45, coins: 18 },
    protein_target: { xp: 25, coins: 10 },
    checkin: { xp: 10, coins: 4 },
    rir_logged: { xp: 15, coins: 6 },
    recovery_day: { xp: 20, coins: 8 },
    deload_completed: { xp: 120, coins: 60 },
    weekly_consistency: { xp: 150, coins: 75 },
    benchmark_improved: { xp: 100, coins: 50 },
    quest_completed: { xp: 80, coins: 40 },
    /**
     * Rest-timer chess. Kept small on purpose: it is only earnable DURING a
     * real rest interval, and even at the daily cap it pays less than a single
     * workout. The character has to stay a record of training, not of chess.
     */
    puzzle_solved: { xp: 8, coins: 3 },
    level_up: { xp: 0, coins: 0 },
    duplicate_refund: { xp: 0, coins: 0 },
  } satisfies Record<RewardReason, { xp: number; coins: number }>,

  /** Anti-exploitation limits. Applied per local calendar day. */
  limits: {
    /** Max payouts per reason per day. */
    perDay: {
      workout_completed: 1,
      run_completed: 2,
      protein_target: 1,
      checkin: 1,
      rir_logged: 1,
      recovery_day: 1,
      deload_completed: 1,
      weekly_consistency: 1,
      benchmark_improved: 1,
      quest_completed: 3,
      puzzle_solved: 5,
      level_up: 99,
      duplicate_refund: 99,
    } satisfies Record<RewardReason, number>,
    /** Hard ceiling on XP earned from all sources in one day. */
    dailyXpCap: 400,
    dailyCoinCap: 200,
    /**
     * A session only pays out if it looks like real training. These are
     * deliberately low so a short, honest session still counts.
     */
    minWorkingSetsForReward: 4,
    minSessionMinutes: 6,
    minRunMinutes: 8,
    minRunDistanceKm: 1,
    /** Sets beyond this in one session stop adding to the volume bonus. */
    volumeBonusSetCap: 30,
    /** Bonus XP per working set above the minimum, up to the cap. */
    xpPerExtraSet: 2,
  },

  /** Pack contents. Weights are relative, not percentages. */
  packs: {
    recruit: {
      name: 'Recruit Cache',
      cost: 150,
      items: 1,
      weights: { common: 62, uncommon: 26, rare: 9, epic: 2.5, legendary: 0.5 },
    },
    warband: {
      name: 'Warband Crate',
      cost: 350,
      items: 2,
      weights: { common: 44, uncommon: 33, rare: 16, epic: 6, legendary: 1 },
    },
    ember: {
      name: 'Ember Reliquary',
      cost: 700,
      items: 3,
      weights: { common: 25, uncommon: 33, rare: 26, epic: 13, legendary: 3 },
    },
    relic: {
      name: 'Relic Vault',
      cost: 1400,
      items: 3,
      weights: { common: 8, uncommon: 26, rare: 36, epic: 22, legendary: 8 },
      /** Guarantees at least this rarity on one item. */
      floor: 'rare' as Rarity,
    },
  } satisfies Record<
    PackKind,
    {
      name: string
      cost: number
      items: number
      weights: Record<Rarity, number>
      floor?: Rarity
    }
  >,

  /** Coins refunded when a pack rolls something you already own. */
  duplicateRefund: {
    common: 15,
    uncommon: 30,
    rare: 70,
    epic: 160,
    legendary: 400,
  } satisfies Record<Rarity, number>,

  /** Consistency multiplier applied to workout/run XP (never to coins caps). */
  consistencyBonus: {
    /** Consistency score (0–1) → XP multiplier. */
    thresholds: [
      { score: 0.85, multiplier: 1.25 },
      { score: 0.6, multiplier: 1.1 },
      { score: 0, multiplier: 1 },
    ],
  },
} as const

export type Economy = typeof ECONOMY

/** Total XP required to reach `level` from zero. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let n = 1; n < level; n++) {
    total += Math.round(ECONOMY.leveling.base * Math.pow(n, ECONOMY.leveling.exponent))
  }
  return total
}

/** Level, plus progress toward the next one, for a total XP amount. */
export function levelFromXp(xp: number): {
  level: number
  intoLevel: number
  neededForNext: number
  progress: number
} {
  const safeXp = Math.max(0, Math.floor(xp))
  let level = 1
  while (level < ECONOMY.leveling.maxLevel && safeXp >= xpForLevel(level + 1)) level++
  const floorXp = xpForLevel(level)
  const nextXp = level >= ECONOMY.leveling.maxLevel ? floorXp : xpForLevel(level + 1)
  const needed = Math.max(1, nextXp - floorXp)
  const into = safeXp - floorXp
  return {
    level,
    intoLevel: into,
    neededForNext: needed,
    progress: level >= ECONOMY.leveling.maxLevel ? 1 : Math.min(1, into / needed),
  }
}
