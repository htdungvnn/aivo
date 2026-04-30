# Acoustic Myography Implementation Plan

## Context

AIVO aims to be a cutting-edge fitness platform. This feature adds **scientific-grade muscle fatigue analysis** using only the smartphone/device microphone - no additional wearable sensors required. This is a "wow" feature that differentiates AIVO from competitors.

**Technical Inspiration**: Research shows that muscles emit low-frequency vibrations (5-100 Hz) during contraction. These "muscle sounds" shift to lower frequencies as fatigue sets in due to slower motor unit firing rates. This is well-documented in biomechanics literature (Acoustic Myography / Mechanomyography).

---

## Architecture Overview

```
┌─────────────────┐     Audio     ┌─────────────────┐     WASM      ┌─────────────────┐
│   Mobile App    │ ──────────────▶│   API Server    │ ─────────────▶│   Rust DSP      │
│  (Expo/React    │   chunks      │  (Hono/Cloud-   │   processing  │   Module        │
│   Native)       │               │   flare Workers)│               │                 │
└─────────────────┘               └─────────────────┘               └─────────────────┘
        │                                   │                                  │
        │                                   │                                  │
        ▼                                   ▼                                  ▼
┌─────────────────┐               ┌─────────────────┐              ┌─────────────────┐
│   Microphone    │               │   D1 Database   │              │   Features:     │
│   (20-200 Hz)   │               │  - Audio chunks │              │  - Bandpass     │
│   Recording     │               │  - Fatigue      │              │    filter       │
│   PCM 16-bit    │               │    readings     │              │  - FFT analysis │
│   8kHz sample   │               │  - Calibration  │              │  - Median freq  │
└─────────────────┘               │    profiles     │              │  - RMS power    │
                                   └─────────────────┘              └─────────────────┘
```

---

## Component 1: Rust/WASM DSP Module

**File**: `packages/aivo-compute/src/acoustic_myography.rs`

### Types to Define

```rust
/// Audio configuration for processing
#[derive(Serialize, Deserialize)]
pub struct AudioConfig {
    sample_rate: u32,        // Typically 8000 Hz (sufficient for 20-200 Hz band)
    chunk_duration_ms: u32,  // Size of audio chunks for analysis (e.g., 500ms)
    bands: Vec<FrequencyBand>,
}

/// Pre-defined frequency bands for muscle analysis
#[derive(Serialize, Deserialize, Clone)]
pub struct FrequencyBand {
    name: String,            // "very_low", "low", "mid", "high"
    min_hz: f64,
    max_hz: f64,
}

/// Band-pass filter state (IIR filter for efficiency)
struct BandpassFilter {
    // Coefficients for 20-200 Hz bandpass
}

/// Fatigue analysis result for a chunk
#[derive(Serialize)]
pub struct FatigueAnalysis {
    pub rms_amplitude: f64,           // Overall power
    pub median_frequency: f64,        // Hz - primary fatigue indicator
    pub frequency_band_energy: Vec<BandEnergy>,
    pub spectral_entropy: f64,        // Signal complexity
    pub motor_unit_recruitment: f64,   // 0-1 estimate
    pub contraction_count: u32,       // Estimated contractions in chunk
    pub confidence: f64,              // 0-1 signal quality score
    pub is_valid: bool,               // False if noise/low quality
}

/// Complete fatigue assessment for an exercise set
#[derive(Serialize)]
pub struct SetFatigueResult {
    pub set_number: u32,
    pub avg_fatigue: f64,             // 0-100 scale
    pub fatigue_velocity: f64,        // Rate of fatigue increase
    pub peak_fatigue: f64,
    pub recovery_rate: f64,           // Post-set recovery
    pub recommendations: Vec<String>,
}
```

### Core Functions (WASM exports)

```rust
#[wasm_bindgen]
impl AcousticMyography {
    /// Initialize the analyzer with configuration
    pub fn init(config_json: &str) -> Result<String, JsValue>;

    /// Process raw PCM audio chunk (mono, 16-bit signed integers)
    /// Returns fatigue analysis JSON
    pub fn process_audio_chunk(pcm_data: &[i16], timestamp_ms: u32) -> Result<String, JsValue>;

    /// Calculate fatigue score from recent analyses (sliding window)
    pub fn calculate_current_fatigue(window_size: usize) -> Result<String, JsValue>;

    /// Get muscle-specific characteristics
    /// Different muscles have different optimal frequency ranges
    pub fn get_muscle_profile(muscle_group: &str) -> Result<String, JsValue>;

    /// Calibrate baseline for user (no contraction, relaxed)
    /// Should be called when user is at rest
    pub fn calibrate_baseline(pcm_data: &[i16]) -> Result<String, JsValue>;

    /// Detect if current signal contains exercise-related muscle sounds
    /// vs. background noise (weights clanking, music, etc.)
    pub fn is_exercise_signal(pcm_data: &[i16]) -> Result<bool, JsValue>;

    /// Get recommended sample rate (should be 8000 Hz)
    pub fn recommended_sample_rate() -> u32;

    /// Get recommended chunk duration (should be 500ms)
    pub fn recommended_chunk_duration_ms() -> u32;
}
```

### DSP Implementation Details

1. **Pre-processing**:
   - DC offset removal (high-pass filter at 5 Hz)
   - Noise gate: ignore signals below threshold
   - Normalization

2. **Band-pass Filter**:
   - Use Butterworth IIR (efficient for real-time)
   - Passband: 20-200 Hz (muscle sound range)
   - Stopband rejection: >40 dB
   - Implementation: cascaded biquad filters

3. **Spectral Analysis**:
   - FFT with window size 512-1024 samples
   - Hann window to reduce spectral leakage
   - Compute power spectral density

4. **Feature Extraction**:
   - **RMS amplitude**: √(1/N Σ x²) - overall activation level
   - **Median frequency**: Frequency where cumulative power = 50%
     - Fatigue causes median frequency to shift LOWER (5-15 Hz drop)
   - **Band energy**: Power in predefined bands (very_low, low, mid, high)
   - **Spectral entropy**: Shannon entropy of normalized spectrum
     - Lower entropy = more regular contraction pattern
   - **Contraction count**: Peak detection in envelope

