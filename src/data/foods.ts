import type { Diet, FoodCategory, FoodItem } from '@/types'

/**
 * A curated, fast food list — not a food database.
 *
 * FORGED is not trying to hold every product on earth, and it will never ask
 * you to scan a barcode to log a chicken breast. The bet is that ~90 well
 * chosen staples plus your own saved foods and reusable meals cover the large
 * majority of what anybody actually eats week to week, and that logging in
 * three taps beats logging perfectly.
 *
 * Values are typical cooked / edible-portion figures, rounded. They are good
 * enough for steering a daily target. They are not laboratory numbers, and the
 * nutrition screen says so.
 */

const ALL: Diet[] = ['omnivore', 'pescatarian', 'vegetarian', 'vegan', 'halal', 'kosher', 'dairy_free']
const MEAT: Diet[] = ['omnivore', 'halal', 'kosher', 'dairy_free']
const PORK: Diet[] = ['omnivore', 'dairy_free']
const FISH: Diet[] = ['omnivore', 'pescatarian', 'halal', 'kosher', 'dairy_free']
/** Vegetarian-and-up, i.e. contains dairy or egg. */
const VEG: Diet[] = ['omnivore', 'pescatarian', 'vegetarian', 'halal', 'kosher']
const PLANT: Diet[] = ALL

type Row = [
  id: string,
  name: string,
  kcal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  serving: string,
  servingGrams: number | null,
  category: FoodCategory,
  tags: Diet[],
  budget: boolean,
]

