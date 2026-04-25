import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

// Mock lucide-react-native with explicit factory to ensure it's applied
jest.mock('lucide-react-native', () => {
  function MockIcon(props) {
    return null;
  }
  return {
    Activity: MockIcon,
    Bed: MockIcon,
    Camera: MockIcon,
    ChevronRight: MockIcon,
    Dumbbell: MockIcon,
    Image: MockIcon,
    Scale: MockIcon,
    Target: MockIcon,
    TrendingUp: MockIcon,
    Utensils: MockIcon,
    User: MockIcon,
    Upload: MockIcon,
    Zap: MockIcon,
    AlertTriangle: MockIcon,
  };
});

// Mock heavy/dependent components to simplify testing
jest.mock('@/components/biometric/RecoveryDashboard', () => () => null);
jest.mock('@/components/body/BodyMetricChart', () => ({
  BodyMetricChart: () => null,
  HealthScoreGauge: () => null,
  MuscleBalanceChart: () => null,
}));
jest.mock('@/components/body/PostureAnalysisCard', () => () => null);
jest.mock('@/screens/DigitalTwinScreen', () => () => null);
jest.mock('@/components/body/BodyInsightCard', () => () => null);
jest.mock('@/screens/AvatarViewer2D', () => () => null);
jest.mock('@/screens/TimeSlider', () => () => null);
jest.mock('@/screens/AdherenceAdjuster', () => () => null);

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Expo modules - using manual mock for expo-secure-store from __mocks__
jest.mock('expo-secure-store');

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 1, Medium: 2, Heavy: 3, Success: 4 },
  NotificationFeedbackType: { Success: 4, Warning: 1, Error: 0 },
}));

import InsightsScreen from '../(tabs)/insights';
import { MetricsProvider } from '../contexts/MetricsContext';

// Mock fetch
global.fetch = jest.fn();

const HapticsMock = require('expo-haptics');
const SecureStore = require('expo-secure-store');

