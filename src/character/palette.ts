import { ITEM_BY_ID } from '@/data/items'
import type { CosmeticItem, Slot } from '@/types'

/**
 * Shared look of the warrior.
 *
 * Both renderers read from here — the fixed-pose one in `Warrior.tsx` and the
 * rigged one in `Fighter.tsx` — so the figure you dress up in the Forge is
 * recognisably the same figure that throws a kick in sparring. Two separate
 * copies of these constants is exactly how a character stops being *yours*.
 */

export const SKIN = '#b78a63'
export const SKIN_SHADE = '#8c6647'
export const CLOTH = '#3a3a44'

export interface Palette {
  base: string
  accent: string
  glow?: string
}

export function paletteOf(item: CosmeticItem | undefined, fallback: Palette): Palette {
  return item?.palette ?? fallback
}

export type Equipped = Partial<Record<Slot, string | null>>

export function itemIn(equipped: Equipped, slot: Slot): CosmeticItem | undefined {
  const id = equipped[slot]
  return id ? ITEM_BY_ID[id] : undefined
}

/**
 * Art keys, collapsed into families.
 *
 * The fixed-pose renderer draws every one of the eighty art variants as its own
 * hand-placed path. That cannot survive a rig — the same paths would have to be
 * re-authored for every joint angle. So the rigged renderer draws the family
 * and tints it with the item's own palette, which is what carries most of the
 * identity anyway: a Rimeplate and an Emberforged Plate read as different gear
 * because one is frost blue and one is glowing orange, not because their rivet
 * patterns differ at phone size mid-kick.
 */
export type BodyFamily = 'light' | 'medium' | 'heavy'
export type HeadFamily = 'none' | 'hair' | 'hood' | 'helm' | 'horned' | 'crown'
export type HandFamily = 'wrap' | 'gauntlet'
export type FootFamily = 'wrap' | 'boot' | 'greave'
export type WeaponFamily = 'none' | 'blade' | 'haft' | 'heavy-head' | 'twin'

export function bodyFamily(art: string | undefined): BodyFamily {
  if (!art) return 'light'
  if (art === 'plate' || art === 'heavy-plate' || art === 'ember-plate') return 'heavy'
  if (art === 'leather' || art === 'scale' || art === 'brigandine') return 'medium'
  return 'light'
}

export function headFamily(art: string | undefined): HeadFamily {
  switch (art) {
    case undefined:
    case 'none':
      return 'none'
    case 'bound':
    case 'topknot':
      return 'hair'
    case 'hood':
      return 'hood'
    case 'horned':
      return 'horned'
    case 'crowned':
    case 'ember-crown':
      return 'crown'
    default:
      return 'helm'
  }
}

export function handFamily(art: string | undefined): HandFamily {
  return art && art.includes('gauntlet') ? 'gauntlet' : 'wrap'
}

export function footFamily(art: string | undefined): FootFamily {
  if (!art || art === 'wraps') return 'wrap'
  if (art.includes('greaves')) return 'greave'
  return 'boot'
}

export interface WeaponShape {
  family: WeaponFamily
  /** Length along the strike direction, in rig units. */
  length: number
  /** Half-width of the business end. */
  width: number
}

export function weaponShape(art: string | undefined): WeaponShape {
  switch (art) {
    case undefined:
    case 'none':
      return { family: 'none', length: 0, width: 0 }
    case 'staff':
      return { family: 'haft', length: 76, width: 3 }
    case 'spear':
      return { family: 'haft', length: 84, width: 3.5 }
    case 'halberd':
      return { family: 'haft', length: 80, width: 5 }
    case 'axe':
      return { family: 'heavy-head', length: 34, width: 10 }
    case 'mace':
      return { family: 'heavy-head', length: 32, width: 8 }
    case 'warhammer':
      return { family: 'heavy-head', length: 40, width: 11 }
    case 'twin-blades':
      return { family: 'twin', length: 30, width: 4 }
    case 'shortsword':
      return { family: 'blade', length: 34, width: 4.5 }
    case 'greatsword':
      return { family: 'blade', length: 66, width: 7 }
    default:
      return { family: 'blade', length: 48, width: 5.5 }
  }
}
