//! # Scoring Functions
//!
//! Core scoring logic for readiness calculation.

use crate::types::*;
use wasm_core::math::{clamp, round_to};

/// Neutral score when factor is missing
pub const NEUTRAL_SCORE: f64 = 50.0;

/// Maximum contribution per factor
pub const MAX_FACTOR_CONTRIBUTION: f64 = 25.0;

/// High confidence threshold
pub const HIGH_CONFIDENCE_THRESHOLD: f64 = 0.85;

/// Medium confidence threshold
pub const MEDIUM_CONFIDENCE_THRESHOLD: f64 = 0.70;

/// Default readiness weights
pub fn default_weights() -> std::collections::HashMap<String, f64> {
    let mut weights = std::collections::HashMap::new();
    weights.insert("sleep".to_string(), 0.20);
    weights.insert("training_load".to_string(), 0.15);
    weights.insert("workout_completion".to_string(), 0.10);
    weights.insert("form_quality".to_string(), 0.08);
    weights.insert("muscle_soreness".to_string(), 0.08);
    weights.insert("energy".to_string(), 0.10);
    weights.insert("stress".to_string(), 0.08);
    weights.insert("resting_hr".to_string(), 0.06);
    weights.insert("hrv".to_string(), 0.05);
    weights.insert("steps".to_string(), 0.05);
    weights.insert("hydration".to_string(), 0.05);
    weights.insert("nutrition".to_string(), 0.05);
    weights.insert("recovery_days".to_string(), 0.05);
    weights
}

/// Get readiness level from score
pub fn get_readiness_level(score: f64) -> ReadinessLevel {
    if score <= 39.0 {
        ReadinessLevel::Low
    } else if score <= 59.0 {
        ReadinessLevel::Moderate
    } else if score <= 79.0 {
        ReadinessLevel::Good
    } else {
        ReadinessLevel::High
    }
}

/// Get factor status based on score
pub fn get_factor_status(score: Option<f64>) -> FactorStatus {
    match score {
        Some(s) if s < 40.0 => FactorStatus::Negative,
        Some(s) if s > 60.0 => FactorStatus::Positive,
        _ => FactorStatus::Neutral,
    }
}

/// Calculate factor contribution to overall score
pub fn calculate_factor_contribution(score: f64, weight: f64) -> f64 {
    // Contribution = (score - 50) * weight
    let deviation = score - NEUTRAL_SCORE;
    round_to(deviation * weight, 2)
}

