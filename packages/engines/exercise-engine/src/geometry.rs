use serde::{Deserialize, Serialize};

/// 2D Point
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
pub struct Point2D {
    pub x: f32,
    pub y: f32,
}

/// 3D Point
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
pub struct Point3D {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

/// Landmark with position and visibility
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Landmark {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub visibility: f32,
}

impl Landmark {
    pub fn to_point_2d(&self) -> Point2D {
        Point2D { x: self.x, y: self.y }
    }
    
    pub fn to_point_3d(&self) -> Point3D {
        Point3D { x: self.x, y: self.y, z: self.z }
    }
}

/// Calculate angle between three points (2D)
pub fn calculate_angle_2d(a: Point2D, b: Point2D, c: Point2D) -> f32 {
    let v1 = Point2D {
        x: a.x - b.x,
        y: a.y - b.y,
    };
    let v2 = Point2D {
        x: c.x - b.x,
        y: c.y - b.y,
    };

    let dot = v1.x * v2.x + v1.y * v2.y;
    let mag1 = (v1.x * v1.x + v1.y * v1.y).sqrt();
    let mag2 = (v2.x * v2.x + v2.y * v2.y).sqrt();

    if mag1 == 0.0 || mag2 == 0.0 {
        return 0.0;
    }

    let cos_angle = (dot / (mag1 * mag2)).clamp(-1.0, 1.0);
    cos_angle.acos().to_degrees()
}

/// Calculate angle between three points in 3D space
pub fn calculate_angle_3d(a: Point3D, b: Point3D, c: Point3D) -> f32 {
    let v1 = Point3D {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    };
    let v2 = Point3D {
        x: c.x - b.x,
        y: c.y - b.y,
        z: c.z - b.z,
    };

    let dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    let mag1 = (v1.x * v1.x + v1.y * v1.y + v1.z * v1.z).sqrt();
    let mag2 = (v2.x * v2.x + v2.y * v2.y + v2.z * v2.z).sqrt();

    if mag1 == 0.0 || mag2 == 0.0 {
        return 0.0;
    }

    let cos_angle = (dot / (mag1 * mag2)).clamp(-1.0, 1.0);
    cos_angle.acos().to_degrees()
}

/// Calculate angle from landmarks (indices represent the three points)
pub fn angle_from_landmarks(
    landmarks: &[Landmark; 33],
    a_idx: usize,
    b_idx: usize,
    c_idx: usize,
    use_3d: bool,
) -> f32 {
    if use_3d {
        calculate_angle_3d(
            landmarks[a_idx].to_point_3d(),
            landmarks[b_idx].to_point_3d(),
            landmarks[c_idx].to_point_3d(),
        )
    } else {
        calculate_angle_2d(
            landmarks[a_idx].to_point_2d(),
            landmarks[b_idx].to_point_2d(),
            landmarks[c_idx].to_point_2d(),
        )
    }
}

/// Calculate distance between two points (2D)
pub fn distance_2d(a: Point2D, b: Point2D) -> f32 {
    ((b.x - a.x).powi(2) + (b.y - a.y).powi(2)).sqrt()
}

/// Calculate distance between two points (3D)
pub fn distance_3d(a: Point3D, b: Point3D) -> f32 {
    ((b.x - a.x).powi(2) + (b.y - a.y).powi(2) + (b.z - a.z).powi(2)).sqrt()
}

/// Calculate body scale (torso length as reference)
pub fn calculate_body_scale(landmarks: &[Landmark; 33]) -> f32 {
    // Use shoulder width as reference (average of left and right shoulder to mid shoulder)
    let left_shoulder = landmarks[11].to_point_3d();
    let right_shoulder = landmarks[12].to_point_3d();
    
    let shoulder_width = distance_3d(left_shoulder, right_shoulder);
    
    if shoulder_width > 0.001 {
        1.0 / shoulder_width
    } else {
        1.0
    }
}

/// Calculate movement velocity (pixels per millisecond)
pub fn calculate_velocity(current: Point2D, previous: Point2D, time_diff_ms: f32) -> f32 {
    if time_diff_ms <= 0.0 {
        return 0.0;
    }
    distance_2d(current, previous) / time_diff_ms
}

/// Check if points are collinear within tolerance
pub fn are_collinear(a: Point2D, b: Point2D, c: Point2D, tolerance_degrees: f32) -> bool {
    let angle = calculate_angle_2d(a, b, c);
    (180.0 - angle).abs() < tolerance_degrees || angle < tolerance_degrees
}

/// Smooth value using exponential moving average
pub fn smooth_value(current: f32, previous: f32, alpha: f32) -> f32 {
    alpha * current + (1.0 - alpha) * previous
}

/// Clamp value to range
pub fn clamp(value: f32, min: f32, max: f32) -> f32 {
    value.max(min).min(max)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_angle_2d() {
        // Right angle
        let a = Point2D { x: 0.0, y: 1.0 };
        let b = Point2D { x: 0.0, y: 0.0 };
        let c = Point2D { x: 1.0, y: 0.0 };
        
        let angle = calculate_angle_2d(a, b, c);
        assert!((angle - 90.0).abs() < 0.1);
    }

    #[test]
    fn test_distance_2d() {
        let a = Point2D { x: 0.0, y: 0.0 };
        let b = Point2D { x: 3.0, y: 4.0 };
        
        let dist = distance_2d(a, b);
        assert!((dist - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_smooth() {
        let result = smooth_value(10.0, 0.0, 0.5);
        assert!((result - 5.0).abs() < 0.001);
    }
}
