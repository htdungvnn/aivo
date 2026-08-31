/**
 * Storage Client Tests
 */

import { describe, it, expect } from 'vitest';
import {
  STORAGE_NAMESPACES,
  ALLOWED_MIME_TYPES,
  SIZE_LIMITS,
  RETENTION_CLASSES,
  isValidMimeType,
  getSizeLimit,
  buildObjectKey,
  parseObjectKey,
  validateOwnership,
  generateObjectId,
  isSensitiveNamespace,
  sanitizeObjectKeyForLog,
  validateUploadRequest,
  StorageError,
  STORAGE_ERROR_CODES,
} from '../src/index';

describe('Storage Namespaces', () => {
  it('should have all expected namespaces', () => {
    expect(STORAGE_NAMESPACES.HEALTH_REPORTS).toBe('health-reports');
    expect(STORAGE_NAMESPACES.MEAL_IMAGES).toBe('meal-images');
    expect(STORAGE_NAMESPACES.AVATARS).toBe('avatars');
    expect(STORAGE_NAMESPACES.COACH_REPLAYS).toBe('coach-replays');
  });

  it('should have MIME types for each namespace', () => {
    const namespaces = Object.values(STORAGE_NAMESPACES);
    
    for (const ns of namespaces) {
      expect(ALLOWED_MIME_TYPES[ns]).toBeDefined();
      expect(Array.isArray(ALLOWED_MIME_TYPES[ns])).toBe(true);
      expect(ALLOWED_MIME_TYPES[ns].length).toBeGreaterThan(0);
    }
  });

  it('should have size limits for each namespace', () => {
    const namespaces = Object.values(STORAGE_NAMESPACES);
    
    for (const ns of namespaces) {
      expect(SIZE_LIMITS[ns]).toBeDefined();
      expect(typeof SIZE_LIMITS[ns]).toBe('number');
      expect(SIZE_LIMITS[ns]).toBeGreaterThan(0);
    }
  });
});

describe('MIME Type Validation', () => {
  it('should accept valid MIME type for meal images', () => {
    expect(isValidMimeType(STORAGE_NAMESPACES.MEAL_IMAGES, 'image/jpeg')).toBe(true);
    expect(isValidMimeType(STORAGE_NAMESPACES.MEAL_IMAGES, 'image/png')).toBe(true);
    expect(isValidMimeType(STORAGE_NAMESPACES.MEAL_IMAGES, 'image/webp')).toBe(true);
  });

  it('should reject invalid MIME type for meal images', () => {
    expect(isValidMimeType(STORAGE_NAMESPACES.MEAL_IMAGES, 'application/pdf')).toBe(false);
    expect(isValidMimeType(STORAGE_NAMESPACES.MEAL_IMAGES, 'video/mp4')).toBe(false);
  });

  it('should only accept PDF for health reports', () => {
    expect(isValidMimeType(STORAGE_NAMESPACES.HEALTH_REPORTS, 'application/pdf')).toBe(true);
    expect(isValidMimeType(STORAGE_NAMESPACES.HEALTH_REPORTS, 'image/jpeg')).toBe(false);
  });
});

describe('Size Limits', () => {
  it('should return correct size limits', () => {
    expect(getSizeLimit(STORAGE_NAMESPACES.MEAL_IMAGES)).toBe(10 * 1024 * 1024); // 10 MB
    expect(getSizeLimit(STORAGE_NAMESPACES.HEALTH_REPORTS)).toBe(50 * 1024 * 1024); // 50 MB
    expect(getSizeLimit(STORAGE_NAMESPACES.AVATARS)).toBe(5 * 1024 * 1024); // 5 MB
  });
});

describe('Object Key Building', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const objectId = 'abc12345-1234-1234-1234-123456789012';

  it('should build valid object key', () => {
    const key = buildObjectKey({
      namespace: STORAGE_NAMESPACES.MEAL_IMAGES,
      userId,
      year: 2024,
      month: 1,
      objectId,
      extension: 'jpg',
    });

    expect(key).toBe(`meal-images/${userId}/2024/01/${objectId}.jpg`);
  });

  it('should pad month with leading zero', () => {
    const key = buildObjectKey({
      namespace: STORAGE_NAMESPACES.AVATARS,
      userId,
      year: 2024,
      month: 9,
      objectId,
      extension: 'png',
    });

    expect(key).toContain('/2024/09/');
  });

  it('should handle object without extension', () => {
    const key = buildObjectKey({
      namespace: STORAGE_NAMESPACES.COACH_REPLAYS,
      userId,
      year: 2024,
      month: 12,
      objectId,
    });

    expect(key).toBe(`coach-replays/${userId}/2024/12/${objectId}`);
    expect(key).not.toContain('.');
  });
});

