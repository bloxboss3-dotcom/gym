import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ARCHETYPES } from '@/data/items'
import { LIMITATION_RULES } from '@/engine/program'
import { calculateProteinTarget } from '@/engine/protein'
import { generateProgram } from '@/engine/program'
import { feetInchesToCm, fromDisplay, toDisplay } from '@/engine/units'
import { useStore } from '@/state/store'
import { Warrior } from '@/character/Warrior'
import {
  Alert,
  Button,
  Card,
  ChoiceList,
  Field,
  NumberStepper,
  ProgressBar,
  SegmentedControl,
  TextArea,
  TextInput,
  cx,
} from '@/components/ui'
import type {
  Archetype,
  Diet,
  EnduranceGoal,
  EquipmentKey,
  Experience,
  Goal,
  Priority,
  Profile,
  Units,
} from '@/types'

/**
 * Onboarding.
 *
 * Eleven very short steps rather than one long form — each screen asks one thing
 * and explains why it matters. Nothing here is collected that the engine does
 * not actually use: no email, no account, no analytics, nothing that leaves the
 * device.
 */

type Draft = Omit<Profile, 'createdAt' | 'onboardedAt'>

const EQUIPMENT_OPTIONS: { value: EquipmentKey; label: string; hint?: string }[] = [
  { value: 'bodyweight', label: 'Bodyweight only' },
  { value: 'dumbbell', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell + plates' },
  { value: 'rack', label: 'Squat rack' },
  { value: 'bench', label: 'Adjustable bench' },
  { value: 'machine', label: 'Machines' },
  { value: 'cable', label: 'Cable station' },
  { value: 'pullup_bar', label: 'Pull-up bar' },
  { value: 'dip_station', label: 'Dip station' },
  { value: 'kettlebell', label: 'Kettlebells' },
  { value: 'bands', label: 'Resistance bands' },
  { value: 'ez_bar', label: 'EZ bar' },
  { value: 'smith', label: 'Smith machine' },
  { value: 'treadmill', label: 'Treadmill' },
]

const STEP_COUNT = 11

export default function Onboarding() {
  const { completeOnboarding, loadDemo, data } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [heightFeet, setHeightFeet] = useState(5)
  const [heightInches, setHeightInches] = useState(10)
  const [limitationNote, setLimitationNote] = useState('')
  const [proteinOverride, setProteinOverride] = useState<number | null>(null)

  const [draft, setDraft] = useState<Draft>({
    name: '',
    age: 30,
    heightCm: 178,
    bodyWeightKg: 80,
    units: 'lb',
    experience: 'beginner',
    daysPerWeek: 3,
    sessionMinutes: 60,
    equipment: ['bodyweight', 'dumbbell'],
    goal: 'hypertrophy',
    enduranceGoal: 'none',
    priority: 'muscle',
    weeklyRunKm: 0,
    diet: 'omnivore',
    proteinOverrideG: null,
    limitations: [],
    archetype: 'ironclad',
  })

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const proteinPreview = useMemo(
    () =>
      calculateProteinTarget({
        bodyWeightKg: draft.bodyWeightKg,
        heightCm: draft.heightCm,
        goal: draft.goal,
        proteinOverrideG: proteinOverride,
      }),
    [draft.bodyWeightKg, draft.heightCm, draft.goal, proteinOverride],
  )

  const programPreview = useMemo(
    () => generateProgram({ ...draft, name: draft.name || 'Your' }, data.exercises),
    [draft, data.exercises],
  )

  const canAdvance = (() => {
    switch (step) {
      case 1:
        return draft.age >= 13 && draft.age <= 100 && draft.bodyWeightKg > 20
      case 4:
        return draft.equipment.length > 0
      default:
        return true
    }
  })()

  const finish = () => {
    // Free-text limitations are prefixed so the program generator can ignore
    // them while the profile screen still shows what you wrote.
    const limitations = [
      ...draft.limitations,
      ...(limitationNote.trim() ? [`note:${limitationNote.trim()}`] : []),
    ]
    completeOnboarding({
      ...draft,
      name: draft.name.trim() || 'Warrior',
      limitations,
      proteinOverrideG: proteinOverride,
      createdAt: Date.now(),
      onboardedAt: Date.now(),
    })
    navigate('/', { replace: true })
  }

  const displayWeight = Number(toDisplay(draft.bodyWeightKg, draft.units).toFixed(1))

  return (
    <div className="min-h-dvh flex flex-col bg-void">
      <header className="safe-x px-4 pb-2" style={{ paddingTop: 'calc(var(--safe-top) + 1rem)' }}>
        <div className="max-w-lg mx-auto">
          <p className="font-display text-3xl tracking-[0.35em] text-ember-500 text-center">FORGED</p>
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-smoke mt-1">
            Train your body · Forge your warrior
          </p>
          {step > 0 && (
            <ProgressBar
              value={step}
              max={STEP_COUNT - 1}
              className="mt-4"
              label={`Step ${step} of ${STEP_COUNT - 1}`}
            />
          )}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-4 safe-x">
        {step === 0 && (
          <div className="space-y-5 animate-rise">
            <div className="grid place-items-center py-2">
              <Warrior equipped={data.game.equipped} className="w-44 h-auto" />
            </div>
            <h1 className="font-display text-3xl uppercase text-center leading-tight text-balance">
              Real training. Real progress. A warrior that earns it.
            </h1>
            <p className="text-ash text-center leading-relaxed">
              FORGED tracks your lifting, running, protein and recovery, then tells you exactly what to do next
              — and why. Your warrior only grows through work you actually did.
            </p>
            <Alert tone="info" title="What FORGED can and cannot do">
              FORGED optimises the things you control: how much you train, how hard, how consistently, how much
              protein you eat, and how you recover. It <strong>cannot</strong> guarantee or measure how much muscle
              you gain. Nobody can do that from a phone. Every recommendation comes with the rule it used, the
              evidence behind it, and a confidence level — so you can disagree with it.
            </Alert>
            <div className="space-y-2">
              <Button variant="primary" size="lg" full onClick={() => setStep(1)}>
                Begin
              </Button>
              <Button
                variant="ghost"
                full
                onClick={() => {
                  loadDemo()
                  navigate('/', { replace: true })
                }}
              >
                Explore demo data instead
              </Button>
            </div>
            <p className="text-[11px] text-smoke text-center leading-relaxed">
              No account. No email. Nothing leaves your phone — everything is stored locally and you can export a
              backup at any time.
            </p>
          </div>
        )}

        {step === 1 && (
          <StepCard
            title="Who are we forging?"
            blurb="Age and body size feed the protein maths and the starting volume. Nothing here is shared with anyone."
          >
            <Field label="Name or nickname" htmlFor="ob-name" hint="Shown on your profile and title card.">
              <TextInput
                id="ob-name"
                value={draft.name}
                autoComplete="nickname"
                placeholder="Warrior"
                onChange={(e) => set('name', e.target.value)}
              />
            </Field>
            <Field label="Units" htmlFor="ob-units">
              <SegmentedControl<Units>
                label="Unit preference"
                value={draft.units}
                onChange={(v) => set('units', v)}
                options={[
                  { value: 'lb', label: 'Pounds', hint: 'lb / ft-in' },
                  { value: 'kg', label: 'Kilograms', hint: 'kg / cm' },
                ]}
              />
            </Field>
            <Field label="Age" htmlFor="ob-age">
              <NumberStepper label="Age" value={draft.age} min={13} max={100} onChange={(v) => set('age', v)} suffix="yrs" />
            </Field>
            <Field label="Height">
              {draft.units === 'kg' ? (
                <NumberStepper
                  label="Height in centimetres"
                  value={draft.heightCm}
                  min={120}
                  max={230}
                  onChange={(v) => set('heightCm', v)}
                  suffix="cm"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <NumberStepper
                    label="Height feet"
                    value={heightFeet}
                    min={3}
                    max={7}
                    onChange={(v) => {
                      setHeightFeet(v)
                      set('heightCm', feetInchesToCm(v, heightInches))
                    }}
                    suffix="ft"
                  />
                  <NumberStepper
                    label="Height inches"
                    value={heightInches}
                    min={0}
                    max={11}
                    onChange={(v) => {
                      setHeightInches(v)
                      set('heightCm', feetInchesToCm(heightFeet, v))
                    }}
                    suffix="in"
                  />
                </div>
              )}
            </Field>
            <Field label="Current body weight" hint="Used for protein targets and load estimates. Update it any time.">
              <NumberStepper
                label="Body weight"
                value={displayWeight}
                min={30}
                max={400}
                step={draft.units === 'kg' ? 0.5 : 1}
                decimals={1}
                suffix={draft.units}
                onChange={(v) => set('bodyWeightKg', fromDisplay(v, draft.units))}
              />
            </Field>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard
            title="How much lifting have you done?"
            blurb="This sets your starting volume. Starting low is deliberate — there is nowhere to progress to if you begin at the ceiling."
          >
            <ChoiceList<Experience>
              label="Training experience"
              value={draft.experience}
              onChange={(v) => set('experience', v)}
              options={[
                { value: 'beginner', label: 'New or returning', hint: 'Under ~6 months of consistent lifting' },
                { value: 'intermediate', label: 'Intermediate', hint: '6 months to a few years, progress has slowed' },
                { value: 'advanced', label: 'Advanced', hint: 'Years of training, progress measured in months' },
              ]}
            />
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title="How often, and for how long?" blurb="Be honest about the week you actually have, not the one you wish you had.">
            <Field label="Training days per week">
              <NumberStepper label="Days per week" value={draft.daysPerWeek} min={2} max={6} onChange={(v) => set('daysPerWeek', v)} suffix="days" />
            </Field>
            <Field label="Typical session length" hint="Including warm-up and rest between sets.">
              <NumberStepper
                label="Session minutes"
                value={draft.sessionMinutes}
                min={20}
                max={120}
                step={5}
                onChange={(v) => set('sessionMinutes', v)}
                suffix="min"
              />
            </Field>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title="What can you train with?" blurb="Your plan will only use movements you can actually load.">
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_OPTIONS.map((option) => {
                const active = draft.equipment.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    onClick={() =>
                      set(
                        'equipment',
                        active
                          ? draft.equipment.filter((e) => e !== option.value)
                          : [...draft.equipment, option.value],
                      )
                    }
                    className={cx(
                      'touch-target rounded-xl border px-3 py-3 text-sm text-left transition-colors',
                      active ? 'border-ember-500 bg-ember-500/12 text-parchment' : 'border-slate bg-coal text-ash',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {draft.equipment.length === 0 && (
              <Alert tone="warn">Pick at least one. Bodyweight alone is a legitimate answer.</Alert>
            )}
          </StepCard>
        )}

        {step === 5 && (
          <StepCard title="What are you training for?" blurb="This shapes rep ranges, rest, and where your protein target sits.">
            <ChoiceList<Goal>
              label="Primary goal"
              value={draft.goal}
              onChange={(v) => set('goal', v)}
              options={[
                { value: 'hypertrophy', label: 'Hypertrophy', hint: 'Build muscle size' },
                { value: 'strength', label: 'Strength', hint: 'Move heavier weight' },
                { value: 'recomp', label: 'Recomposition', hint: 'Add muscle while losing fat' },
                { value: 'fatloss', label: 'Fat loss, keep muscle', hint: 'Preserve lean mass in a deficit' },
                { value: 'general', label: 'General fitness', hint: 'Health, capability, feeling good' },
              ]}
            />
          </StepCard>
        )}

        {step === 6 && (
          <StepCard
            title="Do you run?"
            blurb="Running progression is managed separately from lifting, and FORGED schedules them so they interfere as little as possible."
          >
            <Field label="Endurance goal">
              <ChoiceList<EnduranceGoal>
                label="Endurance goal"
                value={draft.enduranceGoal}
                onChange={(v) => set('enduranceGoal', v)}
                options={[
                  { value: 'none', label: 'None', hint: 'Lifting only' },
                  { value: 'conditioning', label: 'General conditioning' },
                  { value: 'run5k', label: 'Run a 5K' },
                  { value: 'improve5k', label: 'Improve my 5K time' },
                  { value: 'longer', label: 'Longer distance endurance' },
                ]}
              />
            </Field>
            {draft.enduranceGoal !== 'none' && (
              <>
                <Field label="What matters more?" hint="Used when a hard run and hard leg day collide.">
                  <SegmentedControl<Priority>
                    label="Training priority"
                    value={draft.priority}
                    onChange={(v) => set('priority', v)}
                    options={[
                      { value: 'muscle', label: 'Muscle first' },
                      { value: 'balanced', label: 'Balanced' },
                      { value: 'endurance', label: 'Endurance first' },
                    ]}
                  />
                </Field>
                <Field label="Current weekly running" hint="Roughly what you are doing now — not what you plan to do.">
                  <NumberStepper
                    label="Weekly running distance"
                    value={draft.units === 'kg' ? draft.weeklyRunKm : Number((draft.weeklyRunKm / 1.609344).toFixed(1))}
                    min={0}
                    max={200}
                    step={draft.units === 'kg' ? 1 : 0.5}
                    decimals={1}
                    suffix={draft.units === 'kg' ? 'km' : 'mi'}
                    onChange={(v) => set('weeklyRunKm', draft.units === 'kg' ? v : v * 1.609344)}
                  />
                </Field>
              </>
            )}
          </StepCard>
        )}

        {step === 7 && (
          <StepCard title="Eating pattern" blurb="FORGED only tracks protein. It does not prescribe calorie deficits or treat medical conditions.">
            <Field label="Dietary preference">
              <SegmentedControl<Diet>
                label="Diet"
                columns={2}
                value={draft.diet}
                onChange={(v) => set('diet', v)}
                options={[
                  { value: 'omnivore', label: 'Omnivore' },
                  { value: 'pescatarian', label: 'Pescatarian' },
                  { value: 'vegetarian', label: 'Vegetarian' },
                  { value: 'vegan', label: 'Vegan' },
                  { value: 'halal', label: 'Halal' },
                  { value: 'kosher', label: 'Kosher' },
                  { value: 'dairy_free', label: 'Dairy free' },
                ]}
              />
            </Field>
            <Card>
              <p className="text-sm text-parchment font-medium">Your protein target</p>
              <p className="font-display text-4xl text-ember-400 mt-1 tabular">{proteinPreview.targetG} g<span className="text-base text-ash"> / day</span></p>
              <p className="text-xs text-ash mt-1.5 leading-relaxed">{proteinPreview.rationale}</p>
            </Card>
            <Field
              label="Override the target (optional)"
              hint="Leave blank unless you have a reason. FORGED does not think higher is automatically better."
            >
              <TextInput
                type="number"
                inputMode="numeric"
                placeholder={`${proteinPreview.targetG}`}
                value={proteinOverride ?? ''}
                onChange={(e) => setProteinOverride(e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </StepCard>
        )}

        {step === 8 && (
          <StepCard
            title="Anything that hurts?"
            blurb="FORGED will avoid loading these patterns and will never tell you to add weight to a movement that hurts."
          >
            <ChoiceList
              multi
              label="Areas to work around"
              value={draft.limitations}
              onChange={(v) => set('limitations', v as string[])}
              options={Object.entries(LIMITATION_RULES).map(([key, rule]) => ({
                value: key,
                label: rule.label,
                hint: rule.note,
              }))}
            />
            <Field label="Anything else?" hint="Free text, stored on your device only.">
              <TextArea
                value={limitationNote}
                placeholder="e.g. left shoulder clicks on overhead pressing"
                onChange={(e) => setLimitationNote(e.target.value)}
              />
            </Field>
            <Alert tone="warn" title="This is not a medical assessment">
              FORGED is educational software. Persistent pain, sharp pain, numbness, dizziness or chest discomfort
              needs a physiotherapist or physician — not an app.
            </Alert>
          </StepCard>
        )}

        {step === 9 && (
          <StepCard title="Choose your archetype" blurb="Purely cosmetic. It sets your starting gear and nothing else — no stat bonuses, ever.">
            <div className="space-y-2">
              {ARCHETYPES.map((archetype) => {
                const active = draft.archetype === archetype.key
                return (
                  <button
                    key={archetype.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set('archetype', archetype.key as Archetype)}
                    className={cx(
                      'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors touch-target',
                      active ? 'border-ember-500 bg-ember-500/12' : 'border-slate bg-coal',
                    )}
                  >
                    <Warrior
                      still
                      className="w-14 h-auto shrink-0"
                      equipped={{
                        face: archetype.key === 'emberblade' ? 'face-warpaint' : 'face-recruit',
                        head: archetype.extraItems.find((i) => i.startsWith('head-')) ?? 'head-none',
                        body: archetype.extraItems.find((i) => i.startsWith('body-')) ?? 'body-tunic',
                        hands: 'hands-wraps',
                        feet: archetype.extraItems.find((i) => i.startsWith('feet-')) ?? 'feet-wraps',
                        weapon: archetype.extraItems.find((i) => i.startsWith('weapon-')) ?? 'weapon-none',
                        aura: 'aura-none',
                        pose: 'pose-ready',
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block font-display text-lg uppercase tracking-wide">{archetype.name}</span>
                      <span className="block text-xs text-ash leading-snug">{archetype.blurb}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </StepCard>
        )}

        {step === 10 && (
          <StepCard title="Your starter plan" blurb="Generated from everything you just told FORGED. You can edit or rebuild it at any time.">
            <Card raised>
              <p className="font-display text-xl uppercase tracking-wide">{programPreview.name}</p>
              <p className="text-xs text-ash mt-1 leading-relaxed">{programPreview.description}</p>
              <ul className="mt-3 space-y-2">
                {programPreview.days.map((day) => (
                  <li key={day.id} className="rounded-lg border border-slate/70 p-2.5">
                    <p className="text-sm font-medium text-parchment">{day.name}</p>
                    <p className="text-xs text-smoke mt-0.5">
                      {day.slots
                        .map((slot) => data.exercises.find((e) => e.id === slot.exerciseId)?.name ?? slot.exerciseId)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
            <Alert tone="info" title="Conservative on purpose">
              This starts near the bottom of the recommended weekly volume range for your experience level. FORGED
              adds work gradually, and only when you have actually completed the week.
            </Alert>
          </StepCard>
        )}
      </main>

      <footer
        className="sticky bottom-0 bg-void/95 backdrop-blur border-t border-slate/70 px-4 py-3 safe-x"
        style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
      >
        <div className="max-w-lg mx-auto flex gap-2">
          {step > 0 && (
            <Button onClick={() => setStep((s) => Math.max(0, s - 1))} className="shrink-0">
              Back
            </Button>
          )}
          {step > 0 && step < STEP_COUNT - 1 && (
            <Button variant="primary" full disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          )}
          {step === STEP_COUNT - 1 && (
            <Button variant="primary" full onClick={finish}>
              Light the forge
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}

function StepCard({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 animate-rise">
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide leading-tight text-balance">{title}</h2>
        <p className="text-sm text-ash mt-1.5 leading-relaxed">{blurb}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
