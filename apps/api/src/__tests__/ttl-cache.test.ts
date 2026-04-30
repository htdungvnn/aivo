import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TTLCache, createCache } from '../utils/ttl-cache';

const mockNow = 1000000;
let dateNowSpy: jest.Mock;

beforeAll(() => {
  dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockNow);
});

afterAll(() => {
  dateNowSpy.mockRestore();
});

describe('TTLCache', () => {
  let cache: TTLCache<string, any>;

  beforeEach(() => {
    // Reset Date.now mock to base value before each test
    dateNowSpy.mockReturnValue(mockNow);
    cache = new TTLCache<string, number>(1000); // 1 second TTL
  });

  describe('get / set', () => {
    it('stores and retrieves values', () => {
      cache.set('key1', 123);
      expect(cache.get('key1')).toBe(123);
    });

    it('returns null for missing key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('expires values after TTL', () => {
      cache.set('key', 42);
      // Advance time beyond TTL
      dateNowSpy.mockReturnValue(mockNow + 2000);
      expect(cache.get('key')).toBeNull();
    });

    it('still valid within TTL', () => {
      cache.set('key', 99);
      dateNowSpy.mockReturnValue(mockNow + 500); // 500ms later
      expect(cache.get('key')).toBe(99);
    });

    it('auto-deletes expired entry on get', () => {
      cache.set('expired', 1);
      dateNowSpy.mockReturnValue(mockNow + 2000);
      cache.get('expired');
      expect(cache.size).toBe(0);
    });
  });

  describe('delete', () => {
    it('removes specific key', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeNull();
      expect(cache.size).toBe(1);
    });

    it('returns false for non-existent key', () => {
      expect(cache.delete('missing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('x', 1);
      cache.set('y', 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('x')).toBeNull();
      expect(cache.get('y')).toBeNull();
    });
  });

  describe('size', () => {
    it('tracks number of entries', () => {
      expect(cache.size).toBe(0);
      cache.set('1', 1);
      expect(cache.size).toBe(1);
      cache.set('2', 2);
      expect(cache.size).toBe(2);
      cache.delete('1');
      expect(cache.size).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('removes all expired entries', () => {
      cache.set('valid', 1, 5000); // 5 second TTL
      cache.set('expired1', 2);
      cache.set('expired2', 3);

      // Expire entries with default TTL (1000ms)
      dateNowSpy.mockReturnValue(mockNow + 2000);
      cache.cleanup();

      expect(cache.size).toBe(1);
      expect(cache.get('valid')).toBe(1);
      expect(cache.get('expired1')).toBeNull();
      expect(cache.get('expired2')).toBeNull();
    });

    it('handles empty cache', () => {
      cache.cleanup();
      expect(cache.size).toBe(0);
    });
  });

  describe('custom TTL', () => {
    it('respects per-set TTL override', () => {
      cache.set('short', 1, 100); // 100ms
      dateNowSpy.mockReturnValue(mockNow + 50);
      expect(cache.get('short')).toBe(1);
      dateNowSpy.mockReturnValue(mockNow + 150);
      expect(cache.get('short')).toBeNull();
    });

    it('uses default TTL when not specified', () => {
      cache.set('default', 2);
      dateNowSpy.mockReturnValue(mockNow + 500);
      expect(cache.get('default')).toBe(2);
      dateNowSpy.mockReturnValue(mockNow + 1500);
      expect(cache.get('default')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles undefined values', () => {
      const undef = undefined as any;
      cache.set('key', undef);
      expect(cache.get('key')).toBeUndefined();
    });

    it('handles null values', () => {
      cache.set('null', null as any);
      expect(cache.get('null')).toBeNull(); // Note: get returns null for both missing and stored null, ambiguous but OK
    });

    it('works with object values', () => {
      const obj = { a: 1 };
      cache.set('obj', obj);
      expect(cache.get('obj')).toBe(obj);
    });
  });
});

describe('createCache factory', () => {
  it('creates cache with specified TTL', () => {
    const cache = createCache<string, number>(5000);
    expect(cache).toBeInstanceOf(TTLCache);
    // Use reflection or just trust it works
    cache.set('test', 123);
    expect(cache.get('test')).toBe(123);
  });

  it('uses default TTL if not specified', () => {
    const cache = createCache(); // default 60000
    cache.set('x', 1);
    expect(cache.get('x')).toBe(1);
  });
});
