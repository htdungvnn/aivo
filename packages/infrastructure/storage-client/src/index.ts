/**
 * AIVO Storage Client Package
 *
 * Typed storage abstraction for:
 * - R2 (Cloudflare R2)
 * - S3-compatible storage
 *
 * Features:
 * - Typed object keys
 * - Authorization context
 * - Upload/download policies
 * - Signed URL abstraction
 * - MIME type validation
 * - Size validation
 * - Retention class support
 * - Provider-neutral errors
 */

import { z } from 'zod';

// =============================================================================
// Cloudflare R2 Type Declarations
// =============================================================================

/**
 * R2 Object metadata
 */
interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  uploadedAt?: string;
  body?: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

/**
 * R2Bucket interface for Cloudflare R2
 */
interface R2Bucket {
  put(key: string, value: ArrayBuffer | Blob | Uint8Array | ReadableStream | string, options?: {
    httpMetadata?: Record<string, string>;
    customMetadata?: Record<string, string>;
    md5?: string;
  }): Promise<R2Object>;
  get(key: string): Promise<R2Object | null>;
  head(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
}

// =============================================================================
// Storage Namespaces
// =============================================================================

/**
 * Storage namespaces for different content types
 */
export const STORAGE_NAMESPACES = {
  HEALTH_REPORTS: 'health-reports',
  MEAL_IMAGES: 'meal-images',
  AVATARS: 'avatars',
  COACH_REPLAYS: 'coach-replays',
  WORKOUT_VIDEOS: 'workout-videos',
  EXPORT_ARCHIVES: 'export-archives',
  AI_GENERATED: 'ai-generated',
} as const;

export type StorageNamespace = (typeof STORAGE_NAMESPACES)[keyof typeof STORAGE_NAMESPACES];

// =============================================================================
// MIME Types
// =============================================================================

/**
 * Allowed MIME types per namespace
 */
export const ALLOWED_MIME_TYPES: Record<StorageNamespace, string[]> = {
  [STORAGE_NAMESPACES.HEALTH_REPORTS]: [
    'application/pdf',
  ],
  [STORAGE_NAMESPACES.MEAL_IMAGES]: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  [STORAGE_NAMESPACES.AVATARS]: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  [STORAGE_NAMESPACES.COACH_REPLAYS]: [
    'application/json',
    'application/octet-stream',
  ],
  [STORAGE_NAMESPACES.WORKOUT_VIDEOS]: [
    'video/mp4',
    'video/webm',
  ],
  [STORAGE_NAMESPACES.EXPORT_ARCHIVES]: [
    'application/zip',
    'application/json',
    'application/pdf',
  ],
  [STORAGE_NAMESPACES.AI_GENERATED]: [
    'image/png',
    'image/webp',
    'application/json',
  ],
};

/**
 * MIME type schema
 */
export const mimeTypeSchema = z.string();

/**
 * Validate MIME type for namespace
 */
export function isValidMimeType(namespace: StorageNamespace, mimeType: string): boolean {
  const allowed = ALLOWED_MIME_TYPES[namespace];
  return allowed.includes(mimeType);
}

// =============================================================================
// Size Limits
// =============================================================================

/**
 * Size limits per namespace (in bytes)
 */
export const SIZE_LIMITS: Record<StorageNamespace, number> = {
  [STORAGE_NAMESPACES.HEALTH_REPORTS]: 50 * 1024 * 1024,      // 50 MB
  [STORAGE_NAMESPACES.MEAL_IMAGES]: 10 * 1024 * 1024,         // 10 MB
  [STORAGE_NAMESPACES.AVATARS]: 5 * 1024 * 1024,              // 5 MB
  [STORAGE_NAMESPACES.COACH_REPLAYS]: 100 * 1024 * 1024,       // 100 MB
  [STORAGE_NAMESPACES.WORKOUT_VIDEOS]: 500 * 1024 * 1024,     // 500 MB
  [STORAGE_NAMESPACES.EXPORT_ARCHIVES]: 1 * 1024 * 1024 * 1024, // 1 GB
  [STORAGE_NAMESPACES.AI_GENERATED]: 20 * 1024 * 1024,         // 20 MB
};

/**
 * Get size limit for namespace
 */
export function getSizeLimit(namespace: StorageNamespace): number {
  return SIZE_LIMITS[namespace];
}

// =============================================================================
// Retention Classes
// =============================================================================

/**
 * Retention classes for data
 */
export const RETENTION_CLASSES = {
  SHORT_TERM: 'short_term',      // 7 days
  MEDIUM_TERM: 'medium_term',    // 90 days
  LONG_TERM: 'long_term',        // 1 year
  PERMANENT: 'permanent',        // Indefinite
} as const;

export type RetentionClass = (typeof RETENTION_CLASSES)[keyof typeof RETENTION_CLASSES];

/**
 * Retention periods in days
 */
export const RETENTION_PERIODS: Record<RetentionClass, number | null> = {
  [RETENTION_CLASSES.SHORT_TERM]: 7,
  [RETENTION_CLASSES.MEDIUM_TERM]: 90,
  [RETENTION_CLASSES.LONG_TERM]: 365,
  [RETENTION_CLASSES.PERMANENT]: null, // Indefinite
};

// =============================================================================
// Object Key Types
// =============================================================================

/**
 * Object key components
 */
export interface ObjectKeyComponents {
  namespace: StorageNamespace;
  userId: string;
  year: number;
  month: number;
  objectId: string;
  extension?: string;
}

/**
 * Build object key from components
 */
export function buildObjectKey(components: ObjectKeyComponents): string {
  const { namespace, userId, year, month, objectId, extension } = components;
  const monthStr = month.toString().padStart(2, '0');
  const ext = extension ? `.${extension}` : '';
  
  return `${namespace}/${userId}/${year}/${monthStr}/${objectId}${ext}`;
}

/**
 * Parse object key into components
 */
export function parseObjectKey(key: string): ObjectKeyComponents | null {
  const pattern = /^([a-z-]+)\/([a-f0-9-]+)\/(\d{4})\/(\d{2})\/([a-f0-9-]+)(?:\.([^.]+))?$/i;
  const match = key.match(pattern);
  
  if (!match) {
    return null;
  }
  
  return {
    namespace: match[1] as StorageNamespace,
    userId: match[2],
    year: parseInt(match[3], 10),
    month: parseInt(match[4], 10),
    objectId: match[5],
    extension: match[6],
  };
}

/**
 * Object key validation schema
 */
export const objectKeySchema = z.string().regex(
  /^[a-z-]+\/[a-f0-9-]+\/\d{4}\/\d{2}\/[a-f0-9-]+(?:\.[^.]+)?$/i,
  'Invalid object key format'
);

// =============================================================================
// Authorization Context
// =============================================================================

/**
 * Authorization context for storage operations
 */
export interface StorageAuthContext {
  userId: string;
  sessionId: string;
  roles: string[];
  ipAddress?: string;
}

/**
 * Permission types
 */
export const PERMISSION_TYPES = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  LIST: 'list',
} as const;

