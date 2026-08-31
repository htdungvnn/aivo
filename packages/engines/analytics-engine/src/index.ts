/**
 * Analytics Engine - TypeScript Package
 * Pure time-series analytics for chart-ready data
 */

export const ANALYTICS_ENGINE_VERSION = '1.0.0';

export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
}

export interface ChartSummary {
  average: number;
  minimum: number;
  maximum: number;
  changePercent: number | null;
}

export interface ChartData {
  metric: string;
  points: ChartDataPoint[];
  summary: ChartSummary;
}

export interface TimeSeriesResult {
  values: number[];
  timestamps: number[];
}

// Moving Average
export function calculateSMA(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];
  
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowValues = values.slice(start, i + 1);
    const sum = windowValues.reduce((a, b) => a + b, 0);
    result.push(round(sum / windowValues.length, 2));
  }
  return result;
}

// Exponential Moving Average
export function calculateEMA(values: number[], span: number): number[] {
  if (values.length === 0 || span <= 0) return [];
  
  const alpha = 2 / (span + 1);
  const result: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    result.push(round(alpha * values[i] + (1 - alpha) * result[i - 1], 2));
  }
  return result;
}

// Trend Slope (linear regression)
export function calculateTrendSlope(values: number[]): number | null {
  if (values.length < 2) return null;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) return 0;
  
  return round((n * sumXY - sumX * sumY) / denominator, 4);
}

// Percentage Change
export function calculatePctChange(values: number[]): number | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return null;
  return round(((last - first) / first) * 100, 2);
}

// Rolling Min
export function calculateRollingMin(values: number[], window: number): number[] {
  return calculateRollingAggregate(values, window, Math.min);
}

// Rolling Max
export function calculateRollingMax(values: number[], window: number): number[] {
  return calculateRollingAggregate(values, window, Math.max);
}

function calculateRollingAggregate(
  values: number[],
  window: number,
  agg: (a: number, b: number) => number
): number[] {
  if (values.length === 0 || window <= 0) return [];
  
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowValues = values.slice(start, i + 1);
    result.push(round(windowValues.reduce(agg), 2));
  }
  return result;
}

// Standard Deviation
export function calculateStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  
  return round(Math.sqrt(variance), 2);
}

// Z-Score
export function calculateZScore(value: number, mean: number, stdDev: number): number | null {
  if (stdDev === 0) return null;
  return round((value - mean) / stdDev, 2);
}

// Outlier Detection
export function findOutliers(
  values: number[],
  threshold: number = 2
): { index: number; value: number; zScore: number }[] {
  if (values.length < 3) return [];
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = calculateStdDev(values);
  if (stdDev === null || stdDev === 0) return [];
  
  return values
    .map((value, index) => {
      const zScore = calculateZScore(value, mean, stdDev);
      return { index, value, zScore: zScore ?? 0 };
    })
    .filter(item => Math.abs(item.zScore) > threshold);
}

// Peak Detection
export function findPeaks(values: number[], minDistance: number = 1): number[] {
  if (values.length < 3) return [];
  
  const peaks: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
      // Check minimum distance from last peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDistance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

// Valley Detection
export function findValleys(values: number[], minDistance: number = 1): number[] {
  if (values.length < 3) return [];
  
  const valleys: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
      if (valleys.length === 0 || i - valleys[valleys.length - 1] > minDistance) {
        valleys.push(i);
      }
    }
  }
  return valleys;
}

// Streak Calculation
export function calculateStreak(
  values: number[],
  threshold: number,
  direction: 'above' | 'below' | 'at_or_above' | 'at_or_below'
): number {
  if (values.length === 0) return 0;
  
  const check = (v: number) => {
    switch (direction) {
      case 'above': return v > threshold;
      case 'below': return v < threshold;
      case 'at_or_above': return v >= threshold;
      case 'at_or_below': return v <= threshold;
    }
  };
  
  let currentStreak = 0;
  let maxStreak = 0;
  
  for (const value of values) {
    if (check(value)) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return maxStreak;
}

// Weekly Aggregation
export function aggregateWeekly(
  timestamps: number[],
  values: number[]
): { weekStart: number; sum: number; count: number; avg: number }[] {
  if (timestamps.length !== values.length || timestamps.length === 0) return [];
  
  const weeklyMap = new Map<number, { sum: number; count: number }>();
  
  for (let i = 0; i < timestamps.length; i++) {
    const date = new Date(timestamps[i]);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.getTime();
    
    const existing = weeklyMap.get(weekKey) || { sum: 0, count: 0 };
    existing.sum += values[i];
    existing.count++;
    weeklyMap.set(weekKey, existing);
  }
  
  return Array.from(weeklyMap.entries())
    .map(([weekStart, data]) => ({
      weekStart,
      sum: round(data.sum, 2),
      count: data.count,
      avg: round(data.sum / data.count, 2),
    }))
    .sort((a, b) => a.weekStart - b.weekStart);
}

// Monthly Aggregation
export function aggregateMonthly(
  timestamps: number[],
  values: number[]
): { monthStart: number; sum: number; count: number; avg: number }[] {
  if (timestamps.length !== values.length || timestamps.length === 0) return [];
  
  const monthlyMap = new Map<number, { sum: number; count: number }>();
  
  for (let i = 0; i < timestamps.length; i++) {
    const date = new Date(timestamps[i]);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthKey = monthStart.getTime();
    
    const existing = monthlyMap.get(monthKey) || { sum: 0, count: 0 };
    existing.sum += values[i];
    existing.count++;
    monthlyMap.set(monthKey, existing);
  }
  
  return Array.from(monthlyMap.entries())
    .map(([monthStart, data]) => ({
      monthStart,
      sum: round(data.sum, 2),
      count: data.count,
      avg: round(data.sum / data.count, 2),
    }))
    .sort((a, b) => a.monthStart - b.monthStart);
}

// Goal Progress
export function calculateGoalProgress(
  current: number,
  target: number
): { progressPercent: number; remaining: number; isComplete: boolean } {
  const progressPercent = target > 0 ? round((current / target) * 100, 1) : 0;
  return {
    progressPercent: Math.min(100, progressPercent),
    remaining: Math.max(0, target - current),
    isComplete: current >= target,
  };
}

// Chart-ready data transformation
export function toChartData(
  timestamps: number[],
  values: number[],
  format: 'timestamp' | 'iso' | 'date' = 'iso'
): ChartDataPoint[] {
  return timestamps.map((ts, i) => ({
    timestamp: formatTimestamp(ts, format),
    value: values[i],
  }));
}

function formatTimestamp(ts: number, format: 'timestamp' | 'iso' | 'date'): string {
  const date = new Date(ts);
  switch (format) {
    case 'timestamp':
      return ts.toString();
    case 'iso':
      return date.toISOString();
    case 'date':
      return date.toISOString().split('T')[0];
  }
}

// Summary statistics
export function calculateSummary(values: number[]): ChartSummary | null {
  if (values.length === 0) return null;
  
  const first = values[0];
  const last = values[values.length - 1];
  
  return {
    average: round(values.reduce((a, b) => a + b, 0) / values.length, 2),
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    changePercent: first !== 0 ? round(((last - first) / first) * 100, 2) : null,
  };
}

// Percentiles
export function calculatePercentiles(values: number[]): {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
} | null {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;
  
  const percentile = (p: number) => {
    const index = Math.ceil((p / 100) * len) - 1;
    return sorted[Math.max(0, Math.min(index, len - 1))];
  };
  
  return {
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
  };
}

function round(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
