/**
 * Health Report SVG Chart Generation
 * Generates deterministic SVG chart data for embedding in PDF reports
 *
 * These charts are:
 * - Deterministic (same data always produces same chart)
 * - Server-side only (no client-side rendering)
 * - PDF-compatible (SVG can be embedded in PDFs)
 * - Accessible (text labels, color contrast)
 */

import type { SupportedLocale } from '@aivo/report-types';

// =============================================================================
// Types
// =============================================================================

export interface ChartDataPoint {
  label: string;
  value: number | null;
  target?: number;
}

export interface TrendLinePoint {
  x: number;
  y: number;
  value: number;
}

export interface BarChartDataset {
  label: string;
  values: ChartDataPoint[];
  color?: string;
  targetLine?: number;
}

export interface LineChartDataset {
  label: string;
  values: TrendLinePoint[];
  color?: string;
}

export interface DonutChartDataset {
  segments: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  centerLabel?: string;
  centerValue?: string;
}

export interface ChartRenderOptions {
  width?: number;
  height?: number;
  locale?: SupportedLocale;
  showTarget?: boolean;
  showLegend?: boolean;
  title?: string;
  unit?: string;
  colorPrimary?: string;
  colorSecondary?: string;
  colorAccent?: string;
  colorGood?: string;
  colorWarning?: string;
  colorDanger?: string;
}

// =============================================================================
// Default Theme Colors
// =============================================================================

const DEFAULT_THEME = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f093fb',
  good: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#1f2937',
  textMuted: '#6b7280',
  background: '#f9fafb',
  grid: '#e5e7eb',
  white: '#ffffff',
};

const VI_THEME = {
  ...DEFAULT_THEME,
  // Same colors for Vietnamese
};

// =============================================================================
// Utility Functions
// =============================================================================

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number, locale: SupportedLocale = 'en'): string {
  if (locale === 'vi') {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function getTheme(locale: SupportedLocale) {
  return locale === 'vi' ? VI_THEME : DEFAULT_THEME;
}

// =============================================================================
// Bar Chart
// =============================================================================

export interface BarChartConfig {
  data: BarChartDataset[];
  options?: ChartRenderOptions;
}

export function generateBarChartSvg(config: BarChartConfig): string {
  const { data, options = {} } = config;
  const {
    width = 560,
    height = 280,
    locale = 'en',
    showTarget = true,
    showLegend = false,
    title,
    unit = '',
  } = options;

  const t = getTheme(locale);
  const padding = { top: 40, right: 20, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate all values for scale
  const allValues: number[] = [];
  for (const dataset of data) {
    for (const point of dataset.values) {
      if (point.value !== null) allValues.push(point.value);
      if (point.target) allValues.push(point.target);
    }
  }

  if (allValues.length === 0) {
    allValues.push(0, 100);
  }

  const maxValue = Math.max(...allValues) * 1.1;
  const minValue = Math.min(0, ...allValues);
  const valueRange = maxValue - minValue;

  const getY = (value: number) => {
    return padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
  };

  const barGroupWidth = chartWidth / data[0]?.values.length || chartWidth;
  const barWidth = Math.min(barGroupWidth * 0.6 / data.length, 30);
  const barGap = 4;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .chart-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; fill: ${t.text}; }
      .chart-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; fill: ${t.textMuted}; }
      .chart-value { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; fill: ${t.text}; }
      .chart-grid { stroke: ${t.grid}; stroke-width: 1; }
      .chart-target { stroke: ${t.warning}; stroke-width: 2; stroke-dasharray: 6,3; }
    </style>
    <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${t.primary}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${t.primary}" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="barGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${t.secondary}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${t.secondary}" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
`;

  // Title
  if (title) {
    svg += `  <text x="${width / 2}" y="20" text-anchor="middle" class="chart-title">${escapeHtml(title)}</text>\n`;
  }

  // Grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartHeight;
    const value = maxValue - (i / gridLines) * valueRange;
    svg += `  <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid" opacity="0.5"/>\n`;
    svg += `  <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" class="chart-label">${formatNumber(value, locale)}${escapeHtml(unit)}</text>\n`;
  }

  // Bars
  for (let groupIndex = 0; groupIndex < data.length; groupIndex++) {
    const dataset = data[groupIndex];
    const color = dataset.color || (groupIndex === 0 ? 'url(#barGradient)' : 'url(#barGradient2)');

    for (let i = 0; i < dataset.values.length; i++) {
      const point = dataset.values[i];
      const x = padding.left + i * barGroupWidth + (barGroupWidth / 2) - (data.length * barWidth) / 2 + groupIndex * (barWidth + barGap);
      const barHeight = point.value !== null ? ((point.value - minValue) / valueRange) * chartHeight : 0;
      const y = padding.top + chartHeight - barHeight;

      if (point.value !== null) {
        svg += `  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3" ry="3"/>\n`;
        // Value label
        svg += `  <text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" class="chart-value">${formatNumber(point.value, locale)}</text>\n`;
      }

      // X-axis label
      svg += `  <text x="${x + barWidth / 2}" y="${height - padding.bottom + 16}" text-anchor="middle" class="chart-label">${escapeHtml(point.label)}</text>\n`;
    }

    // Target line
    if (showTarget && dataset.targetLine !== undefined) {
      const targetY = getY(dataset.targetLine);
      svg += `  <line x1="${padding.left}" y1="${targetY}" x2="${width - padding.right}" y2="${targetY}" class="chart-target"/>\n`;
    }
  }

  svg += '</svg>';
  return svg;
}

