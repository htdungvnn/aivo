# Biometric Stress & Recovery Correlation - Implementation Plan

## Context

The AIVO fitness platform needs to implement a "Biometric Stress & Recovery Correlation" feature that identifies hidden patterns between exercise load, sleep quality, and nutritional consistency to explain why users are stalling in their fitness progress.

The AI acts as a Data Scientist: it ingests 7-30 day snapshots of structured biometric data, uses Rust WASM for mathematical heavy lifting (correlations, anomalies), and provides plain-language explanations.

**User decisions:**
- Analysis trigger: **Both** (scheduled cron + on-demand)
- Minimum data: **7 days** of mostly complete data
- AI integration: **Hybrid** (pre-computed + AI on-demand contextualization)
- Nutrition tracking: **Detailed** (full macros, meal timing)

## Current State

### Existing Infrastructure

**Database** (`packages/db/src/schema.ts`):
- `bodyInsights`: tracks recoveryScore, fatigueLevel, muscleSoreness (JSON), sleepQuality, sleepHours, stressLevel
- `workouts` + `workoutExercises`: exercise load with duration, calories, RPE
- `bodyMetrics`: weight, body fat, muscle mass
- **Missing**: Nutrition logs, sleep logs (only goals), correlation tables

**Rust WASM** (`packages/aivo-compute/src/lib.rs`):
- BMI, BMR, TDEE, 1RM, calories, health score, muscle balance
- Token optimization
- **Needs**: Pearson correlation, z-score, standard deviation, anomaly detection, snapshot aggregation

**API** (`apps/api/src`):
- Hono routes with Zod validation, Drizzle ORM, KV cache
- Body endpoints: `/api/body/metrics`, `/api/body/vision/analyze`, `/api/body/health-score`
- No AI recommendation generation (schema exists but not implemented)

**Frontend**:
- Web: Next.js, shadcn/ui, Recharts, components in `apps/web/src/components/body/`
- Mobile: React Native, NativeWind, Victory Native, screens in `apps/mobile/app/(tabs)/`
- Both have body metric visualization, image upload, AI vision analysis

## Architecture Decision

### Data Flow

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Nutrition │      │     Sleep    │      │   Workouts   │
│     Logs    │      │     Logs     │      │    + RPE     │
└─────────────┘      └──────────────┘      └──────────────┘
         │                   │                      │
         └───────────────────┼──────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  D1 Database    │
                    │  (time-series)  │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Cron Job       │ (daily @ 2am)
                    │  (7d/30d)       │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Correlation     │
                    │ Analyzer        │
                    │  Service        │
                    └─────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐      ┌────▼─────┐      ┌────▼─────┐
    │ Snapshot  │      │Finding   │      │ AI       │
    │ Table     │      │ Table    │      │ Context  │
    └───────────┘      └──────────┘      └──────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  API Endpoint   │ GET /biometric/correlations
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Frontend       │ Recovery Dashboard
                    └─────────────────┘
```

### Database Schema Changes

Add 4 new tables:

1. **`nutrition_logs`**: Daily calorie and macro tracking with meal timing
2. **`sleep_logs`**: Structured sleep duration, quality, bedtime/wake time
3. **`biometric_snapshots`**: Pre-aggregated 7d/30d statistics (for performance)
4. **`correlation_findings`**: Discovered patterns with explanations

All tables use:
- `id` as UUID primary key (text)
- `userId` foreign key to users with cascade delete
- Indexes on `userId`, `date`, and composite indexes for queries
- Timestamps as Unix integers

## Implementation Phases

### Phase 1: Database Schema & Shared Types (Foundation)

#### Files to Modify

**1. `packages/db/src/schema.ts`**

Add these table definitions:

```typescript
// Nutrition logs - detailed daily tracking
export const nutritionLogs = sqliteTable("nutrition_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO date: YYYY-MM-DD
  calories: integer("calories"),
  protein: integer("protein"), // grams
  carbs: integer("carbs"), // grams
  fat: integer("fat"), // grams
  waterMl: integer("water_ml"),
  // Meal timing as JSON: { breakfast: "07:30", lunch: "12:30", dinner: "19:00" }
  mealTiming: text("meal_timing"),
  notes: text("notes"),
  source: text("source").default("manual"), // "manual", "device", "import"
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_user_date').on(table.userId, table.date),
  unique('unique_user_date').on(table.userId, table.date),
]);

// Sleep logs - objective tracking
export const sleepLogs = sqliteTable("sleep_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO date: YYYY-MM-DD
  durationHours: real("duration_hours"), // Total sleep duration
  qualityScore: integer("quality_score"), // 0-100 self-reported
  // Optional: sleep stages if available from device
  deepSleepMinutes: integer("deep_sleep_minutes"),
  remSleepMinutes: integer("rem_sleep_minutes"),
  awakeMinutes: integer("awake_minutes"),
  bedtime: text("bedtime"), // HH:MM format
  waketime: text("waketime"), // HH:MM format
  consistencyScore: integer("consistency_score"), // 0-100 (calculated)
  notes: text("notes"),
  source: text("source").default("manual"), // "manual", "device", "import"
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_user_date').on(table.userId, table.date),
  unique('unique_user_date').on(table.userId, table.date),
]);

// Biometric snapshots - aggregated 7d/30d data
export const biometricSnapshots = sqliteTable("biometric_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // "7d" or "30d"
  generatedAt: integer("generated_at").notNull(),
  validUntil: integer("valid_until"), // Snapshot expires after 24h (7d) or 168h (30d)
  // Exercise load aggregates (JSON)
  exerciseLoad: text("exercise_load"),
  // Sleep aggregates (JSON)
  sleep: text("sleep"),
  // Nutrition aggregates (JSON)
  nutrition: text("nutrition"),
  // Body metrics trends (JSON)
  bodyMetrics: text("body_metrics"),
  // Recovery composite score
  recoveryScore: real("recovery_score"),
  // Warnings about data quality or concerning patterns
  warnings: text("warnings"), // JSON array
});

