import { ECONOMY, levelFromXp } from '@/config/economy'
import type {
  GameState,
  IsoDate,
  RewardLedgerEntry,
  RewardReason,
  RunLog,
  Session,
} from '@/types'
import { newId } from '@/lib/id'

/**
 * Reward calculation.
 *
 * Two hard rules:
 *  1. Rewards are cosmetic. Nothing in the recommendation engine, the charts, or
 *     the safety content is ever gated behind XP, coins, or an item.
 *  2. The economy pays for honest, planned behaviour. Every payout is idempotent
 *     per source record, capped per reason per day, and capped in total per day,
 *     so nobody can farm currency by logging twelve one-set "workouts".
 */

export interface RewardGrant {
  reason: RewardReason
  sourceId: string
  xp: number
  coins: number
  detail: string
}

export interface RewardContext {
  date: IsoDate
  ledger: RewardLedgerEntry[]
  /** 0–1 consistency score; scales XP only, never past the daily cap. */
  consistencyScore?: number
}

export function consistencyMultiplier(score: number): number {
  for (const tier of ECONOMY.consistencyBonus.thresholds) {
    if (score >= tier.score) return tier.multiplier
  }
  return 1
}

function spentToday(ledger: RewardLedgerEntry[], date: IsoDate) {
  const today = ledger.filter((e) => e.date === date)
  return {
    xp: today.reduce((s, e) => s + e.xp, 0),
    coins: today.reduce((s, e) => s + e.coins, 0),
    byReason: today.reduce(
      (acc, e) => {
        acc[e.reason] = (acc[e.reason] ?? 0) + 1
        return acc
      },
      {} as Partial<Record<RewardReason, number>>,
    ),
  }
}

/** True when this exact source has already been paid for this reason. */
export function alreadyAwarded(
  ledger: RewardLedgerEntry[],
  reason: RewardReason,
  sourceId: string,
): boolean {
  return ledger.some((e) => e.reason === reason && e.sourceId === sourceId)
}

export interface RewardDecision {
  granted: boolean
  entry: RewardLedgerEntry | null
  /** Why a reward was reduced or refused — surfaced honestly in the UI. */
  note: string | null
}

/**
 * Apply every guard in one place: idempotency, per-reason daily limits, and the
 * global daily XP/coin caps.
 */
export function grantReward(grant: RewardGrant, ctx: RewardContext): RewardDecision {
  if (alreadyAwarded(ctx.ledger, grant.reason, grant.sourceId)) {
    return { granted: false, entry: null, note: 'Already rewarded for this.' }
  }

  const spent = spentToday(ctx.ledger, ctx.date)
  const perDayLimit = ECONOMY.limits.perDay[grant.reason]
  if ((spent.byReason[grant.reason] ?? 0) >= perDayLimit) {
    return {
      granted: false,
      entry: null,
      note: `Daily limit reached for this reward (${perDayLimit}/day). Extra sessions still count toward your training — they just do not print extra currency.`,
    }
  }

  const multiplier = consistencyMultiplier(ctx.consistencyScore ?? 0)
  let xp = Math.round(grant.xp * multiplier)
  let coins = grant.coins

  const xpRoom = Math.max(0, ECONOMY.limits.dailyXpCap - spent.xp)
  const coinRoom = Math.max(0, ECONOMY.limits.dailyCoinCap - spent.coins)
  let note: string | null = null
  if (xp > xpRoom || coins > coinRoom) {
    note = `Daily reward cap reached (${ECONOMY.limits.dailyXpCap} XP / ${ECONOMY.limits.dailyCoinCap} coins). The training still counts — the rewards are capped so the game cannot be farmed.`
  }
  xp = Math.min(xp, xpRoom)
  coins = Math.min(coins, coinRoom)

  if (xp === 0 && coins === 0) {
    return { granted: false, entry: null, note: note ?? 'No reward available right now.' }
  }

  return {
    granted: true,
    note,
    entry: {
      id: newId('rw'),
      date: ctx.date,
      reason: grant.reason,
      xp,
      coins,
      sourceId: grant.sourceId,
      detail: grant.detail,
      createdAt: Date.now(),
    },
  }
}

// ---------------------------------------------------------------------------
// Source-specific evaluation
// ---------------------------------------------------------------------------

export interface SessionRewardResult {
  grants: RewardGrant[]
  /** Non-null when the session did not qualify for a payout. */
  rejection: string | null
}

/**
 * Anti-exploitation gate for training sessions.
 *
 * A session must contain a plausible amount of real work before it pays. The
 * thresholds are intentionally low so a short honest session still counts, and
 * a rejected session is still saved and still counts toward volume and
 * recommendations — only the cosmetic currency is withheld.
 */