// =============================================================================
// Line Chart (Trend)
// =============================================================================

export interface LineChartConfig {
  datasets: LineChartDataset[];
  options?: ChartRenderOptions;
}

export function generateLineChartSvg(config: LineChartConfig): string {
  const { datasets, options = {} } = config;
  const {
    width = 560,
    height = 280,
    locale = 'en',
    showLegend = true,
    title,
    unit = '',
  } = options;

  const t = getTheme(locale);
  const padding = { top: 40, right: 20, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get all values and points
  const allValues: number[] = [];
  const allPoints: TrendLinePoint[] = [];
  let maxX = 0;

  for (const dataset of datasets) {
    for (const point of dataset.values) {
      allValues.push(point.value);
      allPoints.push(point);
      maxX = Math.max(maxX, point.x);
    }
  }

  if (allValues.length === 0) {
    allValues.push(0, 100);
    allPoints.push({ x: 0, y: 0, value: 0 });
    maxX = 1;
  }

  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(...allValues) * 1.1;
  const valueRange = maxValue - minValue || 1;

  const getX = (x: number) => padding.left + (x / maxX) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  const colors = [t.primary, t.secondary, t.accent, t.good, t.warning];

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .chart-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; fill: ${t.text}; }
      .chart-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; fill: ${t.textMuted}; }
      .chart-value { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; fill: ${t.text}; }
      .chart-grid { stroke: ${t.grid}; stroke-width: 1; }
      .chart-line { fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
      .chart-dot { stroke-width: 2; }
      .chart-area { opacity: 0.1; }
    </style>
  </defs>
`;

  if (title) {
    svg += `  <text x="${width / 2}" y="20" text-anchor="middle" class="chart-title">${escapeHtml(title)}</text>\n`;
  }

  // Grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartHeight;
    const value = maxValue - (i / gridLines) * valueRange;
    svg += `  <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid" opacity="0.5"/>\n`;
    svg += `  <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" class="chart-label">${formatNumber(value, locale)}${escapeHtml(unit)}</text>\n`;
  }

  // Lines and areas
  for (let d = 0; d < datasets.length; d++) {
    const dataset = datasets[d];
    const color = dataset.color || colors[d % colors.length];
    const points = dataset.values;

    if (points.length < 2) continue;

    // Area
    let areaPath = `M ${getX(points[0].x)} ${padding.top + chartHeight}`;
    let linePath = '';

    for (const point of points) {
      const x = getX(point.x);
      const y = getY(point.value);
      if (!linePath) {
        linePath = `M ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
      }
      areaPath += ` L ${x} ${y}`;
    }
    areaPath += ` L ${getX(points[points.length - 1].x)} ${padding.top + chartHeight} Z`;

    svg += `  <path d="${areaPath}" fill="${color}" class="chart-area"/>\n`;
    svg += `  <path d="${linePath}" stroke="${color}" class="chart-line"/>\n`;

    // Dots
    for (const point of points) {
      const x = getX(point.x);
      const y = getY(point.value);
      svg += `  <circle cx="${x}" cy="${y}" r="4" fill="${color}" class="chart-dot" stroke="${t.white}" stroke-width="2"/>\n`;
    }
  }

  // X-axis labels (first, middle, last)
  if (points.length > 0) {
    const labels = [
      { x: points[0].x, label: (points[0] as unknown as { label?: string }).label || '' },
      { x: points[Math.floor(points.length / 2)].x, label: (points[Math.floor(points.length / 2)] as unknown as { label?: string }).label || '' },
      { x: points[points.length - 1].x, label: (points[points.length - 1] as unknown as { label?: string }).label || '' },
    ];
    for (const { x, label } of labels) {
      if (label) {
        svg += `  <text x="${getX(x)}" y="${height - padding.bottom + 16}" text-anchor="middle" class="chart-label">${escapeHtml(label)}</text>\n`;
      }
    }
  }

  // Legend
  if (showLegend && datasets.length > 1) {
    let legendX = width / 2 - (datasets.length * 80) / 2;
    for (let d = 0; d < datasets.length; d++) {
      const dataset = datasets[d];
      const color = dataset.color || colors[d % colors.length];
      svg += `  <line x1="${legendX}" y1="28" x2="${legendX + 16}" y2="28" stroke="${color}" stroke-width="3"/>\n`;
      svg += `  <text x="${legendX + 20}" y="32" class="chart-label">${escapeHtml(dataset.label)}</text>\n`;
      legendX += 80;
    }
  }

  svg += '</svg>';
  return svg;
}

// =============================================================================
// Donut Chart
// =============================================================================

export interface DonutChartConfig {
  data: DonutChartDataset;
  options?: ChartRenderOptions;
}

export function generateDonutChartSvg(config: DonutChartConfig): string {
  const { data, options = {} } = config;
  const {
    width = 200,
    height = 200,
    locale = 'en',
    title,
  } = options;

  const t = getTheme(locale);
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 10;
  const innerRadius = outerRadius * 0.6;

  const total = data.segments.reduce((sum, seg) => sum + seg.value, 0);
  if (total === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <circle cx="${cx}" cy="${cy}" r="${outerRadius}" fill="none" stroke="${t.grid}" stroke-width="${outerRadius - innerRadius}"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${t.textMuted}">N/A</text>
</svg>`;
  }

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .donut-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; fill: ${t.textMuted}; }
      .donut-center-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; fill: ${t.text}; }
      .donut-center-value { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; fill: ${t.textMuted}; }
    </style>
  </defs>