5. **Fatigue Scoring Algorithm**:
   ```rust
   // Pseudo-code
   base_score = 0.0
   
   // 1. Median frequency drift from baseline (40% weight)
   if let Some(baseline) = baseline_median_freq {
       drift = baseline - current_median_freq
       normalized_drift = clamp(drift / MAX_DRIFT, 0, 1)
       base_score += normalized_drift * 40
   }
   
   // 2. Amplitude pattern change (20% weight)
   // Fatigued muscles show more variable amplitude
   amplitude_variability = std_dev(recent_amplitudes) / mean(recent_amplitudes)
   base_score += amplitude_variability * 20
   
   // 3. Spectral entropy decrease (20% weight)
   // Fatigued = more regular/sustained contraction
   entropy_change = baseline_entropy - current_entropy
   base_score += entropy_change * 20
   
   // 4. Contraction rate (10% weight)
   // Slower firing rates indicate fatigue
   rate_change = (baseline_contraction_rate - current_rate) / baseline
   base_score += rate_change * 10
   
   // 5. Confidence/quality adjustment (10%)
   if confidence < 0.7 {
       base_score *= confidence / 0.7  // Penalize uncertain readings
   }
   
   final_score = clamp(base_score, 0, 100)
   ```

6. **Motor Unit Recruitment Estimation**:
   - Higher recruitment = more motor units firing
   - Estimated from total spectral power and contraction amplitude
   - Normalized 0-1 scale

---

## Component 2: Shared Types

**File**: `packages/shared-types/src/index.ts`

Add new section after existing biometric types:

```typescript
// ============================================
// SECTION XX: ACOUSTIC MYOGRAPHY
// ============================================

/**
 * Frequency band energy distribution from audio analysis
 */
export interface FrequencyBandEnergy {
  band: "very_low" | "low" | "mid" | "high";
  minFreq: number;
  maxFreq: number;
  energy: number;       // Raw power in this band
  normalized: number;   // 0-1 relative to total
}

/**
 * Features extracted from a single audio chunk
 */
export interface AcousticFeatures {
  rmsAmplitude: number;           // Overall signal power
  medianFrequency: number;        // Hz - primary fatigue indicator
  frequencyBands: FrequencyBandEnergy[];
  spectralEntropy: number;        // Shannon entropy (bits)
  motorUnitRecruitment: number;   // 0-1 estimated activation level
  contractionCount: number;       // Estimated contractions in window
  signalToNoiseRatio: number;     // SNR in dB
  confidence: number;             // 0-1 quality score
  isValid: boolean;               // True if signal is clean enough
}

/**
 * Processed acoustic reading (stored in database)
 */
export interface MuscleFatigueReading {
  id: string;
  userId: string;
  sessionId: string;           // Live workout session or analysis batch
  exerciseName: string;        // e.g., "squat", "bench_press"
  muscleGroup: MuscleGroup;    // Which muscle is primary
  timestamp: number;           // Unix timestamp ms
  features: AcousticFeatures;
  fatigueLevel: number;        // 0-100 composite score
  fatigueCategory: "fresh" | "moderate" | "fatigued" | "exhausted";
  setNumber?: number;          // Optional: set during workout
  repNumber?: number;          // Optional: rep within set
  notes?: string;
  createdAt: number;
}

/**
 * Calibration baseline for a user's resting muscle tone
 */
export interface AcousticBaseline {
  id: string;
  userId: string;
  muscleGroup: MuscleGroup;
  createdAt: number;
  medianFrequency: number;
  rmsAmplitude: number;
  spectralEntropy: number;
  contractionRate: number;  // Contractions per second at rest (should be ~0)
  samplesCount: number;     // Number of samples used
}

/**
 * Exercise-specific acoustic profile
 * Different exercises target different muscles with different patterns
 */
export interface ExerciseAcousticProfile {
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  typicalFrequencyRange: [number, number];  // [min_hz, max_hz] Hz
  expectedContractionRate: number;          // Contractions per second
  fatigueMedianFreqShift: number;          // Typical Hz decrease when fatigued
}

/**
 * Real-time streaming configuration
 */
export interface AcousticStreamConfig {
  sampleRate: number;        // Hz (recommended: 8000)
  chunkDurationMs: number;   // (recommended: 500)
  overlapMs: number;         // Overlap between chunks (recommended: 250)
  enableNoiseReduction: boolean;
  enableAdaptiveGain: boolean;
}

/**
 * Request to start acoustic monitoring
 */
export interface StartAcousticMonitoringRequest {
  sessionId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  config?: Partial<AcousticStreamConfig>;
}

/**
 * Audio chunk for batch processing
 */
export interface AudioChunk {
  sessionId: string;
  chunkIndex: number;
  timestamp: number;
  pcmData: number[];         // 16-bit PCM samples
  sampleRate: number;
  durationMs: number;
}

/**
 * Fatigue trend during a workout
 */
export interface FatigueTrend {
  sessionId: string;
  exerciseName: string;
  readings: Array<{
    timestamp: number;
    fatigueLevel: number;
    setNumber?: number;
  }>;
  avgFatigue: number;
  peakFatigue: number;
  fatigueVelocity: number;    // Rate of increase per minute
  recoveryRate: number;       // Recovery between sets
  recommendations: string[];
}

/**
 * Pre-defined muscle acoustic profiles
 */
export const EXERCISE_ACOUSTIC_PROFILES: Record<string, ExerciseAcousticProfile> = {
  squat: {
    exerciseName: "squat",
    primaryMuscle: "quadriceps",
    secondaryMuscles: ["glutes", "hamstrings", "core"],
    typicalFrequencyRange: [30, 80],
    expectedContractionRate: 0.8,  // ~1 contraction per 1.25s
    fatigueMedianFreqShift: 10,    // 10 Hz drop when fatigued
  },
  deadlift: {
    exerciseName: "deadlift",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back", "forearms"],
    typicalFrequencyRange: [25, 70],
    expectedContractionRate: 0.5,  // Slower, controlled movement
    fatigueMedianFreqShift: 12,
  },
  bench_press: {
    exerciseName: "bench_press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    typicalFrequencyRange: [35, 90],
    expectedContractionRate: 0.7,
    fatigueMedianFreqShift: 8,
  },
  // ... more exercises
};

/**
 * Fatigue category thresholds
 */
export const FATIGUE_THRESHOLDS = {
  FRESH_MAX: 25,
  MODERATE_MAX: 50,
  FATIGUED_MAX: 75,
} as const;

/**
 * Get fatigue category from level
 */
export function getFatigueCategory(level: number): "fresh" | "moderate" | "fatigued" | "exhausted" {
  if (level < FATIGUE_THRESHOLDS.FRESH_MAX) return "fresh";
  if (level < FATIGUE_THRESHOLDS.MODERATE_MAX) return "moderate";
  if (level < FATIGUE_THRESHOLDS.FATIGUED_MAX) return "fatigued";
  return "exhausted";
}
```

