import { ECONOMY, levelFromXp } from '@/config/economy'
import { createDefaultAppData } from '@/db/defaults'
import { generateProgram } from '@/engine/program'
import { roundToIncrement } from '@/engine/units'
import { addDays, startOfWeek, toIsoDate, weekdayOf } from '@/lib/date'
import { makeRng } from '@/lib/id'
import type {
  AppData,
  Checkin,
  DeloadRecord,
  LoggedSet,
  Profile,
  ProteinEntry,
  RewardLedgerEntry,
  RunLog,
  Session,
  SessionEntry,
} from '@/types'

/**
 * Seeded demonstration data.
 *
 * Six weeks of plausible training for one person, generated deterministically so
 * every reviewer sees the same story:
 *   • steady double-progression on most lifts,
 *   • one lift (barbell row) genuinely stalled for the last month,
 *   • fatigue signals in the last ten days that trip the deload detector,
 *   • good-but-imperfect protein adherence,
 *   • running volume built conservatively with an improved 5K benchmark,
 *   • earned gear, two unopened packs, and a customised warrior.
 *
 * Everything runs through the same engines the real app uses — nothing here is
 * faked at the presentation layer.
 */

let counter = 0
const id = (prefix: string) => `${prefix}_demo${(counter++).toString(36)}`

const rng = makeRng(20240815)
const jitter = (spread: number) => (rng() - 0.5) * 2 * spread

/** Starting loads in kg for the demo lifter. */
const BASE_LOAD: Record<string, number> = {
  'barbell-bench-press': 70,
  'dumbbell-bench-press': 28,
  'incline-dumbbell-press': 24,
  'machine-chest-press': 55,
  'overhead-press': 42.5,
  'dumbbell-shoulder-press': 20,
  'lateral-raise': 10,
  'cable-lateral-raise': 7.5,
  'pull-up': 0,
  'lat-pulldown': 60,
  'barbell-row': 75,
  'dumbbell-row': 32,
  'chest-supported-row': 50,
  'seated-cable-row': 55,
  'face-pull': 20,
  'back-squat': 100,
  'front-squat': 70,
  'goblet-squat': 30,
  'leg-press': 160,
  'hack-squat': 90,
  'bulgarian-split-squat': 20,
  'walking-lunge': 18,
  deadlift: 130,
  'romanian-deadlift': 90,
  'hip-thrust': 110,
  'seated-leg-curl': 45,
  'lying-leg-curl': 40,
  'leg-extension': 55,
  'standing-calf-raise': 70,
  'seated-calf-raise': 45,
  'barbell-curl': 30,
  'dumbbell-curl': 14,
  'hammer-curl': 14,
  'cable-curl': 22,
  'triceps-pushdown': 30,
  'overhead-triceps-extension': 25,
  'close-grip-bench': 60,
  'cable-crunch': 40,
  'hanging-knee-raise': 0,
  plank: 0,
  'pallof-press': 15,
  'farmer-carry': 30,
  dip: 0,
  'push-up': 0,
  'reverse-pec-deck': 35,
  'pec-deck': 40,
  'cable-fly': 15,
  shrug: 30,
  'trap-bar-deadlift': 140,
  'back-extension': 10,
  'assisted-pull-up': 25,
  'machine-shoulder-press': 45,
}

/** The lift that has genuinely stopped moving — visible on Progress. */
const STALLED_EXERCISE = 'barbell-row'

const DEMO_PROFILE: Profile = {
  name: 'Kade',
  age: 32,
  heightCm: 180,
  bodyWeightKg: 84,
  units: 'lb',
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionMinutes: 65,
  equipment: [
    'barbell',
    'dumbbell',
    'machine',
    'cable',
    'bench',
    'rack',
    'pullup_bar',
    'bodyweight',
    'ez_bar',
    'dip_station',
  ],
  goal: 'hypertrophy',
  enduranceGoal: 'improve5k',
  priority: 'balanced',
  weeklyRunKm: 18,
  diet: 'omnivore',
  proteinOverrideG: null,
  limitations: ['shoulder'],
  archetype: 'emberblade',
  createdAt: Date.now() - 45 * 86_400_000,
  onboardedAt: Date.now() - 45 * 86_400_000,
}

