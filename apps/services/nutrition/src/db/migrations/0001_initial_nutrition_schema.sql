-- Migration: 0001_initial_nutrition_schema
-- Description: Initial nutrition schema with foods, meals, analyses, plans, and targets

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- FOOD CATALOG
-- =============================================================================

-- Foods table
CREATE TABLE IF NOT EXISTS foods (
    id TEXT PRIMARY KEY,
    normalized_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    category TEXT,
    serving_size_default REAL NOT NULL DEFAULT 100,
    serving_unit_default TEXT NOT NULL DEFAULT 'g',
    nutrition_per100g TEXT NOT NULL, -- JSON
    aliases TEXT NOT NULL DEFAULT '[]', -- JSON array
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_foods_normalized_name ON foods(normalized_name);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);

-- User food corrections
CREATE TABLE IF NOT EXISTS user_food_corrections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    normalized_food_name TEXT NOT NULL,
    corrected_nutrition TEXT NOT NULL, -- JSON
    is_favorite INTEGER NOT NULL DEFAULT 0,
    use_count INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_user_corrections_user_id ON user_food_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_corrections_food_name ON user_food_corrections(user_id, normalized_food_name);

-- =============================================================================
-- MEAL ANALYSES
-- =============================================================================

-- Meal analyses table
CREATE TABLE IF NOT EXISTS meal_analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    image_r2_key TEXT,
    image_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending_upload' CHECK(status IN (
        'pending_upload', 'queued', 'processing', 'needs_review', 'completed', 'failed', 'cancelled'
    )),
    meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    meal_name TEXT,
    result TEXT, -- JSON
    overall_confidence REAL,
    ai_model TEXT,
    prompt_version TEXT,
    processing_attempts INTEGER NOT NULL DEFAULT 0,
    error_category TEXT,
    error_message TEXT,
    idempotency_key TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON meal_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON meal_analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_image_hash ON meal_analyses(image_hash);
