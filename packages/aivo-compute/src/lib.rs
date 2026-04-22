use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;
use image::{GenericImageView, ImageOutputFormat};

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

// ============================================
// GAMIFICATION MODULES
// ============================================

/// Streak calculation module for processing user check-ins
#[wasm_bindgen]
pub struct StreakCalculator;

#[wasm_bindgen]
impl StreakCalculator {
  /// Calculate current streak from an array of check-in dates
  /// Dates should be in ISO format (YYYY-MM-DD) and sorted ascending
  #[wasm_bindgen(js_name = "calculateStreak")]
  pub fn calculate_streak(checkin_dates: Vec<String>) -> usize {
    if checkin_dates.is_empty() {
      return 0;
    }

    let today = chrono::Utc::now().date_naive();
    let mut current_streak = 0;
    let mut expected_date = today;

    // Iterate from most recent backwards
    for date_str in checkin_dates.iter().rev() {
      if let Ok(checkin_date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        if checkin_date == expected_date {
          current_streak += 1;
          expected_date = expected_date.succ_opt().unwrap_or(expected_date);
        } else if checkin_date < expected_date {
          break;
        }
      }
    }

    current_streak
  }

  /// Find longest streak from check-in history
  #[wasm_bindgen(js_name = "findLongestStreak")]
  pub fn find_longest_streak(checkin_dates: Vec<String>) -> usize {
    if checkin_dates.is_empty() {
      return 0;
    }

    let mut dates: Vec<chrono::NaiveDate> = checkin_dates
      .iter()
      .filter_map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
      .collect();
    dates.sort();

    let mut longest = 0;
    let mut current = 1;

    for i in 1..dates.len() {
      if dates[i] == dates[i - 1].succ_opt().unwrap_or(dates[i - 1]) {
        current += 1;
      } else {
        longest = longest.max(current);
        current = 1;
      }
    }
    longest.max(current)
  }

  /// Check if user has checked in today
  #[wasm_bindgen(js_name = "hasCheckedInToday")]
  pub fn has_checked_in_today(checkin_dates: Vec<String>) -> bool {
    let today = chrono::Utc::now().date_naive();
    checkin_dates.iter().any(|d| {
      chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
        .map(|date| date == today)
        .unwrap_or(false)
    })
  }

  /// Get next check-in date
  #[wasm_bindgen(js_name = "getNextCheckinDate")]
  pub fn get_next_checkin_date(has_checked_in_today: bool) -> String {
    let today = chrono::Utc::now().date_naive();
    let target_date = if has_checked_in_today {
      today.succ_opt().unwrap_or(today)
    } else {
      today
    };
    target_date.format("%Y-%m-%d").to_string()
  }

  /// Batch process streaks from JSON string input
  /// Input: JSON object { "userId1": ["2024-01-01", "2024-01-02"], ... }
  #[wasm_bindgen(js_name = "batchCalculateStreaks")]
  pub fn batch_calculate_streaks(json_input: &str) -> String {
    #[derive(serde::Deserialize)]
    struct StreakInput {
      #[serde(rename = "userId")]
      user_id: String,
      checkins: Vec<String>,
    }

    let input_map: std::collections::HashMap<String, Vec<String>> = match serde_json::from_str(json_input) {
      Ok(map) => map,
      Err(_) => return String::from("{}"),
    };

    #[derive(serde::Serialize)]
    struct StreakData {
      current: usize,
      longest: usize,
      last_checkin: Option<String>,
      needs_checkin: bool,
    }

    let mut results = serde_json::Map::new();

    for (user_id, dates) in input_map {
      let current = Self::calculate_streak(dates.clone());
      let longest = Self::find_longest_streak(dates.clone());
      let has_today = Self::has_checked_in_today(dates.clone());

      let last_checkin = dates.iter()
        .filter_map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .max()
        .map(|d| d.format("%Y-%m-%d").to_string());

      let data = StreakData {
        current,
        longest,
        last_checkin,
        needs_checkin: !has_today,
      };

      if let Ok(json_val) = serde_json::to_value(data) {
        results.insert(user_id, json_val);
      }
    }

    serde_json::to_string(&results).unwrap_or_default()
  }
}

/// Leaderboard ranking engine
#[wasm_bindgen]
pub struct LeaderboardEngine;

#[derive(serde::Deserialize, serde::Serialize, Clone)]
struct UserScore {
  #[serde(rename = "userId")]
  user_id: String,
  points: i64,
  streak: i32,
  #[serde(rename = "displayName")]
  display_name: Option<String>,
}

#[derive(serde::Deserialize, serde::Serialize, Clone)]
struct RankedUser {
  #[serde(rename = "userId")]
  user_id: String,
  rank: usize,
  points: i64,
  streak: i32,
  #[serde(rename = "displayName")]
  display_name: Option<String>,
  #[serde(rename = "percentile")]
  percentile: f64,
}

#[wasm_bindgen]
impl LeaderboardEngine {
  /// Calculate rankings from a list of users with points
  /// Input: array of { userId, points, streak, name }
  /// Returns: array sorted by rank with position information
  #[wasm_bindgen(js_name = "calculateRankings")]
  pub fn calculate_rankings(users: JsValue) -> JsValue {
    let users_list: Vec<UserScore> = serde_wasm_bindgen::from_value(users).unwrap_or_default();

    // Sort by points descending, then streak descending
    let mut users_list = users_list;
    users_list.sort_by(|a, b| {
      b.points.cmp(&a.points)
        .then_with(|| b.streak.cmp(&a.streak))
    });

    let total = users_list.len() as f64;
    let mut ranked: Vec<RankedUser> = Vec::new();

    for (index, user) in users_list.iter().enumerate() {
      ranked.push(RankedUser {
        user_id: user.user_id.clone(),
        rank: index + 1,
        points: user.points,
        streak: user.streak,
        display_name: user.display_name.clone(),
        percentile: ((index + 1) as f64 / total) * 100.0,
      });
    }

    to_value(&ranked).unwrap_or(JsValue::NULL)
  }

  /// Get top N users from leaderboard
  #[wasm_bindgen(js_name = "getTopUsers")]
  pub fn get_top_users(users: JsValue, limit: usize) -> JsValue {
    let ranked = Self::calculate_rankings(users);
    let ranked_vec: Vec<RankedUser> = serde_wasm_bindgen::from_value(ranked).unwrap_or_default();
    let top: Vec<&RankedUser> = ranked_vec.iter().take(limit).collect();
    to_value(&top).unwrap_or(JsValue::NULL)
  }

  /// Get user's rank and stats from leaderboard
  #[wasm_bindgen(js_name = "findUserRank")]
  pub fn find_user_rank(users: JsValue, user_id: &str) -> JsValue {
    let ranked_list: Vec<RankedUser> = serde_wasm_bindgen::from_value(users).unwrap_or_default();
    for user in ranked_list {
      if user.user_id == user_id {
        return to_value(&user).unwrap_or(JsValue::NULL);
      }
    }
    JsValue::NULL
  }

  /// Determine if user is in top percentile (for KV cache threshold)
  #[wasm_bindgen(js_name = "isInTopPercentile")]
  pub fn is_in_top_percentile(users: JsValue, user_id: &str, percentile_threshold: f64) -> bool {
    let ranked_list: Vec<RankedUser> = serde_wasm_bindgen::from_value(users).unwrap_or_default();
    for user in ranked_list {
      if user.user_id == user_id {
        return user.percentile <= percentile_threshold;
      }
    }
    false
  }
}

/// Share card generator for viral sharing
#[wasm_bindgen]
pub struct ShareCardGenerator;

