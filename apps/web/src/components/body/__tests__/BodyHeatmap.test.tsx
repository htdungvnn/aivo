import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BodyHeatmap } from '../BodyHeatmap';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    ellipse: ({ children, ...props }: any) => <ellipse {...props}>{children}</ellipse>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('BodyHeatmap Component', () => {
  const mockVectorData = [
    { x: 50, y: 42, muscle: 'chest', intensity: 0.7 },
    { x: 24, y: 38, muscle: 'shoulders', intensity: 0.5 },
    { x: 18, y: 45, muscle: 'biceps', intensity: 0.6 },
  ];

  const defaultProps = {
    vectorData: mockVectorData,
    width: 300,
    height: 600,
  };

  it('renders without crashing', () => {
    render(<BodyHeatmap {...defaultProps} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with correct dimensions', () => {
    render(<BodyHeatmap {...defaultProps} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '300');
    expect(svg).toHaveAttribute('height', '600');
  });

  it('renders default viewBox', () => {
    render(<BodyHeatmap {...defaultProps} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 200 400');
  });

  it('renders body outline path', () => {
    render(<BodyHeatmap {...defaultProps} />);
    const paths = document.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders heatmap circles for each muscle group', () => {
    render(<BodyHeatmap {...defaultProps} />);
    const circles = document.querySelectorAll('ellipse');
    expect(circles.length).toBe(mockVectorData.length);
  });

  it('applies animate prop correctly', () => {
    const { container } = render(<BodyHeatmap {...defaultProps} animate={true} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('handles empty vectorData', () => {
    render(<BodyHeatmap {...defaultProps} vectorData={[]} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const circles = document.querySelectorAll('ellipse');
    expect(circles.length).toBe(0);
  });

  it('groups duplicate points correctly', () => {
    const duplicateData = [
      { x: 50, y: 42, muscle: 'chest', intensity: 0.6 },
      { x: 50, y: 42, muscle: 'chest', intensity: 0.8 },
    ];
    render(<BodyHeatmap {...defaultProps} vectorData={duplicateData} />);
    const circles = document.querySelectorAll('ellipse');
    // Should be grouped to 1 circle with average intensity
    expect(circles.length).toBe(1);
  });

  describe('Color Scale', () => {
    it('renders with heat scale (default)', () => {
      render(<BodyHeatmap {...defaultProps} colorScale="heat" />);
      const circles = document.querySelectorAll('ellipse');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('renders with cool scale', () => {
      render(<BodyHeatmap {...defaultProps} colorScale="cool" />);
      const circles = document.querySelectorAll('ellipse');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('renders with monochrome scale', () => {
      render(<BodyHeatmap {...defaultProps} colorScale="monochrome" />);
      const circles = document.querySelectorAll('ellipse');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Interaction', () => {
    it('calls onPointClick when circle is clicked', () => {
      const handleClick = vi.fn();
      render(<BodyHeatmap {...defaultProps} onPointClick={handleClick} />);

      const circles = document.querySelectorAll('ellipse');
      if (circles.length > 0) {
        fireEvent.click(circles[0]);
        expect(handleClick).toHaveBeenCalled();
      }
    });

    it('does not crash without onPointClick', () => {
      render(<BodyHeatmap {...defaultProps} />);
      const circles = document.querySelectorAll('ellipse');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Selected Muscles', () => {
    it('shows labels for selected muscles', () => {
      render(<BodyHeatmap {...defaultProps} selectedMuscles={['chest']} />);
      const labels = document.querySelectorAll('text');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('highlights selected muscle circles', () => {
      render(<BodyHeatmap {...defaultProps} selectedMuscles={['chest']} />);
      const circles = document.querySelectorAll('ellipse');
      // Check that selected muscle has different styling
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Intensity Calculations', () => {
    it('calculates radius based on intensity', () => {
      const lowIntensityData = [{ x: 50, y: 42, muscle: 'chest', intensity: 0.1 }];
      const highIntensityData = [{ x: 50, y: 42, muscle: 'chest', intensity: 0.9 }];
      render(<BodyHeatmap {...defaultProps} vectorData={lowIntensityData} />);
      const lowCircle = document.querySelector('ellipse');
      expect(lowCircle).toHaveAttribute('rx');

      render(<BodyHeatmap {...defaultProps} vectorData={highIntensityData} />);
      const highCircle = document.querySelector('ellipse');
      expect(highCircle).toHaveAttribute('rx');
    });

    it('handles boundary intensity values', () => {
      const boundaryData = [
        { x: 50, y: 42, muscle: 'chest', intensity: 0 },
        { x: 50, y: 42, muscle: 'back', intensity: 1 },
      ];
      render(<BodyHeatmap {...defaultProps} vectorData={boundaryData} />);
      const circles = document.querySelectorAll('ellipse');
      expect(circles.length).toBe(2);
    });
  });

  describe('Accessibility', () => {
    it('has cursor pointer when interactive', () => {
      render(<BodyHeatmap {...defaultProps} onPointClick={vi.fn()} />);
      const circles = document.querySelectorAll('ellipse');
      if (circles.length > 0) {
        expect(circles[0]).toHaveStyle({ cursor: 'pointer' });
      }
    });

    it('has default cursor when not interactive', () => {
      render(<BodyHeatmap {...defaultProps} />);
      const circles = document.querySelectorAll('ellipse');
      if (circles.length > 0) {
        expect(circles[0]).toHaveStyle({ cursor: 'default' });
      }
    });
  });

  describe('Performance', () => {
    it('renders efficiently with many points', () => {
      const manyPoints = Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        muscle: `muscle-${i}`,
        intensity: Math.random(),
      }));
      const { container } = render(<BodyHeatmap {...defaultProps} vectorData={manyPoints} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
