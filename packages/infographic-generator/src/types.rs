//! Data structures for infographic generation

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::colors::default_palette;

/// Infographic template types
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InfographicTemplate {
    WeeklySummary,
    Milestone,
    Streak,
    MuscleHeatmap,
    Comparison,
}

/// Color palette configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorPalette {
    pub primary: String,
    pub secondary: String,
    pub accent: String,
    pub background: String,
    pub text: String,
    pub text_muted: String,
}

/// Typography configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypographyConfig {
    pub headline_font: String,
    pub body_font: String,
    pub headline_size: f64,
    pub subhead_size: f64,
    pub body_size: f64,
}

/// Infographic configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfographicConfig {
    pub template: InfographicTemplate,
    pub theme: String,
    pub layout: String,
    pub color_scheme: ColorPalette,
    pub typography: TypographyConfig,
    pub include_stats: Vec<String>,
    pub include_comparison: bool,
    pub width: u32,
    pub height: u32,
}

/// AI-generated story content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfographicStory {
    pub headline: String,
    pub subheadline: Option<String>,
    pub narrative: String,
    pub stats: Vec<StatData>,
    pub call_to_action: String,
    pub fun_facts: Vec<String>,
    pub tone: String,
    pub reading_level: String,
}

/// Individual statistic display data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatData {
    pub label: String,
    pub value: String,
    pub unit: Option<String>,
    pub comparison: Option<String>,
    pub icon: Option<String>,
}

/// Workout statistics aggregation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutStats {
    pub count: i32,
    pub total_minutes: i32,
    pub total_calories: f64,
    pub avg_duration: f64,
    pub types: HashMap<String, i32>,
    pub personal_records: Vec<PersonalRecord>,
}

/// Personal record data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalRecord {
    pub exercise: String,
    pub weight: f64,
    pub reps: i32,
    pub date: String,
    pub previous: Option<f64>,
    pub improvement_percent: Option<f64>,
}

/// Strength statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrengthStats {
    pub total_volume: f64,
    pub top_exercises: Vec<TopExercise>,
    pub estimated_one_rms: HashMap<String, f64>,
}

/// Top exercise entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopExercise {
    pub name: String,
    pub volume: f64,
}

/// Gamification statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GamificationStats {
    pub streak: i32,
    pub longest_streak: i32,
    pub points: i32,
    pub level: i32,
    pub badges: i32,
    pub leaderboard_rank: Option<i32>,
    pub percentile: Option<f64>,
}

/// Body metrics statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BodyStats {
    pub weight_change: Option<f64>,
    pub body_fat_change: Option<f64>,
    pub muscle_gain: Option<f64>,
    pub bmi: Option<f64>,
    pub health_score: Option<f64>,
    pub muscle_development: Option<Vec<MuscleDevelopment>>,
}

/// Muscle development score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MuscleDevelopment {
    pub group: String,
    pub score: f64,
}

/// Comparison data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comparisons {
    pub vs_average: HashMap<String, f64>,
    pub personal_bests: Vec<PersonalBest>,
}

/// Personal best entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalBest {
    pub metric: String,
    pub improvement: f64,
}

/// Complete user statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserStats {
    pub period: Period,
    pub workouts: WorkoutStats,
    pub strength: StrengthStats,
    pub gamification: GamificationStats,
    pub body: BodyStats,
    pub comparisons: Comparisons,
}

/// Time period for stats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Period {
    pub start_date: String,
    pub end_date: String,
    #[serde(rename = "type")]
    pub period_type: String,
}

/// Complete infographic data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfographicData {
    pub id: String,
    pub user_id: String,
    pub template: InfographicTemplate,
    pub config: InfographicConfig,
    pub story: InfographicStory,
    pub stats: UserStats,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
    pub shareable_image_url: Option<String>,
    pub svg_content: Option<String>,
    pub width: u32,
    pub height: u32,
}

/// SVG Template element types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SvgTemplateElement {
    Text {
        x: f64,
        y: f64,
        content: String,
        #[serde(default)]
        attributes: Option<HashMap<String, String>>,
    },
    Rect {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        #[serde(default)]
        attributes: Option<HashMap<String, String>>,
    },
    Circle {
        cx: f64,
        cy: f64,
        r: f64,
        #[serde(default)]
        attributes: Option<HashMap<String, String>>,
    },
    Path {
        d: String,
        #[serde(default)]
        attributes: Option<HashMap<String, String>>,
    },
    Image {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        href: String,
    },
    Group {
        children: Vec<SvgTemplateElement>,
        transform: Option<String>,
    },
}

/// Complete SVG template definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgTemplate {
    pub width: u32,
    pub height: u32,
    pub view_box: String,
    pub background: String,
    pub elements: Vec<SvgTemplateElement>,
}

/// Render result
#[derive(Debug, Clone, Serialize)]
pub struct RenderResult {
    pub success: bool,
    pub svg: Option<String>,
    pub error: Option<String>,
    pub render_time_ms: u64,
}

/// Validation result
#[derive(Debug, Clone, Serialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_color_palette_serialization() {
        let palette = default_palette();
        let json = serde_json::to_string(&palette).unwrap();
        let parsed: ColorPalette = serde_json::from_str(&json).unwrap();
        assert_eq!(palette.primary, parsed.primary);
    }

    #[test]
    fn test_infographic_data_serialization() {
        let data = InfographicData {
            id: "test".to_string(),
            user_id: "user123".to_string(),
            template: InfographicTemplate::WeeklySummary,
            config: InfographicConfig {
                template: InfographicTemplate::WeeklySummary,
                theme: "vibrant".to_string(),
                layout: "square".to_string(),
                color_scheme: default_palette(),
                typography: TypographyConfig {
                    headline_font: "Arial".to_string(),
                    body_font: "Arial".to_string(),
                    headline_size: 64.0,
                    subhead_size: 36.0,
                    body_size: 24.0,
                },
                include_stats: Vec::new(),
                include_comparison: true,
                width: 800,
                height: 800,
            },
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
                period: Period {
                    start_date: "2025-01-01".to_string(),
                    end_date: "2025-01-07".to_string(),
                    period_type: "weekly".to_string(),
                },
                workouts: WorkoutStats {
                    count: 5,
                    total_minutes: 300,
                    total_calories: 1500.0,
                    avg_duration: 60.0,
                    types: HashMap::new(),
                    personal_records: Vec::new(),
                },
                strength: StrengthStats {
                    total_volume: 10000.0,
                    top_exercises: Vec::new(),
                    estimated_one_rms: HashMap::new(),
                },
                gamification: GamificationStats {
                    streak: 7,
                    longest_streak: 30,
                    points: 1000,
                    level: 5,
                    badges: 3,
                    leaderboard_rank: None,
                    percentile: None,
                },
                body: BodyStats {
                    weight_change: Some(-2.5),
                    body_fat_change: Some(-1.5),
                    muscle_gain: Some(1.0),
                    bmi: Some(22.5),
                    health_score: Some(75.0),
                    muscle_development: None,
                },
                comparisons: Comparisons {
                    vs_average: HashMap::new(),
                    personal_bests: Vec::new(),
                },
            },
            created_at: chrono::Utc::now(),
            shareable_image_url: None,
            svg_content: None,
            width: 1080,
            height: 1080,
        };

        let json = serde_json::to_string(&data).unwrap();
        let parsed: InfographicData = serde_json::from_str(&json).unwrap();
        assert_eq!(data.id, parsed.id);
        assert_eq!(data.story.headline, parsed.story.headline);
    }
}
