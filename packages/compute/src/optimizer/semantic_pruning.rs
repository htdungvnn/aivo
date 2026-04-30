use crate::error::OptimizerResult;
use serde::{Deserialize, Serialize};

/// Health metrics extracted from conversation or database
/// These are ALWAYS kept regardless of sliding window
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HealthMetrics {
    pub weight_kg: Option<f64>,
    pub bmi: Option<f64>,
    pub body_fat_percent: Option<f64>,
    pub muscle_mass_kg: Option<f64>,
    pub water_percent: Option<f64>,
    pub recorded_at: Option<String>, // ISO 8601 timestamp
}

/// Conversation message structure (matches SharedTypes)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    pub id: String,
    pub role: String, // "user" or "assistant"
    pub content: String,
    pub timestamp: String, // ISO 8601
    pub tokens: Option<usize>, // Pre-computed if available
    pub metadata: Option<serde_json::Value>,
}

/// Sliding window configuration for conversation history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlidingWindowConfig {
    /// Maximum number of recent messages to keep
    pub max_messages: usize,
    /// Maximum cumulative tokens in window (safety limit)
    pub max_tokens: usize,
    /// Always keep N most recent messages regardless of token count
    pub min_messages: usize,
}

impl Default for SlidingWindowConfig {
    fn default() -> Self {
        Self {
            max_messages: 20,  // Keep last 20 messages
            max_tokens: 3000,  // ~2000-3000 tokens is typical LLM context
            min_messages: 3,   // Always keep at least 3 for context
        }
    }
}

/// Pruning result with metadata about what was removed
#[derive(Debug, Clone, Serialize)]
pub struct PruningResult {
    pub messages: Vec<ConversationMessage>, // The kept messages themselves
    pub kept_count: usize,                  // Alias for messages.len()
    pub removed_count: usize,
    pub final_tokens: usize,
    pub tokens_removed: usize,
    pub health_metrics: Vec<HealthMetrics>,
    pub summary: String,
}

/// Semantic pruning with sliding window
///
/// Cost optimization: Reduces context length while preserving:
/// 1. Recent conversation flow (sliding window)
/// 2. Critical health metrics (always preserved)
/// 3. Important messages flagged by metadata
///
/// Expected compression: 40-60% for long conversations (>50 messages)
pub fn prune_conversation_history(
    messages: &[ConversationMessage],
    health_metrics: &[HealthMetrics],
    config: &SlidingWindowConfig,
    token_estimator: impl Fn(&str) -> usize,
) -> OptimizerResult<PruningResult> {
    if messages.is_empty() {
        return Ok(PruningResult {
            messages: Vec::new(),
            kept_count: 0,
            removed_count: 0,
            final_tokens: 0,
            tokens_removed: 0,
            health_metrics: health_metrics.to_vec(),
            summary: "No messages to prune".to_string(),
        });
    }

    // Score and prioritize messages
    // Higher score = more important to keep
    let mut scored: Vec<(usize, &ConversationMessage, usize, f64)> = Vec::with_capacity(messages.len());

    for (idx, msg) in messages.iter().enumerate() {
        let tokens = msg.tokens.unwrap_or_else(|| token_estimator(&msg.content));
        let mut score = 0.0;

        // Recency score: newer messages are more important
        let recency = idx as f64 / messages.len().max(1) as f64;
        score += recency; // 0.0 to 1.0

        // Health data flag: preserve messages with health metrics
        if let Some(meta) = &msg.metadata {
            if meta.get("has_health_data").and_then(|v| v.as_bool()).unwrap_or(false) {
                score += 2.0; // significant boost
            }
        }

        // User messages slightly prioritized (typically contain new information)
        if msg.role == "user" {
            score += 0.5;
        }

        scored.push((idx, msg, tokens, score));
    }

    // Sort by score descending, then by recency (index) descending for ties
    scored.sort_by(|a, b| {
        b.3.partial_cmp(&a.3).unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.0.cmp(&a.0))
    });

    // Select messages within limits (greedy from highest score)
    let mut kept_msgs = Vec::new();
    let mut total_tokens = 0;
    let mut removed_count = 0;
    let mut removed_tokens = 0;

    for (idx, msg, tokens, _score) in scored {
        let should_keep_by_count = kept_msgs.len() < config.max_messages;
        let should_keep_by_tokens = total_tokens + tokens <= config.max_tokens;
        let is_minimum = kept_msgs.len() < config.min_messages;

        if (should_keep_by_count && should_keep_by_tokens) || is_minimum {
            kept_msgs.push((idx, msg));
            total_tokens += tokens;
        } else {
            removed_count += 1;
            removed_tokens += tokens;
        }
    }

    // Sort kept messages by original index to maintain chronological order
    kept_msgs.sort_by_key(|&(idx, _)| idx);

    // Extract just the messages
    let messages: Vec<ConversationMessage> = kept_msgs.into_iter().map(|(_, msg)| msg.clone()).collect();

    // Merge health metrics (deduplicate by date)
    let unique_metrics = deduplicate_health_metrics(health_metrics);

    let kept_count = messages.len();
    let total_messages = messages.len() + removed_count; // Original count approximation
    Ok(PruningResult {
        messages,
        kept_count,
        removed_count,
        final_tokens: total_tokens,
        tokens_removed: removed_tokens,
        health_metrics: unique_metrics,
        summary: format!(
            "Kept {}/{} messages, {} tokens (removed {} msgs, {} tokens)",
            kept_count,
            total_messages,
            total_tokens,
            removed_count,
            removed_tokens
        ),
    })
}

