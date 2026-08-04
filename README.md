# FORGED

**Train your real body. Forge your warrior.**

FORGED is a mobile-first, offline-first fitness PWA that ties genuine physical progress to the
development of a dark-fantasy warrior. It is a working training app first and a game second: the
recommendation engine is deterministic, independently tested TypeScript, every recommendation shows
its reasoning and its evidence, and every reward is purely cosmetic.

**Live app:** https://bloxboss3-dotcom.github.io/gym/
**Repository:** https://github.com/bloxboss3-dotcom/gym

Open it in Safari on an iPhone and use *Share → Add to Home Screen* to install it. After the first
load it works with no network at all.

---

## What it actually does

| Area | What is implemented |
| --- | --- |
| **Onboarding** | 11 short steps covering body stats, experience, schedule, equipment, goals, endurance priority, diet, limitations and archetype — then generates a conservative starter program. |
| **Strength** | Full workout player: warm-up vs working sets, weight/reps/RIR, per-exercise pain and technique, substitutions, rest timer, previous-session recall, copy-last, set editing, notes, abandon and resume. |
| **Progression** | Double progression with pain overrides, plateau detection, back-offs and deload detection. Every recommendation carries an action, an exact next-session target, a plain-language reason, the rule that fired, a confidence level, the data it was missing, and a safety warning where relevant. |
| **Volume** | Weekly hard sets per muscle from a transparent exercise → muscle contribution map, completed vs planned, volume load, and conservative volume progression that will not escalate you toward extreme volume. |
| **Running** | Separate endurance engine: run types, pace, HR, session RPE, pain, surface; weekly load management that is *not* a blanket 10% rule; benchmark comparison; concurrent-training scheduling advice. |
| **Nutrition** | Protein baseline and practical range, remaining-today, meal distribution, weekly adherence, quick-add, saved foods, reusable meals, recent entries, budget picks. |
| **Recovery** | Readiness check-ins, soreness, sleep, joint pain, six-signal deload detection, deload history. |
| **Body** | Body-weight trend with a 7-day rolling average, measurements, optional on-device progress photos. |
| **Game** | XP, levels, coins, quests, achievements, four pack tiers, 70+ original cosmetic items across 11 slots, duplicate compensation, a full pack-opening sequence and live character customisation. |
| **Data** | Everything in IndexedDB on the device. Full JSON export/import with validation. Seeded six-week demo dataset. |

---

## Local development

Requires Node 22+.

```bash
npm install
npm run dev          # http://localhost:5173/gym/
```

Other scripts:

```bash
npm run typecheck    # tsc --build, no emit
npm run lint         # eslint
npm run test         # vitest (208 unit tests)
npm run build        # tsc --build && vite build → dist/
npm run preview      # serve dist/ at http://localhost:4173/gym/
npm run verify       # typecheck + lint + test + build, the same gate CI runs
npm run icons        # regenerate the PWA icons from scripts/generate-icons.mjs
npm run smoke        # end-to-end browser smoke test (see below)
```

### End-to-end smoke test

`npm run smoke` drives a real Chromium at an iPhone viewport through onboarding → workout →
recommendation → protein → run → dashboards → reload → offline → demo mode → pack opening, and fails
on any console error, horizontal overflow, undersized touch target or unlabelled control.

```bash
npx playwright install chromium   # one-time
npm run build && npm run preview  # terminal 1
npm run smoke                     # terminal 2
```

It is deliberately **not** part of CI, so CI never has to download a browser.

---

## Architecture

