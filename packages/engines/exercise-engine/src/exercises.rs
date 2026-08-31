use serde::{Deserialize, Serialize};
use crate::geometry::Landmark;

/// Exercise codes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExerciseCode {
    Squat,
    PushUp,
    Lunge,
    ShoulderPress,
    Plank,
}

impl ExerciseCode {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "squat" => Some(Self::Squat),
            "push_up" => Some(Self::PushUp),
            "lunge" => Some(Self::Lunge),
            "shoulder_press" => Some(Self::ShoulderPress),
            "plank" => Some(Self::Plank),
            _ => None,
        }
    }
}

/// Exercise phases
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExercisePhase {
    Ready,
    Descending,
    Bottom,
    Ascending,
    Completed,
    Calibrating,
    Paused,
    Holding,  // For plank
    Failed,   // For plank
}

impl ExercisePhase {
    pub fn to_string(&self) -> &'static str {
        match self {
            Self::Ready => "ready",
            Self::Descending => "descending",
            Self::Bottom => "bottom",
            Self::Ascending => "ascending",
            Self::Completed => "completed",
            Self::Calibrating => "calibrating",
            Self::Paused => "paused",
            Self::Holding => "holding",
            Self::Failed => "failed",
        }
    }
}

/// Correction severity
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Info,
    Hint,
    Warning,
    Critical,
}

/// Correction result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionResult {
    pub code: String,
    pub severity: Severity,
    pub confidence: f32,
    pub side: String,
}

impl CorrectionResult {
    pub fn new(code: &str, severity: Severity, confidence: f32, side: &str) -> Self {
        Self {
            code: code.to_string(),
            severity,
            confidence,
            side: side.to_string(),
        }
    }
}

/// Range of motion thresholds
#[derive(Debug, Clone)]
pub struct RangeOfMotion {
    pub min_angle: f32,
    pub max_angle: f32,
    pub required_change: f32,
    pub measurement_joint: &'static str,
}

/// Form rule definition
#[derive(Debug, Clone)]
pub struct FormRule {
    pub code: &'static str,
    pub severity: Severity,
    pub threshold: f32,
    pub window_frames: u32,
    pub primary_joint: Option<&'static str>,
    pub applicable_phases: Vec<ExercisePhase>,
}

/// Exercise definition
#[derive(Debug, Clone)]
pub struct ExerciseDefinition {
    pub code: ExerciseCode,
    pub name: &'static str,
    pub required_joints: Vec<usize>,
    pub camera_orientation: &'static str,
    pub range_of_motion: RangeOfMotion,
    pub min_rep_duration_ms: u32,
    pub max_rep_duration_ms: u32,
    pub rep_cooldown_ms: u32,
    pub phases: Vec<ExercisePhase>,
    pub form_rules: Vec<FormRule>,
}

impl ExerciseDefinition {
    pub fn get_squat() -> Self {
        Self {
            code: ExerciseCode::Squat,
            name: "Squat",
            required_joints: vec![11, 12, 23, 24, 25, 26, 27, 28], // Shoulders, hips, knees, ankles
            camera_orientation: "front",
            range_of_motion: RangeOfMotion {
                min_angle: 70.0,  // At bottom
                max_angle: 170.0, // Standing
                required_change: 60.0,
                measurement_joint: "left_knee",
            },
            min_rep_duration_ms: 1500,
            max_rep_duration_ms: 8000,
            rep_cooldown_ms: 500,
            phases: vec![
                ExercisePhase::Ready,
                ExercisePhase::Descending,
                ExercisePhase::Bottom,
                ExercisePhase::Ascending,
                ExercisePhase::Completed,
            ],
            form_rules: vec![
                FormRule {
                    code: "KNEE_COLLAPSE_INWARD",
                    severity: Severity::Warning,
                    threshold: 15.0, // degrees
                    window_frames: 3,
                    primary_joint: Some("knee"),
                    applicable_phases: vec![
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                        ExercisePhase::Ascending,
                    ],
                },
                FormRule {
                    code: "SQUAT_NOT_DEEP_ENOUGH",
                    severity: Severity::Hint,
                    threshold: 100.0, // knee angle
                    window_frames: 5,
                    primary_joint: Some("knee"),
                    applicable_phases: vec![ExercisePhase::Bottom],
                },
                FormRule {
                    code: "FORWARD_LEAN_TOO_MUCH",
                    severity: Severity::Warning,
                    threshold: 45.0, // degrees from vertical
                    window_frames: 3,
                    primary_joint: Some("torso"),
                    applicable_phases: vec![
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                    ],
                },
                FormRule {
                    code: "ROUNDED_LOWER_BACK",
                    severity: Severity::Critical,
                    threshold: 160.0, // hip angle threshold
                    window_frames: 3,
                    primary_joint: Some("hip"),
                    applicable_phases: vec![
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                        ExercisePhase::Ascending,
                    ],
                },
            ],
        }
    }

