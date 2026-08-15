import { useMemo, useState } from 'react'
import { Screen } from '@/components/AppShell'
import { ItemPreview } from '@/character/Warrior'
import { Button, Card, Chip, EmptyState, ProgressBar, Sheet, cx } from '@/components/ui'
import { ECONOMY } from '@/config/economy'
import {
  ITEMS,
  ITEMS_BY_SLOT,
  RARITY_META,
  RARITY_ORDER,
  SECRET_PLACEHOLDER,
  SLOT_LABEL,
  SLOT_ORDER,
} from '@/data/items'
import { collectionProgress } from '@/engine/packs'
import { useStore } from '@/state/store'
import type { CosmeticItem, Rarity, Slot } from '@/types'
import { useT } from '@/i18n/useT'

/** Everything you own, everything you don't, and what each item looks like. */
export default function Inventory() {
  const { t } = useT()
  const store = useStore()
  const { data } = store
  const [slot, setSlot] = useState<Slot | 'all'>('all')
  const [showLocked, setShowLocked] = useState(true)
  const [preview, setPreview] = useState<CosmeticItem | null>(null)
  const [secretSheet, setSecretSheet] = useState(false)
  const figure = data.game.figure ?? 'masculine'

  const ownedMap = useMemo(
    () => new Map(data.game.owned.map((o) => [o.itemId, o])),
    [data.game.owned],
  )
  const collection = useMemo(() => collectionProgress(data.game), [data.game])

  const items = useMemo(() => {
    const pool = slot === 'all' ? ITEMS : (ITEMS_BY_SLOT[slot] ?? [])
    return pool
      .filter((item) => ownedMap.has(item.id) || (showLocked && item.rarity !== 'secret'))
      .sort((a, b) => {
        const ownedDiff = Number(ownedMap.has(b.id)) - Number(ownedMap.has(a.id))
        if (ownedDiff) return ownedDiff
        return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
      })
  }, [slot, showLocked, ownedMap])

  /**
   * Secrets are not listed. A single unknown tile says "there is more than
   * this" without saying how much more — showing a count, or one greyed tile
   * per secret, would turn the whole point of the tier into a checklist.
   */
  const secretsLeft = collection.byRarity.secret.total - collection.byRarity.secret.owned

  return (
    <Screen title={t('Inventory')} subtitle={`${collection.owned} of ${collection.total} collected`} back="/forge">
      <div className="space-y-4">
        <Card>
          <ProgressBar value={collection.owned} max={collection.total} tone="gold" label={t('Collection')} showValue />
          <ul className="grid grid-cols-4 gap-1.5 mt-3">
            {RARITY_ORDER.map((rarity) => (
              <li key={rarity} className="text-center">
                <span className="block text-[10px]" style={{ color: RARITY_META[rarity].color }}>
                  {RARITY_META[rarity].label}
                </span>
                <span className="block text-sm tabular text-parchment">
                  {collection.byRarity[rarity].owned}/
                  {/* The number of secrets is itself a secret. */}
                  {rarity === 'secret' && secretsLeft > 0 ? '?' : collection.byRarity[rarity].total}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {(['all', ...SLOT_ORDER] as (Slot | 'all')[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={slot === key}
              onClick={() => setSlot(key)}
              className={cx(
                'touch-target shrink-0 rounded-full border px-3.5 text-sm transition-colors',
                slot === key ? 'border-ember-500 bg-ember-500/15 text-ember-200' : 'border-slate bg-coal text-ash',
              )}
            >
              {key === 'all' ? 'All' : SLOT_LABEL[key]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowLocked((v) => !v)}
          className="text-sm text-ember-400 touch-target"
        >
          {showLocked ? 'Hide items you have not earned' : 'Show everything'}
        </button>

        {items.length ? (
          <ul className="grid grid-cols-2 gap-2">
            {items.map((item) => {
              const owned = ownedMap.get(item.id)
              const equipped = data.game.equipped[item.slot] === item.id
              const meta = RARITY_META[item.rarity]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    className={cx(
                      'w-full h-full text-left rounded-xl border p-3 transition-colors touch-target',
                      owned ? 'bg-iron' : 'bg-coal/60 opacity-60',
                      equipped ? 'border-ember-500' : 'border-slate',
                    )}
                    style={owned ? { borderColor: equipped ? undefined : `${meta.color}44` } : undefined}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      {owned?.new && <span className="text-[10px] text-ember-400">{t('NEW')}</span>}
                      {equipped && <span className="text-[10px] text-ember-400">{t('EQUIPPED')}</span>}
                    </span>
                    {/* Not earned yet means not spoiled yet.
                        The grid used to show every unearned item at full
                        detail — name, artwork, lore — which answers the
                        question a pack is supposed to answer. What stays
                        visible is the shape of the thing, its slot and its
                        rarity: enough to see there is something there and
                        roughly how good, nothing that tells you what. */}
                    <span className={cx('grid place-items-center py-1', !owned && 'silhouette')}>
                      <ItemPreview item={item} frame={figure} className="w-16 h-auto" />
                    </span>
                    <span className="block text-sm leading-tight">
                      {owned ? (
                        <span className="text-parchment">{t(item.name)}</span>
                      ) : (
                        <span className="text-smoke">{t('Not earned yet')}</span>
                      )}
                    </span>
                    <span className="block text-[11px] text-smoke">{SLOT_LABEL[item.slot]}</span>
                    {owned && owned.duplicates > 0 && (
                      <span className="block text-[10px] text-gold-300 mt-1">×{owned.duplicates + 1} owned</span>
                    )}
                  </button>
                </li>
              )
            })}
            {showLocked && slot === 'all' && secretsLeft > 0 && (
              <li>
                <button
                  type="button"
                  data-testid="secret-tile"
                  onClick={() => setSecretSheet(true)}
                  className="w-full h-full text-left rounded-xl border border-dashed border-slate bg-coal/60 p-3 touch-target"
                >
                  <span className="block text-[10px] uppercase tracking-wider text-smoke">
                    {SECRET_PLACEHOLDER}
                  </span>
                  <span className="grid place-items-center py-1">
                    <span aria-hidden className="font-display text-3xl text-slate leading-none py-4">
                      {SECRET_PLACEHOLDER}
                    </span>
                  </span>
                  <span className="block text-sm text-ash leading-tight">{t('Unrecorded')}</span>
                  <span className="block text-[11px] text-smoke">{t('Not in any catalogue')}</span>
                </button>
              </li>
            )}
          </ul>
        ) : (
          <EmptyState
            icon="◇"
            title={t('Nothing here yet')}
            body={t('Open a pack in the Forge, or complete quests to earn one.')}
          />
        )}
      </div>

      <Sheet open={secretSheet} onClose={() => setSecretSheet(false)} title={SECRET_PLACEHOLDER}>
        <div className="space-y-4 text-center">
          <p aria-hidden className="font-display text-6xl text-slate leading-none">{SECRET_PLACEHOLDER}</p>
          <p className="text-sm text-ash leading-relaxed">
            {t('Something is in the tables that is not in this list. It has no entry, no odds shown against it, and no name until it is yours — the only way to find out what it is, is to pull one.')}
          </p>
          <p className="text-xs text-smoke leading-relaxed">
            {t('The deeper the pack, the better the chance. Nothing you can do makes it more likely than that.')}
          </p>
          <Button full onClick={() => setSecretSheet(false)}>
            {t('Close')}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview && ownedMap.has(preview.id) ? preview.name : 'Not earned yet'}
      >
        {preview && (
          <div className="space-y-4">
            <div className={cx('grid place-items-center', !ownedMap.has(preview.id) && 'silhouette')}>
              <ItemPreview item={preview} frame={figure} className="w-44 h-auto" />
            </div>
            <div className="text-center">
              <Chip tone="neutral" className="mb-2">
                <span style={{ color: RARITY_META[preview.rarity].color }}>{RARITY_META[preview.rarity].label}</span>
                <span className="text-smoke"> · {SLOT_LABEL[preview.slot]}</span>
              </Chip>
              {ownedMap.has(preview.id) ? (
                <p className="text-sm text-ash italic leading-relaxed">{preview.lore}</p>
              ) : (
                <p className="text-sm text-smoke leading-relaxed">
                  {t('You have not pulled this one. Its name and what it looks like are the reward for finding it, so they stay behind the pack.')}
                </p>
              )}
            </div>
            {ownedMap.has(preview.id) ? (
              <Button
                variant="primary"
                full
                disabled={data.game.equipped[preview.slot] === preview.id}
                onClick={() => {
                  store.equipItem(preview.slot, preview.id)
                  setPreview(null)
                }}
              >
                {data.game.equipped[preview.slot] === preview.id ? 'Already equipped' : 'Equip'}
              </Button>
            ) : (
              <Card>
                <p className="text-sm text-ash text-center">
                  Not earned yet. It can appear in any pack — duplicates convert to{' '}
                  {ECONOMY.duplicateRefund[preview.rarity as Rarity]} coins once you own it.
                </p>
              </Card>
            )}
          </div>
        )}
      </Sheet>
    </Screen>
  )
}
