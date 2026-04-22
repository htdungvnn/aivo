//! Color palette generation for infographic themes

use crate::types::ColorPalette;

/// Generate color palette for a given theme
pub fn generate_palette(theme: &str, _level: i32) -> ColorPalette {
    match theme {
        "neon" => ColorPalette {
            primary: "#00ff88".to_string(),
            secondary: "#ff00ff".to_string(),
            accent: "#00ffff".to_string(),
            background: "#0a0a1a".to_string(),
            text: "#ffffff".to_string(),
            text_muted: "#888888".to_string(),
        },
        "ocean" => ColorPalette {
            primary: "#0077be".to_string(),
            secondary: "#00b4d8".to_string(),
            accent: "#90e0ef".to_string(),
            background: "#f0f9ff".to_string(),
            text: "#1e3a5f".to_string(),
            text_muted: "#64748b".to_string(),
        },
        "sunset" => ColorPalette {
            primary: "#ff6b35".to_string(),
            secondary: "#f7c59f".to_string(),
            accent: "#ffbe0b".to_string(),
            background: "#fff8f0".to_string(),
            text: "#1f2937".to_string(),
            text_muted: "#78716c".to_string(),
        },
        "dark" => ColorPalette {
            primary: "#818cf8".to_string(),
            secondary: "#a5b4fc".to_string(),
            accent: "#f472b6".to_string(),
            background: "#1f2937".to_string(),
            text: "#f9fafb".to_string(),
            text_muted: "#9ca3af".to_string(),
        },
        "light" => ColorPalette {
            primary: "#4f46e5".to_string(),
            secondary: "#6366f1".to_string(),
            accent: "#ec4899".to_string(),
            background: "#ffffff".to_string(),
            text: "#111827".to_string(),
            text_muted: "#6b7280".to_string(),
        },
        "vibrant" | _ => ColorPalette {
            primary: "#6366f1".to_string(),
            secondary: "#818cf8".to_string(),
            accent: "#f97316".to_string(),
            background: "#ffffff".to_string(),
            text: "#1f2937".to_string(),
            text_muted: "#6b7280".to_string(),
        },
    }
}

/// Get default palette (vibrant theme)
pub fn default_palette() -> ColorPalette {
    generate_palette("vibrant", 0)
}

/// Get color for intensity (for heatmap)
pub fn get_heatmap_color(intensity: f64) -> (u8, u8, u8, u8) {
    let i = intensity.max(0.0).min(1.0);
    let alpha = ((0.4 + i * 0.6) * 255.0) as u8;

    match i {
        i if i < 0.2 => (59, 130, 246, alpha),      // blue
        i if i < 0.4 => (6, 182, 212, alpha),      // cyan
        i if i < 0.6 => (34, 197, 94, alpha),      // green
        i if i < 0.8 => (234, 179, 8, alpha),      // yellow
        _ => (249, 115, 22, alpha),                // orange
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_palette_neon() {
        let palette = generate_palette("neon", 0);
        assert_eq!(palette.background, "#0a0a1a");
        assert_eq!(palette.primary, "#00ff88");
    }

    #[test]
    fn test_generate_palette_default() {
        let palette = generate_palette("unknown", 0);
        assert_eq!(palette.primary, "#6366f1");
    }

    #[test]
    fn test_get_heatmap_color() {
        let (_r, _g, _b, a) = get_heatmap_color(0.0);
        assert_eq!(a, 102); // 0.4 * 255

        let (_r, _g, _b, a) = get_heatmap_color(1.0);
        assert_eq!(a, 255); // 0.9 * 255
    }
}