export function evaluateSessionReward(session: Session): SessionRewardResult {
  if (session.status !== 'completed') {
    return { grants: [], rejection: 'Session is not completed.' }
  }
  const workingSets = session.entries.flatMap((e) => e.sets.filter((s) => !s.warmup && s.reps > 0))
  const durationMin = session.endedAt ? (session.endedAt - session.startedAt) / 60000 : 0

  if (workingSets.length < ECONOMY.limits.minWorkingSetsForReward) {
    return {
      grants: [],
      rejection: `Sessions need at least ${ECONOMY.limits.minWorkingSetsForReward} working sets to earn rewards. This one is still saved and still counts toward your weekly volume.`,
    }
  }
  if (durationMin < ECONOMY.limits.minSessionMinutes) {
    return {
      grants: [],
      rejection: `Sessions need to run at least ${ECONOMY.limits.minSessionMinutes} minutes to earn rewards. The training is saved either way.`,
    }
  }

  const base = ECONOMY.rewards.workout_completed
  const extraSets = Math.max(
    0,
    Math.min(workingSets.length, ECONOMY.limits.volumeBonusSetCap) -
      ECONOMY.limits.minWorkingSetsForReward,
  )
  const bonusXp = extraSets * ECONOMY.limits.xpPerExtraSet
  const bonusCoins = extraSets * ECONOMY.limits.coinsPerExtraSet

  const grants: RewardGrant[] = [
    {
      reason: 'workout_completed',
      sourceId: session.id,
      xp: base.xp + bonusXp,
      coins: base.coins + bonusCoins,
      detail: `${workingSets.length} working sets across ${session.entries.length} exercises${bonusXp ? ` (+${bonusXp} XP, +${bonusCoins} coins for the volume)` : ''}.`,
    },
  ]

  // Honest effort logging is rewarded separately — it makes the recommendation
  // engine work, so it is worth paying for.
  const rated = workingSets.filter((s) => s.rir !== null)
  if (workingSets.length > 0 && rated.length / workingSets.length >= 0.8) {
    grants.push({
      reason: 'rir_logged',
      sourceId: session.id,
      xp: ECONOMY.rewards.rir_logged.xp,
      coins: ECONOMY.rewards.rir_logged.coins,
      detail: `Reps in reserve logged on ${rated.length} of ${workingSets.length} working sets.`,
    })
  }

  return { grants, rejection: null }
}

export function evaluateRunReward(run: RunLog): SessionRewardResult {
  const minutes = run.durationSec / 60
  if (minutes < ECONOMY.limits.minRunMinutes || run.distanceKm < ECONOMY.limits.minRunDistanceKm) {
    return {
      grants: [],
      rejection: `Runs need at least ${ECONOMY.limits.minRunMinutes} minutes and ${ECONOMY.limits.minRunDistanceKm} km to earn rewards. Short shake-outs still count toward your weekly total.`,
    }
  }
  return {
    grants: [
      {
        reason: 'run_completed',
        sourceId: run.id,
        xp: ECONOMY.rewards.run_completed.xp,
        coins: ECONOMY.rewards.run_completed.coins,
        detail: `${run.distanceKm.toFixed(2)} km ${run.type.replace('_', '/')} run.`,
      },
    ],
    rejection: null,
  }
}

export function simpleGrant(
  reason: RewardReason,
  sourceId: string,
  detail: string,
  override?: { xp?: number; coins?: number },
): RewardGrant {
  const base = ECONOMY.rewards[reason]
  return {
    reason,
    sourceId,
    xp: override?.xp ?? base.xp,
    coins: override?.coins ?? base.coins,
    detail,
  }
}

// ---------------------------------------------------------------------------
// Applying rewards to game state
// ---------------------------------------------------------------------------

export interface ApplyResult {
  game: GameState
  leveledUp: boolean
  newLevel: number
  packsAwarded: number
}

/** Pure: returns a new GameState with the ledger entry applied. */
export function applyLedgerEntry(game: GameState, entry: RewardLedgerEntry): ApplyResult {
  const beforeLevel = levelFromXp(game.xp).level
  const xp = game.xp + entry.xp
  const afterLevel = levelFromXp(xp).level
  const levelsGained = Math.max(0, afterLevel - beforeLevel)

  let coins = game.coins + entry.coins
  const packs = [...game.packs]
  let packsAwarded = 0

  if (levelsGained > 0) {
    coins += levelsGained * ECONOMY.leveling.coinsPerLevel
    for (let lvl = beforeLevel + 1; lvl <= afterLevel; lvl++) {
      if (lvl % ECONOMY.leveling.packEveryLevels === 0) {
        packs.push({
          id: newId('pack'),
          kind: ECONOMY.leveling.packOnLevelKind,
          acquiredAt: Date.now(),
          openedAt: null,
          results: [],
        })
        packsAwarded++
      }
    }
  }

  return {
    game: {
      ...game,
      xp,
      coins,
      packs,
      ledger: [...game.ledger, entry],
    },
    leveledUp: levelsGained > 0,
    newLevel: afterLevel,
    packsAwarded,
  }
}

/** Total XP and coins earned on a given day — used by the Today screen. */
export function todaysEarnings(ledger: RewardLedgerEntry[], date: IsoDate) {
  const today = ledger.filter((e) => e.date === date)
  return {
    xp: today.reduce((s, e) => s + e.xp, 0),
    coins: today.reduce((s, e) => s + e.coins, 0),
    xpCap: ECONOMY.limits.dailyXpCap,
    coinCap: ECONOMY.limits.dailyCoinCap,
    entries: today,
  }
}
