/**
 * Renders every AIVO brand asset in the repo from the canonical mark in
 * `../src/index.ts`.
 *
 * Run with: pnpm --filter @repo/brand generate
 *
 * The generated files are committed so that builds never depend on this
 * script running.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { brand, glyphSvg, iconSvg, lockupSvg, markPath } from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

const webApp = join(repoRoot, "apps", "web");
const webPublic = join(webApp, "public");
const mobileImages = join(repoRoot, "apps", "mobile", "assets", "images");
const mobileAssets = join(repoRoot, "apps", "mobile", "assets");
const apiPublic = join(repoRoot, "apps", "api", "public");

async function write(path: string, contents: string | Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  console.log(`  wrote ${path.replace(`${repoRoot}/`, "")}`);
}

/** Rasterize an SVG string to a square PNG at the requested size. */
async function png(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(size, size, { fit: "contain" }).png().toBuffer();
}

/** Rasterize an SVG string to a PNG at explicit dimensions. */
async function pngSized(
  svg: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(width, height, { fit: "contain" }).png().toBuffer();
}

const MARK_VIEWBOX = 64;

/** A square tile: rounded `ink` background with the `primary` glyph. */
function tileSvg(size: number, radius = 14): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" width="${size}" height="${size}">
  <rect width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}" rx="${radius}" fill="${brand.ink}" />
  <path d="${markPath}" fill="${brand.primary}" />
</svg>
`;
}

/**
 * Android adaptive-icon foreground: the glyph must sit inside the inner
 * 66% safe zone of the 108dp canvas, so we scale it down and centre it.
 */
function adaptiveForegroundSvg(size: number): string {
  const glyphScale = 0.44;
  const offset = MARK_VIEWBOX / 2 - (MARK_VIEWBOX * glyphScale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" width="${size}" height="${size}">
  <g transform="translate(${offset} ${offset}) scale(${glyphScale})">
    <path d="${markPath}" fill="${brand.primary}" />
  </g>
</svg>
`;
}

