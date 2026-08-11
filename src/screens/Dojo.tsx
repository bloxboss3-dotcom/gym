import { useMemo, useState } from 'react'
import { Screen } from '@/components/AppShell'
import { Fighter } from '@/character/Fighter'
import * as RIG from '@/character/rig'
import { Alert, Button, Card, Chip, SectionHeading, SegmentedControl, cx } from '@/components/ui'
import { ECONOMY, buildFromXp } from '@/config/economy'
import { RARITY_META } from '@/data/items'
import {
  DIFFICULTY_LABEL,
  FAMILY_LABEL,
  FAMILY_ORDER,
  MOVES,
  MOVE_BY_ID,
  UNLOCKABLE_MOVES,
  animationFor,
  durationMsOf,
  isUnlocked,
  type FightMove,
} from '@/data/moves'
import { useStore } from '@/state/store'

/**
 * The Dojo.
 *
 * You unlock techniques and you watch your warrior perform them. That is the
 * whole feature, and narrowing it to that is the point: the bot fight that
 * used to live here spread the effort across a simulation, an opponent AI and
 * a control pad, and the animation — the only part anybody actually wanted —
 * got what was left.
 *
 * So everything here serves the playback. Half speed exists because a tornado
 * kick is over in a second and a second is not long enough to see anything.
 * Loop exists because you watch a good one more than once. The description
 * tells you what to look for before it plays, because knowing where to look is
 * most of what makes an animation read.
 */