#[wasm_bindgen]
impl ShareCardGenerator {
  /// Generate an SVG share card with user's fitness achievements
  #[wasm_bindgen(js_name = "generateShareSVG")]
  pub fn generate_share_svg(
    user_name: &str,
    streak_days: u32,
    points: u32,
    rank: Option<u32>,
    bmi: Option<f64>,
    hide_weight: bool,
    theme: &str,
  ) -> String {
    let primary_color = match theme {
      "dark" => "#1a1a2e",
      "neon" => "#00ff88",
      "ocean" => "#0077be",
      "sunset" => "#ff6b35",
      _ => "#6366f1", // default indigo
    };

    let secondary_color = match theme {
      "dark" => "#16213e",
      "neon" => "#00cc6a",
      "ocean" => "#00b4d8",
      "sunset" => "#f7c59f",
      _ => "#818cf8",
    };

    let text_color = match theme {
      "dark" => "#ffffff",
      _ => "#1f2937",
    };

    let mut svg = String::from(r#"<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">"#);

    // Background gradient
    svg.push_str(&format!(
      r#"<defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:{};stop-opacity:1" />
          <stop offset="100%" style="stop-color:{};stop-opacity:1" />
        </linearGradient>
      </defs>"#,
      primary_color, secondary_color
    ));

    // Background rectangle
    svg.push_str(r#"<rect width="100%" height="100%" fill="url(#bg)"/>"#);

    // Logo/App name
    svg.push_str(&format!(
      r#"<text x="540" y="120" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="{}" text-anchor="middle">AIVO</text>"#,
      text_color
    ));

    // User name
    svg.push_str(&format!(
      r#"<text x="540" y="220" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="{}" text-anchor="middle">{}</text>"#,
      text_color, user_name
    ));

    // Streak section
    svg.push_str(&format!(
      r#"<text x="540" y="400" font-family="Arial, sans-serif" font-size="36" fill="{}" text-anchor="middle" opacity="0.8">CURRENT STREAK</text>"#,
      text_color
    ));

    let streak_color = if streak_days >= 30 { "#ffd700" } else if streak_days >= 7 { "#ff6b6b" } else { text_color };
    svg.push_str(&format!(
      r#"<text x="540" y="520" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="{}" text-anchor="middle">{}</text>"#,
      streak_color, streak_days
    ));

    svg.push_str(&format!(
      r#"<text x="540" y="580" font-family="Arial, sans-serif" font-size="32" fill="{}" text-anchor="middle">DAYS IN A ROW</text>"#,
      text_color
    ));

    // Fire emoji for streak
    svg.push_str(r#"<text x="540" y="680" font-family="Arial, sans-serif" font-size="80" text-anchor="middle">🔥</text>"#);

    // Points section
    svg.push_str(&format!(
      r#"<text x="540" y="860" font-family="Arial, sans-serif" font-size="36" fill="{}" text-anchor="middle" opacity="0.8">TOTAL POINTS</text>"#,
      text_color
    ));

    svg.push_str(&format!(
      r#"<text x="540" y="980" font-family="Arial, sans-serif" font-size="96" font-weight="bold" fill="{}" text-anchor="middle">{}</text>"#,
      text_color, points
    ));

    // Rank (if available)
    if let Some(rank_val) = rank {
      svg.push_str(&format!(
        r#"<text x="540" y="1100" font-family="Arial, sans-serif" font-size="36" fill="{}" text-anchor="middle" opacity="0.8">GLOBAL RANK</text>"#,
        text_color
      ));

      svg.push_str(&format!(
        r#"<text x="540" y="1220" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="{}" text-anchor="middle">#{}</text>"#,
        streak_color, rank_val
      ));
    }

    // BMI (if not hidden)
    if let Some(bmi_val) = bmi {
      if !hide_weight {
        svg.push_str(&format!(
          r#"<text x="540" y="1400" font-family="Arial, sans-serif" font-size="36" fill="{}" text-anchor="middle" opacity="0.8">CURRENT BMI</text>"#,
          text_color
        ));

        svg.push_str(&format!(
          r#"<text x="540" y="1520" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="{}" text-anchor="middle">{:.1}</text>"#,
          text_color, bmi_val
        ));
      }
    }

    // Footer with CTA
    svg.push_str(&format!(
      r#"<text x="540" y="1750" font-family="Arial, sans-serif" font-size="28" fill="{}" text-anchor="middle" opacity="0.6">Join me on AIVO - Your AI Fitness Companion</text>"#,
      text_color
    ));

    // Download link text
    svg.push_str(&format!(
      r#"<text x="540" y="1850" font-family="Arial, sans-serif" font-size="24" fill="{}" text-anchor="middle" opacity="0.5">aivo.app</text>"#,
      text_color
    ));

    svg.push_str("</svg>");
    svg
  }

  /// Generate share card with full user profile data
  #[wasm_bindgen(js_name = "generateShareCard")]
  pub fn generate_share_card(
    user_name: &str,
    profile_data: JsValue,
    options: JsValue,
  ) -> String {
    // Parse options
    let opts: serde_json::Value = serde_wasm_bindgen::from_value(options).unwrap_or_default();

    let streak_days = opts.get("streakDays")
      .and_then(|v| v.as_u64())
      .unwrap_or(0) as u32;

    let points = opts.get("points")
      .and_then(|v| v.as_u64())
      .unwrap_or(0) as u32;

    let rank = opts.get("rank")
      .and_then(|v| v.as_u64())
      .map(|r| r as u32);

    let hide_weight = opts.get("hideWeight")
      .and_then(|v| v.as_bool())
      .unwrap_or(false);

    let theme = opts.get("theme")
      .and_then(|v| v.as_str())
      .unwrap_or("default");

    // Extract BMI from profile data using serde
    #[derive(serde::Deserialize, Default)]
    struct Profile {
      bmi: Option<f64>,
    }
    let profile: Profile = serde_wasm_bindgen::from_value(profile_data).unwrap_or_default();
    let bmi = profile.bmi;

    Self::generate_share_svg(user_name, streak_days, points, rank, bmi, hide_weight, theme)
  }
}

// ============================================
// IMAGE PROCESSING MODULE
// For nutrition photo analysis - resize, compress, validate
// ============================================

/// Image processor for food photo analysis
/// Handles resizing, compression, and validation of food images
#[wasm_bindgen]
pub struct ImageProcessor;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct ImageMetadata {
  width: u32,
  height: u32,
  format: String,
  size_bytes: usize,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct ValidationResult {
  valid: bool,
  reason: Option<String>,
  metadata: Option<ImageMetadata>,
}

#[wasm_bindgen]
impl ImageProcessor {
  /// Decode a base64 image string to raw bytes
  /// Supports data URL format (data:image/jpeg;base64,...) or plain base64
  fn decode_base64(data: &str) -> Result<Vec<u8>, String> {
    // Remove data URL prefix if present
    let base64_str = if let Some(idx) = data.find(',') {
      &data[idx + 1..]
    } else {
      data
    };

    // Decode base64
    use base64::Engine;
    let engine = base64::engine::general_purpose::STANDARD;
    engine
      .decode(base64_str)
      .map_err(|e| format!("Failed to decode base64: {}", e))
  }

  /// Encode raw image bytes to base64 string
  fn encode_base64(bytes: &[u8]) -> String {
    use base64::Engine;
    let engine = base64::engine::general_purpose::STANDARD;
    engine.encode(bytes)
  }

  /// Detect image format from bytes
  fn detect_format(bytes: &[u8]) -> Option<&'static str> {
    if bytes.len() < 4 {
      return None;
    }

    match &bytes[0..4] {
      [0xFF, 0xD8, 0xFF, _] => Some("jpeg"),
      [0x89, 0x50, 0x4E, 0x47] => Some("png"),
      [0x52, 0x49, 0x46, 0x46] if bytes.len() >= 12 => {
        // Check for WEBP: "RIFF....WEBP"
        if bytes[8..12] == *b"WEBP" {
          Some("webp")
        } else {
          None
        }
      }
      _ => None,
    }
  }

  /// Encode image as JPEG with specified quality
  /// Uses direct encoder to avoid Seek requirement
  fn encode_as_jpeg(img: &image::DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    let rgb = img.to_rgb8();
    let (width, height) = rgb.dimensions();
    let raw_bytes = rgb.into_raw();

    let mut buf = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
    encoder
      .encode(&raw_bytes, width, height, image::ColorType::Rgb8)
      .map_err(|e| format!("Failed to encode JPEG: {}", e))?;
    Ok(buf)
  }

  /// Validate that an image is suitable for food analysis
  /// Checks: minimum size, format, reasonable dimensions, max file size
  #[wasm_bindgen(js_name = "validateFoodImage")]
  pub fn validate_food_image(base64_data: &str) -> JsValue {
    let result = Self::do_validate(base64_data);
    to_value(&result).unwrap_or(JsValue::NULL)
  }

  fn do_validate(base64_data: &str) -> ValidationResult {
    // Check for empty input
    if base64_data.is_empty() {
      return ValidationResult {
        valid: false,
        reason: Some("Image data is empty".to_string()),
        metadata: None,
      };
    }

    // Decode base64
    let bytes = match Self::decode_base64(base64_data) {
      Ok(b) => b,
      Err(e) => {
        return ValidationResult {
          valid: false,
          reason: Some(e),
          metadata: None,
        };
      }
    };

    // Check file size (max 10MB)
    const MAX_SIZE: usize = 10 * 1024 * 1024;
    if bytes.len() > MAX_SIZE {
      return ValidationResult {
        valid: false,
        reason: Some(format!(
          "Image too large: {} bytes (max {} allowed)",
          bytes.len(),
          MAX_SIZE
        )),
        metadata: None,
      };
    }

    if bytes.is_empty() {
      return ValidationResult {
        valid: false,
        reason: Some("Decoded image is empty".to_string()),
        metadata: None,
      };
    }

    // Detect format
    let format = match Self::detect_format(&bytes) {
      Some(f) => f,
      None => {
        return ValidationResult {
          valid: false,
          reason: Some("Unsupported image format. Use JPEG, PNG, or WEBP".to_string()),
          metadata: None,
        };
      }
    };

    // Decode image dimensions
    let (width, height) = match image::load_from_memory(&bytes) {
      Ok(img) => {
        let dims = img.dimensions();
        (dims.0, dims.1)
      }
      Err(e) => {
        return ValidationResult {
          valid: false,
          reason: Some(format!("Failed to decode image: {}", e)),
          metadata: None,
        };
      }
    };

    // Check minimum dimensions (at least 100x100)
    if width < 100 || height < 100 {
      return ValidationResult {
        valid: false,
        reason: Some(format!(
          "Image too small: {}x{} (minimum 100x100 required)",
          width, height
        )),
        metadata: Some(ImageMetadata {
          width,
          height,
          format: format.to_string(),
          size_bytes: bytes.len(),
        }),
      };
    }

    // Check aspect ratio (reject extreme panoramas or portraits for food photos)
    let aspect_ratio = width as f64 / height as f64;
    if aspect_ratio > 3.0 || aspect_ratio < 0.33 {
      return ValidationResult {
        valid: false,
        reason: Some(format!(
          "Unusual aspect ratio: {:.2}:1. Food photos typically have aspect ratios between 0.33:1 and 3:1",
          aspect_ratio
        )),
        metadata: Some(ImageMetadata {
          width,
          height,
          format: format.to_string(),
          size_bytes: bytes.len(),
        }),
      };
    }

    // Success
    ValidationResult {
      valid: true,
      reason: None,
      metadata: Some(ImageMetadata {
        width,
        height,
        format: format.to_string(),
        size_bytes: bytes.len(),
      }),
    }
  }

  /// Resize image to maximum dimension while maintaining aspect ratio
  /// Returns base64 encoded JPEG for consistent delivery to AI
  #[wasm_bindgen(js_name = "resizeImage")]
  pub fn resize_image(base64_data: &str, max_dimension: Option<u32>) -> Result<String, JsValue> {
    let max_dim = max_dimension.unwrap_or(1024); // Default 1024px

    if max_dim < 100 {
      return Err(JsValue::from_str("max_dimension must be at least 100"));
    }

    // Decode base64
    let bytes = Self::decode_base64(base64_data)
      .map_err(|e| JsValue::from_str(&format!("Failed to decode: {}", e)))?;

    // Load image
    let img = image::load_from_memory(&bytes)
      .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

    let (width, height) = img.dimensions();

    // Check if resize is needed
    if width <= max_dim && height <= max_dim {
      // Already small enough, just re-encode as JPEG for consistency
      let buf = Self::encode_as_jpeg(&img, 90)
        .map_err(|e| JsValue::from_str(&format!("Failed to re-encode: {}", e)))?;
      return Ok(Self::encode_base64(&buf));
    }

    // Calculate new dimensions maintaining aspect ratio
    let (new_width, new_height) = if width > height {
      let ratio = height as f64 / width as f64;
      (max_dim, (max_dim as f64 * ratio).round() as u32)
    } else {
      let ratio = width as f64 / height as f64;
      ((max_dim as f64 * ratio).round() as u32, max_dim)
    };

    // Resize using high-quality Lanczos3 filter
    let resized = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);

    // Encode as JPEG with 90% quality for optimal AI analysis
    let buf = Self::encode_as_jpeg(&resized, 90)
      .map_err(|e| JsValue::from_str(&format!("Failed to encode JPEG: {}", e)))?;

    Ok(Self::encode_base64(&buf))
  }

  /// Compress image to target quality (1-100)
  /// Higher quality = larger file size, better for AI analysis
  /// Recommended: 85-95 for food photos
  #[wasm_bindgen(js_name = "compressImage")]
  pub fn compress_image(base64_data: &str, quality: Option<u8>) -> Result<String, JsValue> {
    let q = quality.unwrap_or(90).clamp(1, 100);

    // Decode base64
    let bytes = Self::decode_base64(base64_data)
      .map_err(|e| JsValue::from_str(&format!("Failed to decode: {}", e)))?;

    // Load image
    let img = image::load_from_memory(&bytes)
      .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

    // Encode as JPEG with specified quality
    let buf = Self::encode_as_jpeg(&img, q)
      .map_err(|e| JsValue::from_str(&format!("Failed to compress: {}", e)))?;

    Ok(Self::encode_base64(&buf))
  }

  /// Optimize image for AI analysis: resize and compress in one step
  /// - Resizes to max_dimension (default 1024)
  /// - Compresses to quality (default 90)
  /// - Always returns JPEG format for consistent API consumption
  #[wasm_bindgen(js_name = "optimizeForAI")]
  pub fn optimize_for_ai(
    base64_data: &str,
    max_dimension: Option<u32>,
    quality: Option<u8>,
  ) -> Result<String, JsValue> {
    let max_dim = max_dimension.unwrap_or(1024);
    let q = quality.unwrap_or(90).clamp(1, 100);

    if max_dim < 100 {
      return Err(JsValue::from_str("max_dimension must be at least 100"));
    }

    // Decode and load image
    let bytes = Self::decode_base64(base64_data)
      .map_err(|e| JsValue::from_str(&format!("Failed to decode: {}", e)))?;

    let mut img = image::load_from_memory(&bytes)
      .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

    let (width, height) = img.dimensions();

    // Resize if needed
    if width > max_dim || height > max_dim {
      let (new_width, new_height) = if width > height {
        let ratio = height as f64 / width as f64;
        (max_dim, (max_dim as f64 * ratio).round() as u32)
      } else {
        let ratio = width as f64 / height as f64;
        ((max_dim as f64 * ratio).round() as u32, max_dim)
      };

      img = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);
    }

    // Encode as JPEG with quality
    let buf = Self::encode_as_jpeg(&img, q)
      .map_err(|e| JsValue::from_str(&format!("Failed to encode: {}", e)))?;

    Ok(Self::encode_base64(&buf))
  }

  /// Get image metadata without full processing
  #[wasm_bindgen(js_name = "getImageMetadata")]
  pub fn get_image_metadata(base64_data: &str) -> Result<JsValue, JsValue> {
    let bytes = Self::decode_base64(base64_data)
      .map_err(|e| JsValue::from_str(&format!("Failed to decode: {}", e)))?;

    let format = match Self::detect_format(&bytes) {
      Some(f) => f.to_string(),
      None => return Err(JsValue::from_str("Unknown image format")),
    };

    let (width, height) = image::load_from_memory(&bytes)
      .map_err(|e| JsValue::from_str(&format!("Failed to decode image: {}", e)))?
      .dimensions();

    let metadata = ImageMetadata {
      width,
      height,
      format,
      size_bytes: bytes.len(),
    };

    to_value(&metadata)
      .map_err(|_| JsValue::from_str("Failed to serialize metadata"))
  }
}

/// Adaptive routine planner module for AI-powered schedule adjustments
#[wasm_bindgen]
pub struct AdaptivePlanner;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct MuscleGroupData {
    muscle: String,
    soreness: i32,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct PlanDeviationScoreData {
    #[serde(rename = "userId")]
    user_id: String,
    #[serde(rename = "weekStartDate")]
    week_start_date: String,
    #[serde(rename = "overallScore")]
    overall_score: f64,
    #[serde(rename = "missedWorkouts")]
    missed_workouts: i32,
    #[serde(rename = "completionRate")]
    completion_rate: f64,
    #[serde(rename = "averageRPE")]
    average_rpe: f64,
    #[serde(rename = "fatigueAccumulation")]
    fatigue_accumulation: f64,
    #[serde(rename = "muscleFatigue")]
    muscle_fatigue: std::collections::HashMap<String, f64>,
    trend: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct RecoveryCurveProfile {
    muscle: String,
    #[serde(rename = "averageSoreness")]
    average_soreness: f64,
    #[serde(rename = "sorenessTrend")]
    soreness_trend: String,
    #[serde(rename = "recoveryRate")]
    recovery_rate: f64,
    #[serde(rename = "lastNoticed")]
    last_noticed: i64,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct RecoveryCurveData {
    #[serde(rename = "userId")]
    user_id: String,
    #[serde(rename = "generatedAt")]
    generated_at: i64,
    profiles: Vec<RecoveryCurveProfile>,
    #[serde(rename = "overallRecoveryScore")]
    overall_recovery_score: f64,
    #[serde(rename = "recommendedRestDays")]
    recommended_rest_days: i32,
    #[serde(rename = "canTrainIntensity")]
    can_train_intensity: String,
}

/// Workout completion data for deviation calculation
#[derive(serde::Deserialize)]
struct WorkoutCompletionData {
    workout_id: String,
    routine_exercise_id: Option<String>,
    completed: bool,
    #[serde(rename = "completionRate")]
    completion_rate: f64,
    #[serde(rename = "actualSets")]
    actual_sets: Option<i32>,
    #[serde(rename = "actualReps")]
    actual_reps: Option<i32>,
    #[serde(rename = "actualWeight")]
    actual_weight: Option<f64>,
    #[serde(rename = "rpeReported")]
    rpe_reported: Option<f64>,
    #[serde(rename = "skippedReason")]
    skipped_reason: Option<String>,
    notes: Option<String>,
}

/// Planned routine exercise data
#[derive(serde::Deserialize)]
struct RoutineExerciseData {
    id: String,
    #[serde(rename = "routineId")]
    routine_id: String,
    #[serde(rename = "dayOfWeek")]
    day_of_week: i32,
    #[serde(rename = "exerciseName")]
    exercise_name: String,
    #[serde(rename = "exerciseType")]
    exercise_type: String,
    #[serde(rename = "targetMuscleGroups")]
    target_muscle_groups: serde_json::Value,
    sets: Option<i32>,
    reps: Option<i32>,
    weight: Option<f64>,
    rpe: Option<f64>,
    duration: Option<i32>,
    #[serde(rename = "restTime")]
    rest_time: Option<i32>,
    #[serde(rename = "orderIndex")]
    order_index: i32,
    notes: Option<String>,
}

/// Body insight data for recovery analysis
#[derive(serde::Deserialize, Clone)]
struct BodyInsightData {
    id: String,
    #[serde(rename = "userId")]
    user_id: String,
    timestamp: i64,
    source: String,
    #[serde(rename = "recoveryScore")]
    recovery_score: f64,
    #[serde(rename = "fatigueLevel")]
    fatigue_level: i32,
    #[serde(rename = "muscleSoreness")]
    muscle_soreness: serde_json::Value,
    #[serde(rename = "sleepQuality")]
    sleep_quality: i32,
    #[serde(rename = "sleepHours")]
    sleep_hours: f64,
    #[serde(rename = "stressLevel")]
    stress_level: i32,
    #[serde(rename = "hydrationLevel")]
    hydration_level: i32,
    notes: Option<String>,
    #[serde(rename = "rawData")]
    raw_data: Option<String>,
}

#[wasm_bindgen]
impl AdaptivePlanner {
    /// Calculate the Plan Deviation Score from workout completion data
    /// This summarizes how much a user has deviated from their planned routine
    #[wasm_bindgen(js_name = "calculateDeviationScore")]
    pub fn calculate_deviation_score(
        completions_json: &str,
        planned_exercises_json: &str,
    ) -> String {
        let completions: Vec<WorkoutCompletionData> = match serde_json::from_str(completions_json) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Error parsing completions: {}", e);
                return String::new();
            }
        };

        let planned_exercises: Vec<RoutineExerciseData> = match serde_json::from_str(planned_exercises_json) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Error parsing planned exercises: {}", e);
                return String::new();
            }
        };

        let total_planned = planned_exercises.len() as f64;
        if total_planned == 0.0 {
            let empty_score = PlanDeviationScoreData {
                user_id: String::new(),
                week_start_date: String::new(),
                overall_score: 0.0,
                missed_workouts: 0,
                completion_rate: 0.0,
                average_rpe: 0.0,
                fatigue_accumulation: 0.0,
                muscle_fatigue: std::collections::HashMap::new(),
                trend: "on_track".to_string(),
            };
            return serde_json::to_string(&empty_score).unwrap_or_default();
        }

        let mut completed_count = 0;
        let mut total_completion_rate = 0.0;
        let mut total_rpe = 0.0;
        let mut rpe_count = 0;
        let mut missed_workouts = 0;
        let mut muscle_fatigue: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        let mut fatigue_accumulation = 0.0;

        // Build a map of planned exercises for lookup
        let planned_map: std::collections::HashMap<String, &RoutineExerciseData> = planned_exercises
            .iter()
            .map(|ex| (ex.id.clone(), ex))
            .collect();

