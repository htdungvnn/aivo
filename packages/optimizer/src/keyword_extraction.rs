use crate::error::OptimizerResult;
use crate::semantic_pruning::ConversationMessage;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Predefined health domain keywords (English)
/// These are the most common terms in fitness/health conversations
/// Optimized for size: ~2KB total for all lists
#[allow(dead_code)]
const HEALTH_KEYWORDS: &[&str] = &[
    // Exercises
    "pushup", "squat", "lunge", "plank", "burpee", "jump", "run", "walk", "cycle", "swim",
    "yoga", "stretch", "weight", "dumbbell", "barbell", "bench", "deadlift", "bench press",
    "pullup", "chinup", "rowing", "crunches", "situp", "mountain climber", "box jump",
    // Body parts
    "chest", "back", "legs", "arms", "shoulders", "core", "abs", "glutes", "calves", "biceps",
    "triceps", "quadriceps", "hamstrings", "forearms", "traps", "lats", "deltoids", "pecs",
    // Health metrics
    "weight", "bmi", "body fat", "muscle", "mass", "calories", "bmi", "heart rate", "blood pressure",
    "cholesterol", "glucose", "insulin", "metabolism", "tdee", "bmr", "keto", "protein",
    // Goals
    "lose weight", "gain muscle", "bulk", "cut", "lean", "strength", "endurance", "flexibility",
    "recovery", "rest", "sleep", "nutrition", "diet", "meal", "calorie deficit", "surplus",
    // Nutrition
    "protein", "carbs", "carbohydrates", "fat", "fiber", "vitamin", "mineral", "water", "hydration",
    "supplement", "creatine", "pre-workout", "post-workout", "bcaa", "omega", "multivitamin",
    // Measurements
    "kg", "lb", "pound", "ounce", "gram", "rep", "set", "rest", "seconds", "minutes", "hours",
    "days", "weeks", "months", "frequency", "intensity", "volume", "progressive", "overload",
];

/// Extracted entity with type classification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedEntity {
    pub entity: String,
    pub r#type: EntityType,
    pub confidence: f64, // 0.0 - 1.0 (heuristic-based)
    pub context: Option<String>, // Surrounding context snippet
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Exercise,
    BodyPart,
    Metric,
    Goal,
    Nutrition,
    Measurement,
    Time,
    Equipment,
    General,
}

/// Configuration for keyword extraction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionConfig {
    /// Maximum entities to extract per content
    pub max_entities: usize,
    /// Minimum confidence threshold
    pub min_confidence: f64,
    /// Include surrounding context (first N chars around entity)
    pub context_window: usize,
    /// Deduplicate identical entities
    pub deduplicate: bool,
}

impl Default for ExtractionConfig {
    fn default() -> Self {
        Self {
            max_entities: 20,
            min_confidence: 0.3,
            context_window: 30,
            deduplicate: true,
        }
    }
}

/// Main extractor for health-related entities
///
/// Cost optimization: Instead of sending full conversation history,
/// send extracted entities which are 10-20x more compact
///
/// Example compression:
/// - Original: 500 tokens of conversation
/// - Extracted: 25-50 tokens of entities + context
/// - Savings: 90-95%
pub struct KeywordExtractor {
    keywords: HashSet<String>,
    keyword_to_type: std::collections::HashMap<String, EntityType>,
}