export default function Dojo() {
  const { data, buyTechnique } = useStore()
  const unlocked = useMemo(() => data.game.unlockedMoves ?? [], [data.game.unlockedMoves])
  const known = useMemo(() => MOVES.filter((m) => isUnlocked(m, unlocked)), [unlocked])

  const [selectedId, setSelectedId] = useState<string>(known[0]?.id ?? 'jab')
  const [speed, setSpeed] = useState('1')
  const [loop, setLoop] = useState(false)
  // Bumped on every replay so the player restarts even on the same animation.
  const [take, setTake] = useState(0)
  const [revealed, setRevealed] = useState<string | null>(null)

  const selected = MOVE_BY_ID[selectedId] ?? MOVES[0]
  const playable = isUnlocked(selected, unlocked)
  const cost = ECONOMY.techniqueCrate.cost
  const remaining = MOVES.filter((m) => !isUnlocked(m, unlocked)).length
  const affordable = data.game.coins >= cost

  const pick = (move: FightMove) => {
    setSelectedId(move.id)
    setTake((n) => n + 1)
  }

  const openScroll = () => {
    const id = buyTechnique()
    if (!id) return
    setRevealed(id)
    setSelectedId(id)
    setTake((n) => n + 1)
  }

  return (
    <Screen title="The Dojo" subtitle={`${known.length} of ${MOVES.length} techniques`} back="/forge">
      <div className="space-y-4">
        {/* The stage ------------------------------------------------------- */}
        <Card raised className="p-2">
          <div className="rounded-xl bg-void border border-slate/70 overflow-hidden relative">
            <DojoBackdrop />
            <Fighter
              key={`${selected.id}-${take}-${speed}-${loop}`}
              animation={playable ? animationFor(selected) : RIG.IDLE}
              playing
              loop={loop || !playable}
              speed={Number(speed)}
              equipped={data.game.equipped}
              build={buildFromXp(data.game.xp)}
              className="w-full h-72 relative"
              label={`Your warrior performing ${selected.name}`}
            />
          </div>

          <div className="px-1 pt-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-2xl uppercase tracking-wide leading-none">
                  {playable ? selected.name : 'Locked'}
                </p>
                <p className="text-[11px] text-smoke mt-1">
                  {FAMILY_LABEL[selected.family]} · {durationMsOf(selected)}ms ·{' '}
                  {DIFFICULTY_LABEL[selected.difficulty]}
                </p>
              </div>
              <span
                className="shrink-0 text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 border"
                style={{
                  color: RARITY_META[selected.rarity].color,
                  borderColor: `${RARITY_META[selected.rarity].color}55`,
                }}
              >
                {RARITY_META[selected.rarity].label}
              </span>
            </div>

            {playable ? (
              <>
                <p className="text-sm text-ash mt-2 leading-relaxed">{selected.description}</p>
                <p className="text-xs text-ember-300 mt-1.5 leading-relaxed">
                  <span className="text-smoke">Watch for:</span> {selected.watchFor}
                </p>
              </>
            ) : (
              <p className="text-sm text-ash mt-2 leading-relaxed">
                Found in a Technique Scroll. Open one below to add it to the dojo.
              </p>
            )}
          </div>

          {playable && (
            <div className="mt-3 space-y-2">
              <SegmentedControl
                label="Playback speed"
                value={speed}
                onChange={setSpeed}
                options={[
                  { value: '1', label: 'Full' },
                  { value: '0.5', label: 'Half' },
                  { value: '0.25', label: 'Quarter' },
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button full variant="primary" onClick={() => setTake((n) => n + 1)}>
                  Play again
                </Button>
                <Button full onClick={() => setLoop((v) => !v)} aria-pressed={loop}>
                  {loop ? 'Looping ✓' : 'Loop'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Scrolls --------------------------------------------------------- */}
        <Card>
          <SectionHeading title={ECONOMY.techniqueCrate.name} hint="Never rolls a technique you already know." />
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
            onClick={openScroll}
          >
            {remaining === 0 ? 'Every technique known' : `Open a scroll — ◈ ${cost}`}
          </Button>
          <p className="text-xs text-smoke mt-2 leading-relaxed">
            {remaining === 0
              ? 'Nothing left to find. The dojo is complete.'
              : `${remaining} still unknown, and a scroll never repeats one you have.`}{' '}
            Coins come from training and nothing else — there is no way to buy them. You hold ◈ {data.game.coins}.
          </p>
        </Card>

        {/* The list -------------------------------------------------------- */}
        {FAMILY_ORDER.map((family) => {
          const inFamily = MOVES.filter((m) => m.family === family)
          if (!inFamily.length) return null
          return (
            <div key={family}>
              <SectionHeading title={FAMILY_LABEL[family]} />
              <ul className="grid grid-cols-2 gap-2">
                {inFamily.map((move) => {
                  const open = isUnlocked(move, unlocked)
                  const meta = RARITY_META[move.rarity]
                  return (
                    <li key={move.id}>
                      <button
                        type="button"
                        onClick={() => pick(move)}
                        aria-pressed={selectedId === move.id}
                        aria-label={open ? `Watch ${move.name}` : `${move.name}, locked`}
                        className={cx(
                          'w-full h-full text-left touch-target rounded-xl border px-3 py-2.5 transition-colors',
                          !open && 'opacity-45',
                          selectedId === move.id ? 'border-ember-500 bg-ember-500/12' : 'border-slate bg-coal',
                        )}
                      >
                        <span className="block text-sm text-parchment leading-tight">
                          {open ? move.name : '???'}
                        </span>
                        <span
                          className="block text-[9px] uppercase tracking-wider mt-0.5"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {open && (
                          <span className="flex flex-wrap gap-1 mt-1.5">
                            {move.airborne && <Chip tone="neutral">Airborne</Chip>}
                            {move.spins && <Chip tone="neutral">Full turn</Chip>}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        <Alert tone="info" title="Rarity here means spectacle, not power">
          There is nothing to win with these. A cross is common because a cross is a cross; a butterfly twist is
          legendary because it takes a year to learn and it looks like it. Unlocking one changes what your warrior can
          show you and nothing else — no recommendation, target or number anywhere in this app has ever read your
          collection.
        </Alert>
      </div>
    </Screen>
  )
}

/**
 * The room behind the fighter.
 *
 * Deliberately flat and dim. Anything with contrast back here competes with a
 * silhouette moving fast in front of it, and the silhouette is the thing.
 */
function DojoBackdrop() {
  return (
    <svg
      viewBox="0 0 200 280"
      className="absolute inset-0 w-full h-full"
      aria-hidden
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="dojo-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15121b" />
          <stop offset="100%" stopColor="#221b26" />
        </linearGradient>
        <radialGradient id="dojo-spot" cx="50%" cy="86%" r="62%">
          <stop offset="0%" stopColor="rgba(249,115,22,0.16)" />
          <stop offset="100%" stopColor="rgba(249,115,22,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="280" fill="url(#dojo-wall)" />
      {/* Shoji panelling: verticals only, low contrast. */}
      {[16, 60, 104, 148, 192].map((x) => (
        <rect key={x} x={x} y="24" width="2" height="228" fill="#2c2333" opacity="0.9" />
      ))}
      {[70, 120, 170, 220].map((y) => (
        <rect key={y} x="14" y={y} width="180" height="1.5" fill="#2c2333" opacity="0.6" />
      ))}
      <rect x="0" y="252" width="200" height="28" fill="#191320" />
      <rect x="0" y="252" width="200" height="2" fill="#3d2f45" />
      <rect x="0" y="0" width="200" height="280" fill="url(#dojo-spot)" />
    </svg>
  )
}

export { UNLOCKABLE_MOVES }
