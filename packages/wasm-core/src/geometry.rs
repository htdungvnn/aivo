//! # Geometry Utilities
//!
//! Geometry and pose-related calculations for exercise analysis.

use crate::math::{angle_3d, distance_3d, round_to};
use serde::{Deserialize, Serialize};

/// 3D Landmark from pose detection
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct Landmark {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub visibility: f64,
}

impl Landmark {
    pub fn new(x: f64, y: f64, z: f64, visibility: f64) -> Self {
        Self { x, y, z, visibility }
    }

    pub fn distance_to(&self, other: &Landmark) -> f64 {
        distance_3d(self.x, self.y, self.z, other.x, other.y, other.z)
    }

    pub fn angle_to(&self, vertex: &Landmark, end: &Landmark) -> f64 {
        angle_3d(self.x, self.y, self.z, vertex.x, vertex.y, vertex.z, end.x, end.y, end.z)
    }
}

/// Landmark set for pose detection (MediaPipe pose 33 landmarks)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandmarkSet {
    pub landmarks: [Option<Landmark>; 33],
}

impl LandmarkSet {
    pub fn new() -> Self {
        Self {
            landmarks: [None; 33],
        }
    }

    pub fn set(&mut self, index: usize, landmark: Landmark) {
        if index < 33 {
            self.landmarks[index] = Some(landmark);
        }
    }

    pub fn get(&self, index: usize) -> Option<&Landmark> {
        self.landmarks.get(index).and_then(|l| *l)
    }

    /// Calculate average visibility
    pub fn avg_visibility(&self) -> f64 {
        let visible: f64 = self.landmarks
            .iter()
            .filter_map(|l| *l)
            .map(|l| l.visibility)
            .sum();
        let count = self.landmarks.iter().filter(|l| l.is_some()).count() as f64;
        if count == 0.0 { 0.0 } else { visible / count }
    }

    /// Check if enough landmarks are visible for analysis
    pub fn is_visible(&self, threshold: f64, required_count: usize) -> bool {
        let count = self.landmarks
            .iter()
            .filter(|l| l.map_or(false, |lm| lm.visibility >= threshold))
            .count();
        count >= required_count
    }

    /// Apply temporal smoothing (simple moving average)
    pub fn smooth(&self, previous: &LandmarkSet, alpha: f64) -> Self {
        let mut smoothed = LandmarkSet::new();
        
        for i in 0..33 {
            match (self.landmarks[i], previous.landmarks[i]) {
                (Some(curr), Some(prev)) => {
                    smoothed.landmarks[i] = Some(Landmark::new(
                        alpha * curr.x + (1.0 - alpha) * prev.x,
                        alpha * curr.y + (1.0 - alpha) * prev.y,
                        alpha * curr.z + (1.0 - alpha) * prev.z,
                        alpha * curr.visibility + (1.0 - alpha) * prev.visibility,
                    ));
                }
                (Some(curr), None) => {
                    smoothed.landmarks[i] = Some(curr);
                }
                _ => {}
            }
        }
        
        smoothed
    }
}

impl Default for LandmarkSet {
    fn default() -> Self {
        Self::new()
    }
}

/// MediaPipe pose landmark indices
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(usize)]
pub enum PoseLandmark {
    Nose = 0,
    LeftEyeInner = 1,
    LeftEye = 2,
    LeftEyeOuter = 3,
    RightEyeInner = 4,
    RightEye = 5,
    RightEyeOuter = 6,
    LeftEar = 7,
    RightEar = 8,
    MouthLeft = 9,
    MouthRight = 10,
    LeftShoulder = 11,
    RightShoulder = 12,
    LeftElbow = 13,
    RightElbow = 14,
    LeftWrist = 15,
    RightWrist = 16,
    LeftPinky = 17,
    RightPinky = 18,
    LeftIndex = 19,
    RightIndex = 20,
    LeftThumb = 21,
    RightThumb = 22,
    LeftHip = 23,
    RightHip = 24,
    LeftKnee = 25,
    RightKnee = 26,
    LeftAnkle = 27,
    RightAnkle = 28,
    LeftHeel = 29,
    RightHeel = 30,
    LeftFootIndex = 31,
    RightFootIndex = 32,
}