        for completion in &completions {
            if completion.completed {
                completed_count += 1;
            } else {
                missed_workouts += 1;
                // Accumulate fatigue from missed workouts
                fatigue_accumulation += 0.1;
            }

            total_completion_rate += completion.completion_rate;

            if let Some(rpe) = completion.rpe_reported {
                total_rpe += rpe;
                rpe_count += 1;
            }

            // Track muscle fatigue from skipped reasons
            if !completion.completed {
                if let Some(ref reason) = completion.skipped_reason {
                    if reason == "soreness" || reason == "fatigue" {
                        fatigue_accumulation += 0.15;
                    }
                }
            }

            // Aggregate muscle fatigue from routine exercise targets
            if let Some(routine_ex_id) = &completion.routine_exercise_id {
                if let Some(planned) = planned_map.get(routine_ex_id) {
                    if let Ok(muscle_array) = serde_json::from_value::<Vec<String>>(planned.target_muscle_groups.clone()) {
                        for muscle in muscle_array {
                            *muscle_fatigue.entry(muscle.clone()).or_insert(0.0) += 1.0;
                        }
                    }
                }
            }
        }

        let completion_rate = completed_count as f64 / total_planned;
        let avg_rpe = if rpe_count > 0 { total_rpe / rpe_count as f64 } else { 0.0 };

        // Normalize muscle fatigue (0-1 scale per muscle)
        for (_, value) in muscle_fatigue.iter_mut() {
            *value = (*value / total_planned).min(1.0);
        }

        // Calculate overall deviation score (0-100, where 0 = perfect adherence, 100 = complete deviation)
        let mut overall_score = (1.0 - completion_rate) * 100.0;
        overall_score += fatigue_accumulation * 20.0; // Penalty for fatigue accumulation
        overall_score = overall_score.min(100.0).max(0.0);

        // Determine trend
        let trend = if completion_rate >= 0.9 && fatigue_accumulation < 0.2 {
            "on_track"
        } else if completion_rate >= 0.7 || fatigue_accumulation < 0.4 {
            "slightly_behind"
        } else if completion_rate >= 0.4 {
            "significantly_behind"
        } else {
            "recovery_needed"
        };

        let score_data = PlanDeviationScoreData {
            user_id: String::new(), // Will be filled by caller
            week_start_date: String::new(),
            overall_score,
            missed_workouts: missed_workouts,
            completion_rate,
            average_rpe: avg_rpe,
            fatigue_accumulation,
            muscle_fatigue,
            trend: trend.to_string(),
        };

        serde_json::to_string(&score_data).unwrap_or_default()
    }

    /// Analyze recovery curve based on body insights and muscle groups
    /// Returns recovery profile for each muscle group trained in current routine
    #[wasm_bindgen(js_name = "analyzeRecoveryCurve")]
    pub fn analyze_recovery_curve(
        body_insights_json: &str,
        muscle_groups_json: &str,
    ) -> String {
        let body_insights: Vec<BodyInsightData> = match serde_json::from_str(body_insights_json) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("Error parsing body insights: {}", e);
                return String::new();
            }
        };

        let muscle_groups: Vec<String> = match serde_json::from_str(muscle_groups_json) {
            Ok(m) => m,
            Err(e) => {
                eprintln!("Error parsing muscle groups: {}", e);
                return String::new();
            }
        };

        // Sort insights by timestamp (most recent first)
        let mut sorted_insights = body_insights.clone();
        sorted_insights.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        let now = chrono::Utc::now().timestamp_millis();
        let mut profiles: Vec<RecoveryCurveProfile> = Vec::new();
        let mut total_recovery_score = 0.0;
        let mut recovery_count = 0;

        for muscle in &muscle_groups {
            // Collect soreness data for this muscle from recent insights (last 7 days)
            let seven_days_ago = now - 7 * 24 * 60 * 60 * 1000;
            let recent_soreness: Vec<f64> = sorted_insights.iter()
                .filter(|insight| insight.timestamp >= seven_days_ago)
                .filter_map(|insight| {
                    if let Ok(soreness_map) = serde_json::from_value::<std::collections::HashMap<String, i32>>(insight.muscle_soreness.clone()) {
                        soreness_map.get(muscle).copied().map(|s| s as f64)
                    } else {
                        None
                    }
                })
                .collect();

            let avg_soreness = if recent_soreness.is_empty() {
                0.0
            } else {
                recent_soreness.iter().sum::<f64>() / recent_soreness.len() as f64
            };

            // Determine soreness trend by comparing recent to older
            let thirty_days_ago = now - 30 * 24 * 60 * 60 * 1000;
            let older_soreness: Vec<f64> = sorted_insights.iter()
                .filter(|insight| insight.timestamp >= thirty_days_ago && insight.timestamp < seven_days_ago)
                .filter_map(|insight| {
                    if let Ok(soreness_map) = serde_json::from_value::<std::collections::HashMap<String, i32>>(insight.muscle_soreness.clone()) {
                        soreness_map.get(muscle).copied().map(|s| s as f64)
                    } else {
                        None
                    }
                })
                .collect();

            let older_avg = if older_soreness.is_empty() {
                avg_soreness
            } else {
                older_soreness.iter().sum::<f64>() / older_soreness.len() as f64
            };

            let soreness_trend = if avg_soreness < older_avg * 0.7 {
                "improving"
            } else if avg_soreness > older_avg * 1.3 {
                "worsening"
            } else {
                "stable"
            };

            // Estimate recovery rate: days to return to baseline (soreness < 3)
            let recovery_rate = if avg_soreness < 3.0 {
                1.0
            } else if avg_soreness < 5.0 {
                2.0
            } else if avg_soreness < 7.0 {
                3.0
            } else if avg_soreness < 9.0 {
                5.0
            } else {
                7.0
            };

            // Find last time this muscle was noticed
            let last_noticed = sorted_insights.iter()
                .find(|insight| {
                    if let Ok(soreness_map) = serde_json::from_value::<std::collections::HashMap<String, i32>>(insight.muscle_soreness.clone()) {
                        soreness_map.contains_key(muscle) && soreness_map[muscle] > 0
                    } else {
                        false
                    }
                })
                .map(|insight| insight.timestamp)
                .unwrap_or(0);

            profiles.push(RecoveryCurveProfile {
                muscle: muscle.clone(),
                average_soreness: avg_soreness,
                soreness_trend: soreness_trend.to_string(),
                recovery_rate,
                last_noticed,
            });

            total_recovery_score += (10.0 - avg_soreness).max(0.0) * 10.0;
            recovery_count += 1;
        }

        let overall_recovery_score = if recovery_count > 0 {
            total_recovery_score / recovery_count as f64
        } else {
            50.0 // Default neutral score
        };

        // Calculate recommended rest days based on worst recovering muscle
        let worst_recovery = profiles.iter()
            .map(|p| p.average_soreness)
            .fold(0.0f64, |a, b| a.max(b));

        let recommended_rest_days = if worst_recovery >= 8.0 {
            2
        } else if worst_recovery >= 5.0 {
            1
        } else {
            0
        };

        // Determine training intensity capability
        let can_train_intensity = if overall_recovery_score >= 70.0 {
            "high"
        } else if overall_recovery_score >= 40.0 {
            "moderate"
        } else {
            "low"
        };

        let curve_data = RecoveryCurveData {
            user_id: String::new(),
            generated_at: now,
            profiles,
            overall_recovery_score,
            recommended_rest_days,
            can_train_intensity: can_train_intensity.to_string(),
        };

        serde_json::to_string(&curve_data).unwrap_or_default()
    }

    /// Check if schedule reshuffle is recommended based on deviation and recovery
    #[wasm_bindgen(js_name = "shouldReschedule")]
    pub fn should_reschedule(deviation_json: &str, recovery_json: &str) -> bool {
        let deviation: PlanDeviationScoreData = match serde_json::from_str(deviation_json) {
            Ok(d) => d,
            Err(_) => return false,
        };

        let recovery: RecoveryCurveData = match serde_json::from_str(recovery_json) {
            Ok(r) => r,
            Err(_) => return false,
        };

        // Reschedule if:
        // - Overall deviation score > 40 (significant deviation)
        // - OR recovery score < 50 and trend is recovery_needed
        // - OR recommended rest days > 0
        deviation.overall_score > 40.0 ||
            (recovery.overall_recovery_score < 50.0 && deviation.trend == "recovery_needed") ||
            recovery.recommended_rest_days > 0
    }
}

// ============================================
// BIOMETRIC CORRELATION ANALYSIS MODULE
// ============================================

/// Statistical correlation analyzer for biometric data
/// Identifies hidden patterns between exercise, sleep, nutrition, and recovery
#[wasm_bindgen]
pub struct CorrelationAnalyzer;

/// Daily biometric data point for correlation analysis
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct DailyBiometricData {
    pub date: String,
    pub exercise_load: f64, // Composite score 0-100
    pub sleep_quality: f64, // 0-100
    pub sleep_duration: f64, // hours
    pub calories_consumed: f64,
    pub protein_intake: f64, // grams
    pub carb_intake: f64, // grams
    pub fat_intake: f64, // grams
    pub late_nutrition: f64, // Binary: 1 if meal after 21:00, 0 otherwise
    pub hydration: f64, // ml
    pub recovery_score: f64, // 0-100
    pub body_weight: f64, // kg
    pub body_fat: f64, // percentage
    pub workout_intensity: f64, // RPE-based 0-10 scaled to 0-100
    pub consecutive_days: u32, // Streak count
}

/// Correlation result between two factors
#[derive(serde::Serialize, Clone)]
pub struct CorrelationResult {
    pub factor_a: String,
    pub factor_b: String,
    pub pearson_r: f64, // Correlation coefficient (-1 to 1)
    pub r_squared: f64, // Coefficient of determination (0 to 1)
    pub p_value: f64, // Statistical significance
    pub is_significant: bool,
    pub confidence: f64, // Combined confidence score
}

/// Anomaly detection result
#[derive(serde::Serialize, Clone)]
pub struct AnomalyPoint {
    pub date: String,
    pub factor: String,
    pub observed_value: f64,
    pub expected_value: f64,
    pub z_score: f64, // Standard deviations from mean
    pub deviation_direction: String, // "above" or "below"
}

/// Snapshot aggregates for a time period
#[derive(serde::Serialize, Clone)]
pub struct PeriodAggregates {
    pub period_days: usize,
    pub exercise: ExerciseAggregate,
    pub sleep: SleepAggregate,
    pub nutrition: NutritionAggregate,
    pub body_metrics: BodyMetricsAggregate,
    pub recovery: RecoveryAggregate,
}

#[derive(serde::Serialize, Clone)]
pub struct ExerciseAggregate {
    pub total_workouts: usize,
    pub total_minutes: f64,
    pub avg_duration: f64,
    pub avg_intensity: f64,
    pub intensity_std_dev: f64,
    pub variety_score: f64, // Number of different workout types
    pub rest_days: usize,
    pub consecutive_days_max: u32,
}

#[derive(serde::Serialize, Clone)]
pub struct SleepAggregate {
    pub avg_duration: f64,
    pub duration_std_dev: f64,
    pub avg_quality: f64,
    pub quality_std_dev: f64,
    pub consistency_score: f64, // Lower variance = higher score
    pub bedtime_consistency: f64,
}

#[derive(serde::Serialize, Clone)]
pub struct NutritionAggregate {
    pub avg_calories: f64,
    pub calories_std_dev: f64,
    pub avg_protein: f64,
    pub protein_goal_pct: f64,
    pub avg_carbs: f64,
    pub avg_fat: f64,
    pub macro_balance_score: f64, // How balanced are macros
    pub hydration_avg: f64,
    pub late_night_incidents: usize,
    pub consistency_score: f64,
}

#[derive(serde::Serialize, Clone)]
pub struct BodyMetricsAggregate {
    pub weight_change: f64,
    pub weight_std_dev: f64,
    pub body_fat_change: f64,
    pub body_fat_std_dev: f64,
    pub measurements_completeness: f64, // % of days with data
}

#[derive(serde::Serialize, Clone)]
pub struct RecoveryAggregate {
    pub avg_score: f64,
    pub score_std_dev: f64,
    pub trend: String, // "improving", "declining", "stable"
    pub correlation_with_sleep: f64,
    pub correlation_with_exercise: f64,
    pub correlation_with_nutrition: f64,
}

/// Biometric correlation analysis result
#[derive(serde::Serialize, Clone)]
pub struct CorrelationAnalysis {
    pub snapshot_id: String,
    pub period_days: usize,
    pub data_coverage: f64, // 0-1
    pub aggregates: PeriodAggregates,
    pub significant_correlations: Vec<CorrelationResult>,
    pub anomaly_points: Vec<AnomalyPoint>,
    pub summary: AnalysisSummary,
    pub warnings: Vec<String>,
}

#[derive(serde::Serialize, Clone)]
pub struct AnalysisSummary {
    pub total_factors_analyzed: usize,
    pub significant_correlations_count: usize,
    pub primary_concern: Option<String>,
    pub recommended_action: Option<String>,
    pub risk_level: String, // "low", "medium", "high", "critical"
}

#[wasm_bindgen]
impl CorrelationAnalyzer {
    /// Calculate arithmetic mean of a slice
    fn mean(data: &[f64]) -> f64 {
        if data.is_empty() {
            return 0.0;
        }
        data.iter().sum::<f64>() / data.len() as f64
    }

    /// Calculate standard deviation
    fn std_dev(data: &[f64]) -> f64 {
        if data.len() < 2 {
            return 0.0;
        }
        let mean = Self::mean(data);
        let variance = data.iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f64>() / (data.len() - 1) as f64;
        variance.sqrt()
    }

    /// Calculate Pearson correlation coefficient between two variables
    /// Returns (r, p_value) where p_value is approximate significance
    fn pearson_correlation(x: &[f64], y: &[f64]) -> (f64, f64) {
        if x.len() != y.len() || x.len() < 3 {
            return (0.0, 1.0);
        }

        let n = x.len() as f64;
        let mean_x = Self::mean(x);
        let mean_y = Self::mean(y);

        let mut sum_xy = 0.0;
        let mut sum_x2 = 0.0;
        let mut sum_y2 = 0.0;

        for i in 0..x.len() {
            let dx = x[i] - mean_x;
            let dy = y[i] - mean_y;
            sum_xy += dx * dy;
            sum_x2 += dx * dx;
            sum_y2 += dy * dy;
        }

        if sum_x2 == 0.0 || sum_y2 == 0.0 {
            return (0.0, 1.0);
        }

        let r = sum_xy / (sum_x2.sqrt() * sum_y2.sqrt());

        // Approximate p-value using t-statistic and normal distribution
        // t = r * sqrt((n-2) / (1-r^2))
        let df = n - 2.0;
        let t = r * (df / (1.0 - r * r).max(1e-10)).sqrt();

        // Use normal CDF approximation for p-value (without unstable erf)
        // For two-tailed test: p = 2 * (1 - Φ(|t|))
        // Using Abramowitz & Stegun 26.2.17 polynomial approximation
        let p_value = if t.abs() > 8.0 {
            0.0  // Very small p-value
        } else {
            let abs_t = t.abs();
            // Polynomial approximation constants
            let p = 0.2316419;
            let a1 = 0.319381530;
            let a2 = -0.356563782;
            let a3 = 1.781477937;
            let a4 = -1.821255978;
            let a5 = 1.330274429;

            let t_poly = 1.0 / (1.0 + p * abs_t);
            let poly = t_poly * (a1 + t_poly * (a2 + t_poly * (a3 + t_poly * (a4 + t_poly * a5))));
            let exp_term = (-abs_t * abs_t / 2.0).exp();
            let cdf = 1.0 - 0.3989422804014327 * exp_term * poly;
            let cdf = cdf.max(0.0).min(1.0);
            2.0 * (1.0 - cdf)
        };

        (r.max(-1.0).min(1.0), p_value.min(1.0))
    }

