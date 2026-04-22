//! SVG rendering from templates and data

use crate::types::*;
use svg::{node::element::{Text, Group, Rectangle, Circle, Path, Image}, Document, node::Text as SvgText};

/// Render SVG from template and data
pub fn render_svg(template: SvgTemplate, data: &InfographicData) -> Result<String, RenderError> {
    let mut doc = Document::new()
        .set("width", template.width.to_string())
        .set("height", template.height.to_string())
        .set("viewBox", template.view_box.as_str())
        .set("xmlns", "http://www.w3.org/2000/svg");

    // Add background
    let background_rect = Rectangle::new()
        .set("x", "0")
        .set("y", "0")
        .set("width", template.width.to_string())
        .set("height", template.height.to_string())
        .set("fill", template.background.as_str());
    doc = doc.add(background_rect);

    // Render each template element
    for element in &template.elements {
        match element {
            SvgTemplateElement::Text { x, y, content, attributes } => {
                let substituted = substitute_placeholders(content, data)?;
                let mut text = Text::new()
                    .add(SvgText::new(substituted))
                    .set("x", x.to_string())
                    .set("y", y.to_string());
                if let Some(attrs) = attributes {
                    for (key, value) in attrs {
                        text = text.set(key, value.as_str());
                    }
                }
                doc = doc.add(text);
            }

            SvgTemplateElement::Rect { x, y, width, height, attributes } => {
                let mut rect = Rectangle::new()
                    .set("x", x.to_string())
                    .set("y", y.to_string())
                    .set("width", width.to_string())
                    .set("height", height.to_string());
                if let Some(attrs) = attributes {
                    for (key, value) in attrs {
                        rect = rect.set(key, value.as_str());
                    }
                }
                doc = doc.add(rect);
            }

            SvgTemplateElement::Circle { cx, cy, r, attributes } => {
                let mut circle = Circle::new()
                    .set("cx", cx.to_string())
                    .set("cy", cy.to_string())
                    .set("r", r.to_string());
                if let Some(attrs) = attributes {
                    for (key, value) in attrs {
                        circle = circle.set(key, value.as_str());
                    }
                }
                doc = doc.add(circle);
            }

            SvgTemplateElement::Path { d, attributes } => {
                let mut path = Path::new()
                    .set("d", d.as_str());
                if let Some(attrs) = attributes {
                    for (key, value) in attrs {
                        path = path.set(key, value.as_str());
                    }
                }
                doc = doc.add(path);
            }

            SvgTemplateElement::Image { x, y, width, height, href } => {
                let image = Image::new()
                    .set("x", x.to_string())
                    .set("y", y.to_string())
                    .set("width", width.to_string())
                    .set("height", height.to_string())
                    .set("href", href.as_str())
                    .set("preserveAspectRatio", "xMidYMid meet");
                doc = doc.add(image);
            }

            SvgTemplateElement::Group { children, transform } => {
                let mut group = Group::new();
                if let Some(transform_str) = transform {
                    group = group.set("transform", transform_str.as_str());
                }
                for child in children {
                    match child {
                        SvgTemplateElement::Text { x, y, content, attributes } => {
                            let substituted = substitute_placeholders(content, data)?;
                            let mut child_text = Text::new()
                                .add(SvgText::new(substituted))
                                .set("x", x.to_string())
                                .set("y", y.to_string());
                            if let Some(attrs) = attributes {
                                for (key, value) in attrs {
                                    child_text = child_text.set(key, value.as_str());
                                }
                            }
                            group = group.add(child_text);
                        }
                        SvgTemplateElement::Rect { x, y, width, height, attributes } => {
                            let mut child_rect = Rectangle::new()
                                .set("x", x.to_string())
                                .set("y", y.to_string())
                                .set("width", width.to_string())
                                .set("height", height.to_string());
                            if let Some(attrs) = attributes {
                                for (key, value) in attrs {
                                    child_rect = child_rect.set(key, value.as_str());
                                }
                            }
                            group = group.add(child_rect);
                        }
                        SvgTemplateElement::Circle { cx, cy, r, attributes } => {
                            let mut child_circle = Circle::new()
                                .set("cx", cx.to_string())
                                .set("cy", cy.to_string())
                                .set("r", r.to_string());
                            if let Some(attrs) = attributes {
                                for (key, value) in attrs {
                                    child_circle = child_circle.set(key, value.as_str());
                                }
                            }
                            group = group.add(child_circle);
                        }
                        SvgTemplateElement::Path { d, attributes } => {
                            let mut child_path = Path::new()
                                .set("d", d.as_str());
                            if let Some(attrs) = attributes {
                                for (key, value) in attrs {
                                    child_path = child_path.set(key, value.as_str());
                                }
                            }
                            group = group.add(child_path);
                        }
                        SvgTemplateElement::Image { x, y, width, height, href } => {
                            let child_image = Image::new()
                                .set("x", x.to_string())
                                .set("y", y.to_string())
                                .set("width", width.to_string())
                                .set("height", height.to_string())
                                .set("href", href.as_str())
                                .set("preserveAspectRatio", "xMidYMid meet");
                            group = group.add(child_image);
                        }
                        SvgTemplateElement::Group { .. } => {
                            // Nested groups not expected in templates
                        }
                    }
                }
                doc = doc.add(group);
            }
        }
    }

    Ok(doc.to_string())
}

