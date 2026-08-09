import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { Warrior } from '@/character/Warrior'
import { ConsistencyStrip } from '@/components/charts'
import {
  Alert,
  Button,
  Card,
  Chip,
  ProgressBar,
  SectionHeading,
  Stat,
  cx,
} from '@/components/ui'
import { ECONOMY, levelFromXp, buildFromXp } from '@/config/economy'
import { ITEM_BY_ID } from '@/data/items'
import { computeConsistency } from '@/engine/consistency'
import { assessDeload } from '@/engine/deload'
import { calculateMacroTargets, remainingKcal, totalsForDate } from '@/engine/nutrition'
import { calculateProteinTarget, proteinForDate, proteinRemaining } from '@/engine/protein'
import { evaluateQuests } from '@/engine/quests'
import { recommendRunning } from '@/engine/running'
import { resolveToday, weekAhead } from '@/engine/schedule'
import { unopenedPacks } from '@/engine/packs'
import { formatDateLabel, formatDuration, isoDateOf, toIsoDate, weekdayName } from '@/lib/date'
import { useStore } from '@/state/store'

/**
 * Today.
 *
 * Answers five questions above the fold: what should I do, why, how long, what
 * does it build, and what is there to earn. Everything below that is optional.
 */
export default function Today() {
  const { data, startSession } = useStore()
  const navigate = useNavigate()
  const today = toIsoDate()
  const [showWhy, setShowWhy] = useState(false)

  const profile = data.profile!
  const program = data.programs.find((p) => p.id === data.activeProgramId) ?? data.programs[0] ?? null

  const running = useMemo(
    () =>
      recommendRunning({
        runs: data.runs,
        sessions: data.sessions,
        experience: profile.experience,
        priority: profile.priority,
        enduranceGoal: profile.enduranceGoal,
        baselineWeeklyKm: profile.weeklyRunKm,
        today,
      }),
    [data.runs, data.sessions, profile, today],
  )

  const plan = useMemo(
    () => resolveToday({ data, today, plannedRuns: running.sessions }),
    [data, today, running.sessions],
  )

  const consistency = useMemo(
    () =>
      computeConsistency({
        sessions: data.sessions,
        runs: data.runs,
        checkins: data.checkins,
        deloads: data.deloads,
        program,
        daysPerWeek: profile.daysPerWeek,
        today,
        sinceDate: isoDateOf(profile.onboardedAt ?? profile.createdAt),
      }),
    [data, program, profile.daysPerWeek, profile.onboardedAt, profile.createdAt, today],
  )

  const deload = useMemo(
    () => assessDeload({ sessions: data.sessions, checkins: data.checkins, deloads: data.deloads, today }),
    [data.sessions, data.checkins, data.deloads, today],
  )

  const proteinTarget = useMemo(() => calculateProteinTarget(profile), [profile])
  const proteinToday = proteinForDate(data.proteinEntries, today)
  const fullNutrition = data.settings.nutritionMode !== 'protein'
  const macroPlan = useMemo(() => calculateMacroTargets(profile), [profile])
  const nutritionToday = useMemo(
    () => totalsForDate(data.proteinEntries, today),
    [data.proteinEntries, today],
  )
  const quests = useMemo(() => evaluateQuests(data, today), [data, today])
  const activeQuest = quests.find((q) => q.complete && !q.claimed) ?? quests.find((q) => !q.complete) ?? quests[0]
  const checkinToday = data.checkins.find((c) => c.date === today)
  const packs = unopenedPacks(data.game)
  const level = levelFromXp(data.game.xp)
  const title = data.game.equipped.title ? ITEM_BY_ID[data.game.equipped.title] : undefined
  const ahead = useMemo(() => weekAhead(data, today), [data, today])

  const start = () => {
    if (plan.kind === 'resume' && plan.activeSessionId) {
      navigate(`/train/session/${plan.activeSessionId}`)
      return
    }
    if (plan.kind === 'workout' || plan.kind === 'deload_workout') {
      const id = startSession(plan.programDay, {
        deload: plan.kind === 'deload_workout',
        title: plan.title,
      })
      navigate(`/train/session/${id}`)
      return
    }
    if (plan.kind === 'run') {
      navigate('/train/run')
      return
    }
    if (plan.kind === 'setup') {
      navigate('/train')
      return
    }
    navigate('/progress/checkin')
  }

  const startLabel =
    plan.kind === 'resume'
      ? 'Resume session'
      : plan.kind === 'run'
        ? 'Log this run'
        : plan.kind === 'rest'
          ? 'Log recovery check-in'
          : plan.kind === 'setup'
            ? 'Build my plan'
            : 'Start session'

  return (
    <Screen
      title={greeting(profile.name)}
      subtitle={`${formatDateLabel(today)} · ${weekdayName(new Date().getDay())}`}
      action={
        <Link
          to="/forge"
          className="shrink-0 flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-xs text-gold-300 touch-target"
        >
          <span aria-hidden>◈</span>
          <span className="tabular">{data.game.coins}</span>
        </Link>
      }
    >
      <div className="space-y-4">
        {/* ---------------------------------------------------------------- */}
        {/* Primary action                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Card raised className="relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ember-400">
                {plan.kind === 'rest' ? 'Prescribed recovery' : plan.kind === 'run' ? 'Today’s run' : 'Today’s session'}
              </p>
              <h2 className="font-display text-3xl uppercase leading-none mt-1 text-balance">{plan.title}</h2>
              <p className="text-sm text-ash mt-1">{plan.subtitle}</p>
            </div>
            <Chip tone="ember" className="shrink-0">
              ~{plan.estimatedMinutes} min
            </Chip>
          </div>

          {plan.rescheduledFrom && (
            <p className="mt-2 text-xs text-caution">
              Moved from {formatDateLabel(plan.rescheduledFrom, today)} — nothing was stacked on top of another day.
            </p>
          )}

          <div className="mt-3 rounded-lg bg-coal/70 border border-slate/70 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              className="w-full flex items-center justify-between gap-2 text-left touch-target"
            >
              <span className="text-[11px] uppercase tracking-wider text-smoke">Why this, today?</span>
              <span aria-hidden className={cx('text-ash transition-transform', showWhy && 'rotate-180')}>
                ▾
              </span>
            </button>
            <p className={cx('text-sm text-parchment/90 leading-relaxed', !showWhy && 'line-clamp-2')}>{plan.why}</p>
            {showWhy && <p className="text-xs text-ember-200 mt-2 leading-relaxed">{plan.progressNote}</p>}
          </div>

          <Button variant="primary" size="lg" full className="mt-3" onClick={start}>
            {startLabel}
          </Button>

          {plan.kind !== 'rest' && plan.kind !== 'setup' && (
            <p className="text-center text-[11px] text-smoke mt-2">
              Earns up to {ECONOMY.rewards.workout_completed.xp} XP and {ECONOMY.rewards.workout_completed.coins} coins
              {plan.kind === 'run' ? ' for a completed run' : ' for a completed session'}
            </p>
          )}
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Deload prompt                                                     */}
        {/* ---------------------------------------------------------------- */}
        {deload.suggested && (
          <Alert tone="warn" title="Deload worth considering">
            <p className="leading-relaxed">{deload.reason}</p>
            <Link
              to="/progress"
              className="mt-2 inline-flex text-sm font-medium text-caution underline underline-offset-2 touch-target items-center"
            >
              Review the signals →
            </Link>
          </Alert>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Readiness + protein                                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/progress/checkin" className="block">
            <Card className="h-full">
              <p className="text-[11px] uppercase tracking-wider text-smoke">Readiness</p>
              {checkinToday ? (
                <>
                  <p className="font-display text-3xl text-ember-400 mt-0.5 tabular">{checkinToday.readiness}/5</p>
                  <p className="text-xs text-ash mt-0.5">
                    Sleep {checkinToday.sleepHours}h · soreness {checkinToday.soreness}/5
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl text-ash mt-0.5">Not logged</p>
                  <p className="text-xs text-ember-400 mt-0.5">Takes 15 seconds →</p>
                </>
              )}
            </Card>
          </Link>

          <Link to="/nutrition" className="block">
            <Card className="h-full">
              <p className="text-[11px] uppercase tracking-wider text-smoke">
                {fullNutrition ? 'Calories left' : 'Protein'}
              </p>
              {fullNutrition ? (
                <>
                  <p className="font-display text-3xl text-ember-400 mt-0.5 tabular">
                    {Math.max(0, remainingKcal(macroPlan.targets.kcal, nutritionToday.kcal))}
                    <span className="text-base text-ash">kcal</span>
                  </p>
                  <ProgressBar
                    value={nutritionToday.kcal}
                    max={macroPlan.targets.kcal}
                    ariaLabel="Calories eaten today"
                    className="mt-2"
                  />
                  <p className="text-xs text-ash mt-1 tabular">
                    {Math.round(nutritionToday.proteinG)}/{macroPlan.targets.proteinG} g protein
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-3xl text-ember-400 mt-0.5 tabular">
                    {Math.round(proteinToday)}
                    <span className="text-base text-ash">/{proteinTarget.targetG}g</span>
                  </p>
                  <ProgressBar
                    value={proteinToday}
                    max={proteinTarget.targetG}
                    ariaLabel="Protein eaten today"
                    className="mt-2"
                  />
                  <p className="text-xs text-ash mt-1">
                    {proteinRemaining(proteinTarget.targetG, proteinToday)} g to go
                  </p>
                </>
              )}
            </Card>
          </Link>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Character + rewards                                               */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <div className="flex gap-4">
            <Link to="/forge/character" className="shrink-0" aria-label="Customise your warrior">
              <Warrior equipped={data.game.equipped} build={buildFromXp(data.game.xp)} className="w-24 h-auto" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl uppercase tracking-wide leading-none">{profile.name}</p>
              {title && <p className="text-xs text-gold-300 mt-0.5">{title.name}</p>}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-ash mb-1">
                  <span>Level {level.level}</span>
                  <span className="tabular">
                    {level.intoLevel}/{level.neededForNext} XP
                  </span>
                </div>
                <ProgressBar value={level.progress} max={1} tone="gold" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <Chip tone="ember">{consistency.streakDays}-day streak</Chip>
                <Chip tone="gold">{Math.round(consistency.score * 100)}% consistency</Chip>
                {packs.length > 0 && <Chip tone="cool">{packs.length} unopened pack{packs.length === 1 ? '' : 's'}</Chip>}
              </div>
            </div>
          </div>
          {consistency.shieldsUsed > 0 && (
            <p className="text-xs text-cool mt-3 leading-relaxed">🛡 {consistency.message}</p>
          )}
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Quest                                                             */}
        {/* ---------------------------------------------------------------- */}
        {activeQuest && (
          <Link to="/forge/quests" className="block">
            <Card className={cx(activeQuest.complete && !activeQuest.claimed && 'border-gold-500/50')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-smoke">
                    {activeQuest.def.period === 'daily' ? 'Daily quest' : 'Weekly quest'}
                  </p>
                  <p className="font-medium text-parchment mt-0.5">{activeQuest.def.title}</p>
                  <p className="text-xs text-ash mt-0.5 leading-snug">{activeQuest.def.description}</p>
                </div>
                {activeQuest.complete && !activeQuest.claimed ? (
                  <Chip tone="gold">Claim →</Chip>
                ) : (
                  <Chip tone="neutral" className="tabular">
                    {activeQuest.progress}/{activeQuest.target}
                  </Chip>
                )}
              </div>
              <ProgressBar
                value={activeQuest.progress}
                max={activeQuest.target}
                tone={activeQuest.complete ? 'gold' : 'ember'}
                className="mt-2.5"
              />
            </Card>
          </Link>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Week ahead + consistency                                          */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <SectionHeading title="The week ahead" hint="Missed days are rescheduled, not punished." />
          <Card>
            <ul className="grid grid-cols-7 gap-1">
              {ahead.map((day) => (
                <li key={day.date} className="text-center">
                  <p className="text-[10px] text-smoke uppercase">{weekdayName(new Date(`${day.date}T00:00:00`).getDay(), true).slice(0, 2)}</p>
                  <div
                    className={cx(
                      'mt-1 h-9 rounded-md grid place-items-center text-[10px] leading-none px-0.5',
                      day.done
                        ? 'bg-ember-500/25 text-ember-200 border border-ember-500/50'
                        : day.kind === 'workout'
                          ? 'bg-steel text-ash border border-slate'
                          : 'bg-coal text-smoke border border-slate/50',
                    )}
                  >
                    <span className="truncate w-full">{day.done ? '✓' : day.kind === 'workout' ? day.label.split(' ')[0] : '—'}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-smoke mb-1.5">Last 28 days</p>
              <ConsistencyStrip days={consistency.days} />
              <p className="text-xs text-ash mt-2 leading-relaxed">{consistency.message}</p>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Running                                                           */}
        {/* ---------------------------------------------------------------- */}
        {profile.enduranceGoal !== 'none' && (
          <div>
            <SectionHeading
              title="Running"
              action={
                <Link to="/train/run" className="text-sm text-ember-400 touch-target flex items-center">
                  Log a run
                </Link>
              }
            />
            <Card>
              <p className="font-display text-lg uppercase tracking-wide">{running.headline}</p>
              <p className="text-sm text-ash mt-1.5 leading-relaxed">{running.reason}</p>
              {running.schedulingNote && (
                <p className="text-xs text-cool mt-2 leading-relaxed">{running.schedulingNote}</p>
              )}
              <ul className="mt-3 space-y-1.5">
                {running.sessions.map((session, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0 rounded bg-steel px-1.5 py-0.5 text-[10px] uppercase text-ash">
                      {session.type.replace('_', '/')}
                    </span>
                    <span className="text-ash leading-snug">
                      {session.distanceKm ? `${session.distanceKm} km — ` : session.durationMin ? `${session.durationMin} min — ` : ''}
                      {session.description}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Recent activity                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <SectionHeading title="Recent" />
          <RecentActivity />
        </div>
      </div>
    </Screen>
  )
}

function RecentActivity() {
  const { data } = useStore()
  const items = useMemo(() => {
    const sessions = data.sessions
      .filter((s) => s.status === 'completed')
      .map((s) => ({
        id: s.id,
        date: s.date,
        label: s.title,
        detail: `${s.entries.reduce((n, e) => n + e.sets.filter((x) => !x.warmup).length, 0)} working sets`,
        href: `/train/summary/${s.id}`,
        icon: '⚒',
      }))
    const runs = data.runs.map((r) => ({
      id: r.id,
      date: r.date,
      label: `${r.type.replace('_', '/')} run`,
      detail: `${r.distanceKm.toFixed(2)} km · ${formatDuration(r.durationSec)}`,
      href: '/train/run',
      icon: '🏃',
    }))
    return [...sessions, ...runs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  }, [data.sessions, data.runs])

  if (!items.length) {
    return (
      <Card>
        <p className="text-sm text-ash text-center py-2">
          Nothing logged yet. Your first completed session unlocks the recommendation engine.
        </p>
      </Card>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={item.href}
            className="forge-panel flex items-center gap-3 px-3.5 py-3 touch-target hover:border-edge transition-colors"
          >
            <span aria-hidden className="text-lg">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-parchment truncate">{item.label}</span>
              <span className="block text-xs text-smoke">{item.detail}</span>
            </span>
            <span className="text-xs text-smoke shrink-0">{formatDateLabel(item.date)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function greeting(name: string): string {
  const hour = new Date().getHours()
  const part = hour < 5 ? 'Late night' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  return `${part}, ${name.split(' ')[0]}`
}

/** Used by Progress to reuse the same stat treatment. */
export { Stat }
