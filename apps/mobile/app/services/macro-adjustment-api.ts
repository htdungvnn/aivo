/**
 * Macro Adjustment API Service
 * Handles adaptive macro sessions, adjustment polling, and feedback
 */

import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, API_CONFIG } from "@/config";

const API_URL = API_CONFIG.BASE_URL;

// Types matching the API responses
export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface MacroAdjustment {
  hasAdjustment: boolean;
  logId?: string;
  adjustment_type: 'increase_calories' | 'decrease_calories' | 'rebalance' | 'maintain';
  calorie_change: number;
  protein_change: number;
  carbs_change: number;
  fat_change: number;
  reasoning: string[];
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  newCalories: number;
  newProtein: number;
  newCarbs: number;
  newFat: number;
}

export interface MacroAdjustmentSession {
  sessionId: string;
  targets: MacroTargets;
}

async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();

  // Unwrap data envelope if present (API returns { data: T })
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

/**
 * Start a macro adjustment session
 */
export async function startMacroAdjustmentSession(): Promise<MacroAdjustmentSession> {
  return await fetchApi<MacroAdjustmentSession>("/api/macro-adjustment/session/start", {
    method: "POST",
  });
}

/**
 * Check for macro adjustments (polling endpoint)
 */
export async function checkMacroAdjustment(
  sessionId: string,
  currentData: {
    dailyCaloriesConsumed?: number;
    // Additional context can be added
  }
): Promise<{ hasAdjustment: boolean } & MacroAdjustment> {
  return await fetchApi(`/api/macro-adjustment/check`, {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      ...currentData,
    }),
  });
}

/**
 * Accept a macro adjustment suggestion
 */
export async function acceptMacroAdjustment(
  logId: string
): Promise<{ success: boolean }> {
  return await fetchApi(`/api/macro-adjustment/adjustment/${logId}/accept`, {
    method: "POST",
  });
}

/**
 * Dismiss a macro adjustment suggestion
 */
export async function dismissMacroAdjustment(
  logId: string
): Promise<{ success: boolean }> {
  return await fetchApi(`/api/macro-adjustment/adjustment/${logId}/dismiss`, {
    method: "PATCH",
  });
}

/**
 * End an adjustment session
 */
export async function endMacroAdjustmentSession(
  sessionId: string
): Promise<{ success: boolean }> {
  return await fetchApi(`/api/macro-adjustment/session/${sessionId}/end`, {
    method: "POST",
  });
}

/**
 * Get macro targets (uses biometric endpoint)
 */
export async function getMacroTargets(): Promise<MacroTargets> {
  return await fetchApi<MacroTargets>("/api/biometric/nutrition/targets");
}

/**
 * Set macro targets (uses biometric endpoint)
 */
export async function setMacroTargets(
  targets: Partial<MacroTargets>
): Promise<MacroTargets> {
  return await fetchApi<MacroTargets>("/api/biometric/nutrition/targets", {
    method: "POST",
    body: JSON.stringify(targets),
  });
}