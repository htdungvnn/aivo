import {
  fetchBodyMetrics,
  createBodyMetric,
  fetchHeatmaps,
  uploadBodyImage,
  analyzeImage,
  fetchHealthScore,
  formatTimestamp,
  transformMetricData,
} from '../metrics-api';
import type { BodyMetric, AnalysisResult, HeatmapData, HealthScore } from '../metrics-api';
import * as SecureStore from 'expo-secure-store';

// Mock fetch
global.fetch = jest.fn();

jest.mock('expo-secure-store', () => {
  const storage: Record<string, string> = {};
  return {
    getItem: async (key: string): Promise<string | null> => storage[key] || null,
    setItem: async (key: string, value: string): Promise<void> => { storage[key] = value; },
    removeItem: async (key: string): Promise<void> => { delete storage[key]; },
    clear: async (): Promise<void> => { Object.keys(storage).forEach(k => delete storage[k]); },
    getItemAsync: async (key: string): Promise<string | null> => storage[key] || null,
    setItemAsync: async (key: string, value: string): Promise<void> => { storage[key] = value; },
    deleteItemAsync: async (key: string): Promise<void> => { delete storage[key]; },
    clearAsync: async (): Promise<void> => { Object.keys(storage).forEach(k => delete storage[k]); },
  };
});

