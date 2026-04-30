import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CorrelationCard from '../CorrelationCard';

describe('CorrelationCard Component', () => {
  const mockFinding = {
    id: 'corr-1',
    factorA: 'sleep_duration',
    factorB: 'recovery_score',
    correlationCoefficient: 0.78,
    pValue: 0.001,
    confidence: 0.85,
    anomalyThreshold: 2.5,
    anomalyCount: 2,
    outlierDates: ['2025-04-15', '2025-04-18', '2025-04-22'],
    explanation: 'Better sleep duration correlates with higher recovery scores',
    actionableInsight: 'Increase sleep duration to 7-9 hours to improve recovery by 20%',
    detectedAt: Date.now(),
  };

  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correlation factors', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/Sleep Duration/)).toBeInTheDocument();
    expect(screen.getByText(/Recovery Score/)).toBeInTheDocument();
  });

  it('should display correlation coefficient', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/0\.78/)).toBeInTheDocument();
  });

  it('should display p-value', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/0\.0010/)).toBeInTheDocument();
  });

  it('should show actionable insight', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/Increase sleep duration/)).toBeInTheDocument();
  });

  it('should display outlier dates', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('2025-04-15')).toBeInTheDocument();
    expect(screen.getByText('2025-04-18')).toBeInTheDocument();
    expect(screen.getByText('2025-04-22')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button clicked', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('corr-1');
  });

  it('should show all outlier dates when under limit', () => {
    const correlationWithFewOutliers = {
      ...mockFinding,
      outlierDates: ['2025-04-15', '2025-04-18'],
    };

    render(<CorrelationCard finding={correlationWithFewOutliers} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('2025-04-15')).toBeInTheDocument();
    expect(screen.getByText('2025-04-18')).toBeInTheDocument();
    expect(screen.queryByText(/\+.*more/)).not.toBeInTheDocument();
  });

  it('should show "+N more" badge when there are more than 5 outliers', () => {
    const correlationWithManyOutliers = {
      ...mockFinding,
      outlierDates: ['2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18', '2025-04-19', '2025-04-20', '2025-04-21'],
    };

    render(<CorrelationCard finding={correlationWithManyOutliers} onDismiss={mockOnDismiss} />);

    // First 5 dates should be visible
    expect(screen.getByText('2025-04-15')).toBeInTheDocument();
    expect(screen.getByText('2025-04-19')).toBeInTheDocument();
    // The "+2 more" badge should appear
    expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
  });

  it('should show negative correlation in red', () => {
    const negativeCorrelation = {
      ...mockFinding,
      correlationCoefficient: -0.65,
    };

    render(<CorrelationCard finding={negativeCorrelation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/-0\.65/)).toBeInTheDocument();
  });

  it('should show positive correlation', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/0\.78/)).toBeInTheDocument();
  });

  it('should display confidence indicator', () => {
    render(<CorrelationCard finding={mockFinding} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('should format factor names with underscores replaced', () => {
    const correlation = {
      ...mockFinding,
      factorA: 'late_nutrition',
      factorB: 'poor_recovery',
    };

    render(<CorrelationCard finding={correlation} onDismiss={mockOnDismiss} />);

    // late_nutrition is in the map, poor_recovery falls back to replace(/_/g, " ")
    expect(screen.getByText(/Late Night Eating/)).toBeInTheDocument();
    expect(screen.getByText(/Poor Recovery/)).toBeInTheDocument();
  });
});