    pub fn get_push_up() -> Self {
        Self {
            code: ExerciseCode::PushUp,
            name: "Push-up",
            required_joints: vec![11, 12, 13, 14, 15, 16], // Shoulders, elbows, wrists
            camera_orientation: "side",
            range_of_motion: RangeOfMotion {
                min_angle: 80.0,  // At bottom
                max_angle: 180.0, // At top
                required_change: 60.0,
                measurement_joint: "left_elbow",
            },
            min_rep_duration_ms: 2000,
            max_rep_duration_ms: 10000,
            rep_cooldown_ms: 500,
            phases: vec![
                ExercisePhase::Ready,
                ExercisePhase::Descending,
                ExercisePhase::Bottom,
                ExercisePhase::Ascending,
                ExercisePhase::Completed,
            ],
            form_rules: vec![
                FormRule {
                    code: "ELBOWS_FLARE_OUT",
                    severity: Severity::Hint,
                    threshold: 45.0, // degrees from body
                    window_frames: 3,
                    primary_joint: Some("elbow"),
                    applicable_phases: vec![
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                    ],
                },
                FormRule {
                    code: "SHOULDERS_NOT_STACKED",
                    severity: Severity::Warning,
                    threshold: 10.0, // pixels offset
                    window_frames: 3,
                    primary_joint: Some("shoulder"),
                    applicable_phases: vec![
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                        ExercisePhase::Ascending,
                    ],
                },
                FormRule {
                    code: "HIP_SAGGING",
                    severity: Severity::Warning,
                    threshold: 20.0, // degrees from straight line
                    window_frames: 3,
                    primary_joint: Some("hip"),
                    applicable_phases: vec![
                        ExercisePhase::Ready,
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                        ExercisePhase::Ascending,
                    ],
                },
            ],
        }
    }

    pub fn get_lunge() -> Self {
        Self {
            code: ExerciseCode::Lunge,
            name: "Lunge",
            required_joints: vec![23, 24, 25, 26, 27, 28, 29, 30, 31, 32], // Hips, knees, ankles, feet
            camera_orientation: "front",
            range_of_motion: RangeOfMotion {
                min_angle: 70.0,
                max_angle: 170.0,
                required_change: 50.0,
                measurement_joint: "front_knee",
            },
            min_rep_duration_ms: 2000,
            max_rep_duration_ms: 10000,
            rep_cooldown_ms: 800,
            phases: vec![
                ExercisePhase::Ready,
                ExercisePhase::Descending,
                ExercisePhase::Bottom,
                ExercisePhase::Ascending,
                ExercisePhase::Completed,
            ],
            form_rules: vec![
                FormRule {
                    code: "FRONT_KNEE_PAST_TOES",
                    severity: Severity::Hint,
                    threshold: 0.0, // pixels past toe line
                    window_frames: 3,
                    primary_joint: Some("front_knee"),
                    applicable_phases: vec![
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                    ],
                },
                FormRule {
                    code: "TORSO_LEANING_FORWARD",
                    severity: Severity::Warning,
                    threshold: 30.0, // degrees from vertical
                    window_frames: 3,
                    primary_joint: Some("torso"),
                    applicable_phases: vec![
                        ExercisePhase::Descending,
                        ExercisePhase::Bottom,
                    ],
                },
                FormRule {
                    code: "LUNGE_UNEVEN_DEPTH",
                    severity: Severity::Hint,
                    threshold: 20.0, // degrees difference
                    window_frames: 5,
                    primary_joint: Some("hips"),
                    applicable_phases: vec![ExercisePhase::Bottom],
                },
            ],
        }
    }