impl KeywordExtractor {
    /// Create new extractor with default health keywords
    pub fn new() -> Self {
        let mut keywords = HashSet::new();
        let mut keyword_to_type = std::collections::HashMap::new();

        // Simple keyword mapping for now (can be expanded)
        let keyword_map: Vec<(&str, EntityType)> = vec![
            // Exercises
            ("pushup", EntityType::Exercise),
            ("squat", EntityType::Exercise),
            ("lunge", EntityType::Exercise),
            ("plank", EntityType::Exercise),
            ("burpee", EntityType::Exercise),
            ("run", EntityType::Exercise),
            ("walk", EntityType::Exercise),
            ("cycle", EntityType::Exercise),
            ("swim", EntityType::Exercise),
            ("yoga", EntityType::Exercise),
            ("weight", EntityType::Exercise),
            ("dumbbell", EntityType::Equipment),
            ("barbell", EntityType::Equipment),
            ("bench", EntityType::Equipment),
            ("deadlift", EntityType::Exercise),
            ("pullup", EntityType::Exercise),
            ("rowing", EntityType::Exercise),
            // Body parts
            ("chest", EntityType::BodyPart),
            ("back", EntityType::BodyPart),
            ("legs", EntityType::BodyPart),
            ("arms", EntityType::BodyPart),
            ("shoulders", EntityType::BodyPart),
            ("core", EntityType::BodyPart),
            ("abs", EntityType::BodyPart),
            ("glutes", EntityType::BodyPart),
            ("calves", EntityType::BodyPart),
            ("biceps", EntityType::BodyPart),
            ("triceps", EntityType::BodyPart),
            // Health metrics
            ("weight", EntityType::Metric),
            ("bmi", EntityType::Metric),
            ("body fat", EntityType::Metric),
            ("muscle", EntityType::Metric),
            ("calories", EntityType::Metric),
            ("heart rate", EntityType::Metric),
            ("blood pressure", EntityType::Metric),
            ("cholesterol", EntityType::Metric),
            ("glucose", EntityType::Metric),
            ("metabolism", EntityType::Metric),
            ("tdee", EntityType::Metric),
            ("bmr", EntityType::Metric),
            // Goals
            ("lose weight", EntityType::Goal),
            ("gain muscle", EntityType::Goal),
            ("bulk", EntityType::Goal),
            ("cut", EntityType::Goal),
            ("lean", EntityType::Goal),
            ("strength", EntityType::Goal),
            ("endurance", EntityType::Goal),
            ("flexibility", EntityType::Goal),
            ("recovery", EntityType::Goal),
            // Nutrition
            ("protein", EntityType::Nutrition),
            ("carbs", EntityType::Nutrition),
            ("carbohydrates", EntityType::Nutrition),
            ("fat", EntityType::Nutrition),
            ("fiber", EntityType::Nutrition),
            ("vitamin", EntityType::Nutrition),
            ("mineral", EntityType::Nutrition),
            ("water", EntityType::Nutrition),
            ("hydration", EntityType::Nutrition),
            ("supplement", EntityType::Nutrition),
            ("creatine", EntityType::Nutrition),
            ("bcaa", EntityType::Nutrition),
            // Measurements
            ("kg", EntityType::Measurement),
            ("lb", EntityType::Measurement),
            ("pound", EntityType::Measurement),
            ("gram", EntityType::Measurement),
            ("rep", EntityType::Measurement),
            ("set", EntityType::Measurement),
            ("rest", EntityType::Time),
            ("seconds", EntityType::Time),
            ("minutes", EntityType::Time),
            ("days", EntityType::Time),
            ("weeks", EntityType::Time),
        ];

        for (keyword, entity_type) in keyword_map {
            keywords.insert(keyword.to_string());
            keyword_to_type.insert(keyword.to_string(), entity_type);
        }

        Self {
            keywords,
            keyword_to_type,
        }
    }

    /// Extract entities from a single message content
    pub fn extract_from_text(&self, text: &str, config: &ExtractionConfig) -> Vec<ExtractedEntity> {
        let mut entities = Vec::new();
        let lower_text = text.to_lowercase();

        for keyword in &self.keywords {
            if let Some(entity_type) = self.keyword_to_type.get(keyword) {
                // Count occurrences
                let count = lower_text.matches(keyword).count();

                if count > 0 {
                    // Calculate confidence: more occurrences = higher confidence
                    let confidence = (count as f64).min(1.0);

                    if confidence >= config.min_confidence {
                        // Get context snippet
                        let context = if config.context_window > 0 {
                            extract_context(&lower_text, keyword, config.context_window)
                        } else {
                            None
                        };

                        entities.push(ExtractedEntity {
                            entity: keyword.clone(),
                            r#type: *entity_type,
                            confidence,
                            context,
                        });
                    }
                }
            }
        }

        // Deduplicate if needed
        if config.deduplicate {
            deduplicate_entities(entities)
        } else {
            entities
        }
    }

    /// Extract entities from a conversation message
    pub fn extract_from_message(
        &self,
        message: &ConversationMessage,
        config: &ExtractionConfig,
    ) -> Vec<ExtractedEntity> {
        let mut entities = self.extract_from_text(&message.content, config);

        // Add role-based entities
        if message.role == "user" {
            entities.push(ExtractedEntity {
                entity: "user_input".to_string(),
                r#type: EntityType::General,
                confidence: 1.0,
                context: None,
            });
        }

        entities
    }

    /// Compress conversation to entity summary
    /// Returns a compact representation of the conversation's health topics
    pub fn compress_conversation(
        &self,
        messages: &[ConversationMessage],
        config: &ExtractionConfig,
    ) -> OptimizerResult<CompressedSummary> {
        let mut all_entities = Vec::new();
        let mut entity_counts = std::collections::HashMap::new();

        for msg in messages {
            let entities = self.extract_from_message(msg, config);

            // Track counts for summary stats (before moving entities)
            for entity in &entities {
                *entity_counts.entry(entity.entity.clone()).or_insert(0) += 1;
            }

            all_entities.extend(entities);
        }

        // Sort by frequency (most discussed topics first)
        let mut sorted_entities: Vec<_> = entity_counts.into_iter().collect();
        sorted_entities.sort_by(|a, b| b.1.cmp(&a.1));

        // Take top N entities
        let top_entities: Vec<EntitySummary> = sorted_entities
            .iter()
            .take(config.max_entities)
            .map(|(entity, count)| EntitySummary {
                entity: entity.clone(),
                mentions: *count,
            })
            .collect();

        // Calculate estimated tokens
        let estimated_tokens = estimate_summary_tokens(&top_entities);

        Ok(CompressedSummary {
            entity_summaries: top_entities,
            total_messages: messages.len(),
            extraction_timestamp: chrono::Utc::now().to_rfc3339(),
            estimated_tokens,
        })
    }
}

