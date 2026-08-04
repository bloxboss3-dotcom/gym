import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { ExercisePicker } from '@/screens/SessionPlayer'
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Field,
  IconButton,
  NumberStepper,
  SectionHeading,
  SegmentedControl,
  Sheet,
  TextInput,
  cx,
} from '@/components/ui'
import { MUSCLES } from '@/data/muscles'
import { estimateSessionMinutes } from '@/engine/program'
import { plannedMuscleVolume } from '@/engine/volume'
import { toDisplay, fromDisplay } from '@/engine/units'
import { newId } from '@/lib/id'
import { weekdayName } from '@/lib/date'
import { useStore } from '@/state/store'
import type { Exercise, MuscleKey, Program, ProgramDay, ProgramSlot } from '@/types'

/**
 * Program editor.
 *
 * Fully editable: days, order, exercises, sets, rep ranges, rest, target effort
 * and the load increment available on your equipment. Custom exercises can be
 * created with their own muscle contributions, which feed the volume dashboard
 * exactly like the built-ins.
 */
export default function ProgramEditor() {
  const { programId } = useParams<{ programId: string }>()
  const navigate = useNavigate()
  const store = useStore()
  const { data } = store
  const units = data.profile?.units ?? 'kg'

  const original = data.programs.find((p) => p.id === programId)
  const [draft, setDraft] = useState<Program | null>(original ? structuredClone(original) : null)
  const [pickerDay, setPickerDay] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<{ dayId: string; slot: ProgramSlot } | null>(null)
  const [newExerciseOpen, setNewExerciseOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const planned = useMemo(
    () => (draft ? plannedMuscleVolume(draft, data.exercises) : null),
    [draft, data.exercises],
  )

  if (!draft) {
    return (
      <Screen title="Program" back="/train">
        <Alert tone="warn">That program no longer exists.</Alert>
      </Screen>
    )
  }

  const update = (fn: (p: Program) => Program) => setDraft((prev) => (prev ? fn(structuredClone(prev)) : prev))

  const save = () => {
    store.saveProgram(draft)
    store.setActiveProgram(draft.id)
    navigate('/train')
  }

  const addDay = () =>
    update((p) => {
      p.days.push({ id: newId('day'), name: `Day ${p.days.length + 1}`, weekday: null, slots: [] })
      return p
    })

  const removeDay = (dayId: string) =>
    update((p) => {
      p.days = p.days.filter((d) => d.id !== dayId)
      return p
    })

  const moveSlot = (dayId: string, slotId: string, direction: -1 | 1) =>
    update((p) => {
      const day = p.days.find((d) => d.id === dayId)
      if (!day) return p
      const index = day.slots.findIndex((s) => s.id === slotId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= day.slots.length) return p
      const [slot] = day.slots.splice(index, 1)
      day.slots.splice(target, 0, slot)
      return p
    })

  return (
    <Screen
      title="Program editor"
      subtitle={`${draft.days.length} days · ${draft.days.reduce((n, d) => n + d.slots.reduce((m, s) => m + s.sets, 0), 0)} weekly sets`}
      back="/train"
      action={
        <Button variant="primary" size="sm" onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Program name" htmlFor="prog-name">
          <TextInput
            id="prog-name"
            value={draft.name}
            onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
          />
        </Field>

        {draft.days.map((day) => (
          <Card key={day.id}>
            <div className="flex items-center gap-2">
              <TextInput
                aria-label={`Name for ${day.name}`}
                value={day.name}
                onChange={(e) =>
                  update((p) => {
                    const d = p.days.find((x) => x.id === day.id)
                    if (d) d.name = e.target.value
                    return p
                  })
                }
                className="flex-1 h-11"
              />
              <IconButton label={`Delete ${day.name}`} onClick={() => removeDay(day.id)}>
                <span aria-hidden>🗑</span>
              </IconButton>
            </div>

            <div className="mt-2.5">
              <p className="text-[11px] uppercase tracking-wider text-smoke mb-1.5">Scheduled day</p>
              <div className="grid grid-cols-8 gap-1">
                {[null, 1, 2, 3, 4, 5, 6, 0].map((weekday, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={day.weekday === weekday}
                    onClick={() =>
                      update((p) => {
                        const d = p.days.find((x) => x.id === day.id)
                        if (d) d.weekday = weekday
                        return p
                      })
                    }
                    className={cx(
                      'touch-target rounded-lg border text-[11px] transition-colors px-0.5',
                      day.weekday === weekday
                        ? 'border-ember-500 bg-ember-500/15 text-ember-200'
                        : 'border-slate bg-coal text-ash',
                    )}
                  >
                    {weekday === null ? 'Any' : weekdayName(weekday, true).slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-3 space-y-1.5">
              {day.slots.map((slot, index) => {
                const exercise = data.exercises.find((e) => e.id === slot.exerciseId)
                return (
                  <li key={slot.id} className="rounded-lg border border-slate bg-coal/70 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-parchment truncate">
                          {exercise?.name ?? slot.exerciseId}
                        </span>
                        <span className="block text-xs text-smoke">
                          {slot.sets} × {slot.repMin}–{slot.repMax} · {slot.targetRIR} RIR · {slot.restSec}s rest
                        </span>
                      </span>
                      <IconButton
                        label="Move up"
                        className="size-9 min-h-9 min-w-9"
                        disabled={index === 0}
                        onClick={() => moveSlot(day.id, slot.id, -1)}
                      >
                        <span aria-hidden>↑</span>
                      </IconButton>
                      <IconButton
                        label="Move down"
                        className="size-9 min-h-9 min-w-9"
                        disabled={index === day.slots.length - 1}
                        onClick={() => moveSlot(day.id, slot.id, 1)}
                      >
                        <span aria-hidden>↓</span>
                      </IconButton>
                      <IconButton
                        label={`Edit ${exercise?.name ?? 'exercise'}`}
                        className="size-9 min-h-9 min-w-9"
                        onClick={() => setEditingSlot({ dayId: day.id, slot })}
                      >
                        <span aria-hidden>✎</span>
                      </IconButton>
                      <IconButton
                        label={`Remove ${exercise?.name ?? 'exercise'}`}
                        className="size-9 min-h-9 min-w-9"
                        onClick={() =>
                          update((p) => {
                            const d = p.days.find((x) => x.id === day.id)
                            if (d) d.slots = d.slots.filter((s) => s.id !== slot.id)
                            return p
                          })
                        }
                      >
                        <span aria-hidden>✕</span>
                      </IconButton>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex items-center justify-between gap-2 mt-3">
              <Button size="sm" onClick={() => setPickerDay(day.id)}>
                Add exercise
              </Button>
              <span className="text-[11px] text-smoke">~{estimateSessionMinutes(day)} min</span>
            </div>
          </Card>
        ))}

        <div className="grid grid-cols-2 gap-2">
          <Button full onClick={addDay}>
            Add day
          </Button>
          <Button full onClick={() => setNewExerciseOpen(true)}>
            New exercise
          </Button>
        </div>

        {planned && (
          <div>
            <SectionHeading title="Planned weekly sets" hint="What this program schedules per muscle, before you train it." />
            <Card>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {MUSCLES.filter((m) => (planned[m.key] ?? 0) > 0).map((muscle) => (
                  <li key={muscle.key} className="flex justify-between text-sm">
                    <span className="text-ash truncate">{muscle.label}</span>
                    <span className="tabular text-parchment">{planned[muscle.key]}</span>
                  </li>
                ))}
              </ul>
              {!MUSCLES.some((m) => (planned[m.key] ?? 0) > 0) && (
                <p className="text-sm text-ash">Add some exercises to see planned volume.</p>
              )}
            </Card>
          </div>
        )}

        <Button variant="ghost" full onClick={() => setConfirmDelete(true)}>
          Delete this program
        </Button>
      </div>

      <ExercisePicker
        open={pickerDay !== null}
        title="Add exercise"
        onClose={() => setPickerDay(null)}
        onPick={(exerciseId) => {
          const exercise = data.exercises.find((e) => e.id === exerciseId)
          update((p) => {
            const d = p.days.find((x) => x.id === pickerDay)
            if (d) {
              d.slots.push({
                id: newId('slot'),
                exerciseId,
                sets: 3,
                repMin: 8,
                repMax: 12,
                restSec: 120,
                targetRIR: 2,
                incrementKg: exercise?.incrementKg ?? 2.5,
              })
            }
            return p
          })
          setPickerDay(null)
        }}
      />

      <Sheet
        open={editingSlot !== null}
        onClose={() => setEditingSlot(null)}
        title={data.exercises.find((e) => e.id === editingSlot?.slot.exerciseId)?.name ?? 'Exercise'}
      >
        {editingSlot && (
          <SlotEditor
            slot={editingSlot.slot}
            units={units}
            onChange={(patch) =>
              update((p) => {
                const d = p.days.find((x) => x.id === editingSlot.dayId)
                const s = d?.slots.find((x) => x.id === editingSlot.slot.id)
                if (s) Object.assign(s, patch)
                return p
              })
            }
            onDone={() => setEditingSlot(null)}
          />
        )}
      </Sheet>

      <Sheet open={newExerciseOpen} onClose={() => setNewExerciseOpen(false)} title="Create exercise">
        <CustomExerciseForm
          onSave={(exercise) => {
            store.saveExercise(exercise)
            setNewExerciseOpen(false)
          }}
        />
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="Delete this program?"
        body="The program and its day structure are removed. Sessions you already completed are kept — your history and recommendations are unaffected."
        confirmLabel="Delete program"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          store.deleteProgram(draft.id)
          navigate('/train')
        }}
      />
    </Screen>
  )
}

function SlotEditor({
  slot,
  units,
  onChange,
  onDone,
}: {
  slot: ProgramSlot
  units: 'kg' | 'lb'
  onChange: (patch: Partial<ProgramSlot>) => void
  onDone: () => void
}) {
  const [local, setLocal] = useState(slot)
  const apply = (patch: Partial<ProgramSlot>) => {
    const next = { ...local, ...patch }
    setLocal(next)
    onChange(patch)
  }
  return (
    <div className="space-y-4">
      <Field label="Working sets">
        <NumberStepper label="Working sets" value={local.sets} min={1} max={10} onChange={(v) => apply({ sets: v })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min reps">
          <NumberStepper
            label="Minimum reps"
            value={local.repMin}
            min={1}
            max={30}
            onChange={(v) => apply({ repMin: Math.min(v, local.repMax) })}
          />
        </Field>
        <Field label="Max reps">
          <NumberStepper
            label="Maximum reps"
            value={local.repMax}
            min={1}
            max={40}
            onChange={(v) => apply({ repMax: Math.max(v, local.repMin) })}
          />
        </Field>
      </div>
      <Field label="Target reps in reserve" hint="1–3 is the usual window for productive working sets.">
        <SegmentedControl
          label="Target RIR"
          columns={5}
          value={String(local.targetRIR)}
          onChange={(v) => apply({ targetRIR: Number(v) })}
          options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
        />
      </Field>
      <Field label="Rest between sets">
        <NumberStepper
          label="Rest seconds"
          value={local.restSec}
          min={30}
          max={420}
          step={15}
          suffix="s"
          onChange={(v) => apply({ restSec: v })}
        />
      </Field>
      <Field
        label={`Smallest load increment (${units})`}
        hint="The smallest jump your plates, dumbbells or stack actually allow. Progression uses this exact number."
      >
        <NumberStepper
          label="Load increment"
          value={Number(toDisplay(local.incrementKg ?? 2.5, units).toFixed(2))}
          min={0.5}
          max={25}
          step={units === 'kg' ? 0.5 : 1}
          decimals={2}
          suffix={units}
          onChange={(v) => apply({ incrementKg: fromDisplay(v, units) })}
        />
      </Field>
      <Button variant="primary" full onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

function CustomExerciseForm({ onSave }: { onSave: (exercise: Exercise) => void }) {
  const [name, setName] = useState('')
  const [contributions, setContributions] = useState<Partial<Record<MuscleKey, number>>>({})
  const [increment, setIncrement] = useState(2.5)
  const [lowerBody, setLowerBody] = useState(false)

  const toggle = (muscle: MuscleKey, value: number) =>
    setContributions((prev) => {
      const next = { ...prev }
      if (next[muscle] === value) delete next[muscle]
      else next[muscle] = value
      return next
    })

  return (
    <div className="space-y-4">
      <Field label="Exercise name" htmlFor="new-ex-name" required>
        <TextInput id="new-ex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine press" />
      </Field>
      <Field
        label="Muscle contributions"
        hint="1.0 = a direct hard set for that muscle, 0.5 = a meaningful assist. These numbers are what the volume dashboard sums."
      >
        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {MUSCLES.map((muscle) => (
            <li key={muscle.key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-ash">{muscle.label}</span>
              <span className="flex gap-1">
                {[0.5, 1].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={contributions[muscle.key] === value}
                    onClick={() => toggle(muscle.key, value)}
                    className={cx(
                      'touch-target w-12 rounded-lg border text-xs transition-colors',
                      contributions[muscle.key] === value
                        ? 'border-ember-500 bg-ember-500/15 text-ember-200'
                        : 'border-slate bg-coal text-ash',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Field>
      <Field label="Smallest load increment (kg)">
        <NumberStepper
          label="Increment"
          value={increment}
          min={0.5}
          max={20}
          step={0.5}
          decimals={1}
          suffix="kg"
          onChange={setIncrement}
        />
      </Field>
      <button
        type="button"
        aria-pressed={lowerBody}
        onClick={() => setLowerBody((v) => !v)}
        className={cx(
          'touch-target w-full rounded-lg border text-sm transition-colors',
          lowerBody ? 'border-ember-500 bg-ember-500/15 text-ember-200' : 'border-slate bg-coal text-ash',
        )}
      >
        {lowerBody ? 'Lower-body movement (bigger jumps)' : 'Upper-body movement (smaller jumps)'}
      </button>
      {Object.keys(contributions).length === 0 && (
        <Alert tone="warn">Pick at least one muscle so this exercise counts toward your weekly volume.</Alert>
      )}
      <Button
        variant="primary"
        full
        disabled={!name.trim() || Object.keys(contributions).length === 0}
        onClick={() =>
          onSave({
            id: newId('ex'),
            name: name.trim(),
            contributions,
            equipment: ['bodyweight'],
            pattern: 'isolation',
            unilateral: false,
            lowerBody,
            incrementKg: increment,
            cue: 'Your movement, your cue.',
            custom: true,
          })
        }
      >
        Create exercise
      </Button>
    </div>
  )
}

export type { ProgramDay }
