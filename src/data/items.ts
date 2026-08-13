import type { CosmeticItem, Rarity, Slot } from '@/types'

/**
 * Cosmetic catalogue.
 *
 * Everything here is original: no real-world brands, no licensed characters,
 * no copied artwork. Each item is a key into the modular SVG character renderer
 * (`src/character/`) plus a colour triple, so new gear costs a data row rather
 * than an asset pipeline.
 *
 * Rewards are purely cosmetic by design — no training recommendation, chart or
 * safety message is ever gated behind an item, a level or a coin.
 */

const P = {
  iron: { base: '#6b7280', accent: '#9ca3af' },
  charcoal: { base: '#2f2f36', accent: '#565660' },
  obsidian: { base: '#191920', accent: '#3c3c48' },
  ember: { base: '#c2410c', accent: '#fb923c', glow: '#fb923c' },
  emberDeep: { base: '#7c2d12', accent: '#f97316', glow: '#f97316' },
  gold: { base: '#a67c14', accent: '#f3d27a', glow: '#f3d27a' },
  crimson: { base: '#7f1d1d', accent: '#dc2626' },
  verdigris: { base: '#2f6b5f', accent: '#5fbfa8' },
  bone: { base: '#cfc9b6', accent: '#f2ecdc' },
  steel: { base: '#3b5a7a', accent: '#8ab4dc' },
  violet: { base: '#4c2a6b', accent: '#a78bfa', glow: '#a78bfa' },
  ash: { base: '#4a4a52', accent: '#8b8b96' },
  jade: { base: '#14532d', accent: '#4ade80' },
  brine: { base: '#164e63', accent: '#67e8f9' },
  rust: { base: '#7c2d12', accent: '#c2703a' },
  frost: { base: '#334155', accent: '#cbd5e1', glow: '#e2e8f0' },
  sakura: { base: '#9d174d', accent: '#fbcfe8', glow: '#f9a8d4' },
  storm: { base: '#1e1b4b', accent: '#818cf8', glow: '#c7d2fe' },
  fox: { base: '#b45309', accent: '#fed7aa', glow: '#fdba74' },
  ink: { base: '#0f0f14', accent: '#6b7280' },
  celadon: { base: '#0f766e', accent: '#99f6e4', glow: '#5eead4' },
  bloom: { base: '#7e22ce', accent: '#f0abfc', glow: '#e879f9' },
  daybreak: { base: '#b91c1c', accent: '#fde68a', glow: '#fcd34d' },
} as const

type Def = [id: string, name: string, art: string, rarity: Rarity, palette: keyof typeof P, lore: string]

function build(slot: Slot, defs: Def[]): CosmeticItem[] {
  return defs.map(([id, name, art, rarity, palette, lore]) => ({
    id,
    name,
    slot,
    rarity,
    art,
    palette: { ...P[palette] } as CosmeticItem['palette'],
    lore,
  }))
}

// --- Faces (6) --------------------------------------------------------------
const FACES = build('face', [
  ['face-recruit', 'Recruit', 'stoic', 'common', 'bone', 'The face you started with. Nothing to prove yet.'],
  ['face-scarred', 'Scarred', 'scarred', 'uncommon', 'bone', 'Every mark is a session you did not skip.'],
  ['face-warpaint', 'Ash Warpaint', 'warpaint', 'uncommon', 'charcoal', 'Cold forge-ash, pressed on before the first set.'],
  ['face-veiled', 'Veiled', 'veiled', 'rare', 'obsidian', 'Silence under the visor. Only the count matters.'],
  ['face-masked', 'Iron Mask', 'masked', 'epic', 'iron', 'Hammered from a bar that finally moved.'],
  ['face-ember-eyes', 'Ember-Eyed', 'ember-eyes', 'legendary', 'ember', 'They say the forge looks back.'],
  ['face-brine', 'Saltworn', 'scarred', 'uncommon', 'brine', 'Weathered by early mornings by the water.'],
  ['face-jade-paint', 'Jade Warpaint', 'warpaint', 'rare', 'jade', 'Drawn on the morning of a lift that finally moved.'],
  ['face-oni', 'Oni Mask', 'oni', 'epic', 'daybreak', 'Horned, snarling, and older than anyone who wears one.'],
  ['face-kitsune', 'Kitsune Mask', 'kitsune', 'legendary', 'fox', 'Nine tails are said to come with it. Only one has been confirmed.'],
  ['face-hollow', 'Hollow Sigil', 'hollow', 'mythical', 'bloom', 'The mark that appears on nobody, and then on someone.'],
])

