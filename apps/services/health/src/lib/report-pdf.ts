/**
 * Health Report PDF Generation Service
 * Creates professional A4 PDF reports with text content
 *
 * Features:
 * - Professional A4 layout
 * - Deterministic output
 * - Accessible text contrast
 * - No external resources
 * - English and Vietnamese localization
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import type { SupportedLocale, ReportType } from '@repo/report-types';
import type { ReportAggregatedData } from './report-aggregation.js';
import type { AISummaryResult } from './report-ai.js';

// =============================================================================
// Types
// =============================================================================

export interface ReportContent {
  version: string;
  generatedAt: number;
  userId: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  locale: SupportedLocale;
  data: ReportAggregatedData;
  aiSummary?: AISummaryResult | null;
  privacyNotice: string;
  disclaimer: string;
  userDisplayName?: string;
  userGoal?: string;
}

export interface GeneratePDFResult {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

// =============================================================================
// Localization
// =============================================================================

const LABELS = {
  en: {
    title: 'AIVO Health Report',
    reportPeriod: 'Report Period',
    generatedOn: 'Generated on',
    version: 'Version',
    wellnessDisclaimer: 'Wellness Disclaimer',
    pageOf: 'Page {current} of {total}',
    executiveSummary: 'Executive Summary',
    dataCompleteness: 'Data Completeness',
    full: 'Full',
    partial: 'Partial',
    minimal: 'Minimal',
    readiness: 'Readiness',
    sleep: 'Sleep',
    nutrition: 'Nutrition',
    hydration: 'Hydration',
    fitness: 'Fitness',
    activity: 'Activity',
    bodyMetrics: 'Body Metrics',
    habits: 'Habits',
    goals: 'Goals',
    recommendations: 'Recommendations',
    dataNotes: 'Data Notes',
    averageScore: 'Average Score',
    trend: 'Trend',
    improving: 'Improving',
    stable: 'Stable',
    declining: 'Declining',
    bestDay: 'Best Day',
    lowestDay: 'Lowest Day',
    dataNotAvailable: 'N/A',
    score: 'Score',
    days: 'days',
    hours: 'hrs',
    minutes: 'min',
    kg: 'kg',
    kcal: 'kcal',
    g: 'g',
    ml: 'ml',
    steps: 'steps',
    avgDuration: 'Avg Duration',
    target: 'Target',
    adherence: 'Adherence',
    consistency: 'Consistency',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    avgConsumed: 'Avg Consumed',
    vsTarget: 'vs Target',
    daysTracked: 'days tracked',
    avgIntake: 'Avg Intake',
    workoutsCompleted: 'Workouts Completed',
    plannedWorkouts: 'Planned',
    totalDuration: 'Total Duration',
    formQuality: 'Form Quality',
    avgSteps: 'Avg Steps',
    activeDays: 'Active Days',
    current: 'Current',
    change: 'Change',
    recommendationIntro: 'Based on your data, we recommend:',
    aiSummary: 'AI Summary',
    aiConfidence: 'Confidence',
    dataSources: 'Data Sources',
    reportAlgorithm: 'Report Algorithm',
    algorithmVersion: 'v1.0.0',
    missingDataNote: 'Missing data is preserved as unavailable rather than zero.',
    recommendedActions: 'Recommended Actions',
  },
  vi: {
    title: 'Báo Cáo Sức Khỏe AIVO',
    reportPeriod: 'Thời Gian Báo Cáo',
    generatedOn: 'Tạo lúc',
    version: 'Phiên bản',
    wellnessDisclaimer: 'Tuyên Bố Sức Khỏe',
    pageOf: 'Trang {current} / {total}',
    executiveSummary: 'Tóm Tắt Điều Hành',
    dataCompleteness: 'Mức Độ Hoàn Chỉnh',
    full: 'Đầy Đủ',
    partial: 'Một Phần',
    minimal: 'Tối Thiểu',
    readiness: 'Mức Sẵn Sàng',
    sleep: 'Giấc Ngủ',
    nutrition: 'Dinh Dưỡng',
    hydration: 'Hydration',
    fitness: 'Thể Chất',
    activity: 'Hoạt Động',
    bodyMetrics: 'Chỉ Số Cơ Thể',
    habits: 'Thói Quen',
    goals: 'Mục Tiêu',
    recommendations: 'Khuyến Nghị',
    dataNotes: 'Ghi Chú Dữ Liệu',
    averageScore: 'Điểm TB',
    trend: 'Xu Hướng',
    improving: 'Cải Thiện',
    stable: 'Ổn Định',
    declining: 'Suy Giảm',
    bestDay: 'Ngày Tốt Nhất',
    lowestDay: 'Ngày Thấp Nhất',
    dataNotAvailable: 'Không có',
    score: 'Điểm',
    days: 'ngày',
    hours: 'giờ',
    minutes: 'phút',
    kg: 'kg',
    kcal: 'kcal',
    g: 'g',
    ml: 'ml',
    steps: 'bước',
    avgDuration: 'TB Thời Lượng',
    target: 'Mục Tiêu',
    adherence: 'Tuân Thủ',
    consistency: 'Nhất Quán',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Chất Béo',
    avgConsumed: 'TB Tiêu Thụ',
    vsTarget: 'so với Mục Tiêu',
    daysTracked: 'ngày theo dõi',
    avgIntake: 'TB Lượng Nước',
    workoutsCompleted: 'Bài Tập Hoàn Thành',
    plannedWorkouts: 'Kế Hoạch',
    totalDuration: 'Tổng Thời Lượng',
    formQuality: 'Chất Lượng',
    avgSteps: 'TB Bước Chân',
    activeDays: 'Ngày Năng Động',
    current: 'Hiện Tại',
    change: 'Thay Đổi',
    recommendationIntro: 'Dựa trên dữ liệu của bạn, chúng tôi khuyên:',
    aiSummary: 'Tóm Tắt AI',
    aiConfidence: 'Độ Tin Cậy',
    dataSources: 'Nguồn Dữ Liệu',
    reportAlgorithm: 'Thuật Toán Báo Cáo',
    algorithmVersion: 'v1.0.0',
    missingDataNote: 'Dữ liệu thiếu được giữ nguyên là không có sẵn thay vì bằng không.',
    recommendedActions: 'Hành Động Đề Xuất',
  },
};

// =============================================================================
// Color Constants (pdf-lib rgb values 0-1)
// =============================================================================

const C = {
  primary: rgb(0.4, 0.494, 0.918),      // #667eea
  secondary: rgb(0.463, 0.29, 0.635),    // #764ba2
  good: rgb(0.063, 0.725, 0.506),        // #10b981
  warning: rgb(0.96, 0.62, 0.04),       // #f59e0b
  danger: rgb(0.937, 0.267, 0.267),      // #ef4444
  text: rgb(0.122, 0.161, 0.216),        // #1f2937
  textMuted: rgb(0.42, 0.443, 0.498),   // #6b7280
  background: rgb(0.976, 0.98, 0.984),    // #f9fafb
  white: rgb(1, 1, 1),
  cardBg: rgb(0.99, 0.99, 0.99),
  border: rgb(0.898, 0.906, 0.922),      // #e5e7eb
  accent: rgb(0.941, 0.565, 0.984),      // #f093fb
  headerBg: rgb(0.25, 0.25, 0.27),      // dark header
};

// =============================================================================
// Utility Functions
// =============================================================================

function escapeText(text: string): string {
  return String(text)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

function formatDate(dateStr: string, locale: SupportedLocale = 'en'): string {
  const date = new Date(dateStr);
  const localeStr = locale === 'vi' ? 'vi-VN' : 'en-US';
  return date.toLocaleDateString(localeStr, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(timestamp: number, locale: SupportedLocale = 'en'): string {
  const date = new Date(timestamp);
  const localeStr = locale === 'vi' ? 'vi-VN' : 'en-US';
  return date.toLocaleString(localeStr, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(value: number | null, locale: SupportedLocale = 'en', decimals = 1): string {
  if (value === null) return 'N/A';
  const localeStr = locale === 'vi' ? 'vi-VN' : 'en-US';
  return new Intl.NumberFormat(localeStr, { maximumFractionDigits: decimals }).format(value);
}

function formatTrend(trend: 'improving' | 'stable' | 'declining' | null, lbls: typeof LABELS.en): string {
  if (!trend) return lbls.dataNotAvailable;
  return lbls[trend];
}

function formatPercent(value: number | null, locale: SupportedLocale = 'en'): string {
  if (value === null) return 'N/A';
  return `${formatNumber(value, locale, 0)}%`;
}

// Draw rounded rectangle using bezier curves (approximation)
function drawRoundedRect(
  page: ReturnType<PDFDocument['addPage']>,
  x: number, y: number, w: number, h: number, r: number,
  color: ReturnType<typeof rgb>,
  stroke?: ReturnType<typeof rgb>
) {
  if (h < 0) { y += h; h = -h; }
  if (w < 0) { x += w; w = -w; }
  const k = 0.5523;
  r = Math.min(r, w / 2, h / 2);

  page.drawLine({ start: { x: x + r, y: y }, end: { x: x + w - r, y }, thickness: 1, color: color });
  page.drawLine({ start: { x: x + w, y: y + r }, end: { x: x + w, y: y + h - r }, thickness: 1, color: color });
  page.drawLine({ start: { x: x + w - r, y: y + h }, end: { x: x + r, y: y + h }, thickness: 1, color: color });
  page.drawLine({ start: { x: x, y: y + h - r }, end: { x: x, y: y + r }, thickness: 1, color: color });
}

// =============================================================================
// Main PDF Generation
// =============================================================================

export async function generateReportPDF(
  content: ReportContent
): Promise<GeneratePDFResult> {
  const pdfDoc = await PDFDocument.create();

  // A4 dimensions in points (72 dpi)
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const L = LABELS[content.locale] || LABELS.en;

  // State
  let currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let pageNum = 1;

  // ============================================================
  // Drawing helpers (using pdf-lib page API)
  // ============================================================

  function drawText(text: string, x: number, yy: number, size: number,
    f: typeof fontBold = font, color: typeof C.text) {
    currentPage.drawText(escapeText(text), { x, y: yy, size, font: f, color });
  }

  function drawWrapped(text: string, x: number, yy: number, maxW: number,
    size: number, f: typeof font = font, color: typeof C.text, lh = size * 1.4): number {
    const words = text.split(' ');
    let line = '';
    let curY = yy;
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      const w = f.widthOfTextAtSize(test, size);
      if (w > maxW && line) {
        currentPage.drawText(escapeText(line), { x, y: curY, size, font: f, color });
        curY -= lh;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      currentPage.drawText(escapeText(line), { x, y: curY, size, font: f, color });
      curY -= lh;
    }
    return curY;
  }

  function needSpace(h: number): void {
    if (y - h < MARGIN) {
      addPageFooter();
      currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      pageNum++;
    }
  }

  function newSection(title: string): void {
    needSpace(30);
    currentPage.drawLine({
      start: { x: MARGIN, y: y + 8 },
      end: { x: PAGE_W - MARGIN, y: y + 8 },
      thickness: 0.5,
      color: C.border,
    });
    y -= 4;
    currentPage.drawText(title.toUpperCase(), { x: MARGIN, y, size: 10, font: fontBold, color: C.primary });
    y -= 20;
  }

  function card(h: number, bg = C.cardBg): void {
    needSpace(h + 6);
    currentPage.drawRectangle({ x: MARGIN, y: y - h, width: CONTENT_W, height: h, color: bg });
    y -= 6;
  }

  function addPageFooter(): void {
    const txt = L.pageOf.replace('{current}', String(pageNum)).replace('{total}', String(pageNum));
    const w = font.widthOfTextAtSize(txt, 8);
    currentPage.drawText(txt, { x: (PAGE_W - w) / 2, y: MARGIN / 2 - 4, size: 8, font, color: C.textMuted });
  }

  function labelValue(label: string, value: string, x: number, yy: number,
    lCol = C.textMuted, vCol = C.text, vFont: typeof font = font): void {
    currentPage.drawText(label, { x, y: yy, size: 9, font, color: lCol });
    const lW = font.widthOfTextAtSize(label, 9);
    currentPage.drawText(escapeText(value), { x: x + lW + 2, y: yy, size: 10, font: vFont, color: vCol });
  }

  // ============================================================
  // COVER PAGE
  // ============================================================

  // Background
  currentPage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.white });

  // Header gradient (simulated with two rects)
  currentPage.drawRectangle({ x: 0, y: PAGE_H - 220, width: PAGE_W, height: 220, color: C.primary });
  currentPage.drawRectangle({ x: 0, y: PAGE_H - 220, width: PAGE_W, height: 120, color: C.secondary });

  // Logo and title
  currentPage.drawText('AIVO', { x: MARGIN, y: PAGE_H - 75, size: 32, font: fontBold, color: C.white });
  currentPage.drawText(L.title, { x: MARGIN, y: PAGE_H - 105, size: 18, font, color: C.white });

  // Report metadata
  currentPage.drawText(
    `${L.reportPeriod}: ${formatDate(content.periodStart, content.locale)} – ${formatDate(content.periodEnd, content.locale)}`,
    { x: MARGIN, y: PAGE_H - 140, size: 12, font, color: C.white }
  );
  if (content.userDisplayName) {
    currentPage.drawText(content.userDisplayName, { x: MARGIN, y: PAGE_H - 160, size: 12, font, color: C.white });
  }
  if (content.userGoal) {
    currentPage.drawText(`Goal: ${content.userGoal}`, { x: MARGIN, y: PAGE_H - 180, size: 11, font, color: C.white });
  }

  // Report type badge
  const typeLabel = content.reportType === 'weekly' ? 'WEEKLY' : content.reportType === 'monthly' ? 'MONTHLY' : 'CUSTOM';
  const badgeW = fontBold.widthOfTextAtSize(` ${typeLabel} `, 11);
  currentPage.drawRectangle({ x: PAGE_W - MARGIN - badgeW - 16, y: PAGE_H - 65, width: badgeW + 16, height: 28, color: C.good });
  currentPage.drawText(` ${typeLabel} `, { x: PAGE_W - MARGIN - badgeW - 8, y: PAGE_H - 49, size: 11, font: fontBold, color: C.white });

  // Data completeness
  y = PAGE_H - 240;
  const completenessColor = content.data.dataCompleteness === 'full' ? C.good
    : content.data.dataCompleteness === 'partial' ? C.warning : C.danger;
  const completenessLabel = L[L.data.dataCompleteness as keyof typeof L] || L.partial;
  currentPage.drawText(`● ${L.dataCompleteness}: ${completenessLabel}`.toUpperCase(), {
    x: MARGIN, y, size: 9, font: fontBold, color: completenessColor
  });
  y -= 30;

  // Executive Summary card
  card(100);
  y -= 4;
  currentPage.drawText(L.executiveSummary, { x: MARGIN + 12, y, size: 12, font: fontBold, color: C.primary });
  y -= 18;

  // Quick stats grid
  const stats = [
    { label: L.readiness, value: content.data.readiness.dataAvailable ? `${content.data.readiness.averageScore}/100` : L.dataNotAvailable, color: C.primary },
    { label: L.sleep, value: content.data.sleep.dataAvailable && content.data.sleep.averageDuration !== null ? `${formatNumber(content.data.sleep.averageDuration, content.locale)} ${L.hours}` : L.dataNotAvailable, color: C.secondary },
    { label: L.calories, value: content.data.nutrition.dataAvailable && content.data.nutrition.averageCalories !== null ? `${formatNumber(content.data.nutrition.averageCalories, content.locale)} ${L.kcal}` : L.dataNotAvailable, color: C.accent },
    { label: L.workoutsCompleted, value: content.data.fitness.dataAvailable ? `${content.data.fitness.completedWorkouts}` : L.dataNotAvailable, color: C.good },
  ];

  const statW = (CONTENT_W - 48) / 4;
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const sx = MARGIN + 12 + i * (statW + 8);

    currentPage.drawText(s.value, { x: sx, y, size: 18, font: fontBold, color: s.color });
    y -= 14;
    currentPage.drawText(s.label.toUpperCase(), { x: sx, y, size: 8, font, color: C.textMuted });
    y += 14;
  }
  y -= 28;

  // Trend indicators
  const trends: Array<{ label: string; trend: string | null; trendType: 'improving' | 'stable' | 'declining' | null }> = [
    { label: L.readiness, trend: content.data.readiness.trend, trendType: content.data.readiness.trend },
    { label: L.activity, trend: content.data.activity.trends.steps, trendType: content.data.activity.trends.steps },
  ];

  for (const t of trends) {
    if (t.trendType) {
      const tColor = t.trendType === 'improving' ? C.good : t.trendType === 'declining' ? C.danger : C.warning;
      const arrow = t.trendType === 'improving' ? '↑' : t.trendType === 'declining' ? '↓' : '→';
      currentPage.drawText(`${t.label}: ${arrow} ${formatTrend(t.trendType, L)}`, { x: MARGIN + 12, y, size: 9, font, color: tColor });
      y -= 12;
    }
  }

  y -= 16;

  // AI Summary
  if (content.aiSummary) {
    needSpace(70);
    card(55);
    y -= 4;
    currentPage.drawText(L.aiSummary, { x: MARGIN + 12, y, size: 10, font: fontBold, color: C.secondary });
    y -= 14;
    y = drawWrapped(content.aiSummary.summary, MARGIN + 12, y, CONTENT_W - 24, 9, font, C.text);
    y -= 10;
  }

  // Wellness disclaimer
  needSpace(50);
  currentPage.drawRectangle({ x: MARGIN, y: y - 40, width: CONTENT_W, height: 36, color: rgb(1, 0.99, 0.96) });
  y -= 6;
  currentPage.drawText(L.wellnessDisclaimer.toUpperCase(), { x: MARGIN + 8, y, size: 8, font: fontBold, color: C.textMuted });
  y -= 12;
  drawWrapped(content.disclaimer, MARGIN + 8, y, CONTENT_W - 16, 7, fontOblique, C.textMuted);
  y -= 18;

  // Footer
  currentPage.drawText(
    `${L.generatedOn}: ${formatDateTime(content.generatedAt, content.locale)} | ${L.version} ${content.version}`,
    { x: MARGIN, y: MARGIN / 2 - 4, size: 8, font, color: C.textMuted }
  );

  // ============================================================
  // DETAILED SECTIONS
  // ============================================================

  // ---- Readiness ----
  newSection(L.readiness);
  if (content.data.readiness.dataAvailable) {
    const r = content.data.readiness;
    const col2 = MARGIN + 12 + CONTENT_W / 2;

    // Score badges
    currentPage.drawText(`${L.averageScore}: ${r.averageScore}/100`, { x: MARGIN + 12, y, size: 12, font: fontBold, color: C.primary });
    const trendColor = r.trend === 'improving' ? C.good : r.trend === 'declining' ? C.danger : C.warning;
    currentPage.drawText(`${L.trend}: ${formatTrend(r.trend, L)}`, { x: col2, y, size: 12, font: fontBold, color: trendColor });
    y -= 16;

    currentPage.drawText(`Min: ${r.minScore} | Max: ${r.maxScore}`, { x: MARGIN + 12, y, size: 9, font, color: C.textMuted });
    if (r.bestDay) {
      currentPage.drawText(`${L.bestDay}: ${formatDate(r.bestDay.date, content.locale)} (${r.bestDay.score})`, { x: col2, y, size: 9, font, color: C.good });
    }
    y -= 14;

    // Draw mini bar chart using rectangles
    if (r.scores.length > 0) {
      needSpace(80);
      const chartH = 60;
      const chartY = y - chartH;
      const barW = Math.min(20, (CONTENT_W - 24) / r.scores.length - 2);
      const maxScore = 100;

      currentPage.drawRectangle({ x: MARGIN + 12, y: chartY, width: CONTENT_W - 24, height: chartH, color: C.white });
      currentPage.drawRectangle({ x: MARGIN + 12, y: chartY, width: CONTENT_W - 24, height: chartH, color: C.white, opacity: 0, borderColor: C.border });

      for (let i = 0; i < r.scores.length; i++) {
        const s = r.scores[i];
        const bx = MARGIN + 12 + i * (barW + 2);
        const barH = (s.score / maxScore) * (chartH - 8);
        const barY = chartY + 4;

        const barColor = s.score >= 80 ? C.good : s.score >= 60 ? C.warning : C.danger;
        currentPage.drawRectangle({ x: bx, y: barY + (chartH - 8 - barH), width: barW, height: barH, color: barColor });

        // X-axis label (show every few bars)
        if (r.scores.length <= 14 || i % Math.ceil(r.scores.length / 7) === 0) {
          const dateStr = s.date.slice(5);
          currentPage.drawText(dateStr, { x: bx, y: chartY + chartH + 2, size: 7, font, color: C.textMuted });
        }
      }

      y = chartY - 12;
    }
  } else {
    currentPage.drawText(L.dataNotAvailable, { x: MARGIN + 12, y, size: 10, font, color: C.textMuted });
    y -= 16;
  }

  // ---- Sleep ----
  newSection(L.sleep);
  if (content.data.sleep.dataAvailable) {
    const s = content.data.sleep;
    const col2 = MARGIN + 12 + CONTENT_W / 2;
    const durationColor = s.averageDuration !== null && s.averageDuration >= 7 ? C.good : C.warning;

    currentPage.drawText(`${L.avgDuration}: ${formatNumber(s.averageDuration, content.locale)} ${L.hours}`, { x: MARGIN + 12, y, size: 11, font: fontBold, color: C.secondary });
    currentPage.drawText(`${L.target}: 8 ${L.hours}`, { x: col2, y, size: 11, font, color: C.textMuted });
    y -= 14;

    currentPage.drawText(`${L.adherence}: ${formatPercent(s.targetAdherence, content.locale)}`, { x: MARGIN + 12, y, size: 10, font: fontBold, color: C.good });
    currentPage.drawText(`${L.consistency}: ${formatPercent(s.consistency, content.locale)}`, { x: col2, y, size: 10, font, color: C.textMuted });
    y -= 18;
  } else {
    currentPage.drawText(L.dataNotAvailable, { x: MARGIN + 12, y, size: 10, font, color: C.textMuted });
    y -= 16;
  }

  // ---- Nutrition ----
  newSection(L.nutrition);
  if (content.data.nutrition.dataAvailable) {
    const n = content.data.nutrition;
    const macroW = CONTENT_W / 2 - 8;

    // Macros grid (2x2)
    const macros: Array<{ label: string; value: number | null; target: number | null; unit: string; color: typeof C.primary }> = [
      { label: L.calories, value: n.averageCalories, target: n.targetCalories, unit: L.kcal, color: C.primary },
      { label: L.protein, value: n.protein.average, target: n.protein.target, unit: L.g, color: C.good },
      { label: L.carbs, value: n.carbs.average, target: n.carbs.target, unit: L.g, color: C.warning },
      { label: L.fat, value: n.fat.average, target: n.fat.target, unit: L.g, color: C.danger },
    ];

    for (let i = 0; i < macros.length; i++) {
      const m = macros[i];
      const mx = i % 2 === 0 ? MARGIN + 12 : MARGIN + 12 + macroW + 16;
      const my = y;

      needSpace(38);
      currentPage.drawRectangle({ x: mx, y: my - 34, width: macroW, height: 34, color: C.cardBg });
      currentPage.drawText(`${formatNumber(m.value, content.locale)}${m.unit}`, { x: mx + 8, y: my - 18, size: 14, font: fontBold, color: m.color });
      currentPage.drawText(`${m.label} (${L.vsTarget} ${formatNumber(m.target, content.locale)}${m.unit})`, { x: mx + 8, y: my - 30, size: 8, font, color: C.textMuted });
    }
    y -= 44;

    currentPage.drawText(`${L.daysTracked}: ${n.daysWithData}`, { x: MARGIN + 12, y, size: 9, font, color: C.textMuted });
    y -= 16;
  } else {
    currentPage.drawText(L.dataNotAvailable, { x: MARGIN + 12, y, size: 10, font, color: C.textMuted });
    y -= 16;
  }

  // ---- Hydration ----
  newSection(L.hydration);
  if (content.data.hydration.dataAvailable) {
    const h = content.data.hydration;
    currentPage.drawText(`${L.avgIntake}: ${formatNumber(h.averageMl, content.locale)} ${L.ml}`, { x: MARGIN + 12, y, size: 11, font: fontBold, color: C.secondary });
    y -= 14;
    currentPage.drawText(`${L.target}: ${formatNumber(h.targetMl, content.locale)} ${L.ml}`, { x: MARGIN + 12, y, size: 9, font, color: C.textMuted });
    y -= 14;
    currentPage.drawText(`${L.adherence}: ${formatPercent(h.adherence, content.locale)}`, { x: MARGIN + 12, y, size: 9, font, color: C.textMuted });
    y -= 18;
  } else {
    currentPage.drawText(L.dataNotAvailable, { x: MARGIN + 12, y, size: 10, font, color: C.textMuted });
    y -= 16;
  }

  // ---- Fitness ----
  newSection(L.fitness);
  if (content.data.fitness.dataAvailable) {
    const f = content.data.fitness;
    const col2 = MARGIN + 12 + CONTENT_W / 2;

    currentPage.drawText(`${L.workoutsCompleted}: ${f.completedWorkouts}`, { x: MARGIN + 12, y, size: 11, font: fontBold, color: C.good });
    currentPage.drawText(`${L.plannedWorkouts}: ${f.plannedWorkouts}`, { x: col2, y, size: 11, font, color: C.textMuted });
    y -= 14;

    currentPage.drawText(`${L.avgDuration}: ${formatNumber(f.workoutDuration.average, content.locale)} ${L.minutes}`, { x: MARGIN + 12, y, size: 9, font, color: C.textMuted });
    currentPage.drawText(`${L.totalDuration}: ${formatNumber(f.workoutDuration.total, content.locale)} ${L.minutes}`, { x: col2, y, size: 9, font, color: C.textMuted });
    y -= 14;

    if (f.formQualityTrend) {
      const fqColor = f.formQualityTrend === 'improving' ? C.good : f.formQualityTrend === 'declining' ? C.danger : C.warning;
      currentPage.drawText(`${L.formQuality}: ${formatTrend(f.formQualityTrend, L)}`, { x: MARGIN + 12, y, size: 9, font, color: fqColor });
      y -= 14;
    }
  } else {
    currentPage.drawText(L.dataNotAvailable, { x: MARGIN + 12, y, size: 10, font, color: C.textMuted });
    y -= 16;
  }

  // ---- Activity ----
  newSection(L.activity);
  if (content.data.activity.dataAvailable) {
    const a = content.data.activity;
    const col2 = MARGIN + 12 + CONTENT_W / 2;

    currentPage.drawText(`${L.avgSteps}: ${formatNumber(a.averageSteps, content.locale, 0)} ${L.steps}`, { x: MARGIN + 12, y, size: 11, font: fontBold, color: C.primary });
    currentPage.drawText(`${L.activeDays}: ${a.activeDays} ${L.days}`, { x: col2, y, size: 11, font: fontBold, color: C.good });
    y -= 14;

    if (a.trends.steps) {
      const tColor = a.trends.steps === 'improving' ? C.good : a.trends.steps === 'declining' ? C.danger : C.warning;
      currentPage.drawText(`${L.trend}: ${formatTrend(a.trends.steps, L)}`, { x: MARGIN + 12, y, size: 9, font, color: tColor });
      y -= 14;
    }
  } else {
    currentPage.drawText(L.dataNotAvailable, { x: MARGIN + 12, y, size: 10, font, color: C.textMuted });
    y -= 16;
  }

  // ---- Body Metrics ----
  newSection(L.bodyMetrics);
  if (content.data.bodyMetrics.dataAvailable) {
    const b = content.data.bodyMetrics;
    const col2 = MARGIN + 12 + CONTENT_W / 2;

    currentPage.drawText(`${L.current}: ${formatNumber(b.weight.latest, content.locale)} ${L.kg}`, { x: MARGIN + 12, y, size: 11, font: fontBold, color: C.text });
    if (b.weight.change !== null) {
      const chColor = b.weight.change < 0 ? C.good : b.weight.change > 0 ? C.warning : C.textMuted;
      const chSign = b.weight.change > 0 ? '+' : '';
      currentPage.drawText(`${L.change}: ${chSign}${formatNumber(b.weight.change, content.locale)} ${L.kg}`, { x: col2, y, size: 11, font: fontBold, color: chColor });
    }
    y -= 18;
  } else {
    currentPage.drawText(L.dataNotAvailable, { x: MARGIN + 12, y, size: 10, font, color: C.textMuted });
    y -= 16;
  }

  // ---- Recommendations ----
  newSection(L.recommendations);
  const recommendations = generateRecommendations(content.data, L, content.locale);
  for (const rec of recommendations) {
    needSpace(18);
    // Bullet
    currentPage.drawCircle({ x: MARGIN + 16, y: y - 4, size: 3, color: C.primary });
    currentPage.drawText(rec, { x: MARGIN + 24, y, size: 9, font, color: C.text });
    y -= 16;
  }
  y -= 8;

  // ---- Data Notes ----
  newSection(L.dataNotes);
  currentPage.drawText(`${L.dataSources}: ${content.data.dataSources.join(', ') || L.dataNotAvailable}`, { x: MARGIN + 12, y, size: 9, font, color: C.textMuted });
  y -= 12;
  currentPage.drawText(`${L.reportAlgorithm}: ${content.version}`, { x: MARGIN + 12, y, size: 9, font, color: C.textMuted });
  y -= 12;
  currentPage.drawText(L.missingDataNote, { x: MARGIN + 12, y, size: 8, fontOblique, color: C.textMuted });
  y -= 16;

  // Final disclaimer
  needSpace(55);
  currentPage.drawRectangle({ x: MARGIN, y: y - 45, width: CONTENT_W, height: 42, color: rgb(0.98, 0.99, 0.96) });
  y -= 6;
  currentPage.drawText(L.wellnessDisclaimer.toUpperCase(), { x: MARGIN + 8, y, size: 8, font: fontBold, color: C.textMuted });
  y -= 12;
  y = drawWrapped(content.disclaimer, MARGIN + 8, y, CONTENT_W - 16, 7, fontOblique, C.textMuted);
  y -= 12;

  // Final footer
  addPageFooter();

  // Serialize
  const pdfBytes = await pdfDoc.save();
  const fileName = generateFileName(content);

  return { pdfBuffer: pdfBytes.buffer as ArrayBuffer, fileName };
}

/**
 * Generate deterministic file name
 */
