//! SVG Template definitions and rendering

use crate::types::{ColorPalette, SvgTemplate, SvgTemplateElement};

/// Get a template by ID
pub fn get_template_by_id(
    template_id: &str,
    width: u32,
    height: u32,
    theme: &str,
) -> Option<SvgTemplate> {
    let palette = crate::colors::generate_palette(theme, 0);

    match template_id {
        "weekly_summary" => Some(build_weekly_summary_template(width, height, palette)),
        "milestone" => Some(build_milestone_template(width, height, palette)),
        "streak" => Some(build_streak_template(width, height, palette)),
        "muscle_heatmap" => Some(build_muscle_heatmap_template(width, height, palette)),
        "comparison" => Some(build_comparison_template(width, height, palette)),
        _ => None,
    }
}

/// Build weekly summary template
pub fn build_weekly_summary_template(width: u32, height: u32, palette: ColorPalette) -> SvgTemplate {
    let mut elements = Vec::new();

    // Background
    elements.push(SvgTemplateElement::Rect {
        x: 0.0,
        y: 0.0,
        width: width as f64,
        height: height as f64,
        attributes: Some(vec![("fill".to_string(), palette.background.to_string())].into_iter().collect()),
    });

    // Header background
    elements.push(SvgTemplateElement::Rect {
        x: 0.0,
        y: 0.0,
        width: width as f64,
        height: 200.0,
        attributes: Some(vec![("fill".to_string(), palette.primary.to_string())].into_iter().collect()),
    });

    // Headline placeholder
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 120.0,
        content: "{{headline}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), "#ffffff".to_string()),
            ("font-size".to_string(), "48".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Subheadline placeholder
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 170.0,
        content: "{{subheadline}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), "#ffffff".to_string()),
            ("font-size".to_string(), "24".to_string()),
            ("opacity".to_string(), "0.8".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Stats section - 3 columns
    let stats_y = 280.0;
    let stat_width = (width as f64 - 80.0) / 3.0;

    for i in 0..3 {
        let x = 40.0 + i as f64 * stat_width;

        // Stat value placeholder
        elements.push(SvgTemplateElement::Text {
            x: x + stat_width / 2.0,
            y: stats_y,
            content: format!("{{{{stat.value.{}}}}}", i),
            attributes: Some(vec![
                ("fill".to_string(), palette.primary.to_string()),
                ("font-size".to_string(), "56".to_string()),
                ("font-weight".to_string(), "bold".to_string()),
                ("text-anchor".to_string(), "middle".to_string()),
            ].into_iter().collect()),
        });

        // Stat label placeholder
        elements.push(SvgTemplateElement::Text {
            x: x + stat_width / 2.0,
            y: stats_y + 50.0,
            content: format!("{{{{stat.label.{}}}}}", i),
            attributes: Some(vec![
                ("fill".to_string(), palette.text_muted.to_string()),
                ("font-size".to_string(), "18".to_string()),
                ("text-anchor".to_string(), "middle".to_string()),
            ].into_iter().collect()),
        });
    }

    // Narrative section
    let narrative_y = 450.0;
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: narrative_y,
        content: "{{narrative}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text.to_string()),
            ("font-size".to_string(), "28".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
            ("width".to_string(), "800".to_string()),
        ].into_iter().collect()),
    });

    // Footer with CTA
    elements.push(SvgTemplateElement::Rect {
        x: 0.0,
        y: height as f64 - 150.0,
        width: width as f64,
        height: 150.0,
        attributes: Some(vec![("fill".to_string(), palette.secondary.to_string())].into_iter().collect()),
    });

    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: height as f64 - 90.0,
        content: "{{callToAction}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), "#ffffff".to_string()),
            ("font-size".to_string(), "28".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: height as f64 - 50.0,
        content: "Join me on AIVO".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), "#ffffff".to_string()),
            ("font-size".to_string(), "18".to_string()),
            ("opacity".to_string(), "0.7".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    SvgTemplate {
        width,
        height,
        view_box: format!("0 0 {} {}", width, height),
        background: palette.background,
        elements,
    }
}

