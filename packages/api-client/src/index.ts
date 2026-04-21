import type { ApiResponse, User, AuthResponse, BodyMetric, HealthScoreResult, Workout, VisionAnalysis, BodyHeatmapData, Conversation } from "@aivo/shared-types";

// Re-export types for convenient consumption by mobile/web apps
export type { ApiResponse, User, AuthResponse, BodyMetric, HealthScoreResult, Workout, VisionAnalysis, BodyHeatmapData, Conversation };

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
  baseUrl: string;
  tokenProvider: () => Promise<string> | string;
  userIdProvider?: () => Promise<string> | string;
}

/**
 * Standardized API error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Platform-agnostic API client
 * Works in browser (fetch) and React Native (expo fetch)
 */
export class ApiClient {
  private baseUrl: string;
  private tokenProvider: () => Promise<string> | string;
  private userIdProvider?: () => Promise<string> | string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.tokenProvider = config.tokenProvider;
    this.userIdProvider = config.userIdProvider;
  }

  /**
   * Make an authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.tokenProvider();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(
        error.error || error.message || "Request failed",
        response.status
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Add X-User-Id header if userIdProvider is available
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = await this.tokenProvider();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (this.userIdProvider) {
      const userId = await this.userIdProvider();
      if (userId) {
        headers["X-User-Id"] = userId;
      }
    }

    return headers;
  }

  // ==================== Auth APIs ====================

  async verifyToken(): Promise<ApiResponse<User>> {
    return this.request("/api/auth/verify");
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return this.request("/api/auth/logout", { method: "POST" });
  }

  // ==================== User APIs ====================

  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request("/users");
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`);
  }

  // ==================== Workout APIs ====================

  async getWorkouts(params?: { userId?: string }): Promise<ApiResponse<Workout[]>> {
    const url = new URL("/workouts", this.baseUrl);
    if (params?.userId) url.searchParams.append("userId", params.userId);
    return this.request(url.toString());
  }

  async createWorkout(workout: Partial<Workout>): Promise<ApiResponse<Workout>> {
    return this.request("/workouts", {
      method: "POST",
      body: JSON.stringify(workout),
    });
  }

  // ==================== Body Metrics APIs ====================

  async getBodyMetrics(params?: { limit?: number; startDate?: number; endDate?: number }): Promise<ApiResponse<BodyMetric[]>> {
    const url = new URL("/body/metrics", this.baseUrl);
    if (params?.limit) url.searchParams.append("limit", params.limit.toString());
    if (params?.startDate) url.searchParams.append("startDate", params.startDate.toString());
    if (params?.endDate) url.searchParams.append("endDate", params.endDate.toString());
    return this.request(url.toString());
  }

  async createBodyMetric(metric: Partial<BodyMetric>): Promise<ApiResponse<BodyMetric>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/body/metrics`, {
      method: "POST",
      headers,
      body: JSON.stringify(metric),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to create metric", response.status);
    }

    return response.json() as Promise<ApiResponse<BodyMetric>>;
  }

  async getHealthScore(): Promise<ApiResponse<HealthScoreResult>> {
    return this.request("/body/health-score");
  }

  async getHeatmaps(params?: { limit?: number }): Promise<ApiResponse<BodyHeatmapData[]>> {
    const url = new URL("/body/heatmaps", this.baseUrl);
    if (params?.limit) url.searchParams.append("limit", params.limit.toString());
    return this.request(url.toString());
  }

  async generateHeatmap(analysisId: string, vectorData: Array<{ x: number; y: number; muscle: string; intensity: number }>): Promise<ApiResponse<BodyHeatmapData>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/body/heatmaps/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ analysisId, vectorData }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to generate heatmap", response.status);
    }

    return response.json() as Promise<ApiResponse<BodyHeatmapData>>;
  }

  async uploadBodyImage(file: { uri: string; type: string; name: string }): Promise<ApiResponse<{ imageUrl: string; key: string }>> {
    const token = await this.tokenProvider();
    const userId = this.userIdProvider ? await this.userIdProvider() : null;

    const formData = new FormData();
    // @ts-ignore - React Native FormData file handling
    formData.append("image", {
      uri: file.uri,
      type: file.type,
      name: file.name,
    });

    const headers: Record<string, string> = {
      "X-User-Id": userId || "",
    };

    // Don't set Content-Type for FormData - browser/RN will set boundary automatically

    const response = await fetch(`${this.baseUrl}/body/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Upload failed", response.status);
    }

    return response.json() as Promise<ApiResponse<{ imageUrl: string; key: string }>>;
  }

  async analyzeImage(imageUrl: string, analyzeMuscles?: boolean, analyzePosture?: boolean): Promise<ApiResponse<VisionAnalysis>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/body/vision/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        imageUrl,
        analyzeMuscles: analyzeMuscles ?? true,
        analyzePosture: analyzePosture ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Analysis failed", response.status);
    }

    return response.json() as Promise<ApiResponse<VisionAnalysis>>;
  }

  // ==================== AI APIs ====================

  async sendChatMessage(message: string, context?: string[]): Promise<ApiResponse<{ message: string; tokensUsed: number; timestamp: string }>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/ai/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: await this.userIdProvider?.(),
        message,
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Chat failed", response.status);
    }

    return response.json() as Promise<ApiResponse<{ message: string; tokensUsed: number; timestamp: string }>>;
  }

  async getChatHistory(userId: string, limit?: number): Promise<ApiResponse<Conversation[]>> {
    const url = new URL(`/ai/history/${encodeURIComponent(userId)}`, this.baseUrl);
    if (limit) url.searchParams.append("limit", limit.toString());
    return this.request(url.toString());
  }

  // ==================== Calculator APIs ====================

  async calculateBMI(weightKg: number, heightCm: number): Promise<ApiResponse<{ bmi: number; category: string }>> {
    return this.request("/calc/bmi", {
      method: "POST",
      body: JSON.stringify({ weightKg, heightCm }),
    });
  }

  async calculateCalories(params: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: "male" | "female";
    activityLevel: string;
    goal: "lose" | "maintain" | "gain";
  }): Promise<ApiResponse<{ bmr: number; tdee: number; targetCalories: number }>> {
    return this.request("/calc/calories", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async calculateOneRepMax(weightLifted: number, reps: number, method?: "brzycki" | "ephron" | "lombardi" | "mayhew" | "oconner" | "wathan"): Promise<ApiResponse<{ oneRepMax: number }>> {
    return this.request("/calc/one-rep-max", {
      method: "POST",
      body: JSON.stringify({ weightLifted, reps, method }),
    });
  }
}

/**
 * Create an API client instance with default configuration
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
