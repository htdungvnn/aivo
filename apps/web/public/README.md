# Static Assets

This directory contains static assets for the AIVO web application.

## Required Files

### PWA Icons
See `icons/README.md` for icon specifications.

### Open Graph Image
- `og-image.png` - 1200x630px image for social sharing
  - Should include AIVO branding
  - Include tagline: "AI-Powered Fitness Intelligence"
  - Use brand colors: Cyan (#06b6d4) and Blue (#2563eb)

### Favicon
- `favicon.ico` - Multi-resolution icon for browser tabs
  - Can be generated from the 512x512 icon
  - Use tools like RealFaviconGenerator

### Splash Screen (iOS)
- `splash.png` - 1282x2732px (or multiple sizes) for PWA splash screen
  - Center AIVO logo on brand background
  - Match dark theme colors

## Generating Assets

### Quick Start (Using Placeholder):
1. Create a simple 1200x630px PNG for `og-image.png` with AIVO text
2. Generate icons from that image using RealFaviconGenerator
3. Download the package and place files in `icons/` and root

### Using Command Line (with ImageMagick):
```bash
# Create a simple gradient icon
convert -size 512x512 gradient:"#06b6d4"-"#2563eb" \
  -gravity center -pointsize 72 -fill white -annotate 0 "AIVO" \
  icons/icon-512x512.png

# Generate other sizes
for size in 72 96 128 144 152 192 384; do
  convert icons/icon-512x512.png -resize ${size}x${size} icons/icon-${size}x${size}.png
done
```

## Notes
- All images should be optimized (use tools like ImageOptim, TinyPNG)
- Consider using WebP format for smaller file sizes
- Ensure sufficient contrast for accessibility
- Test on actual devices for PWA install prompt

## Missing Assets Warning
If these assets are missing:
- PWA install prompt will not appear
- Social sharing will show generic preview
- Favicon may show browser default
- iOS splash screen will be blank

Make sure to add these before production deployment!
