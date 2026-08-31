//! # Analytics Engine - AIVO
//!
//! Time-series analytics for chart-ready data.
//!
//! ## Algorithm Version
//!
//! This engine implements version 1.0.0 of the analytics algorithm.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use wasm_core::math::round_to;

mod series;
mod stats;
mod aggregations;
mod types;

pub use types::*;
pub use series::*;
pub use stats::*;
pub use aggregations::*;

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
    fn test_analytics_version() {
        assert_eq!(version(), "1.0.0");
    }

    #[test]
    fn test_sma() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let sma = calculate_sma(&values, 3);
        assert_eq!(sma.len(), 5);
        assert!((sma[2] - 2.0).abs() < 0.01);
    }

    #[test]
    fn test_ema() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let ema = calculate_ema(&values, 3);
        assert_eq!(ema.len(), 5);
        assert_eq!(ema[0], 1.0);
    }

    #[test]
    fn test_trend_slope() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let slope = calculate_trend_slope(&values).unwrap();
        assert!((slope - 1.0).abs() < 0.01);
    }
}
