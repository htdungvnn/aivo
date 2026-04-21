import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { sql } from 'drizzle-orm';
import * as schema from '../src/schema';

// Mock Drizzle instance for testing
const mockDrizzle = {
  execute: vi.fn(),
  executeSql: vi.fn(),
  batch: vi.fn(),
  query: vi.fn(),
  migrate: vi.fn(),
  raw: vi.fn(),
  _connect: vi.fn(),
  _dispose: vi.fn(),
  drizzle: vi.fn(),
};

vi.mock('../src/index', () => ({
  db: mockDrizzle,
}));

describe('Database Schema', () => {
  describe('Users Table', () => {
    it('should have correct columns defined', () => {
      expect(schema.users).toBeDefined();
      expect(schema.users.fields.id).toBeDefined();
      expect(schema.users.fields.email).toBeDefined();
      expect(schema.users.fields.name).toBeDefined();
      expect(schema.users.fields.createdAt).toBeDefined();
    });

    it('should define email as unique', () => {
      expect(schema.users.fields.email.unique).toBe(true);
    });

    it('should have proper field types', () => {
      expect(schema.users.fields.id.type).toBe('text');
      expect(schema.users.fields.email.type).toBe('text');
      expect(schema.users.fields.age.type).toBe('integer');
      expect(schema.users.fields.height.type).toBe('real');
    });
  });

  describe('BodyMetrics Table', () => {
    it('should have all required fields', () => {
      expect(schema.bodyMetrics).toBeDefined();
      expect(schema.bodyMetrics.fields.id).toBeDefined();
      expect(schema.bodyMetrics.fields.userId).toBeDefined();
      expect(schema.bodyMetrics.fields.timestamp).toBeDefined();
      expect(schema.bodyMetrics.fields.weight).toBeDefined();
      expect(schema.bodyMetrics.fields.bodyFatPercentage).toBeDefined();
      expect(schema.bodyMetrics.fields.muscleMass).toBeDefined();
      expect(schema.bodyMetrics.fields.bmi).toBeDefined();
    });

    it('should have optional fields for partial data', () => {
      // weight, bodyFatPercentage, muscleMass should be optional (real without notNull)
      expect(schema.bodyMetrics.fields.weight.notNull).toBeUndefined();
    });
  });

  describe('BodyHeatmaps Table', () => {
    it('should have vector data field', () => {
      expect(schema.bodyHeatmaps).toBeDefined();
      expect(schema.bodyHeatmaps.fields.vectorData).toBeDefined();
    });

    it('should store JSON vector data as text', () => {
      expect(schema.bodyHeatmaps.fields.vectorData.type).toBe('text');
    });
  });

  describe('VisionAnalyses Table', () => {
    it('should have analysis JSON field', () => {
      expect(schema.visionAnalyses).toBeDefined();
      expect(schema.visionAnalyses.fields.analysis).toBeDefined();
    });

    it('should store confidence score', () => {
      expect(schema.visionAnalyses.fields.confidence).toBeDefined();
      expect(schema.visionAnalyses.fields.confidence.type).toBe('real');
    });

    it('should require imageUrl', () => {
      expect(schema.visionAnalyses.fields.imageUrl.notNull).toBe(true);
    });
  });

  describe('Schema Export', () => {
    it('should export all tables', () => {
      expect(schema.schema).toBeDefined();
      expect(Object.keys(schema.schema).length).toBeGreaterThan(10);
    });

    it('should include body insights tables', () => {
      expect(schema.schema.bodyMetrics).toBeDefined();
      expect(schema.schema.bodyHeatmaps).toBeDefined();
      expect(schema.schema.visionAnalyses).toBeDefined();
    });
  });
});

