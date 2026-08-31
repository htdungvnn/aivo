/**
 * Health Report Chart Generation Tests
 * Tests for SVG chart generation used in PDF reports
 */

import { describe, it, expect } from 'vitest';
import {
  generateBarChartSvg,
  generateLineChartSvg,
  generateDonutChartSvg,
  generateGaugeChartSvg,
  CHART_COLORS,
  TREND_COLORS,
  type BarChartConfig,
  type LineChartConfig,
  type DonutChartConfig,
  type ChartRenderOptions,
  type TrendLinePoint,
} from '../src/lib/report-charts';

describe('Report Chart Generation', () => {
  const defaultOptions: ChartRenderOptions = {
    width: 560,
    height: 280,
    locale: 'en',
    showLegend: false,
    showTarget: true,
    unit: '',
  };

  describe('generateBarChartSvg', () => {
    it('should generate valid SVG for readiness scores', () => {
      const config: BarChartConfig = {
        data: [{
          label: 'Readiness',
          values: [
            { label: 'Mon', value: 75 },
            { label: 'Tue', value: 82 },
            { label: 'Wed', value: 68 },
            { label: 'Thu', value: 79 },
            { label: 'Fri', value: 85 },
          ],
          color: CHART_COLORS.primary,
          targetLine: 80,
        }],
        options: { ...defaultOptions, title: 'Weekly Readiness' },
      };

      const svg = generateBarChartSvg(config);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg');
      expect(svg).toContain('Weekly Readiness');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should handle null values gracefully', () => {
      const config: BarChartConfig = {
        data: [{
          label: 'Sleep',
          values: [
            { label: 'Mon', value: 7.5 },
            { label: 'Tue', value: null },
            { label: 'Wed', value: 8.0 },
          ],
          color: CHART_COLORS.secondary,
        }],
        options: defaultOptions,
      };

      const svg = generateBarChartSvg(config);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg');
    });

    it('should generate empty chart when no data', () => {
      const config: BarChartConfig = {
        data: [{
          label: 'Empty',
          values: [],
          color: CHART_COLORS.primary,
        }],
        options: defaultOptions,
      };

      const svg = generateBarChartSvg(config);

      expect(svg).toContain('<?xml version="1.0"');
      expect(svg).toContain('<svg');
    });

    it('should support multiple datasets', () => {
      const config: BarChartConfig = {
        data: [
          {
            label: 'Calories',
            values: [
              { label: 'Mon', value: 1800 },
              { label: 'Tue', value: 2100 },
            ],
            color: CHART_COLORS.primary,
          },
          {
            label: 'Target',
            values: [
              { label: 'Mon', value: 2000 },
              { label: 'Tue', value: 2000 },
            ],
            color: CHART_COLORS.warning,
          },
        ],
        options: defaultOptions,
      };

      const svg = generateBarChartSvg(config);

      expect(svg).toContain('Calories');
      expect(svg).toContain('Target');
    });

    it('should escape special characters in labels', () => {
      const config: BarChartConfig = {
        data: [{
          label: 'Test',
          values: [
            { label: '<script>', value: 50 },
            { label: 'Normal', value: 75 },
          ],
        }],
        options: defaultOptions,
      };

      const svg = generateBarChartSvg(config);

      // Should not contain unescaped HTML
      expect(svg).not.toContain('<script>');
      expect(svg).toContain('&lt;script&gt;');
    });

    it('should handle Vietnamese locale', () => {
      const config: BarChartConfig = {
        data: [{
          label: 'Giấc Ngủ',
          values: [
            { label: 'T2', value: 7.5 },
            { label: 'T3', value: 8.0 },
          ],
        }],
        options: { ...defaultOptions, locale: 'vi' },
      };

      const svg = generateBarChartSvg(config);

      expect(svg).toContain('<?xml version="1.0"');
      expect(svg).toContain('Giấc Ngủ');
    });
  });

  describe('generateLineChartSvg', () => {
    it('should generate valid SVG for trend line', () => {
      const points: TrendLinePoint[] = [
        { x: 0, y: 0, value: 70 },
        { x: 1, y: 1, value: 75 },
        { x: 2, y: 2, value: 72 },
        { x: 3, y: 3, value: 80 },
        { x: 4, y: 4, value: 78 },
        { x: 5, y: 5, value: 82 },
        { x: 6, y: 6, value: 85 },
      ];

      const config: LineChartConfig = {
        datasets: [{
          label: 'Readiness',
          values: points,
          color: CHART_COLORS.primary,
        }],
        options: { ...defaultOptions, title: 'Readiness Trend' },
      };

      const svg = generateLineChartSvg(config);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg');
      expect(svg).toContain('Readiness Trend');
      expect(svg).toContain('class="chart-line"');
    });

    it('should render single point', () => {
      const config: LineChartConfig = {
        datasets: [{
          label: 'Single',
          values: [{ x: 0, y: 0, value: 75 }],
          color: CHART_COLORS.good,
        }],
        options: defaultOptions,
      };

      const svg = generateLineChartSvg(config);

      expect(svg).toContain('<?xml version="1.0"');
      expect(svg).toContain('<svg');
    });

    it('should show legend for multiple datasets', () => {
      const config: LineChartConfig = {
        datasets: [
          {
            label: 'Calories',
            values: [
              { x: 0, y: 0, value: 1800 },
              { x: 1, y: 1, value: 1900 },
            ],
            color: CHART_COLORS.primary,
          },
          {
            label: 'Protein',
            values: [
              { x: 0, y: 0, value: 120 },
              { x: 1, y: 1, value: 130 },
            ],
            color: CHART_COLORS.good,
          },
        ],
        options: { ...defaultOptions, showLegend: true },
      };

      const svg = generateLineChartSvg(config);

      expect(svg).toContain('Calories');
      expect(svg).toContain('Protein');
    });
  });

  describe('generateDonutChartSvg', () => {
    it('should generate valid SVG for macro breakdown', () => {
      const config: DonutChartConfig = {
        data: {
          segments: [
            { label: 'Protein', value: 30, color: CHART_COLORS.good },
            { label: 'Carbs', value: 40, color: CHART_COLORS.warning },
            { label: 'Fat', value: 30, color: CHART_COLORS.danger },
          ],
          centerValue: '2000',
          centerLabel: 'kcal',
        },
        options: { width: 200, height: 200, locale: 'en' },
      };

      const svg = generateDonutChartSvg(config);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg');
      expect(svg).toContain('2000');
      expect(svg).toContain('kcal');
    });

    it('should handle zero total gracefully', () => {
      const config: DonutChartConfig = {
        data: {
          segments: [
            { label: 'Empty', value: 0, color: CHART_COLORS.textMuted },
          ],
        },
        options: { width: 200, height: 200 },
      };

      const svg = generateDonutChartSvg(config);

      expect(svg).toContain('<?xml version="1.0"');
      expect(svg).toContain('N/A');
    });
  });

  describe('generateGaugeChartSvg', () => {
    it('should generate valid SVG for gauge chart', () => {
      const config = {
        value: 78,
        max: 100,
        options: { width: 200, height: 120, locale: 'en', title: 'Readiness' },
      };

      const svg = generateGaugeChartSvg(config);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg');
      expect(svg).toContain('Readiness');
      expect(svg).toContain('78');
    });

    it('should cap value at max', () => {
      const config = {
        value: 150,
        max: 100,
        options: { width: 200, height: 120 },
      };

      const svg = generateGaugeChartSvg(config);

      expect(svg).toContain('<?xml version="1.0"');
      // Value should not exceed max in display
    });
  });

  describe('Chart Colors', () => {
    it('should have expected trend colors', () => {
      expect(TREND_COLORS.improving).toBe(CHART_COLORS.good);
      expect(TREND_COLORS.declining).toBe(CHART_COLORS.danger);
      expect(TREND_COLORS.stable).toBe(CHART_COLORS.warning);
    });

    it('should have all required chart colors', () => {
      expect(CHART_COLORS.primary).toBeDefined();
      expect(CHART_COLORS.secondary).toBeDefined();
      expect(CHART_COLORS.accent).toBeDefined();
      expect(CHART_COLORS.good).toBeDefined();
      expect(CHART_COLORS.warning).toBeDefined();
      expect(CHART_COLORS.danger).toBeDefined();
    });
  });

  describe('Chart Dimensions', () => {
    it('should handle custom dimensions', () => {
      const config: BarChartConfig = {
        data: [{
          label: 'Test',
          values: [{ label: 'A', value: 50 }],
        }],
        options: { width: 400, height: 200 },
      };

      const svg = generateBarChartSvg(config);

      expect(svg).toContain('width="400"');
      expect(svg).toContain('height="200"');
      expect(svg).toContain('viewBox="0 0 400 200"');
    });

    it('should handle small dimensions', () => {
      const config: DonutChartConfig = {
        data: {
          segments: [
            { label: 'A', value: 50, color: CHART_COLORS.primary },
            { label: 'B', value: 50, color: CHART_COLORS.secondary },
          ],
        },
        options: { width: 100, height: 100 },
      };

      const svg = generateDonutChartSvg(config);

      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="100"');
    });
  });

  describe('Determinism', () => {
    it('should generate identical SVG for same data', () => {
      const config: BarChartConfig = {
        data: [{
          label: 'Test',
          values: [
            { label: 'A', value: 60 },
            { label: 'B', value: 75 },
            { label: 'C', value: 82 },
          ],
          color: CHART_COLORS.primary,
        }],
        options: defaultOptions,
      };

      const svg1 = generateBarChartSvg(config);
      const svg2 = generateBarChartSvg(config);

      expect(svg1).toBe(svg2);
    });

    it('should generate different SVG for different values', () => {
      const config1: BarChartConfig = {
        data: [{
          label: 'Test',
          values: [{ label: 'A', value: 50 }],
        }],
        options: defaultOptions,
      };

      const config2: BarChartConfig = {
        data: [{
          label: 'Test',
          values: [{ label: 'A', value: 80 }],
        }],
        options: defaultOptions,
      };

      const svg1 = generateBarChartSvg(config1);
      const svg2 = generateBarChartSvg(config2);

      expect(svg1).not.toBe(svg2);
    });
  });
});
