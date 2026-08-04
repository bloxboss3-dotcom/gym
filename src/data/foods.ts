import type { Diet, FoodItem } from '@/types'

/**
 * A deliberately small, fast protein list.
 *
 * FORGED is not trying to be a food database. The goal is that logging protein
 * takes under five seconds: quick-add grams, a saved food, or a reusable meal.
 * Protein values are typical cooked/edible-portion figures, rounded — they are
 * good enough for hitting a daily target, not for clinical work.
 */

const ALL: Diet[] = ['omnivore', 'pescatarian', 'vegetarian', 'vegan', 'halal', 'kosher', 'dairy_free']
const MEAT: Diet[] = ['omnivore', 'halal', 'kosher', 'dairy_free']
const FISH: Diet[] = ['omnivore', 'pescatarian', 'halal', 'kosher', 'dairy_free']
const VEG: Diet[] = ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher']
const PLANT: Diet[] = ALL

export const STARTER_FOODS: FoodItem[] = [
  { id: 'food-chicken-breast', name: 'Chicken breast', proteinG: 46, serving: '150 g cooked', tags: MEAT, budgetFriendly: true },
  { id: 'food-chicken-thigh', name: 'Chicken thigh', proteinG: 38, serving: '150 g cooked', tags: MEAT, budgetFriendly: true },
  { id: 'food-lean-beef', name: 'Lean beef mince (5%)', proteinG: 40, serving: '150 g cooked', tags: MEAT, budgetFriendly: false },
  { id: 'food-turkey', name: 'Turkey breast', proteinG: 44, serving: '150 g cooked', tags: MEAT, budgetFriendly: true },
  { id: 'food-pork-loin', name: 'Pork loin', proteinG: 42, serving: '150 g cooked', tags: ['omnivore', 'dairy_free'], budgetFriendly: true },
  { id: 'food-salmon', name: 'Salmon fillet', proteinG: 38, serving: '150 g cooked', tags: FISH, budgetFriendly: false },
  { id: 'food-white-fish', name: 'White fish', proteinG: 33, serving: '150 g cooked', tags: FISH, budgetFriendly: true },
  { id: 'food-tuna-can', name: 'Tinned tuna', proteinG: 26, serving: '1 tin (drained)', tags: FISH, budgetFriendly: true },
  { id: 'food-eggs-3', name: 'Eggs', proteinG: 19, serving: '3 large', tags: VEG, budgetFriendly: true },
  { id: 'food-egg-whites', name: 'Egg whites', proteinG: 22, serving: '200 ml', tags: VEG, budgetFriendly: true },
  { id: 'food-greek-yogurt', name: 'Greek yoghurt (0%)', proteinG: 20, serving: '200 g', tags: ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher'], budgetFriendly: true },
  { id: 'food-cottage-cheese', name: 'Cottage cheese', proteinG: 25, serving: '200 g', tags: ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher'], budgetFriendly: true },
  { id: 'food-skyr', name: 'Skyr', proteinG: 22, serving: '200 g', tags: ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher'], budgetFriendly: false },
  { id: 'food-milk', name: 'Milk', proteinG: 12, serving: '350 ml', tags: ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher'], budgetFriendly: true },
  { id: 'food-whey', name: 'Whey protein', proteinG: 24, serving: '1 scoop (30 g)', tags: ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher'], budgetFriendly: true },
  { id: 'food-plant-protein', name: 'Plant protein powder', proteinG: 21, serving: '1 scoop (30 g)', tags: PLANT, budgetFriendly: true },
  { id: 'food-tofu-firm', name: 'Firm tofu', proteinG: 24, serving: '150 g', tags: PLANT, budgetFriendly: true },
  { id: 'food-tempeh', name: 'Tempeh', proteinG: 29, serving: '150 g', tags: PLANT, budgetFriendly: false },
  { id: 'food-seitan', name: 'Seitan', proteinG: 37, serving: '150 g', tags: PLANT, budgetFriendly: false },
  { id: 'food-lentils', name: 'Lentils', proteinG: 18, serving: '200 g cooked', tags: PLANT, budgetFriendly: true },
  { id: 'food-chickpeas', name: 'Chickpeas', proteinG: 15, serving: '200 g cooked', tags: PLANT, budgetFriendly: true },
  { id: 'food-black-beans', name: 'Black beans', proteinG: 16, serving: '200 g cooked', tags: PLANT, budgetFriendly: true },
  { id: 'food-edamame', name: 'Edamame', proteinG: 22, serving: '200 g', tags: PLANT, budgetFriendly: true },
  { id: 'food-soy-milk', name: 'Soy milk', proteinG: 11, serving: '350 ml', tags: PLANT, budgetFriendly: true },
  { id: 'food-peanut-butter', name: 'Peanut butter', proteinG: 8, serving: '2 tbsp', tags: PLANT, budgetFriendly: true },
  { id: 'food-oats', name: 'Oats', proteinG: 11, serving: '80 g dry', tags: PLANT, budgetFriendly: true },
  { id: 'food-protein-bar', name: 'Protein bar', proteinG: 20, serving: '1 bar', tags: ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher'], budgetFriendly: false },
  { id: 'food-cheese', name: 'Hard cheese', proteinG: 15, serving: '60 g', tags: ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher'], budgetFriendly: false },
]

/** Cheap protein-per-currency picks surfaced in the nutrition screen. */
export const BUDGET_PICKS = [
  'Eggs and egg whites',
  'Tinned tuna or mackerel',
  'Dried lentils, chickpeas and black beans',
  'Chicken thighs (usually cheaper than breast)',
  'Own-brand whey or soy protein powder',
  'Cottage cheese and plain Greek yoghurt in large tubs',
  'Firm tofu',
  'Frozen white fish fillets',
]

export function foodsForDiet(diet: Diet, avoid: string[]): FoodItem[] {
  const blocked = avoid.map((a) => a.trim().toLowerCase()).filter(Boolean)
  return STARTER_FOODS.filter((f) => f.tags.includes(diet)).filter(
    (f) => !blocked.some((b) => f.name.toLowerCase().includes(b)),
  )
}
