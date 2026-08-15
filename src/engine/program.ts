import { RULES } from '@/config/rules'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import type {
  EquipmentKey,
  Exercise,
  Experience,
  Goal,
  MovementPattern,
  Profile,
  Program,
  ProgramDay,
  ProgramSlot,
  Units,
} from '@/types'
import { nativeIncrementKg } from '@/engine/units'
import { newId } from '@/lib/id'

/**
 * Starter program generation.
 *
 * Deliberately conservative. A beginner gets a small number of hard sets on
 * compound patterns, not an advanced volume block — starting low leaves
 * somewhere to progress to, and progression is what actually drives adaptation.
 */

/** Limitation chips from onboarding → patterns and movements to avoid. */
export const LIMITATION_RULES: Record<
  string,
  { label: string; avoidPatterns: MovementPattern[]; avoidExercises: string[]; note: string }
> = {
  lower_back: {
    label: 'Lower back',
    avoidPatterns: [],
    avoidExercises: ['deadlift', 'barbell-row', 'back-extension', 'good-morning'],
    note: 'Swapped loaded spinal flexion/extension for supported alternatives.',
  },
  knee: {
    label: 'Knees',
    avoidPatterns: ['lunge'],
    avoidExercises: ['hack-squat', 'leg-extension', 'walking-lunge', 'bulgarian-split-squat'],
    note: 'Reduced deep-knee-flexion and heavily loaded knee-extension work.',
  },
  shoulder: {
    label: 'Shoulders',
    avoidPatterns: [],
    avoidExercises: ['overhead-press', 'dip', 'barbell-bench-press', 'lateral-raise'],
    note: 'Avoided overhead pressing and deep bar-bench positions.',
  },
  elbow: {
    label: 'Elbows',
    avoidPatterns: [],
    avoidExercises: ['barbell-curl', 'triceps-pushdown', 'close-grip-bench', 'dip'],
    note: 'Reduced direct elbow loading.',
  },
  wrist: {
    label: 'Wrists',
    avoidPatterns: [],
    avoidExercises: ['barbell-curl', 'front-squat', 'push-up'],
    note: 'Avoided positions that force wrist extension under load.',
  },
  hip: {
    label: 'Hips',
    avoidPatterns: [],
    avoidExercises: ['deadlift', 'bulgarian-split-squat', 'back-squat'],
    note: 'Reduced deep hip flexion under load.',
  },
  ankle: {
    label: 'Ankles',
    avoidPatterns: [],
    avoidExercises: ['walking-lunge', 'standing-calf-raise', 'front-squat'],
    note: 'Avoided high-demand ankle dorsiflexion positions.',
  },
  neck: {
    label: 'Neck',
    avoidPatterns: [],
    avoidExercises: ['shrug', 'back-squat', 'overhead-press'],
    note: 'Reduced axial loading through the neck and traps.',
  },
}

export function availableExercises(
  profile: Pick<Profile, 'equipment' | 'limitations'>,
  library: Exercise[] = EXERCISE_LIBRARY,
): Exercise[] {
  const equipment = new Set<EquipmentKey>(profile.equipment.length ? profile.equipment : ['bodyweight'])
  const blockedExercises = new Set<string>()
  const blockedPatterns = new Set<MovementPattern>()
  for (const limitation of profile.limitations) {
    const rule = LIMITATION_RULES[limitation]
    if (!rule) continue
    rule.avoidExercises.forEach((e) => blockedExercises.add(e))
    rule.avoidPatterns.forEach((p) => blockedPatterns.add(p))
  }
  return library.filter((e) => {
    if (blockedExercises.has(e.id)) return false
    if (blockedPatterns.has(e.pattern)) return false
    // Bodyweight movements are always available.
    if (e.equipment.includes('bodyweight') && e.equipment.every((k) => k === 'bodyweight')) return true
    return e.equipment.some((k) => equipment.has(k))
  })
}

type DayTemplate = { name: string; patterns: (MovementPattern | 'accessory_upper' | 'accessory_lower')[] }

