import { describe, expect, it } from 'vitest'
import { ECONOMY } from '@/config/economy'
import { ITEMS, ITEM_BY_ID, RARITY_ORDER, SLOT_ORDER } from '@/data/items'
import { defaultGameState } from '@/db/defaults'
import { buyPack, collectionProgress, grantItem, openPack, rollPack, unopenedPacks } from '@/engine/packs'
import type { GameState, PackKind } from '@/types'

function gameWith(overrides: Partial<GameState> = {}): GameState {
  return { ...defaultGameState(), ...overrides }
}

describe('cosmetic catalogue', () => {
  it('meets the minimum variety required for the system to feel real', () => {
    const count = (slot: string) => ITEMS.filter((i) => i.slot === slot).length
    expect(count('face')).toBeGreaterThanOrEqual(6)
    expect(count('head')).toBeGreaterThanOrEqual(6)
    expect(count('body')).toBeGreaterThanOrEqual(8)
    expect(count('hands')).toBeGreaterThanOrEqual(6)
    expect(count('feet')).toBeGreaterThanOrEqual(6)
    expect(count('weapon')).toBeGreaterThanOrEqual(10)
    expect(count('back')).toBeGreaterThanOrEqual(5)
    expect(count('aura')).toBeGreaterThanOrEqual(5)
    expect(count('companion')).toBeGreaterThanOrEqual(3)
    expect(count('title')).toBeGreaterThanOrEqual(8)
  })

  it('has unique ids and covers every slot and rarity', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
    for (const slot of SLOT_ORDER) {
      expect(ITEMS.some((i) => i.slot === slot)).toBe(true)
    }
    for (const rarity of RARITY_ORDER) {
      expect(ITEMS.some((i) => i.rarity === rarity)).toBe(true)
    }
  })
})

describe('pack rolling', () => {
  it('returns the configured number of items', () => {
    for (const kind of Object.keys(ECONOMY.packs) as PackKind[]) {
      expect(rollPack(kind, [], 1)).toHaveLength(ECONOMY.packs[kind].items)
    }
  })

  it('is deterministic for a given seed', () => {
    expect(rollPack('warband', [], 42)).toEqual(rollPack('warband', [], 42))
  })

  it('prefers items you do not already own', () => {
    // Own everything except one common; a common roll should land on that one.
    const commons = ITEMS.filter((i) => i.rarity === 'common')
    const target = commons[0]
    const owned = ITEMS.filter((i) => i.id !== target.id).map((i) => i.id)
    const results = rollPack('recruit', owned, 7)
    // Whatever rarity was rolled, it must be the only unowned item of that rarity.
    for (const result of results) {
      if (result.item.rarity === 'common') expect(result.itemId).toBe(target.id)
    }
  })

  it('honours the guaranteed rarity floor on a relic vault', () => {
    const floorIndex = RARITY_ORDER.indexOf(ECONOMY.packs.relic.floor)
    for (let seed = 0; seed < 40; seed++) {
      const results = rollPack('relic', [], seed)
      const best = Math.max(...results.map((r) => RARITY_ORDER.indexOf(r.item.rarity)))
      expect(best).toBeGreaterThanOrEqual(floorIndex)
    }
  })

  it('gives every pack a weight for every rarity', () => {
    // A missing key reads as `undefined`, which poisons the running total and
    // quietly turns the whole table into "always common".
    for (const kind of Object.keys(ECONOMY.packs) as PackKind[]) {
      for (const rarity of RARITY_ORDER) {
        expect(ECONOMY.packs[kind].weights[rarity], `${kind} / ${rarity}`).toBeTypeOf('number')
      }
    }
  })

  it('actually drops the top tiers it advertises', () => {
    // A rarity nobody can pull is a rarity that does not exist. Assert the
    // presence of real mythical and secret pulls rather than the absence of
    // anything wrong — a table where `secret` was unreachable would sail
    // through every other test in this file.
    const seen = new Set<string>()
    for (let seed = 0; seed < 1200; seed++) {
      for (const result of rollPack('relic', [], seed)) seen.add(result.item.rarity)
    }
    expect(seen.has('mythical')).toBe(true)
    expect(seen.has('secret')).toBe(true)
  })

  it('never leaks the top tiers into the entry pack', () => {
    const mythicalIndex = RARITY_ORDER.indexOf('mythical')
    for (let seed = 0; seed < 600; seed++) {
      for (const result of rollPack('recruit', [], seed)) {
        expect(RARITY_ORDER.indexOf(result.item.rarity), `seed ${seed}`).toBeLessThan(mythicalIndex)
      }
    }
  })

  it('never rolls an item that is not in the catalogue', () => {
    for (let seed = 0; seed < 25; seed++) {
      for (const result of rollPack('ember', [], seed)) {
        expect(ITEM_BY_ID[result.itemId]).toBeDefined()
      }
    }
  })
})

