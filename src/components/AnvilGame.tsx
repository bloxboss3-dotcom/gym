import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Chip, cx, useReducedMotion } from '@/components/ui'
import {
  ANVIL,
  createRound,
  hammerAt,
  judge,
  scoreRound,
  sweepMsFor,
  type AnvilResult,
  type Verdict,
} from '@/engine/anvil'
import { useStore } from '@/state/store'

/**
 * The Anvil, played.
 *
 * One button, one bar, five strikes. The hammer position comes from a clock
 * rather than from React state — reading it out of a ref inside the tap
 * handler means the judgement uses the position at the instant of the tap,
 * not the position of the last committed render, which at 60 Hz is up to a
 * whole frame stale. That difference is the entire game.
 */
export function AnvilGame({ seed, onClose }: { seed: number; onClose: () => void }) {
  const { strikeAnvil } = useStore()
  const reduced = useReducedMotion()

  const [round] = useState(() => createRound(seed))
  const [strike, setStrike] = useState(0)
  const [verdicts, setVerdicts] = useState<Verdict[]>([])
  const [marker, setMarker] = useState(0)
  const [flash, setFlash] = useState<Verdict | null>(null)
  const [result, setResult] = useState<AnvilResult | null>(null)

  const startedAt = useRef(0)
  const raf = useRef<number | null>(null)
  const position = useRef(0)
  const strikeRef = useRef(0)
  strikeRef.current = strike

  const done = result !== null

  useEffect(() => {
    if (done) return
    startedAt.current = performance.now()
    const tick = (now: number) => {
      const at = hammerAt(now - startedAt.current, strikeRef.current)
      position.current = at
      setMarker(at)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [strike, done])

  const hit = useCallback(() => {
    if (done) return
    const verdict = judge(position.current, round.zones[strike])
    const next = [...verdicts, verdict]
    setVerdicts(next)
    setFlash(verdict)
    window.setTimeout(() => setFlash(null), 260)

    if (next.length >= ANVIL.strikes) {
      const scored = scoreRound(next)
      setResult(scored)
      strikeAnvil(
        `${round.seed}`,
        scored.coins,
        scored.xp,
        `${scored.perfects} perfect of ${ANVIL.strikes} on the anvil.`,
      )
      return
    }
    setStrike(next.length)
  }, [done, round, strike, verdicts, strikeAnvil])

  const zone = round.zones[Math.min(strike, ANVIL.strikes - 1)]

  return (
    <section
      aria-label="The Anvil"
      className="rounded-xl border border-ember-500/35 bg-coal/85 p-3"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-display text-lg uppercase tracking-wide text-ember-300">The Anvil</p>
        <div className="flex items-center gap-1.5">
          <Chip tone="neutral">
            {Math.min(verdicts.length + (done ? 0 : 1), ANVIL.strikes)}/{ANVIL.strikes}
          </Chip>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-ember-200 underline underline-offset-2 touch-target px-2"
          >
            Close
          </button>
        </div>
      </div>

      {done ? (
        <div>
          <p className="font-display text-2xl uppercase tracking-wide">{result.headline}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Chip tone="gold">◈ {result.coins}</Chip>
            {result.xp > 0 && <Chip tone="ember">{result.xp} XP</Chip>}
            <Chip tone="good">{result.perfects} perfect</Chip>
            {result.misses > 0 && <Chip tone="caution">{result.misses} missed</Chip>}
          </div>
          <p className="text-xs text-smoke mt-2 leading-relaxed">
            Banked. Coins from the anvil are capped at {ANVIL.strikes === 5 ? 'three' : 'a few'} rounds a day — it is
            here to make the rest interval worth something, not to replace training.
          </p>
          <Button full className="mt-3" onClick={onClose}>
            Back to the set
          </Button>
        </div>
      ) : (
        <>
          {/* The bar. The hot zone is drawn under the marker so the marker is
              always the thing you are watching. */}
          <div className="relative h-14 rounded-lg border border-slate bg-void overflow-hidden">
            <div
              className="absolute inset-y-0 bg-ember-500/25 border-x border-ember-500/50"
              style={{ left: `${(zone - ANVIL.zoneHalf) * 100}%`, width: `${ANVIL.zoneHalf * 200}%` }}
            />
            <div
              data-testid="anvil-zone"
              className="absolute inset-y-0 bg-ember-500/70"
              style={{ left: `${(zone - ANVIL.perfectHalf) * 100}%`, width: `${ANVIL.perfectHalf * 200}%` }}
            />
            <div
              data-testid="anvil-marker"
              className="absolute inset-y-1 w-1 rounded bg-parchment shadow-[0_0_10px_rgba(255,255,255,0.7)]"
              style={{ left: `calc(${marker * 100}% - 2px)` }}
            />
            {flash && (
              <div
                className={cx(
                  'absolute inset-0 grid place-items-center font-display uppercase tracking-widest text-lg',
                  flash === 'perfect' && 'text-vital',
                  flash === 'good' && 'text-ember-300',
                  flash === 'miss' && 'text-caution',
                )}
              >
                {flash === 'perfect' ? 'Perfect' : flash === 'good' ? 'Solid' : 'Missed'}
              </div>
            )}
          </div>

          <div className="flex gap-1 mt-1.5" aria-hidden>
            {Array.from({ length: ANVIL.strikes }, (_, i) => (
              <span
                key={i}
                className={cx(
                  'h-1 flex-1 rounded',
                  verdicts[i] === 'perfect' && 'bg-vital',
                  verdicts[i] === 'good' && 'bg-ember-500',
                  verdicts[i] === 'miss' && 'bg-slate',
                  verdicts[i] === undefined && 'bg-slate/40',
                )}
              />
            ))}
          </div>

          <Button variant="primary" full className="mt-2.5" onClick={hit}>
            Strike
          </Button>
          <p className="text-[11px] text-smoke mt-1.5 leading-relaxed">
            {reduced
              ? 'Reduced motion is on, so the hammer still moves but nothing flashes. Tap Strike as it crosses the hot metal.'
              : `Tap as the hammer crosses the hot metal. Each strike is faster than the last — ${Math.round(
                  sweepMsFor(strike) / 100,
                ) / 10}s a pass now.`}
          </p>
        </>
      )}
    </section>
  )
}
