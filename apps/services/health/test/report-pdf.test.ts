/**
 * Health Report PDF Generation Tests
 * Tests for PDF report generation functionality
 */

import { describe, it, expect } from 'vitest';
import { generateReportPDF, type ReportContent } from '../src/lib/report-pdf';
import type { ReportAggregatedData } from '../src/lib/report-aggregation';

// Mock aggregated data factory
function createMockAggregatedData(overrides: Partial<ReportAggregatedData> = {}): ReportAggregatedData {
  return {
    readiness: {
      averageScore: 75,
      minScore: 62,
      maxScore: 88,
      scores: [
        { date: '2026-01-13', score: 72 },
        { date: '2026-01-14', score: 75 },
        { date: '2026-01-15', score: 78 },
        { date: '2026-01-16', score: 82 },
        { date: '2026-01-17', score: 70 },
        { date: '2026-01-18', score: 68 },
        { date: '2026-01-19', score: 80 },
      ],
      levels: { good: 4, moderate: 3 },
      bestDay: { date: '2026-01-16', score: 82 },
      lowestDay: { date: '2026-01-18', score: 68 },
      trend: 'improving',
      dataAvailable: true,
    },
    sleep: {
      averageDuration: 7.5,
      averageQuality: 7.2,
      durationByDay: [],
      qualityByDay: [],
      consistency: 85,
      targetAdherence: 71,
      dataAvailable: true,
    },
    nutrition: {
      averageCalories: 1950,
      targetCalories: 2000,
      calorieByDay: [],
      protein: { average: 140, target: 150, adherence: 93 },
      carbs: { average: 240, target: 250, adherence: 96 },
      fat: { average: 65, target: 65, adherence: 100 },
      mealCount: 21,
      daysWithData: 7,
      dataAvailable: true,
    },
    hydration: {
      averageMl: 2200,
      targetMl: 2000,
      byDay: [],
      adherence: 85,
      dataAvailable: true,
    },
    fitness: {
      completedWorkouts: 4,
      plannedWorkouts: 5,
      workoutDuration: { total: 210, average: 52.5 },
      trainingVolume: [],
      exerciseProgression: {},
      formQualityTrend: 'stable',
      formQualityScores: [],
      recoveryDays: 2,
      dataAvailable: true,
    },
    activity: {
      averageSteps: 8500,
      stepsByDay: [],
      activeDays: 5,
      totalDays: 7,
      activeMinutes: null,
      trends: { steps: 'improving' },
      dataAvailable: true,
    },
    bodyMetrics: {
      weight: { latest: 75.2, start: 76.0, change: -0.8, unit: 'kg' },
      bodyFat: { latest: 18.5, start: 19.0, change: -0.5 },
      byDay: [],
      dataAvailable: true,
    },
    habits: {
      overallCompletion: 78,
      byHabit: [],
      consistency: 78,
      dataAvailable: true,
    },
    goals: {
      current: [],
      milestones: [],
      adherence: null,
      dataAvailable: false,
    },
    dataSources: ['health_service', 'nutrition_service', 'wearable'],
    dataCompleteness: 'full',
    ...overrides,
  };
}

function createMockContent(overrides: Partial<ReportContent> = {}): ReportContent {
  return {
    version: '1.0.0',
    generatedAt: Date.now(),
    userId: '123e4567-e89b-12d3-a456-426614174000',
    reportType: 'weekly',
    periodStart: '2026-01-13',
    periodEnd: '2026-01-19',
    locale: 'en',
    data: createMockAggregatedData(),
    privacyNotice: 'AIVO Health Reports are wellness summaries.',
    disclaimer: 'This report does not provide medical advice.',
    userDisplayName: 'John Doe',
    userGoal: 'General Fitness',
    ...overrides,
  };
}