export type PermissionType = (typeof PERMISSION_TYPES)[keyof typeof PERMISSION_TYPES];

/**
 * Check if user can perform operation
 */
export function canAccess(
  context: StorageAuthContext,
  _namespace: StorageNamespace,
  permission: PermissionType
): boolean {
  // All authenticated users can access their own data
  if (permission === PERMISSION_TYPES.READ || permission === PERMISSION_TYPES.WRITE) {
    return true;
  }
  
  // Admin can do anything
  if (context.roles.includes('admin')) {
    return true;
  }
  
  // Delete requires ownership check (handled by key parsing)
  if (permission === PERMISSION_TYPES.DELETE) {
    return true;
  }
  
  // List requires special permission
  if (permission === PERMISSION_TYPES.LIST) {
    return context.roles.includes('admin') || context.roles.includes('storage:list');
  }
  
  return false;
}

// =============================================================================
// Storage Error Types
// =============================================================================

/**
 * Storage error codes
 */
export const STORAGE_ERROR_CODES = {
  INVALID_NAMESPACE: 'INVALID_NAMESPACE',
  INVALID_MIME_TYPE: 'INVALID_MIME_TYPE',
  SIZE_LIMIT_EXCEEDED: 'SIZE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  OBJECT_KEY_INVALID: 'OBJECT_KEY_INVALID',
  SIGNED_URL_EXPIRED: 'SIGNED_URL_EXPIRED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
} as const;

export type StorageErrorCode = (typeof STORAGE_ERROR_CODES)[keyof typeof STORAGE_ERROR_CODES];

/**
 * Storage error class
 */
