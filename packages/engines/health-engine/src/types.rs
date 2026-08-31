//! # Types
//!
//! Type definitions for health calculations.

use serde::{Deserialize, Serialize};

/// Sex for biological calculations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sex {
    Male,
    Female,
}

/// Activity level for TDEE calculation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActivityLevel {
    Sedentary,
    Light,
    Moderate,
    Active,
    VeryActive,
}

impl ActivityLevel {
    /// Get activity multiplier for TDEE calculation
    pub fn multiplier(&self) -> f64 {
        match self {
            ActivityLevel::Sedentary => 1.2,
            ActivityLevel::Light => 1.375,
            ActivityLevel::Moderate => 1.55,
            ActivityLevel::Active => 1.725,
            ActivityLevel::VeryActive => 1.9,
        }
    }
}

/// BMI category
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BmiCategory {
    Underweight,
    Normal,
    Overweight,
    Obese,
}

/// Health metrics input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetricsInput {
    pub weight_kg: f64,
    pub height_cm: f64,
    pub age: u32,
    pub sex: Sex,
    pub activity_level: ActivityLevel,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_fat_percent: Option<f64>,
}

/// Health metrics output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetricsOutput {
    pub bmi: f64,
    pub bmi_category: BmiCategory,
    pub bmr: i32,
    pub bmr_unit: String,
    pub tdee: i32,
    pub tdee_unit: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_fat_estimated: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vo2_max_estimated: Option<f64>,
    pub formula_version: String,
}

impl HealthMetricsOutput {
    pub fn error(message: &str) -> Self {
        Self {
            bmi: 0.0,
            bmi_category: BmiCategory::Underweight,
            bmr: 0,
            bmr_unit: "kcal/day".to_string(),
            tdee: 0,
            tdee_unit: "kcal/day".to_string(),
            body_fat_estimated: None,
            vo2_max_estimated: None,
            formula_version: format!("error: {}", message),
        }
    }
}

/// Training load category
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LoadCategory {
    Fresh,
    Optimal,
    Fatigued,
    HighRisk,
}

/// Training load output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingLoadOutput {
    pub ratio: f64,
    pub category: LoadCategory,
}
