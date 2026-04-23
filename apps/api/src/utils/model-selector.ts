/**
 * AI Model Selector - Intelligent model selection for cost optimization
 * Automatically chooses between OpenAI and Google Gemini based on:
 * - Task complexity requirements
 * - Estimated token usage
 * - Cost efficiency
 * - Quality thresholds
 */

// Model definitions with capabilities and pricing
export interface ModelDefinition {
  id: string;
  provider: 'openai' | 'gemini';
  name: string;
  contextWindow: number;
  inputPricePer1M: number; // USD
  outputPricePer1M: number; // USD
  capabilities: ModelCapabilities;
  qualityScore: number; // 1-10, relative quality rating
  maxOutputTokens: number;
}

export interface ModelCapabilities {
  chat: boolean;
  reasoning: boolean;
  vision: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
  highComplexity: boolean; // for complex analytical tasks
  creative: boolean; // for creative writing
  code: boolean; // for code generation
}

// Task complexity classification
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'expert';

export interface TaskRequirements {
  complexity: TaskComplexity;
  needsVision: boolean;
  needsFunctionCalling: boolean;
  needsJsonMode: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  needsReasoning: boolean;
  needsCode: boolean;
  needsCreative: boolean;
}

// Model selection result
export interface ModelSelection {
  model: ModelDefinition;
  estimatedCost: number;
  confidence: number; // 0-1, confidence in this selection
  reasoning: string[];
  alternatives: ModelDefinition[];
}

// Available models with pricing (as of April 2026)
// Prices are per 1M tokens in USD
export const MODELS: Record<string, ModelDefinition> = {
  // OpenAI Models
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      functionCalling: true,
      jsonMode: true,
      highComplexity: false,
      creative: true,
      code: true,
    },
    qualityScore: 8.5,
    maxOutputTokens: 16384,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    contextWindow: 128000,
    inputPricePer1M: 2.50,
    outputPricePer1M: 10.00,
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      functionCalling: true,
      jsonMode: true,
      highComplexity: true,
      creative: true,
      code: true,
    },
    qualityScore: 9.5,
    maxOutputTokens: 16384,
  },
  'o3-mini': {
    id: 'o3-mini',
    provider: 'openai',
    name: 'O3 Mini',
    contextWindow: 200000,
    inputPricePer1M: 1.10,
    outputPricePer1M: 4.40,
    capabilities: {
      chat: true,
      reasoning: true,
      vision: false,
      functionCalling: true,
      jsonMode: true,
      highComplexity: true,
      creative: false,
      code: true,
    },
    qualityScore: 9.2,
    maxOutputTokens: 100000,
  },
  // Gemini Models
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    provider: 'gemini',
    name: 'Gemini 1.5 Flash',
    contextWindow: 1000000,
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.30,
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      functionCalling: true,
      jsonMode: true,
      highComplexity: false,
      creative: true,
      code: true,
    },
    qualityScore: 8.0,
    maxOutputTokens: 8192,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    provider: 'gemini',
    name: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    inputPricePer1M: 1.25,
    outputPricePer1M: 5.00,
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      functionCalling: true,
      jsonMode: true,
      highComplexity: true,
      creative: true,
      code: true,
    },
    qualityScore: 9.3,
    maxOutputTokens: 8192,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: 'gemini',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1000000,
    inputPricePer1M: 0.10,
    outputPricePer1M: 0.40,
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      functionCalling: true,
      jsonMode: true,
      highComplexity: false,
      creative: true,
      code: true,
    },
    qualityScore: 8.7,
    maxOutputTokens: 8192,
  },
};

/**
 * Analyzes a prompt/task to determine complexity and requirements
 */
