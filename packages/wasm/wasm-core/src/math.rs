//! # Math Utilities
//!
//! Safe mathematical operations for WASM engines.
//! All functions avoid panic and return typed results.

use crate::error::{EngineError, Result};
use serde::{Deserialize, Serialize};

/// Clamp a value between min and max
/// 
/// # Arguments
/// * `value` - The value to clamp
/// * `min` - Minimum bound
/// * `max` - Maximum bound
/// 
/// # Returns
/// Value clamped to [min, max] range
#[inline]
pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

/// Round a value to specified decimal places
/// 
/// # Arguments
/// * `value` - The value to round
/// * `decimals` - Number of decimal places (0 for integer)
/// 
/// # Returns
/// Rounded value
#[inline]
pub fn round_to(value: f64, decimals: u8) -> f64 {
    let multiplier = 10_f64.powi(decimals as i32);
    (value * multiplier).round() / multiplier
}

/// Safe division with configurable epsilon
/// 
/// # Arguments
/// * `numerator` - The numerator
/// * `denominator` - The denominator
/// * `epsilon` - Small value to prevent division by zero
/// 
/// # Returns
/// Safe division result, or epsilon-equivalent for near-zero denominator
#[inline]
pub fn safe_divide(numerator: f64, denominator: f64, epsilon: f64) -> f64 {
    if denominator.abs() < epsilon {
        // Return 0 for near-zero denominators to avoid infinity
        // In health/nutrition context, 0/n is typically 0
        0.0
    } else {
        numerator / denominator
    }
}

/// Safe division returning Result
pub fn safe_divide_result(numerator: f64, denominator: f64, field: &str, engine: &str) -> Result<f64> {
    if !denominator.is_finite() {
        return Err(EngineError::invalid_input(
            format!("Denominator must be finite, got {}", denominator),
            engine,
        )
        .with_field(field));
    }
    if denominator.abs() < f64::EPSILON {
        return Err(EngineError::out_of_range(field, f64::EPSILON, f64::MAX, engine));
    }
    Ok(numerator / denominator)
}

/// Calculate percentage (0-100 scale)
#[inline]
pub fn to_percentage(value: f64, total: f64, decimals: u8) -> f64 {
    round_to(safe_divide(value * 100.0, total, f64::EPSILON), decimals)
}

/// Calculate percentage (0-1 scale)
#[inline]
pub fn to_fraction(value: f64, total: f64, decimals: u8) -> f64 {
    round_to(safe_divide(value, total, f64::EPSILON), decimals)
}

/// Normalize a value to 0-1 range
#[inline]
pub fn normalize(value: f64, min: f64, max: f64) -> f64 {
    if (max - min).abs() < f64::EPSILON {
        0.5 // Default when min equals max
    } else {
        clamp((value - min) / (max - min), 0.0, 1.0)
    }
}

/// Linear interpolation
#[inline]
pub fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * clamp(t, 0.0, 1.0)
}

/// Map value from one range to another
pub fn map_range(value: f64, from_min: f64, from_max: f64, to_min: f64, to_max: f64) -> f64 {
    let normalized = normalize(value, from_min, from_max);
    lerp(to_min, to_max, normalized)
}

/// Calculate exponential moving average
pub fn ema(previous: f64, current: f64, alpha: f64) -> f64 {
    alpha * current + (1.0 - alpha) * previous
}

/// Calculate simple moving average
pub fn sma(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let sum: f64 = values.iter().sum();
    sum / values.len() as f64
}

/// Degrees to radians
#[inline]
pub fn deg_to_rad(degrees: f64) -> f64 {
    degrees * std::f64::consts::PI / 180.0
}

/// Radians to degrees
#[inline]
pub fn rad_to_deg(radians: f64) -> f64 {
    radians * 180.0 / std::f64::consts::PI
}

/// Calculate angle between two vectors in degrees
pub fn vector_angle_2d(ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    let dot = ax * bx + ay * by;
    let mag_a = (ax * ax + ay * ay).sqrt();
    let mag_b = (bx * bx + by * by).sqrt();
    
    if mag_a < f64::EPSILON || mag_b < f64::EPSILON {
        return 0.0;
    }
    
    let cos_angle = clamp(dot / (mag_a * mag_b), -1.0, 1.0);
    rad_to_deg(cos_angle.acos())
}

