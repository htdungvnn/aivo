/**
 * AI Provider Instrumentation
 * 
 * Instruments AI provider calls with:
 * - Request/response tracking
 * - Token usage monitoring
 * - Cost estimation
 * - Safety and validation tracking
 * - Error classification
 */

import { createServiceLogger, type Logger } from '../logger.js';
import type { ServiceContext, NormalizedError, AiTokenUsage } from '../types.js';
import { createNormalizedError, ERROR_CODES } from '../errors.js';
import { METRIC_PREFIXES } from '../metrics.js';

// =============================================================================
// AI Metrics
// =============================================================================

const metrics = {
  requestCount: new Map<string, number>(),
  requestDuration: new Map<string, number[]>(),
  requestFailures: new Map<string, number>(),
  validationFailures: new Map<string, number>(),
  safetyRejections: new Map<string, number>(),
  tokenUsage: new Map<string, AiTokenUsage>(),
  estimatedCosts: new Map<string, number>(),
};

/**
 * Record AI request duration.
 */
function recordRequestDuration(provider: string, model: string, durationMs: number): void {
  const key = `${provider}:${model}`;
  const values = metrics.requestDuration.get(key) || [];
  values.push(durationMs);
  if (values.length > 100) values.shift();
  metrics.requestDuration.set(key, values);
}

/**
 * Record AI request failure.
 */
function recordRequestFailure(provider: string, model: string): void {
  const key = `${provider}:${model}`;
  metrics.requestFailures.set(key, (metrics.requestFailures.get(key) || 0) + 1);
}

/**
 * Record AI validation failure.
 */
function recordValidationFailure(provider: string, model: string): void {
  const key = `${provider}:${model}`;
  metrics.validationFailures.set(key, (metrics.validationFailures.get(key) || 0) + 1);
}

/**
 * Record AI safety rejection.
 */
function recordSafetyRejection(provider: string, model: string): void {
  const key = `${provider}:${model}`;
  metrics.safetyRejections.set(key, (metrics.safetyRejections.get(key) || 0) + 1);
}

/**
 * Get AI metrics summary.
 */
export function getAiMetrics(): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  
  // Request counts
  for (const [key, count] of metrics.requestCount) {
    summary[`ai_${key}_requests`] = count;
  }
  
  // Request durations
  for (const [key, values] of metrics.requestDuration) {
    if (values.length === 0) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    summary[`ai_${key}_avg_duration_ms`] = avg;
  }
  
  // Failures
  for (const [key, count] of metrics.requestFailures) {
    summary[`ai_${key}_failures`] = count;
  }
  
  // Validation failures
  for (const [key, count] of metrics.validationFailures) {
    summary[`ai_${key}_validation_failures`] = count;
  }
  
  // Safety rejections
  for (const [key, count] of metrics.safetyRejections) {
    summary[`ai_${key}_safety_rejections`] = count;
  }
  
  // Token usage
  for (const [key, usage] of metrics.tokenUsage) {
    summary[`ai_${key}_prompt_tokens`] = usage.promptTokens;
    summary[`ai_${key}_completion_tokens`] = usage.completionTokens;
    summary[`ai_${key}_total_tokens`] = usage.totalTokens;
  }
  
  // Estimated costs
  for (const [key, cost] of metrics.estimatedCosts) {
    summary[`ai_${key}_estimated_cost_usd`] = cost;
  }
  
  return summary;
}

/**
 * Reset AI metrics.
 */
export function resetAiMetrics(): void {
  metrics.requestCount.clear();
  metrics.requestDuration.clear();
  metrics.requestFailures.clear();
  metrics.validationFailures.clear();
  metrics.safetyRejections.clear();
  metrics.tokenUsage.clear();
  metrics.estimatedCosts.clear();
}

// =============================================================================
// Cost Estimation
// =============================================================================

interface ModelPricing {
  inputCostPer1M: number;
  outputCostPer1M: number;
}

