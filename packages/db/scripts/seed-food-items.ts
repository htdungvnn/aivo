/**
 * Seed the food_items table with ~100 staple foods
 * Run: pnpm --filter @aivo/db exec tsx seed-food-items.ts
 */

import { drizzle } from "@aivo/db";
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { DB } from ".";

// Define a minimal schema for seeding (we import from @aivo/db in real usage)
const foodItems = sqliteTable("food_items", {
  id: text("id").primaryKey(),
  name: text("name", { length: 255 }).notNull(),
  brand: text("brand", { length: 255 }),
  servingSize: real("serving_size"),
  servingUnit: text("serving_unit"),
  calories: real("calories").notNull(),
  protein_g: real("protein_g").notNull(),
  carbs_g: real("carbs_g").notNull(),
  fat_g: real("fat_g").notNull(),
  fiber_g: real("fiber_g"),
  sugar_g: real("sugar_g"),
  sodium_mg: real("sodium_mg"),
  isVerified: integer("is_verified").default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Staples food data - curated list of 100 common foods
const stapleFoods = [
  // Proteins
  { name: "chicken breast", brand: null, servingSize: 100, servingUnit: "g", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74 },
  { name: "chicken thigh", brand: null, servingSize: 100, servingUnit: "g", calories: 209, protein_g: 26, carbs_g: 0, fat_g: 12, fiber_g: 0, sugar_g: 0, sodium_mg: 95 },
  { name: "chicken wing", brand: null, servingSize: 100, servingUnit: "g", calories: 203, protein_g: 27, carbs_g: 0, fat_g: 11, fiber_g: 0, sugar_g: 0, sodium_mg: 120 },
  { name: "ground beef (lean 90/10)", brand: null, servingSize: 100, servingUnit: "g", calories: 176, protein_g: 17, carbs_g: 0, fat_g: 10, fiber_g: 0, sugar_g: 0, sodium_mg: 70 },
  { name: "ground beef (regular 80/20)", brand: null, servingSize: 100, servingUnit: "g", calories: 250, protein_g: 17, carbs_g: 0, fat_g: 20, fiber_g: 0, sugar_g: 0, sodium_mg: 75 },
  { name: "beef steak (sirloin)", brand: null, servingSize: 100, servingUnit: "g", calories: 183, protein_g: 27, carbs_g: 0, fat_g: 8, fiber_g: 0, sugar_g: 0, sodium_mg: 60 },
  { name: "salmon (atlantic)", brand: null, servingSize: 100, servingUnit: "g", calories: 208, protein_g: 22, carbs_g: 0, fat_g: 13, fiber_g: 0, sugar_g: 0, sodium_mg: 59 },
  { name: "salmon (farmed)", brand: null, servingSize: 100, servingUnit: "g", calories: 227, protein_g: 20, carbs_g: 0, fat_g: 15, fiber_g: 0, sugar_g: 0, sodium_mg: 50 },
  { name: "tuna (canned in water)", brand: null, servingSize: 100, servingUnit: "g", calories: 116, protein_g: 26, carbs_g: 0, fat_g: 1, fiber_g: 0, sugar_g: 0, sodium_mg: 300 },
  { name: "shrimp", brand: null, servingSize: 100, servingUnit: "g", calories: 99, protein_g: 24, carbs_g: 0, fat_g: 0.3, fiber_g: 0, sugar_g: 0, sodium_mg: 111 },
  { name: "pork chop", brand: null, servingSize: 100, servingUnit: "g", calories: 242, protein_g: 27, carbs_g: 0, fat_g: 14, fiber_g: 0, sugar_g: 0, sodium_mg: 70 },
  { name: "bacon", brand: null, servingSize: 2, servingUnit: "slices", calories: 80, protein_g: 6, carbs_g: 0.2, fat_g: 6, fiber_g: 0, sugar_g: 0, sodium_mg: 300 },
  { name: "egg (whole)", brand: null, servingSize: 1, servingUnit: "large", calories: 78, protein_g: 6, carbs_g: 0.6, fat_g: 5, fiber_g: 0, sugar_g: 0.6, sodium_mg: 62 },
  { name: "egg white", brand: null, servingSize: 1, servingUnit: "large", calories: 17, protein_g: 4, carbs_g: 0.2, fat_g: 0, fiber_g: 0, sugar_g: 0.2, sodium_mg: 55 },
  { name: "tofu (firm)", brand: null, servingSize: 100, servingUnit: "g", calories: 144, protein_g: 16, carbs_g: 2.3, fat_g: 8, fiber_g: 0.4, sugar_g: 0.7, sodium_mg: 10 },
  { name: "tofu (silken)", brand: null, servingSize: 100, servingUnit: "g", calories: 62, protein_g: 5, carbs_g: 1.4, fat_g: 3, fiber_g: 0.2, sugar_g: 0.6, sodium_mg: 5 },
  { name: "lentils (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 116, protein_g: 9, carbs_g: 20, fat_g: 0.4, fiber_g: 8, sugar_g: 1.8, sodium_mg: 2 },
  { name: "chickpeas (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 164, protein_g: 9, carbs_g: 27, fat_g: 2.6, fiber_g: 7.6, sugar_g: 4.5, sodium_mg: 7 },
  { name: "black beans (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 132, protein_g: 9, carbs_g: 24, fat_g: 0.5, fiber_g: 8.7, sugar_g: 0.3, sodium_mg: 2 },
  { name: "kidney beans (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 127, protein_g: 9, carbs_g: 22, fat_g: 0.5, fiber_g: 6.4, sugar_g: 0.3, sodium_mg: 2 },
  { name: "greek yogurt (plain, nonfat)", brand: null, servingSize: 100, servingUnit: "g", calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4, fiber_g: 0, sugar_g: 3.6, sodium_mg: 35 },
  { name: "greek yogurt (plain, whole)", brand: null, servingSize: 100, servingUnit: "g", calories: 97, protein_g: 9, carbs_g: 3.9, fat_g: 5, fiber_g: 0, sugar_g: 3.9, sodium_mg: 50 },
  { name: "cottage cheese (lowfat)", brand: null, servingSize: 100, servingUnit: "g", calories: 98, protein_g: 13, carbs_g: 3.4, fat_g: 4, fiber_g: 0, sugar_g: 3.4, sodium_mg: 350 },
  { name: "cheddar cheese", brand: null, servingSize: 28, servingUnit: "g", calories: 114, protein_g: 7, carbs_g: 0.4, fat_g: 9, fiber_g: 0, sugar_g: 0.4, sodium_mg: 180 },
  { name: "mozzarella cheese", brand: null, servingSize: 28, servingUnit: "g", calories: 85, protein_g: 6, carbs_g: 0.6, fat_g: 6, fiber_g: 0, sugar_g: 0.6, sodium_mg: 140 },

  // Carbs / Grains
  { name: "white rice (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, sugar_g: 0, sodium_mg: 0 },
  { name: "brown rice (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 112, protein_g: 2.6, carbs_g: 24, fat_g: 0.9, fiber_g: 1.8, sugar_g: 0, sodium_mg: 1 },
  { name: "quinoa (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 120, protein_g: 4.4, carbs_g: 21, fat_g: 1.9, fiber_g: 2.8, sugar_g: 0, sodium_mg: 5 },
  { name: "oats (dry)", brand: null, servingSize: 40, servingUnit: "g", calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3, fiber_g: 4, sugar_g: 1, sodium_mg: 0 },
  { name: "oatmeal (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 71, protein_g: 2.5, carbs_g: 12, fat_g: 1.5, fiber_g: 1.7, sugar_g: 0, sodium_mg: 1 },
  { name: "whole wheat bread", brand: null, servingSize: 1, servingUnit: "slice", calories: 80, protein_g: 4, carbs_g: 15, fat_g: 1, fiber_g: 2, sugar_g: 2, sodium_mg: 140 },
  { name: "white bread", brand: null, servingSize: 1, servingUnit: "slice", calories: 79, protein_g: 3, carbs_g: 15, fat_g: 1, fiber_g: 0.6, sugar_g: 1.5, sodium_mg: 140 },
  { name: "bagel (plain)", brand: null, servingSize: 1, servingUnit: "medium", calories: 277, protein_g: 11, carbs_g: 54, fat_g: 1.5, fiber_g: 2.3, sugar_g: 6, sodium_mg: 430 },
  { name: "pasta (spaghetti, cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 158, protein_g: 5.8, carbs_g: 31, fat_g: 0.9, fiber_g: 1.8, sugar_g: 0, sodium_mg: 1 },
  { name: "whole wheat pasta (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 124, protein_g: 5, carbs_g: 26, fat_g: 0.5, fiber_g: 4.5, sugar_g: 0, sodium_mg: 2 },
  { name: "couscous (cooked)", brand: null, servingSize: 100, servingUnit: "g", calories: 112, protein_g: 3.8, carbs_g: 23, fat_g: 0.2, fiber_g: 1.4, sugar_g: 0, sodium_mg: 10 },
  { name: "crackers (saltine)", brand: null, servingSize: 10, servingUnit: "g", calories: 50, protein_g: 1, carbs_g: 9, fat_g: 2, fiber_g: 0.3, sugar_g: 1, sodium_mg: 150 },
  { name: "corn tortilla", brand: null, servingSize: 1, servingUnit: "medium", calories: 50, protein_g: 1.5, carbs_g: 10, fat_g: 1, fiber_g: 1.5, sugar_g: 0, sodium_mg: 20 },
  { name: "flour tortilla (white)", brand: null, servingSize: 1, servingUnit: "medium", calories: 120, protein_g: 4, carbs_g: 20, fat_g: 4, fiber_g: 1, sugar_g: 1, sodium_mg: 350 },

  // Vegetables
  { name: "broccoli", brand: null, servingSize: 100, servingUnit: "g", calories: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, fiber_g: 2.6, sugar_g: 1.5, sodium_mg: 33 },
  { name: "spinach (raw)", brand: null, servingSize: 100, servingUnit: "g", calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, fiber_g: 2.2, sugar_g: 0.4, sodium_mg: 79 },
  { name: "kale (raw)", brand: null, servingSize: 100, servingUnit: "g", calories: 49, protein_g: 4.3, carbs_g: 9, fat_g: 0.9, fiber_g: 3.6, sugar_g: 2.3, sodium_mg: 38 },
  { name: "lettuce (romaine)", brand: null, servingSize: 100, servingUnit: "g", calories: 17, protein_g: 1.2, carbs_g: 3.3, fat_g: 0.3, fiber_g: 2.1, sugar_g: 1.2, sodium_mg: 8 },
  { name: "tomato", brand: null, servingSize: 1, servingUnit: "medium", calories: 22, protein_g: 1.1, carbs_g: 4.8, fat_g: 0.2, fiber_g: 1.5, sugar_g: 3.2, sodium_mg: 6 },
  { name: "cucumber", brand: null, servingSize: 100, servingUnit: "g", calories: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1, fiber_g: 0.5, sugar_g: 1.7, sodium_mg: 2 },
  { name: "carrot", brand: null, servingSize: 1, servingUnit: "medium", calories: 25, protein_g: 0.6, carbs_g: 6, fat_g: 0.1, fiber_g: 1.7, sugar_g: 3.4, sodium_mg: 42 },
  { name: "bell pepper (red)", brand: null, servingSize: 100, servingUnit: "g", calories: 31, protein_g: 1, carbs_g: 6, fat_g: 0.3, fiber_g: 2.1, sugar_g: 4.2, sodium_mg: 2 },
  { name: "onion", brand: null, servingSize: 100, servingUnit: "g", calories: 40, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.1, fiber_g: 1.7, sugar_g: 4.2, sodium_mg: 4 },
  { name: "mushroom (white)", brand: null, servingSize: 100, servingUnit: "g", calories: 22, protein_g: 3.1, carbs_g: 3.3, fat_g: 0.3, fiber_g: 1, sugar_g: 2, sodium_mg: 5 },
  { name: "avocado", brand: null, servingSize: 100, servingUnit: "g", calories: 160, protein_g: 2, carbs_g: 8.5, fat_g: 15, fiber_g: 7, sugar_g: 0.4, sodium_mg: 7 },
  { name: "potato (baked)", brand: null, servingSize: 100, servingUnit: "g", calories: 93, protein_g: 2.5, carbs_g: 21, fat_g: 0.1, fiber_g: 2.2, sugar_g: 0.8, sodium_mg: 8 },
  { name: "sweet potato (baked)", brand: null, servingSize: 100, servingUnit: "g", calories: 86, protein_g: 1.6, carbs_g: 20, fat_g: 0.1, fiber_g: 3, sugar_g: 4.2, sodium_mg: 27 },
  { name: "corn (cob, boiled)", brand: null, servingSize: 100, servingUnit: "g", calories: 96, protein_g: 3.4, carbs_g: 21, fat_g: 1.5, fiber_g: 2.4, sugar_g: 3.2, sodium_mg: 15 },
  { name: "peas (green, frozen)", brand: null, servingSize: 100, servingUnit: "g", calories: 81, protein_g: 5.4, carbs_g: 14, fat_g: 0.4, fiber_g: 5.1, sugar_g: 5.7, sodium_mg: 6 },
  { name: "asparagus", brand: null, servingSize: 100, servingUnit: "g", calories: 20, protein_g: 2.2, carbs_g: 3.9, fat_g: 0.2, fiber_g: 2.1, sugar_g: 1.9, sodium_mg: 2 },
  { name: "cauliflower", brand: null, servingSize: 100, servingUnit: "g", calories: 25, protein_g: 2, carbs_g: 5, fat_g: 0.3, fiber_g: 2, sugar_g: 1.9, sodium_mg: 30 },
  { name: "celery", brand: null, servingSize: 100, servingUnit: "g", calories: 16, protein_g: 0.7, carbs_g: 3, fat_g: 0.2, fiber_g: 1.6, sugar_g: 1.4, sodium_mg: 80 },
  { name: "eggplant", brand: null, servingSize: 100, servingUnit: "g", calories: 25, protein_g: 0.9, carbs_g: 6, fat_g: 0.2, fiber_g: 3, sugar_g: 3.5, sodium_mg: 2 },

  // Fruits
  { name: "banana", brand: null, servingSize: 1, servingUnit: "medium", calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, fiber_g: 3.1, sugar_g: 14, sodium_mg: 1 },
  { name: "apple", brand: null, servingSize: 1, servingUnit: "medium", calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, fiber_g: 4.4, sugar_g: 19, sodium_mg: 2 },
  { name: "orange", brand: null, servingSize: 1, servingUnit: "medium", calories: 62, protein_g: 1.2, carbs_g: 15, fat_g: 0.2, fiber_g: 3.1, sugar_g: 12, sodium_mg: 0 },
  { name: "strawberries", brand: null, servingSize: 100, servingUnit: "g", calories: 32, protein_g: 0.7, carbs_g: 7.7, fat_g: 0.3, fiber_g: 2, sugar_g: 4.9, sodium_mg: 1 },
  { name: "blueberries", brand: null, servingSize: 100, servingUnit: "g", calories: 57, protein_g: 0.7, carbs_g: 14, fat_g: 0.3, fiber_g: 2.4, sugar_g: 10, sodium_mg: 1 },
  { name: "grapes (red)", brand: null, servingSize: 100, servingUnit: "g", calories: 69, protein_g: 0.7, carbs_g: 18, fat_g: 0.2, fiber_g: 0.9, sugar_g: 15, sodium_mg: 2 },
  { name: "watermelon", brand: null, servingSize: 100, servingUnit: "g", calories: 30, protein_g: 0.6, carbs_g: 7.6, fat_g: 0.2, fiber_g: 0.4, sugar_g: 6.2, sodium_mg: 1 },
  { name: "mango", brand: null, servingSize: 100, servingUnit: "g", calories: 60, protein_g: 0.8, carbs_g: 15, fat_g: 0.4, fiber_g: 1.6, sugar_g: 13, sodium_mg: 2 },
  { name: "pineapple", brand: null, servingSize: 100, servingUnit: "g", calories: 50, protein_g: 0.5, carbs_g: 13, fat_g: 0.1, fiber_g: 1.4, sugar_g: 10, sodium_mg: 1 },
  { name: "avocado (hass)", brand: null, servingSize: 100, servingUnit: "g", calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15, fiber_g: 7, sugar_g: 0.4, sodium_mg: 7 },
  { name: "peach", brand: null, servingSize: 1, servingUnit: "medium", calories: 59, protein_g: 1.4, carbs_g: 14, fat_g: 0.4, fiber_g: 2.3, sugar_g: 12, sodium_mg: 0 },
  { name: "pear", brand: null, servingSize: 1, servingUnit: "medium", calories: 101, protein_g: 0.6, carbs_g: 27, fat_g: 0.2, fiber_g: 5.5, sugar_g: 17, sodium_mg: 2 },
  { name: "cherries", brand: null, servingSize: 100, servingUnit: "g", calories: 63, protein_g: 1, carbs_g: 16, fat_g: 0.2, fiber_g: 2.1, sugar_g: 13, sodium_mg: 0 },
  { name: "kiwi", brand: null, servingSize: 1, servingUnit: "medium", calories: 42, protein_g: 0.8, carbs_g: 10, fat_g: 0.4, fiber_g: 2.1, sugar_g: 6, sodium_mg: 3 },
  { name: "grapefruit", brand: null, servingSize: 1, servingUnit: "half", calories: 52, protein_g: 1, carbs_g: 13, fat_g: 0.2, fiber_g: 2, sugar_g: 8, sodium_mg: 0 },

  // Dairy & Alternatives
  { name: "milk (whole, 3.25%)", brand: null, servingSize: 100, servingUnit: "ml", calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, fiber_g: 0, sugar_g: 4.8, sodium_mg: 44 },
  { name: "milk (2% reduced)", brand: null, servingSize: 100, servingUnit: "ml", calories: 50, protein_g: 3.4, carbs_g: 4.8, fat_g: 2, fiber_g: 0, sugar_g: 4.8, sodium_mg: 50 },
  { name: "milk (skim)", brand: null, servingSize: 100, servingUnit: "ml", calories: 34, protein_g: 3.4, carbs_g: 5, fat_g: 0.1, fiber_g: 0, sugar_g: 5, sodium_mg: 42 },
  { name: "almond milk (unsweetened)", brand: null, servingSize: 100, servingUnit: "ml", calories: 13, protein_g: 0.4, carbs_g: 0.2, fat_g: 1.1, fiber_g: 0.4, sugar_g: 0, sodium_mg: 75 },
  { name: "oat milk (unsweetened)", brand: null, servingSize: 100, servingUnit: "ml", calories: 45, protein_g: 1, carbs_g: 6, fat_g: 2.5, fiber_g: 0.4, sugar_g: 4, sodium_mg: 35 },
  { name: "butter", brand: null, servingSize: 1, servingUnit: "tbsp", calories: 102, protein_g: 0.1, carbs_g: 0, fat_g: 11.5, fiber_g: 0, sugar_g: 0, sodium_mg: 2 },
  { name: "olive oil", brand: null, servingSize: 1, servingUnit: "tbsp", calories: 119, protein_g: 0, carbs_g: 0, fat_g: 13.5, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
  { name: "coconut oil", brand: null, servingSize: 1, servingUnit: "tbsp", calories: 121, protein_g: 0, carbs_g: 0, fat_g: 13.6, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },

  // Nuts & Seeds
  { name: "almonds", brand: null, servingSize: 28, servingUnit: "g", calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14, fiber_g: 3.5, sugar_g: 1, sodium_mg: 0 },
  { name: "walnuts", brand: null, servingSize: 28, servingUnit: "g", calories: 185, protein_g: 4.3, carbs_g: 4, fat_g: 18.5, fiber_g: 1.9, sugar_g: 0.7, sodium_mg: 0 },
  { name: "peanuts", brand: null, servingSize: 28, servingUnit: "g", calories: 166, protein_g: 7, carbs_g: 6, fat_g: 14, fiber_g: 2.4, sugar_g: 1, sodium_mg: 5 },
  { name: "peanut butter (natural)", brand: null, servingSize: 2, servingUnit: "tbsp", calories: 190, protein_g: 8, carbs_g: 6, fat_g: 16, fiber_g: 2, sugar_g: 3, sodium_mg: 5 },
  { name: "chia seeds", brand: null, servingSize: 28, servingUnit: "g", calories: 138, protein_g: 4.4, carbs_g: 12, fat_g: 9, fiber_g: 11, sugar_g: 0, sodium_mg: 1 },
  { name: "flax seeds", brand: null, servingSize: 28, servingUnit: "g", calories: 150, protein_g: 5.2, carbs_g: 8, fat_g: 12, fiber_g: 7.6, sugar_g: 0.3, sodium_mg: 2 },

  // Beverages & Others
  { name: "black coffee", brand: null, servingSize: 240, servingUnit: "ml", calories: 2, protein_g: 0.3, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 5 },
  { name: "coffee with milk (2%)", brand: null, servingSize: 240, servingUnit: "ml", calories: 25, protein_g: 2, carbs_g: 3, fat_g: 1, fiber_g: 0, sugar_g: 3, sodium_mg: 40 },
  { name: "orange juice", brand: null, servingSize: 240, servingUnit: "ml", calories: 112, protein_g: 1.7, carbs_g: 26, fat_g: 0.5, fiber_g: 0.5, sugar_g: 20, sodium_mg: 2 },
  { name: "apple juice", brand: null, servingSize: 240, servingUnit: "ml", calories: 114, protein_g: 0.2, carbs_g: 28, fat_g: 0.2, fiber_g: 0.2, sugar_g: 22, sodium_mg: 5 },
  { name: "green tea (brewed)", brand: null, servingSize: 240, servingUnit: "ml", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 2 },
  { name: "honey", brand: null, servingSize: 1, servingUnit: "tbsp", calories: 64, protein_g: 0.1, carbs_g: 17, fat_g: 0, fiber_g: 0, sugar_g: 17, sodium_mg: 0 },
  { name: "maple syrup", brand: null, servingSize: 1, servingUnit: "tbsp", calories: 52, protein_g: 0, carbs_g: 13, fat_g: 0, fiber_g: 0, sugar_g: 13, sodium_mg: 2 },
  { name: "salsa", brand: null, servingSize: 30, servingUnit: "ml", calories: 8, protein_g: 0.4, carbs_g: 2, fat_g: 0, fiber_g: 0.4, sugar_g: 1, sodium_mg: 150 },
  { name: "mustard (yellow)", brand: null, servingSize: 1, servingUnit: "tsp", calories: 3, protein_g: 0.2, carbs_g: 0.4, fat_g: 0, fiber_g: 0.2, sugar_g: 0, sodium_mg: 50 },
  { name: "soy sauce (regular)", brand: null, servingSize: 1, servingUnit: "tbsp", calories: 10, protein_g: 1, carbs_g: 1, fat_g: 0, fiber_g: 0.1, sugar_g: 0, sodium_mg: 1000 },
];

async function seed() {
  const db = await drizzle;

  console.log("Seeding food_items with", stapleFoods.length, "items...");

  const now = Date.now();
  let inserted = 0;

  for (const food of stapleFoods) {
    try {
      await db.insert(foodItems).values({
        id: crypto.randomUUID(),
        name: food.name,
        brand: food.brand,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        fiber_g: food.fiber_g ?? null,
        sugar_g: food.sugar_g ?? null,
        sodium_mg: food.sodium_mg ?? null,
        isVerified: 1,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    } catch (error) {
      console.error(`Failed to insert ${food.name}:`, error);
    }
  }

  console.log(`Successfully seeded ${inserted}/${stapleFoods.length} food items.`);
}

seed().catch(console.error);
