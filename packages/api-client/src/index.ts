import type { ApiResponse, User, AuthResponse, BodyMetric, HealthScoreResult, Workout, VisionAnalysis, BodyHeatmapData, Conversation, BodyZone, HeatmapRegion, VisionAnalysisResult, StoredHeatmap, BodyPhotoRecord, HeatmapComparison, SleepLog, BiometricSnapshot, CorrelationFinding, RecoveryScoreResult, FoodItem, DetectedFoodItem, FoodVisionAnalysis, FoodLog, DailyNutritionSummary, MacroTargets, UploadImageResponse, VisionAnalysisRequest, CreateFromAnalysisRequest, FoodLogCreate, FoodLogUpdate, SensorDataSnapshot, SleepLogCreate, BiometricReading } from "@aivo/shared-types";

// Re-export types for convenient consumption by mobile/web apps
export type { ApiResponse, User, AuthResponse, BodyMetric, HealthScoreResult, Workout, VisionAnalysis, BodyHeatmapData, Conversation, BodyZone, HeatmapRegion, VisionAnalysisResult, StoredHeatmap, BodyPhotoRecord, HeatmapComparison, SleepLog, BiometricSnapshot, CorrelationFinding, RecoveryScoreResult, FoodItem, DetectedFoodItem, FoodVisionAnalysis, FoodLog, DailyNutritionSummary, MacroTargets, UploadImageResponse, VisionAnalysisRequest, CreateFromAnalysisRequest, FoodLogCreate, FoodLogUpdate, SensorDataSnapshot, SleepLogCreate, BiometricReading };

/**
 * Export format types
 */
export type ExportFormat = "xlsx" | "csv" | "json";

/**
 * Export options for filtering data
 */
export interface ExportOptions {
  format: ExportFormat;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

/**
 * Export result containing file data
 */
export interface ExportResult {
  filename: string;
  contentType: string;
  data: ArrayBuffer;
  size: number;
}

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

    // If endpoint is already an absolute URL, don't prepend baseUrl
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
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

  /**
   * Get the current user ID from the provider
   */
  async getUserId(): Promise<string | null> {
    if (this.userIdProvider) {
      try {
        return await this.userIdProvider();
      } catch {
        return null;
      }
    }
    return null;
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

  /**
   * Upload batch sensor readings from wearable devices
   * POST /api/biometric/readings/batch
   */
  async uploadSensorReadings(readings: BiometricReading[]): Promise<ApiResponse<{ received: number }>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/biometric/readings/batch`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(readings),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to upload sensor readings", response.status);
    }

    return response.json() as Promise<ApiResponse<{ received: number }>>;
  }

  /**
   * Upload sleep log data
   * POST /api/biometric/sleep
   */
  async uploadSleepData(sleepData: SleepLogCreate): Promise<ApiResponse<SleepLog>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/biometric/sleep`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(sleepData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to upload sleep data", response.status);
    }

    return response.json() as Promise<ApiResponse<SleepLog>>;
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
      credentials: "include",
      body: JSON.stringify({ analysisId, vectorData }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to generate heatmap", response.status);
    }

    return response.json() as Promise<ApiResponse<BodyHeatmapData>>;
  }

