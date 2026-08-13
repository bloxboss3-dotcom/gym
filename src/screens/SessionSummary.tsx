import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { RecommendationCard } from '@/components/RecommendationCard'
import { Alert, Button, Card, Chip, EmptyState, SectionHeading, Stat } from '@/components/ui'
import { REWARD_REASON_LABEL } from '@/data/quests'
import { historyFor, recommendNextSession } from '@/engine/progression'
import { personalRecords, sessionVolumeLoad, rirQuality } from '@/engine/stats'
import { formatWeight } from '@/engine/units'
import { formatDateLabel, formatDuration } from '@/lib/date'
import { ECONOMY } from '@/config/economy'
import { useStore } from '@/state/store'

/**
 * Session summary: what you did, what it earned, and — the important part —
 * what FORGED will ask for next time on every movement you logged.
 */
export default function SessionSummary() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data } = useStore()
  const session = data.sessions.find((s) => s.id === sessionId)
  const units = data.profile?.units ?? 'kg'

  const rewards = useMemo(
    () => data.game.ledger.filter((e) => e.sourceId === sessionId),
    [data.game.ledger, sessionId],
  )

  const recommendations = useMemo(() => {
    if (!session) return []
    return session.entries.map((entry) => {
      const exercise = data.exercises.find((e) => e.id === entry.exerciseId)
      // History up to and including this session, so the recommendation reflects
      // what was just logged.
      const history = historyFor(data.sessions, entry.exerciseId, 6)
      return {
        entry,
        exercise,
        recommendation: recommendNextSession(
          history,
          {
            sets: entry.plannedSets,
            repMin: entry.repMin,
            repMax: entry.repMax,
            targetRIR: entry.targetRIR,
            incrementKg: entry.incrementKg,
            lowerBody: exercise?.lowerBody ?? false,
            units,
          },
          {
            recentSoreness: data.checkins[0]?.soreness ?? null,
            recentReadiness: data.checkins[0]?.readiness ?? null,
          },
        ),
      }
    })
  }, [session, data.sessions, data.exercises, data.checkins, units])

  const prs = useMemo(() => personalRecords(data.sessions, data.exercises), [data.sessions, data.exercises])

  if (!session) {
    return (
      <Screen title="Summary" back="/train">
        <EmptyState
          title="Session not found"
          body="This session no longer exists. It may have been deleted or replaced by an imported backup."
          action={<Button variant="primary" onClick={() => navigate('/train')}>Back to Train</Button>}
        />
      </Screen>
    )
  }

  const workingSets = session.entries.flatMap((e) => e.sets.filter((s) => !s.warmup))
  const quality = rirQuality(session.entries.flatMap((e) => e.sets))
  const duration = session.endedAt ? (session.endedAt - session.startedAt) / 1000 : 0
  const totalXp = rewards.reduce((s, r) => s + r.xp, 0)
  const totalCoins = rewards.reduce((s, r) => s + r.coins, 0)
  const painFlag = session.entries.some((e) => e.pain >= 3)

  return (
    <Screen title="Session complete" subtitle={formatDateLabel(session.date)} back="/">
      <div className="space-y-4">
        <Card raised>
          <h2 className="font-display text-2xl uppercase tracking-wide">{session.title}</h2>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="Working sets" value={workingSets.length} />
            <Stat label="Volume load" value={formatWeight(sessionVolumeLoad(session, data.exercises), units, { decimals: 0 })} />
            <Stat label="Duration" value={formatDuration(duration)} />
          </div>
          {quality.averageRir !== null && (
            <p className="text-xs text-ash mt-3 leading-relaxed">
              Average effort {quality.averageRir} reps in reserve across {quality.ratedSets} rated sets
              {quality.toFailureFraction > 0.5 &&
                ' — more than half of those went to failure, which is more fatigue than most sessions need.'}
              {quality.missingFraction > 0.3 &&
                ` Effort was not recorded on ${Math.round(quality.missingFraction * 100)}% of sets, which lowers the confidence of next session's recommendations.`}
            </p>
          )}
        </Card>

        {/*
          Always shown, including when it paid nothing.
          Hiding the card when the payout was zero meant a long session could
          finish in silence, which reads as the app failing to notice rather
          than as a rule being applied — and this app explains its refusals
          everywhere else.
        */}
        {totalXp === 0 && totalCoins === 0 && (
          <Card>
            <p className="font-display text-lg uppercase tracking-wide text-smoke">No rewards for this one</p>
            <p className="text-xs text-ash mt-1.5 leading-relaxed">
              {workingSets.length < ECONOMY.limits.minWorkingSetsForReward
                ? `Sessions need at least ${ECONOMY.limits.minWorkingSetsForReward} working sets to pay out. This one is saved either way and still counts toward your weekly volume.`
                : duration / 60 < ECONOMY.limits.minSessionMinutes
                  ? `Sessions need to run at least ${ECONOMY.limits.minSessionMinutes} minutes to pay out. The training is saved either way.`
                  : `You have already hit today's ceiling of ${ECONOMY.limits.dailyXpCap} XP and ${ECONOMY.limits.dailyCoinCap} coins. The session counts for everything else — volume, progression, your streak — it just cannot print more currency today.`}
            </p>
          </Card>
        )}

        {(totalXp > 0 || totalCoins > 0) && (
          <Card className="border-gold-500/40">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg uppercase tracking-wide text-gold-300">Rewards earned</p>
              <div className="flex gap-2">
                <Chip tone="ember">+{totalXp} XP</Chip>
                <Chip tone="gold">+{totalCoins} coins</Chip>
              </div>
            </div>
            <ul className="mt-2.5 space-y-1">
              {rewards.map((reward) => (
                <li key={reward.id} className="text-xs text-ash flex justify-between gap-3">
                  <span>{REWARD_REASON_LABEL[reward.reason]} — {reward.detail}</span>
                  <span className="tabular shrink-0 text-smoke">+{reward.xp}/{reward.coins}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {painFlag && (
          <Alert tone="warn" title="Pain was reported">
            FORGED will not add load to a movement that hurt. If it keeps happening, swap the movement or get it
            looked at by a physiotherapist — an app cannot assess an injury.
          </Alert>
        )}

        <div>
          <SectionHeading title="Next session" hint="Generated from what you just logged." />
          <div className="space-y-3">
            {recommendations.map(({ entry, exercise, recommendation }) => (
              <RecommendationCard
                key={entry.id}
                recommendation={recommendation}
                exerciseName={exercise?.name ?? entry.exerciseId}
                detailHref={`/progress/recommendation/${entry.exerciseId}`}
                compact
              />
            ))}
            {!recommendations.length && (
              <Card>
                <p className="text-sm text-ash">No exercises were logged in this session.</p>
              </Card>
            )}
          </div>
        </div>

        {prs.length > 0 && (
          <div>
            <SectionHeading title="Personal records" hint="Best working set and best estimated 1RM per lift." />
            <ul className="space-y-1.5">
              {prs
                .filter((pr) => session.entries.some((e) => e.exerciseId === pr.exerciseId))
                .map((pr) => (
                  <li key={pr.exerciseId}>
                    <Link
                      to={`/train/exercise/${pr.exerciseId}`}
                      className="forge-panel flex items-center justify-between gap-3 px-3.5 py-3 touch-target"
                    >
                      <span className="text-sm text-parchment truncate">
                        {data.exercises.find((e) => e.id === pr.exerciseId)?.name ?? pr.exerciseId}
                      </span>
                      <span className="text-xs text-ash tabular shrink-0">
                        {formatWeight(pr.topWeightKg, units)} × {pr.topWeightReps} · e1RM{' '}
                        {formatWeight(pr.bestE1RM, units)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button full onClick={() => navigate('/progress')}>
            View progress
          </Button>
          <Button variant="primary" full onClick={() => navigate('/')}>
            Done
          </Button>
        </div>
      </div>
    </Screen>
  )
}