describe('Metrics API Service', () => {
  const mockToken = 'test-jwt-token';
  const mockUserId = 'user-123';
  const mockApiUrl = 'http://localhost:8787';

  const mockMetrics: BodyMetric[] = [
    {
      id: '1',
      userId: mockUserId,
      timestamp: Math.floor(Date.now() / 1000) - 86400,
      weight: 70.5,
      bodyFatPercentage: 0.15,
      muscleMass: 30.2,
    },
    {
      id: '2',
      userId: mockUserId,
      timestamp: Math.floor(Date.now() / 1000),
      weight: 71.2,
      bodyFatPercentage: 0.14,
      muscleMass: 30.8,
    },
  ];

  const mockHeatmaps: HeatmapData[] = [
    {
      id: '1',
      userId: mockUserId,
      timestamp: Math.floor(Date.now() / 1000),
      vectorData: [{ x: 50, y: 42, muscle: 'chest', intensity: 0.7 }],
    },
  ];

  const mockHealthScore: HealthScore = {
    score: 82,
    category: 'good',
    factors: {},
    recommendations: ['Continue training'],
  };

  const mockAnalysis: AnalysisResult = {
    id: 'analysis-1',
    userId: mockUserId,
    imageUrl: 'https://example.com/image.jpg',
    analysis: {
      posture: { alignmentScore: 0.85, issues: [], confidence: 0.78 },
      muscleDevelopment: [{ muscle: 'chest', score: 0.65, zone: 'upper' }],
      bodyComposition: { bodyFatEstimate: 0.15, muscleMassEstimate: 0.35 },
    },
    confidence: 0.85,
    createdAt: Math.floor(Date.now() / 1000),
  };

  beforeEach(async () => {
    await SecureStore.clear();
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    // Set default token and user ID
    await SecureStore.setItem('aivo_token', mockToken);
    await SecureStore.setItem('aivo_user_id', mockUserId);
  });

  describe('Authentication', () => {
    it('throws when token is missing', async () => {
      await SecureStore.removeItem('aivo_token');

      await expect(fetchBodyMetrics()).rejects.toThrow('Not authenticated');
    });

    it('throws when user ID is missing', async () => {
      await SecureStore.removeItem('aivo_user_id');

      await expect(fetchBodyMetrics()).rejects.toThrow('User ID not found');
    });
  });

  describe('fetchBodyMetrics', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockMetrics }),
      });
    });

    it('fetches metrics with correct URL', async () => {
      await fetchBodyMetrics();

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/body/metrics?userId=${mockUserId}&limit=30`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });

    it('accepts custom limit', async () => {
      await fetchBodyMetrics(10);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything()
      );
    });

    it('returns metrics array', async () => {
      const result = await fetchBodyMetrics();

      expect(result).toHaveLength(2);
      expect(result[0].weight).toBe(70.5);
    });

    it('returns empty array when no data', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await fetchBodyMetrics();

      expect(result).toHaveLength(0);
    });

    it('handles HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Not found' }),
      });

      await expect(fetchBodyMetrics()).rejects.toThrow('Not found');
    });
  });

  describe('createBodyMetric', () => {
    const newMetric = { weight: 75, bodyFatPercentage: 0.16 };

    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new-1', ...newMetric }),
      });
    });

    it('sends POST request with metric data', async () => {
      await createBodyMetric(newMetric);

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/body/metrics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
            'X-User-Id': mockUserId,
          },
          body: expect.any(String),
        }
      );

      // Verify body contains the expected data
      const callBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody).toMatchObject(newMetric);
      expect(callBody.userId).toBe(mockUserId);
    });

    it('includes userId in request body', async () => {
      await createBodyMetric(newMetric);

      const callBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.userId).toBe(mockUserId);
    });

    it('returns created metric', async () => {
      const result = await createBodyMetric(newMetric);

      expect(result.id).toBe('new-1');
      expect(result.weight).toBe(75);
    });

    it('handles partial metric data', async () => {
      await createBodyMetric({ weight: 72 });

      const callBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.weight).toBe(72);
      expect(callBody.bodyFatPercentage).toBeUndefined();
    });
  });

  describe('fetchHeatmaps', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockHeatmaps }),
      });
    });

    it('fetches heatmaps with correct URL', async () => {
      await fetchHeatmaps();

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/body/heatmaps?userId=${mockUserId}&limit=10`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });

    it('accepts custom limit', async () => {
      await fetchHeatmaps(5);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.anything()
      );
    });

    it('returns heatmap data with vectorData', async () => {
      const result = await fetchHeatmaps();

      expect(result).toHaveLength(1);
      expect(result[0].vectorData).toHaveLength(1);
      expect(result[0].vectorData[0].muscle).toBe('chest');
    });
  });

  describe('uploadBodyImage', () => {
    const mockUploadResponse = { imageUrl: 'https://bucket.r2.dev/image.jpg', key: 'body-images/user123/123.jpg' };

    beforeEach(() => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url === 'file:///photo.jpg') {
          return Promise.resolve({
            blob: () => Promise.resolve({ type: 'image/jpeg' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockUploadResponse,
        });
      });
    });

    it('reads file as blob', async () => {
      await uploadBodyImage('file:///photo.jpg', 'photo.jpg');

      expect(fetch).toHaveBeenCalledWith('file:///photo.jpg');
    });

    it('sends FormData with image', async () => {
      await uploadBodyImage('file:///photo.jpg', 'photo.jpg');

      const [, options] = fetch.mock.calls.find((call: any) =>
        call[0].includes('/api/body/upload')
      );

      expect(options.body).toBeInstanceOf(FormData);
    });

    it('includes X-User-Id header', async () => {
      await uploadBodyImage('file:///photo.jpg', 'photo.jpg');

      const [, options] = fetch.mock.calls.find((call: any) =>
        call[0].includes('/api/body/upload')
      );

      expect(options.headers['X-User-Id']).toBe(mockUserId);
    });

    it('returns image URL and key', async () => {
      const result = await uploadBodyImage('file:///photo.jpg', 'photo.jpg');

      expect(result.imageUrl).toBe('https://bucket.r2.dev/image.jpg');
      expect(result.key).toBe('body-images/user123/123.jpg');
    });
  });

  describe('analyzeImage', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysis,
      });
    });

    it('sends POST to analyze endpoint', async () => {
      await analyzeImage('https://bucket.r2.dev/image.jpg');

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/body/vision/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
            'X-User-Id': mockUserId,
          },
          body: expect.stringContaining('analyzeMuscles'),
        }
      );
    });

    it('includes imageUrl in request body', async () => {
      await analyzeImage('https://bucket.r2.dev/image.jpg');

      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.imageUrl).toBe('https://bucket.r2.dev/image.jpg');
      expect(body.analyzeMuscles).toBe(true);
      expect(body.analyzePosture).toBe(true);
    });

    it('returns analysis result', async () => {
      const result = await analyzeImage('https://bucket.r2.dev/image.jpg');

      expect(result.id).toBe('analysis-1');
      expect(result.analysis.posture?.alignmentScore).toBe(0.85);
      expect(result.analysis.bodyComposition?.bodyFatEstimate).toBe(0.15);
    });
  });

  describe('fetchHealthScore', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockHealthScore }),
      });
    });

    it('fetches with correct headers', async () => {
      await fetchHealthScore();

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/body/health-score`,
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
            'X-User-Id': mockUserId,
          },
        }
      );
    });

    it('returns health score object', async () => {
      const result = await fetchHealthScore();

      expect(result.score).toBe(82);
      expect(result.category).toBe('good');
      expect(result.recommendations).toContain('Continue training');
    });
  });

  describe('formatTimestamp', () => {
    it('formats Unix timestamp to date string', () => {
      const timestamp = 1704067200; // Jan 1, 2024
      const result = formatTimestamp(timestamp);

      // Format depends on locale, just check it's a reasonable string
      expect(result).toMatch(/Jan\s+1/);
    });

    it('handles different dates', () => {
      const timestamp = 1706745600; // Feb 1, 2024
      const result = formatTimestamp(timestamp);

      expect(result).toMatch(/Feb\s+1/);
    });
  });

  describe('transformMetricData', () => {
    it('transforms weight metrics correctly', () => {
      const result = transformMetricData(mockMetrics, 'weight');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(71.2); // Most recent first (reversed)
      expect(result[0].value.toFixed(1)).toBe('71.2');
    });

    it('transforms body fat percentage (multiplies by 100)', () => {
      const result = transformMetricData(mockMetrics, 'bodyFatPercentage');

      expect(result[0].value).toBeCloseTo(14); // 0.14 * 100
    });

    it('filters out undefined values', () => {
      const metricsWithGap: BodyMetric[] = [
        { id: '1', userId: mockUserId, timestamp: 1, weight: 70 },
        { id: '2', userId: mockUserId, timestamp: 2, muscleMass: 30 },
      ];

      const weightResult = transformMetricData(metricsWithGap, 'weight');
      expect(weightResult).toHaveLength(1);

      const muscleResult = transformMetricData(metricsWithGap, 'muscleMass');
      expect(muscleResult).toHaveLength(1);
    });

    it('reverses order (most recent first)', () => {
      const orderedMetrics: BodyMetric[] = [
        { id: '1', userId: mockUserId, timestamp: 1, weight: 70 },
        { id: '2', userId: mockUserId, timestamp: 2, weight: 72 },
        { id: '3', userId: mockUserId, timestamp: 3, weight: 74 },
      ];

      const result = transformMetricData(orderedMetrics, 'weight');

      expect(result[0].value).toBe(74);
      expect(result[1].value).toBe(72);
      expect(result[2].value).toBe(70);
    });

    it('handles empty array', () => {
      const result = transformMetricData([], 'weight');
      expect(result).toHaveLength(0);
    });
  });
});
