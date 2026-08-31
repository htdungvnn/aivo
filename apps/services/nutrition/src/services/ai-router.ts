/**
 * AI Model Routing Service
 * Handles model selection, cost optimization, and fallback logic
 */

import type { AIModel } from '@aivo/nutrition-types';

export interface AIModelConfig {
  modelId: AIModel;
  maxTokens: number;
  inputImageMaxDimension: number;
  estimatedCostPerCall: number;
  confidenceThreshold: number;
  fallbackModels: AIModel[];
}

export interface AIRoutingDecision {
  selectedModel: AIModel;
  reason: string;
  estimatedCost: number;
  canEscalate: boolean;
}

export interface AICallResult {
  success: boolean;
  model: AIModel;
  latencyMs: number;
  imageSize: number;
  outputTokens: number;
  estimatedCost: number;
  confidence: number;
  validationPassed: boolean;
  errorMessage: string | null;
}

/**
 * AI Model Router
 */
export class AIModelRouter {
  private models: Map<AIModel, AIModelConfig>;
  private usageLimits: {
    dailyLimit: number;
    hourlyLimit: number;
    dailyUsed: number;
    hourlyUsed: number;
  };
  private featureKillSwitch: boolean;
  
  constructor(options: {
    dailyLimit?: number;
    hourlyLimit?: number;
    killSwitch?: boolean;
  } = {}) {
    this.models = new Map();
    this.usageLimits = {
      dailyLimit: options.dailyLimit ?? 50,
      hourlyLimit: options.hourlyLimit ?? 10,
      dailyUsed: 0,
      hourlyUsed: 0,
    };
    this.featureKillSwitch = options.killSwitch ?? false;
    
    // Initialize model configurations
    this.initializeModels();
  }
  
  /**
   * Initialize model configurations
   */
  private initializeModels(): void {
    // Light model - fast, low cost
    this.models.set('@cf/unum/uform-gen2-qwen-500m', {
      modelId: '@cf/unum/uform-gen2-qwen-500m',
      maxTokens: 2048,
      inputImageMaxDimension: 512,
      estimatedCostPerCall: 0.001,
      confidenceThreshold: 0.7,
      fallbackModels: ['@cf/unum/uform-gen2-qwen-7b'],
    });
    
    // Standard model - balanced
    this.models.set('@cf/unum/uform-gen2-qwen-7b', {
      modelId: '@cf/unum/uform-gen2-qwen-7b',
      maxTokens: 4096,
      inputImageMaxDimension: 768,
      estimatedCostPerCall: 0.005,
      confidenceThreshold: 0.8,
      fallbackModels: ['@cf/meta/llama-4-vision-beta'],
    });
    
    // Premium model - highest quality
    this.models.set('@cf/meta/llama-4-vision-beta', {
      modelId: '@cf/meta/llama-4-vision-beta',
      maxTokens: 8192,
      inputImageMaxDimension: 1024,
      estimatedCostPerCall: 0.02,
      confidenceThreshold: 0.9,
      fallbackModels: [],
    });
  }
  
  /**
   * Update usage tracking
   */
  updateUsage(dailyUsed: number, hourlyUsed: number): void {
    this.usageLimits.dailyUsed = dailyUsed;
    this.usageLimits.hourlyUsed = hourlyUsed;
  }
  
  /**
   * Set feature kill switch
   */
  setKillSwitch(enabled: boolean): void {
    this.featureKillSwitch = enabled;
  }
  
  /**
   * Check if AI feature is available
   */
  isAvailable(): { available: boolean; reason: string | null } {
    if (this.featureKillSwitch) {
      return { available: false, reason: 'AI feature is temporarily disabled' };
    }
    
    if (this.usageLimits.dailyUsed >= this.usageLimits.dailyLimit) {
      return { available: false, reason: 'Daily AI usage limit reached' };
    }
    
    if (this.usageLimits.hourlyUsed >= this.usageLimits.hourlyLimit) {
      return { available: false, reason: 'Hourly AI usage limit reached' };
    }
    
    return { available: true, reason: null };
  }
  