`;

  let currentAngle = -Math.PI / 2;

  for (const segment of data.segments) {
    const percentage = segment.value / total;
    const angle = percentage * 2 * Math.PI;
    const endAngle = currentAngle + angle;

    const x1 = cx + outerRadius * Math.cos(currentAngle);
    const y1 = cy + outerRadius * Math.sin(currentAngle);
    const x2 = cx + outerRadius * Math.cos(endAngle);
    const y2 = cy + outerRadius * Math.sin(endAngle);
    const x3 = cx + innerRadius * Math.cos(endAngle);
    const y3 = cy + innerRadius * Math.sin(endAngle);
    const x4 = cx + innerRadius * Math.cos(currentAngle);
    const y4 = cy + innerRadius * Math.sin(currentAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const path = [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    svg += `  <path d="${path}" fill="${segment.color}"/>\n`;

    currentAngle = endAngle;
  }

  // Center label
  if (data.centerValue) {
    svg += `  <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-center-label">${escapeHtml(data.centerValue)}</text>\n`;
  }
  if (data.centerLabel) {
    svg += `  <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-value">${escapeHtml(data.centerLabel)}</text>\n`;
  }

  svg += '</svg>';
  return svg;
}

// =============================================================================
// Gauge Chart
// =============================================================================

export interface GaugeChartConfig {
  value: number;
  max: number;
  options?: ChartRenderOptions;
}

