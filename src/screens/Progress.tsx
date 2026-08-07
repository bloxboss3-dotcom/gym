import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { ConsistencyStrip, LineChart, TargetBar } from '@/components/charts'
import {
  Alert,
  Button,
  Card,
  Chip,
  Disclosure,
  Field,
  NumberStepper,
  SectionHeading,
  Sheet,
  Stat,
  TextInput,
  cx,
} from '@/components/ui'
import { CitationList } from '@/components/RecommendationCard'
import { RULES } from '@/config/rules'
import { MUSCLE_LABEL, PRIMARY_MUSCLES } from '@/data/muscles'
import { computeConsistency } from '@/engine/consistency'
import { assessDeload } from '@/engine/deload'
import { proteinAdherence, calculateProteinTarget } from '@/engine/protein'
import { assessAllMuscles, weeklyCompletion } from '@/engine/volume'
import {
  bodyWeightSeries,
  e1rmTrend,
  personalRecords,
  rollingAverage,
  sevenDayAverageWeight,
  rirQuality,
} from '@/engine/stats'
import { formatWeight, fromDisplay, toDisplay } from '@/engine/units'
import { formatDateLabel, isoDateOf, lastNDays, startOfWeek, toIsoDate } from '@/lib/date'
import { useStore } from '@/state/store'

