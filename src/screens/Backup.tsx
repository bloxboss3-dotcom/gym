import { useRef, useState } from 'react'
import { Screen } from '@/components/AppShell'
import { Alert, Button, Card, ConfirmDialog, SectionHeading, Stat } from '@/components/ui'
import { backupFilename, parseBackupText, serializeBackup } from '@/engine/backup'
import type { ImportResult } from '@/engine/backup'
import { formatDateLabel } from '@/lib/date'
import { useStore } from '@/state/store'
import { useT } from '@/i18n/useT'

/**
 * Backup export / import.
 *
 * Local-first means the user carries the risk, so this screen is deliberately
 * blunt about it. Import validates before it replaces anything and shows exactly
 * what it found.
 */
export default function Backup() {
  const { t } = useT()
  const store = useStore()
  const { data } = store
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [confirmImport, setConfirmImport] = useState(false)
  const [exported, setExported] = useState<string | null>(null)

  const exportBackup = () => {
    const json = serializeBackup(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename(data.profile?.name)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // Revoke on the next tick so Safari has time to start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    setExported(new Date().toLocaleString())
  }

  const readFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseBackupText(text)
    setResult(parsed)
    if (parsed.ok) setConfirmImport(true)
  }

  const totalSets = data.sessions.reduce(
    (n, s) => n + s.entries.reduce((m, e) => m + e.sets.filter((x) => !x.warmup).length, 0),
    0,
  )

  return (
    <Screen title={t('Backup')} subtitle={t('Your data, in your hands')} back="/profile">
      <div className="space-y-4">
        <Alert tone="warn" title={t('There is no cloud copy')}>
          {t('FORGED stores everything on this device only. Clearing your browser data, deleting the app, or losing the phone loses your training history. Export a backup regularly — it takes two seconds.')}
        </Alert>

        <div className="grid grid-cols-2 gap-2">
          <Stat label={t('Sessions')} value={data.sessions.length} />
          <Stat label={t('Working sets')} value={totalSets} />
          <Stat label={t('Runs')} value={data.runs.length} />
          <Stat label={t('Protein entries')} value={data.proteinEntries.length} />
        </div>

        <Card>
          <SectionHeading title={t('Export')} hint={t('A single JSON file with everything.')} />
          <p className="text-sm text-ash leading-relaxed">
            {t('Includes your profile, programs, every session and set, runs, check-ins, protein log, measurements, photos, inventory and reward history. It is plain readable JSON — you own it and can inspect it.')}
          </p>
          <Button variant="primary" full className="mt-3" onClick={exportBackup}>
            {t('Download backup')}
          </Button>
          {exported && <p className="text-xs text-vital mt-2 text-center">Exported at {exported}</p>}
        </Card>

        <Card>
          <SectionHeading title={t('Import')} hint={t('Validated before anything is replaced.')} />
          <p className="text-sm text-ash leading-relaxed">
            {t('Importing')} <strong className="text-parchment">{t('replaces')}</strong>{' '}
            {t('everything currently on this device. The file is checked first: wrong format, a newer schema version, or malformed records are rejected with a readable reason rather than half-restored.')}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void readFile(file)
              e.target.value = ''
            }}
          />
          <Button full className="mt-3" onClick={() => fileRef.current?.click()}>
            {t('Choose a backup file')}
          </Button>
        </Card>

        {result && !result.ok && (
          <Alert tone="danger" title={t('That file was not imported')}>
            <ul className="list-disc pl-4 space-y-1">
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {result?.ok && result.summary && (
          <Card className="border-vital/40">
            <SectionHeading title={t('Backup contents')} />
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span className="text-ash">{t('Exported')}</span>
                <span className="text-parchment">
                  {result.summary.exportedAt ? formatDateLabel(result.summary.exportedAt.slice(0, 10)) : 'unknown'}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-ash">{t('Profile')}</span>
                <span className="text-parchment">{result.summary.hasProfile ? 'included' : 'missing'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ash">{t('Sessions')}</span>
                <span className="text-parchment tabular">{result.summary.sessions}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ash">{t('Runs')}</span>
                <span className="text-parchment tabular">{result.summary.runs}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ash">{t('Check-ins')}</span>
                <span className="text-parchment tabular">{result.summary.checkins}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ash">{t('Protein entries')}</span>
                <span className="text-parchment tabular">{result.summary.proteinEntries}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ash">{t('Items owned')}</span>
                <span className="text-parchment tabular">{result.summary.ownedItems}</span>
              </li>
            </ul>
            {result.warnings.length > 0 && (
              <Alert tone="warn" className="mt-3" title={t('Warnings')}>
                <ul className="list-disc pl-4 space-y-1">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Card>
        )}

        <Card>
          <SectionHeading title={t('Moving to a new phone')} />
          <ol className="list-decimal pl-4 space-y-1.5 text-sm text-ash leading-relaxed">
            <li>{t('Export a backup on the old device and send it to yourself (AirDrop, email, files app).')}</li>
            <li>{t('Open FORGED on the new device and add it to the home screen.')}</li>
            <li>{t('Skip or complete onboarding, then come to this screen and import the file.')}</li>
            <li>{t('Everything — including your warrior and inventory — comes across exactly as it was.')}</li>
          </ol>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmImport}
        destructive
        title={t('Replace all data with this backup?')}
        body={`Everything currently on this device will be replaced by the imported file (${result?.summary?.sessions ?? 0} sessions, ${result?.summary?.runs ?? 0} runs). This cannot be undone — export your current data first if you might want it back.`}
        confirmLabel={t('Import and replace')}
        onCancel={() => {
          setConfirmImport(false)
          setResult(null)
        }}
        onConfirm={() => {
          if (result?.ok && result.data) {
            store.replaceAll(result.data)
            store.pushToast({
              tone: 'info',
              title: 'Backup restored',
              body: '{sessions} sessions and {runs} runs imported.',
              bodyVars: {
                sessions: result.summary?.sessions ?? 0,
                runs: result.summary?.runs ?? 0,
              },
            })
          }
          setConfirmImport(false)
        }}
      />
    </Screen>
  )
}