    /// Detect anomalies using Z-score method
    /// Returns points where |z-score| > threshold (default 2.0)
    fn detect_anomalies(data: &[f64], dates: &[String], factor_name: &str, threshold: f64) -> Vec<AnomalyPoint> {
        if data.len() < 5 {
            return Vec::new();
        }

        let mean = Self::mean(data);
        let std = Self::std_dev(data);

        if std == 0.0 {
            return Vec::new(); // No variation, no anomalies
        }

        let mut anomalies = Vec::new();

        for i in 0..data.len() {
            let z = (data[i] - mean) / std;
            if z.abs() > threshold {
                anomalies.push(AnomalyPoint {
                    date: dates[i].clone(),
                    factor: factor_name.to_string(),
                    observed_value: data[i],
                    expected_value: mean,
                    z_score: z,
                    deviation_direction: if z > 0.0 { "above" } else { "below" }.to_string(),
                });
            }
        }

        anomalies
    }

    /// Calculate recovery score from component factors (0-100)
    /// Internal implementation used by both WASM and Rust code
    fn compute_recovery_score_internal(
        sleep_score: f64,
        exercise_balance: f64,
        nutrition_adequacy: f64,
        body_trend: f64,
        _hydration_score: f64
    ) -> f64 {
        // Weighted combination
        let weights = [0.35, 0.25, 0.25, 0.10, 0.05]; // sleep, exercise, nutrition, body, hydration
        let scores = [
            sleep_score.max(0.0).min(100.0),
            exercise_balance.max(0.0).min(100.0),
            nutrition_adequacy.max(0.0).min(100.0),
            body_trend.max(0.0).min(100.0),
            _hydration_score.max(0.0).min(100.0),
        ];

        let weighted_sum: f64 = scores.iter()
            .zip(weights.iter())
            .map(|(s, w)| s * w)
            .sum();

        weighted_sum.round()
    }

    /// Calculate nutrition consistency score (0-100)
    /// Based on variance from targets and meal timing consistency
    fn calculate_nutrition_consistency(
        daily_calories: &[f64],
        targets: &[f64],
        _late_night_count: usize,
        total_days: usize
    ) -> f64 {
        if daily_calories.is_empty() || total_days == 0 {
            return 50.0; // Neutral default
        }

        // Calculate adherence to calorie targets
        let mut adherence_scores = Vec::new();
        for i in 0..daily_calories.len().min(targets.len()) {
            if targets[i] > 0.0 {
                let deviation = (daily_calories[i] - targets[i]).abs() / targets[i];
                let score = (1.0 - deviation.min(1.0)) * 100.0;
                adherence_scores.push(score);
            }
        }

        let avg_adherence = if adherence_scores.is_empty() {
            50.0
        } else {
            Self::mean(&adherence_scores)
        };

        // Penalty for late night eating
        let late_night_ratio = _late_night_count as f64 / total_days as f64;
        let late_night_penalty = late_night_ratio * 20.0; // Up to 20 point penalty

        (avg_adherence - late_night_penalty).max(0.0).min(100.0)
    }

    /// Calculate sleep consistency score (0-100)
    fn calculate_sleep_consistency(durations: &[f64], qualities: &[f64]) -> f64 {
        if durations.len() < 3 {
            return 50.0;
        }

        // Duration variance component (40% weight)
        let duration_std = Self::std_dev(durations);
        let duration_score = if duration_std <= 0.5 {
            100.0
        } else if duration_std >= 2.0 {
            0.0
        } else {
            (1.0 - (duration_std - 0.5) / 1.5) * 100.0
        };

        // Quality component (60% weight)
        let avg_quality = if qualities.is_empty() {
            50.0
        } else {
            Self::mean(qualities)
        };

        // Combined score
        (duration_score * 0.4 + avg_quality * 0.6).round()
    }

    /// Calculate exercise load composite score (0-100)
    fn calculate_exercise_load(
        intensities: &[f64],
        durations: &[f64],
        variety_count: usize,
        rest_days: usize,
        total_days: usize
    ) -> f64 {
        if intensities.is_empty() || total_days == 0 {
            return 0.0;
        }

        // Intensity component (40%)
        let avg_intensity = Self::mean(intensities);
        let intensity_score = avg_intensity * 1.5; // Scale 0-10 to 0-100

        // Duration component (30%)
        let total_minutes: f64 = durations.iter().sum();
        let daily_avg = total_minutes / total_days as f64;
        let duration_score = (daily_avg / 60.0).min(1.0) * 100.0; // Target 60 min/day

        // Variety component (20%)
        let variety_score = (variety_count as f64 / 10.0).min(1.0) * 100.0;

        // Rest day component (10%) - more rest days = better (up to a point)
        let rest_ratio = rest_days as f64 / total_days as f64;
        let rest_score = if rest_ratio >= 0.2 {
            100.0
        } else {
            rest_ratio * 500.0 // 0.2 -> 100, 0.0 -> 0
        };

        (intensity_score * 0.4 + duration_score * 0.3 + variety_score * 0.2 + rest_score * 0.1).round()
    }

    /// Determine if correlation is statistically significant
    /// Using simplified threshold based on sample size and r-value
    fn is_significant(r: f64, n: usize) -> bool {
        if n < 10 {
            return r.abs() > 0.7; // Higher threshold for small samples
        }
        r.abs() > 0.5 // Moderate correlation threshold
    }

    /// Calculate confidence score based on sample size and correlation strength
    fn calculate_confidence(r: f64, n: usize) -> f64 {
        let sample_confidence = (n as f64 / 30.0).min(1.0) * 0.5; // 50% weight for sample size
        let correlation_confidence = r.abs() * 0.5; // 50% weight for correlation strength
        (sample_confidence + correlation_confidence).min(1.0)
    }

    /// Main analysis function: compute all correlations and aggregates
    #[wasm_bindgen(js_name = "analyzeCorrelations")]
    pub fn analyze_correlations(
        data_json: &str, // JSON array of DailyBiometricData
        period_days: usize,
        anomaly_z_threshold: Option<f64>
    ) -> Result<String, JsValue> {
        let z_threshold = anomaly_z_threshold.unwrap_or(2.5);

        // Deserialize input data
        let daily_data: Vec<DailyBiometricData> = match serde_json::from_str(data_json) {
            Ok(d) => d,
            Err(e) => return Err(JsValue::from_str(&format!("Invalid data: {}", e))),
        };

        if daily_data.len() < 7 {
            return Err(JsValue::from_str("Insufficient data: need at least 7 days"));
        }

        // Sort by date
        let mut sorted_data = daily_data.clone();
        sorted_data.sort_by(|a, b| a.date.cmp(&b.date));

        let n = sorted_data.len();

        // Extract time series for each factor
        let dates: Vec<String> = sorted_data.iter().map(|d| d.date.clone()).collect();
        let exercise_load: Vec<f64> = sorted_data.iter().map(|d| d.exercise_load).collect();
        let sleep_quality: Vec<f64> = sorted_data.iter().map(|d| d.sleep_quality).collect();
        let sleep_duration: Vec<f64> = sorted_data.iter().map(|d| d.sleep_duration).collect();
        let calories: Vec<f64> = sorted_data.iter().map(|d| d.calories_consumed).collect();
        let protein: Vec<f64> = sorted_data.iter().map(|d| d.protein_intake).collect();
        let late_nutrition: Vec<f64> = sorted_data.iter().map(|d| d.late_nutrition).collect();
        let hydration: Vec<f64> = sorted_data.iter().map(|d| d.hydration).collect();
        let recovery: Vec<f64> = sorted_data.iter().map(|d| d.recovery_score).collect();
        let workout_intensity: Vec<f64> = sorted_data.iter().map(|d| d.workout_intensity).collect();

        // Calculate aggregates
        let exercise_agg = ExerciseAggregate {
            total_workouts: exercise_load.iter().filter(|&&x| x > 0.0).count(),
            total_minutes: sorted_data.iter().map(|d| d.workout_intensity * 0.5).sum(), // Approximate
            avg_duration: Self::mean(&sorted_data.iter().map(|d| d.exercise_load).collect::<Vec<_>>()),
            avg_intensity: Self::mean(&workout_intensity),
            intensity_std_dev: Self::std_dev(&workout_intensity),
            variety_score: exercise_load.iter().filter(|&&x| x > 20.0).count() as f64,
            rest_days: exercise_load.iter().filter(|&&x| x == 0.0).count(),
            consecutive_days_max: sorted_data.iter().map(|d| d.consecutive_days).max().unwrap_or(0),
        };

        let sleep_agg = SleepAggregate {
            avg_duration: Self::mean(&sleep_duration),
            duration_std_dev: Self::std_dev(&sleep_duration),
            avg_quality: Self::mean(&sleep_quality),
            quality_std_dev: Self::std_dev(&sleep_quality),
            consistency_score: Self::calculate_sleep_consistency(&sleep_duration, &sleep_quality),
            bedtime_consistency: 75.0, // TODO: Calculate from bedtime data
        };

        // Late night nutrition incidents
        let late_night_count = late_nutrition.iter().filter(|&&x| x > 0.0).count();

        let nutrition_agg = NutritionAggregate {
            avg_calories: Self::mean(&calories),
            calories_std_dev: Self::std_dev(&calories),
            avg_protein: Self::mean(&protein),
            protein_goal_pct: 80.0, // TODO: Compare to targets
            avg_carbs: 0.0, // Not tracked in current model
            avg_fat: 0.0,
            macro_balance_score: 70.0, // TODO: Calculate actual balance
            hydration_avg: Self::mean(&hydration),
            late_night_incidents: late_night_count,
            consistency_score: Self::calculate_nutrition_consistency(
                &calories,
                &vec![2000.0; n], // Placeholder targets
                late_night_count,
                n
            ),
        };

        let body_metrics_agg = BodyMetricsAggregate {
            weight_change: sorted_data.last().map(|d| d.body_weight).unwrap_or(0.0) -
                          sorted_data.first().map(|d| d.body_weight).unwrap_or(0.0),
            weight_std_dev: Self::std_dev(&sorted_data.iter().map(|d| d.body_weight).collect::<Vec<_>>()),
            body_fat_change: sorted_data.last().map(|d| d.body_fat).unwrap_or(0.0) -
                            sorted_data.first().map(|d| d.body_fat).unwrap_or(0.0),
            body_fat_std_dev: Self::std_dev(&sorted_data.iter().map(|d| d.body_fat).collect::<Vec<_>>()),
            measurements_completeness: 1.0, // All fields present in model
        };

        // Calculate correlations of interest
        let mut significant_correlations = Vec::new();

        // Sleep quality vs Recovery
        let (r_sleep_rec, p_sleep_rec) = Self::pearson_correlation(&sleep_quality, &recovery);
        if Self::is_significant(r_sleep_rec, n) {
            significant_correlations.push(CorrelationResult {
                factor_a: "sleep_quality".to_string(),
                factor_b: "recovery_score".to_string(),
                pearson_r: r_sleep_rec,
                r_squared: r_sleep_rec * r_sleep_rec,
                p_value: p_sleep_rec,
                is_significant: true,
                confidence: Self::calculate_confidence(r_sleep_rec, n),
            });
        }

        // Late nutrition vs Recovery
        let (r_late_rec, p_late_rec) = Self::pearson_correlation(&late_nutrition, &recovery);
        if Self::is_significant(r_late_rec, n) {
            significant_correlations.push(CorrelationResult {
                factor_a: "late_nutrition".to_string(),
                factor_b: "recovery_score".to_string(),
                pearson_r: r_late_rec,
                r_squared: r_late_rec * r_late_rec,
                p_value: p_late_rec,
                is_significant: true,
                confidence: Self::calculate_confidence(r_late_rec, n),
            });
        }

        // Exercise intensity vs Recovery (expected negative)
        let (r_ex_rec, p_ex_rec) = Self::pearson_correlation(&workout_intensity, &recovery);
        if Self::is_significant(r_ex_rec, n) {
            significant_correlations.push(CorrelationResult {
                factor_a: "workout_intensity".to_string(),
                factor_b: "recovery_score".to_string(),
                pearson_r: r_ex_rec,
                r_squared: r_ex_rec * r_ex_rec,
                p_value: p_ex_rec,
                is_significant: true,
                confidence: Self::calculate_confidence(r_ex_rec, n),
            });
        }

        // Sleep duration vs Recovery
        let (r_sleep_dur_rec, p_sleep_dur_rec) = Self::pearson_correlation(&sleep_duration, &recovery);
        if Self::is_significant(r_sleep_dur_rec, n) {
            significant_correlations.push(CorrelationResult {
                factor_a: "sleep_duration".to_string(),
                factor_b: "recovery_score".to_string(),
                pearson_r: r_sleep_dur_rec,
                r_squared: r_sleep_dur_rec * r_sleep_dur_rec,
                p_value: p_sleep_dur_rec,
                is_significant: true,
                confidence: Self::calculate_confidence(r_sleep_dur_rec, n),
            });
        }

        // Detect anomalies
        let mut anomaly_points = Vec::new();
        anomaly_points.append(&mut Self::detect_anomalies(&recovery, &dates, "recovery_score", z_threshold));
        anomaly_points.append(&mut Self::detect_anomalies(&sleep_quality, &dates, "sleep_quality", z_threshold));

        // Build aggregates
        let aggregates = PeriodAggregates {
            period_days: n,
            exercise: exercise_agg,
            sleep: sleep_agg,
            nutrition: nutrition_agg,
            body_metrics: body_metrics_agg,
            recovery: RecoveryAggregate {
                avg_score: Self::mean(&recovery),
                score_std_dev: Self::std_dev(&recovery),
                trend: "stable".to_string(), // TODO: Calculate from slope
                correlation_with_sleep: r_sleep_rec,
                correlation_with_exercise: r_ex_rec,
                correlation_with_nutrition: r_late_rec,
            },
        };

        // Generate summary and warnings
        let (summary, warnings) = Self::generate_summary(&aggregates, &significant_correlations, &anomaly_points);

        let analysis = CorrelationAnalysis {
            snapshot_id: "temp".to_string(), // Will be set by caller
            period_days: n,
            data_coverage: 1.0, // All days present in this simplified model
            aggregates,
            significant_correlations,
            anomaly_points,
            summary,
            warnings,
        };

        Ok(serde_json::to_string(&analysis).unwrap_or_default())
    }

