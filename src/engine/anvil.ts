/**
 * The Anvil — a timing game for the ninety seconds between sets.
 *
 * A hammer sweeps across the bar and you strike when it crosses the hot metal.
 * Five strikes, each faster than the last. It exists because coins were slow
 * and the rest timer was dead air, and because the one thing you can reliably
 * do one-handed, standing up, mid-session, is tap once at the right moment.
 *
 * Designed against three constraints that most of the shape falls out of:
 *
 *   It has to be finishable inside a real rest interval, so a round is about
 *   eight seconds and can be abandoned at any point with nothing lost.
 *
 *   It cannot be farmable. Payouts are capped per day by the same ledger every
 *   other reward goes through, and the game is only reachable while a rest
 *   timer is actually running — you have to have done a set to play it.
 *
 *   It cannot punish. A miss costs the coins from that strike and nothing
 *   else. Nobody should finish a set worried about a mini-game.
 *
 * Pure and deterministic like the rest of `src/engine/`: the hot zones come
 * from a seed, and the only thing the player contributes is when they tap.
 */

export const ANVIL = {
  /** Strikes in a round. */
  strikes: 5,
  /** Time for the hammer to cross the bar once, on the first strike. */
  sweepMs: 1500,
  /** Each strike is this much faster than the one before. */
  speedUp: 0.87,
  /** However fast it gets, never faster than a person can react to. */
  minSweepMs: 700,
  /** Half-width of the hot zone, as a fraction of the bar. */
  zoneHalf: 0.085,
  /** Half-width of the perfect core inside it. */
  perfectHalf: 0.028,
  /** Keeps a zone off the very edges, where the hammer turns around. */
  edgeMargin: 0.16,
  /** Coins per strike. */
  coinsPerfect: 8,
  coinsGood: 4,
  /** Bonus for a flawless round. */
  flawlessBonus: 10,
  /**
   * XP is deliberately tiny, and only perfect strikes pay any at all — this is
   * a coin faucet, not a levelling route. A full day of flawless rounds is
   * worth a quarter of one workout, so the character's build keeps meaning
   * training rather than tapping.
   */
  xpPerfect: 1,
  xpGood: 0,
} as const

export type Verdict = 'perfect' | 'good' | 'miss'

export interface AnvilRound {
  seed: number
  /** Hot-zone centre for each strike, 0–1 along the bar. */
  zones: number[]
}

/** Mulberry32 — small, fast, and the same one the packs use. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Lay out a round.
 *
 * Zones avoid the outer sixth of the bar in both directions, because the
 * hammer decelerates as it turns around and a zone parked in the turn is a
 * free hit rather than a timing test.
 */
export function createRound(seed: number): AnvilRound {
  const random = rng(seed || 1)
  const span = 1 - ANVIL.edgeMargin * 2
  return {
    seed: seed >>> 0 || 1,
    zones: Array.from({ length: ANVIL.strikes }, () => ANVIL.edgeMargin + random() * span),
  }
}

/** How long one crossing takes on a given strike. */
export function sweepMsFor(strikeIndex: number): number {
  return Math.max(ANVIL.minSweepMs, Math.round(ANVIL.sweepMs * ANVIL.speedUp ** strikeIndex))
}

/**
 * Where the hammer is at a given moment, 0–1.
 *
 * A triangle wave, so it crosses the bar and comes back rather than jumping
 * from the right edge to the left.
 */
export function hammerAt(elapsedMs: number, strikeIndex: number): number {
  const period = sweepMsFor(strikeIndex) * 2
  const phase = (elapsedMs % period) / period
  return phase < 0.5 ? phase * 2 : 2 - phase * 2
}

export function judge(position: number, zoneCentre: number): Verdict {
  const distance = Math.abs(position - zoneCentre)
  if (distance <= ANVIL.perfectHalf) return 'perfect'
  if (distance <= ANVIL.zoneHalf) return 'good'
  return 'miss'
}

export interface AnvilResult {
  verdicts: Verdict[]
  perfects: number
  goods: number
  misses: number
  flawless: boolean
  coins: number
  xp: number
  /** 0–1, for the heat bar. Purely cosmetic. */
  heat: number
  headline: string
}

export function scoreRound(verdicts: Verdict[]): AnvilResult {
  const perfects = verdicts.filter((v) => v === 'perfect').length
  const goods = verdicts.filter((v) => v === 'good').length
  const misses = verdicts.filter((v) => v === 'miss').length
  const flawless = verdicts.length === ANVIL.strikes && perfects === ANVIL.strikes

  const coins =
    perfects * ANVIL.coinsPerfect + goods * ANVIL.coinsGood + (flawless ? ANVIL.flawlessBonus : 0)
  const xp = perfects * ANVIL.xpPerfect + goods * ANVIL.xpGood

  const best = ANVIL.strikes * ANVIL.coinsPerfect + ANVIL.flawlessBonus
  return {
    verdicts,
    perfects,
    goods,
    misses,
    flawless,
    coins,
    xp,
    heat: Math.min(1, coins / best),
    headline: flawless
      ? 'Perfectly struck.'
      : misses === verdicts.length
        ? 'Cold. Nothing took.'
        : perfects >= 3
          ? 'Well struck.'
          : 'It will hold.',
  }
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  perfect: 'Perfect',
  good: 'Solid',
  miss: 'Missed',
}
