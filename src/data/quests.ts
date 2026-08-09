import type { RewardReason } from '@/types'

/**
 * Quests and achievements.
 *
 * Quests are *behavioural*, never performance-gated: everything here is
 * something you fully control (showing up, logging honestly, hitting protein,
 * taking the prescribed rest day). Nothing rewards adding weight recklessly,
 * and nothing punishes a planned deload — a deload literally completes a quest.
 */

export type QuestPeriod = 'daily' | 'weekly'

export type QuestMetric =
  | 'workouts_completed'
  | 'runs_completed'
  | 'protein_days_hit'
  | 'checkins_logged'
  | 'sets_logged_with_rir'
  | 'recovery_days'
  | 'active_days'

export interface QuestDef {
  id: string
  title: string
  description: string
  period: QuestPeriod
  metric: QuestMetric
  target: number
  xp: number
  coins: number
  /** Optional pack awarded on completion. */
  pack?: 'recruit' | 'warband' | 'ember' | 'relic'
}

export const QUESTS: QuestDef[] = [
  {
    id: 'daily-checkin',
    title: 'Read the Forge',
    description: 'Log today’s readiness check-in.',
    period: 'daily',
    metric: 'checkins_logged',
    target: 1,
    xp: 20,
    coins: 10,
  },
  {
    id: 'daily-protein',
    title: 'Feed the Fire',
    description: 'Reach your daily protein target.',
    period: 'daily',
    metric: 'protein_days_hit',
    target: 1,
    xp: 30,
    coins: 15,
  },
  {
    id: 'daily-honest-effort',
    title: 'Honest Steel',
    description: 'Log reps in reserve on at least 6 working sets today.',
    period: 'daily',
    metric: 'sets_logged_with_rir',
    target: 6,
    xp: 35,
    coins: 15,
  },
  {
    id: 'weekly-sessions',
    title: 'Hold the Line',
    description: 'Complete 3 planned training sessions this week.',
    period: 'weekly',
    metric: 'workouts_completed',
    target: 3,
    xp: 160,
    coins: 90,
    pack: 'warband',
  },
  {
    id: 'weekly-miles',
    title: 'The Long Road',
    description: 'Complete 2 runs this week.',
    period: 'weekly',
    metric: 'runs_completed',
    target: 2,
    xp: 120,
    coins: 60,
    pack: 'recruit',
  },
  {
    id: 'weekly-protein',
    title: 'Provisioned',
    description: 'Hit your protein target on 5 days this week.',
    period: 'weekly',
    metric: 'protein_days_hit',
    target: 5,
    xp: 140,
    coins: 70,
    pack: 'recruit',
  },
  {
    id: 'weekly-recovery',
    title: 'Bank the Heat',
    description: 'Take your prescribed recovery day. Rest is training.',
    period: 'weekly',
    metric: 'recovery_days',
    target: 1,
    xp: 90,
    coins: 45,
  },
  {
    id: 'weekly-presence',
    title: 'Never Cold',
    description: 'Be active — lift, run, or recover on purpose — on 5 days.',
    period: 'weekly',
    metric: 'active_days',
    target: 5,
    xp: 180,
    coins: 100,
    pack: 'ember',
  },
]

export const QUEST_BY_ID: Record<string, QuestDef> = QUESTS.reduce(
  (acc, q) => {
    acc[q.id] = q
    return acc
  },
  {} as Record<string, QuestDef>,
)

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Icon key drawn by `components/AchievementBadge`. */
  icon: 'anvil' | 'flame' | 'shield' | 'road' | 'crown' | 'scale' | 'heart' | 'hammer'
  /** Item granted the first time it unlocks. */
  grantsItemId?: string
  coins: number
  xp: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-session',
    title: 'First Heat',
    description: 'Complete your first FORGED session.',
    icon: 'anvil',
    coins: 50,
    xp: 60,
    grantsItemId: 'title-steady',
  },
  {
    id: 'ten-sessions',
    title: 'Ten Sessions Deep',
    description: 'Complete 10 training sessions.',
    icon: 'hammer',
    coins: 120,
    xp: 150,
    grantsItemId: 'body-leather',
  },
  {
    id: 'thirty-sessions',
    title: 'Tempered',
    description: 'Complete 30 training sessions.',
    icon: 'shield',
    coins: 250,
    xp: 300,
    grantsItemId: 'title-unbroken',
  },
  {
    id: 'four-week-consistency',
    title: 'Unbroken Month',
    description: 'Keep a consistency score above 80% for four weeks.',
    icon: 'flame',
    coins: 300,
    xp: 400,
    grantsItemId: 'aura-embers',
  },
  {
    id: 'first-run',
    title: 'Boots On',
    description: 'Log your first run.',
    icon: 'road',
    coins: 40,
    xp: 50,
  },
  {
    id: 'fifty-km',
    title: 'Fifty Kilometres',
    description: 'Accumulate 50 km of running.',
    icon: 'road',
    coins: 200,
    xp: 250,
    grantsItemId: 'title-longstrider',
  },
  {
    id: 'protein-week',
    title: 'Well Provisioned',
    description: 'Hit your protein target 5 days in one week.',
    icon: 'scale',
    coins: 100,
    xp: 120,
  },
  {
    id: 'first-deload',
    title: 'Cooled Steel',
    description: 'Complete a deload week. Backing off on purpose is training.',
    icon: 'heart',
    coins: 200,
    xp: 260,
    grantsItemId: 'title-unyielding',
  },
  {
    id: 'first-pr',
    title: 'New Ceiling',
    description: 'Set a personal record on any lift.',
    icon: 'crown',
    coins: 120,
    xp: 150,
  },
  {
    id: 'benchmark-improved',
    title: 'Faster Than Before',
    description: 'Improve a running benchmark.',
    icon: 'road',
    coins: 180,
    xp: 220,
    grantsItemId: 'feet-runner',
  },
  {
    id: 'level-ten',
    title: 'Warband Rank',
    description: 'Reach level 10.',
    icon: 'crown',
    coins: 250,
    xp: 0,
    grantsItemId: 'back-banner',
  },
  {
    id: 'honest-logger',
    title: 'Honest Steel',
    description: 'Log reps in reserve on 100 working sets.',
    icon: 'scale',
    coins: 150,
    xp: 200,
    grantsItemId: 'hands-bracers',
  },
]

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = ACHIEVEMENTS.reduce(
  (acc, a) => {
    acc[a.id] = a
    return acc
  },
  {} as Record<string, AchievementDef>,
)

export const REWARD_REASON_LABEL: Record<RewardReason, string> = {
  workout_completed: 'Session completed',
  run_completed: 'Run completed',
  protein_target: 'Protein target hit',
  checkin: 'Readiness check-in',
  rir_logged: 'Honest effort logging',
  recovery_day: 'Recovery day taken',
  deload_completed: 'Deload completed',
  weekly_consistency: 'Weekly consistency',
  benchmark_improved: 'Benchmark improved',
  quest_completed: 'Quest completed',
  puzzle_solved: 'Rest-timer puzzle solved',
  level_up: 'Level up',
  duplicate_refund: 'Duplicate converted',
}
