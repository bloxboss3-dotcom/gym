/**
 * FORGED progression rules — the single source of truth for every threshold the
 * recommendation engine uses.
 *
 * Nothing in `src/engine/` may hard-code a number that belongs here. If you want
 * to make FORGED more or less aggressive, edit this file and re-run the tests;
 * the engine tests assert behaviour *relative* to these values wherever possible.
 *
 * These numbers are defensible defaults drawn from mainstream resistance-training
 * guidance (see `src/data/citations.ts`), not laws of nature. They are starting
 * points that the app nudges gradually per person — FORGED never claims to know
 * exactly how much muscle you gained.
 */

export const RULES = {
  /** ------------------------------------------------------------------
   * Double progression — the primary model.
   * Stay at a load until every working set hits the top of the rep range at
   * an appropriate effort, then add the smallest useful increment.
   * ------------------------------------------------------------------ */
  progression: {
    /** Effort window (reps in reserve) where adding load is appropriate. */
    rirWindow: { min: 1, max: 3 },
    /**
     * Average RIR at or below this on a top-of-range session means the set was
     * closer to failure than intended — still progress, but flagged.
     */
    recklessRIR: 0,
    /** Pain (0–10) at or above this blocks any load increase. */
    painBlockThreshold: 3,
    /** Pain at or above this triggers a stop-and-seek-guidance message. */
    painStopThreshold: 6,
    /** Fraction of working sets that must reach repMax to earn a load increase. */
    topOfRangeFraction: 1.0,
    /**
     * When more than this fraction of working sets falls below repMin, the load
     * is too heavy — hold or back off rather than pushing on.
     */
    underRangeFraction: 0.5,
    /** Back-off size when a load is clearly too heavy. */
    backoffPct: 0.1,
    /** Percentage guard-rails on a single jump. */
    upperBodyStepPct: { min: 0.025, max: 0.05 },
    lowerBodyStepPct: { min: 0.05, max: 0.1 },
    /** Reps to add when staying inside the range (total across all sets). */
    repIncrementTarget: 1,
  },

  /** ------------------------------------------------------------------
   * Plateau detection.
   * ------------------------------------------------------------------ */
  plateau: {
    /** Comparable sessions with no meaningful progress before we call a stall. */
    sessionsToStall: 3,
    /**
     * Session-to-session change in best-set estimated 1RM below this counts as
     * "no meaningful progress" (fraction, so 0.01 = 1%).
     */
    meaningfulGainPct: 0.01,
    /** Once stalled this many times in a row, suggest changing the movement. */
    sessionsToSubstitute: 4,
  },

  /** ------------------------------------------------------------------
   * Deload detection. Any `triggerCount` of these signals fires a suggestion.
   * A deload is *productive training*, not a failure — it counts as adherence.
   * ------------------------------------------------------------------ */
  deload: {
    triggerCount: 3,
    /** Look-back window for the signals below. */
    windowDays: 10,
    /** Fraction of tracked exercises regressing = broad performance decline. */
    broadDeclineFraction: 0.4,
    /** Mean soreness (1–5) at or above this is elevated. */
    sorenessThreshold: 3.5,
    /** Mean readiness (1–5) at or below this is low. */
    readinessThreshold: 2.5,
    /** Mean joint pain (0–10) at or above this is persistent discomfort. */
    jointPainThreshold: 3,
    /** Sessions inside the window that felt harder than prescribed. */
    hardSessionsThreshold: 3,
    /** Consecutive hard training weeks before a deload is worth considering. */
    weeksBeforeDeload: 6,
    /** Suggested load/volume reduction during a deload week. */
    loadReductionPct: 0.4,
    volumeReductionPct: 0.4,
    /** Don't nag: minimum days between deload suggestions. */
    cooldownDays: 21,
  },

  /** ------------------------------------------------------------------
   * Weekly volume. ~10 hard sets/muscle/week is a common hypertrophy
   * reference point, NOT a requirement, and NOT a target everyone should
   * escalate past. More is not automatically better.
   * ------------------------------------------------------------------ */
  volume: {
    referenceSetsPerMuscle: 10,
    /** Conservative starting ranges by experience (hard sets/muscle/week). */
    startingRange: {
      beginner: { min: 6, max: 10 },
      intermediate: { min: 8, max: 14 },
      advanced: { min: 10, max: 18 },
    },
    /** Hard ceiling the app will never auto-escalate past. */
    autoCeiling: 20,
    /** Max sets/muscle the app will add per week when progressing volume. */
    weeklyAddCap: 2,
    /** A set counts toward "hard sets" when RIR is at or below this. */
    hardSetRirCutoff: 4,
    /** Indirect contribution below this is ignored in the weekly tally. */
    minContribution: 0.25,
  },

  /** ------------------------------------------------------------------
   * Protein. Baseline 1.6 g/kg/day; practical range 1.6–2.2 g/kg/day.
   * The top of the range is an option (dieting / very lean / extra margin),
   * never a mandate.
   * ------------------------------------------------------------------ */
  protein: {
    baselineGPerKg: 1.6,
    rangeGPerKg: { min: 1.6, max: 2.2 },
    /**
     * Where inside the range FORGED points you, by goal. Everything here sits
     * inside 1.6–2.2 g/kg; the top of the range is an option for people dieting
     * or who want extra margin, never a requirement.
     */
    recommendedGPerKgByGoal: {
      hypertrophy: 1.8,
      strength: 1.8,
      recomp: 2.0,
      fatloss: 2.0,
      general: 1.6,
    },
    /** Above this BMI, lean-mass-based estimates are used to avoid over-shooting. */
    useLeanEstimateBmi: 30,
    /** Assumed body-fat fraction when estimating lean mass at high BMI. */
    highBmiLeanFactor: 0.75,
    /** Adherence counts a day as "hit" at or above this fraction of target. */
    adherenceFraction: 0.9,
    defaultMeals: 4,
    /** Per-meal protein floor that most people can actually hit. */
    minPerMealG: 20,
  },

  /** ------------------------------------------------------------------
   * Running / endurance. Deliberately NOT a blind 10% rule.
   * ------------------------------------------------------------------ */
  running: {
    /** Weekly volume change caps by experience (fraction of last week). */
    weeklyIncreaseCap: { beginner: 0.08, intermediate: 0.1, advanced: 0.12 },
    /** Never add more than this many km in a single week regardless of %. */
    absoluteWeeklyAddKm: 8,
    /** Below this weekly volume, % rules are meaningless — use flat steps. */
    lowVolumeKm: 10,
    lowVolumeAddKm: 1.5,
    /** Hold volume when the previous week's completion rate is below this. */
    completionHoldFraction: 0.8,
    /** Mean session RPE at or above this means hold, don't add. */
    highRpeThreshold: 8,
    /** Any run pain at or above this reduces load. */
    painReduceThreshold: 3,
    reductionPct: 0.2,
    /** Longest run share of weekly volume we won't exceed. */
    longRunMaxFraction: 0.35,
    /** Muscle-first users cap quality running sessions per week. */
    qualitySessionsByPriority: { muscle: 1, balanced: 2, endurance: 3 },
    /** Hours to keep between hard running and hard lower-body lifting. */
    interferenceSpacingHours: 6,
    /** New runners start with walk/run intervals below this weekly volume. */
    walkRunUnderKm: 8,
    /** Benchmark/time-trial spacing. */
    benchmarkMinDays: 28,
  },

  /** ------------------------------------------------------------------
   * Consistency. A missed day must never delete meaningful progress.
   * ------------------------------------------------------------------ */
  consistency: {
    /** Rolling window for the consistency score. */
    windowDays: 28,
    /** Free "shields" that absorb a missed planned day. */
    maxShields: 2,
    shieldRefillDays: 14,
    /** Missed sessions are rescheduled up to this many days later. */
    rescheduleWithinDays: 3,
    /** Prescribed rest and deload days count as successful adherence. */
    restCountsAsAdherence: true,
  },

  /** ------------------------------------------------------------------
   * Confidence levels attached to every recommendation.
   * ------------------------------------------------------------------ */
  confidence: {
    /** Comparable sessions needed before a recommendation is "high" confidence. */
    highSessions: 3,
    mediumSessions: 2,
    /** Missing RIR on more than this fraction of sets downgrades confidence. */
    missingRirFraction: 0.34,
  },
} as const

export type Rules = typeof RULES