/**
 * AI model pricing (approximate, in USD per 1M tokens).
 * Should be updated with actual pricing from providers.
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { inputCostPer1M: 5.0, outputCostPer1M: 15.0 },
  'gpt-4o-mini': { inputCostPer1M: 0.15, outputCostPer1M: 0.6 },
  'gpt-4-turbo': { inputCostPer1M: 10.0, outputCostPer1M: 30.0 },
  'gpt-3.5-turbo': { inputCostPer1M: 0.5, outputCostPer1M: 1.5 },
  
  // Anthropic
  'claude-3-opus': { inputCostPer1M: 15.0, outputCostPer1M: 75.0 },
  'claude-3-sonnet': { inputCostPer1M: 3.0, outputCostPer1M: 15.0 },
  'claude-3-haiku': { inputCostPer1M: 0.25, outputCostPer1M: 1.25 },
  
  // Google
  'gemini-1.5-pro': { inputCostPer1M: 3.5, outputCostPer1M: 10.5 },
  'gemini-1.5-flash': { inputCostPer1M: 0.075, outputCostPer1M: 0.3 },
};

/**
 * Estimate cost for a request.
 */
export function estimateCost(model: string, tokenUsage: AiTokenUsage): number {
  const pricing = MODEL_PRICING[model.toLowerCase()];
  
  if (!pricing) {
    // Unknown model, return rough estimate
    return (tokenUsage.promptTokens * 1 + tokenUsage.completionTokens * 3) / 1_000_000;
  }
  
  return (
    (tokenUsage.promptTokens * pricing.inputCostPer1M +
      tokenUsage.completionTokens * pricing.outputCostPer1M) /
    1_000_000
  );
}

// =============================================================================
// AI Instrumentation
// =============================================================================

export interface AiInstrumentationOptions {
  serviceContext: ServiceContext;
  logger?: Logger;
  providerName: string;
  /** Privacy-safe flag for logging */
  logPrompts?: boolean;
  /** Privacy-safe flag for logging responses */
  logResponses?: boolean;
}

/**
 * Create AI instrumentation.
 */
export function createAiInstrumentation(
  options: AiInstrumentationOptions
): {
  recordRequest: (
    model: string,
    promptVersion: string,
    success: boolean,
    durationMs: number,
    tokenUsage?: AiTokenUsage,
    error?: NormalizedError
  ) => void;
  recordValidation: (model: string, passed: boolean, failureReason?: string) => void;
  recordSafety: (model: string, rejected: boolean, rejectionReason?: string) => void;
  wrapAiCall: <T extends unknown[], R>(
    model: string,
    promptVersion: string,
    callFn: (...args: T) => Promise<R>
  ) => (...args: T) => Promise<R>;
  getMetrics: () => Record<string, unknown>;
} {
  const logger = options.logger || createServiceLogger(options.serviceContext.service);
  
  return {
    /**
     * Record AI request.
     */
    recordRequest(
      model: string,
      promptVersion: string,
      success: boolean,
      durationMs: number,
      tokenUsage?: AiTokenUsage,
      error?: NormalizedError
    ): void {
      const key = `${options.providerName}:${model}`;
      
      // Update metrics
      metrics.requestCount.set(key, (metrics.requestCount.get(key) || 0) + 1);
      recordRequestDuration(options.providerName, model, durationMs);
      
      if (!success) {
        recordRequestFailure(options.providerName, model);
      }
      
      if (tokenUsage) {
        metrics.tokenUsage.set(key, tokenUsage);
        
        const estimatedCost = estimateCost(model, tokenUsage);
        const currentCost = metrics.estimatedCosts.get(key) || 0;
        metrics.estimatedCosts.set(key, currentCost + estimatedCost);
      }
      
      // Log (never log full prompts or responses)
      const logData: Record<string, unknown> = {
        operation: 'ai_request',
        provider: options.providerName,
        model,
        promptVersion,
        durationMs,
        success,
        ...(tokenUsage && {
          promptTokens: tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens,
          totalTokens: tokenUsage.totalTokens,
        }),
        ...(error && {
          errorCode: error.code,
          category: error.category,
        }),
      };
      
      if (success) {
        logger.info(`AI request completed`, logData);
      } else {
        logger.error(`AI request failed`, undefined, logData);
      }
    },
    
    /**
     * Record validation result.
     */
    recordValidation(
      model: string,
      passed: boolean,
      failureReason?: string
    ): void {
      if (!passed) {
        recordValidationFailure(options.providerName, model);
      }
      
      logger.info(`AI response validation ${passed ? 'passed' : 'failed'}`, {
        operation: 'ai_validation',
        provider: options.providerName,
        model,
        passed,
        ...(failureReason && { failureReason }),
      });
    },
    
    /**
     * Record safety check result.
     */
    recordSafety(
      model: string,
      rejected: boolean,
      rejectionReason?: string
    ): void {
      if (rejected) {
        recordSafetyRejection(options.providerName, model);
      }
      
      if (rejected) {
        logger.warn(`AI safety rejection`, {
          operation: 'ai_safety_rejection',
          provider: options.providerName,
          model,
          rejectionReason,
        });
      }
    },
    
    /**
     * Wrap an AI call function with instrumentation.
     */
    wrapAiCall<T extends unknown[], R>(
      model: string,
      promptVersion: string,
      callFn: (...args: T) => Promise<R>
    ): (...args: T) => Promise<R> {
      return async function (...args: T): Promise<R> {
        const startTime = Date.now();
        
        try {
          const result = await callFn(...args);
          const durationMs = Date.now() - startTime;
          
          // Try to extract token usage from result
          const tokenUsage = extractTokenUsage(result);
          
          this.recordRequest(model, promptVersion, true, durationMs, tokenUsage);
          
          return result;
        } catch (error) {
          const durationMs = Date.now() - startTime;
          
          const normalizedError = createNormalizedError(
            error,
            ERROR_CODES.AI_PROVIDER_ERROR
          );
          
          this.recordRequest(model, promptVersion, false, durationMs, undefined, normalizedError);
          
          throw error;
        }
      }.bind(this);
    },
    
    /**
     * Get metrics summary.
     */
    getMetrics(): Record<string, unknown> {
      return getAiMetrics();
    },
  };
}

