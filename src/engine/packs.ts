import { ECONOMY } from '@/config/economy'
import { ITEMS, ITEM_BY_ID, RARITY_ORDER } from '@/data/items'
import type { CosmeticItem, GameState, OwnedItem, PackInstance, PackKind, Rarity } from '@/types'
import { STARTING_MOVES, UNLOCKABLE_MOVES } from '@/data/moves'
import { makeRng, newId } from '@/lib/id'

/**
 * Pack rolling and duplicate compensation.
 *
 * Rolls are seedable so the behaviour is unit-testable and reproducible. A
 * duplicate is never a dead reward: it converts to coins at a rate that scales
 * with rarity, so a legendary duplicate meaningfully funds the next pack.
 */

export interface RollResult {
  itemId: string
  item: CosmeticItem
  duplicate: boolean
  refundCoins: number
}

function pickRarity(weights: Record<Rarity, number>, rng: () => number): Rarity {
  const total = RARITY_ORDER.reduce((sum, r) => sum + (weights[r] ?? 0), 0)
  let roll = rng() * total
  for (const rarity of RARITY_ORDER) {
    roll -= weights[rarity] ?? 0
    if (roll <= 0) return rarity
  }
  return 'common'
}

/**
 * Pick an item of a rarity, strongly preferring something not already owned so
 * packs keep feeling like progress. Falls back to a duplicate when the rarity
 * is fully collected.
 */
function pickItem(rarity: Rarity, ownedIds: Set<string>, rng: () => number): CosmeticItem {
  const pool = ITEMS.filter((i) => i.rarity === rarity)
  const fresh = pool.filter((i) => !ownedIds.has(i.id))
  const source = fresh.length ? fresh : pool
  if (!source.length) {
    // Should never happen with the shipped catalogue, but never crash a reward.
    return ITEMS[Math.floor(rng() * ITEMS.length)]
  }
  return source[Math.floor(rng() * source.length)]
}

export function rollPack(kind: PackKind, ownedIds: string[], seed?: number): RollResult[] {
  const config = ECONOMY.packs[kind]
  const rng = makeRng(seed ?? Math.floor(Math.random() * 2 ** 31))
  const owned = new Set(ownedIds)
  const results: RollResult[] = []

  for (let i = 0; i < config.items; i++) {
    let rarity = pickRarity(config.weights, rng)
    // A guaranteed floor applies to the last item if nothing already cleared it.
    const floor = 'floor' in config ? (config.floor as Rarity) : null
    if (floor && i === config.items - 1) {
      const cleared = results.some(
        (r) => RARITY_ORDER.indexOf(r.item.rarity) >= RARITY_ORDER.indexOf(floor),
      )
      if (!cleared && RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(floor)) rarity = floor
    }

    const item = pickItem(rarity, owned, rng)
    const duplicate = owned.has(item.id)
    results.push({
      itemId: item.id,
      item,
      duplicate,
      refundCoins: duplicate ? ECONOMY.duplicateRefund[item.rarity] : 0,
    })
    owned.add(item.id)
  }

  return results
}

export interface OpenPackResult {
  game: GameState
  results: RollResult[]
  coinsRefunded: number
}

/** Pure state transition for opening a pack the user already owns. */
export function openPack(game: GameState, packId: string, seed?: number): OpenPackResult {
  const pack = game.packs.find((p) => p.id === packId)
  if (!pack || pack.openedAt !== null) {
    return { game, results: [], coinsRefunded: 0 }
  }
  const ownedIds = game.owned.map((o) => o.itemId)
  const results = rollPack(pack.kind, ownedIds, seed)
  const coinsRefunded = results.reduce((sum, r) => sum + r.refundCoins, 0)

  const owned: OwnedItem[] = [...game.owned]
  for (const result of results) {
    const existing = owned.find((o) => o.itemId === result.itemId)
    if (existing) {
      existing.duplicates += 1
    } else {
      owned.push({ itemId: result.itemId, acquiredAt: Date.now(), duplicates: 0, new: true })
    }
  }

  const packs = game.packs.map((p) =>
    p.id === packId ? { ...p, openedAt: Date.now(), results: results.map((r) => r.itemId) } : p,
  )

  return {
    game: { ...game, owned, packs, coins: game.coins + coinsRefunded },
    results,
    coinsRefunded,
  }
}

