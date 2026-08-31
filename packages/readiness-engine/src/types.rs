//! # Types
//!
//! Type definitions for readiness calculation.

use serde::{Deserialize, Serialize};

/// Readiness level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReadinessLevel {
    Low,
    Moderate,
    Good,
    High,
}

impl ReadinessLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReadinessLevel::Low => "low",
            ReadinessLevel::Moderate => "moderate",
            ReadinessLevel::Good => "good",
            ReadinessLevel::High => "high",
        }
    }
}

/// Readiness factor codes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReadinessFactorCode {
    Sleep,
    TrainingLoad,
    WorkoutCompletion,
    FormQuality,
    MuscleSoreness,
    Energy,
    Stress,
    RestingHr,
    Hrv,
    Steps,
    Hydration,
    Nutrition,
    RecoveryDays,
}

impl ReadinessFactorCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReadinessFactorCode::Sleep => "sleep",
            ReadinessFactorCode::TrainingLoad => "training_load",
            ReadinessFactorCode::WorkoutCompletion => "workout_completion",
            ReadinessFactorCode::FormQuality => "form_quality",
            ReadinessFactorCode::MuscleSoreness => "muscle_soreness",
            ReadinessFactorCode::Energy => "energy",
            ReadinessFactorCode::Stress => "stress",
            ReadinessFactorCode::RestingHr => "resting_hr",
            ReadinessFactorCode::Hrv => "hrv",
            ReadinessFactorCode::Steps => "steps",
            ReadinessFactorCode::Hydration => "hydration",
            ReadinessFactorCode::Nutrition => "nutrition",
            ReadinessFactorCode::RecoveryDays => "recovery_days",
        }
    }
}

/// Measured value with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasuredValue {
    pub value: f64,
    pub unit: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freshness: Option<f64>,
    #[serde(default)]
    pub available: bool,
}

impl MeasuredValue {
    pub fn new(value: f64, unit: &str, confidence: f64) -> Self {
        Self {
            value,
            unit: unit.to_string(),
            timestamp: Some(js_sys::Date::now() as i64),
            source: None,
            confidence: Some(confidence),
            freshness: Some(0.0),
            available: true,
        }
    }

    pub fn missing() -> Self {
        Self {
            value: 0.0,
            unit: String::new(),
            timestamp: None,
            source: None,
            confidence: None,
            freshness: None,
            available: false,
        }
    }
}

/// Readiness input data
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ReadinessInput {
    pub date: String,
    
    // Primary factors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sleep_duration: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sleep_quality: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recent_workout_load: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workout_completion: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub form_quality: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub muscle_soreness: Option<MeasuredValue>,
    
    // Wellness factors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub energy: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stress: Option<MeasuredValue>,
    
    // Biomarker factors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resting_heart_rate: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hrv: Option<MeasuredValue>,
    
    // Activity factors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub steps: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hydration: Option<MeasuredValue>,
    
    // Nutrition factors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub calorie_adherence: Option<MeasuredValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protein_adherence: Option<MeasuredValue>,
    
    // Recovery factors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recovery_days: Option<MeasuredValue>,
    
    // Metadata
    pub data_completeness: f64,
    pub data_freshness: f64, // hours old
    
    // Optional baselines
    #[serde(skip_serializing_if = "Option::is_none")]
    pub baseline_resting_hr: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub baseline_hrv: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub baseline_steps: Option<f64>,
}

/// Factor status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FactorStatus {
    Negative,
    Neutral,
    Positive,
}

impl FactorStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            FactorStatus::Negative => "negative",
            FactorStatus::Neutral => "neutral",
            FactorStatus::Positive => "positive",
        }
    }
}

/// Readiness factor output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessFactorOutput {
    pub code: String,
    pub score: f64,
    pub weight: f64,
    pub contribution: f64,
    pub status: FactorStatus,
    pub message_key: String,
}

/// Training recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingRecommendation {
    pub action: String,
    pub intensity_modifier: f64,
    pub volume_modifier: f64,
}

/// Readiness output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessOutput {
    pub date: String,
    pub score: f64,
    pub level: ReadinessLevel,
    pub confidence: f64,
    pub data_completeness: f64,
    pub factors: Vec<ReadinessFactorOutput>,
    pub recommendation: TrainingRecommendation,
    pub algorithm_version: String,
    pub formula_version: String,
    pub calculated_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_snapshot: Option<String>,
}

impl ReadinessOutput {
    pub fn error(message: &str) -> Self {
        Self {
            date: String::new(),
            score: 0.0,
            level: ReadinessLevel::Low,
            confidence: 0.0,
            data_completeness: 0.0,
            factors: Vec::new(),
            recommendation: TrainingRecommendation {
                action: "error".to_string(),
                intensity_modifier: 0.0,
                volume_modifier: 0.0,
            },
            algorithm_version: env!("CARGO_PKG_VERSION").to_string(),
            formula_version: "error".to_string(),
            calculated_at: 0,
            input_snapshot: Some(message.to_string()),
        }
    }
}

/// Readiness factor internal representation
#[derive(Debug, Clone)]
pub struct ReadinessFactor {
    pub code: String,
    pub value: Option<MeasuredValue>,
    pub weight: f64,
    pub normalized_score: Option<f64>,
    pub contribution: f64,
    pub status: FactorStatus,
}
