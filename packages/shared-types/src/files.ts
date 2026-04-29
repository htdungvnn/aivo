// ============================================
// FILE UPLOAD & STORAGE
// ============================================

export interface FileUpload {
  id: string;
  userId: string;
  key: string; // R2 key
  bucket: string;
  filename: string;
  mimeType: string;
  size: number; // bytes
  uploadedAt: Date;
  expiresAt?: Date;
}

export interface UploadRequest {
  userId: string;
  filename: string;
  mimeType: string;
  bucket?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export interface ChunkInfo {
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  offset: number;
  isLast: boolean;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  dominantColor?: string;
  averageColor?: string;
}

export interface VideoClip {
  id: string;
  key: string;
  url?: string;
  duration: number; // seconds
  frameCount: number;
  fps: number;
  resolution: string; // e.g., "1920x1080"
  thumbnailUrl?: string;
}

export interface ProcessingJob {
  id: string;
  fileKey: string;
  userId: string;
  type: "image" | "video" | "audio";
  status: "queued" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  resultKey?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface Thumbnail {
  originalKey: string;
  thumbnailKey: string;
  width: number;
  height: number;
  format: string;
}

export interface StorageReference {
  key: string;
  bucket: string;
  url: string;
  presignedUrl?: string;
  expiresAt?: Date;
}

export interface SignedUrl {
  url: string;
  expiresAt: Date;
  method: "GET" | "PUT" | "DELETE";
}

export interface BucketConfig {
  name: string;
  region: string;
  corsRules: Array<{
    allowedOrigins: string[];
    allowedMethods: string[];
    maxAgeSeconds: number;
  }>;
}
