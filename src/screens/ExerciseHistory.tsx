import { useMemo } from 'react'
import { useT } from '@/i18n/useT'
import { Link, useParams } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { LineChart } from '@/components/charts'
import { RecommendationCard } from '@/components/RecommendationCard'
import { Card, Chip, EmptyState, SectionHeading, Stat } from '@/components/ui'
import { MUSCLE_LABEL } from '@/data/muscles'
import { historyFor, recommendNextSession } from '@/engine/progression'
import { e1rmTrend, personalRecords, trendSlope } from '@/engine/stats'
import { formatWeight, toDisplay } from '@/engine/units'
import { formatDateLabel } from '@/lib/date'
import { useStore } from '@/state/store'

/** Full history for one movement: trend, records, every logged set. */
export default function ExerciseHistory() {
  const { t } = useT()
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const { data } = useStore()
  const units = data.profile?.units ?? 'kg'
  const exercise = data.exercises.find((e) => e.id === exerciseId)

  const sessions = useMemo(
    () =>
      data.sessions
        .filter((s) => s.status === 'completed' && s.entries.some((e) => e.exerciseId === exerciseId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.sessions, exerciseId],
  )

  const trend = useMemo(() => e1rmTrend(data.sessions, exerciseId ?? ''), [data.sessions, exerciseId])
  const slope = trendSlope(trend)
  const records = personalRecords(data.sessions, data.exercises).find((p) => p.exerciseId === exerciseId)

  const recommendation = useMemo(() => {
    if (!exercise) return null
    const history = historyFor(data.sessions, exercise.id, 8)
    const lastEntry = sessions[0]?.entries.find((e) => e.exerciseId === exercise.id)
    return recommendNextSession(
      history,
      {
        sets: lastEntry?.plannedSets ?? 3,
        repMin: lastEntry?.repMin ?? 8,
        repMax: lastEntry?.repMax ?? 12,
        targetRIR: lastEntry?.targetRIR ?? 2,
        incrementKg: lastEntry?.incrementKg ?? exercise.incrementKg,
        lowerBody: exercise.lowerBody,
        units,
      },
      {
        recentSoreness: data.checkins[0]?.soreness ?? null,
        recentReadiness: data.checkins[0]?.readiness ?? null,
      },
    )
  }, [exercise, data.sessions, data.checkins, sessions, units])

  if (!exercise) {
    return (
      <Screen title={t('Exercise')} back="/train">
        <EmptyState title={t('Not found')} body={t('This exercise is not in your library.')} />
      </Screen>
    )
  }

  return (
    <Screen title={t(exercise.name)} subtitle={t(exercise.cue)} back="/train">
      <div className="space-y-4">
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-smoke">{t('Muscle contributions')}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {Object.entries(exercise.contributions).map(([muscle, value]) => (
              <Chip key={muscle} tone={value === 1 ? 'ember' : 'neutral'}>
                {t(MUSCLE_LABEL[muscle as keyof typeof MUSCLE_LABEL])} · {value}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-smoke mt-2 leading-relaxed">
            {t('These are the exact numbers the weekly volume dashboard adds up. A 1.0 counts as a full hard set for that muscle; a 0.5 counts as half.')}
          </p>
        </Card>

        {records && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label={t('Top set')} value={formatWeight(records.topWeightKg, units)} sub={`× ${records.topWeightReps}`} />
            <Stat label={t('Est. 1RM')} value={formatWeight(records.bestE1RM, units)} tone="ember" sub={t('Estimate only')} />
            <Stat label={t('Sessions')} value={sessions.length} />
          </div>
        )}

        {trend.length > 1 && (
          <div>
            <SectionHeading
              title={t('Estimated 1RM trend')}
              hint={t('Epley formula adjusted for reps in reserve. An estimate, not a measurement.')}
            />
            <Card>
              <LineChart
                series={trend.map((p) => ({ date: p.date, value: toDisplay(p.value, units) }))}
                ariaLabel={`Estimated one rep max trend for ${exercise.name}`}
                format={(v) => `${Math.round(v)}`}
              />
              <p className="text-xs text-ash mt-2">
                {slope > 0.01
                  ? `Trending up by roughly ${formatWeight(slope * 30, units)} per month at the current rate.`
                  : slope < -0.01
                    ? `Trending down by roughly ${formatWeight(Math.abs(slope) * 30, units)} per month. Worth checking recovery, not just adding weight.`
                    : 'Broadly flat. That is normal for stretches of a training block — reps and quality can still be improving.'}
              </p>
            </Card>
          </div>
        )}

        {recommendation && (
          <div>
            <SectionHeading title={t('Next session')} />
            <RecommendationCard recommendation={recommendation} />
          </div>
        )}

        <div>
          <SectionHeading title={t('Every logged session')} />
          {sessions.length ? (
            <ul className="space-y-2">
              {sessions.map((session) => {
                const entries = session.entries.filter((e) => e.exerciseId === exercise.id)
                return (
                  <li key={session.id}>
                    <Card>
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/train/summary/${session.id}`} className="text-sm text-parchment font-medium">
                          {formatDateLabel(session.date)}
                        </Link>
                        <span className="text-xs text-smoke">{session.title}</span>
                      </div>
                      {entries.map((entry) => (
                        <div key={entry.id} className="mt-2">
                          <ul className="flex flex-wrap gap-1.5">
                            {entry.sets.map((set) => (
                              <li
                                key={set.id}
                                className={`rounded-md border px-2 py-1 text-xs tabular ${
                                  set.warmup ? 'border-slate/50 text-smoke' : 'border-slate text-parchment'
                                }`}
                              >
                                {formatWeight(set.weightKg, units, { unit: false })}×{set.reps}
                                {set.rir !== null && <span className="text-smoke"> @{set.rir}</span>}
                              </li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-smoke mt-1.5">
                            Pain {entry.pain}/10 · technique {entry.technique}
                            {entry.substitutedFromId && ' · substituted'}
                          </p>
                        </div>
                      ))}
                    </Card>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon="◷"
              title={t('No history yet')}
              body={t('Log this movement once and FORGED will start producing specific, explained targets for it.')}
            />
          )}
        </div>
      </div>
    </Screen>
  )
}