// --- Head / hair (8) --------------------------------------------------------
const HEADS = build('head', [
  ['head-none', 'Bare Head', 'none', 'common', 'bone', 'Nothing between you and the work.'],
  ['head-bound', 'Bound Hair', 'bound', 'common', 'charcoal', 'Tied back so it stays out of the third set.'],
  ['head-topknot', 'Warrior Topknot', 'topknot', 'uncommon', 'ash', 'Practical. Old. Still works.'],
  ['head-hood', 'Ashen Hood', 'hood', 'uncommon', 'obsidian', 'Kept for the walk home in the cold.'],
  ['head-open-helm', 'Open Helm', 'open-helm', 'rare', 'iron', 'Sight lines first, protection second.'],
  ['head-horned', 'Horned Helm', 'horned', 'rare', 'charcoal', 'Weight you learn to carry.'],
  ['head-crowned', 'Crowned Sallet', 'crowned', 'epic', 'gold', 'Awarded, never bought.'],
  ['head-ember-crown', 'Emberforged Crown', 'ember-crown', 'legendary', 'ember', 'Cooled in a barrel that never stopped steaming.'],
  ['head-frost-helm', 'Rimeguard Helm', 'open-helm', 'rare', 'frost', 'Cold to the touch, even indoors.'],
  ['head-rust-horns', 'Rusted Horns', 'horned', 'uncommon', 'rust', 'Older than the gym. Probably older than the town.'],
  ['head-spiked', 'Spiked Mane', 'spiked', 'uncommon', 'daybreak', 'Defies gravity, humidity, and most helmets.'],
  ['head-ponytail', 'High Ponytail', 'ponytail', 'rare', 'ink', 'Long enough to move a beat behind you.'],
  ['head-kabuto', 'Kabuto', 'kabuto', 'epic', 'storm', 'A crescent on the brow, and everything below it hidden.'],
  ['head-halo', 'Ashen Halo', 'halo', 'mythical', 'daybreak', 'It does not rest on anything. It simply stays.'],
])

// --- Body armour (9) --------------------------------------------------------
const BODIES = build('body', [
  ['body-tunic', 'Training Tunic', 'tunic', 'common', 'bone', 'Cheap cloth, honest sweat.'],
  ['body-padded', 'Padded Jack', 'padded', 'common', 'charcoal', 'Enough to blunt a bad rep.'],
  ['body-leather', 'Hardened Leather', 'leather', 'uncommon', 'emberDeep', 'Boiled, shaped, and worn in.'],
  ['body-scale', 'Scalemail', 'scale', 'uncommon', 'iron', 'Overlapping plates, like weeks that stack.'],
  ['body-brigandine', 'Brigandine', 'brigandine', 'rare', 'crimson', 'Riveted where the load hits hardest.'],
  ['body-verdant', 'Verdant Cuirass', 'plate', 'rare', 'verdigris', 'Copper gone green from years of steam.'],
  ['body-plate', 'Forge Plate', 'plate', 'epic', 'steel', 'Fitted to a frame that changed to earn it.'],
  ['body-warden', 'Warden Plate', 'heavy-plate', 'epic', 'ash', 'Standard issue for those who hold the line.'],
  ['body-ember-plate', 'Emberforged Plate', 'ember-plate', 'legendary', 'ember', 'Still warm. Always warm.'],
  ['body-tidewrought', 'Tidewrought Mail', 'scale', 'rare', 'brine', 'Rings that have been wet a thousand times and never rusted.'],
  ['body-rimeplate', 'Rimeplate', 'heavy-plate', 'epic', 'frost', 'Heavy, silent, and cold enough to sting.'],
  ['body-shinobi', 'Shinobi Wrap', 'shinobi', 'rare', 'ink', 'Wrapped so nothing catches and nothing rattles.'],
  ['body-haori', 'Sakura Haori', 'haori', 'epic', 'sakura', 'Open at the front, and the sleeves never quite settle.'],
  ['body-mecha', 'Mecha Frame', 'mecha', 'legendary', 'storm', 'Something in it is always quietly running.'],
  ['body-celestial', 'Celestial Robe', 'celestial', 'mythical', 'bloom', 'Cut from a night that had not happened yet.'],
])

