/**
 * Image upload routes
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { NutritionError } from '../middleware';
import { generateR2Key, sha256Base64Url } from '../lib/crypto';
import type { ImageUploadRequestSchema } from '@repo/nutrition-types';

const upload = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

/**
 * Request image upload URL
 */
upload.post('/request', async (c) => {
  const userId = c.get('userId');
  
  // Parse and validate request
  const body = await c.req.json();
  const contentType = body.contentType;
  const contentLength = body.contentLength;
  
  // Validate content type
  if (!['image/jpeg', 'image/webp', 'image/png'].includes(contentType)) {
    throw NutritionError.badRequest('Invalid content type. Supported: image/jpeg, image/webp, image/png');
  }
  
  // Validate content length (max 10MB)
  if (contentLength < 1 || contentLength > 10 * 1024 * 1024) {
    throw NutritionError.badRequest('Content length must be between 1 byte and 10MB');
  }
  
  // Generate keys
  const analysisId = crypto.randomUUID();
  const r2Key = generateR2Key(userId, analysisId);
  const uploadId = crypto.randomUUID();
  
  // Create a pre-signed URL for direct R2 upload
  // In production, we'd use R2's presigned URL feature
  // For now, we'll upload through the worker
  
  // Return upload details
  return c.json({
    data: {
      analysisId,
      uploadId,
      r2Key,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'X-Upload-ID': uploadId,
          'X-Analysis-ID': analysisId,
        },
      },
    },
    requestId: c.get('requestId'),
  });
});

/**
 * Upload image directly to worker (alternative to presigned URL)
 */
upload.post('/', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  
  // Get headers
  const contentType = c.req.header('Content-Type') || '';
  const uploadId = c.req.header('X-Upload-ID');
  const analysisId = c.req.header('X-Analysis-ID');
  
  if (!contentType || !['image/jpeg', 'image/webp', 'image/png'].includes(contentType)) {
    throw NutritionError.badRequest('Invalid or missing Content-Type header');
  }
  
  if (!analysisId) {
    throw NutritionError.badRequest('Missing X-Analysis-ID header');
  }
  
  // Get image data
  const imageData = await c.req.arrayBuffer();
  
  // Validate size
  if (imageData.byteLength < 1000 || imageData.byteLength > 10 * 1024 * 1024) {
    throw NutritionError.badRequest('Image size must be between 1KB and 10MB');
  }
  
  // Compute hash for deduplication
  const imageHash = await sha256Base64Url(new Uint8Array(imageData));
  
  // Generate R2 key
  const r2Key = generateR2Key(userId, analysisId);
  
  // Upload to R2
  await c.env.MEAL_IMAGES.put(r2Key, imageData, {
    httpMetadata: {
      contentType,
      cacheControl: 'private, max-age=31536000',
    },
    customMetadata: {
      userId,
      analysisId,
      uploadId: uploadId || '',
      originalHash: imageHash,
      uploadedAt: new Date().toISOString(),
    },
  });
  
  // Log sanitized upload info
  console.log(`[${requestId}] Image uploaded: r2Key=${r2Key}, size=${imageData.byteLength}, hash=${imageHash.slice(0, 16)}...`);
  
  return c.json({
    data: {
      r2Key,
      imageHash,
      size: imageData.byteLength,
    },
    requestId,
  });
});

/**
 * Delete image
 */
upload.delete('/:r2Key', async (c) => {
  const userId = c.get('userId');
  const r2Key = decodeURIComponent(c.req.param('r2Key'));
  
  // Verify ownership by checking metadata
  const object = await c.env.MEAL_IMAGES.head(r2Key);
  
  if (!object) {
    throw NutritionError.notFound('Image not found');
  }
  
  const metadata = object.customMetadata;
  if (!metadata || metadata.userId !== userId) {
    throw NutritionError.forbidden('You do not have access to this image');
  }
  
  // Delete from R2
  await c.env.MEAL_IMAGES.delete(r2Key);
  
  return c.json({
    data: {
      deleted: true,
      r2Key,
    },
    requestId: c.get('requestId'),
  });
});

/**
 * Get presigned download URL (internal use only - not exposed to client)
 */
upload.get('/presigned/:r2Key', async (c) => {
  const userId = c.get('userId');
  const r2Key = decodeURIComponent(c.req.param('r2Key'));
  
  // Verify ownership
  const object = await c.env.MEAL_IMAGES.head(r2Key);
  
  if (!object) {
    throw NutritionError.notFound('Image not found');
  }
  
  const metadata = object.customMetadata;
  if (!metadata || metadata.userId !== userId) {
    throw NutritionError.forbidden('You do not have access to this image');
  }
  
  // In production, generate a time-limited presigned URL
  // For now, return internal reference
  return c.json({
    data: {
      r2Key,
      // In production: signedUrl with expiry
    },
    requestId: c.get('requestId'),
  });
});

export default upload;