    /// Generate human-readable summary from analysis results
    fn generate_summary(
        aggregates: &PeriodAggregates,
        correlations: &[CorrelationResult],
        anomalies: &[AnomalyPoint]
    ) -> (AnalysisSummary, Vec<String>) {
        let mut warnings = Vec::new();
        let mut risk_level = "low".to_string();

        // Check recovery score
        if aggregates.recovery.avg_score < 50.0 {
            warnings.push("low_recovery_score".to_string());
            risk_level = "medium".to_string();
        }
        if aggregates.recovery.avg_score < 30.0 {
            warnings.push("critical_recovery_score".to_string());
            risk_level = "high".to_string();
        }

        // Check sleep consistency
        if aggregates.sleep.consistency_score < 50.0 {
            warnings.push("poor_sleep_consistency".to_string());
        }

        // Check late night eating
        if aggregates.nutrition.late_night_incidents > 3 {
            warnings.push("frequent_late_nutrition".to_string());
            risk_level = "high".to_string(); // Override if frequent
        }

        // Check exercise balance
        if aggregates.exercise.rest_days == 0 {
            warnings.push("no_rest_days".to_string());
            risk_level = "high".to_string();
        }

        // Find primary concern based on strongest negative correlation
        let primary_concern = correlations.iter()
            .filter(|c| c.factor_a == "late_nutrition" || c.factor_a == "workout_intensity")
            .filter(|c| c.pearson_r < -0.6)
            .max_by(|a, b| a.pearson_r.abs().partial_cmp(&b.pearson_r.abs()).unwrap())
            .map(|c| format!("{} negatively impacts recovery (r={:.2})", c.factor_a, c.pearson_r));

        // Generate recommended action
        let recommended_action = if let Some(ref concern) = primary_concern {
            if concern.contains("late_nutrition") {
                Some("Avoid eating within 3 hours of bedtime to improve recovery".to_string())
            } else if concern.contains("workout_intensity") {
                Some("Consider reducing workout intensity or adding more rest days".to_string())
            } else {
                Some("Focus on improving sleep quality and consistency".to_string())
            }
        } else if !warnings.is_empty() {
            Some("Address recovery warnings to optimize performance".to_string())
        } else {
            None
        };

        let summary = AnalysisSummary {
            total_factors_analyzed: 8, // exercise, sleep, nutrition, recovery, etc.
            significant_correlations_count: correlations.len(),
            primary_concern,
            recommended_action,
            risk_level,
        };

        (summary, warnings)
    }

    /// Calculate recovery score from raw biometric data (convenience method)
    #[wasm_bindgen(js_name = "calculateRecoveryScore")]
    pub fn calculate_recovery_score(
        sleep_quality: f64,
        sleep_duration: f64,
        exercise_intensity: f64,
        calories_adequate: f64, // 0-1 ratio of target met
        hydration_adequate: f64 // 0-1 ratio of target met
    ) -> f64 {
        // Normalize inputs to 0-100
        let sleep_score = sleep_quality.max(0.0).min(100.0) * 0.6 + // Quality is primary
                         (sleep_duration.min(9.0).max(7.0) / 9.0) * 100.0 * 0.4; // 7-9 hours ideal

        // Exercise load - optimal range, penalize both under and over
        let exercise_score = if exercise_intensity < 30.0 {
            // Under-training penalty
            50.0 + exercise_intensity
        } else if exercise_intensity <= 70.0 {
            // Optimal zone
            80.0 + (70.0 - exercise_intensity).abs() * 0.5
        } else {
            // Overtraining penalty
            (100.0 - exercise_intensity).max(20.0)
        };

        // Nutrition and hydration
        let nutrition_score = (calories_adequate * 0.5 + hydration_adequate * 0.5) * 100.0;
        let hydration_score = hydration_adequate * 100.0;

        // Combine with weights
        Self::compute_recovery_score_internal(
            sleep_score,
            exercise_score,
            nutrition_score,
            75.0, // Body metrics trend placeholder
            hydration_score
        )
    }
}

// ============================================
// END OF BIOMETRIC CORRELATION MODULE
// ==========================================

// ============================================
// VOICE-TO-ACTION PARSER MODULE
// ============================================

/// Natural language parser for voice-entered fitness and nutrition data
/// Parses free-form text like "Had a bowl of Pho for breakfast, did 3 sets of bench press"
/// into structured data matching D1 database schemas
#[wasm_bindgen]
pub struct VoiceParser;

/// Parsed food log entry
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ParsedFoodEntry {
    pub meal_type: Option<String>,
    pub food_name: String,
    pub estimated_calories: Option<f64>,
    pub protein_g: Option<f64>,
    pub carbs_g: Option<f64>,
    pub fat_g: Option<f64>,
    pub fiber_g: Option<f64>,
    pub confidence: f64, // 0-1 parsing confidence
    pub portion_size: Option<String>, // e.g., "1 bowl", "200g"
}

/// Parsed workout entry
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ParsedWorkoutEntry {
    pub workout_type: Option<String>,
    pub exercise_name: String,
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>,
    pub weight_unit: Option<String>, // "kg", "lbs"
    pub duration_minutes: Option<i32>,
    pub rpe: Option<f64>, // Rate of Perceived Exertion 1-10
    pub confidence: f64,
}

/// Parsed body metric entry
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ParsedBodyMetric {
    pub metric_type: String, // "weight", "body_fat", " waist", etc.
    pub value: f64,
    pub unit: String, // "kg", "cm", "%"
    pub confidence: f64,
}

/// Complete voice entry parse result
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct VoiceParseResult {
    pub has_food: bool,
    pub has_workout: bool,
    pub has_body_metric: bool,
    pub food_entries: Vec<ParsedFoodEntry>,
    pub workout_entries: Vec<ParsedWorkoutEntry>,
    pub body_metrics: Vec<ParsedBodyMetric>,
    pub detected_meal_type: Option<String>, // inferred from context
    pub detected_workout_type: Option<String>,
    pub overall_confidence: f64,
    pub needs_clarification: bool, // true if ambiguous, requires user confirmation
    pub clarification_questions: Vec<String>,
}

/// Common food database for calorie and macro estimation
const FOOD_DB: &[(&str, f64, f64, f64, f64)] = &[
    // Format: (name, calories per 100g, protein_g, carbs_g, fat_g)
    ("pho", 150.0, 8.0, 20.0, 3.0),
    ("banh mi", 250.0, 10.0, 30.0, 10.0),
    ("rice", 130.0, 2.7, 28.0, 0.3),
    ("chicken breast", 165.0, 31.0, 0.0, 3.6),
    ("chicken", 165.0, 31.0, 0.0, 3.6),
    ("beef", 250.0, 26.0, 0.0, 15.0),
    ("salmon", 208.0, 20.0, 0.0, 13.0),
    ("salad", 30.0, 1.5, 5.0, 0.2),
    ("egg", 155.0, 13.0, 1.1, 11.0),
    ("bread", 265.0, 9.0, 49.0, 3.2),
    ("oatmeal", 389.0, 16.9, 66.0, 6.9),
    ("banana", 89.0, 1.1, 22.8, 0.3),
    ("apple", 52.0, 0.3, 13.8, 0.2),
    ("coffee", 2.0, 0.3, 0.0, 0.0),
    ("espresso", 1.0, 0.1, 0.0, 0.0),
    ("milk", 61.0, 3.2, 4.8, 3.3),
    ("cheese", 402.0, 25.0, 1.3, 33.0),
    ("yogurt", 61.0, 3.5, 4.7, 3.3),
    ("pasta", 158.0, 5.8, 31.0, 0.9),
    ("pizza", 266.0, 11.0, 33.0, 10.0),
    ("burger", 250.0, 17.0, 30.0, 12.0),
    ("fries", 312.0, 3.4, 41.0, 17.0),
    ("protein shake", 120.0, 25.0, 5.0, 1.0),
    ("whey protein", 120.0, 24.0, 3.0, 1.0),
];

/// Common exercise name variations mapped to standardized names
const EXERCISE_ALIASES: &[(&str, &str, &str)] = &[
    ("bench", "bench press", "strength"),
    ("bench press", "bench press", "strength"),
    ("bpress", "bench press", "strength"),
    ("squat", "squat", "strength"),
    ("back squat", "squat", "strength"),
    ("front squat", "front squat", "strength"),
    ("deadlift", "deadlift", "strength"),
    ("dl", "deadlift", "strength"),
    ("overhead press", "overhead press", "strength"),
    ("ohp", "overhead press", "strength"),
    ("shoulder press", "overhead press", "strength"),
    ("pull up", "pull-up", "strength"),
    ("pullup", "pull-up", "strength"),
    ("chin up", "chin-up", "strength"),
    ("chinup", "chin-up", "strength"),
    ("push up", "push-up", "bodyweight"),
    ("pushup", "push-up", "bodyweight"),
    ("lunge", "lunge", "strength"),
    ("leg press", "leg press", "strength"),
    ("leg extension", "leg extension", "strength"),
    ("leg curl", "leg curl", "strength"),
    (" calf raise", "calf raise", "strength"),
    ("bicep curl", "bicep curl", "strength"),
    ("curl", "bicep curl", "strength"),
    ("tricep extension", "tricep extension", "strength"),
    ("skull crusher", "tricep extension", "strength"),
    ("rowing", "rowing", "cardio"),
    ("run", "running", "cardio"),
    ("running", "running", "cardio"),
    ("jog", "jogging", "cardio"),
    ("jogging", "jogging", "cardio"),
    ("cycle", "cycling", "cardio"),
    ("cycling", "cycling", "cardio"),
    ("bike", "cycling", "cardio"),
    ("swim", "swimming", "cardio"),
    ("swimming", "swimming", "cardio"),
    ("yoga", "yoga", "mobility"),
    ("stretch", "stretching", "mobility"),
    ("stretching", "stretching", "mobility"),
    ("mobility", "mobility work", "mobility"),
    ("plank", "plank", "core"),
    ("core", "core workout", "core"),
    ("abs", "core workout", "core"),
];

#[wasm_bindgen]
impl VoiceParser {
    /// Parse voice/text input into structured fitness and nutrition data
    #[wasm_bindgen(js_name = "parseVoiceEntry")]
    pub fn parse_voice_entry(text: &str, context_hint: Option<String>) -> String {
        let text_lower = text.to_lowercase();
        let mut result = VoiceParseResult {
            has_food: false,
            has_workout: false,
            has_body_metric: false,
            food_entries: Vec::new(),
            workout_entries: Vec::new(),
            body_metrics: Vec::new(),
            detected_meal_type: None,
            detected_workout_type: None,
            overall_confidence: 0.0,
            needs_clarification: false,
            clarification_questions: Vec::new(),
        };

        // Detect meal context from time references
        result.detected_meal_type = Self::detect_meal_type(&text_lower, context_hint.as_deref());

        // Parse food entries
        result.food_entries = Self::parse_food_entries(&text_lower);
        result.has_food = !result.food_entries.is_empty();

        // Parse workout entries
        result.workout_entries = Self::parse_workout_entries(&text_lower);
        result.has_workout = !result.workout_entries.is_empty();

        // Parse body metrics
        result.body_metrics = Self::parse_body_metrics(&text_lower);
        result.has_body_metric = !result.body_metrics.is_empty();

        // Detect overall workout type if multiple exercises
        if result.workout_entries.len() >= 2 {
            result.detected_workout_type = Self::infer_workout_type(&result.workout_entries);
        } else if let Some(ref entry) = result.workout_entries.first() {
            result.detected_workout_type = entry.workout_type.clone();
        }

        // Calculate overall confidence
        result.overall_confidence = Self::calculate_overall_confidence(&result);

        // Check if clarification is needed
        (result.needs_clarification, result.clarification_questions) = Self::assess_clarification_needs(&result);

        serde_json::to_string(&result).unwrap_or_default()
    }

    /// Extract food items from text with nutritional estimates
    fn parse_food_entries(text: &str) -> Vec<ParsedFoodEntry> {
        let mut entries: Vec<ParsedFoodEntry> = Vec::new();
        let mut has_multiple = false;

        // Meal type keywords
        let meal_types = [
            ("breakfast", ["breakfast", "morning", "when i woke", "upon waking"]),
            ("lunch", ["lunch", "midday", "noon", "for lunch"]),
            ("dinner", ["dinner", "evening", "tonight", "for dinner"]),
            ("snack", ["snack", "between", "munch", "quick bite"]),
        ];

        // Detect meal type from context
        let detected_meal = meal_types.iter()
            .find(|(_, keywords)| keywords.iter().any(|kw| text.contains(kw)))
            .map(|(mt, _)| mt.to_string());

        // Check for "had a bowl of pho" pattern
        let portion_patterns = [
            (r"(?:had|ate|consumed|enjoyed|tried)\s+(?:a\s+)?(?:bowl|cup|plate|serving|piece|slice)\s+of\s+(\w+)", "1"),
            (r"(?:had|ate)\s+(\d+)\s+(\w+)", "numeric"),
            (r"(?:had|ate)\s+(\w+)(?:\s+with\s+(\w+))?", "simple"),
            (r"(\w+)\s+for\s+(breakfast|lunch|dinner|snack)", "meal_stated"),
        ];

        // Collect all potential food mentions
        let food_keywords = ["ate", "had", "consumed", "enjoyed", "tried", "bowl", "cup", "plate"];
        let has_food_action = food_keywords.iter().any(|kw| text.contains(kw));

        if has_food_action {
            // Simple extraction: look for common food names in FOOD_DB
            for (food_name, calories, protein, carbs, fat) in FOOD_DB {
                if text.contains(food_name) {
                    let confidence = if text.contains(&format!("bowl of {}", food_name)) ||
                                       text.contains(&format!("plate of {}", food_name)) {
                        0.9
                    } else if text.contains(food_name) {
                        0.7
                    } else {
                        0.5
                    };

                    // Parse portion if mentioned
                    let (portion, portion_mult) = Self::parse_portion(text, food_name);

                    let entry = ParsedFoodEntry {
                        meal_type: detected_meal.clone(),
                        food_name: food_name.to_string(),
                        estimated_calories: Some(calories * portion_mult / 100.0 * 200.0), // Default 200g serving
                        protein_g: Some(protein * portion_mult / 100.0 * 200.0),
                        carbs_g: Some(carbs * portion_mult / 100.0 * 200.0),
                        fat_g: Some(fat * portion_mult / 100.0 * 200.0),
                        fiber_g: None,
                        confidence,
                        portion_size: portion,
                    };
                    entries.push(entry);
                }
            }
        }

        // Handle comma-separated lists: "ate chicken and rice"
        if entries.is_empty() && has_food_action {
            // Look for conjunction patterns
            let conjunction_words = [" and ", " with ", " plus ", " & "];
            let has_conjunction = conjunction_words.iter().any(|c| text.contains(c));

            if has_conjunction {
                for (food_name, calories, protein, carbs, fat) in FOOD_DB {
                    if text.contains(food_name) {
                        let entry = ParsedFoodEntry {
                            meal_type: detected_meal.clone(),
                            food_name: food_name.to_string(),
                            estimated_calories: Some(calories * 1.5), // Shared meal portion
                            protein_g: Some(protein * 1.5),
                            carbs_g: Some(carbs * 1.5),
                            fat_g: Some(fat * 1.5),
                            fiber_g: None,
                            confidence: 0.6,
                            portion_size: Some("shared meal".to_string()),
                        };
                        entries.push(entry);
                    }
                }
            }
        }

        entries
    }

