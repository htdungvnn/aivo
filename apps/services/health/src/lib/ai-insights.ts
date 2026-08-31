/**
 * AI Insights Module
 * Optional AI-generated insights with validation and caching
 * 
 * IMPORTANT: AI is optional and must never:
 * - Change the readiness score
 * - Directly update D1
 * - Diagnose a condition
 * - Recommend medication
 * - Claim causation from correlation
 * - Override safety limits
 */

import { z } from 'zod';
import {
  HEALTH_ALGORITHM_VERSION,
  PRIVACY_NOTICE,
  roundTo,
} from '@repo/health-types';

// =============================================================================
// Types
// =============================================================================

/**
 * AI insight types
 */
export const INSIGHT_TYPES = {
  READINESS_EXPLANATION: 'readiness_explanation',
  WEEKLY_TREND: 'weekly_trend',
  ACTION_SUGGESTION: 'action_suggestion',
  FACTOR_HIGHLIGHT: 'factor_highlight',
} as const;

export type InsightType = (typeof INSIGHT_TYPES)[keyof typeof INSIGHT_TYPES];

/**
 * AI prompt versions for caching
 */
export const PROMPT_VERSIONS = {
  READINESS_EXPLANATION: '1.0.0',
  WEEKLY_TREND: '1.0.0',
  ACTION_SUGGESTION: '1.0.0',
} as const;

/**
 * Cached AI insight
 */
export interface AIInsight {
  id: string;
  type: InsightType;
  text: string;
  confidence: number;
  generatedAt: number;
  promptVersion: string;
  model?: string;
}

/**
 * Insight generation context
 */
export interface InsightContext {
  userId: string;
  date: string;
  readinessScore: number;
  readinessLevel: string;
  confidence: number;
  factors: {
    code: string;
    score: number;
    status: string;
    messageKey: string;
  }[];
  recommendation: {
    action: string;
    intensityModifier: number;
    volumeModifier: number;
  };
  weeklyTrend?: {
    readinessChange: number;
    sleepChange: number;
    energyChange: number;
  };
  locale?: 'en' | 'vi';
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * AI insight response schema
 */
export const AIInsightResponseSchema = z.object({
  insight: z.string().max(500),
  confidence: z.number().min(0).max(1),
});

/**
 * Readiness explanation schema
 */
export const ReadinessExplanationSchema = z.object({
  summary: z.string().max(200),
  highlights: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['positive', 'negative', 'neutral']),
    description: z.string().max(100),
  })).max(5),
  tip: z.string().max(200).optional(),
});

/**
 * Weekly trend schema
 */
export const WeeklyTrendSchema = z.object({
  summary: z.string().max(300),
  improvements: z.array(z.string().max(100)).max(3),
  concerns: z.array(z.string().max(100)).max(3),
  outlook: z.enum(['positive', 'neutral', 'negative']),
});

/**
 * Action suggestion schema
 */
export const ActionSuggestionSchema = z.object({
  friendlyText: z.string().max(300),
  encouragement: z.string().max(100).optional(),
  note: z.string().max(200).optional(),
});

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate AI insight response
 */
export function validateInsightResponse(
  response: unknown
): { valid: boolean; insight?: string; confidence?: number; errors?: string[] } {
  const result = AIInsightResponseSchema.safeParse(response);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
  
  return {
    valid: true,
    insight: result.data.insight,
    confidence: result.data.confidence,
  };
}

/**
 * Validate readiness explanation
 */
export function validateReadinessExplanation(
  response: unknown
): { valid: boolean; data?: z.infer<typeof ReadinessExplanationSchema>; errors?: string[] } {
  const result = ReadinessExplanationSchema.safeParse(response);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
  
  return { valid: true, data: result.data };
}

/**
 * Validate weekly trend
 */
export function validateWeeklyTrend(
  response: unknown
): { valid: boolean; data?: z.infer<typeof WeeklyTrendSchema>; errors?: string[] } {
  const result = WeeklyTrendSchema.safeParse(response);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
  
  return { valid: true, data: result.data };
}

