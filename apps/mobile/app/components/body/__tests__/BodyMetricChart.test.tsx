import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BodyMetricChart, MuscleBalanceChart, HealthScoreGauge } from './BodyMetricChart';

// Mock Victory Native
vi.mock('victory-native', () => ({
  VictoryChart: ({ children }: any) => <div data-testid="victory-chart">{children}</div>,
  VictoryLine: ({ data }: any) => <div data-testid="victory-line" data-count={data.length} />,
  VictoryArea: ({ data }: any) => <div data-testid="victory-area" data-count={data.length} />,
  VictoryBar: ({ data }: any) => <div data-testid="victory-bar" data-count={data.length} />,
  VictoryAxis: ({ dependentAxis, tickFormat }: any) => (
    <div data-testid="victory-axis" data-dependent={dependentAxis} data-format={tickFormat?.toString()} />
  ),
  VictoryTooltip: ({ children }: any) => <div data-testid="victory-tooltip">{children}</div>,
  VictoryTheme: {
    material: {},
  },
}));

describe('Mobile BodyMetricChart Component', () => {
  const mockData = [
    { date: 'Jan 15', value: 70.5 },
    { date: 'Jan 22', value: 71.2 },
    { date: 'Jan 29', value: 70.8 },
  ];

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <BodyMetricChart data={mockData} metric="weight" />
      );
      expect(container).toBeInTheDocument();
    });

    it('renders VictoryChart with data', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(screen.getByTestId('victory-chart')).toBeInTheDocument();
    });

    it('renders empty state with no data', () => {
      render(<BodyMetricChart data={[]} metric="weight" />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders with custom height', () => {
      const { container } = render(
        <BodyMetricChart data={mockData} metric="weight" height={300} />
      );
      expect(container.firstChild).toHaveStyle({ height: 300 });
    });

    it('renders VictoryArea for area chart', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(screen.getByTestId('victory-area')).toBeInTheDocument();
    });
  });

  describe('Metric Types', () => {
    it('renders weight chart', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(screen.getByTestId('victory-chart')).toBeInTheDocument();
    });

    it('renders body fat chart', () => {
      render(<BodyMetricChart data={mockData} metric="bodyFat" />);
      expect(screen.getByTestId('victory-chart')).toBeInTheDocument();
    });

    it('renders muscle mass chart', () => {
      render(<BodyMetricChart data={mockData} metric="muscleMass" />);
      expect(screen.getByTestId('victory-chart')).toBeInTheDocument();
    });

    it('renders BMI chart', () => {
      render(<BodyMetricChart data={mockData} metric="bmi" />);
      expect(screen.getByTestId('victory-chart')).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('passes data to Victory components', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      const area = screen.getByTestId('victory-area');
      expect(area).toHaveAttribute('data-count', '3');
    });

    it('handles single data point', () => {
      const singlePoint = [{ date: 'Jan 15', value: 70.5 }];
      render(<BodyMetricChart data={singlePoint} metric="weight" />);
      expect(screen.getByTestId('victory-area')).toHaveAttribute('data-count', '1');
    });
  });

  describe('Styling', () => {
    it('uses default height of 200', () => {
      const { container } = render(
        <BodyMetricChart data={mockData} metric="weight" />
      );
      expect(container.firstChild).toHaveStyle({ height: 200 });
    });

    it('accepts custom height', () => {
      const { container } = render(
        <BodyMetricChart data={mockData} metric="weight" height={350} />
      );
      expect(container.firstChild).toHaveStyle({ height: 350 });
    });
  });
});

describe('Mobile MuscleBalanceChart Component', () => {
  const mockMuscleData = [
    { muscle: 'chest', current: 65 },
    { muscle: 'back', current: 72 },
    { muscle: 'legs', current: 85 },
  ];

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <MuscleBalanceChart data={mockMuscleData} />
      );
      expect(container).toBeInTheDocument();
    });

    it('renders VictoryChart', () => {
      render(<MuscleBalanceChart data={mockMuscleData} />);
      expect(screen.getByTestId('victory-chart')).toBeInTheDocument();
    });

    it('renders VictoryBar for each muscle', () => {
      render(<MuscleBalanceChart data={mockMuscleData} />);
      const bars = screen.getAllByTestId('victory-bar');
      expect(bars.length).toBe(mockMuscleData.length);
    });

    it('renders empty state with no data', () => {
      render(<MuscleBalanceChart data={[]} />);
      expect(screen.getByText('No muscle data available')).toBeInTheDocument();
    });

    it('renders with custom height', () => {
      const { container } = render(
        <MuscleBalanceChart data={mockMuscleData} height={300} />
      );
      expect(container.firstChild).toHaveStyle({ height: 300 });
    });
  });

  describe('Axes', () => {
    it('renders axes', () => {
      render(<MuscleBalanceChart data={mockMuscleData} />);
      const axes = screen.getAllByTestId('victory-axis');
      expect(axes.length).toBeGreaterThan(0);
    });
  });
});

describe('Mobile HealthScoreGauge Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <HealthScoreGauge score={75} category="good" />
      );
      expect(container).toBeInTheDocument();
    });

    it('displays score', () => {
      render(<HealthScoreGauge score={85} category="excellent" />);
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('displays category in uppercase', () => {
      render(<HealthScoreGauge score={85} category="excellent" />);
      expect(screen.getByText('EXCELLENT')).toBeInTheDocument();
    });

    it('renders gauge container', () => {
      const { container } = render(
        <HealthScoreGauge score={75} category="fair" />
      );
      expect(container.querySelector('.gaugeContainer')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles score 0', () => {
      render(<HealthScoreGauge score={0} category="poor" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles score 100', () => {
      render(<HealthScoreGauge score={100} category="excellent" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles all category types', () => {
      const categories: Array<'poor' | 'fair' | 'good' | 'excellent'> = ['poor', 'fair', 'good', 'excellent'];
      categories.forEach((category) => {
        const { container, unmount } = render(
          <HealthScoreGauge score={50} category={category} />
        );
        expect(container).toBeInTheDocument();
        unmount();
      });
    });
  });
});