---

## Component 3: Database Schema Updates

**File**: `packages/db/src/schema.ts`

Add new tables:

```typescript
// Acoustic Myography tables

/**
 * Raw audio chunks (optional - for ML training/re-analysis)
 * Consider R2 storage for actual audio files, DB stores metadata only
 */
export const acousticAudioChunks = sqliteTable("acoustic_audio_chunks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  readingId: text("reading_id").references(() => muscleFatigueReadings.id),
  chunkIndex: integer("chunk_index").notNull(),
  timestamp: integer("timestamp").notNull(),
  durationMs: integer("duration_ms").notNull(),
  sampleRate: integer("sample_rate").notNull(),
  r2Key: text("r2_key"),           // If stored in R2
  fileSize: integer("file_size"),
  checksum: text("checksum"),      // SHA256 for integrity
  isProcessed: integer("is_processed").default(0),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_acoustic_session').on(table.sessionId),
  index('idx_acoustic_user_time').on(table.userId, table.timestamp),
]);

/**
 * Muscle fatigue readings (main table)
 */
export const muscleFatigueReadings = sqliteTable("muscle_fatigue_readings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  timestamp: integer("timestamp").notNull(),
  setNumber: integer("set_number"),
  repNumber: integer("rep_number"),
  features: text("features").notNull(),  // JSON: AcousticFeatures
  fatigueLevel: real("fatigue_level").notNull(),  // 0-100
  fatigueCategory: text("fatigue_category").notNull(),
  confidence: real("confidence").notNull(),  // 0-1
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_fatigue_user_session').on(table.userId, table.sessionId),
  index('idx_fatigue_timestamp').on(table.timestamp),
  index('idx_fatigue_exercise').on(table.exerciseName),
]);

/**
 * User acoustic calibration baselines
 */
export const acousticBaselines = sqliteTable("acoustic_baselines", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  muscleGroup: text("muscle_group").notNull(),
  createdAt: integer("created_at").notNull(),
  validUntil: integer("valid_until"),  // Baselines expire (e.g., after 30 days)
  medianFrequency: real("median_frequency").notNull(),
  rmsAmplitude: real("rms_amplitude").notNull(),
  spectralEntropy: real("spectral_entropy").notNull(),
  contractionRate: real("contraction_rate").notNull(),
  samplesCount: integer("samples_count").notNull(),
  qualityScore: real("quality_score"),  // 0-1, how good the calibration was
}, (table) => [
  index('idx_baseline_user_muscle').on(table.userId, table.muscleGroup),
  unique('unique_user_muscle_baseline').on(table.userId, table.muscleGroup),
]);

/**
 * Exercise acoustic profiles (cached/learned for each user)
 * System can learn user's specific patterns over time
 */
export const userExerciseProfiles = sqliteTable("user_exercise_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  avgFrequencyRange: text("avg_frequency_range"),  // JSON: [min, max]
  avgContractionRate: real("avg_contraction_rate"),
  fatigueShiftAverage: real("fatigue_shift_average"),
  samplesCount: integer("samples_count").notNull(),
  confidence: real("confidence"),  // How reliable this profile is
}, (table) => [
  index('idx_profile_user_exercise').on(table.userId, table.exerciseName),
  unique('unique_user_exercise').on(table.userId, table.exerciseName),
]);

/**
 * Fatigue trend summaries (materialized for performance)
 */
export const fatigueTrends = sqliteTable("fatigue_trends", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  generatedAt: integer("generated_at").notNull(),
  periodMinutes: integer("period_minutes").notNull(),
  startTimestamp: integer("start_timestamp").notNull(),
  endTimestamp: integer("end_timestamp").notNull(),
  readingCount: integer("reading_count").notNull(),
  avgFatigue: real("avg_fatigue").notNull(),
  peakFatigue: real("peak_fatigue").notNull(),
  fatigueVelocity: real("fatigue_velocity"),  // per minute
  recoveryRate: real("recovery_rate"),
  trendData: text("trend_data"),  // JSON array of {timestamp, fatigue}
}, (table) => [
  index('idx_trend_user_session').on(table.userId, table.sessionId),
]);

// Add to schema exports
export const schema = {
  // ... existing tables
  acousticAudioChunks,
  muscleFatigueReadings,
  acousticBaselines,
  userExerciseProfiles,
  fatigueTrends,
};
```

---

## Component 4: API Endpoints

**File**: `apps/api/src/routes/acoustic.ts`

