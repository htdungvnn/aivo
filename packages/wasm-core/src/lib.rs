//! # WASM Core - AIVO
//!
//! Core utilities for AIVO WASM engines.
//! This crate provides shared numeric, validation, and serialization utilities
//! used across all domain engines.
//!
//! ## Design Principles
//!
//! - **No business logic**: Only pure computational utilities
//! - **No I/O**: No filesystem, network, or database access
//! - **No global state**: All operations are stateless and deterministic
//! - **Explicit error handling**: No panic/unwrap in public production paths
//! - **f64 for precision**: Use f64 for health/nutrition calculations

mod error;
mod math;
mod validation;

pub mod stats;
pub mod geometry;

pub use error::{EngineError, Result};
pub use math::{clamp, round_to, safe_divide};
pub use validation::{validate_range, ValidationContext};

// Re-export commonly used types
pub use serde::{Deserialize, Serialize};
pub use wasm_bindgen::prelude::*;

// =============================================================================
// WASM Bindgen Setup
// =============================================================================

/// Initialize panic hook for better error messages in WASM
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get core version
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get build info
#[wasm_bindgen]
pub fn build_info() -> String {
    serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "name": env!("CARGO_PKG_NAME"),
        "features": {
            "f64_precision": true,
            "safe_math": true
        }
    })
    .to_string()
}

// =============================================================================
// Panic Hook (Debug only)
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