function templatesFor(daysPerWeek: number, experience: Experience): DayTemplate[] {
  const fullBodyA: DayTemplate = {
    name: 'Full Body A',
    patterns: ['squat', 'horizontal_push', 'horizontal_pull', 'hinge', 'core'],
  }
  const fullBodyB: DayTemplate = {
    name: 'Full Body B',
    patterns: ['hinge', 'vertical_push', 'vertical_pull', 'lunge', 'core'],
  }
  const fullBodyC: DayTemplate = {
    name: 'Full Body C',
    patterns: ['squat', 'horizontal_push', 'vertical_pull', 'accessory_upper', 'core'],
  }
  const upper: DayTemplate = {
    name: 'Upper',
    patterns: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull', 'accessory_upper', 'accessory_upper'],
  }
  const lower: DayTemplate = {
    name: 'Lower',
    patterns: ['squat', 'hinge', 'lunge', 'accessory_lower', 'core'],
  }
  const push: DayTemplate = {
    name: 'Push',
    patterns: ['horizontal_push', 'vertical_push', 'horizontal_push', 'accessory_upper', 'accessory_upper'],
  }
  const pull: DayTemplate = {
    name: 'Pull',
    patterns: ['vertical_pull', 'horizontal_pull', 'horizontal_pull', 'accessory_upper', 'accessory_upper'],
  }
  const legs: DayTemplate = {
    name: 'Legs',
    patterns: ['squat', 'hinge', 'accessory_lower', 'accessory_lower', 'core'],
  }

  switch (Math.max(2, Math.min(6, daysPerWeek))) {
    case 2:
      return [fullBodyA, fullBodyB]
    case 3:
      return experience === 'beginner' ? [fullBodyA, fullBodyB, fullBodyC] : [push, pull, legs]
    case 4:
      return [
        { ...upper, name: 'Upper A' },
        { ...lower, name: 'Lower A' },
        { ...upper, name: 'Upper B' },
        { ...lower, name: 'Lower B' },
      ]
    case 5:
      return [upper, lower, push, pull, legs]
    default:
      return [
        { ...push, name: 'Push A' },
        { ...pull, name: 'Pull A' },
        { ...legs, name: 'Legs A' },
        { ...push, name: 'Push B' },
        { ...pull, name: 'Pull B' },
        { ...legs, name: 'Legs B' },
      ]
  }
}

/** Sunday=0. Spread training days as evenly as possible across the week. */
export function spreadWeekdays(daysPerWeek: number): number[] {
  const layouts: Record<number, number[]> = {
    1: [3],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  }
  return layouts[Math.max(1, Math.min(7, daysPerWeek))] ?? [1, 3, 5]
}

function setsFor(experience: Experience, isCompound: boolean): number {
  if (experience === 'beginner') return isCompound ? 3 : 2
  if (experience === 'intermediate') return 3
  return isCompound ? 4 : 3
}

function repRangeFor(goal: Goal, isCompound: boolean): { repMin: number; repMax: number; targetRIR: number } {
  switch (goal) {
    case 'strength':
      return isCompound
        ? { repMin: 4, repMax: 6, targetRIR: 2 }
        : { repMin: 6, repMax: 10, targetRIR: 2 }
    case 'hypertrophy':
      return isCompound
        ? { repMin: 6, repMax: 10, targetRIR: 2 }
        : { repMin: 10, repMax: 15, targetRIR: 1 }
    case 'recomp':
    case 'fatloss':
      return isCompound
        ? { repMin: 6, repMax: 12, targetRIR: 2 }
        : { repMin: 10, repMax: 15, targetRIR: 2 }
    default:
      return isCompound
        ? { repMin: 8, repMax: 12, targetRIR: 2 }
        : { repMin: 10, repMax: 15, targetRIR: 2 }
  }
}

function restFor(goal: Goal, isCompound: boolean): number {
  if (goal === 'strength') return isCompound ? 210 : 120
  return isCompound ? 150 : 90
}

const COMPOUND_PATTERNS = new Set<MovementPattern>([
  'squat',
  'hinge',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'lunge',
])

const UPPER_ACCESSORIES = [
  'lateral-raise',
  'face-pull',
  'dumbbell-curl',
  'triceps-pushdown',
  'hammer-curl',
  'overhead-triceps-extension',
  'cable-fly',
  'reverse-pec-deck',
]
const LOWER_ACCESSORIES = [
  'seated-leg-curl',
  'leg-extension',
  'standing-calf-raise',
  'hip-thrust',
  'lying-leg-curl',
  'seated-calf-raise',
]

/** How many exercises fit in the session length the user chose. */
export function exercisesPerSession(sessionMinutes: number): number {
  // ~10 minutes per exercise including warm-up and rest, plus a 6-minute
  // general warm-up. Clamped so nothing degenerates into a two-lift session.
  return Math.max(3, Math.min(7, Math.floor((sessionMinutes - 6) / 10)))
}

