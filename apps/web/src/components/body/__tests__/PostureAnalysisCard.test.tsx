import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostureAnalysisCard } from '../PostureAnalysisCard';
import type { PostureAssessment } from '../PostureAnalysisCard';

describe('PostureAnalysisCard Component', () => {
  const mockAssessment: PostureAssessment = {
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

  const defaultProps = {
    assessment: mockAssessment,
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
      render(<PostureAnalysisCard {...defaultProps} />);
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('displays excellent score label for >= 80', () => {
      const excellentAssessment: PostureAssessment = {
        ...mockAssessment,
        score: 85,
        issues: [],
      };
      render(<PostureAnalysisCard assessment={excellentAssessment} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('displays good score label for 60-79', () => {
      render(<PostureAnalysisCard {...defaultProps} />);
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('displays fair score label for 40-59', () => {
      const fairAssessment: PostureAssessment = {
        ...mockAssessment,
        score: 45,
        issues: [],
      };
      render(<PostureAnalysisCard assessment={fairAssessment} />);
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('displays needs work label for < 40', () => {
      const poorAssessment: PostureAssessment = {
        ...mockAssessment,
        score: 30,
        issues: [],
      };
      render(<PostureAnalysisCard assessment={poorAssessment} />);
      expect(screen.getByText('Needs Work')).toBeInTheDocument();
    });

    it('applies correct color for excellent score', () => {
      const excellentAssessment: PostureAssessment = {
        ...mockAssessment,
        score: 85,
        issues: [],
      };
      render(<PostureAnalysisCard assessment={excellentAssessment} />);
      const scoreElement = screen.getByText('85');
      expect(scoreElement).toHaveClass('text-emerald-400');
    });

    it('applies correct color for poor score', () => {
      const poorAssessment: PostureAssessment = {
        ...mockAssessment,
        score: 30,
        issues: [],
      };
      render(<PostureAnalysisCard assessment={poorAssessment} />);
      const scoreElement = screen.getByText('30');
      expect(scoreElement).toHaveClass('text-red-400');
    });
  });

  describe('Issues List', () => {
    it('displays all detected issues', () => {
      render(<PostureAnalysisCard {...defaultProps} />);
      expect(screen.getByText('Forward Head')).toBeInTheDocument();
      expect(screen.getByText('Rounded Shoulders')).toBeInTheDocument();
    });

    it('displays issue severity badges', () => {
      render(<PostureAnalysisCard {...defaultProps} />);
      expect(screen.getByText('mild')).toBeInTheDocument();
      expect(screen.getByText('moderate')).toBeInTheDocument();
    });

    it('does not show issues section when no issues', () => {
      const noIssuesAssessment: PostureAssessment = {
        score: 95,
        issues: [],
        recommendations: [],
      };
      render(<PostureAnalysisCard assessment={noIssuesAssessment} />);
      expect(screen.queryByText('Detected Issues')).not.toBeInTheDocument();
    });

    it('handles unknown issue types', () => {
      const unknownIssueAssessment: PostureAssessment = {
        score: 60,
        issues: [{ type: 'unknown_issue', severity: 'mild' }],
        recommendations: [],
      };
      render(<PostureAnalysisCard assessment={unknownIssueAssessment} />);
      expect(screen.getByText('unknown_issue')).toBeInTheDocument();
    });

    it('applies severity-specific styling', () => {
      render(<PostureAnalysisCard {...defaultProps} />);
      const mildBadge = screen.getByText('mild');
      // Check inline style for severity background (mild = amber rgba)
      expect(mildBadge).toHaveStyle({ backgroundColor: 'rgba(251, 191, 36, 0.2)' });
    });
  });

  describe('Recommendations', () => {
    it('displays all recommendations', () => {
      render(<PostureAnalysisCard {...defaultProps} />);
      expect(screen.getByText('Keep your head aligned with your spine')).toBeInTheDocument();
      expect(screen.getByText('Pull shoulders back and down')).toBeInTheDocument();
    });

    it('shows checkmark icons for recommendations', () => {
      const { container } = render(<PostureAnalysisCard {...defaultProps} />);
      const emeraldTexts = container.querySelectorAll('.text-emerald-400');
      expect(emeraldTexts.length).toBeGreaterThan(0);
    });

    it('does not show recommendations section when empty', () => {
      const noRecsAssessment: PostureAssessment = {
        score: 75,
        issues: [],
        recommendations: [],
      };
      render(<PostureAnalysisCard assessment={noRecsAssessment} />);
      expect(screen.queryByText('Recommendations')).not.toBeInTheDocument();
    });
  });

  describe('Score Bar', () => {
    it('renders score progress bar', () => {
      const { container } = render(<PostureAnalysisCard {...defaultProps} />);
      const progressBar = container.querySelector('.h-2 .h-full');
      expect(progressBar).toBeInTheDocument();
    });

    it('sets bar width based on score', () => {
      const { container } = render(<PostureAnalysisCard {...defaultProps} />);
      const progressBar = container.querySelector('.h-full');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('applies emerald gradient for good scores', () => {
      render(<PostureAnalysisCard {...defaultProps} />);
      const { container } = render(<PostureAnalysisCard assessment={mockAssessment} />);
      const progressBar = container.querySelector('.h-full');
      expect(progressBar).toHaveClass('from-emerald-500', 'to-blue-500');
    });

    it('applies amber/red gradient for poor scores', () => {
      const poorAssessment: PostureAssessment = {
        ...mockAssessment,
        score: 35,
        issues: [],
      };
      const { container } = render(<PostureAnalysisCard assessment={poorAssessment} />);
      const progressBar = container.querySelector('.h-full');
      expect(progressBar).toHaveClass('from-amber-500', 'to-red-500');
    });
  });

  describe('Edge Cases', () => {
    it('handles score of 0', () => {
      const zeroAssessment: PostureAssessment = {
        score: 0,
        issues: [],
        recommendations: [],
      };
      render(<PostureAnalysisCard assessment={zeroAssessment} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles score of 100', () => {
      const perfectAssessment: PostureAssessment = {
        score: 100,
        issues: [],
        recommendations: [],
      };
      render(<PostureAnalysisCard assessment={perfectAssessment} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles maximum issues', () => {
      const manyIssuesAssessment: PostureAssessment = {
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
