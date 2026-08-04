import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { ItemPreview, Warrior } from '@/character/Warrior'
import { Button, Card, Chip, EmptyState, cx } from '@/components/ui'
import { ITEMS_BY_SLOT, ITEM_BY_ID, RARITY_META, SLOT_LABEL, SLOT_ORDER } from '@/data/items'
import { useStore } from '@/state/store'
import type { Slot } from '@/types'

/**
 * Character customisation.
 *
 * Live preview on the left of the decision, not behind a confirm step: tap an
 * item and the warrior changes immediately.
 */
export default function CharacterCustomize() {
  const store = useStore()
  const { data } = store
  const [slot, setSlot] = useState<Slot>('weapon')

  const owned = useMemo(() => new Set(data.game.owned.map((o) => o.itemId)), [data.game.owned])
  const options = useMemo(
    () => (ITEMS_BY_SLOT[slot] ?? []).filter((item) => owned.has(item.id)),
    [slot, owned],
  )
  const equippedTitle = data.game.equipped.title ? ITEM_BY_ID[data.game.equipped.title] : undefined

  return (
    <Screen title="Your warrior" subtitle={equippedTitle?.name ?? data.profile?.name} back="/forge">
      <div className="space-y-4">
        <Card raised>
          <div className="grid place-items-center">
            <Warrior equipped={data.game.equipped} className="w-56 h-auto" />
          </div>
          <p className="text-center font-display text-2xl uppercase tracking-wide mt-1">{data.profile?.name}</p>
          {equippedTitle && <p className="text-center text-sm text-gold-300">{equippedTitle.name}</p>}
        </Card>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {SLOT_ORDER.map((key) => {
            const equipped = data.game.equipped[key]
            const item = equipped ? ITEM_BY_ID[equipped] : undefined
            return (
              <button
                key={key}
                type="button"
                aria-pressed={slot === key}
                onClick={() => setSlot(key)}
                className={cx(
                  'touch-target shrink-0 rounded-xl border px-3 py-2 text-left transition-colors',
                  slot === key ? 'border-ember-500 bg-ember-500/12' : 'border-slate bg-coal',
                )}
              >
                <span className="block text-[10px] uppercase tracking-wider text-smoke">{SLOT_LABEL[key]}</span>
                <span className="block text-xs text-parchment whitespace-nowrap">{item?.name ?? 'Empty'}</span>
              </button>
            )
          })}
        </div>

        {options.length ? (
          <ul className="grid grid-cols-3 gap-2">
            {options.map((item) => {
              const active = data.game.equipped[slot] === item.id
              const meta = RARITY_META[item.rarity]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => store.equipItem(slot, item.id)}
                    aria-pressed={active}
                    className={cx(
                      'w-full h-full rounded-xl border p-2 text-center transition-colors touch-target',
                      active ? 'border-ember-500 bg-ember-500/12' : 'border-slate bg-coal',
                    )}
                  >
                    {slot === 'title' || slot === 'pose' ? (
                      <span
                        aria-hidden
                        className="grid place-items-center h-12 font-display text-lg"
                        style={{ color: meta.color }}
                      >
                        {slot === 'title' ? 'ᛟ' : '⚔'}
                      </span>
                    ) : (
                      <span className="grid place-items-center">
                        <ItemPreview item={item} className="w-12 h-auto" />
                      </span>
                    )}
                    <span className="block text-[11px] text-parchment leading-tight mt-1">{item.name}</span>
                    <span className="block text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon="◇"
            title={`No ${SLOT_LABEL[slot].toLowerCase()} earned yet`}
            body="Open packs in the Forge to find gear for this slot. Every item is earned through training."
            action={
              <Link to="/forge">
                <Button variant="primary">Go to the Forge</Button>
              </Link>
            }
          />
        )}

        <Card>
          <p className="text-sm text-ash leading-relaxed">
            Your warrior changes only through work you actually did. Nothing here affects a single training
            recommendation — it is the reward, not the mechanism.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Chip tone="ember">{data.game.owned.length} items owned</Chip>
            <Chip tone="gold">◈ {data.game.coins}</Chip>
          </div>
        </Card>
      </div>
    </Screen>
  )
}
