"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createApiClient } from "@aivo/api-client";
import { BODY_ZONES, type MuscleGroup } from "@aivo/shared-types";
import type { BodyPhotoRecord, StoredHeatmap, HeatmapComparison, HeatmapVectorPoint, HeatmapRegion } from "@aivo/shared-types";

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
 * Transform heatmap regions to vector points for the HeatmapRenderer
 * Converts zone-based regions into distributed intensity points
 */
function regionsToVectorData(regions: HeatmapRegion[], totalPoints: number = 100): HeatmapVectorPoint[] {
  const points: HeatmapVectorPoint[] = [];

  for (const region of regions) {
    const zone = BODY_ZONES.find(z => z.id === region.zoneId);
    if (!zone?.bounds) continue;

    const bounds = zone.bounds;
    const x = bounds.x ?? 0;
    const y = bounds.y ?? 0;
    const width = bounds.width ?? 0;
    const height = bounds.height ?? 0;

    // Calculate points based on zone bounds and intensity
    const zonePoints = Math.max(5, Math.round(totalPoints * (region.intensity / 10) * 0.3));

    for (let i = 0; i < zonePoints; i++) {
      // Distribute points within the zone bounds with some randomness
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;

      points.push({
        x: px * 200, // Convert normalized to viewBox coords (200x400)
        y: py * 400,
        muscle: region.zoneId as MuscleGroup,
        intensity: region.intensity / 10, // Convert 0-10 to 0-1
      });
    }
  }

  return points;
}

/**
 * Convert heatmap regions directly to SVG zone overlays
 * Each zone is rendered as a colored rectangle with gradient based on intensity
 */
export interface HeatmapZoneOverlay {
  zoneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number; // 0-1
  color: string;
}

function regionsToZoneOverlays(regions: HeatmapRegion[]): HeatmapZoneOverlay[] {
  return regions.map(region => {
    const zone = BODY_ZONES.find(z => z.id === region.zoneId);
    const intensity = region.intensity / 10; // 0-1

    // Color from green (0) to yellow (0.5) to red (1)
    let r: number, g: number, b: number;
    if (intensity < 0.5) {
      // Green to yellow
      const t = intensity * 2;
      r = Math.round(255 * t);
      g = 255;
      b = 0;
    } else {
      // Yellow to red
      const t = (intensity - 0.5) * 2;
      r = 255;
      g = Math.round(255 * (1 - t));
      b = 0;
    }

    const bounds = zone?.bounds;
    return {
      zoneId: region.zoneId,
      x: bounds?.x ? bounds.x * 200 : 0,
      y: bounds?.y ? bounds.y * 400 : 0,
      width: bounds?.width ? bounds.width * 200 : 0,
      height: bounds?.height ? bounds.height * 400 : 0,
      intensity,
      color: `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.4})`,
    };
  }).filter(overlay => overlay.width > 0 && overlay.height > 0);
}

export interface UseBodyHeatmapReturn {
  // Current heatmap (raw data from API)
  currentHeatmap: StoredHeatmap | null;
  currentPhoto: BodyPhotoRecord | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;

  // Transformed data for Heatmap component
  vectorData: HeatmapVectorPoint[];
  zoneOverlays: HeatmapZoneOverlay[];

  // History
  history: Array<{ heatmap: StoredHeatmap; photo: BodyPhotoRecord }>;
  loadHistory: (limit?: number, offset?: number) => Promise<void>;
  hasMore: boolean;

  // Specific heatmap
  getHeatmap: (id: string) => Promise<{ heatmap: StoredHeatmap; photo: BodyPhotoRecord } | null>;

  // Comparison
  compareHeatmaps: (id1: string, id2?: string) => Promise<HeatmapComparison | null>;

  // Actions
  uploadPhoto: (file: File) => Promise<{ photo: BodyPhotoRecord } | null>;
  analyzePhoto: (photoId: string) => Promise<{ heatmap: StoredHeatmap; analysis: any } | null>;
  deletePhoto: (id: string) => Promise<boolean>;
}

export function useBodyHeatmap(): UseBodyHeatmapReturn {
  const [currentHeatmap, setCurrentHeatmap] = useState<StoredHeatmap | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<BodyPhotoRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ heatmap: StoredHeatmap; photo: BodyPhotoRecord }>>([]);
  const [hasMore, setHasMore] = useState(false);

  // Transform current heatmap regions to component-ready formats
  const vectorData = useMemo(() => {
    if (!currentHeatmap?.regions) return [];
    return regionsToVectorData(currentHeatmap.regions);
  }, [currentHeatmap]);

  const zoneOverlays = useMemo(() => {
    if (!currentHeatmap?.regions) return [];
    return regionsToZoneOverlays(currentHeatmap.regions);
  }, [currentHeatmap]);

  const fetchCurrent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getCurrentHeatmap();
      if (response.data) {
        setCurrentHeatmap(response.data.heatmap);
        setCurrentPhoto(response.data.photo);
      } else {
        setCurrentHeatmap(null);
        setCurrentPhoto(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch current heatmap");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (limit: number = 10, offset: number = 0) => {
    if (offset === 0) {
      setLoading(true);
    }
    try {
      const response = await apiClient.getHeatmapHistory({ limit, offset });
      if (response.data && Array.isArray(response.data)) {
        const data = response.data as Array<{ heatmap: StoredHeatmap; photo: BodyPhotoRecord }>;
        if (offset === 0) {
          setHistory(data);
        } else {
          setHistory(prev => [...prev, ...data]);
        }
        setHasMore(data.length === limit);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, []);

  const getHeatmap = useCallback(async (id: string) => {
    try {
      const response = await apiClient.getHeatmap(id);
      return response.data || null;
    } catch (err: any) {
      console.error("Failed to fetch heatmap:", err);
      return null;
    }
  }, []);

  const compareHeatmaps = useCallback(async (id1: string, id2?: string) => {
    try {
      const response = await apiClient.compareHeatmaps(id1, id2);
      return response.data || null;
    } catch (err: any) {
      console.error("Failed to compare heatmaps:", err);
      return null;
    }
  }, []);

  const uploadPhoto = useCallback(async (file: File) => {
    try {
      const response = await apiClient.uploadBodyPhoto(file);
      return response.data || null;
    } catch (err: any) {
      console.error("Failed to upload photo:", err);
      return null;
    }
  }, []);

  const analyzePhoto = useCallback(async (photoId: string) => {
    try {
      const response = await apiClient.analyzeBodyPhoto(photoId);
      return response.data || null;
    } catch (err: any) {
      console.error("Failed to analyze photo:", err);
      return null;
    }
  }, []);

  const deletePhoto = useCallback(async (id: string) => {
    try {
      const response = await apiClient.deleteBodyPhoto(id);
      return response.data?.success ?? false;
    } catch (err: any) {
      console.error("Failed to delete photo:", err);
      return false;
    }
  }, []);

  // Auto-fetch current heatmap on mount
  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  return {
    currentHeatmap,
    currentPhoto,
    loading,
    error,
    refetch: fetchCurrent,
    vectorData,
    zoneOverlays,
    history,
    loadHistory,
    hasMore,
    getHeatmap,
    compareHeatmaps,
    uploadPhoto,
    analyzePhoto,
    deletePhoto,
  };
}
