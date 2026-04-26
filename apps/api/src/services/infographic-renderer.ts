/**
 * Infographic Renderer Service
 *
 * Uses WASM infographic-generator package to render SVG/PNG.
 * Handles WASM initialization and provides async rendering interface.
 */

import init, {
  render_svg,
  render_png,
  build_template
} from "@aivo/infographic-generator";
import type {
  InfographicData,
  InfographicConfig,
  InfographicRenderResult,
  InfographicTemplate,
} from "@aivo/shared-types";

// We'll fetch the WASM file directly from the assets directory at runtime
// The WASM file will be uploaded as a static asset
const WASM_PATH = "/infographic_generator_bg.wasm";

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize WASM module (called once on first use)
 */
async function ensureWasmInitialized(): Promise<void> {
  if (!wasmInitialized) {
    // Create a shared promise to prevent multiple simultaneous initializations
    if (!wasmInitPromise) {
      wasmInitPromise = (async () => {
        try {
          // Fetch the WASM file from assets
          const response = await fetch(WASM_PATH);
          if (!response.ok) {
            throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
          }
          const wasmBytes = await response.arrayBuffer();
          await init(wasmBytes);
          wasmInitialized = true;
        } catch (error) {
          console.error("WASM initialization failed:", error);
          throw error;
        }
      })();
    }
    await wasmInitPromise;
  }
}

/**
 * Merge user config with defaults
 */
function mergeConfig(
  template: InfographicTemplate,
  userConfig?: Partial<InfographicConfig>
): InfographicConfig {
  const defaultCfg: InfographicConfig = {
    template,
    theme: "vibrant",
    layout: "square",
    colorScheme: {
      primary: "#6366f1",
      secondary: "#818cf8",
      accent: "#f97316",
      background: "#ffffff",
      text: "#1f2937",
      textMuted: "#6b7280",
    },
    typography: {
      headlineFont: "Arial, sans-serif",
      bodyFont: "Arial, sans-serif",
      headlineSize: 64,
      subheadSize: 36,
      bodySize: 24,
    },
    includeStats: [],
    includeComparison: true,
  };

  return userConfig ? { ...defaultCfg, ...userConfig, template } : defaultCfg;
}

/**
 * Render complete infographic as SVG string
 *
 * @param data - Complete infographic data including story and stats
 * @returns SVG string
 */
export async function renderInfographicSVG(data: InfographicData): Promise<string> {
  await ensureWasmInitialized();

  // Build template based on config
  const template = buildTemplateForConfig(data.template, data.config);

  // Convert data to JSON for WASM
  const dataJson = JSON.stringify(data);

  // Call WASM render function
  const resultJson = render_svg(JSON.stringify(template), dataJson);
  const result = JSON.parse(resultJson);

  if (!result.success || !result.svg) {
    throw new Error(result.error || "SVG rendering failed");
  }

  return result.svg;
}

/**
 * Render infographic as PNG buffer
 *
 * @param svg - SVG string to render
 * @param scale - Resolution multiplier (default 2.0 for retina)
 * @returns PNG buffer as Uint8Array
 */
export async function renderInfographicPNG(
  svg: string,
  scale?: number
): Promise<Uint8Array> {
  await ensureWasmInitialized();

  const scaleFactor = scale || 2.0;
  const pngBase64 = render_png(svg, scaleFactor);

  // Decode base64 to bytes
  const pngBuffer = base64Decode(pngBase64);

  return pngBuffer;
}

/**
 * Full rendering pipeline: SVG → PNG → R2 upload
 *
 * @param data - Complete infographic data
 * @param options - Rendering options
 * @returns Render result with PNG URL
 */
export async function renderAndUploadInfographic(
  data: InfographicData,
  options: {
    scale?: number;
    uploadToR2?: boolean;
    r2Bucket?: R2Bucket;
  } = {}
): Promise<InfographicRenderResult> {
  const startTime = Date.now();

  // Render SVG
  const svg = await renderInfographicSVG(data);

  // Optionally store raw SVG for debugging
  if (options.uploadToR2 && options.r2Bucket) {
    // Upload SVG to R2 for debugging (optional)
    const svgKey = `infographics/${data.userId}/svg/${data.id}.svg`;
    try {
      await options.r2Bucket.put(svgKey, svg, {
        httpMetadata: { contentType: "image/svg+xml" },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to upload SVG to R2:", error);
    }
  }

  // Render PNG
  const pngBuffer = await renderInfographicPNG(svg, options.scale || 2.0);

  const renderTime = Date.now() - startTime;

  // Upload PNG to R2 if requested
  let pngUrl: string | undefined;
  if (options.uploadToR2 && options.r2Bucket) {
    const pngKey = `infographics/${data.userId}/png/${data.id}.png`;
    try {
      await options.r2Bucket.put(pngKey, pngBuffer, {
        httpMetadata: { contentType: "image/png" },
      });
      pngUrl = `https://bucket.r2.dev/${pngKey}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to upload PNG to R2:", error);
    }
  }

  return {
    svg,
    pngBuffer,
    pngUrl,
    renderTimeMs: renderTime,
    width: data.width,
    height: data.height,
  };
}

/**
 * Build SVG template from config
 */
function buildTemplateForConfig(
  templateType: InfographicTemplate,
  config: InfographicConfig
): Record<string, unknown> {
  // For now, we'll use the WASM build_template function
  // In future, we could have more customization
  const width = config.layout === "landscape" ? 1920 : 1080;
  const height = config.layout === "portrait" ? 1920 : 1080;

  const templateJson = build_template(
    templateTypeToString(templateType),
    width,
    height,
    config.theme
  );

  if (!templateJson) {
    throw new Error(`Failed to build template: ${templateType}`);
  }

  return JSON.parse(templateJson);
}

/**
 * Convert template enum to string
 */
function templateTypeToString(template: InfographicTemplate): string {
  switch (template) {
    case "weekly_summary":
      return "weekly_summary";
    case "milestone":
      return "milestone";
    case "streak":
      return "streak";
    case "muscle_heatmap":
      return "muscle_heatmap";
    case "comparison":
      return "comparison";
    default:
      return "weekly_summary";
  }
}

/**
 * Decode base64 string to Uint8Array
 */
function base64Decode(base64: string): Uint8Array {
  // atob is available in Cloudflare Workers
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Export for testing
export {
  ensureWasmInitialized,
  mergeConfig,
  buildTemplateForConfig,
  base64Decode,
};
