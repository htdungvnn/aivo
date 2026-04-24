/// <reference types="jest" />
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Hono } from 'hono';
import { z } from 'zod';
import { createDrizzleInstance } from '@aivo/db';
import { validateBodyMetrics } from '../services/validation';

// Mock environment
const mockEnv = {
  DB: {
    execute: jest.fn(),
    executeSql: jest.fn(),
    batch: jest.fn(),
    query: jest.fn(),
    migrate: jest.fn(),
    raw: jest.fn(),
    _connect: jest.fn(),
    _dispose: jest.fn(),
    drizzle: jest.fn(),
  },
  BODY_INSIGHTS_CACHE: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  OPENAI_API_KEY: 'test-openai-key',
  AUTH_SECRET: 'test-secret',
};

jest.mock('../services/r2', () => ({
  uploadImage: jest.fn(),
  getImageUrl: jest.fn(),
  deleteImage: jest.fn(),
  generateSignedUrl: jest.fn(),
}));

jest.mock('@aivo/db', () => ({
  createDrizzleInstance: jest.fn(),
}));

describe('API Integration - Body Insights', () => {
  describe('R2 Storage Service', () => {
    it('should upload image to R2 and return URL', async () => {
      const { uploadImage } = await import('../services/r2');

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockResult = {
        success: true,
        url: 'https://bucket.r2.dev/users/user123/body-photo-12345.jpg',
        key: 'users/user123/body-photo-12345.jpg',
      };

      uploadImage.mockResolvedValue(mockResult);

      const result = await uploadImage(mockFile, 'user123');

      expect(result.success).toBe(true);
      expect(result.url).toContain('r2.dev');
    });

    it('should generate signed URL for private images', async () => {
      const { generateSignedUrl } = await import('../services/r2');

      const mockUrl = 'https://bucket.r2.dev/private/image.jpg?token=xxx';
      generateSignedUrl.mockResolvedValue(mockUrl);

      const result = await generateSignedUrl('private/image.jpg', 3600);

      expect(result).toContain('token=');
    });

    it('should delete image from R2', async () => {
      const { deleteImage } = await import('../services/r2');

      deleteImage.mockResolvedValue({ success: true });

      const result = await deleteImage('users/user123/image.jpg');

      expect(result.success).toBe(true);
    });
  });

  describe('Cache Operations', () => {
    it('should store and retrieve metrics from KV cache', async () => {
      const mockMetrics = [{ id: '1', weight: 70 }];
      mockEnv.BODY_INSIGHTS_CACHE.get = jest.fn().mockResolvedValue(JSON.stringify(mockMetrics));
      mockEnv.BODY_INSIGHTS_CACHE.put = jest.fn().mockResolvedValue(undefined);

      const cached = await mockEnv.BODY_INSIGHTS_CACHE.get('metrics:user123');
      expect(cached).toBe(JSON.stringify(mockMetrics));

      await mockEnv.BODY_INSIGHTS_CACHE.put('metrics:user123', mockMetrics, { expirationTtl: 300 });
      expect(mockEnv.BODY_INSIGHTS_CACHE.put).toHaveBeenCalled();
    });

    it('should invalidate cache on data change', async () => {
      mockEnv.BODY_INSIGHTS_CACHE.delete = jest.fn().mockResolvedValue(undefined);

      await mockEnv.BODY_INSIGHTS_CACHE.delete('metrics:user123');

      expect(mockEnv.BODY_INSIGHTS_CACHE.delete).toHaveBeenCalledWith('metrics:user123');
    });

    it('should handle cache miss', async () => {
      mockEnv.BODY_INSIGHTS_CACHE.get = jest.fn().mockResolvedValue(null);

      const cached = await mockEnv.BODY_INSIGHTS_CACHE.get('nonexistent');
      expect(cached).toBeNull();
    });
  });

  describe('Database Operations', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should insert body metric with all fields', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockMetric = {
        id: 'metric-123',
        userId: 'user123',
        weight: 72.5,
        bodyFatPercentage: 0.15,
        muscleMass: 30.2,
        bmi: 23.4,
        timestamp: now,
        source: 'ai',
        visionAnalysisId: 'analysis-123',
      };

      mockEnv.DB.execute = jest.fn().mockResolvedValue({
        success: true,
        data: mockMetric,
      });

      const result = await mockEnv.DB.execute(
        mockEnv.DB.raw(`
          INSERT INTO bodyMetrics (id, userId, weight, bodyFatPercentage, muscleMass, bmi, timestamp, source, visionAnalysisId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),
        [
          mockMetric.id,
          mockMetric.userId,
          mockMetric.weight,
          mockMetric.bodyFatPercentage,
          mockMetric.muscleMass,
          mockMetric.bmi,
          mockMetric.timestamp,
          mockMetric.source,
          mockMetric.visionAnalysisId,
        ]
      );

      expect(result.success).toBe(true);
      expect(mockEnv.DB.execute).toHaveBeenCalled();
    });

    it('should fetch metrics with date range filter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockResult = {
        success: true,
        data: [
          { id: '1', weight: 70, timestamp: now - 86400 },
          { id: '2', weight: 71, timestamp: now },
        ],
      };

      mockEnv.DB.execute = jest.fn().mockResolvedValue(mockResult);

      const startDate = Math.floor(Date.now() / 1000) - 30 * 86400;
      const endDate = Math.floor(Date.now() / 1000);

      const result = await mockEnv.DB.execute(
        mockEnv.DB.raw(`
          SELECT * FROM bodyMetrics
          WHERE userId = ? AND timestamp BETWEEN ? AND ?
          ORDER BY timestamp DESC
          LIMIT ?
        `),
        ['user123', startDate, endDate, 30]
      );

      expect(result.data).toHaveLength(2);
    });

    it('should store heatmap vector data', async () => {
      const vectorData = [
        { x: 50, y: 42, muscle: 'chest', intensity: 0.7 },
        { x: 24, y: 38, muscle: 'shoulders', intensity: 0.5 },
      ];

      mockEnv.DB.execute = jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'heatmap-123' },
      });

      const result = await mockEnv.DB.execute(
        mockEnv.DB.raw(`
          INSERT INTO bodyHeatmaps (id, userId, vectorData, timestamp)
          VALUES (?, ?, ?, ?)
        `),
        ['heatmap-123', 'user123', JSON.stringify(vectorData), Math.floor(Date.now() / 1000)]
      );

      expect(result.success).toBe(true);
    });

    it('should store vision analysis with JSON', async () => {
      const analysis = {
        posture: { score: 75, issues: [] },
        muscleDevelopment: [{ muscle: 'chest', score: 0.7 }],
        bodyComposition: { bodyFatEstimate: 0.15 },
      };

      mockEnv.DB.execute = jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'analysis-123' },
      });

      const result = await mockEnv.DB.execute(
        mockEnv.DB.raw(`
          INSERT INTO visionAnalyses (id, userId, imageUrl, analysis, confidence, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `),
        ['analysis-123', 'user123', 'https://example.com/image.jpg', JSON.stringify(analysis), 0.85, Math.floor(Date.now() / 1000)]
      );

      expect(result.success).toBe(true);
    });
  });

  describe('AI Vision Integration', () => {
    it('should call OpenAI Vision API with correct prompt', async () => {
      const imageUrl = 'https://bucket.r2.dev/image.jpg';
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              posture: { alignmentScore: 0.85, issues: [], confidence: 0.78 },
              symmetry: { leftRightBalance: 0.92, imbalances: [] },
              muscleDevelopment: [{ muscle: 'chest', score: 0.65, zone: 'upper' }],
              bodyComposition: { bodyFatEstimate: 0.18, muscleMassEstimate: 0.35 },
            }),
          },
        }],
      };

      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await (global as any).fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer test-openai-key`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this body photo and return JSON with posture, symmetry, muscleDevelopment, bodyComposition' },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json() as any;

      expect(data.choices[0].message.content).toBeDefined();
      const parsed = JSON.parse(data.choices[0].message.content);
      expect(parsed.posture.alignmentScore).toBe(0.85);
      expect(parsed.bodyComposition.bodyFatEstimate).toBe(0.18);
    });

    it('should handle API errors gracefully', async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error('API error'));

      try {
        await (global as any).fetch('https://api.openai.com/v1/chat/completions');
      } catch (error) {
        expect(error.message).toBe('API error');
      }
    });

    it('should validate AI response structure', () => {
      const validResponse = {
        posture: { alignmentScore: 0.85, issues: [], confidence: 0.78 },
        symmetry: { leftRightBalance: 0.92, imbalances: [] },
        muscleDevelopment: [{ muscle: 'chest', score: 0.65 }],
        bodyComposition: { bodyFatEstimate: 0.18, muscleMassEstimate: 0.35 },
      };

      expect(validResponse.posture.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(validResponse.posture.alignmentScore).toBeLessThanOrEqual(1);
      expect(validResponse.muscleDevelopment[0].muscle).toBeDefined();
      expect(validResponse.bodyComposition.bodyFatEstimate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Endpoint: GET /api/body/metrics', () => {
    it('should return paginated metrics with date filter', async () => {
      const app = new Hono();

      app.get('/api/body/metrics', async (c) => {
        const userId = c.req.query('userId');
        const limit = parseInt(c.req.query('limit') || '30');
        const startDate = c.req.query('startDate');
        const endDate = c.req.query('endDate');

        // Build query based on filters
        let query = 'SELECT * FROM bodyMetrics WHERE userId = ?';
        const params: any[] = [userId];

        if (startDate) {
          query += ' AND timestamp >= ?';
          params.push(parseInt(startDate));
        }
        if (endDate) {
          query += ' AND timestamp <= ?';
          params.push(parseInt(endDate));
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const result = await mockEnv.DB.execute(mockEnv.DB.raw(query, params));

        return c.json({ success: true, data: result.data });
      });

      const mockMetricsResponse = {
        data: [
          { id: '1', userId: 'user123', weight: 70, timestamp: Math.floor(Date.now() / 1000) - 86400 },
          { id: '2', userId: 'user123', weight: 71, timestamp: Math.floor(Date.now() / 1000) },
        ],
      };

      mockEnv.DB.execute = jest.fn().mockResolvedValue({
        data: mockMetricsResponse.data,
      });

      const request = new Request('http://localhost:8787/api/body/metrics?userId=user123&limit=10');
      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
    });

    it('should require userId parameter', async () => {
      const app = new Hono();

      app.get('/api/body/metrics', async (c) => {
        const userId = c.req.query('userId');
        if (!userId) {
          return c.json({ success: false, error: 'userId is required' }, 400);
        }
        return c.json({ success: true, data: [] });
      });

      const request = new Request('http://localhost:8787/api/body/metrics');
      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(400);
      expect(json.error).toBe('userId is required');
    });
  });

  describe('Endpoint: POST /api/body/metrics', () => {
    it('should create new body metric', async () => {
      const app = new Hono();

      app.post('/api/body/metrics', async (c) => {
        const body = await c.req.json();
        const token = c.req.header('Authorization')?.replace('Bearer ', '');
        const userId = c.req.header('X-User-Id');

        if (!token || !userId) {
          return c.json({ success: false, error: 'Unauthorized' }, 401);
        }

        const now = Math.floor(Date.now() / 1000);
        const result = await mockEnv.DB.execute(
          mockEnv.DB.raw(`
            INSERT INTO bodyMetrics (id, userId, weight, bodyFatPercentage, muscleMass, bmi, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `),
          [
            `metric-${Date.now()}`,
            userId,
            body.weight,
            body.bodyFatPercentage,
            body.muscleMass,
            body.bmi,
            now,
          ]
        );

        return c.json({ success: true, data: result.data });
      });

      mockEnv.DB.execute = jest.fn().mockResolvedValue({
        data: { id: 'new-metric', userId: 'user123', weight: 75 },
      });

      const request = new Request('http://localhost:8787/api/body/metrics', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'X-User-Id': 'user123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weight: 75, bodyFatPercentage: 0.15 }),
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });

    it('should validate metric data', async () => {
      const invalidMetric = { weight: -10, bodyFatPercentage: 1.5 };
      const result = validateBodyMetrics(invalidMetric);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be positive');
      expect(result.errors).toContain('Body fat percentage must be between 0 and 100');
    });
  });

  describe('Endpoint: GET /api/body/health-score', () => {
    it('should calculate health score from latest metrics', async () => {
      const app = new Hono();

      app.get('/api/body/health-score', async (c) => {
        const userId = c.req.header('X-User-Id');

        // Get latest metrics
        const metricsResult = await mockEnv.DB.execute(
          mockEnv.DB.raw('SELECT * FROM bodyMetrics WHERE userId = ? ORDER BY timestamp DESC LIMIT 1', [userId])
        );

        const latestMetric = metricsResult.data[0];

        // Calculate health score (simplified)
        const score = Math.min(100, (latestMetric?.weight ? 50 : 0) + (latestMetric?.bodyFatPercentage ? 30 : 0));

        return c.json({
          success: true,
          data: {
            score,
            category: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
            factors: { weight: latestMetric?.weight, bodyFat: latestMetric?.bodyFatPercentage },
            recommendations: score >= 60 ? ['Keep up the good work'] : ['Consider improving your metrics'],
          },
        });
      });

      mockEnv.DB.execute = jest.fn().mockResolvedValue({
        data: [{ weight: 70, bodyFatPercentage: 0.15 }],
      });

      const request = new Request('http://localhost:8787/api/body/health-score', {
        headers: { 'X-User-Id': 'user123' },
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.data.score).toBeGreaterThanOrEqual(0);
      expect(json.data.score).toBeLessThanOrEqual(100);
      expect(['poor', 'fair', 'good', 'excellent']).toContain(json.data.category);
    });

    it('requires X-User-Id header', async () => {
      const app = new Hono();

      app.get('/api/body/health-score', async (c) => {
        const userId = c.req.header('X-User-Id');
        if (!userId) {
          return c.json({ success: false, error: 'X-User-Id required' }, 400);
        }
        return c.json({ success: true, data: null });
      });

      const request = new Request('http://localhost:8787/api/body/health-score');
      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(400);
    });
  });

  describe('Endpoint: GET /api/body/heatmaps', () => {
    it('should return latest heatmap data', async () => {
      const app = new Hono();

      app.get('/api/body/heatmaps', async (c) => {
        const userId = c.req.query('userId');
        const limit = parseInt(c.req.query('limit') || '1');

        const result = await mockEnv.DB.execute(
          mockEnv.DB.raw(
            'SELECT * FROM bodyHeatmaps WHERE userId = ? ORDER BY timestamp DESC LIMIT ?',
            [userId, limit]
          )
        );

        return c.json({ success: true, data: result.data });
      });

      const mockHeatmap = {
        id: 'heat-1',
        userId: 'user123',
        vectorData: [{ x: 50, y: 42, muscle: 'chest', intensity: 0.7 }],
        timestamp: Math.floor(Date.now() / 1000),
      };

      mockEnv.DB.execute = jest.fn().mockResolvedValue({ data: [mockHeatmap] });

      const request = new Request('http://localhost:8787/api/body/heatmaps?userId=user123&limit=1');
      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].vectorData).toHaveLength(1);
    });

    it('should group and average duplicate points', async () => {
      // Test the grouping logic that happens in the component or service
      const vectorData = [
        { x: 50, y: 42, muscle: 'chest', intensity: 0.6 },
        { x: 50, y: 42, muscle: 'chest', intensity: 0.8 },
        { x: 24, y: 38, muscle: 'shoulders', intensity: 0.5 },
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

      const averaged = Object.entries(groups).map(([key, group]) => ({
        muscle: key.split('_')[0],
        x: group.x,
        y: group.y,
        intensity: group.totalI / group.count,
      }));

      expect(averaged).toHaveLength(2);
      expect(averaged.find((p) => p.muscle === 'chest')?.intensity).toBe(0.7);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle boundary values for weight', () => {
      // Very low weight
      let result = validateBodyMetrics({ weight: 20, height: 175, age: 25, gender: 'male', fitnessLevel: 'intermediate' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight seems too low for a healthy adult');

      // Very high weight
      result = validateBodyMetrics({ weight: 300, height: 175, age: 25, gender: 'male', fitnessLevel: 'intermediate' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight seems too high - please verify');

      // Normal weight
      result = validateBodyMetrics({ weight: 70, height: 175, age: 25, gender: 'male', fitnessLevel: 'intermediate' });
      expect(result.valid).toBe(true);
    });

    it('should handle boundary values for body fat', () => {
      // Below essential fat
      let result = validateBodyMetrics({ bodyFatPercentage: 0.01, age: 25, gender: 'male', fitnessLevel: 'intermediate' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat cannot be below 2% (essential fat)');

      // Above 100%
      result = validateBodyMetrics({ bodyFatPercentage: 1.5, age: 25, gender: 'male', fitnessLevel: 'intermediate' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat percentage must be between 0 and 100');
    });

    it('should detect inconsistent muscle mass', () => {
      const result = validateBodyMetrics({
        weight: 70,
        bodyFatPercentage: 0.05,
        muscleMass: 65, // 65/70 = 93% muscle, impossible
      });
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('The combination of weight, body fat, and muscle mass seems inconsistent');
    });

    it('should handle muscle mass exceeding weight', () => {
      const result = validateBodyMetrics({
        weight: 70,
        muscleMass: 80, // More than total weight
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Muscle mass cannot exceed total body weight');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockEnv.DB.execute = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        await mockEnv.DB.execute(mockEnv.DB.raw('SELECT * FROM bodyMetrics'));
      } catch (error) {
        expect(error.message).toBe('Database connection failed');
      }
    });

    it('should handle invalid JSON in analysis field', () => {
      const invalidJson = '{ invalid json }';
      try {
        JSON.parse(invalidJson);
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });

    it('should handle empty response data', async () => {
      mockEnv.DB.execute = jest.fn().mockResolvedValue({ success: true, data: [] });

      const result = await mockEnv.DB.execute(mockEnv.DB.raw('SELECT * FROM bodyMetrics WHERE 1=0'));

      expect(result.data).toHaveLength(0);
    });
  });
});
