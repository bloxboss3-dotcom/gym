import type { MuscleKey } from '@/types'

export interface MuscleMeta {
  key: MuscleKey
  label: string
  group: 'push' | 'pull' | 'legs' | 'core'
  /** Ordering in the volume dashboard. */
  order: number
}

export const MUSCLES: MuscleMeta[] = [
  { key: 'chest', label: 'Chest', group: 'push', order: 1 },
  { key: 'front_delts', label: 'Front delts', group: 'push', order: 2 },
  { key: 'side_delts', label: 'Side delts', group: 'push', order: 3 },
  { key: 'rear_delts', label: 'Rear delts', group: 'pull', order: 4 },
  { key: 'triceps', label: 'Triceps', group: 'push', order: 5 },
  { key: 'lats', label: 'Lats', group: 'pull', order: 6 },
  { key: 'upper_back', label: 'Upper back', group: 'pull', order: 7 },
  { key: 'traps', label: 'Traps', group: 'pull', order: 8 },
  { key: 'biceps', label: 'Biceps', group: 'pull', order: 9 },
  { key: 'forearms', label: 'Forearms', group: 'pull', order: 10 },
  { key: 'quads', label: 'Quads', group: 'legs', order: 11 },
  { key: 'hamstrings', label: 'Hamstrings', group: 'legs', order: 12 },
  { key: 'glutes', label: 'Glutes', group: 'legs', order: 13 },
  { key: 'adductors', label: 'Adductors', group: 'legs', order: 14 },
  { key: 'calves', label: 'Calves', group: 'legs', order: 15 },
  { key: 'abs', label: 'Abs', group: 'core', order: 16 },
  { key: 'lower_back', label: 'Lower back', group: 'core', order: 17 },
]

export const MUSCLE_LABEL: Record<MuscleKey, string> = MUSCLES.reduce(
  (acc, m) => {
    acc[m.key] = m.label
    return acc
  },
  {} as Record<MuscleKey, string>,
)

/** Muscles most people track weekly volume for. Keeps the dashboard readable. */
export const PRIMARY_MUSCLES: MuscleKey[] = [
  'chest',
  'side_delts',
  'rear_delts',
  'lats',
  'upper_back',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
]

/** Muscles worked by lower-body lifting — used for run/lift interference spacing. */
export const LOWER_BODY_MUSCLES: MuscleKey[] = [
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
]
