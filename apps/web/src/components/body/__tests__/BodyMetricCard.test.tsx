import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BodyMetricCard } from '../BodyMetricCard';

describe('BodyMetricCard Component', () => {
  const defaultProps = {
    label: 'Weight',
    value: 70.5,
    unit: 'kg',
  };

  it('renders without crashing', () => {
    render(<BodyMetricCard {...defaultProps} />);
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('70.5')).toBeInTheDocument();
  });

  it('displays label correctly', () => {
    render(<BodyMetricCard {...defaultProps} />);
    expect(screen.getByText('Weight')).toBeInTheDocument();
  });

  it('formats number values to one decimal place', () => {
    render(<BodyMetricCard {...defaultProps} value={72.3456} />);
    expect(screen.getByText('72.3')).toBeInTheDocument();
  });

  it('displays string values as-is', () => {
    render(<BodyMetricCard {...defaultProps} value="N/A" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays unit when provided', () => {
    render(<BodyMetricCard {...defaultProps} unit="kg" />);
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('does not display unit when empty', () => {
    render(<BodyMetricCard {...defaultProps} unit="" />);
    expect(screen.queryByText('kg')).not.toBeInTheDocument();
  });

  describe('Change Indicator', () => {
    it('displays positive change with up arrow', () => {
      render(<BodyMetricCard {...defaultProps} change={2.5} />);
      expect(screen.getByText('+2.5')).toBeInTheDocument();
    });

    it('displays negative change with down arrow', () => {
      render(<BodyMetricCard {...defaultProps} change={-1.5} />);
      expect(screen.getByText('-1.5')).toBeInTheDocument();
    });

    it('displays custom change label', () => {
      render(<BodyMetricCard {...defaultProps} change={2.5} changeLabel="vs last week" />);
      expect(screen.getByText('vs last week')).toBeInTheDocument();
    });

    it('hides change when undefined', () => {
      render(<BodyMetricCard {...defaultProps} />);
      expect(screen.queryByText(/vs last/)).not.toBeInTheDocument();
    });

    it('hides change when zero', () => {
      render(<BodyMetricCard {...defaultProps} change={0} />);
      expect(screen.queryByText(/0/)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      const { container } = render(<BodyMetricCard {...defaultProps} loading={true} />);
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('does not show content when loading', () => {
      render(<BodyMetricCard {...defaultProps} loading={true} />);
      expect(screen.queryByText('70.5')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies default variant styles', () => {
      const { container } = render(<BodyMetricCard {...defaultProps} />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-slate-800');
      expect(card).toHaveClass('bg-slate-900/50');
    });

    it('applies success variant styles', () => {
      const { container } = render(<BodyMetricCard {...defaultProps} variant="success" />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-emerald-500/30');
      expect(card).toHaveClass('bg-emerald-500/5');
    });

    it('applies warning variant styles', () => {
      const { container } = render(<BodyMetricCard {...defaultProps} variant="warning" />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-amber-500/30');
      expect(card).toHaveClass('bg-amber-500/5');
    });

    it('applies danger variant styles', () => {
      const { container } = render(<BodyMetricCard {...defaultProps} variant="danger" />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-red-500/30');
      expect(card).toHaveClass('bg-red-500/5');
    });
  });

  describe('Icon', () => {
    it('renders icon when provided', () => {
      const icon = <svg data-testid="test-icon" />;
      render(<BodyMetricCard {...defaultProps} icon={icon} />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('does not render icon when not provided', () => {
      render(<BodyMetricCard {...defaultProps} />);
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper text contrast for values', () => {
      render(<BodyMetricCard {...defaultProps} />);
      const valueElement = screen.getByText('70.5');
      expect(valueElement).toHaveClass('text-white');
    });

    it('displays label as medium text', () => {
      render(<BodyMetricCard {...defaultProps} />);
      const labelElement = screen.getByText('Weight');
      expect(labelElement).toHaveClass('text-sm', 'font-medium');
    });
  });
});