/// Substitute placeholders in text with actual data
fn substitute_placeholders(text: &str, data: &InfographicData) -> Result<String, RenderError> {
    let mut result = text.to_string();

    result = result.replace("{{headline}}", &data.story.headline);

    if let Some(subheadline) = &data.story.subheadline {
        result = result.replace("{{subheadline}}", subheadline);
    } else {
        result = result.replace("{{subheadline}}", "");
    }

    result = result.replace("{{narrative}}", &data.story.narrative);
    result = result.replace("{{callToAction}}", &data.story.call_to_action);

    for (i, stat) in data.story.stats.iter().enumerate() {
        let pattern_val = format!("{{{{stat.value.{}}}}}", i);
        let pattern_lbl = format!("{{{{stat.label.{}}}}}", i);
        result = result.replace(&pattern_val, &stat.value);
        result = result.replace(&pattern_lbl, &stat.label);
    }

    if let Some(weight) = data.stats.body.weight_change {
        result = result.replace("{{improvement.weight}}", &format!("{:.1} kg", weight.abs()));
    }

    if let Some(bodyfat) = data.stats.body.body_fat_change {
        result = result.replace("{{improvement.bodyfat}}", &format!("{:.1}%", bodyfat.abs()));
    }

    if let Some(muscle) = data.stats.body.muscle_gain {
        result = result.replace("{{improvement.muscle}}", &format!("{:.1} kg", muscle));
    }

    if data.stats.body.weight_change.is_some() {
        let before = 70.0;
        result = result.replace(&format!("{{{{before.weight}}}}"), &before.to_string());
    }

    if result.contains("{{stat.value.0}}") {
        result = result.replace("{{stat.value.0}}", &data.stats.gamification.streak.to_string());
    }
    if result.contains("{{stat.value.1}}") {
        result = result.replace("{{stat.value.1}}", &data.stats.gamification.longest_streak.to_string());
    }

    Ok(result)
}

