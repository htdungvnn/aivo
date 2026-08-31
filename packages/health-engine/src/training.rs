//! # Training Load Calculations
//!
//! Acute:Chronic Workload Ratio (ACWR) calculations.

use crate::types::*;
use wasm_core::math::round_to;
use wasm_core::EngineError;

/// Calculate acute:chronic workload ratio
/// 
/// Ratio ranges:
/// - < 0.8: Fresh (undertrained)
/// - 0.8 - 1.3: Optimal (productive training zone)
/// - 1.3 - 1.5: Fatigued (accumulated fatigue)
/// - > 1.5: High Risk (injury risk)
pub fn calculate_training_load(
    acute_load: f64,
    chronic_load: f64,
) -> Result<TrainingLoadOutput, EngineError> {
    // Validate inputs
    if acute_load < 0.0 {
        return Err(EngineError::out_of_range("acute_load", 0.0, f64::MAX, "health-engine"));
    }
    if chronic_load < 0.0 {
        return Err(EngineError::out_of_range("chronic_load", 0.0, f64::MAX, "health-engine"));
    }

    let ratio = if chronic_load == 0.0 {
        0.0
    } else {
        round_to(acute_load / chronic_load, 2)
    };

    let category = if ratio < 0.8 {
        LoadCategory::Fresh
    } else if ratio <= 1.3 {
        LoadCategory::Optimal
    } else if ratio <= 1.5 {
        LoadCategory::Fatigued
    } else {
        LoadCategory::HighRisk
    };

    Ok(TrainingLoadOutput { ratio, category })
}

/// Calculate weekly load progression
/// 
/// Returns the week-over-week change in load as a percentage
pub fn calculate_load_progression(
    current_load: f64,
    previous_load: f64,
) -> Result<f64, EngineError> {
    if previous_load <= 0.0 {
        return Err(EngineError::invalid_input(
            "Previous load must be positive for progression calculation",
            "health-engine",
        ));
    }

    let progression = ((current_load - previous_load) / previous_load) * 100.0;
    Ok(round_to(progression, 1))
}

/// Determine if load progression is safe
/// 
/// Recommended weekly progression:
/// - Base: < 10% increase
/// - Return from injury: < 5% increase
/// - Advanced athletes: < 15% increase
pub fn is_load_progression_safe(
    progression_percent: f64,
    athlete_level: AthleteLevel,
) -> bool {
    let max_progression = match athlete_level {
        AthleteLevel::Beginner => 10.0,
        AthleteLevel::Intermediate => 10.0,
        AthleteLevel::Advanced => 15.0,
        AthleteLevel::Elite => 8.0,
    };

    // Also check for excessive decreases (detraining)
    if progression_percent < -20.0 {
        return false;
    }

    progression_percent.abs() <= max_progression
}

/// Athlete training level
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AthleteLevel {
    Beginner,
    Intermediate,
    Advanced,
    Elite,
}

/// Calculate recommended training load based on recovery score
pub fn calculate_recommended_load(
    chronic_load: f64,
    recovery_score: f64, // 0-100
) -> f64 {
    // recovery_score 0-100 maps to 0.6-1.0 ACWR
    let target_acwr = 0.6 + (recovery_score / 100.0) * 0.4;
    round_to(chronic_load * target_acwr, 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_training_load_fresh() {
        let result = calculate_training_load(50.0, 100.0).unwrap();
        assert_eq!(result.category, LoadCategory::Fresh);
        assert!((result.ratio - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_training_load_optimal() {
        let result = calculate_training_load(100.0, 100.0).unwrap();
        assert_eq!(result.category, LoadCategory::Optimal);
        assert!((result.ratio - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_training_load_fatigued() {
        let result = calculate_training_load(140.0, 100.0).unwrap();
        assert_eq!(result.category, LoadCategory::Fatigued);
    }

    #[test]
    fn test_training_load_high_risk() {
        let result = calculate_training_load(180.0, 100.0).unwrap();
        assert_eq!(result.category, LoadCategory::HighRisk);
    }
}
