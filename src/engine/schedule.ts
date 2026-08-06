import type { AppData, IsoDate, ProgramDay } from '@/types'
import { addDays, isoDateOf, toIsoDate, weekdayOf } from '@/lib/date'
import { estimateSessionMinutes } from '@/engine/program'
import { activeDeload } from '@/engine/deload'
import { rescheduleMissed } from '@/engine/consistency'
import type { PlannedRun } from '@/engine/running'

/**
 * The adaptive "what should I do today" resolver.
 *
 * Order of precedence:
 *   1. An in-progress session — always resume rather than start something new.
 *   2. An explicit override the user set (moved a day, took a rest day).
 *   3. An accepted deload — the plan runs, just lighter.
 *   4. Today's program day.
 *   5. A session rescheduled from a missed day earlier this week.
 *   6. A planned run.
 *   7. Rest — which is a real, credited part of the plan, not a gap.
 */

export type TodayKind = 'resume' | 'workout' | 'deload_workout' | 'run' | 'rest' | 'setup'

export interface TodayPlan {
  date: IsoDate
  kind: TodayKind
  title: string
  subtitle: string
  /** Why this, today. */
  why: string
  estimatedMinutes: number
  programDay: ProgramDay | null
  run: PlannedRun | null
  activeSessionId: string | null
  /** What completing it does for the user's training. */
  progressNote: string
  rescheduledFrom: IsoDate | null
}

export interface TodayInput {
  data: AppData
  today?: IsoDate
  plannedRuns?: PlannedRun[]
}

export function resolveToday(input: TodayInput): TodayPlan {
  const today = input.today ?? toIsoDate()
  const { data } = input
  const program = data.programs.find((p) => p.id === data.activeProgramId) ?? data.programs[0] ?? null

  const active = data.sessions.find((s) => s.status === 'active')
  if (active) {
    return {
      date: today,
      kind: 'resume',
      title: active.title,
      subtitle: 'Session in progress',
      why: 'You have an unfinished session. Pick up exactly where you left off — every set you already logged is saved.',
      estimatedMinutes: 20,
      programDay: program?.days.find((d) => d.id === active.programDayId) ?? null,
      run: null,
      activeSessionId: active.id,
      progressNote: 'Finishing an interrupted session still counts in full.',
      rescheduledFrom: null,
    }
  }

  if (!program || !program.days.length) {
    return {
      date: today,
      kind: 'setup',
      title: 'Build your plan',
      subtitle: 'No program yet',
      why: 'FORGED needs a program before it can tell you what to train. Generate one from your profile or build a custom routine — it takes about a minute.',
      estimatedMinutes: 2,
      programDay: null,
      run: null,
      activeSessionId: null,
      progressNote: 'A plan turns training into something FORGED can progress for you.',
      rescheduledFrom: null,
    }
  }

  const override = data.scheduleOverrides.find((o) => o.date === today)
  if (override?.kind === 'rest') {
    return restPlan(today, override.note ?? 'You marked today as a rest day.')
  }

  const deload = activeDeload(data.deloads, today)
  const weekday = weekdayOf(today)
  let programDay =
    (override?.programDayId ? program.days.find((d) => d.id === override.programDayId) : null) ??
    program.days.find((d) => d.weekday === weekday) ??
    null
  let rescheduledFrom: IsoDate | null = null

  if (!programDay) {
    const moved = rescheduleMissed({
      sessions: data.sessions,
      runs: data.runs,
      checkins: data.checkins,
      deloads: data.deloads,
      program,
      daysPerWeek: data.profile?.daysPerWeek ?? program.days.length,
      today,
      sinceDate: isoDateOf(data.profile?.onboardedAt ?? data.profile?.createdAt),
    }).find((r) => r.newDate === today)
    if (moved) {
      programDay = program.days.find((d) => d.id === moved.programDayId) ?? null
      rescheduledFrom = moved.originalDate
    }
  }

  if (programDay) {
    const minutes = estimateSessionMinutes(programDay)
    const sets = programDay.slots.reduce((n, s) => n + s.sets, 0)
    if (deload) {
      return {
        date: today,
        kind: 'deload_workout',
        title: `${programDay.name} — deload`,
        subtitle: 'Lighter on purpose',
        why: 'You are in a planned deload. Same movements, roughly 60% of the usual load, fewer sets, and every set stopped well short of failure. This counts as a completed session — backing off on purpose is training, not time off.',
        estimatedMinutes: Math.round(minutes * 0.6),
        programDay,
        run: null,
        activeSessionId: null,
        progressNote: 'Finishing the deload clears accumulated fatigue so the next block actually moves.',
        rescheduledFrom,
      }
    }
    return {
      date: today,
      kind: 'workout',
      title: programDay.name,
      subtitle: `${programDay.slots.length} movements · ${sets} working sets`,
      why: rescheduledFrom
        ? `This is the session you missed on ${rescheduledFrom}, moved to today rather than stacked on top of another day.`
        : `${programDay.name} is scheduled for today in your plan. FORGED has a specific target for every movement based on what you did last time.`,
      estimatedMinutes: minutes,
      programDay,
      run: null,
      activeSessionId: null,
      progressNote: `${sets} hard sets toward this week's volume, and a fresh recommendation for every lift you log.`,
      rescheduledFrom,
    }
  }

  const plannedRun = input.plannedRuns?.[0] ?? null
  if (plannedRun && (data.profile?.enduranceGoal ?? 'none') !== 'none') {
    return {
      date: today,
      kind: 'run',
      title: runTitle(plannedRun),
      subtitle: plannedRun.distanceKm ? `${plannedRun.distanceKm} km` : `${plannedRun.durationMin} min`,
      why: 'No lifting scheduled today, which makes it the cheapest possible day to run — endurance work sits furthest from your hard lower-body sessions here.',
      estimatedMinutes: plannedRun.durationMin ?? Math.round((plannedRun.distanceKm ?? 5) * 6.5),
      programDay: null,
      run: plannedRun,
      activeSessionId: null,
      progressNote: 'Adds to this week’s running volume without competing with a lifting session.',
      rescheduledFrom: null,
    }
  }

  return restPlan(today, null)
}