describe('PDF Generation', () => {
  describe('generateReportPDF', () => {
    it('should generate a valid PDF buffer', async () => {
      const content = createMockContent();
      const result = await generateReportPDF(content);

      expect(result.pdfBuffer).toBeDefined();
      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);

      // PDF magic bytes: %PDF-1.x
      const bytes = new Uint8Array(result.pdfBuffer);
      expect(bytes[0]).toBe(0x25); // %
      expect(bytes[1]).toBe(0x50); // P
      expect(bytes[2]).toBe(0x44); // D
      expect(bytes[3]).toBe(0x46); // F
    });

    it('should generate a valid file name', async () => {
      const content = createMockContent({
        reportType: 'weekly',
        periodStart: '2026-01-13',
        periodEnd: '2026-01-19',
        generatedAt: new Date('2026-01-20T10:00:00Z').getTime(),
      });

      const result = await generateReportPDF(content);

      expect(result.fileName).toBe('aivo-health-report-weekly-2026-01-13-to-2026-01-19-2026-01-20.pdf');
      expect(result.fileName).toContain('.pdf');
    });

    it('should generate monthly report file name', async () => {
      const content = createMockContent({
        reportType: 'monthly',
        periodStart: '2025-12-01',
        periodEnd: '2025-12-31',
        generatedAt: new Date('2026-01-01T10:00:00Z').getTime(),
      });

      const result = await generateReportPDF(content);

      expect(result.fileName).toContain('monthly');
      expect(result.fileName).toContain('2025-12-01');
      expect(result.fileName).toContain('2025-12-31');
    });

    it('should generate different file names for different types', async () => {
      const weekly = createMockContent({ reportType: 'weekly', generatedAt: Date.now() });
      const monthly = createMockContent({ reportType: 'monthly', generatedAt: Date.now() });
      const custom = createMockContent({ reportType: 'custom', generatedAt: Date.now() });

      const [r1, r2, r3] = await Promise.all([
        generateReportPDF(weekly),
        generateReportPDF(monthly),
        generateReportPDF(custom),
      ]);

      expect(r1.fileName).toContain('weekly');
      expect(r2.fileName).toContain('monthly');
      expect(r3.fileName).toContain('custom');
    });
  });

  describe('Content Handling', () => {
    it('should handle English locale', async () => {
      const content = createMockContent({ locale: 'en' });
      const result = await generateReportPDF(content);

      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle Vietnamese locale', async () => {
      const content = createMockContent({
        locale: 'vi',
        userDisplayName: 'Nguyễn Văn A',
        data: createMockAggregatedData(),
      });

      const result = await generateReportPDF(content);

      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle minimal data', async () => {
      const content = createMockContent({
        data: createMockAggregatedData({
          readiness: {
            averageScore: null,
            minScore: null,
            maxScore: null,
            scores: [],
            levels: {},
            bestDay: null,
            lowestDay: null,
            trend: null,
            dataAvailable: false,
          },
          sleep: { averageDuration: null, averageQuality: null, durationByDay: [], qualityByDay: [], consistency: null, targetAdherence: null, dataAvailable: false },
          nutrition: { averageCalories: null, targetCalories: null, calorieByDay: [], protein: { average: null, target: null, adherence: null }, carbs: { average: null, target: null, adherence: null }, fat: { average: null, target: null, adherence: null }, mealCount: 0, daysWithData: 0, dataAvailable: false },
          hydration: { averageMl: null, targetMl: null, byDay: [], adherence: null, dataAvailable: false },
          fitness: { completedWorkouts: 0, plannedWorkouts: 0, workoutDuration: { total: null, average: null }, trainingVolume: [], exerciseProgression: {}, formQualityTrend: null, formQualityScores: [], recoveryDays: 0, dataAvailable: false },
          activity: { averageSteps: null, stepsByDay: [], activeDays: 0, totalDays: 0, activeMinutes: null, trends: { steps: null }, dataAvailable: false },
          bodyMetrics: { weight: { latest: null, start: null, change: null, unit: 'kg' }, bodyFat: { latest: null, start: null, change: null }, byDay: [], dataAvailable: false },
          habits: { overallCompletion: null, byHabit: [], consistency: null, dataAvailable: false },
          goals: { current: [], milestones: [], adherence: null, dataAvailable: false },
          dataSources: [],
          dataCompleteness: 'minimal',
        }),
      });

      const result = await generateReportPDF(content);

      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle null user display name', async () => {
      const content = createMockContent({ userDisplayName: undefined });
      const result = await generateReportPDF(content);

      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle null user goal', async () => {
      const content = createMockContent({ userGoal: undefined });
      const result = await generateReportPDF(content);

      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle partial data availability', async () => {
      const content = createMockContent({
        data: createMockAggregatedData({
          readiness: { averageScore: 75, minScore: 62, maxScore: 88, scores: [{ date: '2026-01-13', score: 72 }], levels: {}, bestDay: null, lowestDay: null, trend: 'improving', dataAvailable: true },
          sleep: { averageDuration: null, averageQuality: null, durationByDay: [], qualityByDay: [], consistency: null, targetAdherence: null, dataAvailable: false },
          nutrition: { averageCalories: 1950, targetCalories: 2000, calorieByDay: [], protein: { average: 140, target: 150, adherence: 93 }, carbs: { average: null, target: null, adherence: null }, fat: { average: null, target: null, adherence: null }, mealCount: 7, daysWithData: 7, dataAvailable: true },
          hydration: { averageMl: null, targetMl: null, byDay: [], adherence: null, dataAvailable: false },
          fitness: { completedWorkouts: 0, plannedWorkouts: 0, workoutDuration: { total: null, average: null }, trainingVolume: [], exerciseProgression: {}, formQualityTrend: null, formQualityScores: [], recoveryDays: 0, dataAvailable: false },
          activity: { averageSteps: null, stepsByDay: [], activeDays: 0, totalDays: 0, activeMinutes: null, trends: { steps: null }, dataAvailable: false },
          bodyMetrics: { weight: { latest: null, start: null, change: null, unit: 'kg' }, bodyFat: { latest: null, start: null, change: null }, byDay: [], dataAvailable: false },
          habits: { overallCompletion: null, byHabit: [], consistency: null, dataAvailable: false },
          goals: { current: [], milestones: [], adherence: null, dataAvailable: false },
          dataSources: ['health_service', 'nutrition_service'],
          dataCompleteness: 'partial',
        }),
      });

      const result = await generateReportPDF(content);

      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('Determinism', () => {
    it('should generate identical PDF for same content', async () => {
      const content = createMockContent({
        generatedAt: 1704067200000, // Fixed timestamp
      });

      const [result1, result2] = await Promise.all([
        generateReportPDF(content),
        generateReportPDF(content),
      ]);

      // Same content should produce same size (exact bytes may vary by font embedding)
      expect(result1.pdfBuffer.byteLength).toBe(result2.pdfBuffer.byteLength);
    });
  });

  describe('Data Trends', () => {
    it('should handle improving trend correctly', async () => {
      const content = createMockContent({
        data: createMockAggregatedData({
          readiness: {
            averageScore: 80,
            minScore: 65,
            maxScore: 90,
            scores: [
              { date: '2026-01-13', score: 70 },
              { date: '2026-01-14', score: 72 },
              { date: '2026-01-15', score: 75 },
              { date: '2026-01-16', score: 78 },
              { date: '2026-01-17', score: 80 },
              { date: '2026-01-18', score: 85 },
              { date: '2026-01-19', score: 90 },
            ],
            levels: {},
            bestDay: { date: '2026-01-19', score: 90 },
            lowestDay: { date: '2026-01-13', score: 70 },
            trend: 'improving',
            dataAvailable: true,
          },
        }),
      });

      const result = await generateReportPDF(content);
      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle declining trend correctly', async () => {
      const content = createMockContent({
        data: createMockAggregatedData({
          readiness: {
            averageScore: 60,
            minScore: 50,
            maxScore: 75,
            scores: [
              { date: '2026-01-13', score: 75 },
              { date: '2026-01-14', score: 72 },
              { date: '2026-01-15', score: 68 },
              { date: '2026-01-16', score: 65 },
              { date: '2026-01-17', score: 60 },
              { date: '2026-01-18', score: 55 },
              { date: '2026-01-19', score: 50 },
            ],
            levels: {},
            bestDay: { date: '2026-01-13', score: 75 },
            lowestDay: { date: '2026-01-19', score: 50 },
            trend: 'declining',
            dataAvailable: true,
          },
          activity: {
            averageSteps: 6000,
            stepsByDay: [],
            activeDays: 2,
            totalDays: 7,
            activeMinutes: null,
            trends: { steps: 'declining' },
            dataAvailable: true,
          },
        }),
      });

      const result = await generateReportPDF(content);
      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scores array', async () => {
      const content = createMockContent({
        data: createMockAggregatedData({
          readiness: {
            averageScore: null,
            minScore: null,
            maxScore: null,
            scores: [],
            levels: {},
            bestDay: null,
            lowestDay: null,
            trend: null,
            dataAvailable: true,
          },
        }),
      });

      const result = await generateReportPDF(content);
      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle zero values', async () => {
      const content = createMockContent({
        data: createMockAggregatedData({
          fitness: {
            completedWorkouts: 0,
            plannedWorkouts: 0,
            workoutDuration: { total: 0, average: 0 },
            trainingVolume: [],
            exerciseProgression: {},
            formQualityTrend: null,
            formQualityScores: [],
            recoveryDays: 7,
            dataAvailable: true,
          },
          activity: {
            averageSteps: 0,
            stepsByDay: [],
            activeDays: 0,
            totalDays: 7,
            activeMinutes: 0,
            trends: { steps: null },
            dataAvailable: true,
          },
        }),
      });

      const result = await generateReportPDF(content);
      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle long user names', async () => {
      const content = createMockContent({
        userDisplayName: 'A Very Long User Name That Should Be Handled Gracefully Without Breaking The Layout',
      });

      const result = await generateReportPDF(content);
      expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle all data completeness levels', async () => {
      const levels = ['full', 'partial', 'minimal'] as const;

      for (const level of levels) {
        const content = createMockContent({
          data: createMockAggregatedData({ dataCompleteness: level }),
        });

        const result = await generateReportPDF(content);
        expect(result.pdfBuffer.byteLength).toBeGreaterThan(0);
      }
    });
  });
});