const WEEKS = 6

export function buildDemoData(): AppData {
  counter = 0
  const base = createDefaultAppData()
  const today = toIsoDate()
  const program = generateProgram(DEMO_PROFILE, base.exercises)

  const sessions: Session[] = []
  const ledger: RewardLedgerEntry[] = []
  const checkins: Checkin[] = []
  const runs: RunLog[] = []
  const proteinEntries: ProteinEntry[] = []
  const bodyWeights: AppData['bodyWeights'] = []

  // Per-exercise double-progression state, carried across the whole block.
  const state = new Map<string, { loadKg: number; reps: number }>()

  const firstMonday = addDays(startOfWeek(today), -7 * (WEEKS - 1))

  for (let week = 0; week < WEEKS; week++) {
    const weekStart = addDays(firstMonday, week * 7)
    // The final ten days carry the fatigue signals that trip the deload check.
    const fatiguedWeek = week >= WEEKS - 2

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(weekStart, dayOffset)
      if (date > today) continue
      const weekday = weekdayOf(date)

      // ---- Body weight, slowly drifting up on a hypertrophy block ----------
      if (dayOffset % 2 === 0) {
        bodyWeights.push({
          id: id('bw'),
          date,
          weightKg: Number((83.2 + week * 0.16 + jitter(0.45)).toFixed(2)),
        })
      }

      // ---- Readiness check-ins --------------------------------------------
      if (dayOffset % 2 === 0 || fatiguedWeek) {
        checkins.push({
          id: id('chk'),
          date,
          sleepHours: Number((fatiguedWeek ? 6.2 + jitter(0.5) : 7.4 + jitter(0.6)).toFixed(1)),
          sleepQuality: fatiguedWeek ? 2 : 4,
          soreness: fatiguedWeek ? 4 : 2,
          readiness: fatiguedWeek ? 2 : 4,
          stress: fatiguedWeek ? 4 : 2,
          jointPain: fatiguedWeek ? 4 : 1,
          note: fatiguedWeek && dayOffset === 2 ? 'Left shoulder grumbling on pressing again.' : undefined,
          createdAt: Date.now(),
        })
      }

      // ---- Protein ---------------------------------------------------------
      // Hits target on most days; misses a couple, which shows up honestly in
      // the weekly adherence bar.
      const missProtein = week > 0 && dayOffset === 6
      const targetish = 155
      if (!missProtein) {
        const meals = [
          { label: 'Greek yoghurt & oats', grams: 42 },
          { label: 'Chicken and rice', grams: 48 },
          { label: 'Whey protein', grams: 24 },
          { label: 'Salmon and potatoes', grams: 45 },
        ]
        let running = 0
        for (const meal of meals) {
          const grams = Math.round(meal.grams + jitter(4))
          running += grams
          proteinEntries.push({
            id: id('prot'),
            date,
            label: meal.label,
            grams,
            foodId: null,
            createdAt: Date.now(),
          })
        }
        if (running < targetish * 0.92) {
          proteinEntries.push({
            id: id('prot'),
            date,
            label: 'Cottage cheese',
            grams: 25,
            foodId: null,
            createdAt: Date.now(),
          })
        }
      } else {
        proteinEntries.push({
          id: id('prot'),
          date,
          label: 'Eggs on toast',
          grams: 26,
          foodId: null,
          createdAt: Date.now(),
        })
      }

      // ---- Running ---------------------------------------------------------
      // Easy Tuesday, easy Thursday, long Sunday. Volume builds ~6%/week from
      // 16 km, and the 5K benchmark improves between week 1 and week 6.
      const weeklyKm = 16 * Math.pow(1.06, week)
      if (weekday === 2 || weekday === 4 || weekday === 0) {
        const isLong = weekday === 0
        const distanceKm = Number(((isLong ? weeklyKm * 0.35 : weeklyKm * 0.32) + jitter(0.4)).toFixed(2))
        const paceSecPerKm = (isLong ? 336 : 322) - week * 3 + jitter(6)
        runs.push({
          id: id('run'),
          date,
          type: isLong ? 'long' : 'easy',
          distanceKm,
          durationSec: Math.round(distanceKm * paceSecPerKm),
          avgHr: Math.round((isLong ? 148 : 143) + jitter(5)),
          rpe: isLong ? 5 : 4,
          pain: 0,
          surface: isLong ? 'trail' : 'road',
          note: undefined,
          planned: true,
          createdAt: Date.now(),
        })
      }
      // Benchmark 5K at the start of the block and again at the end.
      // The retest sits in the second-to-last week so it is always in the past,
      // whatever weekday the demo is loaded on.
      if ((week === 0 || week === WEEKS - 2) && weekday === 6) {
        const seconds = week === 0 ? 1512 : 1449 // 25:12 → 24:09
        runs.push({
          id: id('run'),
          date,
          type: 'benchmark',
          distanceKm: 5,
          durationSec: seconds,
          avgHr: 176,
          rpe: 9,
          pain: 0,
          surface: 'road',
          note: week === 0 ? 'Baseline 5K.' : 'Felt strong through 3 km, hung on.',
          planned: true,
          createdAt: Date.now(),
        })
      }

      // ---- Lifting ---------------------------------------------------------
      const programDay = program.days.find((d) => d.weekday === weekday)
      if (!programDay) continue

      const startedAt = new Date(`${date}T18:15:00`).getTime()
      const entries: SessionEntry[] = programDay.slots.map((slot) => {
        const exercise = base.exercises.find((e) => e.id === slot.exerciseId)
        const increment = slot.incrementKg ?? exercise?.incrementKg ?? 2.5
        const key = slot.exerciseId
        if (!state.has(key)) {
          // Start two reps short of the top of the range, so the double-progression
          // cycle (climb the reps, then add load) completes roughly every 3 weeks.
          state.set(key, {
            loadKg: BASE_LOAD[key] ?? 20,
            reps: Math.max(slot.repMin, slot.repMax - 2),
          })
        }
        const current = state.get(key)!

        // Fatigued weeks blunt performance slightly — this is what the deload
        // detector picks up as "broad performance decline".
        const repPenalty = fatiguedWeek ? 1 : 0
        const setReps: number[] = []
        for (let i = 0; i < slot.sets; i++) {
          // Later sets drop a rep until the top of the range is owned outright.
          // Reps never fall out of the bottom of the range: this block is a story
          // about a plateau, not about a load that is simply too heavy.
          const dropoff = current.reps >= slot.repMax ? 0 : i >= 2 ? 1 : 0
          const reps = Math.max(slot.repMin, Math.min(slot.repMax, current.reps - dropoff - repPenalty))
          setReps.push(reps)
        }

        const sets: LoggedSet[] = []
        // One light warm-up on the first movement of the day.
        if (slot === programDay.slots[0]) {
          sets.push({
            id: id('set'),
            weightKg: roundToIncrement(current.loadKg * 0.55, increment),
            reps: 8,
            rir: null,
            warmup: true,
            completedAt: startedAt,
          })
        }
        setReps.forEach((reps, i) => {
          sets.push({
            id: id('set'),
            weightKg: current.loadKg,
            reps,
            // Fatigued weeks run closer to failure than prescribed, which is
            // exactly the "sessions harder than expected" deload signal.
            rir: fatiguedWeek ? Math.max(0, slot.targetRIR - 2) : Math.max(0, slot.targetRIR - (i === slot.sets - 1 ? 1 : 0)),
            warmup: false,
            completedAt: startedAt + (i + 1) * 210_000,
          })
        })

        // Advance the double-progression state for next session.
        const allTop = setReps.every((r) => r >= slot.repMax)
        const isStalled = key === STALLED_EXERCISE && week >= 2
        if (allTop && !isStalled) {
          current.loadKg = roundToIncrement(current.loadKg + increment, increment)
          current.reps = Math.max(slot.repMin, slot.repMax - 2)
        } else if (!isStalled) {
          current.reps = Math.min(slot.repMax, current.reps + 1)
        } else {
          // Stalled lift: reps bounce around inside the range, load never moves.
          current.reps = Math.min(slot.repMax - 1, slot.repMin + 2 + ((week + dayOffset) % 2))
        }

        return {
          id: id('entry'),
          exerciseId: slot.exerciseId,
          plannedSets: slot.sets,
          repMin: slot.repMin,
          repMax: slot.repMax,
          targetRIR: slot.targetRIR,
          restSec: slot.restSec,
          incrementKg: increment,
          sets,
          // The shoulder limitation shows up as low-but-present pain on pressing.
          pain: fatiguedWeek && exercise?.pattern === 'vertical_push' ? 3 : 0,
          technique: fatiguedWeek && key === STALLED_EXERCISE ? 'minor' : 'clean',
        }
      })

      const durationMs = 58 * 60_000
      const session: Session = {
        id: id('sess'),
        date,
        programId: program.id,
        programDayId: programDay.id,
        title: programDay.name,
        status: 'completed',
        entries,
        note: week === WEEKS - 1 && weekday === 1 ? 'Everything felt heavy today. Third session like this.' : undefined,
        startedAt,
        endedAt: startedAt + durationMs,
      }
      sessions.push(session)

      const workingSets = entries.flatMap((e) => e.sets.filter((s) => !s.warmup)).length
      const bonus =
        Math.max(0, Math.min(workingSets, ECONOMY.limits.volumeBonusSetCap) - ECONOMY.limits.minWorkingSetsForReward) *
        ECONOMY.limits.xpPerExtraSet
      ledger.push({
        id: id('rw'),
        date,
        reason: 'workout_completed',
        xp: ECONOMY.rewards.workout_completed.xp + bonus,
        coins: ECONOMY.rewards.workout_completed.coins,
        sourceId: session.id,
        detail: `${workingSets} working sets across ${entries.length} exercises.`,
        createdAt: Date.now(),
      })
      ledger.push({
        id: id('rw'),
        date,
        reason: 'rir_logged',
        xp: ECONOMY.rewards.rir_logged.xp,
        coins: ECONOMY.rewards.rir_logged.coins,
        sourceId: session.id,
        detail: 'Reps in reserve logged on every working set.',
        createdAt: Date.now(),
      })
    }
  }

  // Reward the runs and protein days too, so the ledger tells the whole story.
  for (const run of runs) {
    ledger.push({
      id: id('rw'),
      date: run.date,
      reason: 'run_completed',
      xp: ECONOMY.rewards.run_completed.xp,
      coins: ECONOMY.rewards.run_completed.coins,
      sourceId: run.id,
      detail: `${run.distanceKm.toFixed(2)} km ${run.type} run.`,
      createdAt: Date.now(),
    })
  }
  const proteinDays = [...new Set(proteinEntries.map((p) => p.date))]
  for (const date of proteinDays) {
    const total = proteinEntries.filter((p) => p.date === date).reduce((s, p) => s + p.grams, 0)
    if (total >= 140) {
      ledger.push({
        id: id('rw'),
        date,
        reason: 'protein_target',
        xp: ECONOMY.rewards.protein_target.xp,
        coins: ECONOMY.rewards.protein_target.coins,
        sourceId: `protein:${date}`,
        detail: `${total} g logged.`,
        createdAt: Date.now(),
      })
    }
  }

  // A completed deload five weeks back, so the deload history is not empty and
  // the "Cooled Steel" achievement has a real basis.
  const deloads: DeloadRecord[] = [
    {
      id: id('deload'),
      startDate: addDays(firstMonday, -14),
      endDate: addDays(firstMonday, -8),
      reason: 'Broad performance decline, elevated soreness and low readiness after a long build.',
      status: 'completed',
      createdAt: Date.now(),
    },
  ]

  const totalXp = ledger.reduce((s, e) => s + e.xp, 0)
  const totalCoins = ledger.reduce((s, e) => s + e.coins, 0)

  const earnedItems = [
    'face-warpaint',
    'head-topknot',
    'head-open-helm',
    'body-leather',
    'body-scale',
    'body-brigandine',
    'hands-bracers',
    'hands-gauntlets',
    'feet-runner',
    'feet-greaves',
    'weapon-handaxe',
    'weapon-longsword',
    'weapon-mace',
    'back-tattered',
    'back-banner',
    'aura-embers',
    'companion-wisp',
    'title-steady',
    'title-unbroken',
    'title-emberborn',
    'pose-heroic',
  ]

  const now = Date.now()
  return {
    ...base,
    profile: DEMO_PROFILE,
    settings: { ...base.settings, demoMode: true, mealsPerDay: 4 },
    programs: [program],
    activeProgramId: program.id,
    sessions: sessions.sort((a, b) => b.date.localeCompare(a.date)),
    runs: runs.sort((a, b) => b.date.localeCompare(a.date)),
    checkins: checkins.sort((a, b) => b.date.localeCompare(a.date)),
    bodyWeights: bodyWeights.sort((a, b) => b.date.localeCompare(a.date)),
    measurements: [
      { id: id('meas'), date: addDays(today, -28), values: { waist: 82, chest: 104, arm: 37.5, thigh: 60 } },
      { id: id('meas'), date: addDays(today, -1), values: { waist: 81.5, chest: 105.5, arm: 38.2, thigh: 61 } },
    ],
    proteinEntries: proteinEntries.sort((a, b) => b.date.localeCompare(a.date)),
    meals: [
      {
        id: id('meal'),
        name: 'Post-gym standard',
        items: [
          { label: 'Whey shake', grams: 24 },
          { label: 'Chicken wrap', grams: 32 },
        ],
        custom: true,
      },
    ],
    deloads,
    game: {
      ...base.game,
      xp: totalXp,
      coins: Math.max(0, totalCoins - 700),
      owned: [
        ...base.game.owned,
        ...earnedItems.map((itemId, i) => ({
          itemId,
          acquiredAt: now - (earnedItems.length - i) * 86_400_000,
          duplicates: i % 7 === 0 ? 1 : 0,
          new: i >= earnedItems.length - 2,
        })),
      ],
      equipped: {
        face: 'face-warpaint',
        head: 'head-open-helm',
        body: 'body-brigandine',
        hands: 'hands-gauntlets',
        feet: 'feet-greaves',
        weapon: 'weapon-longsword',
        back: 'back-banner',
        aura: 'aura-embers',
        companion: 'companion-wisp',
        title: 'title-emberborn',
        pose: 'pose-heroic',
      },
      packs: [
        { id: id('pack'), kind: 'warband', acquiredAt: now - 2 * 86_400_000, openedAt: null, results: [] },
        { id: id('pack'), kind: 'ember', acquiredAt: now - 86_400_000, openedAt: null, results: [] },
      ],
      quests: [],
      achievements: [
        { id: 'first-session', unlockedAt: now - 40 * 86_400_000 },
        { id: 'ten-sessions', unlockedAt: now - 28 * 86_400_000 },
        { id: 'first-run', unlockedAt: now - 40 * 86_400_000 },
        { id: 'first-deload', unlockedAt: now - 34 * 86_400_000 },
        { id: 'first-pr', unlockedAt: now - 30 * 86_400_000 },
        { id: 'honest-logger', unlockedAt: now - 12 * 86_400_000 },
      ],
      ledger,
      streakDays: 9,
      bestStreakDays: 21,
      streakShields: 2,
      lastActiveDate: today,
    },
    scheduleOverrides: [],
  }
}

/** Exposed for tests: the level the demo account lands on. */
export function demoLevel(): number {
  return levelFromXp(buildDemoData().game.xp).level
}
