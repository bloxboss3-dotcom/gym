/**
 * FORGED domain model.
 *
 * Every persisted record lives here. Two rules keep the local-first storage
 * layer swappable for Supabase later (see docs in README → Architecture):
 *  1. Records are plain JSON-serialisable objects with a stable string `id`.
 *  2. All weights are stored in KILOGRAMS. Pounds exist only at the UI edge.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ISO date, day precision: `YYYY-MM-DD`. Local calendar day, not UTC. */
export type IsoDate = string
/** Milliseconds since epoch. */
export type Millis = number

export type Units = 'kg' | 'lb'

export type Experience = 'beginner' | 'intermediate' | 'advanced'

export type Goal = 'hypertrophy' | 'strength' | 'recomp' | 'fatloss' | 'general'

export type EnduranceGoal = 'none' | 'conditioning' | 'run5k' | 'improve5k' | 'longer'

export type Priority = 'muscle' | 'balanced' | 'endurance'

export type Diet =
  | 'omnivore'
  | 'pescatarian'
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'dairy_free'

export type Archetype = 'ironclad' | 'emberblade' | 'stormrunner' | 'ashwarden' | 'duskstalker'

export type EquipmentKey =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'pullup_bar'
  | 'bench'
  | 'rack'
  | 'kettlebell'
  | 'bands'
  | 'ez_bar'
  | 'smith'
  | 'dip_station'
  | 'treadmill'

export type MuscleKey =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'lats'
  | 'upper_back'
  | 'traps'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'lower_back'
  | 'adductors'

export type MovementPattern =
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'isolation'
  | 'core'

export type TechniqueRating = 'clean' | 'minor' | 'breakdown'

// ---------------------------------------------------------------------------
// Profile & settings
// ---------------------------------------------------------------------------

export interface Profile {
  name: string
  age: number
  heightCm: number
  bodyWeightKg: number
  units: Units
  experience: Experience
  daysPerWeek: number
  sessionMinutes: number
  equipment: EquipmentKey[]
  goal: Goal
  enduranceGoal: EnduranceGoal
  priority: Priority
  weeklyRunKm: number
  diet: Diet
  /** Grams per day. Overrides the calculated baseline when set. */
  proteinOverrideG?: number | null
  /** Free-text limitations the user typed, plus any picked chips. */
  limitations: string[]
  archetype: Archetype
  createdAt: Millis
  onboardedAt: Millis | null
}

export interface Settings {
  /** Smallest usable jump per side/plate stack, in kg. */
  incrementKg: number
  /** Barbell/dumbbell rounding granularity in kg — 2.5 for most gyms. */
  roundingKg: number
  restDefaultSec: number
  mealsPerDay: number
  finalMealTime: string
  avoidFoods: string[]
  reducedMotion: boolean
  soundEnabled: boolean
  hapticsEnabled: boolean
  /** Set when the demo dataset is loaded so the UI can offer a clean reset. */
  demoMode: boolean
}

// ---------------------------------------------------------------------------
// Exercise library & programs
// ---------------------------------------------------------------------------

export interface Exercise {
  id: string
  name: string
  /** Fractional hard-set credit per muscle. 1 = direct, 0.5 = meaningful assist. */
  contributions: Partial<Record<MuscleKey, number>>
  equipment: EquipmentKey[]
  pattern: MovementPattern
  /** Loaded per-side / per-hand (dumbbells, unilateral machines). */
  unilateral: boolean
  /** Movements where the smallest useful jump is bigger (lower body compounds). */
  lowerBody: boolean
  /** Default smallest load step for this movement, kg. */
  incrementKg: number
  cue: string
  custom?: boolean
  /** Suggested drop-in replacements, by exercise id. */
  alternatives?: string[]
}

export interface ProgramSlot {
  id: string
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  restSec: number
  /** Target reps-in-reserve for working sets. */
  targetRIR: number
  /** Optional per-slot override of the load step. */
  incrementKg?: number | null
  note?: string
}

export interface ProgramDay {
  id: string
  name: string
  /** 0 = Sunday … 6 = Saturday. Null means "any day this week". */
  weekday: number | null
  slots: ProgramSlot[]
}

export interface Program {
  id: string
  name: string
  description: string
  days: ProgramDay[]
  createdAt: Millis
  generated: boolean
}

// ---------------------------------------------------------------------------
// Training sessions
// ---------------------------------------------------------------------------

export interface LoggedSet {
  id: string
  weightKg: number
  reps: number
  /** Reps in reserve. Null = not reported. */
  rir: number | null
  warmup: boolean
  completedAt: Millis
}