/// Remove duplicate entities while preserving the one with highest confidence
fn deduplicate_entities(mut entities: Vec<ExtractedEntity>) -> Vec<ExtractedEntity> {
    let mut unique = Vec::new();
    let mut seen = HashSet::new();

    // Sort by confidence descending
    entities.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap_or_else(|| std::cmp::Ordering::Equal));

    for entity in entities {
        if !seen.contains(&entity.entity) {
            seen.insert(entity.entity.clone());
            unique.push(entity);
        }
    }

    unique
}

/// Extract context snippet around keyword
fn extract_context(text: &str, keyword: &str, window: usize) -> Option<String> {
    text.find(keyword)
        .map(|pos| {
            let start = pos.saturating_sub(window);
            let end = (pos + keyword.len() + window).min(text.len());
            let snippet = &text[start..end];

            // Add ellipsis if truncated
            let prefix = if start > 0 { "..." } else { "" };
            let suffix = if end < text.len() { "..." } else { "" };

            format!("{}{}{}", prefix, snippet, suffix)
        })
}

/// Estimate tokens for the compressed summary
fn estimate_summary_tokens(entities: &[EntitySummary]) -> usize {
    let mut tokens = 0;

    // Base overhead for JSON structure
    tokens += 20;

    for entity in entities {
        // Entity name + mention count
        tokens += (entity.entity.len() / 4) + 1;
    }

    tokens
}

/// Compressed summary representation
#[derive(Debug, Clone, Serialize)]
pub struct CompressedSummary {
    pub entity_summaries: Vec<EntitySummary>,
    pub total_messages: usize,
    pub extraction_timestamp: String,
    pub estimated_tokens: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct EntitySummary {
    pub entity: String,
    pub mentions: usize,
}

impl KeywordExtractor {
    /// Create from custom keyword lists (for testing/customization)
    pub fn with_custom_keywords(
        keywords: Vec<(String, EntityType)>,
    ) -> Self {
        let mut keyword_set = HashSet::new();
        let mut keyword_map = std::collections::HashMap::new();

        for (keyword, entity_type) in keywords {
            keyword_set.insert(keyword.clone());
            keyword_map.insert(keyword, entity_type);
        }

        Self {
            keywords: keyword_set,
            keyword_to_type: keyword_map,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_entities_basic() {
        let extractor = KeywordExtractor::new();
        let text = "I did 3 sets of pushups and 5 squats today. My weight is 70kg.";
        let entities = extractor.extract_from_text(text, &ExtractionConfig::default());

        assert!(!entities.is_empty());
        // Should find at least some exercises/body parts
        let exercise_types: Vec<&EntityType> = entities.iter().map(|e| &e.r#type).collect();
        assert!(exercise_types.contains(&&EntityType::Exercise));
    }

    #[test]
    fn test_extract_body_fat() {
        let extractor = KeywordExtractor::new();
        let text = "My body fat percentage is 15% and BMI is 23.5";
        let entities = extractor.extract_from_text(text, &ExtractionConfig::default());

        assert!(entities.iter().any(|e| e.entity == "body fat"));
        assert!(entities.iter().any(|e| e.entity == "bmi"));
    }

    #[test]
    fn test_compress_conversation() {
        let extractor = KeywordExtractor::new();
        let messages = vec![
            ConversationMessage {
                id: "1".to_string(),
                role: "user".to_string(),
                content: "I did squats today and my weight is 70kg".to_string(),
                timestamp: "2025-01-01T00:00:00Z".to_string(),
                tokens: None,
                metadata: None,
            },
            ConversationMessage {
                id: "2".to_string(),
                role: "assistant".to_string(),
                content: "Great! What's your BMI?".to_string(),
                timestamp: "2025-01-01T00:01:00Z".to_string(),
                tokens: None,
                metadata: None,
            },
        ];

        let summary = extractor
            .compress_conversation(&messages, &ExtractionConfig::default())
            .unwrap();

        assert!(summary.estimated_tokens > 0);
        assert_eq!(summary.total_messages, 2);
    }

    #[test]
    fn test_deduplicate() {
        let entities = vec![
            ExtractedEntity {
                entity: "squats".to_string(),
                r#type: EntityType::Exercise,
                confidence: 0.5,
                context: None,
            },
            ExtractedEntity {
                entity: "squats".to_string(),
                r#type: EntityType::Exercise,
                confidence: 0.8,
                context: None,
            },
        ];

        let dedup = deduplicate_entities(entities);
        assert_eq!(dedup.len(), 1);
        assert_eq!(dedup[0].confidence, 0.8); // Higher confidence kept
    }

    #[test]
    fn test_extract_context() {
        let text = "This is a long text where squats exercise was mentioned.";
        let context = extract_context(text, "squats", 10);

        assert!(context.is_some());
        let ctx = context.unwrap();
        assert!(ctx.contains("squats"));
        // May have ellipsis if truncated
    }
}