/// Render error type
#[derive(Debug, thiserror::Error)]
pub enum RenderError {
    #[error("Template rendering error: {0}")]
    Template(String),
    #[error("Placeholder substitution error: {0}")]
    Substitution(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{InfographicStory, StatData, WorkoutStats, GamificationStats, StrengthStats, BodyStats, Comparisons, UserStats, Period};

    fn create_test_data() -> InfographicData {
        let story = InfographicStory {
            headline: "Test Headline".to_string(),
            subheadline: Some("Test Subheadline".to_string()),
            narrative: "This is a test narrative.".to_string(),
            stats: vec![
                StatData {
                    label: "Workouts".to_string(),
                    value: "5".to_string(),
                    unit: Some("workouts".to_string()),
                    comparison: None,
                    icon: None,
                },
                StatData {
                    label: "Calories".to_string(),
                    value: "1500".to_string(),
                    unit: Some("kcal".to_string()),
                    comparison: Some("Top 20%".to_string()),
                    icon: None,
                },
            ],
            call_to_action: "Join me on AIVO!".to_string(),
            fun_facts: vec!["Fact 1".to_string()],
            tone: "motivational".to_string(),
            reading_level: "easy".to_string(),
        };

        let stats = UserStats {
            period: Period {
                start_date: "2025-01-01".to_string(),
                end_date: "2025-01-07".to_string(),
                period_type: "weekly".to_string(),
            },
            workouts: WorkoutStats {
                count: 5,
                total_minutes: 300,
                total_calories: 1500.0,
                avg_duration: 60.0,
                types: std::collections::HashMap::new(),
                personal_records: Vec::new(),
            },
            strength: StrengthStats {
                total_volume: 10000.0,
                top_exercises: Vec::new(),
                estimated_one_rms: std::collections::HashMap::new(),
            },
            gamification: GamificationStats {
                streak: 7,
                longest_streak: 30,
                points: 1000,
                level: 5,
                badges: 3,
                leaderboard_rank: None,
                percentile: None,
            },
            body: BodyStats {
                weight_change: Some(-2.5),
                body_fat_change: Some(-1.5),
                muscle_gain: Some(1.0),
                bmi: Some(22.5),
                health_score: Some(75.0),
                muscle_development: None,
            },
            comparisons: Comparisons {
                vs_average: std::collections::HashMap::new(),
                personal_bests: Vec::new(),
            },
        };

        let config = InfographicConfig {
            template: crate::types::InfographicTemplate::WeeklySummary,
            theme: "vibrant".to_string(),
            layout: "square".to_string(),
            color_scheme: crate::colors::default_palette(),
            typography: crate::types::TypographyConfig {
                headline_font: "Arial".to_string(),
                body_font: "Arial".to_string(),
                headline_size: 64.0,
                subhead_size: 36.0,
                body_size: 24.0,
            },
            include_stats: Vec::new(),
            include_comparison: true,
            width: 1080,
            height: 1080,
        };

        InfographicData {
            id: "test".to_string(),
            user_id: "user123".to_string(),
            template: crate::types::InfographicTemplate::WeeklySummary,
            config,
            story,
            stats,
            created_at: chrono::Utc::now(),
            shareable_image_url: None,
            svg_content: None,
            width: 1080,
            height: 1080,
        }
    }

    #[test]
    fn test_substitute_placeholders() {
        let data = create_test_data();

        assert_eq!(
            substitute_placeholders("{{headline}}", &data).unwrap(),
            "Test Headline"
        );

        assert_eq!(
            substitute_placeholders("{{narrative}}", &data).unwrap(),
            "This is a test narrative."
        );

        assert_eq!(
            substitute_placeholders("{{callToAction}}", &data).unwrap(),
            "Join me on AIVO!"
        );

        assert_eq!(
            substitute_placeholders("{{subheadline}}", &data).unwrap(),
            "Test Subheadline"
        );
    }

    #[test]
    fn test_substitute_stat_placeholders() {
        let data = create_test_data();

        assert_eq!(
            substitute_placeholders("{{stat.value.0}}", &data).unwrap(),
            "5"
        );

        assert_eq!(
            substitute_placeholders("{{stat.label.0}}", &data).unwrap(),
            "Workouts"
        );

        assert_eq!(
            substitute_placeholders("{{stat.value.1}}", &data).unwrap(),
            "1500"
        );
    }

    #[test]
    fn test_render_svg() {
        let data = create_test_data();
        let template = crate::templates::build_weekly_summary_template(
            1080, 1080, crate::colors::default_palette()
        );

        let svg = render_svg(template, &data).unwrap();

        assert!(svg.contains("<svg") || svg.contains("<svg "));
        assert!(svg.contains("Test Headline"));
        assert!(svg.contains("This is a test narrative."));
    }

    #[test]
    fn test_render_svg_empty_template() {
        let template = SvgTemplate {
            width: 1080,
            height: 1080,
            view_box: "0 0 1080 1080".to_string(),
            background: "#ffffff".to_string(),
            elements: Vec::new(),
        };

        let data = create_test_data();
        let svg = render_svg(template, &data).unwrap();

        assert!(svg.contains("<svg"));
    }
}