export function generateProgram(
  profile: Pick<
    Profile,
    'daysPerWeek' | 'experience' | 'goal' | 'sessionMinutes' | 'equipment' | 'limitations' | 'name'
  > & { units?: Units },
  library: Exercise[] = EXERCISE_LIBRARY,
): Program {
  const units: Units = profile.units ?? 'kg'
  const pool = availableExercises(profile, library)
  const templates = templatesFor(profile.daysPerWeek, profile.experience)
  const weekdays = spreadWeekdays(templates.length)
  const perSession = exercisesPerSession(profile.sessionMinutes)
  const usedInProgram = new Map<string, number>()

  const pickFor = (
    slot: MovementPattern | 'accessory_upper' | 'accessory_lower',
  ): Exercise | null => {
    let candidates: Exercise[]
    if (slot === 'accessory_upper') {
      candidates = pool.filter((e) => UPPER_ACCESSORIES.includes(e.id))
    } else if (slot === 'accessory_lower') {
      candidates = pool.filter((e) => LOWER_ACCESSORIES.includes(e.id))
    } else {
      candidates = pool.filter((e) => e.pattern === slot)
    }
    if (!candidates.length) return null
    // Prefer movements not yet used, then the least-used.
    candidates.sort((a, b) => (usedInProgram.get(a.id) ?? 0) - (usedInProgram.get(b.id) ?? 0))
    const chosen = candidates[0]
    usedInProgram.set(chosen.id, (usedInProgram.get(chosen.id) ?? 0) + 1)
    return chosen
  }

  const days: ProgramDay[] = templates.map((template, index) => {
    const slots: ProgramSlot[] = []
    const chosenIds = new Set<string>()
    for (const pattern of template.patterns) {
      if (slots.length >= perSession) break
      const exercise = pickFor(pattern)
      if (!exercise || chosenIds.has(exercise.id)) continue
      chosenIds.add(exercise.id)
      const isCompound = COMPOUND_PATTERNS.has(exercise.pattern)
      const range = repRangeFor(profile.goal, isCompound)
      slots.push({
        id: newId('slot'),
        exerciseId: exercise.id,
        sets: setsFor(profile.experience, isCompound),
        repMin: range.repMin,
        repMax: range.repMax,
        restSec: restFor(profile.goal, isCompound),
        targetRIR: range.targetRIR,
        incrementKg: nativeIncrementKg(exercise.incrementKg, units),
      })
    }
    return {
      id: newId('day'),
      name: template.name,
      weekday: weekdays[index] ?? null,
      slots,
    }
  })

  const range = RULES.volume.startingRange[profile.experience]

  return {
    id: newId('prog'),
    name: `${profile.name || 'Your'} Starter Plan`,
    description: `${templates.length} sessions a week, ${perSession} movements each, built for ${goalLabel(profile.goal)}. Volume starts near the bottom of the ${range.min}–${range.max} weekly-sets-per-muscle range for a ${profile.experience} lifter — there is no advantage in starting where you want to finish.`,
    descriptionTemplate:
      '{sessions} sessions a week, {movements} movements each, built for {goal}. Volume starts near the bottom of the {min}–{max} weekly-sets-per-muscle range for a {experience} lifter — there is no advantage in starting where you want to finish.',
    descriptionVars: {
      sessions: templates.length,
      movements: perSession,
      goal: goalLabel(profile.goal),
      min: range.min,
      max: range.max,
      experience: profile.experience,
    },
    days,
    createdAt: Date.now(),
    generated: true,
  }
}

export function goalLabel(goal: Goal): string {
  switch (goal) {
    case 'hypertrophy':
      return 'muscle growth'
    case 'strength':
      return 'strength'
    case 'recomp':
      return 'recomposition'
    case 'fatloss':
      return 'fat loss while preserving muscle'
    default:
      return 'general fitness'
  }
}

export function programSetCount(program: Program): number {
  return program.days.reduce((sum, d) => sum + d.slots.reduce((n, s) => n + s.sets, 0), 0)
}

export function estimateSessionMinutes(day: ProgramDay): number {
  const setTime = day.slots.reduce((sum, s) => sum + s.sets * (s.restSec + 45), 0)
  return Math.round(setTime / 60) + 6
}
