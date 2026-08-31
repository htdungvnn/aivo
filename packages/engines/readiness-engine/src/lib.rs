//! # Readiness Engine - AIVO
//!
//! Deterministic readiness score calculation.
//! 
//! ## Algorithm Version
//!
//! This engine implements version 1.0.0 of the readiness scoring algorithm.
//! The formula version is included in all outputs for reproducibility.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use wasm_core::math::{clamp, round_to};
use wasm_core::validation::{validate_confidence, validate_percentage};

mod types;
mod scoring;
mod normalization;

pub use types::*;
pub use scoring::*;
pub use normalization::*;

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
    "1.0.0".to_string()
}

// =============================================================================
// Main Calculation
// =============================================================================

/// Calculate readiness score from input data
/// 
/// This is the main entry point for the calculation engine.
/// All inputs must have explicit units and valid ranges.
#[wasm_bindgen]
pub fn calculate_readiness(input_json: &str) -> String {
    let input: ReadinessInput = match serde_json::from_str(input_json) {
        Ok(i) => i,
        Err(e) => {
            return serde_json::to_string(&ReadinessOutput::error(&format!("Invalid input: {}", e))).unwrap();
        }
    };

    match calculate_readiness_internal(&input) {
        Ok(output) => serde_json::to_string(&output).unwrap(),
        Err(e) => serde_json::to_string(&ReadinessOutput::error(&e.to_string())).unwrap(),
    }
}

/// Internal calculation function
fn calculate_readiness_internal(input: &ReadinessInput) -> Result<ReadinessOutput, wasm_core::EngineError> {
    // Process all factors
    let mut factors = scoring::process_factors(input);
    
    // Redistribute weights for missing data
    factors = scoring::redistribute_weights(factors);
    
    // Recalculate contributions with redistributed weights
    factors = factors.iter().map(|f| {
        let contribution = f.normalized_score.map(|score| {
            scoring::calculate_factor_contribution(score, f.weight)
        }).unwrap_or(0.0);
        ReadinessFactorOutput {
            code: f.code.clone(),
            score: f.normalized_score.unwrap_or(scoring::NEUTRAL_SCORE),
            weight: f.weight,
            contribution,
            status: scoring::get_factor_status(f.normalized_score),
            message_key: format!("readiness.factor.{}.{}", f.code, scoring::get_factor_status(f.normalized_score)),
        }
    }).collect();
    
    // Calculate overall score
    let score = scoring::calculate_readiness_score(&factors);
    
    // Determine level
    let level = scoring::get_readiness_level(score);
    
    // Calculate confidence
    let confidence = scoring::calculate_confidence(input.data_completeness, input.data_freshness);
    
    // Determine recommendation
    let recommendation = scoring::determine_recommendation(score, &level, input.data_completeness);
    
    Ok(ReadinessOutput {
        date: input.date.clone(),
        score,
        level,
        confidence,
        data_completeness: input.data_completeness,
        factors,
        recommendation,
        algorithm_version: "1.0.0".to_string(),
        formula_version: "2026.1".to_string(),
        calculated_at: js_sys::Date::now() as i64,
        input_snapshot: None,
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
    fn test_version_format() {
        let v = version();
        assert!(v.contains('.'));
    }

    #[test]
    fn test_full_calculation() {
        let input = ReadinessInput {
            date: "2026-01-15".to_string(),
            sleep_duration: Some(MeasuredValue::new(8.0, "hours", 0.9)),
            sleep_quality: Some(MeasuredValue::new(85.0, "%", 0.85)),
            data_completeness: 0.8,
            data_freshness: 6.0,
            ..Default::default()
        };

        let json = serde_json::to_string(&input).unwrap();
        let result = calculate_readiness(&json);
        let output: ReadinessOutput = serde_json::from_str(&result).unwrap();

        assert!(output.score >= 0.0);
        assert!(output.score <= 100.0);
        assert!(!output.level.is_empty());
    }
}