// =============================================================================
// Prompt Templates
// =============================================================================

/**
 * System prompt for health insights
 */
const SYSTEM_PROMPT = `You are AIVO's health assistant. Generate friendly, helpful insights about the user's daily readiness and health.

RULES:
- Keep insights under 500 characters
- Be encouraging and positive
- Never diagnose conditions
- Never recommend medication
- Never claim causation from correlation
- Focus on actionable, general wellness tips
- Always include the disclaimer: "${PRIVACY_NOTICE.en}"

Your insights should be:
1. Based ONLY on the provided data
2. Easy to understand for general users
3. Focused on the most important factors
4. Actionable where possible`;

/**
 * Readiness explanation prompt
 */
function buildReadinessPrompt(context: InsightContext): string {
  const { readinessScore, readinessLevel, factors } = context;
  
  const topPositive = factors
    .filter(f => f.status === 'positive')
    .slice(0, 2)
    .map(f => f.code)
    .join(', ');
  
  const topNegative = factors
    .filter(f => f.status === 'negative')
    .slice(0, 2)
    .map(f => f.code)
    .join(', ');
  
  return `${SYSTEM_PROMPT}

Generate a brief, friendly explanation of today's readiness score (${readinessScore}/100, ${readinessLevel}).

Positive factors: ${topPositive || 'none significant'}
Negative factors: ${topNegative || 'none significant'}

Respond with JSON:
{
  "insight": "your friendly explanation",
  "confidence": 0.0-1.0
}`;
}

/**
 * Weekly trend prompt
 */
function buildWeeklyTrendPrompt(context: InsightContext): string {
  const { weeklyTrend, readinessScore } = context;
  
  if (!weeklyTrend) {
    return `${SYSTEM_PROMPT}

Generate a brief summary of this week's readiness trend.

Current average readiness: ${readinessScore}/100

Respond with JSON:
{
  "insight": "your weekly summary",
  "confidence": 0.0-1.0
}`;
  }
  
  return `${SYSTEM_PROMPT}

Generate a brief summary of this week's health trends.

Readiness change: ${weeklyTrend.readinessChange > 0 ? '+' : ''}${roundTo(weeklyTrend.readinessChange, 1)}%
Sleep change: ${weeklyTrend.sleepChange > 0 ? '+' : ''}${roundTo(weeklyTrend.sleepChange, 1)}%
Energy change: ${weeklyTrend.energyChange > 0 ? '+' : ''}${roundTo(weeklyTrend.energyChange, 1)}%

Respond with JSON:
{
  "insight": "your weekly summary",
  "confidence": 0.0-1.0
}`;
}

/**
 * Action suggestion prompt
 */
function buildActionPrompt(context: InsightContext): string {
  const { recommendation, readinessScore } = context;
  
  const actionDescriptions: Record<string, string> = {
    rest: 'taking a rest day',
    recovery: 'focusing on recovery',
    light_training: 'doing light training',
    normal_training: 'following your normal workout',
    high_intensity: 'pushing with high intensity',
  };
  
  return `${SYSTEM_PROMPT}

Generate a friendly, encouraging message about today's recommended activity.

Your readiness suggests ${actionDescriptions[recommendation.action] || 'your planned activity'} today.

Be encouraging and motivating. Keep it short and positive.

Respond with JSON:
{
  "insight": "your friendly message",
  "confidence": 0.0-1.0
}`;
}

// =============================================================================
// AI Calls (requires AI_GATEWAY binding)
// =============================================================================

/**
 * Call AI for insight (requires AI binding)
 */
