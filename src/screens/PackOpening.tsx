import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ItemPreview } from '@/character/Warrior'
import { Button, Card, Chip, EmptyState, cx, useReducedMotion } from '@/components/ui'
import { ECONOMY } from '@/config/economy'
import { ITEM_BY_ID, RARITY_META, SLOT_LABEL } from '@/data/items'
import { useStore } from '@/state/store'
import { useT } from '@/i18n/useT'

/**
 * Pack opening.
 *
 * Four beats: the pack sits in the forge → you tap to heat it → it cracks with
 * rarity-coloured light → the item is revealed and can be equipped immediately.
 * Reduced-motion preference collapses this to an instant reveal, and there is
 * always a visible Skip control.
 */

type Phase = 'idle' | 'heating' | 'cracking' | 'revealed'

export default function PackOpening() {
  const { t } = useT()
  const { packId } = useParams<{ packId: string }>()
  const navigate = useNavigate()
  const store = useStore()
  const reduced = useReducedMotion()

  const pack = store.data.game.packs.find((p) => p.id === packId)
  const [phase, setPhase] = useState<Phase>('idle')
  const [heat, setHeat] = useState(0)
  const [revealed, setRevealed] = useState<string[]>(() => pack?.results ?? [])
  const [index, setIndex] = useState(0)

  const alreadyOpened = Boolean(pack?.openedAt)

  useEffect(() => {
    if (alreadyOpened && pack) {
      setRevealed(pack.results)
      setPhase('revealed')
    }
  }, [alreadyOpened, pack])

  const items = useMemo(() => revealed.map((id) => ITEM_BY_ID[id]).filter(Boolean), [revealed])
  const current = items[index]
  const rarity = current ? RARITY_META[current.rarity] : null

  const doOpen = () => {
    if (!packId) return
    const results = store.openPack(packId)
    setRevealed(results)
  }

  const tapHeat = () => {
    if (phase === 'revealed') return
    const next = Math.min(100, heat + 34)
    setHeat(next)
    setPhase('heating')
    if (next >= 100) {
      setPhase('cracking')
      doOpen()
      window.setTimeout(() => setPhase('revealed'), reduced ? 0 : 700)
    }
  }

  const skip = () => {
    if (!alreadyOpened) doOpen()
    setHeat(100)
    setPhase('revealed')
  }

  if (!pack) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 bg-void">
        <EmptyState
          icon="▣"
          title={t('Pack not found')}
          body={t('This pack has already been opened or no longer exists.')}
          action={
            <Button variant="primary" onClick={() => navigate('/forge')}>
              {t('Back to the Forge')}
            </Button>
          }
        />
      </div>
    )
  }

  const glow = rarity?.glow ?? 'rgba(249,115,22,0.4)'

  return (
    <div
      className="min-h-dvh flex flex-col bg-void safe-x"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'calc(1rem + var(--safe-bottom))' }}
    >
      <header className="px-4 py-3 flex items-center justify-between">
        <button type="button" onClick={() => navigate('/forge')} className="touch-target text-ash px-2">
          ✕<span className="sr-only">{t('Close')}</span>
        </button>
        <p className="font-display text-lg uppercase tracking-wide">{ECONOMY.packs[pack.kind].name}</p>
        {phase !== 'revealed' ? (
          <button type="button" onClick={skip} className="touch-target text-sm text-ember-400 px-2">
            {t('Skip animation')}
          </button>
        ) : (
          <span className="w-16" />
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {phase !== 'revealed' && (
          <>
            <div
              className="relative grid place-items-center"
              style={{ filter: `drop-shadow(0 0 ${heat / 3}px rgba(249,115,22,${heat / 160}))` }}
            >
              <button
                type="button"
                onClick={tapHeat}
                aria-label={t('Tap to heat the pack')}
                className={cx(
                  'size-52 rounded-3xl border-2 grid place-items-center transition-colors duration-300 touch-target',
                  phase === 'cracking' && !reduced && 'animate-shake',
                )}
                style={{
                  borderColor: `rgba(249,115,22,${0.25 + heat / 200})`,
                  background: `radial-gradient(120% 100% at 50% 100%, rgba(249,115,22,${heat / 260}), #16161c 70%)`,
                }}
              >
                <svg viewBox="0 0 120 120" className="size-40" aria-hidden>
                  <defs>
                    <linearGradient id="pack-metal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3c3c46" />
                      <stop offset="100%" stopColor="#1a1a20" />
                    </linearGradient>
                  </defs>
                  <rect x="18" y="24" width="84" height="76" rx="8" fill="url(#pack-metal)" stroke="#4a4a56" strokeWidth="2" />
                  <path d="M18 48 H102" stroke="#4a4a56" strokeWidth="2" />
                  <rect x="52" y="36" width="16" height="24" rx="3" fill="#2a2a33" stroke="#5a5a66" strokeWidth="1.5" />
                  {heat > 30 && (
                    <path
                      d="M30 62 L48 70 L38 84 M90 60 L74 72 L84 86"
                      stroke={glow}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      opacity={heat / 100}
                    />
                  )}
                  {heat >= 100 && (
                    <path
                      d="M60 24 L54 60 L66 62 L58 100"
                      stroke={glow}
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </button>
              {!reduced &&
                heat > 60 &&
                [0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute bottom-6 size-1.5 rounded-full animate-ember"
                    style={{
                      left: `${25 + i * 17}%`,
                      background: glow,
                      animationDelay: `${i * 0.35}s`,
                    }}
                  />
                ))}
            </div>

            <div className="text-center">
              <p className="font-display text-2xl uppercase tracking-wide">
                {phase === 'cracking' ? 'The seam splits' : heat === 0 ? 'Tap to heat' : 'Keep tapping'}
              </p>
              <p className="text-sm text-ash mt-1">
                {phase === 'cracking' ? 'Something is taking shape.' : 'The forge does the rest.'}
              </p>
              <div className="w-56 h-2 rounded-full bg-steel mt-4 overflow-hidden mx-auto">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${heat}%`, background: `linear-gradient(90deg,#c2410c,${glow})` }}
                />
              </div>
            </div>
          </>
        )}

        {phase === 'revealed' && current && rarity && (
          <div className={cx('w-full max-w-sm text-center', !reduced && 'animate-burst')} key={current.id}>
            <div
              className="rounded-2xl border-2 p-5"
              style={{ borderColor: rarity.color, boxShadow: `0 0 60px -12px ${rarity.glow}` }}
            >
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: rarity.color }}>
                {rarity.label} · {SLOT_LABEL[current.slot]}
              </p>
              <div className="grid place-items-center my-3">
                <ItemPreview item={current} frame={store.data.game.figure ?? 'masculine'} className="w-40 h-auto" />
              </div>
              <h2 className="font-display text-3xl uppercase tracking-wide leading-none">{current.name}</h2>
              <p className="text-sm text-ash mt-2 italic leading-relaxed">{current.lore}</p>
              {store.data.game.owned.find((o) => o.itemId === current.id && o.duplicates > 0) && (
                <Chip tone="gold" className="mt-3">
                  Duplicate · +{ECONOMY.duplicateRefund[current.rarity]} coins
                </Chip>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <Button
                variant="primary"
                size="lg"
                full
                onClick={() => {
                  store.equipItem(current.slot, current.id)
                  if (index < items.length - 1) setIndex((i) => i + 1)
                  else navigate('/forge/character')
                }}
              >
                {t('Equip now')}
              </Button>
              <Button
                full
                onClick={() => {
                  store.markItemSeen(current.id)
                  if (index < items.length - 1) setIndex((i) => i + 1)
                  else navigate('/forge/inventory')
                }}
              >
                {index < items.length - 1 ? `Save · next item (${index + 2}/${items.length})` : 'Save to inventory'}
              </Button>
            </div>

            {items.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4" aria-hidden>
                {items.map((item, i) => (
                  <span
                    key={item.id + i}
                    className={cx('size-1.5 rounded-full', i === index ? 'bg-ember-400' : 'bg-slate')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'revealed' && !current && (
          <Card>
            <p className="text-sm text-ash">{t('This pack was already opened.')}</p>
            <Button variant="primary" full className="mt-3" onClick={() => navigate('/forge/inventory')}>
              {t('View inventory')}
            </Button>
          </Card>
        )}
      </main>

      <span aria-live="polite" className="sr-only">
        {phase === 'revealed' && current ? `Revealed ${current.name}, ${current.rarity}` : ''}
      </span>
    </div>
  )
}
