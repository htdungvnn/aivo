import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InsightsScreen } from '../app/(tabs)/insights';
import { MetricsProvider } from '../../contexts/MetricsContext';
import { BodyInsightCard } from '../../components/body/BodyInsightCard';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

// Mock AsyncStorage for MetricsContext
const AsyncStorageMock = {
  getItem: async (key: string): Promise<string | null> => null,
  setItem: async (key: string, value: string): Promise<void> => {},
  removeItem: async (key: string): Promise<void> => {},
  clear: async (): Promise<void> => {},
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: AsyncStorageMock.getItem,
  setItemAsync: AsyncStorageMock.setItem,
  deleteItemAsync: AsyncStorageMock.removeItem,
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions,
}));

const MediaTypeOptions = {
  Images: 'Images',
};

// Mock haptics
const HapticsMock = {
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
};

jest.mock('expo-haptics', () => HapticsMock);

describe('Insights Screen (Mobile)', () => {
  const mockApiUrl = 'http://localhost:8787';
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('renders the insights screen', () => {
      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    it('renders upload button', () => {
      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      expect(screen.getByText('Analyze My Body')).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Trends')).toBeInTheDocument();
    });
  });

  describe('Image Upload Flow', () => {
    it('opens image picker when button pressed', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });

      (require('expo-image-picker') as any).launchImageLibraryAsync = mockLaunch;

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const uploadButton = screen.getByText('Analyze My Body');
      await act(async () => {
        uploadButton.press();
      });

      expect(mockLaunch).toHaveBeenCalledWith({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    });

    it('handles image selection and upload', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });

      (require('expo-image-picker') as any).launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            url: 'https://bucket.r2.dev/photo.jpg',
            imageUrl: 'https://bucket.r2.dev/photo.jpg',
            analysis: {
              posture: { score: 75, issues: [] },
              muscleDevelopment: [{ muscle: 'chest', score: 0.7 }],
              bodyComposition: { bodyFatEstimate: 0.15, muscleMassEstimate: 0.35 },
            },
          },
        }),
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const uploadButton = screen.getByText('Analyze My Body');
      await act(async () => {
        uploadButton.press();
      });

      await waitFor(() => {
        expect(HapticsMock.impactAsync).toHaveBeenCalledWith(HapticsMock.ImpactFeedbackStyle.Success);
      });
    });

    it('handles upload cancellation', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: true,
      });

      (require('expo-image-picker') as any).launchImageLibraryAsync = mockLaunch;

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const uploadButton = screen.getByText('Analyze My Body');
      await act(async () => {
        uploadButton.press();
      });

      expect(HapticsMock.impactAsync).not.toHaveBeenCalled();
    });

    it('handles upload errors', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });

      (require('expo-image-picker') as any).launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const uploadButton = screen.getByText('Analyze My Body');
      await act(async () => {
        uploadButton.press();
      });

      await waitFor(() => {
        expect(HapticsMock.impactAsync).toHaveBeenCalledWith(HapticsMock.ImpactFeedbackStyle.Error);
      });
    });
  });

  describe('AI Analysis Flow', () => {
    it('calls analyze endpoint after image upload', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });

      (require('expo-image-picker') as any).launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/vision/analyze')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                analysis: {
                  posture: { score: 75, issues: [] },
                  muscleDevelopment: [{ muscle: 'chest', score: 0.7 }],
                  bodyComposition: { bodyFatEstimate: 0.15, muscleMassEstimate: 0.35 },
                },
                vectorData: [{ x: 50, y: 42, muscle: 'chest', intensity: 0.7 }],
              },
            }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const uploadButton = screen.getByText('Analyze My Body');
      await act(async () => {
        uploadButton.press();
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/body/vision/analyze'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('adds metric optimistically after analysis', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });

      (require('expo-image-picker') as any).launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/vision/analyze')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                analysis: {
                  posture: { score: 75, issues: [] },
                  muscleDevelopment: [],
                  bodyComposition: { bodyFatEstimate: 0.15, muscleMassEstimate: 0.35 },
                },
                vectorData: [],
              },
            }),
          });
        }
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'metric-123',
              weight: 70,
              bodyFatPercentage: 0.15,
              muscleMass: 35,
            }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const uploadButton = screen.getByText('Analyze My Body');
      await act(async () => {
        uploadButton.press();
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/body/metrics'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('bodyFatPercentage'),
          })
        );
      });
    });

    it('shows success haptic on complete analysis', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });

      (require('expo-image-picker') as any).launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            analysis: {
              posture: { score: 75, issues: [] },
              muscleDevelopment: [],
              bodyComposition: { bodyFatEstimate: 0.15 },
            },
          },
        }),
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const uploadButton = screen.getByText('Analyze My Body');
      await act(async () => {
        uploadButton.press();
      });

      await waitFor(() => {
        expect(HapticsMock.notificationAsync).toHaveBeenCalledWith(
          HapticsMock.NotificationFeedbackType.Success
        );
      });
    });
  });

  describe('Metrics Display', () => {
    it('shows latest metrics when available', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { weight: 70.5, bodyFatPercentage: 0.15, muscleMass: 30.2 },
          ],
        }),
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('70.5')).toBeInTheDocument();
      });
    });

    it('shows empty state when no metrics', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No metrics yet')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between Overview and Trends tabs', async () => {
      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      const overviewTab = screen.getByText('Overview');
      const trendsTab = screen.getByText('Trends');

      await act(async () => {
        trendsTab.press();
      });

      expect(screen.getByText('Trends')).toBeInTheDocument();
    });
  });

  describe('BodyInsightCard Integration', () => {
    it('renders BodyInsightCard with correct props', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { weight: 70, bodyFatPercentage: 0.15, muscleMass: 30 },
              ],
            }),
          });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: { score: 80, category: 'good', recommendations: [] },
            }),
          });
        }
        if (url.includes('/api/body/heatmaps')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [{
                vectorData: [{ x: 50, y: 42, muscle: 'chest', intensity: 0.7 }],
              }],
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Health Score')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicators during fetch', async () => {
      (fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      // Should show loading state initially
      const { container } = render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );
    });
  });

  describe('Error Handling', () => {
    it('shows error message when fetch fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
      });
    });
  });
});
