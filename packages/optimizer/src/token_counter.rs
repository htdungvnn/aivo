use crate::OptimizerError;
use serde::{Deserialize, Serialize};

/// Token estimation configuration
/// Using byte-pair encoding approximation for WASM compatibility
/// Without full BPE vocab (would be ~100KB), we use heuristics:
/// - English: ~4 characters per token
/// - Numbers/symbols: ~2-3 characters per token
/// - Health entities: counted individually with overhead

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TokenConfig {
    /// Approximate characters per token for general text
    pub chars_per_token: f64,
    /// Overhead tokens per conversation message (role + metadata)
    pub message_overhead: usize,
    /// Maximum tokens allowed (context window limit)
    pub max_tokens: usize,
}

impl Default for TokenConfig {
    fn default() -> Self {
        Self {
            chars_per_token: 4.0, // GPT-2/GPT-3 approximation
            message_overhead: 4,  // role, content field names, braces
            max_tokens: 4096,    // Conservative context limit
        }
    }
}

/// Estimate token count for a JSON string
/// Optimized for WASM: no regex, minimal allocations
pub fn estimate_tokens(json: &str) -> usize {
    let mut count = 0;
    let mut in_string = false;
    let mut escape_next = false;
    let mut consecutive_spaces = 0;

    for ch in json.chars() {
        if escape_next {
            escape_next = false;
            count += 1; // Escaped char counts as 1
            consecutive_spaces = 0;
            continue;
        }

        match ch {
            '\\' => {
                escape_next = true;
            }
            '"' => {
                in_string = !in_string;
                count += 1;
                consecutive_spaces = 0;
            }
            _ if in_string => {
                // Inside string: count characters, compress consecutive whitespace
                if ch.is_whitespace() {
                    consecutive_spaces += 1;
                    if consecutive_spaces == 1 {
                        count += 1; // Count first whitespace only
                    }
                } else {
                    count += 1;
                    consecutive_spaces = 0;
                }
            }
            _ => {
                // Outside string: structural chars that matter
                if !ch.is_whitespace() && ch != ',' && ch != ':' {
                    count += 1;
                }
                consecutive_spaces = 0;
            }
        }
    }

    // Apply char-to-token ratio
    (count as f64 / 4.0).ceil() as usize
}

/// Count tokens in a conversation message
/// Messages have structure: {role: "user", content: "..."}
pub fn count_message_tokens(role: &str, content: &str, metadata: Option<&str>) -> usize {
    let content_tokens = estimate_tokens(content);
    let role_tokens = (role.len() as f64 / 4.0).ceil() as usize;

    let mut total = role_tokens + content_tokens;

    if let Some(meta) = metadata {
        total += (meta.len() as f64 / 4.0).ceil() as usize;
    }

    total + 4 // overhead for JSON structure
}

/// Check if adding content would exceed token limit
pub fn would_exceed_limit(
    current_tokens: usize,
    new_content_tokens: usize,
    max_tokens: usize,
) -> bool {
    current_tokens + new_content_tokens > max_tokens
}

/// Calculate remaining tokens
pub fn remaining_tokens(current_tokens: usize, max_tokens: usize) -> usize {
    max_tokens.saturating_sub(current_tokens)
}

/// Token budget calculator for optimization decisions
#[derive(Debug, Clone)]
pub struct TokenBudget {
    current_tokens: usize,
    max_tokens: usize,
    safety_margin: usize, // Keep this many tokens free
}

impl TokenBudget {
    pub fn new(max_tokens: usize, safety_margin: usize) -> Self {
        Self {
            current_tokens: 0,
            max_tokens,
            safety_margin,
        }
    }

    pub fn available(&self) -> usize {
        self.max_tokens.saturating_sub(self.current_tokens).saturating_sub(self.safety_margin)
    }

    pub fn add(&mut self, tokens: usize) -> Result<(), OptimizerError> {
        if self.current_tokens + tokens > self.max_tokens {
            Err(OptimizerError::LimitExceeded(format!(
                "Token budget exceeded: {} + {} > {}",
                self.current_tokens, tokens, self.max_tokens
            )))
        } else {
            self.current_tokens += tokens;
            Ok(())
        }
    }

    pub fn current(&self) -> usize {
        self.current_tokens
    }

    pub fn utilization(&self) -> f64 {
        (self.current_tokens as f64 / self.max_tokens as f64) * 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_tokens_simple() {
        let text = "Hello world!";
        // ~12 chars / 4 = 3 tokens
        let tokens = estimate_tokens(&format!(r#"{{"content": "{}"}}"#, text));
        assert!(tokens >= 2 && tokens <= 4);
    }

    #[test]
    fn test_estimate_tokens_json() {
        let json = r#"{"role":"user","content":"Hello world!"}"#;
        let tokens = estimate_tokens(json);
        // Should be small due to whitespace removal
        assert!(tokens < 20);
    }

    #[test]
    fn test_count_message_tokens() {
        let tokens = count_message_tokens("user", "Hello world!", None);
        assert!(tokens > 0);
    }

    #[test]
    fn test_token_budget() {
        let mut budget = TokenBudget::new(100, 10);
        assert!(budget.available() == 90);
        budget.add(50).unwrap();
        assert!(budget.current() == 50);
        assert!(budget.available() == 40);
        assert!(budget.add(60).is_err());
    }

    #[test]
    fn test_would_exceed_limit() {
        assert!(would_exceed_limit(90, 20, 100));
        assert!(!would_exceed_limit(50, 30, 100));
    }
}
