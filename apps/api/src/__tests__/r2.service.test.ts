import { describe, it, expect } from '@jest/globals';
import {
  generateR2Key,
  generatePresignedUrl,
  validateImage,
  validateVideo,
} from '../services/r2';

describe('R2 Storage Service', () => {
  describe('generateR2Key', () => {
    it('generates key with default prefix', () => {
      const key = generateR2Key('user-123', 'photo.jpg');
      expect(key).toMatch(/^body-images\/user-123\/\d+-[a-z0-9]+-photo\.jpg$/);
    });

    it('sanitizes filename', () => {
      const key = generateR2Key('user-123', 'photo name with spaces.jpg');
      expect(key).toContain('photo_name_with_spaces.jpg');
    });

    it('uses custom prefix', () => {
      const key = generateR2Key('user-123', 'test.png', 'custom-prefix');
      expect(key).toMatch(/^custom-prefix\/user-123\/\d+-[a-z0-9]+-test\.png$/);
    });

    it('includes timestamp and random suffix', () => {
      const key1 = generateR2Key('u', 'file.jpg');
      const key2 = generateR2Key('u', 'file.jpg');
      expect(key1).not.toBe(key2);
    });

    it('handles empty filename', () => {
      const key = generateR2Key('user-123', '');
      expect(key).toMatch(/^body-images\/user-123\/\d+-[a-z0-9]+-$/);
    });
  });

  describe('generatePresignedUrl', () => {
    it('generates URL with bucket name', () => {
      const bucket = { name: 'my-bucket' } as any;
      const url = generatePresignedUrl(bucket, 'key1', 'image/jpeg');
      expect(url).toBe('https://my-bucket.r2.dev/key1');
    });

    it('uses default bucket name if not provided', () => {
      const bucket = {} as any;
      const url = generatePresignedUrl(bucket, 'key2', 'image/jpeg');
      expect(url).toBe('https://bucket.r2.dev/key2');
    });
  });

  describe('validateImage', () => {
    it('accepts JPEG', () => {
      // JPEG magic bytes: FF D8 FF
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
      const result = validateImage(buffer);
      expect(result.valid).toBe(true);
    });

    it('accepts PNG', () => {
      // PNG magic: 89 50 4E 47
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const result = validateImage(buffer);
      expect(result.valid).toBe(true);
    });

    it('accepts WebP', () => {
      // WebP: RIFF
      const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46]);
      const result = validateImage(buffer);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid format', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = validateImage(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid image format');
    });

    it('rejects oversized image', () => {
      const buffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
      Buffer.from([0xff, 0xd8, 0xff, 0x00]); // JPEG bytes
      const result = validateImage(buffer, 5 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 5MB limit');
    });

    it('accepts any size within limit', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
      const result = validateImage(buffer, 10 * 1024 * 1024);
      expect(result.valid).toBe(true);
    });

    it('uses default 5MB size limit', () => {
      const buffer = Buffer.alloc(6 * 1024 * 1024);
      const result = validateImage(buffer); // default 5MB
      expect(result.valid).toBe(false);
    });
  });

  describe('validateVideo', () => {
    it('accepts MP4', () => {
      // MP4 ftyp at offset 4: 66 74 79 70
      const buffer = Buffer.alloc(12, 0);
      buffer[4] = 0x66; buffer[5] = 0x74; buffer[6] = 0x79; buffer[7] = 0x70;
      const result = validateVideo(buffer);
      expect(result.valid).toBe(true);
    });

    it('accepts MOV (moov)', () => {
      const buffer = Buffer.alloc(12, 0);
      buffer[4] = 0x6d; buffer[5] = 0x6f; buffer[6] = 0x6f; buffer[7] = 0x76;
      const result = validateVideo(buffer);
      expect(result.valid).toBe(true);
    });

    it('accepts WebM', () => {
      // EBML header: 1A 45 DF A3
      const buffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
      const result = validateVideo(buffer);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid video format', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = validateVideo(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid video format');
    });

    it('rejects oversized video', () => {
      const buffer = Buffer.alloc(101 * 1024 * 1024); // 101 MB
      // MP4 magic
      const result = validateVideo(buffer, 100 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 100MB limit');
    });

    it('uses default 100MB size limit', () => {
      const buffer = Buffer.alloc(101 * 1024 * 1024);
      const result = validateVideo(buffer);
      expect(result.valid).toBe(false);
    });
  });
});
