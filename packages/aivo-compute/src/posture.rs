// ============================================
// POSTURE ANALYSIS MODULE
// ============================================

use wasm_bindgen::prelude::*;
use serde::Serialize;
use std::collections::HashMap;
use js_sys::Date;

/// Real-time posture correction analyzer
/// Provides geometric validation of exercise form using skeleton joint coordinates
#[wasm_bindgen]
pub struct PostureAnalyzer;

/// 2D/3D joint position with confidence
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct JointPosition {
    x: f64,
    y: f64,
    z: Option<f64>, // Optional depth for 3D
    confidence: f64, // 0-1 detection confidence
}

/// Skeleton data for a single frame
#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct SkeletonFrame {
    frame_number: u32,
    timestamp_ms: u32,
    joints: HashMap<String, JointPosition>, // key: joint name like "left_hip", "right_knee"
}

/// Complete skeleton sequence for an exercise
#[derive(serde::Serialize, serde::Deserialize)]
struct SkeletonData {
    exercise_type: String,
    frames: Vec<SkeletonFrame>,
    metadata: SkeletonMetadata,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct SkeletonMetadata {
    fps: u32,
    resolution_width: u32,
    resolution_height: u32,
    total_frames: u32,
}

/// Computed joint angles at a specific frame
#[derive(serde::Serialize, Clone)]
struct JointAngles {
    frame_number: u32,
    timestamp_ms: u32,
    // Lower body
    left_hip_angle: f64,
    right_hip_angle: f64,
    left_knee_angle: f64,
    right_knee_angle: f64,
    left_ankle_angle: f64,
    right_ankle_angle: f64,
    // Spine and upper body
    back_angle: f64,
    left_shoulder_angle: f64,
    right_shoulder_angle: f64,
    left_elbow_angle: f64,
    right_elbow_angle: f64,
}

/// A detected form deviation
#[derive(serde::Serialize, Clone)]
struct FormDeviation {
    joint: String,
    issue_type: String,
    severity: String,
    confidence: f64,
    timestamp_ms: u32,
    actual_value: f64,
    expected_range: String,
    description: String,
    cue: String,
}

/// Analysis result for a skeleton sequence
#[derive(serde::Serialize)]
struct PostureAnalysisResult {
    overall_score: f64,
    grade: String,
    total_frames_analyzed: u32,
    deviations: Vec<FormDeviation>,
    critical_warnings: Vec<String>,
    exercise_specific_notes: Vec<String>,
    processing_time_ms: u64,
}

/// Ideal angle ranges for each exercise
#[derive(Clone, Copy)]
struct IdealSquatRanges {
    hip_angle_min: f64, hip_angle_max: f64,
    knee_angle_min: f64, knee_angle_max: f64,
    back_angle_max: f64,
    knee_valgus_tolerance: f64,
}

#[derive(Clone, Copy)]
struct IdealDeadliftRanges {
    hip_angle_min: f64, hip_angle_max: f64,
    knee_angle_min: f64, knee_angle_max: f64,
    back_angle_max: f64,
    shoulder_angle_min: f64,
}

#[derive(Clone, Copy)]
struct IdealPressRanges {
    shoulder_angle_min: f64, shoulder_angle_max: f64,
    elbow_angle_min: f64, elbow_angle_max: f64,
    back_arch_max: f64,
}

#[derive(Clone, Copy)]
struct IdealLungeRanges {
    front_knee_angle_min: f64, front_knee_angle_max: f64,
    back_knee_angle_min: f64, back_knee_angle_max: f64,
    torso_angle_max: f64,
    hip_alignment_tolerance: f64,
}

/// Wrapper to hold all exercise ranges
#[derive(Clone, Copy)]
struct IdealAngleRanges {
    squat: IdealSquatRanges,
    deadlift: IdealDeadliftRanges,
    bench_press: IdealPressRanges,
    overhead_press: IdealPressRanges,
    lunge: IdealLungeRanges,
}

impl IdealAngleRanges {
    fn get(&self, exercise_type: &str) -> &dyn ExerciseRanges {
        match exercise_type {
            "squat" => &self.squat,
            "deadlift" => &self.deadlift,
            "bench_press" => &self.bench_press,
            "overhead_press" => &self.overhead_press,
            "lunge" => &self.lunge,
            _ => &self.squat,
        }
    }
}

trait ExerciseRanges {
    // Common trait for accessing ranges - not used directly but provides type safety
}

impl ExerciseRanges for IdealSquatRanges {}
impl ExerciseRanges for IdealDeadliftRanges {}
impl ExerciseRanges for IdealPressRanges {}
impl ExerciseRanges for IdealLungeRanges {}

impl IdealAngleRanges {
    fn static_ranges() -> &'static IdealAngleRanges {
        static RANGES: IdealAngleRanges = IdealAngleRanges {
            squat: IdealSquatRanges {
                hip_angle_min: 75.0, hip_angle_max: 95.0,
                knee_angle_min: 80.0, knee_angle_max: 100.0,
                back_angle_max: 25.0,
                knee_valgus_tolerance: 10.0,
            },
            deadlift: IdealDeadliftRanges {
                hip_angle_min: 60.0, hip_angle_max: 80.0,
                knee_angle_min: 100.0, knee_angle_max: 130.0,
                back_angle_max: 20.0,
                shoulder_angle_min: 5.0,
            },
            bench_press: IdealPressRanges {
                shoulder_angle_min: 30.0, shoulder_angle_max: 60.0,
                elbow_angle_min: 70.0, elbow_angle_max: 85.0,
                back_arch_max: 45.0,
            },
            overhead_press: IdealPressRanges {
                shoulder_angle_min: 150.0, shoulder_angle_max: 180.0,
                elbow_angle_min: 160.0, elbow_angle_max: 180.0,
                back_arch_max: 20.0,
            },
            lunge: IdealLungeRanges {
                front_knee_angle_min: 85.0, front_knee_angle_max: 100.0,
                back_knee_angle_min: 70.0, back_knee_angle_max: 90.0,
                torso_angle_max: 15.0,
                hip_alignment_tolerance: 5.0,
            },
        };
        &RANGES
    }
}