// Correlation findings - discovered patterns
export const correlationFindings = sqliteTable("correlation_findings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  snapshotId: text("snapshot_id").notNull().references(() => biometricSnapshots.id, { onDelete: "cascade" }),
  factorA: text("factor_a").notNull(), // e.g., "exercise_load", "sleep_quality"
  factorB: text("factor_b").notNull(), // e.g., "recovery_score"
  correlationCoefficient: real("correlation_coefficient"), // -1 to 1
  pValue: real("p_value"), // statistical significance
  confidence: real("confidence"), // 0-1 based on data quality
  anomalyThreshold: real("anomaly_threshold"), // z-score threshold used
  anomalyCount: integer("anomaly_count"),
  outlierDates: text("outlier_dates"), // JSON array of dates
  explanation: text("explanation"), // Plain language explanation (pre-computed or AI-generated)
  actionableInsight: text("actionable_insight"), // Recommendation
  detectedAt: integer("detected_at").notNull(),
  validUntil: integer("valid_until"), // 30 days validity
  isDismissed: integer("is_dismissed").default(0),
}, (table) => [
  index('idx_user_snapshot').on(table.userId, table.snapshotId),
  index('idx_detected').on(table.detectedAt),
]);
```

Update `schema` export to include new tables.

**2. `packages/shared-types/src/index.ts`**

Add type definitions:

```typescript
// ============================================
// SECTION 17: BIOMETRIC CORRELATION TYPES
// ============================================

// Nutrition Log
export interface NutritionLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  calories?: number;
  protein?: number; // grams
  carbs?: number; // grams
  fat?: number; // grams
  waterMl?: number;
  mealTiming?: {
    breakfast?: string; // HH:MM
    lunch?: string;
    dinner?: string;
    snacks?: string[];
  };
  notes?: string;
  source: "manual" | "device" | "import";
  createdAt: Date;
  updatedAt: Date;
}

// Sleep Log
export interface SleepLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  durationHours: number;
  qualityScore: number; // 0-100
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  awakeMinutes?: number;
  bedtime?: string; // HH:MM
  waketime?: string; // HH:MM
  consistencyScore?: number; // 0-100
  notes?: string;
  source: "manual" | "device" | "import";
  createdAt: Date;
  updatedAt: Date;
}

// Snapshot aggregates (pre-computed for performance)
export interface ExerciseLoadAggregate {
  avgDailyVolume: number; // total weight × reps × sets
  avgRpe: number; // 1-10 scale
  avgDuration: number; // minutes
  highIntensityDays: number; // RPE >= 8
  totalWorkouts: number;
  volumeTrend: "increasing" | "decreasing" | "stable";
}

export interface SleepAggregate {
  avgDurationHours: number;
  avgQualityScore: number; // 0-100
  avgBedtime: string; // HH:MM
  avgWaketime: string; // HH:MM
  consistencyScore: number; // 0-100 (bedtime variance)
  sleepDebtHours: number; // cumulative deficit from target
  deepSleepAvgMinutes: number;
  remSleepAvgMinutes: number;
}

export interface NutritionAggregate {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgWaterMl: number;
  caloriesAdherence: number; // 0-1 (actual/target)
  proteinAdherence: number;
  carbsAdherence: number;
  fatAdherence: number;
  lateNightEaterDays: number; // dinner after 21:00
  mealRegularityScore: number; // 0-100 based on timing consistency
  macroBalanceScore: number; // 0-100 (optimal macro ratios)
}

export interface BodyMetricsAggregate {
  weightChange: number; // kg over period
  bodyFatChange: number; // percentage points
  muscleMassChange: number; // kg
  bmiChange: number;
  trends: {
    weight: "up" | "down" | "stable";
    bodyFat: "up" | "down" | "stable";
    muscleMass: "up" | "down" | "stable";
  };
}

export interface BiometricSnapshot {
  id: string;
  userId: string;
  period: "7d" | "30d";
  generatedAt: Date;
  validUntil: Date;
  exerciseLoad: ExerciseLoadAggregate;
  sleep: SleepAggregate;
  nutrition: NutritionAggregate;
  bodyMetrics: BodyMetricsAggregate;
  recoveryScore: number; // 0-100 composite
  warnings: string[]; // data quality issues or concerning patterns
}

// Correlation Finding
export interface CorrelationFinding {
  id: string;
  userId: string;
  snapshotId: string;
  factorA: string; // e.g., "exercise_load", "sleep_quality", "nutrition_consistency"
  factorB: string; // usually "recovery_score"
  correlationCoefficient: number; // -1 to 1
  pValue: number; // < 0.05 typically significant
  confidence: number; // 0-1 based on data completeness
  anomalyThreshold: number; // z-score threshold used
  anomalyCount: number; // number of outlier days detected
  outlierDates: string[]; // dates where anomalies occurred
  explanation: string; // Plain English explanation of the correlation
  actionableInsight: string; // What user should do
  detectedAt: Date;
  validUntil: Date;
  isDismissed: boolean;
}

// Recovery Score Calculation
export interface RecoveryScoreFactors {
  sleepQuality: number; // 0-100
  nutritionBalance: number; // 0-100
  exerciseLoadPenalty: number; // 0-100 reduction
  bodyMetricsScore: number; // 0-100
  consistencyScore: number; // 0-100
}

export interface RecoveryScoreResult {
  overallScore: number; // 0-100
  category: "excellent" | "good" | "fair" | "poor";
  factors: RecoveryScoreFactors;
  warnings: string[]; // e.g., "Sleep debt of 5 hours", "Late night eating detected"
  trends: {
    sleep: "improving" | "declining" | "stable";
    nutrition: "improving" | "declining" | "stable";
    recovery: "improving" | "declining" | "stable";
  };
}
```

Update the `schema` export to include the new tables.

### Phase 2: Rust WASM Statistical Functions

**File**: `packages/aivo-compute/src/lib.rs`

Add new module for correlation analysis:

```rust
/// Statistical correlation analysis for biometric data
#[wasm_bindgen]
pub struct CorrelationAnalyzer;

