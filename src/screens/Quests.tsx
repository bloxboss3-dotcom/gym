import { useMemo } from 'react'
import { Screen } from '@/components/AppShell'
import { Button, Card, Chip, ProgressBar, SectionHeading, cx } from '@/components/ui'
import { ECONOMY } from '@/config/economy'
import { evaluateAchievements, evaluateQuests } from '@/engine/quests'
import { formatDateLabel, toIsoDate } from '@/lib/date'
import { useStore } from '@/state/store'
import { useT } from '@/i18n/useT'

const ICONS: Record<string, string> = {
  anvil: '⚒',
  flame: '🔥',
  shield: '🛡',
  road: '🥾',
  crown: '♛',
  scale: '⚖',
  heart: '♥',
  hammer: '🔨',
}

/** Quests and achievements — all behavioural, none performance-gated. */
export default function Quests() {
  const { t } = useT()
  const store = useStore()
  const { data } = store
  const today = toIsoDate()

  const quests = useMemo(() => evaluateQuests(data, today), [data, today])
  const achievements = useMemo(() => evaluateAchievements(data, today), [data, today])

  const daily = quests.filter((q) => q.def.period === 'daily')
  const weekly = quests.filter((q) => q.def.period === 'weekly')
  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)

  return (
    <Screen title={t('Quests')} subtitle={`${unlocked.length}/${achievements.length} achievements`} back="/forge">
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-ash leading-relaxed">
            {t('Every quest here rewards something you fully control: showing up, logging honestly, eating enough protein, and taking the recovery day you were prescribed. None of them reward adding weight recklessly, and a planned deload completes one rather than breaking it.')}
          </p>
        </Card>

        <div>
          <SectionHeading title={t('Today')} hint={t('Resets at midnight.')} />
          <ul className="space-y-2">
            {daily.map((quest) => (
              <QuestRow key={quest.def.id} quest={quest} onClaim={() => store.claimQuest(quest.def.id, quest.periodKey)} />
            ))}
          </ul>
        </div>

        <div>
          <SectionHeading title={t('This week')} hint={t('Resets Monday.')} />
          <ul className="space-y-2">
            {weekly.map((quest) => (
              <QuestRow key={quest.def.id} quest={quest} onClaim={() => store.claimQuest(quest.def.id, quest.periodKey)} />
            ))}
          </ul>
        </div>

        <div>
          <SectionHeading title={t('Achievements')} />
          <ul className="space-y-2">
            {[...unlocked, ...locked].map((achievement) => (
              <li key={achievement.def.id}>
                <Card className={cx(achievement.unlocked ? 'border-gold-500/40' : 'opacity-75')}>
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cx(
                        'shrink-0 size-11 rounded-xl grid place-items-center text-xl',
                        achievement.unlocked ? 'bg-gold-500/15 text-gold-300' : 'bg-steel text-smoke',
                      )}
                    >
                      {ICONS[achievement.def.icon] ?? '◆'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-parchment truncate">{t(achievement.def.title)}</p>
                        {achievement.unlocked ? (
                          <Chip tone="gold">{t('Unlocked')}</Chip>
                        ) : (
                          <Chip tone="neutral">{Math.round(achievement.progress * 100)}%</Chip>
                        )}
                      </div>
                      <p className="text-xs text-ash mt-0.5 leading-snug">{t(achievement.def.description)}</p>
                      {!achievement.unlocked && (
                        <ProgressBar value={achievement.progress} max={1} className="mt-2" tone="gold" />
                      )}
                      <p className="text-[11px] text-smoke mt-1">
                        {t(achievement.detailTemplate, achievement.detailVars)}
                        {achievement.unlockedAt ? ` · ${formatDateLabel(new Date(achievement.unlockedAt).toISOString().slice(0, 10))}` : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <Card>
          <SectionHeading title={t('Reward economics')} hint={t('Published, not hidden.')} />
          <ul className="space-y-1.5 text-sm">
            {Object.entries(ECONOMY.rewards)
              .filter(([, value]) => value.xp > 0 || value.coins > 0)
              .map(([reason, value]) => (
                <li key={reason} className="flex justify-between gap-2">
                  <span className="text-ash capitalize">{reason.replace(/_/g, ' ')}</span>
                  <span className="tabular text-parchment shrink-0">
                    +{value.xp} XP · +{value.coins} ◈
                  </span>
                </li>
              ))}
          </ul>
          <p className="text-xs text-smoke mt-2 leading-relaxed">
            {t('Capped at {xp} XP and {coins} coins per day, with each reward payable once per source. That is why splitting one workout into six will not earn six payouts.', {
              xp: ECONOMY.limits.dailyXpCap,
              coins: ECONOMY.limits.dailyCoinCap,
            })}
          </p>
        </Card>
      </div>
    </Screen>
  )
}

function QuestRow({
  quest,
  onClaim,
}: {
  quest: ReturnType<typeof evaluateQuests>[number]
  onClaim: () => void
}) {
  const { t } = useT()
  return (
    <li>
      <Card className={cx(quest.complete && !quest.claimed && 'border-gold-500/50')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-parchment">{t(quest.def.title)}</p>
            <p className="text-xs text-ash mt-0.5 leading-snug">{t(quest.def.description)}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Chip tone="ember">+{quest.def.xp} XP</Chip>
              <Chip tone="gold">+{quest.def.coins} ◈</Chip>
              {quest.def.pack && <Chip tone="cool">{quest.def.pack} pack</Chip>}
            </div>
          </div>
          {quest.claimed ? (
            <Chip tone="good">{t('Claimed')}</Chip>
          ) : quest.complete ? (
            <Button size="sm" variant="gold" onClick={onClaim}>
              {t('Claim')}
            </Button>
          ) : (
            <Chip tone="neutral" className="tabular">
              {quest.progress}/{quest.target}
            </Chip>
          )}
        </div>
        <ProgressBar
          value={quest.progress}
          max={quest.target}
          tone={quest.complete ? 'gold' : 'ember'}
          className="mt-2.5"
        />
      </Card>
    </li>
  )
}