```
src/
├── config/          Every tunable number, in two documented files
│   ├── rules.ts       progression, plateau, deload, volume, protein, running, consistency
│   └── economy.ts     XP curve, payouts, daily caps, pack odds, duplicate refunds
├── data/            Static domain data
│   ├── exercises.ts   50 movements + the exercise → muscle contribution map
│   ├── muscles.ts     muscle registry and grouping
│   ├── items.ts       70+ original cosmetics across 11 slots
│   ├── quests.ts      quests + achievements
│   ├── foods.ts       small, fast protein list
│   └── citations.ts   every evidence source, with takeaways and caveats
├── engine/          Pure, deterministic, unit-tested TypeScript — no React, no I/O
│   ├── progression.ts double progression, pain override, plateau, confidence
│   ├── deload.ts      six-signal fatigue assessment
│   ├── volume.ts      weekly hard sets per muscle, planned vs completed
│   ├── running.ts     endurance load management + session planning
│   ├── protein.ts     targets, ranges, distribution, adherence
│   ├── consistency.ts consistency score, streak shields, rescheduling
│   ├── rewards.ts     reward calculation and anti-exploitation limits
│   ├── packs.ts       pack rolls, duplicate compensation
│   ├── quests.ts      derived quest/achievement progress
│   ├── program.ts     starter program generation
│   ├── schedule.ts    the adaptive "what should I do today" resolver
│   ├── stats.ts       estimated 1RM, PRs, trends, rolling averages
│   ├── units.ts       kg ↔ lb, increment rounding, pace, distance
│   └── backup.ts      export + defensive import validation
├── db/              Persistence, isolated behind one interface
│   ├── idb.ts         ~120-line IndexedDB wrapper with an in-memory fallback
│   ├── repo.ts        ForgedRepository interface + IndexedDB implementation
│   └── defaults.ts    default state and schema version
├── state/store.tsx  React context: the only place that mutates AppData
├── character/       The modular SVG warrior renderer
├── components/      Accessible component kit + hand-rolled SVG charts
├── screens/         19 screens
└── seed/demo.ts     Deterministic six-week demonstration dataset
```

### Two invariants worth knowing

1. **Every stored weight is in kilograms.** Pounds exist only where a number is shown to or typed by
   the user, so switching units never mutates data or changes a recommendation. Load *increments* are
   snapped to what your gym actually stocks — a pound user gets 5 lb jumps, not 2.27 kg conversions.
2. **The engine never touches React, storage or the network.** Every function in `src/engine/` takes
   plain data and returns plain data, which is why 208 tests can cover the decision-making directly.

### Designed for Supabase without a rewrite

`src/db/repo.ts` defines a single `ForgedRepository` interface (`load`, `save`, `clear`,
`isEphemeral`). Everything above it — the store, every screen, the whole engine — works with a plain
`AppData` object and never learns where the bytes live. Adding cloud sync means writing a second
implementation of that interface and choosing between them at startup. Supporting facts:

- Every record has a stable, opaque string `id` that can become a primary key unchanged.
- Every record is JSON-serialisable; `serializeBackup()` already produces exactly the payload a sync
  endpoint would send.
- `schemaVersion` plus `migrate()` gives a migration seam that already exists and is already tested.
- No engine function reads global state, `Date.now()` for decisions, or storage.

---

## The recommendation engine

**No language model makes any training decision.** An LLM cannot be unit-tested, cannot explain
itself reproducibly, and cannot be held to a safety threshold. Everything is deterministic
TypeScript: the same inputs always produce the same output, and there is a test asserting exactly
that.

### Primary model: double progression

Stay at a load until every working set reaches the top of the prescribed rep range at an appropriate
effort, with acceptable technique and low pain. Only then add the smallest useful increment.

> **Worked example.** Prescription is 3 × 8–12. You log 12, 12, 11 at about 2 RIR.
> FORGED keeps the load and asks for 12, 12, 12. Once you own that, it adds a plate and the reps fall
> back toward 8 — which is the plan working, not a setback.

### The rules, in priority order

| # | Condition | Action |
| --- | --- | --- |
| 1 | Pain ≥ 6/10 | Stop the movement, do not prescribe load, advise professional assessment |
| 2 | Pain ≥ 3/10, or technique broke down twice | Block any increase; substitute if it is recurring |
| 3 | All sets at top of range, average RIR 1–3, technique fine | Increase by the smallest available increment (≈2.5–5% upper body, 5–10% lower body) |
| 4 | All sets at top of range but average RIR ≤ 0 | Hold the load — grinding to failure is not a green light |
| 5 | More than half the sets below the bottom of the range | Reduce load ~10% |
| 6 | No meaningful progress for 3 comparable sessions | Hold, and audit adherence, sleep, soreness, pain, running load and proximity to failure |
| 7 | No meaningful progress for 4 comparable sessions | Change the movement or the rep target |
| 8 | Otherwise inside the range | Hold load, chase one more total rep |

Deload detection watches six independent signals over a 10-day window — broad performance decline,
elevated soreness, low readiness, persistent joint discomfort, sessions harder than prescribed, and
consecutive hard weeks. Three firing at once suggests a deload. **A prescribed rest day or a completed
deload counts as successful adherence** and pays out like any other completed session.

