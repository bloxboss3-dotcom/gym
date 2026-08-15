import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { Warrior } from '@/character/Warrior'
import { buildFromXp } from '@/config/economy'
import {
  Alert,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Disclosure,
  Field,
  NumberStepper,
  SectionHeading,
  SegmentedControl,
  Sheet,
  TextInput,
  Toggle,
  cx,
} from '@/components/ui'
import { LIMITATION_RULES } from '@/engine/program'
import { calculateProteinTarget } from '@/engine/protein'
import { formatHeight, fromDisplay, toDisplay } from '@/engine/units'
import { PLATE_LADDER, barKgFor, platesFor } from '@/engine/plates'
import { useStore } from '@/state/store'
import { LANGUAGES, type Lang } from '@/i18n'
import { useT } from '@/i18n/useT'
import type {
  ActivityLevel,
  Diet,
  EnduranceGoal,
  Experience,
  Goal,
  Priority,
  Sex,
  Units,
} from '@/types'

/** Profile and settings. Everything is editable; nothing is collected silently. */
export default function Profile() {
  const store = useStore()
  const { data } = store
  const profile = data.profile!
  const units = profile.units
  const { t, lang } = useT()

  const [editOpen, setEditOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const proteinTarget = calculateProteinTarget(profile)
  const limitationChips = profile.limitations.filter((l) => !l.startsWith('note:'))
  const limitationNotes = profile.limitations.filter((l) => l.startsWith('note:')).map((l) => l.slice(5))

  return (
    <Screen title={t('Profile')} subtitle={profile.name}>
      <div className="space-y-4">
        {store.ephemeral && (
          <Alert tone="warn" title={t('Storage is not persistent')}>
            {t('FORGED could not open IndexedDB in this browser, so your data will not survive a reload. Export a backup before you close the tab, and try a normal (non-private) window.')}
          </Alert>
        )}

        <Card raised>
          <div className="flex gap-4">
            <Warrior
              equipped={data.game.equipped}
              build={buildFromXp(data.game.xp)}
              frame={data.game.figure ?? 'masculine'}
              className="w-20 h-auto shrink-0"
              still
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl uppercase tracking-wide leading-none">{profile.name}</p>
              <p className="text-xs text-smoke mt-1">
                {profile.age} · {formatHeight(profile.heightCm, units)} ·{' '}
                {Number(toDisplay(profile.bodyWeightKg, units).toFixed(1))} {units}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Chip tone="ember">{profile.experience}</Chip>
                <Chip tone="neutral">{profile.goal}</Chip>
                <Chip tone="neutral">{profile.daysPerWeek} days/wk</Chip>
              </div>
            </div>
          </div>
          <Button full className="mt-3" onClick={() => setEditOpen(true)}>
            {t('Edit profile')}
          </Button>
        </Card>

        <div>
          <SectionHeading title={t('Training')} />
          <Card>
            <ul className="space-y-2 text-sm">
              <Row label={t('Primary goal')} value={profile.goal} />
              <Row label={t('Endurance goal')} value={profile.enduranceGoal} />
              <Row label={t('Priority')} value={profile.priority} />
              <Row label={t('Session length')} value={`${profile.sessionMinutes} min`} />
              <Row label={t('Weekly running')} value={`${profile.weeklyRunKm.toFixed(1)} km`} />
              <Row label={t('Protein target')} value={`${proteinTarget.targetG} g/day`} />
            </ul>
            <Button full className="mt-3" onClick={() => setConfirmRegen(true)}>
              {t('Rebuild my program from this profile')}
            </Button>
          </Card>
        </div>

        {(limitationChips.length > 0 || limitationNotes.length > 0) && (
          <div>
            <SectionHeading title={t('Limitations')} hint={t('FORGED works around these and never adds load to pain.')} />
            <Card>
              <div className="flex flex-wrap gap-1.5">
                {limitationChips.map((key) => (
                  <Chip key={key} tone="caution">
                    {LIMITATION_RULES[key]?.label ?? key}
                  </Chip>
                ))}
              </div>
              {limitationNotes.map((note) => (
                <p key={note} className="text-sm text-ash mt-2 leading-relaxed">
                  {note}
                </p>
              ))}
            </Card>
          </div>
        )}

        <div>
          <SectionHeading title={t('Settings')} />
          <Card>
            <div className="space-y-4">
              {/* Language first in the list, because somebody who cannot
                  read the rest of this screen needs to find it without
                  reading the rest of this screen. Each option is written in
                  its own language for the same reason. */}
              <Field label={t('Language · Idioma')}>
                <SegmentedControl<Lang>
                  label={t('Language')}
                  value={lang}
                  onChange={(v) => store.updateSettings({ language: v })}
                  options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
                />
              </Field>
              <Field label={t('Units')}>
                <SegmentedControl<Units>
                  label={t('Unit preference')}
                  value={profile.units}
                  onChange={(v) => store.updateProfile({ units: v })}
                  options={[
                    { value: 'lb', label: 'Pounds' },
                    { value: 'kg', label: 'Kilograms' },
                  ]}
                />
              </Field>
              <Field
                label={`Default load increment (${units})`}
                hint={t('Used for new exercises. Each program slot can override it.')}
              >
                <NumberStepper
                  label={t('Default increment')}
                  value={Number(toDisplay(data.settings.incrementKg, units).toFixed(2))}
                  min={0.5}
                  max={25}
                  step={units === 'kg' ? 0.5 : 1}
                  decimals={2}
                  suffix={units}
                  onChange={(v) => store.updateSettings({ incrementKg: fromDisplay(v, units) })}
                />
              </Field>
              <Field
                label={`Barbell weight (${units})`}
                hint={t('Used by the plate calculator. A standard Olympic bar is 20 kg / 45 lb.')}
              >
                <NumberStepper
                  label={t('Barbell weight')}
                  value={Number(toDisplay(barKgFor(null, data.settings, units), units).toFixed(1))}
                  min={5}
                  max={60}
                  step={units === 'kg' ? 0.5 : 1}
                  decimals={1}
                  suffix={units}
                  onChange={(v) => store.updateSettings({ barbellKg: fromDisplay(v, units) })}
                />
              </Field>
              <Field
                label={t('Plates your gym has')}
                hint={t('Per side. The calculator only suggests plates you can actually reach.')}
              >
                <div className="flex flex-wrap gap-1.5">
                  {PLATE_LADDER[units].map((plate) => {
                    const owned = platesFor(data.settings, units)
                    const on = owned.some((p) => Math.abs(p - plate) < 0.05)
                    return (
                      <button
                        key={plate}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          const next = on
                            ? owned.filter((p) => Math.abs(p - plate) >= 0.05)
                            : [...owned, plate]
                          store.updateSettings({
                            plateInventoryKg: next.map((p) => fromDisplay(p, units)),
                          })
                        }}
                        className={cx(
                          'touch-target rounded-xl border px-3 text-sm tabular transition-colors',
                          on
                            ? 'border-ember-500 bg-ember-500/15 text-ember-200 font-semibold'
                            : 'border-slate bg-coal text-smoke',
                        )}
                      >
                        {plate}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label={t('Default rest between sets')}>
                <NumberStepper
                  label={t('Default rest')}
                  value={data.settings.restDefaultSec}
                  min={30}
                  max={420}
                  step={15}
                  suffix="s"
                  onChange={(v) => store.updateSettings({ restDefaultSec: v })}
                />
              </Field>
              <Toggle
                checked={data.settings.reducedMotion}
                onChange={(v) => store.updateSettings({ reducedMotion: v })}
                label={t('Reduce motion')}
                hint={t('Turns off ember effects and the pack-opening animation. Your device setting is respected too.')}
              />
              <Toggle
                checked={data.settings.hapticsEnabled}
                onChange={(v) => store.updateSettings({ hapticsEnabled: v })}
                label={t('Haptics')}
                hint={t('Only where the browser supports it.')}
              />
            </div>
          </Card>
        </div>

        <div>
          <SectionHeading title={t('Data')} />
          <div className="space-y-2">
            <Link to="/profile/backup" className="block">
              <Card>
                <p className="font-medium text-parchment">{t('Backup & restore')}</p>
                <p className="text-xs text-ash mt-0.5">
                  {t('Export everything as JSON, or import a backup. Your only safety net — use it.')}
                </p>
              </Card>
            </Link>
            <Link to="/profile/science" className="block">
              <Card>
                <p className="font-medium text-parchment">{t('Science & safety')}</p>
                <p className="text-xs text-ash mt-0.5">
                  {t('What FORGED can optimise, what it can only estimate, and the sources behind every rule.')}
                </p>
              </Card>
            </Link>
          </div>
        </div>

        <div>
          <SectionHeading title={t('Demo mode')} />
          <Card>
            <p className="text-sm text-ash leading-relaxed">
              {t('Loads six weeks of realistic training — completed sessions, a stalled lift, a deload trigger, protein adherence, running improvement and earned gear — so you can see every screen with real data. This replaces whatever is currently stored, so export a backup first if you care about it.')}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button full onClick={() => setConfirmDemo(true)}>
                {t('Load demo data')}
              </Button>
              <Button variant="ghost" full onClick={() => setConfirmReset(true)}>
                {t('Erase everything')}
              </Button>
            </div>
            {data.settings.demoMode && (
              <Chip tone="caution" className="mt-3">
                {t('Demo data is currently loaded')}
              </Chip>
            )}
          </Card>
        </div>

        <Disclosure summary={t('Install FORGED on your phone')} tone="quiet">
          <p className="mb-2">
            <strong>{t('iPhone / iPad:')}</strong> open FORGED in Safari, tap the Share button, then “Add to Home Screen”.
            It opens full-screen with no browser chrome and keeps working offline.
          </p>
          <p className="mb-2">
            <strong>{t('Android:')}</strong> open the browser menu and choose “Install app” or “Add to Home screen”.
          </p>
          <p>
            {t('After the first load, everything works with no network at all — the app shell is cached and all your data lives on the device.')}
          </p>
        </Disclosure>

        <Disclosure summary={t('Privacy')} tone="quiet">
          <p className="mb-2">
            {t('FORGED has no account, no server, and no analytics. Everything you enter is stored in your browser\'s IndexedDB on this device only. Nothing is transmitted anywhere.')}
          </p>
          <p className="mb-2">
            {t('That also means: if you clear your browser data, delete the app, or lose the device, the data is gone. Export a backup periodically.')}
          </p>
          <p>
            {t('The only data FORGED collects is what it needs to make training decisions. There is no email, no phone number, no location, and no advertising identifier.')}
          </p>
        </Disclosure>

        <p className="text-center text-[11px] text-smoke leading-relaxed pb-2">
          {t('FORGED is educational fitness software, not medical advice, diagnosis or treatment. Chest pain, dizziness, fainting, unusual breathlessness or worsening joint pain mean stop training and contact a clinician.')}
        </p>
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title={t('Edit profile')}>
        <EditProfileForm onDone={() => setEditOpen(false)} />
      </Sheet>

      <ConfirmDialog
        open={confirmRegen}
        title={t('Rebuild your program?')}
        body={t('A fresh program is generated from your current profile and becomes active. Your existing custom programs are kept, and your training history and recommendations are untouched.')}
        confirmLabel={t('Rebuild')}
        onCancel={() => setConfirmRegen(false)}
        onConfirm={() => {
          store.regenerateProgram()
          setConfirmRegen(false)
        }}
      />

      <ConfirmDialog
        open={confirmDemo}
        destructive
        title={t('Replace your data with the demo?')}
        body={t('Everything currently stored — sessions, runs, protein, inventory and profile — is replaced by the demo dataset. Export a backup first if you want it back.')}
        confirmLabel={t('Load demo')}
        onCancel={() => setConfirmDemo(false)}
        onConfirm={() => {
          store.loadDemo()
          setConfirmDemo(false)
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        destructive
        title={t('Erase everything?')}
        body={t('This permanently deletes your profile, every session, run, protein entry, item and reward from this device. It cannot be undone and there is no server copy.')}
        confirmLabel={t('Erase everything')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          store.resetAll()
          setConfirmReset(false)
        }}
      />
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-ash">{label}</span>
      <span className="text-parchment capitalize text-right">{value}</span>
    </li>
  )
}

function EditProfileForm({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const store = useStore()
  const profile = store.data.profile!
  const units = profile.units
  const [name, setName] = useState(profile.name)
  const [age, setAge] = useState(profile.age)
  const [weight, setWeight] = useState(Number(toDisplay(profile.bodyWeightKg, units).toFixed(1)))
  const [heightCm, setHeightCm] = useState(profile.heightCm)
  const [days, setDays] = useState(profile.daysPerWeek)
  const [minutes, setMinutes] = useState(profile.sessionMinutes)
  const [goal, setGoal] = useState<Goal>(profile.goal)
  const [experience, setExperience] = useState<Experience>(profile.experience)
  const [enduranceGoal, setEnduranceGoal] = useState<EnduranceGoal>(profile.enduranceGoal)
  const [priority, setPriority] = useState<Priority>(profile.priority)
  const [diet, setDiet] = useState<Diet>(profile.diet)
  const [sex, setSex] = useState<Sex>(profile.sex ?? 'unspecified')
  const [dailyActivity, setDailyActivity] = useState<ActivityLevel>(profile.dailyActivity ?? 'desk')

  return (
    <div className="space-y-4">
      <Field label={t('Name')} htmlFor="p-name">
        <TextInput id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Age')}>
          <NumberStepper label={t('Age')} value={age} min={13} max={100} onChange={setAge} />
        </Field>
        <Field label={`Weight (${units})`}>
          <NumberStepper
            label={t('Body weight')}
            value={weight}
            min={20}
            max={400}
            step={units === 'kg' ? 0.5 : 1}
            decimals={1}
            onChange={setWeight}
          />
        </Field>
      </div>
      <Field label={t('Height (cm)')}>
        <NumberStepper label={t('Height')} value={heightCm} min={120} max={230} onChange={setHeightCm} suffix={t('cm')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Days per week')}>
          <NumberStepper label={t('Days per week')} value={days} min={2} max={6} onChange={setDays} />
        </Field>
        <Field label={t('Session minutes')}>
          <NumberStepper label={t('Session minutes')} value={minutes} min={20} max={120} step={5} onChange={setMinutes} />
        </Field>
      </div>
      <Field label={t('Experience')}>
        <SegmentedControl<Experience>
          label={t('Experience')}
          value={experience}
          onChange={setExperience}
          options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
        />
      </Field>
      <Field label={t('Primary goal')}>
        <SegmentedControl<Goal>
          label={t('Goal')}
          columns={2}
          value={goal}
          onChange={setGoal}
          options={[
            { value: 'hypertrophy', label: 'Hypertrophy' },
            { value: 'strength', label: 'Strength' },
            { value: 'recomp', label: 'Recomposition' },
            { value: 'fatloss', label: 'Fat loss' },
            { value: 'general', label: 'General fitness' },
          ]}
        />
      </Field>
      <Field label={t('Endurance goal')}>
        <SegmentedControl<EnduranceGoal>
          label={t('Endurance goal')}
          columns={2}
          value={enduranceGoal}
          onChange={setEnduranceGoal}
          options={[
            { value: 'none', label: 'None' },
            { value: 'conditioning', label: 'Conditioning' },
            { value: 'run5k', label: 'Run a 5K' },
            { value: 'improve5k', label: 'Improve 5K' },
            { value: 'longer', label: 'Longer distance' },
          ]}
        />
      </Field>
      <Field label={t('Priority')}>
        <SegmentedControl<Priority>
          label={t('Priority')}
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'muscle', label: 'Muscle' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'endurance', label: 'Endurance' },
          ]}
        />
      </Field>
      <Field
        label={t('Biological sex')}
        hint={t('Only used as the constant in the calorie equation.')}
      >
        <SegmentedControl<Sex>
          label={t('Biological sex')}
          value={sex}
          onChange={setSex}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
            { value: 'unspecified', label: 'Rather not' },
          ]}
        />
      </Field>
      <Field label={t('Daily activity')} hint={t('Outside training — workouts are counted separately.')}>
        <SegmentedControl<ActivityLevel>
          label={t('Daily activity')}
          columns={2}
          value={dailyActivity}
          onChange={setDailyActivity}
          options={[
            { value: 'desk', label: 'Mostly seated' },
            { value: 'light', label: 'On my feet a bit' },
            { value: 'active', label: 'On my feet a lot' },
            { value: 'physical', label: 'Physical job' },
          ]}
        />
      </Field>
      <Field label={t('Diet')}>
        <SegmentedControl<Diet>
          label={t('Diet')}
          columns={2}
          value={diet}
          onChange={setDiet}
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
      <Button
        variant="primary"
        full
        onClick={() => {
          store.updateProfile({
            name: name.trim() || profile.name,
            age,
            bodyWeightKg: fromDisplay(weight, units),
            heightCm,
            daysPerWeek: days,
            sessionMinutes: minutes,
            goal,
            experience,
            enduranceGoal,
            priority,
            diet,
            sex,
            dailyActivity,
          })
          onDone()
        }}
      >
        {t('Save changes')}
      </Button>
    </div>
  )
}