    /// Parse portion size from text
    fn parse_portion(text: &str, food_name: &str) -> (Option<String>, f64) {
        let patterns = [
            (r"(\d+)\s*(?:g|grams?|gram)", 1.0), // "200g"
            (r"(\d+)\s*(?:oz|ounce|ounces)", 28.35), // "8oz"
            (r"bowl\s+of", 250.0), // "bowl of pho" ~250g
            (r"cup\s+of", 240.0), // "cup of rice" ~240g
            (r"plate\s+of", 350.0), // "plate of" ~350g
            (r"small", 150.0),
            (r"medium", 250.0),
            (r"large", 400.0),
            (r"one", 200.0),
            (r"two", 400.0),
            (r"three", 600.0),
        ];

        for (pattern, multiplier) in patterns.iter() {
            let regex = regex::Regex::new(&format!(r"(?i){}", pattern)).unwrap();
            if let Some(caps) = regex.captures(text) {
                if let Some(m) = caps.get(1) {
                    if let Ok(num) = m.as_str().parse::<f64>() {
                        return (Some(format!("{}{}", m.as_str(), if *multiplier == 1.0 { "g" } else { "" })), num * multiplier);
                    }
                } else {
                    return (Some(pattern.to_string()), *multiplier);
                }
            }
        }

        (None, 1.0) // Default 1x serving
    }

    /// Parse workout entries from text
    fn parse_workout_entries(text: &str) -> Vec<ParsedWorkoutEntry> {
        let mut entries = Vec::new();

        // Workout context detection
        let workout_indicators = ["worked out", " exercised", "did", "training", "gym", "lifted", "session"];
        let is_workout_context = workout_indicators.iter().any(|kw| text.contains(kw));

        if !is_workout_context {
            return entries;
        }

        // Look for exercise patterns: "3 sets of 10 reps bench press 100kg"
        let exercise_patterns = [
            // "3 sets of 10 reps bench press"
            r"(\d+)\s*sets?\s+of\s+(\d+)\s*reps?\s+(.+?)(?:\s+(\d+)\s*(?:kg|lbs|lb)?)?",
            // "bench press 3x10 100kg"
            r"(.+?)\s+(\d+)[x×]\s*(\d+)(?:\s+(\d+)\s*(?:kg|lbs|lb)?)?",
            // "did bench press 100kg for 3 sets of 10"
            r"did\s+(.+?)\s+(\d+)\s*(?:kg|lbs|lb)?(?:\s+for\s+(\d+)\s*sets?\s+of\s+(\d+))?",
            // "squat: 4x8 @ 140kg"
            r"(.+?):\s*(\d+)[x×]\s*(\d+)(?:\s*@\s*(\d+))?",
        ];

        // Split by common delimiters to find individual exercises
        // First split by commas and semicolons, then by multi-word separators
        let mut exercise_segments: Vec<&str> = Vec::new();
        for part in text.split(|c| c == ',' || c == ';') {
            for sub in part.split(" and ") {
                for sub2 in sub.split(" with ") {
                    let trimmed = sub2.trim();
                    if !trimmed.is_empty() {
                        exercise_segments.push(trimmed);
                    }
                }
            }
        }

        for segment in exercise_segments {
            let seg_lower: String = segment.to_lowercase();
            if seg_lower.trim().is_empty() {
                continue;
            }

            // Try to match exercise pattern
            let mut found_exercise = false;

            // Check each alias
            for (alias, std_name, ex_type) in EXERCISE_ALIASES.iter() {
                if seg_lower.contains(alias) {
                    let (sets, reps, weight) = Self::extract_sets_reps_weight(segment);

                    // Estimate workout type from exercise if not provided
                    let workout_type = if seg_lower.contains("run") || seg_lower.contains("cardio") {
                        "cardio"
                    } else if seg_lower.contains("yoga") || seg_lower.contains("stretch") {
                        "mobility"
                    } else {
                        ex_type
                    }.to_string();

                    let entry = ParsedWorkoutEntry {
                        workout_type: Some(workout_type),
                        exercise_name: std_name.to_string(),
                        sets,
                        reps,
                        weight,
                        weight_unit: seg_lower.contains("kg").then(|| "kg".to_string())
                            .or_else(|| seg_lower.contains("lb").then(|| "lb".to_string())),
                        duration_minutes: None,
                        rpe: Self::extract_rpe(segment),
                        confidence: 0.85,
                    };
                    entries.push(entry);
                    found_exercise = true;
                    break;
                }
            }

            // Check for weight/reps without explicit exercise name (assume from context)
            if !found_exercise && Self::has_reps_weights(segment) {
                // Try to extract exercise name before the numbers
                let words: Vec<&str> = seg_lower.split_whitespace().collect();
                for (alias, std_name, ex_type) in EXERCISE_ALIASES.iter() {
                    if words.iter().any(|w| w.contains(alias)) {
                        let (sets, reps, weight) = Self::extract_sets_reps_weight(segment);
                        let entry = ParsedWorkoutEntry {
                            workout_type: Some(ex_type.to_string()),
                            exercise_name: std_name.to_string(),
                            sets,
                            reps,
                            weight,
                            weight_unit: None,
                            duration_minutes: None,
                            rpe: Self::extract_rpe(segment),
                            confidence: 0.7,
                        };
                        entries.push(entry);
                        found_exercise = true;
                        break;
                    }
                }
            }
        }

        entries
    }

    /// Extract sets, reps, and weight from exercise text
    fn extract_sets_reps_weight(text: &str) -> (Option<i32>, Option<i32>, Option<f64>) {
        let text_lower = text.to_lowercase();

        // Pattern: "3 sets of 10 reps 100kg"
        let re1 = regex::Regex::new(r"(\d+)\s*sets?\s+of\s+(\d+)\s*reps?").unwrap();
        if let Some(caps) = re1.captures(&text_lower) {
            let sets = caps.get(1).and_then(|m| m.as_str().parse().ok());
            let reps = caps.get(2).and_then(|m| m.as_str().parse().ok());

            // Look for weight after the sets/reps
            let weight_re = regex::Regex::new(r"(\d+(?:\.\d+)?)\s*(?:kg|lbs|lb)").unwrap();
            let weight = weight_re.find(&text_lower)
                .and_then(|m| m.as_str().split_whitespace().next().and_then(|w| w.parse().ok()));

            return (sets, reps, weight);
        }

        // Pattern: "3x10 @ 100kg" or "3x10 100kg"
        let re2 = regex::Regex::new(r"(\d+)[x×]\s*(\d+)").unwrap();
        if let Some(caps) = re2.captures(&text_lower) {
            let sets = caps.get(1).and_then(|m| m.as_str().parse().ok());
            let reps = caps.get(2).and_then(|m| m.as_str().parse().ok());

            let weight_re = regex::Regex::new(r"(\d+(?:\.\d+)?)\s*(?:kg|lbs|lb)").unwrap();
            let weight = weight_re.find(&text_lower)
                .and_then(|m| m.as_str().split_whitespace().next().and_then(|w| w.parse().ok()));

            return (sets, reps, weight);
        }

        // Just weight mentioned: "bench press 100kg"
        if !text_lower.contains("sets") && !text_lower.contains("reps") {
            let weight_re = regex::Regex::new(r"(\d+(?:\.\d+)?)\s*(?:kg|lbs|lb)").unwrap();
            if let Some(m) = weight_re.find(&text_lower) {
                if let Some(weight) = m.as_str().split_whitespace().next().and_then(|w| w.parse().ok()) {
                    return (Some(3), Some(10), Some(weight)); // Default 3x10
                }
            }
        }

        (None, None, None)
    }

    /// Check if text contains reps/weights pattern
    fn has_reps_weights(text: &str) -> bool {
        let text_lower = text.to_lowercase();
        text_lower.contains("set") || text_lower.contains("rep") ||
        regex::Regex::new(r"\d+\s*(?:kg|lbs|lb)").unwrap().is_match(&text_lower)
    }

    /// Extract RPE (Rate of Perceived Exertion) from text
    fn extract_rpe(text: &str) -> Option<f64> {
        let re = regex::Regex::new(r"rpe\s*(?:of\s*)?(\d+)").unwrap();
        re.find(text)
            .and_then(|m| m.as_str().split_whitespace().last().and_then(|w| w.parse().ok()))
            .or_else(|| {
                // Check for "at an 8" style
                let re2 = regex::Regex::new(r"at\s+an?\s+(\d+)").unwrap();
                re2.find(text)
                    .and_then(|m| m.as_str().split_whitespace().last().and_then(|w| w.parse().ok()))
            })
            .filter(|&n| (1.0..=10.0).contains(&n))
    }

    /// Parse body metrics from text
    fn parse_body_metrics(text: &str) -> Vec<ParsedBodyMetric> {
        let mut metrics = Vec::new();

        // Weight: "weigh 70kg", "weight is 70 kg", "70 kilograms"
        let weight_patterns = [
            r"(?:weigh(?:s|ed)?\s+(?:about\s+)?)(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|lb|lbs|pounds?)",
            r"(?:weight(?: is| was)?\s+)(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|lb|lbs|pounds?)",
            r"(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|lb|lbs|pounds?)\s+(?:weigh|weight)",
        ];

        for pattern in weight_patterns.iter() {
            let re = regex::Regex::new(pattern).unwrap();
            if let Some(caps) = re.captures(text) {
                if let Some(value) = caps.get(1).and_then(|m| m.as_str().parse::<f64>().ok()) {
                    let unit = if text.contains("kg") || text.contains("kilo") { "kg" } else { "lb" };
                    let weight_kg = if unit == "lb" { value * 0.453592 } else { value };
                    metrics.push(ParsedBodyMetric {
                        metric_type: "weight".to_string(),
                        value: weight_kg,
                        unit: "kg".to_string(),
                        confidence: 0.85,
                    });
                    break;
                }
            }
        }

        // Body fat: "body fat 15%", "bf 15 percent"
        let bf_patterns = [
            r"(?:body\s+fat|bf|bodyfat)\s+(?:is\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent)?",
            r"(\d+(?:\.\d+)?)\s*%\s+(?:body\s+fat|bf)",
        ];

        for pattern in bf_patterns.iter() {
            let re = regex::Regex::new(pattern).unwrap();
            if let Some(caps) = re.captures(text) {
                if let Some(value) = caps.get(1).and_then(|m| m.as_str().parse::<f64>().ok()) {
                    metrics.push(ParsedBodyMetric {
                        metric_type: "body_fat".to_string(),
                        value,
                        unit: "%".to_string(),
                        confidence: 0.80,
                    });
                    break;
                }
            }
        }

        // Other metrics could be added: waist, muscle mass, etc.

        metrics
    }

    /// Detect meal type from context
    fn detect_meal_type(text: &str, context_hint: Option<&str>) -> Option<String> {
        if let Some(hint) = context_hint {
            return Some(hint.to_string());
        }

        let morning_keywords = ["breakfast", "morning", "woke up", "upon waking", "am", "a.m."];
        let afternoon_keywords = ["lunch", "noon", "midday", "afternoon", "pm"];
        let evening_keywords = ["dinner", "evening", "tonight", "night", "supper"];

        let text_lower = text.to_lowercase();

        if morning_keywords.iter().any(|kw| text_lower.contains(kw)) {
            return Some("breakfast".to_string());
        }
        if afternoon_keywords.iter().any(|kw| text_lower.contains(kw)) {
            return Some("lunch".to_string());
        }
        if evening_keywords.iter().any(|kw| text_lower.contains(kw)) {
            return Some("dinner".to_string());
        }

        None
    }

    /// Infer overall workout type from exercises
    fn infer_workout_type(entries: &[ParsedWorkoutEntry]) -> Option<String> {
        let mut type_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

        for entry in entries {
            if let Some(ref wtype) = entry.workout_type {
                *type_counts.entry(wtype.clone()).or_insert(0) += 1;
            }
        }

        type_counts.into_iter()
            .max_by_key(|(_, count)| *count)
            .map(|(wtype, _)| wtype)
    }

    /// Calculate overall confidence in the parse
    fn calculate_overall_confidence(result: &VoiceParseResult) -> f64 {
        let mut scores = Vec::new();

        for entry in &result.food_entries {
            scores.push(entry.confidence);
        }
        for entry in &result.workout_entries {
            scores.push(entry.confidence);
        }
        for metric in &result.body_metrics {
            scores.push(metric.confidence);
        }

        if scores.is_empty() {
            0.0
        } else {
            scores.iter().sum::<f64>() / scores.len() as f64
        }
    }

    /// Assess if clarification is needed from the user
    fn assess_clarification_needs(result: &VoiceParseResult) -> (bool, Vec<String>) {
        let mut questions = Vec::new();
        let mut needs = false;

        // Low confidence triggers
        if result.overall_confidence < 0.6 {
            needs = true;
            questions.push("I'm not confident about what you meant. Can you rephrase or provide more details?".to_string());
        }

        // Multiple foods with no clear separation
        if result.food_entries.len() > 2 && result.overall_confidence < 0.7 {
            needs = true;
            questions.push("I found multiple food items. Can you confirm which foods you logged?".to_string());
        }

        // Workout with no weight specified for strength exercises
        for entry in &result.workout_entries {
            if entry.workout_type.as_deref() == Some("strength") && entry.weight.is_none() {
                questions.push(format!("What weight did you use for {}?", entry.exercise_name));
                needs = true;
            }
            if entry.sets.is_none() || entry.reps.is_none() {
                questions.push(format!("How many sets and reps for {}?", entry.exercise_name));
                needs = true;
            }
        }

        // No discernible entries at all
        if result.food_entries.is_empty() &&
           result.workout_entries.is_empty() &&
           result.body_metrics.is_empty() {
            needs = true;
            questions.push("I couldn't understand what you wanted to log. Try saying 'ate chicken and rice' or 'did 3 sets of bench press'.".to_string());
        }

        (needs, questions)
    }

