use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;
use itertools::Itertools;

/// Fitness calculation module providing high-performance WASM functions
#[wasm_bindgen]
pub struct FitnessCalculator;

/// Text optimization module for token thinning
/// Compresses text while preserving semantic density for AI prompts
#[wasm_bindgen]
pub struct TokenOptimizer;

#[wasm_bindgen]
impl TokenOptimizer {
  /// Thin text to reduce token count while preserving key information
  /// Uses rule-based compression optimized for fitness/health context
  #[wasm_bindgen(js_name = "thinTokens")]
  pub fn thin_tokens(text: &str, target_ratio: f64) -> String {
    if text.is_empty() {
      return String::new();
    }

    // Clamp target ratio between 0.1 and 1.0
    let target_ratio = target_ratio.max(0.1).min(1.0);

    let words: Vec<&str> = text.split_whitespace().collect();
    let original_len = words.len();
    let target_len = (original_len as f64 * target_ratio).ceil() as usize;

    // If already within target, return as-is
    if original_len <= target_len {
      return text.to_string();
    }

    // Fitness-specific stop words to remove (low semantic value)
    let filler_words = [
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
      "may", "might", "must", "shall", "can", "need", "dare", "ought",
      "very", "really", "quite", "just", "only", "even", "still", "also",
      "again", "further", "then", "next", "now", "today", "yesterday",
      "something", "anything", "nothing", "someone", "anyone", "noone",
      "somewhere", "anywhere", "nowhere", "somehow", "anyhow", "somewhat",
      "anywhat", "rather", "enough", "much", "many", "lots", "tons",
      "like", "you know", "I mean", "sort of", "kind of", "basically",
      "actually", "personally", "honestly", "seriously",
    ];

    // High-value fitness keywords to always preserve
    let preserve_keywords = [
      "weight", "body", "fat", "muscle", "bmi", "health", "diet", "nutrition",
      "exercise", "workout", "training", "strength", "cardio", "hiit",
      "calories", "protein", "carbs", "fat", "carbs", "hydration",
      "sleep", "recovery", "progress", "goals", "target", "achieve",
      "increase", "decrease", "build", "lose", "gain", "maintain",
      "daily", "weekly", "monthly", "routine", "schedule", "plan",
      "rep", "set", "weight", "lift", "squat", "bench", "deadlift",
      "run", "cycle", "swim", "yoga", "stretch", "flexibility",
      "heart", "blood", "pressure", "cholesterol", "sugar", "insulin",
      "supplement", "vitamin", "mineral", "creatine", "preworkout",
      "morning", "evening", "before", "after", "during",
    ];

    // Score each word for importance
    let mut scored_words: Vec<(usize, &str, f64)> = words.iter().enumerate().map(|(i, &word)| {
      let lower_word = word.to_lowercase();
      let mut score = 1.0;

      // Preserve numbers (measurements, dates, weights)
      if word.chars().all(|c| c.is_numeric() || c == '.' || c == '-') {
        score += 3.0;
      }

      // Preserve fitness keywords
      if preserve_keywords.contains(&lower_word.as_str()) {
        score += 2.0;
      }

      // Penalize filler words
      if filler_words.contains(&lower_word.as_str()) {
        score -= 1.5;
      }

      // Longer words often more informative
      if word.len() > 5 {
        score += 0.5;
      }

      // Preserve first and last words (often important context)
      if i == 0 || i == words.len() - 1 {
        score += 1.0;
      }

      // Preserve words with capital letters (proper nouns, acronyms)
      if word.chars().next().map_or(false, |c| c.is_uppercase()) {
        score += 0.8;
      }

      (i, word, score)
    }).collect();

    // Sort by score descending, keep original order for equal scores
    scored_words.sort_by(|a, b| {
      b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal)
        .then_with(|| a.0.cmp(&b.0))
    });

    // Take top scoring words
    let mut kept: Vec<(usize, &str)> = scored_words.iter()
      .take(target_len)
      .map(|(idx, word, _)| (*idx, *word))
      .collect();

    // Sort back by original position to maintain text flow
    kept.sort_by(|a, b| a.0.cmp(&b.0));

    let kept_words: Vec<&str> = kept.iter().map(|(_, word)| *word).collect();

    // Reconstruct text with proper spacing
    let result = kept_words.join(" ");

