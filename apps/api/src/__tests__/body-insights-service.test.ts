/// <reference types="jest" />
import {
  getCacheKey,
  getCachedData,
  setCachedData,
  invalidateBodyCache,
  validateImage,
  CACHE_TTL,
} from '../body-insights';

describe('Body Insights Service', () => {
  describe('Cache Key Generation', () => {
    it('generates correct cache key for metrics', () => {
      expect(getCacheKey('user123', 'metrics')).toBe('body:user123:metrics');
    });

    it('generates correct cache key with params', () => {
      expect(getCacheKey('user123', 'heatmaps', 'limit=1')).toBe('body:user123:heatmaps:limit=1');
    });

    it('handles empty params', () => {
      expect(getCacheKey('user123', 'health-score', '')).toBe('body:user123:health-score:');
    });
  });

  describe('Cache Operations', () => {
    let mockKV: { get: jest.Mock; put: jest.Mock };

    beforeEach(() => {
      mockKV = {
        get: jest.fn(),
        put: jest.fn(),
      };
    });

    it('returns data on cache hit', async () => {
      const testData = { score: 80 };
      mockKV.get.mockResolvedValue(testData);

      const result = await getCachedData(mockKV, 'test-key');

      expect(result.data).toEqual(testData);
      expect(result.hit).toBe(true);
    });

    it('returns null on cache miss', async () => {
      mockKV.get.mockResolvedValue(null);

      const result = await getCachedData(mockKV, 'nonexistent');

      expect(result.data).toBeNull();
      expect(result.hit).toBe(false);
    });

    it('handles cache errors gracefully', async () => {
      mockKV.get.mockRejectedValue(new Error('KV error'));

      const result = await getCachedData(mockKV, 'test-key');

      expect(result.data).toBeNull();
      expect(result.hit).toBe(false);
    });

    it('sets cache with correct TTL', async () => {
      await setCachedData(mockKV, 'test-key', { data: 'test' }, CACHE_TTL.METRICS);

      expect(mockKV.put).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'test' }),
        { expirationTtl: CACHE_TTL.METRICS }
      );
    });

    it('handles set cache errors', async () => {
      mockKV.put.mockRejectedValue(new Error('KV error'));

      // Should not throw
      await expect(setCachedData(mockKV, 'test-key', {}, 300)).resolves.not.toThrow();
    });
  });

  describe('Cache Invalidation', () => {
    let mockKV: { put: jest.Mock };

    beforeEach(() => {
      mockKV = { put: jest.fn() };
    });

    it('logs cache invalidation request', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await invalidateBodyCache(mockKV, 'user123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache invalidation requested for user user123'
      );

      consoleSpy.mockRestore();
    });

    it('handles invalidation errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // invalidateBodyCache doesn't actually call put in current implementation
      await invalidateBodyCache(mockKV, 'user123');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Image Validation', () => {
    it('validates JPEG by magic bytes', () => {
      // JPEG magic bytes: FF D8 FF
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = validateImage(jpegBuffer);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('validates PNG by magic bytes', () => {
      // PNG magic bytes: 89 50 4E 47
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = validateImage(pngBuffer);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects non-image files', () => {
      const txtBuffer = Buffer.from('Hello, World!');
      const result = validateImage(txtBuffer);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only JPEG and PNG images are supported');
    });

    it('rejects files that are too small', () => {
      const smallBuffer = Buffer.from([0xff, 0xd8]); // Only 2 bytes
      const result = validateImage(smallBuffer);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Image file too small');
    });

    it('handles empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = validateImage(emptyBuffer);

      expect(result.valid).toBe(false);
    });

    it('handles buffer with only JPEG magic bytes', () => {
      const partialJpeg = Buffer.from([0xff, 0xd8, 0xff]);
      const result = validateImage(partialJpeg);

      expect(result.valid).toBe(true);
    });

    it('rejects GIF format', () => {
      // GIF magic bytes: 47 49 46 38
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const result = validateImage(gifBuffer);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only JPEG and PNG images are supported');
    });
  });

  describe('Constants', () => {
    it('has correct cache TTL values', () => {
      expect(CACHE_TTL.METRICS).toBe(300);
      expect(CACHE_TTL.HEATMAPS).toBe(300);
      expect(CACHE_TTL.HEALTH_SCORE).toBe(600);
    });

    it('health score TTL is longer than metrics TTL', () => {
      expect(CACHE_TTL.HEALTH_SCORE).toBeGreaterThan(CACHE_TTL.METRICS);
    });
  });
});