/// Build milestone celebration template
fn build_milestone_template(width: u32, height: u32, palette: ColorPalette) -> SvgTemplate {
    let mut elements = Vec::new();

    // Background gradient effect (solid for now)
    elements.push(SvgTemplateElement::Rect {
        x: 0.0,
        y: 0.0,
        width: width as f64,
        height: height as f64,
        attributes: Some(vec![("fill".to_string(), palette.background.to_string())].into_iter().collect()),
    });

    // Decorative circles
    for i in 0..5 {
        let x = (width as f64 * 0.2) + (i as f64 * width as f64 * 0.15);
        let y = 150.0;
        elements.push(SvgTemplateElement::Circle {
            cx: x,
            cy: y,
            r: 80.0 - i as f64 * 10.0,
            attributes: Some(vec![
                ("fill".to_string(), "none".to_string()),
                ("stroke".to_string(), palette.accent.to_string()),
                ("stroke-width".to_string(), "3".to_string()),
                ("opacity".to_string(), (0.3 - i as f64 * 0.05).max(0.1).to_string()),
            ].into_iter().collect()),
        });
    }

    // Milestone number (large)
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 350.0,
        content: "{{stat.value.0}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.accent.to_string()),
            ("font-size".to_string(), "180".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Milestone label
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 450.0,
        content: "{{stat.label.0}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text_muted.to_string()),
            ("font-size".to_string(), "32".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
            ("text-transform".to_string(), "uppercase".to_string()),
        ].into_iter().collect()),
    });

    // Headline
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 550.0,
        content: "{{headline}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text.to_string()),
            ("font-size".to_string(), "42".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Narrative
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 620.0,
        content: "{{narrative}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text_muted.to_string()),
            ("font-size".to_string(), "24".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // CTA
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: height as f64 - 100.0,
        content: "{{callToAction}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.primary.to_string()),
            ("font-size".to_string(), "28".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    SvgTemplate {
        width,
        height,
        view_box: format!("0 0 {} {}", width, height),
        background: palette.background,
        elements,
    }
}

/// Build streak template (fire theme)
fn build_streak_template(width: u32, height: u32, palette: ColorPalette) -> SvgTemplate {
    let mut elements = Vec::new();

    // Background
    elements.push(SvgTemplateElement::Rect {
        x: 0.0,
        y: 0.0,
        width: width as f64,
        height: height as f64,
        attributes: Some(vec![("fill".to_string(), palette.background.to_string())].into_iter().collect()),
    });

    // Fire icon area (using simple shapes)
    let fire_x = (width / 2) as f64;
    let fire_y = 200.0;

    // Fire shapes (simplified)
    elements.push(SvgTemplateElement::Group {
        children: vec![
            SvgTemplateElement::Path {
                d: format!("M {} {} Q {} {} {} {}", fire_x - 80.0, fire_y, fire_x - 40.0, fire_y - 120.0, fire_x, fire_y - 150.0),
                attributes: Some(vec![("fill".to_string(), "none".to_string())].into_iter().collect()),
            },
            SvgTemplateElement::Path {
                d: format!("M {} {} Q {} {} {} {}", fire_x + 80.0, fire_y, fire_x + 40.0, fire_y - 120.0, fire_x, fire_y - 150.0),
                attributes: Some(vec![("fill".to_string(), "none".to_string())].into_iter().collect()),
            },
        ],
        transform: None,
    });

    // Streak number (large)
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 450.0,
        content: "{{stat.value.0}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.accent.to_string()),
            ("font-size".to_string(), "200".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // "DAYS" label
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 520.0,
        content: "DAYS IN A ROW".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text_muted.to_string()),
            ("font-size".to_string(), "28".to_string()),
            ("letter-spacing".to_string(), "8".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Fire emoji
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 600.0,
        content: "🔥".to_string(),
        attributes: Some(vec![
            ("font-size".to_string(), "60".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Longest streak
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 700.0,
        content: format!("Longest: {{{{stat.value.1}}}} days"),
        attributes: Some(vec![
            ("fill".to_string(), palette.text_muted.to_string()),
            ("font-size".to_string(), "24".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    SvgTemplate {
        width,
        height,
        view_box: format!("0 0 {} {}", width, height),
        background: palette.background,
        elements,
    }
}

/// Build muscle heatmap template
fn build_muscle_heatmap_template(width: u32, height: u32, palette: ColorPalette) -> SvgTemplate {
    let mut elements = Vec::new();

    // Background
    elements.push(SvgTemplateElement::Rect {
        x: 0.0,
        y: 0.0,
        width: width as f64,
        height: height as f64,
        attributes: Some(vec![("fill".to_string(), palette.background.to_string())].into_iter().collect()),
    });

    // Title
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 80.0,
        content: "Muscle Development".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text.to_string()),
            ("font-size".to_string(), "42".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Body outline (simple torso rectangle)
    let body_center_x = (width / 2) as f64;
    let body_center_y = 450.0;
    let body_scale = 1.5;
    let torso_w = 200.0 * body_scale;
    let torso_h = 350.0 * body_scale;
    let torso_x = body_center_x - torso_w / 2.0;
    let torso_y = body_center_y - torso_h / 2.0;
    elements.push(SvgTemplateElement::Path {
        d: format!("M {} {} L {} {} L {} {} L {} {} Z", torso_x, torso_y, torso_x + torso_w, torso_y, torso_x + torso_w, torso_y + torso_h, torso_x, torso_y + torso_h),
        attributes: Some(vec![
            ("fill".to_string(), "none".to_string()),
            ("stroke".to_string(), palette.text_muted.to_string()),
            ("stroke-width".to_string(), "3".to_string()),
        ].into_iter().collect()),
    });

    // Heatmap circles placeholder (these will be dynamically generated)
    // Using muscle positions from shared types
    let muscles = [
        ("chest", (50.0, 42.0)),
        ("shoulders", (24.0, 38.0)),
        ("biceps", (18.0, 45.0)),
        ("abs", (50.0, 62.0)),
        ("quadriceps", (30.0, 82.0)),
        ("glutes", (38.0, 82.0)),
        ("calves", (30.0, 100.0)),
    ];

    for (muscle, (nx, ny)) in muscles {
        let x = body_center_x + (nx - 50.0) * 4.0 * body_scale;
        let y = body_center_y + (50.0 - ny) * 4.0 * body_scale;

        elements.push(SvgTemplateElement::Circle {
            cx: x,
            cy: y,
            r: 25.0,
            attributes: Some(vec![
                ("fill".to_string(), palette.accent.to_string()),
                ("opacity".to_string(), "0.7".to_string()),
                ("class".to_string(), format!("muscle-{}", muscle)),
            ].into_iter().collect()),
        });
    }

    // Legend
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: height as f64 - 60.0,
        content: "Color intensity shows training volume".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text_muted.to_string()),
            ("font-size".to_string(), "18".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    SvgTemplate {
        width,
        height,
        view_box: format!("0 0 {} {}", width, height),
        background: palette.background,
        elements,
    }
}

/// Build comparison template (before/after)
fn build_comparison_template(width: u32, height: u32, palette: ColorPalette) -> SvgTemplate {
    let mut elements = Vec::new();

    // Background
    elements.push(SvgTemplateElement::Rect {
        x: 0.0,
        y: 0.0,
        width: width as f64,
        height: height as f64,
        attributes: Some(vec![("fill".to_string(), palette.background.to_string())].into_iter().collect()),
    });

    // Title
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: 80.0,
        content: "My Progress".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text.to_string()),
            ("font-size".to_string(), "42".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Before/After headers
    let half_width = (width / 2) as f64;

    elements.push(SvgTemplateElement::Text {
        x: half_width / 2.0,
        y: 150.0,
        content: "BEFORE".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text_muted.to_string()),
            ("font-size".to_string(), "24".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    elements.push(SvgTemplateElement::Text {
        x: half_width * 1.5,
        y: 150.0,
        content: "AFTER".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.primary.to_string()),
            ("font-size".to_string(), "24".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    // Improvement metrics
    let metrics = [
        ("weight", "Weight", "{{improvement.weight}}", "kg"),
        ("bodyfat", "Body Fat", "{{improvement.bodyfat}}", "%"),
        ("muscle", "Muscle", "{{improvement.muscle}}", "kg"),
    ];

    for (i, (key, label, _value_tmpl, unit)) in metrics.iter().enumerate() {
        let y = 280.0 + i as f64 * 100.0;

        // Label
        elements.push(SvgTemplateElement::Text {
            x: half_width / 2.0,
            y,
            content: format!("{} (Before)", label),
            attributes: Some(vec![
                ("fill".to_string(), palette.text_muted.to_string()),
                ("font-size".to_string(), "18".to_string()),
                ("text-anchor".to_string(), "middle".to_string()),
            ].into_iter().collect()),
        });

        // Value
        elements.push(SvgTemplateElement::Text {
            x: half_width / 2.0,
            y: y + 30.0,
            content: format!("{{{{before.{}}}}} {}", key, unit),
            attributes: Some(vec![
                ("fill".to_string(), palette.text.to_string()),
                ("font-size".to_string(), "32".to_string()),
                ("font-weight".to_string(), "bold".to_string()),
                ("text-anchor".to_string(), "middle".to_string()),
            ].into_iter().collect()),
        });

        // Arrow
        elements.push(SvgTemplateElement::Text {
            x: half_width,
            y: y + 15.0,
            content: "→".to_string(),
            attributes: Some(vec![
                ("fill".to_string(), palette.accent.to_string()),
                ("font-size".to_string(), "36".to_string()),
                ("text-anchor".to_string(), "middle".to_string()),
            ].into_iter().collect()),
        });

        // After label
        elements.push(SvgTemplateElement::Text {
            x: half_width * 1.5,
            y,
            content: format!("{} (After)", label),
            attributes: Some(vec![
                ("fill".to_string(), palette.primary.to_string()),
                ("font-size".to_string(), "18".to_string()),
                ("text-anchor".to_string(), "middle".to_string()),
            ].into_iter().collect()),
        });

        // After value
        elements.push(SvgTemplateElement::Text {
            x: half_width * 1.5,
            y: y + 30.0,
            content: format!("{{{{after.{}}}}} {}", key, unit),
            attributes: Some(vec![
                ("fill".to_string(), palette.primary.to_string()),
                ("font-size".to_string(), "32".to_string()),
                ("font-weight".to_string(), "bold".to_string()),
                ("text-anchor".to_string(), "middle".to_string()),
            ].into_iter().collect()),
        });
    }

    // Headline at bottom
    elements.push(SvgTemplateElement::Text {
        x: (width / 2) as f64,
        y: height as f64 - 100.0,
        content: "{{headline}}".to_string(),
        attributes: Some(vec![
            ("fill".to_string(), palette.text.to_string()),
            ("font-size".to_string(), "28".to_string()),
            ("font-weight".to_string(), "bold".to_string()),
            ("text-anchor".to_string(), "middle".to_string()),
        ].into_iter().collect()),
    });

    SvgTemplate {
        width,
        height,
        view_box: format!("0 0 {} {}", width, height),
        background: palette.background,
        elements,
    }
}

/// Get simplified body outline path
fn get_body_outline_path(cx: f64, cy: f64, scale: f64) -> String {
    // Simplified body outline - front view
    let s = scale;
    let x = |v| cx + (v - 50.0) * 4.0 * s;

    format!(
        "M {} {} \
        Q {} {} {} {} \
        Q {} {} {} {} \
        L {} {} \
        Q {} {} {} {} \
        L {} {} \
        M {} {} \
        Q {} {} {} {} \
        L {} {} \
        Q {} {} {} {} \
        L {} {} \
        Q {} {} {} {} \
        ",
        // Head and neck
        x(50.0), cy - 150.0 * s,  // top center
        x(42.0), cy - 130.0 * s,
        x(32.0), cy - 120.0 * s,
        // Left arm
        x(15.0), cy - 100.0 * s,
        x(12.0), cy - 80.0 * s,
        x(18.0), cy - 40.0 * s,
        // Left leg
        x(25.0), cy + 50.0 * s,
        x(20.0), cy + 120.0 * s,
        x(28.0), cy + 180.0 * s,
        // Right side - mirrored
        x(50.0), cy - 150.0 * s,  // back to top
        x(58.0), cy - 130.0 * s,
        x(68.0), cy - 120.0 * s,
        x(85.0), cy - 100.0 * s,
        x(88.0), cy - 80.0 * s,
        x(82.0), cy - 40.0 * s,
        x(75.0), cy + 50.0 * s,
        x(80.0), cy + 120.0 * s,
        x(72.0), cy + 180.0 * s,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_template_by_id() {
        let _palette = crate::colors::generate_palette("vibrant", 0);
        let template = get_template_by_id("weekly_summary", 1080, 1080, "vibrant");
        assert!(template.is_some());
        let t = template.unwrap();
        assert_eq!(t.width, 1080);
        assert_eq!(t.height, 1080);
        assert!(!t.elements.is_empty());
    }

    #[test]
    fn test_get_template_unknown() {
        let template = get_template_by_id("unknown", 1080, 1080, "vibrant");
        assert!(template.is_none());
    }

    #[test]
    fn test_all_templates_have_elements() {
        let templates = ["weekly_summary", "milestone", "streak", "muscle_heatmap", "comparison"];
        for template_id in templates {
            let template = get_template_by_id(template_id, 1080, 1080, "vibrant")
                .expect(&format!("Template {} should exist", template_id));
            assert!(template.elements.len() > 5, "Template {} should have many elements", template_id);
        }
    }
}
