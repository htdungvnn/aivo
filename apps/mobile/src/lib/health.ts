/**
 * Health API Client for Mobile (Expo)
 * Handles Daily Intelligence, readiness, and health data
 */

import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_HEALTH_API_URL || 'http://localhost:3004/api/v1';

// =============================================================================
// Types
// =============================================================================

export interface ReadinessFactor {
  code: string;
  score: number;
  weight: number;
  contribution: number;
  status: 'negative' | 'neutral' | 'positive';
  messageKey: string;
}

export interface ReadinessRecommendation {
  action: 'rest' | 'recovery' | 'light_training' | 'normal_training' | 'high_intensity';
  intensityModifier: number;
  volumeModifier: number;
}

export interface ReadinessData {
  date: string;
  score: number;
  level: 'low' | 'moderate' | 'good' | 'high';
  confidence: number;
  dataCompleteness: number;
  factors: ReadinessFactor[];
  recommendation: ReadinessRecommendation;
  algorithmVersion: string;
  calculatedAt: number;
  cached?: boolean;
}

export interface DailyAction {
  id: string;
  userId: string;
  date: string;
  type: string;
  priority: number;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'skipped';
  completedAt: number | null;
  skippedAt: number | null;
  skipReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number | null;
  target?: number;
  confidence?: number;
}

export interface ChartSummary {
  current: number | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  changePercent: number | null;
  completionPercent?: number | null;
  trend: 'improving' | 'stable' | 'declining' | null;
}

export interface ChartData {
  metric: string;
  range: string;
  unit: string;
  target?: number;
  points: ChartDataPoint[];
  summary: ChartSummary;
  cached?: boolean;
  generatedAt: number;
}

export interface ChartDefinition {
  metric: string;
  label: string;
  unit: string;
  color: string;
  target?: number;
  chartType: 'line' | 'bar' | 'area' | 'donut';
  category: string;
  supportedRanges: string[];
}

export interface TodayIntelligence {
  date: string;
  timezone: string;
  readiness: ReadinessData;
  actions: DailyAction[];
  hasCompletedCheckIn: boolean;
  calculatedAt: number;
  algorithmVersion: string;
}

export interface WeeklySummary {
  startDate: string;
  endDate: string;
  timezone: string;
  averages: {
    readiness: number;
  };
  trends: {
    readiness: 'improving' | 'stable' | 'declining';
  };
  highlights: {
    bestDay: string;
    bestReadiness: number;
  };
  generatedAt: number;
}

export interface CheckInRequest {
  energy?: number;
  stress?: number;
  sleepQuality?: number;
  muscleSoreness?: number;
  notes?: string;
}

export interface CheckInResponse {
  checkIn: {
    id: string;
    date: string;
    completed: boolean;
    completedAt: number;
  };
  readinessRecalculated: boolean;
  newReadinessScore?: number;
}

// =============================================================================
// API Error
// =============================================================================

export class HealthApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'HealthApiError';
  }
}

// =============================================================================
// API Client
// =============================================================================

export class HealthApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get auth token from secure store
   */
  private async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('aivo_access_token');
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
      throw new HealthApiError('Not authenticated', 'UNAUTHORIZED', 401);
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
      throw new HealthApiError(error.message, error.code, response.status);
    }
    
    return data.data;
  }
  
  // ===========================================================================
  // Readiness API
  // ===========================================================================
  
  /**
   * Get today's readiness
   */
  async getTodayReadiness(): Promise<ReadinessData> {
    return this.request('/readiness/today');
  }
  
  /**
   * Recalculate today's readiness
   */
  async recalculateReadiness(): Promise<ReadinessData> {
    return this.request('/readiness/recalculate', { method: 'POST' });
  }
  
  /**
   * Get readiness history
   */
  async getReadinessHistory(
    startDate?: string,
    endDate?: string
  ): Promise<{ startDate: string; endDate: string; history: Array<{ date: string; score: number; level: string }> }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.request(`/readiness/history?${params.toString()}`);
  }
  
  /**
   * Get readiness factor details
   */
  async getReadinessFactors(date?: string): Promise<{ date: string; snapshotId: string; factors: ReadinessFactor[] }> {
    const params = date ? `?date=${date}` : '';
    return this.request(`/readiness/factors${params}`);
  }
  
  // ===========================================================================
  // Check-in API
  // ===========================================================================
  
  /**
   * Submit daily check-in
   */
  async submitCheckIn(data: CheckInRequest): Promise<CheckInResponse> {
    return this.request('/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  // ===========================================================================
  // Actions API
  // ===========================================================================
  
  /**
   * Get today's actions
   */
  async getTodayActions(): Promise<{ date: string; actions: DailyAction[] }> {
    return this.request('/actions');
  }
  
  /**
   * Update action status
   */
  async updateActionStatus(
    actionId: string,
    status: 'completed' | 'skipped',
    skipReason?: string
  ): Promise<{ actionId: string; status: string; updatedAt: number }> {
    return this.request(`/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, skipReason }),
    });
  }
  
  // ===========================================================================
  // Daily Intelligence API
  // ===========================================================================
  
  /**
   * Get today's Daily Intelligence
   */
  async getTodayIntelligence(): Promise<TodayIntelligence> {
    return this.request('/intelligence');
  }
  
  /**
   * Get weekly intelligence summary
   */
  async getWeeklySummary(): Promise<WeeklySummary> {
    return this.request('/intelligence/weekly');
  }
  
  // ===========================================================================
  // Charts API
  // ===========================================================================
  
  /**
   * Get available chart definitions
   */
  async getChartDefinitions(platform: 'web' | 'mobile' = 'mobile'): Promise<{ charts: ChartDefinition[] }> {
    return this.request(`/charts?platform=${platform}`);
  }
  
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
   * Get multiple charts at once
   */
  async getMultipleChartData(
    metrics: string[],
    range: string = '7d'
  ): Promise<{ charts: Record<string, ChartData>; requestedMetrics: string[]; requestedRange: string }> {
    return this.request('/charts/batch', {
      method: 'POST',
      body: JSON.stringify({ metrics, range }),
    });
  }
}

// Singleton instance
let clientInstance: HealthApiClient | null = null;

export function getHealthClient(baseUrl?: string): HealthApiClient {
  if (!clientInstance) {
    clientInstance = new HealthApiClient(baseUrl);
  }
  return clientInstance;
}

export function resetHealthClient(): void {
  clientInstance = null;
}
