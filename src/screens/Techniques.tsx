import { useMemo, useState } from 'react'
import { Screen } from '@/components/AppShell'
import { Alert, Button, Card, Chip, SectionHeading, cx } from '@/components/ui'
import { ECONOMY } from '@/config/economy'
import { RARITY_META } from '@/data/items'
import {
  HEIGHT_LABEL,
  LOADOUT_SIZE,
  MOVES,
  MOVE_BY_ID,
  STARTING_MOVES,
  damagePerSecond,
  moveDurationMs,
  resolveLoadout,
} from '@/data/moves'
import { useStore } from '@/state/store'

/**
 * Techniques: what you can throw, and where new ones come from.
 *
 * Two decisions worth stating, because both cut against how this normally
 * works:
 *
 *   A scroll can never roll a technique you already own. Eight moves is a
 *   finite set, so a crate that can hand back a duplicate turns a collection
 *   into a treadmill. The cost is a ceiling on the whole set instead.
 *
 *   Every move's frame data is on screen — wind-up, active window, recovery,
 *   damage per second of commitment. Not because anyone needs the numbers, but
 *   because "legendary" should have to justify itself. The spinning kick hits
 *   hardest and is the slowest thing in the game; you can read that here
 *   rather than discovering it by losing.
 */
export default function Techniques() {
  const { data, buyTechnique, setLoadout } = useStore()
  const unlocked = useMemo(() => data.game.unlockedMoves ?? [], [data.game.unlockedMoves])
  const owned = useMemo(() => new Set([...STARTING_MOVES, ...unlocked]), [unlocked])
  const loadout = useMemo(() => resolveLoadout(data.game.loadout, unlocked), [data.game.loadout, unlocked])
  const [revealed, setRevealed] = useState<string | null>(null)

  const cost = ECONOMY.techniqueCrate.cost
  const remaining = MOVES.filter((m) => !owned.has(m.id)).length
  const affordable = data.game.coins >= cost

  const toggle = (id: string) => {
    if (loadout.includes(id)) {
      if (loadout.length <= 1) return
      setLoadout(loadout.filter((m) => m !== id))
      return
    }
    const next = loadout.length >= LOADOUT_SIZE ? [...loadout.slice(1), id] : [...loadout, id]
    setLoadout(next)
  }

  return (
    <Screen title="Techniques" subtitle={`${owned.size} of ${MOVES.length} known`} back="/forge/sparring">
      <div className="space-y-4">
        <Card raised>
          <SectionHeading
            title={ECONOMY.techniqueCrate.name}
            hint="Never rolls something you already know."
          />
          {revealed && MOVE_BY_ID[revealed] && (
            <div
              className="rounded-xl border px-3 py-3 mb-3"
              style={{
                borderColor: `${RARITY_META[MOVE_BY_ID[revealed].rarity].color}66`,
                background: `${RARITY_META[MOVE_BY_ID[revealed].rarity].color}14`,
              }}
            >
              <p
                className="text-[11px] uppercase tracking-wider"
                style={{ color: RARITY_META[MOVE_BY_ID[revealed].rarity].color }}
              >
                {RARITY_META[MOVE_BY_ID[revealed].rarity].label} technique
              </p>
              <p className="font-display text-2xl uppercase tracking-wide mt-0.5">{MOVE_BY_ID[revealed].name}</p>
              <p className="text-sm text-ash mt-1 leading-relaxed">{MOVE_BY_ID[revealed].lore}</p>
            </div>
          )}
          <Button
            variant={affordable && remaining > 0 ? 'gold' : 'secondary'}
            full
            disabled={!affordable || remaining === 0}
            onClick={() => setRevealed(buyTechnique())}
          >
            {remaining === 0 ? 'Every technique known' : `Open a scroll — ◈ ${cost}`}
          </Button>
          <p className="text-xs text-smoke mt-2 leading-relaxed">
            {remaining === 0
              ? 'Nothing left to find. What is left is deciding which four to carry.'
              : `${remaining} still unknown. Coins come from training and nothing else — there is no way to buy them.`}{' '}
            You hold ◈ {data.game.coins}.
          </p>
        </Card>

        <div>
          <SectionHeading
            title="Your four"
            hint={`Tap a known technique to carry it. ${LOADOUT_SIZE} slots; the oldest drops out.`}
          />
          <ul className="space-y-2">
            {MOVES.map((move) => {
              const known = owned.has(move.id)
              const carried = loadout.indexOf(move.id)
              const meta = RARITY_META[move.rarity]
              return (
                <li key={move.id}>
                  <button
                    type="button"
                    disabled={!known}
                    onClick={() => toggle(move.id)}
                    aria-pressed={carried >= 0}
                    className={cx(
                      'w-full text-left touch-target rounded-xl border px-3 py-2.5 transition-colors',
                      !known && 'opacity-45',
                      carried >= 0 ? 'border-ember-500 bg-ember-500/12' : 'border-slate bg-coal',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg uppercase tracking-wide text-parchment">
                        {known ? move.name : '???'}
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {carried >= 0 && <Chip tone="ember">Slot {carried + 1}</Chip>}
                        <span
                          className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 border"
                          style={{ color: meta.color, borderColor: `${meta.color}55` }}
                        >
                          {meta.label}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-ash mt-1 leading-snug">{known ? move.hint : 'Found in a scroll.'}</p>
                    {known && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Chip tone="neutral">{HEIGHT_LABEL[move.height]}</Chip>
                        <Chip tone="neutral">{move.damage} dmg</Chip>
                        <Chip tone="neutral">{move.reach} reach</Chip>
                        <Chip tone="neutral">{move.startupMs}ms wind-up</Chip>
                        <Chip tone="neutral">{moveDurationMs(move)}ms committed</Chip>
                        <Chip tone="neutral">{damagePerSecond(move)} dmg/s</Chip>
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <Alert tone="info" title="Rarer is not simply stronger">
          Every heavier technique buys its damage with time you cannot take back. The legendary is the slowest thing in
          the game, and against someone who can read it, a jab you throw twice is worth more than a spinning kick you
          miss once. Nothing you unlock is required — the two you start with can beat every opponent here.
        </Alert>
      </div>
    </Screen>
  )
}
