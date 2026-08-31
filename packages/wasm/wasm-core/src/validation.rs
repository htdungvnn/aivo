//! # Validation Utilities
//!
//! Validation helpers for WASM engines.
//! All validation returns typed errors with context.

use crate::error::{EngineError, Result};
use serde::{Deserialize, Serialize};

/// Validation context for building detailed error messages
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ValidationContext {
    /// Field path being validated
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    /// Additional context
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}

impl ValidationContext {
    pub fn new(field: &str) -> Self {
        Self {
            field: Some(field.to_string()),
            context: None,
        }
    }

    pub fn with_context(mut self, context: &str) -> Self {
        self.context = Some(context.to_string());
        self
    }

    pub fn field(&self) -> &str {
        self.field.as_deref().unwrap_or("unknown")
    }
}

/// Range validation
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Range<T> {
    pub min: T,
    pub max: T,
}

impl<T: Copy + PartialOrd> Range<T> {
    pub fn new(min: T, max: T) -> Self {
        Self { min, max }
    }

    pub fn contains(&self, value: T) -> bool {
        value >= self.min && value <= self.max
    }
}

/// Numeric range with floating point bounds
pub type NumericRange = Range<f64>;

/// Validate that a value is within range
/// 
/// # Arguments
/// * `value` - The value to validate
/// * `min` - Minimum acceptable value
/// * `max` - Maximum acceptable value
/// * `field` - Field name for error context
/// * `engine` - Engine name for error context
/// 
/// # Returns
/// Ok(value) if valid, Err(EngineError) otherwise
pub fn validate_range(value: f64, min: f64, max: f64, field: &str, engine: &str) -> Result<f64> {
    if !value.is_finite() {
        return Err(EngineError::invalid_input(
            format!("Value must be finite, got {}", value),
            engine,
        )
        .with_field(field));
    }

    if value < min || value > max {
        return Err(EngineError::out_of_range(field, min, max, engine));
    }

    Ok(value)
}

/// Validate that a value is non-negative
pub fn validate_non_negative(value: f64, field: &str, engine: &str) -> Result<f64> {
    if !value.is_finite() {
        return Err(EngineError::invalid_input(
            format!("Value must be finite, got {}", value),
            engine,
        )
        .with_field(field));
    }

    if value < 0.0 {
        return Err(EngineError::out_of_range(field, 0.0, f64::MAX, engine));
    }

    Ok(value)
}

/// Validate that a value is positive
pub fn validate_positive(value: f64, field: &str, engine: &str) -> Result<f64> {
    if !value.is_finite() {
        return Err(EngineError::invalid_input(
            format!("Value must be finite, got {}", value),
            engine,
        )
        .with_field(field));
    }

    if value <= 0.0 {
        return Err(EngineError::out_of_range(field, f64::EPSILON, f64::MAX, engine));
    }

    Ok(value)
}

/// Validate percentage (0-100)
pub fn validate_percentage(value: f64, field: &str, engine: &str) -> Result<f64> {
    validate_range(value, 0.0, 100.0, field, engine)
}

/// Validate confidence (0-1)
pub fn validate_confidence(value: f64, field: &str, engine: &str) -> Result<f64> {
    validate_range(value, 0.0, 1.0, field, engine)
}

/// Validate timestamp (positive, not too far in future)
pub fn validate_timestamp(value: f64, field: &str, engine: &str) -> Result<f64> {
    validate_positive(value, field, engine)?;
    
    // Allow timestamps up to 1 year in the future (for clock skew)
    let max_future = 365.0 * 24.0 * 60.0 * 60.0 * 1000.0; // 1 year in ms
    if value > max_future {
        return Err(EngineError::out_of_range(field, 0.0, max_future, engine));
    }
    
    Ok(value)
}

/// Validate optional value if present
pub fn validate_optional<T, F>(value: Option<T>, validator: F, field: &str, engine: &str) -> Result<Option<T>>
where
    F: Fn(T, &str, &str) -> Result<T>,
{
    match value {
        Some(v) => validator(v, field, engine).map(Some),
        None => Ok(None),
    }
}

/// Validate array length
pub fn validate_array_length<T>(arr: &[T], min: usize, max: usize, field: &str, engine: &str) -> Result<usize> {
    let len = arr.len();
    
    if len < min {
        return Err(EngineError::invalid_input(
            format!("Array too short: {} < {}", len, min),
            engine,
        )
        .with_field(field));
    }
    
    if len > max {
        return Err(EngineError::invalid_input(
            format!("Array too long: {} > {}", len, max),
            engine,
        )
        .with_field(field));
    }
    
    Ok(len)
}

/// Validate string is not empty
pub fn validate_non_empty(value: &str, field: &str, engine: &str) -> Result<&str> {
    if value.trim().is_empty() {
        return Err(EngineError::invalid_input("String cannot be empty", engine)
            .with_field(field));
    }
    Ok(value)
}

/// Validate enum value
pub fn validate_enum<T: PartialEq + Copy>(value: T, valid_values: &[T], field: &str, engine: &str) -> Result<T> {
    if !valid_values.contains(&value) {
        return Err(EngineError::invalid_input(
            format!("Invalid enum value"),
            engine,
        )
        .with_field(field));
    }
    Ok(value)
}

/// Batch validation result
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ValidationResult {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub errors: Vec<EngineError>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub warnings: Vec<String>,
}

impl ValidationResult {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_error(&mut self, error: EngineError) {
        self.errors.push(error);
    }

    pub fn add_warning(&mut self, warning: impl Into<String>) {
        self.warnings.push(warning.into());
    }

    pub fn is_valid(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn merge(&mut self, other: ValidationResult) {
        self.errors.extend(other.errors);
        self.warnings.extend(other.warnings);
    }
}

/// Validator trait for custom validation logic
pub trait Validator<T> {
    fn validate(&self, value: &T, context: &ValidationContext) -> ValidationResult;
}

/// Validated wrapper that ensures values are always valid
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validated<T> {
    pub value: T,
    #[serde(skip)]
    _marker: std::marker::PhantomData<fn() -> T>,
}

impl<T> Validated<T> {
    pub fn new(value: T) -> Self {
        Self {
            value,
            _marker: std::marker::PhantomData,
        }
    }

    pub fn into_inner(self) -> T {
        self.value
    }
}

impl<T> std::ops::Deref for Validated<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.value
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_range() {
        let result = validate_range(50.0, 0.0, 100.0, "test", "engine");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 50.0);

        let result = validate_range(150.0, 0.0, 100.0, "test", "engine");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_percentage() {
        assert!(validate_percentage(50.0, "test", "engine").is_ok());
        assert!(validate_percentage(150.0, "test", "engine").is_err());
        assert!(validate_percentage(-10.0, "test", "engine").is_err());
    }

    #[test]
    fn test_validation_result() {
        let mut result = ValidationResult::new();
        assert!(result.is_valid());
        
        result.add_error(EngineError::invalid_input("test error", "engine"));
        assert!(!result.is_valid());
        assert_eq!(result.errors.len(), 1);
    }
}