/**
 * Extract token usage from AI response.
 */
function extractTokenUsage(response: unknown): AiTokenUsage | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }
  
  const resp = response as Record<string, unknown>;
  
  // Common patterns across providers
  const usage = resp.usage || resp.usage_metadata || resp.tokens || {};
  const usageObj = usage as Record<string, unknown>;
  
  if (
    typeof usageObj.prompt_tokens === 'number' ||
    typeof usageObj.completion_tokens === 'number' ||
    typeof usageObj.total_tokens === 'number'
  ) {
    return {
      promptTokens: (usageObj.prompt_tokens as number) || 0,
      completionTokens: (usageObj.completion_tokens as number) || 0,
      totalTokens: (usageObj.total_tokens as number) || 0,
    };
  }
  
  return undefined;
}

// =============================================================================
// Safety and Content Classification
// =============================================================================

export interface SafetyCheckResult {
  passed: boolean;
  categories: Record<string, number>;
  rejected: boolean;
  reason?: string;
}

/**
 * Create a safety check wrapper.
 */
export function createSafetyCheck(
  instrumentation: ReturnType<typeof createAiInstrumentation>,
  model: string
): {
  check: (content: unknown) => Promise<SafetyCheckResult>;
  wrapContent: <T>(content: T, fn: (checked: T) => Promise<unknown>) => Promise<unknown>;
} {
  return {
    /**
     * Perform safety check on content.
     */
    async check(content: unknown): Promise<SafetyCheckResult> {
      // This is a placeholder for actual safety checking
      // In production, this would call a content safety API
      
      const result: SafetyCheckResult = {
        passed: true,
        categories: {},
        rejected: false,
      };
      
      // Record result
      instrumentation.recordSafety(model, result.rejected, result.reason);
      
      return result;
    },
    
    /**
     * Wrap content processing with safety checks.
     */
    async wrapContent<T>(
      content: T,
      fn: (checked: T) => Promise<unknown>
    ): Promise<unknown> {
      const safetyResult = await this.check(content);
      
      if (!safetyResult.passed) {
        throw new Error(`Content failed safety check: ${safetyResult.reason}`);
      }
      
      return fn(content);
    },
  };
}