export interface SessionEntry {
  id: string
  exerciseId: string
  /** Set when the user swapped this out for something else mid-session. */
  substitutedFromId?: string | null
  plannedSets: number
  repMin: number
  repMax: number
  targetRIR: number
  restSec: number
  incrementKg: number
  sets: LoggedSet[]
  /** 0–10. Reported once per exercise. */
  pain: number
  technique: TechniqueRating
  note?: string
}

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface Session {
  id: string
  date: IsoDate
  programId: string | null
  programDayId: string | null
  title: string
  status: SessionStatus
  entries: SessionEntry[]
  note?: string
  startedAt: Millis
  endedAt: Millis | null
  /** Snapshot of awarded XP/coins so replays can't double-pay. */
  rewardId?: string | null
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

export type RunType = 'easy' | 'long' | 'intervals' | 'threshold' | 'recovery' | 'benchmark' | 'walk_run'

export type RunSurface = 'road' | 'trail' | 'track' | 'treadmill' | 'mixed'

export interface RunLog {
  id: string
  date: IsoDate
  type: RunType
  distanceKm: number
  durationSec: number
  avgHr?: number | null
  /** Session RPE, 1–10. */
  rpe: number
  pain: number
  surface: RunSurface
  note?: string
  planned: boolean
  createdAt: Millis
  rewardId?: string | null
}

// ---------------------------------------------------------------------------
// Recovery, body, nutrition
// ---------------------------------------------------------------------------

export interface Checkin {
  id: string
  date: IsoDate
  /** 1–5 scales; higher is better for sleep/readiness, worse for soreness. */
  sleepHours: number
  sleepQuality: number
  soreness: number
  readiness: number
  stress: number
  jointPain: number
  note?: string
  createdAt: Millis
}

export interface BodyWeightEntry {
  id: string
  date: IsoDate
  weightKg: number
}

export interface Measurement {
  id: string
  date: IsoDate
  /** Centimetres. */
  values: Partial<Record<'waist' | 'chest' | 'arm' | 'thigh' | 'hips' | 'calf', number>>
  note?: string
}

export interface ProgressPhoto {
  id: string
  date: IsoDate
  /** Down-scaled data URL kept in IndexedDB. Never leaves the device. */
  dataUrl: string
  note?: string
}

export interface FoodItem {
  id: string
  name: string
  proteinG: number
  /** Per-serving label, e.g. "150 g cooked". */
  serving: string
  tags: Diet[]
  budgetFriendly: boolean
  custom?: boolean
}

export interface ProteinEntry {
  id: string
  date: IsoDate
  label: string
  grams: number
  foodId?: string | null
  createdAt: Millis
}

export interface Meal {
  id: string
  name: string
  items: { label: string; grams: number }[]
  custom?: boolean
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type Slot =
  | 'face'
  | 'head'
  | 'body'
  | 'hands'
  | 'feet'
  | 'weapon'
  | 'back'
  | 'aura'
  | 'companion'
  | 'title'
  | 'pose'

export interface CosmeticItem {
  id: string
  name: string
  slot: Slot
  rarity: Rarity
  /** Art variant key consumed by the SVG character renderer. */
  art: string
  /** Primary + accent colours for the modular SVG. */
  palette: { base: string; accent: string; glow?: string }
  lore: string
}

export interface OwnedItem {
  itemId: string
  acquiredAt: Millis
  /** Extra copies rolled after the first, converted to coins. */
  duplicates: number
  new: boolean
}

export type PackKind = 'recruit' | 'warband' | 'ember' | 'relic'

export interface PackInstance {
  id: string
  kind: PackKind
  acquiredAt: Millis
  openedAt: Millis | null
  /** Item ids revealed when opened. */
  results: string[]
}

export type RewardReason =
  | 'workout_completed'
  | 'run_completed'
  | 'protein_target'
  | 'checkin'
  | 'rir_logged'
  | 'recovery_day'
  | 'deload_completed'
  | 'weekly_consistency'
  | 'benchmark_improved'
  | 'quest_completed'
  | 'level_up'
  | 'duplicate_refund'

export interface RewardLedgerEntry {
  id: string
  date: IsoDate
  reason: RewardReason
  xp: number
  coins: number
  /** Id of the source record (session, run, quest…) — prevents double payouts. */
  sourceId: string
  detail: string
  createdAt: Millis
}

export interface QuestState {
  id: string
  progress: number
  /** ISO date of the period this quest instance belongs to. */
  periodKey: string
  claimedAt: Millis | null
}

export interface AchievementState {
  id: string
  unlockedAt: Millis
}

export interface GameState {
  xp: number
  coins: number
  owned: OwnedItem[]
  equipped: Partial<Record<Slot, string | null>>
  packs: PackInstance[]
  quests: QuestState[]
  achievements: AchievementState[]
  ledger: RewardLedgerEntry[]
  /** Consistency, not a fragile streak — see engine/consistency.ts. */
  streakDays: number
  bestStreakDays: number
  streakShields: number
  lastActiveDate: IsoDate | null
}

// ---------------------------------------------------------------------------
// Planning / deloads
// ---------------------------------------------------------------------------

export interface DeloadRecord {
  id: string
  startDate: IsoDate
  endDate: IsoDate | null
  reason: string
  /** Accepted by the user, or auto-suggested and dismissed. */
  status: 'suggested' | 'accepted' | 'declined' | 'completed'
  createdAt: Millis
}

/** Overrides the program's weekday map when a session gets pushed. */
export interface ScheduleOverride {
  date: IsoDate
  programDayId: string | null
  kind: 'workout' | 'run' | 'rest'
  note?: string
}

// ---------------------------------------------------------------------------
// Root persisted state
// ---------------------------------------------------------------------------

export interface AppData {
  schemaVersion: number
  profile: Profile | null
  settings: Settings
  exercises: Exercise[]
  programs: Program[]
  activeProgramId: string | null
  sessions: Session[]
  runs: RunLog[]
  checkins: Checkin[]
  bodyWeights: BodyWeightEntry[]
  measurements: Measurement[]
  photos: ProgressPhoto[]
  foods: FoodItem[]
  proteinEntries: ProteinEntry[]
  meals: Meal[]
  game: GameState
  deloads: DeloadRecord[]
  scheduleOverrides: ScheduleOverride[]
}

export interface BackupFile {
  format: 'forged-backup'
  version: number
  exportedAt: string
  data: AppData
}
