//! # Nutrition Calculations
//!
//! Pure computational functions for nutrition calculations.

use crate::types::*;
use wasm_core::math::round_to;
use wasm_core::EngineError;

/// Calculate nutrition from per-100g values
pub fn calculate_from_per100g(
    nutrition_per100g: &NutritionValues,
    quantity: f64,
    unit: &str,
) -> NutritionValues {
    let factor = get_conversion_factor(unit);
    let scaled_quantity = quantity * factor;
    let scale_factor = scaled_quantity / 100.0;

    NutritionValues {
        calories_kcal: scale_i32(nutrition_per100g.calories_kcal, scale_factor),
        protein_g: round(scale_f64(nutrition_per100g.protein_g, scale_factor), 1),
        carbs_g: round(scale_f64(nutrition_per100g.carbs_g, scale_factor), 1),
        fat_g: round(scale_f64(nutrition_per100g.fat_g, scale_factor), 1),
        fiber_g: round(scale_f64(nutrition_per100g.fiber_g, scale_factor), 1),
        sugar_g: round(scale_f64(nutrition_per100g.sugar_g, scale_factor), 1),
        sodium_mg: scale_i32(nutrition_per100g.sodium_mg, scale_factor),
    }
}

/// Get conversion factor for unit to grams
fn get_conversion_factor(unit: &str) -> f64 {
    let unit_lower = unit.to_lowercase().trim();

    match unit_lower {
        "g" | "gram" | "grams" => 1.0,
        "ml" | "milliliter" | "milliliters" => 1.0,
        "kg" | "kilogram" | "kilograms" => 1000.0,
        "l" | "liter" | "liters" => 1000.0,
        "cup" | "cups" => 240.0,
        "tbsp" | "tablespoon" | "tablespoons" => 15.0,
        "tsp" | "teaspoon" | "teaspoons" => 5.0,
        "oz" | "ounce" | "ounces" => 28.35,
        "piece" | "pieces" => 50.0,
        "slice" | "slices" => 30.0,
        "medium" => 100.0,
        "large" => 150.0,
        "small" => 75.0,
        _ => 1.0,
    }
}

fn scale_i32(value: i32, factor: f64) -> i32 {
    (value as f64 * factor).round() as i32
}

fn scale_f64(value: f64, factor: f64) -> f64 {
    value * factor
}

fn round(value: f64, decimals: i32) -> f64 {
    round_to(value, decimals as u8)
}

/// Aggregate nutrition values from multiple items
pub fn aggregate_nutrition(items: &[NutritionValues]) -> NutritionValues {
    let mut totals = NutritionValues::default();

    for item in items {
        totals.calories_kcal += item.calories_kcal;
        totals.protein_g += item.protein_g;
        totals.carbs_g += item.carbs_g;
        totals.fat_g += item.fat_g;
        totals.fiber_g += item.fiber_g;
        totals.sugar_g += item.sugar_g;
        totals.sodium_mg += item.sodium_mg;
    }

    NutritionValues {
        calories_kcal: totals.calories_kcal,
        protein_g: round(totals.protein_g, 1),
        carbs_g: round(totals.carbs_g, 1),
        fat_g: round(totals.fat_g, 1),
        fiber_g: round(totals.fiber_g, 1),
        sugar_g: round(totals.sugar_g, 1),
        sodium_mg: totals.sodium_mg,
    }
}

/// Calculate macro percentages
pub fn calculate_macro_percentages(nutrition: &NutritionValues) -> MacroTargets {
    let total_macro_grams = nutrition.protein_g + nutrition.carbs_g + nutrition.fat_g;

    if total_macro_grams == 0.0 {
        return MacroTargets::default();
    }

    MacroTargets {
        protein_percent: round((nutrition.protein_g / total_macro_grams) * 100.0, 0),
        carbs_percent: round((nutrition.carbs_g / total_macro_grams) * 100.0, 0),
        fat_percent: round((nutrition.fat_g / total_macro_grams) * 100.0, 0),
    }
}

/// Calculate remaining nutrition to reach targets
pub fn calculate_remaining_nutrition(
    consumed: &NutritionValues,
    targets: &NutritionTargets,
) -> RemainingNutrition {
    RemainingNutrition {
        calories_kcal: i32::max(0, targets.calories_kcal - consumed.calories_kcal),
        protein_g: max_f64(0.0, targets.protein_g - consumed.protein_g),
        carbs_g: max_f64(0.0, targets.carbs_g - consumed.carbs_g),
        fat_g: max_f64(0.0, targets.fat_g - consumed.fat_g),
        fiber_g: max_f64(0.0, targets.fiber_g - consumed.fiber_g),
        sugar_g: max_f64(0.0, targets.sugar_g - consumed.sugar_g),
        sodium_mg: i32::max(0, targets.sodium_mg - consumed.sodium_mg),
    }
}

fn max_f64(a: f64, b: f64) -> f64 {
    if a > b { a } else { b }
}

/// Calculate adherence percentages
pub fn calculate_adherence(
    consumed: &NutritionValues,
    targets: &NutritionTargets,
) -> AdherencePercentages {
    AdherencePercentages {
        calories_percent: calculate_percent_i32(consumed.calories_kcal, targets.calories_kcal),
        protein_percent: calculate_percent_f64(consumed.protein_g, targets.protein_g),
        carbs_percent: calculate_percent_f64(consumed.carbs_g, targets.carbs_g),
        fat_percent: calculate_percent_f64(consumed.fat_g, targets.fat_g),
    }
}