    // Clean up spacing around punctuation
    let cleaned = result
      .replace(" .", ".")
      .replace(" ,", ",")
      .replace(" !", "!")
      .replace(" ?", "?")
      .replace(" :", ":")
      .replace(" ;", ";");

    cleaned
  }

  /// Aggressively compress text for system prompts (higher compression)
  #[wasm_bindgen(js_name = "thinTokensAggressive")]
  pub fn thin_tokens_aggressive(text: &str) -> String {
    Self::thin_tokens(text, 0.4) // Target 40% of original
  }

  /// Light compression for user messages (preserve more content)
  #[wasm_bindgen(js_name = "thinTokensLight")]
  pub fn thin_tokens_light(text: &str) -> String {
    Self::thin_tokens(text, 0.7) // Target 70% of original
  }

  /// Count approximate tokens (rough estimate: 1 token ≈ 4 chars or 0.75 words)
  #[wasm_bindgen(js_name = "estimateTokenCount")]
  pub fn estimate_token_count(text: &str) -> usize {
    if text.is_empty() {
      return 0;
    }
    // Rough approximation: average of word count * 0.75 and char count / 4
    let word_count = text.split_whitespace().count();
    let char_count = text.chars().count();
    let by_words = (word_count as f64 * 0.75).ceil() as usize;
    let by_chars = (char_count as f64 / 4.0).ceil() as usize;
    (by_words + by_chars) / 2
  }

  /// Get compression statistics
  #[wasm_bindgen(js_name = "getCompressionStats")]
  pub fn get_compression_stats(original: &str, compressed: &str) -> JsValue {
    let original_tokens = Self::estimate_token_count(original);
    let compressed_tokens = Self::estimate_token_count(compressed);
    let savings = if original_tokens > 0 {
      ((original_tokens - compressed_tokens) as f64 / original_tokens as f64) * 100.0
    } else {
      0.0
    };

    #[derive(serde::Serialize)]
    struct Stats {
      original_tokens: usize,
      compressed_tokens: usize,
      savings_percent: f64,
      original_chars: usize,
      compressed_chars: usize,
    }

    let stats = Stats {
      original_tokens,
      compressed_tokens,
      savings_percent: savings.round() * 10.0 / 10.0,
      original_chars: original.chars().count(),
      compressed_chars: compressed.chars().count(),
    };

    to_value(&stats).unwrap_or(JsValue::NULL)
  }
}

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
  pub fn get_bmi_category(bmi: f64) -> String {
    match bmi {
      b if b < 18.5 => "underweight",
      b if b < 25.0 => "normal",
      b if b < 30.0 => "overweight",
      _ => "obese",
    }.to_string()
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

    to_value(&zones).unwrap_or(JsValue::NULL)
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

  /// Calculate body fat percentage using US Navy method
  /// Requires circumference measurements in cm and gender
  /// Returns estimated body fat percentage (0-100)
  /// For men: uses waist, neck, height
  /// For women: uses waist, neck, hips, height
  #[wasm_bindgen(js_name = "calculateBodyFatNavy")]
  pub fn calculate_body_fat_navy(
    waist_cm: f64,
    neck_cm: f64,
    height_cm: f64,
    is_male: bool,
    hips_cm: Option<f64>,
  ) -> f64 {
    if waist_cm <= 0.0 || neck_cm <= 0.0 || height_cm <= 0.0 {
      return 0.0;
    }

    let waist = waist_cm;
    let neck = neck_cm;
    let height = height_cm;

    let body_fat = if is_male {
      // Male formula: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
      let log_waist_neck = (waist - neck).max(1.0).log10();
      let log_height = height.log10();
      let body_fat = 495.0 / (1.0324 - 0.19077 * log_waist_neck + 0.15456 * log_height) - 450.0;
      body_fat.max(0.0).min(100.0)
    } else {
      let hips = hips_cm.unwrap_or(0.0);
      if hips <= 0.0 {
        return 0.0;
      }
      // Female formula: 495 / (1.03979 - 0.13965 * log10(waist + hips - neck) + 0.16344 * log10(height)) - 450
      let sum = waist + hips - neck;
      if sum <= 0.0 {
        return 0.0;
      }
      let log_sum = sum.max(1.0).log10();
      let log_height = height.log10();
      let body_fat = 495.0 / (1.03979 - 0.13965 * log_sum + 0.16344 * log_height) - 450.0;
      body_fat.max(0.0).min(100.0)
    };

    (body_fat * 100.0).round() / 100.0 // Round to 2 decimal places
  }

  /// Estimate body fat percentage from BMI and age
  /// Quick estimation when circumferences are not available
  /// Uses Deurenberg formula adjusted for age
  #[wasm_bindgen(js_name = "estimateBodyFatFromBMI")]
  pub fn estimate_body_fat_from_bmi(bmi: f64, age: f64, is_male: bool) -> f64 {
    if bmi <= 0.0 || age <= 0.0 {
      return 0.0;
    }

    // Deurenberg formula: body fat % = (1.20 × BMI) + (0.23 × Age) - (10.8 × gender) - 5.4
    // gender: male = 1, female = 0
    let gender_factor = if is_male { 1.0 } else { 0.0 };
    let body_fat = (1.20 * bmi) + (0.23 * age) - (10.8 * gender_factor) - 5.4;

    body_fat.max(0.0).min(100.0)
  }

  /// Calculate Lean Body Mass (LBM)
  /// LBM = total weight - fat mass
  #[wasm_bindgen(js_name = "calculateLeanBodyMass")]
  pub fn calculate_lean_body_mass(weight_kg: f64, body_fat_percentage: f64) -> f64 {
    if weight_kg <= 0.0 || body_fat_percentage < 0.0 || body_fat_percentage > 100.0 {
      return 0.0;
    }
    let fat_mass = weight_kg * (body_fat_percentage / 100.0);
    weight_kg - fat_mass
  }

  /// Calculate muscle balance score from muscle development data
  /// Returns score 0-100 where 100 is perfectly balanced
  #[wasm_bindgen(js_name = "calculateMuscleBalanceScore")]
  pub fn calculate_muscle_balance_score(
    muscle_scores: &[f64],
    optimal_ratios: &[f64],
  ) -> f64 {
    if muscle_scores.is_empty() || optimal_ratios.is_empty() || muscle_scores.len() != optimal_ratios.len() {
      return 0.0;
    }

    // Normalize scores relative to the strongest muscle group
    let max_score = muscle_scores.iter().copied().fold(0.0, f64::max);
    if max_score <= 0.0 {
      return 0.0;
    }

    let normalized: Vec<f64> = muscle_scores.iter().map(|&s| s / max_score).collect();

    // Calculate deviation from optimal ratios
    let mut total_deviation = 0.0;
    for (i, &norm) in normalized.iter().enumerate() {
      let optimal = optimal_ratios[i];
      let deviation = (norm - optimal).abs();
      total_deviation += deviation;
    }

    let avg_deviation = total_deviation / muscle_scores.len() as f64;
    let score = (1.0 - avg_deviation) * 100.0;

    score.max(0.0).min(100.0)
  }

  /// Calculate overall health score based on body composition
  /// Combines BMI, body fat, muscle mass, and fitness level
  /// Returns score 0-100 and category
  #[wasm_bindgen(js_name = "calculateHealthScore")]
  pub fn calculate_health_score(
    bmi: Option<f64>,
    body_fat_percentage: Option<f64>,
    weight_kg: Option<f64>,
    muscle_mass_kg: Option<f64>,
    fitness_level: Option<String>,
    _age: Option<f64>,
    is_male: bool,
  ) -> JsValue {
    #[derive(serde::Serialize)]
    struct HealthScoreResult {
      score: f64,
      category: &'static str,
      factors: serde_json::Value,
      recommendations: Vec<&'static str>,
    }

    let mut factors = serde_json::json!({});
    let mut total_weighted_score = 0.0;
    let mut total_weight = 0.0;

    // BMI factor (weight: 25%)
    if let Some(bmi) = bmi {
      let bmi_score = if bmi >= 18.5 && bmi <= 24.9 {
        factors["bmi"] = serde_json::json!({ "value": bmi, "score": 100, "category": "optimal" });
        100.0
      } else if bmi >= 25.0 && bmi <= 29.9 {
        factors["bmi"] = serde_json::json!({ "value": bmi, "score": 70, "category": "overweight" });
        70.0
      } else if bmi >= 30.0 {
        factors["bmi"] = serde_json::json!({ "value": bmi, "score": 30, "category": "obese" });
        30.0
      } else if bmi >= 17.0 {
        factors["bmi"] = serde_json::json!({ "value": bmi, "score": 80, "category": "slightly_underweight" });
        80.0
      } else {
        factors["bmi"] = serde_json::json!({ "value": bmi, "score": 40, "category": "underweight" });
        40.0
      };
      total_weighted_score += bmi_score * 0.25;
      total_weight += 0.25;
    }

    // Body fat factor (weight: 30%)
    if let Some(bf) = body_fat_percentage {
      let bf_score = if is_male {
        match bf {
          b if b < 0.06 => 50.0, // too low
          b if b >= 0.06 && b <= 0.18 => 100.0,
          b if b > 0.18 && b <= 0.25 => 70.0,
          _ => 30.0,
        }
      } else {
        match bf {
          b if b < 0.14 => 50.0, // too low
          b if b >= 0.14 && b <= 0.28 => 100.0,
          b if b > 0.28 && b <= 0.35 => 70.0,
          _ => 30.0,
        }
      };
      factors["bodyFat"] = serde_json::json!({ "value": bf, "score": bf_score });
      total_weighted_score += bf_score * 0.30;
      total_weight += 0.30;
    }

    // Muscle mass factor (weight: 30%)
    if let (Some(weight), Some(muscle_mass)) = (weight_kg, muscle_mass_kg) {
      if weight > 0.0 {
        let muscle_ratio = muscle_mass / weight;
        let muscle_score = if is_male {
          if muscle_ratio >= 0.35 && muscle_ratio <= 0.45 {
            100.0
          } else if muscle_ratio >= 0.30 && muscle_ratio < 0.35 {
            80.0
          } else if muscle_ratio > 0.45 && muscle_ratio <= 0.50 {
            90.0
          } else {
            50.0
          }
        } else {
          if muscle_ratio >= 0.25 && muscle_ratio <= 0.35 {
            100.0
          } else if muscle_ratio >= 0.20 && muscle_ratio < 0.25 {
            80.0
          } else if muscle_ratio > 0.35 && muscle_ratio <= 0.40 {
            90.0
          } else {
            50.0
          }
        };
        factors["muscleMass"] = serde_json::json!({
          "value": muscle_mass,
          "ratio": muscle_ratio,
          "score": muscle_score
        });
        total_weighted_score += muscle_score * 0.30;
        total_weight += 0.30;
      }
    }

    // Fitness level factor (weight: 15%)
    if let Some(level) = fitness_level {
      let level_scores = [
        ("beginner", 50.0),
        ("intermediate", 75.0),
        ("advanced", 90.0),
        ("elite", 100.0),
      ];
      let score = level_scores.iter().find(|(l, _)| *l == level).map(|(_, s)| *s).unwrap_or(50.0);
      factors["fitnessLevel"] = serde_json::json!({ "value": level, "score": score });
      total_weighted_score += score * 0.15;
      total_weight += 0.15;
    }

    let final_score: f64 = if total_weight > 0.0 {
      total_weighted_score / total_weight
    } else {
      50.0 // Default if no data
    };

    let category = if final_score >= 85.0 {
      "excellent"
    } else if final_score >= 70.0 {
      "good"
    } else if final_score >= 50.0 {
      "fair"
    } else {
      "poor"
    };

    // Generate recommendations
    let mut recommendations = Vec::new();
    if let Some(bmi) = bmi {
      if bmi >= 25.0 {
        recommendations.push("Consider a moderate caloric deficit to achieve healthier weight");
      } else if bmi < 18.5 {
        recommendations.push("Focus on nutrient-dense foods to reach a healthy weight");
      }
    }
    if let Some(bf) = body_fat_percentage {
      let optimal_upper = if is_male { 0.20 } else { 0.30 };
      if bf > optimal_upper {
        recommendations.push("Incorporate strength training and moderate cardio for body fat reduction");
      } else if bf < (if is_male { 0.08 } else { 0.16 }) {
        recommendations.push("Ensure adequate caloric intake to maintain essential body fat");
      }
    }
    if recommendations.is_empty() {
      recommendations.push("Keep up your excellent health trajectory!");
    }

    let result = HealthScoreResult {
      score: final_score.round(),
      category,
      factors,
      recommendations,
    };

    to_value(&result).unwrap_or(JsValue::NULL)
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use wasm_bindgen_test::wasm_bindgen_test;

  #[wasm_bindgen_test]
  fn test_calculate_bmi() {
    let bmi = FitnessCalculator::calculate_bmi(70.0, 175.0);
    assert!((bmi - 22.86).abs() < 0.01);
  }

  #[wasm_bindgen_test]
  fn test_calculate_bmi_zero_height() {
    let bmi = FitnessCalculator::calculate_bmi(70.0, 0.0);
    assert_eq!(bmi, 0.0);
  }

  #[wasm_bindgen_test]
  fn test_get_bmi_category() {
    assert_eq!(FitnessCalculator::get_bmi_category(17.0), "underweight");
    assert_eq!(FitnessCalculator::get_bmi_category(22.0), "normal");
    assert_eq!(FitnessCalculator::get_bmi_category(27.0), "overweight");
    assert_eq!(FitnessCalculator::get_bmi_category(32.0), "obese");
  }

  #[wasm_bindgen_test]
  fn test_calculate_bmr_male() {
    let bmr = FitnessCalculator::calculate_bmr(70.0, 175.0, 30.0, true);
    assert!((bmr - 1648.75).abs() < 0.01);
  }

  #[wasm_bindgen_test]
  fn test_calculate_bmr_female() {
    let bmr = FitnessCalculator::calculate_bmr(60.0, 165.0, 25.0, false);
    assert!((bmr - 1345.25).abs() < 0.01);
  }

  #[wasm_bindgen_test]
  fn test_calculate_tdee() {
    let bmr = 2000.0;
    assert!((FitnessCalculator::calculate_tdee(bmr, "sedentary") - 2400.0).abs() < 0.01);
    assert!((FitnessCalculator::calculate_tdee(bmr, "moderate") - 3100.0).abs() < 0.01);
    assert!((FitnessCalculator::calculate_tdee(bmr, "very_active") - 3800.0).abs() < 0.01);
  }

  #[wasm_bindgen_test]
  fn test_calculate_target_calories() {
    let tdee = 2500.0;
    assert_eq!(FitnessCalculator::calculate_target_calories(tdee, "lose"), 2000.0);
    assert_eq!(FitnessCalculator::calculate_target_calories(tdee, "gain"), 3000.0);
    assert_eq!(FitnessCalculator::calculate_target_calories(tdee, "maintain"), 2500.0);
  }

  #[wasm_bindgen_test]
  fn test_calculate_one_rep_max() {
    let orm = FitnessCalculator::calculate_one_rep_max(100.0, 10.0);
    assert!((orm - 133.33).abs() < 0.01);
  }

  #[wasm_bindgen_test]
  fn test_calculate_one_rep_max_brzycki() {
    let orm = FitnessCalculator::calculate_one_rep_max_brzycki(100.0, 10.0);
    assert!((orm - 133.33).abs() < 0.01);
  }

  #[wasm_bindgen_test]
  fn test_calculate_max_heart_rate() {
    assert_eq!(FitnessCalculator::calculate_max_heart_rate(30), 187);
    assert_eq!(FitnessCalculator::calculate_max_heart_rate(40), 180);
  }

  #[wasm_bindgen_test]
  fn test_calculate_calories_burned() {
    let calories = FitnessCalculator::calculate_calories_burned(70.0, 45.0, 8.0);
    assert!((calories - 420.0).abs() < 0.01);
  }

  #[wasm_bindgen_test]
  fn test_calculate_volume() {
    let volume = FitnessCalculator::calculate_volume(100.0, 10, 3);
    assert_eq!(volume, 3000.0);
  }

  #[wasm_bindgen_test]
  fn test_calculate_intensity() {
    assert_eq!(FitnessCalculator::calculate_intensity(80.0, 100.0), 80.0);
    assert_eq!(FitnessCalculator::calculate_intensity(80.0, 0.0), 0.0);
  }

  #[wasm_bindgen_test]
  fn test_calculate_body_fat_navy_male() {
    // Male: waist 85cm, neck 38cm, height 175cm
    let bf = FitnessCalculator::calculate_body_fat_navy(85.0, 38.0, 175.0, true, None);
    // Expected ~15-17% body fat
    assert!(bf > 10.0 && bf < 25.0, "BF percentage should be reasonable, got {}", bf);
  }

  #[wasm_bindgen_test]
  fn test_calculate_body_fat_navy_female() {
    // Female: waist 75cm, neck 33cm, hips 95cm, height 165cm
    let bf = FitnessCalculator::calculate_body_fat_navy(75.0, 33.0, 165.0, false, Some(95.0));
    // Expected ~20-25% body fat
    assert!(bf > 15.0 && bf < 35.0, "BF percentage should be reasonable, got {}", bf);
  }

  #[wasm_bindgen_test]
  fn test_estimate_body_fat_from_bmi() {
    // Male, BMI 22.5, age 30
    let bf = FitnessCalculator::estimate_body_fat_from_bmi(22.5, 30.0, true);
    // Expected ~15% body fat
    assert!(bf > 10.0 && bf < 25.0, "BF estimate should be reasonable, got {}", bf);
  }

  #[wasm_bindgen_test]
  fn test_calculate_lean_body_mass() {
    // Weight 70kg, body fat 15%
    let lbm = FitnessCalculator::calculate_lean_body_mass(70.0, 15.0);
    assert!((lbm - 59.5).abs() < 0.1);
  }

  #[wasm_bindgen_test]
  fn test_calculate_muscle_balance_score() {
    // Perfectly balanced: all scores equal with ratio 1.0
    let scores = vec![100.0, 100.0, 100.0];
    let optimal = vec![0.33, 0.33, 0.34];
    let score = FitnessCalculator::calculate_muscle_balance_score(&scores, &optimal);
    assert!((score - 100.0).abs() < 1.0, "Score should be 100 for perfect balance, got {}", score);
  }

  #[wasm_bindgen_test]
  fn test_calculate_health_score() {
    let score_json = FitnessCalculator::calculate_health_score(
      Some(22.5),    // BMI
      Some(15.0),    // body fat %
      Some(35.0),    // muscle mass kg
      Some("intermediate"),
      Some(30.0),
      true,
    );
    assert!(score_json != wasm_bindgen::JsValue::NULL);
  }

  #[wasm_bindgen_test]
  fn test_calculate_health_score_all_params_none() {
    let score_json = FitnessCalculator::calculate_health_score(
      None, None, None, None, None, true,
    );
    assert!(score_json != wasm_bindgen::JsValue::NULL);
  }

  #[wasm_bindgen_test]
  fn test_calculate_lean_body_mass_zero_weight() {
    let lbm = FitnessCalculator::calculate_lean_body_mass(0.0, 15.0);
    assert_eq!(lbm, 0.0);
  }

  #[wasm_bindgen_test]
  fn test_calculate_lean_body_mass_invalid_body_fat() {
    let lbm = FitnessCalculator::calculate_lean_body_mass(70.0, -5.0);
    assert_eq!(lbm, 0.0);
  }

  #[wasm_bindgen_test]
  fn test_estimate_body_fat_from_bmi_invalid() {
    let bf = FitnessCalculator::estimate_body_fat_from_bmi(0.0, 30.0, true);
    assert_eq!(bf, 0.0);
    let bf2 = FitnessCalculator::estimate_body_fat_from_bmi(25.0, 0.0, false);
    assert_eq!(bf2, 0.0);
  }

  #[wasm_bindgen_test]
  fn test_calculate_muscle_balance_score_empty_inputs() {
    let scores = vec![];
    let optimal = vec![];
    let score = FitnessCalculator::calculate_muscle_balance_score(&scores, &optimal);
    assert_eq!(score, 0.0);
  }

  #[wasm_bindgen_test]
  fn test_calculate_muscle_balance_score_mismatched_lengths() {
    let scores = vec![100.0, 80.0];
    let optimal = vec![0.5];
    let score = FitnessCalculator::calculate_muscle_balance_score(&scores, &optimal);
    assert_eq!(score, 0.0);
  }

  #[wasm_bindgen_test]
  fn test_calculate_muscle_balance_score_zero_max() {
    let scores = vec![0.0, 0.0, 0.0];
    let optimal = vec![0.33, 0.33, 0.34];
    let score = FitnessCalculator::calculate_muscle_balance_score(&scores, &optimal);
    assert_eq!(score, 0.0);
  }
}
