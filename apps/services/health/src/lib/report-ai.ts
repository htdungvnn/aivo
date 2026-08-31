/**
 * Health Report AI Summary Generation
 * Generates optional AI-powered summaries for health reports
 * 
 * Features:
 * - Versioned prompts
 * - Structured output validation
 * - Caching by report job
 * - Graceful fallback
 */

import type { HealthEnv } from '../types/env.js';
import type { SupportedLocale, ReportType } from '@repo/report-types';
import type { ReportAggregatedData } from './report-aggregation.js';

// =============================================================================
// Types
// =============================================================================

export interface AISummaryResult {
  summary: string;
  confidence: number;
}

interface AIGenerateSummaryParams {
  userId: string;
  aggregatedData: ReportAggregatedData;
  reportType: ReportType;
  locale: SupportedLocale;
}

// =============================================================================
// AI Prompt Templates
// =============================================================================

const AI_PROMPTS = {
  en: {
    system: `You are a wellness assistant generating health report summaries.
You must respond ONLY with valid JSON in this exact format:
{"summary": "your 2-3 sentence summary", "confidence": 0.0-1.0}

Rules:
- Summary should be friendly and encouraging
- Focus on positive trends and improvements
- Mention specific metrics when available
- Do NOT diagnose conditions or recommend treatments
- Do NOT invent missing data
- If data is limited, express it positively
- Always suggest general wellness tips only`,
    user: `Generate a summary for a {reportType} health report.
Available data:
{summaryData}
Locale: {locale}`,
  },
  vi: {
    system: `Bạn là trợ lý sức khỏe tạo tóm tắt báo cáo sức khỏe.
Bạn phải trả lời CHỈ với JSON hợp lệ theo định dạng chính xác này:
{"summary": "tóm tắt 2-3 câu của bạn", "confidence": 0.0-1.0}

Quy tắc:
- Tóm tắt nên thân thiện và động viên
- Tập trung vào xu hướng tích cực và cải thiện
- Đề cập các chỉ số cụ thể khi có
- KHÔNG chẩn đoán tình trạng hoặc khuyến nghị điều trị
- KHÔNG tạo dữ liệu thiếu
- Nếu dữ liệu hạn chế, hãy thể hiện tích cực
- Luôn đề xuất mẹo sức khỏe chung`,
    user: `Tạo tóm tắt cho báo cáo sức khỏe {reportType}.
Dữ liệu có sẵn:
{summaryData}
Ngôn ngữ: {locale}`,
  },
};

/**
 * AI Model configuration
 */
const AI_CONFIG = {
  model: '@cf/meta/llama-3.1-8b-instruct',
  maxTokens: 256,
  temperature: 0.7,
};

// =============================================================================
// Main AI Summary Generation
// =============================================================================

/**
 * Generate AI summary for a report
 */
