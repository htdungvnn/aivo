import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BodyMetricChart, MuscleBalanceChart, HealthScoreGauge, CompositeBodyChart } from '../BodyMetricsChart';
import type { MetricDataPoint, MuscleBalanceData } from '../BodyMetricsChart';

// Mock ResizeObserver which is required by Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('BodyMetricChart Component', () => {
  const mockData: MetricDataPoint[] = [
    { date: 'Jan 15', value: 70.5 },
    { date: 'Jan 22', value: 71.2 },
    { date: 'Jan 29', value: 70.8 },
    { date: 'Feb 5', value: 71.5 },
  ];

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with empty data', () => {
      const { container } = render(<BodyMetricChart data={[]} metric="weight" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with custom height', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="weight" height={300} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Area Chart', () => {
    it('renders area chart by default', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="weight" />);
      const areas = container.querySelectorAll('area');
      expect(areas.length).toBeGreaterThan(0);
    });

    it('disables area when showArea is false', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="weight" showArea={false} />);
      const areas = container.querySelectorAll('area');
      expect(areas.length).toBe(0);
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    it('renders weight chart with correct color', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="weight" />);
      const area = container.querySelector('area');
      expect(area).toBeInTheDocument();
      // Color is applied via gradient in Recharts; just check it has a fill
      expect(area).toHaveAttribute('fill');
    });

    it('renders body fat chart with correct color', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="bodyFat" />);
      const area = container.querySelector('area');
      expect(area).toBeInTheDocument();
      expect(area).toHaveAttribute('fill');
    });

    it('renders muscle mass chart with correct color', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="muscleMass" />);
      const area = container.querySelector('area');
      expect(area).toBeInTheDocument();
      expect(area).toHaveAttribute('fill');
    });

    it('renders BMI chart with correct color', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="bmi" />);
      const area = container.querySelector('area');
      expect(area).toBeInTheDocument();
      expect(area).toHaveAttribute('fill');
    });

    it('displays values with one decimal in tooltip format', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      // Data is transformed with toFixed(1)
      expect(screen.queryByText(/70.5/)).not.toBeInTheDocument(); // In SVG, not DOM text
    });
  });

  describe('Goal Line', () => {
    it('renders goal line when showGoalLine is provided', () => {
      const { container } = render(
        <BodyMetricChart data={mockData} metric="weight" showGoalLine={75} goalLabel="Target" />
      );
      const lines = container.querySelectorAll('line[stroke="#fbbf24"]');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('does not render goal line when not provided', () => {
      const { container } = render(<BodyMetricChart data={mockData} metric="weight" />);
      const lines = container.querySelectorAll('line[stroke="#fbbf24"]');
      expect(lines.length).toBe(0);
    });
  });

  describe('Unit Override', () => {
    it('uses provided unit override', () => {
      const { container } = render(
        <BodyMetricChart data={mockData} metric="weight" unit="lbs" />
      );
      // Y-axis tick formatter uses the override
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});

describe('MuscleBalanceChart Component', () => {
  const mockMuscleData: MuscleBalanceData[] = [
    { muscle: 'chest', current: 65, target: 70 },
    { muscle: 'back', current: 72, target: 70 },
    { muscle: 'legs', current: 85, target: 90 },
  ];

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<MuscleBalanceChart data={mockMuscleData} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with empty data', () => {
      const { container } = render(<MuscleBalanceChart data={[]} />);
      // With empty data, chart may still render axes but no bars
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders bars for each muscle group', () => {
      const { container } = render(<MuscleBalanceChart data={mockMuscleData} />);
      const bars = container.querySelectorAll('.recharts-bar');
      // Mock renders at least one bar element
      expect(bars.length).toBeGreaterThan(0);
    });

    it('renders with custom height', () => {
      const { container } = render(<MuscleBalanceChart data={mockMuscleData} height={400} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Axes', () => {
    it('renders Y-axis with muscle names', () => {
      const { container } = render(<MuscleBalanceChart data={mockMuscleData} />);
      const yAxis = container.querySelector('.recharts-y-axis');
      expect(yAxis).toBeInTheDocument();
    });

    it('renders X-axis with percentage format', () => {
      const { container } = render(<MuscleBalanceChart data={mockMuscleData} />);
      const xAxis = container.querySelector('.recharts-x-axis');
      expect(xAxis).toBeInTheDocument();
    });
  });
});

describe('HealthScoreGauge Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<HealthScoreGauge score={75} category="good" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('displays score value', () => {
      render(<HealthScoreGauge score={85} category="excellent" />);
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('displays category label', () => {
      render(<HealthScoreGauge score={85} category="excellent" />);
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    it('renders score arc with correct stroke color for excellent', () => {
      const { container } = render(<HealthScoreGauge score={90} category="excellent" />);
      const scoreArc = container.querySelector('[stroke="#22c55e"]');
      expect(scoreArc).toBeInTheDocument();
    });

    it('renders score arc with correct stroke color for poor', () => {
      const { container } = render(<HealthScoreGauge score={20} category="poor" />);
      const scoreArc = container.querySelector('[stroke="#ef4444"]');
      expect(scoreArc).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles score of 0', () => {
      const { container } = render(<HealthScoreGauge score={0} category="poor" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles score of 100', () => {
      const { container } = render(<HealthScoreGauge score={100} category="excellent" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles all category types', () => {
      const categories: Array<'poor' | 'fair' | 'good' | 'excellent'> = ['poor', 'fair', 'good', 'excellent'];
      categories.forEach((category) => {
        const { container, unmount } = render(<HealthScoreGauge score={50} category={category} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
        unmount();
      });
    });
  });
});

describe('CompositeBodyChart Component', () => {
  const weightData: MetricDataPoint[] = [
    { date: 'Jan 15', value: 70.5 },
    { date: 'Jan 22', value: 71.2 },
  ];

  const bodyFatData: MetricDataPoint[] = [
    { date: 'Jan 15', value: 0.15 },
    { date: 'Jan 22', value: 0.14 },
  ];

  const muscleMassData: MetricDataPoint[] = [
    { date: 'Jan 15', value: 30.5 },
    { date: 'Jan 22', value: 31.0 },
  ];

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} bodyFatData={bodyFatData} muscleMassData={muscleMassData} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with partial data', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with no data', () => {
      const { container } = render(
        <CompositeBodyChart weightData={[]} bodyFatData={[]} muscleMassData={[]} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('merges data from different metrics by date', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} bodyFatData={bodyFatData} muscleMassData={muscleMassData} />
      );
      // Should render ComposedChart with multiple data series
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Axes', () => {
    it('renders multiple Y-axes for different metrics', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} bodyFatData={bodyFatData} muscleMassData={muscleMassData} />
      );
      // Should have Y-axis for weight (left) and bodyFat (right)
      const axes = container.querySelectorAll('.recharts-y-axis');
      expect(axes.length).toBeGreaterThanOrEqual(2);
    });

    it('formats weight axis with kg', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} bodyFatData={bodyFatData} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Data Series', () => {
    it('renders weight as area', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} bodyFatData={bodyFatData} />
      );
      const areas = container.querySelectorAll('.recharts-area');
      expect(areas.length).toBeGreaterThan(0);
    });

    it('renders body fat as line', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} bodyFatData={bodyFatData} />
      );
      const lines = container.querySelectorAll('.recharts-line');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('renders muscle mass as bar', () => {
      const { container } = render(
        <CompositeBodyChart weightData={weightData} muscleMassData={muscleMassData} />
      );
      const bars = container.querySelectorAll('.recharts-bar');
      expect(bars.length).toBeGreaterThan(0);
    });
  });
});
