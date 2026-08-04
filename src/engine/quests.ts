import { ACHIEVEMENTS, QUESTS, type AchievementDef, type QuestDef } from '@/data/quests'
import { calculateProteinTarget, proteinForDate } from '@/engine/protein'
import { computeConsistency } from '@/engine/consistency'
import { personalRecords } from '@/engine/stats'
import { compareBenchmark } from '@/engine/running'
import type { AppData, IsoDate } from '@/types'
import { isoDateOf, lastNDays, startOfWeek, toIsoDate, weekKey } from '@/lib/date'

/**
 * Quest and achievement evaluation.
 *
 * Progress is *derived* from training data every render rather than incremented
 * by side effects. That means a quest can never drift out of sync with reality,
 * and deleting a mistaken workout correctly un-earns its progress.
 */

export interface QuestProgress {
  def: QuestDef
  periodKey: string
  progress: number
  target: number
  complete: boolean
  claimed: boolean
}

function periodKeyFor(def: QuestDef, today: IsoDate): string {
  return def.period === 'daily' ? today : startOfWeek(today)
}

function datesForPeriod(def: QuestDef, today: IsoDate): IsoDate[] {
  if (def.period === 'daily') return [today]
  const start = startOfWeek(today)
  return lastNDays(7, today).filter((d) => d >= start)
}

export function evaluateQuests(data: AppData, today: IsoDate = toIsoDate()): QuestProgress[] {
  const proteinTarget = data.profile ? calculateProteinTarget(data.profile).targetG : 0
  const consistency = data.profile
    ? computeConsistency({
        sessions: data.sessions,
        runs: data.runs,
        checkins: data.checkins,
        deloads: data.deloads,
        program: data.programs.find((p) => p.id === data.activeProgramId) ?? null,
        daysPerWeek: data.profile.daysPerWeek,
        today,
        sinceDate: isoDateOf(data.profile.onboardedAt ?? data.profile.createdAt),
      })
    : null

  return QUESTS.map((def) => {
    const dates = datesForPeriod(def, today)
    const dateSet = new Set(dates)
    let progress = 0

    switch (def.metric) {
      case 'workouts_completed':
        progress = data.sessions.filter((s) => s.status === 'completed' && dateSet.has(s.date)).length
        break
      case 'runs_completed':
        progress = data.runs.filter((r) => dateSet.has(r.date)).length
        break
      case 'protein_days_hit':
        progress = dates.filter(
          (d) => proteinTarget > 0 && proteinForDate(data.proteinEntries, d) >= proteinTarget * 0.9,
        ).length
        break
      case 'checkins_logged':
        progress = data.checkins.filter((c) => dateSet.has(c.date)).length
        break
      case 'sets_logged_with_rir':
        progress = data.sessions
          .filter((s) => dateSet.has(s.date))
          .flatMap((s) => s.entries.flatMap((e) => e.sets))
          .filter((s) => !s.warmup && s.rir !== null).length
        break
      case 'recovery_days':
        progress = (consistency?.days ?? []).filter((d) => dateSet.has(d.date) && (d.status === 'rest' || d.status === 'deload')).length
        break
      case 'active_days':
        progress = (consistency?.days ?? []).filter(
          (d) => dateSet.has(d.date) && d.status !== 'missed' && d.status !== 'untracked',
        ).length
        break
    }

    const periodKey = periodKeyFor(def, today)
    const state = data.game.quests.find((q) => q.id === def.id && q.periodKey === periodKey)
    return {
      def,
      periodKey,
      progress: Math.min(progress, def.target),
      target: def.target,
      complete: progress >= def.target,
      claimed: Boolean(state?.claimedAt),
    }
  })
}

export interface AchievementProgress {
  def: AchievementDef
  unlocked: boolean
  unlockedAt: number | null
  /** 0–1 for the ones with an obvious numeric path. */
  progress: number
  detail: string
}

