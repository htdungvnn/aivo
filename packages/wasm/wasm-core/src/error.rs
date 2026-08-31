//! # Error Types
//!
//! Standard error types for WASM engines.
//! All errors are typed and include context for debugging.

use serde::{Deserialize, Serialize};

/// Engine error codes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    /// Input validation failed
    InvalidInput,
    /// Required value is missing
    MissingValue,
    /// Value is outside acceptable range
    OutOfRange,
    /// Calculation produced invalid result
    CalculationError,
    /// Serialization/deserialization failed
    SerializationError,
    /// Operation not supported
    NotSupported,
    /// Internal engine error
    InternalError,
}

impl ErrorCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorCode::InvalidInput => "INVALID_INPUT",
            ErrorCode::MissingValue => "MISSING_VALUE",
            ErrorCode::OutOfRange => "OUT_OF_RANGE",
            ErrorCode::CalculationError => "CALCULATION_ERROR",
            ErrorCode::SerializationError => "SERIALIZATION_ERROR",
            ErrorCode::NotSupported => "NOT_SUPPORTED",
            ErrorCode::InternalError => "INTERNAL_ERROR",
        }
    }
}

/// Engine error with context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineError {
    /// Error code for programmatic handling
    pub code: ErrorCode,
    /// Human-readable message for debugging
    pub message: String,
    /// Field path if applicable (e.g., "sleep.durationMinutes")
    pub field: Option<String>,
    /// Additional error details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
    /// Engine that produced the error
    pub engine: String,
    /// Engine version
    pub engine_version: String,
}

impl EngineError {
    /// Create a new error
    pub fn new(code: ErrorCode, message: impl Into<String>, engine: &str) -> Self {
        Self {
            code,
            message: message.into(),
            field: None,
            details: None,
            engine: engine.to_string(),
            engine_version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }

    /// Add field context
    pub fn with_field(mut self, field: impl Into<String>) -> Self {
        self.field = Some(field.into());
        self
    }

    /// Add details
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }

    /// Create INVALID_INPUT error
    pub fn invalid_input(message: impl Into<String>, engine: &str) -> Self {
        Self::new(ErrorCode::InvalidInput, message, engine)
    }

    /// Create MISSING_VALUE error
    pub fn missing_value(field: impl Into<String>, engine: &str) -> Self {
        Self::new(ErrorCode::MissingValue, format!("Missing required value"), engine)
            .with_field(field)
    }

    /// Create OUT_OF_RANGE error
    pub fn out_of_range(field: impl Into<String>, min: f64, max: f64, engine: &str) -> Self {
        Self::new(
            ErrorCode::OutOfRange,
            format!("Value must be between {} and {}", min, max),
            engine,
        )
        .with_field(field)
        .with_details(serde_json::json!({ "minimum": min, "maximum": max }))
    }

    /// Create CALCULATION_ERROR
    pub fn calculation(message: impl Into<String>, engine: &str) -> Self {
        Self::new(ErrorCode::CalculationError, message, engine)
    }

    /// Convert to JSON string
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            r#"{"code":"SERIALIZATION_ERROR","message":"Failed to serialize error","engine":"wasm-core"}"#.to_string()
        })
    }
}

impl std::fmt::Display for EngineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code.as_str(), self.message)?;
        if let Some(field) = &self.field {
            write!(f, " (field: {})", field)?;
        }
        Ok(())
    }
}

impl std::error::Error for EngineError {}

/// Result type alias for engine operations
pub type Result<T> = std::result::Result<T, EngineError>;

/// Convert Option to Result
pub trait ToResult<T> {
    fn to_result(self, field: &str, engine: &str) -> Result<T>;
}

impl<T> ToResult<T> for Option<T> {
    fn to_result(self, field: &str, engine: &str) -> Result<T> {
        self.ok_or_else(|| EngineError::missing_value(field, engine))
    }
}

/// Convert f64 to Result, checking for NaN or Infinity
pub trait ValidateFinite {
    fn validate_finite(self, field: &str, engine: &str) -> Result<f64>;
}

impl ValidateFinite for f64 {
    fn validate_finite(self, field: &str, engine: &str) -> Result<f64> {
        if self.is_finite() {
            Ok(self)
        } else {
            Err(EngineError::invalid_input(
                format!("Value must be finite, got {}", self),
                engine,
            )
            .with_field(field))
        }
    }
}
