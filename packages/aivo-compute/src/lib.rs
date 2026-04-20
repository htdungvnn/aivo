use wasm_bindgen::prelude::*;

/// Fitness calculation module providing high-performance WASM functions
#[wasm_bindgen]
pub struct FitnessCalculator;

#[wasm_bindgen]
impl FitnessCalculator {
  /// Calculate Body Mass Index (BMI)
  /// Formula: weight (kg) / height (m)^2
  #[wasm_bindgen(js_name = "calculateBMI")]
  pub fn calculate_bmi(weight_kg: f64, height_cm: f64) -> f64 {
    let height_m = height_cm / 100.0;
    if height_m <= 0.0 {
      return 0.0;
    }
    weight_kg / (height_m * height_m)
  }

  /// Get BMI category based on WHO standards
  #[wasm_bindgen(js_name = "getBMICategory")]
  pub fn get_bmi_category(bmi: f64) -> &'static str {
    match bmi {
      b if b < 18.5 => "underweight",
      b if b < 25.0 => "normal",
      b if b < 30.0 => "overweight",
      _ => "obese",
    }
  }

  /// Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
  /// Most accurate equation for BMR calculation
  #[wasm_bindgen(js_name = "calculateBMR")]
  pub fn calculate_bmr(weight_kg: f64, height_cm: f64, age_years: f64, is_male: bool) -> f64 {
    if is_male {
      10.0 * weight_kg + 6.25 * height_cm - 5.0 * age_years + 5.0
    } else {
      10.0 * weight_kg + 6.25 * height_cm - 5.0 * age_years - 161.0
    }
  }

  /// Calculate Total Daily Energy Expenditure (TDEE)
  #[wasm_bindgen(js_name = "calculateTDEE")]
  pub fn calculate_tdee(bmr: f64, activity_level: &str) -> f64 {
    let multiplier = match activity_level {
      "sedentary" => 1.2,      // Little or no exercise
      "light" => 1.375,        // Light exercise 1-3 days/week
      "moderate" => 1.55,      // Moderate exercise 3-5 days/week
      "active" => 1.725,       // Hard exercise 6-7 days/week
      "very_active" => 1.9,    // Very hard exercise, physical job
      _ => 1.2,                // Default to sedentary
    };
    bmr * multiplier
  }

  /// Calculate target daily calories based on goal
  #[wasm_bindgen(js_name = "calculateTargetCalories")]
  pub fn calculate_target_calories(tdee: f64, goal: &str) -> f64 {
    match goal {
      "lose" => tdee - 500.0,     // 500 calorie deficit for ~0.5kg/week loss
      "gain" => tdee + 500.0,     // 500 calorie surplus for ~0.5kg/week gain
      _ => tdee,                  // maintain
    }
  }

  /// Calculate one-rep max using Epley formula
  #[wasm_bindgen(js_name = "calculateOneRepMax")]
  pub fn calculate_one_rep_max(weight_lifted: f64, reps: f64) -> f64 {
    if reps <= 0.0 || reps >= 20.0 {
      return weight_lifted;
    }
    weight_lifted * (1.0 + reps / 30.0)
  }

  /// Calculate one-rep max using Brzycki formula (more accurate for higher reps)
  #[wasm_bindgen(js_name = "calculateOneRepMaxBrzycki")]
  pub fn calculate_one_rep_max_brzycki(weight_lifted: f64, reps: f64) -> f64 {
    if reps <= 0.0 || reps >= 16.0 {
      return weight_lifted;
    }
    weight_lifted * (36.0 / (37.0 - reps))
  }

  /// Calculate resting heart rate zones (Karvonen method)
  #[wasm_bindgen(js_name = "calculateHeartRateZones")]
  pub fn calculate_heart_rate_zones(resting_hr: u32, max_hr: u32) -> JsValue {
    let zones = vec![
      ("Zone 1 (Recovery)", ((max_hr - resting_hr) as f64 * 0.5 + resting_hr as f64) as u32),
      ("Zone 2 (Endurance)", ((max_hr - resting_hr) as f64 * 0.6 + resting_hr as f64) as u32),
      ("Zone 3 (Tempo)", ((max_hr - resting_hr) as f64 * 0.7 + resting_hr as f64) as u32),
      ("Zone 4 (Threshold)", ((max_hr - resting_hr) as f64 * 0.8 + resting_hr as f64) as u32),
      ("Zone 5 (VO2 Max)", ((max_hr - resting_hr) as f64 * 0.9 + resting_hr as f64) as u32),
    ];

    JsValue::from_serde(&zones).unwrap_or(JsValue::NULL)
  }

  /// Calculate predicted maximum heart rate (Tanaka formula)
  #[wasm_bindgen(js_name = "calculateMaxHeartRate")]
  pub fn calculate_max_heart_rate(age_years: u32) -> u32 {
    208 - (0.7 * age_years as f64) as u32
  }

  /// Calculate calories burned during exercise (MET-based)
  #[wasm_bindgen(js_name = "calculateCaloriesBurned")]
  pub fn calculate_calories_burned(weight_kg: f64, minutes: f64, met_value: f64) -> f64 {
    // Calories = MET × weight in kg × time in hours
    met_value * weight_kg * (minutes / 60.0)
  }

  /// Calculate workout volume (weight × reps × sets)
  #[wasm_bindgen(js_name = "calculateVolume")]
  pub fn calculate_volume(weight: f64, reps: u32, sets: u32) -> f64 {
    weight * reps as f64 * sets as f64
  }

  /// Calculate intensity as percentage of 1RM
  #[wasm_bindgen(js_name = "calculateIntensity")]
  pub fn calculate_intensity(weight_lifted: f64, one_rep_max: f64) -> f64 {
    if one_rep_max <= 0.0 {
      return 0.0;
    }
    (weight_lifted / one_rep_max) * 100.0
  }
}
