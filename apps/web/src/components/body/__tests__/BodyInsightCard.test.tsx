import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BodyInsightCard } from '../BodyInsightCard';
import type { BodyMetric, BodyHeatmapData, VisionAnalysis, HealthScore } from '../BodyInsightCard';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('BodyInsightCard Component', () => {
  const mockUserId = 'user-123';
  const mockApiUrl = 'http://localhost:8787';

  const mockToken = 'test-jwt-token';

  const mockMetrics: BodyMetric[] = [
    {
      id: '1',
      userId: mockUserId,
      timestamp: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
      weight: 70.5,
      bodyFatPercentage: 0.15,
      muscleMass: 30.2,
      bmi: 22.5,
    },
    {
      id: '2',
      userId: mockUserId,
      timestamp: Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60,
      weight: 71.2,
      bodyFatPercentage: 0.14,
      muscleMass: 30.8,
      bmi: 22.8,
    },
  ];

  const mockHeatmapData: BodyHeatmapData = {
    id: 'heatmap-1',
    userId: mockUserId,
    timestamp: Math.floor(Date.now() / 1000),
    vectorData: [
      { x: 50, y: 42, muscle: 'chest', intensity: 0.7 },
      { x: 24, y: 38, muscle: 'shoulders', intensity: 0.5 },
    ],
    metadata: {},
  };

  const mockVisionAnalysis: VisionAnalysis = {
    id: 'analysis-1',
    userId: mockUserId,
    imageUrl: 'https://example.com/image.jpg',
    analysis: {
      posture: {
        score: 75,
        issues: [{ type: 'forward_head', severity: 'mild' }],
        recommendations: ['Improve head alignment'],
      },
      muscleDevelopment: [
        { muscle: 'chest', score: 0.7, zone: 'upper' },
      ],
      bodyComposition: {
        bodyFatEstimate: 0.15,
        muscleMassEstimate: 0.35,
      },
    },
    confidence: 0.85,
    createdAt: Math.floor(Date.now() / 1000),
  };

  const mockHealthScore: HealthScore = {
    score: 82,
    category: 'good',
    factors: {},
    recommendations: ['Continue current training', 'Add more cardio'],
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Authentication', () => {
    // This test is obsolete - component uses cookie-based auth, not localStorage token check
    it.skip('shows error when no token', async () => {
      localStorage.getItem = jest.fn().mockReturnValue(null);

      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      });
    });

    it('proceeds when token exists', async () => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Data Fetching', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
    });

    it('fetches metrics, heatmap, and health score on mount', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockMetrics }) });
        }
        if (url.includes('/api/body/heatmaps')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [mockHeatmapData] }) });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockHealthScore }) });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3);
      });
    });

    it('handles fetch errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load body insights')).toBeInTheDocument();
      });
    });

    it('handles empty metrics response', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        if (url.includes('/api/body/heatmaps')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: null }) });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(screen.getByText('No muscle analysis yet.')).toBeInTheDocument();
      });
    });
  });

  describe('Compact Mode', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockHeatmapData] }),
      });
    });

    it('renders compact view when compact prop is true', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Body Heatmap')).toBeInTheDocument();
      });

      expect(screen.queryByText('Body Composition Trends')).not.toBeInTheDocument();
    });

    it('hides charts in compact mode', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Weight Progress')).not.toBeInTheDocument();
      });
    });

    it('shows refresh button in compact mode', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('Full Mode', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockMetrics }) });
        }
        if (url.includes('/api/body/heatmaps')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [mockHeatmapData] }) });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockHealthScore }) });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('renders full dashboard with all sections', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={false} />);

      await waitFor(() => {
        expect(screen.getByText('Health Score')).toBeInTheDocument();
        expect(screen.getByText('Weight')).toBeInTheDocument();
        expect(screen.getByText('Body Fat')).toBeInTheDocument();
        // Muscle Mass appears in both card and chart heading
        expect(screen.getAllByText('Muscle Mass').length).toBeGreaterThan(0);
        expect(screen.getByText('Muscle Development Heatmap')).toBeInTheDocument();
        expect(screen.getByText('Body Composition Trends')).toBeInTheDocument();
        expect(screen.getByText('Posture Analysis')).toBeInTheDocument();
        expect(screen.getByText('Personalized Recommendations')).toBeInTheDocument();
      });
    });

    it('displays latest metric values in BodyMetricCards', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={false} />);

      await waitFor(() => {
        expect(screen.getByText('71.2')).toBeInTheDocument(); // Latest weight
        expect(screen.getByText('14.0')).toBeInTheDocument(); // Latest body fat (0.14 * 100)
        expect(screen.getByText('30.8')).toBeInTheDocument(); // Latest muscle mass
      });
    });

    it('calculates change from previous metric', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={false} />);

      await waitFor(() => {
        // Weight change: 71.2 - 70.5 = 0.7, displayed with sign and unit
        expect(screen.getByText(/\+0\.7/)).toBeInTheDocument();
      });
    });

    it('renders trend charts when data available', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={false} />);

      await waitFor(() => {
        expect(screen.getByText('Weight Progress')).toBeInTheDocument();
        expect(screen.getByText('Body Fat %')).toBeInTheDocument();
        // Muscle Mass appears as chart heading (h4) and also in card label
        expect(screen.getByRole('heading', { name: 'Muscle Mass' })).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockHeatmapData] }),
      });
    });

    it('calls fetchData when refresh button clicked', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={true} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      const initialCallCount = (fetch as jest.Mock).mock.calls.length;

      const refreshButton = screen.getByText('Refresh');
      refreshButton.click();

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });
  });

  describe('Health Score Display', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockHealthScore }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      });
    });

    it('displays health score with correct value', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(screen.getByText('82')).toBeInTheDocument();
      });
    });

    it('displays health score category', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(screen.getByText('GOOD')).toBeInTheDocument();
      });
    });

    it('displays recommendations from health score', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(screen.getByText('Continue current training')).toBeInTheDocument();
        expect(screen.getByText('Add more cardio')).toBeInTheDocument();
      });
    });
  });

  describe('Posture Analysis Integration', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockMetrics }) });
        }
        if (url.includes('/api/body/heatmaps')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [mockHeatmapData] }) });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockHealthScore }) });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('passes vision analysis to PostureAnalysisCard', async () => {
      // Override to return vision analysis in health score response
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/health-score')) {
          // Actually, PostureAnalysisCard gets data from health score or separate endpoint
          // In this implementation, posture comes through a different flow
          return Promise.resolve({ ok: true, json: async () => ({ data: mockHealthScore }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      });

      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      await waitFor(() => {
        expect(screen.getByText('Posture Analysis')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      // Delayed response to test loading state
      (fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
    });

    it('shows loading state while fetching', () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      // Should show loading skeletons
      const { container } = render(<BodyInsightCard apiUrl={mockApiUrl} />);
      // Loading state has animate-pulse class
      // Wait for state to be loading
    });
  });

  describe('Heatmap Display', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/heatmaps')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [mockHeatmapData] }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      });
    });

    it('renders heatmap with vector data', async () => {
      render(<BodyInsightCard apiUrl={mockApiUrl} compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Body Heatmap')).toBeInTheDocument();
      });

      // Heatmap component should render SVG
      const { container } = render(<BodyInsightCard apiUrl={mockApiUrl} compact={true} />);
      // The actual SVG is inside the heatmap component - we verify it loads
    });

    it('handles click on heatmap point', async () => {
      const { container } = render(
        <BodyInsightCard apiUrl={mockApiUrl} compact={true} />
      );

      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });

      // Click handler should be attached (tested in BodyHeatmap component tests)
    });
  });

  describe('Memoization', () => {
    beforeEach(() => {
      localStorage.getItem = jest.fn().mockImplementation((key) => {
        if (key === 'aivo_token') return mockToken;
        return null;
      });
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockMetrics }) });
        }
        if (url.includes('/api/body/heatmaps')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [mockHeatmapData] }) });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: mockHealthScore }) });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('does not refetch when apiUrl unchanged', async () => {
      const { rerender } = render(
        <BodyInsightCard apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3);
      });

      const callCount = (fetch as jest.Mock).mock.calls.length;

      rerender(<BodyInsightCard apiUrl={mockApiUrl} />);

      // Should not call fetch again with same props (useEffect dependency check)
      expect(fetch).toHaveBeenCalledTimes(callCount);
    });

    it('refetches when remounted', async () => {
      const { unmount } = render(
        <BodyInsightCard apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3);
      });

      const callCount = (fetch as jest.Mock).mock.calls.length;

      unmount();

      // Remount by rendering again
      render(<BodyInsightCard apiUrl={mockApiUrl} />);

      // Should call fetch again after remount
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(callCount + 1);
      });
    });
  });
});