// --- Hands (7) --------------------------------------------------------------
const HANDS = build('hands', [
  ['hands-wraps', 'Linen Wraps', 'wraps', 'common', 'bone', 'The first thing every recruit is handed.'],
  ['hands-gloves', 'Grip Gloves', 'gloves', 'common', 'charcoal', 'Chalk-stained and loyal.'],
  ['hands-bracers', 'Iron Bracers', 'bracers', 'uncommon', 'iron', 'For the wrist that finally stopped folding.'],
  ['hands-scaled', 'Scaled Mitts', 'gauntlets', 'uncommon', 'verdigris', 'Light enough to still feel the bar.'],
  ['hands-gauntlets', 'Forge Gauntlets', 'gauntlets', 'rare', 'steel', 'Made to hold heat.'],
  ['hands-heavy', 'Warden Gauntlets', 'heavy-gauntlets', 'epic', 'gold', 'Heavier than they look. So is the bar.'],
  ['hands-ember', 'Emberforged Grips', 'ember-gauntlets', 'legendary', 'ember', 'Coals sit in the knuckles and never go out.'],
  ['hands-jade', 'Jadebound Wraps', 'wraps', 'rare', 'jade', 'Silk over chalk. Quietly expensive.'],
  ['hands-claws', 'Tekkō Claws', 'claws', 'epic', 'ink', 'Four blades along the knuckle, worn under the sleeve.'],
  ['hands-spirit', 'Spiritbound Cuffs', 'spirit-cuffs', 'mythical', 'celadon', 'The light between the fingers is not reflected from anything.'],
])

// --- Feet (7) ---------------------------------------------------------------
const FEET = build('feet', [
  ['feet-wraps', 'Foot Wraps', 'wraps', 'common', 'bone', 'Flat, grounded, honest.'],
  ['feet-boots', 'Trail Boots', 'boots', 'common', 'charcoal', 'They have seen more roads than gyms.'],
  ['feet-runner', 'Ashroad Runners', 'runner', 'uncommon', 'emberDeep', 'Built for the long, easy miles.'],
  ['feet-greaves', 'Iron Greaves', 'greaves', 'uncommon', 'iron', 'Shin protection for the heavy days.'],
  ['feet-warden', 'Warden Greaves', 'heavy-greaves', 'rare', 'steel', 'Planted. Immovable.'],
  ['feet-gilded', 'Gilded Sabatons', 'heavy-greaves', 'epic', 'gold', 'Ceremonial, and still squat-tested.'],
  ['feet-ember', 'Emberforged Sabatons', 'ember-greaves', 'legendary', 'ember', 'They leave marks on the platform.'],
  ['feet-flat', 'Flat Lifters', 'boots', 'uncommon', 'rust', 'No cushion, no wobble, no excuses.'],
  ['feet-tabi', 'Tabi Boots', 'tabi', 'rare', 'ink', 'Split toe, soft sole, no sound at all.'],
  ['feet-stormstep', 'Stormstep Greaves', 'stormstep', 'legendary', 'storm', 'The air near them keeps flickering.'],
])

// --- Weapons (12) -----------------------------------------------------------
const WEAPONS = build('weapon', [
  ['weapon-none', 'Bare Hands', 'none', 'common', 'bone', 'Where everyone begins.'],
  ['weapon-staff', 'Training Staff', 'staff', 'common', 'charcoal', 'Balance before power.'],
  ['weapon-shortsword', 'Shortsword', 'shortsword', 'common', 'iron', 'Simple, quick, unglamorous.'],
  ['weapon-handaxe', 'Hand Axe', 'axe', 'uncommon', 'emberDeep', 'One purpose, executed well.'],
  ['weapon-mace', 'Flanged Mace', 'mace', 'uncommon', 'ash', 'Blunt honesty.'],
  ['weapon-spear', 'Ash Spear', 'spear', 'uncommon', 'verdigris', 'Reach is its own kind of strength.'],
  ['weapon-longsword', 'Longsword', 'longsword', 'rare', 'steel', 'The reward for a hundred clean reps.'],
  ['weapon-warhammer', 'Warhammer', 'warhammer', 'rare', 'iron', 'Slow. Inevitable.'],
  ['weapon-halberd', 'Halberd', 'halberd', 'rare', 'charcoal', 'Demands two committed hands.'],
  ['weapon-twin', 'Twin Fangs', 'twin-blades', 'epic', 'violet', 'Symmetry earned on both sides.'],
  ['weapon-greatsword', 'Greatsword', 'greatsword', 'epic', 'gold', 'You grew into this one.'],
  ['weapon-ember-blade', 'Emberbrand', 'ember-blade', 'legendary', 'ember', 'Forged from the bar you swore you could not lift.'],
  ['weapon-tideglaive', 'Tideglaive', 'halberd', 'epic', 'brine', 'Balanced for reach. Patient in the same way water is.'],
  ['weapon-rimefang', 'Rimefang', 'twin-blades', 'rare', 'frost', 'Two edges that never seem to warm up.'],
  ['weapon-katana', 'Katana', 'katana', 'rare', 'steel', 'One edge, folded until arguing about it became a hobby.'],
  ['weapon-nodachi', 'Nodachi', 'nodachi', 'epic', 'daybreak', 'Longer than the person carrying it, which is the idea.'],
  ['weapon-kusarigama', 'Kusarigama', 'kusarigama', 'legendary', 'iron', 'A sickle, a chain, and a weight. In that order, usually.'],
  ['weapon-spirit-blade', 'Spiritcutter', 'spirit-blade', 'mythical', 'celadon', 'It hums at the pitch of the room it is in.'],
  ['weapon-null', 'The Quiet Edge', 'null-blade', 'secret', 'ink', 'No one agrees on what it looks like. Everyone agrees they have seen it.'],
])