/// Deduplicate health metrics by date (keep most recent per day)
fn deduplicate_health_metrics(metrics: &[HealthMetrics]) -> Vec<HealthMetrics> {
    let mut unique = Vec::new();
    let mut seen_dates = std::collections::HashSet::new();

    // Process from newest to oldest
    for metric in metrics.iter().rev() {
        if let Some(date) = &metric.recorded_at {
            // Extract date portion (YYYY-MM-DD)
            let date_key = date.split('T').next().unwrap_or(date);
            if !seen_dates.contains(date_key) {
                seen_dates.insert(date_key.to_string());
                unique.push(metric.clone());
            }
        } else {
            // Always include metrics without date
            unique.push(metric.clone());
        }
    }

    // Restore chronological order (oldest first)
    unique.reverse();
    unique
}

/// Extract key health metrics from conversation content
/// Scans for patterns like "weight: 70kg", "BMI: 23.5", "body fat: 15%"
pub fn extract_health_entities(content: &str) -> Vec<HealthMetrics> {
    let mut metrics = Vec::new();
    let mut current = HealthMetrics {
        weight_kg: None,
        bmi: None,
        body_fat_percent: None,
        muscle_mass_kg: None,
        water_percent: None,
        recorded_at: None,
    };

    let lower = content.to_lowercase();

    // Pattern matching for weight (simplified for WASM)
    // Looking for: "70kg", "70 kg", "154 lbs", etc.
    if let Some(weight) = extract_number_with_unit(&lower, &["weight", " weigh", "kg", "lb", "pound"]) {
        // Convert lbs to kg if needed
        let weight_kg = if lower.contains("lb") || lower.contains("pound") {
            weight * 0.453592
        } else {
            weight
        };
        current.weight_kg = Some(weight_kg);
    }

    // Pattern matching for BMI - look for number after "bmi" keyword
    if let Some(pos) = lower.find("bmi") {
        // Look for number in the text after "bmi" (within next 20 chars)
        let start = pos + 3; // after "bmi"
        let end = (start + 20).min(lower.len());
        let after = &lower[start..end];
        if let Some(bmi) = extract_number(after) {
            if (10.0..=50.0).contains(&bmi) {
                current.bmi = Some(bmi);
            }
        }
    } else if let Some(bmi) = extract_number_with_unit(&lower, &["body mass index"]) {
        if (10.0..=50.0).contains(&bmi) {
            current.bmi = Some(bmi);
        }
    }

    // Pattern matching for body fat percentage
    if let Some(bf) = extract_percentage(&lower, &["body fat", "body fat %", "bf%", "fat %"]) {
        if (5.0..=50.0).contains(&bf) {
            current.body_fat_percent = Some(bf);
        }
    }

    // Only push if we found something
    if current.weight_kg.is_some() || current.bmi.is_some() || current.body_fat_percent.is_some() {
        metrics.push(current);
    }

    metrics
}

