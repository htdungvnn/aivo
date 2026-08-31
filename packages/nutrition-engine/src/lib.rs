//! # Nutrition Engine - AIVO
//!
//! Deterministic nutrition calculations for meals and meal plans.
//!
//! ## Algorithm Version
//!
//! This engine implements version 1.0.0 of the nutrition algorithm.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use wasm_core::math::{clamp, round_to};

mod calculations;
mod types;

pub use types::*;
pub use calculations::*;

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
    fn test_nutrition_version() {
        assert_eq!(version(), "1.0.0");
    }

    #[test]
    fn test_aggregate_nutrition() {
        let items = vec![
            NutritionValues {
                calories_kcal: 200,
                protein_g: 20.0,
                carbs_g: 10.0,
                fat_g: 8.0,
                fiber_g: 2.0,
                sugar_g: 5.0,
                sodium_mg: 400.0,
            },
            NutritionValues {
                calories_kcal: 300,
                protein_g: 15.0,
                carbs_g: 30.0,
                fat_g: 12.0,
                fiber_g: 3.0,
                sugar_g: 10.0,
                sodium_mg: 600.0,
            },
        ];
        
        let aggregated = aggregate_nutrition(&items);
        assert_eq!(aggregated.calories_kcal, 500);
        assert!((aggregated.protein_g - 35.0).abs() < 0.1);
    }
}
