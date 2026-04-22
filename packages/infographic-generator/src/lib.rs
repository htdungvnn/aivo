//! # AIVO Infographic Generator
//!
//! WebAssembly module for generating shareable fitness infographic images.
//! Transforms AI-generated narratives and user stats into high-quality SVG/PNG.
//!
//! ## Features
//!
//! - **Template-based rendering**: 5 built-in templates (weekly_summary, milestone, streak, etc.)
//! - **SVG output**: Scalable vector graphics for crisp rendering at any size
//! - **PNG export**: Raster output using resvg + tiny-skia
//! - **Theme support**: Dark, light, neon, ocean, sunset, vibrant color schemes
//! - **AI-friendly**: Accepts structured JSON data from OpenAI
//!
//! ## WASM Integration
//!
//! ```typescript
//! import init, { render_svg, render_png } from '@aivo/infographic-generator';
//!
//! await init();
//! const svg = render_svg(template_json, data_json);
//! const png = render_png(svg, 2.0); // 2x scale
//! ```
//!
//! ## Template System
//!
//! Templates define SVG structure with placeholders that get replaced with user data.
//! Built-in templates:
//! - `weekly_summary`: Multi-section weekly achievements
//! - `milestone`: Achievement celebration
//! - `streak`: Consistency streak display
//! - `muscle_heatmap`: Body heatmap visualization
//! - `comparison`: Before/after or personal best comparison

#![cfg_attr(target_arch = "wasm32", allow(dead_code))]

mod types;
mod templates;
mod renderer;
mod colors;
mod png;

pub use types::*;
pub use renderer::*;
pub use png::*;
pub use colors::*;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

/// Main WASM entry: Render infographic as SVG string
///
/// # Arguments
/// * `template_json` - JSON string defining the SVG template structure
/// * `data_json` - JSON string with story, stats, and config
///
/// # Returns
/// JSON string containing `{ success: bool, svg?: string, error?: string }`
#[wasm_bindgen]
pub fn render_svg(template_json: &str, data_json: &str) -> Result<String, JsError> {
    let template: SvgTemplate = serde_json::from_str(template_json)
        .map_err(|e| JsError::new(&format!("Invalid template JSON: {}", e)))?;
    let data: InfographicData = serde_json::from_str(data_json)
        .map_err(|e| JsError::new(&format!("Invalid data JSON: {}", e)))?;

    let svg_result = renderer::render_svg(template, &data);
    match svg_result {
        Ok(svg) => {
            let response = SvgResponse {
                success: true,
                svg: Some(svg),
                error: None,
            };
            Ok(serde_json::to_string(&response).unwrap_or_default())
        }
        Err(e) => {
            let response = SvgResponse {
                success: false,
                svg: None,
                error: Some(e.to_string()),
            };
            Ok(serde_json::to_string(&response).unwrap_or_default())
        }
    }
}

/// Render PNG from SVG string
///
/// # Arguments
/// * `svg_string` - Raw SVG content
/// * `scale` - Resolution multiplier (1.0 = 1:1, 2.0 = retina)
///
/// # Returns
/// Base64-encoded PNG data string
#[wasm_bindgen]
pub fn render_png(svg_string: &str, scale: f64) -> Result<String, JsError> {
    png::render_png(svg_string, scale).map_err(|e| JsError::new(&e.to_string()))
}

/// Get list of available template IDs
#[wasm_bindgen]
pub fn get_available_templates() -> JsValue {
    let templates = vec![
        "weekly_summary",
        "milestone",
        "streak",
        "muscle_heatmap",
        "comparison"
    ];
    serde_wasm_bindgen::to_value(&templates).unwrap_or_default()
}

/// Generate color palette for a given theme
#[wasm_bindgen]
pub fn generate_color_palette(theme: &str, level: i32) -> JsValue {
    let palette = colors::generate_palette(theme, level);
    serde_wasm_bindgen::to_value(&palette).unwrap_or_default()
}