fn calculate_percent_i32(consumed: i32, target: i32) -> i32 {
    if target == 0 {
        0
    } else {
        ((consumed as f64 / target as f64) * 100.0).round() as i32
    }
}

fn calculate_percent_f64(consumed: f64, target: f64) -> i32 {
    if target == 0.0 {
        0
    } else {
        ((consumed / target) * 100.0).round() as i32
    }
}

/// Calculate TDEE from metrics
pub fn calculate_tdee_from_metrics(
    bmr: i32,
    activity_level: &str,
) -> Result<i32, EngineError> {
    let multiplier = match activity_level.to_lowercase().as_str() {
        "sedentary" => 1.2,
        "light" | "light_active" => 1.375,
        "moderate" | "moderately_active" => 1.55,
        "active" | "very_active" => 1.725,
        "extremely_active" => 1.9,
        _ => return Err(EngineError::invalid_input(
            format!("Unknown activity level: {}", activity_level),
            "nutrition-engine",
        )),
    };

    Ok((bmr as f64 * multiplier).round() as i32)
}

/// Calculate macro targets from calories
pub fn calculate_macro_targets_from_calories(
    target_calories: i32,
    macro_targets: &MacroTargets,
) -> MacroTargetsResult {
    MacroTargetsResult {
        protein_g: ((target_calories as f64 * (macro_targets.protein_percent / 100.0)) / MACRO_CALORIES.protein).round(),
        carbs_g: ((target_calories as f64 * (macro_targets.carbs_percent / 100.0)) / MACRO_CALORIES.carbs).round(),
        fat_g: ((target_calories as f64 * (macro_targets.fat_percent / 100.0)) / MACRO_CALORIES.fat).round(),
    }
}

/// Macro targets result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroTargetsResult {
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
}

/// Calculate protein requirement based on activity level
pub fn calculate_protein_requirement(
    weight_kg: f64,
    activity_level: &str,
) -> Result<f64, EngineError> {
    // Grams per kg of body weight
    let protein_per_kg = match activity_level.to_lowercase().as_str() {
        "sedentary" => 0.8,
        "light" | "light_active" => 1.0,
        "moderate" | "moderately_active" => 1.2,
        "active" | "very_active" => 1.4,
        "extremely_active" => 1.6,
        _ => return Err(EngineError::invalid_input(
            format!("Unknown activity level: {}", activity_level),
            "nutrition-engine",
        )),
    };

    Ok(round_to(weight_kg * protein_per_kg, 1))
}

/// Calculate calorie deficit/surplus for weight goals
pub fn calculate_calorie_adjustment(
    current_weight_kg: f64,
    target_weight_kg: f64,
    weeks: u32,
) -> f64 {
    // 3500 calories = 1 pound (0.45 kg) of fat
    let weight_diff = target_weight_kg - current_weight_kg;
    let calories_needed = weight_diff * 3500.0 / 0.45;
    let daily_adjustment = calories_needed / (weeks as f64 * 7.0);
    
    round_to(daily_adjustment, 0)
}

/// Check if sodium intake is within recommended limits
pub fn check_sodium_status(sodium_mg: i32) -> SodiumStatus {
    if sodium_mg < 1500 {
        SodiumStatus::Low
    } else if sodium_mg <= 2300 {
        SodiumStatus::Normal
    } else if sodium_mg <= 3400 {
        SodiumStatus::High
    } else {
        SodiumStatus::VeryHigh
    }
}

/// Sodium intake status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SodiumStatus {
    Low,
    Normal,
    High,
    VeryHigh,
}

use serde::{Deserialize, Serialize};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_from_per100g() {
        let per100g = NutritionValues {
            calories_kcal: 250,
            protein_g: 8.0,
            carbs_g: 30.0,
            fat_g: 12.0,
            fiber_g: 3.0,
            sugar_g: 5.0,
            sodium_mg: 400,
        };
        
        let result = calculate_from_per100g(&per100g, 150.0, "g");
        assert_eq!(result.calories_kcal, 375);
        assert!((result.carbs_g - 45.0).abs() < 0.1);
    }

    #[test]
    fn test_macro_percentages() {
        let nutrition = NutritionValues {
            calories_kcal: 500,
            protein_g: 25.0,
            carbs_g: 50.0,
            fat_g: 25.0,
            fiber_g: 5.0,
            sugar_g: 10.0,
            sodium_mg: 500,
        };
        
        let macros = calculate_macro_percentages(&nutrition);
        assert!((macros.protein_percent - 25.0).abs() < 1.0);
        assert!((macros.carbs_percent - 50.0).abs() < 1.0);
        assert!((macros.fat_percent - 25.0).abs() < 1.0);
    }

    #[test]
    fn test_sodium_status() {
        assert_eq!(check_sodium_status(1000), SodiumStatus::Low);
        assert_eq!(check_sodium_status(2000), SodiumStatus::Normal);
        assert_eq!(check_sodium_status(3000), SodiumStatus::High);
        assert_eq!(check_sodium_status(4000), SodiumStatus::VeryHigh);
    }
}