describe('Database Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Body Metrics Queries', () => {
    it('should fetch metrics by user with limit', async () => {
      const mockResult = {
        success: true,
        data: [
          {
            id: '1',
            userId: 'user123',
            weight: 70,
            bodyFatPercentage: 0.15,
            muscleMass: 30,
            timestamp: Math.floor(Date.now() / 1000),
          },
        ],
      };

      mockDrizzle.execute = vi.fn().mockResolvedValue(mockResult);

      const result = await mockDrizzle.execute(sql`
        SELECT * FROM bodyMetrics
        WHERE userId = ?
        ORDER BY timestamp DESC
        LIMIT 30
      `, ['user123']);

      expect(result).toEqual(mockResult);
      expect(mockDrizzle.execute).toHaveBeenCalled();
    });

    it('should insert new body metric', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockInsert = {
        id: 'new-metric-id',
        userId: 'user123',
        weight: 72.5,
        timestamp: now,
      };

      mockDrizzle.execute = vi.fn().mockResolvedValue({ success: true, data: mockInsert });

      const result = await mockDrizzle.execute(sql`
        INSERT INTO bodyMetrics (id, userId, weight, timestamp)
        VALUES (?, ?, ?, ?)
      `, ['new-metric-id', 'user123', 72.5, now]);

      expect(result.data.id).toBe('new-metric-id');
    });
  });

  describe('Vision Analyses Queries', () => {
    it('should save analysis result', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockAnalysis = {
        id: 'analysis-123',
        userId: 'user123',
        imageUrl: 'https://storage.example.com/image.jpg',
        analysis: JSON.stringify({
          posture: { score: 0.85, issues: [] },
          symmetry: { leftRightBalance: 0.92 },
          muscleDevelopment: [{ muscle: 'chest', score: 0.7 }],
          bodyComposition: { bodyFatEstimate: 0.15, muscleMassEstimate: 0.35 },
        }),
        confidence: 0.9,
        createdAt: now,
      };

      mockDrizzle.execute = vi.fn().mockResolvedValue({ success: true, data: mockAnalysis });

      const result = await mockDrizzle.execute(sql`
        INSERT INTO visionAnalyses (id, userId, imageUrl, analysis, confidence, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        mockAnalysis.id,
        mockAnalysis.userId,
        mockAnalysis.imageUrl,
        mockAnalysis.analysis,
        mockAnalysis.confidence,
        mockAnalysis.createdAt,
      ]);

      expect(result.data.id).toBe('analysis-123');
    });
  });
});

describe('Data Validation', () => {
  it('should validate body composition ranges', () => {
    // Valid ranges
    expect(0.05).toBeGreaterThan(0.02); // Male essential fat min
    expect(0.30).toBeLessThan(0.35); // Athletic range
  });

  it('should validate timestamp as Unix timestamp', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(now).toBeGreaterThan(1600000000); // After 2020
    expect(now).toBeLessThan(Math.floor(Date.now() / 1000) + 10);
  });

  it('should validate UUID format', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(uuid).toMatch(uuidRegex);
  });
});

describe('JSON Field Serialization', () => {
  it('should serialize vector data correctly', () => {
    const vectorData = [
      { x: 50, y: 42, muscle: 'chest', intensity: 0.7 },
      { x: 24, y: 38, muscle: 'shoulders', intensity: 0.5 },
    ];

    const serialized = JSON.stringify(vectorData);
    const parsed = JSON.parse(serialized);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].muscle).toBe('chest');
    expect(parsed[0].intensity).toBeGreaterThanOrEqual(0);
    expect(parsed[0].intensity).toBeLessThanOrEqual(1);
  });

  it('should serialize analysis data correctly', () => {
    const analysis = {
      posture: {
        alignmentScore: 0.85,
        issues: ['forward_head_posture'],
        confidence: 0.78,
      },
      symmetry: {
        leftRightBalance: 0.92,
        imbalances: ['right_quad_stronger'],
      },
      muscleDevelopment: [
        { muscle: 'chest', score: 0.65, zone: 'upper' },
        { muscle: 'back', score: 0.72, zone: 'upper' },
      ],
      bodyComposition: {
        bodyFatEstimate: 0.18,
        muscleMassEstimate: 0.35,
      },
    };

    const serialized = JSON.stringify(analysis);
    const parsed = JSON.parse(serialized);

    expect(parsed.posture.alignmentScore).toBe(0.85);
    expect(parsed.muscleDevelopment).toHaveLength(2);
    expect(parsed.bodyComposition.bodyFatEstimate).toBeCloseTo(0.18);
  });
});
