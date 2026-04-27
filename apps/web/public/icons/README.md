# PWA Icons

This directory should contain PWA icons in various sizes for optimal display across devices.

## Required Icons

### For PWA Manifest:
- `icon-72x72.png` - 72x72 (small)
- `icon-96x96.png` - 96x96
- `icon-128x128.png` - 128x128
- `icon-144x144.png` - 144x144
- `icon-152x152.png` - 152x152
- `icon-192x192.png` - 192x192 (primary)
- `icon-384x384.png` - 384x384
- `icon-512x512.png` - 512x512 (primary splash icon)

### For Browser:
- `favicon.ico` - Multi-size ICO file (16x16, 32x32, 48x48)
- `favicon-16x16.png` - 16x16
- `favicon-32x32.png` - 32x32

## Apple Specific:
- `apple-touch-icon.png` - 180x180 (or use icon-180x180.png)
- `apple-touch-icon-precomposed.png` - 180x180

## Recommended Specifications:
- Format: PNG with transparency
- Background: Cyan/blue gradient matching AIVO brand
- Icon: White "A" or Activity icon on gradient background
- Corner radius: ~20% for modern look

## Design Guidelines:
- Brand colors: Cyan (#06b6d4) to Blue (#2563eb)
- Keep design simple and recognizable at small sizes
- Test on both light and dark backgrounds
- Ensure icon is centered and balanced

## Generation:
Use tools like:
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)
- Figma/Sketch export with multiple sizes

Once icons are ready, update `manifest.json` if icon names change.
