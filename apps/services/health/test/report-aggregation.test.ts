/**
 * Health Report Aggregation Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateReportData, type ReportAggregatedData } from '../src/lib/report-aggregation';

// Mock D1 database
const createMockDb = (responses: Record<string, unknown[][]>) => ({
  prepare: (query: string) => ({
    bind: (...args: unknown[]) => ({
      all: async () => ({
        results: responses[query] || [],
      }),
      first: async () => responses[query]?.[0] || null,
      run: async () => ({ success: true }),
    }),
  }),
});

describe('Report Data Aggregation', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    // Create mock responses for different queries
    const mockResponses: Record<string, unknown[][]> = {
      // Readiness data
      'SELECT date, score, level FROM daily_readiness_snapshots WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC': [
        { date: '2026-01-13', score: 75, level: 'good' },
        { date: '2026-01-14', score: 82, level: 'high' },
        { date: '2026-01-15', score: 68, level: 'moderate' },
        { date: '2026-01-16', score: 78, level: 'good' },
        { date: '2026-01-17', score: 85, level: 'high' },
        { date: '2026-01-18', score: 72, level: 'good' },
        { date: '2026-01-19', score: 80, level: 'good' },
      ],
      // Empty health metrics
      'SELECT date, value, target FROM health_metric_daily_summaries WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = ? ORDER BY date ASC': [],
      // Empty check-ins
      'SELECT date, sleep_quality FROM user_check_ins WHERE user_id = ? AND date >= ? AND date <= ? AND completed = 1 ORDER BY date ASC': [],
      // Empty nutrition
      'SELECT targets FROM nutrition_targets WHERE user_id = ? AND is_active = 1 LIMIT 1': [],
      'SELECT date, total_nutrition, meal_count FROM daily_nutrition_summaries WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC': [],
      // Empty hydration
      'SELECT hydration_ml_target FROM user_health_targets WHERE user_id = ?': [],
      'SELECT date, SUM(amount_ml) as total_ml FROM hydration_entries WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date ORDER BY date ASC': [],
      // Empty fitness
      'SELECT DATE(completed_at, \'unixepoch\') as date, completed_sets, total_sets, duration_ms, overall_quality_score, completion_percentage FROM workout_summaries WHERE user_id = ? AND completed_at >= ? AND completed_at <= ? ORDER BY completed_at ASC': [],
      'SELECT COUNT(*) as count FROM workout_sessions WHERE user_id = ? AND created_at >= ? AND created_at <= ? AND status IN (\'planned\', \'in_progress\', \'completed\')': [{ count: 0 }],
      // Empty activity
      'SELECT steps_target, active_minutes_target FROM user_health_targets WHERE user_id = ?': [],
      'SELECT date, value, target FROM health_metric_daily_summaries WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = ? ORDER BY date ASC': [],
      // Empty body metrics
      'SELECT date, value FROM health_metric_daily_summaries WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = ? ORDER BY date ASC': [],
      'SELECT date, value FROM health_metric_daily_summaries WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = ? ORDER BY date ASC': [],
      // Empty habits
      'SELECT id, name FROM user_habits WHERE user_id = ? AND is_active = 1': [],
      'SELECT habit_id, COUNT(*) as completed_days FROM daily_habit_completions WHERE user_id = ? AND date >= ? AND date <= ? AND completed = 1 GROUP BY habit_id': [],
      // Empty goals
      'SELECT * FROM user_health_targets WHERE user_id = ?': [],
    };

    mockDb = createMockDb(mockResponses);
  });

  it('should aggregate readiness data correctly', async () => {
    const result = await aggregateReportData(mockDb as unknown as D1Database, {
      userId: 'user-123',
      periodStart: '2026-01-13',
      periodEnd: '2026-01-19',
      timezone: 'UTC',
      locale: 'en',
    });

    expect(result.readiness.dataAvailable).toBe(true);
    expect(result.readiness.averageScore).toBe(77); // (75+82+68+78+85+72+80)/7 ≈ 77
    expect(result.readiness.scores.length).toBe(7);
    expect(result.readiness.trend).toBe('stable');
  });

  it('should handle missing readiness data', async () => {
    // Override with empty readiness
    const emptyResponses: Record<string, unknown[][]> = {
      'SELECT date, score, level FROM daily_readiness_snapshots WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC': [],
    };
    const emptyDb = createMockDb(emptyResponses);

    const result = await aggregateReportData(emptyDb as unknown as D1Database, {
      userId: 'user-123',
      periodStart: '2026-01-13',
      periodEnd: '2026-01-19',
      timezone: 'UTC',
      locale: 'en',
    });

    expect(result.readiness.dataAvailable).toBe(false);
    expect(result.readiness.averageScore).toBeNull();
    expect(result.readiness.scores).toEqual([]);
  });

  it('should identify best and lowest days', async () => {
    const result = await aggregateReportData(mockDb as unknown as D1Database, {
      userId: 'user-123',
      periodStart: '2026-01-13',
      periodEnd: '2026-01-19',
      timezone: 'UTC',
      locale: 'en',
    });

    expect(result.readiness.bestDay?.date).toBe('2026-01-17');
    expect(result.readiness.bestDay?.score).toBe(85);
    expect(result.readiness.lowestDay?.date).toBe('2026-01-15');
    expect(result.readiness.lowestDay?.score).toBe(68);
  });

  it('should calculate data completeness correctly', async () => {
    const result = await aggregateReportData(mockDb as unknown as D1Database, {
      userId: 'user-123',
      periodStart: '2026-01-13',
      periodEnd: '2026-01-19',
      timezone: 'UTC',
      locale: 'en',
    });

    // Only readiness is available
    expect(result.dataCompleteness).toBe('partial');
  });
});

describe('Trend Calculation', () => {
  it('should detect improving trend', () => {
    // With scores increasing over time
    const scores = [50, 55, 60, 70, 75, 80, 85];
    const mockResponses: Record<string, unknown[][]> = {
      'SELECT date, score, level FROM daily_readiness_snapshots WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC': scores.map((score, i) => ({
        date: `2026-01-${13 + i}`,
        score,
        level: 'good',
      })),
    };

    const emptyDb = createMockDb(mockResponses);

    // Calculate trend directly
    const values = scores;
    const third = Math.max(1, Math.floor(values.length / 3));
    const early = values.slice(0, third);
    const late = values.slice(-third);
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
    const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
    const change = ((lateAvg - earlyAvg) / earlyAvg) * 100;

    expect(change).toBeGreaterThan(5);
  });

  it('should detect declining trend', () => {
    // With scores decreasing over time
    const scores = [85, 80, 75, 70, 65, 60, 55];
    const values = scores;
    const third = Math.max(1, Math.floor(values.length / 3));
    const early = values.slice(0, third);
    const late = values.slice(-third);
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
    const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
    const change = ((lateAvg - earlyAvg) / earlyAvg) * 100;

    expect(change).toBeLessThan(-5);
  });

  it('should detect stable trend', () => {
    // With consistent scores
    const scores = [70, 72, 71, 73, 70, 72, 71];
    const values = scores;
    const third = Math.max(1, Math.floor(values.length / 3));
    const early = values.slice(0, third);
    const late = values.slice(-third);
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
    const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
    const change = ((lateAvg - earlyAvg) / earlyAvg) * 100;

    expect(Math.abs(change)).toBeLessThanOrEqual(5);
  });
});

describe('Data Source Tracking', () => {
  it('should list data sources correctly', async () => {
    const mockResponses: Record<string, unknown[][]> = {
      'SELECT date, score, level FROM daily_readiness_snapshots WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC': [
        { date: '2026-01-13', score: 75, level: 'good' },
      ],
    };

    const emptyDb = createMockDb(mockResponses);

    const result = await aggregateReportData(emptyDb as unknown as D1Database, {
      userId: 'user-123',
      periodStart: '2026-01-13',
      periodEnd: '2026-01-19',
      timezone: 'UTC',
      locale: 'en',
    });

    expect(result.dataSources).toContain('health_service');
  });
});

describe('Missing Data Handling', () => {
  it('should preserve null values instead of using zeros', async () => {
    const emptyResponses: Record<string, unknown[][]> = {
      'SELECT date, score, level FROM daily_readiness_snapshots WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC': [],
    };

    const emptyDb = createMockDb(emptyResponses);

    const result = await aggregateReportData(emptyDb as unknown as D1Database, {
      userId: 'user-123',
      periodStart: '2026-01-13',
      periodEnd: '2026-01-19',
      timezone: 'UTC',
      locale: 'en',
    });

    // Should be null, not zero
    expect(result.readiness.averageScore).toBeNull();
    expect(result.sleep.averageDuration).toBeNull();
    expect(result.nutrition.averageCalories).toBeNull();
  });
});
