/**
 * API service for form analysis videos
 */

import * as SecureStore from 'expo-secure-store';
import type {
  FormAnalysisVideo,
  FormAnalysisReport,
  FormExerciseType,
} from "@aivo/shared-types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

/**
 * Get authentication token
 */
async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('aivo_token');
}

/**
 * Get user ID
 */
async function getUserId(): Promise<string | null> {
  return await SecureStore.getItemAsync('aivo_user_id');
}

/**
 * Upload a form analysis video
 */
export async function uploadFormVideo(
  videoUri: string,
  fileName: string,
  exerciseType: FormExerciseType
): Promise<{ videoId: string; status: string; videoUrl: string }> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error("User ID not found");
  }

  // Read video file as blob
  const response = await fetch(videoUri);
  const blob = await response.blob();

  const formData = new FormData();
  // @ts-expect-error - React Native FormData file object with uri
  formData.append("video", {
    uri: videoUri,
    type: blob.type,
    name: fileName,
  });
  formData.append("exerciseType", exerciseType);

  const uploadResponse = await fetch(`${API_URL}/api/form/upload`, {
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

  const data = await uploadResponse.json();
  return data.data;
}

/**
 * Get form analysis status for a video
 */
export async function getFormVideoStatus(videoId: string): Promise<{
  videoId: string;
  status: string;
  exerciseType: string;
  uploadedAt: number;
  analysisCompleted: boolean;
  resultUrl: string | null;
}> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/form/${videoId}/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get status");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get form analysis result for a video
 */
export async function getFormVideoResult(videoId: string): Promise<FormAnalysisReport> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/form/${videoId}/result`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get result");
  }

  const data = await response.json();
  return data.data;
}

/**
 * List all form analysis videos for the user
 */
export async function listUserFormVideos(): Promise<
  (FormAnalysisVideo & {
    hasAnalysis: boolean;
    completedAt: number | null;
    grade: string | null;
    overallScore: number | null;
  })[]
> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error("User ID not found");
  }

  const response = await fetch(`${API_URL}/api/form/user/videos`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list videos");
  }

  const data = await response.json();
  return data.data;
}
