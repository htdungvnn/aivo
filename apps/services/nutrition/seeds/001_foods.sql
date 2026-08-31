/**
 * Nutrition Service Idempotent Seeds
 * 
 * These seeds use INSERT OR IGNORE to ensure idempotency.
 * Safe to run multiple times.
 */

-- Seed initial foods (Common foods with approximate nutrition data)
INSERT OR IGNORE INTO foods (id, normalized_name, display_name, category, serving_size_default, serving_unit_default, nutrition_per100g, aliases) VALUES
-- Proteins
('food_chicken_breast_grilled', 'chicken_breast_grilled', 'Grilled Chicken Breast', 'protein', 100, 'g', 
 '{"caloriesKcal":165,"proteinG":31,"carbsG":0,"fatG":3.6,"fiberG":0,"sugarG":0,"sodiumMg":74,"source":"food_catalog"}',
 '["grilled chicken","chicken breast","baked chicken"]'),

('food_salmon_baked', 'salmon_baked', 'Baked Salmon', 'protein', 100, 'g',
 '{"caloriesKcal":208,"proteinG":20,"carbsG":0,"fatG":13,"fiberG":0,"sugarG":0,"sodiumMg":59,"source":"food_catalog"}',
 '["salmon","baked salmon","grilled salmon"]'),

('food_egg_boiled', 'egg_boiled', 'Boiled Egg', 'protein', 50, 'g',
 '{"caloriesKcal":155,"proteinG":13,"carbsG":1.1,"fatG":11,"fiberG":0,"sugarG":1.1,"sodiumMg":126,"source":"food_catalog"}',
 '["egg","boiled egg","hard boiled egg"]'),

-- Grains
('food_white_rice_cooked', 'white_rice_cooked', 'Cooked White Rice', 'grain', 100, 'g',
 '{"caloriesKcal":130,"proteinG":2.7,"carbsG":28,"fatG":0.3,"fiberG":0.4,"sugarG":0,"sodiumMg":1,"source":"food_catalog"}',
 '["rice","white rice","steamed rice"]'),

('food_brown_rice_cooked', 'brown_rice_cooked', 'Cooked Brown Rice', 'grain', 100, 'g',
 '{"caloriesKcal":123,"proteinG":2.7,"carbsG":26,"fatG":1,"fiberG":1.8,"sugarG":0.4,"sodiumMg":4,"source":"food_catalog"}',
 '["brown rice"]'),

-- Vegetables
('food_broccoli_steamed', 'broccoli_steamed', 'Steamed Broccoli', 'vegetable', 100, 'g',
 '{"caloriesKcal":35,"proteinG":2.4,"carbsG":7,"fatG":0.4,"fiberG":3.3,"sugarG":1.4,"sodiumMg":30,"source":"food_catalog"}',
 '["broccoli","steamed broccoli"]'),

('food_spinach_raw', 'spinach_raw', 'Raw Spinach', 'vegetable', 100, 'g',
 '{"caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatG":0.4,"fiberG":2.2,"sugarG":0.4,"sodiumMg":79,"source":"food_catalog"}',
 '["spinach","raw spinach"]'),

-- Fruits
('food_banana', 'banana', 'Banana', 'fruit', 120, 'g',
 '{"caloriesKcal":105,"proteinG":1.3,"carbsG":27,"fatG":0.4,"fiberG":3.1,"sugarG":14,"sodiumMg":1,"source":"food_catalog"}',
 '["banana","bananas"]'),

('food_apple', 'apple', 'Apple', 'fruit', 180, 'g',
 '{"caloriesKcal":94,"proteinG":0.5,"carbsG":25,"fatG":0.3,"fiberG":4.4,"sugarG":19,"sodiumMg":2,"source":"food_catalog"}',
 '["apple","apples"]'),

-- Dairy
('food_milk_whole', 'milk_whole', 'Whole Milk', 'dairy', 240, 'ml',
 '{"caloriesKcal":149,"proteinG":8,"carbsG":12,"fatG":8,"fiberG":0,"sugarG":12,"sodiumMg":105,"source":"food_catalog"}',
 '["milk","whole milk"]'),

('food_greek_yogurt', 'greek_yogurt', 'Greek Yogurt', 'dairy', 150, 'g',
 '{"caloriesKcal":100,"proteinG":17,"carbsG":6,"fatG":0.7,"fiberG":0,"sugarG":4,"sodiumMg":56,"source":"food_catalog"}',
 '["yogurt","greek yogurt","plain yogurt"]');
