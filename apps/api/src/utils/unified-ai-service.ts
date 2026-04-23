/**
 * Unified AI Service with automatic model selection
 * Supports both OpenAI and Google Gemini with intelligent cost optimization
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import type { ModelSelection, TaskRequirements, ModelDefinition } from './model-selector';
import { selectModel, MODELS, getModel } from './model-selector';

// Environment variables for API keys
export interface AIServiceConfig {
  openaiApiKey?: string;
  geminiApiKey?: string;
  defaultProvider?: 'openai' | 'gemini' | 'auto';
  costOptimization?: 'aggressive' | 'balanced' | 'quality';
  maxCostPerRequest?: number;
  qualityThreshold?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: 'openai' | 'gemini';
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  selection?: ModelSelection;
}

export class UnifiedAIService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private config: Required<AIServiceConfig>;

  constructor(config: AIServiceConfig) {
    this.config = {
      openaiApiKey: config.openaiApiKey ?? '',
      geminiApiKey: config.geminiApiKey ?? '',
      defaultProvider: config.defaultProvider ?? 'auto',
      costOptimization: config.costOptimization ?? 'balanced',
      maxCostPerRequest: config.maxCostPerRequest ?? 10,
      qualityThreshold: config.qualityThreshold ?? 7,
    };

    if (this.config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    if (this.config.geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(this.config.geminiApiKey);
    }
  }

  /**
   * Main chat method with automatic model selection
   */
  async chat(
    messages: ChatMessage[],
    options: {
      taskDescription?: string;
      forceProvider?: 'openai' | 'gemini';
      forceModel?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const {
      taskDescription,
      forceProvider,
      forceModel,
      temperature = 0.7,
      maxTokens = 2000,
      jsonMode = false,
    } = options;

    // Build prompt from messages
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const lastUserMessage = conversationMessages.find(m => m.role === 'user')?.content || '';
    const fullPrompt = taskDescription || lastUserMessage;

    // Determine requirements
    const requirements: TaskRequirements = {
      complexity: this.estimateComplexity(fullPrompt, systemPrompt),
      needsVision: this.needsVision(messages),
      needsFunctionCalling: false,
      needsJsonMode: jsonMode,
      estimatedInputTokens: this.estimateTokens(messages),
      estimatedOutputTokens: maxTokens,
      needsReasoning: this.needsReasoning(fullPrompt, systemPrompt),
      needsCode: this.needsCode(fullPrompt),
      needsCreative: this.needsCreative(fullPrompt),
    };

    // Select model
    let selectedModel: ModelDefinition;
    let selection: ModelSelection | null = null;

    if (forceModel) {
      selectedModel = getModel(forceModel) ?? MODELS[forceModel];
      if (!selectedModel) {
        throw new Error(`Unknown model: ${forceModel}`);
      }
    } else if (forceProvider) {
      selectedModel = this.selectModelByProvider(forceProvider, requirements);
    } else {
      // Auto-select based on cost optimization
      const excludeProviders: ('openai' | 'gemini')[] = [];

      if (!this.config.openaiApiKey) {
        excludeProviders.push('openai');
      }
      if (!this.config.geminiApiKey) {
        excludeProviders.push('gemini');
      }

      if (excludeProviders.length === 2) {
        throw new Error('No AI providers configured. Please set OPENAI_API_KEY or GEMINI_API_KEY.');
      }

      selection = selectModel(requirements, {
        preferLowestCost: this.config.costOptimization === 'aggressive',
        maxCost: this.config.maxCostPerRequest,
        qualityThreshold: this.config.qualityThreshold,
        excludeProviders,
      });

      selectedModel = selection.model;
    }

    // Make the API call
    const response = await this.executeChat(messages, selectedModel, {
      temperature,
      maxTokens,
      jsonMode,
    });

    return {
      ...response,
      selection,
    };
  }

  /**
   * Execute chat with a specific model
   */
  private async executeChat(
    messages: ChatMessage[],
    model: ModelDefinition,
    options: { temperature: number; maxTokens: number; jsonMode: boolean }
  ): Promise<AIResponse> {
    const { temperature, maxTokens, jsonMode } = options;

    if (model.provider === 'openai') {
      return this.executeOpenAIChat(messages, model, { temperature, maxTokens, jsonMode });
    } else {
      return this.executeGeminiChat(messages, model, { temperature, maxTokens, jsonMode });
    }
  }

  /**
   * Execute OpenAI chat completion
   */
  private async executeOpenAIChat(
    messages: ChatMessage[],
    model: ModelDefinition,
    options: { temperature: number; maxTokens: number; jsonMode: boolean }
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY.');
    }

    const openaiMessages = messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    const response = await this.openai.chat.completions.create({
      model: model.id,
      messages: openaiMessages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      ...(options.jsonMode && { response_format: { type: 'json_object' as const } }),
    });

    const choice = response.choices[0];
    const usage = response.usage;

    const cost = calculateCost(
      model,
      usage?.prompt_tokens || 0,
      usage?.completion_tokens || 0
    );

    return {
      content: choice.message.content || '',
      model: model.id,
      provider: 'openai',
      tokensUsed: {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0,
      },
      cost,
    };
  }

  /**
   * Execute Gemini chat completion
   */
  private async executeGeminiChat(
    messages: ChatMessage[],
    model: ModelDefinition,
    options: { temperature: number; maxTokens: number; jsonMode: boolean }
  ): Promise<AIResponse> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized. Set GEMINI_API_KEY.');
    }

    const genAI = this.gemini;
    const geminiModel = genAI.getGenerativeModel({
      model: model.id,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        ...(options.jsonMode && { responseMimeType: 'application/json' }),
      },
    });

    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system');
    const history: Array<{ role: string; parts: { text: string }[] }> = [];

    // Build conversation history
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'system') {continue;}

      if (msg.role === 'user') {
        history.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        history.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    // Build chat
    const chatParams = {
      history: history.slice(0, -1),
    };
    if (systemInstruction) {
      chatParams.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }
    const chat = geminiModel.startChat(chatParams);

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const result = await chat.sendMessage(lastUserMessage?.content || '');
    const response = await result.response;
    const text = response.text();

    // Estimate token usage (Gemini doesn't provide exact counts in the same way)
    const estimatedInput = this.estimateTokens(messages);
    const estimatedOutput = this.estimateTokens([{ role: 'assistant', content: text }]);

    const cost = calculateCost(model, estimatedInput, estimatedOutput);

    return {
      content: text,
      model: model.id,
      provider: 'gemini',
      tokensUsed: {
        input: estimatedInput,
        output: estimatedOutput,
        total: estimatedInput + estimatedOutput,
      },
      cost,
    };
  }

  /**
   * Select model from a specific provider
   */
  private selectModelByProvider(
    provider: 'openai' | 'gemini',
    requirements: TaskRequirements
  ): ModelDefinition {
    const providerModels = Object.values(MODELS).filter(m => m.provider === provider);
    const capable = filterCapableModels(requirements, providerModels);

    if (capable.length === 0) {
      throw new Error(`No ${provider} models available for these requirements`);
    }

    // Sort by quality/cost ratio
    capable.sort((a, b) => {
      const costA = calculateCost(a, requirements.estimatedInputTokens, requirements.estimatedOutputTokens);
      const costB = calculateCost(b, requirements.estimatedInputTokens, requirements.estimatedOutputTokens);
      const ratioA = a.qualityScore / costA;
      const ratioB = b.qualityScore / costB;
      return ratioB - ratioA; // Descending
    });

    return capable[0];
  }

  // Helper methods for requirement estimation

  private estimateComplexity(prompt: string, systemPrompt: string): TaskRequirements['complexity'] {
    const combined = (prompt + ' ' + systemPrompt).toLowerCase();
    const wordCount = combined.split(/\s+/).length;

    const complexIndicators = [
      'analyze', 'compare', 'evaluate', 'synthesize', 'critique',
      'multi-step', 'step by step', 'detailed', 'comprehensive',
      'reasoning', 'logic', 'derive', 'calculate',
    ];

    const expertIndicators = [
      'research', 'academic', 'scientific', 'thesis',
      'novel', 'innovative', 'breakthrough',
      'statistical analysis', 'machine learning', 'architecture',
    ];

    const complexCount = complexIndicators.filter(ind => combined.includes(ind)).length;
    const expertCount = expertIndicators.filter(ind => combined.includes(ind)).length;

    if (expertCount > 0 || (complexCount >= 3) || wordCount > 500) {
      return 'expert';
    }
    if (complexCount >= 2 || wordCount > 200) {
      return 'complex';
    }
    if (complexCount >= 1 || wordCount > 100) {
      return 'moderate';
    }
    return 'simple';
  }

  private needsVision(messages: ChatMessage[]): boolean {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    return text.includes('image') || text.includes('photo') || text.includes('analyze this');
  }

  private needsReasoning(prompt: string, systemPrompt: string): boolean {
    const combined = (prompt + ' ' + systemPrompt).toLowerCase();
    return combined.includes('reason') || combined.includes('think') ||
           combined.includes('why') || combined.includes('explain');
  }

  private needsCode(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    return lower.includes('code') || lower.includes('function') ||
           lower.includes('program') || lower.includes('javascript') ||
           lower.includes('typescript') || lower.includes('python');
  }

  private needsCreative(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    return lower.includes('write') || lower.includes('story') ||
           lower.includes('creative') || lower.includes('content') ||
           lower.includes('blog') || lower.includes('article');
  }

  private estimateTokens(messages: ChatMessage[]): number {
    // Rough approximation: ~4 chars per token for English text
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Get cost statistics for a request
   */
  static calculateModelCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = getModel(modelId);
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    return calculateCost(model, inputTokens, outputTokens);
  }

  /**
   * Get available models
   */
  getAvailableModels(): ModelDefinition[] {
    return Object.values(MODELS);
  }

  /**
   * Get model selection recommendation for a task
   */
  getRecommendation(taskDescription: string, estimatedOutputTokens?: number): ModelSelection {
    const requirements: TaskRequirements = {
      complexity: this.estimateComplexity(taskDescription, ''),
      needsVision: this.needsVision([{ role: 'user', content: taskDescription }]),
      needsFunctionCalling: false,
      needsJsonMode: taskDescription.toLowerCase().includes('json'),
      estimatedInputTokens: Math.ceil(taskDescription.length / 4),
      estimatedOutputTokens: estimatedOutputTokens || Math.min(Math.ceil(taskDescription.length / 3), 2000),
      needsReasoning: this.needsReasoning(taskDescription, ''),
      needsCode: this.needsCode(taskDescription),
      needsCreative: this.needsCreative(taskDescription),
    };

    const excludeProviders: ('openai' | 'gemini')[] = [];
    if (!this.config.openaiApiKey) {excludeProviders.push('openai');}
    if (!this.config.geminiApiKey) {excludeProviders.push('gemini');}

    return selectModel(requirements, {
      preferLowestCost: this.config.costOptimization === 'aggressive',
      maxCost: this.config.maxCostPerRequest,
      qualityThreshold: this.config.qualityThreshold,
      excludeProviders,
    });
  }
}

/**
 * Calculate cost for a model
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
 * Filter models based on capabilities
 */
function filterCapableModels(
  requirements: TaskRequirements,
  models: ModelDefinition[]
): ModelDefinition[] {
  return models.filter(model => {
    if (requirements.estimatedInputTokens + requirements.estimatedOutputTokens > model.contextWindow) {
      return false;
    }
    if (requirements.estimatedOutputTokens > model.maxOutputTokens) {
      return false;
    }
    if (requirements.needsVision && !model.capabilities.vision) {return false;}
    if (requirements.needsJsonMode && !model.capabilities.jsonMode) {return false;}
    if (requirements.needsReasoning && !model.capabilities.reasoning) {return false;}
    if (requirements.needsCode && !model.capabilities.code) {return false;}
    if (requirements.needsCreative && !model.capabilities.creative) {return false;}
    if (requirements.complexity === 'expert' && !model.capabilities.highComplexity) {return false;}
    if (requirements.complexity === 'complex' && !model.capabilities.highComplexity && model.qualityScore < 9) {
      return false;
    }
    return true;
  });
}

/**
 * Create a unified AI service instance
 */
export function createAIService(config: AIServiceConfig): UnifiedAIService {
  return new UnifiedAIService(config);
}
