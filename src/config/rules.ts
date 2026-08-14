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
    /**
     * Working sets this far below the heaviest one are a different weight, not
     * the same weight done badly.
     *
     * Reps only mean something next to the load they were done at. Judging
     * 25 lb × 12 and 45 lb × 10 as one block of "working sets" let a light
     * set count as having reached the top of the range, which held a load
     * that should have gone up — and said nothing about the two weights.
     */
    mixedLoadFraction: 0.1,
    /**
     * Reps past the top of the range before the smallest jump is the wrong
     * answer.
     *
     * Twelve reps against a cap of twelve is the top of the range. Eighteen
     * is not "the top of the range" at all, and calling it that while adding
     * the minimum increment leaves someone several sessions from a load that
     * actually challenges them.
     */
    repsPastTopForBigJump: 3,
    /**
     * Roughly how much load one rep is worth, as a fraction.
     *
     * A rule of thumb (~2–3% per rep in the 5–15 range), used only to size a
     * jump for somebody who is far past their rep range, and deliberately NOT
     * the Epley estimate the rest of the engine uses. Epley saturates at
     * fifteen effective reps, so on an eighteen-rep set — precisely the case
     * this exists for — it returns the smallest increment and the problem
     * stays exactly where it was.
     */
    loadPerExtraRepPct: 0.03,
    /** However far past the range, never leap more than this in one session. */
    maxSingleJumpPct: 0.2,
  },

  /** ------------------------------------------------------------------
   * The coaching verdict — am I getting anywhere, and am I working hard
   * enough to?
   *
   * Separate numbers from plateau detection on purpose. That answers "did
   * this session beat the last one", session to session. This answers "has
   * the load moved over a month", which is a different question and tolerates
   * far less noise: a mean-of-halves over four sessions will drift a percent
   * on rounding alone, and calling that progress would let somebody coast for
   * months while being congratulated.
   * ------------------------------------------------------------------ */
  coaching: {
    /** How far back a verdict looks. Long enough for load to move. */
    windowDays: 28,
    /** Below this many sessions on a movement, a trend is noise. */
    minSessions: 3,
    /** Change in estimated 1RM across the window that counts as a direction. */
    meaningfulTrendPct: 0.02,
    /** Fraction of judged movements that must be gaining to call it good. */
    gainingFraction: 0.6,
    /** Fraction leaving reps in the tank before that becomes the headline. */
    effortProblemFraction: 0.4,
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
   * Intensity techniques — drop sets, rest-pause, long-length partials.
   *
   * Read the numbers here alongside what the evidence actually says, because
   * the marketing around these techniques is far ahead of the data. In
   * controlled trials that equate volume, drop sets and rest-pause produce
   * hypertrophy comparable to straight sets — in noticeably less time. They
   * are a way to buy the last slice of weekly volume cheaply, not a way to
   * grow faster per set. FORGED therefore offers one only when volume for the
   * muscle is short, and never sells it as a shortcut.
   *
   * Long-length partials are the exception with a positive signal of its own:
   * training at long muscle lengths beats matched work at short lengths.
   * ------------------------------------------------------------------ */
  intensity: {
    /** Goals where a finisher is offered at all. */
    goals: ['hypertrophy', 'recomp'] as const,
    /**
     * How many finishers one session may carry.
     *
     * There is no session cap any more, and the honest reason is that there
     * never was any evidence for one. Two-per-session was a judgement call
     * dressed up in the same voice as the rules that ARE sourced, and it
     * refused a technique somebody wanted on movements where every
     * evidence-based condition was satisfied.
     *
     * What actually guards against overdoing it is already in the app and
     * is measured rather than guessed: a finisher is only offered when the
     * week is SHORT on volume for that muscle, never on a loaded spine or a
     * barbell you have to escape from, never through pain, never in a
     * deload — and the deload engine watches accumulated fatigue across the
     * week regardless.
     */
    maxPerExercise: 1,
    /**
     * Loading styles safe to take past failure without a spotter. A barbell
     * across your back or over your throat is not on this list, and no amount
     * of hypertrophy upside changes that.
     */
    safeLoading: ['stack', 'dumbbell_pair', 'dumbbell_single', 'bodyweight'] as const,
    /** Patterns excluded regardless of loading — a loaded spine near failure. */
    unsafePatterns: ['squat', 'hinge'] as const,
    /** Only offered once weekly sets for the target muscle are short by this. */
    setsShortOfRange: 1,
    /** Blocked at or above this reported pain (0–10). */
    painBlock: 3,
    /** Each drop cuts this fraction off the load before the next set. */
    dropLoadPct: 0.25,
    /**
     * How far either side of that target is just as good.
     *
     * The evidence behind drop sets says nothing about hitting a specific
     * number — the useful property is "meaningfully lighter, immediately".
     * Stacks and dumbbell racks have the jumps they have, and a target
     * printed to one decimal place reads as a requirement unless the band
     * around it is printed too.
     */
    dropTolerancePct: 0.2,
    /**
     * Drops in one drop set — the number that IS researched.
     *
     * The trial this app cites for drop sets (Fink 2018) had its subjects
     * take a set to failure and then perform THREE consecutive drops. The
     * app was prescribing one, which is not the protocol the evidence is
     * about, and then capping the session — restricting the parameter with
     * no support and under-delivering on the parameter with support.
     *
     * Two by default, adjustable to three. One is still allowed for anyone
     * who wants a lighter version.
     */
    dropCount: 2,
    dropCountRange: { min: 1, max: 3 },
    /* --------------------------------------------------------------------
     * Recognising a drop set that was simply logged.
     *
     * A drop set leaves a signature in the data — the load goes down and the
     * next set happens immediately — so asking somebody to accept a
     * challenge, do it, and then confirm it is three taps to record something
     * the app can already see. These are the bounds on "the weight was
     * lowered and you went straight back to work".
     * ------------------------------------------------------------------ */
    /**
     * A drop has to be a real cut, not a rounding wobble. Ten percent is the
     * same floor `dropLadder` uses when it builds the prescription, so what
     * counts as a drop coming out matches what counted going in.
     */
    detectMinDropPct: 0.1,
    /**
     * And not a bottomless one. Past this the load has more likely been typed
     * wrong, or the set belongs to a different movement, than been dropped —
     * the prescription itself never cuts more than 40%.
     */
    detectMaxDropPct: 0.6,
    /**
     * Seconds between the two sets, past which it stops being a drop set and
     * starts being a lighter set after a rest.
     *
     * A drop set is defined by not resting; the plate change plus reading the
     * screen and tapping Log is generously under two minutes, while a genuine
     * back-off set comes after a full prescribed rest, which is at least that
     * long. Sets logged in one batch at the end of an exercise land a few
     * seconds apart and still read correctly.
     */
    detectWindowSec: 150,
    /** Rest-pause: rest this long, then squeeze out another mini-set. */
    restPauseSec: 20,
    restPauseBursts: 2,
    /** Partials: continue in the stretched half of the range only. */
    partialsRangeFraction: 0.5,
    /**
     * How a finisher counts toward the weekly hard-set tally. A drop set is
     * extra work but not two fresh sets, and counting it as two would inflate
     * the volume dashboard into meaninglessness.
     */
    countsAsSets: { drop_set: 0.5, rest_pause: 0.5, long_length_partials: 0.5 },
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
   * Energy and macros.
   *
   * Every number here is an ESTIMATE. Predictive BMR equations carry roughly
   * ±10% error for an individual even when they are unbiased across a group,
   * and the activity multipliers are coarser still. FORGED says so in the UI,
   * and it never prescribes an aggressive deficit.
   * ------------------------------------------------------------------ */
  energy: {
    /** Mifflin-St Jeor sex constant. `unspecified` uses the midpoint. */
    mifflinConstant: { male: 5, female: -161, unspecified: -78 },
    /**
     * Non-exercise activity multiplier on BMR. Training is added separately, so
     * these are deliberately lower than the classic "activity factor" ladder,
     * which bakes exercise in and double-counts it for people who lift.
     */
    activityMultiplier: { desk: 1.25, light: 1.4, active: 1.55, physical: 1.7 },
    /** Rough net cost of resistance training, per minute of session time. */
    kcalPerLiftingMinute: 5,
    /** Net cost of running, per kg of body weight per km. */
    kcalPerKgPerKm: 0.95,
    /**
     * Daily energy offset by goal, as a fraction of maintenance. Deficits are
     * deliberately modest: faster loss costs lean mass and adherence.
     */
    goalOffsetPct: { hypertrophy: 0.1, strength: 0.06, recomp: -0.08, fatloss: -0.18, general: 0 },
    /** Hard caps so no goal can produce a silly number. */
    maxSurplusKcal: 400,
    /** Ceiling on the deficit as a fraction of body weight lost per week. */
    maxWeeklyLossFraction: 0.0075,
    /** Energy in a kg of mostly-fat tissue, used only to cap the deficit. */
    kcalPerKgTissue: 7700,
    /** A target is never allowed below BMR × this, nor below the floor. */
    minFractionOfBmr: 1.1,
    absoluteFloorKcal: { male: 1500, female: 1200, unspecified: 1200 },
    /**
     * Dietary fat floor: the larger of these two wins. Below roughly this
     * intake, fat-soluble vitamin and essential-fatty-acid intake gets hard to
     * meet and adherence tends to suffer.
     */
    minFatGPerKg: 0.8,
    minFatPctOfKcal: 0.2,
    /**
     * Where fat actually lands by default — comfortably above the floor. Sitting
     * a target exactly on its own floor is not a recommendation, it is an
     * artefact, and it pushes the carbohydrate number absurdly high.
     */
    targetFatPctOfKcal: 0.27,
    /** Calorie adherence counts a day as "on target" within this fraction. */
    kcalAdherenceTolerance: 0.1,
    kcalPerG: { protein: 4, carbs: 4, fat: 9 },
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