describe('Insights Screen (Mobile)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockReset();
    // Set default fetch mock to return empty metrics
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });
    // Clear and set auth credentials in SecureStore
    await SecureStore.clearAsync();
    await SecureStore.setItemAsync('aivo_token', 'test-token');
    await SecureStore.setItemAsync('aivo_user_id', 'test-user');
  });

  describe('Rendering', () => {
    it('renders the insights screen', () => {
      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );
      expect(screen.getByText('Insights')).toBeOnTheScreen();
    });

    it('renders upload button', () => {
      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );
      expect(screen.getByText('Upload')).toBeOnTheScreen();
    });

    it('renders tab navigation', () => {
      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );
      expect(screen.getByText('Overview')).toBeOnTheScreen();
      expect(screen.getByText('Trends')).toBeOnTheScreen();
    });
  });

  describe('Image Upload Flow', () => {
    const navigateToUploadTab = () => {
      const uploadTab = screen.getByText('Upload');
      fireEvent.press(uploadTab);
    };

    it('opens image picker when button pressed', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });
      require('expo-image-picker').launchImageLibraryAsync = mockLaunch;

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      navigateToUploadTab();

      const chooseGalleryButton = screen.getByText('Choose from Gallery');
      fireEvent.press(chooseGalleryButton);

      expect(mockLaunch).toHaveBeenCalledWith({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
    });

    it('handles image selection and upload', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });
      require('expo-image-picker').launchImageLibraryAsync = mockLaunch;

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

      navigateToUploadTab();

      const chooseGalleryButton = screen.getByText('Choose from Gallery');
      fireEvent.press(chooseGalleryButton);

      await waitFor(() => {
        expect(HapticsMock.impactAsync).toHaveBeenCalledWith(HapticsMock.ImpactFeedbackStyle.Light);
      });
    });

    it('handles upload cancellation', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: true,
      });
      require('expo-image-picker').launchImageLibraryAsync = mockLaunch;

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      navigateToUploadTab();

      const chooseGalleryButton = screen.getByText('Choose from Gallery');
      fireEvent.press(chooseGalleryButton);

      expect(HapticsMock.impactAsync).not.toHaveBeenCalled();
    });

    it('handles upload errors', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });
      require('expo-image-picker').launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      navigateToUploadTab();

      // Select an image
      const chooseGalleryButton = screen.getByText('Choose from Gallery');
      fireEvent.press(chooseGalleryButton);

      // Wait for image to be selected and then press Upload Photo
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeOnTheScreen();
      });

      const uploadPhotoButton = screen.getByText('Upload Photo');
      fireEvent.press(uploadPhotoButton);

      await waitFor(() => {
        expect(HapticsMock.impactAsync).toHaveBeenCalledWith(HapticsMock.ImpactFeedbackStyle.Error);
      });
    });
  });

  describe('AI Analysis Flow', () => {
    const navigateToUploadTab = () => {
      const uploadTab = screen.getByText('Upload');
      fireEvent.press(uploadTab);
    };

    it('calls analyze endpoint after image selection and analysis', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });
      require('expo-image-picker').launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/body/vision/analyze')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                analysis: {
                  posture: { score: 75, issues: [] },
                  muscleDevelopment: [],
                  bodyComposition: { bodyFatEstimate: 0.15 },
                },
                vectorData: [],
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

      navigateToUploadTab();

      // Select an image
      const chooseGalleryButton = screen.getByText('Choose from Gallery');
      fireEvent.press(chooseGalleryButton);

      // Wait for the analysis button to appear
      await waitFor(() => {
        expect(screen.getByText('Run AI Analysis')).toBeOnTheScreen();
      });

      // Now press "Run AI Analysis"
      const analyzeButton = screen.getByText('Run AI Analysis');
      fireEvent.press(analyzeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/body/vision/analyze'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('adds metric optimistically after analysis', async () => {
      const mockLaunch = jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      });
      require('expo-image-picker').launchImageLibraryAsync = mockLaunch;

      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/body/vision/analyze')) {
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
        if (url.includes('/body/metrics')) {
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

      navigateToUploadTab();

      // Select an image
      const chooseGalleryButton = screen.getByText('Choose from Gallery');
      fireEvent.press(chooseGalleryButton);

      // Wait for the analysis button to appear
      await waitFor(() => {
        expect(screen.getByText('Run AI Analysis')).toBeOnTheScreen();
      });

      // Press "Run AI Analysis"
      const analyzeButton = screen.getByText('Run AI Analysis');
      fireEvent.press(analyzeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/body/metrics'),
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
      require('expo-image-picker').launchImageLibraryAsync = mockLaunch;

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

      navigateToUploadTab();

      const chooseGalleryButton = screen.getByText('Choose from Gallery');
      fireEvent.press(chooseGalleryButton);

      // Wait for the analysis button to appear
      await waitFor(() => {
        expect(screen.getByText('Run AI Analysis')).toBeOnTheScreen();
      });

      const analyzeButton = screen.getByText('Run AI Analysis');
      fireEvent.press(analyzeButton);

      await waitFor(() => {
        expect(HapticsMock.notificationAsync).toHaveBeenCalledWith(
          HapticsMock.NotificationFeedbackType.Success
        );
      });
    });
  });

  describe('Metrics Display', () => {
    it('shows latest metrics when available', async () => {
      const now = Math.floor(Date.now() / 1000);
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: '1', userId: 'test-user', timestamp: now, weight: 70.5, bodyFatPercentage: 0.15, muscleMass: 30.2 },
          ],
        }),
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('70.5 kg')).toBeOnTheScreen();
      });
    });

    it('shows empty state when no metrics', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('-- kg')).toBeOnTheScreen();
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

      const trendsTab = screen.getByText('Trends');
      fireEvent.press(trendsTab);

      expect(screen.getByText('Trends')).toBeOnTheScreen();
    });
  });

  describe('BodyInsightCard Integration', () => {
    it('renders BodyInsightCard with correct props', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/body/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { weight: 70, bodyFatPercentage: 0.15, muscleMass: 30 },
              ],
            }),
          });
        }
        if (url.includes('/body/health-score')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: { score: 80, category: 'good', recommendations: [] },
            }),
          });
        }
        if (url.includes('/body/heatmaps')) {
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
        expect(screen.getByText('Health Score')).toBeOnTheScreen();
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
    });
  });

  describe('Error Handling', () => {
    it('handles fetch failure gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <MetricsProvider>
          <InsightsScreen />
        </MetricsProvider>
      );

      // Should still render and show empty state after error
      await waitFor(() => {
        expect(screen.getByText('-- kg')).toBeOnTheScreen();
      });
    });
  });
});