/// Helper: Build a complete template with default values
#[wasm_bindgen]
pub fn build_template(
    template_id: &str,
    width: u32,
    height: u32,
    theme: &str
) -> Result<String, JsError> {
    let template = templates::get_template_by_id(template_id, width, height, theme)
        .ok_or_else(|| JsError::new(&format!("Unknown template: {}", template_id)))?;
    Ok(serde_json::to_string(&template).map_err(|e| JsError::new(&e.to_string()))?)
}

/// Helper: Create default infographic config
#[wasm_bindgen]
pub fn default_config() -> Result<String, JsError> {
    let config = InfographicConfig {
        template: InfographicTemplate::WeeklySummary,
        theme: "vibrant".to_string(),
        layout: "square".to_string(),
        color_scheme: crate::colors::default_palette(),
        typography: TypographyConfig {
            headline_font: "Arial, sans-serif".to_string(),
            body_font: "Arial, sans-serif".to_string(),
            headline_size: 64.0,
            subhead_size: 36.0,
            body_size: 24.0,
        },
        include_stats: Vec::new(),
        include_comparison: true,
        width: 800,
        height: 800,
    };
    Ok(serde_json::to_string(&config).map_err(|e| JsError::new(&e.to_string()))?)
}

/// Helper: Validate infographic data
#[wasm_bindgen]
pub fn validate_data(data_json: &str) -> Result<JsValue, JsError> {
    let data: InfographicData = serde_json::from_str(data_json)
        .map_err(|e| JsError::new(&format!("Invalid data: {}", e)))?;

    let errors = validate_infographic_data(&data);
    let validation = ValidationResult {
        valid: errors.is_empty(),
        errors,
    };
    Ok(serde_wasm_bindgen::to_value(&validation).unwrap_or_default())
}

/// SVG Response wrapper
#[derive(Serialize, Deserialize)]
struct SvgResponse {
    #[serde(rename = "success")]
    success: bool,
    #[serde(rename = "svg")]
    svg: Option<String>,
    #[serde(rename = "error")]
    error: Option<String>,
}

/// Validation result
#[derive(Serialize, Deserialize)]
struct ValidationResult {
    valid: bool,
    errors: Vec<String>,
}

