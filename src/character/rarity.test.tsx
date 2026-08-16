import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Warrior } from '@/character/Warrior'
import { ITEMS, ITEMS_BY_SLOT, ITEM_BY_ID, RARITY_ORDER } from '@/data/items'
import type { CosmeticItem, Slot } from '@/types'

/**
 * The rarity ladder is supposed to be visible.
 *
 * Two separate promises, and the tests below are split the same way:
 *
 *  1. Every item from legendary up MOVES. Not "has an animation somewhere in
 *     the file" — this warrior, wearing this item, emits an element carrying a
 *     class that the stylesheet animates.
 *  2. The tiers are DIFFERENT from each other. Legendary, mythical and secret
 *     must not resolve to the same treatment, or the ladder is a label rather
 *     than something you can see.
 *
 * The one thing these cannot check is whether the CSS behind the class exists,
 * because jsdom has no stylesheet. That half lives in the browser smoke suite,
 * which reads the computed animation-name off a real element — see
 * `scripts/smoke-test.mjs`.
 */

const BASE: Partial<Record<Slot, string | null>> = {
  face: 'face-recruit',
  head: 'head-none',
  body: 'body-tunic',
  hands: 'hands-wraps',
  feet: 'feet-wraps',
  weapon: 'weapon-none',
  back: 'back-none',
  aura: 'aura-none',
  companion: 'companion-none',
  pose: 'pose-ready',
}

const draw = (item: CosmeticItem, opts: { still?: boolean } = {}) =>
  renderToStaticMarkup(
    <Warrior
      equipped={{ ...BASE, [item.slot]: item.id }}
      frame="masculine"
      build={0.6}
      still={opts.still}
    />,
  )

const TOP = ['legendary', 'mythical', 'secret'] as const
const topTier = ITEMS.filter((i) => (TOP as readonly string[]).includes(i.rarity))

/** Slots the renderer has nothing to draw for. A title is a word. */
const NOT_DRAWN = new Set<Slot>(['title'])

describe('every item from legendary up animates', () => {
  const drawable = topTier.filter((i) => !NOT_DRAWN.has(i.slot))

  it('has something to check', () => {
    // Guards against the whole suite passing because a filter emptied it.
    expect(drawable.length).toBeGreaterThan(20)
  })

  it.each(drawable.map((i) => [i.name, i] as const))(
    '%s carries its rarity tier',
    (_name, item) => {
      expect(draw(item)).toContain(`data-rarity="${item.rarity}"`)
    },
  )

  it('feeds each one a glow colour, or the halo renders as nothing', () => {
    // drop-shadow(0 0 6px undefined) is not an error, it is invisible.
    const missing = topTier.filter((i) => !(i.palette.glow ?? i.palette.accent))
    expect(missing.map((i) => i.id)).toEqual([])
  })
})

describe('nothing below legendary does', () => {
  it.each(
    RARITY_ORDER.filter((r) => !(TOP as readonly string[]).includes(r)).map((r) => [r] as const),
  )('%s items are left alone', (rarity) => {
    const sample = ITEMS.filter((i) => i.rarity === rarity && !NOT_DRAWN.has(i.slot))
    expect(sample.length).toBeGreaterThan(0)
    for (const item of sample) expect(draw(item)).not.toContain('data-rarity=')
  })
})

describe('the tiers are not the same treatment', () => {
  /*
    The failure this is written against is the cheap one: wire every rarity to
    the same class, ship it, and the ladder "works" — everything glows and
    nothing is rarer than anything else.
  */
  const classOf = (rarity: string) => {
    const item = topTier.find((i) => i.rarity === rarity && !NOT_DRAWN.has(i.slot))
    if (!item) throw new Error(`no drawable ${rarity} item in the catalogue`)
    const svg = draw(item)
    const at = svg.indexOf(`data-rarity="${rarity}"`)
    // The class attribute on the same element, which React emits just before it.
    return svg.slice(0, at).match(/class="([^"]*)"[^"]*$/)?.[1] ?? ''
  }

  it('gives legendary, mythical and secret three different classes', () => {
    const classes = TOP.map(classOf)
    expect(classes.every(Boolean)).toBe(true)
    expect(new Set(classes).size).toBe(3)
  })
})

describe('stillness wins', () => {
  it('drops the tier entirely when the renderer is told to hold still', () => {
    // Item previews render `still`, and a grid of forty pulsing thumbnails is
    // both unreadable and the reason the flag exists.
    for (const item of topTier.filter((i) => !NOT_DRAWN.has(i.slot))) {
      expect(draw(item, { still: true })).not.toContain('data-rarity=')
    }
  })

  it('leaves no animation class anywhere on a still warrior', () => {
    const secret = topTier.find((i) => i.rarity === 'secret' && i.slot === 'aura')
    if (!secret) throw new Error('expected a secret aura to test with')
    const svg = draw(secret, { still: true })
    expect(svg).not.toMatch(/class="[^"]*\banim-/)
    expect(svg).not.toMatch(/class="[^"]*\brar-/)
  })
})

describe('the new gear is actually drawn', () => {
  /*
    An item whose `art` key no art component handles renders nothing and still
    passes every test above, because the rarity wrapper sits OUTSIDE the art.

    The first version of this compared the markup against the empty version of
    the slot and PASSED against exactly that bug: an unhandled weapon art still
    emits its `<g data-part="weapon">` wrapper, so the strings differed while
    the sword was missing. Counting shapes is the fix — an empty group adds a
    tag and no geometry.

    The pixels are checked separately and for real in `scripts/pose-check.mjs`,
    which rasterises. This one is the cheap version that runs in the unit suite.
  */
  const shapes = (svg: string) =>
    (svg.match(/<(path|circle|ellipse|rect|polygon|line)\b/g) ?? []).length

  it.each(
    topTier.filter((i) => !NOT_DRAWN.has(i.slot)).map((i) => [i.name, i] as const),
  )('%s puts shapes on the canvas', (_name, item) => {
    const bare = ITEM_BY_ID[BASE[item.slot] as string]
    expect(bare, `no baseline item for the ${item.slot} slot`).toBeTruthy()
    // `still` on both sides so the difference is artwork, not the tier wrapper.
    expect(shapes(draw(item, { still: true }))).toBeGreaterThan(
      shapes(draw(bare, { still: true })),
    )
  })
})

describe('the catalogue actually got deeper', () => {
  /*
    The ask was "more legendaries and up". Counting them is the only way that
    claim stays true after the next refactor quietly drops a slot.
  */
  it('offers legendary or better in every slot that draws something', () => {
    const short = (Object.keys(ITEMS_BY_SLOT) as Slot[])
      .filter((slot) => !NOT_DRAWN.has(slot))
      .filter(
        (slot) =>
          !ITEMS_BY_SLOT[slot].some((i) => (TOP as readonly string[]).includes(i.rarity)),
      )
    expect(short, `slots with nothing legendary or above: ${short.join(', ')}`).toEqual([])
  })

  it('has more than one of each top rarity to find', () => {
    for (const rarity of TOP) {
      const n = ITEMS.filter((i) => i.rarity === rarity).length
      expect(n, `only ${n} ${rarity} items`).toBeGreaterThan(1)
    }
  })
})
