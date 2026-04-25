import '@testing-library/jest-dom';

// Mock ResizeObserver which is required by Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Alias vi to jest for Vitest compatibility
(global as typeof globalThis & { vi: unknown }).vi = global.jest;

// Suppress React 19 prop warnings from third-party libraries (Recharts)
// and act() warnings from async state updates in tests
const originalError = console.error;
console.error = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' && (
      // Recharts prop warnings
      message.includes('React does not recognize the') ||
      message.includes('non-boolean attribute') ||
      message.includes('prop on a DOM element') ||
      // React act() warnings - async state updates properly handled by waitFor()
      message.includes('was not wrapped in act(...)')
    )
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Mock Recharts to render lightweight SVG elements with expected classes
jest.mock('recharts', () => {
  const React = require('react');

  // Filter out Recharts-specific props that shouldn't be passed to DOM/SVG elements
  const filterRechartsProps = (props: any) => {
    const {
      // Chart layout props
      vertical, horizontal, barSize, dataKey, yAxisId, xAxisId,
      // Line/Area specific
      activeDot, dot, tickLine, axisLine, tickFormatter, labelStyle, contentStyle,
      // General
      name, strokeDasharray, radius, layout,
      ...rest
    } = props;
    return rest;
  };

  // Helper to create SVG element mock
  const createSvgElement = (tag: string, className: string) => {
    return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag, { className, ...filterRechartsProps(props) }, children);
  };

  // Helper for chart containers that render an SVG
  const createChartComponent = (svgClassName: string) => {
    return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('svg', { className: svgClassName, ...filterRechartsProps(props) }, children);
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