// Written as tuples rather than objects purely so ~90 foods stay readable as a
// table; the named tuple elements above are the column headings.
const ROWS: Row[] = [
  // --- Meat ----------------------------------------------------------------
  ['food-chicken-breast', 'Chicken breast', 248, 46, 0, 5.4, '150 g cooked', 150, 'meat', MEAT, true],
  ['food-chicken-thigh', 'Chicken thigh', 316, 38, 0, 17, '150 g cooked', 150, 'meat', MEAT, true],
  ['food-turkey', 'Turkey breast', 232, 44, 0, 5, '150 g cooked', 150, 'meat', MEAT, true],
  ['food-lean-beef', 'Lean beef mince (5%)', 250, 40, 0, 9, '150 g cooked', 150, 'meat', MEAT, false],
  ['food-beef-mince-20', 'Beef mince (20%)', 396, 36, 0, 27, '150 g cooked', 150, 'meat', MEAT, true],
  ['food-steak', 'Sirloin steak', 310, 43, 0, 15, '150 g cooked', 150, 'meat', MEAT, false],
  ['food-pork-loin', 'Pork loin', 264, 42, 0, 10, '150 g cooked', 150, 'meat', PORK, true],
  ['food-bacon', 'Bacon', 108, 8, 0, 8, '2 rashers', 40, 'meat', PORK, true],
  ['food-ham', 'Sliced ham', 73, 12, 1, 2.5, '60 g', 60, 'meat', PORK, true],
  ['food-lamb', 'Lamb', 372, 38, 0, 24, '150 g cooked', 150, 'meat', MEAT, false],
  ['food-chicken-sausage', 'Chicken sausage', 172, 16, 3, 10, '2 sausages', 100, 'meat', MEAT, true],

  // --- Fish ----------------------------------------------------------------
  ['food-salmon', 'Salmon fillet', 312, 38, 0, 18, '150 g cooked', 150, 'fish', FISH, false],
  ['food-white-fish', 'White fish', 156, 33, 0, 2, '150 g cooked', 150, 'fish', FISH, true],
  ['food-tuna-can', 'Tinned tuna', 116, 26, 0, 1, '1 tin, drained', 110, 'fish', FISH, true],
  ['food-mackerel', 'Tinned mackerel', 262, 24, 0, 18, '1 tin, drained', 110, 'fish', FISH, true],
  ['food-prawns', 'Prawns', 149, 30, 1, 2, '150 g', 150, 'fish', FISH, false],
  ['food-sardines', 'Sardines', 208, 25, 0, 11, '1 tin, drained', 95, 'fish', FISH, true],

  // --- Eggs ----------------------------------------------------------------
  ['food-eggs-3', 'Eggs', 234, 19, 1, 16, '3 large', 165, 'eggs', VEG, true],
  ['food-egg-1', 'Egg', 78, 6.3, 0.4, 5.3, '1 large', 55, 'eggs', VEG, true],
  ['food-egg-whites', 'Egg whites', 104, 22, 1.4, 0.3, '200 ml', 200, 'eggs', VEG, true],

  // --- Dairy ---------------------------------------------------------------
  ['food-greek-yogurt', 'Greek yoghurt (0%)', 118, 20, 8, 0.4, '200 g', 200, 'dairy', VEG, true],
  ['food-greek-yogurt-5', 'Greek yoghurt (5%)', 200, 18, 8, 10, '200 g', 200, 'dairy', VEG, true],
  ['food-skyr', 'Skyr', 128, 22, 8, 0.4, '200 g', 200, 'dairy', VEG, false],
  ['food-cottage-cheese', 'Cottage cheese', 196, 25, 7, 8, '200 g', 200, 'dairy', VEG, true],
  ['food-milk', 'Milk (semi-skimmed)', 175, 12, 17, 6, '350 ml', 350, 'dairy', VEG, true],
  ['food-milk-skim', 'Milk (skimmed)', 122, 12, 18, 0.7, '350 ml', 350, 'dairy', VEG, true],
  ['food-cheese', 'Hard cheese', 240, 15, 1, 20, '60 g', 60, 'dairy', VEG, false],
  ['food-mozzarella', 'Mozzarella', 170, 14, 2, 12, '60 g', 60, 'dairy', VEG, false],
  ['food-butter', 'Butter', 74, 0.1, 0, 8.2, '10 g', 10, 'dairy', VEG, true],

  // --- Plant protein -------------------------------------------------------
  ['food-tofu-firm', 'Firm tofu', 217, 24, 5, 12, '150 g', 150, 'plant_protein', PLANT, true],
  ['food-tempeh', 'Tempeh', 288, 29, 14, 14, '150 g', 150, 'plant_protein', PLANT, false],
  ['food-seitan', 'Seitan', 220, 37, 12, 2, '150 g', 150, 'plant_protein', PLANT, false],
  ['food-lentils', 'Lentils', 232, 18, 40, 0.8, '200 g cooked', 200, 'plant_protein', PLANT, true],
  ['food-chickpeas', 'Chickpeas', 328, 15, 54, 5, '200 g cooked', 200, 'plant_protein', PLANT, true],
  ['food-black-beans', 'Black beans', 264, 16, 47, 1, '200 g cooked', 200, 'plant_protein', PLANT, true],
  ['food-kidney-beans', 'Kidney beans', 254, 17, 45, 1, '200 g cooked', 200, 'plant_protein', PLANT, true],
  ['food-edamame', 'Edamame', 244, 22, 18, 10, '200 g', 200, 'plant_protein', PLANT, true],
  ['food-soy-milk', 'Soy milk', 190, 11, 12, 11, '350 ml', 350, 'plant_protein', PLANT, true],
  ['food-baked-beans', 'Baked beans', 162, 9, 27, 0.8, '1/2 tin (200 g)', 200, 'plant_protein', PLANT, true],
  ['food-hummus', 'Hummus', 148, 4.5, 8, 11, '60 g', 60, 'plant_protein', PLANT, true],
  ['food-falafel', 'Falafel', 250, 10, 22, 14, '4 pieces', 120, 'plant_protein', PLANT, true],

  // --- Carbohydrate --------------------------------------------------------
  ['food-oats', 'Oats', 302, 11, 50, 6, '80 g dry', 80, 'carbs', PLANT, true],
  ['food-rice-white', 'White rice', 260, 5, 56, 0.6, '200 g cooked', 200, 'carbs', PLANT, true],
  ['food-rice-brown', 'Brown rice', 248, 5.6, 51, 2, '200 g cooked', 200, 'carbs', PLANT, true],
  ['food-pasta', 'Pasta', 316, 12, 62, 1.8, '200 g cooked', 200, 'carbs', PLANT, true],
  ['food-potato', 'Potato', 172, 4, 39, 0.2, '200 g boiled', 200, 'carbs', PLANT, true],
  ['food-sweet-potato', 'Sweet potato', 180, 3.2, 41, 0.2, '200 g baked', 200, 'carbs', PLANT, true],
  ['food-bread-slice', 'Bread', 160, 6, 30, 2, '2 slices', 72, 'carbs', PLANT, true],
  ['food-bagel', 'Bagel', 250, 10, 48, 1.5, '1 bagel', 90, 'carbs', PLANT, true],
  ['food-wrap', 'Tortilla wrap', 210, 6, 35, 5, '1 large', 70, 'carbs', PLANT, true],
  ['food-couscous', 'Couscous', 224, 7.6, 46, 0.3, '200 g cooked', 200, 'carbs', PLANT, true],
  ['food-quinoa', 'Quinoa', 240, 8.8, 42, 3.8, '200 g cooked', 200, 'carbs', PLANT, false],
  ['food-noodles', 'Egg noodles', 276, 9, 54, 3, '200 g cooked', 200, 'carbs', VEG, true],
  ['food-cereal', 'Breakfast cereal', 190, 4, 40, 1.5, '50 g', 50, 'carbs', PLANT, true],

  // --- Fruit and veg -------------------------------------------------------
  ['food-banana', 'Banana', 105, 1.3, 27, 0.4, '1 medium', 120, 'fruit_veg', PLANT, true],
  ['food-apple', 'Apple', 95, 0.5, 25, 0.3, '1 medium', 180, 'fruit_veg', PLANT, true],
  ['food-berries', 'Mixed berries', 60, 1, 14, 0.4, '150 g', 150, 'fruit_veg', PLANT, true],
  ['food-orange', 'Orange', 72, 1.3, 18, 0.2, '1 medium', 150, 'fruit_veg', PLANT, true],
  ['food-grapes', 'Grapes', 104, 1, 27, 0.3, '150 g', 150, 'fruit_veg', PLANT, true],
  ['food-broccoli', 'Broccoli', 52, 4.4, 8, 0.6, '150 g', 150, 'fruit_veg', PLANT, true],
  ['food-mixed-veg', 'Mixed vegetables', 66, 3.5, 11, 0.6, '200 g', 200, 'fruit_veg', PLANT, true],
  ['food-salad', 'Side salad', 30, 1.5, 5, 0.4, '1 bowl', 150, 'fruit_veg', PLANT, true],
  ['food-avocado', 'Avocado', 240, 3, 12, 22, '1 medium', 150, 'fruit_veg', PLANT, false],
  ['food-tomato', 'Tomatoes', 32, 1.6, 7, 0.4, '180 g', 180, 'fruit_veg', PLANT, true],

  // --- Fats and nuts -------------------------------------------------------
  ['food-peanut-butter', 'Peanut butter', 190, 8, 6, 16, '2 tbsp (32 g)', 32, 'fats', PLANT, true],
  ['food-almonds', 'Almonds', 174, 6.4, 6, 15, '30 g', 30, 'fats', PLANT, false],
  ['food-mixed-nuts', 'Mixed nuts', 182, 5.5, 6, 16, '30 g', 30, 'fats', PLANT, false],
  ['food-olive-oil', 'Olive oil', 119, 0, 0, 13.5, '1 tbsp', 14, 'fats', PLANT, true],
  ['food-mayo', 'Mayonnaise', 94, 0.1, 0.1, 10.3, '1 tbsp', 14, 'fats', VEG, true],
  ['food-chia', 'Chia seeds', 138, 4.7, 12, 8.7, '30 g', 30, 'fats', PLANT, false],

  // --- Drinks --------------------------------------------------------------
  ['food-coffee-black', 'Black coffee', 3, 0.3, 0, 0, '1 mug', 250, 'drinks', PLANT, true],
  ['food-latte', 'Latte', 150, 8, 13, 7, '1 medium', 350, 'drinks', VEG, false],
  ['food-orange-juice', 'Orange juice', 112, 1.7, 26, 0.5, '250 ml', 250, 'drinks', PLANT, true],
  ['food-cola', 'Cola', 139, 0, 35, 0, '330 ml can', 330, 'drinks', PLANT, true],
  ['food-diet-cola', 'Diet cola', 1, 0, 0, 0, '330 ml can', 330, 'drinks', PLANT, true],
  ['food-beer', 'Beer', 153, 1.6, 13, 0, '1 pint (500 ml)', 500, 'drinks', PLANT, true],
  ['food-wine', 'Wine', 125, 0.1, 4, 0, '175 ml glass', 175, 'drinks', PLANT, false],

  // --- Assembled meals -----------------------------------------------------
  ['food-chicken-rice-veg', 'Chicken, rice and veg', 560, 52, 60, 9, '1 plate', null, 'meals', MEAT, true],
  ['food-protein-oats', 'Protein oats', 430, 33, 54, 8, '1 bowl', null, 'meals', VEG, true],
  ['food-chicken-wrap', 'Chicken wrap', 480, 38, 40, 18, '1 wrap', null, 'meals', MEAT, true],
  ['food-stir-fry', 'Beef stir-fry', 520, 40, 48, 17, '1 plate', null, 'meals', MEAT, true],
  ['food-salmon-potato', 'Salmon and potatoes', 560, 42, 44, 22, '1 plate', null, 'meals', FISH, false],
  ['food-tofu-rice-bowl', 'Tofu rice bowl', 500, 28, 66, 13, '1 bowl', null, 'meals', PLANT, true],
  ['food-omelette', 'Three-egg omelette', 330, 24, 4, 24, '1 omelette', null, 'meals', VEG, true],
  ['food-sandwich', 'Chicken sandwich', 420, 32, 42, 12, '1 sandwich', null, 'meals', MEAT, true],
  ['food-pizza-slice', 'Pizza', 570, 24, 66, 22, '2 slices', null, 'meals', VEG, true],
  ['food-burger', 'Burger and chips', 850, 38, 78, 42, '1 meal', null, 'meals', MEAT, false],

  // --- Treats --------------------------------------------------------------
  ['food-chocolate', 'Chocolate', 255, 3.4, 28, 14, '50 g bar', 50, 'treats', VEG, true],
  ['food-crisps', 'Crisps', 175, 2, 17, 11, '1 bag (33 g)', 33, 'treats', PLANT, true],
  ['food-ice-cream', 'Ice cream', 210, 3.6, 25, 11, '100 g', 100, 'treats', VEG, true],
  ['food-biscuits', 'Biscuits', 160, 2, 21, 7.5, '2 biscuits', 32, 'treats', VEG, true],

  // --- Supplements ---------------------------------------------------------
  ['food-whey', 'Whey protein', 120, 24, 3, 1.5, '1 scoop (30 g)', 30, 'supplements', VEG, true],
  ['food-plant-protein', 'Plant protein powder', 118, 21, 4, 2, '1 scoop (30 g)', 30, 'supplements', PLANT, true],
  ['food-protein-bar', 'Protein bar', 210, 20, 20, 7, '1 bar', 60, 'supplements', VEG, false],
  ['food-protein-shake-rtd', 'Ready-to-drink shake', 160, 30, 5, 2.5, '1 bottle', 330, 'supplements', VEG, false],
  ['food-creatine', 'Creatine', 0, 0, 0, 0, '5 g', 5, 'supplements', PLANT, true],
]