impl PoseLandmark {
    pub fn from_index(index: usize) -> Option<Self> {
        if index <= 32 {
            Some(unsafe { std::mem::transmute(index) })
        } else {
            None
        }
    }
}

/// Joint angle calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JointAngle {
    pub name: String,
    pub degrees: f64,
    pub confidence: f64,
}

impl JointAngle {
    pub fn new(name: &str, degrees: f64, confidence: f64) -> Self {
        Self {
            name: name.to_string(),
            degrees: round_to(degrees, 1),
            confidence,
        }
    }
}

/// Body alignment check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlignmentCheck {
    pub joint: String,
    pub is_aligned: bool,
    pub deviation_degrees: f64,
    pub threshold_degrees: f64,
}

/// Range of motion measurement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RangeOfMotion {
    pub joint: String,
    pub min_angle: f64,
    pub max_angle: f64,
    pub total_range: f64,
    pub percentage: f64, // 0-1 relative to optimal
}

impl RangeOfMotion {
    pub fn calculate(joint: &str, min_angle: f64, max_angle: f64, optimal_range: f64) -> Self {
        let total_range = max_angle - min_angle;
        Self {
            joint: joint.to_string(),
            min_angle: round_to(min_angle, 1),
            max_angle: round_to(max_angle, 1),
            total_range: round_to(total_range, 1),
            percentage: round_to((total_range / optimal_range).min(1.0), 2),
        }
    }
}

/// Pose analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoseAnalysis {
    pub angles: Vec<JointAngle>,
    pub alignments: Vec<AlignmentCheck>,
    pub avg_visibility: f64,
    pub is_valid: bool,
}

impl PoseAnalysis {
    pub fn new() -> Self {
        Self {
            angles: Vec::new(),
            alignments: Vec::new(),
            avg_visibility: 0.0,
            is_valid: false,
        }
    }

    pub fn with_angles(mut self, angles: Vec<JointAngle>) -> Self {
        self.angles = angles;
        self
    }

    pub fn with_visibility(mut self, visibility: f64) -> Self {
        self.avg_visibility = visibility;
        self.is_valid = visibility >= 0.5;
        self
    }

    pub fn add_angle(&mut self, angle: JointAngle) {
        self.angles.push(angle);
    }

    pub fn add_alignment(&mut self, alignment: AlignmentCheck) {
        self.alignments.push(alignment);
    }
}

