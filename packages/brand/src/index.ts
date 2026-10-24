/**
 * AIVO brand tokens and the canonical logo mark geometry.
 *
 * The mark is defined once here and rendered by `scripts/generate-assets.ts`
 * into every app (web, mobile, API), so a change to the mark propagates
 * everywhere after re-running the generator.
 */

/** Brand palette, mirrored from `apps/web/app/globals.css`. */
export const brand = {
  ink: "#09090B",
  surface: "#111113",
  card: "#18181B",
  primary: "#A3FF12",
  primaryStrong: "#8DE60A",
  primaryLight: "#D7FF7A",
  primaryInk: "#0A0F02",
  text: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",
  hairline: "rgba(255,255,255,0.08)",
} as const;

/**
 * The AIVO glyph: an upward chevron forming an abstract "A".
 * Drawn on a 64x64 grid, matching the source `apps/web/app/icon.svg`.
 */
export const markPath = "M32 13 L48 48 H40.5 L32 28.5 L23.5 48 H16 Z";

/** Corner radius of the app-icon tile, on the 64x64 grid. */
export const iconRadius = 14;

/** The wordmark used next to the glyph. */
export const wordmark = "AIVO";

/** Tagline used in the app store metadata and splash screens. */
export const tagline = "Your AI Coach for a Healthier You";

/** Full product name. */
export const productName = "AIVO";

/**
 * The app-icon tile: rounded square in `ink` with the `primary` glyph.
 */
export function iconSvg(size = 64): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <rect width="64" height="64" rx="${iconRadius}" fill="${brand.ink}" />
  <path
    d="${markPath}"
    fill="${brand.primary}"
  />
</svg>
`;
}

/**
 * The bare glyph with no tile, for use on primary-colored backgrounds.
 */
export function glyphSvg(size = 64, color: string = brand.primary): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <path
    d="${markPath}"
    fill="${color}"
  />
</svg>
`;
}

/**
 * A horizontal lockup: glyph tile followed by the wordmark.
 */
export function lockupSvg(
  options: { width?: number; height?: number; wordmarkColor?: string; tile?: boolean } = {},
): string {
  const height = options.height ?? 56;
  const width = options.width ?? Math.round(height * 3.4);
  const tile = options.tile ?? true;
  const wordmarkColor = options.wordmarkColor ?? brand.text;
  const glyphSize = 64;
  const gap = 18;
  const fontSize = Math.round(glyphSize * 0.56);
  const baseline = 44;

  const glyph = tile
    ? `<rect width="${glyphSize}" height="${glyphSize}" rx="${iconRadius}" fill="${brand.primary}" />
       <path d="${markPath}" fill="${brand.primaryInk}" />`
    : `<path d="${markPath}" fill="${brand.primary}" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g transform="translate(0 ${(height - glyphSize) / 2})">
    ${glyph}
  </g>
  <text
    x="${glyphSize + gap}"
    y="${baseline}"
    font-family="Inter, Helvetica, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    letter-spacing="-1"
    fill="${wordmarkColor}"
  >${wordmark}</text>
</svg>
`;
}
