import { readFileSync, readdirSync } from 'node:fs'
import { globSync } from 'node:fs'

/**
 * Which strings the code asks to translate, and which of those have Spanish.
 *
 * Run as part of `verify`. It reads the source rather than the built bundle so
 * it needs no build, and it reports the gap rather than failing on it — a
 * missing translation renders English, which is a working app, so blocking a
 * release over it would be the wrong trade. What it must never do is let the
 * gap grow silently, so the number is printed every run.
 */
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  )

const source = walk('src').filter(
  (f) => /\.tsx?$/.test(f) && !f.includes('/i18n/') && !/\.test\.tsx?$/.test(f),
)

const keys = new Set()
for (const f of source) {
  const s = readFileSync(f, 'utf8')
  for (const m of s.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"))
  for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(m[1])
}

const have = new Set()
for (const f of readdirSync('src/i18n/es')) {
  const s = readFileSync(`src/i18n/es/${f}`, 'utf8')
  for (const m of s.matchAll(/^\s+'((?:[^'\\]|\\.)*)':/gm)) have.add(m[1].replace(/\\'/g, "'"))
  for (const m of s.matchAll(/^\s+"((?:[^"\\]|\\.)*)":/gm)) have.add(m[1])
  for (const m of s.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*):/gm)) have.add(m[1])
}

const missing = [...keys].filter((k) => !have.has(k))
const pct = keys.size ? Math.round(((keys.size - missing.length) / keys.size) * 100) : 100
console.log(`i18n · es: ${keys.size - missing.length}/${keys.size} requested strings translated (${pct}%)`)
if (missing.length) {
  console.log(`  untranslated (renders English): ${missing.length}`)
  for (const m of missing.slice(0, 8)) console.log(`    · ${m.slice(0, 80)}`)
}