### Every recommendation carries

Recommended action · exact next-session target · plain-language reason · the named rule that fired ·
its citations · a confidence level · what data was missing or uncertain · a safety warning when
appropriate. The *Why this?* screen shows the full audit trail, including every session the engine
looked at.

### All thresholds live in one file

`src/config/rules.ts` holds every number the engine uses, documented inline. The tests assert
behaviour *relative* to those values wherever possible, so changing the config changes the app and
the tests still describe what it does. `src/config/economy.ts` does the same for the reward economy.

---

## Science sources

`src/data/citations.ts` is the single source of truth for evidence. Each entry carries a takeaway and
an honest caveat, and recommendation cards reference entries by id so the app and the Science &
Safety centre can never disagree.

Core sources include:

- **ACSM (2009)** *Progression Models in Resistance Training for Healthy Adults* — gradual, systematic
  progression; roughly 2–10% load increases once target reps are exceeded, smaller for upper body.
- **Garber et al. / ACSM (2011)** *Quantity and Quality of Exercise* — 2–3 days per muscle group per
  week, 2–4 sets, 8–12 reps for most adults, ≥48 h between sessions for the same muscle group.
- **Morton et al. (2018), BJSM** — protein supplementation adds small but real gains in fat-free mass
  and strength; the meta-regression breakpoint sits near **1.6 g/kg/day** with a CI reaching ~2.2.
  This is exactly why FORGED presents a *range*, not a mandate.
- **Schumann et al. (2022), Sports Medicine** — the updated concurrent-training meta-analysis: muscle
  size is not compromised and maximal strength is largely preserved; explosive strength is the clearest
  casualty. Paired with **Wilson et al. (2012)** for the older, more pessimistic read.
- **Schoenfeld et al. (2017)** on volume dose–response, **Refalo et al. (2023)** on proximity to
  failure, **Zourdos et al. (2016)** on the RIR scale, **Bell et al. (2020)** on overreaching,
  **Nielsen et al. (2014)** and **Damsted et al. (2018)** on why the 10% running rule is not
  well-supported, plus the ISSN protein position stand and ACSM pre-participation screening guidance.

**What FORGED will not claim.** It cannot measure or guarantee muscle gained. Nothing in the app
estimates body composition. It optimises the conditions under which growth is likely — stimulus,
protein, recovery, consistency — and reports on those honestly. Estimated 1RM is a formula fitted to
group data, and the app says so everywhere it appears.

This is educational fitness guidance, not medical advice. Pain, dizziness, chest discomfort or other
significant symptoms trigger an explicit stop-and-seek-help message.

---

## Deployment

GitHub Actions (`.github/workflows/ci.yml`) runs on every push:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. `npm run build`
6. asserts `dist/sw.js` and `dist/manifest.webmanifest` exist
7. uploads `dist/` and deploys to GitHub Pages (from `main`, from the current
   feature branch until it is merged, or from a manual **Run workflow**)

**One-time repository setup:** *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
Nothing else is required — no secrets, no tokens, no environment variables. Once that setting is
flipped, re-run the workflow (Actions → CI & Deploy → Run workflow) and the site publishes.

### Base path

`vite.config.ts` sets `base` to `/gym/`, matching the repository name, and it is overridable:

```bash
BASE_PATH=/ npm run build          # root domain (Netlify, Vercel, custom domain)
BASE_PATH=/other/ npm run build    # a differently-named repository
```

### Routing

Routing is **hash-based** (`/#/progress/volume`). GitHub Pages has no rewrite rules, so a history
router would 404 on refresh of any deep link. Hashes always resolve to `index.html`, which is also
exactly what the service worker serves offline — one shell, every route, no server configuration.

### Service worker

`scripts/sw-plugin.ts` generates `dist/sw.js` at build time with the precache list baked in and a
cache name derived from the content hash, so every deploy invalidates the old shell. It is ~60 lines
of generated code with no dependencies, which matters for an offline-first app that has to keep
working for years. Navigations are served cache-first from the shell; content-hashed assets are
cache-first; icons are best-effort so a missing one can never fail the install.

---

## Data and privacy