export function evaluateAchievements(data: AppData, today: IsoDate = toIsoDate()): AchievementProgress[] {
  const completedSessions = data.sessions.filter((s) => s.status === 'completed').length
  const totalRunKm = data.runs.reduce((sum, r) => sum + r.distanceKm, 0)
  const ratedSets = data.sessions
    .flatMap((s) => s.entries.flatMap((e) => e.sets))
    .filter((s) => !s.warmup && s.rir !== null).length
  const proteinTarget = data.profile ? calculateProteinTarget(data.profile).targetG : 0
  const weekDates = lastNDays(7, today)
  const proteinDays = weekDates.filter(
    (d) => proteinTarget > 0 && proteinForDate(data.proteinEntries, d) >= proteinTarget * 0.9,
  ).length
  const prs = personalRecords(data.sessions)
  const deloadsDone = data.deloads.filter((d) => d.status === 'completed').length
  const benchmark = compareBenchmark(data.runs)
  const consistency = data.profile
    ? computeConsistency({
        sessions: data.sessions,
        runs: data.runs,
        checkins: data.checkins,
        deloads: data.deloads,
        program: data.programs.find((p) => p.id === data.activeProgramId) ?? null,
        daysPerWeek: data.profile.daysPerWeek,
        today,
        sinceDate: isoDateOf(data.profile.onboardedAt ?? data.profile.createdAt),
      })
    : null
  const level = data.game.xp

  const metric: Record<string, { value: number; goal: number; detail: string }> = {
    'first-session': { value: completedSessions, goal: 1, detail: `${completedSessions} sessions completed` },
    'ten-sessions': { value: completedSessions, goal: 10, detail: `${completedSessions}/10 sessions` },
    'thirty-sessions': { value: completedSessions, goal: 30, detail: `${completedSessions}/30 sessions` },
    'four-week-consistency': {
      value: consistency && consistency.score >= 0.8 && consistency.expected >= 8 ? 1 : 0,
      goal: 1,
      detail: consistency ? `Consistency ${Math.round(consistency.score * 100)}% over ${consistency.expected} planned days` : 'No data yet',
    },
    'first-run': { value: data.runs.length, goal: 1, detail: `${data.runs.length} runs logged` },
    'fifty-km': { value: totalRunKm, goal: 50, detail: `${totalRunKm.toFixed(1)}/50 km` },
    'protein-week': { value: proteinDays, goal: 5, detail: `${proteinDays}/5 days this week` },
    'first-deload': { value: deloadsDone, goal: 1, detail: `${deloadsDone} deloads completed` },
    'first-pr': { value: prs.length ? 1 : 0, goal: 1, detail: prs.length ? `${prs.length} lifts with records` : 'No records yet' },
    'benchmark-improved': {
      value: benchmark?.improved ? 1 : 0,
      goal: 1,
      detail: benchmark?.detail ?? 'No benchmark run logged',
    },
    'level-ten': { value: level, goal: 3600, detail: 'Reach level 10' },
    'honest-logger': { value: ratedSets, goal: 100, detail: `${ratedSets}/100 sets with RIR` },
  }

  return ACHIEVEMENTS.map((def) => {
    const state = data.game.achievements.find((a) => a.id === def.id)
    const m = metric[def.id] ?? { value: 0, goal: 1, detail: '' }
    return {
      def,
      unlocked: Boolean(state) || m.value >= m.goal,
      unlockedAt: state?.unlockedAt ?? null,
      progress: Math.min(1, m.goal > 0 ? m.value / m.goal : 0),
      detail: m.detail,
    }
  })
}

/** Achievements that are earned but not yet recorded — the store grants these. */
export function newlyUnlockedAchievements(data: AppData, today: IsoDate = toIsoDate()): AchievementDef[] {
  const recorded = new Set(data.game.achievements.map((a) => a.id))
  return evaluateAchievements(data, today)
    .filter((a) => a.unlocked && !recorded.has(a.def.id))
    .map((a) => a.def)
}

export function currentQuestPeriodKey(period: 'daily' | 'weekly', today: IsoDate = toIsoDate()): string {
  return period === 'daily' ? today : weekKey(today)
}
