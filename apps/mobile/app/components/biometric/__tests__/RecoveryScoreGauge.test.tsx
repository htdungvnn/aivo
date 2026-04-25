import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native';
import { RecoveryScoreGauge } from '../RecoveryScoreGauge';

describe('RecoveryScoreGauge Component', () => {
  describe('Rendering', () => {
    it('should render with a score value', () => {
      render(<RecoveryScoreGauge score={75} />);
      expect(screen.getByText('75')).toBeOnTheScreen();
    });

    it('should render with a score of 100', () => {
      render(<RecoveryScoreGauge score={100} />);
      expect(screen.getByText('100')).toBeOnTheScreen();
    });

    it('should render with a score of 0', () => {
      render(<RecoveryScoreGauge score={0} />);
      expect(screen.getByText('0')).toBeOnTheScreen();
    });

    it('should render rounded decimal scores', () => {
      render(<RecoveryScoreGauge score={75.5} />);
      expect(screen.getByText('76')).toBeOnTheScreen();
    });

    it('should display category label', () => {
      render(<RecoveryScoreGauge score={75} />);
      expect(screen.getByText('Good')).toBeOnTheScreen();
    });

    it('should display Excellent label for high scores', () => {
      render(<RecoveryScoreGauge score={85} />);
      expect(screen.getByText('Excellent')).toBeOnTheScreen();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      const { UNSAFE_root: container } = render(<RecoveryScoreGauge score={75} size="sm" />);
      expect(container).toBeOnTheScreen();
    });

    it('should render with medium size (default)', () => {
      const { UNSAFE_root: container } = render(<RecoveryScoreGauge score={75} size="md" />);
      expect(container).toBeOnTheScreen();
    });

    it('should render with large size', () => {
      const { UNSAFE_root: container } = render(<RecoveryScoreGauge score={75} size="lg" />);
      expect(container).toBeOnTheScreen();
    });
  });

  describe('Props', () => {
    it('should accept testID for testing', () => {
      const { getByTestId } = render(
        <RecoveryScoreGauge score={75} testID="recovery-gauge" />
      );
      expect(getByTestId('recovery-gauge')).toBeOnTheScreen();
    });

    it('should accept accessibilityLabel', () => {
      const { getByLabelText } = render(
        <RecoveryScoreGauge
          score={75}
          accessibilityLabel="Recovery Score Gauge"
        />
      );
      expect(getByLabelText('Recovery Score Gauge')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('should handle score above 100', () => {
      render(<RecoveryScoreGauge score={110} />);
      expect(screen.getByText('110')).toBeOnTheScreen();
    });

    it('should handle negative score', () => {
      render(<RecoveryScoreGauge score={-10} />);
      expect(screen.getByText('-10')).toBeOnTheScreen();
    });

    it('should handle very large score', () => {
      render(<RecoveryScoreGauge score={999} />);
      expect(screen.getByText('999')).toBeOnTheScreen();
    });
  });
});
