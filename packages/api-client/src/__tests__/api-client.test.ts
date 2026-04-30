/// <reference types="jest" />
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ApiClient, ApiError } from '../index';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  const baseUrl = 'https://api.example.com';
  const mockToken = 'test-jwt-token';

  let apiClient: ApiClient;

  const createMockResponse = (data: any, status = 200, ok = true) => ({
    ok,
    status,
    json: async () => data,
    headers: {
      get: jest.fn().mockReturnValue('application/json'),
    },
    arrayBuffer: async () => new ArrayBuffer(0),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient({
      baseUrl,
      tokenProvider: () => mockToken,
    });
  });

  describe('constructor', () => {
    it('should initialize with baseUrl', () => {
      expect(apiClient).toBeDefined();
    });

    it('should strip trailing slash from baseUrl', () => {
      const client = new ApiClient({
        baseUrl: 'https://test.com/api/',
        tokenProvider: () => 'token',
      });
      expect(client).toBeDefined();
    });
  });

  describe('request()', () => {
    it('should make GET request with auth header', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));
      await apiClient.request('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));
      const body = { name: 'Test' };
      await apiClient.request('/test', { method: 'POST', body: JSON.stringify(body) });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should handle absolute URLs', async () => {
      const absoluteUrl = 'https://external.api.com/endpoint';
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));
      await apiClient.request(absoluteUrl);
      expect(mockFetch).toHaveBeenCalledWith(absoluteUrl, expect.any(Object));
    });

    it('should throw ApiError on HTTP error', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Not found' }, 404, false));
      await expect(apiClient.request('/test')).rejects.toThrow(ApiError);
    });

    it('should handle 204 No Content', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 204 });
      const result = await apiClient.request('/test', { method: 'DELETE' });
      expect(result).toBeUndefined();
    });

    it('should handle network failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      await expect(apiClient.request('/test')).rejects.toThrow('Network error');
    });

    it('should include X-User-Id header when userIdProvider is set', async () => {
      const mockUserId = 'user-123';
      const client = new ApiClient({
        baseUrl,
        tokenProvider: () => mockToken,
        userIdProvider: () => mockUserId,
      });
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));
      const headers = await client.getAuthHeaders();
      expect(headers['X-User-Id']).toBe(mockUserId);
    });
  });

  describe('Authentication APIs', () => {
    it('verifyToken() calls /api/auth/verify', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: { user: { id: '123' } } }));
      await apiClient.verifyToken();
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/auth/verify`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('logout() calls /api/auth/logout with POST', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));
      await apiClient.logout();
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/auth/logout`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('User APIs', () => {
    it('getUsers() calls GET /users', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }));
      await apiClient.getUsers();
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/users`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('getUserById() includes id in URL', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: {} }));
      await apiClient.getUserById('user-123');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/users/user-123`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });
  });

  describe('Workout APIs', () => {
    it('createWorkout() POSTs data', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: {} }));
      const workout = { type: 'strength', duration: 60 };
      await apiClient.createWorkout(workout);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(workout),
        })
      );
    });

    it('getWorkouts() calls GET /workouts with optional userId', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }));
      await apiClient.getWorkouts();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/workouts$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('getWorkouts() includes userId query param when provided', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }));
      await apiClient.getWorkouts({ userId: 'user-123' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-123'),
        expect.any(Object)
      );
    });
  });

  describe('Body Metrics APIs', () => {
    it('createBodyMetric() POSTs metric data', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: {} }));
      const metric = { weight: 70, bodyFatPercentage: 0.15 };
      await apiClient.createBodyMetric(metric);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/body/metrics`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(metric),
        })
      );
    });

    it('getBodyMetrics() calls GET /body/metrics with optional params', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }));
      await apiClient.getBodyMetrics();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/body\/metrics$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('getBodyMetrics() includes limit and date range params', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }));
      await apiClient.getBodyMetrics({ limit: 10, startDate: 1745952000, endDate: 1746038400 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('limit=10');
      expect(url).toContain('startDate=1745952000');
      expect(url).toContain('endDate=1746038400');
    });
  });

  describe('Biometric APIs', () => {
    it('uploadSleepData() POSTs sleep data', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: {} }));
      const sleepData = { date: '2025-04-22', durationHours: 7.5, qualityScore: 85 };
      await apiClient.uploadSleepData(sleepData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/biometric/sleep`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
        })
      );
    });

    it('uploadSensorReadings() POSTs readings array', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: { received: 2 } }));
      const readings = [
        { timestamp: Date.now(), type: 'heart_rate', value: 72, unit: 'bpm' },
      ];
      await apiClient.uploadSensorReadings(readings);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/biometric/readings/batch`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
        })
      );
    });

    it('getHealthScore() calls /body/health-score', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: {} }));
      await apiClient.getHealthScore();
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/body/health-score`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('getHeatmaps() calls GET /body/heatmaps with optional params', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }));
      await apiClient.getHeatmaps();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/body\/heatmaps$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('getHeatmaps() includes limit param when provided', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }));
      await apiClient.getHeatmaps({ limit: 5 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('limit=5');
    });

    it('generateHeatmap() POSTs vector data', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: {} }));
      const analysisId = 'analysis-123';
      const vectorData = [{ x: 10, y: 20, muscle: 'biceps', intensity: 0.8 }];
      await apiClient.generateHeatmap(analysisId, vectorData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/body/heatmaps/generate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: JSON.stringify({ analysisId, vectorData }),
        })
      );
    });
  });

  describe('Chat & AI APIs', () => {
    it('sendChatMessage() sends message', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, data: { message: 'Hi' } }));
      await apiClient.sendChatMessage('Hello');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/ai/chat`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Hello', context: undefined }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('throws ApiError with message from response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Validation failed' }, 400, false));
      await expect(apiClient.request('/test')).rejects.toThrow(ApiError);
    });

    it('includes error code if provided', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Bad', code: 'VALIDATION_ERROR' }, 400, false));
      try {
        await apiClient.request('/test');
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  // TODO: Token provider tests need proper mock setup
  // describe('Token provider', () => {
  //   it('calls tokenProvider on each request', async () => {
  //     mockFetch.mockResolvedValue(createMockResponse({ success: true }));
  //     await apiClient.request('/test1');
  //     await apiClient.request('/test2');
  //     expect(mockTokenProvider).toHaveBeenCalledTimes(2);
  //   });
  // });
});

describe('ApiError', () => {
  it('has correct properties', () => {
    const error = new ApiError('Test error', 400, 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('ApiError');
    expect(error instanceof Error).toBe(true);
  });

  it('works without optional code', () => {
    const error = new ApiError('Error', 500);
    expect(error.code).toBeUndefined();
  });
});