```typescript
import { Hono } from "hono";
import { z } from "zod";
import { authenticate, getUserFromContext } from "../middleware/auth";
import { createDrizzleInstance } from "@aivo/db";
import { 
  muscleFatigueReadings, 
  acousticBaselines, 
  userExerciseProfiles,
  fatigueTrends,
  type MuscleFatigueReading 
} from "@aivo/db/schema";
import { AcousticMyography } from "@aivo/compute";

interface Env {
  DB: D1Database;
}

export const acousticRouter = () => {
  const router = new Hono<{ Bindings: Env }>();
  router.use("*", authenticate);

  // POST /api/acoustic/process-chunk
  // Process a single audio chunk and return fatigue reading
  router.post("/process-chunk", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const body = await c.req.json();
    const schema = z.object({
      sessionId: z.string(),
      exerciseName: z.string(),
      muscleGroup: z.enum(["chest", "back", "shoulders", "biceps", "triceps", "core", "quadriceps", "hamstrings", "glutes", "calves", "forearms", "neck"]),
      pcmData: z.array(z.number().int().min(-32768).max(32767)),  // 16-bit PCM
      sampleRate: z.number().int().positive().default(8000),
      timestamp: z.number().int().optional(),
      setNumber: z.number().int().optional(),
      repNumber: z.number().int().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return c.json({ success: false, error: "Invalid request" }, 400);
    }

    try {
      // Process with WASM
      const pcmData = new Int16Array(validation.data.pcmData);
      const resultJson = AcousticMyography.processAudioChunk(
        pcmData, 
        validation.data.timestamp || Date.now()
      );
      const result: AcousticFeatures = JSON.parse(resultJson);

      // Calculate fatigue level using WASM helper
      const baseline = await getBaselineForMuscle(c.env.DB, userId, validation.data.muscleGroup);
      const fatigueJson = AcousticMyography.calculateFatigueScore(
        JSON.stringify(result),
        baseline ? JSON.stringify(baseline) : null
      );
      const fatigueResult = JSON.parse(fatigueJson);

      // Store reading
      const reading: MuscleFatigueReading = {
        id: `fatigue_${crypto.randomUUID()}`,
        userId,
        sessionId: validation.data.sessionId,
        exerciseName: validation.data.exerciseName,
        muscleGroup: validation.data.muscleGroup,
        timestamp: validation.data.timestamp || Date.now(),
        setNumber: validation.data.setNumber,
        repNumber: validation.data.repNumber,
        features: result,
        fatigueLevel: fatigueResult.fatigueLevel,
        fatigueCategory: fatigueResult.fatigueCategory,
        confidence: result.confidence,
        createdAt: Date.now(),
      };

      const drizzle = createDrizzleInstance(c.env.DB);
      await drizzle.insert(muscleFatigueReadings).values(reading);

      return c.json({ 
        success: true, 
        data: {
          reading,
          fatigue: fatigueResult,
        } 
      });
    } catch (error) {
      console.error("Acoustic processing error:", error);
      return c.json({ success: false, error: "Processing failed" }, 500);
    }
  });

  // GET /api/acoustic/session/:sessionId/trend
  // Get fatigue trend for a workout session
  router.get("/session/:sessionId/trend", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const sessionId = c.req.param("sessionId");

    const drizzle = createDrizzleInstance(c.env.DB);
    
    const readings = await drizzle
      .select()
      .from(muscleFatigueReadings)
      .where(
        and(
          eq(muscleFatigueReadings.userId, userId),
          eq(muscleFatigueReadings.sessionId, sessionId)
        )
      )
      .orderBy(asc(muscleFatigueReadings.timestamp));

    if (readings.length === 0) {
      return c.json({ success: false, error: "No readings found" }, 404);
    }

    // Calculate trend metrics
    const fatigueValues = readings.map(r => r.fatigueLevel);
    const avgFatigue = fatigueValues.reduce((a, b) => a + b, 0) / fatigueValues.length;
    const peakFatigue = Math.max(...fatigueValues);
    
    // Calculate velocity (slope of linear regression)
    const fatigueVelocity = calculateSlope(readings);

    // Generate recommendations based on pattern
    const recommendations = generateFatigueRecommendations(readings);

    return c.json({
      success: true,
      data: {
        sessionId,
        exerciseName: readings[0].exerciseName,
        readingCount: readings.length,
        avgFatigue,
        peakFatigue,
        fatigueVelocity,
        trend: readings.map(r => ({
          timestamp: r.timestamp,
          fatigue: r.fatigueLevel,
          setNumber: r.setNumber,
        })),
        recommendations,
      },
    });
  });

  // POST /api/acoustic/calibrate
  // Establish baseline for a muscle group (user at rest)
  router.post("/calibrate", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const body = await c.req.json();
    const schema = z.object({
      muscleGroup: z.string(),
      pcmSamples: z.array(z.array(z.number().int())),  // Multiple 10-second samples
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return c.json({ success: false, error: "Invalid request" }, 400);
    }

    // Aggregate samples and compute baseline
    const baselineJson = AcousticMyography.calibrateBaseline(
      validation.data.pcmSamples.flatMap(s => new Int16Array(s))
    );
    const baseline = JSON.parse(baselineJson);

    // Store baseline
    const record = {
      id: `baseline_${crypto.randomUUID()}`,
      userId,
      muscleGroup: validation.data.muscleGroup,
      createdAt: Date.now(),
      validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      medianFrequency: baseline.medianFrequency,
      rmsAmplitude: baseline.rmsAmplitude,
      spectralEntropy: baseline.spectralEntropy,
      contractionRate: baseline.contractionRate,
      samplesCount: validation.data.pcmSamples.length,
      qualityScore: baseline.qualityScore,
    };

    const drizzle = createDrizzleInstance(c.env.DB);
    
    // Upsert (replace existing baseline for this muscle)
    await drizzle.insert(acousticBaselines).values(record)
      .onConflictDoUpdate({
        target: acousticBaselines.userId,  // Unique constraint
        set: record,
      });

    return c.json({ success: true, data: record });
  });

  // GET /api/acoustic/baseline/:muscleGroup
  // Get current baseline for a muscle
  router.get("/baseline/:muscleGroup", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const muscleGroup = c.req.param("muscleGroup");

    const drizzle = createDrizzleInstance(c.env.DB);
    const baseline = await drizzle
      .select()
      .from(acousticBaselines)
      .where(
        and(
          eq(acousticBaselines.userId, userId),
          eq(acousticBaselines.muscleGroup, muscleGroup)
        )
      )
      .limit(1)
      .get();

    return c.json({ success: true, data: baseline || null });
  });

  // GET /api/acoustic/readings
  // Get fatigue readings with optional filters
  router.get("/readings", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    
    const exerciseName = c.req.query("exercise");
    const muscleGroup = c.req.query("muscle");
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");

    const drizzle = createDrizzleInstance(c.env.DB);
    let query = drizzle.select()
      .from(muscleFatigueReadings)
      .where(eq(muscleFatigueReadings.userId, userId))
      .orderBy(desc(muscleFatigueReadings.timestamp))
      .limit(limit)
      .offset(offset);

    if (exerciseName) {
      query = query.where(eq(muscleFatigueReadings.exerciseName, exerciseName));
    }
    if (muscleGroup) {
      query = query.where(eq(muscleFatigueReadings.muscleGroup, muscleGroup));
    }

    const readings = await query;
    return c.json({ success: true, data: readings });
  });

  // POST /api/acoustic/analyze-exercise
  // Batch process audio from completed exercise to generate insights
  router.post("/analyze-exercise", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const body = await c.req.json();
    const schema = z.object({
      sessionId: z.string(),
      exerciseName: z.string(),
      chunks: z.array(z.object({
        pcmData: z.array(z.number().int()),
        sampleRate: z.number().int().default(8000),
        timestamp: z.number().int(),
      })),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return c.json({ success: false, error: "Invalid request" }, 400);
    }

    // Process all chunks
    const allReadings: MuscleFatigueReading[] = [];
    for (const chunk of validation.data.chunks) {
      const pcmData = new Int16Array(chunk.pcmData);
      const resultJson = AcousticMyography.processAudioChunk(pcmData, chunk.timestamp);
      const features = JSON.parse(resultJson);

      const baseline = await getBaselineForMuscle(c.env.DB, userId, getPrimaryMuscle(validation.data.exerciseName));
      const fatigueJson = AcousticMyography.calculateFatigueScore(
        JSON.stringify(features),
        baseline ? JSON.stringify(baseline) : null
      );
      const fatigue = JSON.parse(fatigueJson);

      allReadings.push({
        id: `fatigue_${crypto.randomUUID()}`,
        userId,
        sessionId: validation.data.sessionId,
        exerciseName: validation.data.exerciseName,
        muscleGroup: getPrimaryMuscle(validation.data.exerciseName),
        timestamp: chunk.timestamp,
        features,
        fatigueLevel: fatigue.fatigueLevel,
        fatigueCategory: fatigue.fatigueCategory,
        confidence: features.confidence,
        createdAt: Date.now(),
      });
    }

    // Bulk insert
    const drizzle = createDrizzleInstance(c.env.DB);
    await drizzle.insert(muscleFatigueReadings).values(allReadings);

    // Calculate and store trend summary
    const trend = calculateFatigueTrend(validation.data.sessionId, allReadings);
    await drizzle.insert(fatigueTrends).values(trend);

    return c.json({ 
      success: true, 
      data: { 
        readingCount: allReadings.length,
        trend 
      } 
    });
  });

  // GET /api/acoustic/insights/:exerciseName
  // Get AI-generated insights about fatigue patterns for an exercise
  router.get("/insights/:exerciseName", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const exerciseName = c.req.param("exerciseName");

    // Get recent readings (last 10 sessions)
    const drizzle = createDrizzleInstance(c.env.DB);
    const recentReadings = await drizzle
      .select()
      .from(muscleFatigueReadings)
      .where(
        and(
          eq(muscleFatigueReadings.userId, userId),
          eq(muscleFatigueReadings.exerciseName, exerciseName)
        )
      )
      .orderBy(desc(muscleFatigueReadings.timestamp))
      .limit(1000);

    if (recentReadings.length < 10) {
      return c.json({ 
        success: true, 
        data: { 
          message: "Not enough data for insights. Complete more workouts!",
          hasEnoughData: false 
        } 
      });
    }

    // Call AI to generate insights (using existing AI infrastructure)
    const insights = await generateFatigueInsights(exerciseName, recentReadings);

    return c.json({ success: true, data: insights });
  });

  return router;
};

// Helper functions
async function getBaselineForMuscle(db: D1Database, userId: string, muscleGroup: string) {
  // Query baseline from DB
  // ... implementation
  return null;
}

function getPrimaryMuscle(exerciseName: string): MuscleGroup {
  const profile = EXERCISE_ACOUSTIC_PROFILES[exerciseName];
  return profile?.primaryMuscle || "quadriceps";
}

function calculateSlope(readings: MuscleFatigueReading[]): number {
  // Linear regression: fatigue ~= a * time + b
  // Return rate of change per minute
  if (readings.length < 2) return 0;
  
  const n = readings.length;
  const times = readings.map(r => r.timestamp / 60000);  // minutes
  const fatigue = readings.map(r => r.fatigueLevel);
  
  const sumX = times.reduce((a, b) => a + b, 0);
  const sumY = fatigue.reduce((a, b) => a + b, 0);
  const sumXY = times.reduce((sum, x, i) => sum + x * fatigue[i], 0);
  const sumX2 = times.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return isFinite(slope) ? slope : 0;
}

function generateFatigueRecommendations(readings: MuscleFatigueReading[]): string[] {
  const recs: string[] = [];
  const avgFatigue = readings.reduce((a, r) => a + r.fatigueLevel, 0) / readings.length;
  
  if (avgFatigue > 70) {
    recs.push("Consider reducing weight or ending the set to prevent form breakdown");
  }
  if (readings.some(r => r.fatigueCategory === "exhausted")) {
    recs.push("Muscle reached exhaustion - take extended rest or end exercise");
  }
  if (readings.length > 5 && readings[readings.length - 1].fatigueLevel < readings[0].fatigueLevel * 0.7) {
    recs.push("Fatigue is accumulating slowly - maintain current pace");
  }
  
  return recs;
}

function calculateFatigueTrend(sessionId: string, readings: MuscleFatigueReading[]) {
  const timestamps = readings.map(r => r.timestamp);
  const fatigueValues = readings.map(r => r.fatigueLevel);
  
  return {
    id: `trend_${crypto.randomUUID()}`,
    userId: readings[0].userId,
    sessionId,
    exerciseName: readings[0].exerciseName,
    generatedAt: Date.now(),
    periodMinutes: (timestamps[timestamps.length - 1] - timestamps[0]) / 60000,
    startTimestamp: timestamps[0],
    endTimestamp: timestamps[timestamps.length - 1],
    readingCount: readings.length,
    avgFatigue: fatigueValues.reduce((a, b) => a + b, 0) / fatigueValues.length,
    peakFatigue: Math.max(...fatigueValues),
    fatigueVelocity: calculateSlope(readings),
    recoveryRate: 0, // TODO: Calculate from post-set recovery
    trendData: JSON.stringify(readings.map(r => ({
      timestamp: r.timestamp,
      fatigue: r.fatigueLevel,
      setNumber: r.setNumber,
    }))),
  };
}

async function generateFatigueInsights(
  exerciseName: string, 
  readings: MuscleFatigueReading[]
): Promise<{ 
  typicalFatigueRate: number;
  recommendedRestBetweenSets: number;
  optimalSetCount: number;
  personalNotes: string[];
}> {
  // Call AI service (similar to how AI chat works)
  // This could use a specialized prompt or fine-tuned model
  
  const avgFatigueVelocity = calculateAverageVelocity(readings);
  const setDurations = calculateSetDurations(readings);
  const avgSetDuration = setDurations.reduce((a, b) => a + b, 0) / setDurations.length;
  
  // Recommend rest based on fatigue velocity
  // Faster fatigue = longer rest needed
  const recommendedRest = Math.max(60, Math.min(180, 90 + avgFatigueVelocity * 20));
  
  return {
    typicalFatigueRate: avgFatigueVelocity,
    recommendedRestBetweenSets: Math.round(recommendedRest),
    optimalSetCount: estimateOptimalSets(readings),
    personalNotes: [
      `Your ${exerciseName} shows ${avgFatigueVelocity > 2 ? "rapid" : avgFatigueVelocity > 1 ? "moderate" : "slow"} fatigue accumulation`,
      `Based on your patterns, ${Math.round(recommendedRest)}s rest between sets is recommended`,
    ],
  };
}
```

