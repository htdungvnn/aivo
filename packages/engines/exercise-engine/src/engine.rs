use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use crate::geometry::{Landmark, Point3D, Point2D, calculate_angle_3d, calculate_angle_2d, distance_3d, distance_2d};
use crate::exercises::{ExerciseDefinition, ExerciseCode, ExercisePhase, Severity, CorrectionResult};

/// Engine configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineConfig {
    #[serde(default)]
    pub smoothing_window_size: usize,
    #[serde(default)]
    pub min_confidence: f32,
    #[serde(default)]
    pub rep_cooldown_ms: u32,
    #[serde(default)]
    pub min_phase_duration_ms: u32,
    #[serde(default)]
    pub calibration_frames_required: u32,
    #[serde(default)]
    pub calibration_confidence_threshold: f32,
}

impl Default for EngineConfig {
    fn default() -> Self {
        Self {
            smoothing_window_size: 5,
            min_confidence: 0.5,
            rep_cooldown_ms: 500,
            min_phase_duration_ms: 200,
            calibration_frames_required: 30,
            calibration_confidence_threshold: 0.7,
        }
    }
}

/// Engine state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub exercise_code: String,
    pub current_phase: String,
    pub previous_phase: Option<String>,
    pub rep_count: u32,
    pub rep_start_time: u64,
    pub last_rep_time: Option<u64>,
    pub phase_start_time: u64,
    pub calibration_frame_count: u32,
    pub is_calibrated: bool,
    pub current_rep_metrics: RepMetrics,
    pub active_corrections: std::collections::HashMap<String, ActiveCorrection>,
    pub visibility_history: VecDeque<f32>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            exercise_code: "squat".to_string(),
            current_phase: "ready".to_string(),
            previous_phase: None,
            rep_count: 0,
            rep_start_time: 0,
            last_rep_time: None,
            phase_start_time: 0,
            calibration_frame_count: 0,
            is_calibrated: false,
            current_rep_metrics: RepMetrics::default(),
            active_corrections: std::collections::HashMap::new(),
            visibility_history: VecDeque::with_capacity(10),
        }
    }
}

/// Metrics for current rep
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RepMetrics {
    pub min_angles: std::collections::HashMap<String, f32>,
    pub max_angles: std::collections::HashMap<String, f32>,
    pub tempo_samples: Vec<f32>,
    pub stability_score: f32,
    pub correction_count: u32,
    pub range_of_motion: f32,
}

/// Active correction tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveCorrection {
    pub frame_count: u32,
    pub first_detected: u64,
    pub severity: String,
}

impl EngineState {
    pub fn new(exercise_code: &str) -> Self {
        Self {
            exercise_code: exercise_code.to_string(),
            ..Default::default()
        }
    }
}

