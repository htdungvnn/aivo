import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CorrelationCard } from '../CorrelationCard';

describe('CorrelationCard Component', () => {
  const mockCorrelation = {
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

  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correlation factors', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/sleep_duration/)).toBeInTheDocument();
    expect(screen.getByText(/recovery_score/)).toBeInTheDocument();
  });

  it('should display correlation coefficient', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/r = 0\.78/)).toBeInTheDocument();
  });

  it('should display p-value', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/p = 0\.001/)).toBeInTheDocument();
  });

  it('should show actionable insight', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/Increase sleep duration/)).toBeInTheDocument();
  });

  it('should display outlier dates', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('2025-04-15')).toBeInTheDocument();
    expect(screen.getByText('2025-04-18')).toBeInTheDocument();
    expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button clicked', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('corr-1');
  });

  it('should show all outlier dates when under limit', () => {
    const correlationWithFewOutliers = {
      ...mockCorrelation,
      outlierDates: ['2025-04-15', '2025-04-18'],
    };

    render(<CorrelationCard correlation={correlationWithFewOutliers} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('2025-04-15')).toBeInTheDocument();
    expect(screen.getByText('2025-04-18')).toBeInTheDocument();
    expect(screen.queryByText(/\+.*more/)).not.toBeInTheDocument();
  });

  it('should show negative correlation in red', () => {
    const negativeCorrelation = {
      ...mockCorrelation,
      correlationCoefficient: -0.65,
    };

    render(<CorrelationCard correlation={negativeCorrelation} onDismiss={mockOnDismiss} />);

    const correlationText = screen.getByText(/r = -0\.65/);
    expect(correlationText).toHaveStyle({ color: '#ef4444' });
  });

  it('should show positive correlation in green', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    const correlationText = screen.getByText(/r = 0\.78/);
    expect(correlationText).toHaveStyle({ color: '#22c55e' });
  });

  it('should display confidence indicator', () => {
    render(<CorrelationCard correlation={mockCorrelation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('85% confidence')).toBeInTheDocument();
  });

  it('should format factor names with underscores replaced', () => {
    const correlation = {
      ...mockCorrelation,
      factorA: 'late_nutrition',
      factorB: 'poor_recovery',
    };

    render(<CorrelationCard correlation={correlation} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('late nutrition')).toBeInTheDocument();
    expect(screen.getByText('poor recovery')).toBeInTheDocument();
  });
});