/** Android monochrome layer: single-color glyph on transparency. */
function monochromeSvg(size: number): string {
  const glyphScale = 0.44;
  const offset = MARK_VIEWBOX / 2 - (MARK_VIEWBOX * glyphScale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" width="${size}" height="${size}">
  <g transform="translate(${offset} ${offset}) scale(${glyphScale})">
    <path d="${markPath}" fill="#000000" />
  </g>
</svg>
`;
}

/** A soft radial glow behind the glyph, for the animated splash. */
function glowSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" width="${size}" height="${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${brand.primary}" stop-opacity="0.55" />
      <stop offset="55%" stop-color="${brand.primary}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${brand.primary}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="32" fill="url(#glow)" />
</svg>
`;
}

/** A wide banner lockup used for the API landing page. */
function bannerSvg(width: number, height: number): string {
  const tile = 72;
  const padX = 48;
  const padY = (height - tile) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${brand.primary}" />
      <stop offset="100%" stop-color="${brand.primaryLight}" />
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="0%" r="70%">
      <stop offset="0%" stop-color="${brand.primary}" stop-opacity="0.22" />
      <stop offset="70%" stop-color="${brand.primary}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${brand.ink}" />
  <rect width="${width}" height="${height}" fill="url(#glow)" />
  <g transform="translate(${padX} ${padY})">
    <rect width="${tile}" height="${tile}" rx="${tile * 0.22}" fill="${brand.primary}" />
    <g transform="translate(${tile * 0.14} ${tile * 0.14}) scale(0.72)">
      <path d="${markPath}" fill="${brand.primaryInk}" />
    </g>
  </g>
  <text
    x="${padX + tile + 20}"
    y="${height / 2 + 14}"
    font-family="Inter, Helvetica, Arial, sans-serif"
    font-size="46"
    font-weight="700"
    letter-spacing="-1"
    fill="${brand.text}"
  >AIVO</text>
</svg>
`;
}

/** The 1200x630 social share card. */
function ogImageSvg(): string {
  const width = 1200;
  const height = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="${brand.primary}" stop-opacity="0.22" />
      <stop offset="70%" stop-color="${brand.primary}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${brand.primary}" />
      <stop offset="100%" stop-color="${brand.primaryLight}" />
    </linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M56 0H0V56" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1" />
    </pattern>
  </defs>

  <rect width="${width}" height="${height}" fill="${brand.ink}" />
  <rect width="${width}" height="${height}" fill="url(#grid)" />
  <rect width="${width}" height="${height}" fill="url(#glow)" />

  <g transform="translate(96 92)">
    <rect width="56" height="56" rx="14" fill="${brand.primary}" />
    <g transform="translate(8 8) scale(0.625)">
      <path d="${markPath}" fill="${brand.primaryInk}" />
    </g>
    <text x="74" y="42" font-family="Inter, Helvetica, Arial, sans-serif" font-size="36" font-weight="700" fill="${brand.text}">AIVO</text>
  </g>

  <text x="96" y="300" font-family="Inter, Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="${brand.text}">Your AI Coach for a</text>
  <text x="96" y="382" font-family="Inter, Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="url(#accent)">Healthier, Stronger You.</text>

  <text x="96" y="452" font-family="Inter, Helvetica, Arial, sans-serif" font-size="26" fill="${brand.textSecondary}">Personalized workouts, smarter nutrition, and AI-powered insights.</text>

  <g transform="translate(96 500)">
    <rect width="176" height="56" rx="28" fill="${brand.primary}" />
    <text x="88" y="36" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="20" font-weight="600" fill="${brand.primaryInk}">Start Free</text>
  </g>
</svg>
`;
}

async function generateWeb(): Promise<void> {
  console.log("apps/web");
  await write(join(webApp, "app", "icon.svg"), iconSvg());
  await write(join(webPublic, "og-image.svg"), ogImageSvg());
  await write(join(webPublic, "logo.svg"), lockupSvg({ width: 190, height: 56 }));
}

async function generateMobile(): Promise<void> {
  console.log("apps/mobile");

  // App icon, iOS and web favicon.
  await write(join(mobileImages, "icon.png"), await png(tileSvg(1024), 1024));
  await write(join(mobileImages, "favicon.png"), await png(tileSvg(48), 48));

  // Android adaptive icon layers.
  await write(
    join(mobileImages, "android-icon-foreground.png"),
    await png(adaptiveForegroundSvg(512), 512),
  );
  await write(
    join(mobileImages, "android-icon-monochrome.png"),
    await png(monochromeSvg(432), 432),
  );
  await write(
    join(mobileImages, "android-icon-background.png"),
    await png(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" width="512" height="512">
        <rect width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}" fill="${brand.ink}" />
      </svg>`,
      512,
    ),
  );

  // Splash and hero glyph.
  await write(
    join(mobileImages, "splash-icon.png"),
    await png(glyphSvg(228, brand.primary), 228),
  );
  await write(join(mobileImages, "logo-glow.png"), await png(glowSvg(604), 604));

  // Image-density variants of the AIVO mark.
  for (const [file, size] of [
    ["aivo-mark.png", 100],
    ["aivo-mark-2x.png", 200],
    ["aivo-mark-3x.png", 300],
  ] as const) {
    await write(join(mobileImages, file), await png(glyphSvg(size, brand.primary), size));
  }

  // Wordmark badges.
  for (const [file, wordmarkColor] of [
    ["aivo-badge.png", brand.ink],
    ["aivo-badge-white.png", brand.text],
  ] as const) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 371 72" width="371" height="72">
      <rect width="371" height="72" rx="14" fill="${brand.primary}" />
      <g transform="translate(16 8) scale(0.875)">
        <path d="${markPath}" fill="${brand.primaryInk}" />
      </g>
      <text x="84" y="45" font-family="Inter, Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="${wordmarkColor}">AIVO</text>
      <text x="152" y="45" font-family="Inter, Helvetica, Arial, sans-serif" font-size="22" font-weight="500" fill="${wordmarkColor}" opacity="0.75">Coach</text>
    </svg>`;
    await write(join(mobileImages, file), await pngSized(svg, 371, 72));
  }
}

async function generateApi(): Promise<void> {
  console.log("apps/api");
  await write(join(apiPublic, "logo.svg"), lockupSvg({ width: 190, height: 56 }));
  await write(join(apiPublic, "favicon.svg"), iconSvg());
  await write(join(apiPublic, "banner.svg"), bannerSvg(960, 320));
}

async function generateIosIcon(): Promise<void> {
  console.log("apps/mobile (ios icon)");
  const assets = join(mobileAssets, "expo.icon", "Assets");
  await write(
    join(assets, "aivo-mark.svg"),
    `<svg width="1024" height="1024" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="${markPath}" fill="white"/>
</svg>
`,
  );
  await write(
    join(mobileAssets, "expo.icon", "icon.json"),
    `${JSON.stringify(
      {
        fill: {
          "automatic-gradient": "extended-srgb:0.03529,0.03529,0.04314,1.00000",
        },
        groups: [
          {
            layers: [
              {
                "image-name": "aivo-mark.svg",
                name: "aivo-mark",
                position: {
                  scale: 0.34,
                  "translation-in-points": [0, 0],
                },
              },
            ],
            shadow: {
              kind: "neutral",
              opacity: 0.5,
            },
            translucency: {
              enabled: true,
              value: 0.5,
            },
          },
        ],
        "supported-platforms": {
          circles: ["watchOS"],
          squares: "shared",
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function main(): Promise<void> {
  await generateWeb();
  await generateMobile();
  await generateIosIcon();
  await generateApi();
  console.log("\nDone.");
}

await main();