#[wasm_bindgen]
impl CorrelationAnalyzer {
  /// Calculate Pearson correlation coefficient between two arrays
  /// Returns value between -1 (perfect negative) and 1 (perfect positive)
  /// NaN if arrays have different lengths or insufficient variance
  #[wasm_bindgen(js_name = "pearsonCorrelation")]
  pub fn pearson_correlation(x: &[f64], y: &[f64]) -> f64 {
    if x.len() != y.len() || x.len() < 2 {
      return f64::NAN;
    }

    let n = x.len() as f64;

    // Calculate means
    let mean_x = x.iter().sum::<f64>() / n;
    let mean_y = y.iter().sum::<f64>() / n;

    // Calculate covariance and variances
    let mut covariance = 0.0;
    let mut var_x = 0.0;
    let mut var_y = 0.0;

    for i in 0..x.len() {
      let dx = x[i] - mean_x;
      let dy = y[i] - mean_y;
      covariance += dx * dy;
      var_x += dx * dx;
      var_y += dy * dy;
    }

    if var_x == 0.0 || var_y == 0.0 {
      return f64::NAN;
    }

    covariance / (var_x.sqrt() * var_y.sqrt())
  }

  /// Calculate sample Pearson correlation with p-value approximation
  #[wasm_bindgen(js_name = "pearsonCorrelationWithPValue")]
  pub fn pearson_correlation_with_p_value(x: &[f64], y: &[f64]) -> JsValue {
    let r = Self::pearson_correlation(x, y);
    if r.is_nan() {
      return to_value(&(r, 1.0)).unwrap_or(JsValue::NULL);
    }

    let n = x.len() as f64;
    // t-statistic for correlation
    let t = r * ((n - 2.0) / (1.0 - r * r)).sqrt();

    // Approximate p-value using t-distribution (for n > 30, approximates normal)
    // For exact p-value, would need t-distribution CDF
    // This is a simplified approximation
    let p_value = if n >= 30.0 {
      // Normal approximation
      let norm_cdf = |z: f64| {
        0.5 * (1.0 + (z / 2.50662827463 * (-z * z / 2.0).exp()).tanh())
      };
      2.0 * (1.0 - norm_cdf(t.abs()))
    } else {
      // Simplified: use lookup or approximation
      // For now, return a rough estimate based on t
      let p = (-0.009 * t * t + 0.5).max(0.001).min(1.0);
      2.0 * p
    };

    to_value(&(r, p_value)).unwrap_or(JsValue::NULL)
  }

  /// Calculate standard deviation (sample, using n-1)
  #[wasm_bindgen(js_name = "standardDeviation")]
  pub fn standard_deviation(data: &[f64]) -> f64 {
    if data.len() < 2 {
      return 0.0;
    }

    let mean = data.iter().sum::<f64>() / data.len() as f64;
    let variance = data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / (data.len() as f64 - 1.0);
    variance.sqrt()
  }

  /// Calculate z-score for a single value in a dataset
  #[wasm_bindgen(js_name = "zScore")]
  pub fn z_score(value: f64, data: &[f64]) -> f64 {
    if data.is_empty() {
      return 0.0;
    }

    let mean = data.iter().sum::<f64>() / data.len() as f64;
    let std = Self::standard_deviation(data);

    if std == 0.0 {
      return 0.0;
    }

    (value - mean) / std
  }

  /// Find anomaly indices using z-score threshold
  /// Returns indices of values that are |z-score| > threshold (default 2.0)
  #[wasm_bindgen(js_name = "findAnomalies")]
  pub fn find_anomalies(data: &[f64], threshold: Option<f64>) -> JsValue {
    let threshold = threshold.unwrap_or(2.0);
    let mean = data.iter().sum::<f64>() / data.len() as f64;
    let std = Self::standard_deviation(data);

    if std == 0.0 {
      return to_value(&Vec::<usize>::new()).unwrap_or(JsValue::NULL);
    }

    let anomalies: Vec<usize> = data
      .iter()
      .enumerate()
      .filter(|(_, &value)| ((value - mean) / std).abs() > threshold)
      .map(|(idx, _)| idx)
      .collect();

    to_value(&anomalies).unwrap_or(JsValue::NULL)
  }

  /// Calculate moving average for time series smoothing
  #[wasm_bindgen(js_name = "movingAverage")]
  pub fn moving_average(data: &[f64], window: usize) -> Vec<f64> {
    if window == 0 || window > data.len() {
      return Vec::new();
    }

    let mut result = Vec::with_capacity(data.len() - window + 1);
    let mut sum: f64 = data.iter().take(window).sum();

    result.push(sum / window as f64);

    for i in window..data.len() {
      sum = sum - data[i - window] + data[i];
      result.push(sum / window as f64);
    }

    result
  }

  /// Calculate normalized value (0-1 scale) given min/max
  #[wasm_bindgen(js_name = "normalize")]
  pub fn normalize(value: f64, min: f64, max: f64) -> f64 {
    if max - min == 0.0 {
      return 0.5;
    }
    ((value - min) / (max - min)).max(0.0).min(1.0)
  }

