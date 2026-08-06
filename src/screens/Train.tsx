import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { ExercisePicker } from '@/screens/SessionPlayer'
import {
  Alert,
  Button,
  Card,
  Chip,
  EmptyState,
  SectionHeading,
  Sheet,
  cx,
} from '@/components/ui'
import { activeDeload } from '@/engine/deload'
import { estimateSessionMinutes } from '@/engine/program'
import { resolveToday } from '@/engine/schedule'
import { formatDateLabel, toIsoDate, weekdayName } from '@/lib/date'
import { useStore } from '@/state/store'

/**
 * Train hub: start today's session, jump into any program day, log a run, or
 * browse the exercise library and your history.
 */
export default function Train() {
  const { data, startSession } = useStore()
  const navigate = useNavigate()
  const today = toIsoDate()
  const [pickDay, setPickDay] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  const program = data.programs.find((p) => p.id === data.activeProgramId) ?? data.programs[0] ?? null
  const plan = useMemo(() => resolveToday({ data, today }), [data, today])
  const deload = activeDeload(data.deloads, today)

  const recentSessions = useMemo(
    () =>
      [...data.sessions]
        .filter((s) => s.status !== 'active')
        .sort((a, b) => b.date.localeCompare(a.date) || (b.endedAt ?? 0) - (a.endedAt ?? 0))
        .slice(0, 8),
    [data.sessions],
  )

  const beginDay = (dayId: string | null) => {
    const day = program?.days.find((d) => d.id === dayId) ?? null
    const id = startSession(day, { deload: Boolean(deload), title: day?.name })
    navigate(`/train/session/${id}`)
  }

  return (
    <Screen title="Train" subtitle={program ? program.name : 'No program yet'}>
      <div className="space-y-4">
        {plan.kind === 'resume' && plan.activeSessionId && (
          <Card raised className="border-ember-500/50">
            <p className="text-[11px] uppercase tracking-wider text-ember-400">Unfinished session</p>
            <p className="font-display text-2xl uppercase mt-0.5">{plan.title}</p>
            <p className="text-sm text-ash mt-1">Everything you logged is saved. Pick up where you stopped.</p>
            <Button
              variant="primary"
              size="lg"
              full
              className="mt-3"
              onClick={() => navigate(`/train/session/${plan.activeSessionId}`)}
            >
              Resume
            </Button>
          </Card>
        )}

        {deload && (
          <Alert tone="info" title="Deload week in progress">
            Sessions start at roughly 60% load with fewer sets. Completing them counts exactly like a normal session
            — that is the point.
          </Alert>
        )}

        {!program ? (
          <EmptyState
            icon="⚒"
            title="No program yet"
            body="FORGED needs a plan before it can progress anything for you. Generate one from your profile, or build a custom routine."
            action={
              <Link to="/profile">
                <Button variant="primary">Generate from profile</Button>
              </Link>
            }
          />
        ) : (
          <>
            {plan.kind !== 'resume' && (
              <Card raised>
                <p className="text-[11px] uppercase tracking-wider text-ember-400">Today</p>
                <p className="font-display text-2xl uppercase mt-0.5">{plan.title}</p>
                <p className="text-sm text-ash mt-1">{plan.subtitle}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    variant="primary"
                    full
                    disabled={plan.kind === 'rest' && !program.days.length}
                    onClick={() =>
                      plan.programDay ? beginDay(plan.programDay.id) : setPickDay(true)
                    }
                  >
                    {plan.programDay ? 'Start' : 'Choose a day'}
                  </Button>
                  <Button full onClick={() => setPickDay(true)}>
                    Different day
                  </Button>
                </div>
              </Card>
            )}

            <div>
              <SectionHeading
                title={program.name}
                hint={program.description}
                action={
                  <Link
                    to={`/train/program/${program.id}`}
                    className="text-sm text-ember-400 touch-target flex items-center"
                  >
                    Edit
                  </Link>
                }
              />
              <ul className="space-y-2">
                {program.days.map((day) => {
                  const completedToday = data.sessions.some(
                    (s) => s.programDayId === day.id && s.date === today && s.status === 'completed',
                  )
                  return (
                    <li key={day.id}>
                      <button
                        type="button"
                        onClick={() => beginDay(day.id)}
                        className={cx(
                          'w-full text-left forge-panel px-3.5 py-3 touch-target flex items-center gap-3',
                          completedToday && 'border-vital/40',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-display text-lg uppercase tracking-wide">{day.name}</span>
                            {day.weekday !== null && (
                              <Chip tone="neutral">{weekdayName(day.weekday, true)}</Chip>
                            )}
                            {completedToday && <Chip tone="good">Done today</Chip>}
                          </span>
                          <span className="block text-xs text-smoke mt-0.5 truncate">
                            {day.slots
                              .map((slot) => data.exercises.find((e) => e.id === slot.exerciseId)?.name)
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          <span className="block text-[11px] text-smoke mt-1">
                            {day.slots.reduce((n, s) => n + s.sets, 0)} sets · ~{estimateSessionMinutes(day)} min
                          </span>
                        </span>
                        <span aria-hidden className="text-ember-400 text-lg shrink-0">
                          ▶
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button full onClick={() => beginDay(null)}>
            Freestyle session
          </Button>
          <Link to="/train/run" className="contents">
            <Button full>Log a run</Button>
          </Link>
        </div>

        <div>
          <SectionHeading
            title="Exercise library"
            hint={`${data.exercises.length} movements with transparent muscle mapping`}
            action={
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="text-sm text-ember-400 touch-target flex items-center"
              >
                Browse
              </button>
            }
          />
          <Card>
            <p className="text-sm text-ash leading-relaxed">
              Every exercise declares how much it contributes to each muscle. Those numbers are what the weekly
              volume dashboard adds up — nothing is hidden in a black box.
            </p>
            <Link
              to="/progress/volume"
              className="mt-2 inline-flex text-sm text-ember-400 font-medium touch-target items-center"
            >
              See weekly volume →
            </Link>
          </Card>
        </div>

        <div>
          <SectionHeading title="History" />
          {recentSessions.length ? (
            <ul className="space-y-2">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    to={`/train/summary/${session.id}`}
                    className="forge-panel flex items-center gap-3 px-3.5 py-3 touch-target"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-parchment truncate">{session.title}</span>
                      <span className="block text-xs text-smoke">
                        {session.entries.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0)} sets ·{' '}
                        {session.status}
                      </span>
                    </span>
                    <span className="text-xs text-smoke shrink-0">{formatDateLabel(session.date, today)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="◷"
              title="No sessions yet"
              body="Once you complete a session, it shows up here with its full set-by-set record."
            />
          )}
        </div>
      </div>

      <Sheet open={pickDay} onClose={() => setPickDay(false)} title="Start a session">
        <ul className="space-y-2">
          {(program?.days ?? []).map((day) => (
            <li key={day.id}>
              <button
                type="button"
                onClick={() => {
                  setPickDay(false)
                  beginDay(day.id)
                }}
                className="w-full text-left rounded-xl border border-slate bg-coal px-3.5 py-3 touch-target"
              >
                <span className="block font-medium text-parchment">{day.name}</span>
                <span className="block text-xs text-smoke mt-0.5">
                  {day.slots.length} movements · {day.slots.reduce((n, s) => n + s.sets, 0)} sets
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setPickDay(false)
                beginDay(null)
              }}
              className="w-full text-left rounded-xl border border-slate bg-coal px-3.5 py-3 touch-target"
            >
              <span className="block font-medium text-parchment">Freestyle</span>
              <span className="block text-xs text-smoke mt-0.5">Build the session as you go</span>
            </button>
          </li>
        </ul>
      </Sheet>

      <ExercisePicker
        open={libraryOpen}
        title="Exercise library"
        note="Tap any movement to see your full history, estimated 1RM trend and its muscle contributions."
        onClose={() => setLibraryOpen(false)}
        onPick={(id) => {
          setLibraryOpen(false)
          navigate(`/train/exercise/${id}`)
        }}
      />
    </Screen>
  )
}