  async uploadBodyImage(file: { uri: string; type: string; name: string }): Promise<ApiResponse<{ imageUrl: string; key: string }>> {
    const formData = new FormData();
    // @ts-ignore - React Native FormData file handling
    formData.append("image", {
      uri: file.uri,
      type: file.type,
      name: file.name,
    });

    const headers = await this.getAuthHeaders();

    // Don't set Content-Type for FormData - browser/RN will set boundary automatically
    delete headers["Content-Type"];

    const response = await fetch(`${this.baseUrl}/body/upload`, {
      method: "POST",
      headers,
      credentials: "include",
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
      credentials: "include",
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

  // ==================== Body Photos & Heatmap APIs ====================

  /**
   * Upload a body photo for analysis
   * Works with both web (Blob/File) and React Native (with uri, type, name)
   */
  async uploadBodyPhoto(file: Blob | File | { uri: string; type: string; name: string }): Promise<ApiResponse<{ photo: BodyPhotoRecord }>> {
    const formData = new FormData();

    // React Native file format
    if (typeof file === 'object' && 'uri' in file) {
      // @ts-ignore - React Native FormData file handling
      formData.append('photo', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });
    } else {
      // Web Blob/File format
      formData.append('photo', file);
    }

    const headers = await this.getAuthHeaders();

    // Don't set Content-Type for FormData - browser/RN will set boundary automatically
    delete headers["Content-Type"];

    const response = await fetch(`${this.baseUrl}/body-photos/upload`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Upload failed", response.status);
    }

    return response.json() as Promise<ApiResponse<{ photo: BodyPhotoRecord }>>;
  }

  /**
   * Trigger AI analysis of an uploaded photo
   */
  async analyzeBodyPhoto(photoId: string): Promise<ApiResponse<{ heatmap: StoredHeatmap; analysis: VisionAnalysisResult }>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/body-photos/${encodeURIComponent(photoId)}/analyze`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Analysis failed", response.status);
    }

    return response.json() as Promise<ApiResponse<{ heatmap: StoredHeatmap; analysis: VisionAnalysisResult }>>;
  }

  /**
   * Get the current (latest) heatmap for the user
   */
  async getCurrentHeatmap(): Promise<ApiResponse<{ heatmap: StoredHeatmap | null; photo: BodyPhotoRecord | null }>> {
    return this.request("/body-heatmap/current");
  }

  /**
   * Get heatmap history with pagination
   */
  async getHeatmapHistory(params?: { limit?: number; offset?: number }): Promise<ApiResponse<Array<{ heatmap: StoredHeatmap; photo: BodyPhotoRecord }>>> {
    const url = new URL("/body-heatmap/history", this.baseUrl);
    if (params?.limit) url.searchParams.append("limit", params.limit.toString());
    if (params?.offset) url.searchParams.append("offset", params.offset.toString());
    return this.request(url.toString());
  }

  /**
   * Get a specific heatmap by ID
   */
  async getHeatmap(id: string): Promise<ApiResponse<{ heatmap: StoredHeatmap; photo: BodyPhotoRecord }>> {
    return this.request(`/body-heatmap/${encodeURIComponent(id)}`);
  }

  /**
   * Compare two heatmaps (or current vs previous if only one ID provided)
   */
  async compareHeatmaps(id1: string, id2?: string): Promise<ApiResponse<HeatmapComparison>> {
    const url = new URL("/body-heatmap/compare", this.baseUrl);
    url.searchParams.append("id1", id1);
    if (id2) url.searchParams.append("id2", id2);
    return this.request(url.toString());
  }

  /**
   * Delete a body photo and its associated heatmap
   */
  async deleteBodyPhoto(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/body-photos/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ==================== AI APIs ====================

  async sendChatMessage(message: string, context?: string[]): Promise<ApiResponse<{ message: string; tokensUsed: number; timestamp: string }>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/ai/chat`, {
      method: "POST",
      headers,
      credentials: "include",
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

  // ==================== Export APIs ====================

  /**
   * Export user data in specified format
   *
   * @param options - Export options including format and optional date range
   * @returns Export result with file data
   *
   * @example
   * ```ts
   * const result = await client.exportData({ format: "xlsx" });
   * // Download file
   * const blob = new Blob([result.data], { type: result.contentType });
   * const url = URL.createObjectURL(blob);
   * const a = document.createElement("a");
   * a.href = url;
   * a.download = result.filename;
   * a.click();
   * ```
   */
  async exportData(
    options: ExportOptions
  ): Promise<ApiResponse<ExportResult>> {
    const url = new URL("/export", this.baseUrl);
    url.searchParams.append("format", options.format);
    if (options.startDate) url.searchParams.append("startDate", options.startDate);
    if (options.endDate) url.searchParams.append("endDate", options.endDate);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(
        error.error || error.message || "Export failed",
        response.status
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] || `aivo-export-${Date.now()}.${options.format}`;

    const buffer = await response.arrayBuffer();

    return {
      success: true,
      data: {
        filename,
        contentType,
        data: buffer,
        size: buffer.byteLength,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get export template file
   *
   * @param format - Template format (xlsx, csv, pdf)
   * @returns Template file data
   */
  async getTemplate(format: ExportFormat): Promise<ApiResponse<ExportResult>> {
    const url = new URL("/export/template", this.baseUrl);
    url.searchParams.append("format", format);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(
        error.error || error.message || "Template fetch failed",
        response.status
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] || `aivo-template-${format}-${Date.now()}.${format}`;

    const buffer = await response.arrayBuffer();

    return {
      success: true,
      data: {
        filename,
        contentType,
        data: buffer,
        size: buffer.byteLength,
      },
      timestamp: new Date(),
    };
  }

  // ==================== Biometric APIs ====================

  /**
   * Create or update a sleep log
   */
  async createSleepLog(sleepLog: Partial<SleepLog>): Promise<ApiResponse<{ date: string; userId: string }>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/biometric/sleep`, {
      method: "POST",
      headers,
      body: JSON.stringify(sleepLog),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to create sleep log", response.status);
    }

    return response.json() as Promise<ApiResponse<{ date: string; userId: string }>>;
  }

  /**
   * Get sleep logs history
   */
  async getSleepHistory(params?: { limit?: number }): Promise<ApiResponse<SleepLog[]>> {
    const url = new URL("/biometric/sleep/history", this.baseUrl);
    if (params?.limit) url.searchParams.append("limit", params.limit.toString());
    return this.request(url.toString());
  }

  /**
   * Get sleep summary for a period
   */
  async getSleepSummary(period: "7d" | "30d" | "90d" = "30d"): Promise<ApiResponse<{ period: string; averageDuration: number; averageQuality: number; consistency: number; totalDays: number }>> {
    const url = new URL(`/biometric/sleep/summary?period=${period}`, this.baseUrl);
    return this.request(url.toString());
  }

  /**
   * Generate a biometric snapshot (correlation analysis)
   */
  async generateBiometricSnapshot(params?: { period?: "7d" | "30d" }): Promise<ApiResponse<{ snapshotId: string; period: string; recovery_score: number; findings?: CorrelationFinding[] }>> {
    const body = params?.period ? { period: params.period } : {};
    const response = await fetch(`${this.baseUrl}/biometric/snapshot/generate`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to generate snapshot", response.status);
    }

    return response.json() as Promise<ApiResponse<{ snapshotId: string; period: string; recovery_score: number; findings?: CorrelationFinding[] }>>;
  }

  /**
   * Get the latest biometric snapshot for a period
   */
  async getBiometricSnapshot(period: "7d" | "30d"): Promise<ApiResponse<BiometricSnapshot>> {
    return this.request(`/biometric/snapshot/${period}`);
  }

  /**
   * Get correlation findings
   */
  async getCorrelations(): Promise<ApiResponse<CorrelationFinding[]>> {
    return this.request("/biometric/correlations");
  }

  /**
   * Dismiss a correlation finding
   */
  async dismissCorrelation(findingId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await fetch(`${this.baseUrl}/biometric/correlations/${encodeURIComponent(findingId)}/dismiss`, {
      method: "PATCH",
      headers: await this.getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to dismiss correlation", response.status);
    }

    return response.json() as Promise<ApiResponse<{ success: boolean }>>;
  }

  /**
   * Get current recovery score
   */
  async getRecoveryScore(period?: "7d" | "30d"): Promise<ApiResponse<RecoveryScoreResult>> {
    const url = new URL("/biometric/recovery-score", this.baseUrl);
    if (period) url.searchParams.append("period", period);
    return this.request(url.toString());
  }

  // ==================== Nutrition APIs ====================

  /**
   * Upload a food image to R2 storage
   * Works with both web (Blob/File) and React Native (with uri, type, name)
   */
  async uploadFoodImage(file: Blob | File | { uri: string; type: string; name: string }): Promise<ApiResponse<UploadImageResponse["data"]>> {
    const formData = new FormData();

    // React Native file format
    if (typeof file === 'object' && 'uri' in file) {
      // @ts-ignore - React Native FormData file handling
      formData.append('image', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });
    } else {
      // Web Blob/File format
      formData.append('image', file);
    }

    const headers = await this.getAuthHeaders();

    // Don't set Content-Type for FormData - browser/RN will set boundary automatically
    delete headers["Content-Type"];

    const response = await fetch(`${this.baseUrl}/nutrition/upload`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Upload failed", response.status);
    }

    return response.json() as Promise<ApiResponse<UploadImageResponse["data"]>>;
  }

  /**
   * Analyze a food image with AI vision
   */
  async analyzeFoodImage(imageUrl: string, mealType?: VisionAnalysisRequest["mealType"]): Promise<ApiResponse<FoodVisionAnalysis>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/nutrition/vision/analyze`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ imageUrl, mealType } as VisionAnalysisRequest),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Analysis failed", response.status);
    }

    return response.json() as Promise<ApiResponse<FoodVisionAnalysis>>;
  }

  /**
   * Create food log entries from AI analysis results
   */
  async createFoodLogFromAnalysis(data: CreateFromAnalysisRequest): Promise<ApiResponse<FoodLog>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/nutrition/logs/from-analysis`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to create food log", response.status);
    }

    return response.json() as Promise<ApiResponse<FoodLog>>;
  }

  /**
   * Create a manual food log entry
   */
  async createFoodLog(data: FoodLogCreate): Promise<ApiResponse<FoodLog>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/nutrition/logs`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to create food log", response.status);
    }

    return response.json() as Promise<ApiResponse<FoodLog>>;
  }

