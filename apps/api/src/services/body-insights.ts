/**
 * Body Insights Service
 * Provides caching utilities, image validation, and AI analysis for body metrics
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import type { HeatmapRegion, BodyMetric } from "@aivo/shared-types";

export interface CacheResult<T> {
  data: T | null;
  hit: boolean;
}

export const CACHE_TTL = {
  METRICS: 300,
  HEATMAPS: 300,
  HEALTH_SCORE: 600,
} as const;

// Response type for body metrics (matches DB schema with timestamp)
export type BodyMetricResponse = Omit<BodyMetric, 'source'> & {
  timestamp: number;
  id: string;
  userId: string;
  source?: string | null;
};

// Response type for health score
export interface HealthScoreResponse {
  score: number;
  category: "excellent" | "good" | "fair" | "poor";
  factors: {
    bmi: number;
    bodyFat: number;
    muscleMass: number;
    fitnessLevel: number;
  };
  recommendations: string[];
}

interface BodyComposition {
  bodyFatEstimate: number;
  muscleMassEstimate: number;
}

interface AnalysisResult {
  pose: "front" | "back" | "side" | "unknown";
  regions: HeatmapRegion[];
  metrics: {
    upperBodyScore: number;
    coreScore: number;
    lowerBodyScore: number;
    overallScore: number;
  };
  bodyComposition?: BodyComposition;
}

/**
 * Generate a cache key for a given user, operation, and optional params
 */
export function getCacheKey(userId: string, operation: string, params?: string): string {
  const base = `body:${userId}:${operation}`;
  return params ? `${base}:${params}` : base;
}

/**
 * Get data from cache
 */
export async function getCachedData<T>(
  kv: { get: (key: string) => Promise<T | null> },
  key: string
): Promise<CacheResult<T>> {
  try {
    const data = await kv.get(key);
    return {
      data: data ?? null,
      hit: data !== null && data !== undefined,
    };
  } catch {
    return { data: null, hit: false };
  }
}

/**
 * Set data in cache with TTL
 */
export async function setCachedData(
  kv: { put: (key: string, value: string, options?: { expirationTtl: number }) => Promise<void> },
  key: string,
  data: unknown,
  ttl: number
): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch {
    // Don't throw - cache failures should be non-blocking
  }
}

/**
 * Invalidate cache for a user's body data
 */
export async function invalidateBodyCache(
  kv: { put: (key: string, value: string) => Promise<void> },
  userId: string
): Promise<void> {
  try {
    const version = Date.now().toString();
    await kv.put(`body:${userId}:version`, version);
  } catch {
    // Cache invalidation failures should be non-blocking
  }
}

/**
 * Upload an image to R2 storage
 */
export async function uploadImage(
  bucket: R2Bucket,
  params: {
    userId: string;
    image: Buffer;
    filename: string;
    contentType: string;
    metadata: Record<string, string>;
  }
): Promise<{ key: string }> {
  const { userId, image, filename, contentType, metadata } = params;
  const key = `body-insights/${userId}/${crypto.randomUUID()}-${filename}`;

  await bucket.put(key, image, {
    httpMetadata: {
      contentType,
    },
    customMetadata: metadata,
  });

  return { key };
}

/**
 * Analyze a body image using AI vision
 * Uses Anthropic Claude for body composition analysis
 */
