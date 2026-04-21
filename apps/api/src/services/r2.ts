/**
 * R2 Storage Service for AIVO API
 * Handles image uploads, downloads, and management for Cloudflare R2
 */

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
  return `https://${bucket.name}.r2.dev/${key}`;
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
    url: `https://${bucket.name}.r2.dev/${key}`,
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

    return {
      key,
      url: `https://${bucket.name}.r2.dev/${key}`,
      size: object.size,
      contentType: object.httpMetadata?.contentType || "application/octet-stream",
      uploadedAt: new Date(object.uploaded || Date.now()),
    };
  } catch (error: any) {
    if (error.code === "NotFound") {
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

  return objects.objects.map((obj) => ({
    key: obj.key,
    url: `https://${bucket.name}.r2.dev/${obj.key}`,
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