export function buyPack(game: GameState, kind: PackKind): { game: GameState; error: string | null; packId: string | null } {
  const cost = ECONOMY.packs[kind].cost
  if (game.coins < cost) {
    return { game, error: `You need ${cost - game.coins} more coins for a ${ECONOMY.packs[kind].name}.`, packId: null }
  }
  const pack: PackInstance = {
    id: newId('pack'),
    kind,
    acquiredAt: Date.now(),
    openedAt: null,
    results: [],
  }
  return {
    game: { ...game, coins: game.coins - cost, packs: [...game.packs, pack] },
    error: null,
    packId: pack.id,
  }
}

export function grantItem(game: GameState, itemId: string): { game: GameState; duplicate: boolean; refund: number } {
  const item = ITEM_BY_ID[itemId]
  if (!item) return { game, duplicate: false, refund: 0 }
  const existing = game.owned.find((o) => o.itemId === itemId)
  if (existing) {
    const refund = ECONOMY.duplicateRefund[item.rarity]
    return {
      game: {
        ...game,
        coins: game.coins + refund,
        owned: game.owned.map((o) =>
          o.itemId === itemId ? { ...o, duplicates: o.duplicates + 1 } : o,
        ),
      },
      duplicate: true,
      refund,
    }
  }
  return {
    game: {
      ...game,
      owned: [...game.owned, { itemId, acquiredAt: Date.now(), duplicates: 0, new: true }],
    },
    duplicate: false,
    refund: 0,
  }
}

export function unopenedPacks(game: GameState): PackInstance[] {
  return game.packs.filter((p) => p.openedAt === null)
}

export function collectionProgress(game: GameState): { owned: number; total: number; byRarity: Record<Rarity, { owned: number; total: number }> } {
  const ownedIds = new Set(game.owned.map((o) => o.itemId))
  const byRarity = RARITY_ORDER.reduce(
    (acc, r) => {
      acc[r] = { owned: 0, total: 0 }
      return acc
    },
    {} as Record<Rarity, { owned: number; total: number }>,
  )
  for (const item of ITEMS) {
    byRarity[item.rarity].total++
    if (ownedIds.has(item.id)) byRarity[item.rarity].owned++
  }
  return { owned: ownedIds.size, total: ITEMS.length, byRarity }
}


// ---------------------------------------------------------------------------
// Technique crates
// ---------------------------------------------------------------------------

/**
 * Roll one fighting technique you do not already have.
 *
 * No duplicates, ever. A crate that can hand back something you own turns a
 * finite set of eight moves into a slot machine, and the point of these is to
 * change how you fight, not to farm refunds. When everything is unlocked the
 * crate refuses to be bought at all rather than paying out nothing.
 */
export function rollTechnique(unlockedIds: string[], seed?: number): string | null {
  const owned = new Set([...STARTING_MOVES, ...unlockedIds])
  const pool = UNLOCKABLE_MOVES.filter((m) => !owned.has(m.id))
  if (!pool.length) return null

  const rng = makeRng(seed ?? 1)
  const weights = ECONOMY.techniqueCrate.weights as Record<Rarity, number>
  // Weight by rarity, but only across what is actually still available, so the
  // last legendary cannot become unreachable because commons soak the roll.
  const total = pool.reduce((sum, m) => sum + (weights[m.rarity] ?? 0.001), 0)
  let roll = rng() * total
  for (const move of pool) {
    roll -= weights[move.rarity] ?? 0.001
    if (roll <= 0) return move.id
  }
  return pool[pool.length - 1].id
}

export function buyTechnique(
  game: GameState,
  seed?: number,
): { game: GameState; error: string | null; moveId: string | null } {
  const cost = ECONOMY.techniqueCrate.cost
  const unlocked = game.unlockedMoves ?? []
  if (rollTechnique(unlocked, seed) === null) {
    return { game, error: 'Every technique is already unlocked.', moveId: null }
  }
  if (game.coins < cost) {
    return { game, error: `Not enough coins. A scroll costs ${cost}.`, moveId: null }
  }
  const moveId = rollTechnique(unlocked, seed)!
  return {
    game: { ...game, coins: game.coins - cost, unlockedMoves: [...unlocked, moveId] },
    error: null,
    moveId,
  }
}