CREATE INDEX IF NOT EXISTS idx_analyses_idempotency ON meal_analyses(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON meal_analyses(created_at);

-- Meal analysis items
CREATE TABLE IF NOT EXISTS meal_analysis_items (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT,
    estimated_quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    confidence REAL NOT NULL,
    nutrition TEXT NOT NULL, -- JSON with source
    food_id TEXT,
    source TEXT NOT NULL CHECK(source IN ('food_catalog', 'ai_estimate', 'user_override', 'calculated')),
    user_override TEXT, -- JSON
    warnings TEXT NOT NULL DEFAULT '[]', -- JSON array
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (analysis_id) REFERENCES meal_analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analysis_items_analysis_id ON meal_analysis_items(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_items_normalized_name ON meal_analysis_items(normalized_name);

-- =============================================================================
-- MEALS
-- =============================================================================

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    name TEXT NOT NULL,
    image_r2_key TEXT,
    image_hash TEXT,
    notes TEXT,
    total_nutrition TEXT NOT NULL, -- JSON
    source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'ai_analysis')),
    analysis_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (analysis_id) REFERENCES meal_analyses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals(meal_type);
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals(created_at);
CREATE INDEX IF NOT EXISTS idx_meals_deleted_at ON meals(deleted_at);

-- Meal items
CREATE TABLE IF NOT EXISTS meal_items (
    id TEXT PRIMARY KEY,
    meal_id TEXT NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    nutrition TEXT NOT NULL, -- JSON snapshot
    source TEXT NOT NULL CHECK(source IN ('food_catalog', 'ai_estimate', 'user_override', 'calculated')),
    food_id TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    user_override TEXT, -- JSON
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_normalized_name ON meal_items(normalized_name);

-- =============================================================================
-- MEAL PLANS
-- =============================================================================

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_plans_status ON meal_plans(status);

-- Meal plan entries
CREATE TABLE IF NOT EXISTS meal_plan_entries (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    target_time TEXT,
    target_nutrition TEXT NOT NULL, -- JSON
    suggested_foods TEXT NOT NULL DEFAULT '[]', -- JSON array
    is_locked INTEGER NOT NULL DEFAULT 0,
    locked_by TEXT CHECK(locked_by IN ('user', 'system')),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_entries_plan_id ON meal_plan_entries(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_entries_meal_type ON meal_plan_entries(meal_type);

-- =============================================================================
-- NUTRITION TARGETS
-- =============================================================================

-- Nutrition targets table
CREATE TABLE IF NOT EXISTS nutrition_targets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    targets TEXT NOT NULL, -- JSON
    macro_targets TEXT NOT NULL, -- JSON
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_targets_user_id ON nutrition_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_targets_is_active ON nutrition_targets(is_active);

-- =============================================================================
-- DAILY NUTRITION SUMMARIES
-- =============================================================================

-- Daily summaries table
CREATE TABLE IF NOT EXISTS daily_nutrition_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    total_nutrition TEXT NOT NULL, -- JSON
    meal_count INTEGER NOT NULL DEFAULT 0,
    plan_target TEXT, -- JSON, nullable if no plan
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_summaries_user_date ON daily_nutrition_summaries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_summaries_date ON daily_nutrition_summaries(date);

-- =============================================================================
-- AI USAGE TRACKING
-- =============================================================================

-- AI usage table for rate limiting
CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    hour INTEGER NOT NULL, -- 0-23
    call_count INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date_hour ON ai_usage(user_id, date, hour);

-- =============================================================================
-- SEED INITIAL FOODS (Common foods with approximate nutrition data)
-- =============================================================================

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

('food_ground_beef_cooked', 'ground_beef_cooked', 'Cooked Ground Beef', 'protein', 100, 'g',
 '{"caloriesKcal":250,"proteinG":26,"carbsG":0,"fatG":15,"fiberG":0,"sugarG":0,"sodiumMg":75,"source":"food_catalog"}',
 '["ground beef","beef","minced beef","hamburger meat"]'),

('food_tofu_firm', 'tofu_firm', 'Firm Tofu', 'protein', 100, 'g',
 '{"caloriesKcal":144,"proteinG":17,"carbsG":3,"fatG":9,"fiberG":2,"sugarG":0,"sodiumMg":14,"source":"food_catalog"}',
 '["tofu","bean curd"]'),

-- Grains
('food_white_rice_cooked', 'white_rice_cooked', 'Cooked White Rice', 'grain', 100, 'g',
 '{"caloriesKcal":130,"proteinG":2.7,"carbsG":28,"fatG":0.3,"fiberG":0.4,"sugarG":0,"sodiumMg":1,"source":"food_catalog"}',
 '["rice","white rice","steamed rice"]'),

('food_brown_rice_cooked', 'brown_rice_cooked', 'Cooked Brown Rice', 'grain', 100, 'g',
 '{"caloriesKcal":123,"proteinG":2.7,"carbsG":26,"fatG":1,"fiberG":1.8,"sugarG":0.4,"sodiumMg":4,"source":"food_catalog"}',
 '["brown rice"]'),

('food_pasta_cooked', 'pasta_cooked', 'Cooked Pasta', 'grain', 100, 'g',
 '{"caloriesKcal":131,"proteinG":5,"carbsG":25,"fatG":1.1,"fiberG":1.8,"sugarG":0.6,"sodiumMg":1,"source":"food_catalog"}',
 '["pasta","spaghetti","noodles","macaroni"]'),

('food_bread_whole_wheat', 'bread_whole_wheat', 'Whole Wheat Bread', 'grain', 30, 'g',
 '{"caloriesKcal":69,"proteinG":3.6,"carbsG":12,"fatG":1.1,"fiberG":2,"sugarG":1.4,"sodiumMg":132,"source":"food_catalog"}',
 '["bread","whole wheat bread","toast"]'),

('food_oatmeal_cooked', 'oatmeal_cooked', 'Cooked Oatmeal', 'grain', 100, 'g',
 '{"caloriesKcal":68,"proteinG":2.4,"carbsG":12,"fatG":1.4,"fiberG":1.7,"sugarG":0.5,"sodiumMg":4,"source":"food_catalog"}',
 '["oatmeal","oats","porridge"]'),

-- Vegetables
('food_broccoli_steamed', 'broccoli_steamed', 'Steamed Broccoli', 'vegetable', 100, 'g',
 '{"caloriesKcal":35,"proteinG":2.4,"carbsG":7,"fatG":0.4,"fiberG":3.3,"sugarG":1.4,"sodiumMg":30,"source":"food_catalog"}',
 '["broccoli","steamed broccoli"]'),

('food_spinach_raw', 'spinach_raw', 'Raw Spinach', 'vegetable', 100, 'g',
 '{"caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatG":0.4,"fiberG":2.2,"sugarG":0.4,"sodiumMg":79,"source":"food_catalog"}',
 '["spinach","raw spinach"]'),

('food_carrot_raw', 'carrot_raw', 'Raw Carrot', 'vegetable', 100, 'g',
 '{"caloriesKcal":41,"proteinG":0.9,"carbsG":10,"fatG":0.2,"fiberG":2.8,"sugarG":4.7,"sodiumMg":69,"source":"food_catalog"}',
 '["carrot","carrots"]'),

('food_tomato_raw', 'tomato_raw', 'Raw Tomato', 'vegetable', 100, 'g',
 '{"caloriesKcal":18,"proteinG":0.9,"carbsG":3.9,"fatG":0.2,"fiberG":1.2,"sugarG":2.6,"sodiumMg":5,"source":"food_catalog"}',
 '["tomato","tomatoes"]'),

('food_sweet_potato_baked', 'sweet_potato_baked', 'Baked Sweet Potato', 'vegetable', 100, 'g',
 '{"caloriesKcal":90,"proteinG":2,"carbsG":21,"fatG":0.1,"fiberG":3.3,"sugarG":6.5,"sodiumMg":36,"source":"food_catalog"}',
 '["sweet potato","yam"]'),

-- Fruits
('food_banana', 'banana', 'Banana', 'fruit', 120, 'g',
 '{"caloriesKcal":105,"proteinG":1.3,"carbsG":27,"fatG":0.4,"fiberG":3.1,"sugarG":14,"sodiumMg":1,"source":"food_catalog"}',
 '["banana","bananas"]'),

('food_apple', 'apple', 'Apple', 'fruit', 180, 'g',
 '{"caloriesKcal":94,"proteinG":0.5,"carbsG":25,"fatG":0.3,"fiberG":4.4,"sugarG":19,"sodiumMg":2,"source":"food_catalog"}',
 '["apple","apples"]'),

('food_orange', 'orange', 'Orange', 'fruit', 130, 'g',
 '{"caloriesKcal":61,"proteinG":1.2,"carbsG":15,"fatG":0.2,"fiberG":3.1,"sugarG":12,"sodiumMg":0,"source":"food_catalog"}',
 '["orange","oranges"]'),

('food_blueberries', 'blueberries', 'Blueberries', 'fruit', 100, 'g',
 '{"caloriesKcal":57,"proteinG":0.7,"carbsG":14,"fatG":0.3,"fiberG":2.4,"sugarG":10,"sodiumMg":1,"source":"food_catalog"}',
 '["blueberries","blueberry"]'),

-- Dairy
('food_milk_whole', 'milk_whole', 'Whole Milk', 'dairy', 240, 'ml',
 '{"caloriesKcal":149,"proteinG":8,"carbsG":12,"fatG":8,"fiberG":0,"sugarG":12,"sodiumMg":105,"source":"food_catalog"}',
 '["milk","whole milk"]'),

('food_greek_yogurt', 'greek_yogurt', 'Greek Yogurt', 'dairy', 150, 'g',
 '{"caloriesKcal":100,"proteinG":17,"carbsG":6,"fatG":0.7,"fiberG":0,"sugarG":4,"sodiumMg":56,"source":"food_catalog"}',
 '["yogurt","greek yogurt","plain yogurt"]'),

('food_cheese_cheddar', 'cheese_cheddar', 'Cheddar Cheese', 'dairy', 30, 'g',
 '{"caloriesKcal":120,"proteinG":7,"carbsG":0.4,"fatG":10,"fiberG":0,"sugarG":0.1,"sodiumMg":190,"source":"food_catalog"}',
 '["cheese","cheddar","cheddar cheese"]'),

-- Fats & Oils
('food_olive_oil', 'olive_oil', 'Olive Oil', 'fat', 15, 'ml',
 '{"caloriesKcal":119,"proteinG":0,"carbsG":0,"fatG":14,"fiberG":0,"sugarG":0,"sodiumMg":0,"source":"food_catalog"}',
 '["olive oil","evoo"]'),

('food_butter', 'butter', 'Butter', 'fat', 14, 'g',
 '{"caloriesKcal":102,"proteinG":0.1,"carbsG":0,"fatG":12,"fiberG":0,"sugarG":0,"sodiumMg":91,"source":"food_catalog"}',
 '["butter"]'),

('food_avocado', 'avocado', 'Avocado', 'fat', 100, 'g',
 '{"caloriesKcal":160,"proteinG":2,"carbsG":9,"fatG":15,"fiberG":7,"sugarG":0.7,"sodiumMg":7,"source":"food_catalog"}',
 '["avocado"]'),

-- Beverages
('food_orange_juice', 'orange_juice', 'Orange Juice', 'beverage', 240, 'ml',
 '{"caloriesKcal":110,"proteinG":2,"carbsG":26,"fatG":0,"fiberG":0,"sugarG":21,"sodiumMg":0,"source":"food_catalog"}',
 '["orange juice","oj"]'),

('food_coffee_black', 'coffee_black', 'Black Coffee', 'beverage', 240, 'ml',
 '{"caloriesKcal":2,"proteinG":0.3,"carbsG":0,"fatG":0,"fiberG":0,"sugarG":0,"sodiumMg":5,"source":"food_catalog"}',
 '["coffee","black coffee","espresso"]'),

-- Snacks
('food_almonds', 'almonds', 'Almonds', 'snack', 28, 'g',
 '{"caloriesKcal":164,"proteinG":6,"carbsG":6,"fatG":14,"fiberG":3.5,"sugarG":1.2,"sodiumMg":0,"source":"food_catalog"}',
 '["almonds","almond"]'),

('food_peanut_butter', 'peanut_butter', 'Peanut Butter', 'snack', 32, 'g',
 '{"caloriesKcal":188,"proteinG":8,"carbsG":6,"fatG":16,"fiberG":2,"sugarG":3,"sodiumMg":136,"source":"food_catalog"}',
 '["peanut butter","pb"]');