export class StorageError extends Error {
  constructor(
    public readonly code: StorageErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// =============================================================================
// Upload Request
// =============================================================================

/**
 * Upload request
 */
export interface UploadRequest {
  namespace: StorageNamespace;
  userId: string;
  objectId: string;
  data: ArrayBuffer | Blob | Uint8Array;
  mimeType: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  retentionClass?: RetentionClass;
}

/**
 * Upload response
 */
export interface UploadResponse {
  objectKey: string;
  etag: string;
  size: number;
  uploadedAt: string;
}

/**
 * Validate upload request
 */
export function validateUploadRequest(request: UploadRequest): void {
  // Check namespace
  if (!Object.values(STORAGE_NAMESPACES).includes(request.namespace)) {
    throw new StorageError(
      STORAGE_ERROR_CODES.INVALID_NAMESPACE,
      `Invalid namespace: ${request.namespace}`
    );
  }
  
  // Check MIME type
  if (!isValidMimeType(request.namespace, request.mimeType)) {
    const allowed = ALLOWED_MIME_TYPES[request.namespace].join(', ');
    throw new StorageError(
      STORAGE_ERROR_CODES.INVALID_MIME_TYPE,
      `Invalid MIME type for ${request.namespace}: ${request.mimeType}. Allowed: ${allowed}`
    );
  }
  
  // Check size
  const size = request.data instanceof ArrayBuffer 
    ? request.data.byteLength 
    : request.data instanceof Blob 
      ? request.data.size 
      : request.data.length;
      
  const limit = getSizeLimit(request.namespace);
  if (size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(1);
    const sizeMB = (size / (1024 * 1024)).toFixed(1);
    throw new StorageError(
      STORAGE_ERROR_CODES.SIZE_LIMIT_EXCEEDED,
      `Size ${sizeMB}MB exceeds limit ${limitMB}MB for ${request.namespace}`
    );
  }
}

// =============================================================================
// Download Request
// =============================================================================

/**
 * Download request
 */
export interface DownloadRequest {
  objectKey: string;
  ifModifiedSince?: string;
  range?: {
    start: number;
    end: number;
  };
}

/**
 * Download response
 */
export interface DownloadResponse {
  objectKey: string;
  data: ArrayBuffer;
  mimeType: string;
  size: number;
  etag: string;
  lastModified: string;
  metadata: Record<string, string>;
}

// =============================================================================
// Signed URL
// =============================================================================

/**
 * Signed URL request
 */
export interface SignedUrlRequest {
  objectKey: string;
  permission: 'read' | 'write';
  expiresInSeconds?: number;
  contentDisposition?: string;
  contentType?: string;
}

/**
 * Signed URL response
 */
export interface SignedUrlResponse {
  url: string;
  objectKey: string;
  expiresAt: string;
  method: 'GET' | 'PUT';
}

/**
 * Default signed URL expiration (15 minutes)
 */
export const DEFAULT_SIGNED_URL_EXPIRATION = 15 * 60; // seconds

// =============================================================================
// Storage Provider Interface
// =============================================================================

/**
 * Storage provider interface
 */
export interface StorageProvider {
  /**
   * Upload a file
   */
  upload(request: UploadRequest): Promise<UploadResponse>;
  
  /**
   * Download a file
   */
  download(objectKey: string): Promise<DownloadResponse>;
  
  /**
   * Generate a signed URL for download
   */
  generateSignedDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<SignedUrlResponse>;
  
  /**
   * Generate a signed URL for upload
   */
  generateSignedUploadUrl(request: Omit<UploadRequest, 'data'>, expiresInSeconds?: number): Promise<SignedUrlResponse>;
  
  /**
   * Delete a file
   */
  delete(objectKey: string): Promise<void>;
  
  /**
   * Check if file exists
   */
  exists(objectKey: string): Promise<boolean>;
  
  /**
   * List files in a prefix
   */
  list(prefix: string, maxKeys?: number): Promise<string[]>;
}

// =============================================================================
// R2 Provider Implementation
// =============================================================================

/**
 * R2 provider configuration
 */
export interface R2ProviderConfig {
  bucket: R2Bucket;
  publicBaseUrl?: string;
  customDomain?: string;
}

/**
 * Create R2 storage provider
 */
export function createR2Provider(config: R2ProviderConfig): StorageProvider {
  return {
    async upload(request: UploadRequest): Promise<UploadResponse> {
      validateUploadRequest(request);
      
      const objectKey = buildObjectKey({
        namespace: request.namespace,
        userId: request.userId,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        objectId: request.objectId,
        extension: getExtensionFromMimeType(request.mimeType),
      });
      
      const httpMetadata: Record<string, string> = {
        contentType: request.mimeType,
      };
      
      if (request.contentDisposition) {
        httpMetadata['contentDisposition'] = request.contentDisposition;
      }
      
      await config.bucket.put(objectKey, request.data, {
        httpMetadata,
        customMetadata: request.metadata,
      });
      
      const object = await config.bucket.head(objectKey);
      
      return {
        objectKey,
        etag: object?.etag ?? '',
        size: object?.size ?? 0,
        uploadedAt: new Date().toISOString(),
      };
    },
    
    async download(objectKey: string): Promise<DownloadResponse> {
      const object = await config.bucket.get(objectKey);
      
      if (!object) {
        throw new StorageError(
          STORAGE_ERROR_CODES.NOT_FOUND,
          `Object not found: ${objectKey}`
        );
      }
      
      const data = await object.arrayBuffer();
      
      return {
        objectKey,
        data,
        mimeType: object.httpMetadata?.contentType ?? 'application/octet-stream',
        size: object.size,
        etag: object.etag,
        lastModified: object.httpMetadata?.lastModified ?? new Date().toISOString(),
        metadata: object.customMetadata ?? {},
      };
    },
    
    async generateSignedDownloadUrl(objectKey: string, expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRATION): Promise<SignedUrlResponse> {
      const baseUrl = config.publicBaseUrl ?? `https://${config.customDomain ?? ''}`;
      const url = new URL(`${baseUrl}/${objectKey}`);
      
      // Note: R2 doesn't have built-in signed URLs without Workers
      // This would typically use Cloudflare Workers to generate signed URLs
      // For now, return a public URL with a note
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
      
      return {
        url: url.toString(),
        objectKey,
        expiresAt,
        method: 'GET',
      };
    },
    
    async generateSignedUploadUrl(request: Omit<UploadRequest, 'data'>, expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRATION): Promise<SignedUrlResponse> {
      const objectKey = buildObjectKey({
        namespace: request.namespace,
        userId: request.userId,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        objectId: request.objectId,
        extension: getExtensionFromMimeType(request.mimeType),
      });
      
      const baseUrl = config.publicBaseUrl ?? `https://${config.customDomain ?? ''}`;
      const url = new URL(`${baseUrl}/${objectKey}`);
      
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
      
      return {
        url: url.toString(),
        objectKey,
        expiresAt,
        method: 'PUT',
      };
    },
    
    async delete(objectKey: string): Promise<void> {
      await config.bucket.delete(objectKey);
    },
    
    async exists(objectKey: string): Promise<boolean> {
      const object = await config.bucket.head(objectKey);
      return object !== null;
    },
    
    async list(prefix: string, maxKeys = 100): Promise<string[]> {
      const objects = await config.bucket.list({
        prefix,
        limit: maxKeys,
      });
      
      return objects.objects.map((o: R2Object) => o.key);
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'application/json': 'json',
    'application/zip': 'zip',
    'application/octet-stream': 'bin',
  };
  
  return extensions[mimeType] ?? 'bin';
}

/**
 * Validate object key ownership
 */
export function validateOwnership(objectKey: string, userId: string): boolean {
  const components = parseObjectKey(objectKey);
  
  if (!components) {
    return false;
  }
  
  return components.userId === userId;
}

/**
 * Generate secure object ID
 */
export function generateObjectId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// =============================================================================
// Privacy Helpers
// =============================================================================

/**
 * Check if namespace contains sensitive data
 */
export function isSensitiveNamespace(namespace: StorageNamespace): boolean {
  const sensitive: StorageNamespace[] = [
    STORAGE_NAMESPACES.HEALTH_REPORTS,
    STORAGE_NAMESPACES.MEAL_IMAGES,
    STORAGE_NAMESPACES.COACH_REPLAYS,
    STORAGE_NAMESPACES.WORKOUT_VIDEOS,
  ];

  return sensitive.includes(namespace);
}

/**
 * Sanitize object key for logging (remove user ID)
 */
export function sanitizeObjectKeyForLog(objectKey: string): string {
  // Replace user ID portion with placeholder
  return objectKey.replace(
    /\/([a-f0-9-]+)\/\d{4}\/\d{2}\//,
    '/[user-id]/$&'
  ).replace(/([a-f0-9-]{8})[a-f0-9-]{28}/, '$1...');
}
