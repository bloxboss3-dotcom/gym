import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { Warrior } from '@/character/Warrior'
import { Alert, Button, Card, Chip, ProgressBar, SectionHeading, Stat, cx } from '@/components/ui'
import { ECONOMY, levelFromXp, buildFromXp } from '@/config/economy'
import { ITEM_BY_ID, RARITY_META } from '@/data/items'
import { REWARD_REASON_LABEL } from '@/data/quests'
import { collectionProgress, unopenedPacks } from '@/engine/packs'
import { evaluateQuests } from '@/engine/quests'
import { formatDateLabel, toIsoDate } from '@/lib/date'
import { useStore } from '@/state/store'
import type { PackKind } from '@/types'

/** The Forge: your warrior, your currency, packs, and where they came from. */
export default function Forge() {
  const { data, buyPack } = useStore()
  const navigate = useNavigate()
  const today = toIsoDate()

  const level = levelFromXp(data.game.xp)
  const packs = unopenedPacks(data.game)
  const collection = useMemo(() => collectionProgress(data.game), [data.game])
  const quests = useMemo(() => evaluateQuests(data, today), [data, today])
  const claimable = quests.filter((q) => q.complete && !q.claimed).length
  const title = data.game.equipped.title ? ITEM_BY_ID[data.game.equipped.title] : undefined

  const recentRewards = data.game.ledger.slice(-8).reverse()

  return (
    <Screen
      title="The Forge"
      subtitle={`Level ${level.level} · ${data.game.coins} coins`}
      action={
        <Link to="/forge/quests" className="relative touch-target flex items-center px-2 text-sm text-ember-400">
          Quests
          {claimable > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-ember-500 text-black text-[10px] grid place-items-center font-bold">
              {claimable}
            </span>
          )}
        </Link>
      }
    >
      <div className="space-y-4">
        <Card raised className="relative overflow-hidden">
          <div className="flex gap-4">
            <Warrior
              equipped={data.game.equipped}
              build={buildFromXp(data.game.xp)}
              className="w-28 h-auto shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl uppercase tracking-wide leading-none">{data.profile?.name}</p>
              {title && <p className="text-sm text-gold-300 mt-0.5">{title.name}</p>}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-ash mb-1">
                  <span>Level {level.level}</span>
                  <span className="tabular">
                    {level.intoLevel}/{level.neededForNext} XP
                  </span>
                </div>
                <ProgressBar value={level.progress} max={1} tone="gold" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <Chip tone="gold">◈ {data.game.coins}</Chip>
                <Chip tone="ember">
                  {collection.owned}/{collection.total} items
                </Chip>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/forge/character" className="contents">
              <Button variant="primary" full>
                Customise
              </Button>
            </Link>
            <Link to="/forge/inventory" className="contents">
              <Button full>Inventory</Button>
            </Link>
          </div>
          <Link to="/forge/dojo" className="contents">
            <Button full className="mt-2">
              The Dojo ›
            </Button>
          </Link>
          <p className="text-[11px] text-smoke mt-1.5 leading-relaxed">
            Unlock techniques and watch your warrior perform them — roundhouses, spinning kicks, backflips. Nothing
            here is fought or won; it is the reward, not the mechanism.
          </p>
        </Card>

        {packs.length > 0 && (
          <div>
            <SectionHeading title="Unopened" hint="Tap to heat and crack them open." />
            <ul className="grid grid-cols-2 gap-2">
              {packs.map((pack) => (
                <li key={pack.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/forge/pack/${pack.id}`)}
                    className="w-full forge-panel-raised p-4 text-center touch-target ember-glow"
                  >
                    <span aria-hidden className="block text-3xl mb-1">
                      ▣
                    </span>
                    <span className="block font-display text-sm uppercase tracking-wide">
                      {ECONOMY.packs[pack.kind].name}
                    </span>
                    <span className="block text-[11px] text-smoke mt-0.5">
                      {ECONOMY.packs[pack.kind].items} item{ECONOMY.packs[pack.kind].items === 1 ? '' : 's'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <SectionHeading title="Buy a pack" hint="Coins come from training. Nothing here can be bought with money." />
          <ul className="space-y-2">
            {(Object.keys(ECONOMY.packs) as PackKind[]).map((kind) => {
              const config = ECONOMY.packs[kind]
              const affordable = data.game.coins >= config.cost
              return (
                <li key={kind}>
                  <Card className={cx(!affordable && 'opacity-70')}>
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="text-2xl shrink-0">
                        ▣
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-lg uppercase tracking-wide">{config.name}</span>
                        <span className="block text-xs text-smoke">
                          {config.items} item{config.items === 1 ? '' : 's'}
                          {'floor' in config && config.floor ? ` · guaranteed ${config.floor}+` : ''}
                        </span>
                        <span className="flex flex-wrap gap-1 mt-1.5">
                          {(Object.entries(config.weights) as [keyof typeof RARITY_META, number][]).map(
                            ([rarity, weight]) => {
                              const total = Object.values(config.weights).reduce((a, b) => a + b, 0)
                              return (
                                <span
                                  key={rarity}
                                  className="text-[10px] rounded px-1.5 py-0.5 border"
                                  style={{
                                    color: RARITY_META[rarity].color,
                                    borderColor: `${RARITY_META[rarity].color}55`,
                                  }}
                                >
                                  {RARITY_META[rarity].label} {((weight / total) * 100).toFixed(0)}%
                                </span>
                              )
                            },
                          )}
                        </span>
                      </span>
                      <Button
                        variant={affordable ? 'gold' : 'secondary'}
                        size="sm"
                        disabled={!affordable}
                        onClick={() => {
                          const id = buyPack(kind)
                          if (id) navigate(`/forge/pack/${id}`)
                        }}
                      >
                        ◈ {config.cost}
                      </Button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </div>

        <Alert tone="info" title="Cosmetic only, always">
          Coins, levels and items change how your warrior looks and nothing else. No recommendation, chart, safety
          message or feature in FORGED is ever locked behind them, and there is nothing to buy with real money.
        </Alert>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total XP" value={data.game.xp.toLocaleString()} tone="ember" />
          <Stat label="Coins" value={data.game.coins} tone="gold" />
          <Stat
            label="Collected"
            value={`${Math.round((collection.owned / collection.total) * 100)}%`}
            sub={`${collection.owned}/${collection.total}`}
          />
        </div>

        <div>
          <SectionHeading title="Where your rewards came from" hint="Every payout, with its source." />
          {recentRewards.length ? (
            <ul className="space-y-1.5">
              {recentRewards.map((entry) => (
                <li key={entry.id} className="forge-panel flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-parchment truncate">
                      {REWARD_REASON_LABEL[entry.reason]}
                    </span>
                    <span className="block text-[11px] text-smoke truncate">{entry.detail}</span>
                  </span>
                  <span className="text-xs text-ash tabular shrink-0">
                    +{entry.xp} XP · +{entry.coins}
                  </span>
                  <span className="text-[10px] text-smoke shrink-0 w-14 text-right">
                    {formatDateLabel(entry.date, today)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <p className="text-sm text-ash text-center py-2">
                Complete a session, a run, a check-in or your protein target to start earning.
              </p>
            </Card>
          )}
        </div>

        <Card>
          <SectionHeading title="Daily reward caps" hint="Why you cannot farm the game." />
          <ul className="space-y-1.5 text-sm text-ash">
            <li className="flex justify-between">
              <span>Daily XP cap</span>
              <span className="tabular text-parchment">{ECONOMY.limits.dailyXpCap}</span>
            </li>
            <li className="flex justify-between">
              <span>Daily coin cap</span>
              <span className="tabular text-parchment">{ECONOMY.limits.dailyCoinCap}</span>
            </li>
            <li className="flex justify-between">
              <span>Minimum working sets to earn</span>
              <span className="tabular text-parchment">{ECONOMY.limits.minWorkingSetsForReward}</span>
            </li>
            <li className="flex justify-between">
              <span>Minimum session length</span>
              <span className="tabular text-parchment">{ECONOMY.limits.minSessionMinutes} min</span>
            </li>
            <li className="flex justify-between">
              <span>Rewarded sessions per day</span>
              <span className="tabular text-parchment">{ECONOMY.limits.perDay.workout_completed}</span>
            </li>
          </ul>
          <p className="text-xs text-smoke mt-2 leading-relaxed">
            Extra sessions still count toward your volume, history and recommendations — they just do not print extra
            currency. The economy rewards honest, planned training, not repetition.
          </p>
        </Card>
      </div>
    </Screen>
  )
}
