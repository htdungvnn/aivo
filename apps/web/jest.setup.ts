import '@testing-library/jest-dom';
import React from 'react';

// Mock ResizeObserver which is required by Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Alias vi to jest for Vitest compatibility
(global as typeof globalThis & { vi: unknown }).vi = global.jest;

// Mock all Recharts components to render simple elements
jest.mock('recharts', () => {
  const createMockComponent = (className: string) => {
    return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(
        'div',
        { className, 'data-testid': className, ...props },
        children
      );
  };

  return {
    // Chart containers
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { className: 'recharts-responsive-container' }, children),
    AreaChart: createMockComponent('recharts-area-chart'),
    LineChart: createMockComponent('recharts-line-chart'),
    BarChart: createMockComponent('recharts-bar-chart'),
    ComposedChart: createMockComponent('recharts-composed-chart'),

    // Chart elements
    Area: createMockComponent('recharts-area'),
    Line: createMockComponent('recharts-line'),
    Bar: createMockComponent('recharts-bar'),

    // Axes and grid
    XAxis: createMockComponent('recharts-x-axis'),
    YAxis: createMockComponent('recharts-y-axis'),
    CartesianGrid: createMockComponent('recharts-cartesian-grid'),

    // Other components
    Tooltip: createMockComponent('recharts-tooltip'),
    Legend: createMockComponent('recharts-legend'),

    // Don't mock these as they're not used in tests
    defs: () => null,
    linearGradient: () => null,
    stop: () => null,
  };
});
