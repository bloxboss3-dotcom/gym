import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RecommendationCard } from '@/components/RecommendationCard'
import { AnvilGame } from '@/components/AnvilGame'
import { RestPuzzle } from '@/components/RestPuzzle'
import {
  Alert,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Disclosure,
  IconButton,
  NumberStepper,
  Sheet,
  Slider,
  TextArea,
  cx,
} from '@/components/ui'
import { citationsFor } from '@/data/citations'
import { EXERCISE_BY_ID, searchExercises } from '@/data/exercises'
import { RULES } from '@/config/rules'
import { ECONOMY } from '@/config/economy'
import { historyFor, recommendNextSession } from '@/engine/progression'
import { BLOCK_EXPLANATION, primaryMuscle, suggestFinisher } from '@/engine/intensity'
import { startingVolumeRange, weeklyMuscleVolume } from '@/engine/volume'
import { fromDisplay, formatWeight, roundToIncrement, toDisplay } from '@/engine/units'
import {
  barKgFor,
  describePlan,
  planPlates,
  platesFor,
  totalFromPlates,
  weightHint,
  weightLabel,
  type PlateGroup,
} from '@/engine/plates'
import { addDays, formatClock, formatDateLabel, startOfWeek, toIsoDate } from '@/lib/date'
import { useStore } from '@/state/store'
import type { LoadingStyle, LoggedSet, SessionEntry, TechniqueRating, Units } from '@/types'

/**
 * The workout player.
 *
 * Priorities, in order: log a set in under three taps, always show what you did
 * last time, and never let the game layer get in the way. The bottom navigation
 * is hidden here on purpose.
 */