#[wasm_bindgen]
impl PostureAnalyzer {
    /// Analyze skeleton data and return form corrections
    /// skeleton_json: JSON string of SkeletonData
    /// Returns JSON string of PostureAnalysisResult
    #[wasm_bindgen(js_name = "analyzeSkeleton")]
    pub fn analyze_skeleton(skeleton_json: &str) -> Result<String, JsValue> {
        let start_time = js_sys::Date::now();

        let skeleton: SkeletonData = serde_json::from_str(skeleton_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid skeleton data: {}", e)))?;

        if skeleton.frames.is_empty() {
            return Err(JsValue::from_str("No frames to analyze"));
        }

        // Calculate angles for each frame
        let mut all_angles = Vec::new();
        for frame in &skeleton.frames {
            if let Some(angles) = Self::calculate_frame_angles(frame, &skeleton.exercise_type) {
                all_angles.push(angles);
            }
        }

        // Validate against ideal ranges
        let ideal_ranges = IdealAngleRanges::static_ranges();
        let mut all_deviations = Vec::new();
        let mut critical_warnings = Vec::new();

        for angles in &all_angles {
            let deviations = Self::validate_angles(&angles, ideal_ranges, &skeleton.exercise_type);
            all_deviations.extend(deviations);

            // Check for critical safety issues
            if skeleton.exercise_type == "squat" || skeleton.exercise_type == "deadlift" {
                if angles.back_angle.abs() > 45.0 {
                    critical_warnings.push(format!("Frame {}: Severe back rounding detected (>45°) - STOP and reduce weight",
                        angles.frame_number));
                }
            }
        }

        // Calculate overall score (0-100)
        let overall_score = Self::calculate_overall_score(&all_deviations, skeleton.frames.len());

        // Determine grade
        let grade = if overall_score >= 90.0 { "A" }
            else if overall_score >= 80.0 { "B" }
            else if overall_score >= 70.0 { "C" }
            else if overall_score >= 60.0 { "D" }
            else { "F" };

        // Generate exercise-specific notes
        let notes = Self::generate_exercise_notes(&skeleton.exercise_type, &all_deviations);

        let processing_time = js_sys::Date::now() - start_time;

        let result = PostureAnalysisResult {
            overall_score,
            grade: grade.to_string(),
            total_frames_analyzed: skeleton.frames.len() as u32,
            deviations: all_deviations,
            critical_warnings,
            exercise_specific_notes: notes,
            processing_time_ms: processing_time as u64,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
    }

    /// Calculate joint angles from skeleton frame
    fn calculate_frame_angles(frame: &SkeletonFrame, exercise_type: &str) -> Option<JointAngles> {
        // Required joints for basic analysis
        let required_joints = match exercise_type {
            "squat" | "deadlift" => &["nose", "neck", "left_shoulder", "right_shoulder",
                "left_hip", "right_hip", "left_knee", "right_knee",
                "left_ankle", "right_ankle"][..],
            "bench_press" | "overhead_press" => &["nose", "neck", "left_shoulder", "right_shoulder",
                "left_elbow", "right_elbow", "left_wrist", "right_wrist"][..],
            "lunge" => &["nose", "neck", "left_hip", "right_hip",
                "left_knee", "right_knee", "left_ankle", "right_ankle"][..],
            _ => &["nose", "neck", "left_hip", "right_hip", "left_knee", "right_knee",
                "left_ankle", "right_ankle", "left_shoulder", "right_shoulder"][..],
        };

        // Check all required joints present with sufficient confidence
        for joint in required_joints {
            if !frame.joints.contains_key(*joint) {
                return None;
            }
            if let Some(pos) = frame.joints.get(*joint) {
                if pos.confidence < 0.5 {
                    return None;
                }
            }
        }

        // Extract joint positions
        let left_hip = frame.joints.get("left_hip")?;
        let right_hip = frame.joints.get("right_hip")?;
        let left_knee = frame.joints.get("left_knee")?;
        let right_knee = frame.joints.get("right_knee")?;
        let left_ankle = frame.joints.get("left_ankle")?;
        let right_ankle = frame.joints.get("right_ankle")?;

        let neck = frame.joints.get("neck")?;
        let nose = frame.joints.get("nose")?;

        // Calculate hip angles (torso-thigh angle)
        let left_hip_angle = Self::calculate_angle_3d(neck, left_hip, left_knee);
        let right_hip_angle = Self::calculate_angle_3d(neck, right_hip, right_knee);

        // Calculate knee angles (thigh-shin angle)
        let left_knee_angle = Self::calculate_angle_3d(left_hip, left_knee, left_ankle);
        let right_knee_angle = Self::calculate_angle_3d(right_hip, right_knee, right_ankle);

        // Calculate back angle (torso verticality)
        let back_angle = Self::calculate_vertical_angle(neck, nose);

        // Get shoulder and elbow angles if available
        let left_shoulder = frame.joints.get("left_shoulder");
        let right_shoulder = frame.joints.get("right_shoulder");
        let left_elbow = frame.joints.get("left_elbow");
        let right_elbow = frame.joints.get("right_elbow");
        let left_wrist = frame.joints.get("left_wrist");
        let right_wrist = frame.joints.get("right_wrist");

        // Shoulder angle: neck -> shoulder -> elbow
        let left_shoulder_angle = left_shoulder.and_then(|ls| {
            left_elbow.and_then(|le| {
                Some(Self::calculate_angle_3d(neck, ls, le))
            })
        });
        let right_shoulder_angle = right_shoulder.and_then(|rs| {
            right_elbow.and_then(|re| {
                Some(Self::calculate_angle_3d(neck, rs, re))
            })
        });

        // Elbow angle: shoulder -> elbow -> wrist
        let left_elbow_angle = left_shoulder.and_then(|ls| {
            left_elbow.and_then(|le| {
                left_wrist.map(|lw| Self::calculate_angle_3d(ls, le, lw))
            })
        });
        let right_elbow_angle = right_shoulder.and_then(|rs| {
            right_elbow.and_then(|re| {
                right_wrist.map(|rw| Self::calculate_angle_3d(rs, re, rw))
            })
        });

        Some(JointAngles {
            frame_number: frame.frame_number,
            timestamp_ms: frame.timestamp_ms,
            left_hip_angle,
            right_hip_angle,
            left_knee_angle,
            right_knee_angle,
            left_ankle_angle: Self::calculate_ankle_angle(left_knee, left_ankle),
            right_ankle_angle: Self::calculate_ankle_angle(right_knee, right_ankle),
            back_angle,
            left_shoulder_angle: left_shoulder_angle.unwrap_or(0.0),
            right_shoulder_angle: right_shoulder_angle.unwrap_or(0.0),
            left_elbow_angle: left_elbow_angle.unwrap_or(0.0),
            right_elbow_angle: right_elbow_angle.unwrap_or(0.0),
        })
    }

    /// Calculate angle at point B formed by points A-B-C (in degrees)
    fn calculate_angle_3d(a: &JointPosition, b: &JointPosition, c: &JointPosition) -> f64 {
        let ab_x = a.x - b.x;
        let ab_y = a.y - b.y;
        let ab_z = a.z.unwrap_or(0.0) - b.z.unwrap_or(0.0);

        let cb_x = c.x - b.x;
        let cb_y = c.y - b.y;
        let cb_z = c.z.unwrap_or(0.0) - b.z.unwrap_or(0.0);

        let dot = ab_x * cb_x + ab_y * cb_y + ab_z * cb_z;
        let mag_ab = (ab_x * ab_x + ab_y * ab_y + ab_z * ab_z).sqrt();
        let mag_cb = (cb_x * cb_x + cb_y * cb_y + cb_z * cb_z).sqrt();

        if mag_ab == 0.0 || mag_cb == 0.0 {
            return 0.0;
        }

        let cos_angle = (dot / (mag_ab * mag_cb)).max(-1.0).min(1.0);
        let radians = cos_angle.acos();
        radians.to_degrees()
    }

    /// Calculate ankle angle (shin-foot vs vertical)
    fn calculate_ankle_angle(knee: &JointPosition, ankle: &JointPosition) -> f64 {
        // Shin vector (knee to ankle)
        let shin_y = knee.y - ankle.y;
        let shin_x = knee.x - ankle.x;

        // Vertical reference
        let vertical_y = 1.0;

        let dot = shin_x * 0.0 + shin_y * vertical_y;
        let mag_shin = (shin_x * shin_x + shin_y * shin_y).sqrt();

        if mag_shin == 0.0 {
            return 0.0;
        }

        let cos_angle = (dot / mag_shin).max(-1.0).min(1.0);
        let radians = cos_angle.acos();
        radians.to_degrees()
    }

    /// Calculate how much the spine is deviating from vertical
    fn calculate_vertical_angle(neck: &JointPosition, nose: &JointPosition) -> f64 {
        // Spine direction vector (neck to nose approximates upper spine)
        let spine_x = nose.x - neck.x;
        let spine_y = nose.y - neck.y;

        // Vertical is (0, 1)
        let dot = spine_x * 0.0 + spine_y * 1.0;
        let mag_spine = (spine_x * spine_x + spine_y * spine_y).sqrt();

        if mag_spine == 0.0 {
            return 0.0;
        }

        let cos_angle = (dot / mag_spine).max(-1.0).min(1.0);
        let radians = cos_angle.acos();
        let angle = radians.to_degrees();

        // Convert to deviation (0 = perfectly vertical)
        // spine_x positive = leaning right, negative = leaning left
        if spine_x < 0.0 { angle } else { -angle }
    }

    /// Validate angles against ideal ranges and return deviations
    fn validate_angles(angles: &JointAngles, ideal_ranges: &IdealAngleRanges, exercise_type: &str) -> Vec<FormDeviation> {
        let mut deviations = Vec::new();

        match exercise_type {
            "squat" => {
                let squat_ranges = &ideal_ranges.squat;
                // Hip angle check
                Self::check_range(&angles.left_hip_angle, squat_ranges.hip_angle_min, squat_ranges.hip_angle_max,
                    "left_hip", "hip_flexion", "Keep torso more upright", &mut deviations);
                Self::check_range(&angles.right_hip_angle, squat_ranges.hip_angle_min, squat_ranges.hip_angle_max,
                    "right_hip", "hip_flexion", "Keep torso more upright", &mut deviations);

                // Knee angle check
                Self::check_range(&angles.left_knee_angle, squat_ranges.knee_angle_min, squat_ranges.knee_angle_max,
                    "left_knee", "knee_flexion", "Control your depth", &mut deviations);
                Self::check_range(&angles.right_knee_angle, squat_ranges.knee_angle_min, squat_ranges.knee_angle_max,
                    "right_knee", "knee_flexion", "Control your depth", &mut deviations);

                // Back angle (forward lean)
                let back_dev = angles.back_angle.abs();
                if back_dev > squat_ranges.back_angle_max {
                    let severity = if back_dev > 40.0 { "major".to_string() } else { "moderate".to_string() };
                    deviations.push(FormDeviation {
                        joint: "spine".to_string(),
                        issue_type: "excessive_lean".to_string(),
                        severity,
                        confidence: 0.9,
                        timestamp_ms: angles.timestamp_ms,
                        actual_value: back_dev,
                        expected_range: format!("< {:.0}° from vertical", squat_ranges.back_angle_max),
                        description: format!("Excessive forward lean ({:.1}°)", back_dev),
                        cue: "Keep chest up, maintain neutral spine".to_string(),
                    });
                }
            },
            "deadlift" => {
                let deadlift_ranges = &ideal_ranges.deadlift;
                // Hip hinge check
                Self::check_range(&angles.left_hip_angle, deadlift_ranges.hip_angle_min, deadlift_ranges.hip_angle_max,
                    "left_hip", "hip_hinge", "Hinge more at hips", &mut deviations);
                Self::check_range(&angles.right_hip_angle, deadlift_ranges.hip_angle_min, deadlift_ranges.hip_angle_max,
                    "right_hip", "hip_hinge", "Hinge more at hips", &mut deviations);

                // Back rounding check
                if angles.back_angle.abs() > deadlift_ranges.back_angle_max {
                    deviations.push(FormDeviation {
                        joint: "spine".to_string(),
                        issue_type: "rounded_back".to_string(),
                        severity: if angles.back_angle.abs() > 40.0 { "major".to_string() } else { "moderate".to_string() },
                        confidence: 0.85,
                        timestamp_ms: angles.timestamp_ms,
                        actual_value: angles.back_angle.abs(),
                        expected_range: format!("< {:.0}° rounding", deadlift_ranges.back_angle_max),
                        description: format!("Back rounded by {:.1}°", angles.back_angle.abs()),
                        cue: "Brace core, maintain neutral spine, chest up".to_string(),
                    });
                }
            },
            "lunge" => {
                let lunge_ranges = &ideal_ranges.lunge;
                // Torso uprightness
                if angles.back_angle.abs() > lunge_ranges.torso_angle_max {
                    deviations.push(FormDeviation {
                        joint: "torso".to_string(),
                        issue_type: "excessive_lean".to_string(),
                        severity: "moderate".to_string(),
                        confidence: 0.8,
                        timestamp_ms: angles.timestamp_ms,
                        actual_value: angles.back_angle.abs(),
                        expected_range: format!("< {:.0}° lean", lunge_ranges.torso_angle_max),
                        description: format!("Torso leaning {:.1}°", angles.back_angle.abs()),
                        cue: "Keep torso upright, gaze forward".to_string(),
                    });
                }
            },
            _ => {}
        }

        deviations
    }

    /// Check if a value is within range, add deviation if not
    fn check_range(value: &f64, min: f64, max: f64, joint: &str, issue_type: &str, cue: &str, deviations: &mut Vec<FormDeviation>) {
        if *value < min {
            let deviation = min - value;
            let severity = if deviation > 20.0 { "major" } else if deviation > 10.0 { "moderate" } else { "minor" };
            deviations.push(FormDeviation {
                joint: joint.to_string(),
                issue_type: issue_type.to_string(),
                severity: severity.to_string(),
                confidence: 0.9,
                timestamp_ms: 0, // Will be set by caller
                actual_value: *value,
                expected_range: format!("{:.0}° - {:.0}°", min, max),
                description: format!("{:.1}° below minimum (need more flexion)", deviation),
                cue: cue.to_string(),
            });
        } else if *value > max {
            let deviation = value - max;
            let severity = if deviation > 20.0 { "major" } else if deviation > 10.0 { "moderate" } else { "minor" };
            deviations.push(FormDeviation {
                joint: joint.to_string(),
                issue_type: issue_type.to_string(),
                severity: severity.to_string(),
                confidence: 0.9,
                timestamp_ms: 0,
                actual_value: *value,
                expected_range: format!("{:.0}° - {:.0}°", min, max),
                description: format!("{:.1}° above maximum (too much flexion)", deviation),
                cue: cue.to_string(),
            });
        }
    }

    /// Calculate overall score from deviations
    fn calculate_overall_score(deviations: &[FormDeviation], total_frames: usize) -> f64 {
        if total_frames == 0 {
            return 0.0;
        }

        // Base score starts at 100
        let mut score = 100.0;

        // Deduct for each deviation, weighted by severity and confidence
        for dev in deviations {
            let severity_weight = match dev.severity.as_str() {
                "major" => 15.0,
                "moderate" => 7.0,
                "minor" => 2.0,
                _ => 5.0,
            };
            score -= severity_weight * dev.confidence;
        }

        // Factor in frame coverage (how many frames had issues)
        if !deviations.is_empty() {
            let frames_with_issues = deviations.iter()
                .map(|d| d.timestamp_ms)
                .collect::<std::collections::HashSet<_>>()
                .len();
            let coverage_penalty = (frames_with_issues as f64 / total_frames as f64) * 10.0;
            score -= coverage_penalty;
        }

        score.max(0.0).min(100.0)
    }

    /// Generate exercise-specific coaching notes
    fn generate_exercise_notes(exercise_type: &str, deviations: &[FormDeviation]) -> Vec<String> {
        let mut notes = Vec::new();

        match exercise_type {
            "squat" => {
                let has_knee_issue = deviations.iter().any(|d| d.joint.contains("knee"));
                let has_back_issue = deviations.iter().any(|d| d.joint == "spine" || d.joint.contains("back"));

                if has_knee_issue && has_back_issue {
                    notes.push("Work on ankle mobility and core bracing before adding weight".to_string());
                }
                if deviations.iter().any(|d| d.issue_type == "hip_flexion") {
                    notes.push("Consider stance width adjustment - try slightly wider".to_string());
                }
            },
            "deadlift" => {
                if deviations.iter().any(|d| d.issue_type == "rounded_back") {
                    notes.push("Focus on hip mobility and core bracing; reduce weight until back stays neutral".to_string());
                }
                if deviations.iter().any(|d| d.joint.contains("hip") && d.severity == "major") {
                    notes.push("Practice Romanian Deadlifts to improve hip hinge pattern".to_string());
                }
            },
            "bench_press" => {
                if deviations.iter().any(|d| d.issue_type == "elbow_flare") {
                    notes.push("Tuck elbows closer to body - imagine creating an arrow shape with forearms".to_string());
                }
            },
            "lunge" => {
                if deviations.iter().any(|d| d.issue_type == "excessive_lean") {
                    notes.push("Engage core more actively; focus on a spot at eye level".to_string());
                }
            },
            _ => {}
        }

        notes
    }

    /// Extract keyframes from video (simplified - would be done on mobile)
    /// This is a placeholder for the keyframe extraction step
    #[wasm_bindgen(js_name = "extractKeyframes")]
    pub fn extract_keyframes(
        frame_count: u32,
        fps: u32,
        strategy: &str
    ) -> Result<String, JsValue> {
        // Keyframe extraction strategies:
        // - "every_n": every Nth frame
        // - "motion_based": frames with significant motion (would need motion vectors)
        // - "phase_based": extract at key phases (bottom, top of movement)

        let keyframe_indices = match strategy {
            "every_n" => {
                let n = 5; // Every 5th frame
                (0..frame_count).filter(|i| i % n == 0).collect::<Vec<_>>()
            },
            "phase_based" => {
                // For a typical rep, we want: start, descent, bottom, ascent, top
                // Simplified: evenly spaced keyframes
                let step = (frame_count as f64 / 8.0).max(1.0) as u32;
                (0..frame_count).step_by(step as usize).collect::<Vec<_>>()
            },
            _ => (0..frame_count).step_by(3).collect::<Vec<_>>(),
        };

        let result = serde_json::json!({
            "total_frames": frame_count,
            "keyframe_count": keyframe_indices.len(),
            "keyframe_indices": keyframe_indices,
            "fps": fps,
            "strategy": strategy,
        });

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize: {}", e)))
    }
}