/// Process all factors from input
pub fn process_factors(input: &ReadinessInput) -> Vec<ReadinessFactor> {
    let mut factors = Vec::new();
    let weights = default_weights();

    // Sleep duration/quality
    let sleep_value = input.sleep_duration.as_ref().or(input.sleep_quality.as_ref());
    let sleep_score = sleep_value.and_then(|v| {
        if v.unit.contains("hour") {
            crate::normalization::normalize_sleep_duration(v.value)
        } else {
            crate::normalization::normalize_sleep_quality(v.value)
        }
    });
    factors.push(ReadinessFactor {
        code: "sleep".to_string(),
        value: sleep_value.cloned(),
        weight: *weights.get("sleep").unwrap_or(&0.20),
        normalized_score: sleep_score,
        contribution: 0.0,
        status: get_factor_status(sleep_score),
    });

    // Training load
    let training_load_score = input.recent_workout_load.as_ref()
        .and_then(|v| crate::normalization::normalize_training_load(v.value));
    factors.push(ReadinessFactor {
        code: "training_load".to_string(),
        value: input.recent_workout_load.clone(),
        weight: *weights.get("training_load").unwrap_or(&0.15),
        normalized_score: training_load_score,
        contribution: 0.0,
        status: get_factor_status(training_load_score),
    });

    // Workout completion
    let workout_score = input.workout_completion.as_ref()
        .and_then(|v| crate::normalization::normalize_workout_completion(v.value));
    factors.push(ReadinessFactor {
        code: "workout_completion".to_string(),
        value: input.workout_completion.clone(),
        weight: *weights.get("workout_completion").unwrap_or(&0.10),
        normalized_score: workout_score,
        contribution: 0.0,
        status: get_factor_status(workout_score),
    });

    // Form quality
    let form_score = input.form_quality.as_ref()
        .and_then(|v| crate::normalization::normalize_form_quality(v.value));
    factors.push(ReadinessFactor {
        code: "form_quality".to_string(),
        value: input.form_quality.clone(),
        weight: *weights.get("form_quality").unwrap_or(&0.08),
        normalized_score: form_score,
        contribution: 0.0,
        status: get_factor_status(form_score),
    });

    // Muscle soreness (inverted)
    let soreness_score = input.muscle_soreness.as_ref()
        .and_then(|v| crate::normalization::normalize_muscle_soreness(v.value));
    factors.push(ReadinessFactor {
        code: "muscle_soreness".to_string(),
        value: input.muscle_soreness.clone(),
        weight: *weights.get("muscle_soreness").unwrap_or(&0.08),
        normalized_score: soreness_score,
        contribution: 0.0,
        status: get_factor_status(soreness_score),
    });

    // Energy
    let energy_score = input.energy.as_ref()
        .and_then(|v| crate::normalization::normalize_energy(v.value));
    factors.push(ReadinessFactor {
        code: "energy".to_string(),
        value: input.energy.clone(),
        weight: *weights.get("energy").unwrap_or(&0.10),
        normalized_score: energy_score,
        contribution: 0.0,
        status: get_factor_status(energy_score),
    });

    // Stress (inverted)
    let stress_score = input.stress.as_ref()
        .and_then(|v| crate::normalization::normalize_stress(v.value));
    factors.push(ReadinessFactor {
        code: "stress".to_string(),
        value: input.stress.clone(),
        weight: *weights.get("stress").unwrap_or(&0.08),
        normalized_score: stress_score,
        contribution: 0.0,
        status: get_factor_status(stress_score),
    });

    // Resting HR
    let hr_score = input.resting_heart_rate.as_ref()
        .and_then(|v| crate::normalization::normalize_resting_hr(v.value, input.baseline_resting_hr));
    factors.push(ReadinessFactor {
        code: "resting_hr".to_string(),
        value: input.resting_heart_rate.clone(),
        weight: *weights.get("resting_hr").unwrap_or(&0.06),
        normalized_score: hr_score,
        contribution: 0.0,
        status: get_factor_status(hr_score),
    });

    // HRV
    let hrv_score = input.hrv.as_ref()
        .and_then(|v| crate::normalization::normalize_hrv(v.value, input.baseline_hrv));
    factors.push(ReadinessFactor {
        code: "hrv".to_string(),
        value: input.hrv.clone(),
        weight: *weights.get("hrv").unwrap_or(&0.05),
        normalized_score: hrv_score,
        contribution: 0.0,
        status: get_factor_status(hrv_score),
    });

    // Steps
    let steps_score = input.steps.as_ref()
        .and_then(|v| crate::normalization::normalize_steps(v.value, input.baseline_steps));
    factors.push(ReadinessFactor {
        code: "steps".to_string(),
        value: input.steps.clone(),
        weight: *weights.get("steps").unwrap_or(&0.05),
        normalized_score: steps_score,
        contribution: 0.0,
        status: get_factor_status(steps_score),
    });

    // Hydration
    let hydration_score = input.hydration.as_ref()
        .and_then(|v| crate::normalization::normalize_hydration(v.value));
    factors.push(ReadinessFactor {
        code: "hydration".to_string(),
        value: input.hydration.clone(),
        weight: *weights.get("hydration").unwrap_or(&0.05),
        normalized_score: hydration_score,
        contribution: 0.0,
        status: get_factor_status(hydration_score),
    });

    // Nutrition (combined calorie + protein adherence)
    let nutrition_value = input.calorie_adherence.as_ref().or(input.protein_adherence.as_ref());
    let nutrition_score = nutrition_value.and_then(|_| {
        let cal_adh = input.calorie_adherence.as_ref().map(|v| v.value).unwrap_or(NEUTRAL_SCORE);
        let prot_adh = input.protein_adherence.as_ref().map(|v| v.value).unwrap_or(NEUTRAL_SCORE);
        Some(crate::normalization::normalize_nutrition_adherence((cal_adh + prot_adh) / 2.0))
    });
    factors.push(ReadinessFactor {
        code: "nutrition".to_string(),
        value: nutrition_value.cloned(),
        weight: *weights.get("nutrition").unwrap_or(&0.05),
        normalized_score: nutrition_score,
        contribution: 0.0,
        status: get_factor_status(nutrition_score),
    });

    // Recovery days
    let recovery_score = input.recovery_days.as_ref()
        .and_then(|v| crate::normalization::normalize_recovery_days(v.value));
    factors.push(ReadinessFactor {
        code: "recovery_days".to_string(),
        value: input.recovery_days.clone(),
        weight: *weights.get("recovery_days").unwrap_or(&0.05),
        normalized_score: recovery_score,
        contribution: 0.0,
        status: get_factor_status(recovery_score),
    });

    factors
}