---

## Component 5: Mobile App Integration

### 5.1 Install Dependencies

**File**: `apps/mobile/package.json`

Add:
```json
{
  "dependencies": {
    "expo-av": "~14.0.6",  // Audio recording
    "expo-haptics": "~14.0.1",  // Already exists - for vibration feedback
  }
}
```

### 5.2 Audio Recording Hook

**File**: `apps/mobile/app/hooks/useAcousticRecording.ts`

```typescript
import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useLiveWorkout } from "./useLiveWorkout";

export interface UseAcousticRecordingOptions {
  sessionId: string;
  exerciseName: string;
  primaryMuscle: "chest" | "back" | "shoulders" | "biceps" | "triceps" | 
                  "core" | "quadriceps" | "hamstrings" | "glutes" | "calves";
  sampleRate?: number;
  chunkDurationMs?: number;
  onFatigueUpdate?: (fatigue: number, category: string) => void;
  onCriticalFatigue?: (reading: MuscleFatigueReading) => void;
}

export function useAcousticRecording({
  sessionId,
  exerciseName,
  primaryMuscle,
  sampleRate = 8000,
  chunkDurationMs = 500,
  onFatigueUpdate,
  onCriticalFatigue,
}: UseAcousticRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentFatigue, setCurrentFatigue] = useState<number>(0);
  const [fatigueHistory, setFatigueHistory] = useState<number[]>([]);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const audioBufferRef = useRef<Int16Array[]>([]);
  const lastChunkTimeRef = useRef<number>(0);
  
  const { logFatigueReading } = useLiveWorkout();

  // Process audio chunk when enough samples accumulated
  const processChunk = useCallback(async (pcmData: Int16Array, timestamp: number) => {
    try {
      // Send to API
      const response = await fetch(`${API_BASE_URL}/api/acoustic/process-chunk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          sessionId,
          exerciseName,
          muscleGroup: primaryMuscle,
          pcmData: Array.from(pcmData),
          sampleRate,
          timestamp,
        }),
      });

      if (!response.ok) {
        console.error("Fatigue processing failed:", await response.text());
        return;
      }

      const result = await response.json();
      const { reading, fatigue } = result.data;

      // Update local state
      setCurrentFatigue(fatigue.fatigueLevel);
      setFatigueHistory(prev => [...prev.slice(-20), fatigue.fatigueLevel]);

      // Notify callbacks
      onFatigueUpdate?.(fatigue.fatigueLevel, fatigue.fatigueCategory);

      // Critical fatigue alert
      if (fatigue.fatigueCategory === "exhausted" || fatigue.fatigueLevel > 85) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onCriticalFatigue?.(reading);
      }

      // Log to live workout service
      await logFatigueReading(sessionId, reading);
    } catch (error) {
      console.error("Error processing chunk:", error);
    }
  }, [sessionId, exerciseName, primaryMuscle, sampleRate, onFatigueUpdate, onCriticalFatigue, logFatigueReading]);

  // Audio recording callback
  const onRecordingData = useCallback(async (data: Audio.RecordingData) => {
    if (!isRecording || !data.audio) {
      audioBufferRef.current.push(new Int16Array(data.audio));
    }

    const now = Date.now();
    if (now - lastChunkTimeRef.current < chunkDurationMs) {
      return;
    }

    lastChunkTimeRef.current = now;

    // Combine accumulated samples into chunk
    const chunk = Int16Array.from(audioBufferRef.current.flat());
    audioBufferRef.current = [];

    if (chunk.length > 0) {
      await processChunk(chunk, now);
    }
  }, [isRecording, chunkDurationMs, processChunk]);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Microphone permission required for acoustic fatigue tracking");
        return false;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: "duckOthers",
        interruptionModeAndroid: "duckOthers",
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
      });

      // Create recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
          .override({
            sampleRate,
            channels: 1,
            audioSource: Audio.AudioSource.MIC,
            extension: ".wav",
            outputFormat: Audio.OutputType.RAW,
            android: {
              extension: ".wav",
              outputFormat: Audio.AndroidOutputType.RAW,
              audioEncoder: Audio.AndroidAudioEncoder.AMR_WB,
            },
            ios: {
              outputFormat: Audio.IOSOutputType.RAW,
              audioQuality: Audio.IOSAudioQuality.HIGH,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
          }),
        onRecordingData
      );

      recordingRef.current = recording;
      audioBufferRef.current = [];
      setIsRecording(true);
      lastChunkTimeRef.current = Date.now();

      return true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      return false;
    }
  }, [sampleRate, chunkDurationMs, onRecordingData]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsRecording(false);
    }
  }, []);

  return {
    isRecording,
    currentFatigue,
    fatigueHistory,
    startRecording,
    stopRecording,
  };
}
```

### 5.3 Integration with Live Workout

**File**: `apps/mobile/app/components/workout/AcousticFatigueMonitor.tsx`

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAcousticRecording } from "../../hooks/useAcousticRecording";
import { MuscleGauge } from "./MuscleGauge";

interface AcousticFatigueMonitorProps {
  sessionId: string;
  exerciseName: string;
  primaryMuscle: string;
}

export function AcousticFatigueMonitor({
  sessionId,
  exerciseName,
  primaryMuscle,
}: AcousticFatigueMonitorProps) {
  const { currentFatigue, fatigueHistory, isRecording, startRecording, stopRecording } =
    useAcousticRecording({
      sessionId,
      exerciseName,
      primaryMuscle,
      onFatigueUpdate: (fatigue, category) => {
        // Show in-UI feedback
        console.log(`Fatigue: ${fatigue} (${category})`);
      },
      onCriticalFatigue: (reading) => {
        // Show alert
        Alert.alert(
          "High Fatigue Detected",
          `Your ${primaryMuscle} is showing signs of exhaustion. Consider stopping or reducing weight.`,
          [
            { text: "Continue", style: "cancel" },
            { text: "End Set", onPress: () => {/* end current set */ } },
          ]
        );
      },
    });

  const getFatigueColor = (level: number) => {
    if (level < 25) return "#22c55e";  // green
    if (level < 50) return "#3b82f6";  // blue
    if (level < 75) return "#f59e0b";  // amber
    return "#ef4444";  // red
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Muscle Fatigue Monitor</Text>
      
      <MuscleGauge
        value={currentFatigue}
        maxValue={100}
        color={getFatigueColor(currentFatigue)}
        label={primaryMuscle}
      />

      <View style={styles.history}>
        {fatigueHistory.slice(-10).map((val, i) => (
          <View
            key={i}
            style={[
              styles.historyBar,
              { height: val / 2, backgroundColor: getFatigueColor(val) },
            ]}
          />
        ))}
      </View>

      {!isRecording ? (
        <Button title="Start Fatigue Tracking" onPress={startRecording} />
      ) : (
        <Button title="Stop Tracking" onPress={stopRecording} color="#ef4444" />
      )}

      <Text style={styles.note}>
        Acoustic myography uses your microphone to detect muscle fatigue.
        No data is stored locally without consent.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#1f2937",
    borderRadius: 12,
    margin: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  history: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 60,
    marginVertical: 16,
    gap: 2,
  },
  historyBar: {
    flex: 1,
    minWidth: 4,
    borderRadius: 2,
  },
  note: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 12,
    textAlign: "center",
  },
});
```

