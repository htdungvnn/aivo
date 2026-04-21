/**
 * API service for body metrics and insights
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

export interface BodyMetric {
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
}

export interface VisionAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  processedUrl?: string;
  analysis: {
    posture?: {
      score: number;
      issues: Array<{ type: string; severity: string }>;
    };
    symmetry?: any;
    muscleDevelopment: Array<{ muscle: string; score: number; zone?: string }>;
    bodyComposition?: {
      bodyFatEstimate: number;
      muscleMassEstimate: number;
    };
  };
  confidence: number;
  createdAt: number;
}

export interface HealthScore {
  score: number;
  category: "poor" | "fair" | "good" | "excellent";
  factors: Record<string, any>;
  recommendations: string[];
}

export interface HeatmapData {
  id: string;
  userId: string;
  timestamp: number;
  imageUrl?: string;
  vectorData: Array<{ x: number; y: number; muscle: string; intensity: number }>;
  metadata: Record<string, any>;
}

/**
 * Get authentication token
 */
function getToken(): string | null {
  return AsyncStorage.getItem("aivo_token");
}

/**
 * Fetch body metrics history
 */
export async function fetchBodyMetrics(limit: number = 30): Promise<BodyMetric[]> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await AsyncStorage.getItem("aivo_user_id");
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/body/metrics?userId=${userId}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch metrics");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Create manual body metric entry
 */
export async function createBodyMetric(metric: Partial<BodyMetric>): Promise<BodyMetric> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await AsyncStorage.getItem("aivo_user_id");
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/body/metrics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
    },
    body: JSON.stringify({
      ...metric,
      userId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create metric");
  }

  return response.json();
}

/**
 * Fetch heatmap data
 */
export async function fetchHeatmaps(limit: number = 10): Promise<HeatmapData[]> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await AsyncStorage.getItem("aivo_user_id");
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/body/heatmaps?userId=${userId}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch heatmaps");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Upload body image to R2
 */
export async function uploadBodyImage(imageUri: string, fileName: string): Promise<{ imageUrl: string; key: string }> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await AsyncStorage.getItem("aivo_user_id");
  if (!userId) {
    throw new Error("User ID not found");
  }

  // Read file as blob
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: blob.type,
    name: fileName,
  } as any);

  const uploadResponse = await fetch(`${API_URL}/api/body/upload`, {
    method: "POST",
    headers: {
      "X-User-Id": userId,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error || "Upload failed");
  }

  return uploadResponse.json();
}

/**
 * Trigger AI vision analysis
 */
export async function analyzeImage(imageUrl: string): Promise<VisionAnalysis> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await AsyncStorage.getItem("aivo_user_id");
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/body/vision/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
    },
    body: JSON.stringify({
      imageUrl,
      analyzeMuscles: true,
      analyzePosture: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Analysis failed");
  }

  return response.json();
}

/**
 * Fetch health score
 */
export async function fetchHealthScore(): Promise<HealthScore> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await AsyncStorage.getItem("aivo_user_id");
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/body/health-score`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch health score");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Convert Unix timestamp to date string for charts
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Transform metrics for chart consumption
 */
export function transformMetricData(metrics: BodyMetric[], metricKey: keyof BodyMetric): Array<{ date: string; value: number }> {
  return metrics
    .filter((m) => m[metricKey] !== undefined && m[metricKey] !== null)
    .map((m) => ({
      date: formatTimestamp(m.timestamp),
      value: (m[metricKey] as number) * (metricKey === "bodyFatPercentage" ? 100 : 1),
    }))
    .reverse();
}