function restPlan(today: IsoDate, note: string | null): TodayPlan {
  return {
    date: today,
    kind: 'rest',
    title: 'Recovery day',
    subtitle: 'Prescribed, not skipped',
    why:
      note ??
      'Nothing is scheduled today. Adaptation happens between sessions, not during them — a recovery day is part of the plan and counts toward your consistency exactly like a training day.',
    estimatedMinutes: 5,
    programDay: null,
    run: null,
    activeSessionId: null,
    progressNote: 'Log a check-in and hit your protein target to bank the day.',
    rescheduledFrom: null,
  }
}

function runTitle(run: PlannedRun): string {
  switch (run.type) {
    case 'long':
      return 'Long easy run'
    case 'intervals':
      return 'Interval session'
    case 'threshold':
      return 'Threshold run'
    case 'recovery':
      return 'Recovery jog'
    case 'benchmark':
      return 'Benchmark 5K'
    case 'walk_run':
      return 'Walk/run session'
    default:
      return 'Easy run'
  }
}

/** The next few days, for the small "week ahead" strip on Today. */
export function weekAhead(data: AppData, today: IsoDate = toIsoDate(), days = 7) {
  const program = data.programs.find((p) => p.id === data.activeProgramId) ?? data.programs[0] ?? null
  const out: { date: IsoDate; label: string; kind: 'workout' | 'rest'; done: boolean }[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    const day = program?.days.find((d) => d.weekday === weekdayOf(date)) ?? null
    const done = data.sessions.some((s) => s.date === date && s.status === 'completed')
    out.push({
      date,
      label: day?.name ?? 'Rest',
      kind: day ? 'workout' : 'rest',
      done,
    })
  }
  return out
}
