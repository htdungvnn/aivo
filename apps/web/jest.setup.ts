import '@testing-library/jest-dom';

// Mock ResizeObserver which is required by Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Alias vi to jest for Vitest compatibility
(global as typeof globalThis & { vi: unknown }).vi = global.jest;

// Mock Recharts to render lightweight SVG elements with expected classes
jest.mock('recharts', () => {
  const React = require('react');

  // Helper to create SVG element mock
  const createSvgElement = (tag: string, className: string) => {
    return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag, { className, ...props }, children);
  };

  // Helper for chart containers that render an SVG
  const createChartComponent = (svgClassName: string) => {
    return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('svg', { className: svgClassName, ...props }, children);
  };

  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { className: 'recharts-responsive-container' }, children),
    AreaChart: createChartComponent('recharts-area-chart'),
    Area: createSvgElement('area', 'recharts-area'),
    LineChart: createChartComponent('recharts-line-chart'),
    Line: createSvgElement('line', 'recharts-line'),
    BarChart: createChartComponent('recharts-bar-chart'),
    Bar: createSvgElement('rect', 'recharts-bar'),
    XAxis: createSvgElement('g', 'recharts-x-axis'),
    YAxis: createSvgElement('g', 'recharts-y-axis'),
    CartesianGrid: createSvgElement('g', 'recharts-cartesian-grid'),
    Tooltip: createSvgElement('g', 'recharts-tooltip'),
    Legend: createSvgElement('g', 'recharts-legend'),
    ReferenceLine: createSvgElement('line', 'recharts-reference-line'),
    ReferenceDot: createSvgElement('circle', 'recharts-reference-dot'),
    ReferenceArea: createSvgElement('rect', 'recharts-reference-area'),
    Brush: createSvgElement('g', 'recharts-brush'),
    // Additional components that might be used
    ComposedChart: createChartComponent('recharts-composed-chart'),
    ScatterChart: createChartComponent('recharts-scatter-chart'),
    Scatter: createSvgElement('path', 'recharts-scatter'),
    PieChart: createChartComponent('recharts-pie-chart'),
    Pie: createSvgElement('path', 'recharts-pie'),
    Cell: createSvgElement('path', 'recharts-cell'),
  };
});