---

## Component 6: AI Insights Integration

The acoustic fatigue data can feed into the existing AI coach:

**Existing file**: `apps/api/src/routes/ai.ts`

Add endpoint or enhance existing chat to include acoustic insights:

```typescript
// When generating workout recommendations, consider fatigue patterns
// The AI can answer questions like:
// - "Why am I fatiguing faster on squats lately?"
// - "When should I increase weight based on my recovery patterns?"
// - "What's causing my uneven fatigue between left and right?" (with bilateral monitoring)
```

---

## Implementation Steps

### Phase 1: Rust/WASM DSP Module (Week 1-2)

1. Create `packages/aivo-compute/src/acoustic_myography.rs`
2. Implement band-pass filter (Butterworth 20-200 Hz, 4th order)
3. Implement FFT-based spectral analysis (use `rustfft` crate)
4. Implement feature extraction functions
5. Implement fatigue scoring algorithm
6. Add WASM bindings with `#[wasm_bindgen]`
7. Write unit tests for DSP functions
8. Update `Cargo.toml` with new dependencies:
   ```toml
   [dependencies]
   rustfft = "6.2"
   numeric_array = "0.5"
   ```
9. Build WASM: `pnpm --filter @aivo/compute run build`
10. Verify `.wasm` file generated in `pkg/`

