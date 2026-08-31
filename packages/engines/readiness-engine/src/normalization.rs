//! # Normalization Functions
//!
//! Convert raw measured values to 0-100 normalized scores.

use wasm_core::math::{clamp, round_to};

/// Normalize sleep duration to 0-100 score
/// Optimal range: 7-9 hours
pub fn normalize_sleep_duration(hours: f64) -> Option<f64> {
    if !hours.is_finite() || hours <= 0.0 {
        return None;
    }

    let score = if hours >= 7.0 && hours <= 9.0 {
        100.0
    } else if hours < 7.0 {
        // Linear from 0 at 0h to 100 at 7h
        clamp((hours / 7.0) * 100.0, 0.0, 100.0)
    } else {
        // Above optimal (slight penalty for oversleeping)
        let excess = hours - 9.0;
        clamp(100.0 - excess * 10.0, 50.0, 100.0)
    };

    Some(round_to(score, 1))
}

/// Normalize sleep quality to 0-100 score
pub fn normalize_sleep_quality(quality: f64) -> Option<f64> {
    if !quality.is_finite() {
        return None;
    }
    Some(clamp(round_to(quality, 1), 0.0, 100.0))
}

/// Normalize training load (acute:chronic ratio) to 0-100 score
/// Optimal range: 0.8-1.3 (fresh to moderately fatigued)
pub fn normalize_training_load(load: f64) -> Option<f64> {
    if !load.is_finite() || load <= 0.0 {
        return None;
    }

    let score = if load >= 0.8 && load <= 1.3 {
        100.0
    } else if load < 0.8 {
        // Too low (under-trained)
        clamp((load / 0.8) * 100.0, 0.0, 100.0)
    } else {
        // Too high (over-trained) - exponential penalty
        let excess = load - 1.3;
        let penalty = 100.0 * (1.0 - (-excess * 2.0).exp());
        clamp(100.0 - penalty, 0.0, 50.0)
    };

    Some(round_to(score, 1))
}

/// Normalize workout completion to 0-100 score
pub fn normalize_workout_completion(completion: f64) -> Option<f64> {
    if !completion.is_finite() {
        return None;
    }
    Some(clamp(round_to(completion, 1), 0.0, 100.0))
}

/// Normalize form quality to 0-100 score
pub fn normalize_form_quality(quality: f64) -> Option<f64> {
    if !quality.is_finite() {
        return None;
    }
    Some(clamp(round_to(quality, 1), 0.0, 100.0))
}

/// Normalize muscle soreness to 0-100 score (inverted)
/// Input: 0-10 (0 = no soreness, 10 = very sore)
/// Output: 0-100 (0 = very sore, 100 = no soreness)
pub fn normalize_muscle_soreness(soreness: f64) -> Option<f64> {
    if !soreness.is_finite() {
        return None;
    }
    // Invert: 0 soreness -> 100 score, 10 soreness -> 0 score
    Some(clamp(round_to((10.0 - soreness) * 10.0, 1), 0.0, 100.0))
}

/// Normalize energy level to 0-100 score
pub fn normalize_energy(energy: f64) -> Option<f64> {
    if !energy.is_finite() {
        return None;
    }
    Some(clamp(round_to(energy, 1), 0.0, 100.0))
}

/// Normalize stress level to 0-100 score (inverted)
/// Input: 0-100 (0 = no stress, 100 = very stressed)
/// Output: 0-100 (0 = very stressed, 100 = no stress)
pub fn normalize_stress(stress: f64) -> Option<f64> {
    if !stress.is_finite() {
        return None;
    }
    // Invert: 0 stress -> 100 score, 100 stress -> 0 score
    Some(clamp(round_to(100.0 - stress, 1), 0.0, 100.0))
}

/// Normalize resting heart rate to 0-100 score
/// Lower is generally better, but too low can be concerning
/// Optimal range: 50-70 bpm for adults (or baseline-5 to baseline+10)
pub fn normalize_resting_hr(hr: f64, baseline: Option<f64>) -> Option<f64> {
    if !hr.is_finite() || hr <= 0.0 {
        return None;
    }

    let optimal_low = baseline.map(|b| b - 5.0).unwrap_or(50.0);
    let optimal_high = baseline.map(|b| b + 10.0).unwrap_or(70.0);

    let score = if hr >= optimal_low && hr <= optimal_high {
        100.0
    } else if hr < optimal_low {
        // Below optimal (potentially too low)
        let deficit = optimal_low - hr;
        clamp(100.0 - deficit * 5.0, 70.0, 100.0)
    } else {
        // Above optimal (elevated)
        let excess = hr - optimal_high;
        clamp(100.0 - excess * 3.0, 30.0, 100.0)
    };

    Some(round_to(score, 1))
}

