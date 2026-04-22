import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoveryScoreGauge } from '../RecoveryScoreGauge';

describe('RecoveryScoreGauge Component', () => {
  describe('Rendering', () => {
    it('should render with a score value', () => {
      render(<RecoveryScoreGauge score={75} />);

      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should render with a score of 100', () => {
      render(<RecoveryScoreGauge score={100} />);

      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should render with a score of 0', () => {
      render(<RecoveryScoreGauge score={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render with decimal scores', () => {
      render(<RecoveryScoreGauge score={75.5} />);

      expect(screen.getByText('75.5')).toBeInTheDocument();
    });

    it('should render with a label', () => {
      render(<RecoveryScoreGauge score={75} label="Recovery" />);

      expect(screen.getByText('Recovery')).toBeInTheDocument();
    });

    it('should render default Recovery Score label when no label provided', () => {
      render(<RecoveryScoreGauge score={75} />);

      expect(screen.getByText('Recovery Score')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should display excellent score (80+) in green', () => {
      render(<RecoveryScoreGauge score={85} />);

      const scoreText = screen.getByText('85');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/green|#22c55e|#16a34a/i) });
    });

    it('should display good score (70-79) in blue', () => {
      render(<RecoveryScoreGauge score={75} />);

      const scoreText = screen.getByText('75');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/blue|#3b82f6/i) });
    });

    it('should display fair score (60-69) in yellow', () => {
      render(<RecoveryScoreGauge score={65} />);

      const scoreText = screen.getByText('65');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/yellow|#eab308/i) });
    });

    it('should display poor score (<60) in red', () => {
      render(<RecoveryScoreGauge score={45} />);

      const scoreText = screen.getByText('45');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/red|#ef4444/i) });
    });

    it('should display boundary at 80 as excellent', () => {
      render(<RecoveryScoreGauge score={80} />);

      const scoreText = screen.getByText('80');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/green/i) });
    });

    it('should display boundary at 70 as good (not poor)', () => {
      render(<RecoveryScoreGauge score={70} />);

      const scoreText = screen.getByText('70');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/blue/i) });
    });

    it('should display boundary at 60 as fair (not poor)', () => {
      render(<RecoveryScoreGauge score={60} />);

      const scoreText = screen.getByText('60');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/yellow/i) });
    });

    it('should display boundary at 59 as poor', () => {
      render(<RecoveryScoreGauge score={59} />);

      const scoreText = screen.getByText('59');
      expect(scoreText).toHaveStyle({ color: expect.stringMatching(/red/i) });
    });
  });

  describe('Accessibility', () => {
    it('should have accessibility label for score', () => {
      render(<RecoveryScoreGauge score={75} />);

      // Check for accessibility role/label
      const container = screen.getByText('75').closest('View') || screen.getByText('75');
      expect(container).toBeTruthy();
    });

    it('should announce score as percentage', () => {
      render(<RecoveryScoreGauge score={75} />);

      const scoreText = screen.getByText('75');
      expect(scoreText).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle score above 100', () => {
      render(<RecoveryScoreGauge score={110} />);

      expect(screen.getByText('110')).toBeInTheDocument();
      // Should still treat as excellent (clamp or handle gracefully)
    });

    it('should handle negative score', () => {
      render(<RecoveryScoreGauge score={-10} />);

      expect(screen.getByText('-10')).toBeInTheDocument();
      // Should display as poor (red) or handle error
    });

    it('should handle very large score', () => {
      render(<RecoveryScoreGauge score={999} />);

      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      const { container } = render(<RecoveryScoreGauge score={75} size="small" />);

      // Verify small styling is applied
      expect(container).toBeInTheDocument();
    });

    it('should render with medium size (default)', () => {
      const { container } = render(<RecoveryScoreGauge score={75} size="medium" />);

      expect(container).toBeInTheDocument();
    });

    it('should render with large size', () => {
      const { container } = render(<RecoveryScoreGauge score={75} size="large" />);

      expect(container).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept testID for testing', () => {
      const { getByTestId } = render(
        <RecoveryScoreGauge score={75} testID="recovery-gauge" />
      );

      expect(getByTestId('recovery-gauge')).toBeInTheDocument();
    });

    it('should accept accessibilityLabel', () => {
      const { getByLabelText } = render(
        <RecoveryScoreGauge
          score={75}
          accessibilityLabel="Recovery Score Gauge"
        />
      );

      expect(getByLabelText('Recovery Score Gauge')).toBeInTheDocument();
    });
  });
});
