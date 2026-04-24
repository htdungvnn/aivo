import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native';
import { PostureAnalysisCard } from '../PostureAnalysisCard';

// Mock NativeWind/Styled components
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

describe('Mobile PostureAnalysisCard Component', () => {
  const mockAssessment = {
    score: 75,
    issues: [
      { type: 'forward_head', severity: 'mild' },
      { type: 'rounded_shoulders', severity: 'moderate' },
    ],
    recommendations: [
      'Keep your head aligned with your spine',
      'Pull shoulders back and down',
    ],
  };

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      const { container } = render(<PostureAnalysisCard loading={true} />);
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('does not show content when loading', () => {
      render(<PostureAnalysisCard loading={true} />);
      expect(screen.queryByText('Posture Analysis')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no assessment provided', () => {
      render(<PostureAnalysisCard />);
      expect(screen.getByText('Posture Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Upload a body photo/)).toBeInTheDocument();
    });

    it('shows empty state when assessment is undefined', () => {
      render(<PostureAnalysisCard assessment={undefined} />);
      expect(screen.getByText(/Upload a body photo/)).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('displays the posture score', () => {
      render(<PostureAnalysisCard assessment={mockAssessment} />);
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('displays excellent score label for >= 80', () => {
      const excellentAssessment = { ...mockAssessment, score: 85, issues: [] };
      render(<PostureAnalysisCard assessment={excellentAssessment} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('displays good score label for 60-79', () => {
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('displays fair score label for 40-59', () => {
      const fairAssessment = { ...mockAssessment, score: 45, issues: [] };
      render(<PostureAnalysisCard assessment={fairAssessment} />);
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('displays needs work label for < 40', () => {
      const poorAssessment = { ...mockAssessment, score: 30, issues: [] };
      render(<PostureAnalysisCard assessment={poorAssessment} />);
      expect(screen.getByText('Needs Work')).toBeInTheDocument();
    });
  });

  describe('Issues List', () => {
    it('displays all detected issues', () => {
      render(<PostureAnalysisCard assessment={mockAssessment} />);
      expect(screen.getByText('Forward Head')).toBeInTheDocument();
      expect(screen.getByText('Rounded Shoulders')).toBeInTheDocument();
    });

    it('displays issue severity badges', () => {
      render(<PostureAnalysisCard assessment={mockAssessment} />);
      expect(screen.getByText('mild')).toBeInTheDocument();
      expect(screen.getByText('moderate')).toBeInTheDocument();
    });

    it('does not show issues section when no issues', () => {
      const noIssuesAssessment = { score: 95, issues: [], recommendations: [] };
      render(<PostureAnalysisCard assessment={noIssuesAssessment} />);
      expect(screen.queryByText('Detected Issues')).not.toBeInTheDocument();
    });

    it('handles unknown issue types', () => {
      const unknownIssueAssessment = {
        score: 60,
        issues: [{ type: 'unknown_issue', severity: 'mild' }],
        recommendations: [],
      };
      render(<PostureAnalysisCard assessment={unknownIssueAssessment} />);
      expect(screen.getByText('unknown_issue')).toBeInTheDocument();
    });
  });

  describe('Recommendations', () => {
    it('displays all recommendations', () => {
      render(<PostureAnalysisCard assessment={mockAssessment} />);
      expect(screen.getByText('Keep your head aligned with your spine')).toBeInTheDocument();
      expect(screen.getByText('Pull shoulders back and down')).toBeInTheDocument();
    });

    it('shows checkmark for recommendations', () => {
      const { container } = render(<PostureAnalysisCard assessment={mockAssessment} />);
      const checkmarks = container.querySelectorAll('.text-emerald-400');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('does not show recommendations section when empty', () => {
      const noRecsAssessment = { score: 75, issues: [], recommendations: [] };
      render(<PostureAnalysisCard assessment={noRecsAssessment} />);
      expect(screen.queryByText('Recommendations')).not.toBeInTheDocument();
    });
  });

  describe('Score Bar', () => {
    it('renders score progress bar', () => {
      const { container } = render(<PostureAnalysisCard assessment={mockAssessment} />);
      const progressBar = container.querySelector('.h-2');
      expect(progressBar).toBeInTheDocument();
    });

    it('sets bar width based on score', () => {
      const { container } = render(<PostureAnalysisCard assessment={mockAssessment} />);
      const progressBarFill = container.querySelector('.h-full');
      expect(progressBarFill).toHaveStyle({ width: '75%' });
    });

    it('applies emerald color for good scores', () => {
      const { container } = render(<PostureAnalysisCard assessment={mockAssessment} />);
      const progressBarFill = container.querySelector('.h-full');
      expect(progressBarFill).toHaveClass('bg-emerald-500');
    });

    it('applies amber color for poor scores', () => {
      const poorAssessment = { ...mockAssessment, score: 35, issues: [] };
      const { container } = render(<PostureAnalysisCard assessment={poorAssessment} />);
      const progressBarFill = container.querySelector('.h-full');
      expect(progressBarFill).toHaveClass('bg-amber-500');
    });
  });

  describe('Edge Cases', () => {
    it('handles score of 0', () => {
      const zeroAssessment = { score: 0, issues: [], recommendations: [] };
      render(<PostureAnalysisCard assessment={zeroAssessment} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles score of 100', () => {
      const perfectAssessment = { score: 100, issues: [], recommendations: [] };
      render(<PostureAnalysisCard assessment={perfectAssessment} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles maximum issues', () => {
      const manyIssuesAssessment = {
        score: 30,
        issues: [
          { type: 'forward_head', severity: 'severe' },
          { type: 'rounded_shoulders', severity: 'severe' },
          { type: 'hyperlordosis', severity: 'moderate' },
          { type: 'kyphosis', severity: 'mild' },
          { type: 'pelvic_tilt', severity: 'severe' },
        ],
        recommendations: [],
      };
      render(<PostureAnalysisCard assessment={manyIssuesAssessment} />);
      const issueTypes = ['Forward Head', 'Rounded Shoulders', 'Hyperlordosis', 'Kyphosis', 'Pelvic Tilt'];
      issueTypes.forEach((type) => {
        expect(screen.getByText(type)).toBeInTheDocument();
      });
    });
  });
});
