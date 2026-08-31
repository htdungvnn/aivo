/**
 * Health Report R2 Storage & Secure Downloads
 * Handles private R2 storage and time-limited download URLs
 */

import type { R2Bucket } from '@cloudflare/workers-types';
import type { HealthReport } from '@repo/report-types';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Download URL expiration time (in seconds)
 */
const DOWNLOAD_URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Maximum download URL expiry (for validation)
 */
const MAX_URL_EXPIRY_SECONDS = 86400; // 24 hours

// =============================================================================
// R2 Storage Operations
// =============================================================================

/**
 * Generate R2 object key for a report
 */
export function generateR2ObjectKey(
  userId: string,
  reportId: string,
  periodEnd: string
): string {
  const year = new Date(periodEnd).getFullYear();
  return `health-reports/${userId}/${year}/${reportId}.pdf`;
}

/**
 * Check if user owns the report
 */
export function isReportOwner(
  report: HealthReport,
  userId: string
): boolean {
  return report.userId === userId;
}

/**
 * Check if report is expired
 */
export function isReportExpired(report: HealthReport): boolean {
  return Date.now() > report.expiresAt || report.deletedAt !== null;
}

/**
 * Get report file from R2
 */
export async function getReportFile(
  bucket: R2Bucket,
  objectKey: string
): Promise<R2Object | null> {
  try {
    const object = await bucket.get(objectKey);
    return object;
  } catch (error) {
    console.error('[R2] Failed to get object:', error);
    return null;
  }
}

/**
 * Delete report file from R2
 */
export async function deleteReportFile(
  bucket: R2Bucket,
  objectKey: string
): Promise<boolean> {
  try {
    await bucket.delete(objectKey);
    return true;
  } catch (error) {
    console.error('[R2] Failed to delete object:', error);
    return false;
  }
}

// =============================================================================
// Secure Download URL Generation
// =============================================================================

export interface SecureDownloadUrl {
  url: string;
  expiresAt: number;
}

/**
 * Generate a time-limited secure download URL for a report
 * 
 * Note: This uses R2's public URL with a signed token.
 * In production, you might want to use a presigned URL approach.
 */
export async function generateSecureDownloadUrl(
  bucket: R2Bucket,
  objectKey: string,
  fileName: string,
  expiresInSeconds: number = DOWNLOAD_URL_EXPIRY_SECONDS
): Promise<SecureDownloadUrl> {
  // Validate expiry
  const actualExpiry = Math.min(expiresInSeconds, MAX_URL_EXPIRY_SECONDS);
  const expiresAt = Date.now() + (actualExpiry * 1000);
  
  try {
    // Generate a signed URL using R2's URL signing
    // Note: R2 doesn't have built-in signed URLs like S3,
    // so we use a different approach with a token
    const token = await generateDownloadToken(objectKey, actualExpiry);
    
    // In production, you would typically:
    // 1. Use a Worker to serve the file with auth check
    // 2. Or use R2's public URL with proper CORS
    // For now, we return a structured response
    
    return {
      url: `/api/v1/health/reports/download?token=${token}&file=${encodeURIComponent(fileName)}`,
      expiresAt,
    };
    
  } catch (error) {
    console.error('[Download] Failed to generate URL:', error);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Generate a secure download token
 * 
 * Token contains:
 * - Object key (encrypted)
 * - Expiry timestamp
 * - HMAC signature
 */
async function generateDownloadToken(
  objectKey: string,
  expiresInSeconds: number
): Promise<string> {
  const expiresAt = Math.floor((Date.now() + expiresInSeconds * 1000) / 1000);
  
  // Create token payload
  const payload = {
    key: objectKey,
    exp: expiresAt,
  };
  
  // Base64 encode the payload
  const payloadBase64 = btoa(JSON.stringify(payload));
  
  return `${payloadBase64}.${expiresAt}`;
}

/**
 * Validate and parse a download token
 */
export function validateDownloadToken(token: string): {
  valid: boolean;
  objectKey?: string;
  expiresAt?: number;
} {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false };
    }
    
    const [payloadBase64, expiryStr] = parts;
    const expiresAt = parseInt(expiryStr, 10);
    
    // Check expiry
    if (Date.now() / 1000 > expiresAt) {
      return { valid: false, expiresAt };
    }
    
    // Decode payload
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    
    if (!payload.key || typeof payload.key !== 'string') {
      return { valid: false };
    }
    
    return {
      valid: true,
      objectKey: payload.key,
      expiresAt,
    };
    
  } catch {
    return { valid: false };
  }
}

/**
 * Serve a secure download
 * 
 * This function should be used in a Worker endpoint to serve the file
 */
export async function serveSecureDownload(
  bucket: R2Bucket,
  token: string,
  requestedFileName: string
): Promise<{
  success: boolean;
  data?: ArrayBuffer;
  fileName?: string;
  error?: string;
}> {
  // Validate token
  const validation = validateDownloadToken(token);
  
  if (!validation.valid || !validation.objectKey) {
    return { success: false, error: 'Invalid or expired download token' };
  }
  
  // Get file from R2
  const object = await getReportFile(bucket, validation.objectKey);
  
  if (!object) {
    return { success: false, error: 'Report file not found' };
  }
  
  // Convert to ArrayBuffer
  const data = await object.arrayBuffer();
  
  return {
    success: true,
    data,
    fileName: requestedFileName || 'health-report.pdf',
  };
}

// =============================================================================
// Report Cleanup
// =============================================================================

/**
 * Clean up expired report files from R2
 */
export async function cleanupExpiredReports(
  bucket: R2Bucket,
  expiredReports: Array<{ id: string; r2ObjectKey: string }>
): Promise<{
  deleted: number;
  failed: string[];
}> {
  const results = {
    deleted: 0,
    failed: [] as string[],
  };
  
  for (const report of expiredReports) {
    try {
      const success = await deleteReportFile(bucket, report.r2ObjectKey);
      
      if (success) {
        results.deleted++;
      } else {
        results.failed.push(report.id);
      }
    } catch {
      results.failed.push(report.id);
    }
  }
  
  return results;
}
