import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ACHIEVEMENT_BY_ID, QUEST_BY_ID } from '@/data/quests'
import { EXERCISE_BY_ID } from '@/data/exercises'
import { createDefaultAppData } from '@/db/defaults'
import { repository } from '@/db/repo'
import { evaluateRunReward, evaluateSessionReward, applyLedgerEntry, grantReward, simpleGrant } from '@/engine/rewards'
import { bandSourceId, newBandCrossings, paidBands, profileFromHistory } from '@/engine/percentile'
import { buyPack as buyPackPure, buyTechnique as buyTechniquePure, grantItem, openPack as openPackPure } from '@/engine/packs'
import { MOVE_BY_ID } from '@/data/moves'
import { computeConsistency } from '@/engine/consistency'
import { calculateProteinTarget, proteinForDate } from '@/engine/protein'
import { newlyUnlockedAchievements } from '@/engine/quests'
import { generateProgram } from '@/engine/program'
import { nativeIncrementKg } from '@/engine/units'
import { isoDateOf, toIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import type {
  AppData,
  BodyWeightEntry,
  Checkin,
  DeloadRecord,
  Exercise,
  FoodItem,
  LoggedSet,
  Meal,
  Measurement,
  PackKind,
  Profile,
  ProgressPhoto,
  Program,
  ProgramDay,
  ProteinEntry,
  RunLog,
  Session,
  SessionEntry,
  Settings,
  Slot,
} from '@/types'

export interface Toast {
  id: string
  title: string
  body?: string
  tone: 'reward' | 'info' | 'warn' | 'error'
  icon?: string
}

export interface ForgedStore {
  data: AppData
  ready: boolean
  /** True when IndexedDB is unavailable and data will not survive a reload. */
  ephemeral: boolean
  toasts: Toast[]
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  // Profile & settings -------------------------------------------------------
  completeOnboarding: (profile: Profile) => void
  updateProfile: (patch: Partial<Profile>) => void
  updateSettings: (patch: Partial<Settings>) => void

  // Programs -----------------------------------------------------------------
  regenerateProgram: () => void
  saveProgram: (program: Program) => void
  deleteProgram: (id: string) => void
  setActiveProgram: (id: string) => void
  saveExercise: (exercise: Exercise) => void
  deleteExercise: (id: string) => void

  // Sessions -----------------------------------------------------------------
  startSession: (day: ProgramDay | null, opts?: { deload?: boolean; title?: string }) => string
  logSet: (sessionId: string, entryId: string, set: Omit<LoggedSet, 'id' | 'completedAt'>) => void
  updateSet: (sessionId: string, entryId: string, setId: string, patch: Partial<LoggedSet>) => void
  deleteSet: (sessionId: string, entryId: string, setId: string) => void
  updateEntry: (sessionId: string, entryId: string, patch: Partial<SessionEntry>) => void
  substituteExercise: (sessionId: string, entryId: string, newExerciseId: string) => void
  addEntryToSession: (sessionId: string, exerciseId: string) => void
  removeEntryFromSession: (sessionId: string, entryId: string) => void
  setSessionNote: (sessionId: string, note: string) => void
  completeSession: (sessionId: string) => void
  abandonSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void

  // Running ------------------------------------------------------------------
  addRun: (run: Omit<RunLog, 'id' | 'createdAt'>) => void
  deleteRun: (id: string) => void

  // Recovery & body ----------------------------------------------------------
  addCheckin: (checkin: Omit<Checkin, 'id' | 'createdAt'>) => void
  addBodyWeight: (entry: Omit<BodyWeightEntry, 'id'>) => void
  addMeasurement: (entry: Omit<Measurement, 'id'>) => void
  addPhoto: (entry: Omit<ProgressPhoto, 'id'>) => void
  deletePhoto: (id: string) => void

  // Nutrition ----------------------------------------------------------------
  addProtein: (entry: Omit<ProteinEntry, 'id' | 'createdAt'>) => void
  deleteProtein: (id: string) => void
  saveFood: (food: FoodItem) => void
  deleteFood: (id: string) => void
  saveMeal: (meal: Meal) => void
  deleteMeal: (id: string) => void

  // Deloads ------------------------------------------------------------------
  acceptDeload: (reason: string) => void
  solvePuzzle: (puzzleId: string, theme: string) => void
  declineDeload: (reason: string) => void
  completeDeload: (id: string) => void

  // Game ---------------------------------------------------------------------
  openPack: (packId: string) => string[]
  buyPack: (kind: PackKind) => string | null
  buyTechnique: () => string | null
  equipItem: (slot: Slot, itemId: string) => void
  markItemSeen: (itemId: string) => void
  claimQuest: (questId: string, periodKey: string) => void

  // Data ---------------------------------------------------------------------
  replaceAll: (data: AppData) => void
  resetAll: () => void
  loadDemo: () => void
}

const StoreContext = createContext<ForgedStore | null>(null)

export function useStore(): ForgedStore {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(() => createDefaultAppData())
  const [ready, setReady] = useState(false)
  const [ephemeral, setEphemeral] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const dataRef = useRef(data)
  const persistTimer = useRef<number | null>(null)

  const persist = useCallback((value: AppData) => {
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      void repository.save(value).catch((error) => {
        console.error('[forged] Failed to save:', error)
      })
    }, 250)
  }, [])

  const setData = useCallback(
    (next: AppData | ((prev: AppData) => AppData)) => {
      const value = typeof next === 'function' ? (next as (p: AppData) => AppData)(dataRef.current) : next
      dataRef.current = value
      setDataState(value)
      persist(value)
    },
    [persist],
  )

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = newId('toast')
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Initial load -------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    void repository
      .load()
      .then((loaded) => {
        if (cancelled) return
        dataRef.current = loaded
        setDataState(loaded)
        setEphemeral(repository.isEphemeral())
      })
      .catch((error) => {
        console.error('[forged] Failed to load stored data:', error)
        setEphemeral(true)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Flush pending writes when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (persistTimer.current !== null) {
        window.clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
      void repository.save(dataRef.current)
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  // ---------------------------------------------------------------------------
  // Reward plumbing
  // ---------------------------------------------------------------------------

  const consistencyScore = useCallback((current: AppData): number => {
    if (!current.profile) return 0
    return computeConsistency({
      sessions: current.sessions,
      runs: current.runs,
      checkins: current.checkins,
      deloads: current.deloads,
      program: current.programs.find((p) => p.id === current.activeProgramId) ?? null,
      daysPerWeek: current.profile.daysPerWeek,
      sinceDate: isoDateOf(current.profile.onboardedAt ?? current.profile.createdAt),
    }).score
  }, [])

  /** Apply reward grants + newly earned achievements. Returns the updated data. */
  const awardInto = useCallback(
    (
      current: AppData,
      grants: Parameters<typeof grantReward>[0][],
      notify: (toast: Omit<Toast, 'id'>) => void,
    ): AppData => {
      const today = toIsoDate()
      let game = current.game
      const score = consistencyScore(current)
      let totalXp = 0
      let totalCoins = 0
      let capNote: string | null = null

      for (const grant of grants) {
        const decision = grantReward(grant, { date: today, ledger: game.ledger, consistencyScore: score })
        if (decision.note && !decision.granted) capNote = decision.note
        if (!decision.granted || !decision.entry) continue
        const applied = applyLedgerEntry(game, decision.entry)
        game = applied.game
        totalXp += decision.entry.xp
        totalCoins += decision.entry.coins
        if (applied.leveledUp) {
          notify({
            tone: 'reward',
            title: `Level ${applied.newLevel}`,
            body: applied.packsAwarded
              ? `+${applied.packsAwarded} pack waiting in the Forge.`
              : 'Your warrior grows stronger.',
            icon: '⬆',
          })
        }
      }

      let next: AppData = { ...current, game }

      // Achievements are derived, so evaluate them against the updated data.
      const unlocked = newlyUnlockedAchievements(next, today)
      for (const def of unlocked) {
        let g = next.game
        g = {
          ...g,
          achievements: [...g.achievements, { id: def.id, unlockedAt: Date.now() }],
        }
        if (def.grantsItemId) {
          const result = grantItem(g, def.grantsItemId)
          g = result.game
        }
        const entry = grantReward(
          simpleGrant('quest_completed', `achievement:${def.id}`, def.title, {
            xp: def.xp,
            coins: def.coins,
          }),
          { date: today, ledger: g.ledger, consistencyScore: score },
        )
        if (entry.granted && entry.entry) {
          g = applyLedgerEntry(g, entry.entry).game
          totalXp += entry.entry.xp
          totalCoins += entry.entry.coins
        }
        next = { ...next, game: g }
        notify({ tone: 'reward', title: `Achievement — ${def.title}`, body: def.description, icon: '★' })
      }

      if (totalXp || totalCoins) {
        notify({
          tone: 'reward',
          title: `+${totalXp} XP · +${totalCoins} coins`,
          body: capNote ?? undefined,
          icon: '✦',
        })
      } else if (capNote) {
        notify({ tone: 'info', title: 'Rewards capped', body: capNote })
      }

      return next
    },
    [consistencyScore],
  )

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const store = useMemo<ForgedStore>(() => {
    const mutate = (fn: (current: AppData) => AppData) => setData(fn)

    const mutateSession = (
      sessionId: string,
      fn: (session: Session, current: AppData) => Session,
    ) =>
      mutate((current) => ({
        ...current,
        sessions: current.sessions.map((s) => (s.id === sessionId ? fn(s, current) : s)),
      }))

    const mutateEntry = (
      sessionId: string,
      entryId: string,
      fn: (entry: SessionEntry, current: AppData) => SessionEntry,
    ) =>
      mutateSession(sessionId, (session, current) => ({
        ...session,
        entries: session.entries.map((e) => (e.id === entryId ? fn(e, current) : e)),
      }))

    return {
      data,
      ready,
      ephemeral,
      toasts,
      pushToast,
      dismissToast,

      completeOnboarding(profile) {
        mutate((current) => {
          const program = generateProgram(profile, current.exercises)
          return {
            ...current,
            profile: { ...profile, onboardedAt: Date.now() },
            programs: [program],
            activeProgramId: program.id,
            bodyWeights: [
              { id: newId('bw'), date: toIsoDate(), weightKg: profile.bodyWeightKg },
              ...current.bodyWeights,
            ],
            settings: { ...current.settings, mealsPerDay: current.settings.mealsPerDay },
          }
        })
      },

      updateProfile(patch) {
        mutate((current) => {
          if (!current.profile) return current
          const profile = { ...current.profile, ...patch }
          const bodyWeights =
            patch.bodyWeightKg && patch.bodyWeightKg !== current.profile.bodyWeightKg
              ? [{ id: newId('bw'), date: toIsoDate(), weightKg: patch.bodyWeightKg }, ...current.bodyWeights]
              : current.bodyWeights
          return { ...current, profile, bodyWeights }
        })
      },

      updateSettings(patch) {
        mutate((current) => ({ ...current, settings: { ...current.settings, ...patch } }))
      },

      regenerateProgram() {
        mutate((current) => {
          if (!current.profile) return current
          const program = generateProgram(current.profile, current.exercises)
          return {
            ...current,
            programs: [program, ...current.programs.filter((p) => !p.generated)],
            activeProgramId: program.id,
          }
        })
        pushToast({ tone: 'info', title: 'Plan rebuilt', body: 'Generated from your current profile.' })
      },

      saveProgram(program) {
        mutate((current) => {
          const exists = current.programs.some((p) => p.id === program.id)
          return {
            ...current,
            programs: exists
              ? current.programs.map((p) => (p.id === program.id ? program : p))
              : [...current.programs, program],
            activeProgramId: current.activeProgramId ?? program.id,
          }
        })
      },

      deleteProgram(id) {
        mutate((current) => {
          const programs = current.programs.filter((p) => p.id !== id)
          return {
            ...current,
            programs,
            activeProgramId: current.activeProgramId === id ? (programs[0]?.id ?? null) : current.activeProgramId,
          }
        })
      },

      setActiveProgram(id) {
        mutate((current) => ({ ...current, activeProgramId: id }))
      },

      saveExercise(exercise) {
        mutate((current) => ({
          ...current,
          exercises: current.exercises.some((e) => e.id === exercise.id)
            ? current.exercises.map((e) => (e.id === exercise.id ? exercise : e))
            : [...current.exercises, exercise],
        }))
      },

      deleteExercise(id) {
        mutate((current) => ({ ...current, exercises: current.exercises.filter((e) => e.id !== id) }))
      },

      startSession(day, opts) {
        const id = newId('sess')
        mutate((current) => {
          const entries: SessionEntry[] = (day?.slots ?? []).map((slot) => {
            const exercise = current.exercises.find((e) => e.id === slot.exerciseId)
            return {
              id: newId('entry'),
              exerciseId: slot.exerciseId,
              plannedSets: opts?.deload ? Math.max(1, Math.round(slot.sets * 0.6)) : slot.sets,
              repMin: slot.repMin,
              repMax: slot.repMax,
              targetRIR: opts?.deload ? Math.max(4, slot.targetRIR + 2) : slot.targetRIR,
              restSec: slot.restSec,
              incrementKg: nativeIncrementKg(
                slot.incrementKg ?? exercise?.incrementKg ?? current.settings.incrementKg,
                current.profile?.units ?? 'kg',
              ),
              sets: [],
              pain: 0,
              technique: 'clean',
            }
          })
          const session: Session = {
            id,
            date: toIsoDate(),
            programId: current.activeProgramId,
            programDayId: day?.id ?? null,
            title: opts?.title ?? (day ? day.name : 'Freestyle session'),
            status: 'active',
            entries,
            startedAt: Date.now(),
            endedAt: null,
          }
          // Abandon any other stale active session so there is only ever one.
          const sessions = current.sessions.map((s) =>
            s.status === 'active' ? { ...s, status: 'abandoned' as const, endedAt: Date.now() } : s,
          )
          return { ...current, sessions: [session, ...sessions] }
        })
        return id
      },

      logSet(sessionId, entryId, set) {
        mutateEntry(sessionId, entryId, (entry) => ({
          ...entry,
          sets: [...entry.sets, { ...set, id: newId('set'), completedAt: Date.now() }],
        }))
      },

      updateSet(sessionId, entryId, setId, patch) {
        mutateEntry(sessionId, entryId, (entry) => ({
          ...entry,
          sets: entry.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        }))
      },

      deleteSet(sessionId, entryId, setId) {
        mutateEntry(sessionId, entryId, (entry) => ({
          ...entry,
          sets: entry.sets.filter((s) => s.id !== setId),
        }))
      },

      updateEntry(sessionId, entryId, patch) {
        mutateEntry(sessionId, entryId, (entry) => ({ ...entry, ...patch }))
      },

      substituteExercise(sessionId, entryId, newExerciseId) {
        mutateEntry(sessionId, entryId, (entry, current) => ({
          ...entry,
          substitutedFromId: entry.substitutedFromId ?? entry.exerciseId,
          exerciseId: newExerciseId,
          incrementKg: nativeIncrementKg(
            EXERCISE_BY_ID[newExerciseId]?.incrementKg ?? entry.incrementKg,
            current.profile?.units ?? 'kg',
          ),
          sets: [],
        }))
      },

      addEntryToSession(sessionId, exerciseId) {
        mutateSession(sessionId, (session, current) => {
          const exercise = current.exercises.find((e) => e.id === exerciseId) ?? EXERCISE_BY_ID[exerciseId]
          return {
            ...session,
            entries: [
              ...session.entries,
              {
                id: newId('entry'),
                exerciseId,
                plannedSets: 3,
                repMin: 8,
                repMax: 12,
                targetRIR: 2,
                restSec: 120,
                incrementKg: nativeIncrementKg(
                  exercise?.incrementKg ?? 2.5,
                  current.profile?.units ?? 'kg',
                ),
                sets: [],
                pain: 0,
                technique: 'clean',
              },
            ],
          }
        })
      },

      removeEntryFromSession(sessionId, entryId) {
        mutateSession(sessionId, (session) => ({
          ...session,
          entries: session.entries.filter((e) => e.id !== entryId),
        }))
      },

      setSessionNote(sessionId, note) {
        mutateSession(sessionId, (session) => ({ ...session, note }))
      },

      completeSession(sessionId) {
        mutate((current) => {
          const session = current.sessions.find((s) => s.id === sessionId)
          if (!session || session.status === 'completed') return current
          const completed: Session = {
            ...session,
            status: 'completed',
            endedAt: Date.now(),
            // Drop exercises that were never touched so they don't skew volume.
            entries: session.entries.filter((e) => e.sets.length > 0),
          }
          const withSession: AppData = {
            ...current,
            sessions: current.sessions.map((s) => (s.id === sessionId ? completed : s)),
          }
          const { grants, rejection } = evaluateSessionReward(completed)
          if (rejection) pushToast({ tone: 'info', title: 'Session saved', body: rejection })

          // Strength percentile bands. Paid for the climb, never the standing,
          // and only the first time each band is crossed — the ledger's
          // (reason, sourceId) idempotency makes that permanent rather than
          // merely daily.
          const profile = profileFromHistory(
            withSession.sessions,
            withSession.bodyWeights,
            withSession.profile?.sex ?? 'unspecified',
            withSession.profile?.bodyWeightKg ?? null,
          )
          const crossings = newBandCrossings(profile, paidBands(withSession.game.ledger))
          const bandGrants = crossings.map((c) =>
            simpleGrant('percentile_band', bandSourceId(c.exerciseId, c.band), c.detail),
          )

          return awardInto(withSession, [...grants, ...bandGrants], pushToast)
        })
      },

      abandonSession(sessionId) {
        mutateSession(sessionId, (session) => ({
          ...session,
          status: 'abandoned',
          endedAt: Date.now(),
        }))
      },

      deleteSession(sessionId) {
        mutate((current) => ({
          ...current,
          sessions: current.sessions.filter((s) => s.id !== sessionId),
        }))
      },

      addRun(run) {
        mutate((current) => {
          const record: RunLog = { ...run, id: newId('run'), createdAt: Date.now() }
          const next: AppData = { ...current, runs: [record, ...current.runs] }
          const { grants, rejection } = evaluateRunReward(record)
          if (rejection) pushToast({ tone: 'info', title: 'Run saved', body: rejection })
          return awardInto(next, grants, pushToast)
        })
      },

      deleteRun(id) {
        mutate((current) => ({ ...current, runs: current.runs.filter((r) => r.id !== id) }))
      },

      addCheckin(checkin) {
        mutate((current) => {
          const record: Checkin = { ...checkin, id: newId('chk'), createdAt: Date.now() }
          const next: AppData = {
            ...current,
            checkins: [record, ...current.checkins.filter((c) => c.date !== record.date)],
          }
          return awardInto(
            next,
            [simpleGrant('checkin', record.id, 'Readiness check-in logged.')],
            pushToast,
          )
        })
      },

      addBodyWeight(entry) {
        mutate((current) => ({
          ...current,
          bodyWeights: [
            { ...entry, id: newId('bw') },
            ...current.bodyWeights.filter((b) => b.date !== entry.date),
          ],
          profile: current.profile ? { ...current.profile, bodyWeightKg: entry.weightKg } : current.profile,
        }))
      },

      addMeasurement(entry) {
        mutate((current) => ({
          ...current,
          measurements: [{ ...entry, id: newId('meas') }, ...current.measurements],
        }))
      },

      addPhoto(entry) {
        mutate((current) => ({ ...current, photos: [{ ...entry, id: newId('photo') }, ...current.photos] }))
      },

      deletePhoto(id) {
        mutate((current) => ({ ...current, photos: current.photos.filter((p) => p.id !== id) }))
      },

      addProtein(entry) {
        mutate((current) => {
          const record: ProteinEntry = { ...entry, id: newId('prot'), createdAt: Date.now() }
          const next: AppData = { ...current, proteinEntries: [record, ...current.proteinEntries] }
          if (!next.profile) return next
          const target = calculateProteinTarget(next.profile).targetG
          const before = proteinForDate(current.proteinEntries, record.date)
          const after = proteinForDate(next.proteinEntries, record.date)
          const threshold = target * 0.9
          if (target > 0 && before < threshold && after >= threshold) {
            return awardInto(
              next,
              [simpleGrant('protein_target', `protein:${record.date}`, `${Math.round(after)} g logged.`)],
              pushToast,
            )
          }
          return next
        })
      },

      deleteProtein(id) {
        mutate((current) => ({
          ...current,
          proteinEntries: current.proteinEntries.filter((e) => e.id !== id),
        }))
      },

      saveFood(food) {
        mutate((current) => ({
          ...current,
          foods: current.foods.some((f) => f.id === food.id)
            ? current.foods.map((f) => (f.id === food.id ? food : f))
            : [...current.foods, food],
        }))
      },

      deleteFood(id) {
        mutate((current) => ({ ...current, foods: current.foods.filter((f) => f.id !== id) }))
      },

      saveMeal(meal) {
        mutate((current) => ({
          ...current,
          meals: current.meals.some((m) => m.id === meal.id)
            ? current.meals.map((m) => (m.id === meal.id ? meal : m))
            : [...current.meals, meal],
        }))
      },

      deleteMeal(id) {
        mutate((current) => ({ ...current, meals: current.meals.filter((m) => m.id !== id) }))
      },

      acceptDeload(reason) {
        mutate((current) => {
          const record: DeloadRecord = {
            id: newId('deload'),
            startDate: toIsoDate(),
            endDate: null,
            reason,
            status: 'accepted',
            createdAt: Date.now(),
          }
          return { ...current, deloads: [record, ...current.deloads] }
        })
        pushToast({
          tone: 'info',
          title: 'Deload started',
          body: 'Lighter loads, fewer sets. This still counts as training.',
        })
      },

      /**
       * A rest-timer puzzle was solved.
       *
       * Deliberately routed through the same reward ledger and the same daily
       * caps as everything else, so chess can never out-earn training. The
       * screen only offers puzzles while a rest timer is actually running,
       * which means you have to be mid-session to earn anything at all.
       */
      solvePuzzle(puzzleId, theme) {
        mutate((current) => {
          const solved = current.game.solvedPuzzleIds ?? []
          const next: AppData = {
            ...current,
            game: {
              ...current.game,
              solvedPuzzleIds: solved.includes(puzzleId) ? solved : [...solved, puzzleId],
            },
          }
          return awardInto(
            next,
            [simpleGrant('puzzle_solved', `puzzle:${puzzleId}`, `${theme} solved between sets.`)],
            pushToast,
          )
        })
      },

      declineDeload(reason) {
        mutate((current) => ({
          ...current,
          deloads: [
            {
              id: newId('deload'),
              startDate: toIsoDate(),
              endDate: toIsoDate(),
              reason,
              status: 'declined',
              createdAt: Date.now(),
            },
            ...current.deloads,
          ],
        }))
      },

      completeDeload(id) {
        mutate((current) => {
          const next: AppData = {
            ...current,
            deloads: current.deloads.map((d) =>
              d.id === id ? { ...d, status: 'completed' as const, endDate: toIsoDate() } : d,
            ),
          }
          return awardInto(
            next,
            [simpleGrant('deload_completed', `deload:${id}`, 'Deload week completed.')],
            pushToast,
          )
        })
      },

      openPack(packId) {
        let revealed: string[] = []
        mutate((current) => {
          const result = openPackPure(current.game, packId)
          revealed = result.results.map((r) => r.itemId)
          if (result.coinsRefunded > 0) {
            pushToast({
              tone: 'reward',
              title: `+${result.coinsRefunded} coins`,
              body: 'Duplicates converted to coins.',
              icon: '⧉',
            })
          }
          return { ...current, game: result.game }
        })
        return revealed
      },

      buyPack(kind) {
        let packId: string | null = null
        mutate((current) => {
          const result = buyPackPure(current.game, kind)
          if (result.error) {
            pushToast({ tone: 'warn', title: 'Not enough coins', body: result.error })
            return current
          }
          packId = result.packId
          return { ...current, game: result.game }
        })
        return packId
      },

      buyTechnique() {
        let moveId: string | null = null
        mutate((current) => {
          // Seeded from the ledger length so a crate is reproducible from the
          // saved state rather than from a clock the engine cannot have.
          const result = buyTechniquePure(current.game, current.game.ledger.length + current.game.coins)
          if (result.error) {
            pushToast({ tone: 'warn', title: 'No scroll opened', body: result.error })
            return current
          }
          moveId = result.moveId
          const move = result.moveId ? MOVE_BY_ID[result.moveId] : undefined
          if (move) {
            pushToast({ tone: 'reward', title: `${move.name} unlocked`, body: move.lore, icon: '✦' })
          }
          return { ...current, game: result.game }
        })
        return moveId
      },

      equipItem(slot, itemId) {
        mutate((current) => ({
          ...current,
          game: {
            ...current.game,
            equipped: { ...current.game.equipped, [slot]: itemId },
            owned: current.game.owned.map((o) => (o.itemId === itemId ? { ...o, new: false } : o)),
          },
        }))
      },

      markItemSeen(itemId) {
        mutate((current) => ({
          ...current,
          game: {
            ...current.game,
            owned: current.game.owned.map((o) => (o.itemId === itemId ? { ...o, new: false } : o)),
          },
        }))
      },

      claimQuest(questId, periodKey) {
        const def = QUEST_BY_ID[questId]
        if (!def) return
        mutate((current) => {
          const already = current.game.quests.some(
            (q) => q.id === questId && q.periodKey === periodKey && q.claimedAt,
          )
          if (already) return current
          let game = {
            ...current.game,
            quests: [
              ...current.game.quests.filter((q) => !(q.id === questId && q.periodKey === periodKey)),
              { id: questId, periodKey, progress: def.target, claimedAt: Date.now() },
            ],
          }
          if (def.pack) {
            game = {
              ...game,
              packs: [
                ...game.packs,
                { id: newId('pack'), kind: def.pack, acquiredAt: Date.now(), openedAt: null, results: [] },
              ],
            }
            pushToast({ tone: 'reward', title: 'Pack earned', body: 'Waiting for you in the Forge.', icon: '▣' })
          }
          return awardInto(
            { ...current, game },
            [
              simpleGrant('quest_completed', `quest:${questId}:${periodKey}`, def.title, {
                xp: def.xp,
                coins: def.coins,
              }),
            ],
            pushToast,
          )
        })
      },

      replaceAll(next) {
        setData(next)
      },

      resetAll() {
        const fresh = createDefaultAppData()
        setData(fresh)
        void repository.save(fresh)
      },

      loadDemo() {
        // Imported lazily so the demo dataset never ships in the critical path.
        void import('@/seed/demo').then(({ buildDemoData }) => {
          setData(buildDemoData())
          pushToast({
            tone: 'info',
            title: 'Demo data loaded',
            body: 'Six weeks of realistic training. Reset any time from Profile.',
          })
        })
      },
    }
  }, [data, ready, ephemeral, toasts, pushToast, dismissToast, setData, awardInto])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

/** Achievement metadata lookup used by the achievements screen. */
export { ACHIEVEMENT_BY_ID }