- **No account, no server, no analytics, no tracking.** There is no backend.
- Everything lives in your browser's IndexedDB, on that device only. Nothing is transmitted anywhere.
- Progress photos are down-scaled and stored on-device as data URLs. They never leave the phone.
- FORGED collects only what the engine actually uses to make training decisions. No email, no phone
  number, no location, no advertising identifier.
- **The corollary is real:** clearing browser data, deleting the app or losing the device loses your
  history. *Profile → Backup* exports everything as readable JSON and imports it back with validation.
- If IndexedDB is unavailable (some private-browsing modes), the app degrades to in-memory storage and
  says so prominently on the Profile screen rather than silently losing data.

---

## Known MVP limitations

- **Single device.** No cloud sync and no multi-device merge. Backup/restore is the migration path.
- **Manual entry only.** No HealthKit, Health Connect, GPS tracking or wearable import. Heart rate and
  run duration are typed in.
- **Protein only.** No calories, carbs, fats or micronutrients, and only a small starter food list —
  the design goal was five-second logging, not a food database.
- **Estimated 1RM is an estimate.** Epley with an RIR adjustment, clamped above 15 effective reps.
  Treat it as a trend line, not a number.
- **Deload detection is a prompt, not a diagnosis.** There is no validated consumer test for
  accumulated fatigue.
- **Exercise → muscle contributions are judgement calls.** They are visible and editable rather than
  hidden, but reasonable people will disagree with some of them.
- **No form checking.** No app can see your bar path.
- **RIR accuracy is a learned skill.** Early recommendations rest on noisy self-reports, which is why
  confidence levels exist and why the app tells you when data is thin.
- **Bodyweight movements are loaded as added weight**, not bodyweight-plus-load.
- **The character is stylised, not a body model.** It reflects earned gear, not your physique.

---

## Roadmap

**Supabase (auth + sync).** The seam already exists: implement `ForgedRepository` against Supabase,
add a `user_id` column to the flat record shape, and choose the implementation at startup. Last-write-
wins per collection with the existing `schemaVersion` covers the realistic conflict cases; the engine
and screens do not change. Row-level security keyed on `user_id` is the whole authorisation model.

**HealthKit / Health Connect.** Import body weight, sleep and workout heart rate to replace manual
check-in fields, and export completed sessions as workouts. Needs a native shell — see Capacitor.

**Apple Watch.** A companion app for the workout player specifically: set logging, the rest timer and
RIR entry on the wrist, syncing back to the phone. The session model is already a flat, serialisable
list of sets, so the watch payload is a subset of what already exists.

**Capacitor.** Wrap the same build for the App Store and Play Store: real background rest-timer
notifications, HealthKit/Health Connect access, and haptics beyond what the web exposes. `BASE_PATH=/`
already produces a build that works from a native file origin.

**Other candidates.** Barbell plate calculator, exercise demonstration animations reusing the SVG
renderer, CSV export for spreadsheet users, per-exercise custom rep-range presets, and an optional
opt-in cohort view of anonymised progression rates.

---

## Testing

208 unit tests across 12 files, plus a 33-check browser smoke test. Unit coverage:

weight-unit conversion · load-increment rounding (including gym-native pound plates) ·
protein-target calculation · double-progression decisions · pain override · plateau detection ·
deload detection · weekly muscle-volume calculation · running-load adjustment · benchmark comparison ·
consistency and streak protection · session rescheduling · reward calculation · duplicate-item
compensation · anti-exploitation reward limits · pack rolls and rarity floors · backup import
validation · IndexedDB persistence and migration · and the seeded demo dataset itself, asserted
against the real engines.

```bash
npm run verify   # typecheck + lint + test + build
```

The smoke test additionally verifies the full backup round trip — export a real file through the
browser's download path, erase everything, then import that file back and confirm every session is
restored.

---

## Demo mode

*Profile → Load demo data* seeds six weeks of deterministic, realistic training so every screen can be
inspected with real data: completed sessions, genuine strength progression, one deliberately stalled
lift, fatigue signals that trip the deload detector, imperfect protein adherence, a 5K benchmark that
improved from 25:12 to 24:09, earned equipment, two unopened packs and a customised warrior. *Erase
everything* returns to a clean install.

---

## Licence and attribution

All artwork is original and generated in code — modular SVG for the character and equipment, a
hand-written PNG encoder for the app icons. No copyrighted characters, logos, weapons or artwork are
used anywhere.
