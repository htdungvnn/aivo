/**
 * Coach API Client
 * API client for the coach service
 */

import type { ExerciseDefinition, WorkoutPlan, WorkoutSession, WorkoutSummary, ProgressSummary } from '@repo/fitness-types';
import { getAuthClient } from '../../lib/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_COACH_API_URL || 'http://localhost:8787/api/v1';

interface ApiResponse<T> {
  data: T;
  requestId?: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

class CoachApiClient {
  private baseUrl: string;
  private authClient: ReturnType<typeof getAuthClient>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.authClient = getAuthClient();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.authClient.getAccessToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(error.error?.message || 'Request failed');
    }

    return (data as ApiResponse<T>).data;
  }

  // =============================================================================
  // Exercises
  // =============================================================================

  async getExercises(): Promise<Array<{
    code: string;
    name: { en: string; vi: string };
    description: { en: string; vi: string };
    difficulty: string;
    goals: string[];
    cameraOrientation: string;
  }>> {
    return this.request('/exercises');
  }

  async getExerciseDefinition(code: string): Promise<{ exercise: ExerciseDefinition }> {
    return this.request(`/exercises/${code}`);
  }

  // =============================================================================
  // Plans
  // =============================================================================

  async getActivePlan(): Promise<{ plan: WorkoutPlan | null }> {
    return this.request('/plans/active');
  }

  async getPlans(status?: string): Promise<{ plans: WorkoutPlan[]; total: number }> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/plans${query}`);
  }

  async getPlan(planId: string): Promise<{ plan: WorkoutPlan }> {
    return this.request(`/plans/${planId}`);
  }

  async createPlan(data: Partial<WorkoutPlan>): Promise<{ plan: WorkoutPlan }> {
    return this.request('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlan(planId: string, data: Partial<WorkoutPlan>): Promise<{ plan: WorkoutPlan }> {
    return this.request(`/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async activatePlan(planId: string): Promise<{ plan: WorkoutPlan }> {
    return this.request(`/plans/${planId}/activate`, {
      method: 'POST',
    });
  }

  async deletePlan(planId: string): Promise<{ success: boolean }> {
    return this.request(`/plans/${planId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // Sessions
  // =============================================================================

  async getSessions(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ sessions: WorkoutSession[]; total: number; limit: number; offset: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.status) params.append('status', options.status);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/sessions${query}`);
  }

  async getActiveSession(): Promise<{ session: WorkoutSession | null }> {
    return this.request('/sessions/active');
  }

  async getSession(sessionId: string): Promise<{ session: WorkoutSession }> {
    return this.request(`/sessions/${sessionId}`);
  }

  async startSession(data: {
    planId?: string;
    exercises: Array<{
      exerciseCode: string;
      targetSets: number;
      targetReps: number;
    }>;
    idempotencyKey?: string;
  }): Promise<{ session: WorkoutSession }> {
    return this.request('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSessionCheckpoint(
    sessionId: string,
    data: {
      status?: string;
      currentExerciseIndex?: number;
      notes?: string;
    }
  ): Promise<{ session: WorkoutSession }> {
    return this.request(`/sessions/${sessionId}/checkpoint`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async submitSet(
    sessionId: string,
    data: {
      exerciseCode: string;
      setNumber: number;
      status: 'completed' | 'skipped' | 'failed';
      completedReps: number;
      averageRangeOfMotion: number;
      averageQualityScore: number;
      averageTempoSeconds: number;
      durationMs: number;
      correctionCounts?: Record<string, number>;
      averageConfidence: number;
    }
  ): Promise<any> {
    return this.request(`/sessions/${sessionId}/sets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeSession(
    sessionId: string,
    data: {
      userRating?: number;
      userNotes?: string;
      totalDurationMs: number;
    }
  ): Promise<{ summary: WorkoutSummary }> {
    return this.request(`/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelSession(sessionId: string): Promise<{ session: WorkoutSession }> {
    return this.request(`/sessions/${sessionId}/cancel`, {
      method: 'POST',
    });
  }

  // =============================================================================
  // Progress
  // =============================================================================

  async getProgressSummary(period: 'day' | 'week' | 'month' | 'quarter' = 'week'): Promise<{
    summary: ProgressSummary;
  }> {
    return this.request(`/progress/summary?period=${period}`);
  }

  async getExerciseProgress(
    exerciseCode: string,
    limit: number = 10
  ): Promise<{ progress: any[] }> {
    return this.request(`/progress/exercises/${exerciseCode}?limit=${limit}`);
  }

  async getWorkoutHistory(options?: {
    limit?: number;
    offset?: number;
    exercise?: string;
  }): Promise<{ history: any[]; total: number; limit: number; offset: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.exercise) params.append('exercise', options.exercise);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/progress/history${query}`);
  }

  // =============================================================================
  // Planning
  // =============================================================================

  async requestPlan(data: {
    currentGoal: string;
    reason: string;
    availableExercises?: string[];
    excludedExercises?: string[];
    maxWorkoutsPerWeek?: number;
    userFeedback?: string;
  }): Promise<{ job: any }> {
    return this.request('/planning/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPlanningJob(jobId: string): Promise<{ job: any }> {
    return this.request(`/planning/jobs/${jobId}`);
  }

  async requestPlanAdjustment(data: {
    planId: string;
    reason: string;
    completedSessionId?: string;
  }): Promise<{ message: string; planId: string }> {
    return this.request('/planning/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Singleton instance
let coachClientInstance: CoachApiClient | null = null;

export function getCoachClient(): CoachApiClient {
  if (!coachClientInstance) {
    coachClientInstance = new CoachApiClient();
  }
  return coachClientInstance;
}

export type { CoachApiClient };
