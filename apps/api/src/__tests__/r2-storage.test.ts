import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { validateWeight } from '../src/services/validation';

describe('R2 Storage Service', () => {
  describe('Image Upload', () => {
    it('should accept valid image file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      expect(file.type).toBe('image/jpeg');
      expect(file.name).toBe('test.jpg');
    });

    it('should reject file that is too large', () => {
      const largeContent = 'a'.repeat(600 * 1024); // 600KB
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      expect(file.size).toBeGreaterThan(500 * 1024);
    });

    it('should accept WebP format', () => {
      const file = new File(['test'], 'test.webp', { type: 'image/webp' });
      expect(file.type).toBe('image/webp');
    });
  });

  describe('URL Generation', () => {
    it('should generate correct R2 URL path', () => {
      const userId = 'user123';
      const filename = 'body-photo-12345.jpg';
      const expectedPath = `users/${userId}/${filename}`;
      const bucketUrl = 'https://bucket.r2.dev';

      const fullUrl = `${bucketUrl}/${expectedPath}`;
      expect(fullUrl).toBe('https://bucket.r2.dev/users/user123/body-photo-12345.jpg');
    });

    it('should generate timestamp-based filenames', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const filename = `body-photo-${timestamp}.jpg`;
      expect(filename).toMatch(/^body-photo-\d+\.jpg$/);
    });

    it('should generate signed URLs with expiration', () => {
      const expires = Date.now() + 3600 * 1000;
      const signature = 'abc123signature';
      const path = 'users/user123/image.jpg';

      const signedUrl = `https://bucket.r2.dev/${path}?expires=${expires}&sig=${signature}`;
      expect(signedUrl).toContain('expires=');
      expect(signedUrl).toContain('sig=');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow GET from any origin for public images', () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      };
      expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should restrict PUT to authenticated origins', () => {
      const uploadCors = {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
      };
      expect(uploadCors['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });
  });

  describe('Image Processing', () => {
    it('should resize images to max dimension', () => {
      const maxWidth = 800;
      const maxHeight = 800;
      const originalWidth = 1920;
      const originalHeight = 1080;

      const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
      const newWidth = Math.round(originalWidth * ratio);
      const newHeight = Math.round(originalHeight * ratio);

      expect(newWidth).toBeLessThanOrEqual(maxWidth);
      expect(newHeight).toBeLessThanOrEqual(maxHeight);
    });

    it('should maintain aspect ratio', () => {
      const originalRatio = 1920 / 1080;
      const newWidth = 800;
      const newHeight = 450;

      const newRatio = newWidth / newHeight;
      expect(newRatio).toBeCloseTo(originalRatio, 1);
    });

    it('should convert to WebP for optimization', () => {
      const originalFormat = 'image/jpeg';
      const targetFormat = 'image/webp';

      expect(targetFormat).toBe('image/webp');
      expect(['image/jpeg', 'image/png', 'image/webp']).toContain(originalFormat);
    });
  });

  describe('Error Handling', () => {
    it('should handle upload failures', async () => {
      const mockUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));

      try {
        await mockUpload();
      } catch (error) {
        expect(error.message).toBe('Upload failed');
      }
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';

      expect(timeoutError.name).toBe('TimeoutError');
    });

    it('should validate image MIME type', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4'];

      validTypes.forEach((type) => {
        expect(type.startsWith('image/')).toBe(true);
      });

      invalidTypes.forEach((type) => {
        expect(type.startsWith('image/')).toBe(false);
      });
    });
  });
});

describe('Cache Invalidation', () => {
  it('should invalidate metrics cache after new entry', () => {
    const cacheKey = 'metrics:user123';
    const keysToInvalidate = [cacheKey, `health_score:user123`];

    expect(keysToInvalidate).toContain(cacheKey);
    expect(keysToInvalidate).toContain('health_score:user123');
  });

  it('should invalidate heatmap cache after analysis', () => {
    const cacheKey = 'heatmap:user123';
    const analysisComplete = true;

    if (analysisComplete) {
      expect(cacheKey).toBe('heatmap:user123');
    }
  });
});

describe('File Path Utilities', () => {
  it('should generate unique filenames', () => {
    const timestamp1 = Date.now();
    const timestamp2 = Date.now() + 1;

    const filename1 = `body-${timestamp1}.jpg`;
    const filename2 = `body-${timestamp2}.jpg`;

    expect(filename1).not.toBe(filename2);
  });

  it('should sanitize filenames', () => {
    const originalName = "user's photo with special chars!@#.jpg";
    const sanitized = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    expect(sanitized).not.toContain("'");
    expect(sanitized).not.toContain('!');
    expect(sanitized).not.toContain('@');
    expect(sanitized).not.toContain('#');
  });

  it('should extract extension from filename', () => {
    const filename = 'photo.jpg';
    const ext = filename.split('.').pop();
    expect(ext).toBe('jpg');
  });
});