/// Engine input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineInput {
    pub landmarks: Vec<LandmarkInput>,
    #[serde(default)]
    pub visibility: VisibilityInput,
    pub exercise_code: String,
    pub current_phase: String,
    pub current_rep_count: u32,
    pub timestamp_ms: u64,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandmarkInput {
    pub index: usize,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub visibility: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisibilityInput {
    pub overall: f32,
    pub required: f32,
}

/// Engine output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineOutput {
    pub exercise: String,
    pub phase: String,
    pub rep_count: u32,
    #[serde(default)]
    pub is_rep_complete: bool,
    pub current_rep: Option<CurrentRepOutput>,
    #[serde(default)]
    pub corrections: Vec<CorrectionResult>,
    pub pose_confidence: f32,
    pub calibration: Option<CalibrationStatus>,
    #[serde(default)]
    pub processing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentRepOutput {
    pub range_of_motion: f32,
    pub tempo_seconds: f32,
    pub quality_score: f32,
    pub duration_ms: u64,
    pub corrections: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationStatus {
    pub is_complete: bool,
    pub progress: f32,
    pub message: Option<String>,
}

impl EngineOutput {
    pub fn error(message: &str) -> Self {
        Self {
            exercise: "error".to_string(),
            phase: "error".to_string(),
            rep_count: 0,
            is_rep_complete: false,
            current_rep: None,
            corrections: vec![],
            pose_confidence: 0.0,
            calibration: None,
            processing_time_ms: 0,
        }
    }
}

/// Main exercise engine
pub struct Engine {
    config: EngineConfig,
    state: EngineState,
    exercise: Option<ExerciseDefinition>,
    smoothed_landmarks: VecDeque<Vec<Landmark>>,
    angle_history: VecDeque<std::collections::HashMap<String, f32>>,
}

impl Engine {
    fn get_instance() -> &'static mut Self {
        // Simple singleton for this example
        static mut ENGINE: Option<Engine> = None;
        unsafe {
            if ENGINE.is_none() {
                ENGINE = Some(Engine::new_internal(EngineConfig::default()));
            }
            ENGINE.as_mut().unwrap()
        }
    }

    fn new_internal(config: EngineConfig) -> Self {
        Self {
            config,
            state: EngineState::default(),
            exercise: None,
            smoothed_landmarks: VecDeque::with_capacity(5),
            angle_history: VecDeque::with_capacity(10),
        }
    }

    pub fn new(config: EngineConfig) -> Self {
        Self::new_internal(config)
    }

    pub fn get_state(&self) -> &EngineState {
        &self.state
    }

    pub fn reset(&mut self, exercise_code: &str) {
        self.state = EngineState::new(exercise_code);
        self.exercise = ExerciseDefinition::from_code(exercise_code);
        self.smoothed_landmarks.clear();
        self.angle_history.clear();
    }

    pub fn start_calibration(&mut self) {
        self.state.calibration_frame_count = 0;
        self.state.is_calibrated = false;
        self.state.current_phase = "calibrating".to_string();
    }

    pub fn is_calibrated(&self) -> bool {
        self.state.is_calibrated
    }

    pub fn process(&mut self, input: EngineInput) -> EngineOutput {
        let start_time = std::time::Instant::now();
        
        // Update state from input
        self.state.exercise_code = input.exercise_code.clone();
        self.state.current_phase = input.current_phase.clone();
        self.state.rep_count = input.current_rep_count;

        // Get or load exercise definition
        if self.exercise.is_none() || self.exercise.as_ref().map(|e| e.code.to_string()) != Some(input.exercise_code.clone()) {
            self.exercise = ExerciseDefinition::from_code(&input.exercise_code);
        }

        let exercise = match &self.exercise {
            Some(e) => e,
            None => {
                return EngineOutput::error(&format!("Unknown exercise: {}", input.exercise_code));
            }
        };

        // Convert input landmarks
        let landmarks: [Landmark; 33] = {
            let mut arr = [Landmark { x: 0.0, y: 0.0, z: 0.0, visibility: 0.0 }; 33];
            for lm in &input.landmarks {
                if lm.index < 33 {
                    arr[lm.index] = Landmark {
                        x: lm.x,
                        y: lm.y,
                        z: lm.z,
                        visibility: lm.visibility,
                    };
                }
            }
            arr
        };

        // Add to smoothing buffer
        self.smoothed_landmarks.push_back(landmarks.to_vec());
        if self.smoothed_landmarks.len() > self.config.smoothing_window_size {
            self.smoothed_landmarks.pop_front();
        }

        // Apply temporal smoothing
        let smoothed = self.smooth_landmarks();
        
        // Calculate angles
        let angles = self.calculate_angles(&smoothed);
        
        // Add to angle history
        self.angle_history.push_back(angles.clone());
        if self.angle_history.len() > 10 {
            self.angle_history.pop_front();
        }

        // Update visibility history
        self.state.visibility_history.push_back(input.visibility.overall);
        if self.state.visibility_history.len() > 10 {
            self.state.visibility_history.pop_front();
        }

        // Check calibration
        if !self.state.is_calibrated {
            self.state.calibration_frame_count += 1;
            let progress = (self.state.calibration_frame_count as f32 / self.config.calibration_frames_required as f32).min(1.0);
            
            if self.state.calibration_frame_count >= self.config.calibration_frames_required 
                && input.visibility.overall >= self.config.calibration_confidence_threshold
            {
                self.state.is_calibrated = true;
                self.state.current_phase = "ready".to_string();
            }

            return EngineOutput {
                exercise: input.exercise_code,
                phase: "calibrating".to_string(),
                rep_count: self.state.rep_count,
                is_rep_complete: false,
                current_rep: None,
                corrections: vec![],
                pose_confidence: input.visibility.overall,
                calibration: Some(CalibrationStatus {
                    is_complete: self.state.is_calibrated,
                    progress,
                    message: if self.state.is_calibrated {
                        Some("Ready! Begin when you're comfortable.".to_string())
                    } else {
                        Some("Hold the starting position...".to_string())
                    },
                }),
                processing_time_ms: start_time.elapsed().as_millis() as u64,
            };
        }

        // Detect phase
        let phase = self.detect_phase(&angles, &smoothed, exercise);
        
        // Check for rep completion
        let (is_rep_complete, new_rep_count) = self.check_rep_completion(&phase, input.timestamp_ms, exercise);
        
        if is_rep_complete {
            self.state.rep_count = new_rep_count;
            self.state.last_rep_time = Some(input.timestamp_ms);
        }

        // Evaluate form rules
        let corrections = self.evaluate_form_rules(&angles, &smoothed, exercise);

        // Update rep metrics
        self.update_rep_metrics(&angles, input.timestamp_ms);

        // Build current rep output
        let current_rep = if self.state.rep_count > 0 {
            Some(CurrentRepOutput {
                range_of_motion: self.state.current_rep_metrics.range_of_mrom(),
                tempo_seconds: self.calculate_tempo(),
                quality_score: self.calculate_quality_score(&corrections),
                duration_ms: input.timestamp_ms - self.state.rep_start_time,
                corrections: corrections.iter().map(|c| c.code.clone()).collect(),
            })
        } else {
            None
        };

        EngineOutput {
            exercise: input.exercise_code,
            phase,
            rep_count: self.state.rep_count,
            is_rep_complete,
            current_rep,
            corrections,
            pose_confidence: input.visibility.overall,
            calibration: None,
            processing_time_ms: start_time.elapsed().as_millis() as u64,
        }
    }

    fn smooth_landmarks(&self) -> Vec<Landmark> {
        if self.smoothed_landmarks.is_empty() {
            return vec![];
        }

        let window_size = self.smoothed_landmarks.len();
        let mut smoothed = vec![Landmark::default(); 33];

        for i in 0..33 {
            let mut sum_x = 0.0;
            let mut sum_y = 0.0;
            let mut sum_z = 0.0;
            let mut sum_vis = 0.0;

            for frame in &self.smoothed_landmarks {
                sum_x += frame[i].x;
                sum_y += frame[i].y;
                sum_z += frame[i].z;
                sum_vis += frame[i].visibility;
            }

            smoothed[i] = Landmark {
                x: sum_x / window_size as f32,
                y: sum_y / window_size as f32,
                z: sum_z / window_size as f32,
                visibility: sum_vis / window_size as f32,
            };
        }

        smoothed
    }

    fn calculate_angles(&self, landmarks: &[Landmark]) -> std::collections::HashMap<String, f32> {
        let mut angles = std::collections::HashMap::new();

        if landmarks.len() < 33 {
            return angles;
        }

        // Knee angles (left and right)
        let left_hip = Point3D { x: landmarks[23].x, y: landmarks[23].y, z: landmarks[23].z };
        let left_knee = Point3D { x: landmarks[25].x, y: landmarks[25].y, z: landmarks[25].z };
        let left_ankle = Point3D { x: landmarks[27].x, y: landmarks[27].y, z: landmarks[27].z };
        
        let right_hip = Point3D { x: landmarks[24].x, y: landmarks[24].y, z: landmarks[24].z };
        let right_knee = Point3D { x: landmarks[26].x, y: landmarks[26].y, z: landmarks[26].z };
        let right_ankle = Point3D { x: landmarks[28].x, y: landmarks[28].y, z: landmarks[28].z };

        angles.insert("left_knee".to_string(), calculate_angle_3d(left_hip, left_knee, left_ankle));
        angles.insert("right_knee".to_string(), calculate_angle_3d(right_hip, right_knee, right_ankle));

        // Hip angles
        let left_shoulder = Point3D { x: landmarks[11].x, y: landmarks[11].y, z: landmarks[11].z };
        let right_shoulder = Point3D { x: landmarks[12].x, y: landmarks[12].y, z: landmarks[12].z };

        angles.insert("left_hip".to_string(), calculate_angle_3d(left_knee, left_hip, left_shoulder));
        angles.insert("right_hip".to_string(), calculate_angle_3d(right_knee, right_hip, right_shoulder));

        // Elbow angles
        let left_shoulder_j = Point3D { x: landmarks[11].x, y: landmarks[11].y, z: landmarks[11].z };
        let left_elbow = Point3D { x: landmarks[13].x, y: landmarks[13].y, z: landmarks[13].z };
        let left_wrist = Point3D { x: landmarks[15].x, y: landmarks[15].y, z: landmarks[15].z };
        
        let right_shoulder_j = Point3D { x: landmarks[12].x, y: landmarks[12].y, z: landmarks[12].z };
        let right_elbow = Point3D { x: landmarks[14].x, y: landmarks[14].y, z: landmarks[14].z };
        let right_wrist = Point3D { x: landmarks[16].x, y: landmarks[16].y, z: landmarks[16].z };

        angles.insert("left_elbow".to_string(), calculate_angle_3d(left_shoulder_j, left_elbow, left_wrist));
        angles.insert("right_elbow".to_string(), calculate_angle_3d(right_shoulder_j, right_elbow, right_wrist));

        // Shoulder angles (for arm position)
        angles.insert("left_shoulder".to_string(), calculate_angle_3d(left_elbow, left_shoulder_j, left_hip));
        angles.insert("right_shoulder".to_string(), calculate_angle_3d(right_elbow, right_shoulder_j, right_hip));

        // Torso angle (lean)
        let mid_shoulder = Point3D {
            x: (left_shoulder.x + right_shoulder.x) / 2.0,
            y: (left_shoulder.y + right_shoulder.y) / 2.0,
            z: (left_shoulder.z + right_shoulder.z) / 2.0,
        };
        let mid_hip = Point3D {
            x: (left_hip.x + right_hip.x) / 2.0,
            y: (left_hip.y + right_hip.y) / 2.0,
            z: (left_hip.z + right_hip.z) / 2.0,
        };
        
        // Vertical reference
        let vertical = Point3D { x: mid_shoulder.x, y: mid_shoulder.y - 1.0, z: mid_shoulder.z };
        angles.insert("torso_angle".to_string(), calculate_angle_3d(vertical, mid_shoulder, mid_hip));

        angles
    }

    fn detect_phase(
        &self,
        angles: &std::collections::HashMap<String, f32>,
        _landmarks: &[Landmark],
        exercise: &ExerciseDefinition,
    ) -> String {
        let rom = &exercise.range_of_motion;
        
        // Get current angle for measurement
        let current_angle = angles
            .get(rom.measurement_joint)
            .copied()
            .unwrap_or(150.0);

        let phase = match exercise.code {
            ExerciseCode::Squat | ExerciseCode::Lunge => {
                // Squat/Lunge phase detection based on knee angle
                let prev_phase = &self.state.current_phase;
                
                if current_angle > 150.0 {
                    ExercisePhase::Ready
                } else if current_angle < 100.0 {
                    if prev_phase == &ExercisePhase::Descending.to_string() || prev_phase == &ExercisePhase::Ready.to_string() {
                        ExercisePhase::Bottom
                    } else {
                        ExercisePhase::Descending
                    }
                } else if current_angle > 100.0 && current_angle < 150.0 {
                    if prev_phase == &ExercisePhase::Bottom.to_string() || prev_phase == &ExercisePhase::Descending.to_string() {
                        ExercisePhase::Ascending
                    } else {
                        ExercisePhase::Descending
                    }
                } else {
                    ExercisePhase::Ready
                }
            }
            ExerciseCode::PushUp | ExerciseCode::ShoulderPress => {
                // Push-up and shoulder press based on elbow angle
                let elbow_angle = angles.get("left_elbow").copied().unwrap_or(180.0);
                
                if elbow_angle > 160.0 {
                    ExercisePhase::Ready
                } else if elbow_angle < 90.0 {
                    ExercisePhase::Bottom
                } else {
                    ExercisePhase::Descending
                }
            }
            ExerciseCode::Plank => {
                // Plank - static hold
                ExercisePhase::Holding
            }
        };

        phase.to_string()
    }

    fn check_rep_completion(
        &mut self,
        phase: &str,
        timestamp: u64,
        exercise: &ExerciseDefinition,
    ) -> (bool, u32) {
        let phase_duration = timestamp.saturating_sub(self.state.phase_start_time);
        
        // Minimum phase duration check
        if phase_duration < self.config.min_phase_duration_ms as u64 {
            return (false, self.state.rep_count);
        }

        // Cooldown check
        if let Some(last_rep) = self.state.last_rep_time {
            if timestamp - last_rep < self.config.rep_cooldown_ms as u64 {
                return (false, self.state.rep_count);
            }
        }

        // Phase transition detection
        let prev_phase = self.state.previous_phase.as_deref();
        let current_phase = phase;

        // Check for completed rep
        if prev_phase == Some("ascending") && current_phase == "ready" {
            // Rep completed
            let new_count = self.state.rep_count + 1;
            self.state.rep_start_time = timestamp;
            self.state.current_rep_metrics = RepMetrics::default();
            return (true, new_count);
        }

        // Update phase tracking
        if prev_phase != Some(current_phase) {
            self.state.previous_phase = Some(self.state.current_phase.clone());
            self.state.current_phase = current_phase.to_string();
            self.state.phase_start_time = timestamp;
        }

        (false, self.state.rep_count)
    }

    fn evaluate_form_rules(
        &mut self,
        angles: &std::collections::HashMap<String, f32>,
        _landmarks: &[Landmark],
        exercise: &ExerciseDefinition,
    ) -> Vec<CorrectionResult> {
        let mut corrections = vec![];

        for rule in &exercise.form_rules {
            // Check if phase applies
            if !rule.applicable_phases.is_empty() {
                let current_phase = ExercisePhase::from_str(&self.state.current_phase)
                    .unwrap_or(ExercisePhase::Ready);
                if !rule.applicable_phases.contains(&current_phase) {
                    continue;
                }
            }

            // Evaluate rule
            let (triggered, confidence, side) = self.evaluate_rule(rule, angles);
            
            if triggered {
                // Update active correction
                let entry = self.state.active_corrections
                    .entry(rule.code.to_string())
                    .or_insert(ActiveCorrection {
                        frame_count: 0,
                        first_detected: 0,
                        severity: format!("{:?}", rule.severity),
                    });
                entry.frame_count += 1;

                // Check window frames
                if entry.frame_count >= rule.window_frames {
                    corrections.push(CorrectionResult::new(
                        rule.code,
                        rule.severity,
                        confidence,
                        side,
                    ));
                    entry.frame_count = 0; // Reset after triggering
                }
            } else {
                // Reset counter if not triggered
                self.state.active_corrections.remove(rule.code);
            }
        }

        corrections
    }

    fn evaluate_rule(
        &self,
        rule: &crate::exercises::FormRule,
        angles: &std::collections::HashMap<String, f32>,
    ) -> (bool, f32, &'static str) {
        // Simplified rule evaluation
        match rule.code {
            "SQUAT_NOT_DEEP_ENOUGH" => {
                if let Some(knee_angle) = angles.get("left_knee") {
                    if *knee_angle > rule.threshold {
                        return (true, 0.8, "both");
                    }
                }
            }
            "KNEE_COLLAPSE_INWARD" => {
                // Would need hip/knee/ankle alignment check
                return (false, 0.0, "none");
            }
            "FORWARD_LEAN_TOO_MUCH" => {
                if let Some(torso_angle) = angles.get("torso_angle") {
                    if *torso_angle > rule.threshold {
                        return (true, 0.85, "both");
                    }
                }
            }
            "ELBOWS_FLARE_OUT" => {
                // Would need arm angle check
                return (false, 0.0, "none");
            }
            _ => {}
        }

        (false, 0.0, "none")
    }

    fn update_rep_metrics(&mut self, angles: &std::collections::HashMap<String, f32>, timestamp: u64) {
        let metrics = &mut self.state.current_rep_metrics;
        
        // Update angle ranges
        for (joint, angle) in angles {
            let min = metrics.min_angles.entry(joint.clone()).or_insert(*angle);
            let max = metrics.max_angles.entry(joint.clone()).or_insert(*angle);
            *min = min.min(*angle);
            *max = max.max(*angle);
        }

        // Calculate ROM if we have both min and max
        if let (Some(min), Some(max)) = (
            metrics.min_angles.get("left_knee"),
            metrics.max_angles.get("left_knee")
        ) {
            if *max > *min + 10.0 {
                metrics.range_of_motion = ((*max - *min) / 100.0).min(1.0);
            }
        }

        // Update stability (simplified)
        metrics.stability_score = 0.9; // Placeholder
    }

    fn calculate_tempo(&self) -> f32 {
        let samples = &self.state.current_rep_metrics.tempo_samples;
        if samples.is_empty() {
            return 0.0;
        }
        samples.iter().sum::<f32>() / samples.len() as f32
    }

    fn calculate_quality_score(&self, corrections: &[CorrectionResult]) -> f32 {
        let mut score = 100.0;
        
        for correction in corrections {
            match correction.severity {
                Severity::Info => score -= 2.0,
                Severity::Hint => score -= 5.0,
                Severity::Warning => score -= 15.0,
                Severity::Critical => score -= 30.0,
            }
        }

        score.max(0.0).min(100.0)
    }
}

// Need to implement ExercisePhase::from_str
impl ExercisePhase {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "ready" => Some(Self::Ready),
            "descending" => Some(Self::Descending),
            "bottom" => Some(Self::Bottom),
            "ascending" => Some(Self::Ascending),
            "completed" => Some(Self::Completed),
            "calibrating" => Some(Self::Calibrating),
            "paused" => Some(Self::Paused),
            "holding" => Some(Self::Holding),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

impl RepMetrics {
    fn range_of_mrom(&self) -> f32 {
        self.range_of_motion
    }
}

// Benchmark module
pub mod benchmark {
    use super::*;

    #[derive(Debug, Serialize)]
    pub struct BenchmarkResult {
        pub engine: String,
        pub operations: std::collections::HashMap<String, OperationMetric>,
        pub total_operations: u32,
        pub total_time_ms: u64,
    }

    #[derive(Debug, Serialize)]
    pub struct OperationMetric {
        pub total_ms: u64,
        pub count: u32,
        pub average_ms: f64,
    }

    pub fn run_benchmark(iterations: u32) -> BenchmarkResult {
        let mut angle_times = vec![];
        let mut phase_times = vec![];
        let start = std::time::Instant::now();

        // Create sample landmarks
        let landmarks: [Landmark; 33] = [Landmark {
            x: 0.5,
            y: 0.5,
            z: 0.0,
            visibility: 0.9,
        }; 33];

        for _ in 0..iterations {
            // Benchmark angle calculation
            let t = std::time::Instant::now();
            let _ = calculate_angle_3d(
                Point3D { x: 0.3, y: 0.4, z: 0.0 },
                Point3D { x: 0.5, y: 0.3, z: 0.0 },
                Point3D { x: 0.7, y: 0.4, z: 0.0 },
            );
            angle_times.push(t.elapsed().as_nanos() as u64);

            // Benchmark phase detection
            let t = std::time::Instant::now();
            let angles: std::collections::HashMap<String, f32> = std::collections::HashMap::from([
                ("left_knee".to_string(), 120.0),
                ("right_knee".to_string(), 118.0),
                ("torso_angle".to_string(), 15.0),
            ]);
            let _ = if angles.get("left_knee").copied().unwrap_or(0.0) > 150.0 {
                "ready"
            } else if angles.get("left_knee").copied().unwrap_or(0.0) < 100.0 {
                "bottom"
            } else {
                "descending"
            };
            phase_times.push(t.elapsed().as_nanos() as u64);
        }

        let total_time = start.elapsed().as_millis() as u64;

        let mut operations = std::collections::HashMap::new();
        operations.insert("angle_calculation".to_string(), OperationMetric {
            total_ms: angle_times.iter().sum(),
            count: iterations,
            average_ms: angle_times.iter().sum::<u64>() as f64 / iterations as f64,
        });
        operations.insert("phase_detection".to_string(), OperationMetric {
            total_ms: phase_times.iter().sum(),
            count: iterations,
            average_ms: phase_times.iter().sum::<u64>() as f64 / iterations as f64,
        });

        BenchmarkResult {
            engine: "wasm".to_string(),
            operations,
            total_operations: iterations * 2,
            total_time_ms: total_time,
        }
    }
}
