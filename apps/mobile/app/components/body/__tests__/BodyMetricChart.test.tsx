import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BodyMetricChart, MuscleBalanceChart, HealthScoreGauge } from '../BodyMetricChart';

describe('Mobile BodyMetricChart Component', () => {
  const mockData = [
    { date: 'Jan 15', value: 70.5 },
    { date: 'Jan 22', value: 71.2 },
    { date: 'Jan 29', value: 70.8 },
  ];

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(screen.getByTestId('body-metric-chart')).toBeOnTheScreen();
    });

    it('renders chart with data', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(screen.getByTestId('chart-row')).toBeOnTheScreen();
    });

    it('renders empty state with no data', () => {
      render(<BodyMetricChart data={[]} metric="weight" />);
      expect(screen.getByText('No data available')).toBeOnTheScreen();
    });

    it('renders with custom height', () => {
      render(<BodyMetricChart data={mockData} metric="weight" height={300} />);
      const chart = screen.getByTestId('body-metric-chart');
      expect(chart).toHaveStyle({ height: 300 });
    });

    it('renders bar elements for each data point', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      const bars = screen.getAllByTestId('bar');
      expect(bars.length).toBe(Math.min(mockData.length, 7));
    });

    it('renders date labels for bars', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      const janLabels = screen.getAllByText('Jan');
      expect(janLabels.length).toBe(mockData.length);
    });
  });

  describe('Metric Types', () => {
    it('renders weight chart', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(screen.getByTestId('body-metric-chart')).toBeOnTheScreen();
    });

    it('renders body fat chart', () => {
      render(<BodyMetricChart data={mockData} metric="bodyFat" />);
      expect(screen.getByTestId('body-metric-chart')).toBeOnTheScreen();
    });

    it('renders muscle mass chart', () => {
      render(<BodyMetricChart data={mockData} metric="muscleMass" />);
      expect(screen.getByTestId('body-metric-chart')).toBeOnTheScreen();
    });

    it('renders BMI chart', () => {
      render(<BodyMetricChart data={mockData} metric="bmi" />);
      expect(screen.getByTestId('body-metric-chart')).toBeOnTheScreen();
    });
  });

  describe('Data Processing', () => {
    it('displays min and max values', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      expect(screen.getByTestId('range-min')).toHaveTextContent('70.5');
      expect(screen.getByTestId('range-max')).toHaveTextContent('71.2');
    });

    it('handles single data point', () => {
      const singlePoint = [{ date: 'Jan 15', value: 70.5 }];
      render(<BodyMetricChart data={singlePoint} metric="weight" />);
      const bars = screen.getAllByTestId('bar');
      expect(bars.length).toBe(1);
    });
  });

  describe('Styling', () => {
    it('uses default height of 200', () => {
      render(<BodyMetricChart data={mockData} metric="weight" />);
      const chart = screen.getByTestId('body-metric-chart');
      expect(chart).toHaveStyle({ height: 200 });
    });

    it('accepts custom height', () => {
      render(<BodyMetricChart data={mockData} metric="weight" height={350} />);
      const chart = screen.getByTestId('body-metric-chart');
      expect(chart).toHaveStyle({ height: 350 });
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
      render(<MuscleBalanceChart data={mockMuscleData} />);
      expect(screen.getByTestId('muscle-balance-chart')).toBeOnTheScreen();
    });

    it('renders muscle bars', () => {
      render(<MuscleBalanceChart data={mockMuscleData} />);
      const bars = screen.getAllByTestId('muscle-bar');
      expect(bars.length).toBe(mockMuscleData.length);
    });

    it('renders muscle names', () => {
      render(<MuscleBalanceChart data={mockMuscleData} />);
      expect(screen.getByText('chest')).toBeOnTheScreen();
      expect(screen.getByText('back')).toBeOnTheScreen();
      expect(screen.getByText('legs')).toBeOnTheScreen();
    });

    it('renders empty state with no data', () => {
      render(<MuscleBalanceChart data={[]} />);
      expect(screen.getByText('No muscle data available')).toBeOnTheScreen();
    });

    it('renders with custom height', () => {
      render(<MuscleBalanceChart data={mockMuscleData} height={300} />);
      const chart = screen.getByTestId('muscle-balance-chart');
      expect(chart).toHaveStyle({ height: 300 });
    });
  });

  describe('Data Display', () => {
    it('displays muscle percentages', () => {
      render(<MuscleBalanceChart data={mockMuscleData} />);
      expect(screen.getByText('65%')).toBeOnTheScreen();
      expect(screen.getByText('72%')).toBeOnTheScreen();
      expect(screen.getByText('85%')).toBeOnTheScreen();
    });
  });
});

describe('Mobile HealthScoreGauge Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<HealthScoreGauge score={75} category="good" />);
      expect(screen.getByTestId('health-score-gauge')).toBeOnTheScreen();
    });

    it('displays score', () => {
      render(<HealthScoreGauge score={85} category="excellent" />);
      expect(screen.getByText('85')).toBeOnTheScreen();
    });

    it('displays category in uppercase', () => {
      render(<HealthScoreGauge score={85} category="excellent" />);
      expect(screen.getByText('EXCELLENT')).toBeOnTheScreen();
    });

    it('renders gauge container', () => {
      render(<HealthScoreGauge score={75} category="fair" />);
      expect(screen.getByTestId('health-score-gauge')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles score 0', () => {
      render(<HealthScoreGauge score={0} category="poor" />);
      expect(screen.getByText('0')).toBeOnTheScreen();
    });

    it('handles score 100', () => {
      render(<HealthScoreGauge score={100} category="excellent" />);
      expect(screen.getByText('100')).toBeOnTheScreen();
    });

    it('handles all category types', () => {
      const categories: Array<'poor' | 'fair' | 'good' | 'excellent'> = ['poor', 'fair', 'good', 'excellent'];
      categories.forEach((category) => {
        const { unmount } = render(
          <HealthScoreGauge score={50} category={category} />
        );
        expect(screen.getByTestId('health-score-gauge')).toBeOnTheScreen();
        unmount();
      });
    });
  });
});
