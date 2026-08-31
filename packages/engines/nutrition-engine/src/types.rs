//! # Types
//!
//! Type definitions for nutrition calculations.

use serde::{Deserialize, Serialize};

/// Nutrition values for a food item
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct NutritionValues {
    pub calories_kcal: i32,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub fiber_g: f64,
    pub sugar_g: f64,
    pub sodium_mg: i32,
}

impl NutritionValues {
    /// Create new nutrition values
    pub fn new(
        calories_kcal: i32,
        protein_g: f64,
        carbs_g: f64,
        fat_g: f64,
        fiber_g: f64,
        sugar_g: f64,
        sodium_mg: i32,
    ) -> Self {
        Self {
            calories_kcal,
            protein_g,
            carbs_g,
            fat_g,
            fiber_g,
            sugar_g,
            sodium_mg,
        }
    }
}

/// Macro nutrient targets
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MacroTargets {
    pub protein_percent: f64,
    pub carbs_percent: f64,
    pub fat_percent: f64,
}

impl MacroTargets {
    /// Create standard macro targets (30/40/30)
    pub fn standard() -> Self {
        Self {
            protein_percent: 30.0,
            carbs_percent: 40.0,
            fat_percent: 30.0,
        }
    }

    /// Create low-carb macro targets
    pub fn low_carb() -> Self {
        Self {
            protein_percent: 35.0,
            carbs_percent: 25.0,
            fat_percent: 40.0,
        }
    }

    /// Create high-protein macro targets
    pub fn high_protein() -> Self {
        Self {
            protein_percent: 40.0,
            carbs_percent: 35.0,
            fat_percent: 25.0,
        }
    }

    /// Validate macro percentages sum to 100
    pub fn is_valid(&self) -> bool {
        let sum = self.protein_percent + self.carbs_percent + self.fat_percent;
        (sum - 100.0).abs() < 0.1
    }
}

/// Target nutrition values
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NutritionTargets {
    pub calories_kcal: i32,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub fiber_g: f64,
    pub sugar_g: f64,
    pub sodium_mg: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hydration_ml: Option<f64>,
}

impl Default for NutritionTargets {
    fn default() -> Self {
        Self {
            calories_kcal: 2000,
            protein_g: 50.0,
            carbs_g: 250.0,
            fat_g: 65.0,
            fiber_g: 25.0,
            sugar_g: 50.0,
            sodium_mg: 2300,
            hydration_ml: Some(2000.0),
        }
    }
}

/// Remaining nutrition values
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemainingNutrition {
    pub calories_kcal: i32,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub fiber_g: f64,
    pub sugar_g: f64,
    pub sodium_mg: i32,
}

/// Adherence percentages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdherencePercentages {
    pub calories_percent: i32,
    pub protein_percent: i32,
    pub carbs_percent: i32,
    pub fat_percent: i32,
}

/// Macro calorie values
pub const MACRO_CALORIES: MacroCalories = MacroCalories {
    protein: 4.0,
    carbs: 4.0,
    fat: 9.0,
};

#[derive(Debug, Clone, Copy)]
pub struct MacroCalories {
    pub protein: f64,
    pub carbs: f64,
    pub fat: f64,
}
