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
  /*
    The same prose, as a template plus its numbers.

    `why` and the rest stay finished English so nothing that already reads
    them breaks; the template is what the UI translates. Splitting them is
    the only way a sentence with a number in it can be translated at all —
    "3 movements" cannot be a translation key, "{n} movements" can.
  */
  whyTemplate: string
  whyVars?: Record<string, string | number>
  subtitleTemplate: string
  subtitleVars?: Record<string, string | number>
  progressNoteTemplate: string
  progressNoteVars?: Record<string, string | number>
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
      subtitleTemplate: 'Session in progress',
      why: 'You have an unfinished session. Pick up exactly where you left off — every set you already logged is saved.',
      whyTemplate:
        'You have an unfinished session. Pick up exactly where you left off — every set you already logged is saved.',
      estimatedMinutes: 20,
      programDay: program?.days.find((d) => d.id === active.programDayId) ?? null,
      run: null,
      activeSessionId: active.id,
      progressNote: 'Finishing an interrupted session still counts in full.',
      progressNoteTemplate: 'Finishing an interrupted session still counts in full.',
      rescheduledFrom: null,
    }
  }

  if (!program || !program.days.length) {
    return {
      date: today,
      kind: 'setup',
      title: 'Build your plan',
      subtitle: 'No program yet',
      subtitleTemplate: 'No program yet',
      why: 'FORGED needs a program before it can tell you what to train. Generate one from your profile or build a custom routine — it takes about a minute.',
      whyTemplate:
        'FORGED needs a program before it can tell you what to train. Generate one from your profile or build a custom routine — it takes about a minute.',
      estimatedMinutes: 2,
      programDay: null,
      run: null,
      activeSessionId: null,
      progressNote: 'A plan turns training into something FORGED can progress for you.',
      progressNoteTemplate: 'A plan turns training into something FORGED can progress for you.',
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
        subtitleTemplate: 'Lighter on purpose',
        why: 'You are in a planned deload. Same movements, roughly 60% of the usual load, fewer sets, and every set stopped well short of failure. This counts as a completed session — backing off on purpose is training, not time off.',
        whyTemplate:
          'You are in a planned deload. Same movements, roughly 60% of the usual load, fewer sets, and every set stopped well short of failure. This counts as a completed session — backing off on purpose is training, not time off.',
        estimatedMinutes: Math.round(minutes * 0.6),
        programDay,
        run: null,
        activeSessionId: null,
        progressNote: 'Finishing the deload clears accumulated fatigue so the next block actually moves.',
        progressNoteTemplate: 'Finishing the deload clears accumulated fatigue so the next block actually moves.',
        rescheduledFrom,
      }
    }
    return {
      date: today,
      kind: 'workout',
      title: programDay.name,
      subtitle: `${programDay.slots.length} movements · ${sets} working sets`,
      subtitleTemplate: '{movements} movements · {sets} working sets',
      subtitleVars: { movements: programDay.slots.length, sets },
      why: rescheduledFrom
        ? `This is the session you missed on ${rescheduledFrom}, moved to today rather than stacked on top of another day.`
        : `${programDay.name} is scheduled for today in your plan. FORGED has a specific target for every movement based on what you did last time.`,
      whyTemplate: rescheduledFrom
        ? 'This is the session you missed on {date}, moved to today rather than stacked on top of another day.'
        : '{day} is scheduled for today in your plan. FORGED has a specific target for every movement based on what you did last time.',
      whyVars: rescheduledFrom ? { date: rescheduledFrom } : { day: programDay.name },
      estimatedMinutes: minutes,
      programDay,
      run: null,
      activeSessionId: null,
      progressNote: `${sets} hard sets toward this week's volume, and a fresh recommendation for every lift you log.`,
      progressNoteTemplate:
        "{sets} hard sets toward this week's volume, and a fresh recommendation for every lift you log.",
      progressNoteVars: { sets },
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
      subtitleTemplate: plannedRun.distanceKm ? '{km} km' : '{min} min',
      subtitleVars: plannedRun.distanceKm
        ? { km: plannedRun.distanceKm }
        : { min: plannedRun.durationMin ?? 0 },
      why: 'No lifting scheduled today, which makes it the cheapest possible day to run — endurance work sits furthest from your hard lower-body sessions here.',
      whyTemplate:
        'No lifting scheduled today, which makes it the cheapest possible day to run — endurance work sits furthest from your hard lower-body sessions here.',
      estimatedMinutes: plannedRun.durationMin ?? Math.round((plannedRun.distanceKm ?? 5) * 6.5),
      programDay: null,
      run: plannedRun,
      activeSessionId: null,
      progressNote: 'Adds to this week’s running volume without competing with a lifting session.',
      progressNoteTemplate: 'Adds to this week’s running volume without competing with a lifting session.',
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
    subtitleTemplate: 'Prescribed, not skipped',
    why:
      note ??
      'Nothing is scheduled today. Adaptation happens between sessions, not during them — a recovery day is part of the plan and counts toward your consistency exactly like a training day.',
    whyTemplate:
      note ??
      'Nothing is scheduled today. Adaptation happens between sessions, not during them — a recovery day is part of the plan and counts toward your consistency exactly like a training day.',
    estimatedMinutes: 5,
    programDay: null,
    run: null,
    activeSessionId: null,
    progressNote: 'Log a check-in and hit your protein target to bank the day.',
    progressNoteTemplate: 'Log a check-in and hit your protein target to bank the day.',
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
