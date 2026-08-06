/**
 * Id generation. Stable, sortable-ish, and collision-resistant enough for a
 * single-device local-first app. Values are opaque strings so a future Supabase
 * migration can keep them as primary keys unchanged.
 */
export function newId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `${prefix}_${Date.now().toString(36)}${rand}`
}

/**
 * Deterministic PRNG (mulberry32). Used by the demo seeder and by pack rolls in
 * tests so results are reproducible.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