  /// Calculate aggregate snapshot from time series data
  /// Input is JSON with daily arrays for workouts, sleep, nutrition
  #[wasm_bindgen(js_name = "aggregateBiometricSnapshot")]
  pub fn aggregate_biometric_snapshot(
    workouts_json: &str,
    sleep_json: &str,
    nutrition_json: &str,
    period_days: u32,
  ) -> JsValue {
    #[derive(serde::Deserialize)]
    struct WorkoutDay {
      date: String,
      avg_rpe: Option<f64>,
      total_volume: f64,
      duration: f64,
    }

    #[derive(serde::Deserialize)]
    struct SleepDay {
      date: String,
      duration_hours: f64,
      quality_score: f64,
      bedtime: Option<String>,
      waketime: Option<String>,
    }

    #[derive(serde::Deserialize)]
    struct NutritionDay {
      date: String;
      calories: f64;
      calories_target: f64;
      protein: f64;
      protein_target: f64;
      mealTiming: Option<serde_json::Value>;
    }

    let workouts: Vec<WorkoutDay> = serde_json::from_str(workouts_json).unwrap_or_default();
    let sleep: Vec<SleepDay> = serde_json::from_str(sleep_json).unwrap_or_default();
    let nutrition: Vec<NutritionDay> = serde_json::from_str(nutrition_json).unwrap_or_default();

    // Exercise load aggregate
    let exercise_load = if workouts.is_empty() {
      serde_json::json!({
        "avgDailyVolume": 0.0,
        "avgRpe": 0.0,
        "avgDuration": 0.0,
        "highIntensityDays": 0,
        "totalWorkouts": 0,
        "volumeTrend": "stable",
      })
    } else {
      let avg_volume = workouts.iter().map(|w| w.total_volume).sum::<f64>() / workouts.len() as f64;
      let avg_rpe = workouts.iter().filter_map(|w| w.avg_rpe).sum::<f64>() /
        workouts.iter().filter(|w| w.avg_rpe.is_some()).count() as f64;
      let avg_duration = workouts.iter().map(|w| w.duration).sum::<f64>() / workouts.len() as f64;
      let high_intensity = workouts.iter().filter(|w| w.avg_rpe.unwrap_or(0.0) >= 8.0).count();

      // Simple trend: compare first half vs second half
      let mid = workouts.len() / 2;
      let first_half_avg = workouts[..mid].iter().map(|w| w.total_volume).sum::<f64>() / mid as f64;
      let second_half_avg = workouts[mid..].iter().map(|w| w.total_volume).sum::<f64>() / (workouts.len() - mid) as f64;
      let volume_trend = if second_half_avg > first_half_avg * 1.1 {
        "increasing"
      } else if second_half_avg < first_half_avg * 0.9 {
        "decreasing"
      } else {
        "stable"
      };

      serde_json::json!({
        "avgDailyVolume": avg_volume,
        "avgRpe": avg_rpe,
        "avgDuration": avg_duration,
        "highIntensityDays": high_intensity,
        "totalWorkouts": workouts.len(),
        "volumeTrend": volume_trend,
      })
    };

    // Sleep aggregate
    let sleep_agg = if sleep.is_empty() {
      serde_json::json!({
        "avgDurationHours": 0.0,
        "avgQualityScore": 0.0,
        "consistencyScore": 0.0,
        "sleepDebtHours": 0.0,
      })
    } else {
      let avg_duration = sleep.iter().map(|s| s.duration_hours).sum::<f64>() / sleep.len() as f64;
      let avg_quality = sleep.iter().map(|s| s.quality_score).sum::<f64>() / sleep.len() as f64;

      // Consistency: based on bedtime variance if available
      let consistency_score = if sleep.iter().any(|s| s.bedtime.is_some()) {
        // Calculate bedtime variance (convert to minutes since midnight)
        let bedtimes: Vec<f64> = sleep
          .iter()
          .filter_map(|s| s.bedtime.as_ref())
          .map(|bt| {
            let parts: Vec<&str> = bt.split(':').collect();
            parts[0].parse::<f64>().unwrap_or(0) * 60.0 + parts[1].parse::<f64>().unwrap_or(0)
          })
          .collect();

        if bedtimes.len() >= 3 {
          let mean = bedtimes.iter().sum::<f64>() / bedtimes.len() as f64;
          let variance = bedtimes.iter().map(|&t| (t - mean).powi(2)).sum::<f64>() / bedtimes.len() as f64;
          let std = variance.sqrt();
          // Score inversely proportional to std dev (0-100)
          (100.0 - (std * 2.0).min(100.0)).max(0.0)
        } else {
          50.0 // Not enough data
        }
      } else {
        50.0 // No bedtime data
      };

      // Sleep debt: assume 8 hours target
      let sleep_debt = (8.0 - avg_duration).max(0.0) * sleep.len() as f64;

      serde_json::json!({
        "avgDurationHours": avg_duration,
        "avgQualityScore": avg_quality,
        "consistencyScore": consistency_score,
        "sleepDebtHours": sleep_debt,
        "deepSleepAvgMinutes": 0.0, // TODO: calculate if data available
        "remSleepAvgMinutes": 0.0,
      })
    };

    // Nutrition aggregate
    let nutrition_agg = if nutrition.is_empty() {
      serde_json::json!({
        "avgCalories": 0.0,
        "avgProtein": 0.0,
        "caloriesAdherence": 0.0,
        "proteinAdherence": 0.0,
        "lateNightEaterDays": 0,
        "mealRegularityScore": 0.0,
      })
    } else {
      let avg_calories = nutrition.iter().map(|n| n.calories).sum::<f64>() / nutrition.len() as f64;
      let avg_protein = nutrition.iter().map(|n| n.protein).sum::<f64>() / nutrition.len() as f64;

      // Adherence: average of (1 - |actual - target| / target), clamped 0-1
      let mut calories_adherences = Vec::new();
      let mut protein_adherences = Vec::new();

      for n in &nutrition {
        if n.calories_target > 0.0 {
          let adherence = 1.0 - (n.calories - n.calories_target).abs() / n.calories_target;
          calories_adherences.push(adherence.max(0.0).min(1.0));
        }
        if n.protein_target > 0.0 {
          let adherence = 1.0 - (n.protein - n.protein_target).abs() / n.protein_target;
          protein_adherences.push(adherence.max(0.0).min(1.0));
        }
      }

      let calories_adherence = if calories_adherences.is_empty() {
        0.0
      } else {
        calories_adherences.iter().sum::<f64>() / calories_adherences.len() as f64
      };

      let protein_adherence = if protein_adherences.is_empty() {
        0.0
      } else {
        protein_adherences.iter().sum::<f64>() / protein_adherences.len() as f64
      };

      // Late night eating: dinner after 21:00
      let late_night_count = nutrition.iter().filter(|n| {
        if let Some(timing) = &n.mealTiming {
          if let Some(dinner) = timing.get("dinner").and_then(|d| d.as_str()) {
            if let Some(hour_str) = dinner.split(':').next() {
              if let Ok(hour) = hour_str.parse::<u32>() {
                return hour >= 21;
              }
            }
          }
        }
        false
      }).count();

      // Macro balance score: check if macros are within recommended ranges
      // Simple: protein 20-30%, carbs 40-50%, fat 20-30% of calories
      let mut balance_scores = Vec::new();
      for n in &nutrition {
        let total_calories = n.calories;
        if total_calories > 0.0 {
          let protein_cals = n.protein * 4.0;
          let carbs_cals = n.carbs * 4.0;
          let fat_cals = n.fat * 9.0;

          let protein_pct = protein_cals / total_calories;
          let carbs_pct = carbs_cals / total_calories;
          let fat_pct = fat_cals / total_calories;

          let mut score = 100.0;
          if protein_pct < 0.15 { score -= 20.0; }
          if protein_pct > 0.35 { score -= 20.0; }
          if carbs_pct < 0.35 { score -= 20.0; }
          if carbs_pct > 0.55 { score -= 20.0; }
          if fat_pct < 0.15 { score -= 20.0; }
          if fat_pct > 0.35 { score -= 20.0; }

          balance_scores.push(score.max(0.0));
        }
      }

      let macro_balance = if balance_scores.is_empty() {
        50.0
      } else {
        balance_scores.iter().sum::<f64>() / balance_scores.len() as f64
      };

      serde_json::json!({
        "avgCalories": avg_calories,
        "avgProtein": avg_protein,
        "caloriesAdherence": calories_adherence,
        "proteinAdherence": protein_adherence,
        "lateNightEaterDays": late_night_count,
        "mealRegularityScore": 50.0, // TODO: calculate from meal timing variance
        "macroBalanceScore": macro_balance,
      })
    };

    // Simple recovery score calculation (0-100)
    // Formula: sleep_quality * 0.4 + nutrition_adherence * 0.3 - load_penalty * 0.3
    let sleep_factor = sleep_agg.get("avgQualityScore").and_then(|v| v.as_f64()).unwrap_or(0.0) * 0.4;
    let nutrition_factor = (nutrition_agg.get("caloriesAdherence").and_then(|v| v.as_f64()).unwrap_or(0.0) +
                           nutrition_agg.get("proteinAdherence").and_then(|v| v.as_f64()).unwrap_or(0.0)) / 2.0 * 30.0;
    let load_penalty = (exercise_load.get("avgRpe").and_then(|v| v.as_f64()).unwrap_or(5.0) - 5.0).max(0.0) * 6.0; // RPE > 5 adds penalty
    let recovery_score = (sleep_factor + nutrition_factor - load_penalty).max(0.0).min(100.0);

    let result = serde_json::json!({
      "exerciseLoad": exercise_load,
      "sleep": sleep_agg,
      "nutrition": nutrition_agg,
      "bodyMetrics": serde_json::json!({}), // TODO: calculate from bodyMetrics
      "recoveryScore": recovery_score,
      "warnings": [],
    });

    to_value(&result).unwrap_or(JsValue::NULL)
  }
}

