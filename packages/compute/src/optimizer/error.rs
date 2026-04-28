use wasm_bindgen::prelude::*;

// Custom error types for the optimizer module
// Using explicit error types instead of panic! for WASM safety
#[derive(Debug, Clone, PartialEq)]
pub enum OptimizerError {
    InvalidInput(String),
    ParseError(String),
    SerializationError(String),
    LimitExceeded(String),
    InternalError(String),
}

impl OptimizerError {
    /// Convert error to static string for WASM interop
    #[allow(dead_code)]
    fn as_str(&self) -> &'static str {
        match self {
            Self::InvalidInput(_) => "INVALID_INPUT",
            Self::ParseError(_) => "PARSE_ERROR",
            Self::SerializationError(_) => "SERIALIZATION_ERROR",
            Self::LimitExceeded(_) => "LIMIT_EXCEEDED",
            Self::InternalError(_) => "INTERNAL_ERROR",
        }
    }
}

impl std::fmt::Display for OptimizerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            Self::ParseError(msg) => write!(f, "Parse error: {}", msg),
            Self::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            Self::LimitExceeded(msg) => write!(f, "Limit exceeded: {}", msg),
            Self::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl From<serde_json::Error> for OptimizerError {
    fn from(err: serde_json::Error) -> Self {
        Self::ParseError(format!("JSON parse error: {}", err))
    }
}

impl From<String> for OptimizerError {
    fn from(err: String) -> Self {
        Self::InternalError(err)
    }
}

impl From<&str> for OptimizerError {
    fn from(err: &str) -> Self {
        Self::InternalError(err.to_string())
    }
}

/// Convert Rust error to JavaScript error for WASM boundary
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "console_error")]
    fn console_error(msg: &str);
}

/// Helper to log errors without panicking
#[inline]
#[allow(dead_code)]
fn log_error(error: &OptimizerError) {
    console_error(&format!("[AivoOptimizer] {}: {}", error.as_str(), error));
}

/// Result type alias for WASM-compatible results
pub type OptimizerResult<T> = Result<T, OptimizerError>;
