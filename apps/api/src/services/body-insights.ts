// Import removed to avoid type conflicts - using any for R2Bucket
import { FitnessCalculator } from "@aivo/compute";

export interface BodyMetricResponse {
  id: string;
  userId: string;
  timestamp: number;
  weight?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  boneMass?: number;
  waterPercentage?: number;
  bmi?: number;
  waistCircumference?: number;
  chestCircumference?: number;
  hipCircumference?: number;
  notes?: string;
  source?: "ai" | "manual";
  visionAnalysisId?: string;
}

export interface PostureAssessment {
  alignmentScore: number;
  issues: string[];
  confidence: number;
}

export interface SymmetryAssessment {
  leftRightBalance: number;
  imbalances: string[];
}

export interface MuscleDevelopment {
  muscle: string;
  score: number;
  zone: string;
}

export interface VisionAnalysisResponse {
  id: string;
  userId: string;
  imageUrl: string;
  processedUrl?: string;
  analysis: {
    posture?: PostureAssessment;
    symmetry?: SymmetryAssessment;
    muscleDevelopment: MuscleDevelopment[];
    bodyComposition?: {
      bodyFatEstimate: number;
      muscleMassEstimate: number;
    };
  };
  confidence: number;
  createdAt: number;
}

export interface HealthScoreResponse {
  score: number;
  category: "poor" | "fair" | "good" | "excellent";
  factors: {
    bmi: number;
    bodyFat: number;
    muscleMass: number;
    fitnessLevel: number;
  };
  recommendations: string[];
}

export const CACHE_TTL = {
  METRICS: 300,
  HEATMAPS: 300,
  HEALTH_SCORE: 600,
};

export const getCacheKey = (userId: string, type: string, params?: string): string => {
  return `body:${userId}:${type}${params ? `:${params}` : ""}`;
};

export async function getCachedData<T>(
  kv: KVNamespace,
  key: string
): Promise<{ data: T | null; hit: boolean }> {
  try {
    const cached = await kv.get<T>(key, { type: "json" });
    if (cached) {
      return { data: cached, hit: true };
    }
  } catch (error) {
    console.error("Cache get error:", error);
  }
  return { data: null, hit: false };
}

export async function setCachedData(
  kv: KVNamespace,
  key: string,
  data: unknown,
  ttl: number
): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function invalidateBodyCache(kv: KVNamespace, userId: string): Promise<void> {
  try {
    // In production, use a more sophisticated cache invalidation strategy
    // For now, we'll rely on TTL
    console.log(`Cache invalidation requested for user ${userId}`);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

export function validateImage(buffer: Buffer): { valid: boolean; error?: string } {
  // Basic image validation
  if (buffer.length < 100) {
    return { valid: false, error: "Image file too small" };
  }
  // Check magic bytes for common image formats
  const bytes = new Uint8Array(buffer.slice(0, 4));
  const jpegMagic = [0xff, 0xd8, 0xff];
  const pngMagic = [0x89, 0x50, 0x4e, 0x47];

  const isJPEG = bytes.slice(0, 3).every((b, i) => b === jpegMagic[i]);
  const isPNG = bytes.every((b, i) => b === pngMagic[i]);

  if (!isJPEG && !isPNG) {
    return { valid: false, error: "Only JPEG and PNG images are supported" };
  }

  return { valid: true };
}

export async function uploadImage(
  bucket: any,
  options: {
    userId: string;
    image: Buffer;
    filename: string;
    contentType: string;
    metadata: Record<string, string>;
  }
): Promise<{ url: string; key: string }> {
  const key = `body-images/${options.userId}/${Date.now()}-${options.filename}`;

  await bucket.put(key, options.image, {
    httpMetadata: {
      contentType: options.contentType,
      cacheControl: "public, max-age=31536000", // 1 year
    },
    customMetadata: options.metadata,
  });

  const url = `https://${(bucket as any).name || "bucket"}.r2.cloudflarestorage.com/${key}`;

  return { url, key };
}

export async function analyzeImageWithAI(
  apiKey: string,
  imageUrl: string,
  _options: { analyzeMuscles?: boolean; analyzePosture?: boolean }
): Promise<{
  analysis: VisionAnalysisResponse["analysis"];
  confidence: number;
  processedUrl?: string;
}> {
  const systemPrompt = `You are a fitness and body composition AI analyzer.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No analysis returned from AI");
  }

  try {
    const parsed = JSON.parse(content) as VisionAnalysisResponse["analysis"];
    return {
      analysis: parsed,
      confidence: 0.85,
    };
  } catch {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid analysis response from AI");
  }
}

export function generateHeatmapSVG(
  vectorData: Array<{ x: number; y: number; muscle: string; intensity: number }>
): string {
  const viewBox = "0 0 200 400";
  const colorScale = (intensity: number): string => {
    if (intensity < 0.2) { return "#3b82f6"; }
    if (intensity < 0.4) { return "#06b6d4"; }
    if (intensity < 0.6) { return "#22c55e"; }
    if (intensity < 0.8) { return "#eab308"; }
    return "#f97316";
  };

  const circles = vectorData
    .map((point) => {
      const cx = point.x;
      const cy = point.y;
      const radius = 8 + point.intensity * 6;
      const color = colorScale(point.intensity);
      const opacity = 0.4 + point.intensity * 0.5;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${radius}" ry="${radius * 1.2}" fill="${color}" fill-opacity="${opacity}" />`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">
  ${circles}
</svg>`;
}