#[cfg(test)]
mod correlation_tests {
  use super::*;

  #[test]
  fn test_pearson_correlation_perfect_positive() {
    let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
    let y = vec![2.0, 4.0, 6.0, 8.0, 10.0];
    let r = CorrelationAnalyzer::pearson_correlation(&x, &y);
    assert!((r - 1.0).abs() < 0.001);
  }

  #[test]
  fn test_pearson_correlation_perfect_negative() {
    let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
    let y = vec![10.0, 8.0, 6.0, 4.0, 2.0];
    let r = CorrelationAnalyzer::pearson_correlation(&x, &y);
    assert!((r - (-1.0)).abs() < 0.001);
  }

  #[test]
  fn test_standard_deviation() {
    let data = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
    let std = CorrelationAnalyzer::standard_deviation(&data);
    assert!((std - 2.0).abs() < 0.1);
  }

  #[test]
  fn test_find_anomalies() {
    let data = vec![10.0, 12.0, 12.0, 13.0, 13.0, 14.0, 15.0, 16.0, 50.0]; // 50 is outlier
    let anomalies = CorrelationAnalyzer::find_anomalies(&data, Some(2.0));
    let anomalies_vec: Vec<usize> = serde_wasm_bindgen::from_value(anomalies).unwrap_or_default();
    assert_eq!(anomalies_vec, vec![8]); // Last element
  }

  #[test]
  fn test_moving_average() {
    let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
    let ma = CorrelationAnalyzer::moving_average(&data, 3);
    let ma_vec: Vec<f64> = serde_wasm_bindgen::from_value(ma).unwrap_or_default();
    assert_eq!(ma_vec.len(), 3);
    assert!((ma_vec[0] - 2.0).abs() < 0.001); // avg(1,2,3)
  }
}
```

Add these functions to the `FitnessCalculator` struct for recovery-specific calculations:

```rust
#[wasm_bindgen(js_name = "calculateSleepConsistencyScore")]
pub fn calculate_sleep_consistency_score(bedtimes: &[f64]) -> f64 {
  // bedtimes in minutes since midnight
  if bedtimes.len() < 3 {
    return 50.0; // Not enough data
  }

  let mean = bedtimes.iter().sum::<f64>() / bedtimes.len() as f64;
  let variance = bedtimes.iter().map(|&t| (t - mean).powi(2)).sum::<f64>() / bedtimes.len() as f64;
  let std = variance.sqrt();

  // Score: 100 at 0 std, 0 at 60+ minutes std dev
  (100.0 - (std * 2.0)).max(0.0).min(100.0)
}