    pub fn get_shoulder_press() -> Self {
        Self {
            code: ExerciseCode::ShoulderPress,
            name: "Shoulder Press",
            required_joints: vec![11, 12, 13, 14, 15, 16], // Shoulders, elbows, wrists
            camera_orientation: "front",
            range_of_motion: RangeOfMotion {
                min_angle: 90.0,  // Arms bent
                max_angle: 180.0, // Arms extended
                required_change: 70.0,
                measurement_joint: "left_elbow",
            },
            min_rep_duration_ms: 1500,
            max_rep_duration_ms: 8000,
            rep_cooldown_ms: 500,
            phases: vec![
                ExercisePhase::Ready,
                ExercisePhase::Ascending, // Pressing up
                ExercisePhase::Completed,
                ExercisePhase::Descending, // Lowering
            ],
            form_rules: vec![
                FormRule {
                    code: "ARCH_IN_LOWER_BACK",
                    severity: Severity::Warning,
                    threshold: 30.0, // degrees arch
                    window_frames: 3,
                    primary_joint: Some("hip"),
                    applicable_phases: vec![
                        ExercisePhase::Ascending,
                        ExercisePhase::Ready,
                    ],
                },
                FormRule {
                    code: "PRESS_NOT_SYMMETRIC",
                    severity: Severity::Hint,
                    threshold: 15.0, // degrees difference
                    window_frames: 3,
                    primary_joint: Some("elbow"),
                    applicable_phases: vec![
                        ExercisePhase::Ascending,
                        ExercisePhase::Descending,
                    ],
                },
                FormRule {
                    code: "INCOMPLETE_LOCKOUT",
                    severity: Severity::Hint,
                    threshold: 170.0, // degrees
                    window_frames: 5,
                    primary_joint: Some("elbow"),
                    applicable_phases: vec![ExercisePhase::Completed],
                },
            ],
        }
    }

    pub fn get_plank() -> Self {
        Self {
            code: ExerciseCode::Plank,
            name: "Plank",
            required_joints: vec![11, 12, 23, 24], // Shoulders and hips
            camera_orientation: "side",
            range_of_motion: RangeOfMotion {
                min_angle: 150.0, // Straight body line
                max_angle: 180.0,
                required_change: 5.0,
                measurement_joint: "shoulder_hip_ankle",
            },
            min_rep_duration_ms: 10000, // Minimum 10 second hold
            max_rep_duration_ms: 300000, // 5 minutes max
            rep_cooldown_ms: 0,
            phases: vec![
                ExercisePhase::Ready,
                ExercisePhase::Holding,
                ExercisePhase::Fatigue,
                ExercisePhase::Failed,
            ],
            form_rules: vec![
                FormRule {
                    code: "HIP_SAGGING",
                    severity: Severity::Warning,
                    threshold: 20.0,
                    window_frames: 3,
                    primary_joint: Some("hip"),
                    applicable_phases: vec![
                        ExercisePhase::Ready,
                        ExercisePhase::Holding,
                        ExercisePhase::Fatigue,
                    ],
                },
                FormRule {
                    code: "HIP_PIKING_UP",
                    severity: Severity::Warning,
                    threshold: 20.0,
                    window_frames: 3,
                    primary_joint: Some("hip"),
                    applicable_phases: vec![
                        ExercisePhase::Ready,
                        ExercisePhase::Holding,
                        ExercisePhase::Fatigue,
                    ],
                },
                FormRule {
                    code: "SHOULDERS_NOT_ALIGNED",
                    severity: Severity::Hint,
                    threshold: 10.0,
                    window_frames: 3,
                    primary_joint: Some("shoulder"),
                    applicable_phases: vec![
                        ExercisePhase::Ready,
                        ExercisePhase::Holding,
                    ],
                },
                FormRule {
                    code: "HEAD_DROPPING",
                    severity: Severity::Hint,
                    threshold: 30.0, // degrees from neutral
                    window_frames: 5,
                    primary_joint: Some("head"),
                    applicable_phases: vec![
                        ExercisePhase::Holding,
                        ExercisePhase::Fatigue,
                    ],
                },
            ],
        }
    }

    pub fn from_code(code: &str) -> Option<Self> {
        match ExerciseCode::from_str(code) {
            Some(ExerciseCode::Squat) => Some(Self::get_squat()),
            Some(ExerciseCode::PushUp) => Some(Self::get_push_up()),
            Some(ExerciseCode::Lunge) => Some(Self::get_lunge()),
            Some(ExerciseCode::ShoulderPress) => Some(Self::get_shoulder_press()),
            Some(ExerciseCode::Plank) => Some(Self::get_plank()),
            None => None,
        }
    }
}

/// Get all exercise definitions
pub fn get_all_exercises() -> Vec<ExerciseDefinition> {
    vec![
        ExerciseDefinition::get_squat(),
        ExerciseDefinition::get_push_up(),
        ExerciseDefinition::get_lunge(),
        ExerciseDefinition::get_shoulder_press(),
        ExerciseDefinition::get_plank(),
    ]
}
