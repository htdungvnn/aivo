//! # Health Metrics Calculations
//!
//! Pure computational functions for health metrics.

use crate::types::*;
use wasm_core::math::{clamp, round_to};
use wasm_core::EngineError;

/// Activity multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: &[f64; 5] = &[1.2, 1.375, 1.55, 1.725, 1.9];

/// Get BMI category from BMI value
pub fn get_bmi_category(bmi: f64) -> BmiCategory {
    if bmi < 18.5 {
        BmiCategory::Underweight
    } else if bmi < 25.0 {
        BmiCategory::Normal
    } else if bmi < 30.0 {
        BmiCategory::Overweight
    } else {
        BmiCategory::Obese
    }
}

/// Calculate BMR using Mifflin-St Jeor Equation
/// 
/// Male: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
/// Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
pub fn calculate_bmr(
    weight_kg: f64,
    height_cm: f64,
    age: u32,
    sex: Sex,
) -> Result<i32, EngineError> {
    // Validate inputs
    if weight_kg <= 0.0 || weight_kg > 500.0 {
        return Err(EngineError::out_of_range("weight_kg", 0.1, 500.0, "health-engine"));
    }
    if height_cm <= 0.0 || height_cm > 300.0 {
        return Err(EngineError::out_of_range("height_cm", 30.0, 300.0, "health-engine"));
    }
    if age == 0 || age > 150 {
        return Err(EngineError::out_of_range("age", 1.0, 150.0, "health-engine"));
    }

    let age_f = age as f64;
    let bmr = match sex {
        Sex::Male => 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age_f + 5.0,
        Sex::Female => 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age_f - 161.0,
    };

    Ok(bmr.round() as i32)
}

/// Calculate TDEE from BMR and activity level
pub fn calculate_tdee(bmr: i32, activity_level: &ActivityLevel) -> i32 {
    let bmr_f = bmr as f64;
    let tdee = bmr_f * activity_level.multiplier();
    tdee.round() as i32
}

/// Estimate body fat percentage using Boer formula
/// 
/// Male: BF% = (1.20 × BMI) + (0.23 × Age) - 16.2
/// Female: BF% = (1.20 × BMI) + (0.23 × Age) - 5.4
pub fn estimate_body_fat(bmi: f64, age: u32, sex: Sex) -> Result<f64, EngineError> {
    if bmi <= 0.0 {
        return Err(EngineError::invalid_input("BMI must be positive", "health-engine"));
    }
    
    let age_f = age as f64;
    let body_fat = match sex {
        Sex::Male => (1.20 * bmi) + (0.23 * age_f) - 16.2,
        Sex::Female => (1.20 * bmi) + (0.23 * age_f) - 5.4,
    };

    Ok(clamp(body_fat, 3.0, 60.0))
}

/// Estimate VO2 Max using body fat and age
/// 
/// Male: VO2max = 60 - (1.14 × BF%) - (0.56 × Age)
/// Female: VO2max = 48 - (0.73 × BF%) - (0.42 × Age)
pub fn estimate_vo2_max(body_fat_percent: f64, age: u32, sex: Sex) -> Result<f64, EngineError> {
    if body_fat_percent < 0.0 || body_fat_percent > 100.0 {
        return Err(EngineError::out_of_range("body_fat_percent", 0.0, 100.0, "health-engine"));
    }
    
    let age_f = age as f64;
    let vo2_max = match sex {
        Sex::Male => 60.0 - (1.14 * body_fat_percent) - (0.56 * age_f),
        Sex::Female => 48.0 - (0.73 * body_fat_percent) - (0.42 * age_f),
    };

    Ok(clamp(vo2_max, 10.0, 100.0))
}

/// Calculate lean body mass
pub fn calculate_lean_body_mass(weight_kg: f64, body_fat_percent: f64) -> f64 {
    weight_kg * (1.0 - body_fat_percent / 100.0)
}

/// Calculate fat mass
pub fn calculate_fat_mass(weight_kg: f64, body_fat_percent: f64) -> f64 {
    weight_kg * (body_fat_percent / 100.0)
}

/// Calculate ideal weight using Devine formula
pub fn calculate_ideal_weight(height_cm: f64, sex: Sex) -> f64 {
    let height_inches = height_cm / 2.54;
    match sex {
        Sex::Male => 50.0 + 2.3 * (height_inches - 60.0).max(0.0),
        Sex::Female => 45.5 + 2.3 * (height_inches - 60.0).max(0.0),
    }
}

/// Calculate daily water intake recommendation (in ml)
pub fn calculate_water_intake(weight_kg: f64, activity_level: &ActivityLevel) -> i32 {
    let base_intake = weight_kg * 35.0; // 35ml per kg
    let multiplier = match activity_level {
        ActivityLevel::Sedentary => 1.0,
        ActivityLevel::Light => 1.1,
        ActivityLevel::Moderate => 1.2,
        ActivityLevel::Active => 1.3,
        ActivityLevel::VeryActive => 1.5,
    };
    (base_intake * multiplier).round() as i32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bmi_category() {
        assert_eq!(get_bmi_category(17.0), BmiCategory::Underweight);
        assert_eq!(get_bmi_category(22.0), BmiCategory::Normal);
        assert_eq!(get_bmi_category(27.0), BmiCategory::Overweight);
        assert_eq!(get_bmi_category(35.0), BmiCategory::Obese);
    }

    #[test]
    fn test_bmr_male() {
        let bmr = calculate_bmr(70.0, 175.0, 30, Sex::Male).unwrap();
        assert!(bmr > 1500.0 && bmr < 1800.0);
    }

    #[test]
    fn test_bmr_female() {
        let bmr = calculate_bmr(60.0, 165.0, 25, Sex::Female).unwrap();
        assert!(bmr > 1200.0 && bmr < 1500.0);
    }

    #[test]
    fn test_body_fat_estimation() {
        let bf = estimate_body_fat(22.0, 30, Sex::Male).unwrap();
        assert!(bf > 10.0 && bf < 30.0);
    }
}
