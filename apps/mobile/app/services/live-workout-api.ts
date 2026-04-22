import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = __DEV__ ? "http://localhost:8787" : "https://api.aivo.app";

// Storage keys
const TOKEN_KEY = "aivo.auth.token";
const USER_ID_KEY = "aivo.user.id";

export interface LiveAdjustmentResponse {
  success: boolean;
  adjustment?: {
    adjustmentType: "reduce_weight" | "reduce_reps" | "add_rest" | "keep" | "stop";
    weightPercent?: number;
    repAdjustment?: number;
    additionalRestSeconds?: number;
    confidence: number;
    reasoning: string;
    urgency: "low" | "medium" | "high" | "critical";
  };
  fatigue?: {
    fatigueLevel: number;
    category: "fresh" | "moderate" | "fatigued" | "exhausted";
    rpeTrend: "increasing" | "stable" | "decreasing" | "no_data";
    avgRPE: number;
    restCompliance: number;
    recommendation: string;
  };
  recommendedRest?: number;
  shouldEndWorkout?: boolean;
  endWorkoutReason?: string;
  endWorkoutSuggestion?: string;
}

export interface LiveWorkoutSession {
  id: string;
  userId: string;
  workoutTemplateId?: string;
  name: string;
  startedAt: number;
  lastActivityAt: number;
  status: "active" | "paused" | "completed" | "aborted";
  fatigueLevel: number;
  fatigueCategory: "fresh" | "moderate" | "fatigued" | "exhausted";
  totalPlannedVolume: number;
  totalCompletedVolume: number;
  setsCompleted: number;
  totalPlannedSets: number;
  targetRPE: number;
  idealRestSeconds: number;
  hasSpotter: boolean;
  endedAt?: number;
  totalDurationMs?: number;
  earlyExitReason?: string;
  earlyExitSuggestion?: string;
}

async function getAuthHeaders(): Promise<Headers> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const userId = await AsyncStorage.getItem(USER_ID_KEY);

  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (userId) {
    headers.set("X-User-Id", userId);
  }

  return headers;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, data: data.data ?? data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export const liveWorkoutAPI = {
  // Start a new live workout session
  startSession: async (request: {
    workoutTemplateId?: string;
    name: string;
    targetRPE?: number;
    idealRestSeconds?: number;
    hasSpotter?: boolean;
  }): Promise<{ success: boolean; session?: LiveWorkoutSession; error?: string }> => {
    return fetchAPI<LiveWorkoutSession>("/api/live-workout/start", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  // Get session state
  getSession: async (sessionId: string): Promise<{ success: boolean; session?: LiveWorkoutSession; error?: string }> => {
    return fetchAPI<LiveWorkoutSession>(`/api/live-workout/session/${sessionId}`, {
      method: "GET",
    });
  },

  // Log RPE for a set
  logRPE: async (log: {
    sessionId: string;
    setNumber: number;
    exerciseName: string;
    weight?: number | null;
    plannedReps: number;
    completedReps: number;
    rpe: number;
    restTimeSeconds: number;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    return fetchAPI("/api/live-workout/log-rpe", {
      method: "POST",
      body: JSON.stringify(log),
    });
  },

  // Get AI adjustment recommendation
  getAdjustment: async (request: {
    sessionId: string;
    currentWeight: number;
    targetReps: number;
    remainingSets: number;
    exerciseType: string;
    isWarmup: boolean;
    hasSpotter: boolean;
    recentRPERecords: Array<{
      rpe: number;
      weight?: number;
      repsCompleted?: number;
      restTimeSeconds?: number;
      setNumber: number;
    }>;
  }): Promise<{ success: boolean; adjustment?: LiveAdjustmentResponse; error?: string }> => {
    return fetchAPI<LiveAdjustmentResponse>("/api/live-workout/adjust", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  // End workout session
  endSession: async (
    sessionId: string,
    reason?: string,
    suggestion?: string
  ): Promise<{ success: boolean; session?: LiveWorkoutSession; error?: string }> => {
    return fetchAPI<LiveWorkoutSession>(`/api/live-workout/session/${sessionId}/end`, {
      method: "POST",
      body: JSON.stringify({ reason, suggestion }),
    });
  },
};