describe('Object Key Parsing', () => {
  const validKey = 'meal-images/123e4567-e89b-12d3-a456-426614174000/2024/01/abc12345-1234-1234-1234-123456789012.jpg';

  it('should parse valid object key', () => {
    const result = parseObjectKey(validKey);
    
    expect(result).not.toBeNull();
    expect(result?.namespace).toBe(STORAGE_NAMESPACES.MEAL_IMAGES);
    expect(result?.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result?.year).toBe(2024);
    expect(result?.month).toBe(1);
    expect(result?.objectId).toBe('abc12345-1234-1234-1234-123456789012');
    expect(result?.extension).toBe('jpg');
  });

  it('should parse key without extension', () => {
    const keyWithoutExt = 'coach-replays/123e4567-e89b-12d3-a456-426614174000/2024/01/abc12345-1234-1234-1234-123456789012';
    const result = parseObjectKey(keyWithoutExt);
    
    expect(result).not.toBeNull();
    expect(result?.extension).toBeUndefined();
  });

  it('should return null for invalid key format', () => {
    const invalidKeys = [
      'invalid-key',
      'no-user-id/2024/01/id',
      'space in key/123e4567-e89b-12d3-a456-426614174000/2024/01/id.jpg',
      'UPPERCASE/123e4567-e89b-12d3-a456-426614174000/2024/01/id.jpg',
    ];
    
    for (const key of invalidKeys) {
      expect(parseObjectKey(key)).toBeNull();
    }
  });
});

describe('Ownership Validation', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const validKey = `meal-images/${userId}/2024/01/abc12345-1234-1234-1234-123456789012.jpg`;

  it('should validate correct ownership', () => {
    expect(validateOwnership(validKey, userId)).toBe(true);
  });

  it('should reject incorrect ownership', () => {
    const differentUserId = '999e4567-e89b-12d3-a456-426614174000';
    expect(validateOwnership(validKey, differentUserId)).toBe(false);
  });

  it('should return false for invalid key', () => {
    expect(validateOwnership('invalid-key', userId)).toBe(false);
  });
});

describe('Object ID Generation', () => {
  it('should generate valid UUID-like ID', () => {
    const id = generateObjectId();
    
    expect(id).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateObjectId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('Privacy Helpers', () => {
  it('should identify sensitive namespaces', () => {
    expect(isSensitiveNamespace(STORAGE_NAMESPACES.HEALTH_REPORTS)).toBe(true);
    expect(isSensitiveNamespace(STORAGE_NAMESPACES.MEAL_IMAGES)).toBe(true);
    expect(isSensitiveNamespace(STORAGE_NAMESPACES.COACH_REPLAYS)).toBe(true);
    expect(isSensitiveNamespace(STORAGE_NAMESPACES.AVATARS)).toBe(false);
  });

  it('should sanitize object key for logging', () => {
    const key = 'meal-images/123e4567-e89b-12d3-a456-426614174000/2024/01/abc12345-1234-1234-1234-123456789012.jpg';
    const sanitized = sanitizeObjectKeyForLog(key);
    
    expect(sanitized).toContain('[user-id]');
    expect(sanitized).not.toContain('123e4567-e89b-12d3-a456-426614174000');
  });
});

describe('Upload Request Validation', () => {
  it('should validate valid upload request', () => {
    const request = {
      namespace: STORAGE_NAMESPACES.MEAL_IMAGES,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      objectId: 'abc12345-1234-1234-1234-123456789012',
      data: new Uint8Array(1024), // 1 KB
      mimeType: 'image/jpeg',
    };

    expect(() => validateUploadRequest(request)).not.toThrow();
  });

  it('should reject invalid namespace', () => {
    const request = {
      namespace: 'invalid-namespace' as any,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      objectId: 'abc12345-1234-1234-1234-123456789012',
      data: new Uint8Array(1024),
      mimeType: 'image/jpeg',
    };

    expect(() => validateUploadRequest(request)).toThrow(StorageError);
    expect(() => validateUploadRequest(request)).toThrow(`Invalid namespace`);
  });

  it('should reject invalid MIME type', () => {
    const request = {
      namespace: STORAGE_NAMESPACES.MEAL_IMAGES,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      objectId: 'abc12345-1234-1234-1234-123456789012',
      data: new Uint8Array(1024),
      mimeType: 'application/pdf', // Invalid for meal images
    };

    expect(() => validateUploadRequest(request)).toThrow(StorageError);
    expect(() => validateUploadRequest(request)).toThrow(`Invalid MIME type`);
  });

  it('should reject oversized file', () => {
    const request = {
      namespace: STORAGE_NAMESPACES.MEAL_IMAGES,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      objectId: 'abc12345-1234-1234-1234-123456789012',
      data: new Uint8Array(20 * 1024 * 1024), // 20 MB (exceeds 10 MB limit)
      mimeType: 'image/jpeg',
    };

    expect(() => validateUploadRequest(request)).toThrow(StorageError);
    expect(() => validateUploadRequest(request)).toThrow(`Size .* exceeds limit`);
  });
});

describe('Storage Error', () => {
  it('should create error with code and message', () => {
    const error = new StorageError(
      STORAGE_ERROR_CODES.NOT_FOUND,
      'Object not found',
      { objectKey: 'test-key' }
    );

    expect(error.code).toBe(STORAGE_ERROR_CODES.NOT_FOUND);
    expect(error.message).toBe('Object not found');
    expect(error.details).toEqual({ objectKey: 'test-key' });
    expect(error.name).toBe('StorageError');
  });
});

describe('Retention Classes', () => {
  it('should have all expected retention classes', () => {
    expect(RETENTION_CLASSES.SHORT_TERM).toBe('short_term');
    expect(RETENTION_CLASSES.MEDIUM_TERM).toBe('medium_term');
    expect(RETENTION_CLASSES.LONG_TERM).toBe('long_term');
    expect(RETENTION_CLASSES.PERMANENT).toBe('permanent');
  });
});