#[wasm_bindgen(js_name = "calculateNutritionConsistency")]
pub fn calculate_nutrition_consistency(
  calories: &[f64],
  targets: &[f64],
) -> f64 {
  if calories.is_empty() || calories.len() != targets.len() {
    return 0.0;
  }

  let mut total_adherence = 0.0;
  let mut valid_days = 0;

  for (i, &cal) in calories.iter().enumerate() {
    let target = targets[i];
    if target > 0.0 {
      let adherence = 1.0 - (cal - target).abs() / target;
      total_adherence += adherence.max(0.0).min(1.0);
      valid_days += 1;
    }
  }

  if valid_days == 0 {
    return 0.0;
  }

  (total_adherence / valid_days as f64) * 100.0
}

#[wasm_bindgen(js_name = "calculateExerciseLoadMetrics")]
pub fn calculate_exercise_load_metrics(
  volumes: &[f64],
  rpes: &[f64],
  durations: &[f64],
) -> JsValue {
  #[derive(serde::Serialize)]
  struct LoadMetrics {
    avg_daily_volume: f64,
    avg_rpe: f64,
    avg_duration: f64,
    high_intensity_days: usize,
    volume_trend: &'static str,
  }

  if volumes.is_empty() {
    let metrics = LoadMetrics {
      avg_daily_volume: 0.0,
      avg_rpe: 0.0,
      avg_duration: 0.0,
      high_intensity_days: 0,
      volume_trend: "stable",
    };
    return to_value(&metrics).unwrap_or(JsValue::NULL);
  }

  let avg_volume = volumes.iter().sum::<f64>() / volumes.len() as f64;
  let avg_rpe = if rpes.is_empty() { 0.0 } else { rpes.iter().sum::<f64>() / rpes.len() as f64 };
  let avg_duration = if durations.is_empty() { 0.0 } else { durations.iter().sum::<f64>() / durations.len() as f64 };
  let high_intensity = rpes.iter().filter(|&&r| r >= 8.0).count();

  // Simple trend
  let mid = volumes.len() / 2;
  let first_half = volumes[..mid].iter().sum::<f64>() / mid as f64;
  let second_half = volumes[mid..].iter().sum::<f64>() / (volumes.len() - mid) as f64;
  let trend = if second_half > first_half * 1.1 { "increasing" }
    else if second_half < first_half * 0.9 { "decreasing" }
    else { "stable" };

  let metrics = LoadMetrics {
    avg_daily_volume: avg_volume,
    avg_rpe: avg_rpe,
    avg_duration: avg_duration,
    high_intensity_days: high_intensity,
    volume_trend: trend,
  };

  to_value(&metrics).unwrap_or(JsValue::NULL)
}
```

Update `lib.rs` exports to include the new correlation module.

### Phase 3: API Routes - Biometric Endpoints

**New File**: `apps/api/src/routes/biometric.ts`

This is the main API layer for biometric correlation.

Key endpoints:

```typescript
// POST /api/biometric/nutrition - Log nutrition entry
// GET /api/biometric/nutrition - Get nutrition history with date range
// POST /api/biometric/sleep - Log sleep entry
// GET /api/biometric/sleep - Get sleep history
// POST /api/biometric/snapshot/generate - Trigger snapshot (on-demand)
// GET /api/biometric/snapshot - Get latest snapshot (cached)
// GET /api/biometric/correlations - Get correlation findings for period
// GET /api/biometric/recovery-score - Calculate current recovery score
```

Use the existing patterns from `body.ts`:
- Auth via `X-User-Id` header + Bearer token
- Drizzle queries with `schema` imports
- KV caching for snapshots and correlations (5 min TTL for on-demand)
- Zod validation for request bodies
- ApiResponse pattern for consistent responses

OpenAPI documentation for each endpoint.

### Phase 4: Correlation Analysis Service

**New File**: `apps/api/src/services/correlation.ts`

`CorrelationAnalyzerService` class:

```typescript
export class CorrelationAnalyzerService {
  constructor(
    private drizzle: DrizzleD1Database<typeof schema>,
    private wasm: any, // CorrelationAnalyzer from @aivo/compute
    private config: CorrelationConfig = DEFAULT_CONFIG
  ) {}

  async generateCorrelations(
    userId: string,
    periodDays: number = 7
  ): Promise<{
    snapshot: BiometricSnapshot;
    findings: CorrelationFinding[];
  }> {
    // 1. Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 2. Fetch data from all three streams in parallel
    const [workouts, sleepLogs, nutritionLogs, bodyMetrics] = await Promise.all([
      this.fetchWorkouts(userId, startDate, endDate),
      this.fetchSleepLogs(userId, startDate, endDate),
      this.fetchNutritionLogs(userId, startDate, endDate),
      this.fetchBodyMetrics(userId, startDate, endDate),
    ]);

    // 3. Calculate data completeness
    const completeness = this.calculateCompleteness(workouts, sleepLogs, nutritionLogs, periodDays);

    if (completeness.dataCompleteness < 0.5) {
      throw new Error(`Insufficient data: only ${(completeness.dataCompleteness * 100).toFixed(0)}% complete`);
    }

    // 4. Call WASM to aggregate snapshot
    const snapshotInput = {
      workouts: workouts.map(w => ({
        date: w.date,
        avg_rpe: w.avgRpe,
        total_volume: w.totalVolume,
        duration: w.duration,
      })),
      sleep: sleepLogs.map(s => ({
        date: s.date,
        duration_hours: s.durationHours,
        quality_score: s.qualityScore,
        bedtime: s.bedtime,
      })),
      nutrition: nutritionLogs.map(n => ({
        date: n.date,
        calories: n.calories,
        calories_target: n.caloriesTarget,
        protein: n.protein,
        protein_target: n.proteinTarget,
        mealTiming: n.mealTiming,
      })),
    };

    const wasmResult = this.wasm.aggregate_biometric_snapshot(
      JSON.stringify(snapshotInput.workouts),
      JSON.stringify(snapshotInput.sleep),
      JSON.stringify(snapshotInput.nutrition),
      periodDays
    );

    const snapshotData: BiometricSnapshot = {
      id: crypto.randomUUID(),
      userId,
      period: periodDays === 7 ? "7d" : "30d",
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      ...JSON.parse(wasmResult),
    };

    // 5. Save snapshot to DB
    const [savedSnapshot] = await this.drizzle
      .insert(schema.biometricSnapshots)
      .values({
        id: snapshotData.id,
        userId,
        period: snapshotData.period,
        generatedAt: Math.floor(snapshotData.generatedAt.getTime() / 1000),
        validUntil: Math.floor(snapshotData.validUntil.getTime() / 1000),
        exerciseLoad: JSON.stringify(snapshotData.exerciseLoad),
        sleep: JSON.stringify(snapshotData.sleep),
        nutrition: JSON.stringify(snapshotData.nutrition),
        bodyMetrics: JSON.stringify(snapshotData.bodyMetrics),
        recoveryScore: snapshotData.recoveryScore,
        warnings: JSON.stringify(snapshotData.warnings),
      })
      .returning();

    // 6. Find correlations
    const findings = await this.findCorrelations(
      userId,
      snapshotData.id,
      workouts,
      sleepLogs,
      nutritionLogs,
      snapshotData
    );

    // 7. Save findings to DB
    if (findings.length > 0) {
      await this.saveFindings(userId, snapshotData.id, findings);
    }

    return { snapshot: snapshotData, findings };
  }