impl Default for PoseAnalysis {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate joint angles from landmark set
pub fn calculate_joint_angles(landmarks: &LandmarkSet) -> Vec<JointAngle> {
    let mut angles = Vec::new();

    // Helper to get landmark with visibility
    macro_rules! lm {
        ($idx:expr) => {
            landmarks.get($idx)?
        };
    }

    // Helper to calculate angle
    macro_rules! calc_angle {
        ($name:expr, $a:expr, $b:expr, $c:expr) => {{
            let angle = $b.angle_to($a, $c);
            let confidence = ($a.visibility + $b.visibility + $c.visibility) / 3.0;
            JointAngle::new($name, angle, confidence)
        }};
    }

    // Knee angles
    if let (Some(lhip), Some(lknee), Some(lankle)) = (
        landmarks.get(23),
        landmarks.get(25),
        landmarks.get(27),
    ) {
        angles.push(calc_angle!("left_knee", lhip, lknee, lankle));
    }

    if let (Some(rhip), Some(rknee), Some(rankle)) = (
        landmarks.get(24),
        landmarks.get(26),
        landmarks.get(28),
    ) {
        angles.push(calc_angle!("right_knee", rhip, rknee, rankle));
    }

    // Hip angles
    if let (Some(lshoulder), Some(lhip), Some(lknee)) = (
        landmarks.get(11),
        landmarks.get(23),
        landmarks.get(25),
    ) {
        angles.push(calc_angle!("left_hip", lshoulder, lhip, lknee));
    }

    if let (Some(rshoulder), Some(rhip), Some(rknee)) = (
        landmarks.get(12),
        landmarks.get(24),
        landmarks.get(26),
    ) {
        angles.push(calc_angle!("right_hip", rshoulder, rhip, rknee));
    }

    // Elbow angles
    if let (Some(lshoulder), Some(lelbow), Some(lwrist)) = (
        landmarks.get(11),
        landmarks.get(13),
        landmarks.get(15),
    ) {
        angles.push(calc_angle!("left_elbow", lshoulder, lelbow, lwrist));
    }

    if let (Some(rshoulder), Some(relbow), Some(rwrist)) = (
        landmarks.get(12),
        landmarks.get(14),
        landmarks.get(16),
    ) {
        angles.push(calc_angle!("right_elbow", rshoulder, relbow, rwrist));
    }

    // Shoulder angles
    if let (Some(lelbow), Some(lshoulder), Some(lhip)) = (
        landmarks.get(13),
        landmarks.get(11),
        landmarks.get(23),
    ) {
        angles.push(calc_angle!("left_shoulder", lelbow, lshoulder, lhip));
    }

    if let (Some(relbow), Some(rshoulder), Some(rhip)) = (
        landmarks.get(14),
        landmarks.get(12),
        landmarks.get(24),
    ) {
        angles.push(calc_angle!("right_shoulder", relbow, rshoulder, rhip));
    }

    angles
}

/// Calculate torso angle from vertical
pub fn calculate_torso_angle(landmarks: &LandmarkSet) -> Option<f64> {
    // Get mid-shoulder and mid-hip
    let lshoulder = landmarks.get(11)?;
    let rshoulder = landmarks.get(12)?;
    let lhip = landmarks.get(23)?;
    let rhip = landmarks.get(24)?;

    let mid_shoulder = Landmark {
        x: (lshoulder.x + rshoulder.x) / 2.0,
        y: (lshoulder.y + rshoulder.y) / 2.0,
        z: (lshoulder.z + rshoulder.z) / 2.0,
        visibility: (lshoulder.visibility + rshoulder.visibility) / 2.0,
    };

    let mid_hip = Landmark {
        x: (lhip.x + rhip.x) / 2.0,
        y: (lhip.y + rhip.y) / 2.0,
        z: (lhip.z + rhip.z) / 2.0,
        visibility: (lhip.visibility + rhip.visibility) / 2.0,
    };

    // Calculate angle from vertical (reference point is directly above mid_shoulder)
    let ref_above = Landmark {
        x: mid_shoulder.x,
        y: mid_shoulder.y - 1.0, // 1 unit above
        z: mid_shoulder.z,
        visibility: mid_shoulder.visibility,
    };

    Some(mid_shoulder.angle_to(&ref_above, &mid_hip))
}

/// Calculate body scale (for normalization)
pub fn calculate_body_scale(landmarks: &LandmarkSet) -> f64 {
    // Use shoulder width as reference
    if let (Some(lshoulder), Some(rshoulder)) = (landmarks.get(11), landmarks.get(12)) {
        let shoulder_width = lshoulder.distance_to(rshoulder);
        if shoulder_width > 0.001 {
            return 1.0 / shoulder_width;
        }
    }
    1.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_landmark_distance() {
        let a = Landmark::new(0.0, 0.0, 0.0, 1.0);
        let b = Landmark::new(3.0, 4.0, 0.0, 1.0);
        
        assert!((a.distance_to(&b) - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_landmark_set_visibility() {
        let mut set = LandmarkSet::new();
        set.set(0, Landmark::new(0.0, 0.0, 0.0, 0.9));
        set.set(1, Landmark::new(0.0, 0.0, 0.0, 0.8));
        set.set(2, Landmark::new(0.0, 0.0, 0.0, 0.7));
        
        assert!((set.avg_visibility() - 0.8).abs() < 0.001);
    }

    #[test]
    fn test_joint_angle_calculation() {
        let mut landmarks = LandmarkSet::new();
        // Create a right angle
        landmarks.set(23, Landmark::new(0.0, 1.0, 0.0, 1.0)); // Hip
        landmarks.set(25, Landmark::new(0.0, 0.0, 0.0, 1.0)); // Knee
        landmarks.set(27, Landmark::new(1.0, 0.0, 0.0, 1.0)); // Ankle
        
        let angles = calculate_joint_angles(&landmarks);
        assert!(!angles.is_empty());
    }
}
