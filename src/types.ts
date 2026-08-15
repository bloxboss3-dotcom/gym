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

/**
 * Used by two calculations and nothing else: the sex constant in the
 * Mifflin-St Jeor equation, and which published strength ladder a percentile
 * is read against. Optional, and `unspecified` averages the two — the
 * estimates simply carry a wider stated uncertainty.
 */
export type Sex = 'male' | 'female' | 'unspecified'

/** Non-exercise activity. Training is added on top, so this is daily life only. */
export type ActivityLevel = 'desk' | 'light' | 'active' | 'physical'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FoodCategory =
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'eggs'
  | 'plant_protein'
  | 'carbs'
  | 'fruit_veg'
  | 'fats'
  | 'drinks'
  | 'meals'
  | 'treats'
  | 'supplements'

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

/**
 * How an exercise is loaded — which decides what the number you type MEANS.
 *
 * This was the single most confusing thing in the app: a 30 kg entry on a
 * barbell bench and a 30 kg entry on dumbbell bench are not the same amount of
 * iron, and nothing on screen said so. Every stored `weightKg` is now defined
 * as "the number written on the implement", and this field is what lets the UI
 * label it and the volume maths interpret it.
 *
 *  - `barbell`          total on the bar, INCLUDING the bar itself
 *  - `dumbbell_pair`    the number on ONE dumbbell; you are holding two
 *  - `dumbbell_single`  the number on the one implement you are holding
 *  - `stack`            the pin setting on a machine or cable stack
 *  - `bodyweight`       added load only; 0 means bodyweight alone
 *  - `other`            bands, sleds, anything that does not fit
 */
export type LoadingStyle =
  | 'barbell'
  | 'dumbbell_pair'
  | 'dumbbell_single'
  | 'stack'
  | 'bodyweight'
  | 'other'

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
  /**
   * Used for two pieces of arithmetic and nothing else: the sex constant in
   * the Mifflin-St Jeor BMR equation, and which published strength ladder the
   * percentile is read against. Optional — `unspecified` averages both and
   * widens the stated uncertainty.
   *
   * Explicitly NOT what the character is drawn as. That is `GameState.figure`,
   * which this only seeds a first guess for.
   */
  sex?: Sex
  /** Non-exercise daily activity. Training is added separately. */
  dailyActivity?: ActivityLevel
  /** Grams per day. Overrides the calculated baseline when set. */
  proteinOverrideG?: number | null
  /** kcal per day. Overrides the calculated energy target when set. */
  calorieOverrideKcal?: number | null
  /** Free-text limitations the user typed, plus any picked chips. */
  limitations: string[]
  archetype: Archetype
  createdAt: Millis
  onboardedAt: Millis | null
}

export interface Settings {
  /** Smallest usable jump per side/plate stack, in kg. */
  incrementKg: number
  /** Weight of the standard barbell in your gym, kg. 20 kg / 45 lb is typical. */
  barbellKg?: number
  /**
   * Plates you actually have, per side, in kg. Stored in kg like every other
   * weight; the settings screen shows them in your display unit.
   */
  plateInventoryKg?: number[]
  /** Barbell/dumbbell rounding granularity in kg — 2.5 for most gyms. */
  roundingKg: number
  restDefaultSec: number
  /**
   * `full` counts calories and all three macros. `protein` hides energy and
   * carb/fat entirely and tracks protein only — the right setting for anyone
   * who should not be counting calories.
   */
  nutritionMode?: 'full' | 'protein'
  mealsPerDay: number
  finalMealTime: string
  avoidFoods: string[]
  /**
   * Interface language. Absent means English, which is what every account
   * created before this existed will read as.
   */
  language?: 'en' | 'es'
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
  /** What the logged weight refers to. See `LoadingStyle`. */
  loading: LoadingStyle
  /**
   * Weight of the bar itself, kg, for `barbell` movements that do not use a
   * standard bar (EZ bar, trap bar, Smith). Falls back to `settings.barbellKg`.
   */
  barKg?: number
  /**
   * Trained ONE SIDE AT A TIME, so each side is its own set — a single-arm
   * cable lateral raise, a one-arm row, a Bulgarian split squat.
   *
   * Not the same as being loaded per hand: a dumbbell bench press holds two
   * dumbbells but presses both at once, so it is `dumbbell_pair` and NOT
   * unilateral. `loading` describes the implement; this describes the set.
   */
  unilateral: boolean
  /** Movements where the smallest useful jump is bigger (lower body compounds). */
  lowerBody: boolean
  /** Default smallest load step for this movement, kg. */
  incrementKg: number
  cue: string
  custom?: boolean
  /** Suggested drop-in replacements, by exercise id. */
  alternatives?: string[]
  /**
   * Other names people search for. The overhead press is the barbell shoulder
   * press to most of the world, and a search that finds nothing reads as "this
   * app does not have my exercise".
   */
  aliases?: string[]
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
  /*
    The description again, as a template plus its numbers.

    Optional because a program the user wrote themselves has a description
    they typed, which is already in their language and has nothing to
    interpolate. Only the generated ones carry a template.
  */
  descriptionTemplate?: string
  descriptionVars?: Record<string, string | number>
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
  /**
   * The intensity finisher offered on this movement, and what became of it.
   *
   * Recorded rather than merely displayed: it is what stops a movement being
   * asked twice, it is what the reward ledger keys off, and it is the only
   * durable record that the extra sets under it were a finisher rather than
   * ordinary work.
   */
  challenge?: SessionChallenge
}

