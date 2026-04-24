//! Adaptive Macro Adjustment Engine
//! Calculates dynamic macro target adjustments based on biometric feedback
//! This is the core of the "Adaptive Bio-Synergetic Macro-Oscillation" feature

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MacroAdjustment {
    pub adjustment_type: String,  // "increase_calories", "decrease_calories", "rebalance", "maintain"
    pub calorie_change: i32,
    pub protein_change: f64,
    pub carbs_change: f64,
    pub fat_change: f64,
    pub reasoning: Vec<String>,
    pub confidence: f64,  // 0-1
    pub urgency: String,  // "low", "medium", "high", "critical"
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AdaptiveMacroInputs {
    // Current state
    pub current_calories: f64,
    pub current_protein: f64,
    pub current_carbs: f64,
    pub current_fat: f64,
    // Goals
    pub target_calories: f64,
    pub target_protein: f64,
    pub target_carbs: f64,
    pub target_fat: f64,
    // User profile
    pub goal: String,  // "lose_weight", "gain_muscle", "maintain"
    pub activity_level: String,
    pub body_weight_kg: f64,
    // Recent performance (last 3-7 days)
    pub daily_calories_consumed: Vec<f64>,
    pub daily_calories_burned: Vec<f64>,
    pub daily_adherence: Vec<f64>,  // 0-1 percentage of target met
    // Biometric signals
    pub recovery_score: f64,  // 0-100
    pub sleep_quality: f64,  // 0-100
    pub sleep_duration_hours: f64,
    pub hrv_rmssd: Option<f64>,  // ms, lower = higher stress
    pub stress_score: f64,  // 0-100 derived from HRV
    pub steps_last_24h: i32,
    pub active_minutes: i32,
    // Body metrics trend
    pub weight_change_weekly: f64,  // kg change per week
    pub body_fat_change: f64,
    // Nutrition adherence
    pub nutrition_consistency_score: f64,  // 0-100
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StateAssessment {
    pub recovery_status: &'static str,
    pub sleep_quality: &'static str,
    pub activity_level: &'static str,
    pub adherence_trend: &'static str,
    pub weight_loss_rate: Option<&'static str>,
    pub protein_intake_adequate: bool,
    pub fat_intake_adequate: bool,
}

#[wasm_bindgen]
pub struct MacroAdjuster;

#[wasm_bindgen]
impl MacroAdjuster {
    /// Main entry point - calculate adaptive macro adjustment
    #[wasm_bindgen(js_name = "calculateAdjustment")]
    pub fn calculate_adjustment(inputs_json: &str) -> JsValue {
        let inputs: AdaptiveMacroInputs = match serde_json::from_str(inputs_json) {
            Ok(inputs) => inputs,
            Err(e) => {
                let error_obj = serde_json::json!({
                    "error": format!("Failed to parse inputs: {}", e),
                    "adjustment_type": "maintain",
                    "calorie_change": 0,
                    "reasoning": ["Invalid input data"]
                });
                return serde_json::to_string(&error_obj).unwrap().into();
            }
        };

        // 1. Assess current state
        let assessment = Self::assess_current_state(&inputs);

        // 2. Determine if adjustment is needed
        if !Self::should_adjust(&assessment, &inputs) {
            let result = MacroAdjustment {
                adjustment_type: "maintain".to_string(),
                calorie_change: 0,
                protein_change: 0.0,
                carbs_change: 0.0,
                fat_change: 0.0,
                reasoning: vec!["Current plan is working well".to_string()],
                confidence: 0.95,
                urgency: "low".to_string(),
            };
            return serde_json::to_string(&result).unwrap().into();
        }

        // 3. Calculate adjustment using heuristic rules (can be replaced with LP later)
        let mut adjustment = Self::calculate_optimized_macros(&inputs, &assessment);

        // 4. Apply safety constraints
        adjustment = Self::apply_safety_constraints(adjustment, &inputs);

        // 5. Generate reasoning if needed
        if adjustment.reasoning.is_empty() {
            adjustment.reasoning = Self::generate_reasoning(&adjustment, &assessment, &inputs);
        }

        serde_json::to_string(&adjustment).unwrap().into()
    }

    /// Assess current state from inputs
    fn assess_current_state(inputs: &AdaptiveMacroInputs) -> StateAssessment {
        let assessment = StateAssessment {
            recovery_status: Self::assess_recovery(inputs.recovery_score),
            sleep_quality: Self::assess_sleep(inputs.sleep_quality),
            activity_level: Self::assess_activity(inputs.steps_last_24h, inputs.active_minutes),
            adherence_trend: Self::assess_adherence(&inputs.daily_adherence),
            weight_loss_rate: Self::calculate_weight_loss_rate(inputs.weight_change_weekly),
            protein_intake_adequate: inputs.current_protein >= inputs.target_protein * 0.9,
            fat_intake_adequate: inputs.current_fat >= inputs.target_fat * 0.9,
        };

        assessment
    }

    fn assess_recovery(score: f64) -> &'static str {
        if score >= 70.0 { "excellent" }
        else if score >= 50.0 { "good" }
        else if score >= 30.0 { "fair" }
        else { "poor" }
    }

    fn assess_sleep(quality: f64) -> &'static str {
        if quality >= 80.0 { "excellent" }
        else if quality >= 60.0 { "good" }
        else if quality >= 40.0 { "fair" }
        else { "poor" }
    }

    fn assess_activity(steps: i32, active_minutes: i32) -> &'static str {
        let activity_score = (steps as f64 / 10000.0 * 50.0 + active_minutes as f64 / 60.0 * 50.0).min(100.0);
        if activity_score >= 80.0 { "very_high" }
        else if activity_score >= 60.0 { "high" }
        else if activity_score >= 40.0 { "moderate" }
        else { "low" }
    }

    fn assess_adherence(adherence: &[f64]) -> &'static str {
        if adherence.len() < 3 {
            return "unknown";
        }
        let recent: Vec<f64> = adherence.iter().rev().take(3).copied().collect();
        let avg = recent.iter().sum::<f64>() / recent.len() as f64;
        if avg >= 0.95 { "high" }
        else if avg >= 0.80 { "moderate" }
        else { "under" }
    }

    fn calculate_weight_loss_rate(weekly_change: f64) -> Option<&'static str> {
        if weekly_change.abs() < 0.1 {
            return None;
        }
        if weekly_change > 1.0 {
            Some("too_fast_loss")
        } else if weekly_change < -0.25 && weekly_change > -1.0 {
            Some("slow_loss")
        } else if weekly_change < -1.0 {
            Some("weight_gain")
        } else {
            Some("healthy_loss")
        }
    }

    /// Determine if adjustment is warranted
    fn should_adjust(assessment: &StateAssessment, inputs: &AdaptiveMacroInputs) -> bool {
        // Always adjust if recovery is poor and calories are high
        if assessment.recovery_status == "poor" && inputs.daily_calories_consumed.iter().sum::<f64>() > inputs.target_calories * 0.9 {
            return true;
        }

        // Adjust if adherence is consistently low
        if assessment.adherence_trend == "under" {
            return true;
        }

        // Adjust for weight rate mismatches with goals
        if let Some(rate) = assessment.weight_loss_rate {
            if inputs.goal == "lose_weight" && rate != "healthy_loss" {
                return true;
            }
            if inputs.goal == "gain_muscle" && rate == "weight_gain" {
                return true;
            }
        }

        // Adjust for very high activity
        if assessment.activity_level == "very_high" && inputs.steps_last_24h > 15000 {
            return true;
        }

        // Adjust if sleep is poor but calories are low (need to ensure recovery)
        if assessment.sleep_quality == "poor" && assessment.recovery_status != "excellent" && inputs.daily_calories_consumed.iter().sum::<f64>() < inputs.target_calories * 0.7 {
            return true;
        }

        false
    }

    /// Calculate optimized macros using constraint-based heuristic
    fn calculate_optimized_macros(
        inputs: &AdaptiveMacroInputs,
        assessment: &StateAssessment
    ) -> MacroAdjustment {
        let mut adjustment = MacroAdjustment {
            adjustment_type: "rebalance".to_string(),
            calorie_change: 0,
            protein_change: 0.0,
            carbs_change: 0.0,
            fat_change: 0.0,
            reasoning: Vec::new(),
            confidence: 0.8,
            urgency: "medium".to_string(),
        };

        // Rule 1: Under-recovery (recovery_score < 40 or high stress)
        if assessment.recovery_status == "poor" {
            adjustment.calorie_change = -200;
            adjustment.reasoning.push("Lowering calories to support recovery (low recovery score)".to_string());
        }
        // Rule 2: Overtraining signals (high activity, poor sleep)
        else if assessment.activity_level == "very_high" && assessment.sleep_quality != "excellent" {
            if assessment.sleep_quality == "poor" {
                adjustment.calorie_change = -150;
                adjustment.carbs_change = -20.0;
                adjustment.reasoning.push("Reducing carbs to manage training load with poor sleep".to_string());
            } else {
                adjustment.carbs_change = -10.0;
                adjustment.reasoning.push("Slight carb reduction due to high training volume".to_string());
            }
        }
        // Rule 3: Consistent under-eating (adherence < 0.8 for 3+ days)
        else if assessment.adherence_trend == "under" {
            let increase = 200;
            adjustment.calorie_change = increase;
            adjustment.protein_change = 15.0;
            adjustment.carbs_change = 20.0;
            adjustment.reasoning.push("Increasing target to improve adherence and prevent burnout".to_string());
            adjustment.adjustment_type = "increase_calories".to_string();
        }
        // Rule 4: Weight loss goal, but rate outside healthy range (0.25-1.0 kg/week)
        else if let Some(rate) = assessment.weight_loss_rate {
            match rate {
                "too_fast_loss" => {
                    adjustment.calorie_change = 200;
                    adjustment.protein_change = 10.0;
                    adjustment.reasoning.push("Weight loss too rapid, increasing calories for sustainability".to_string());
                    adjustment.adjustment_type = "increase_calories".to_string();
                }
                "slow_loss" => {
                    adjustment.calorie_change = -150;
                    adjustment.reasoning.push("Weight loss slower than expected, slightly decreasing calories".to_string());
                    adjustment.adjustment_type = "decrease_calories".to_string();
                }
                "weight_gain" if inputs.goal == "gain_muscle" => {
                    // Good - keep as is
                }
                "weight_gain" => {
                    adjustment.calorie_change = -300;
                    adjustment.reasoning.push("Unexpected weight gain, reducing calories".to_string());
                    adjustment.adjustment_type = "decrease_calories".to_string();
                }
                _ => {}
            }
        }
        // Rule 5: High activity detected (steps > 12000 or active minutes > 180)
        else if assessment.activity_level == "very_high" {
            let extra_needs = (inputs.steps_last_24h as f64 / 10000.0 * 100.0).max(0.0);
            let increase = extra_needs.min(250.0).round() as i32;
            if increase > 50 {
                adjustment.calorie_change = increase;
                adjustment.carbs_change = increase as f64 * 0.5 / 4.0; // Half increase in carbs (grams)
                adjustment.reasoning.push(format!("High activity detected ({} steps, {} active min), increasing calories by {}", inputs.steps_last_24h, inputs.active_minutes, adjustment.calorie_change));
                adjustment.adjustment_type = "increase_calories".to_string();
            }
        }
        // Rule 6: Protein intake inadequate
        else if !assessment.protein_intake_adequate {
            adjustment.protein_change = 20.0;
            adjustment.calorie_change = 80; // 20g protein = 80 cal
            adjustment.reasoning.push("Increasing protein to meet muscle maintenance needs".to_string());
            if adjustment.adjustment_type == "rebalance" {
                adjustment.adjustment_type = "increase_calories".to_string();
            }
        }
        // Rule 7: Fat intake inadequate (below 0.8g/kg)
        else if !assessment.fat_intake_adequate {
            adjustment.fat_change = 15.0;
            adjustment.calorie_change += 135; // 15g fat = 135 cal
            adjustment.reasoning.push("Increasing healthy fats for hormone health".to_string());
        }

        adjustment
    }

    /// Apply safety constraints to adjustments
    fn apply_safety_constraints(mut adjustment: MacroAdjustment, inputs: &AdaptiveMacroInputs) -> MacroAdjustment {
        // Constraint 1: Max calorie change per day
        adjustment.calorie_change = adjustment.calorie_change.clamp(-300, 300);

        // Constraint 2: Macro ratio constraints
        // Protein: 1.6-2.2g/kg body weight minimum
        let min_protein = inputs.body_weight_kg * 1.6;
        let max_protein = inputs.body_weight_kg * 2.5;
        let effective_protein = inputs.current_protein + adjustment.protein_change;
        if effective_protein < min_protein {
            adjustment.protein_change = min_protein - inputs.current_protein;
            adjustment.calorie_change += (adjustment.protein_change * 4.0).round() as i32;
        }
        if effective_protein > max_protein {
            adjustment.protein_change = max_protein - inputs.current_protein;
            adjustment.calorie_change += (adjustment.protein_change * 4.0).round() as i32;
        }

        // Fat: minimum 0.8g/kg, maximum 1.0g/kg
        let min_fat = inputs.body_weight_kg * 0.8;
        let max_fat = inputs.body_weight_kg * 1.0;
        let effective_fat = inputs.current_fat + adjustment.fat_change;
        if effective_fat < min_fat {
            adjustment.fat_change = min_fat - inputs.current_fat;
            adjustment.calorie_change += (adjustment.fat_change * 9.0).round() as i32;
        }
        if effective_fat > max_fat {
            adjustment.fat_change = max_fat - inputs.current_fat;
            adjustment.calorie_change -= (adjustment.fat_change * 9.0).round() as i32;
        }

        // Constraint 3: Reapply calorie limit after macro adjustments
        adjustment.calorie_change = adjustment.calorie_change.clamp(-300, 300);

        // Constraint 4: If recovery is very poor (score < 20), never increase calories
        if inputs.recovery_score < 20.0 && adjustment.calorie_change > 0 {
            adjustment.calorie_change = 0;
            adjustment.reasoning.push("Cannot increase calories with very poor recovery".to_string());
        }

        // Set adjustment type based on net change
        if adjustment.calorie_change > 50 {
            adjustment.adjustment_type = "increase_calories".to_string();
        } else if adjustment.calorie_change < -50 {
            adjustment.adjustment_type = "decrease_calories".to_string();
        } else if adjustment.protein_change.abs() > 5.0 || adjustment.carbs_change.abs() > 20.0 || adjustment.fat_change.abs() > 10.0 {
            adjustment.adjustment_type = "rebalance".to_string();
        } else {
            adjustment.adjustment_type = "maintain".to_string();
        }

        // Set urgency based on magnitude and recovery
        let magnitude = (adjustment.calorie_change.abs() as f64 / 300.0).max(
            adjustment.protein_change.abs().max(adjustment.carbs_change.abs().max(adjustment.fat_change.abs())) / 30.0
        );
        if magnitude > 0.8 || inputs.recovery_score < 30.0 {
            adjustment.urgency = "critical".to_string();
        } else if magnitude > 0.5 || inputs.recovery_score < 50.0 {
            adjustment.urgency = "high".to_string();
        } else if magnitude > 0.2 {
            adjustment.urgency = "medium".to_string();
        } else {
            adjustment.urgency = "low".to_string();
        }

        adjustment
    }

    /// Generate human-readable reasoning for the adjustment
    fn generate_reasoning(
        adjustment: &MacroAdjustment,
        assessment: &StateAssessment,
        inputs: &AdaptiveMacroInputs
    ) -> Vec<String> {
        let mut reasoning = Vec::new();

        match adjustment.adjustment_type.as_str() {
            "increase_calories" => {
                reasoning.push(format!("Increasing daily calories by {}", adjustment.calorie_change));
                if assessment.adherence_trend == "under" {
                    reasoning.push("Your recent adherence has been below target - this adjustment makes your target more achievable".to_string());
                } else if assessment.activity_level == "very_high" {
                    reasoning.push(format!("You've been highly active ({} steps/day), increasing fuel to support performance", inputs.steps_last_24h));
                } else if let Some(rate) = assessment.weight_loss_rate {
                    if rate == "too_fast_loss" {
                        reasoning.push("Weight loss is progressing too rapidly - this adjustment supports sustainable progress".to_string());
                    }
                }
            }
            "decrease_calories" => {
                reasoning.push(format!("Decreasing daily calories by {}", adjustment.calorie_change));
                if assessment.recovery_status == "poor" {
                    reasoning.push("Lowering calories to support recovery and reduce metabolic stress".to_string());
                }
                if let Some(rate) = assessment.weight_loss_rate {
                    if rate == "slow_loss" {
                        reasoning.push("Creating a larger deficit to accelerate progress toward your weight loss goal".to_string());
                    }
                }
            }
            "rebalance" => {
                if adjustment.protein_change.abs() > 1.0 {
                    if adjustment.protein_change > 0.0 {
                        reasoning.push(format!("Increasing protein by {:.0}g to support muscle maintenance", adjustment.protein_change));
                    } else {
                        reasoning.push(format!("Decreasing protein by {:.0}g for better macronutrient balance", adjustment.protein_change.abs()));
                    }
                }
                if adjustment.carbs_change.abs() > 1.0 {
                    if adjustment.carbs_change > 0.0 {
                        reasoning.push(format!("Adding {:.0}g carbohydrates for energy", adjustment.carbs_change));
                    } else {
                        reasoning.push(format!("Reducing carbs by {:.0}g to optimize fuel timing", adjustment.carbs_change.abs()));
                    }
                }
                if adjustment.fat_change.abs() > 1.0 {
                    if adjustment.fat_change > 0.0 {
                        reasoning.push(format!("Increasing healthy fats by {:.0}g for hormone health", adjustment.fat_change));
                    } else {
                        reasoning.push(format!("Reducing fats by {:.0}g", adjustment.fat_change.abs()));
                    }
                }
            }
            "maintain" => {
                reasoning.push("Current macro targets are optimal for your current state".to_string());
            }
            _ => {}
        }

        // Add confidence assessment
        if adjustment.confidence > 0.9 {
            reasoning.push("High confidence adjustment based on your recent data trends".to_string());
        } else if adjustment.confidence > 0.7 {
            reasoning.push("Moderate confidence - monitor your response to this change".to_string());
        } else {
            reasoning.push("Limited data available - this adjustment is conservative".to_string());
        }

        reasoning
    }
}

/// Helper: calculate standard deviation
#[allow(dead_code)]
fn calculate_std_dev(values: &[f64]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / values.len() as f64;
    variance.sqrt()
}