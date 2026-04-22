/**
 * R2 Storage Service for AIVO API
 * Handles image uploads, downloads, and management for Cloudflare R2
 */

import type { R2Bucket, R2Object } from "@cloudflare/workers-types";

// Type guard for R2 errors
function isR2Error(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export interface R2UploadOptions {
  userId: string;
  image: Buffer | Uint8Array;
  filename?: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface R2ObjectInfo {
  key: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

/**
 * Generate a unique key for R2 storage
 */
export function generateR2Key(userId: string, filename: string, prefix = "body-images"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${prefix}/${userId}/${timestamp}-${random}-${sanitized}`;
}

/**
 * Generate a presigned URL for uploading directly from client
 * (For future use when clients upload directly to R2)
 */
export function generatePresignedUrl(bucket: R2Bucket, key: string, contentType: string, _ttlSeconds = 3600): string {
  // Note: This is a simplified version. In production, use the R2 presign API
  // via `r2.presignedPutObject` or the Workers API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bucketName = (bucket as any).name || "bucket";
  return `https://${bucketName}.r2.dev/${key}`;
}

/**
 * Upload image to R2 bucket
 * @param bucket - R2 bucket binding
 * @param options - Upload options
 * @returns Object info with public URL
 */
export async function uploadImage(bucket: R2Bucket, options: R2UploadOptions): Promise<R2ObjectInfo> {
  const { userId, image, filename = `image-${Date.now()}.jpg`, contentType, metadata = {} } = options;

  const key = generateR2Key(userId, filename);

  await bucket.put(key, image, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000", // 1 year cache
    },
    customMetadata: {
      ...metadata,
      userId,
      uploadedAt: new Date().toISOString(),
    },
  });

   
  return {
    key,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    url: `https://${(bucket as any).name || "bucket"}.r2.dev/${key}`,
    size: image.byteLength || image.length,
    contentType,
    uploadedAt: new Date(),
  };
}

/**
 * Delete image from R2 bucket
 */
export async function deleteImage(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

/**
 * Get image metadata from R2
 */
export async function getImageInfo(bucket: R2Bucket, key: string): Promise<R2ObjectInfo | null> {
  try {
    const object = await bucket.head(key);
    if (!object) {
      return null;
    }

     
    return {
      key,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      url: `https://${(bucket as any).name || "bucket"}.r2.dev/${key}`,
      size: object.size,
      contentType: object.httpMetadata?.contentType || "application/octet-stream",
      uploadedAt: new Date(object.uploaded || Date.now()),
    };
  } catch (error: unknown) {
    if (isR2Error(error) && error.code === "NotFound") {
      return null;
    }
    throw error;
  }
}

/**
 * List objects for a user
 */
export async function listUserImages(bucket: R2Bucket, userId: string, prefix = "body-images"): Promise<R2ObjectInfo[]> {
  const userPrefix = `${prefix}/${userId}/`;
  const objects = await bucket.list({
    prefix: userPrefix,
  });

  return objects.objects.map((obj: R2Object) => ({
    key: obj.key,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    url: `https://${(bucket as any).name || "bucket"}.r2.dev/${obj.key}`,
    size: obj.size,
    contentType: obj.httpMetadata?.contentType || "application/octet-stream",
    uploadedAt: new Date(obj.uploaded || Date.now()),
  }));
}

/**
 * Validate image file (size, type)
 */
export function validateImage(buffer: Buffer | Uint8Array, maxSize = 5 * 1024 * 1024): { valid: boolean; error?: string } {
  if (buffer.byteLength > maxSize) {
    return { valid: false, error: `Image size exceeds ${maxSize / 1024 / 1024}MB limit` };
  }

  // Check magic bytes for common image formats
  const bytes = new Uint8Array(buffer).subarray(0, 4);

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true };
  }

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { valid: true };
  }

  // WebP: RIFF
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return { valid: true };
  }

  return { valid: false, error: "Invalid image format. Supported: JPEG, PNG, WebP" };
}

/**
 * Validate video file (size, type)
 */
export function validateVideo(buffer: Buffer | Uint8Array, maxSize = 100 * 1024 * 1024): { valid: boolean; error?: string } {
  if (buffer.byteLength > maxSize) {
    return { valid: false, error: `Video size exceeds ${maxSize / 1024 / 1024}MB limit` };
  }

  // Check magic bytes for common video formats
  const bytes = new Uint8Array(buffer).subarray(0, 12);

  // MP4 (ISO Base Media file format): 00 00 00 ?? 66 74 79 70 (ftyp)
  // Check for ftyp box at start
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return { valid: true };
  }

  // QuickTime MOV: same ftyp pattern but different major brand
  // Also MOV can start with "moov" but we'll check ftyp
  if (bytes[4] === 0x6d && bytes[5] === 0x6f && bytes[6] === 0x6f && bytes[7] === 0x76) {
    return { valid: true };
  }

  // WebM: 1A 45 DF A3 (EBML header)
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { valid: true };
  }

  return { valid: false, error: "Invalid video format. Supported: MP4, MOV, WebM" };
}