// --- Back / capes (6) -------------------------------------------------------
const BACKS = build('back', [
  ['back-none', 'No Cloak', 'none', 'common', 'bone', 'Nothing to catch the wind.'],
  ['back-short', 'Short Cloak', 'short-cloak', 'common', 'charcoal', 'Practical warmth for cold mornings.'],
  ['back-tattered', 'Tattered Cape', 'tattered', 'uncommon', 'ash', 'Torn honestly, never for show.'],
  ['back-banner', 'Warband Banner', 'banner', 'rare', 'crimson', 'Carried by whoever showed up most.'],
  ['back-heavy', 'Warden Mantle', 'heavy-cape', 'epic', 'steel', 'Weighted hem. It does not flap.'],
  ['back-ember', 'Emberfall Mantle', 'ember-cape', 'legendary', 'ember', 'Sheds sparks on every step.'],
  ['back-jade-banner', 'Jadeleaf Banner', 'banner', 'rare', 'jade', 'Carried by whoever turned up in the rain.'],
  ['back-scarf', 'Long Scarf', 'scarf', 'uncommon', 'daybreak', 'Twice your height and permanently caught in a wind nobody else feels.'],
  ['back-wings', 'Ashen Wings', 'wings', 'epic', 'ink', 'Folded most of the time. Mostly.'],
  ['back-tails', 'Nine Tails', 'tails', 'legendary', 'fox', 'Only three are usually visible. Nobody has counted the rest.'],
  ['back-starcloak', 'Starcloak', 'starcloak', 'mythical', 'storm', 'Wearing it at night is how people lose an evening.'],
])

// --- Auras (6) --------------------------------------------------------------
const AURAS = build('aura', [
  ['aura-none', 'No Aura', 'none', 'common', 'bone', 'Just you and the work.'],
  ['aura-dust', 'Forge Dust', 'dust', 'uncommon', 'ash', 'Fine grit that never quite settles.'],
  ['aura-smoke', 'Low Smoke', 'smoke', 'uncommon', 'obsidian', 'Quiet, dense, patient.'],
  ['aura-embers', 'Rising Embers', 'embers', 'rare', 'ember', 'Heat that keeps climbing.'],
  ['aura-frost', 'Coldsteel', 'frost', 'epic', 'steel', 'For those who never rush a set.'],
  ['aura-starfall', 'Starfall', 'starfall', 'legendary', 'violet', 'Reserved for very long streaks.'],
  ['aura-tide', 'Tidepull', 'smoke', 'rare', 'brine', 'The air moves toward you, slowly.'],
  ['aura-sakura', 'Falling Blossom', 'sakura', 'epic', 'sakura', 'Out of season, indoors, and constant.'],
  ['aura-lightning', 'Stormcall', 'lightning', 'legendary', 'storm', 'The hair goes first. Then everyone notices.'],
  ['aura-void', 'Voidbloom', 'voidbloom', 'mythical', 'bloom', 'Petals that fall upward and are gone before they arrive.'],
])