describe('duplicate compensation', () => {
  it('refunds coins scaled by rarity when a duplicate is rolled', () => {
    // Own the entire catalogue: every roll must be a duplicate with a refund.
    const owned = ITEMS.map((i) => i.id)
    const results = rollPack('ember', owned, 3)
    expect(results.every((r) => r.duplicate)).toBe(true)
    for (const result of results) {
      expect(result.refundCoins).toBe(ECONOMY.duplicateRefund[result.item.rarity])
    }
  })

  it('refunds more for rarer duplicates', () => {
    expect(ECONOMY.duplicateRefund.legendary).toBeGreaterThan(ECONOMY.duplicateRefund.epic)
    expect(ECONOMY.duplicateRefund.epic).toBeGreaterThan(ECONOMY.duplicateRefund.rare)
    expect(ECONOMY.duplicateRefund.rare).toBeGreaterThan(ECONOMY.duplicateRefund.common)
  })

  it('credits the refund to the wallet and increments the duplicate count', () => {
    const item = ITEMS.find((i) => i.rarity === 'epic')!
    const game = gameWith({ owned: [{ itemId: item.id, acquiredAt: 0, duplicates: 0, new: false }], coins: 0 })
    const result = grantItem(game, item.id)
    expect(result.duplicate).toBe(true)
    expect(result.refund).toBe(ECONOMY.duplicateRefund.epic)
    expect(result.game.coins).toBe(ECONOMY.duplicateRefund.epic)
    expect(result.game.owned[0].duplicates).toBe(1)
  })

  it('adds a brand-new item with no refund', () => {
    const item = ITEMS.find((i) => i.rarity === 'rare')!
    const game = gameWith({ owned: [], coins: 0 })
    const result = grantItem(game, item.id)
    expect(result.duplicate).toBe(false)
    expect(result.refund).toBe(0)
    expect(result.game.owned).toHaveLength(1)
    expect(result.game.owned[0].new).toBe(true)
  })

  it('ignores an unknown item id rather than corrupting the inventory', () => {
    const game = gameWith()
    const result = grantItem(game, 'does-not-exist')
    expect(result.game).toBe(game)
  })
})

describe('opening and buying packs', () => {
  it('opens a pack once and marks it opened', () => {
    const game = gameWith({
      packs: [{ id: 'p1', kind: 'warband', acquiredAt: 0, openedAt: null, results: [] }],
    })
    const first = openPack(game, 'p1', 5)
    expect(first.results).toHaveLength(ECONOMY.packs.warband.items)
    expect(first.game.packs[0].openedAt).not.toBeNull()

    const second = openPack(first.game, 'p1', 5)
    expect(second.results).toHaveLength(0)
    expect(second.game).toBe(first.game)
  })

  it('adds every revealed item to the inventory', () => {
    const game = gameWith({
      owned: [],
      packs: [{ id: 'p1', kind: 'ember', acquiredAt: 0, openedAt: null, results: [] }],
    })
    const result = openPack(game, 'p1', 11)
    const ownedIds = result.game.owned.map((o) => o.itemId)
    for (const roll of result.results) {
      expect(ownedIds).toContain(roll.itemId)
    }
  })

  it('refuses to buy a pack you cannot afford and explains why', () => {
    const game = gameWith({ coins: 0 })
    const result = buyPack(game, 'relic')
    expect(result.error).toMatch(/more coins/i)
    expect(result.packId).toBeNull()
    expect(result.game.coins).toBe(0)
  })

  it('deducts the cost and queues an unopened pack', () => {
    const game = gameWith({ coins: ECONOMY.packs.recruit.cost + 10, packs: [] })
    const result = buyPack(game, 'recruit')
    expect(result.error).toBeNull()
    expect(result.game.coins).toBe(10)
    expect(unopenedPacks(result.game)).toHaveLength(1)
  })
})

describe('collection progress', () => {
  it('counts owned items against the catalogue you can see', () => {
    const game = gameWith()
    const progress = collectionProgress(game)
    expect(progress.total).toBe(ITEMS.filter((i) => i.rarity !== 'secret').length)
    expect(progress.owned).toBe(new Set(game.owned.map((o) => o.itemId)).size)
    expect(progress.owned).toBeLessThan(progress.total)
  })

  it('adds up to exactly what the rarity rows say', () => {
    // The rows are printed under the headline. If the headline is larger than
    // their sum, the difference IS the number of secrets left, and the tier
    // has given itself away to anyone who can subtract.
    const game = gameWith()
    const progress = collectionProgress(game)
    const shown = RARITY_ORDER.reduce(
      (sum, r) => sum + (r === 'secret' ? progress.byRarity[r].owned : progress.byRarity[r].total),
      0,
    )
    expect(progress.total).toBe(shown)
  })

  it('grows the total by one when a secret is found', () => {
    const secret = ITEMS.find((i) => i.rarity === 'secret')
    if (!secret) throw new Error('the catalogue has no secret item to test with')
    const base = gameWith()
    const before = collectionProgress(base)
    const after = collectionProgress(
      gameWith({
        owned: [...base.owned, { itemId: secret.id, acquiredAt: 0, duplicates: 0, new: true }],
      }),
    )
    expect(after.total).toBe(before.total + 1)
    expect(after.owned).toBe(before.owned + 1)
  })

  it('does not double count duplicates', () => {
    const item = ITEMS[0]
    const game = gameWith({ owned: [{ itemId: item.id, acquiredAt: 0, duplicates: 5, new: false }] })
    expect(collectionProgress(game).owned).toBe(1)
  })
})

