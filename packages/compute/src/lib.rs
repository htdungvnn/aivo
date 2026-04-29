//! # AIVO Compute Engine
//! Unified WebAssembly module for all AIVO compute operations.
//!
//! This crate consolidates fitness calculations, infographic generation,
//! and content optimization into a single WASM module with feature flags.
//!
//! ## Features
//!
//! - `fitness`: High-performance fitness calculations (default enabled)
//! - `infographic`: SVG/PNG infographic generation
//! - `optimizer`: Content optimization for token reduction
//!
//! ## Usage
//!
//! ### Full Build (All Features)
//! ```rust
//! use aivo_compute::{fitness::{FitnessCalculator, TokenOptimizer}, infographic::InfographicConfig, optimizer::OptimizerConfig};
//! ```
//!
//! ### Feature-Specific Builds
//! ```toml
//! [dependencies]
//! aivo_compute = { version = "0.1", features = ["fitness"] }
//! ```
//!
//! ## WASM Integration
//! ```typescript
//! import init, { FitnessCalculator, render_svg, optimize_content } from '@aivo/compute';
//! await init();
//! ```

#![cfg_attr(target_arch = "wasm32", allow(dead_code))]

// Feature-gated module declarations
#[cfg(feature = "fitness")]
pub mod fitness;
#[cfg(feature = "infographic")]
pub mod infographic;
#[cfg(feature = "optimizer")]
pub mod optimizer;

// Re-export all public types for convenient access
#[cfg(feature = "fitness")]
pub use fitness::*;
#[cfg(feature = "infographic")]
pub use infographic::*;
#[cfg(feature = "optimizer")]
pub use optimizer::*;

use wasm_bindgen::prelude::*;

/// WASM module entry point - required for proper initialization
#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    Ok(())
}
