import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { BarChart, TargetBar } from '@/components/charts'
import { Alert, Card, Chip, Disclosure, SectionHeading, SegmentedControl, Stat } from '@/components/ui'
import { CitationList } from '@/components/RecommendationCard'
import { RULES } from '@/config/rules'
import { MUSCLES, MUSCLE_LABEL } from '@/data/muscles'
import { assessAllMuscles, weeklyCompletion, suggestVolumeProgression } from '@/engine/volume'
import { LOAD_RANGE_NOTE, auditHypertrophy, collectAuditInput } from '@/engine/intensity'
import { addDays, startOfWeek, toIsoDate } from '@/lib/date'
import { useStore } from '@/state/store'
import { useT } from '@/i18n/useT'
import type { MuscleKey } from '@/types'

/**
 * Weekly muscle volume, fully transparent.
 *
 * Every number can be expanded to show which exercises produced it and at what
 * contribution weight. The reference band is a *starting range* for the user's
 * experience level, not a target to chase past.
 */
export default function VolumeDashboard() {
  const { t } = useT()
  const { data } = useStore()
  const profile = data.profile!
  const today = toIsoDate()
  const [weekOffset, setWeekOffset] = useState(0)

  const program = data.programs.find((p) => p.id === data.activeProgramId) ?? null

  const weekDates = useMemo(() => {
    const start = addDays(startOfWeek(today), weekOffset * -7)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [today, weekOffset])

  const assessments = useMemo(
    () =>
      assessAllMuscles(
        data.sessions,
        data.exercises,
        weekDates,
        program,
        profile.experience,
        MUSCLES.map((m) => m.key),
      ),
    [data.sessions, data.exercises, weekDates, program, profile.experience],
  )

  const completion = useMemo(
    () => weeklyCompletion(data.sessions, weekDates, program),
    [data.sessions, weekDates, program],
  )

  const suggestions = useMemo(
    () => suggestVolumeProgression(assessments, completion.fraction, profile.experience),
    [assessments, completion.fraction, profile.experience],
  )

  const levers = useMemo(
    () =>
      auditHypertrophy(
        collectAuditInput(data.sessions, data.exercises, weekDates, assessments),
      ),
    [data.sessions, data.exercises, weekDates, assessments],
  )

  const totalHardSets = assessments.reduce((sum, a) => sum + a.hardSets, 0)
  const totalVolumeLoad = assessments.reduce((sum, a) => sum + a.volumeLoadKg, 0)

  const history = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const start = addDays(startOfWeek(today), (5 - i) * -7)
      const dates = Array.from({ length: 7 }, (_, d) => addDays(start, d))
      const week = assessAllMuscles(data.sessions, data.exercises, dates, program, profile.experience)
      return {
        label: i === 5 ? 'Now' : `−${5 - i}w`,
        value: week.reduce((sum, a) => sum + a.hardSets, 0),
      }
    })
  }, [data.sessions, data.exercises, program, profile.experience, today])

  return (
    <Screen title={t('Muscle volume')} subtitle={t('Weekly hard sets, and where they came from')} back="/progress">
      <div className="space-y-4">
        <SegmentedControl
          label={t('Week')}
          value={String(weekOffset)}
          onChange={(v) => setWeekOffset(Number(v))}
          options={[
            { value: '0', label: 'This week' },
            { value: '1', label: 'Last week' },
            { value: '2', label: '2 weeks ago' },
          ]}
        />

        <div className="grid grid-cols-3 gap-2">
          <Stat label={t('Hard sets')} value={Number(totalHardSets.toFixed(0))} tone="ember" />
          <Stat label={t('Completed')} value={`${completion.completedSets}/${completion.plannedSets}`} sub={t('vs planned')} />
          <Stat label={t('Volume load')} value={`${Math.round(totalVolumeLoad / 1000)}t`} sub={t('weight × reps')} />
        </div>

        <Alert tone="info" title={t('How to read this')}>
          A “hard set” is a working set taken close enough to failure to matter (RIR ≤{' '}
          {RULES.volume.hardSetRirCutoff}). The shaded band is the starting range for a {profile.experience} lifter (
          {RULES.volume.startingRange[profile.experience].min}–{RULES.volume.startingRange[profile.experience].max}{' '}
          sets). Around 10 sets per muscle per week is a common reference point in the research — an average, not a
          personal requirement, and not something to escalate past just because you can.
        </Alert>

        <Card>
          <SectionHeading title={t('Total hard sets by week')} />
          <BarChart
            ariaLabel={t('Total weekly hard sets over the last six weeks')}
            bars={history.map((h) => ({ label: h.label, value: h.value, tone: 'ember' }))}
          />
        </Card>

        {/* The four levers that actually move hypertrophy, graded against what
            the app can measure. Anything it cannot measure says so rather than
            inventing a grade — a made-up green tick is worse than a blank. */}
        <Card>
          <SectionHeading
            title={t('Hypertrophy check')}
            hint={t('Volume, effort, frequency and rest — in that order of importance.')}
          />
          <ul className="space-y-2.5 mt-1">
            {levers.map((lever) => (
              <li key={lever.key} className="rounded-lg border border-slate/70 bg-coal/60 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-parchment">{t(lever.label)}</p>
                  <Chip
                    tone={lever.status === 'good' ? 'good' : lever.status === 'attention' ? 'caution' : 'neutral'}
                  >
                    {lever.status === 'good' ? 'On track' : lever.status === 'attention' ? 'Worth a look' : 'No data yet'}
                  </Chip>
                </div>
                {lever.finding && <p className="text-xs text-ash mt-1 leading-relaxed">{t(lever.finding)}</p>}
                <p className="text-xs text-smoke mt-1 leading-relaxed">{t(lever.advice)}</p>
                <div className="mt-1.5">
                  <CitationList ids={lever.citationIds} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-smoke mt-3 leading-relaxed">{LOAD_RANGE_NOTE}</p>
        </Card>

        {suggestions.length > 0 && (
          <Card className="border-vital/40">
            <p className="font-display text-lg uppercase tracking-wide text-vital">{t('Room to add a little')}</p>
            <ul className="mt-2 space-y-2">
              {suggestions.map((s) => (
                <li key={s.muscle} className="text-sm">
                  <span className="text-parchment font-medium">
                    {t(MUSCLE_LABEL[s.muscle])} — add up to {s.addSets} set{s.addSets === 1 ? '' : 's'}
                  </span>
                  <span className="block text-xs text-ash mt-0.5 leading-snug">{s.reason}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-smoke mt-2 leading-relaxed">
              FORGED caps volume increases at {RULES.volume.weeklyAddCap} sets per muscle per week and will never
              auto-escalate past {RULES.volume.autoCeiling}. More work is not automatically better — it has to be
              recovered from before it counts for anything.
            </p>
          </Card>
        )}

        <div>
          <SectionHeading title={t('By muscle')} hint={t('Tap a muscle to see the exact exercises that fed it.')} />
          <div className="space-y-2">
            {assessments
              .filter((a) => a.hardSets > 0 || a.plannedSets > 0)
              .sort((a, b) => b.hardSets - a.hardSets)
              .map((assessment) => (
                <MuscleRow key={assessment.muscle} assessment={assessment} />
              ))}
            {assessments.every((a) => a.hardSets === 0 && a.plannedSets === 0) && (
              <Card>
                <p className="text-sm text-ash text-center py-3">
                  {t('No completed sets in this week. Volume appears as soon as you finish a session.')}
                </p>
              </Card>
            )}
          </div>
        </div>

        <Disclosure summary={t('Where these numbers come from')} tone="quiet">
          <p className="mb-2">
            {t('Each exercise declares a fractional contribution to each muscle in one central data file. A set of barbell rows counts 1.0 toward the upper back and lats and 0.5 toward biceps and rear delts. Those fractions are summed across every completed hard set in the week. Nothing is inferred or hidden — you can see and edit them on any custom exercise.')}
          </p>
          <CitationList ids={['schoenfeld-2017-volume', 'acsm-2011-quantity', 'refalo-2023-failure']} />
        </Disclosure>
      </div>
    </Screen>
  )
}

function MuscleRow({
  assessment,
}: {
  assessment: ReturnType<typeof assessAllMuscles>[number]
}) {
  const { data } = useStore()
  const [open, setOpen] = useState(false)
  const { t } = useT()
  const tone =
    assessment.status === 'high'
      ? 'danger'
      : assessment.status === 'above'
        ? 'caution'
        : assessment.status === 'within'
          ? 'good'
          : 'ember'

  return (
    <Card>
      <TargetBar
        label={t(MUSCLE_LABEL[assessment.muscle as MuscleKey])}
        value={assessment.hardSets}
        target={assessment.range}
        ceiling={RULES.volume.autoCeiling}
        tone={tone}
        sub={assessment.message}
        onClick={() => setOpen((v) => !v)}
      />
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Chip tone="neutral">Planned {assessment.plannedSets}</Chip>
        <Chip tone="neutral">Volume load {Math.round(assessment.volumeLoadKg).toLocaleString()}</Chip>
        {assessment.unratedSets > 0 && (
          <Chip tone="caution">{Number(assessment.unratedSets.toFixed(1))} sets without RIR</Chip>
        )}
      </div>
      {open && (
        <ul className="mt-3 space-y-1 border-t border-slate/70 pt-2.5">
          {assessment.contributors.length ? (
            assessment.contributors.map((c) => (
              <li key={c.exerciseId} className="flex items-center justify-between gap-2 text-sm">
                <Link to={`/train/exercise/${c.exerciseId}`} className="text-ash truncate underline underline-offset-2">
                  {data.exercises.find((e) => e.id === c.exerciseId)?.name ?? c.exerciseId}
                </Link>
                <span className="tabular text-parchment shrink-0">{Number(c.sets.toFixed(1))} sets</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-smoke">{t('No completed sets contributed to this muscle in this week.')}</li>
          )}
        </ul>
      )}
    </Card>
  )
}
