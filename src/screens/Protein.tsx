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
  Sheet,
  TextInput,
  Toggle,
  cx,
} from '@/components/ui'
import { BUDGET_PICKS, foodsForDiet } from '@/data/foods'
import { RULES } from '@/config/rules'
import {
  calculateProteinTarget,
  distributeProtein,
  proteinAdherence,
  proteinForDate,
  proteinRemaining,
} from '@/engine/protein'
import { formatDateLabel, lastNDays, toIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { useStore } from '@/state/store'
import type { FoodItem, Meal } from '@/types'

/**
 * Protein tracker.
 *
 * Optimised for speed, not for having a database of every food on earth. Quick
 * add, saved foods, reusable meals, and recent entries cover the realistic case:
 * you know roughly what you ate and want it logged in five seconds.
 */
export default function Protein() {
  const store = useStore()
  const { data } = store
  const profile = data.profile!
  const today = toIsoDate()

  const [quick, setQuick] = useState(30)
  const [foodOpen, setFoodOpen] = useState(false)
  const [mealOpen, setMealOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const target = useMemo(() => calculateProteinTarget(profile), [profile])
  const consumed = proteinForDate(data.proteinEntries, today)
  const remaining = proteinRemaining(target.targetG, consumed)
  const plan = useMemo(
    () => distributeProtein(target.targetG, data.settings.mealsPerDay),
    [target.targetG, data.settings.mealsPerDay],
  )
  const week = useMemo(
    () => proteinAdherence(data.proteinEntries, lastNDays(7, today), target.targetG),
    [data.proteinEntries, today, target.targetG],
  )

  const todaysEntries = data.proteinEntries.filter((e) => e.date === today)
  const recentLabels = useMemo(() => {
    const seen = new Map<string, number>()
    for (const entry of data.proteinEntries.slice(0, 60)) {
      if (!seen.has(entry.label)) seen.set(entry.label, entry.grams)
    }
    return [...seen.entries()].slice(0, 8)
  }, [data.proteinEntries])

  const foods = useMemo(
    () => [
      ...foodsForDiet(profile.diet, data.settings.avoidFoods),
      ...data.foods.filter((f) => f.custom),
    ],
    [profile.diet, data.settings.avoidFoods, data.foods],
  )

  const add = (label: string, grams: number, foodId?: string) => {
    if (grams <= 0) return
    store.addProtein({ date: today, label, grams, foodId: foodId ?? null })
  }

  return (
    <Screen
      title="Protein"
      subtitle={`${Math.round(consumed)} of ${target.targetG} g today`}
      back="/progress"
      action={
        <IconButton label="Nutrition settings" onClick={() => setSettingsOpen(true)}>
          <span aria-hidden>⚙</span>
        </IconButton>
      }
    >
      <div className="space-y-4">
        <Card raised>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-smoke">Remaining today</p>
              <p className="font-display text-5xl text-ember-400 tabular leading-none mt-1">{remaining}<span className="text-xl text-ash">g</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ash tabular">{Math.round(consumed)} / {target.targetG} g</p>
              <p className="text-[11px] text-smoke">{target.gPerKg} g/kg</p>
            </div>
          </div>
          <ProgressBar value={consumed} max={target.targetG} className="mt-3" tone="ember" />
          <p className="text-xs text-ash mt-2 leading-relaxed">{target.rationale}</p>
          {target.usedLeanEstimate && (
            <p className="text-[11px] text-caution mt-1.5 leading-relaxed">
              Your target is scaled to an estimated lean body mass rather than total body weight, because scaling
              protein off total weight over-shoots at a higher BMI. It is an estimate, not a body-composition
              measurement.
            </p>
          )}
        </Card>

        {/* Quick add ------------------------------------------------------- */}
        <Card>
          <SectionHeading title="Quick add" hint="Five seconds, no searching." />
          <div className="grid grid-cols-4 gap-2">
            {[20, 25, 30, 40].map((grams) => (
              <button
                key={grams}
                type="button"
                onClick={() => add(`${grams} g protein`, grams)}
                className="touch-target rounded-xl border border-ember-500/40 bg-ember-500/10 text-ember-200 font-semibold tabular"
              >
                +{grams}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2.5">
            <NumberStepper
              label="Custom grams"
              value={quick}
              min={1}
              max={300}
              step={5}
              suffix="g"
              className="flex-1"
              onChange={setQuick}
            />
            <Button variant="primary" onClick={() => add(`${quick} g protein`, quick)}>
              Add
            </Button>
          </div>
        </Card>

        {/* Recents --------------------------------------------------------- */}
        {recentLabels.length > 0 && (
          <Card>
            <SectionHeading title="Recent" />
            <ul className="flex flex-wrap gap-1.5">
              {recentLabels.map(([label, grams]) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => add(label, grams)}
                    className="touch-target rounded-full border border-slate bg-coal px-3 text-sm text-ash hover:border-edge"
                  >
                    {label} <span className="text-smoke tabular">{grams}g</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Saved foods ------------------------------------------------------ */}
        <div>
          <SectionHeading
            title="Foods"
            hint={`Filtered for ${profile.diet.replace('_', ' ')}`}
            action={
              <button
                type="button"
                onClick={() => setFoodOpen(true)}
                className="text-sm text-ember-400 touch-target flex items-center"
              >
                Add custom
              </button>
            }
          />
          <ul className="grid grid-cols-2 gap-2">
            {foods.slice(0, 14).map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => add(food.name, food.proteinG, food.id)}
                  className="w-full text-left touch-target rounded-xl border border-slate bg-coal px-3 py-2.5"
                >
                  <span className="block text-sm text-parchment truncate">{food.name}</span>
                  <span className="block text-[11px] text-smoke">
                    {food.proteinG} g · {food.serving}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Meals ------------------------------------------------------------ */}
        <div>
          <SectionHeading
            title="Reusable meals"
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
                const total = meal.items.reduce((s, i) => s + i.grams, 0)
                return (
                  <li key={meal.id} className="forge-panel flex items-center gap-2 px-3.5 py-3">
                    <button
                      type="button"
                      onClick={() => add(meal.name, total)}
                      className="flex-1 text-left touch-target min-w-0"
                    >
                      <span className="block text-sm text-parchment truncate">{meal.name}</span>
                      <span className="block text-[11px] text-smoke truncate">
                        {meal.items.map((i) => `${i.label} ${i.grams}g`).join(' · ')}
                      </span>
                    </button>
                    <Chip tone="ember">{total} g</Chip>
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
                Build a meal once — “post-gym shake and chicken wrap” — and log it with one tap from then on.
              </p>
            </Card>
          )}
        </div>

        {/* Distribution ----------------------------------------------------- */}
        <Card>
          <SectionHeading title="Meal distribution" hint={`Across ${plan.meals.length} meals`} />
          <ul className="space-y-2">
            {plan.meals.map((meal) => (
              <li key={meal.index} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ash">{meal.label}</span>
                <span className="font-display text-lg text-parchment tabular">{meal.grams} g</span>
              </li>
            ))}
          </ul>
          {plan.note && <p className="text-xs text-caution mt-2 leading-relaxed">{plan.note}</p>}
          <p className="text-xs text-smoke mt-2 leading-relaxed">
            Distribution matters much less than the daily total. Aim for at least ~{RULES.protein.minPerMealG} g of
            quality protein per meal and stop optimising after that. Last meal around {data.settings.finalMealTime}.
          </p>
        </Card>

        {/* Weekly adherence -------------------------------------------------- */}
        <Card>
          <SectionHeading title="This week" hint={`${week.daysHit} of 7 days at or above 90% of target`} />
          <BarChart
            ariaLabel="Daily protein this week"
            bars={week.perDay.map((d) => ({
              label: formatDateLabel(d.date).slice(0, 3),
              value: d.grams,
              tone: d.hit ? 'good' : d.grams > 0 ? 'caution' : 'ember',
            }))}
            format={(v) => `${Math.round(v)}`}
          />
          <p className="text-xs text-ash mt-2 leading-relaxed">
            {week.daysTracked === 0
              ? 'Nothing logged this week yet.'
              : `Averaging ${week.averageG} g on the ${week.daysTracked} days you tracked. Days with nothing logged are counted as unknown, not as failures.`}
          </p>
        </Card>

        {/* Today's entries -------------------------------------------------- */}
        <div>
          <SectionHeading title="Logged today" />
          {todaysEntries.length ? (
            <ul className="space-y-1.5">
              {todaysEntries.map((entry) => (
                <li key={entry.id} className="forge-panel flex items-center gap-3 px-3.5 py-2.5">
                  <span className="flex-1 text-sm text-parchment truncate">{entry.label}</span>
                  <span className="text-sm tabular text-ember-400">{entry.grams} g</span>
                  <IconButton label={`Remove ${entry.label}`} onClick={() => store.deleteProtein(entry.id)}>
                    <span aria-hidden>✕</span>
                  </IconButton>
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <p className="text-sm text-ash text-center py-2">Nothing logged today yet.</p>
            </Card>
          )}
        </div>

        <Disclosure summary="Budget-friendly protein" tone="quiet">
          <ul className="list-disc pl-4 space-y-1">
            {BUDGET_PICKS.map((pick) => (
              <li key={pick}>{pick}</li>
            ))}
          </ul>
        </Disclosure>

        <Disclosure summary="Where these numbers come from" tone="quiet">
          <p className="mb-2">
            Baseline {RULES.protein.baselineGPerKg} g/kg/day, practical range {RULES.protein.rangeGPerKg.min}–
            {RULES.protein.rangeGPerKg.max} g/kg/day. The top of the range is an option when dieting or when you want
            extra margin — it is not a requirement, and there is no evidence that pushing well past it does anything
            for muscle.
          </p>
          <CitationList ids={target.citationIds} />
        </Disclosure>

        <Alert tone="info">
          FORGED tracks protein only. It does not prescribe calorie deficits, does not diagnose anything, and is not a
          substitute for a registered dietitian — especially if you have a medical condition or a history of
          disordered eating.
        </Alert>
      </div>

      <Sheet open={foodOpen} onClose={() => setFoodOpen(false)} title="Custom food">
        <CustomFoodForm
          onSave={(food) => {
            store.saveFood(food)
            setFoodOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={mealOpen} onClose={() => setMealOpen(false)} title="Build a meal">
        <MealForm
          onSave={(meal) => {
            store.saveMeal(meal)
            setMealOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Nutrition settings">
        <div className="space-y-4">
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
              placeholder={String(target.targetG)}
              onChange={(e) =>
                store.updateProfile({ proteinOverrideG: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
          <Button variant="primary" full onClick={() => setSettingsOpen(false)}>
            Done
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}

function CustomFoodForm({ onSave }: { onSave: (food: FoodItem) => void }) {
  const [name, setName] = useState('')
  const [grams, setGrams] = useState(25)
  const [serving, setServing] = useState('1 serving')
  const [budget, setBudget] = useState(false)
  return (
    <div className="space-y-4">
      <Field label="Food name" htmlFor="food-name" required>
        <TextInput id="food-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My protein bowl" />
      </Field>
      <Field label="Protein per serving">
        <NumberStepper label="Protein grams" value={grams} min={1} max={200} suffix="g" onChange={setGrams} />
      </Field>
      <Field label="Serving description" htmlFor="food-serving">
        <TextInput id="food-serving" value={serving} onChange={(e) => setServing(e.target.value)} />
      </Field>
      <Toggle checked={budget} onChange={setBudget} label="Budget friendly" hint="Shows up in cheap-protein suggestions." />
      <Button
        variant="primary"
        full
        disabled={!name.trim()}
        onClick={() =>
          onSave({
            id: newId('food'),
            name: name.trim(),
            proteinG: grams,
            serving,
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

function MealForm({ onSave }: { onSave: (meal: Meal) => void }) {
  const [name, setName] = useState('')
  const [items, setItems] = useState<{ label: string; grams: number }[]>([{ label: '', grams: 25 }])
  const total = items.reduce((s, i) => s + (i.grams || 0), 0)
  return (
    <div className="space-y-4">
      <Field label="Meal name" htmlFor="meal-name" required>
        <TextInput id="meal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Post-gym" />
      </Field>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <TextInput
              aria-label={`Item ${i + 1} name`}
              value={item.label}
              placeholder="Item"
              className="flex-1"
              onChange={(e) =>
                setItems((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <div className="w-32">
              <NumberStepper
                label={`Item ${i + 1} grams`}
                value={item.grams}
                min={0}
                max={200}
                step={5}
                onChange={(v) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, grams: v } : x)))}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setItems((prev) => [...prev, { label: '', grams: 20 }])}>
          Add item
        </Button>
        <span className={cx('font-display text-xl tabular', total > 0 ? 'text-ember-400' : 'text-smoke')}>
          {total} g
        </span>
      </div>
      <Button
        variant="primary"
        full
        disabled={!name.trim() || total <= 0}
        onClick={() =>
          onSave({
            id: newId('meal'),
            name: name.trim(),
            items: items.filter((i) => i.label.trim() && i.grams > 0),
            custom: true,
          })
        }
      >
        Save meal
      </Button>
    </div>
  )
}
