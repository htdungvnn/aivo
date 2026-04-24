import { uploadFormVideo, getFormVideoStatus, getFormVideoResult, listUserFormVideos } from '../services/form-analysis-api';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  clearAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';

// Mock fetch
global.fetch = jest.fn();

describe('FormAnalysisAPI', () => {
  const API_URL = 'http://localhost:8787';
  const mockUserId = 'user-123';

  const getItemAsync = SecureStore.getItemAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default implementation based on key
    getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'aivo_token') return 'test-token';
      if (key === 'aivo_user_id') return 'user-123';
      return null;
    });
  });

  describe('uploadFormVideo', () => {
    it('uploads video successfully', async () => {
      const mockBlob = { size: 1000, type: 'video/mp4' };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { videoId: 'vid-123', status: 'pending', videoUrl: 'https://...' } }),
        blob: jest.fn().mockResolvedValue(mockBlob),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await uploadFormVideo('file:///video.mp4', 'video.mp4', 'squat');

      expect(result).toEqual({ videoId: 'vid-123', status: 'pending', videoUrl: 'https://...' });
      expect(getItemAsync).toHaveBeenCalledWith('aivo_token');
      expect(getItemAsync).toHaveBeenCalledWith('aivo_user_id');
      expect(global.fetch).toHaveBeenCalledWith(API_URL + '/api/form/upload', expect.objectContaining({
        method: 'POST',
        headers: { 'X-User-Id': mockUserId },
      }));
    });

    it('throws when not authenticated', async () => {
      // Override token to return null
      getItemAsync.mockResolvedValueOnce(null);

      await expect(uploadFormVideo('file:///video.mp4', 'video.mp4', 'squat'))
        .rejects.toThrow('Not authenticated');
    });

    it('throws on upload failure', async () => {
      const mockBlob = { size: 1000, type: 'video/mp4' };
      const mockResponse = { ok: false, json: jest.fn().mockResolvedValue({ error: 'File too large' }), blob: jest.fn().mockResolvedValue(mockBlob) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(uploadFormVideo('file:///video.mp4', 'video.mp4', 'squat'))
        .rejects.toThrow('File too large');
    });
  });

  describe('getFormVideoStatus', () => {
    it('fetches status successfully', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({
        data: { videoId: 'vid-123', status: 'completed', exerciseType: 'squat', uploadedAt: 1234567890, analysisCompleted: true, resultUrl: '/api/form/vid-123/result' }
      }) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getFormVideoStatus('vid-123');

      expect(result.videoId).toBe('vid-123');
      expect(result.status).toBe('completed');
    });

    it('throws when not authenticated', async () => {
      getItemAsync.mockResolvedValueOnce(null);
      await expect(getFormVideoStatus('vid-123')).rejects.toThrow('Not authenticated');
    });
  });

  describe('getFormVideoResult', () => {
    it('fetches result successfully', async () => {
      const mockResult = {
        data: {
          videoId: 'vid-123',
          exerciseType: 'squat',
          overallScore: 85,
          grade: 'B',
          issues: [],
          corrections: [],
          summary: { strengths: [], primaryConcern: '', priority: 'medium' },
          completedAt: 1234567890,
          processingTimeMs: 5000,
        }
      };
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue(mockResult) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getFormVideoResult('vid-123');

      expect(result.overallScore).toBe(85);
      expect(result.grade).toBe('B');
    });

    it('throws when not authenticated', async () => {
      getItemAsync.mockResolvedValueOnce(null);
      await expect(getFormVideoResult('vid-123')).rejects.toThrow('Not authenticated');
    });
  });

  describe('listUserFormVideos', () => {
    it('lists videos successfully', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({
        data: [
          { id: 'vid-1', userId: 'user-123', exerciseType: 'squat', status: 'completed', videoUrl: '...', hasAnalysis: true, grade: 'A', overallScore: 95 }
        ]
      }) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await listUserFormVideos();

      expect(result).toHaveLength(1);
      expect(result[0].hasAnalysis).toBe(true);
    });

    it('throws when not authenticated', async () => {
      getItemAsync.mockResolvedValueOnce(null);
      await expect(listUserFormVideos()).rejects.toThrow('Not authenticated');
    });
  });
});