    /// Quick validation: does this text contain any recognizable fitness/nutrition data?
    #[wasm_bindgen(js_name = "canParse")]
    pub fn can_parse(text: &str) -> bool {
        let text_lower = text.to_lowercase();

        // Food indicators
        let food_indicators = ["ate", "had", "bowl", "cup", "plate", "food", "meal", "breakfast", "lunch", "dinner"];
        let has_food = food_indicators.iter().any(|kw| text_lower.contains(kw));

        // Workout indicators
        let workout_indicators = ["set", "rep", "kg", "lbs", "bench", "squat", "deadlift", "workout", "gym", "exercised"];
        let has_workout = workout_indicators.iter().any(|kw| text_lower.contains(kw));

        // Body metric indicators
        let metric_indicators = ["weigh", "weight", "body fat", "bf%", "measure", "cm", "kg"];
        let has_metric = metric_indicators.iter().any(|kw| text_lower.contains(kw));

        has_food || has_workout || has_metric
    }
}

// ============================================
// END OF VOICE-TO-ACTION PARSER MODULE
// ==========================================

// ============================================
// METABOLIC DIGITAL TWIN MODULE
// Predictive simulation engine for body composition forecasting
// ==========================================

use serde::{Deserialize, Serialize};

/// Main entry point for generating metabolic twin projections
#[wasm_bindgen]
pub struct MetabolicTwin;

/// Historical data point for trend analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
struct HistoricalPoint {
    timestamp: f64,
    weight_kg: f64,
    body_fat_pct: f64,
    muscle_mass_kg: f64,
    activity_level: Option<f64>,
    calorie_intake: Option<f64>,
}

/// Linear regression result
#[derive(Debug, Clone, Serialize, Deserialize)]
struct TrendLine {
    slope: f64,
    intercept: f64,
    r_squared: f64,
    std_error: f64,
}

/// Single projection point with confidence interval
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Projection {
    days_ahead: i32,
    value: f64,
    lower_bound: f64,
    upper_bound: f64,
    confidence: f64,
}

/// Scenario-based projection results
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScenarioProjection {
    scenario_type: String,
    weight_projections: Vec<Projection>,
    body_fat_projections: Vec<Projection>,
    muscle_projections: Vec<Projection>,
    overall_confidence: f64,
    expected_behavior_change: String,
}

/// Current body composition metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CurrentMetrics {
    weight_kg: f64,
    body_fat_pct: f64,
    muscle_mass_kg: f64,
    lean_body_mass_kg: f64,
    bmi: f64,
    activity_score: f64,
}

/// Trend analysis results
#[derive(Debug, Clone, Serialize, Deserialize)]
struct TrendAnalysis {
    weight_trend: TrendLine,
    body_fat_trend: TrendLine,
    muscle_trend: TrendLine,
    consistency_score: f64,      // 0-100 based on measurement regularity
    volatility: f64,             // Standard deviation of daily changes
    trend_strength: f64,         // Average R² of trends (0-1)
}

/// Complete digital twin simulation results
#[derive(Debug, Clone, Serialize, Deserialize)]
struct DigitalTwinResult {
    user_id: String,
    generated_at: f64,
    time_horizon_days: i32,
    current_metrics: CurrentMetrics,
    trend_analysis: TrendAnalysis,
    scenarios: ScenarioResults,
    recommendations: Vec<String>,
}

/// All scenario projections packaged together
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScenarioResults {
    consistent_performance: ScenarioProjection,
    potential_regression: ScenarioProjection,
    best_case: ScenarioProjection,
    worst_case: ScenarioProjection,
}

