import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { ArenaStage } from '@/character/ArenaStage'
import { Fighter } from '@/character/Fighter'
import * as RIG from '@/character/rig'
import type { Equipped } from '@/character/palette'
import { Alert, Button, Card, Chip, ProgressBar, SectionHeading, cx } from '@/components/ui'
import { buildFromXp } from '@/config/economy'
import { MOVE_BY_ID, resolveLoadout } from '@/data/moves'
import {
  IDLE_INTENT,
  TICK_MS,
  botIntent,
  createArena,
  makeFighter,
  step,
  type ArenaState,
  type Intent,
} from '@/engine/arena'
import { OPPONENTS, SPARRING_NOTE, combatStats, type Opponent } from '@/engine/duel'
import { useStore } from '@/state/store'

/**
 * The arena.
 *
 * Real time, side on, and positional: you walk, jump, duck, block and strike,
 * and whether something lands depends on where you are standing and what you
 * are doing at the moment it arrives. A turn-based exchange could never
 * express that — dodging has to be an action you take, not a die rolled for
 * you.
 *
 * The simulation runs on a fixed 16 ms tick driven from requestAnimationFrame
 * with an accumulator. Frame rate therefore changes how smooth it looks and
 * never how it plays, which is also what keeps the engine's tests meaningful.
 *
 * Input is HELD state, not events: buttons set flags that the next tick reads.
 * Holding "back" walks backwards for as long as you hold it, which is the only
 * way retreating can feel like retreating.
 */