export const STARTER_FOODS: FoodItem[] = ROWS.map(
  ([id, name, kcal, proteinG, carbsG, fatG, serving, servingGrams, category, tags, budgetFriendly]) => ({
    id,
    name,
    kcal,
    proteinG,
    carbsG,
    fatG,
    serving,
    servingGrams: servingGrams ?? undefined,
    category,
    tags,
    budgetFriendly,
  }),
)

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  meat: 'Meat & poultry',
  fish: 'Fish & seafood',
  dairy: 'Dairy',
  eggs: 'Eggs',
  plant_protein: 'Beans, tofu & pulses',
  carbs: 'Grains & starches',
  fruit_veg: 'Fruit & veg',
  fats: 'Nuts, oils & fats',
  drinks: 'Drinks',
  meals: 'Whole meals',
  treats: 'Treats',
  supplements: 'Supplements',
}

/** Display order for the browse list — protein sources first, on purpose. */
export const CATEGORY_ORDER: FoodCategory[] = [
  'meals',
  'meat',
  'fish',
  'eggs',
  'dairy',
  'plant_protein',
  'carbs',
  'fruit_veg',
  'fats',
  'supplements',
  'drinks',
  'treats',
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

/**
 * Substring search, ranked so that a prefix match beats a match in the middle
 * of a word. Deliberately simple — no fuzzy matching to be clever about, and no
 * network round-trip, so it stays instant offline.
 */
export function searchFoods(foods: FoodItem[], query: string): FoodItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return foods
  return foods
    .map((food) => {
      const name = food.name.toLowerCase()
      const at = name.indexOf(q)
      return { food, at }
    })
    .filter((r) => r.at >= 0)
    .sort((a, b) => a.at - b.at || a.food.name.localeCompare(b.food.name))
    .map((r) => r.food)
}