// --- Companions (4) ---------------------------------------------------------
const COMPANIONS = build('companion', [
  ['companion-none', 'No Companion', 'none', 'common', 'bone', 'Solo work.'],
  ['companion-wisp', 'Ember Wisp', 'wisp', 'rare', 'ember', 'It hovers near the bar and waits.'],
  ['companion-raven', 'Iron Raven', 'raven', 'epic', 'obsidian', 'Counts your sets. Judges silently.'],
  ['companion-hound', 'Forge Hound', 'hound', 'legendary', 'emberDeep', 'Sleeps through rest days, wakes for squats.'],
  ['companion-owl', 'Rime Owl', 'wisp', 'epic', 'frost', 'Silent on the approach. Always is.'],
  ['companion-fox', 'Spirit Fox', 'fox', 'legendary', 'fox', 'Turns up on the heavy days and sits just out of reach.'],
  ['companion-phoenix', 'Emberwing', 'phoenix', 'mythical', 'daybreak', 'Burns down to nothing every rest day and comes back annoyed.'],
])

// --- Titles (10) ------------------------------------------------------------
const TITLES = build('title', [
  ['title-recruit', 'the Recruit', 'text', 'common', 'bone', 'Everyone earns this by starting.'],
  ['title-steady', 'the Steady', 'text', 'common', 'ash', 'Awarded for showing up twice in a row.'],
  ['title-unbroken', 'the Unbroken', 'text', 'uncommon', 'iron', 'Four honest weeks.'],
  ['title-ironbound', 'Ironbound', 'text', 'uncommon', 'charcoal', 'For those who love the heavy days.'],
  ['title-longstrider', 'Longstrider', 'text', 'rare', 'verdigris', 'Miles that were not glamorous.'],
  ['title-emberborn', 'Emberborn', 'text', 'rare', 'emberDeep', 'The forge recognises you.'],
  ['title-warden', 'Warden of the Forge', 'text', 'epic', 'steel', 'You hold the line on the boring weeks.'],
  ['title-unyielding', 'the Unyielding', 'text', 'epic', 'gold', 'You deloaded on purpose and came back stronger.'],
  ['title-ashen-sovereign', 'Ashen Sovereign', 'text', 'legendary', 'violet', 'Rare air.'],
  ['title-forgemaster', 'Forgemaster', 'text', 'legendary', 'ember', 'The last title anyone earns.'],
  ['title-tidebound', 'Tidebound', 'text', 'rare', 'brine', 'For the ones who train on the days nobody would blame them for skipping.'],
  ['title-rimewalker', 'Rimewalker', 'text', 'epic', 'frost', 'Cold mornings, warm bar.'],
  ['title-ronin', 'the Rōnin', 'text', 'rare', 'ink', 'No school, no master, still turns up.'],
  ['title-ninetailed', 'Nine-Tailed', 'text', 'mythical', 'fox', 'Counted once, by someone who then forgot the number.'],
  ['title-nameless', 'the Nameless', 'text', 'secret', 'ink', 'Whoever earns this is not listed anywhere.'],
])

// --- Poses (5) --------------------------------------------------------------
const POSES = build('pose', [
  ['pose-ready', 'Ready Stance', 'ready', 'common', 'bone', 'Feet set, weight even.'],
  ['pose-guard', 'Guard', 'guard', 'common', 'iron', 'Hands up, chin down.'],
  ['pose-rest', 'At Rest', 'rest', 'uncommon', 'ash', 'Between sets, breathing.'],
  ['pose-heroic', 'Heroic', 'heroic', 'rare', 'gold', 'Chest up. Earned it.'],
  ['pose-raised', 'Raised Blade', 'raised', 'epic', 'ember', 'For the session that finally broke the plateau.'],
  ['pose-braced', 'Braced', 'guard', 'rare', 'jade', 'The stance you take before a set you respect.'],
  ['pose-sheathed', 'Iaido', 'sheathed', 'epic', 'ink', 'Hand on the hilt, nothing drawn yet.'],
  ['pose-ascend', 'Ascendant', 'ascend', 'mythical', 'bloom', 'Both feet still on the floor. Only just.'],
])

export const ITEMS: CosmeticItem[] = [
  ...FACES,
  ...HEADS,
  ...BODIES,
  ...HANDS,
  ...FEET,
  ...WEAPONS,
  ...BACKS,
  ...AURAS,
  ...COMPANIONS,
  ...TITLES,
  ...POSES,
]

