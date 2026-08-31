//! # Health Engine - AIVO
//!
//! Health metrics calculation engine.
//! Provides BMI, BMR, TDEE, VO2max, and training load calculations.
//!
//! ## Algorithm Version
//!
//! This engine implements version 1.0.0 of the health metrics algorithm.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use wasm_core::math::{clamp, round_to};

mod metrics;
mod training;
mod types;

pub use types::*;
pub use metrics::*;
pub use training::*;

// =============================================================================
// WASM Bindgen Setup
// =============================================================================

/// Initialize panic hook
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get engine version
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get algorithm version
#[wasm_bindgen]
pub fn algorithm_version() -> String {
    "2026.1".to_string()
}

// =============================================================================
// Main Calculation
// =============================================================================

/// Calculate health metrics from input data
#[wasm_bindgen]
pub fn calculate_health_metrics(input_json: &str) -> String {
    let input: HealthMetricsInput = match serde_json::from_str(input_json) {
        Ok(i) => i,
        Err(e) => {
            return serde_json::to_string(&HealthMetricsOutput::error(&format!("Invalid input: {}", e))).unwrap();
        }
    };

    match calculate_health_metrics_internal(&input) {
        Ok(output) => serde_json::to_string(&output).unwrap(),
        Err(e) => serde_json::to_string(&HealthMetricsOutput::error(&e.to_string())).unwrap(),
    }
}

/// Internal calculation function
fn calculate_health_metrics_internal(input: &HealthMetricsInput) -> Result<HealthMetricsOutput, wasm_core::EngineError> {
    // BMI Calculation
    let height_m = input.height_cm / 100.0;
    let bmi = input.weight_kg / (height_m * height_m);
    let bmi_category = get_bmi_category(bmi);

    // BMR using Mifflin-St Jeor Equation
    let bmr = calculate_bmr(
        input.weight_kg,
        input.height_cm,
        input.age,
        input.sex,
    )?;

    // TDEE using activity multiplier
    let tdee = calculate_tdee(bmr, &input.activity_level);

    // Body fat estimation
    let body_fat_estimated = if let Some(bf) = input.body_fat_percent {
        Some(bf)
    } else {
        Some(estimate_body_fat(bmi, input.age, input.sex)?)
    };

    // VO2 Max estimation
    let vo2_max_estimated = if let Some(bf) = body_fat_estimated {
        Some(estimate_vo2_max(bf, input.age, input.sex)?)
    } else {
        None
    };

    Ok(HealthMetricsOutput {
        bmi: round_to(bmi, 1),
        bmi_category,
        bmr,
        bmr_unit: "kcal/day".to_string(),
        tdee,
        tdee_unit: "kcal/day".to_string(),
        body_fat_estimated: body_fat_estimated.map(|bf| round_to(bf, 1)),
        vo2_max_estimated: vo2_max_estimated.map(|v| round_to(v, 1)),
        formula_version: "2026.1".to_string(),
    })
}

// =============================================================================
// Panic Hook
// =============================================================================

#[cfg(feature = "console_error_panic_hook")]
mod console_error_panic_hook {
    use std::sync::Once;
    static SET_HOOK: Once = Once::new();

    pub fn set_once() {
        SET_HOOK.call_once(|| {
            std::panic::set_hook(Box::new(|info| {
                let msg = info.to_string();
                web_sys::console::error_1(&msg.into());
            }));
        });
    }
}

#[cfg(not(feature = "console_error_panic_hook"))]
mod console_error_panic_hook {
    pub fn set_once() {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bmi_calculation() {
        let input = HealthMetricsInput {
            weight_kg: 70.0,
            height_cm: 175.0,
            age: 30,
            sex: Sex::Male,
            activity_level: ActivityLevel::Moderate,
            body_fat_percent: None,
        };
        
        let output = calculate_health_metrics_internal(&input).unwrap();
        assert!((output.bmi - 22.9).abs() < 0.1);
        assert_eq!(output.bmi_category, BmiCategory::Normal);
    }

    #[test]
    fn test_bmr_calculation() {
        let bmr = calculate_bmr(70.0, 175.0, 30, Sex::Male).unwrap();
        assert!(bmr > 1500.0 && bmr < 1800.0);
    }

    #[test]
    fn test_tdee_calculation() {
        let bmr = 1600.0;
        let tdee = calculate_tdee(bmr, &ActivityLevel::Moderate);
        assert!(tdee > bmr);
    }
}