export default function SessionPlayer() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const store = useStore()
  const { data } = store
  const session = data.sessions.find((s) => s.id === sessionId)

  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [substituteFor, setSubstituteFor] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  // Only one rest-timer game at a time: two things competing for a ninety
  // second window is how you end up finishing neither.
  const [restGame, setRestGame] = useState<'none' | 'puzzle' | 'anvil'>('none')
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    timerRef.current = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const startRest = useCallback((seconds: number) => {
    setRestEndsAt(Date.now() + seconds * 1000)
  }, [])

  if (!session) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl uppercase">Session not found</p>
          <p className="text-sm text-ash mt-2">It may have been deleted or restored from a different backup.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/train')}>
            Back to Train
          </Button>
        </div>
      </div>
    )
  }

  const elapsed = Math.floor((now - session.startedAt) / 1000)
  const restLeft = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0
  const totalSets = session.entries.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0)
  const plannedSets = session.entries.reduce((n, e) => n + e.plannedSets, 0)
  const readOnly = session.status !== 'active'
  // Accepted and completed both spend the fatigue budget — you did the work
  // either way. Declining does not.
  const challengesTaken = session.entries.filter(
    (e) => e.challenge?.status === 'accepted' || e.challenge?.status === 'completed',
  ).length

  return (
    <div className="min-h-dvh flex flex-col bg-void">
      <header
        className="sticky top-0 z-30 bg-void/95 backdrop-blur border-b border-slate/70 safe-x"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center gap-2">
          <IconButton label="Back" className="-ml-2" onClick={() => navigate('/train')}>
            <span aria-hidden className="text-lg">
              ✕
            </span>
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl uppercase tracking-wide leading-none truncate">{session.title}</h1>
            <p className="text-[11px] text-smoke mt-0.5 tabular">
              {formatClock(elapsed)} · {totalSets}/{plannedSets} working sets
            </p>
          </div>
          {!readOnly && (
            <Button variant="primary" size="sm" onClick={() => setConfirmFinish(true)}>
              Finish
            </Button>
          )}
        </div>
        {restLeft > 0 && (
          <div className="bg-ember-500/15 border-t border-ember-500/30">
            <div className="max-w-lg mx-auto px-4 py-1.5 flex items-center justify-between gap-3">
              <span className="text-xs text-ember-200">Rest</span>
              <span className="font-display text-lg text-ember-300 tabular">{formatClock(restLeft)}</span>
              <button
                type="button"
                onClick={() => setRestGame((v) => (v === 'anvil' ? 'none' : 'anvil'))}
                className="text-xs text-ember-200 underline underline-offset-2 touch-target px-2"
              >
                {restGame === 'anvil' ? 'Hide anvil' : 'Anvil'}
              </button>
              <button
                type="button"
                onClick={() => setRestGame((v) => (v === 'puzzle' ? 'none' : 'puzzle'))}
                className="text-xs text-ember-200 underline underline-offset-2 touch-target px-2"
              >
                {restGame === 'puzzle' ? 'Hide puzzle' : 'Puzzle'}
              </button>
              <button
                type="button"
                onClick={() => setRestEndsAt(null)}
                className="text-xs text-ember-200 underline underline-offset-2 touch-target px-2"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </header>

      <main
        className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 safe-x space-y-4"
        style={{ paddingBottom: 'calc(6rem + var(--safe-bottom))' }}
      >
        {/* Opening a game is gated on resting — the toggles above only exist
            while the timer runs — but FINISHING one is not. Unmounting a round
            in progress because the clock hit zero would throw away the round
            and the coins with it, which is a rotten thing to do to someone who
            was three strikes in. */}
        {restGame === 'anvil' && (
          <AnvilGame
            seed={(session.startedAt % 100000) + totalSets * 7919 + 1}
            onClose={() => setRestGame('none')}
          />
        )}
        {restGame === 'puzzle' && (
          <RestPuzzle seed={totalSets + session.entries.length} onClose={() => setRestGame('none')} />
        )}

        {readOnly && (
          <Alert tone="info" title="This session is closed">
            You are viewing a {session.status} session. Start a new one from Train to keep logging.
          </Alert>
        )}

        {session.entries.length === 0 && (
          <Alert tone="warn">
            No exercises in this session yet. Add one below to start logging.
          </Alert>
        )}

        {session.entries.map((entry, index) => (
          <ExerciseBlock
            key={entry.id}
            entry={entry}
            index={index}
            sessionId={session.id}
            readOnly={readOnly}
            challengesTaken={challengesTaken}
            onRest={startRest}
            onSubstitute={() => setSubstituteFor(entry.id)}
          />
        ))}

        {!readOnly && (
          <div className="grid grid-cols-2 gap-2">
            <Button full onClick={() => setAddOpen(true)}>
              Add exercise
            </Button>
            <Button full onClick={() => setNotesOpen(true)}>
              Session notes
            </Button>
          </div>
        )}

        {session.note && (
          <Card>
            <p className="text-[11px] uppercase tracking-wider text-smoke">Notes</p>
            <p className="text-sm text-ash mt-1 whitespace-pre-wrap">{session.note}</p>
          </Card>
        )}

        {!readOnly && (
          <Button variant="ghost" full onClick={() => setConfirmAbandon(true)}>
            Abandon session
          </Button>
        )}
      </main>

      {!readOnly && (
        <div
          className="fixed bottom-0 inset-x-0 z-30 bg-coal/95 backdrop-blur border-t border-slate safe-x"
          style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
        >
          <div className="max-w-lg mx-auto px-4 pt-3">
            <Button variant="primary" size="lg" full onClick={() => setConfirmFinish(true)}>
              Finish session · {totalSets} sets logged
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmFinish}
        title="Finish this session?"
        body={
          totalSets === 0
            ? 'You have not logged any working sets. Finishing now saves an empty session and will not earn rewards.'
            : `${totalSets} working sets will be saved, your next-session recommendations will update, and rewards will be calculated.`
        }
        confirmLabel="Finish"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setConfirmFinish(false)
          store.completeSession(session.id)
          navigate(`/train/summary/${session.id}`, { replace: true })
        }}
      />

      <ConfirmDialog
        open={confirmAbandon}
        destructive
        title="Abandon this session?"
        body="Sets you already logged are kept for your records, but the session will not count toward your consistency or rewards. This cannot be undone."
        confirmLabel="Abandon"
        onCancel={() => setConfirmAbandon(false)}
        onConfirm={() => {
          setConfirmAbandon(false)
          store.abandonSession(session.id)
          navigate('/train', { replace: true })
        }}
      />

      <Sheet open={notesOpen} onClose={() => setNotesOpen(false)} title="Session notes">
        <TextArea
          value={session.note ?? ''}
          placeholder="Anything worth remembering — the gym was packed, sleep was bad, a cue that clicked…"
          onChange={(e) => store.setSessionNote(session.id, e.target.value)}
        />
        <Button variant="primary" full className="mt-4" onClick={() => setNotesOpen(false)}>
          Done
        </Button>
      </Sheet>

      <ExercisePicker
        open={addOpen}
        title="Add an exercise"
        onClose={() => setAddOpen(false)}
        onPick={(id) => {
          store.addEntryToSession(session.id, id)
          setAddOpen(false)
        }}
      />

      <ExercisePicker
        open={substituteFor !== null}
        title="Substitute exercise"
        note="Sets already logged for this slot will be cleared, and the substitution is recorded so your history stays honest."
        suggestions={
          substituteFor
            ? (EXERCISE_BY_ID[session.entries.find((e) => e.id === substituteFor)?.exerciseId ?? '']?.alternatives ?? [])
            : []
        }
        onClose={() => setSubstituteFor(null)}
        onPick={(id) => {
          if (substituteFor) store.substituteExercise(session.id, substituteFor, id)
          setSubstituteFor(null)
        }}
      />

      <span className="sr-only" aria-live="polite">
        {restLeft > 0 ? `Rest ${restLeft} seconds remaining` : ''}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// One exercise
// ---------------------------------------------------------------------------

function ExerciseBlock({
  entry,
  index,
  sessionId,
  readOnly,
  challengesTaken,
  onRest,
  onSubstitute,
}: {
  entry: SessionEntry
  index: number
  sessionId: string
  readOnly: boolean
  /** Challenges already accepted or finished elsewhere in this session. */
  challengesTaken: number
  onRest: (seconds: number) => void
  onSubstitute: () => void
}) {
  const store = useStore()
  const { data } = store
  const units = data.profile?.units ?? 'kg'
  const exercise = data.exercises.find((e) => e.id === entry.exerciseId) ?? EXERCISE_BY_ID[entry.exerciseId]

  const history = useMemo(
    () => historyFor(data.sessions.filter((s) => s.id !== sessionId), entry.exerciseId, 4),
    [data.sessions, entry.exerciseId, sessionId],
  )
  const previous = history[0] ?? null

  const recommendation = useMemo(
    () =>
      recommendNextSession(
        history,
        {
          sets: entry.plannedSets,
          repMin: entry.repMin,
          repMax: entry.repMax,
          targetRIR: entry.targetRIR,
          incrementKg: entry.incrementKg,
          lowerBody: exercise?.lowerBody ?? false,
          units,
        },
        {
          recentSoreness: data.checkins[0]?.soreness ?? null,
          recentReadiness: data.checkins[0]?.readiness ?? null,
        },
      ),
    [history, entry, exercise, units, data.checkins],
  )

  // Open on a load the user can actually put on the bar, in their own unit.
  //
  // The last-resort fallback is picked in DISPLAY units. A bare kilogram
  // constant here meant a pound user with no history for a movement opened on
  // "44.1 lb" — a number that exists on no stack and no dumbbell rack.
  const fallbackKg = fromDisplay(units === 'kg' ? 20 : 45, units)
  const suggestedLoad = roundToIncrement(
    recommendation.target.loadKg ?? previous?.sets[0]?.weightKg ?? fallbackKg,
    entry.incrementKg,
    units,
  )
  const [draftWeight, setDraftWeight] = useState(() => Number(toDisplay(suggestedLoad, units).toFixed(1)))
  const [draftReps, setDraftReps] = useState(entry.repMax)
  const [draftRir, setDraftRir] = useState<number | null>(entry.targetRIR)
  const [warmup, setWarmup] = useState(false)
  const [editing, setEditing] = useState<LoggedSet | null>(null)
  const [plateOpen, setPlateOpen] = useState(false)

  // What the number in the weight box refers to. Without this, a 30 on a
  // barbell and a 30 on dumbbells look identical and mean different things.
  const loading = exercise?.loading ?? 'other'
  const barDisplay = Number(toDisplay(barKgFor(exercise ?? null, data.settings, units), units).toFixed(1))
  const plates = useMemo(() => platesFor(data.settings, units), [data.settings, units])
  const platePlan = useMemo(
    () =>
      loading === 'barbell'
        ? planPlates({ totalDisplay: draftWeight, barDisplay, plates, units })
        : null,
    [loading, draftWeight, barDisplay, plates, units],
  )
  const hint = weightHint(loading, draftWeight, units, exercise?.unilateral ?? false)

  const workingSets = entry.sets.filter((s) => !s.warmup)
  const done = workingSets.length >= entry.plannedSets
  const challenge = entry.challenge ?? null
  /*
    The budget counts challenges taken on OTHER movements.
    Counting this one's own would make the engine withdraw the offer the
    instant it was accepted, taking the steps off the screen of the person
    who just agreed to follow them.
  */
  const ownTaken = challenge?.status === 'accepted' || challenge?.status === 'completed' ? 1 : 0
  const takenElsewhere = challengesTaken - ownTaken

  // Should this movement earn a finisher? The answer depends on how short the
  // week is for the muscle it trains, so the weekly tally has to be computed
  // here rather than guessed.
  const finisher = useMemo(() => {
    if (!exercise || readOnly) return { technique: null, blockedBy: null }
    const muscle = primaryMuscle(exercise)
    if (!muscle) return { technique: null, blockedBy: null }
    const start = startOfWeek(toIsoDate())
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    const volume = weeklyMuscleVolume(data.sessions, data.exercises, weekDates)
    return suggestFinisher({
      goal: data.profile?.goal ?? 'general',
      exercise,
      entry,
      weeklySets: volume[muscle]?.hardSets ?? 0,
      weeklyRange: startingVolumeRange(data.profile?.experience ?? 'beginner'),
      // Count what was actually taken, not zero.
      //
      // This was hardcoded to 0, which quietly disabled the fatigue budget:
      // the engine caps finishers at two a session and the rule was written,
      // tested and never consulted, so a finisher was offered on every single
      // movement and a session could end up carrying five of them.
      finishersUsedThisSession: takenElsewhere,
      deloadActive: data.deloads.some((d) => d.status === 'accepted' && d.endDate === null),
      units,
    })
  }, [exercise, entry, data.sessions, data.exercises, data.profile, data.deloads, units, readOnly, takenElsewhere])

  // Total reps this session vs last, which is exactly what double progression
  // is comparing. Only sets at a comparable load count toward "to beat" —
  // beating last week's reps on a lighter bar is not progress.
  const repsThisSession = workingSets.reduce((n, s) => n + s.reps, 0)
  // History entries are already reduced to working sets by the engine.
  const previousWorking = previous?.sets ?? []
  const previousReps = previousWorking.reduce((n, s) => n + s.reps, 0)
  const currentLoad = workingSets[0]?.weightKg ?? fromDisplay(draftWeight, units)
  const comparableLoad =
    previousWorking.length > 0 &&
    Math.abs((previousWorking[0]?.weightKg ?? 0) - currentLoad) <= entry.incrementKg / 2
  const repsToBeat = comparableLoad ? previousReps : 0
  const beatenTarget = repsToBeat > 0 && repsThisSession > repsToBeat

  const log = () => {
    store.logSet(sessionId, entry.id, {
      weightKg: fromDisplay(draftWeight, units),
      reps: draftReps,
      rir: draftRir,
      warmup,
    })
    if (!warmup) onRest(entry.restSec)
    if (warmup) setWarmup(false)
  }

  const copyPrevious = () => {
    const last = entry.sets.filter((s) => !s.warmup).at(-1) ?? previous?.sets.at(-1)
    if (!last) return
    setDraftWeight(Number(toDisplay(last.weightKg, units).toFixed(1)))
    setDraftReps(last.reps)
    setDraftRir(last.rir ?? entry.targetRIR)
  }

  return (
    <Card className={cx(done && 'border-vital/35')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-smoke">
            Exercise {index + 1}
            {entry.substitutedFromId && ' · substituted'}
          </p>
          <h2 className="font-display text-xl uppercase tracking-wide leading-tight">
            {exercise?.name ?? entry.exerciseId}
          </h2>
          <p className="text-xs text-ash mt-0.5">
            {entry.plannedSets} × {entry.repMin}–{entry.repMax} · rest {Math.round(entry.restSec / 60)} min · target{' '}
            {entry.targetRIR} RIR
          </p>
        </div>
        {done && <Chip tone="good">Done</Chip>}
      </div>

      {exercise?.cue && <p className="text-xs text-smoke mt-2 italic">{exercise.cue}</p>}

      {/*
        Running rep total.

        Double progression asks you to beat last session's reps at the same
        load, and until now the app said "chase one more rep" while making you
        add up your own sets to know whether you had. This is the number the
        recommendation is actually about.
      */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-coal/70 border border-slate/70 px-2.5 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-smoke">Reps so far</p>
          <p className="font-display text-2xl text-parchment tabular leading-none mt-0.5">{repsThisSession}</p>
        </div>
        <div className="rounded-lg bg-coal/70 border border-slate/70 px-2.5 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-smoke">Last time</p>
          <p className="font-display text-2xl text-ash tabular leading-none mt-0.5">
            {previousReps || '—'}
          </p>
        </div>
        <div
          className={cx(
            'rounded-lg border px-2.5 py-2 text-center',
            beatenTarget ? 'border-vital/45 bg-vital/10' : 'border-ember-500/40 bg-ember-500/10',
          )}
        >
          {/* "Reps left", not "to beat": the number shown is the gap, and a
              label that names the target while showing the gap is the kind of
              small lie that makes people distrust the whole screen. */}
          <p className="text-[10px] uppercase tracking-wider text-smoke">Reps left</p>
          <p
            className={cx(
              'font-display text-2xl tabular leading-none mt-0.5',
              beatenTarget ? 'text-vital' : 'text-ember-400',
            )}
          >
            {repsToBeat ? (beatenTarget ? '✓' : repsToBeat + 1 - repsThisSession) : '—'}
          </p>
        </div>
      </div>
      {repsToBeat > 0 && (
        <p className="text-[11px] text-smoke mt-1.5 leading-relaxed">
          {beatenTarget
            ? `${repsThisSession} total reps beats the ${repsToBeat} you managed last time at this load.`
            : `${repsToBeat + 1 - repsThisSession} more total reps at this load beats last session.`}
        </p>
      )}

      {/* Last session's sets ------------------------------------------------ */}
      <div className="mt-3 rounded-lg bg-coal/70 border border-slate/70 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wider text-smoke">Last time’s sets</p>
        {previous ? (
          <p className="text-sm text-parchment mt-0.5">
            {formatDateLabel(previous.date)} —{' '}
            {previous.sets
              .map((s) => `${formatWeight(s.weightKg, units, { unit: false })}×${s.reps}${s.rir !== null ? ` @${s.rir}` : ''}`)
              .join(' · ')}
          </p>
        ) : (
          <p className="text-sm text-ash mt-0.5">No previous session for this movement.</p>
        )}
      </div>

      {/* Recommendation ---------------------------------------------------- */}
      <Disclosure
        summary={
          <span className="flex items-center gap-2">
            <span className="text-ember-400 font-medium">{recommendation.headline}</span>
            <span className="text-xs text-smoke">— why?</span>
          </span>
        }
        tone="quiet"
      >
        <RecommendationCard
          recommendation={recommendation}
          detailHref={`/progress/recommendation/${entry.exerciseId}`}
        />
      </Disclosure>

      {/* The challenge ----------------------------------------------------
          Offered only after the planned sets are done, only when the week is
          genuinely short on volume for this muscle, and only twice a session.

          Framed as something to take or leave rather than a footnote to
          scroll past. The old version was a collapsed disclosure headed
          "Optional", which is so quiet it reads as decoration — and because
          the fatigue budget was never wired up, it appeared on every single
          movement, so the one thing it did communicate was "do this five
          times". Both halves of that are fixed here: it asks once, plainly,
          and it stops asking. */}
      {done && challenge && (
        <div
          className={cx(
            'mt-3 rounded-xl border px-3 py-3',
            challenge.status === 'completed'
              ? 'border-vital/45 bg-vital/[0.08]'
              : challenge.status === 'accepted'
                ? 'border-ember-500/60 bg-ember-500/[0.12]'
                : 'border-slate bg-coal/60',
          )}
        >
          {challenge.status === 'completed' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Chip tone="good">Challenge done</Chip>
              <span className="text-sm text-parchment">{challenge.headline}</span>
              <span className="text-xs text-vital">
                +{ECONOMY.rewards.challenge_completed.coins} coins · +
                {ECONOMY.rewards.challenge_completed.xp} XP
              </span>
            </div>
          ) : challenge.status === 'declined' || challenge.status === 'abandoned' ? (
            <p className="text-xs text-smoke leading-relaxed">
              {challenge.status === 'declined' ? 'Passed on' : 'Called off'}: {challenge.headline}.
              Nothing lost — it was never part of the plan.
            </p>
          ) : null}
        </div>
      )}

      {done && finisher.technique && !challenge && (
        <div
          data-testid="challenge-offer"
          className="mt-3 rounded-xl border border-ember-500/50 bg-ember-500/[0.1] px-3 py-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Chip tone="ember">Challenge</Chip>
            <span className="text-[11px] text-smoke tabular">
              {takenElsewhere + 1} of {RULES.intensity.maxPerSession} today
            </span>
          </div>
          <p className="font-display text-lg uppercase tracking-wide text-ember-200 mt-1.5 leading-tight">
            {finisher.technique.headline}
          </p>
          <p className="text-xs text-ash mt-1 leading-relaxed">{finisher.technique.reason}</p>
          <p className="text-xs text-gold-300 mt-2">
            Finish it: +{ECONOMY.rewards.challenge_completed.coins} coins, +
            {ECONOMY.rewards.challenge_completed.xp} XP
          </p>
          {!readOnly && (
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <Button
                variant="primary"
                onClick={() =>
                  store.setChallenge(sessionId, entry.id, {
                    kind: finisher.technique!.kind,
                    headline: finisher.technique!.headline,
                    status: 'accepted',
                    at: Date.now(),
                  })
                }
              >
                Take it
              </Button>
              <Button
                onClick={() =>
                  store.setChallenge(sessionId, entry.id, {
                    kind: finisher.technique!.kind,
                    headline: finisher.technique!.headline,
                    status: 'declined',
                    at: Date.now(),
                  })
                }
              >
                Not today
              </Button>
            </div>
          )}
          <Disclosure
            summary={<span className="text-xs text-smoke">How, and what the evidence actually says</span>}
            tone="quiet"
          >
            <p className="text-[11px] uppercase tracking-wider text-smoke mt-2">
              {finisher.technique.name}
            </p>
            <ol className="mt-1.5 space-y-1.5">
              {finisher.technique.steps.map((step, i) => (
                <li key={i} className="text-sm text-parchment flex gap-2">
                  <span className="shrink-0 text-smoke tabular">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {finisher.technique.missingData.map((gap) => (
              <p key={gap} className="text-[11px] text-smoke mt-1.5 leading-relaxed">
                Missing: {gap}
              </p>
            ))}
            <p className="text-[11px] text-smoke mt-2">
              Rule <span className="text-ash">{finisher.technique.rule}</span> · confidence{' '}
              {finisher.technique.confidence} · counts as {finisher.technique.countsAsSets} of a hard set
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {citationsFor(finisher.technique.citationIds).map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-ember-300 underline underline-offset-2"
                >
                  {c.short}
                </a>
              ))}
            </div>
          </Disclosure>
        </div>
      )}

      {done && challenge?.status === 'accepted' && (
        <div className="mt-2 rounded-xl border border-ember-500/60 bg-ember-500/[0.12] px-3 py-3">
          <Chip tone="ember">Challenge accepted</Chip>
          <p className="font-display text-lg uppercase tracking-wide text-ember-200 mt-1.5 leading-tight">
            {challenge.headline}
          </p>
          {(finisher.technique?.steps ?? []).length > 0 && (
            <ol className="mt-2 space-y-1.5">
              {(finisher.technique?.steps ?? []).map((step: string, i: number) => (
                <li key={i} className="text-sm text-parchment flex gap-2">
                  <span className="shrink-0 text-smoke tabular">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {!readOnly && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                variant="primary"
                onClick={() =>
                  store.setChallenge(sessionId, entry.id, {
                    ...challenge,
                    status: 'completed',
                    at: Date.now(),
                  })
                }
              >
                Done
              </Button>
              <Button
                onClick={() =>
                  store.setChallenge(sessionId, entry.id, {
                    ...challenge,
                    status: 'abandoned',
                    at: Date.now(),
                  })
                }
              >
                Couldn’t finish
              </Button>
            </div>
          )}
        </div>
      )}
      {done && !finisher.technique && finisher.blockedBy && finisher.blockedBy !== 'sets_incomplete' && (
        // Saying why NOT is the same promise as saying why. A silent absence
        // teaches people the feature is broken.
        <p className="text-[11px] text-smoke mt-2.5 leading-relaxed">
          No finisher today: {BLOCK_EXPLANATION[finisher.blockedBy]}
        </p>
      )}

      {/* Logged sets ------------------------------------------------------- */}
      {entry.sets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {entry.sets.map((set, i) => (
            <li
              key={set.id}
              className={cx(
                'flex items-center gap-2 rounded-lg px-3 py-2 border',
                set.warmup ? 'border-slate/50 bg-coal/40' : 'border-slate bg-coal/80',
              )}
            >
              <span
                className={cx(
                  'shrink-0 grid place-items-center size-6 rounded text-[11px] font-bold',
                  set.warmup ? 'bg-slate text-smoke' : 'bg-ember-500/20 text-ember-300',
                )}
              >
                {set.warmup ? 'W' : entry.sets.slice(0, i + 1).filter((s) => !s.warmup).length}
              </span>
              <span className="flex-1 text-sm tabular text-parchment">
                {formatWeight(set.weightKg, units)} × {set.reps}
                {set.rir !== null && <span className="text-smoke"> @ {set.rir} RIR</span>}
              </span>
              {!readOnly && (
                <>
                  <IconButton label={`Edit set ${i + 1}`} onClick={() => setEditing(set)} className="size-9 min-h-9 min-w-9">
                    <span aria-hidden className="text-sm">
                      ✎
                    </span>
                  </IconButton>
                  <IconButton
                    label={`Delete set ${i + 1}`}
                    onClick={() => store.deleteSet(sessionId, entry.id, set.id)}
                    className="size-9 min-h-9 min-w-9"
                  >
                    <span aria-hidden className="text-sm">
                      🗑
                    </span>
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Entry form -------------------------------------------------------- */}
      {!readOnly && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="block text-[11px] uppercase tracking-wider text-smoke mb-1">
                {weightLabel(loading, units)}
              </p>
              <NumberStepper
                label={weightLabel(loading, units)}
                value={draftWeight}
                min={0}
                max={2000}
                step={units === 'kg' ? entry.incrementKg : Number((entry.incrementKg * 2.2046).toFixed(1))}
                decimals={1}
                onChange={setDraftWeight}
              />
            </div>
            <div>
              <p className="block text-[11px] uppercase tracking-wider text-smoke mb-1">Reps</p>
              <NumberStepper label="Reps" value={draftReps} min={1} max={100} onChange={setDraftReps} />
            </div>
          </div>

          {/* What that number actually means, and how to load it -------------- */}
          {loading === 'barbell' && platePlan ? (
            <button
              type="button"
              onClick={() => setPlateOpen(true)}
              className="w-full touch-target flex items-center gap-2 rounded-lg border border-slate bg-coal px-3 py-2 text-left"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-parchment truncate">{describePlan(platePlan, units)}</span>
                {!platePlan.exact && !platePlan.belowBar && (
                  <span className="block text-[11px] text-caution truncate">
                    Not loadable — nearest is {platePlan.total} {units}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-ember-400 shrink-0">Plates ›</span>
            </button>
          ) : (
            hint && <p className="text-[11px] text-smoke -mt-1">{hint}</p>
          )}
          {loading === 'barbell' && exercise?.unilateral && (
            <p className="text-[11px] text-smoke -mt-1">One side at a time — log each side as its own set</p>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="block text-[11px] uppercase tracking-wider text-smoke">
                Reps in reserve {draftRir === null && '(not reported)'}
              </p>
              <button
                type="button"
                onClick={() => setDraftRir((v) => (v === null ? entry.targetRIR : null))}
                className="text-[11px] text-ember-400 underline underline-offset-2 touch-target px-1"
              >
                {draftRir === null ? 'Report effort' : 'Skip'}
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={draftRir === value}
                  onClick={() => setDraftRir(value)}
                  className={cx(
                    'touch-target rounded-lg border text-sm font-semibold transition-colors',
                    draftRir === value
                      ? 'border-ember-500 bg-ember-500/20 text-ember-200'
                      : 'border-slate bg-coal text-ash',
                  )}
                >
                  {value === 5 ? '5+' : value}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-smoke mt-1">
              0 = could not do another rep. {RULES.progression.rirWindow.min}–{RULES.progression.rirWindow.max} is the
              target window for working sets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={warmup}
              onClick={() => setWarmup((v) => !v)}
              className={cx(
                'touch-target rounded-lg border px-3 text-sm transition-colors',
                warmup ? 'border-cool bg-cool/15 text-cool' : 'border-slate bg-coal text-ash',
              )}
            >
              Warm-up set
            </button>
            <Button size="sm" onClick={copyPrevious} disabled={!previous && entry.sets.length === 0}>
              Copy last
            </Button>
            <Button variant="primary" size="sm" className="flex-1" onClick={log}>
              Log set
            </Button>
          </div>
        </div>
      )}

      {/* Per-exercise feedback --------------------------------------------- */}
      {!readOnly && (
        <div className="mt-4 pt-3 border-t border-slate/70 space-y-3">
          <Slider
            label="Pain during this movement (0–10)"
            value={entry.pain}
            min={0}
            max={10}
            tone={entry.pain >= RULES.progression.painBlockThreshold ? 'caution' : 'ember'}
            labels={['None', 'Severe']}
            onChange={(v) => store.updateEntry(sessionId, entry.id, { pain: v })}
          />
          {entry.pain >= RULES.progression.painStopThreshold && (
            <Alert tone="danger" title="Stop this movement">
              Pain at {entry.pain}/10 is your signal to stop this exercise today. FORGED will not prescribe more load
              here. If it is sharp, radiating, or lingers after training, see a physiotherapist or physician.
            </Alert>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-smoke mb-1.5">Technique</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { value: 'clean', label: 'Clean' },
                  { value: 'minor', label: 'Minor slip' },
                  { value: 'breakdown', label: 'Broke down' },
                ] as { value: TechniqueRating; label: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={entry.technique === option.value}
                  onClick={() => store.updateEntry(sessionId, entry.id, { technique: option.value })}
                  className={cx(
                    'touch-target rounded-lg border text-sm transition-colors',
                    entry.technique === option.value
                      ? 'border-ember-500 bg-ember-500/15 text-ember-200'
                      : 'border-slate bg-coal text-ash',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" full onClick={onSubstitute}>
              Substitute
            </Button>
            <Button
              size="sm"
              full
              variant="ghost"
              onClick={() => store.removeEntryFromSession(sessionId, entry.id)}
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* Edit a logged set -------------------------------------------------- */}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Edit set">
        {editing && (
          <EditSetForm
            set={editing}
            units={units}
            increment={entry.incrementKg}
            loading={loading}
            onSave={(patch) => {
              store.updateSet(sessionId, entry.id, editing.id, patch)
              setEditing(null)
            }}
          />
        )}
      </Sheet>

      <Sheet open={plateOpen} onClose={() => setPlateOpen(false)} title="What is on the bar?">
        <PlateCalculator
          barDisplay={barDisplay}
          plates={plates}
          units={units}
          initial={platePlan?.perSide ?? []}
          onUse={(total) => {
            setDraftWeight(total)
            setPlateOpen(false)
          }}
        />
      </Sheet>
    </Card>
  )
}

/**
 * Tap plates, get a total.
 *
 * The whole point is that nobody should be adding 45 + 45 + 25 + 10 in their
 * head mid-set. Opens pre-filled with whatever the current target needs, so the
 * common case is "yes, that" and one tap.
 */
function PlateCalculator({
  barDisplay,
  plates,
  units,
  initial,
  onUse,
}: {
  barDisplay: number
  plates: number[]
  units: Units
  initial: PlateGroup[]
  onUse: (total: number) => void
}) {
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(initial.map((g) => [g.plate, g.count])),
  )
  const perSide: PlateGroup[] = plates
    .map((plate) => ({ plate, count: counts[plate] ?? 0 }))
    .filter((g) => g.count > 0)
  const total = totalFromPlates(perSide, barDisplay)
  const perSideWeight = Number(((total - barDisplay) / 2).toFixed(2))

  const bump = (plate: number, delta: number) =>
    setCounts((prev) => ({ ...prev, [plate]: Math.max(0, Math.min(10, (prev[plate] ?? 0) + delta)) }))

  return (
    <div className="space-y-4">
      <div className="forge-panel-raised px-4 py-3 text-center">
        <p className="text-[11px] uppercase tracking-wider text-smoke">Total on the bar</p>
        <p className="font-display text-5xl text-ember-400 tabular leading-none mt-1">
          {total}
          <span className="text-xl text-ash"> {units}</span>
        </p>
        <p className="text-xs text-ash mt-1.5 tabular">
          {barDisplay} {units} bar + {perSideWeight} {units} per side
        </p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-smoke mb-2">Plates per side</p>
        <ul className="space-y-2">
          {plates.map((plate) => {
            const count = counts[plate] ?? 0
            return (
              <li key={plate} className="flex items-center gap-2">
                <span
                  className={cx(
                    'flex-1 min-w-0 text-sm tabular',
                    count > 0 ? 'text-parchment font-semibold' : 'text-smoke',
                  )}
                >
                  {plate} {units}
                </span>
                <IconButton label={`One less ${plate} ${units} plate`} onClick={() => bump(plate, -1)} disabled={count === 0}>
                  <span aria-hidden className="text-xl">−</span>
                </IconButton>
                <span className="w-8 text-center font-display text-lg tabular" aria-live="polite">
                  {count}
                </span>
                <IconButton label={`One more ${plate} ${units} plate`} onClick={() => bump(plate, 1)}>
                  <span aria-hidden className="text-xl">+</span>
                </IconButton>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setCounts({})}>
          Clear
        </Button>
        <Button variant="primary" className="flex-[2]" onClick={() => onUse(total)}>
          Use {total} {units}
        </Button>
      </div>
      <p className="text-[11px] text-smoke leading-relaxed">
        Bar weight and the plates your gym stocks are both editable in Profile → Settings.
      </p>
    </div>
  )
}

function EditSetForm({
  set,
  units,
  increment,
  loading,
  onSave,
}: {
  set: LoggedSet
  units: Units
  increment: number
  loading: LoadingStyle
  onSave: (patch: Partial<LoggedSet>) => void
}) {
  const [weight, setWeight] = useState(Number(toDisplay(set.weightKg, units).toFixed(1)))
  const [reps, setReps] = useState(set.reps)
  const [rir, setRir] = useState<number | null>(set.rir)
  const [warmup, setWarmup] = useState(set.warmup)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="block text-[11px] uppercase tracking-wider text-smoke mb-1">
            {weightLabel(loading, units)}
          </p>
          <NumberStepper
            label={weightLabel(loading, units)}
            value={weight}
            min={0}
            max={2000}
            decimals={1}
            step={units === 'kg' ? increment : Number((increment * 2.2046).toFixed(1))}
            onChange={setWeight}
          />
        </div>
        <div>
          <p className="block text-[11px] uppercase tracking-wider text-smoke mb-1">Reps</p>
          <NumberStepper label="Reps" value={reps} min={0} max={100} onChange={setReps} />
        </div>
      </div>
      <div>
        <p className="block text-[11px] uppercase tracking-wider text-smoke mb-1.5">Reps in reserve</p>
        <div className="grid grid-cols-7 gap-1">
          {[null, 0, 1, 2, 3, 4, 5].map((value, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={rir === value}
              onClick={() => setRir(value)}
              className={cx(
                'touch-target rounded-lg border text-sm transition-colors',
                rir === value ? 'border-ember-500 bg-ember-500/20 text-ember-200' : 'border-slate bg-coal text-ash',
              )}
            >
              {value === null ? '—' : value}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-pressed={warmup}
        onClick={() => setWarmup((v) => !v)}
        className={cx(
          'touch-target w-full rounded-lg border text-sm transition-colors',
          warmup ? 'border-cool bg-cool/15 text-cool' : 'border-slate bg-coal text-ash',
        )}
      >
        {warmup ? 'Warm-up set' : 'Working set'}
      </button>
      <Button
        variant="primary"
        full
        onClick={() => onSave({ weightKg: fromDisplay(weight, units), reps, rir, warmup })}
      >
        Save changes
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exercise picker
// ---------------------------------------------------------------------------

export function ExercisePicker({
  open,
  onClose,
  onPick,
  title,
  note,
  suggestions = [],
}: {
  open: boolean
  onClose: () => void
  onPick: (exerciseId: string) => void
  title: string
  note?: string
  suggestions?: string[]
}) {
  const { data } = useStore()
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => searchExercises(data.exercises, query).slice(0, 60),
    [data.exercises, query],
  )

  const suggested = suggestions.map((id) => data.exercises.find((e) => e.id === id)).filter(Boolean)

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {note && <p className="text-xs text-ash mb-3 leading-relaxed">{note}</p>}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
        className="w-full h-12 rounded-xl bg-coal border border-slate px-3.5 text-parchment placeholder:text-smoke mb-3"
      />
      {suggested.length > 0 && !query && (
        <>
          <p className="text-[11px] uppercase tracking-wider text-smoke mb-1.5">Suggested swaps</p>
          <ul className="space-y-1.5 mb-4">
            {suggested.map((exercise) => (
              <li key={exercise!.id}>
                <button
                  type="button"
                  onClick={() => onPick(exercise!.id)}
                  className="w-full text-left touch-target rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-2.5"
                >
                  <span className="text-sm text-parchment">{exercise!.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <ul className="space-y-1.5">
        {results.map(({ exercise, matchedAlias }) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onPick(exercise.id)}
              className="w-full text-left touch-target rounded-lg border border-slate bg-coal px-3 py-2.5 hover:border-edge"
            >
              <span className="block text-sm text-parchment">{exercise.name}</span>
              <span className="block text-[11px] text-smoke">
                {matchedAlias
                  ? `also called “${matchedAlias}”`
                  : Object.keys(exercise.contributions).slice(0, 3).join(', ').replace(/_/g, ' ')}
              </span>
            </button>
          </li>
        ))}
        {!results.length && <li className="text-sm text-ash text-center py-6">No exercises match “{query}”.</li>}
      </ul>
    </Sheet>
  )
}

/** Exposed so the summary screen can reuse today's date logic in tests. */
export const sessionDateForNow = toIsoDate
