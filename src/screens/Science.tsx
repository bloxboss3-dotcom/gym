import { useState } from 'react'
import { Screen } from '@/components/AppShell'
import { Alert, Card, Chip, Disclosure, SectionHeading, cx } from '@/components/ui'
import { CITATIONS } from '@/data/citations'
import { RULES } from '@/config/rules'
import { useT } from '@/i18n/useT'

/**
 * Science & safety centre.
 *
 * The point of this screen is calibration: FORGED should be trusted exactly as
 * much as it deserves. It states plainly what it can optimise, what it can only
 * estimate, and what it cannot know at all.
 */

const TOPICS = [
  { key: 'all', label: 'All' },
  { key: 'resistance', label: 'Lifting' },
  { key: 'volume', label: 'Volume' },
  { key: 'effort', label: 'Effort' },
  { key: 'protein', label: 'Protein' },
  { key: 'energy', label: 'Calories' },
  { key: 'concurrent', label: 'Concurrent' },
  { key: 'running', label: 'Running' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'safety', label: 'Safety' },
] as const

export default function Science() {
  const { t } = useT()
  const [topic, setTopic] = useState<(typeof TOPICS)[number]['key']>('all')
  const citations = topic === 'all' ? CITATIONS : CITATIONS.filter((c) => c.topics.includes(topic))

  return (
    <Screen title={t('Science & safety')} subtitle={t('What this app knows, and what it doesn\'t')} back="/profile">
      <div className="space-y-4">
        <Alert tone="danger" title={t('Stop training and seek help if')}>
          {t('You get chest pain or pressure, unusual breathlessness, dizziness or fainting, a sudden severe headache, or sharp pain with numbness, tingling or weakness. FORGED is educational software — it cannot assess symptoms and it is not a substitute for a physician, physiotherapist or registered dietitian.')}
        </Alert>

        <Card raised>
          <SectionHeading title={t('What FORGED can optimise')} />
          <ul className="space-y-1.5 text-sm text-ash list-disc pl-4">
            <li>{t('Whether you train, how often, and whether you finish the sessions you planned.')}</li>
            <li>{t('How much hard-set volume each muscle receives across a week.')}</li>
            <li>{t('How load progresses — deterministically, on the evidence you log.')}</li>
            <li>{t('How close your sets run to failure, and whether that is drifting.')}</li>
            <li>{t('Whether your protein intake reaches a defensible daily target.')}</li>
            <li>{t('Whether running load is being added faster than you are completing it.')}</li>
            <li>{t('Whether accumulated fatigue signals suggest a lighter week.')}</li>
          </ul>
        </Card>

        <Card>
          <SectionHeading title={t('What FORGED can only estimate')} />
          <ul className="space-y-1.5 text-sm text-ash list-disc pl-4">
            <li>
              <strong className="text-parchment">{t('Estimated 1RM.')}</strong>{' '}
              {t('A formula fitted to group data, adjusted for your reported reps in reserve. It moves with fatigue, sleep, and how honest your RIR ratings are.')}
            </li>
            <li>
              <strong className="text-parchment">{t('Fatigue.')}</strong>{' '}
              {t('Inferred from performance changes and your self-reports. There is no validated consumer test for accumulated fatigue.')}
            </li>
            <li>
              <strong className="text-parchment">{t('Protein needs.')}</strong>{' '}
              {t('Scaled from body weight using population averages. Individual requirements vary.')}
            </li>
            <li>
              <strong className="text-parchment">{t('Effort.')}</strong>{' '}
              {t('Only as accurate as your RIR ratings, which are a learned skill — most people underestimate how far from failure they are early on.')}
            </li>
            <li>
              <strong className="text-parchment">{t('Calorie needs.')}</strong>{' '}
              {t('Predicted from a formula using your weight, height, age and sex, plus a coarse activity multiplier. Even the best predictive equation lands within 10% of measured resting expenditure for only about four people in five, and food labels carry their own error. Your own weight trend over two or three weeks is a far better measurement than the prediction.')}
            </li>
          </ul>
        </Card>

        <Card className="border-caution/40">
          <SectionHeading title={t('What FORGED cannot know')} />
          <p className="text-sm text-ash leading-relaxed">
            <strong className="text-parchment">{t('How much muscle you gained.')}</strong>{' '}
            {t(
              'Nothing in this app measures body composition. Not the estimated 1RM, not the volume dashboard, not your body weight trend. Muscle gain is slow, non-linear, and invisible to a phone. FORGED optimises the conditions under which muscle growth is likely — training stimulus, protein, recovery, consistency — and reports on those honestly. Any app that tells you it knows you gained 1.4 kg of muscle this month is guessing.',
            )}
          </p>
        </Card>

        <Disclosure summary={t('How reps in reserve (RIR) works')} defaultOpen>
          <p className="mb-2">
            {t('RIR is how many more reps you could have done with good form before failure. Finishing a set of 10 with 2 RIR means you believe you could have managed 12.')}
          </p>
          <p className="mb-2">
            {t(
              'FORGED targets {min}–{max} RIR on working sets. Sets stopped a couple of reps short appear to grow muscle about as well as sets taken to failure while costing considerably less fatigue — which matters when you have to come back and do it again in 48 hours.',
              { min: RULES.progression.rirWindow.min, max: RULES.progression.rirWindow.max },
            )}
          </p>
          <p>
            {t('Your estimates will be wrong at first, usually in the direction of thinking you are closer to failure than you are. That is fine. Log them anyway; the accuracy improves and every recommendation gets sharper.')}
          </p>
        </Disclosure>

        <Disclosure summary={t('How double progression works')} defaultOpen>
          <p className="mb-2">
            {t('You get a rep range, say 3 sets of 8–12. You stay at the same load until every working set reaches the top of that range at an appropriate effort with acceptable technique and no meaningful pain. Then, and only then, the load goes up by the smallest increment your equipment allows, and the reps fall back toward the bottom of the range.')}
          </p>
          <p className="mb-2">
            {t('Example: you press 3 × 8–12 and log 12, 12, 11 at about 2 RIR. FORGED keeps the load and asks for 12, 12, 12. Once you hit that, it adds a plate.')}
          </p>
          <p>
            {t(
              'The rep drop after a load increase is the system working, not a regression. Upper-body jumps are kept around {upperMin}–{upperMax}%; lower body around {lowerMin}–{lowerMax}%, limited by what your gym actually stocks.',
              {
                upperMin: Math.round(RULES.progression.upperBodyStepPct.min * 100),
                upperMax: Math.round(RULES.progression.upperBodyStepPct.max * 100),
                lowerMin: Math.round(RULES.progression.lowerBodyStepPct.min * 100),
                lowerMax: Math.round(RULES.progression.lowerBodyStepPct.max * 100),
              },
            )}
          </p>
        </Disclosure>

        <Disclosure summary={t('Why rest and deloads are productive')}>
          <p className="mb-2">
            {t('Training is the stimulus; adaptation happens between sessions. Sustained hard training accumulates fatigue that masks fitness — you get stronger while appearing to get weaker.')}
          </p>
          <p className="mb-2">
            FORGED watches six signals ({RULES.deload.triggerCount} firing at once triggers a suggestion): broad
            performance decline, elevated soreness, low readiness, persistent joint discomfort, repeated sessions
            harder than prescribed, and {RULES.deload.weeksBeforeDeload}+ consecutive weeks without a back-off.
          </p>
          <p>
            A deload week keeps the movements and cuts roughly {Math.round(RULES.deload.volumeReductionPct * 100)}% of
            the sets and {Math.round(RULES.deload.loadReductionPct * 100)}% of the load. It counts as a completed week
            for your consistency and pays out rewards like any other — because it is training, not time off.
          </p>
        </Disclosure>

        <Disclosure summary={t('Protein assumptions')}>
          <p className="mb-2">
            Baseline {RULES.protein.baselineGPerKg} g per kg of body weight per day, with a practical range of{' '}
            {RULES.protein.rangeGPerKg.min}–{RULES.protein.rangeGPerKg.max} g/kg/day. The upper end is worth using
            when you are dieting, already lean, or simply want margin.
          </p>
          <p className="mb-2">
            {RULES.protein.rangeGPerKg.max} g/kg is <em>{t('not')}</em> a requirement. The meta-analytic breakpoint for
            additional lean-mass benefit sits near {RULES.protein.baselineGPerKg} g/kg, with a wide confidence
            interval — which is exactly why FORGED shows a range rather than one authoritative number.
          </p>
          <p>
            Above a BMI of {RULES.protein.useLeanEstimateBmi}, targets are scaled to an estimated lean mass instead of
            total body weight, because fat mass carries little protein demand. That is an estimate, and the app says
            so on the screen.
          </p>
        </Disclosure>

        <Disclosure summary={t('How the calorie and macro targets are built')}>
          <p className="mb-2">
            {t('Four steps, in this order.')} <strong className="text-parchment">{t('One:')}</strong>{' '}
            {t('resting energy expenditure from the Mifflin-St Jeor equation.')}{' '}
            <strong className="text-parchment">{t('Two:')}</strong>{' '}
            {t('a multiplier for your non-exercise daily activity — deliberately lower than the classic “activity factor” ladder, because that ladder bakes exercise in and then double-counts it once you also tell FORGED your training schedule.')}{' '}
            <strong className="text-parchment">{t('Three:')}</strong>{' '}
            {t('an estimate of your actual training cost, added separately.')}{' '}
            <strong className="text-parchment">{t('Four:')}</strong>{' '}
            {t('a modest offset for your goal.')}
          </p>
          <p className="mb-2">
            The offsets are capped on both sides. A surplus can never exceed{' '}
            {RULES.energy.maxSurplusKcal} kcal a day, because eating further past that adds fat rather than muscle. A
            deficit can never exceed the rate implied by{' '}
            {(RULES.energy.maxWeeklyLossFraction * 100).toFixed(2)}% of body weight per week, and the target is never
            allowed below {(RULES.energy.minFractionOfBmr * 100).toFixed(0)}% of your estimated resting expenditure
            whatever the goal asks for. Faster weight loss costs lean mass and adherence.
          </p>
          <p>
            Macros then follow: protein first from the protein target, a dietary fat floor of{' '}
            {RULES.energy.minFatGPerKg} g/kg or {(RULES.energy.minFatPctOfKcal * 100).toFixed(0)}% of energy
            (whichever is larger), and carbohydrate takes the remainder because that is the macro fuelling the
            training. If counting calories is not healthy for you, protein-only mode in the nutrition settings hides
            every energy number in the app permanently.
          </p>
        </Disclosure>

        <Disclosure summary={t('Concurrent strength and endurance training')}>
          <p className="mb-2">
            {t('Training both at once used to be described as straightforwardly harmful to muscle and strength gains. The more recent pooled evidence is far less alarming: muscle size gains appear largely intact, maximal strength largely preserved, and explosive power the clearest casualty.')}
          </p>
          <p className="mb-2">
            {t('Interference scales with how much endurance work you do, how hard, how close in time to lifting, and whether it is running (higher eccentric load) or cycling.')}
          </p>
          <p>
            FORGED manages this by scheduling rather than restricting. If you told it muscle comes first, it keeps
            hard running at least {RULES.running.interferenceSpacingHours} hours away from hard lower-body sessions
            and caps quality running sessions at {RULES.running.qualitySessionsByPriority.muscle} per week. Easy
            running on lifting days is fine and is good for your health.
          </p>
        </Disclosure>

        <Disclosure summary={t('Why running does not use the 10% rule')}>
          <p className="mb-2">
            {t('The “never increase weekly mileage by more than 10%” rule is widely repeated and poorly supported. Reviews of the training-load literature find inconsistent evidence linking specific weekly increases to injury, and what association exists varies by injury type and by runner.')}
          </p>
          <p>
            FORGED caps increases by experience ({Math.round(RULES.running.weeklyIncreaseCap.beginner * 100)}% for
            beginners up to {Math.round(RULES.running.weeklyIncreaseCap.advanced * 100)}% for advanced runners, and
            never more than {RULES.running.absoluteWeeklyAddKm} km in a week) and then gates the increase on whether
            you actually completed last week, how hard it felt, and whether anything hurt. Below{' '}
            {RULES.running.lowVolumeKm} km/week it uses flat steps, because percentages of a small number are
            meaningless.
          </p>
        </Disclosure>

        <Disclosure summary={t('Why recommendations carry confidence levels')}>
          <p className="mb-2">
            {t('A recommendation from one session of data is a guess. From four sessions with consistent effort ratings, it is an inference. Presenting both with the same certainty would be dishonest.')}
          </p>
          <p className="mb-2">
            High confidence needs {RULES.confidence.highSessions}+ comparable sessions with reps in reserve logged on
            most sets. Missing effort data on more than{' '}
            {Math.round(RULES.confidence.missingRirFraction * 100)}% of sets downgrades it a level automatically.
          </p>
          <p>
            {t('Every recommendation also lists what data it wanted and did not have, so you can decide how much weight to give it.')}
          </p>
        </Disclosure>

        <Disclosure summary={t('When to see a professional')}>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-parchment">{t('Physician:')}</strong>{' '}
              {t('before starting if you have known cardiovascular, metabolic or kidney disease, or symptoms suggestive of them. Immediately for chest pain, fainting or unusual breathlessness.')}
            </li>
            <li>
              <strong className="text-parchment">{t('Physiotherapist:')}</strong>{' '}
              {t('pain that persists beyond a session or two, recurs with a specific movement, or comes with numbness, tingling or weakness.')}
            </li>
            <li>
              <strong className="text-parchment">{t('Registered dietitian:')}</strong>{' '}
              {t('managing a medical condition through diet, a history of disordered eating, pregnancy, or if you want an actual nutrition plan rather than a protein target.')}
            </li>
            <li>
              <strong className="text-parchment">{t('Qualified coach:')}</strong>{' '}
              {t('to have your technique watched by a human. No app can see your bar path.')}
            </li>
          </ul>
        </Disclosure>

        <div>
          <SectionHeading title={t('Sources')} hint={t('Every rule in FORGED traces back to one of these.')} />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={topic === t.key}
                onClick={() => setTopic(t.key)}
                className={cx(
                  'touch-target shrink-0 rounded-full border px-3 text-sm transition-colors',
                  topic === t.key ? 'border-ember-500 bg-ember-500/15 text-ember-200' : 'border-slate bg-coal text-ash',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {citations.map((citation) => (
              <li key={citation.id}>
                <Card>
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-medium text-cool underline underline-offset-2"
                    data-bibliographic
                  >
                    {citation.title}
                  </a>
                  <p className="text-xs text-smoke mt-1" data-bibliographic>
                    {citation.authors} · {citation.source} · {citation.year}
                  </p>
                  <p className="text-sm text-ash mt-2 leading-relaxed">{t(citation.takeaway)}</p>
                  {citation.caveat && (
                    <p className="text-xs text-caution mt-2 leading-relaxed">
                      {t('Caveat:')} {t(citation.caveat)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {citation.topics.map((t) => (
                      <Chip key={t} tone="neutral">
                        {t}
                      </Chip>
                    ))}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <Card>
          <SectionHeading title={t('Every threshold, in one place')} />
          <p className="text-sm text-ash leading-relaxed">
            {t('All the numbers the engine uses live in a single documented configuration file')}{' '}
            (<code className="text-ember-300">{t('src/config/rules.ts')}</code>){' '}
            {t('and a single reward economy file')}{' '}
            (<code className="text-ember-300">{t('src/config/economy.ts')}</code>).{' '}
            {t('Nothing is buried in the logic, and the unit tests assert behaviour against those values so a change to the config is a change to the app.')}
          </p>
        </Card>
      </div>
    </Screen>
  )
}