export function generateGaugeChartSvg(config: GaugeChartConfig): string {
  const { value, max, options = {} } = config;
  const {
    width = 200,
    height = 120,
    locale = 'en',
    title,
    unit = '',
  } = options;

  const t = getTheme(locale);
  const cx = width / 2;
  const cy = height - 10;
  const radius = Math.min(width, height) - 20;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const valueAngle = startAngle + ((Math.min(value, max) / max) * (endAngle - startAngle));

  // Determine color based on value percentage
  const percentage = value / max;
  let color = t.primary;
  if (percentage >= 0.8) color = t.good;
  else if (percentage >= 0.5) color = t.warning;
  else if (percentage > 0) color = t.danger;

  const arcRadius = radius / 2 - 5;

  // Background arc
  const bgX1 = cx + arcRadius * Math.cos(startAngle);
  const bgY1 = cy + arcRadius * Math.sin(startAngle);
  const bgX2 = cx + arcRadius * Math.cos(endAngle);
  const bgY2 = cy + arcRadius * Math.sin(endAngle);

  const valueX = cx + arcRadius * Math.cos(valueAngle);
  const valueY = cy + arcRadius * Math.sin(valueAngle);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .gauge-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; fill: ${t.textMuted}; }
      .gauge-value { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; fill: ${t.text}; }
      .gauge-unit { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; fill: ${t.textMuted}; }
    </style>
  </defs>
`;

  if (title) {
    svg += `  <text x="${cx}" y="16" text-anchor="middle" class="gauge-title">${escapeHtml(title)}</text>\n`;
  }

  // Background arc
  svg += `  <path d="M ${bgX1} ${bgY1} A ${arcRadius} ${arcRadius} 0 0 1 ${bgX2} ${bgY2}" fill="none" stroke="${t.grid}" stroke-width="12" stroke-linecap="round"/>\n`;

  // Value arc
  if (value > 0) {
    const vx1 = cx + arcRadius * Math.cos(startAngle);
    const vy1 = cy + arcRadius * Math.sin(startAngle);
    svg += `  <path d="M ${vx1} ${vy1} A ${arcRadius} ${arcRadius} 0 0 1 ${valueX} ${valueY}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>\n`;
  }

  // Value text
  svg += `  <text x="${cx}" y="${cy - 8}" text-anchor="middle" class="gauge-value">${formatNumber(value, locale)}</text>\n`;
  svg += `  <text x="${cx}" y="${cy + 8}" text-anchor="middle" class="gauge-unit">/ ${formatNumber(max, locale)}${escapeHtml(unit)}</text>\n`;

  svg += '</svg>';
  return svg;
}

// =============================================================================
// Chart Color Palette
// =============================================================================

export const CHART_COLORS = {
  primary: DEFAULT_THEME.primary,
  secondary: DEFAULT_THEME.secondary,
  accent: DEFAULT_THEME.accent,
  good: DEFAULT_THEME.good,
  warning: DEFAULT_THEME.warning,
  danger: DEFAULT_THEME.danger,
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
} as const;

export const TREND_COLORS = {
  improving: DEFAULT_THEME.good,
  stable: DEFAULT_THEME.warning,
  declining: DEFAULT_THEME.danger,
} as const;