/// Extract a number followed by a unit or preceded by a keyword
fn extract_number_with_unit(text: &str, keywords: &[&str]) -> Option<f64> {
    for keyword in keywords {
        if let Some(pos) = text.find(keyword) {
            // Look for number near the keyword
            let start = pos.saturating_sub(20);
            let end = (pos + keyword.len() + 20).min(text.len());
            let snippet = &text[start..end];

            if let Some(num) = extract_number(snippet) {
                return Some(num);
            }
        }
    }
    None
}

/// Extract percentage value
fn extract_percentage(text: &str, keywords: &[&str]) -> Option<f64> {
    for keyword in keywords {
        if let Some(pos) = text.find(keyword) {
            let start = pos.saturating_sub(20);
            let end = (pos + keyword.len() + 20).min(text.len());
            let snippet = &text[start..end];

            // Look for "XX%" pattern
            if let Some(num_str) = snippet.split('%').next() {
                if let Some(num) = extract_number(num_str) {
                    return Some(num);
                }
            }
        }
    }
    None
}

/// Extract first number found in string
fn extract_number(s: &str) -> Option<f64> {
    let mut num_str = String::new();
    let mut found_digit = false;
    let mut found_dot = false;

    for ch in s.chars() {
        if ch.is_digit(10) {
            num_str.push(ch);
            found_digit = true;
        } else if ch == '.' && !found_dot {
            num_str.push(ch);
            found_dot = true;
        } else if found_digit && !ch.is_ascii_digit() && ch != '.' {
            break;
        } else if !found_digit {
            continue;
        }
    }

    num_str.parse::<f64>().ok()
}

/// Generate a summary of the conversation window
/// Used for debugging and optimization analysis
pub fn generate_window_summary(
    messages: &[ConversationMessage],
    pruning_result: &PruningResult,
) -> String {
    let total_original = messages.len();
    let tokens_per_msg = if total_original > 0 && pruning_result.kept_count > 0 {
        pruning_result.final_tokens / pruning_result.kept_count
    } else {
        0
    };

    format!(
        "Window: {}→{} msgs ({}→{} tokens). Health metrics: {}. Avg {} tokens/msg.",
        total_original,
        pruning_result.kept_count,
        pruning_result.final_tokens + pruning_result.tokens_removed,
        pruning_result.final_tokens,
        pruning_result.health_metrics.len(),
        tokens_per_msg
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prune_conversation_basic() {
        let messages: Vec<ConversationMessage> = (0..10)
            .map(|i| ConversationMessage {
                id: format!("msg{}", i),
                role: if i % 2 == 0 { "user".to_string() } else { "assistant".to_string() },
                content: format!("Message {} with some content", i),
                timestamp: "2025-01-01T00:00:00Z".to_string(),
                tokens: Some(20),
                metadata: None,
            })
            .collect();

        let result = prune_conversation_history(&messages, &[], &SlidingWindowConfig::default(), |s| s.len() / 4).unwrap();

        assert!(result.kept_count <= 20);
        assert!(result.kept_count >= 3); // min_messages
    }

    #[test]
    fn test_extract_health_entities() {
        let content = "My weight is 70kg and my BMI is 23.5. Body fat is around 15%.";
        let metrics = extract_health_entities(content);

        assert!(!metrics.is_empty());
        assert!(metrics[0].weight_kg.is_some());
        assert!(metrics[0].bmi.is_some());
        assert!(metrics[0].body_fat_percent.is_some());
    }

    #[test]
    fn test_extract_number() {
        assert_eq!(extract_number("70.5 kg"), Some(70.5));
        assert_eq!(extract_number("abc 123 xyz"), Some(123.0));
        assert_eq!(extract_number("no numbers"), None);
    }

    #[test]
    fn test_deduplicate_health_metrics() {
        let metrics = vec![
            HealthMetrics {
                weight_kg: Some(70.0),
                recorded_at: Some("2025-01-01T10:00:00Z".to_string()),
                ..Default::default()
            },
            HealthMetrics {
                weight_kg: Some(71.0),
                recorded_at: Some("2025-01-01T15:00:00Z".to_string()),
                ..Default::default()
            },
            HealthMetrics {
                weight_kg: Some(72.0),
                recorded_at: Some("2025-01-02T10:00:00Z".to_string()),
                ..Default::default()
            },
        ];

        let unique = deduplicate_health_metrics(&metrics);
        assert_eq!(unique.len(), 2); // Same day deduplicated
    }
}
