import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { Hono } from 'hono';
import { z } from 'zod';
import { createDrizzleInstance } from '@aivo/db';
import { validateBodyMetrics } from '../src/services/validation';

// Mock environment
const mockEnv = {
  DB: {
    execute: vi.fn(),
    executeSql: vi.fn(),
    batch: vi.fn(),
    query: vi.fn(),
    migrate: vi.fn(),
    raw: vi.fn(),
    _connect: vi.fn(),
    _dispose: vi.fn(),
    drizzle: vi.fn(),
  },
  BODY_INSIGHTS_CACHE: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  OPENAI_API_KEY: 'test-openai-key',
  AUTH_SECRET: 'test-secret',
};

describe('API Health Check', () => {
  it('should return health status', async () => {
    const app = new Hono();
    app.get('/health', () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 });

    const request = new Request('http://localhost:8787/health');
    const response = await app.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });
});

describe('Body Metrics Validation', () => {
  describe('validateWeight', () => {
    it('should validate normal weight', () => {
      const result = validateBodyMetrics({
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative weight', () => {
      const result = validateBodyMetrics({
        weight: -10,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be positive');
    });

    it('should warn on low weight', () => {
      const result = validateBodyMetrics({
        weight: 25,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight seems too low for a healthy adult');
    });

    it('should warn on high weight', () => {
      const result = validateBodyMetrics({
        weight: 350,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight seems too high - please verify');
    });
  });

  describe('validateBodyFat', () => {
    it('should validate normal body fat', () => {
      const result = validateBodyMetrics({
        bodyFatPercentage: 0.15,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject body fat above 100%', () => {
      const result = validateBodyMetrics({
        bodyFatPercentage: 1.5,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat percentage must be between 0 and 100');
    });

    it('should reject essential fat below minimum', () => {
      const result = validateBodyMetrics({
        bodyFatPercentage: 0.01,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat cannot be below 2% (essential fat)');
    });
  });

  describe('validateMuscleMass', () => {
    it('should validate normal muscle mass', () => {
      const result = validateBodyMetrics({
        muscleMass: 30,
        weight: 70,
        height: 175,
        gender: 'male',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject muscle mass exceeding weight', () => {
      const result = validateBodyMetrics({
        muscleMass: 80,
        weight: 70,
        height: 175,
        gender: 'male',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Muscle mass cannot exceed total body weight');
    });

    it('should validate positive muscle mass', () => {
      const result = validateBodyMetrics({
        muscleMass: -5,
        weight: 70,
        height: 175,
        gender: 'male',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Muscle mass must be positive');
    });
  });

  describe('validateCompleteMetrics', () => {
    it('should handle all metrics together', () => {
      const result = validateBodyMetrics({
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
        bodyFatPercentage: 0.15,
        muscleMass: 30,
      });

      expect(result.valid).toBe(true);
    });

    it('should provide suggestions for inconsistent data', () => {
      const result = validateBodyMetrics({
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
        bodyFatPercentage: 0.05,
        muscleMass: 65, // 65/70 = 93% muscle, impossible
      });

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('The combination of weight, body fat, and muscle mass seems inconsistent');
    });
  });
});

describe('Body Heatmap Vector Data', () => {
  it('should accept valid vector data structure', () => {
    const vectorData = [
      { x: 50, y: 42, muscle: 'chest', intensity: 0.7 },
      { x: 24, y: 38, muscle: 'shoulders', intensity: 0.5 },
    ];

    expect(vectorData).toHaveLength(2);
    expect(vectorData[0].x).toBeGreaterThanOrEqual(0);
    expect(vectorData[0].x).toBeLessThanOrEqual(100);
    expect(vectorData[0].intensity).toBeGreaterThanOrEqual(0);
    expect(vectorData[0].intensity).toBeLessThanOrEqual(1);
  });

  it('should group and average duplicate points', () => {
    const vectorData = [
      { x: 50, y: 42, muscle: 'chest', intensity: 0.6 },
      { x: 50, y: 42, muscle: 'chest', intensity: 0.8 },
    ];

    const groups: Record<string, { x: number; y: number; totalI: number; count: number }> = {};
    vectorData.forEach((point) => {
      const key = `${point.muscle}_${Math.round(point.x)}_${Math.round(point.y)}`;
      if (!groups[key]) {
        groups[key] = { x: point.x, y: point.y, totalI: 0, count: 0 };
      }
      groups[key].totalI += point.intensity;
      groups[key].count++;
    });

    const avgIntensity = groups[Object.keys(groups)[0]].totalI / groups[Object.keys(groups)[0]].count;
    expect(avgIntensity).toBe(0.7);
  });
});

describe('Cache Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store and retrieve from KV cache', async () => {
    const mockData = { test: 'data' };
    const key = 'test-key';

    // Mock KV operations
    mockEnv.BODY_INSIGHTS_CACHE.get = vi.fn().mockResolvedValue(JSON.stringify(mockData));
    mockEnv.BODY_INSIGHTS_CACHE.put = vi.fn().mockResolvedValue(undefined);

    const cached = await mockEnv.BODY_INSIGHTS_CACHE.get(key);
    expect(cached).toBe(JSON.stringify(mockData));

    await mockEnv.BODY_INSIGHTS_CACHE.put(key, mockData, { expirationTtl: 300 });
    expect(mockEnv.BODY_INSIGHTS_CACHE.put).toHaveBeenCalled();
  });

  it('should handle cache miss', async () => {
    mockEnv.BODY_INSIGHTS_CACHE.get = vi.fn().mockResolvedValue(null);

    const cached = await mockEnv.BODY_INSIGHTS_CACHE.get('nonexistent');
    expect(cached).toBeNull();
  });
});

describe('Color Scale Functions', () => {
  const getColor = (intensity: number, scale: string = 'heat'): { baseColor: string; opacity: number } => {
    const i = Math.max(0, Math.min(1, intensity));
    const opacity = 0.4 + i * 0.5;

    switch (scale) {
      case 'cool':
        return { baseColor: 'rgba(6, 182, 212, ', opacity };
      case 'monochrome':
        return { baseColor: 'rgba(255, 255, 255, ', opacity };
      case 'heat':
      default:
        if (i < 0.2) return { baseColor: 'rgba(59, 130, 246, ', opacity };
        if (i < 0.4) return { baseColor: 'rgba(6, 182, 212, ', opacity };
        if (i < 0.6) return { baseColor: 'rgba(34, 197, 94, ', opacity };
        if (i < 0.8) return { baseColor: 'rgba(234, 179, 8, ', opacity };
        return { baseColor: 'rgba(249, 115, 22, ', opacity };
    }
  };

  it('should return blue for low intensity', () => {
    const color = getColor(0.1, 'heat');
    expect(color.baseColor).toBe('rgba(59, 130, 246, ');
    expect(color.opacity).toBeGreaterThan(0.4);
  });

  it('should return green for medium intensity', () => {
    const color = getColor(0.5, 'heat');
    expect(color.baseColor).toBe('rgba(34, 197, 94, ');
  });

  it('should return orange for high intensity', () => {
    const color = getColor(0.9, 'heat');
    expect(color.baseColor).toBe('rgba(249, 115, 22, ');
  });

  it('should respect cool scale', () => {
    const color = getColor(0.5, 'cool');
    expect(color.baseColor).toBe('rgba(6, 182, 212, ');
  });

  it('should clamp intensity to valid range', () => {
    const lowColor = getColor(-0.5, 'heat');
    const highColor = getColor(1.5, 'heat');
    expect(lowColor.baseColor).toBe('rgba(59, 130, 246, ');
    expect(highColor.baseColor).toBe('rgba(249, 115, 22, ');
  });
});

describe('Muscle Positions', () => {
  const MUSCLE_POSITIONS = {
    chest: { x: 50, y: 42 },
    back: { x: 50, y: 55 },
    shoulders: { x: 24, y: 38 },
    biceps: { x: 18, y: 45 },
    triceps: { x: 22, y: 50 },
    abs: { x: 50, y: 62 },
    core: { x: 50, y: 68 },
    quadriceps: { x: 30, y: 82 },
    hamstrings: { x: 30, y: 92 },
    glutes: { x: 38, y: 82 },
    calves: { x: 30, y: 100 },
    neck: { x: 50, y: 15 },
  };

  it('should have valid positions for all muscles', () => {
    Object.entries(MUSCLE_POSITIONS).forEach(([muscle, pos]) => {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(100);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(100);
    });
  });

  it('should have unique approximate positions', () => {
    const positions = Object.values(MUSCLE_POSITIONS).map(p => `${p.x}-${p.y}`);
    // Check that positions are distinct (within rounding)
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(positions.length);
  });
});
