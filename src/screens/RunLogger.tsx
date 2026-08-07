import { useMemo, useState } from 'react'
import { Screen } from '@/components/AppShell'
import { BarChart } from '@/components/charts'
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
  Slider,
  Stat,
  TextArea,
  cx,
} from '@/components/ui'
import { CitationList, ConfidenceChip } from '@/components/RecommendationCard'
import { compareBenchmark, recommendRunning, summariseWeek } from '@/engine/running'
import { formatDistance, formatPace, kmToMiles, milesToKm, pacePerKm } from '@/engine/units'
import { addDays, formatDateLabel, formatDuration, startOfWeek, toIsoDate } from '@/lib/date'
import { useStore } from '@/state/store'
import type { RunSurface, RunType } from '@/types'

/**
 * Running logger and endurance dashboard.
 *
 * Running load is governed separately from lifting, and the recommendation
 * explains exactly which signal drove it — completion, effort, pain, or the
 * experience-scaled increase cap.
 */
export default function RunLogger() {
  const { data, addRun, deleteRun } = useStore()
  const profile = data.profile!
  const units = profile.units
  const today = toIsoDate()
  const metric = units === 'kg'

  const [date, setDate] = useState(today)
  const [type, setType] = useState<RunType>('easy')
  const [distance, setDistance] = useState(metric ? 5 : 3.1)
  const [minutes, setMinutes] = useState(30)
  const [seconds, setSeconds] = useState(0)
  const [hr, setHr] = useState<number | null>(null)
  const [rpe, setRpe] = useState(4)
  const [pain, setPain] = useState(0)
  const [surface, setSurface] = useState<RunSurface>('road')
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const recommendation = useMemo(
    () =>
      recommendRunning({
        runs: data.runs,
        sessions: data.sessions,
        experience: profile.experience,
        priority: profile.priority,
        enduranceGoal: profile.enduranceGoal,
        baselineWeeklyKm: profile.weeklyRunKm,
        today,
      }),
    [data.runs, data.sessions, profile, today],
  )

  const weeks = useMemo(() => {
    const start = startOfWeek(today)
    return Array.from({ length: 6 }, (_, i) => summariseWeek(data.runs, addDays(start, -7 * (5 - i))))
  }, [data.runs, today])

  const benchmark = useMemo(() => compareBenchmark(data.runs), [data.runs])
  const thisWeek = weeks[weeks.length - 1]
  const longest = data.runs.reduce((m, r) => Math.max(m, r.distanceKm), 0)

  const durationSec = minutes * 60 + seconds
  const distanceKm = metric ? distance : milesToKm(distance)
  const pace = pacePerKm(distanceKm, durationSec)

  const submit = () => {
    addRun({
      date,
      type,
      distanceKm,
      durationSec,
      avgHr: hr,
      rpe,
      pain,
      surface,
      note: note.trim() || undefined,
      planned: true,
    })
    setNote('')
    setPain(0)
  }

  return (
    <Screen title="Running" subtitle={`${formatDistance(thisWeek.distanceKm, units)} this week`} back="/train">
      <div className="space-y-4">
        <Card raised>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-ember-400">This week</p>
              <p className="font-display text-2xl uppercase leading-tight mt-0.5">{recommendation.headline}</p>
            </div>
            <ConfidenceChip confidence={recommendation.confidence} />
          </div>
          <p className="text-sm text-ash mt-2 leading-relaxed">{recommendation.reason}</p>
          {recommendation.warning && (
            <Alert tone="danger" className="mt-3" title="Safety">
              {recommendation.warning}
            </Alert>
          )}
          {recommendation.schedulingNote && (
            <p className="text-xs text-cool mt-2 leading-relaxed">{recommendation.schedulingNote}</p>
          )}

          <ul className="mt-3 space-y-1.5">
            {recommendation.sessions.map((session, i) => (
              <li key={i} className="rounded-lg border border-slate bg-coal/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Chip tone={session.type === 'long' ? 'ember' : session.type === 'benchmark' ? 'gold' : 'neutral'}>
                    {session.type.replace('_', '/')}
                  </Chip>
                  <span className="text-xs text-ash tabular">
                    {session.distanceKm
                      ? formatDistance(session.distanceKm, units)
                      : session.durationMin
                        ? `${session.durationMin} min`
                        : ''}
                  </span>
                </div>
                <p className="text-xs text-ash mt-1.5 leading-snug">{session.description}</p>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-2">
            <Disclosure summary="Rule used" tone="quiet">
              <p className="font-mono text-[11px] leading-relaxed text-parchment/90">{recommendation.rule}</p>
              <p className="mt-2 text-xs">
                FORGED does not apply a blanket 10% rule. The cap scales with your experience, and it only applies at
                all when last week was actually completed with no pain flags.
              </p>
            </Disclosure>
            {recommendation.missingData.length > 0 && (
              <Disclosure summary={`${recommendation.missingData.length} data gaps`} tone="quiet">
                <ul className="list-disc pl-4 space-y-1">
                  {recommendation.missingData.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Disclosure>
            )}
            <Disclosure summary="Evidence" tone="quiet">
              <CitationList ids={recommendation.citationIds} />
            </Disclosure>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="This week" value={formatDistance(thisWeek.distanceKm, units)} tone="ember" />
          <Stat label="Longest run" value={formatDistance(longest, units)} />
          <Stat
            label="Benchmark"
            value={benchmark ? formatDuration(benchmark.currentSec) : '—'}
            tone={benchmark?.improved ? 'good' : 'neutral'}
            sub={benchmark?.improved ? 'Improved' : undefined}
          />
        </div>

        {benchmark && (
          <Alert tone={benchmark.improved ? 'good' : 'info'} title="Benchmark">
            {benchmark.detail}
          </Alert>
        )}

        <div>
          <SectionHeading title="Weekly volume" hint="Last six weeks of completed running." />
          <Card>
            <BarChart
              ariaLabel="Weekly running distance"
              bars={weeks.map((week, i) => ({
                label: i === weeks.length - 1 ? 'Now' : `−${weeks.length - 1 - i}w`,
                value: metric ? week.distanceKm : kmToMiles(week.distanceKm),
                tone: 'cool',
              }))}
              format={(v) => (v >= 10 ? `${Math.round(v)}` : v.toFixed(1))}
            />
            <p className="text-[11px] text-smoke mt-2 text-center">{metric ? 'kilometres' : 'miles'} per week</p>
          </Card>
        </div>

        <div>
          <SectionHeading title="Log a run" />
          <Card>
            <div className="space-y-4">
              <Field label="Date" htmlFor="run-date">
                <input
                  id="run-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-12 rounded-xl bg-coal border border-slate px-3.5 text-parchment"
                />
              </Field>

              <Field label="Run type">
                <SegmentedControl<RunType>
                  label="Run type"
                  columns={4}
                  value={type}
                  onChange={setType}
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'long', label: 'Long' },
                    { value: 'intervals', label: 'Intervals' },
                    { value: 'threshold', label: 'Threshold' },
                    { value: 'recovery', label: 'Recovery' },
                    { value: 'walk_run', label: 'Walk/run' },
                    { value: 'benchmark', label: 'Benchmark' },
                  ]}
                />
              </Field>

              {/*
                Distance and Duration each get a full-width row.
                Duration already splits into minutes and seconds, and nesting
                that inside a half-width column left each stepper ~84px — less
                than its two 48px buttons — which silently collapsed the number
                input to zero width. You could still tap + and −, but there was
                nothing left to type into.
              */}
              <Field label={`Distance (${metric ? 'km' : 'mi'})`}>
                <NumberStepper
                  label="Distance"
                  value={distance}
                  min={0}
                  max={200}
                  step={metric ? 0.5 : 0.25}
                  decimals={2}
                  onChange={setDistance}
                />
              </Field>
              <Field label="Duration">
                <div className="grid grid-cols-2 gap-2">
                  <NumberStepper label="Minutes" value={minutes} min={0} max={600} onChange={setMinutes} suffix="m" />
                  <NumberStepper label="Seconds" value={seconds} min={0} max={59} step={5} onChange={setSeconds} suffix="s" />
                </div>
              </Field>

              <div className="rounded-lg bg-coal/70 border border-slate px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-smoke">Pace</span>
                <span className="font-display text-lg text-ember-400 tabular">{formatPace(pace, units)}</span>
              </div>

              <Slider
                label="Session effort (RPE 1–10)"
                value={rpe}
                min={1}
                max={10}
                labels={['Very easy', 'Maximal']}
                onChange={setRpe}
              />

              <Slider
                label="Pain during or after (0–10)"
                value={pain}
                min={0}
                max={10}
                tone={pain >= 3 ? 'caution' : 'ember'}
                labels={['None', 'Severe']}
                onChange={setPain}
              />
              {pain >= 6 && (
                <Alert tone="danger" title="Stop running on this">
                  Pain at {pain}/10 needs assessment, not another run. See a physiotherapist or physician — especially
                  if it is sharp, localised to bone, or worsening as you run.
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Average heart rate" hint="Optional — enter it manually if you have it.">
                  <NumberStepper
                    label="Average heart rate"
                    value={hr ?? 0}
                    min={0}
                    max={230}
                    onChange={(v) => setHr(v || null)}
                    suffix="bpm"
                  />
                </Field>
                <Field label="Surface">
                  <SegmentedControl<RunSurface>
                    label="Surface"
                    columns={2}
                    value={surface}
                    onChange={setSurface}
                    options={[
                      { value: 'road', label: 'Road' },
                      { value: 'trail', label: 'Trail' },
                      { value: 'track', label: 'Track' },
                      { value: 'treadmill', label: 'Treadmill' },
                    ]}
                  />
                </Field>
              </div>

              <Field label="Notes">
                <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Conditions, how it felt…" />
              </Field>

              <Button variant="primary" size="lg" full disabled={distanceKm <= 0 || durationSec <= 0} onClick={submit}>
                Save run
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <SectionHeading title="Run history" />
          {data.runs.length ? (
            <ul className="space-y-2">
              {[...data.runs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 20)
                .map((run) => (
                  <li key={run.id}>
                    <Card>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-parchment">
                            {formatDistance(run.distanceKm, units)} · {formatDuration(run.durationSec)}
                          </p>
                          <p className="text-xs text-smoke mt-0.5">
                            {formatDateLabel(run.date)} · {run.type.replace('_', '/')} · {run.surface} ·{' '}
                            {formatPace(pacePerKm(run.distanceKm, run.durationSec), units)}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Chip tone="neutral">RPE {run.rpe}</Chip>
                            {run.pain > 0 && <Chip tone={run.pain >= 3 ? 'caution' : 'neutral'}>Pain {run.pain}</Chip>}
                            {run.avgHr ? <Chip tone="neutral">{run.avgHr} bpm</Chip> : null}
                          </div>
                          {run.note && <p className="text-xs text-ash mt-1.5">{run.note}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(run.id)}
                          aria-label="Delete run"
                          className={cx('touch-target shrink-0 text-smoke hover:text-danger px-2')}
                        >
                          <span aria-hidden>🗑</span>
                        </button>
                      </div>
                    </Card>
                  </li>
                ))}
            </ul>
          ) : (
            <Card>
              <p className="text-sm text-ash text-center py-2">No runs logged yet.</p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        destructive
        title="Delete this run?"
        body="It will be removed from your weekly totals and from the running recommendation. This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteRun(confirmDelete)
          setConfirmDelete(null)
        }}
      />
    </Screen>
  )
}