#[wasm_bindgen]
impl MetabolicTwin {
    /// Generate a full metabolic twin simulation
    /// historical_data_json: Array of {timestamp, weight_kg, body_fat_pct, muscle_mass_kg, activity_level?, calorie_intake?}
    /// Returns JSON string of DigitalTwinResult
    #[wasm_bindgen(js_name = "generateSimulation")]
    pub fn generate_simulation(
        historical_data_json: &str,
        user_id: &str,
        time_horizon_days: i32,
    ) -> Result<String, JsValue> {
        let historical_data: Vec<HistoricalPoint> = serde_json::from_str(historical_data_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse historical data: {}", e)))?;

        if historical_data.len() < 2 {
            return Err(JsValue::from_str("Need at least 2 data points for trend analysis"));
        }

        // Sort by timestamp
        let mut sorted_data = historical_data.clone();
        sorted_data.sort_by(|a, b| a.timestamp.partial_cmp(&b.timestamp).unwrap());

        // Calculate current metrics (from most recent data point)
        let latest = &sorted_data[sorted_data.len() - 1];
        let current_metrics = CurrentMetrics {
            weight_kg: latest.weight_kg,
            body_fat_pct: latest.body_fat_pct,
            muscle_mass_kg: latest.muscle_mass_kg,
            lean_body_mass_kg: FitnessCalculator::calculate_lean_body_mass(latest.weight_kg, latest.body_fat_pct),
            bmi: FitnessCalculator::calculate_bmi(latest.weight_kg, 170.0), // Default height, should come from user profile
            activity_score: latest.activity_level.unwrap_or(5.0),
        };

        // Perform trend analysis on each metric
        let trend_analysis = calculate_trend_analysis(&sorted_data);

        // Generate scenario projections
        let scenarios = generate_all_scenarios(&sorted_data, &trend_analysis, time_horizon_days);

        // Generate personalized recommendations
        let recommendations = generate_recommendations(&current_metrics, &trend_analysis, &scenarios);

        let result = DigitalTwinResult {
            user_id: user_id.to_string(),
            generated_at: js_sys::Date::now(),
            time_horizon_days,
            current_metrics,
            trend_analysis,
            scenarios,
            recommendations,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
    }
}

/// Calculate linear regression trend line using least squares
fn calculate_trend(data: &[(f64, f64)]) -> TrendLine {
    let n = data.len() as f64;
    let sum_x: f64 = data.iter().map(|(x, _)| x).sum();
    let sum_y: f64 = data.iter().map(|(_, y)| y).sum();
    let sum_xy: f64 = data.iter().map(|(x, y)| x * y).sum();
    let sum_x2: f64 = data.iter().map(|(x, _)| x * x).sum();

    let slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
    let intercept = (sum_y - slope * sum_x) / n;

    // Calculate R²
    let mean_y = sum_y / n;
    let mut ss_res = 0.0;
    let mut ss_tot = 0.0;
    for (x, y) in data {
        let predicted = slope * x + intercept;
        ss_res += (y - predicted).powi(2);
        ss_tot += (y - mean_y).powi(2);
    }
    let r_squared = if ss_tot > 0.0 { 1.0 - (ss_res / ss_tot) } else { 0.0 };

    // Calculate standard error
    let mse = ss_res / (n - 2.0);
    let std_error = mse.sqrt();

    TrendLine {
        slope,
        intercept,
        r_squared: r_squared.max(0.0).min(1.0),
        std_error,
    }
}

/// Calculate trend analysis for all metrics
fn calculate_trend_analysis(data: &[HistoricalPoint]) -> TrendAnalysis {
    // Convert to time-indexed series (days from first measurement)
    let first_timestamp = data[0].timestamp;
    let mut weight_series = Vec::new();
    let mut bf_series = Vec::new();
    let mut muscle_series = Vec::new();

    for (i, point) in data.iter().enumerate() {
        let days = (point.timestamp - first_timestamp) / 86400.0;
        weight_series.push((days, point.weight_kg));
        bf_series.push((days, point.body_fat_pct));
        muscle_series.push((days, point.muscle_mass_kg));
    }

    let weight_trend = calculate_trend(&weight_series);
    let body_fat_trend = calculate_trend(&bf_series);
    let muscle_trend = calculate_trend(&muscle_series);

    let consistency_score = calculate_consistency(data);
    let volatility = calculate_volatility(data);
    let trend_strength = (weight_trend.r_squared + body_fat_trend.r_squared + muscle_trend.r_squared) / 3.0;

    TrendAnalysis {
        weight_trend,
        body_fat_trend,
        muscle_trend,
        consistency_score,
        volatility,
        trend_strength,
    }
}

/// Calculate measurement consistency score (0-100)
fn calculate_consistency(data: &[HistoricalPoint]) -> f64 {
    if data.len() < 2 {
        return 0.0;
    }

    let mut intervals = Vec::new();
    for i in 1..data.len() {
        let interval = (data[i].timestamp - data[i-1].timestamp) / 86400.0;
        intervals.push(interval);
    }

    let mean_interval: f64 = intervals.iter().sum::<f64>() / intervals.len() as f64;
    let variance: f64 = intervals.iter()
        .map(|&x| (x - mean_interval).powi(2))
        .sum::<f64>() / intervals.len() as f64;
    let std_dev = variance.sqrt();

    // Consistency decreases with higher standard deviation
    // Target: ~7 day intervals (weekly measurements)
    let ideal_interval = 7.0;
    let consistency = if mean_interval > 0.0 {
        (1.0 - (std_dev / mean_interval).min(1.0)) * 100.0
    } else {
        0.0
    };

    consistency.max(0.0).min(100.0)
}

/// Calculate volatility of daily changes
fn calculate_volatility(data: &[HistoricalPoint]) -> f64 {
    if data.len() < 2 {
        return 0.0;
    }

    let mut changes = Vec::new();
    for i in 1..data.len() {
        let days = (data[i].timestamp - data[i-1].timestamp) / 86400.0;
        if days > 0.0 {
            let weight_change = (data[i].weight_kg - data[i-1].weight_kg) / days;
            changes.push(weight_change);
        }
    }

    if changes.is_empty() {
        return 0.0;
    }

    let mean_change: f64 = changes.iter().sum::<f64>() / changes.len() as f64;
    let variance: f64 = changes.iter()
        .map(|&x| (x - mean_change).powi(2))
        .sum::<f64>() / changes.len() as f64;

    variance.sqrt() // Daily weight change standard deviation in kg
}

/// Generate projections for a single scenario
fn generate_scenario(
    trend: &TrendLine,
    volatility: f64,
    scenario_modifier: f64,  // Multiplier for slope (e.g., 0.8 = 20% worse)
    time_horizon_days: i32,
    initial_value: f64,
) -> Vec<Projection> {
    let mut projections = Vec::new();

    // Confidence widens over time
    for days in 1..=time_horizon_days {
        let days_f = days as f64;

        // Base projection from trend
        let base_value = trend.intercept + trend.slope * days_f * scenario_modifier;

        // Add random walk component based on volatility
        let random_component = volatility * days_f.sqrt();

        // Confidence interval: 95% (1.96 * std error, plus random component)
        let confidence_half_width = 1.96 * (trend.std_error + random_component);

        projections.push(Projection {
            days_ahead: days,
            value: base_value,
            lower_bound: base_value - confidence_half_width,
            upper_bound: base_value + confidence_half_width,
            confidence: (1.0 - (days_f / time_horizon_days as f64) * 0.5).max(0.3),
        });
    }

    projections
}

/// Generate all scenario projections
fn generate_all_scenarios(
    data: &[HistoricalPoint],
    trend_analysis: &TrendAnalysis,
    time_horizon_days: i32,
) -> ScenarioResults {
    let latest = &data[data.len() - 1];

    // Scenario modifiers based on trend strength and consistency
    let base_modifier = 1.0;
    let regression_modifier = 0.5;  // Trend continues at 50% strength (typical regression)
    let best_modifier = 1.5;        // 50% improvement
    let worst_modifier = 0.0;       // Trend reverses/deteriorates

    ScenarioResults {
        consistent_performance: ScenarioProjection {
            scenario_type: "consistent_performance".to_string(),
            weight_projections: generate_scenario(&trend_analysis.weight_trend, trend_analysis.volatility, base_modifier, time_horizon_days, latest.weight_kg),
            body_fat_projections: generate_scenario(&trend_analysis.body_fat_trend, trend_analysis.volatility * 0.5, base_modifier, time_horizon_days, latest.body_fat_pct),
            muscle_projections: generate_scenario(&trend_analysis.muscle_trend, trend_analysis.volatility * 0.5, base_modifier, time_horizon_days, latest.muscle_mass_kg),
            overall_confidence: trend_analysis.trend_strength * 0.8 + trend_analysis.consistency_score / 100.0 * 0.2,
            expected_behavior_change: "Continue current habits and tracking".to_string(),
        },
        potential_regression: ScenarioProjection {
            scenario_type: "potential_regression".to_string(),
            weight_projections: generate_scenario(&trend_analysis.weight_trend, trend_analysis.volatility * 1.5, regression_modifier, time_horizon_days, latest.weight_kg),
            body_fat_projections: generate_scenario(&trend_analysis.body_fat_trend, trend_analysis.volatility, regression_modifier, time_horizon_days, latest.body_fat_pct),
            muscle_projections: generate_scenario(&trend_analysis.muscle_trend, trend_analysis.volatility, regression_modifier, time_horizon_days, latest.muscle_mass_kg),
            overall_confidence: trend_analysis.trend_strength * 0.6,
            expected_behavior_change: "Inconsistent tracking or reduced activity".to_string(),
        },
        best_case: ScenarioProjection {
            scenario_type: "best_case".to_string(),
            weight_projections: generate_scenario(&trend_analysis.weight_trend, trend_analysis.volatility * 0.7, best_modifier, time_horizon_days, latest.weight_kg),
            body_fat_projections: generate_scenario(&trend_analysis.body_fat_trend, trend_analysis.volatility * 0.5, best_modifier, time_horizon_days, latest.body_fat_pct),
            muscle_projections: generate_scenario(&trend_analysis.muscle_trend, trend_analysis.volatility * 0.5, best_modifier, time_horizon_days, latest.muscle_mass_kg),
            overall_confidence: trend_analysis.trend_strength * 0.5,
            expected_behavior_change: "Optimized nutrition, consistent training, and recovery".to_string(),
        },
        worst_case: ScenarioProjection {
            scenario_type: "worst_case".to_string(),
            weight_projections: generate_scenario(&trend_analysis.weight_trend, trend_analysis.volatility * 2.0, worst_modifier, time_horizon_days, latest.weight_kg),
            body_fat_projections: generate_scenario(&trend_analysis.body_fat_trend, trend_analysis.volatility * 2.0, worst_modifier, time_horizon_days, latest.body_fat_pct),
            muscle_projections: generate_scenario(&trend_analysis.muscle_trend, trend_analysis.volatility * 2.0, worst_modifier, time_horizon_days, latest.muscle_mass_kg),
            overall_confidence: trend_analysis.trend_strength * 0.4,
            expected_behavior_change: "Lapse in nutrition/training, potential muscle loss".to_string(),
        },
    }
}

/// Generate personalized recommendations based on projections
fn generate_recommendations(
    current: &CurrentMetrics,
    trends: &TrendAnalysis,
    scenarios: &ScenarioResults,
) -> Vec<String> {
    let mut recommendations = Vec::new();

    // Check consistency
    if trends.consistency_score < 50.0 {
        recommendations.push("Improve measurement consistency: aim for weekly check-ins at the same time of day".to_string());
    }

    // Check trend strength
    if trends.trend_strength < 0.5 {
        recommendations.push("Your data shows high variability. Focus on consistent habits before expecting predictable results".to_string());
    }

    // Check weight trend
    let weight_change_30d = scenarios.consistent_performance.weight_projections.get(29)
        .map(|p| p.value - current.weight_kg).unwrap_or(0.0);

    if current.body_fat_pct > 25.0 && weight_change_30d > 0.0 {
        recommendations.push("Consider a modest calorie deficit (~300-500 kcal) to promote fat loss".to_string());
    } else if current.body_fat_pct < 15.0 && weight_change_30d < 0.0 {
        recommendations.push("You may be in a deficit. Consider increasing calories to preserve muscle mass".to_string());
    }

    // Check muscle trend
    let muscle_change_30d = scenarios.consistent_performance.muscle_projections.get(29)
        .map(|p| p.value - current.muscle_mass_kg).unwrap_or(0.0);

    if muscle_change_30d < 0.5 {
        recommendations.push("To optimize muscle gain: increase protein intake to 1.6-2.2g/kg body weight and ensure progressive overload".to_string());
    }

    // Check volatility
    if trends.volatility > 0.5 {
        recommendations.push("High day-to-day weight fluctuations detected. Ensure consistent measurement conditions (same time, same state)".to_string());
    }

    // Gap analysis between best and worst case
    let best_weight = scenarios.best_case.weight_projections.last().map(|p| p.value).unwrap_or(current.weight_kg);
    let worst_weight = scenarios.worst_case.weight_projections.last().map(|p| p.value).unwrap_or(current.weight_kg);
    let gap = (best_weight - worst_weight).abs();

    if gap > 2.0 {
        recommendations.push(format!("Your projected outcomes vary by {:.1}kg. Consistency in nutrition and training is key to achieving the best-case scenario", gap));
    }

    if recommendations.is_empty() {
        recommendations.push("Your trends look solid! Keep doing what you're doing.".to_string());
    }

    recommendations
}

/// Live workout adjustment module for real-time AI-powered intensity adjustments
#[wasm_bindgen]
pub struct LiveWorkoutAdjuster;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RPERecord {
  rpe: f64,
  weight: Option<f64>,
  reps_completed: Option<u32>,
  rest_time_seconds: Option<u32>,
  set_number: u32,
  timestamp: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FatigueAssessment {
  pub fatigue_level: u32,
  pub category: FatigueCategory,
  pub rpe_trend: RPETrend,
  pub avg_rpe: f64,
  pub rest_compliance: f64,
  pub recommendation: String,
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FatigueCategory {
  Fresh, Moderate, Fatigued, Exhausted,
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RPETrend {
  Increasing, Stable, Decreasing, NoData,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LiveAdjustment {
  pub adjustment_type: AdjustmentStrategy,
  pub weight_percent: Option<f64>,
  pub rep_adjustment: Option<i32>,
  pub additional_rest_seconds: Option<u32>,
  pub confidence: f64,
  pub reasoning: String,
  pub urgency: AdjustmentUrgency,
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AdjustmentStrategy {
  ReduceWeight, ReduceReps, AddRest, Keep, Stop,
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AdjustmentUrgency {
  Low, Medium, High, Critical,
}

#[wasm_bindgen]
impl LiveWorkoutAdjuster {
  #[wasm_bindgen(js_name = "assessCurrentFatigue")]
  pub fn assess_current_fatigue(
    recent_rpe_records: Vec<JsValue>,
    target_rpe: f64,
    ideal_rest_seconds: u32,
  ) -> JsValue {
    let mut rpe_values: Vec<f64> = Vec::new();
    let mut rest_compliance_values: Vec<f64> = Vec::new();

    for js_val in recent_rpe_records {
      if let Ok(record) = serde_wasm_bindgen::from_value::<RPERecord>(js_val) {
        rpe_values.push(record.rpe);
        if let Some(rest) = record.rest_time_seconds {
          if ideal_rest_seconds > 0 {
            let compliance = rest as f64 / ideal_rest_seconds as f64;
            rest_compliance_values.push(compliance.min(2.0));
          }
        }
      }
    }

    let avg_rpe = if rpe_values.is_empty() { target_rpe } else {
      rpe_values.iter().sum::<f64>() / rpe_values.len() as f64
    };

    let rpe_trend = if rpe_values.len() >= 2 {
      let recent: Vec<f64> = rpe_values.iter().take(3).copied().collect();
      if recent.len() >= 2 {
        let first = recent[0];
        let last = recent[recent.len() - 1];
        if last > first + 0.5 { RPETrend::Increasing }
        else if last < first - 0.5 { RPETrend::Decreasing }
        else { RPETrend::Stable }
      } else { RPETrend::NoData }
    } else { RPETrend::NoData };

    let mut fatigue_score = 0.0;

    if avg_rpe > target_rpe {
      let rpe_excess = (avg_rpe - target_rpe).max(0.0);
      fatigue_score += (rpe_excess / 2.0) * 40.0;
    }

    match rpe_trend {
      RPETrend::Increasing => fatigue_score += 20.0,
      RPETrend::Stable => fatigue_score += 10.0,
      RPETrend::Decreasing => fatigue_score += 5.0,
      RPETrend::NoData => {}
    }

    if !rest_compliance_values.is_empty() {
      let avg_compliance = rest_compliance_values.iter().sum::<f64>() / rest_compliance_values.len() as f64;
      if avg_compliance < 0.8 {
        fatigue_score += (0.8 - avg_compliance) * 100.0;
      }
    }

    let set_count = rpe_values.len() as f64;
    if set_count > 0.0 {
      let set_fatigue = (set_count.min(10.0) / 10.0) * 20.0;
      fatigue_score += set_fatigue;
    }

    let fatigue_level = fatigue_score.round().clamp(0.0, 100.0) as u32;

    let category = if fatigue_level < 25 { FatigueCategory::Fresh }
    else if fatigue_level < 50 { FatigueCategory::Moderate }
    else if fatigue_level < 75 { FatigueCategory::Fatigued }
    else { FatigueCategory::Exhausted };

    let recommendation = Self::generate_fatigue_recommendation(
      fatigue_level, &category, &rpe_trend, avg_rpe, target_rpe,
    );

    let assessment = FatigueAssessment {
      fatigue_level,
      category: category.clone(),
      rpe_trend: rpe_trend.clone(),
      avg_rpe,
      rest_compliance: rest_compliance_values.iter().sum::<f64>() / rest_compliance_values.len().max(1) as f64,
      recommendation,
    };

    serde_wasm_bindgen::to_value(&assessment).unwrap_or_else(|_| JsValue::NULL)
  }

  fn generate_fatigue_recommendation(
    fatigue_level: u32, category: &FatigueCategory, trend: &RPETrend,
    avg_rpe: f64, target_rpe: f64,
  ) -> String {
    match category {
      FatigueCategory::Fresh => "Feeling fresh. Push towards target RPE.".to_string(),
      FatigueCategory::Moderate => match trend {
        RPETrend::Increasing => "RPE trending up. Focus on form.".to_string(),
        RPETrend::Stable => "Steady effort. Maintain current weight.".to_string(),
        RPETrend::Decreasing => "RPE trending down. You're adapting well.".to_string(),
        RPETrend::NoData => "Gather more RPE data.".to_string(),
      },
      FatigueCategory::Fatigued => {
        if avg_rpe > target_rpe + 1.0 {
          format!("High fatigue ({}%). Reduce weight by 10-20%.", fatigue_level)
        } else {
          format!("Significant fatigue ({}%). Add 15-30s rest.", fatigue_level)
        }
      }
      FatigueCategory::Exhausted => format!("Critical fatigue ({}%). End workout.", fatigue_level),
    }.to_string()
  }

  #[wasm_bindgen(js_name = "recommendLiveAdjustment")]
  pub fn recommend_live_adjustment(
    _current_weight: f64, _target_reps: u32, _remaining_sets: u32,
    fatigue_level: u32, fatigue_category: &str,
    exercise_type: &str, is_warmup: bool, has_spotter: bool,
  ) -> JsValue {
    let _ = Self::parse_fatigue_category(fatigue_category);

    let mut adjustment = LiveAdjustment {
      adjustment_type: AdjustmentStrategy::Keep,
      weight_percent: None,
      rep_adjustment: None,
      additional_rest_seconds: None,
      confidence: 0.7,
      reasoning: String::new(),
      urgency: AdjustmentUrgency::Low,
    };

    let fatigue_norm = fatigue_level as f64 / 100.0;

    if is_warmup {
      adjustment.reasoning = "Warmup sets should remain light.".to_string();
    } else if fatigue_norm >= 0.75 {
      adjustment.adjustment_type = AdjustmentStrategy::Stop;
      adjustment.reasoning = "Critical fatigue. Continuing risks injury.".to_string();
      adjustment.urgency = AdjustmentUrgency::Critical;
      adjustment.confidence = 0.9;
    } else if fatigue_norm >= 0.6 {
      let weight_reduction = Self::calculate_weight_reduction(fatigue_norm, exercise_type);
      if weight_reduction >= 15.0 {
        adjustment.adjustment_type = AdjustmentStrategy::ReduceWeight;
        adjustment.weight_percent = Some(-weight_reduction);
        adjustment.reasoning = format!("High fatigue ({}%). Reduce weight by {}%.", fatigue_level, weight_reduction);
      } else {
        adjustment.adjustment_type = AdjustmentStrategy::ReduceReps;
        adjustment.rep_adjustment = Some(-1);
        adjustment.reasoning = format!("Moderate fatigue ({}%). Reduce reps by 1.", fatigue_level);
      }
      adjustment.urgency = AdjustmentUrgency::High;
      adjustment.confidence = 0.85;
    } else if fatigue_norm >= 0.4 {
      if !has_spotter && Self::is_compound_exercise(exercise_type) {
        adjustment.adjustment_type = AdjustmentStrategy::AddRest;
        adjustment.additional_rest_seconds = Some(30);
        adjustment.reasoning = format!("Moderate fatigue ({}%). Extra rest.", fatigue_level);
      } else {
        adjustment.adjustment_type = AdjustmentStrategy::ReduceWeight;
        adjustment.weight_percent = Some(-5.0);
        adjustment.reasoning = format!("Building fatigue ({}%). Small weight reduction.", fatigue_level);
      }
      adjustment.urgency = AdjustmentUrgency::Medium;
      adjustment.confidence = 0.75;
    } else {
      adjustment.reasoning = "Good fatigue level. Maintain current weight.".to_string();
    }

    if adjustment.adjustment_type == AdjustmentStrategy::ReduceWeight && has_spotter {
      adjustment.reasoning.push_str(" Spotter present.");
    }

    serde_wasm_bindgen::to_value(&adjustment).unwrap_or_else(|_| JsValue::NULL)
  }

  fn parse_fatigue_category(s: &str) -> FatigueCategory {
    match s.to_lowercase().as_str() {
      "fresh" => FatigueCategory::Fresh,
      "moderate" => FatigueCategory::Moderate,
      "fatigued" => FatigueCategory::Fatigued,
      "exhausted" => FatigueCategory::Exhausted,
      _ => FatigueCategory::Fresh,
    }
  }

  fn calculate_weight_reduction(fatigue_norm: f64, exercise_type: &str) -> f64 {
    let base_reduction = fatigue_norm * 100.0;
    let multiplier = if Self::is_compound_exercise(exercise_type) { 1.2 } else { 1.0 };
    (base_reduction * multiplier).round().clamp(5.0, 30.0)
  }

  fn is_compound_exercise(exercise_type: &str) -> bool {
    matches!(
      exercise_type.to_lowercase().as_str(),
      "squat" | "deadlift" | "bench_press" | "overhead_press" | "barbell_row" | "power_clean"
    )
  }

  #[wasm_bindgen(js_name = "calculateRecommendedRest")]
  pub fn calculate_recommended_rest(
    base_rest_seconds: u32, fatigue_level: u32, exercise_type: &str, last_rpe: Option<f64>,
  ) -> u32 {
    let fatigue_norm = fatigue_level as f64 / 100.0;
    let mut additional_rest = (fatigue_norm * 30.0).round() as u32;

    if Self::is_compound_exercise(exercise_type) {
      additional_rest += 15;
    }

    if let Some(rpe) = last_rpe {
      if rpe >= 9.0 { additional_rest += 20; }
      else if rpe >= 8.0 { additional_rest += 10; }
    }

    base_rest_seconds + additional_rest.min(60)
  }

  #[wasm_bindgen(js_name = "shouldEndWorkout")]
  pub fn should_end_workout(
    fatigue_level: u32, total_sets_completed: u32,
    total_volume_completed: f64, total_volume_planned: f64,
    form_breakdown_count: u32,
  ) -> JsValue {
    let mut reasons: Vec<String> = Vec::new();

    if fatigue_level >= 85 {
      reasons.push("Critical fatigue level (≥85%)".to_string());
    }

    if total_sets_completed >= 5 && form_breakdown_count as f64 / total_sets_completed as f64 > 0.5 {
      reasons.push(format!("Form breakdown in {} sets", form_breakdown_count));
    }

    if total_volume_planned > 0.0 {
      let volume_completion = total_volume_completed / total_volume_planned;
      if volume_completion >= 0.9 && fatigue_level >= 70 {
        reasons.push("Volume goal nearly complete with high fatigue".to_string());
      }
    }

    if total_sets_completed >= 15 && fatigue_level >= 60 {
      reasons.push(format!("High set count ({}) with fatigue", total_sets_completed));
    }

    let result = serde_json::json!({
      "should_end": !reasons.is_empty(),
      "reason": if reasons.is_empty() { None } else { Some(reasons.join("; ")) },
      "suggestion": None::<String>,
    });

    serde_wasm_bindgen::to_value(&result).unwrap_or_else(|_| JsValue::NULL)
  }

  #[wasm_bindgen(js_name = "calculateAdjustedReps")]
  pub fn calculate_adjusted_reps(
    original_reps: u32, fatigue_level: u32, sets_completed: u32, total_sets: u32,
  ) -> u32 {
    if original_reps == 0 { return 0; }

    let fatigue_norm = fatigue_level as f64 / 100.0;
    let mut reduction = (original_reps as f64 * fatigue_norm * 0.3).round() as i32;

    if total_sets > 0 {
      let set_progress = sets_completed as f64 / total_sets as f64;
      if set_progress > 0.7 {
        reduction += ((set_progress - 0.7) * 10.0).round() as i32;
      }
    }

    (original_reps as i32 - reduction).max(1) as u32
  }

  #[wasm_bindgen(js_name = "calculateAdjustedWeight")]
  pub fn calculate_adjusted_weight(
    original_weight: f64, fatigue_level: u32, is_compound: bool,
  ) -> f64 {
    let fatigue_norm = fatigue_level as f64 / 100.0;
    let reduction_percent = if is_compound { fatigue_norm * 15.0 } else { fatigue_norm * 10.0 };
    let new_weight = original_weight * (1.0 - reduction_percent / 100.0);
    (new_weight * 10.0).round() / 10.0
  }
}



// ============================================
// POSTURE ANALYSIS MODULE
// ============================================

mod posture;
pub use posture::PostureAnalyzer;

#[cfg(test)]
mod tests {

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