  /**
   * Select the best model based on context
   */
  selectModel(context: {
    preferredModel?: AIModel;
    imageSize: number;
    previousConfidence?: number;
    previousValidationFailed?: boolean;
    multipleUnclearFoods?: boolean;
    uncertainPortions?: boolean;
  }): AIRoutingDecision {
    const availability = this.isAvailable();
    if (!availability.available) {
      return {
        selectedModel: '@cf/unum/uform-gen2-qwen-500m',
        reason: availability.reason || 'AI unavailable',
        estimatedCost: 0,
        canEscalate: false,
      };
    }
    
    // Use preferred model if specified
    if (context.preferredModel) {
      const modelConfig = this.models.get(context.preferredModel);
      if (modelConfig) {
        return {
          selectedModel: context.preferredModel,
          reason: 'User or system preferred model',
          estimatedCost: modelConfig.estimatedCostPerCall,
          canEscalate: modelConfig.fallbackModels.length > 0,
        };
      }
    }
    
    // Escalate if previous call failed validation
    if (context.previousValidationFailed) {
      const model = this.models.get('@cf/unum/uform-gen2-qwen-7b');
      if (model) {
        return {
          selectedModel: '@cf/unum/uform-gen2-qwen-7b',
          reason: 'Escalating due to previous validation failure',
          estimatedCost: model.estimatedCostPerCall,
          canEscalate: model.fallbackModels.length > 0,
        };
      }
    }
    
    // Escalate if confidence was low
    if (context.previousConfidence !== undefined && context.previousConfidence < 0.7) {
      const model = this.models.get('@cf/unum/uform-gen2-qwen-7b');
      if (model) {
        return {
          selectedModel: '@cf/unum/uform-gen2-qwen-7b',
          reason: `Escalating due to low confidence (${context.previousConfidence.toFixed(2)})`,
          estimatedCost: model.estimatedCostPerCall,
          canEscalate: model.fallbackModels.length > 0,
        };
      }
    }
    
    // Escalate if multiple unclear foods
    if (context.multipleUnclearFoods) {
      const model = this.models.get('@cf/unum/uform-gen2-qwen-7b');
      if (model) {
        return {
          selectedModel: '@cf/unum/uform-gen2-qwen-7b',
          reason: 'Escalating due to multiple unclear foods',
          estimatedCost: model.estimatedCostPerCall,
          canEscalate: model.fallbackModels.length > 0,
        };
      }
    }
    
    // Escalate if portions are uncertain
    if (context.uncertainPortions) {
      const model = this.models.get('@cf/unum/uform-gen2-qwen-7b');
      if (model) {
        return {
          selectedModel: '@cf/unum/uform-gen2-qwen-7b',
          reason: 'Escalating due to uncertain portion sizes',
          estimatedCost: model.estimatedCostPerCall,
          canEscalate: model.fallbackModels.length > 0,
        };
      }
    }
    
    // Default to light model for cost efficiency
    const defaultModel = this.models.get('@cf/unum/uform-gen2-qwen-500m');
    if (defaultModel) {
      return {
        selectedModel: '@cf/unum/uform-gen2-qwen-500m',
        reason: 'Default selection for cost efficiency',
        estimatedCost: defaultModel.estimatedCostPerCall,
        canEscalate: defaultModel.fallbackModels.length > 0,
      };
    }
    
    // Fallback
    return {
      selectedModel: '@cf/unum/uform-gen2-qwen-500m',
      reason: 'Fallback to default model',
      estimatedCost: 0.001,
      canEscalate: true,
    };
  }
  
  /**
   * Get model configuration
   */
  getModelConfig(model: AIModel): AIModelConfig | null {
    return this.models.get(model) || null;
  }
  
  /**
   * Preprocess image for model input
   */
  preprocessImage(imageData: ArrayBuffer, model: AIModel): {
    data: ArrayBuffer;
    originalSize: number;
    newSize: number;
    resized: boolean;
  } {
    const config = this.models.get(model);
    const maxDimension = config?.inputImageMaxDimension ?? 512;
    
    // In production, we'd resize the image here
    // For now, return as-is with metadata
    return {
      data: imageData,
      originalSize: imageData.byteLength,
      newSize: imageData.byteLength,
      resized: false,
    };
  }
  
  /**
   * Estimate cost for a call
   */
  estimateCost(model: AIModel): number {
    const config = this.models.get(model);
    return config?.estimatedCostPerCall ?? 0.001;
  }
  
  /**
   * Record a call result for monitoring
   */
  recordCallResult(result: AICallResult): void {
    // Update usage
    this.usageLimits.dailyUsed++;
    this.usageLimits.hourlyUsed++;
    
    // In production, we'd also:
    // - Log to analytics
    // - Track per-model metrics
    // - Monitor for abuse patterns
  }
}

/**
 * Create a singleton router instance
 */
let routerInstance: AIModelRouter | null = null;

export function getAIRouter(options?: {
  dailyLimit?: number;
  hourlyLimit?: number;
  killSwitch?: boolean;
}): AIModelRouter {
  if (!routerInstance) {
    routerInstance = new AIModelRouter(options);
  }
  return routerInstance;
}

export function resetAIRouter(): void {
  routerInstance = null;
}
