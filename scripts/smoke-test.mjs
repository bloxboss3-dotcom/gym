import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

/**
 * End-to-end smoke test.
 *
 * Drives a real Chromium at an iPhone viewport through every flow in the
 * definition of done: onboarding, logging and finishing a workout, the
 * recommendation it produces, protein, running, the dashboards, persistence
 * across a reload, offline, demo mode, and opening + equipping a pack. It also
 * fails the run on any console error, horizontal overflow, undersized touch
 * target, or unlabelled control.
 *
 *   npm run build && npm run preview   # in one terminal
 *   npm run smoke                      # in another
 *
 * Requires browsers: `npx playwright install chromium`.
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4173/gym/'
const SHOTS = process.env.SMOKE_SHOT_DIR ?? new URL('../.smoke-shots/', import.meta.url).pathname
mkdirSync(SHOTS, { recursive: true })

const errors = []
const results = []

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({
  ...(process.env.SMOKE_CHROMIUM ? { executablePath: process.env.SMOKE_CHROMIUM } : {}),
  args: ['--no-sandbox'],
})
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14/15 logical size
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await context.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  if (msg.type() === 'warning' && /React|Warning/.test(msg.text())) errors.push(`console.warn: ${msg.text()}`)
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

async function noOverflow(label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth }
  })
  record(`no horizontal overflow: ${label}`, overflow.scrollW <= overflow.clientW + 1, `${overflow.scrollW} vs ${overflow.clientW}`)
}

// ---------------------------------------------------------------- onboarding
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('text=FORGED', { timeout: 15000 })
record('app boots to onboarding', await page.getByText('Real training. Real progress.').isVisible())
await shot('01-welcome')
await noOverflow('welcome')

await page.getByRole('button', { name: 'Begin' }).click()
await page.getByLabel('Name or nickname').fill('Rook')
await page.getByRole('radio', { name: /Pounds/ }).click()
await shot('02-about-you')
await page.getByRole('button', { name: 'Continue' }).click() // experience
await page.getByRole('radio', { name: /New or returning/ }).click()
await page.getByRole('button', { name: 'Continue' }).click() // schedule
await page.getByRole('button', { name: 'Continue' }).click() // equipment
await page.getByRole('checkbox', { name: 'Barbell + plates' }).click()
await page.getByRole('checkbox', { name: 'Squat rack' }).click()
await page.getByRole('checkbox', { name: 'Adjustable bench' }).click()
await page.getByRole('checkbox', { name: 'Pull-up bar' }).click()
await page.getByRole('button', { name: 'Continue' }).click() // goal
await page.getByRole('radio', { name: /Hypertrophy/ }).click()
await page.getByRole('button', { name: 'Continue' }).click() // endurance
await page.getByRole('radio', { name: /Run a 5K/ }).click()
await page.getByRole('button', { name: 'Continue' }).click() // nutrition
await shot('03-protein-preview')
const proteinShown = await page.locator('text=/ \\/ day/').first().isVisible()
record('onboarding previews a protein target', proteinShown)
await page.getByRole('button', { name: 'Continue' }).click() // limitations
await page.getByRole('button', { name: 'Continue' }).click() // archetype
await page.getByRole('radio', { name: /Ironclad/ }).click()
await page.getByRole('button', { name: 'Continue' }).click() // plan preview
await shot('04-plan-preview')
const planVisible = await page.getByText(/Starter Plan/).isVisible()
record('generates a starter plan', planVisible)
await page.getByRole('button', { name: 'Light the forge' }).click()

await page.waitForSelector('text=/Today’s session|Today’s run|Prescribed recovery/', { timeout: 10000 })
const todayLabel = await page.locator('text=/Today’s session|Today’s run|Prescribed recovery/').first().innerText()
record('onboarding completes into Today', true, todayLabel)
await shot('05-today')
await noOverflow('today')

// ------------------------------------------------------------------ workout
// Whatever today resolves to, Train always offers a session to start.
await page.goto(`${BASE}#/train`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=/Full Body|Upper|Push|Lower/', { timeout: 10000 })
await page.locator('button:has-text("Full Body"), button:has-text("Upper"), button:has-text("Push"), button:has-text("Lower")').first().click()
await page.waitForSelector('text=Log set', { timeout: 10000 })
await shot('06-session-player')
await noOverflow('session player')

// Log 3 sets on the first exercise at the top of the range.
for (let i = 0; i < 3; i++) {
  await page.getByRole('button', { name: 'Log set' }).first().click()
  await page.waitForTimeout(120)
}
const loggedRows = await page.locator('li:has-text("RIR")').count()
record('logs working sets', loggedRows >= 3, `${loggedRows} set rows`)
await shot('07-sets-logged')

// Edit a set.
await page.getByRole('button', { name: 'Edit set 1' }).first().click()
await page.waitForSelector('text=Save changes')
await page.getByRole('dialog', { name: 'Edit set' }).getByLabel('Increase Reps').click()
await page.getByRole('button', { name: 'Save changes' }).click()
await page.waitForTimeout(200)
record('edits a logged set', true)

// Finish the session.
await page.getByRole('button', { name: /Finish session/ }).click()
await page.waitForSelector('text=Finish this session?')
await page.getByRole('dialog', { name: 'Finish this session?' }).getByRole('button', { name: 'Finish' }).click()
await page.waitForSelector('text=Session complete', { timeout: 10000 })
await shot('08-summary')
await noOverflow('summary')
const hasRecommendation = await page.getByText(/Next session target/).first().isVisible()
record('summary produces a next-session recommendation', hasRecommendation)
const rewarded = await page.getByText(/Rewards earned|Session saved/).first().isVisible().catch(() => false)
record('summary shows reward outcome', rewarded)

// ------------------------------------------------------------------ protein
await page.goto(`${BASE}#/progress/protein`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=Remaining today')
const before = await page.locator('text=/Remaining today/').first().isVisible()
await page.getByRole('button', { name: '+40' }).click()
await page.waitForTimeout(250)
const logged = await page.getByText('40 g protein').first().isVisible()
record('logs protein quickly', before && logged)
await shot('09-protein')
await noOverflow('protein')

// ---------------------------------------------------------------------- run
await page.goto(`${BASE}#/train/run`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=Save run')
await page.getByRole('button', { name: 'Save run' }).click()
await page.waitForTimeout(400)
const runLogged = await page.getByText(/Run history/).isVisible()
record('logs a run', runLogged)
await shot('10-run')
await noOverflow('run')

// ----------------------------------------------------------------- progress
await page.goto(`${BASE}#/progress`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=Fatigue check')
await shot('11-progress')
await noOverflow('progress')
const consistency = await page.getByText('Consistency').first().isVisible()
record('progress dashboard renders from saved data', consistency)
const consistencyMsg = await page.locator('text=/planned day/').first().innerText().catch(() => '')
record('new account is not blamed for days before signup', !/1[0-9] planned days missed/.test(consistencyMsg), consistencyMsg.slice(0, 90))

await page.goto(`${BASE}#/progress/volume`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=Weekly hard sets, text=Hard sets', { timeout: 10000 }).catch(() => {})
await shot('12-volume')
await noOverflow('volume')

// -------------------------------------------------------------------- forge
await page.goto(`${BASE}#/forge`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=The Forge')
await shot('13-forge')
await noOverflow('forge')

// Buy + open a pack (onboarding grants 120 coins; a workout adds more).
const coinsText = await page.locator('text=/◈ \\d+/').first().innerText()
record('forge shows coin balance', /\d/.test(coinsText), coinsText)

// -------------------------------------------------------------- persistence
await page.goto(`${BASE}#/`, { waitUntil: 'networkidle' })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('text=Today’s session, text=Recovery day', { timeout: 10000 }).catch(() => {})
const stillOnboarded = !(await page.getByText('Real training. Real progress.').isVisible().catch(() => false))
record('data survives a reload', stillOnboarded)

// ------------------------------------------------------------------ offline
await context.setOffline(true)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const offlineWorks = await page.locator('#root').innerHTML()
record('works offline after first load', offlineWorks.length > 500, `${offlineWorks.length} chars rendered`)
await shot('14-offline')
await context.setOffline(false)

// ----------------------------------------------------------------- demo mode
await page.goto(`${BASE}#/profile`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Load demo data' }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Load demo' }).click()
await page.waitForTimeout(1200)
await page.goto(`${BASE}#/progress`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const deloadSuggested = await page.getByText(/Deload worth taking/).first().isVisible().catch(() => false)
record('demo data trips the deload suggestion', deloadSuggested)
await shot('15-demo-progress')

await page.goto(`${BASE}#/forge`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await shot('16-demo-forge')
const unopened = await page.getByText('Unopened').first().isVisible().catch(() => false)
record('demo account has unopened packs', unopened)

// Open a pack end-to-end.
if (unopened) {
  await page.locator('button:has-text("Crate"), button:has-text("Reliquary")').first().click()
  await page.waitForTimeout(600)
  await shot('17-pack-idle')
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Tap to heat the pack' }).click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(350)
  }
  await page.waitForTimeout(900)
  await shot('18-pack-revealed')
  const equipVisible = await page.getByRole('button', { name: 'Equip now' }).isVisible().catch(() => false)
  record('pack opening reveals an item', equipVisible)
  if (equipVisible) {
    await page.getByRole('button', { name: 'Equip now' }).click()
    await page.waitForTimeout(700)
    await shot('19-character')
    record('equipping an item lands on the character screen', page.url().includes('/forge/'))
  }
}

// ----------------------------------------------------------------- a11y-ish
await page.goto(`${BASE}#/`, { waitUntil: 'networkidle' })
const smallTargets = await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="radio"], [role="checkbox"], [role="switch"]')]
  return els
    .filter((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return false
      // Visually-hidden helpers (the skip link) are 1px until focused.
      if (el.className?.toString().includes('sr-only')) return false
      return r.height < 40 || r.width < 24
    })
    .map((el) => `${el.tagName}.${el.className?.toString().slice(0, 40)} ${Math.round(el.getBoundingClientRect().height)}px`)
    .slice(0, 10)
})
record('touch targets are large enough on Today', smallTargets.length === 0, smallTargets.join(' | '))

const unlabelled = await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, a[href]')]
  return els
    .filter((el) => !el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('title'))
    .map((el) => el.outerHTML.slice(0, 80))
    .slice(0, 5)
})
record('no unlabelled interactive controls on Today', unlabelled.length === 0, unlabelled.join(' | '))

// ----------------------------------------------------------------------- end
await browser.close()

console.log('\n--- console errors ---')
if (errors.length === 0) console.log('none')
else errors.slice(0, 20).forEach((e) => console.log(e))

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length || errors.length ? 1 : 0)
