/**
 * Posture Helper Functions
 * Utility functions for posture analysis operations
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { schema } from "@aivo/db";

export interface R2BucketWithName extends R2Bucket {
  name?: string;
}

/**
 * Generate a unique analysis ID
 */
export function generateAnalysisId(): string {
  return `posture_${crypto.randomUUID()}`;
}

/**
 * Generate a unique video ID
 */
export function generateVideoId(): string {
  return `vid_${crypto.randomUUID()}`;
}

/**
 * Generate R2 storage key for a video
 */
export function generateVideoKey(userId: string, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split("-")[0];
  const ext = filename.split(".").pop() ?? "mp4";
  return `form-videos/${userId}/${timestamp}-${random}.${ext}`;
}

/**
 * Get public URL for an R2 object
 */
export function getPublicUrl(bucket: R2BucketWithName, key: string): string {
  const bucketName = bucket.name ?? "bucket";
  return `https://${bucketName}.r2.dev/${key}`;
}

/**
 * Send notification about analysis completion
 */
export async function sendNotification(
  drizzle: DrizzleD1Database<typeof schema>,
  userId: string,
  analysisId: string,
  grade: string,
  score: number
): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);
    await drizzle.insert(schema.notifications).values({
      id: `notif_${crypto.randomUUID()}`,
      userId,
      type: "form_analysis_complete",
      title: "Form Analysis Complete",
      body: `Your exercise form analysis is ready. Grade: ${grade}, Score: ${Math.round(score)}`,
      data: JSON.stringify({ analysisId, grade, score }),
      channel: "push",
      status: "pending",
      createdAt: now,
    });
  } catch (error) {
    // Notification failures should not break the analysis flow
    // eslint-disable-next-line no-console
    console.error("[Posture] Failed to create notification:", error);
  }
}
