import { EXERCISE_LIBRARY } from '@/data/exercises'
import { STARTER_FOODS } from '@/data/foods'
import { STARTER_ITEM_IDS } from '@/data/items'
import type { AppData, GameState, Settings } from '@/types'

/** Bump when the persisted shape changes; `migrate` in db/repo.ts handles upgrades. */
export const SCHEMA_VERSION = 1

export function defaultSettings(): Settings {
  return {
    incrementKg: 2.5,
    roundingKg: 2.5,
    restDefaultSec: 120,
    mealsPerDay: 4,
    finalMealTime: '21:00',
    avoidFoods: [],
    reducedMotion: false,
    soundEnabled: false,
    hapticsEnabled: true,
    demoMode: false,
  }
}

export function defaultGameState(): GameState {
  return {
    xp: 0,
    coins: 120,
    owned: STARTER_ITEM_IDS.map((itemId) => ({
      itemId,
      acquiredAt: Date.now(),
      duplicates: 0,
      new: false,
    })),
    equipped: {
      face: 'face-recruit',
      head: 'head-none',
      body: 'body-tunic',
      hands: 'hands-wraps',
      feet: 'feet-wraps',
      weapon: 'weapon-none',
      back: 'back-none',
      aura: 'aura-none',
      companion: 'companion-none',
      title: 'title-recruit',
      pose: 'pose-ready',
    },
    packs: [],
    quests: [],
    achievements: [],
    ledger: [],
    streakDays: 0,
    bestStreakDays: 0,
    streakShields: 2,
    lastActiveDate: null,
  }
}

export function createDefaultAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null,
    settings: defaultSettings(),
    exercises: EXERCISE_LIBRARY.map((e) => ({ ...e })),
    programs: [],
    activeProgramId: null,
    sessions: [],
    runs: [],
    checkins: [],
    bodyWeights: [],
    measurements: [],
    photos: [],
    foods: STARTER_FOODS.map((f) => ({ ...f })),
    proteinEntries: [],
    meals: [],
    game: defaultGameState(),
    deloads: [],
    scheduleOverrides: [],
  }
}