export function analyzeTaskRequirements(
  prompt: string,
  options: {
    needsVision?: boolean;
    needsFunctionCalling?: boolean;
    estimatedOutputTokens?: number;
  } = {}
): TaskRequirements {
  const lowerPrompt = prompt.toLowerCase();

  // Estimate token count (rough approximation: ~4 chars per token)
  const estimatedInputTokens = Math.ceil(prompt.length / 4);
  const estimatedOutputTokens = options.estimatedOutputTokens || Math.min(estimatedInputTokens * 1.5, 2000);

  // Determine complexity based on prompt characteristics
  let complexity: TaskComplexity = 'simple';

  // Keywords indicating complexity
  const complexIndicators = [
    'analyze', 'compare', 'evaluate', 'synthesize', 'critique',
    'multi-step', 'step by step', 'detailed', 'comprehensive',
    'reasoning', 'logic', 'proof', 'derive', 'calculate',
    'workout plan', 'nutrition plan', 'fitness program',
  ];

  const expertIndicators = [
    'research', 'academic', 'scientific', 'thesis', 'dissertation',
    'novel', 'innovative', 'breakthrough', 'cutting-edge',
    'statistical analysis', 'machine learning', 'deep learning',
    'architecture', 'system design', 'enterprise',
  ];

  const complexCount = complexIndicators.filter(ind => lowerPrompt.includes(ind)).length;
  const expertCount = expertIndicators.filter(ind => lowerPrompt.includes(ind)).length;

  if (expertCount > 0 || (complexCount >= 3)) {
    complexity = 'expert';
  } else if (complexCount >= 2 || estimatedInputTokens > 2000) {
    complexity = 'complex';
  } else if (complexCount >= 1 || estimatedInputTokens > 500) {
    complexity = 'moderate';
  }

  // Detect if vision is needed
  const needsVision = options.needsVision ??
    (lowerPrompt.includes('image') || lowerPrompt.includes('photo') || lowerPrompt.includes('picture') ||
     lowerPrompt.includes('analyze this') || lowerPrompt.includes('look at'));

  // Detect if function calling might be needed
  const needsFunctionCalling = options.needsFunctionCalling ??
    (lowerPrompt.includes('function') || lowerPrompt.includes('tool') ||
     lowerPrompt.includes('call') || lowerPrompt.includes('api'));

  // Detect if JSON mode is needed
  const needsJsonMode = lowerPrompt.includes('json') || lowerPrompt.includes('structured');

  // Detect if reasoning is needed
  const needsReasoning = complexity !== 'simple' || lowerPrompt.includes('reason') ||
    lowerPrompt.includes('think') || lowerPrompt.includes('why');

  // Detect if code is needed
  const needsCode = lowerPrompt.includes('code') || lowerPrompt.includes('function') ||
    lowerPrompt.includes('program') || lowerPrompt.includes('script') ||
    lowerPrompt.includes('javascript') || lowerPrompt.includes('typescript') ||
    lowerPrompt.includes('python');

  // Detect if creative writing is needed
  const needsCreative = lowerPrompt.includes('write') || lowerPrompt.includes('story') ||
    lowerPrompt.includes('creative') || lowerPrompt.includes('content') ||
    lowerPrompt.includes('blog') || lowerPrompt.includes('article');

  return {
    complexity,
    needsVision,
    needsFunctionCalling,
    needsJsonMode,
    estimatedInputTokens,
    estimatedOutputTokens,
    needsReasoning,
    needsCode,
    needsCreative,
  };
}

/**
 * Filters models based on task requirements
 */
function filterCapableModels(
  requirements: TaskRequirements,
  models: ModelDefinition[]
): ModelDefinition[] {
  return models.filter(model => {
    // Check context window
    if (requirements.estimatedInputTokens + requirements.estimatedOutputTokens > model.contextWindow) {
      return false;
    }

    // Check max output tokens
    if (requirements.estimatedOutputTokens > model.maxOutputTokens) {
      return false;
    }

    // Check required capabilities
    if (requirements.needsVision && !model.capabilities.vision) return false;
    if (requirements.needsFunctionCalling && !model.capabilities.functionCalling) return false;
    if (requirements.needsJsonMode && !model.capabilities.jsonMode) return false;
    if (requirements.needsReasoning && !model.capabilities.reasoning) return false;
    if (requirements.needsCode && !model.capabilities.code) return false;
    if (requirements.needsCreative && !model.capabilities.creative) return false;

    // High complexity tasks need high complexity capable models
    if (requirements.complexity === 'expert' && !model.capabilities.highComplexity) return false;
    if (requirements.complexity === 'complex' && !model.capabilities.highComplexity && model.qualityScore < 9) {
      return false;
    }

    return true;
  });
}

/**
 * Calculates estimated cost for a model given token estimates
 */
function calculateCost(
  model: ModelDefinition,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePer1M;
  return inputCost + outputCost;
}

/**
 * Main model selection function
 * Selects the best model based on cost optimization while meeting quality requirements
 */