/** Progress hub: strength, volume, body, recovery, and the deload picture. */
export default function Progress() {
  const store = useStore()
  const { data } = store
  const profile = data.profile!
  const units = profile.units
  const today = toIsoDate()
  const [weightOpen, setWeightOpen] = useState(false)
  const [measureOpen, setMeasureOpen] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const program = data.programs.find((p) => p.id === data.activeProgramId) ?? null
  const weekDates = useMemo(() => {
    const start = startOfWeek(today)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${start}T00:00:00`)
      d.setDate(d.getDate() + i)
      return toIsoDate(d)
    })
  }, [today])

  const volume = useMemo(
    () => assessAllMuscles(data.sessions, data.exercises, weekDates, program, profile.experience),
    [data.sessions, data.exercises, weekDates, program, profile.experience],
  )
  const completion = useMemo(
    () => weeklyCompletion(data.sessions, weekDates, program),
    [data.sessions, weekDates, program],
  )
  const consistency = useMemo(
    () =>
      computeConsistency({
        sessions: data.sessions,
        runs: data.runs,
        checkins: data.checkins,
        deloads: data.deloads,
        program,
        daysPerWeek: profile.daysPerWeek,
        today,
        sinceDate: isoDateOf(profile.onboardedAt ?? profile.createdAt),
      }),
    [data, program, profile.daysPerWeek, profile.onboardedAt, profile.createdAt, today],
  )
  const deload = useMemo(
    () => assessDeload({ sessions: data.sessions, checkins: data.checkins, deloads: data.deloads, today }),
    [data.sessions, data.checkins, data.deloads, today],
  )

  const proteinTarget = calculateProteinTarget(profile)
  const proteinWeek = proteinAdherence(data.proteinEntries, lastNDays(7, today), proteinTarget.targetG)

  const bodySeries = useMemo(() => bodyWeightSeries(data.bodyWeights), [data.bodyWeights])
  const bodyAverage = useMemo(() => rollingAverage(bodySeries, 7), [bodySeries])
  const sevenDay = sevenDayAverageWeight(data.bodyWeights, today)

  const prs = useMemo(() => personalRecords(data.sessions, data.exercises), [data.sessions, data.exercises])
  const topLifts = useMemo(
    () =>
      prs
        .map((pr) => ({ pr, trend: e1rmTrend(data.sessions, pr.exerciseId) }))
        .filter((x) => x.trend.length >= 2)
        .sort((a, b) => b.trend.length - a.trend.length)
        .slice(0, 3),
    [prs, data.sessions],
  )

  const quality = useMemo(
    () =>
      rirQuality(
        data.sessions
          .filter((s) => s.status === 'completed' && weekDates.includes(s.date))
          .flatMap((s) => s.entries.flatMap((e) => e.sets)),
      ),
    [data.sessions, weekDates],
  )

  const recentCheckins = data.checkins.slice(0, 7)

  return (
    <Screen title="Progress" subtitle="What the data actually says">
      <div className="space-y-4">
        {/* Deload assessment ------------------------------------------------ */}
        <Card raised className={cx(deload.suggested && 'border-caution/50')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-smoke">Fatigue check</p>
              <p className="font-display text-xl uppercase leading-tight mt-0.5">
                {deload.suggested ? 'Deload worth taking' : `${deload.triggeredCount}/${RULES.deload.triggerCount} signals firing`}
              </p>
            </div>
            <Chip tone={deload.suggested ? 'caution' : 'good'}>{deload.confidence} confidence</Chip>
          </div>
          <p className="text-sm text-ash mt-2 leading-relaxed">{deload.reason}</p>
          <ul className="mt-3 space-y-1">
            {deload.signals.map((signal) => (
              <li key={signal.key} className="flex items-start gap-2 text-xs">
                <span
                  aria-hidden
                  className={cx(
                    'mt-0.5 size-2 rounded-full shrink-0',
                    signal.triggered ? 'bg-caution' : 'bg-slate',
                  )}
                />
                <span className={signal.triggered ? 'text-caution' : 'text-smoke'}>
                  <span className="font-medium">{signal.label}</span> — {signal.detail}
                </span>
              </li>
            ))}
          </ul>
          {deload.suggested && (
            <div className="mt-3 space-y-2">
              <Alert tone="info" title="What a deload looks like">
                {deload.plan.description}
              </Alert>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" full onClick={() => store.declineDeload(deload.reason)}>
                  Not now
                </Button>
                <Button variant="primary" full onClick={() => store.acceptDeload(deload.reason)}>
                  Start deload
                </Button>
              </div>
            </div>
          )}
          {data.deloads.some((d) => d.status === 'accepted') && (
            <div className="mt-3">
              <Button
                full
                onClick={() => {
                  const active = data.deloads.find((d) => d.status === 'accepted')
                  if (active) store.completeDeload(active.id)
                }}
              >
                Mark deload complete
              </Button>
            </div>
          )}
          <Disclosure summary="Evidence" tone="quiet">
            <CitationList ids={deload.citationIds} />
          </Disclosure>
        </Card>

        {/* Headline stats --------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Consistency"
            value={`${Math.round(consistency.score * 100)}%`}
            tone="ember"
            sub={`${consistency.credited}/${consistency.expected} planned days`}
          />
          <Stat
            label="Sets this week"
            value={`${completion.completedSets}/${completion.plannedSets}`}
            sub={`${completion.completedSessions} of ${completion.plannedSessions} sessions`}
          />
          <Stat
            label="Protein adherence"
            value={`${proteinWeek.daysHit}/7`}
            tone="gold"
            sub={`${proteinWeek.averageG} g average on tracked days`}
          />
          <Stat
            label="7-day weight"
            value={sevenDay ? formatWeight(sevenDay, units) : '—'}
            sub={sevenDay ? 'Rolling average' : 'Log your weight'}
          />
        </div>

        {/* Consistency ------------------------------------------------------ */}
        <Card>
          <SectionHeading title="Consistency" hint="Rolling 28 days. Missed days do not erase progress." />
          <ConsistencyStrip days={consistency.days} />
          <div className="flex flex-wrap gap-2 mt-3">
            <Chip tone="ember">Lifted</Chip>
            <Chip tone="cool">Ran</Chip>
            <Chip tone="gold">Deload</Chip>
            <Chip tone="good">Rest logged</Chip>
            <Chip tone="danger">Missed</Chip>
          </div>
          <p className="text-xs text-ash mt-2 leading-relaxed">{consistency.message}</p>
        </Card>

        {/* Volume ----------------------------------------------------------- */}
        <div>
          <SectionHeading
            title="Weekly hard sets"
            hint="This week, per muscle. Band shows your starting range."
            action={
              <Link to="/progress/volume" className="text-sm text-ember-400 touch-target flex items-center">
                Details
              </Link>
            }
          />
          <Card>
            <ul className="space-y-3">
              {volume
                .filter((v) => PRIMARY_MUSCLES.includes(v.muscle))
                .slice(0, 6)
                .map((v) => (
                  <li key={v.muscle}>
                    <TargetBar
                      label={MUSCLE_LABEL[v.muscle]}
                      value={v.hardSets}
                      target={v.range}
                      ceiling={RULES.volume.autoCeiling}
                      tone={v.status === 'high' ? 'danger' : v.status === 'above' ? 'caution' : v.status === 'within' ? 'good' : 'ember'}
                    />
                  </li>
                ))}
            </ul>
            <Link
              to="/progress/volume"
              className="mt-3 inline-flex text-sm text-ember-400 font-medium touch-target items-center"
            >
              All muscles and contributing exercises →
            </Link>
          </Card>
        </div>

        {/* Strength trends -------------------------------------------------- */}
        <div>
          <SectionHeading title="Strength trend" hint="Estimated 1RM. An estimate from a formula, not a measurement." />
          {topLifts.length ? (
            <div className="space-y-3">
              {topLifts.map(({ pr, trend }) => (
                <Card key={pr.exerciseId}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Link to={`/train/exercise/${pr.exerciseId}`} className="text-sm font-medium text-parchment truncate">
                      {data.exercises.find((e) => e.id === pr.exerciseId)?.name ?? pr.exerciseId}
                    </Link>
                    <span className="text-xs text-ash tabular shrink-0">{formatWeight(pr.bestE1RM, units)}</span>
                  </div>
                  <LineChart
                    height={120}
                    series={trend.map((p) => ({ date: p.date, value: toDisplay(p.value, units) }))}
                    ariaLabel={`Estimated 1RM trend`}
                    format={(v) => `${Math.round(v)}`}
                  />
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-ash">
                Log a movement at least twice and its estimated strength trend appears here.
              </p>
            </Card>
          )}
        </div>

        {/* Rep quality ------------------------------------------------------ */}
        <Card>
          <SectionHeading title="Rep quality this week" hint="How close to failure your sets actually ran." />
          {quality.totalSets ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Rated sets" value={`${quality.ratedSets}/${quality.totalSets}`} />
                <Stat label="Average RIR" value={quality.averageRir ?? '—'} tone="ember" />
                <Stat label="To failure" value={`${Math.round(quality.toFailureFraction * 100)}%`} />
              </div>
              <p className="text-xs text-ash mt-2 leading-relaxed">
                {quality.missingFraction > 0.34
                  ? `Effort is missing on ${Math.round(quality.missingFraction * 100)}% of sets. Logging it is the single cheapest thing you can do to make recommendations sharper.`
                  : quality.toFailureFraction > 0.4
                    ? 'A lot of sets are going to failure. Sets stopped 1–3 reps short grow muscle about as well for meaningfully less fatigue.'
                    : 'Effort is being logged consistently and sits in a productive range.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-ash">No working sets logged this week yet.</p>
          )}
        </Card>

        {/* Body ------------------------------------------------------------- */}
        <div>
          <SectionHeading
            title="Body"
            action={
              <button
                type="button"
                onClick={() => setWeightOpen(true)}
                className="text-sm text-ember-400 touch-target flex items-center"
              >
                Log weight
              </button>
            }
          />
          <Card>
            {bodySeries.length > 1 ? (
              <>
                <LineChart
                  series={bodySeries.map((p) => ({ date: p.date, value: toDisplay(p.value, units) }))}
                  secondary={bodyAverage.map((p) => ({ date: p.date, value: toDisplay(p.value, units) }))}
                  ariaLabel="Body weight over time"
                  format={(v) => v.toFixed(1)}
                />
                <p className="text-[11px] text-smoke mt-1.5">
                  Solid = daily entries, dashed = 7-day rolling average. Day-to-day swings are mostly water and food
                  in transit — read the average.
                </p>
              </>
            ) : (
              <p className="text-sm text-ash">Log your weight a few times to see a trend.</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button size="sm" full onClick={() => setMeasureOpen(true)}>
                Add measurements
              </Button>
              <label className="contents">
                <span className="sr-only">Add a progress photo</span>
                <Button size="sm" full onClick={() => document.getElementById('photo-input')?.click()}>
                  Add photo
                </Button>
              </label>
            </div>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const dataUrl = await downscaleImage(file, 720)
                  store.addPhoto({ date: today, dataUrl })
                  setPhotoError(null)
                } catch {
                  setPhotoError('Could not read that image. Try a different photo.')
                }
                e.target.value = ''
              }}
            />
            {photoError && (
              <Alert tone="warn" className="mt-2">
                {photoError}
              </Alert>
            )}
            {data.photos.length > 0 && (
              <ul className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {data.photos.slice(0, 12).map((photo) => (
                  <li key={photo.id} className="shrink-0">
                    <figure className="w-24">
                      <img
                        src={photo.dataUrl}
                        alt={`Progress photo from ${formatDateLabel(photo.date)}`}
                        className="w-24 h-32 object-cover rounded-lg border border-slate"
                      />
                      <figcaption className="text-[10px] text-smoke mt-1 text-center">
                        {formatDateLabel(photo.date)}
                      </figcaption>
                    </figure>
                    <button
                      type="button"
                      onClick={() => store.deletePhoto(photo.id)}
                      className="w-full text-[10px] text-smoke hover:text-danger touch-target"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data.measurements.length > 0 && (
              <ul className="mt-3 space-y-1">
                {data.measurements.slice(0, 3).map((m) => (
                  <li key={m.id} className="text-xs text-ash flex justify-between">
                    <span>{formatDateLabel(m.date)}</span>
                    <span className="tabular">
                      {Object.entries(m.values)
                        .map(([k, v]) => `${k} ${v}cm`)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Recovery --------------------------------------------------------- */}
        <div>
          <SectionHeading
            title="Recovery"
            action={
              <Link to="/progress/checkin" className="text-sm text-ember-400 touch-target flex items-center">
                Check in
              </Link>
            }
          />
          <Card>
            {recentCheckins.length ? (
              <ul className="space-y-2">
                {recentCheckins.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ash">{formatDateLabel(c.date)}</span>
                    <span className="flex gap-1.5 text-xs">
                      <Chip tone="neutral">Sleep {c.sleepHours}h</Chip>
                      <Chip tone={c.soreness >= 4 ? 'caution' : 'neutral'}>Sore {c.soreness}</Chip>
                      <Chip tone={c.readiness <= 2 ? 'caution' : 'good'}>Ready {c.readiness}</Chip>
                      {c.jointPain >= 3 && <Chip tone="danger">Joint {c.jointPain}</Chip>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ash">
                No check-ins yet. They take 15 seconds and they are what makes deload detection meaningful.
              </p>
            )}
          </Card>
        </div>

        {/* Deload history --------------------------------------------------- */}
        {data.deloads.length > 0 && (
          <div>
            <SectionHeading title="Deload history" />
            <Card>
              <ul className="space-y-2">
                {data.deloads.map((d) => (
                  <li key={d.id} className="text-sm flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-parchment">{formatDateLabel(d.startDate)}</span>
                      <span className="block text-xs text-smoke line-clamp-2">{d.reason}</span>
                    </span>
                    <Chip tone={d.status === 'completed' ? 'good' : d.status === 'declined' ? 'neutral' : 'ember'}>
                      {d.status}
                    </Chip>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* Personal records -------------------------------------------------- */}
        {prs.length > 0 && (
          <div>
            <SectionHeading title="Personal records" />
            <ul className="space-y-1.5">
              {prs.slice(0, 10).map((pr) => (
                <li key={pr.exerciseId}>
                  <Link
                    to={`/train/exercise/${pr.exerciseId}`}
                    className="forge-panel flex items-center justify-between gap-3 px-3.5 py-3 touch-target"
                  >
                    <span className="text-sm text-parchment truncate">
                      {data.exercises.find((e) => e.id === pr.exerciseId)?.name ?? pr.exerciseId}
                    </span>
                    <span className="text-xs text-ash tabular shrink-0">
                      {formatWeight(pr.topWeightKg, units)} × {pr.topWeightReps}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Sheet open={weightOpen} onClose={() => setWeightOpen(false)} title="Log body weight">
        <WeightForm
          units={units}
          initial={profile.bodyWeightKg}
          onSave={(kg) => {
            store.addBodyWeight({ date: today, weightKg: kg })
            setWeightOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={measureOpen} onClose={() => setMeasureOpen(false)} title="Measurements">
        <MeasurementForm
          onSave={(values) => {
            store.addMeasurement({ date: today, values })
            setMeasureOpen(false)
          }}
        />
      </Sheet>
    </Screen>
  )
}

function WeightForm({
  units,
  initial,
  onSave,
}: {
  units: 'kg' | 'lb'
  initial: number
  onSave: (kg: number) => void
}) {
  const [value, setValue] = useState(Number(toDisplay(initial, units).toFixed(1)))
  return (
    <div className="space-y-4">
      <Field label={`Body weight (${units})`} hint="Weigh in at a consistent time — first thing after waking works well.">
        <NumberStepper
          label="Body weight"
          value={value}
          min={20}
          max={400}
          step={units === 'kg' ? 0.1 : 0.2}
          decimals={1}
          suffix={units}
          onChange={setValue}
        />
      </Field>
      <Button variant="primary" full onClick={() => onSave(fromDisplay(value, units))}>
        Save
      </Button>
    </div>
  )
}

const MEASUREMENT_FIELDS = ['waist', 'chest', 'arm', 'thigh', 'hips', 'calf'] as const

function MeasurementForm({ onSave }: { onSave: (values: Record<string, number>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  return (
    <div className="space-y-3">
      <p className="text-xs text-ash">All measurements in centimetres. Leave anything blank that you did not measure.</p>
      {MEASUREMENT_FIELDS.map((field) => (
        <Field key={field} label={field[0].toUpperCase() + field.slice(1)} htmlFor={`m-${field}`}>
          <TextInput
            id={`m-${field}`}
            type="number"
            inputMode="decimal"
            value={values[field] ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
          />
        </Field>
      ))}
      <Button
        variant="primary"
        full
        onClick={() => {
          const parsed: Record<string, number> = {}
          for (const [key, raw] of Object.entries(values)) {
            const n = Number(raw)
            if (raw && Number.isFinite(n) && n > 0) parsed[key] = n
          }
          onSave(parsed)
        }}
      >
        Save measurements
      </Button>
    </div>
  )
}

/**
 * Down-scale a photo before storing it. Progress photos never leave the device,
 * but they still have to fit inside IndexedDB alongside years of training data.
 */
async function downscaleImage(file: File, maxSize: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('decode failed'))
    image.src = dataUrl
  })
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.72)
}