export async function generateInsight(
  aiBinding: Ai | undefined,
  type: InsightType,
  context: InsightContext,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<AIInsight | null> {
  // If AI is not available, return null (optional feature)
  if (!aiBinding) {
    console.log('AI not available, skipping insight generation');
    return null;
  }
  
  try {
    let prompt: string;
    let promptVersion: string;
    
    switch (type) {
      case INSIGHT_TYPES.READINESS_EXPLANATION:
        prompt = buildReadinessPrompt(context);
        promptVersion = PROMPT_VERSIONS.READINESS_EXPLANATION;
        break;
      
      case INSIGHT_TYPES.WEEKLY_TREND:
        prompt = buildWeeklyTrendPrompt(context);
        promptVersion = PROMPT_VERSIONS.WEEKLY_TREND;
        break;
      
      case INSIGHT_TYPES.ACTION_SUGGESTION:
        prompt = buildActionPrompt(context);
        promptVersion = PROMPT_VERSIONS.ACTION_SUGGESTION;
        break;
      
      default:
        return null;
    }
    
    const model = options?.model ?? '@cf/meta/llama-3.1-8b-instruct';
    const maxTokens = options?.maxTokens ?? 256;
    const temperature = options?.temperature ?? 0.7;
    
    // Call AI
    const response = await aiBinding.run(model, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });
    
    // Parse response
    const responseText = response.response?.trim();
    if (!responseText) {
      console.error('Empty AI response');
      return null;
    }
    
    // Try to parse JSON from response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const validation = validateInsightResponse(parsed);
    
    if (!validation.valid || !validation.insight) {
      console.error('Invalid AI response format', validation.errors);
      return null;
    }
    
    return {
      id: crypto.randomUUID(),
      type,
      text: validation.insight,
      confidence: validation.confidence ?? 0.5,
      generatedAt: Date.now(),
      promptVersion,
      model,
    };
  } catch (error) {
    console.error('AI insight generation failed:', error);
    return null;
  }
}

/**
 * Generate multiple insights
 */
export async function generateInsights(
  aiBinding: Ai | undefined,
  context: InsightContext,
  options?: {
    types?: InsightType[];
    model?: string;
  }
): Promise<AIInsight[]> {
  const types = options?.types ?? [
    INSIGHT_TYPES.READINESS_EXPLANATION,
    INSIGHT_TYPES.ACTION_SUGGESTION,
  ];
  
  const insights: AIInsight[] = [];
  
  for (const type of types) {
    const insight = await generateInsight(aiBinding, type, context, {
      model: options?.model,
    });
    
    if (insight) {
      insights.push(insight);
    }
  }
  
  return insights;
}

// =============================================================================
// Fallback Messages
// =============================================================================

/**
 * Deterministic fallback messages (no AI required)
 */
export const FALLBACK_MESSAGES: Record<string, Record<string, string>> = {
  readiness: {
    low: "Today might be a good day for rest. Listen to your body.",
    moderate: "A moderate day ahead. Consider lighter activities.",
    good: "You're feeling good! Great day for your regular routine.",
    high: "You're feeling great! Your body is ready for a challenge.",
  },
  action: {
    rest: "Take it easy today. Rest is part of training.",
    recovery: "Focus on recovery activities like stretching or light movement.",
    light_training: "A light workout would be perfect today.",
    normal_training: "You're ready for your normal training routine.",
    high_intensity: "Great day to push yourself! Stay mindful of form.",
  },
  weekly: {
    improving: "Great progress this week! Keep up the good work.",
    stable: "You've maintained consistency this week.",
    declining: "This week has been challenging. Focus on recovery.",
  },
};

/**
 * Get deterministic fallback message
 */
export function getFallbackMessage(
  category: keyof typeof FALLBACK_MESSAGES,
  key: string
): string {
  return FALLBACK_MESSAGES[category]?.[key] ?? FALLBACK_MESSAGES.readiness.good;
}

// =============================================================================
// Caching
// =============================================================================

/**
 * Check if cached insight is valid
 */
export function isCacheValid(
  cached: AIInsight,
  promptVersion: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours
): boolean {
  const now = Date.now();
  return (
    cached.promptVersion === promptVersion &&
    now - cached.generatedAt < maxAgeMs
  );
}

/**
 * Generate cache key
 */
export function generateCacheKey(
  snapshotId: string,
  insightType: InsightType
): string {
  return `ai_insight:${snapshotId}:${insightType}`;
}