fn validate_infographic_data(data: &InfographicData) -> Vec<String> {
    let mut errors = Vec::new();

    if data.story.headline.is_empty() {
        errors.push("Headline cannot be empty".to_string());
    }
    if data.story.headline.len() > 100 {
        errors.push("Headline too long (max 100 chars)".to_string());
    }
    if data.story.narrative.is_empty() {
        errors.push("Narrative cannot be empty".to_string());
    }
    if data.stats.workouts.count < 0 {
        errors.push("Workout count cannot be negative".to_string());
    }
    if data.config.width < 100 || data.config.height < 100 {
        errors.push("Image dimensions too small (min 100x100)".to_string());
    }

    errors
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_available_templates() {
        let templates = get_available_templates();
        let vec: Vec<String> = serde_wasm_bindgen::from_value(templates).unwrap();
        assert_eq!(vec.len(), 5);
        assert!(vec.contains(&"weekly_summary".to_string()));
    }

    #[test]
    fn test_default_config() {
        let config_json = default_config().unwrap();
        let config: InfographicConfig = serde_json::from_str(&config_json).unwrap();
        assert_eq!(config.template, InfographicTemplate::WeeklySummary);
        assert_eq!(config.layout, "square");
    }

    #[test]
    fn test_validate_data_valid() {
        let data = InfographicData {
            id: "test".to_string(),
            user_id: "user123".to_string(),
            template: InfographicTemplate::WeeklySummary,
            config: serde_json::from_str(&default_config().unwrap()).unwrap(),
            story: InfographicStory {
                headline: "Test".to_string(),
                subheadline: None,
                narrative: "Test narrative".to_string(),
                stats: Vec::new(),
                call_to_action: "Join now!".to_string(),
                fun_facts: Vec::new(),
                tone: "motivational".to_string(),
                reading_level: "easy".to_string(),
            },
            stats: UserStats {
                period: types::Period {
                    start_date: "2025-01-01".to_string(),
                    end_date: "2025-01-07".to_string(),
                    period_type: "weekly".to_string(),
                },
                workouts: types::WorkoutStats {
                    count: 5,
                    total_minutes: 300,
                    total_calories: 1500.0,
                    avg_duration: 60.0,
                    types: std::collections::HashMap::new(),
                    personal_records: Vec::new(),
                },
                strength: types::StrengthStats {
                    total_volume: 10000.0,
                    top_exercises: Vec::new(),
                    estimated_one_rms: std::collections::HashMap::new(),
                },
                gamification: types::GamificationStats {
                    streak: 7,
                    longest_streak: 30,
                    points: 1000,
                    level: 5,
                    badges: 3,
                    leaderboard_rank: None,
                    percentile: None,
                },
                body: types::BodyStats {
                    weight_change: Some(-2.5),
                    body_fat_change: Some(-1.5),
                    muscle_gain: Some(1.0),
                    bmi: Some(22.5),
                    health_score: Some(75.0),
                    muscle_development: None,
                },
                comparisons: types::Comparisons {
                    vs_average: std::collections::HashMap::new(),
                    personal_bests: Vec::new(),
                },
            },
            created_at: chrono::Utc::now(),
            width: 1080,
            height: 1080,
            shareable_image_url: None,
            svg_content: None,
        };

        let result = validate_data(&serde_json::to_string(&data).unwrap()).unwrap();
        let validation: ValidationResult = serde_wasm_bindgen::from_value(result).unwrap();
        assert!(validation.valid);
    }

    #[test]
    fn test_validate_data_missing_headline() {
        let mut data = create_test_data();
        data.story.headline = "".to_string();

        let result = validate_data(&serde_json::to_string(&data).unwrap()).unwrap();
        let validation: ValidationResult = serde_wasm_bindgen::from_value(result).unwrap();
        assert!(!validation.valid);
        assert!(!validation.errors.is_empty());
    }

    fn create_test_data() -> InfographicData {
        InfographicData {
            id: "test".to_string(),
            user_id: "user123".to_string(),
            template: InfographicTemplate::WeeklySummary,
            config: serde_json::from_str(&default_config().unwrap()).unwrap(),
            story: InfographicStory {
                headline: "Test".to_string(),
                subheadline: None,
                narrative: "Test narrative".to_string(),
                stats: Vec::new(),
                call_to_action: "Join now!".to_string(),
                fun_facts: Vec::new(),
                tone: "motivational".to_string(),
                reading_level: "easy".to_string(),
            },
            stats: UserStats {
                period: types::Period {
                    start_date: "2025-01-01".to_string(),
                    end_date: "2025-01-07".to_string(),
                    period_type: "weekly".to_string(),
                },
                workouts: types::WorkoutStats {
                    count: 5,
                    total_minutes: 300,
                    total_calories: 1500.0,
                    avg_duration: 60.0,
                    types: std::collections::HashMap::new(),
                    personal_records: Vec::new(),
                },
                strength: types::StrengthStats {
                    total_volume: 10000.0,
                    top_exercises: Vec::new(),
                    estimated_one_rms: std::collections::HashMap::new(),
                },
                gamification: types::GamificationStats {
                    streak: 7,
                    longest_streak: 30,
                    points: 1000,
                    level: 5,
                    badges: 3,
                    leaderboard_rank: None,
                    percentile: None,
                },
                body: types::BodyStats {
                    weight_change: Some(-2.5),
                    body_fat_change: Some(-1.5),
                    muscle_gain: Some(1.0),
                    bmi: Some(22.5),
                    health_score: Some(75.0),
                    muscle_development: None,
                },
                comparisons: types::Comparisons {
                    vs_average: std::collections::HashMap::new(),
                    personal_bests: Vec::new(),
                },
            },
            created_at: chrono::Utc::now(),
            width: 1080,
            height: 1080,
            shareable_image_url: None,
            svg_content: None,
        }
    }
}
