import { useMemo, useState } from 'react'
import { Screen } from '@/components/AppShell'
import { BarChart } from '@/components/charts'
import { CitationList } from '@/components/RecommendationCard'
import {
  Alert,
  Button,
  Card,
  Chip,
  Disclosure,
  Field,
  IconButton,
  NumberStepper,
  ProgressBar,
  SectionHeading,
  SegmentedControl,
  Sheet,
  TextInput,
  Toggle,
  cx,
} from '@/components/ui'
import { BUDGET_PICKS, CATEGORY_LABEL, CATEGORY_ORDER, searchFoods } from '@/data/foods'
import { RULES } from '@/config/rules'
import {
  MEAL_LABEL,
  MEAL_SLOTS,
  calculateMacroTargets,
  defaultMealSlot,
  energyAdherence,
  groupByMeal,
  remainingKcal,
  scaleServing,
  totalsForDate,
} from '@/engine/nutrition'
import { distributeProtein, proteinAdherence } from '@/engine/protein'
import { formatDateLabel, lastNDays, toIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { useStore } from '@/state/store'
import type { FoodItem, Meal, MealSlot, ProteinEntry } from '@/types'

/**
 * Nutrition.
 *
 * The mental model is the one everybody already has from MyFitnessPal: a day
 * broken into meals, a number at the top that counts down, and a search box
 * that gets food into the log in three taps. What FORGED adds is that the
 * targets are explained rather than asserted, and that you can turn calories
 * off entirely and track protein alone.
 *
 * Deliberately NOT here: a barcode scanner, a million-item database, and a
 * network call. Logging has to work in a supermarket with no signal.
 */

type Tab = 'recent' | 'browse' | 'mine' | 'quick'

export default function Nutrition() {
  const store = useStore()
  const { data } = store
  const profile = data.profile!
  const today = toIsoDate()
  const fullMode = data.settings.nutritionMode !== 'protein'

  const [addFor, setAddFor] = useState<MealSlot | null>(null)
  const [foodOpen, setFoodOpen] = useState(false)
  const [mealOpen, setMealOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const plan = useMemo(() => calculateMacroTargets(profile), [profile])
  const { targets, energy } = plan

  const todaysEntries = useMemo(
    () => data.proteinEntries.filter((e) => e.date === today),
    [data.proteinEntries, today],
  )
  const totals = useMemo(() => totalsForDate(data.proteinEntries, today), [data.proteinEntries, today])
  const groups = useMemo(() => groupByMeal(todaysEntries), [todaysEntries])

  const week = useMemo(() => lastNDays(7, today), [today])
  const kcalWeek = useMemo(
    () => energyAdherence(data.proteinEntries, week, targets.kcal),
    [data.proteinEntries, week, targets.kcal],
  )
  const proteinWeek = useMemo(
    () => proteinAdherence(data.proteinEntries, week, targets.proteinG),
    [data.proteinEntries, week, targets.proteinG],
  )
  const mealPlan = useMemo(
    () => distributeProtein(targets.proteinG, data.settings.mealsPerDay),
    [targets.proteinG, data.settings.mealsPerDay],
  )

  const left = remainingKcal(targets.kcal, totals.kcal)

  return (
    <Screen
      title="Food"
      subtitle={
        fullMode
          ? `${Math.round(totals.kcal)} of ${targets.kcal} kcal today`
          : `${Math.round(totals.proteinG)} of ${targets.proteinG} g protein today`
      }
      action={
        <IconButton label="Nutrition settings" onClick={() => setSettingsOpen(true)}>
          <span aria-hidden>⚙</span>
        </IconButton>
      }
    >
      <div className="space-y-4">
        {/* The number you came here for --------------------------------- */}
        <Card raised>
          {fullMode ? (
            <div className="flex items-center gap-4">
              <CalorieRing consumed={totals.kcal} target={targets.kcal} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-smoke">
                  {left >= 0 ? 'Calories left' : 'Over target by'}
                </p>
                <p
                  className={cx(
                    'font-display text-5xl tabular leading-none mt-1',
                    left >= 0 ? 'text-ember-400' : 'text-caution',
                  )}
                >
                  {Math.abs(left)}
                </p>
                <p className="text-xs text-ash mt-1.5 tabular">
                  {Math.round(totals.kcal)} eaten · {targets.kcal} target
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-smoke">Protein left today</p>
              <p className="font-display text-5xl text-ember-400 tabular leading-none mt-1">
                {Math.max(0, Math.round(targets.proteinG - totals.proteinG))}
                <span className="text-xl text-ash">g</span>
              </p>
            </div>
          )}

          <div className={cx('grid gap-2.5 mt-4', fullMode ? 'grid-cols-3' : 'grid-cols-1')}>
            <MacroBar
              label="Protein"
              value={totals.proteinG}
              target={targets.proteinG}
              tone="ember"
            />
            {fullMode && (
              <MacroBar label="Carbs" value={totals.carbsG} target={targets.carbsG} tone="cool" />
            )}
            {fullMode && (
              <MacroBar label="Fat" value={totals.fatG} target={targets.fatG} tone="gold" />
            )}
          </div>

          {fullMode && totals.hasUnknownEnergy && (
            <p className="text-[11px] text-caution mt-2.5 leading-relaxed">
              Something logged today has protein but no calories — usually a quick-add or an older custom food. The
              calorie total below-counts until you fill it in.
            </p>
          )}
        </Card>

        {/* One obvious button ------------------------------------------- */}
        <Button
          variant="primary"
          full
          size="lg"
          onClick={() => setAddFor(defaultMealSlot(new Date().getHours()))}
        >
          Log food
        </Button>

        {/* The day, by meal ---------------------------------------------- */}
        <div className="space-y-3">
          {groups.map((group) => (
            <section key={group.slot} className="forge-panel overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate/70">
                <h2 className="font-display text-base uppercase tracking-wide flex-1 min-w-0 truncate">
                  {MEAL_LABEL[group.slot]}
                </h2>
                <span className="text-xs text-ash tabular shrink-0">
                  {fullMode
                    ? `${Math.round(group.totals.kcal)} kcal`
                    : `${Math.round(group.totals.proteinG)} g`}
                </span>
                <IconButton
                  label={`Add food to ${MEAL_LABEL[group.slot]}`}
                  onClick={() => setAddFor(group.slot)}
                  className="shrink-0"
                >
                  <span aria-hidden className="text-xl text-ember-400">
                    ＋
                  </span>
                </IconButton>
              </div>
              {group.entries.length ? (
                <ul>
                  {group.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-2 px-3.5 py-2 border-b border-slate/40 last:border-0"
                    >
                      <span className="flex-1 min-w-0 text-sm text-parchment truncate">{entry.label}</span>
                      <span className="text-xs text-ash tabular shrink-0">
                        {fullMode && entry.kcal != null && <>{entry.kcal} kcal · </>}
                        {Math.round(entry.grams)} g P
                      </span>
                      <IconButton
                        label={`Remove ${entry.label}`}
                        onClick={() => store.deleteProtein(entry.id)}
                        className="shrink-0"
                      >
                        <span aria-hidden>✕</span>
                      </IconButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddFor(group.slot)}
                  className="w-full touch-target px-3.5 py-3 text-left text-sm text-smoke hover:text-ash"
                >
                  Nothing logged — tap to add
                </button>
              )}
            </section>
          ))}
        </div>

        {/* Reusable meals ------------------------------------------------ */}
        <div>
          <SectionHeading
            title="Reusable meals"
            hint="Build once, log with one tap"
            action={
              <button
                type="button"
                onClick={() => setMealOpen(true)}
                className="text-sm text-ember-400 touch-target flex items-center"
              >
                New meal
              </button>
            }
          />
          {data.meals.length ? (
            <ul className="space-y-2">
              {data.meals.map((meal) => {
                const t = meal.items.reduce(
                  (acc, i) => ({
                    grams: acc.grams + i.grams,
                    kcal: acc.kcal + (i.kcal ?? 0),
                    carbsG: acc.carbsG + (i.carbsG ?? 0),
                    fatG: acc.fatG + (i.fatG ?? 0),
                  }),
                  { grams: 0, kcal: 0, carbsG: 0, fatG: 0 },
                )
                return (
                  <li key={meal.id} className="forge-panel flex items-center gap-2 px-3.5 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        store.addProtein({
                          date: today,
                          label: meal.name,
                          grams: t.grams,
                          kcal: t.kcal || undefined,
                          carbsG: t.carbsG || undefined,
                          fatG: t.fatG || undefined,
                          meal: defaultMealSlot(new Date().getHours()),
                          foodId: null,
                        })
                      }
                      className="flex-1 text-left touch-target min-w-0"
                    >
                      <span className="block text-sm text-parchment truncate">{meal.name}</span>
                      <span className="block text-[11px] text-smoke truncate">
                        {meal.items.map((i) => i.label).join(', ') || 'No items'}
                      </span>
                    </button>
                    <Chip tone="ember">
                      {fullMode && t.kcal > 0 ? `${Math.round(t.kcal)} kcal` : `${Math.round(t.grams)} g`}
                    </Chip>
                    <IconButton label={`Delete ${meal.name}`} onClick={() => store.deleteMeal(meal.id)}>
                      <span aria-hidden>🗑</span>
                    </IconButton>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Card>
              <p className="text-sm text-ash">
                Build a meal once — “post-gym shake and chicken wrap” — and log the whole thing with one tap from
                then on. It is the fastest way to log the food you actually eat every week.
              </p>
            </Card>
          )}
        </div>

        {/* This week ------------------------------------------------------ */}
        <Card>
          <SectionHeading
            title="This week"
            hint={
              fullMode
                ? `${kcalWeek.daysOnTarget} of 7 days within ${Math.round(RULES.energy.kcalAdherenceTolerance * 100)}% of target`
                : `${proteinWeek.daysHit} of 7 days at or above 90% of target`
            }
          />
          <BarChart
            ariaLabel={fullMode ? 'Daily calories this week' : 'Daily protein this week'}
            bars={(fullMode ? kcalWeek.perDay : proteinWeek.perDay).map((d) => ({
              label: formatDateLabel(d.date).slice(0, 3),
              value: 'kcal' in d ? d.kcal : d.grams,
              tone:
                'kcal' in d
                  ? d.onTarget
                    ? 'good'
                    : d.kcal > 0
                      ? 'caution'
                      : 'ember'
                  : d.hit
                    ? 'good'
                    : d.grams > 0
                      ? 'caution'
                      : 'ember',
            }))}
            format={(v) => `${Math.round(v)}`}
          />
          <p className="text-xs text-ash mt-2 leading-relaxed">
            {proteinWeek.daysTracked === 0
              ? 'Nothing logged this week yet.'
              : `Averaging ${proteinWeek.averageG} g of protein${fullMode && kcalWeek.averageKcal ? ` and ${kcalWeek.averageKcal} kcal` : ''} on the ${proteinWeek.daysTracked} days you tracked. Days with nothing logged count as unknown, not as failures.`}
          </p>
        </Card>

        {/* How the targets were reached ---------------------------------- */}
        <Card>
          <SectionHeading title="Why these targets" hint={`Confidence: ${energy.confidence}`} />
          {fullMode && <p className="text-sm text-ash leading-relaxed">{energy.reason}</p>}
          <p className="text-sm text-ash leading-relaxed mt-2">{plan.proteinRationale}</p>
          {fullMode && energy.deltaKcal !== 0 && (
            <p className="text-xs text-smoke mt-2 leading-relaxed">
              At this intake the arithmetic implies roughly {Math.abs(energy.projectedWeeklyKg)} kg
              {energy.projectedWeeklyKg < 0 ? ' lost' : ' gained'} per week. Real bodies do not follow the
              arithmetic exactly — check it against your own weight trend after two or three weeks and adjust.
            </p>
          )}
          {energy.warning && (
            <Alert tone="warn" className="mt-3">
              {energy.warning}
            </Alert>
          )}
          {energy.missingData.length > 0 && (
            <ul className="mt-3 space-y-1">
              {energy.missingData.map((gap) => (
                <li key={gap} className="text-xs text-smoke leading-relaxed">
                  • {gap}
                </li>
              ))}
            </ul>
          )}
          <Disclosure summary="Meal-by-meal protein split" tone="quiet">
            <ul className="space-y-1.5">
              {mealPlan.meals.map((m) => (
                <li key={m.index} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ash">{m.label}</span>
                  <span className="font-display text-base text-parchment tabular">{m.grams} g</span>
                </li>
              ))}
            </ul>
            {mealPlan.note && <p className="text-xs text-caution mt-2 leading-relaxed">{mealPlan.note}</p>}
            <p className="text-xs text-smoke mt-2 leading-relaxed">
              Distribution matters far less than the daily total. Aim for at least ~{RULES.protein.minPerMealG} g of
              quality protein per meal and stop optimising after that. Last meal around {data.settings.finalMealTime}.
            </p>
          </Disclosure>
          <Disclosure summary="Where these numbers come from" tone="quiet">
            <p className="mb-2">
              Protein: baseline {RULES.protein.baselineGPerKg} g/kg/day with a practical{' '}
              {RULES.protein.rangeGPerKg.min}–{RULES.protein.rangeGPerKg.max} g/kg/day range. Energy: Mifflin-St Jeor
              resting expenditure plus a non-exercise activity multiplier plus an estimate of your training, then a
              modest goal offset with hard caps on both the surplus and the deficit.
            </p>
            <CitationList ids={plan.citationIds} />
          </Disclosure>
        </Card>

        <Disclosure summary="Budget-friendly protein" tone="quiet">
          <ul className="list-disc pl-4 space-y-1">
            {BUDGET_PICKS.map((pick) => (
              <li key={pick}>{pick}</li>
            ))}
          </ul>
        </Disclosure>

        <Alert tone="info">
          These targets are estimates, not measurements. FORGED does not diagnose anything and is not a substitute
          for a registered dietitian — especially if you have a medical condition or any history of disordered
          eating. If counting calories is not good for you, switch to protein-only mode in the settings above and
          the app will never show you a calorie number again.
        </Alert>
      </div>

      {/* Sheets ----------------------------------------------------------- */}
      <AddFoodSheet
        slot={addFor}
        onClose={() => setAddFor(null)}
        onAdd={(entry) => {
          store.addProtein(entry)
          setAddFor(null)
        }}
        onNewFood={() => {
          setAddFor(null)
          setFoodOpen(true)
        }}
      />

      <Sheet open={foodOpen} onClose={() => setFoodOpen(false)} title="Custom food">
        <CustomFoodForm
          fullMode={fullMode}
          onSave={(food) => {
            store.saveFood(food)
            setFoodOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={mealOpen} onClose={() => setMealOpen(false)} title="Build a meal">
        <MealForm
          foods={data.foods}
          onSave={(meal) => {
            store.saveMeal(meal)
            setMealOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Nutrition settings">
        <div className="space-y-4">
          <Field
            label="What to track"
            hint="Protein only hides every calorie and carb/fat number in the app."
          >
            <SegmentedControl
              label="Nutrition mode"
              value={fullMode ? 'full' : 'protein'}
              onChange={(v) => store.updateSettings({ nutritionMode: v })}
              options={[
                { value: 'full', label: 'Calories + macros' },
                { value: 'protein', label: 'Protein only' },
              ]}
            />
          </Field>
          <Field label="Meals per day" hint="Only used for the suggested split — it does not change your target.">
            <NumberStepper
              label="Meals per day"
              value={data.settings.mealsPerDay}
              min={1}
              max={8}
              onChange={(v) => store.updateSettings({ mealsPerDay: v })}
            />
          </Field>
          <Field label="Preferred final meal time" htmlFor="final-meal">
            <input
              id="final-meal"
              type="time"
              value={data.settings.finalMealTime}
              onChange={(e) => store.updateSettings({ finalMealTime: e.target.value })}
              className="w-full h-12 rounded-xl bg-coal border border-slate px-3.5 text-parchment"
            />
          </Field>
          <Field label="Foods to avoid" hint="Comma separated. Matching foods are hidden from the list.">
            <TextInput
              value={data.settings.avoidFoods.join(', ')}
              placeholder="e.g. whey, shellfish"
              onChange={(e) =>
                store.updateSettings({
                  avoidFoods: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
          <Field label="Protein target override (g/day)" hint="Leave blank to use the calculated target.">
            <TextInput
              type="number"
              inputMode="numeric"
              value={profile.proteinOverrideG ?? ''}
              placeholder={String(targets.proteinG)}
              onChange={(e) =>
                store.updateProfile({ proteinOverrideG: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
          {fullMode && (
            <Field
              label="Calorie target override (kcal/day)"
              hint={`Leave blank to use the calculated target. Estimated maintenance is ${energy.maintenanceKcal} kcal.`}
            >
              <TextInput
                type="number"
                inputMode="numeric"
                value={profile.calorieOverrideKcal ?? ''}
                placeholder={String(energy.targetKcal)}
                onChange={(e) =>
                  store.updateProfile({ calorieOverrideKcal: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
          )}
          <Button variant="primary" full onClick={() => setSettingsOpen(false)}>
            Done
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** Calories as a ring, because a bar tells you less at a glance. */
function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const size = 96
  const stroke = 9
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const fraction = target > 0 ? Math.min(1, consumed / target) : 0
  const over = target > 0 && consumed > target
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="size-24 shrink-0 -rotate-90"
      role="img"
      aria-label={`${Math.round(consumed)} of ${target} calories eaten`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-steel)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={over ? 'var(--color-caution)' : 'var(--color-ember-500)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  )
}

function MacroBar({
  label,
  value,
  target,
  tone,
}: {
  label: string
  value: number
  target: number
  tone: 'ember' | 'cool' | 'gold'
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[11px] uppercase tracking-wider text-smoke">{label}</span>
        <span className="text-[11px] text-ash tabular">
          {Math.round(value)}/{Math.round(target)}
        </span>
      </div>
      <ProgressBar value={value} max={target} tone={tone} ariaLabel={`${label} progress`} className="mt-1" />
    </div>
  )
}

/**
 * The add-food flow.
 *
 * Two steps in one sheet: pick a thing, then confirm the portion. Recents come
 * first because the honest truth is that most people eat the same 20 foods, and
 * a repeat log should not require typing.
 */
function AddFoodSheet({
  slot,
  onClose,
  onAdd,
  onNewFood,
}: {
  slot: MealSlot | null
  onClose: () => void
  onAdd: (entry: Omit<ProteinEntry, 'id' | 'createdAt'>) => void
  onNewFood: () => void
}) {
  const { data } = useStore()
  const profile = data.profile!
  const today = toIsoDate()
  const fullMode = data.settings.nutritionMode !== 'protein'

  const [tab, setTab] = useState<Tab>('recent')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<FoodItem | null>(null)
  const [servings, setServings] = useState(1)
  const [quickG, setQuickG] = useState(25)
  const [quickKcal, setQuickKcal] = useState(200)
  const [targetSlot, setTargetSlot] = useState<MealSlot>(slot ?? 'snack')

  // Keep the slot in step with whichever "+" opened the sheet.
  const [lastSlot, setLastSlot] = useState<MealSlot | null>(slot)
  if (slot && slot !== lastSlot) {
    setLastSlot(slot)
    setTargetSlot(slot)
    setPicked(null)
    setQuery('')
    setTab('recent')
  }

  const blocked = data.settings.avoidFoods.map((a) => a.trim().toLowerCase()).filter(Boolean)
  const visible = useMemo(
    () =>
      data.foods.filter(
        (f) =>
          (f.custom || f.tags.includes(profile.diet)) &&
          !blocked.some((b) => f.name.toLowerCase().includes(b)),
      ),
    // `blocked` is derived from settings each render; depending on the source
    // array keeps the memo honest without re-deriving on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.foods, profile.diet, data.settings.avoidFoods],
  )

  const recents = useMemo(() => {
    const seen = new Map<string, ProteinEntry>()
    for (const e of data.proteinEntries.slice(0, 120)) {
      const key = e.foodId ?? e.label
      if (!seen.has(key)) seen.set(key, e)
    }
    return [...seen.values()].slice(0, 12)
  }, [data.proteinEntries])

  const results = useMemo(() => searchFoods(visible, query), [visible, query])
  const searching = query.trim().length > 0

  // Callers describe the food; the sheet owns the date and the meal slot.
  const add = (entry: Omit<ProteinEntry, 'id' | 'createdAt' | 'date' | 'meal'>) => {
    onAdd({ ...entry, date: today, meal: targetSlot })
    setPicked(null)
    setQuery('')
  }

  const scaled = picked ? scaleServing(picked, servings) : null

  return (
    <Sheet
      open={slot !== null}
      onClose={onClose}
      title={picked ? picked.name : `Add to ${MEAL_LABEL[targetSlot]}`}
      footer={
        picked && scaled ? (
          <Button
            variant="primary"
            full
            size="lg"
            onClick={() =>
              add({
                label: servings === 1 ? picked.name : `${picked.name} ×${servings}`,
                grams: scaled.proteinG,
                kcal: scaled.kcal,
                carbsG: scaled.carbsG,
                fatG: scaled.fatG,
                servings,
                foodId: picked.id,
              })
            }
          >
            Add {fullMode && scaled.kcal != null ? `${scaled.kcal} kcal` : `${scaled.proteinG} g`} to{' '}
            {MEAL_LABEL[targetSlot]}
          </Button>
        ) : undefined
      }
    >
      {picked && scaled ? (
        /* ---- Step 2: portion ---------------------------------------- */
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="touch-target flex items-center text-sm text-ember-400"
          >
            ← Back to list
          </button>
          <Field label="Servings" hint={picked.serving}>
            <NumberStepper
              label="Servings"
              value={servings}
              min={0.25}
              max={20}
              step={0.25}
              decimals={2}
              onChange={setServings}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {[0.5, 1, 1.5, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setServings(n)}
                className={cx(
                  'touch-target rounded-xl border text-sm font-semibold tabular',
                  servings === n
                    ? 'border-ember-500 bg-ember-500/15 text-ember-200'
                    : 'border-slate bg-coal text-ash',
                )}
              >
                ×{n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Macro label="kcal" value={fullMode ? (scaled.kcal ?? null) : null} />
            <Macro label="Protein" value={scaled.proteinG} suffix="g" />
            <Macro label="Carbs" value={fullMode ? (scaled.carbsG ?? null) : null} suffix="g" />
            <Macro label="Fat" value={fullMode ? (scaled.fatG ?? null) : null} suffix="g" />
          </div>
          <Field label="Meal">
            <SegmentedControl
              label="Meal"
              value={targetSlot}
              onChange={setTargetSlot}
              columns={4}
              options={MEAL_SLOTS.map((s) => ({ value: s, label: MEAL_LABEL[s] }))}
            />
          </Field>
        </div>
      ) : (
        /* ---- Step 1: pick ------------------------------------------- */
        <div className="space-y-3">
          <TextInput
            type="search"
            value={query}
            aria-label="Search foods"
            placeholder="Search foods…"
            onChange={(e) => setQuery(e.target.value)}
          />

          {!searching && (
            <SegmentedControl
              label="Food list"
              value={tab}
              onChange={setTab}
              columns={4}
              options={[
                { value: 'recent', label: 'Recent' },
                { value: 'browse', label: 'All' },
                { value: 'mine', label: 'Mine' },
                { value: 'quick', label: 'Quick' },
              ]}
            />
          )}

          {searching ? (
            results.length ? (
              <FoodList foods={results} fullMode={fullMode} onPick={(f) => (setPicked(f), setServings(1))} />
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-ash">Nothing matching “{query}”.</p>
                <Button className="mt-3" onClick={onNewFood}>
                  Create “{query.trim().slice(0, 24)}”
                </Button>
              </div>
            )
          ) : tab === 'recent' ? (
            recents.length ? (
              <ul className="space-y-1.5">
                {recents.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() =>
                        add({
                          label: entry.label,
                          grams: entry.grams,
                          kcal: entry.kcal,
                          carbsG: entry.carbsG,
                          fatG: entry.fatG,
                          servings: entry.servings,
                          foodId: entry.foodId ?? null,
                        })
                      }
                      className="w-full touch-target flex items-center gap-2 rounded-xl border border-slate bg-coal px-3.5 py-2.5 text-left"
                    >
                      <span className="flex-1 min-w-0 text-sm text-parchment truncate">{entry.label}</span>
                      <span className="text-xs text-ash tabular shrink-0">
                        {fullMode && entry.kcal != null ? `${entry.kcal} kcal` : `${Math.round(entry.grams)} g`}
                      </span>
                      <span aria-hidden className="text-ember-400 text-lg shrink-0">
                        ＋
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ash text-center py-6">
                Nothing logged yet. Search above, or browse the list — anything you log shows up here for one-tap
                repeats.
              </p>
            )
          ) : tab === 'browse' ? (
            <div className="space-y-4">
              {CATEGORY_ORDER.map((category) => {
                const foods = visible.filter((f) => f.category === category)
                if (!foods.length) return null
                return (
                  <div key={category}>
                    <h3 className="text-[11px] uppercase tracking-wider text-smoke mb-1.5">
                      {CATEGORY_LABEL[category]}
                    </h3>
                    <FoodList foods={foods} fullMode={fullMode} onPick={(f) => (setPicked(f), setServings(1))} />
                  </div>
                )
              })}
            </div>
          ) : tab === 'mine' ? (
            <div className="space-y-3">
              <Button full onClick={onNewFood}>
                Create a custom food
              </Button>
              {visible.filter((f) => f.custom).length ? (
                <FoodList
                  foods={visible.filter((f) => f.custom)}
                  fullMode={fullMode}
                  onPick={(f) => (setPicked(f), setServings(1))}
                />
              ) : (
                <p className="text-sm text-ash text-center py-4">
                  No custom foods yet. Add the things you eat that are not on the list once, and they stay one tap
                  away forever.
                </p>
              )}
            </div>
          ) : (
            /* ---- Quick add, for when you just know the number -------- */
            <div className="space-y-3">
              <p className="text-sm text-ash leading-relaxed">
                No searching. Put in the numbers you already know — a packet label, a restaurant estimate, a guess
                you are happy with.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[20, 25, 30, 40].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => add({ label: `${g} g protein`, grams: g, foodId: null })}
                    className="touch-target rounded-xl border border-ember-500/40 bg-ember-500/10 text-ember-200 font-semibold tabular"
                  >
                    +{g}g
                  </button>
                ))}
              </div>
              <Field label="Protein">
                <NumberStepper label="Quick protein grams" value={quickG} min={1} max={300} step={5} suffix="g" onChange={setQuickG} />
              </Field>
              {fullMode && (
                <Field label="Calories" hint="Optional — leave it if you only care about protein.">
                  <NumberStepper
                    label="Quick calories"
                    value={quickKcal}
                    min={0}
                    max={3000}
                    step={25}
                    suffix="kcal"
                    onChange={setQuickKcal}
                  />
                </Field>
              )}
              <Field label="Meal">
                <SegmentedControl
                  label="Meal"
                  value={targetSlot}
                  onChange={setTargetSlot}
                  columns={4}
                  options={MEAL_SLOTS.map((s) => ({ value: s, label: MEAL_LABEL[s] }))}
                />
              </Field>
              <Button
                variant="primary"
                full
                onClick={() =>
                  add({
                    label: fullMode ? `Quick add · ${quickG} g protein` : `${quickG} g protein`,
                    grams: quickG,
                    kcal: fullMode && quickKcal > 0 ? quickKcal : undefined,
                    foodId: null,
                  })
                }
              >
                Add to {MEAL_LABEL[targetSlot]}
              </Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

function FoodList({
  foods,
  fullMode,
  onPick,
}: {
  foods: FoodItem[]
  fullMode: boolean
  onPick: (food: FoodItem) => void
}) {
  return (
    <ul className="space-y-1.5">
      {foods.map((food) => (
        <li key={food.id}>
          <button
            type="button"
            onClick={() => onPick(food)}
            className="w-full touch-target flex items-center gap-2 rounded-xl border border-slate bg-coal px-3.5 py-2.5 text-left"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-parchment truncate">{food.name}</span>
              <span className="block text-[11px] text-smoke truncate">
                {food.serving}
                {fullMode && food.kcal != null ? ` · ${food.kcal} kcal` : ''} · {food.proteinG} g protein
              </span>
            </span>
            <span aria-hidden className="text-ember-400 text-lg shrink-0">
              ›
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Macro({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="rounded-xl border border-slate bg-coal px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-smoke">{label}</p>
      <p className="font-display text-lg text-parchment tabular leading-tight">
        {value == null ? '—' : `${value}${suffix}`}
      </p>
    </div>
  )
}

function CustomFoodForm({ fullMode, onSave }: { fullMode: boolean; onSave: (food: FoodItem) => void }) {
  const [name, setName] = useState('')
  const [protein, setProtein] = useState(25)
  const [kcal, setKcal] = useState(200)
  const [carbs, setCarbs] = useState(20)
  const [fat, setFat] = useState(8)
  const [serving, setServing] = useState('1 serving')
  const [budget, setBudget] = useState(false)
  return (
    <div className="space-y-4">
      <Field label="Food name" htmlFor="food-name" required>
        <TextInput
          id="food-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My protein bowl"
        />
      </Field>
      <Field label="Serving description" htmlFor="food-serving">
        <TextInput id="food-serving" value={serving} onChange={(e) => setServing(e.target.value)} />
      </Field>
      <Field label="Protein per serving">
        <NumberStepper label="Protein grams" value={protein} min={0} max={200} suffix="g" onChange={setProtein} />
      </Field>
      {fullMode && (
        <>
          <Field label="Calories per serving">
            <NumberStepper label="Calories" value={kcal} min={0} max={2000} step={10} suffix="kcal" onChange={setKcal} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Carbs">
              <NumberStepper label="Carb grams" value={carbs} min={0} max={300} step={5} suffix="g" onChange={setCarbs} />
            </Field>
            <Field label="Fat">
              <NumberStepper label="Fat grams" value={fat} min={0} max={200} step={1} suffix="g" onChange={setFat} />
            </Field>
          </div>
        </>
      )}
      <Toggle
        checked={budget}
        onChange={setBudget}
        label="Budget friendly"
        hint="Shows up in cheap-protein suggestions."
      />
      <Button
        variant="primary"
        full
        disabled={!name.trim()}
        onClick={() =>
          onSave({
            id: newId('food'),
            name: name.trim(),
            proteinG: protein,
            kcal: fullMode ? kcal : undefined,
            carbsG: fullMode ? carbs : undefined,
            fatG: fullMode ? fat : undefined,
            serving,
            category: 'meals',
            tags: ['omnivore', 'pescatarian', 'vegetarian', 'vegan', 'halal', 'kosher', 'dairy_free'],
            budgetFriendly: budget,
            custom: true,
          })
        }
      >
        Save food
      </Button>
    </div>
  )
}

/**
 * Reusable meals are now assembled from real foods rather than typed grams, so
 * a saved meal carries proper macros instead of a protein number in isolation.
 */
function MealForm({ foods, onSave }: { foods: FoodItem[]; onSave: (meal: Meal) => void }) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Meal['items']>([])

  const results = useMemo(() => searchFoods(foods, query).slice(0, query ? 12 : 8), [foods, query])
  const total = items.reduce(
    (acc, i) => ({ grams: acc.grams + i.grams, kcal: acc.kcal + (i.kcal ?? 0) }),
    { grams: 0, kcal: 0 },
  )

  return (
    <div className="space-y-4">
      <Field label="Meal name" htmlFor="meal-name" required>
        <TextInput
          id="meal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Post-gym"
        />
      </Field>

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="forge-panel flex items-center gap-2 px-3 py-2">
              <span className="flex-1 min-w-0 text-sm text-parchment truncate">{item.label}</span>
              <span className="text-xs text-ash tabular shrink-0">{Math.round(item.grams)} g P</span>
              <IconButton
                label={`Remove ${item.label}`}
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
              >
                <span aria-hidden>✕</span>
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Field label="Add items" htmlFor="meal-search">
        <TextInput
          id="meal-search"
          type="search"
          value={query}
          placeholder="Search foods…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </Field>
      <ul className="space-y-1.5">
        {results.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    label: food.name,
                    grams: food.proteinG,
                    kcal: food.kcal,
                    carbsG: food.carbsG,
                    fatG: food.fatG,
                    foodId: food.id,
                  },
                ])
              }
              className="w-full touch-target flex items-center gap-2 rounded-xl border border-slate bg-coal px-3.5 py-2 text-left"
            >
              <span className="flex-1 min-w-0 text-sm text-parchment truncate">{food.name}</span>
              <span aria-hidden className="text-ember-400 text-lg shrink-0">
                ＋
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <span className="text-sm text-ash">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
        <span className={cx('font-display text-xl tabular', total.grams > 0 ? 'text-ember-400' : 'text-smoke')}>
          {Math.round(total.grams)} g P{total.kcal > 0 ? ` · ${Math.round(total.kcal)} kcal` : ''}
        </span>
      </div>
      <Button
        variant="primary"
        full
        disabled={!name.trim() || items.length === 0}
        onClick={() => onSave({ id: newId('meal'), name: name.trim(), items, custom: true })}
      >
        Save meal
      </Button>
    </div>
  )
}
