import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/AppShell'
import { Alert, Button, Card, NumberStepper, SectionHeading, Slider, TextArea } from '@/components/ui'
import { RULES } from '@/config/rules'
import { formatDateLabel, toIsoDate } from '@/lib/date'
import { useStore } from '@/state/store'

/**
 * Readiness check-in.
 *
 * Fifteen seconds of honest self-report is what makes deload detection and the
 * plateau diagnosis meaningful. There is no wearable requirement and no score
 * that punishes you for a bad night.
 */
export default function Checkin() {
  const { data, addCheckin } = useStore()
  const navigate = useNavigate()
  const today = toIsoDate()
  const existing = data.checkins.find((c) => c.date === today)

  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? 7.5)
  const [sleepQuality, setSleepQuality] = useState(existing?.sleepQuality ?? 3)
  const [soreness, setSoreness] = useState(existing?.soreness ?? 2)
  const [readiness, setReadiness] = useState(existing?.readiness ?? 3)
  const [stress, setStress] = useState(existing?.stress ?? 2)
  const [jointPain, setJointPain] = useState(existing?.jointPain ?? 0)
  const [note, setNote] = useState(existing?.note ?? '')

  const save = () => {
    addCheckin({ date: today, sleepHours, sleepQuality, soreness, readiness, stress, jointPain, note: note.trim() || undefined })
    navigate('/')
  }

  const flags: string[] = []
  if (soreness >= RULES.deload.sorenessThreshold) flags.push('soreness is elevated')
  if (readiness <= RULES.deload.readinessThreshold) flags.push('readiness is low')
  if (jointPain >= RULES.deload.jointPainThreshold) flags.push('joint discomfort is notable')

  return (
    <Screen title="Check in" subtitle={formatDateLabel(today)} back="/">
      <div className="space-y-4">
        {existing && (
          <Alert tone="info">You already checked in today. Saving again replaces that entry.</Alert>
        )}

        <Card>
          <SectionHeading title="Sleep" />
          <div className="space-y-4">
            <NumberStepper
              label="Hours slept"
              value={sleepHours}
              min={0}
              max={14}
              step={0.5}
              decimals={1}
              suffix="hrs"
              onChange={setSleepHours}
            />
            <Slider
              label="Sleep quality (1–5)"
              value={sleepQuality}
              min={1}
              max={5}
              labels={['Terrible', 'Excellent']}
              tone="good"
              onChange={setSleepQuality}
            />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Body" />
          <div className="space-y-4">
            <Slider
              label="Muscle soreness (1–5)"
              value={soreness}
              min={1}
              max={5}
              labels={['None', 'Very sore']}
              tone={soreness >= 4 ? 'caution' : 'ember'}
              onChange={setSoreness}
            />
            <Slider
              label="Joint discomfort (0–10)"
              value={jointPain}
              min={0}
              max={10}
              labels={['None', 'Severe']}
              tone={jointPain >= 3 ? 'caution' : 'ember'}
              onChange={setJointPain}
            />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Readiness" />
          <div className="space-y-4">
            <Slider
              label="How ready do you feel to train? (1–5)"
              value={readiness}
              min={1}
              max={5}
              labels={['Wrecked', 'Primed']}
              tone="good"
              onChange={setReadiness}
            />
            <Slider
              label="Life stress (1–5)"
              value={stress}
              min={1}
              max={5}
              labels={['Calm', 'Overloaded']}
              tone={stress >= 4 ? 'caution' : 'ember'}
              onChange={setStress}
            />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Notes" />
          <TextArea
            value={note}
            placeholder="Anything worth remembering about today"
            onChange={(e) => setNote(e.target.value)}
          />
        </Card>

        {flags.length > 0 && (
          <Alert tone="warn" title="Worth noting">
            Today {flags.join(' and ')}. That does not automatically mean skip training — but if this pattern repeats,
            FORGED will suggest a deload rather than pushing load onto accumulated fatigue.
          </Alert>
        )}

        {jointPain >= 6 && (
          <Alert tone="danger" title="Stop and get this looked at">
            Joint pain at {jointPain}/10 is not something to train through. See a physiotherapist or physician. If you
            have chest pain, dizziness, fainting or unusual breathlessness, stop exercising and seek urgent medical
            attention.
          </Alert>
        )}

        <Button variant="primary" size="lg" full onClick={save}>
          Save check-in
        </Button>
        <p className="text-xs text-smoke text-center leading-relaxed">
          Check-ins are what let FORGED tell the difference between “you need to push harder” and “you need a lighter
          week”. Rest days you log this way count toward your consistency.
        </p>
      </div>
    </Screen>
  )
}
