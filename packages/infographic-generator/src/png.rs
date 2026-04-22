//! PNG rendering from SVG using resvg and tiny-skia

use usvg::{Tree, Options};
use usvg::fontdb::Database;
use tiny_skia::{Pixmap, Transform, Color};
use base64::Engine;

/// Render PNG from SVG string
///
/// # Arguments
/// * `svg_string` - Raw SVG content
/// * `scale` - Resolution multiplier (1.0 = 1:1, 2.0 = retina, etc.)
///
/// # Returns
/// Base64-encoded PNG data
pub fn render_png(svg_string: &str, scale: f64) -> Result<String, PngError> {
    // Parse SVG
    let opt = Options::default();
    let db = Database::default();
    let tree = Tree::from_str(svg_string, &opt, &db)
        .map_err(|e| PngError::Parsing(e.to_string()))?;

    // Calculate dimensions (scale as f32 for tiny-skia)
    let scale_f32 = scale as f32;
    let size = tree.size();
    let width = (size.width() * scale_f32).ceil() as u32;
    let height = (size.height() * scale_f32).ceil() as u32;

    // Create pixmap
    let mut pixmap = Pixmap::new(width, height)
        .ok_or_else(|| PngError::InvalidSize { width, height })?;

    // Fill with white background
    pixmap.fill(Color::WHITE);

    // Render SVG to pixmap
    resvg::render(&tree, Transform::from_scale(scale_f32, scale_f32), &mut pixmap.as_mut());

    // Encode to PNG
    let png_data = pixmap.encode_png()
        .map_err(|e| PngError::Encoding(e.to_string()))?;

    // Convert to base64
    let base64 = base64::engine::general_purpose::STANDARD.encode(&png_data);

    Ok(base64)
}

/// Render PNG to raw bytes (not base64)
pub fn render_png_bytes(svg_string: &str, scale: f64) -> Result<Vec<u8>, PngError> {
    let base64 = render_png(svg_string, scale)?;
    base64::engine::general_purpose::STANDARD.decode(&base64)
        .map_err(|e| PngError::Base64Decode(e.to_string()))
}

/// Get dimensions from SVG string without rendering
pub fn get_svg_dimensions(svg_string: &str) -> Result<(f64, f64), PngError> {
    let opt = Options::default();
    let db = Database::default();
    let tree = Tree::from_str(svg_string, &opt, &db)
        .map_err(|e| PngError::Parsing(e.to_string()))?;

    let size = tree.size();
    Ok((size.width() as f64, size.height() as f64))
}

#[derive(Debug, thiserror::Error)]
pub enum PngError {
    #[error("SVG parsing error: {0}")]
    Parsing(String),

    #[error("Invalid size: {width}x{height}")]
    InvalidSize { width: u32, height: u32 },

    #[error("PNG encoding error: {0}")]
    Encoding(String),

    #[error("Base64 decode error: {0}")]
    Base64Decode(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_svg_dimensions() {
        let svg = r#"<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200" viewBox="0 0 100 200">
            <rect x="0" y="0" width="100" height="200" fill="white"/>
        </svg>"#;

        let (w, h) = get_svg_dimensions(svg).unwrap();
        assert_eq!(w, 100.0);
        assert_eq!(h, 200.0);
    }

    #[test]
    fn test_get_svg_dimensions_invalid() {
        let svg = r#"<svg><invalid></svg>"#;
        let result = get_svg_dimensions(svg);
        assert!(result.is_err());
    }

    #[test]
    fn test_render_png() {
        let svg = r##"<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <rect x="0" y="0" width="100" height="100" fill="#ff0000"/>
        </svg>"##;

        let png_base64 = render_png(svg, 2.0).unwrap();
        assert!(!png_base64.is_empty());

        // Verify it's valid base64 PNG
        let png_bytes = base64::engine::general_purpose::STANDARD.decode(&png_base64).unwrap();
        assert!(png_bytes.len() > 0);
        // PNG magic bytes
        assert_eq!(&png_bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
    }

    #[test]
    fn test_render_png_bytes() {
        let svg = r##"<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="#00ff00"/>
        </svg>"##;

        let png_bytes = render_png_bytes(svg, 1.0).unwrap();
        assert!(png_bytes.len() > 0);
        // PNG magic bytes
        assert_eq!(&png_bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
    }

    #[test]
    fn test_render_png_complex_svg() {
        let svg = r##"<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
            <rect width="1080" height="1080" fill="#6366f1"/>
            <text x="540" y="540" font-size="64" fill="white" text-anchor="middle">Hello AIVO!</text>
        </svg>"##;

        let png_base64 = render_png(svg, 1.0).unwrap();
        let png_bytes = base64::engine::general_purpose::STANDARD.decode(&png_base64).unwrap();

        // Should be at least 1KB for a simple image
        assert!(png_bytes.len() > 1000);
        // PNG magic bytes
        assert_eq!(&png_bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
    }
}