export type ChallengeStatus = 'offered' | 'declined' | 'accepted' | 'completed' | 'abandoned'

export interface SessionChallenge {
  /** Matches `TechniqueKind` in the intensity engine. */
  kind: string
  /** What was actually asked for, frozen at offer time so it stays auditable. */
  headline: string
  status: ChallengeStatus
  /** When the status last changed. */
  at: Millis
  /**
   * True when the app worked out that this was done by reading the sets that
   * were logged, rather than being told.
   *
   * Kept separate from `status` so the record stays honest about where the
   * claim came from: "you dropped the weight and kept going, so this is done"
   * is a different statement from "you pressed Done", and if the detector is
   * ever wrong it should be possible to see which ones it decided.
   */
  detected?: boolean
}

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface Session {
  id: string
  date: IsoDate
  programId: string | null
  programDayId: string | null
  /**
   * What the session is called. Set from the program day when it starts, then
   * replaced on completion with what was actually trained — "Chest & Triceps"
   * rather than "Upper A", because the second one stops being true the moment
   * a movement is swapped.
   */
  title: string
  /** The name it started with, kept so the plan it came from is not lost. */
  plannedTitle?: string
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

/**
 * A food, stated per serving.
 *
 * Energy and carb/fat are optional so that backups written before FORGED
 * tracked calories still load; anything missing reads as unknown rather than
 * as zero in the UI.
 */
export interface FoodItem {
  id: string
  name: string
  proteinG: number
  kcal?: number
  carbsG?: number
  fatG?: number
  /** Per-serving label, e.g. "150 g cooked". */
  serving: string
  /** Weight of one serving in grams, when the serving is a weight. */
  servingGrams?: number
  category?: FoodCategory
  tags: Diet[]
  budgetFriendly: boolean
  custom?: boolean
}

/**
 * One logged food. Named for protein because that is what FORGED started with
 * and what every backup on disk calls it; it now carries full macros.
 */
export interface ProteinEntry {
  id: string
  date: IsoDate
  label: string
  grams: number
  kcal?: number
  carbsG?: number
  fatG?: number
  /** Serving multiplier applied when logging, kept so an entry can be edited. */
  servings?: number
  meal?: MealSlot
  foodId?: string | null
  createdAt: Millis
}

export interface MealItem {
  label: string
  grams: number
  kcal?: number
  carbsG?: number
  fatG?: number
  foodId?: string | null
}

export interface Meal {
  id: string
  name: string
  items: MealItem[]
  custom?: boolean
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

/**
 * Rarity tiers.
 *
 * `secret` is different in kind from the rest: a secret item is not listed
 * anywhere until it is pulled. The collection shows it as an unknown, so the
 * only way to learn one exists is to find it — which is the entire point, and
 * why it sits outside the ordinary drop weights.
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'secret'

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
  | 'puzzle_solved'
  /** A round of the Anvil, struck between sets. */
  | 'anvil_round'
  /** Took an intensity challenge and finished it. */
  | 'challenge_completed'
  /** Crossed a strength percentile band for the first time. */
  | 'percentile_band'
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
  /** Rest-timer chess puzzles already solved, so they are not shown again. */
  solvedPuzzleIds?: string[]
  /** Which figure the character is drawn as. Absent on old saves = masculine. */
  figure?: Figure
}

/**
 * Which figure the character is drawn as.
 *
 * Deliberately NOT derived from `Profile.sex`. That field exists for two
 * pieces of arithmetic — the Mifflin-St Jeor constant and which strength
 * ladder you are read against — and answering it does not tell anyone which
 * character they want to look at for the next year. Seeded from it at
 * onboarding because that is a decent first guess, then owned by the player.
 *
 * Free, changeable at any time, and never a drop. Nobody should have to pull
 * their own figure out of a crate.
 */
export type Figure = 'masculine' | 'feminine'

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