export function selectModel(
  requirements: TaskRequirements,
  options: {
    preferLowestCost?: boolean;
    maxCost?: number; // Maximum acceptable cost in USD
    qualityThreshold?: number; // Minimum quality score (1-10)
    excludeProviders?: ('openai' | 'gemini')[];
  } = {}
): ModelSelection {
  const {
    preferLowestCost = true,
    maxCost = Infinity,
    qualityThreshold = 0,
    excludeProviders = [],
  } = options;

  // Get all models and filter by requirements
  let candidateModels = Object.values(MODELS).filter(
    model => !excludeProviders.includes(model.provider)
  );

  candidateModels = filterCapableModels(requirements, candidateModels);

  if (candidateModels.length === 0) {
    throw new Error('No models available that meet the task requirements');
  }

  // Calculate cost for each model
  const modelCosts = candidateModels.map(model => ({
    model,
    cost: calculateCost(model, requirements.estimatedInputTokens, requirements.estimatedOutputTokens),
  }));

  // Filter by quality threshold
  modelCosts.filter(mc => mc.model.qualityScore >= qualityThreshold);

  // Filter by max cost
  modelCosts.filter(mc => mc.cost <= maxCost);

  if (modelCosts.length === 0) {
    throw new Error(`No models meet cost constraint (max: $${maxCost.toFixed(4)}) and quality threshold (min: ${qualityThreshold})`);
  }

  // Sort by cost (ascending) if preferring lowest cost
  if (preferLowestCost) {
    modelCosts.sort((a, b) => a.cost - b.cost);
  } else {
    // Otherwise sort by quality score descending, then cost
    modelCosts.sort((a, b) => {
      const qualityDiff = b.model.qualityScore - a.model.qualityScore;
      if (Math.abs(qualityDiff) > 0.5) {
        return qualityDiff > 0 ? 1 : -1;
      }
      return a.cost - b.cost;
    });
  }

  const selected = modelCosts[0];

  // Build reasoning
  const reasoning: string[] = [];
  reasoning.push(`Task complexity: ${requirements.complexity}`);
  reasoning.push(`Estimated tokens: ${requirements.estimatedInputTokens} input, ${requirements.estimatedOutputTokens} output`);
  reasoning.push(`Selected: ${selected.model.name} ($${selected.cost.toFixed(4)})`);

  if (modelCosts.length > 1) {
    const nextCheapest = modelCosts[1];
    reasoning.push(`Alternative: ${nextCheapest.model.name} ($${nextCheapest.cost.toFixed(4)})`);
    reasoning.push(`Savings vs alternative: $${(nextCheapest.cost - selected.cost).toFixed(4)}`);
  }

  return {
    model: selected.model,
    estimatedCost: selected.cost,
    confidence: calculateConfidence(selected.model, requirements, candidateModels),
    reasoning,
    alternatives: modelCosts.slice(1, 4).map(mc => mc.model),
  };
}

/**
 * Calculates confidence score for the selection
 */
function calculateConfidence(
  selected: ModelDefinition,
  requirements: TaskRequirements,
  allCandidates: ModelDefinition[]
): number {
  let confidence = 1.0;

  // If there are many capable models, confidence is higher
  if (allCandidates.length > 3) {
    confidence *= 0.9;
  }

  // If the selected model is the cheapest among capable ones, confidence is high
  const costs = allCandidates.map(m =>
    calculateCost(m, requirements.estimatedInputTokens, requirements.estimatedOutputTokens)
  );
  const minCost = Math.min(...costs);
  if (calculateCost(selected, requirements.estimatedInputTokens, requirements.estimatedOutputTokens) > minCost * 1.5) {
    confidence *= 0.7; // Much more expensive than cheapest option
  }

  // If task is high complexity and we're using a non-expert model, reduce confidence
  if (requirements.complexity === 'expert' && !selected.capabilities.highComplexity) {
    confidence *= 0.6;
  }

  return Math.min(1, confidence);
}

/**
 * Utility to get model by ID
 */
export function getModel(modelId: string): ModelDefinition | undefined {
  return MODELS[modelId];
}

/**
 * Get all available models for a provider
 */
export function getModelsByProvider(provider: 'openai' | 'gemini'): ModelDefinition[] {
  return Object.values(MODELS).filter(m => m.provider === provider);
}

/**
 * Compare two models for a given task
 */
export function compareModels(
  requirements: TaskRequirements,
  modelIds: string[]
): Array<{
  model: ModelDefinition;
  cost: number;
  capable: boolean;
}> {
  return modelIds.map(id => {
    const model = MODELS[id];
    if (!model) {
      return { model: null, cost: Infinity, capable: false } as any;
    }
    const capable = filterCapableModels(requirements, [model]).length > 0;
    const cost = capable ? calculateCost(model, requirements.estimatedInputTokens, requirements.estimatedOutputTokens) : Infinity;
    return { model, cost, capable };
  });
}
