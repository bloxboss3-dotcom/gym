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
  /**
   * How the warrior's build tracks levelling.
   *
   * Muscle on the character is a record of training, so it is driven by level
   * — which is driven by logged sessions — and not by anything purchasable.
   * The curve is deliberately front-loaded: the visible change from level 1 to
   * 5 is larger than from 25 to 30, which is also how it works in a gym.
   */
  character: {
    /** Level at which the build reaches its maximum. */
    fullBuildLevel: 30,
    /** Curve exponent below 1 front-loads the visible change. */
    buildCurve: 0.62,
  },

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
    /**
     * A finished session.
     *
     * Coins are set so that ANY session clearing the honesty threshold buys
     * the cheapest pack outright, and a big one buys it with change to spare.
     * At 25 a workout against a 150 pack it took six sessions to open
     * anything, which puts the reward for training a fortnight away from the
     * training — and a reward you cannot feel is not doing the job the
     * cosmetic layer exists to do.
     *
     * The anti-farming design is untouched: this pays once a day, and only
     * for a session with real work in it. Making one session worth one pack
     * changes how it feels, not how hard it is to abuse.
     */
    workout_completed: { xp: 60, coins: 120 },
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
    /**
     * The Anvil. Coin-heavy and XP-light on purpose: it is a faucet for the
     * currency that buys cosmetics, not a route to levels. Levels come from
     * training, and the warrior's build comes from levels, so a mini-game
     * must never be a way to grow the character.
     *
     * Payout is passed in per round from the engine rather than taken from
     * here, so these are the ceiling a single round can be worth.
     */
    anvil_round: { xp: 5, coins: 30 },
    /**
     * Taking an intensity challenge and finishing it.
     *
     * Paid noticeably better per unit of effort than anything else here,
     * because unlike a mini-game this IS training — a set past failure at the
     * end of an exercise, on a movement where the volume was genuinely short.
     * Capped at the same two per session the fatigue budget allows, so the
     * incentive can never argue for a third.
     *
     * Deliberately below a whole session: the reward for finishing a workout
     * must always beat the reward for garnishing one.
     */
    challenge_completed: { xp: 12, coins: 20 },
    /**
     * Crossing a strength percentile band. Paid for the CLIMB, never for the
     * standing: rewarding a percentile outright would hand the biggest prizes
     * to whoever walked in strongest and the smallest to the person the app
     * can help most. Every band is worth the same, so 30 → 40 pays exactly
     * what 80 → 90 pays, and each one can only ever be collected once.
     */
    percentile_band: { xp: 50, coins: 25 },
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
      anvil_round: 3,
      /**
       * Not a limit on doing them — there is no session cap on drop sets any
       * more. This is where the PAYING stops. Uncapped, the coins rather
       * than the training would become the reason to add a fourth; capped at
       * two it read as permission. Four pays for a genuinely hard session and
       * then goes quiet.
       */
      challenge_completed: 4,
      percentile_band: 3,
      level_up: 99,
      duplicate_refund: 99,
    } satisfies Record<RewardReason, number>,
    /** Hard ceiling on XP earned from all sources in one day. */
    dailyXpCap: 400,
    /**
     * Raised alongside the workout payout. The per-reason caps above are what
     * actually stop farming — one workout a day, three anvil rounds, two
     * challenges. Leaving this at 200 while a single session pays 120 would
     * mean the mini-games silently paid nothing on any day you trained
     * properly, which punishes the training.
     */
    dailyCoinCap: 400,
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
    /** And coins, so a harder session is worth more than a token one. */
    coinsPerExtraSet: 4,
  },

  /** Pack contents. Weights are relative, not percentages. */
  packs: {
    recruit: {
      name: 'Recruit Cache',
      cost: 120,
      items: 1,
      weights: { common: 62, uncommon: 26, rare: 9, epic: 2.5, legendary: 0.5, mythical: 0, secret: 0 },
    },
    warband: {
      name: 'Warband Crate',
      cost: 350,
      items: 2,
      weights: { common: 43, uncommon: 33, rare: 16, epic: 6, legendary: 1.8, mythical: 0.2, secret: 0 },
    },
    ember: {
      name: 'Ember Reliquary',
      cost: 700,
      items: 3,
      weights: { common: 24, uncommon: 32, rare: 26, epic: 13, legendary: 4, mythical: 0.9, secret: 0.1 },
    },
    relic: {
      name: 'Relic Vault',
      cost: 1400,
      items: 3,
      weights: { common: 6, uncommon: 24, rare: 34, epic: 22, legendary: 10, mythical: 3.4, secret: 0.6 },
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
    mythical: 900,
    secret: 1500,
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


/**
 * Build, 0 → 1, from level.
 *
 * Clamped at both ends so the renderer never has to defend itself against a
 * negative level or a level past the cap.
 */
export function buildFromLevel(level: number): number {
  const { fullBuildLevel, buildCurve } = ECONOMY.character
  const t = Math.min(1, Math.max(0, (level - 1) / Math.max(1, fullBuildLevel - 1)))
  return Math.pow(t, buildCurve)
}

/** Build straight from XP, for callers that only hold the raw number. */
export function buildFromXp(xp: number): number {
  return buildFromLevel(levelFromXp(xp).level)
}