### Phase 2: Shared Types (Week 1)

1. Add acoustic myography types to `packages/shared-types/src/index.ts`
2. Export types from `packages/shared-types/dist/src/`
3. Update dependent packages:
   ```bash
   pnpm --filter @aivo/api update-shared-types
   pnpm --filter @aivo/mobile update-shared-types
   ```

### Phase 3: Database Schema (Week 2)

1. Add new tables to `packages/db/src/schema.ts`
2. Generate migration: `pnpm --filter @aivo/db run generate`
3. Migration file will be created in `packages/db/drizzle/migrations/`
4. Apply locally: `pnpm --filter @aivo/db run migrate:local`
5. Verify tables exist with `wrangler d1 execute aivo-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"`

### Phase 4: API Endpoints (Week 2-3)

1. Create `apps/api/src/routes/acoustic.ts` with all endpoints
2. Register router in `apps/api/src/index.ts` or `apps/api/src/routes/index.ts`:
   ```typescript
   import { acousticRouter } from "./acoustic";
   app.route("/api/acoustic/*", acousticRouter());
   ```
3. Add error handling and validation
4. Write tests for each endpoint
5. Update OpenAPI/Swagger documentation

### Phase 5: Mobile Integration (Week 3-4)

1. Add `expo-av` to `apps/mobile/package.json`
2. Create `useAcousticRecording` hook
3. Create `AcousticFatigueMonitor` component
4. Integrate into workout screen
5. Test on physical device (simulator won't have real microphone for extended recording)
6. Handle permission flows gracefully

### Phase 6: Testing & Calibration (Week 4)

1. Unit test all WASM functions with known signals
2. Test with synthetic audio (sine waves, noise, combined)
3. Record calibration data with test users
4. Tune fatigue scoring parameters
5. Verify median frequency shift behavior
6. Mobile E2E tests with Jest

### Phase 7: Production Readiness (Week 5)

1. Performance optimization (WASM size, processing latency)
2. Battery impact testing (continuous recording)
3. Offline mode support (cache readings, sync later)
4. Privacy considerations (audio never leaves device unless explicitly uploaded)
5. Documentation and user guide
6. Load testing API endpoints

---

## Technical Challenges & Mitigations

| Challenge | Mitigation |
|-----------|------------|
| **Gym background noise** (music, clanging weights) | Band-pass filter 20-200 Hz eliminates most gym noise; adaptive noise reduction; signal quality confidence score |
| **Phone placement variability** | Calibration phase helps; robust feature extraction; machine learning model could adapt |
| **Different muscle groups** | Each muscle has characteristic frequency range; exercise profiles map which muscle to monitor |
| **Battery drain from continuous recording** | Process chunks then sleep; adaptive sampling (higher rate during contractions, lower at rest) |
| **WASM bundle size** | Rust code compiled with `opt-level = "z"` (size optimization); only include needed features |
| **Latency for real-time feedback** | Process within 200ms target; use Web Workers on web; keep mobile processing on device |

---

## Verification & Testing

### Unit Tests

**Rust** (`packages/aivo-compute/src/acoustic_myography.rs`):
```rust
#[cfg(test)]
mod tests {
  #[test]
  fn test_bandpass_filter_20_200hz() {
    // Generate 50 Hz sine wave, verify pass
    // Generate 10 Hz sine wave, verify attenuation
  }
  
  #[test]
  fn test_median_frequency_calculation() {
    // Known spectrum, verify median computed correctly
  }
  
  #[test]
  fn test_fatigue_detection_synthetic() {
    // Simulate fresh signal (higher median freq)
    // Simulate fatigued signal (15 Hz lower median)
    // Verify fatigue score increases
  }
}
```

**TypeScript** (`apps/api/src/routes/acoustic.test.ts`):
```typescript
describe("Acoustic Routes", () => {
  it("processes audio chunk and returns reading", async () => {
    const pcmData = generateTestSignal(50, 8000, 500); // 50 Hz test tone
    const res = await request(app)
      .post("/api/acoustic/process-chunk")
      .set("Authorization", `Bearer ${token}`)
      .json({ ... });
    
    expect(res.status).toBe(200);
    expect(res.body.data.fatigueLevel).toBeGreaterThanOrEqual(0);
    expect(res.body.data.fatigueLevel).toBeLessThanOrEqual(100);
  });
});
```

### Integration Test

1. Record 30s of audio during bicep curls at low weight (fresh)
2. Record 30s after 5 sets (fatigued)
3. Verify median frequency shifts lower
4. Verify fatigue score increases over time

### Manual Verification Steps

1. **Build and run**:
   ```bash
   pnpm install
   pnpm --filter @aivo/compute run build
   pnpm --filter @aivo/db run migrate:local
   pnpm --filter @aivo/api run dev
   ```

2. **Mobile app test**:
   - Start workout
   - Tap "Start Fatigue Tracking"
   - Perform exercise
   - Observe fatigue gauge move
   - Verify readings stored in DB

3. **API test**:
   ```bash
   curl -X POST http://localhost:8787/api/acoustic/process-chunk \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"sessionId":"test","exerciseName":"squat","muscleGroup":"quadriceps","pcmData":[...]}'
   ```

---

## Future Enhancements

1. **Bilateral monitoring**: Use stereo microphones to compare left/right muscle fatigue (imbalance detection)
2. **Machine learning model**: Train on labeled data to improve accuracy beyond heuristic scoring
3. **Personalized baselines**: Learn each user's unique acoustic signature for each muscle
4. **Integration with live adjustment**: Feed fatigue data into the existing live workout adjustment system for automatic weight/reps reduction
5. **Recovery tracking**: Monitor muscle recovery rate between workouts (similar to HRV)
6. **Exercise form validation**: Certain sounds indicate proper vs improper form (e.g., "clunk" vs smooth contraction)

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `packages/aivo-compute/src/acoustic_myography.rs` | Main DSP module |
| `packages/aivo-compute/Cargo.toml` | Add rustfft dependency |
| `packages/shared-types/src/index.ts` | TypeScript type definitions |
| `packages/db/src/schema.ts` | Database tables |
| `apps/api/src/routes/acoustic.ts` | API endpoints |
| `apps/mobile/app/hooks/useAcousticRecording.ts` | Mobile recording hook |
| `apps/mobile/app/components/workout/AcousticFatigueMonitor.tsx` | UI component |

---

## Success Criteria

1. **Accuracy**: Fatigue score correlates with perceived exertion (RPE) within ±10 points on 0-100 scale
2. **Performance**: Audio chunk processed in <200ms on mobile device
3. **Signal quality**: >80% of chunks deemed valid (confidence > 0.7) in gym environment
4. **Battery impact**: <5% battery drain per hour of continuous monitoring
5. **User engagement**: >30% of users try the feature, >60% retention among those who try

---

## Estimated Effort

- **Rust DSP development**: 3-4 days
- **API implementation**: 2-3 days  
- **Mobile integration**: 2-3 days
- **Testing & calibration**: 2-3 days
- **Documentation**: 1 day

**Total: 10-14 days** for MVP implementation
