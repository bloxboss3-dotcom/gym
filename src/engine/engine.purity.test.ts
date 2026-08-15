import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The engines depend on nothing.
 *
 * Written after `interpolate` was imported from `@/i18n` into two of them,
 * which quietly pulled the whole Spanish catalogue into a layer the working
 * agreement says is pure. It typechecked, every test passed, and the only
 * visible symptom would have been a larger bundle.
 */
describe('src/engine stays dependency-free', () => {
  const files = readdirSync('src/engine').filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))

  it('has engine files to check', () => {
    expect(files.length).toBeGreaterThan(8)
  })

  it('imports nothing from React, storage, the network or the translations', () => {
    /*
      `@/db/defaults` is allowed: despite the folder name it is a pure data
      module — the starter library and default shapes — with no IndexedDB in
      it, and the backup engine legitimately needs the schema version.
    */
    const banned = /from '(react[^']*|@\/i18n[^']*|@\/state[^']*|@\/db\/(?!defaults)[^']*|@\/screens[^']*|@\/components[^']*)'/
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(`src/engine/${f}`, 'utf8')
      for (const line of src.split('\n')) {
        if (/^import /.test(line) && banned.test(line)) offenders.push(`${f}: ${line.trim()}`)
      }
    }
    expect(offenders, offenders.join(' · ')).toEqual([])
  })
})
