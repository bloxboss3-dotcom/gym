import { useMemo } from 'react'
import { useT } from '@/i18n/useT'
import { Link, useParams } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { CitationList, ConfidenceChip } from '@/components/RecommendationCard'
import { Alert, Card, Chip, EmptyState, SectionHeading, Stat } from '@/components/ui'
import { RULES } from '@/config/rules'
import { analyseSession, detectPlateau, historyFor, recommendNextSession, ACTION_LABEL } from '@/engine/progression'
import { formatWeight } from '@/engine/units'
import { formatDateLabel, lastNDays } from '@/lib/date'
import { useStore } from '@/state/store'

/**
 * The full audit trail behind one recommendation.
 *
 * This screen exists because "trust me" is not an acceptable answer from a
 * training app. Everything the engine looked at is shown, including the inputs
 * it wanted and did not have.
 */
export default function RecommendationDetail() {
  const { t } = useT()
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const { data } = useStore()
  const profile = data.profile!
  const units = profile.units
  const exercise = data.exercises.find((e) => e.id === exerciseId)

  const history = useMemo(() => historyFor(data.sessions, exerciseId ?? '', 8), [data.sessions, exerciseId])
  const lastEntry = useMemo(
    () =>
      data.sessions
        .filter((s) => s.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date))
        .flatMap((s) => s.entries)
        .find((e) => e.exerciseId === exerciseId),
    [data.sessions, exerciseId],
  )

  const recentRunKm = useMemo(() => {
    const week = new Set(lastNDays(7))
    return data.runs.filter((r) => week.has(r.date)).reduce((s, r) => s + r.distanceKm, 0)
  }, [data.runs])

  const recommendation = useMemo(() => {
    if (!exercise) return null
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
        recentRunKm,
      },
    )
  }, [exercise, history, lastEntry, units, data.checkins, recentRunKm])

  const plateau = useMemo(() => detectPlateau(history), [history])

  if (!exercise || !recommendation) {
    return (
      <Screen title={t('Recommendation')} back="/progress">
        <EmptyState title={t('Nothing to explain yet')} body={t('This exercise is not in your library.')} />
      </Screen>
    )
  }

  return (
    <Screen title={t('Why this?')} subtitle={t(exercise.name)} back={`/train/exercise/${exercise.id}`}>
      <div className="space-y-4">
        <Card raised>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-smoke">{t('Recommended action')}</p>
              <p className="font-display text-2xl uppercase leading-tight mt-0.5">{recommendation.headline}</p>
              <Chip tone="ember" className="mt-2">
                {ACTION_LABEL[recommendation.action]}
              </Chip>
            </div>
            <ConfidenceChip confidence={recommendation.confidence} />
          </div>
        </Card>

        <Card>
          <SectionHeading title={t('Exact next-session target')} />
          <p className="font-display text-xl text-ember-400">{recommendation.target.description}</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <li className="text-ash">
              {t('Load:')}{' '}
              <span className="text-parchment">
                {recommendation.target.loadKg === null
                  ? t('your choice')
                  : formatWeight(recommendation.target.loadKg, units)}
              </span>
            </li>
            <li className="text-ash">
              {t('Sets:')} <span className="text-parchment">{recommendation.target.sets}</span>
            </li>
            <li className="text-ash">
              {t('Reps:')}{' '}
              <span className="text-parchment">
                {recommendation.target.repMin}–{recommendation.target.repMax}
              </span>
            </li>
            <li className="text-ash">
              {t('Target RIR:')} <span className="text-parchment">{recommendation.target.targetRIR}</span>
            </li>
            {recommendation.target.totalRepsTarget !== null && (
              <li className="text-ash col-span-2">
                {t('Beat:')}{' '}
                <span className="text-parchment">
                  {t('{reps} total reps', { reps: recommendation.target.totalRepsTarget })}
                </span>
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <SectionHeading title={t('Plain-language reason')} />
          <p className="text-sm text-ash leading-relaxed">{recommendation.reason}</p>
        </Card>

        <Card>
          <SectionHeading title={t('Rule used')} hint={t('Every threshold lives in one documented config file.')} />
          <p className="font-mono text-[11px] text-parchment/90 leading-relaxed bg-coal/70 border border-slate rounded-lg px-3 py-2.5">
            {recommendation.rule}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <li className="text-ash">
              {t('RIR window:')} <span className="text-parchment tabular">{RULES.progression.rirWindow.min}–{RULES.progression.rirWindow.max}</span>
            </li>
            <li className="text-ash">
              {t('Pain block:')} <span className="text-parchment tabular">≥ {RULES.progression.painBlockThreshold}/10</span>
            </li>
            <li className="text-ash">
              {t('Stall after:')}{' '}
              <span className="text-parchment tabular">
                {t('{n} sessions', { n: RULES.plateau.sessionsToStall })}
              </span>
            </li>
            <li className="text-ash">
              {t('Back-off:')} <span className="text-parchment tabular">{Math.round(RULES.progression.backoffPct * 100)}%</span>
            </li>
          </ul>
        </Card>

        {recommendation.warning && (
          <Alert tone="danger" title={t('Safety')}>
            {recommendation.warning}
          </Alert>
        )}

        <Card>
          <SectionHeading title={t('Confidence')} />
          <div className="flex items-center gap-2">
            <ConfidenceChip confidence={recommendation.confidence} />
            <span className="text-sm text-ash">
              based on {history.length} comparable session{history.length === 1 ? '' : 's'}
            </span>
          </div>
          {recommendation.missingData.length > 0 ? (
            <>
              <p className="text-xs uppercase tracking-wider text-smoke mt-3 mb-1.5">{t('Missing or uncertain')}</p>
              <ul className="list-disc pl-4 space-y-1 text-sm text-ash">
                {recommendation.missingDataParts.map((item) => (
                  <li key={item.template}>{t(item.template, item.vars)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ash mt-2">{t('Nothing important is missing for this recommendation.')}</p>
          )}
        </Card>

        <Card>
          <SectionHeading title={t('What the engine looked at')} />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label={t('Sessions')} value={history.length} />
            <Stat label={t('Stalled')} value={plateau.stalledSessions} sub={plateau.stalled ? 'Plateau' : 'Progressing'} />
            <Stat label={t('Run load')} value={`${recentRunKm.toFixed(1)} km`} sub={t('last 7 days')} />
          </div>
          <ul className="space-y-2">
            {history.map((performance) => {
              const analysis = analyseSession(performance)
              return (
                <li key={performance.sessionId + performance.date} className="rounded-lg border border-slate bg-coal/70 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-parchment">{formatDateLabel(performance.date)}</span>
                    <span className="text-xs text-ash tabular">
                      e1RM {formatWeight(analysis.bestE1RM, units)}
                    </span>
                  </div>
                  <p className="text-xs text-ash mt-1 tabular">
                    {performance.sets
                      .map((s) => `${formatWeight(s.weightKg, units, { unit: false })}×${s.reps}${s.rir !== null ? `@${s.rir}` : ''}`)
                      .join(' · ')}
                  </p>
                  <p className="text-[11px] text-smoke mt-1">
                    {analysis.setsAtTop}/{performance.plannedSets} sets at top of range · avg RIR{' '}
                    {analysis.averageRir ?? '—'} · pain {performance.pain}/10 · technique {performance.technique}
                  </p>
                </li>
              )
            })}
            {!history.length && <li className="text-sm text-ash">{t('No comparable sessions yet.')}</li>}
          </ul>
          <p className="text-xs text-smoke mt-3 leading-relaxed">{plateau.detail}</p>
        </Card>

        <Card>
          <SectionHeading title={t('Evidence')} />
          <CitationList ids={recommendation.citationIds} />
        </Card>

        <Alert tone="info">
          {t('FORGED cannot measure how much muscle you have gained, and it does not pretend to. It optimises what it can see: load, reps, effort, pain, consistency and recovery inputs. Everything above is deterministic — no language model made this decision, and the same inputs will always produce the same output.')}
        </Alert>

        <Link
          to="/profile/science"
          className="block text-center text-sm text-ember-400 font-medium touch-target py-2"
        >
          {t('Read the Science & Safety centre →')}
        </Link>
      </div>
    </Screen>
  )
}
