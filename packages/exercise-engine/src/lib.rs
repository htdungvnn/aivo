mod engine;
mod geometry;
mod exercises;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Re-export types
pub use engine::{Engine, EngineConfig, EngineState, EngineOutput};
pub use geometry::{Angle, Point2D, Point3D, calculate_angle_3d, calculate_angle_2d};
pub use exercises::{ExercisePhase, ExerciseCode, CorrectionResult};

/// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Get engine version
#[wasm_bindgen]
pub fn version() -> String {
    "1.0.0".to_string()
}

/// Initialize the engine with configuration
#[wasm_bindgen]
pub fn init_engine(config_json: &str) -> bool {
    match serde_json::from_str::<EngineConfig>(config_json) {
        Ok(config) => {
            let _ = Engine::new(config);
            true
        }
        Err(e) => {
            web_sys::console::error_1(&format!("Failed to parse config: {}", e).into());
            false
        }
    }
}

/// Process pose landmarks and return exercise analysis
#[wasm_bindgen]
pub fn process(input_json: &str) -> String {
    let input: engine::EngineInput = match serde_json::from_str(input_json) {
        Ok(i) => i,
        Err(e) => {
            return serde_json::to_string(&engine::EngineOutput::error(&format!("Invalid input: {}", e))).unwrap();
        }
    };

    let mut engine = engine::Engine::get_instance();
    let output = engine.process(input);
    
    serde_json::to_string(&output).unwrap_or_else(|e| {
        serde_json::to_string(&engine::EngineOutput::error(&format!("Serialization error: {}", e))).unwrap()
    })
}

/// Get current engine state
#[wasm_bindgen]
pub fn get_state() -> String {
    let engine = engine::Engine::get_instance();
    serde_json::to_string(&engine.get_state()).unwrap_or_else(|_| "{}".to_string())
}

/// Reset engine for a specific exercise
#[wasm_bindgen]
pub fn reset(exercise_code: &str) {
    let mut engine = engine::Engine::get_instance();
    engine.reset(exercise_code);
}

/// Start calibration mode
#[wasm_bindgen]
pub fn start_calibration() {
    let mut engine = engine::Engine::get_instance();
    engine.start_calibration();
}

/// Check if calibration is complete
#[wasm_bindgen]
pub fn is_calibrated() -> bool {
    let engine = engine::Engine::get_instance();
    engine.is_calibrated()
}

/// Run benchmark
#[wasm_bindgen]
pub fn benchmark(iterations: u32) -> String {
    let results = engine::benchmark::run_benchmark(iterations);
    serde_json::to_string(&results).unwrap_or_else(|_| "{}".to_string())
}

// Needed for better error messages in WASM
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
