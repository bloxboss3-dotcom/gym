import { describe, expect, it } from 'vitest'
import { ECONOMY, buildFromLevel, buildFromXp, levelFromXp, xpForLevel } from '@/config/economy'

describe('the warrior fills out as you level', () => {
  it('starts at nothing and ends at full', () => {
    expect(buildFromLevel(1)).toBe(0)
    expect(buildFromLevel(ECONOMY.character.fullBuildLevel)).toBe(1)
  })

  it('never leaves the 0–1 range, however silly the level', () => {
    for (const level of [-50, 0, 1, 7, 30, 60, 9999]) {
      const b = buildFromLevel(level)
      expect(b, `level ${level}`).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
    }
  })

  it('only ever grows', () => {
    let last = -1
    for (let level = 1; level <= 60; level += 1) {
      const b = buildFromLevel(level)
      expect(b, `level ${level}`).toBeGreaterThanOrEqual(last)
      last = b
    }
  })

  it('front-loads the visible change', () => {
    // The first stretch of levels should show more than the last, which is
    // both how newbie gains work and what keeps a new account interesting.
    const early = buildFromLevel(6) - buildFromLevel(1)
    const late = buildFromLevel(30) - buildFromLevel(25)
    expect(early).toBeGreaterThan(late)
  })

  it('agrees with the XP path', () => {
    for (const xp of [0, 500, 5_000, 50_000]) {
      expect(buildFromXp(xp)).toBe(buildFromLevel(levelFromXp(xp).level))
    }
  })

  it('is reachable — full build is not past the level cap', () => {
    expect(ECONOMY.character.fullBuildLevel).toBeLessThanOrEqual(ECONOMY.leveling.maxLevel)
    // And it takes real training to get there, not one big session.
    expect(xpForLevel(ECONOMY.character.fullBuildLevel)).toBeGreaterThan(ECONOMY.limits.dailyXpCap * 10)
  })

  it('cannot be bought', async () => {
    // Build is a function of level only. If it ever learned about coins or
    // items, the figure would stop being a record of training.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const source = readFileSync(join(process.cwd(), 'src/config/economy.ts'), 'utf8')
    const fn = source.slice(source.indexOf('export function buildFromLevel'))
    expect(/coins|owned|equipped|item/i.test(fn.slice(0, 400))).toBe(false)
  })
})