export const ITEM_BY_ID: Record<string, CosmeticItem> = ITEMS.reduce(
  (acc, i) => {
    acc[i.id] = i
    return acc
  },
  {} as Record<string, CosmeticItem>,
)

export const ITEMS_BY_SLOT: Record<Slot, CosmeticItem[]> = ITEMS.reduce(
  (acc, i) => {
    ;(acc[i.slot] ||= []).push(i)
    return acc
  },
  {} as Record<Slot, CosmeticItem[]>,
)

export const SLOT_ORDER: Slot[] = [
  'weapon',
  'body',
  'head',
  'face',
  'hands',
  'feet',
  'back',
  'aura',
  'companion',
  'title',
  'pose',
]

export const SLOT_LABEL: Record<Slot, string> = {
  face: 'Face',
  head: 'Head',
  body: 'Body armour',
  hands: 'Hands',
  feet: 'Feet',
  weapon: 'Weapon',
  back: 'Back',
  aura: 'Aura',
  companion: 'Companion',
  title: 'Title',
  pose: 'Pose',
}

export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythical',
  'secret',
]

export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string }> = {
  common: { label: 'Common', color: '#9ca3af', glow: 'rgba(156,163,175,0.35)' },
  uncommon: { label: 'Uncommon', color: '#5fbfa8', glow: 'rgba(95,191,168,0.35)' },
  rare: { label: 'Rare', color: '#7aa7dc', glow: 'rgba(122,167,220,0.4)' },
  epic: { label: 'Epic', color: '#a78bfa', glow: 'rgba(167,139,250,0.45)' },
  legendary: { label: 'Legendary', color: '#fb923c', glow: 'rgba(251,146,60,0.5)' },
  mythical: { label: 'Mythical', color: '#f472b6', glow: 'rgba(244,114,182,0.55)' },
  secret: { label: '???', color: '#e2e8f0', glow: 'rgba(226,232,240,0.6)' },
}

/**
 * Secrets are hidden until found.
 *
 * The collection shows an unknown slot instead of a greyed-out name, so the
 * only way to learn a secret exists is to pull one. A locked item whose name
 * you can already read is not a secret, it is a to-do list.
 */
export const SECRET_PLACEHOLDER = '???'

/** Gear every new warrior owns, so nothing is ever an empty slot. */
export const STARTER_ITEM_IDS = [
  'face-recruit',
  'head-none',
  'body-tunic',
  'hands-wraps',
  'feet-wraps',
  'weapon-none',
  'back-none',
  'aura-none',
  'companion-none',
  'title-recruit',
  'pose-ready',
]

/** Archetype flavour: which starter loadout the onboarding picks. */
export const ARCHETYPE_LOADOUT: Record<string, Partial<Record<Slot, string>>> = {
  ironclad: { body: 'body-padded', weapon: 'weapon-shortsword', head: 'head-bound' },
  emberblade: { body: 'body-tunic', weapon: 'weapon-handaxe', face: 'face-warpaint' },
  stormrunner: { body: 'body-tunic', feet: 'feet-runner', weapon: 'weapon-staff' },
  ashwarden: { body: 'body-padded', weapon: 'weapon-staff', head: 'head-hood' },
  duskstalker: { body: 'body-leather', weapon: 'weapon-shortsword', head: 'head-hood' },
}

export const ARCHETYPES: {
  key: string
  name: string
  blurb: string
  extraItems: string[]
}[] = [
  {
    key: 'ironclad',
    name: 'Ironclad',
    blurb: 'Heavy, deliberate, unmoved. Built around slow honest strength.',
    extraItems: ['body-padded', 'weapon-shortsword', 'head-bound'],
  },
  {
    key: 'emberblade',
    name: 'Emberblade',
    blurb: 'Fast and hot. Lives for the set that finally moves.',
    extraItems: ['weapon-handaxe', 'face-warpaint'],
  },
  {
    key: 'stormrunner',
    name: 'Stormrunner',
    blurb: 'Long roads and lungs to match. Endurance-leaning.',
    extraItems: ['feet-runner', 'weapon-staff'],
  },
  {
    key: 'ashwarden',
    name: 'Ashwarden',
    blurb: 'Patient and defensive. Recovers on purpose.',
    extraItems: ['head-hood', 'weapon-staff'],
  },
  {
    key: 'duskstalker',
    name: 'Duskstalker',
    blurb: 'Quiet consistency. Trains at odd hours and never misses.',
    extraItems: ['body-leather', 'head-hood'],
  },
]
