"use client";

import { useState, useCallback } from "react";
import { createApiClient } from "@aivo/api-client";
import type { FoodLog, DailyNutritionSummary, MacroTargets, FoodVisionAnalysis, UploadImageResponse, FoodItem, CreateFromAnalysisRequest, FoodLogCreate, FoodLogUpdate, MealType } from "@aivo/shared-types";

const getToken = async (): Promise<string> => {
  return localStorage.getItem("aivo_token") || "";
};

const getUserId = async (): Promise<string> => {
  return localStorage.getItem("aivo_user_id") || "";
};

const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787",
  tokenProvider: getToken,
  userIdProvider: getUserId,
});

/**
 * Hook for nutrition logging and management
 */
export function useNutrition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload food image
  const uploadFoodImage = useCallback(async (file: File): Promise<UploadImageResponse["data"]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.uploadFoodImage(file);
      return response.data!;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Analyze food image with AI
  const analyzeFoodImage = useCallback(async (imageUrl: string, mealType?: MealType): Promise<FoodVisionAnalysis> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.analyzeFoodImage(imageUrl, mealType);
      return response.data!;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create food log from analysis
  const createFoodLogFromAnalysis = useCallback(async (data: CreateFromAnalysisRequest): Promise<FoodLog> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.createFoodLogFromAnalysis(data);
      return response.data!;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create food log";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create manual food log
  const createFoodLog = useCallback(async (data: FoodLogCreate): Promise<FoodLog> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.createFoodLog(data);
      return response.data!;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create food log";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get food logs for date
  const getFoodLogs = useCallback(async (date: string): Promise<FoodLog[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getFoodLogs(date);
      return response.data || [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get food logs for date range
  const getFoodLogsRange = useCallback(async (startDate: string, endDate: string): Promise<FoodLog[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getFoodLogsRange(startDate, endDate);
      return response.data || [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Update food log
  const updateFoodLog = useCallback(async (id: string, data: FoodLogUpdate): Promise<FoodLog> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.updateFoodLog(id, data);
      return response.data!;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update food log";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete food log
  const deleteFoodLog = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.deleteFoodLog(id);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get daily nutrition summary
  const getDailySummary = useCallback(async (date?: string): Promise<DailyNutritionSummary> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getDailyNutritionSummary(date);
      return response.data!;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get macro targets
  const getMacroTargets = useCallback(async (): Promise<MacroTargets> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getMacroTargets();
      return response.data!;
    } finally {
      setLoading(false);
    }
  }, []);

  // Set macro targets
  const setMacroTargets = useCallback(async (data: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
  }): Promise<MacroTargets> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.setMacroTargets(data);
      return response.data!;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search food items
  const searchFoodItems = useCallback(async (query: string, limit: number = 10): Promise<FoodItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.searchFoodItems(query, limit);
      return response.data || [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    uploadFoodImage,
    analyzeFoodImage,
    createFoodLogFromAnalysis,
    createFoodLog,
    getFoodLogs,
    getFoodLogsRange,
    updateFoodLog,
    deleteFoodLog,
    getDailySummary,
    getMacroTargets,
    setMacroTargets,
    searchFoodItems,
  };
}
