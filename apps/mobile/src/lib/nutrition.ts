/**
 * Nutrition API Client for Mobile (Expo)
 * Handles meal analysis, nutrition tracking, and meal planning
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

export interface NutritionValues {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

export interface MealAnalysisItem {
  id: string;
  name: string;
  normalizedName: string | null;
  estimatedQuantity: number;
  unit: string;
  confidence: number;
  nutrition: NutritionValues & { source: string };
  foodId: string | null;
  source: string;
  userOverride: Partial<NutritionValues> | null;
  warnings: string[];
}

export interface MealAnalysis {
  analysisId: string;
  status: 'pending_upload' | 'queued' | 'processing' | 'needs_review' | 'completed' | 'failed' | 'cancelled';
  mealName: string | null;
  mealType: string | null;
  overallConfidence: number | null;
  foods: MealAnalysisItem[];
  needsUserReview: boolean;
  warnings: string[];
  completedAt: number | null;
  errorMessage: string | null;
}

export interface Meal {
  id: string;
  userId: string;
  date: string;
  timezone: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  imageR2Key: string | null;
  totalNutrition: NutritionValues;
  items: any[];
  createdAt: number;
}

export interface NutritionTargets {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  hydrationMl: number | null;
  weightKg: number | null;
}

export interface MacroTargets {
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
}

export interface ChartData {
  metric: string;
  range: string;
  unit: string;
  target: number | null;
  points: ChartDataPoint[];
  summary: {
    average: number;
    minimum: number;
    maximum: number;
    changePercent: number | null;
  };
}

export interface Food {
  id: string;
  normalizedName: string;
  displayName: string;
  category: string | null;
  servingSizeDefault: number;
  servingUnitDefault: string;
  nutritionPer100g: NutritionValues & { source: string };
}

const TOKEN_KEY = 'auth_access_token';
const BASE_URL = process.env.EXPO_PUBLIC_NUTRITION_API_URL || 'https://api.aivo.app/nutrition/v1';

export class NutritionApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'NutritionApiError';
  }
}

export class NutritionApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get auth token from storage
   */
  private async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  
  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    
    if (!token) {
      throw new NutritionApiError('Not authenticated', 'UNAUTHORIZED', 401);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };
      throw new NutritionApiError(error.message, error.code, response.status);
    }
    
    return data.data;
  }
  
  // ===========================================================================
  // IMAGE PROCESSING
  // ===========================================================================
  
  /**
   * Pick image from gallery
   */
  static async pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      throw new NutritionApiError('Gallery permission denied', 'PERMISSION_DENIED', 403);
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });
    
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    
    return result.assets[0];
  }
  
  /**
   * Take photo with camera
   */
  static async takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permission.granted) {
      throw new NutritionApiError('Camera permission denied', 'PERMISSION_DENIED', 403);
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });
    
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    
    return result.assets[0];
  }
  
  /**
   * Process and compress image
   */
  static async processImage(
    asset: ImagePicker.ImagePickerAsset,
    options: {
      maxDimension?: number;
      quality?: number;
    } = {}
  ): Promise<{
    uri: string;
    width: number;
    height: number;
    hash: string;
  }> {
    const maxDimension = options.maxDimension || 1280;
    const quality = options.quality || 75;
    
    // Calculate new dimensions
    let { width, height } = asset;
    
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }
    
    // In production, we'd resize the image here
    // For now, return original with metadata
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      asset.uri + Date.now()
    );
    
    return {
      uri: asset.uri,
      width,
      height,
      hash,
    };
  }
  
  // ===========================================================================
  // ANALYSIS API
  // ===========================================================================
  
  /**
   * Create a new meal analysis
   */
  async createAnalysis(mealType?: string): Promise<{
    analysisId: string;
    status: string;
    createdAt: number;
  }> {
    return this.request('/analysis', {
      method: 'POST',
      body: JSON.stringify({ mealType }),
    });
  }
  
  /**
   * Upload image for analysis
   */
  async uploadAnalysisImage(
    analysisId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    r2Key: string;
    imageHash: string;
    size: number;
  }> {
    const token = await this.getToken();
    
    if (!token) {
      throw new NutritionApiError('Not authenticated', 'UNAUTHORIZED', 401);
    }
    
    // Fetch image as blob
    const imageResponse = await fetch(imageUri);
    const imageBlob = await imageResponse.blob();
    
    // Create form data
    const formData = new FormData();
    formData.append('image', imageBlob, 'meal.jpg');
    
    // Upload with progress tracking
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded / event.total);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.data);
        } else {
          reject(new NutritionApiError('Upload failed', 'UPLOAD_FAILED', xhr.status));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new NutritionApiError('Upload failed', 'NETWORK_ERROR', 0));
      });
      
      xhr.open('POST', `${this.baseUrl}/analysis/${analysisId}/image`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }
  
  /**
   * Get analysis status
   */
  async getAnalysisStatus(analysisId: string): Promise<{
    analysisId: string;
    status: string;
    progress?: { stage: string; percent: number };
    completedAt: number | null;
    errorMessage: string | null;
  }> {
    return this.request(`/analysis/${analysisId}/status`);
  }
  
  /**
   * Get analysis result
   */
  async getAnalysisResult(analysisId: string): Promise<MealAnalysis> {
    return this.request(`/analysis/${analysisId}`);
  }
  
  /**
   * Confirm analysis and create meal
   */
  async confirmAnalysis(
    analysisId: string,
    corrections?: any[]
  ): Promise<{
    meal: Meal;
    analysisId: string;
  }> {
    return this.request(`/analysis/${analysisId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ corrections }),
    });
  }
  
  /**
   * Cancel analysis
   */
  async cancelAnalysis(analysisId: string): Promise<{
    analysisId: string;
    status: string;
  }> {
    return this.request(`/analysis/${analysisId}/cancel`, {
      method: 'POST',
    });
  }
  
  // ===========================================================================
  // MEALS API
  // ===========================================================================
  
  /**
   * List meals for date range
   */
  async listMeals(
    startDate: string,
    endDate: string,
    options?: {
      mealType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    meals: Meal[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    
    if (options?.mealType) params.append('mealType', options.mealType);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    
    return this.request(`/meals?${params.toString()}`);
  }
  
  /**
   * Get today's meals
   */
  async getTodayMeals(): Promise<{
    date: string;
    meals: Meal[];
    totalNutrition: NutritionValues;
    macroPercentages: MacroTargets;
  }> {
    return this.request('/meals/today');
  }
  
  /**
   * Create a meal manually
   */
  async createMeal(data: {
    date: string;
    timezone: string;
    mealType: string;
    name: string;
    items: any[];
    notes?: string;
  }): Promise<Meal> {
    return this.request('/meals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  /**
   * Get meal by ID
   */
  async getMeal(mealId: string): Promise<Meal> {
    return this.request(`/meals/${mealId}`);
  }
  
  /**
   * Delete a meal
   */
  async deleteMeal(mealId: string): Promise<{
    deleted: boolean;
    mealId: string;
  }> {
    return this.request(`/meals/${mealId}`, {
      method: 'DELETE',
    });
  }
  
  // ===========================================================================
  // TARGETS API
  // ===========================================================================
  
  /**
   * Get nutrition targets
   */
  async getTargets(): Promise<{
    targets: NutritionTargets;
    macroTargets: MacroTargets;
    isDefault: boolean;
  }> {
    return this.request('/targets');
  }
  
  /**
   * Update nutrition targets
   */
  async updateTargets(data: {
    targets?: Partial<NutritionTargets>;
    macroTargets?: Partial<MacroTargets>;
  }): Promise<{
    targets: NutritionTargets;
    macroTargets: MacroTargets;
  }> {
    return this.request('/targets', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  /**
   * Reset targets to defaults
   */
  async resetTargets(): Promise<{
    targets: NutritionTargets;
    macroTargets: MacroTargets;
    reset: boolean;
  }> {
    return this.request('/targets/reset', {
      method: 'POST',
    });
  }
  
  // ===========================================================================
  // PLANS API
  // ===========================================================================
  
  /**
   * Get meal plan for date
   */
  async getMealPlan(date: string): Promise<any> {
    return this.request(`/plans/${date}`);
  }
  
  /**
   * Update meal plan entry
   */
  async updateMealPlanEntry(
    date: string,
    mealType: string,
    data: any
  ): Promise<any> {
    return this.request(`/plans/${date}/${mealType}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  // ===========================================================================
  // CHARTS API
  // ===========================================================================
  
  /**
   * Get chart data for metric
   */
  async getChartData(
    metric: string,
    range: string = '7d',
    target?: number
  ): Promise<ChartData> {
    const params = new URLSearchParams({ metric, range });
    if (target) params.append('target', String(target));
    
    return this.request(`/charts/${metric}?${params.toString()}`);
  }
  
  /**
   * Get multiple metrics at once
   */
  async getMultipleChartData(
    metrics: string[],
    range: string = '7d'
  ): Promise<Record<string, ChartData>> {
    const params = new URLSearchParams({
      metrics: metrics.join(','),
      range,
    });
    
    return this.request(`/charts?${params.toString()}`);
  }
  
  // ===========================================================================
  // FOODS API
  // ===========================================================================
  
  /**
   * Search foods
   */
  async searchFoods(query: string, limit?: number): Promise<{
    foods: Food[];
    count: number;
  }> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', String(limit));
    
    return this.request(`/foods/search?${params.toString()}`);
  }
  
  /**
   * Get food nutrition for quantity
   */
  async getFoodNutrition(
    foodId: string,
    quantity: number,
    unit: string = 'g'
  ): Promise<{
    food: any;
    nutrition: NutritionValues;
  }> {
    return this.request(`/foods/${foodId}/nutrition?quantity=${quantity}&unit=${unit}`);
  }
}

// Singleton instance
let clientInstance: NutritionApiClient | null = null;

export function getNutritionClient(baseUrl?: string): NutritionApiClient {
  if (!clientInstance) {
    clientInstance = new NutritionApiClient(baseUrl);
  }
  return clientInstance;
}

export function resetNutritionClient(): void {
  clientInstance = null;
}