export default function Sparring() {
  const { data, setLoadout } = useStore()
  const stats = useMemo(() => combatStats(data.game.equipped), [data.game.equipped])
  const unlocked = useMemo(() => data.game.unlockedMoves ?? [], [data.game.unlockedMoves])
  const loadout = useMemo(() => resolveLoadout(data.game.loadout, unlocked), [data.game.loadout, unlocked])

  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [state, setState] = useState<ArenaState | null>(null)
  const [log, setLog] = useState<string[]>([])

  // Held input lives in a ref because the loop reads it every tick, and a
  // state update per button press would re-render the screen mid-fight.
  const held = useRef<Intent>({ ...IDLE_INTENT })
  const queuedAttack = useRef<string | null>(null)
  const raf = useRef<number | null>(null)
  const carry = useRef(0)
  const last = useRef(0)
  const opponentRef = useRef<Opponent | null>(null)
  opponentRef.current = opponent
  const stateRef = useRef<ArenaState | null>(null)
  stateRef.current = state

  const start = useCallback(
    (choice: Opponent) => {
      const you = makeFighter({ x: 380, facing: 1, health: stats.health, power: stats.damage, loadout })
      const them = makeFighter({
        x: 720,
        facing: -1,
        health: choice.health + 40,
        power: choice.damage,
        loadout: choice.moves,
      })
      held.current = { ...IDLE_INTENT }
      queuedAttack.current = null
      carry.current = 0
      last.current = 0
      const fresh = createArena(you, them, (choice.health * 7919 + stats.health * 104729) >>> 0 || 1)
      stateRef.current = fresh
      setOpponent(choice)
      setLog([choice.taunt])
      setState(fresh)
    },
    [loadout, stats.damage, stats.health],
  )

  const running = Boolean(state && !state.winner)

  useEffect(() => {
    if (!running) return
    const tick = (now: number) => {
      if (!last.current) last.current = now
      // Clamp the catch-up: a backgrounded tab must not resume by simulating
      // ten seconds of fight inside one frame.
      carry.current = Math.min(200, carry.current + (now - last.current))
      last.current = now

      // The simulation lives in a ref, and React state only mirrors it.
      //
      // The first version stepped the world INSIDE a setState updater and read
      // the events it produced straight afterwards — which never worked,
      // because React runs the updater later. The round log stayed empty
      // through an entire fight while everything else looked correct.
      const bot = opponentRef.current
      const messages: string[] = []
      let next = stateRef.current
      while (next && !next.winner && carry.current >= TICK_MS) {
        carry.current -= TICK_MS
        const mine: Intent = { ...held.current, attack: queuedAttack.current }
        queuedAttack.current = null
        next = step(next, mine, bot ? botIntent(next, bot.profile) : IDLE_INTENT, TICK_MS)
        for (const event of next.events) {
          if (event.kind === 'hit') {
            const who = event.by === 'you' ? 'You' : (bot?.name ?? 'They')
            const move = MOVE_BY_ID[event.move]?.name ?? event.move
            messages.push(
              `${who} landed ${move}${event.blocked ? ' on the guard' : ''} for ${event.damage}${
                event.knockdown ? ' — knockdown' : ''
              }.`,
            )
          }
          if (event.kind === 'ko') {
            messages.push(event.winner === 'you' ? `${bot?.name ?? 'They'} went down.` : 'You went down.')
          }
        }
      }
      if (next !== stateRef.current) {
        stateRef.current = next
        setState(next)
      }
      if (messages.length) setLog((prev) => [...prev, ...messages].slice(-6))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      last.current = 0
    }
  }, [running])

  // Keyboard for desktop. Touch is the primary path; this is a convenience.
  useEffect(() => {
    if (!running) return
    const apply = (key: string, down: boolean): boolean => {
      switch (key) {
        case 'ArrowLeft':
        case 'a':
          held.current.move = down ? -1 : held.current.move === -1 ? 0 : held.current.move
          return true
        case 'ArrowRight':
        case 'd':
          held.current.move = down ? 1 : held.current.move === 1 ? 0 : held.current.move
          return true
        case 'ArrowUp':
        case 'w':
          held.current.jump = down
          return true
        case 'ArrowDown':
        case 's':
          held.current.crouch = down
          return true
        case 'Shift':
          held.current.block = down
          return true
        default:
          if (down && /^[1-4]$/.test(key)) {
            queuedAttack.current = loadout[Number(key) - 1] ?? null
            return true
          }
          return false
      }
    }
    const onDown = (e: KeyboardEvent) => {
      if (apply(e.key, true)) e.preventDefault()
    }
    const onUp = (e: KeyboardEvent) => {
      if (apply(e.key, false)) e.preventDefault()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [running, loadout])

  if (!opponent || !state) {
    return (
      <Lobby
        stats={stats}
        loadout={loadout}
        unlocked={unlocked}
        onPick={start}
        onReorder={setLoadout}
        equipped={data.game.equipped}
        build={buildFromXp(data.game.xp)}
      />
    )
  }

  const { you, them } = state

  return (
    <Screen title="Arena" subtitle={opponent.name} back="/forge">
      <div className="space-y-3">
        <Card raised className="p-2">
          <div className="grid grid-cols-2 gap-3 mb-2 px-1">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider text-smoke">You</p>
                <p className="text-xs tabular text-parchment">{you.health}</p>
              </div>
              <ProgressBar value={you.health} max={you.maxHealth} tone="good" ariaLabel={`Your health, ${you.health}`} />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider text-smoke truncate">{opponent.name}</p>
                <p className="text-xs tabular text-parchment shrink-0">{them.health}</p>
              </div>
              <ProgressBar
                value={them.health}
                max={them.maxHealth}
                tone="caution"
                ariaLabel={`${opponent.name} health, ${them.health}`}
              />
            </div>
          </div>

          <ArenaStage
            state={state}
            yourGear={data.game.equipped}
            yourBuild={buildFromXp(data.game.xp)}
            theirGear={opponent.look}
            theirBuild={0.6}
            className="w-full rounded-lg overflow-hidden bg-void"
          />

          {/* Spacing is the whole game, and it is invisible without a number on
              it while you are still learning to read the distance. */}
          <p className="text-[11px] text-smoke text-center mt-1 tabular">
            {Math.round(Math.abs(them.x - you.x))} apart{you.y > 1 ? ' · airborne' : ''}
          </p>
        </Card>

        {state.winner ? (
          <Card className={cx(state.winner === 'you' ? 'border-vital/45' : 'border-slate')}>
            <p className="font-display text-2xl uppercase tracking-wide">
              {state.winner === 'you' ? 'Bout won' : 'Bout lost'}
            </p>
            <p className="text-sm text-ash mt-1 leading-relaxed">
              Nothing about your programme changed either way — that is the deal.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button full onClick={() => setOpponent(null)}>
                Leave the arena
              </Button>
              <Button variant="primary" full onClick={() => start(opponent)}>
                Again
              </Button>
            </div>
          </Card>
        ) : (
          <Controls held={held} loadout={loadout} onAttack={(id) => (queuedAttack.current = id)} />
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
      </div>
    </Screen>
  )
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

/**
 * Held buttons, not taps.
 *
 * Pointer events with capture on the element, so a finger that slides off a
 * button still releases it. Without the capture you walk into the ropes
 * forever, because the browser never tells anyone you let go.
 */
function Controls({
  held,
  loadout,
  onAttack,
}: {
  held: MutableRefObject<Intent>
  loadout: string[]
  onAttack: (id: string) => void
}) {
  const hold = (apply: (down: boolean) => void, label: string) => ({
    'aria-label': label,
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      apply(true)
    },
    onPointerUp: () => apply(false),
    onPointerCancel: () => apply(false),
    onLostPointerCapture: () => apply(false),
  })

  const pad =
    'touch-target select-none rounded-xl border border-slate bg-coal active:bg-ember-500/25 active:border-ember-500 grid place-items-center text-parchment'

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          className={cx(pad, 'h-[68px]')}
          {...hold((d) => (held.current.move = d ? -1 : held.current.move === -1 ? 0 : held.current.move), 'Move left')}
        >
          <span aria-hidden className="text-xl">
            ◀
          </span>
        </button>
        <div className="grid grid-rows-2 gap-1.5">
          <button type="button" className={cx(pad, 'h-8')} {...hold((d) => (held.current.jump = d), 'Jump')}>
            <span aria-hidden className="text-sm">
              ▲
            </span>
          </button>
          <button type="button" className={cx(pad, 'h-8')} {...hold((d) => (held.current.crouch = d), 'Duck')}>
            <span aria-hidden className="text-sm">
              ▼
            </span>
          </button>
        </div>
        <button
          type="button"
          className={cx(pad, 'h-[68px]')}
          {...hold((d) => (held.current.move = d ? 1 : held.current.move === 1 ? 0 : held.current.move), 'Move right')}
        >
          <span aria-hidden className="text-xl">
            ▶
          </span>
        </button>
        <button
          type="button"
          className={cx(pad, 'col-span-3 h-11 text-xs uppercase tracking-wider')}
          {...hold((d) => (held.current.block = d), 'Block')}
        >
          Block
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {loadout.map((id, i) => {
          const move = MOVE_BY_ID[id]
          if (!move) return null
          return (
            <button
              key={id}
              type="button"
              onPointerDown={() => onAttack(id)}
              aria-label={`${move.name}. ${move.hint}`}
              className="touch-target select-none rounded-xl border border-slate bg-coal active:bg-ember-500/30 active:border-ember-500 px-2 py-1.5 text-left"
            >
              <span className="block text-[10px] text-smoke tabular">{i + 1}</span>
              <span className="block text-xs text-parchment leading-tight">{move.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------

function Lobby({
  stats,
  loadout,
  unlocked,
  onPick,
  onReorder,
  equipped,
  build,
}: {
  stats: ReturnType<typeof combatStats>
  loadout: string[]
  unlocked: string[]
  onPick: (o: Opponent) => void
  onReorder: (ids: string[]) => void
  equipped: Equipped
  build: number
}) {
  return (
    <Screen title="Arena" subtitle="Walk, jump, duck, block — then hit them" back="/forge">
      <div className="space-y-4">
        <Card>
          {/* Who you are sending in. Same gear, same build, same figure as the
              Forge — the arena is where the character you have been building
              gets used, so you should see it before you commit. */}
          <div className="rounded-xl bg-void/60 border border-slate/70 overflow-hidden mb-3">
            <Fighter
              animation={RIG.IDLE}
              playing
              loop
              equipped={equipped}
              build={build}
              className="w-full h-40"
              label="Your warrior, ready to fight"
            />
          </div>
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
          {stats.sources.length > 0 && (
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
          )}
        </Card>

        <Card>
          <SectionHeading title="Your four strikes" hint="Tap one to move it to slot 1 on the pad." />
          <ul className="space-y-1.5 mt-1">
            {loadout.map((id, i) => {
              const move = MOVE_BY_ID[id]
              if (!move) return null
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onReorder([id, ...loadout.filter((m) => m !== id)])}
                    className="w-full text-left touch-target rounded-lg border border-slate bg-coal px-3 py-2"
                    aria-label={`Move ${move.name} to slot 1`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-parchment">
                        <span className="text-smoke tabular mr-1.5">{i + 1}</span>
                        {move.name}
                      </span>
                      <Chip tone="neutral">{move.damage} dmg</Chip>
                    </div>
                    <span className="block text-[11px] text-smoke mt-0.5 leading-snug">{move.hint}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <Link to="/forge/techniques" className="contents">
            <Button full className="mt-2">
              {unlocked.length ? 'Techniques & scrolls ›' : 'Unlock more strikes ›'}
            </Button>
          </Link>
        </Card>

        <div>
          <SectionHeading title="Pick an opponent" />
          <ul className="space-y-2">
            {OPPONENTS.map((choice) => (
              <li key={choice.id}>
                <button
                  type="button"
                  onClick={() => onPick(choice)}
                  className="w-full text-left touch-target rounded-xl border border-slate bg-coal px-3.5 py-3 hover:border-edge"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg uppercase tracking-wide text-parchment">{choice.name}</span>
                    <span className="text-xs tabular text-smoke shrink-0">
                      {choice.health + 40} hp · +{choice.damage} dmg
                    </span>
                  </div>
                  <span className="block text-xs text-ash mt-0.5">{choice.taunt}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Alert tone="info" title="How the arena works">
          Hold ◀ ▶ to walk — you close ground faster than you back away. Jump anything low, duck anything high, block
          anything in between. Every strike has a wind-up you can see coming and a recovery you can be punished in, so
          the safest thing you can do is make them miss.
        </Alert>

        <Alert tone="info" title="This is a game, and only a game">
          {SPARRING_NOTE}
        </Alert>
      </div>
    </Screen>
  )
}