  async getLatestFindings(
    userId: string,
    period: "7d" | "30d" = "7d"
  ): Promise<CorrelationFinding[]> {
    // Get latest valid snapshot
    const snapshot = await this.drizzle.query.biometricSnapshots.findFirst({
      where: and(
        eq(schema.biometricSnapshots.userId, userId),
        eq(schema.biometricSnapshots.period, period),
        gte(schema.biometricSnapshots.validUntil, Math.floor(Date.now() / 1000))
      ),
      orderBy: [desc(schema.biometricSnapshots.generatedAt)],
    });

    if (!snapshot) {
      return [];
    }

    // Get findings with confidence >= 0.6
    const findings = await this.drizzle.query.correlationFindings.findMany({
      where: and(
        eq(schema.correlationFindings.userId, userId),
        eq(schema.correlationFindings.snapshotId, snapshot.id),
        gte(schema.correlationFindings.confidence, 0.6),
        eq(schema.correlationFindings.isDismissed, 0)
      ),
      orderBy: [desc(schema.correlationFindings.confidence)],
    });

    return findings;
  }

  // Private helper methods for fetching data and finding correlations...
}
```

Key correlation detection logic:

- **Load vs Recovery**: Pearson correlation between daily exercise load scores and recovery indicators
- **Sleep vs Recovery**: Sleep quality scores correlated with recovery
- **Nutrition vs Recovery**: Calorie/protein adherence correlated with recovery
- **Meal timing anomaly**: Compare recovery on days with late dinner (>9PM) vs early dinner
- **Anomaly detection**: Z-score > 2 identifies outlier recovery days for further investigation

For each finding with significant correlation (|r| >= 0.5, p < 0.05, confidence >= 0.6):
- Generate plain English explanation
- Generate actionable insight (recommendation)
- Store in `correlationFindings` table

### Phase 5: Cron Job Integration

**File**: `apps/api/src/routes/cron.ts` (extend existing)

Add daily cron job (runs at 2 AM):

```typescript
// Process all active users with sufficient data
// For 7d snapshots: run daily
// For 30d snapshots: run weekly (Sunday)
// Skip if snapshot is still valid (less than 24h old for 7d, 168h for 30d)
// Record stats to systemMetrics or Cloudflare logs
```

### Phase 6: Frontend Components

**Web**: `apps/web/src/components/biometric/`

1. `NutritionForm.tsx` - Form with fields: date, calories, protein, carbs, fat, water, meal times (time pickers)
2. `SleepForm.tsx` - Form with: date, duration (number), quality (slider 0-100), bedtime, waketime (time pickers)
3. `RecoveryDashboard.tsx` - Main dashboard with:
   - Recovery score circular gauge
   - Factor breakdown bars (sleep, nutrition, load)
   - Correlation findings list with explanations
   - Quick log forms (nutrition + sleep) in tabs
   - Refresh button

**Mobile**: `apps/mobile/app/(tabs)/recovery.tsx`

- Similar UI adapted for React Native
- Use `useMetrics()` context for optimistic updates
- Haptic feedback on save
- Native date/time pickers

**Navigation**:

- Web: Add "Recovery" tab in dashboard sidebar or as section on main dashboard
- Mobile: Add "Recovery" tab to bottom tab navigator alongside Workouts, Insights, AI Chat, Profile

### Phase 7: Testing

**Rust Unit Tests** (`packages/aivo-compute/src/correlation_test.rs`):
- Pearson correlation: perfect positive (1.0), perfect negative (-1.0), no correlation (~0)
- Standard deviation against known values
- Z-score anomaly detection
- Moving average
- Snapshot aggregation with sample data

**API Route Tests** (`apps/api/src/routes/__tests__/biometric.test.ts`):
- POST nutrition: validation, success, duplicate date handling
- POST sleep: validation, success
- GET correlations: returns findings if snapshot exists
- GET recovery-score: calculates correctly
- Auth required on all endpoints

**Integration Tests** (`apps/api/src/__tests__/correlation.integration.test.ts`):
- End-to-end: create nutrition/sleep/workouts → generate snapshot → get findings
- Verify findings stored correctly
- Verify cache invalidation

## Files to Create/Modify

### Critical Files (Must Modify)

| File | Changes |
|------|---------|
| `packages/db/src/schema.ts` | Add 4 new tables: `nutritionLogs`, `sleepLogs`, `biometricSnapshots`, `correlationFindings` |
| `packages/aivo-compute/src/lib.rs` | Add `CorrelationAnalyzer` struct with statistical functions + tests |
| `packages/shared-types/src/index.ts` | Add NutritionLog, SleepLog, BiometricSnapshot, CorrelationFinding, RecoveryScoreResult types |
| `apps/api/src/routes/biometric.ts` | New file: all biometric REST endpoints |
| `apps/api/src/services/correlation.ts` | New file: `CorrelationAnalyzerService` class |
| `apps/api/src/routes/cron.ts` | Extend `runCronJob` to process biometric correlations |
| `apps/web/src/components/biometric/NutritionForm.tsx` | New component |
| `apps/web/src/components/biometric/SleepForm.tsx` | New component |
| `apps/web/src/components/biometric/RecoveryDashboard.tsx` | New component |
| `apps/mobile/app/(tabs)/recovery.tsx` | New screen (or extend `insights.tsx`) |

### Supporting Files

| File | Purpose |
|------|---------|
| `apps/api/src/types/biometric.ts` | API response types (optional if in shared-types) |
| `apps/web/src/app/dashboard/recovery/page.tsx` | Page route for recovery dashboard (if separate) |
| `apps/mobile/app/navigation.tsx` | Add recovery tab to bottom navigator |
| `packages/db/migrations/XXXX_add_nutrition_sleep_tables.ts` | Drizzle migration file (auto-generated + manual tweak) |
| `apps/api/__tests__/correlation.test.ts` | Unit tests for CorrelationAnalyzerService |
| `apps/api/__tests__/biometric.routes.test.ts` | Route tests |

## Migration Steps

1. Generate migration:
   ```bash
   cd packages/db
   pnpm exec drizzle-kit generate:sqlite
   ```
   This creates `drizzle/migrations/XXXX_add_nutrition_sleep_tables.ts`

2. Review generated migration for proper foreign keys and indexes

3. Apply locally:
   ```bash
   pnpm --filter @aivo/db exec wrangler d1 migrations apply aivo-db --local
   ```

4. Build WASM:
   ```bash
   pnpm run build:wasm
   ```

5. Test the API endpoints and frontend components

6. Deploy:
   ```bash
   ./scripts/deploy.sh
   ```

## Error Handling Strategy

- **Insufficient data**: Return 400 with message explaining what data is needed
- **Validation errors**: Zod schema returns 422 with field-level errors
- **Computation errors**: WASM failures logged, return 500 with generic error (don't expose internals)
- **Missing user**: 404 if user not found
- **Auth**: 401 if no/invalid token
- **Cache failures**: Log but continue (no user impact)

## Testing Strategy

1. **Unit Tests (Rust)**: All statistical functions with known inputs/outputs
2. **Unit Tests (TypeScript)**: CorrelationAnalyzerService with mocked drizzle and WASM
3. **Route Tests**: All endpoints with various auth states, validation cases
4. **Integration Tests**: Full pipeline from data entry to findings display
5. **Manual Testing**:
   - Create nutrition/sleep logs for test user
   - Trigger on-demand snapshot generation
   - Verify correlations appear in dashboard
   - Check cron job logs for scheduled processing

## Verification Steps

After implementation:

1. **Database**: Verify 4 new tables exist with proper indexes
   ```sql
   .tables nutrition_logs sleep_logs biometric_snapshots correlation_findings
   ```

2. **WASM**: Run `wasm-pack test` to verify all statistical functions work

3. **API**:
   - POST `/api/biometric/nutrition` with valid data → 201
   - POST `/api/biometric/sleep` with valid data → 201
   - GET `/api/biometric/correlations?period=7d` with 7+ days data → returns findings
   - GET `/api/biometric/recovery-score` → returns score object

4. **Cron**: Check Cloudflare logs for "Cron: Biometric correlation processing completed"

5. **Frontend**:
   - Nutrition form submits and appears in list
   - Sleep form submits and appears in list
   - Recovery dashboard shows score and insights
   - Mobile tab displays correctly

6. **End-to-End**:
   - Log nutrition for 7 consecutive days
   - Log sleep for 7 consecutive days
   - Ensure workouts with RPE for 7 days
   - Wait for cron (or trigger manually)
   - Open dashboard → see correlations like "Late night eating reduces recovery by X%"

## Success Criteria

- [ ] 4 new database tables with proper schema
- [ ] 6+ Rust WASM statistical functions with unit tests passing
- [ ] 7 API endpoints (nutrition/sleep CRUD, snapshot, correlations, recovery score)
- [ ] Cron job processing users daily without errors
- [ ] Web dashboard showing recovery score and correlations
- [ ] Mobile recovery tab with nutrition/sleep logging
- [ ] AI explanations generated for findings with actionable insights
- [ ] Token usage optimized: WASM does math, AI only generates explanations
- [ ] Cache hit rate > 80% for snapshot/correlation endpoints

## Performance Considerations

- **Caching**: Snapshot and findings cached in KV for 5 minutes (on-demand) or 24h (cron-generated)
- **Background processing**: Cron generates snapshots asynchronously, users see pre-computed results
- **Data volume**: Limit queries to period range (7d or 30d), use indexes on userId+date
- **WASM cold start**: WASM module loaded once at service initialization (singleton pattern)

## Open Questions / Future Work

1. **Data export**: Include biometric correlations in monthly reports (email-reporter)?
2. **Notifications**: Push notifications when new correlations discovered?
3. **Meal timing granularity**: Should we track individual meal times or just late-night flag?
4. **Sleep stages**: If user connects wearable (Apple Watch, Fitbit), integrate deep/REM data
5. **Correlation visualization**: Add scatter plots showing relationship between variables
6. **Historical trends**: Track correlation strength over time (is relationship getting stronger/weaker)?

---

This plan provides a complete, production-ready implementation of the Biometric Stress & Recovery Correlation feature following AIVO's architecture patterns and technical constraints.