  /**
   * Get food logs for a specific date
   */
  async getFoodLogs(date: string): Promise<ApiResponse<FoodLog[]>> {
    const url = new URL(`/nutrition/logs?date=${encodeURIComponent(date)}`, this.baseUrl);
    return this.request(url.toString());
  }

  /**
   * Get food logs for a date range
   */
  async getFoodLogsRange(startDate: string, endDate: string): Promise<ApiResponse<FoodLog[]>> {
    const url = new URL(`/nutrition/logs/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, this.baseUrl);
    return this.request(url.toString());
  }

  /**
   * Update a food log entry
   */
  async updateFoodLog(id: string, data: FoodLogUpdate): Promise<ApiResponse<FoodLog>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/nutrition/logs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to update food log", response.status);
    }

    return response.json() as Promise<ApiResponse<FoodLog>>;
  }

  /**
   * Delete a food log entry
   */
  async deleteFoodLog(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/nutrition/logs/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  /**
   * Get daily nutrition summary
   */
  async getDailyNutritionSummary(date?: string): Promise<ApiResponse<DailyNutritionSummary>> {
    const url = new URL("/nutrition/summary/daily", this.baseUrl);
    if (date) url.searchParams.append("date", date);
    return this.request(url.toString());
  }

  /**
   * Get macro targets for user
   */
  async getMacroTargets(): Promise<ApiResponse<MacroTargets>> {
    return this.request("/nutrition/targets");
  }

  /**
   * Set/update macro targets
   */
  async setMacroTargets(data: Partial<MacroTargets>): Promise<ApiResponse<MacroTargets>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/nutrition/targets`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as any;
      throw new ApiError(error.error || error.message || "Failed to set macro targets", response.status);
    }

    return response.json() as Promise<ApiResponse<MacroTargets>>;
  }

  /**
   * Search food items by name
   */
  async searchFoodItems(query: string, limit?: number): Promise<ApiResponse<FoodItem[]>> {
    const url = new URL("/nutrition/food-items/search", this.baseUrl);
    url.searchParams.append("q", query);
    if (limit) url.searchParams.append("limit", limit.toString());
    return this.request(url.toString());
  }

  /**
   * Get a food item by ID
   */
  async getFoodItem(id: string): Promise<ApiResponse<FoodItem>> {
    return this.request(`/nutrition/food-items/${encodeURIComponent(id)}`);
  }

  // Convenience methods for simple HTTP verbs
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }
    return this.request<ApiResponse<T>>(url.toString());
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

}

/**
 * Helper function to download a file in browser environment
 * @param result - Export result from API
 */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.data], { type: result.contentType });
  const url = URL.createObjectURL(blob);

  // Create download link and trigger
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create an API client instance with default configuration
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
