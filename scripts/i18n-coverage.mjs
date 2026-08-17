import { readFileSync, readdirSync } from 'node:fs'
import { globSync } from 'node:fs'

/**
 * Which strings the code asks to translate, and which of those have Spanish.
 *
 * Run as part of `verify`. It reads the source rather than the built bundle so
 * it needs no build.
 *
 * It used to report the gap rather than fail on it, reasoning that a missing
 * translation renders English and English is a working app. That was the wrong
 * trade for two reasons. The number is printed into a CI log nobody reads, so
 * "never let the gap grow silently" was exactly what happened — and the number
 * itself was wrong, because the scan could not see `t(item.name)` and reported
 * 100% over three hundred English strings.
 *
 * Now that it enumerates the catalogues too, a drop below 100% means somebody
 * added a string and did not translate it. That is a defect, and this exits
 * non-zero for it. The app still renders English in the meantime; failing here
 * is about not shipping it, not about it being unusable.
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

/*
  Strings the code translates without ever naming.

  `t(item.name)` and `t(item.lore)` are real calls on real user-visible prose,
  and the scan above cannot see either of them — the English lives in a data
  file and only becomes a key at runtime. That blind spot hid over three
  hundred English strings behind a 100% score, in a wardrobe a Spanish reader
  looks at every time they open a pack.

  So the catalogues are read directly. Anything the code reaches through a
  variable has to be listed here, or the number above is a fiction.
*/
const literals = (file, field) =>
  [...readFileSync(file, 'utf8').matchAll(new RegExp(`${field}: '((?:[^'\\\\]|\\\\.)*)'`, 'g'))].map(
    (m) => m[1].replace(/\\'/g, "'"),
  )

const items = readFileSync('src/data/items.ts', 'utf8')
// Item rows are positional tuples: [id, name, art, rarity, palette, lore].
for (const m of items.matchAll(
  /\[\s*'[\w-]+',\s*'((?:[^'\\]|\\.)*)',\s*'[\w-]+',\s*'\w+',\s*'\w+',\s*'((?:[^'\\]|\\.)*)'\s*\]/g,
)) {
  keys.add(m[1].replace(/\\'/g, "'"))
  keys.add(m[2].replace(/\\'/g, "'"))
}
// Data-gap sentences. The engines emit these as `gap.push('…', vars)` and the
// screens render them with `t(part.template, part.vars)`, so the English is a
// literal in engine source that the `t(…)` scan above never looks at.
for (const f of source.filter((p) => p.startsWith('src/engine/'))) {
  const s = readFileSync(f, 'utf8')
  for (const m of s.matchAll(/gap\.push\(\s*(?:\n\s*)?'((?:[^'\\]|\\.)*)'/g))
    keys.add(m[1].replace(/\\'/g, "'"))
  // The ternary form: gap.push(cond ? 'a' : 'b', vars)
  for (const m of s.matchAll(/gap\.push\(\s*[^)]*?\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/gs)) {
    keys.add(m[1].replace(/\\'/g, "'"))
    keys.add(m[2].replace(/\\'/g, "'"))
  }
}

// Slot names, rarity names and pack names, all rendered through a variable.
for (const m of items.matchAll(/^\s+\w+: '([^']*\|slot)',$/gm)) keys.add(m[1])
for (const m of items.matchAll(/label: '([^']*)'/g)) if (m[1] !== '???') keys.add(m[1])
for (const name of literals('src/config/economy.ts', 'name')) keys.add(name)

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
  for (const m of missing.slice(0, 12)) console.log(`    · ${m.slice(0, 100)}`)
  if (missing.length > 12) console.log(`    · …and ${missing.length - 12} more`)
  console.log('\n  Add these to a namespace in src/i18n/es/ and run again.')
  process.exit(1)
}
