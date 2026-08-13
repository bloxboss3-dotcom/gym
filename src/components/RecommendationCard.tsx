import { Link } from 'react-router-dom'
import { citationsFor } from '@/data/citations'
import { ACTION_LABEL, ACTION_TONE, type Confidence, type Recommendation } from '@/engine/progression'
import { Alert, Card, Chip, Disclosure, cx } from '@/components/ui'

/**
 * The transparency contract, rendered.
 *
 * Every recommendation the engine produces shows all seven required pieces:
 * action, exact next target, plain-language reason, the rule that fired,
 * confidence, what data was missing, and a safety warning when relevant.
 * Nothing is hidden behind a paywall or a level.
 */

const CONFIDENCE_META: Record<Confidence, { label: string; tone: 'good' | 'caution' | 'danger'; blurb: string }> = {
  high: {
    label: 'High confidence',
    tone: 'good',
    blurb: 'Enough comparable sessions with consistent effort data to trust this.',
  },
  medium: {
    label: 'Medium confidence',
    tone: 'caution',
    blurb: 'Reasonable evidence, but more sessions or more complete effort logging would sharpen it.',
  },
  low: {
    label: 'Low confidence',
    tone: 'danger',
    blurb: 'Thin data. Treat this as a starting point and use your own judgement.',
  },
}

export function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  const meta = CONFIDENCE_META[confidence]
  return (
    <Chip tone={meta.tone} className="shrink-0">
      {meta.label}
    </Chip>
  )
}

export function CitationList({ ids }: { ids: readonly string[] }) {
  const citations = citationsFor(ids)
  if (!citations.length) return null
  return (
    <ul className="space-y-2.5 mt-1">
      {citations.map((citation) => (
        <li key={citation.id} className="text-xs leading-relaxed">
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-cool underline underline-offset-2 font-medium"
          >
            {citation.authors} ({citation.year}) — {citation.title}
          </a>
          <p className="text-smoke mt-0.5">{citation.source}</p>
          <p className="text-ash mt-1">{citation.takeaway}</p>
          {citation.caveat && <p className="text-caution/90 mt-1">Caveat: {citation.caveat}</p>}
        </li>
      ))}
    </ul>
  )
}

export function RecommendationCard({
  recommendation,
  exerciseName,
  detailHref,
  compact,
}: {
  recommendation: Recommendation
  exerciseName?: string
  detailHref?: string
  compact?: boolean
}) {
  const tone = ACTION_TONE[recommendation.action]
  const toneClasses = {
    good: 'border-vital/40',
    neutral: 'border-slate',
    caution: 'border-caution/45',
    danger: 'border-danger/55',
  }[tone]
  const chipTone = { good: 'good', neutral: 'neutral', caution: 'caution', danger: 'danger' } as const

  return (
    <Card className={cx('border', toneClasses)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {exerciseName && <p className="text-xs uppercase tracking-wider text-smoke">{exerciseName}</p>}
          <p className="font-display text-xl uppercase tracking-wide leading-tight mt-0.5">
            {recommendation.headline}
          </p>
        </div>
        <Chip tone={chipTone[tone]}>{ACTION_LABEL[recommendation.action]}</Chip>
      </div>

      {/* Which weight this is about. Shown inline rather than behind the
          "data gaps" disclosure, because it is not a gap — it is a decision
          the engine made, and hiding it is what makes an app look like it did
          not notice you lifted two different weights. */}
      {recommendation.judgedOn && (
        <p className="mt-3 rounded-lg border border-cool/35 bg-cool/[0.08] px-3 py-2 text-xs text-ash leading-relaxed">
          {recommendation.judgedOn}
        </p>
      )}

      <div className="mt-3 rounded-lg bg-coal/80 border border-slate/70 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wider text-smoke">Next session target</p>
        <p className="text-sm text-parchment mt-0.5 leading-snug">{recommendation.target.description}</p>
      </div>

      <p className={cx('text-sm text-ash mt-3 leading-relaxed', compact && 'line-clamp-4')}>
        {recommendation.reason}
      </p>

      {recommendation.warning && (
        <Alert tone="danger" className="mt-3" title="Safety">
          {recommendation.warning}
        </Alert>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3">
        <ConfidenceChip confidence={recommendation.confidence} />
        {recommendation.missingData.length > 0 && (
          <Chip tone="neutral">{recommendation.missingData.length} data gap{recommendation.missingData.length === 1 ? '' : 's'}</Chip>
        )}
      </div>

      {!compact && (
        <div className="mt-3 space-y-2">
          <Disclosure summary="Rule used" tone="quiet">
            <p className="font-mono text-[11px] text-parchment/90 leading-relaxed">{recommendation.rule}</p>
          </Disclosure>
          <Disclosure summary="Evidence" tone="quiet">
            <CitationList ids={recommendation.citationIds} />
          </Disclosure>
          {recommendation.missingData.length > 0 && (
            <Disclosure summary="What FORGED is missing" tone="quiet">
              <ul className="list-disc pl-4 space-y-1">
                {recommendation.missingData.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 text-smoke">
                {CONFIDENCE_META[recommendation.confidence].blurb}
              </p>
            </Disclosure>
          )}
        </div>
      )}

      {detailHref && (
        <Link
          to={detailHref}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-ember-400 font-medium touch-target"
        >
          Full reasoning
          <span aria-hidden>→</span>
        </Link>
      )}
    </Card>
  )
}