/// Normalize HRV to 0-100 score
/// Higher is generally better for recovery
/// Optimal: >50ms for adults (or baseline*0.8 to baseline*0.9)
pub fn normalize_hrv(hrv: f64, baseline: Option<f64>) -> Option<f64> {
    if !hrv.is_finite() || hrv <= 0.0 {
        return None;
    }

    let optimal_min = baseline.map(|b| b * 0.8).unwrap_or(30.0);
    let optimal_min_good = baseline.map(|b| b * 0.9).unwrap_or(50.0);

    let score = if hrv >= optimal_min_good {
        100.0
    } else if hrv >= optimal_min {
        let range = optimal_min_good - optimal_min;
        clamp(((hrv - optimal_min) / range) * 50.0 + 50.0, 50.0, 100.0)
    } else {
        // Too low
        clamp((hrv / optimal_min) * 50.0, 0.0, 50.0)
    };

    Some(round_to(score, 1))
}

/// Normalize steps to 0-100 score
/// Target: 10,000 steps
pub fn normalize_steps(steps: f64, target: Option<f64>) -> Option<f64> {
    if !steps.is_finite() || steps <= 0.0 {
        return None;
    }

    let target = target.unwrap_or(10000.0);
    let score = if steps >= target {
        100.0
    } else {
        clamp((steps / target) * 100.0, 0.0, 100.0)
    };

    Some(round_to(score, 1))
}

/// Normalize hydration to 0-100 score
/// Target: user's target (default 2000ml)
pub fn normalize_hydration(ml: f64) -> Option<f64> {
    if !ml.is_finite() || ml <= 0.0 {
        return None;
    }

    let target = 2000.0; // Default target in ml
    let score = if ml >= target {
        100.0
    } else {
        clamp((ml / target) * 100.0, 0.0, 100.0)
    };

    Some(round_to(score, 1))
}

/// Normalize nutrition adherence to 0-100 score
pub fn normalize_nutrition_adherence(adherence: f64) -> Option<f64> {
    if !adherence.is_finite() {
        return None;
    }
    Some(clamp(round_to(adherence, 1), 0.0, 100.0))
}

/// Normalize recovery days to 0-100 score
/// More recovery days generally means better readiness
pub fn normalize_recovery_days(days: f64) -> Option<f64> {
    if !days.is_finite() || days < 0.0 {
        return None;
    }

    let score = if days >= 1.0 && days <= 3.0 {
        100.0
    } else if days < 1.0 {
        clamp(days * 100.0, 0.0, 100.0)
    } else {
        // More than optimal (deconditioning risk)
        let penalty = (days - 3.0) * 15.0;
        clamp(100.0 - penalty, 40.0, 100.0)
    };

    Some(round_to(score, 1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sleep_normalization() {
        assert_eq!(normalize_sleep_duration(8.0), Some(100.0));
        assert_eq!(normalize_sleep_duration(7.0), Some(100.0));
        assert!(normalize_sleep_duration(5.0).unwrap() < 100.0);
        assert!(normalize_sleep_duration(5.0).unwrap() > 50.0);
    }

    #[test]
    fn test_training_load_normalization() {
        assert_eq!(normalize_training_load(1.0), Some(100.0));
        assert!(normalize_training_load(0.5).unwrap() < 100.0);
        assert!(normalize_training_load(2.0).unwrap() < 100.0);
    }

    #[test]
    fn test_soreness_inversion() {
        assert_eq!(normalize_muscle_soreness(0.0), Some(100.0));
        assert_eq!(normalize_muscle_soreness(5.0), Some(50.0));
        assert_eq!(normalize_muscle_soreness(10.0), Some(0.0));
    }

    #[test]
    fn test_stress_inversion() {
        assert_eq!(normalize_stress(0.0), Some(100.0));
        assert_eq!(normalize_stress(50.0), Some(50.0));
        assert_eq!(normalize_stress(100.0), Some(0.0));
    }
}
