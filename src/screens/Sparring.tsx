import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { Fighter } from '@/character/Fighter'
import * as RIG from '@/character/rig'
import { Alert, Button, Card, Chip, ProgressBar, SectionHeading, cx } from '@/components/ui'
import { levelFromXp } from '@/config/economy'
import {
  ATTACKS,
  MOVES,
  OPPONENTS,
  SPARRING_NOTE,
  combatStats,
  describeStrike,
  resolveRound,
  type Combatant,
  type Move,
  type Opponent,
} from '@/engine/duel'
import { useStore } from '@/state/store'

/**
 * Sparring.
 *
 * A bot bout that the gear stats feed, and the only place in the app where
 * what you are wearing changes a number. Everything on the training side is
 * calculated without ever reading an item, which is why this can exist at all.
 *
 * Both fighters commit at the same time, so guarding is a bet rather than a
 * reaction. The bot's policy is written down on screen; there is nothing to
 * discover by losing repeatedly.
 */
export default function Sparring() {
  const { data } = useStore()
  const stats = useMemo(() => combatStats(data.game.equipped), [data.game.equipped])

  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [you, setYou] = useState<Combatant | null>(null)
  const [them, setThem] = useState<Combatant | null>(null)
  const [seed, setSeed] = useState(1)
  const [log, setLog] = useState<string[]>([])
  const [animation, setAnimation] = useState<RIG.Animation>(RIG.IDLE)
  const [playing, setPlaying] = useState(false)
  const [winner, setWinner] = useState<'you' | 'them' | null>(null)

  const start = (choice: Opponent) => {
    setOpponent(choice)
    setYou({ health: stats.health, maxHealth: stats.health, damage: stats.damage })
    setThem({ health: choice.health, maxHealth: choice.health, damage: choice.damage })
    // Seeded from the bout's own opponent and your health, so a bout is
    // reproducible without reaching for a clock the engine cannot have.
    setSeed(((choice.health * 7919 + stats.health * 104729) >>> 0) || 1)
    setLog([choice.taunt])
    setWinner(null)
    setAnimation(RIG.IDLE)
    setPlaying(false)
  }

  const throwMove = useCallback(
    (move: Move) => {
      if (!you || !them || !opponent || winner) return
      const result = resolveRound(you, them, move, seed, opponent.caution)
      setYou(result.you)
      setThem(result.them)
      setSeed(result.nextSeed)
      setWinner(result.winner)
      setLog((prev) =>
        [
          ...prev,
          describeStrike(result.strikes[0], 'You', opponent.name),
          describeStrike(result.strikes[1], 'You', opponent.name),
          ...(result.winner === 'you'
            ? [`${opponent.name} is down. Bout won.`]
            : result.winner === 'them'
              ? ['You are down. Bout lost — and nothing else changed.']
              : []),
        ].slice(-9),
      )
      const key = MOVES[move].animation
      setAnimation((RIG[key] as RIG.Animation) ?? RIG.IDLE)
      setPlaying(true)
    },
    [you, them, opponent, seed, winner],
  )

  if (!opponent || !you || !them) {
    return (
      <Screen title="Sparring" subtitle="Your warrior, a bot, and four ways to end it" back="/forge">
        <div className="space-y-4">
          <Card>
            <SectionHeading title="Your numbers" hint="Base 100 health, plus whatever your gear adds." />
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="rounded-lg border border-slate/70 bg-coal/60 px-3 py-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-smoke">Health</p>
                <p className="font-display text-3xl text-vital tabular leading-none mt-0.5">{stats.health}</p>
              </div>
              <div className="rounded-lg border border-slate/70 bg-coal/60 px-3 py-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-smoke">Damage</p>
                <p className="font-display text-3xl text-ember-400 tabular leading-none mt-0.5">+{stats.damage}</p>
              </div>
            </div>
            {stats.sources.length ? (
              <ul className="mt-3 space-y-1">
                {stats.sources.map((source) => (
                  <li key={source.item.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-ash truncate">{source.item.name}</span>
                    <span className="shrink-0 tabular text-smoke">
                      {source.health > 0 && <span className="text-vital">+{source.health} hp</span>}
                      {source.health > 0 && source.damage > 0 && ' · '}
                      {source.damage > 0 && <span className="text-ember-400">+{source.damage} dmg</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-smoke mt-2 leading-relaxed">
                Nothing you are wearing carries stats. Most gear does not — it is a wardrobe, not a ladder. The first
                opponent is beatable bare-handed.{' '}
                <Link to="/forge/character" className="text-ember-400 underline underline-offset-2">
                  Change your gear
                </Link>
                .
              </p>
            )}
          </Card>

          <div>
            <SectionHeading title="Pick an opponent" />
            <ul className="space-y-2">
              {OPPONENTS.map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    onClick={() => start(choice)}
                    className="w-full text-left touch-target rounded-xl border border-slate bg-coal px-3.5 py-3 hover:border-edge"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg uppercase tracking-wide text-parchment">
                        {choice.name}
                      </span>
                      <span className="text-xs tabular text-smoke shrink-0">
                        {choice.health} hp · +{choice.damage} dmg
                      </span>
                    </div>
                    <span className="block text-xs text-ash mt-0.5">{choice.taunt}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Alert tone="info" title="This is a game, and only a game">
            {SPARRING_NOTE}
          </Alert>
        </div>
      </Screen>
    )
  }

  return (
    <Screen title="Sparring" subtitle={opponent.name} back="/forge">
      <div className="space-y-4">
        <Card raised>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider text-smoke">You</p>
                <p className="text-xs tabular text-parchment">
                  {you.health}/{you.maxHealth}
                </p>
              </div>
              <ProgressBar
                value={you.health}
                max={you.maxHealth}
                tone="good"
                ariaLabel={`Your health, ${you.health} of ${you.maxHealth}`}
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider text-smoke truncate">{opponent.name}</p>
                <p className="text-xs tabular text-parchment shrink-0">
                  {them.health}/{them.maxHealth}
                </p>
              </div>
              <ProgressBar
                value={them.health}
                max={them.maxHealth}
                tone="caution"
                ariaLabel={`${opponent.name} health, ${them.health} of ${them.maxHealth}`}
              />
            </div>
          </div>

          <div className="rounded-xl bg-void/60 border border-slate/70 overflow-hidden">
            <Fighter
              animation={animation}
              playing={playing}
              loop={animation === RIG.IDLE}
              onDone={() => {
                setAnimation(RIG.IDLE)
                setPlaying(true)
              }}
              className="w-full h-56"
            />
          </div>
        </Card>

        {winner ? (
          <Card className={cx(winner === 'you' ? 'border-vital/45' : 'border-slate')}>
            <p className="font-display text-2xl uppercase tracking-wide">
              {winner === 'you' ? 'Bout won' : 'Bout lost'}
            </p>
            <p className="text-sm text-ash mt-1 leading-relaxed">
              {winner === 'you'
                ? `${opponent.name} is down. Nothing about your programme changed — that is the deal.`
                : 'Nothing about your programme changed either. Try a different mix of strikes, or different gear.'}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button full onClick={() => setOpponent(null)}>
                Pick another
              </Button>
              <Button variant="primary" full onClick={() => start(opponent)}>
                Again
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[...ATTACKS, 'guard' as Move].map((move) => (
              <button
                key={move}
                type="button"
                onClick={() => throwMove(move)}
                className={cx(
                  'touch-target rounded-xl border px-3 py-2.5 text-left',
                  move === 'guard' ? 'border-steel/50 bg-coal col-span-2' : 'border-slate bg-coal',
                )}
              >
                <span className="block text-sm font-medium text-parchment">{MOVES[move].name}</span>
                <span className="block text-[11px] text-smoke leading-snug">{MOVES[move].hint}</span>
              </button>
            ))}
          </div>
        )}

        <Card>
          <SectionHeading title="Round log" />
          <ul className="space-y-1">
            {log.map((line, i) => (
              <li key={`${i}-${line}`} className="text-xs text-ash leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <p className="text-xs text-smoke leading-relaxed">
            The bot guards {Math.round(opponent.caution * 100)}% of the time and otherwise throws whatever would
            finish you, settling for a cross or a roundhouse when nothing would. Both of you commit before either
            sees the other, so a guard is a bet.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {/* Stated outright: levels do not stack combat numbers. A long-time
                user being unbeatable would make the mode pointless for anyone new. */}
            <Chip tone="neutral">Level {levelFromXp(data.game.xp).level} gives no advantage here</Chip>
          </div>
          <p className="text-xs text-smoke leading-relaxed mt-2">{SPARRING_NOTE}</p>
        </Card>
      </div>
    </Screen>
  )
}