function generateFileName(content: ReportContent): string {
  const typeLabel = content.reportType === 'weekly' ? 'weekly' : content.reportType === 'monthly' ? 'monthly' : 'custom';
  const date = new Date(content.generatedAt).toISOString().split('T')[0];
  return `aivo-health-report-${typeLabel}-${content.periodStart}-to-${content.periodEnd}-${date}.pdf`;
}

/**
 * Generate deterministic recommendations
 */
function generateRecommendations(
  data: ReportAggregatedData,
  labels: typeof LABELS.en,
  locale: SupportedLocale
): string[] {
  const recs: string[] = [];

  if (data.readiness.dataAvailable && data.readiness.averageScore !== null) {
    if (data.readiness.averageScore < 60) {
      recs.push(locale === 'vi'
        ? 'Tập trung vào chất lượng giấc ngủ và các hoạt động phục hồi để cải thiện mức sẵn sàng.'
        : 'Focus on sleep quality and recovery activities to improve your readiness.');
    } else if (data.readiness.averageScore >= 80) {
      recs.push(locale === 'vi'
        ? 'Mức sẵn sàng của bạn tốt. Cân nhắc duy trì hoặc tăng dần cường độ tập luyện.'
        : 'Your readiness is strong. Consider maintaining or gradually increasing training intensity.');
    }
  }

  if (data.nutrition.dataAvailable && data.nutrition.protein.adherence !== null && data.nutrition.protein.adherence < 70) {
    recs.push(locale === 'vi'
      ? 'Tăng lượng protein hàng ngày để đạt mục tiêu. Thử bổ sung protein sau buổi tập.'
      : 'Increase daily protein intake to meet your target. Try adding protein after workouts.');
  }

  if (data.hydration.dataAvailable && data.hydration.adherence !== null && data.hydration.adherence < 70) {
    recs.push(locale === 'vi'
      ? 'Uống nhiều nước hơn trong ngày. Đặt nhắc nhở mỗi giờ để uống nước.'
      : 'Drink more water throughout the day. Set hourly reminders to stay hydrated.');
  }

  if (data.fitness.dataAvailable) {
    const rate = data.fitness.plannedWorkouts > 0
      ? data.fitness.completedWorkouts / data.fitness.plannedWorkouts : 1;
    if (rate < 0.7) {
      recs.push(locale === 'vi'
        ? 'Ưu tiên hoàn thành các bài tập đã lên kế hoạch trong tuần này.'
        : 'Prioritize completing your planned workouts this week.');
    }
    if (data.fitness.formQualityTrend === 'declining') {
      recs.push(locale === 'vi'
        ? 'Tập trung vào chất lượng thực hiện động tác thay vì số lượng bài tập.'
        : 'Focus on exercise form quality over quantity in your training.');
    }
  }

  if (data.activity.dataAvailable && data.activity.trends.steps === 'declining') {
    recs.push(locale === 'vi'
      ? 'Tăng số bước đi hàng ngày với các buổi đi bộ ngắn trong ngày.'
      : 'Increase daily step count with short walks throughout the day.');
  }

  if (recs.length === 0) {
    recs.push(locale === 'vi'
      ? 'Tiếp tục duy trì các thói quen lành mạnh hiện tại và theo dõi tiến độ hàng ngày.'
      : 'Continue maintaining your current healthy habits and track progress daily.');
  }

  return recs.slice(0, 5);
}