export async function generateAIReportSummary(
  env: HealthEnv,
  params: AIGenerateSummaryParams
): Promise<AISummaryResult> {
  const { aggregatedData, reportType, locale } = params;
  
  // Build summary data
  const summaryData = buildSummaryData(aggregatedData);
  
  // Get prompt
  const prompts = AI_PROMPTS[locale] || AI_PROMPTS.en;
  const reportTypeLabel = reportType === 'weekly' ? 'weekly' 
    : reportType === 'monthly' ? 'monthly' 
    : 'custom';
  
  // Construct prompt
  const userPrompt = prompts.user
    .replace('{reportType}', reportTypeLabel)
    .replace('{summaryData}', summaryData)
    .replace('{locale}', locale);
  
  try {
    // Call AI
    const response = await env.AI_GATEWAY.run(
      AI_CONFIG.model,
      {
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
      }
    );
    
    // Parse response
    const result = parseAIResponse(response);
    
    if (result) {
      return result;
    }
    
    // Fallback if parsing fails
    return generateFallbackSummary(aggregatedData, locale);
    
  } catch (error) {
    console.error('[AI Summary] Generation failed:', error);
    return generateFallbackSummary(aggregatedData, locale);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build summary data string from aggregated data
 */
function buildSummaryData(data: ReportAggregatedData): string {
  const parts: string[] = [];
  
  // Readiness
  if (data.readiness.dataAvailable) {
    parts.push(`Readiness: Average ${data.readiness.averageScore}/100, Trend: ${data.readiness.trend || 'unknown'}`);
  }
  
  // Sleep
  if (data.sleep.dataAvailable && data.sleep.averageDuration !== null) {
    parts.push(`Sleep: Average ${data.sleep.averageDuration.toFixed(1)} hours, Adherence: ${data.sleep.targetAdherence || 0}%`);
  }
  
  // Nutrition
  if (data.nutrition.dataAvailable) {
    parts.push(`Nutrition: Calories ${data.nutrition.averageCalories || 0} kcal, Protein adherence: ${data.nutrition.protein.adherence || 0}%`);
  }
  
  // Hydration
  if (data.hydration.dataAvailable && data.hydration.averageMl !== null) {
    parts.push(`Hydration: Average ${Math.round(data.hydration.averageMl)} ml, Adherence: ${data.hydration.adherence || 0}%`);
  }
  
  // Fitness
  if (data.fitness.dataAvailable) {
    parts.push(`Fitness: ${data.fitness.completedWorkouts} workouts completed, Avg duration: ${data.fitness.workoutDuration.average || 0} minutes`);
  }
  
  // Activity
  if (data.activity.dataAvailable && data.activity.averageSteps !== null) {
    parts.push(`Activity: ${Math.round(data.activity.averageSteps).toLocaleString()} steps average, ${data.activity.activeDays} active days`);
  }
  
  // Overall data availability
  parts.push(`Data completeness: ${data.dataCompleteness}`);
  
  return parts.join('\n');
}

/**
 * Parse AI response and validate
 */
function parseAIResponse(response: unknown): AISummaryResult | null {
  try {
    // Extract content from AI response
    let content: string;
    
    if (typeof response === 'object' && response !== null) {
      const resp = response as Record<string, unknown>;
      if (typeof resp.response === 'string') {
        content = resp.response;
      } else if (Array.isArray(resp.messages)) {
        const messages = resp.messages as Array<Record<string, unknown>>;
        const lastMessage = messages[messages.length - 1];
        if (typeof lastMessage?.content === 'string') {
          content = lastMessage.content;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
    
    // Try to parse JSON from content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[AI Summary] No JSON found in response');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (typeof parsed.summary !== 'string' || typeof parsed.confidence !== 'number') {
      console.warn('[AI Summary] Invalid JSON structure');
      return null;
    }
    
    // Validate confidence range
    const confidence = Math.max(0, Math.min(1, parsed.confidence));
    
    return {
      summary: parsed.summary,
      confidence,
    };
    
  } catch (error) {
    console.error('[AI Summary] Parse error:', error);
    return null;
  }
}

/**
 * Generate fallback summary when AI fails
 */
function generateFallbackSummary(
  data: ReportAggregatedData,
  locale: SupportedLocale
): AISummaryResult {
  const summaries = {
    en: {
      full: 'This week showed consistent health tracking across multiple areas. Your data shows good engagement with the AIVO wellness system.',
      partial: 'Your health report is ready with available data. Keep tracking your health metrics for more comprehensive insights.',
      minimal: 'Your health report has been generated. Start tracking your health daily for richer insights and trends.',
    },
    vi: {
      full: 'Tuần này cho thấy theo dõi sức khỏe nhất quán trên nhiều lĩnh vực. Dữ liệu của bạn cho thấy sự tham gia tốt với hệ thống sức khỏe AIVO.',
      partial: 'Báo cáo sức khỏe của bạn đã sẵn sàng với dữ liệu hiện có. Tiếp tục theo dõi các chỉ số sức khỏe của bạn để có thêm thông tin chi tiết toàn diện.',
      minimal: 'Báo cáo sức khỏe của bạn đã được tạo. Bắt đầu theo dõi sức khỏe hàng ngày để có thông tin chi tiết phong phú hơn.',
    },
  };
  
  const localeSummaries = summaries[locale] || summaries.en;
  const summary = localeSummaries[data.dataCompleteness] || localeSummaries.partial;
  
  return {
    summary,
    confidence: 0.5, // Lower confidence for fallback
  };
}