export async function analyzeImageWithAI(
  apiKey: string,
  imageUrl: string,
  options?: {
    analyzeMuscles?: boolean;
    analyzePosture?: boolean;
  }
): Promise<{
  analysis: AnalysisResult;
  confidence: number;
  processedUrl?: string;
}> {
  const { Anthropic } = await import("@anthropic-ai/sdk");

  const anthropic = new Anthropic({ apiKey });

  const prompt = options?.analyzeMuscles
    ? `
Analyze this body photo for fitness assessment. Identify the following body zones and estimate their development/fat level:

ZONES: chest, back_upper, shoulders, arms, abs_upper, abs_lower, obliques, lower_back, glutes, quads, hamstrings, calves

For each zone, provide:
1. intensity: 0-100 (0 = very lean/muscular, 100 = high body fat)
2. confidence: 0-1 (your certainty)

Also detect the pose: "front", "back", "side", or "unknown".

Calculate overall scores (0-100, lower is better):
- upperBodyScore: average of chest, back_upper, shoulders, arms
- coreScore: average of abs_upper, abs_lower, obliques, lower_back
- lowerBodyScore: average of glutes, quads, hamstrings, calves
- overallScore: weighted average

Estimate body composition:
- bodyFatEstimate: estimated body fat percentage (0-1, e.g., 0.15 for 15%)
- muscleMassEstimate: estimated muscle mass as percentage of body weight (0-1, e.g., 0.30 for 30%)

Respond ONLY with valid JSON:
{
  "pose": "front|back|side|unknown",
  "regions": [
    {
      "zoneId": "chest|back_upper|...",
      "intensity": 0-100,
      "confidence": 0-1
    }
  ],
  "metrics": {
    "upperBodyScore": 0-100,
    "coreScore": 0-100,
    "lowerBodyScore": 0-100,
    "overallScore": 0-100
  },
  "bodyComposition": {
    "bodyFatEstimate": 0-1,
    "muscleMassEstimate": 0-1
  }
}
`
    : `Analyze this body photo and provide a basic assessment. Respond with JSON containing pose ("front", "back", "side", or "unknown"), overallScore (0-100), bodyFatEstimate (0-1), and muscleMassEstimate (0-1).`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const contentBlock = response.content[0];
  const content = "text" in contentBlock ? contentBlock.text : undefined;
  if (!content) {
    throw new Error("No response from AI analysis");
  }

  const analysis = JSON.parse(content) as AnalysisResult;
  const confidence = response.stop_reason === "end_turn" ? 0.9 : 0.7;

  return {
    analysis,
    confidence,
  };
}

/**
 * Generate an SVG heatmap overlay from vector data
 */
export function generateHeatmapSVG(
  vectorData: Array<{
    x: number;
    y: number;
    intensity: number;
    muscle: string;
  }>,
  options?: {
    width?: number;
    height?: number;
  }
): string {
  const width = options?.width || 400;
  const height = options?.height || 600;

  // Scale normalized coordinates (0-100) to SVG dimensions
  const scaleX = width / 100;
  const scaleY = height / 100;

  // Group points by muscle for optimized rendering
  const pointsByMuscle = new Map<string, typeof vectorData>();
  for (const point of vectorData) {
    const existing = pointsByMuscle.get(point.muscle) || [];
    pointsByMuscle.set(point.muscle, [...existing, point]);
  }

  // Generate SVG circles for each point with gradient color based on intensity
  const circles: string[] = [];
  for (const [muscle, points] of pointsByMuscle.entries()) {
    for (const point of points) {
      const x = point.x * scaleX;
      const y = point.y * scaleY;
      const radius = 15 + point.intensity * 10; // 15-25px based on intensity

      // Color: blue (low) -> green -> yellow -> red (high)
      let color: string;
      if (point.intensity < 0.3) {
        color = `rgba(59, 130, 246, ${0.4 + point.intensity * 0.6})`; // blue
      } else if (point.intensity < 0.6) {
        color = `rgba(34, 197, 94, ${0.4 + (point.intensity - 0.3) * 0.6})`; // green
      } else if (point.intensity < 0.8) {
        color = `rgba(234, 179, 8, ${0.4 + (point.intensity - 0.6) * 0.6})`; // yellow
      } else {
        color = `rgba(239, 68, 68, ${0.4 + (point.intensity - 0.8) * 0.6})`; // red
      }

      circles.push(
        `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="none" opacity="0.7" data-muscle="${muscle}" data-intensity="${point.intensity}"/>`
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#glow)">
    ${circles.join("\n    ")}
  </g>
</svg>`;
}

/**
 * Validate image file using magic bytes
 */
export function validateImage(buffer: Buffer | Uint8Array): { valid: boolean; error?: string } {
  if (buffer.length < 4) {
    return { valid: false, error: 'Image file too small' };
  }

  // Check JPEG (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true };
  }

  // Check PNG (89 50 4E 47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true };
  }

  return { valid: false, error: 'Only JPEG and PNG images are supported' };
}