/// Calculate angle between two vectors in 3D space in degrees
pub fn vector_angle_3d(
    ax: f64, ay: f64, az: f64,
    bx: f64, by: f64, bz: f64,
) -> f64 {
    let dot = ax * bx + ay * by + az * bz;
    let mag_a = (ax * ax + ay * ay + az * az).sqrt();
    let mag_b = (bx * bx + by * by + bz * bz).sqrt();
    
    if mag_a < f64::EPSILON || mag_b < f64::EPSILON {
        return 0.0;
    }
    
    let cos_angle = clamp(dot / (mag_a * mag_b), -1.0, 1.0);
    rad_to_deg(cos_angle.acos())
}

/// Calculate distance between two 2D points
#[inline]
pub fn distance_2d(x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    ((x2 - x1).powi(2) + (y2 - y1).powi(2)).sqrt()
}

/// Calculate distance between two 3D points
#[inline]
pub fn distance_3d(x1: f64, y1: f64, z1: f64, x2: f64, y2: f64, z2: f64) -> f64 {
    ((x2 - x1).powi(2) + (y2 - y1).powi(2) + (z2 - z1).powi(2)).sqrt()
}

/// 2D Point
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

impl Point2D {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
    
    pub fn distance_to(&self, other: &Point2D) -> f64 {
        distance_2d(self.x, self.y, other.x, other.y)
    }
}

/// 3D Point
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Point3D {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }
    
    pub fn distance_to(&self, other: &Point3D) -> f64 {
        distance_3d(self.x, self.y, self.z, other.x, other.y, other.z)
    }
}

/// Calculate angle between three 2D points
pub fn angle_2d(ax: f64, ay: f64, bx: f64, by: f64, cx: f64, cy: f64) -> f64 {
    // Vector from B to A
    let v1x = ax - bx;
    let v1y = ay - by;
    
    // Vector from B to C
    let v2x = cx - bx;
    let v2y = cy - by;
    
    vector_angle_2d(v1x, v1y, v2x, v2y)
}

/// Calculate angle between three 3D points
pub fn angle_3d(
    ax: f64, ay: f64, az: f64,
    bx: f64, by: f64, bz: f64,
    cx: f64, cy: f64, cz: f64,
) -> f64 {
    // Vector from B to A
    let v1x = ax - bx;
    let v1y = ay - by;
    let v1z = az - bz;
    
    // Vector from B to C
    let v2x = cx - bx;
    let v2y = cy - by;
    let v2z = cz - bz;
    
    vector_angle_3d(v1x, v1y, v1z, v2x, v2y, v2z)
}

/// Angle calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AngleResult {
    pub degrees: f64,
    pub confidence: f64,
}

impl AngleResult {
    pub fn new(degrees: f64, confidence: f64) -> Self {
        Self {
            degrees: round_to(degrees, 1),
            confidence,
        }
    }
}

/// Calculate angle with visibility-weighted confidence
pub fn angle_with_confidence(
    ax: f64, ay: f64, az: f64, vis_a: f64,
    bx: f64, by: f64, bz: f64, vis_b: f64,
    cx: f64, cy: f64, cz: f64, vis_c: f64,
) -> AngleResult {
    let angle = angle_3d(ax, ay, az, bx, by, bz, cx, cy, cz);
    let confidence = (vis_a + vis_b + vis_c) / 3.0;
    AngleResult::new(angle, confidence)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clamp() {
        assert_eq!(clamp(5.0, 0.0, 10.0), 5.0);
        assert_eq!(clamp(-5.0, 0.0, 10.0), 0.0);
        assert_eq!(clamp(15.0, 0.0, 10.0), 10.0);
    }

    #[test]
    fn test_round_to() {
        assert_eq!(round_to(3.14159, 2), 3.14);
        assert_eq!(round_to(3.14159, 0), 3.0);
        assert_eq!(round_to(3.5, 0), 4.0);
    }

    #[test]
    fn test_safe_divide() {
        assert_eq!(safe_divide(10.0, 2.0, 0.001), 5.0);
        assert_eq!(safe_divide(10.0, 0.0, 0.001), 0.0);
        assert!(safe_divide(10.0, f64::INFINITY, 0.001).is_nan());
    }

    #[test]
    fn test_distance_2d() {
        let dist = distance_2d(0.0, 0.0, 3.0, 4.0);
        assert!((dist - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_angle_2d() {
        // Right angle: (0,1), (0,0), (1,0)
        let angle = angle_2d(0.0, 1.0, 0.0, 0.0, 1.0, 0.0);
        assert!((angle - 90.0).abs() < 0.1);
    }
}