/// Redistribute weights for missing data
pub fn redistribute_weights(factors: &[ReadinessFactor]) -> Vec<ReadinessFactor> {
    let available_factors: Vec<&ReadinessFactor> = factors.iter()
        .filter(|f| f.value.as_ref().map_or(false, |v| v.available))
        .collect();
    
    if available_factors.is_empty() {
        // No data - all factors get neutral contribution
        return factors.iter().map(|f| ReadinessFactor {
            normalized_score: Some(NEUTRAL_SCORE),
            contribution: 0.0,
            status: FactorStatus::Neutral,
            ..f.clone()
        }).collect();
    }
    
    let total_available_weight: f64 = available_factors.iter()
        .map(|f| f.weight)
        .sum();
    
    factors.iter().map(|f| {
        if f.value.as_ref().map_or(false, |v| v.available) {
            // Scale weight to account for missing factors
            let scaled_weight = f.weight / total_available_weight;
            ReadinessFactor { weight: scaled_weight, ..f.clone() }
        } else {
            // Missing factor - contributes nothing
            ReadinessFactor {
                weight: 0.0,
                normalized_score: None,
                contribution: 0.0,
                status: FactorStatus::Neutral,
                ..f.clone()
            }
        }
    }).collect()
}

/// Calculate overall readiness score
pub fn calculate_readiness_score(factors: &[ReadinessFactorOutput]) -> f64 {
    let total_contribution: f64 = factors.iter()
        .map(|f| f.contribution)
        .sum();
    
    let raw_score = NEUTRAL_SCORE + total_contribution;
    clamp(round_to(raw_score, 0), 0.0, 100.0)
}

/// Calculate confidence based on data completeness and freshness
pub fn calculate_confidence(completeness: f64, freshness: f64) -> f64 {
    // Completeness contribution (0-0.5)
    let completeness_score = clamp(completeness, 0.0, 1.0) * 0.5;
    
    // Freshness contribution (0-0.5)
    let freshness_score = if freshness <= 6.0 {
        0.5
    } else if freshness <= 24.0 {
        0.5 - ((freshness - 6.0) / 18.0) * 0.25
    } else if freshness <= 48.0 {
        0.25 - ((freshness - 24.0) / 24.0) * 0.15
    } else {
        0.1
    };
    
    clamp(round_to(completeness_score + freshness_score, 2), 0.0, 1.0)
}

/// Determine training recommendation based on score
pub fn determine_recommendation(score: f64, level: &ReadinessLevel, completeness: f64) -> TrainingRecommendation {
    let data_factor = if completeness >= 0.7 { 1.0 } else { 0.8 };
    
    match level {
        ReadinessLevel::Low => TrainingRecommendation {
            action: "rest".to_string(),
            intensity_modifier: -0.5 * data_factor,
            volume_modifier: -0.5 * data_factor,
        },
        ReadinessLevel::Moderate => TrainingRecommendation {
            action: "light_training".to_string(),
            intensity_modifier: -0.25 * data_factor,
            volume_modifier: -0.25 * data_factor,
        },
        ReadinessLevel::Good => TrainingRecommendation {
            action: "normal_training".to_string(),
            intensity_modifier: 0.0,
            volume_modifier: 0.0,
        },
        ReadinessLevel::High => TrainingRecommendation {
            action: "high_intensity".to_string(),
            intensity_modifier: 0.1 * data_factor,
            volume_modifier: 0.05 * data_factor,
        },
    }
}
