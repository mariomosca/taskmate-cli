import { ModelConfig, MODEL_CONFIGS, DEFAULT_MODEL_CONFIG } from '../config/ModelLimits.js';
import { ModelProvider } from '../types/index.js';
import { DatabaseService } from './DatabaseService.js';
import { logger } from '../utils/logger.js';

/**
 * ModelManager - Manages AI model configurations and selection
 * 
 * This class handles:
 * - Model configuration retrieval from ModelLimits.ts
 * - Current model state management
 * - Fallback to default model when needed
 * 
 * Key responsibilities:
 * - Provide model configurations (context window, costs, features)
 * - Track the currently selected model
 * - Handle model switching and validation
 */
export class ModelManager {
  private currentModel: string;

  constructor(defaultModel?: string) {
    // Initialize current model: use provided default, env variable, or fallback to claude-sonnet-4-5-20250929
    this.currentModel = defaultModel || process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929';
  }

  /**
   * Get configuration for a specific model
   * @param model - Model identifier (optional, uses current model if not provided)
   * @returns ModelConfig object with context window, costs, and features
   */
  public getModelConfig(model?: string): ModelConfig {
    // Use provided model or fall back to current model
    const targetModel = model || this.currentModel;
    
    // Return specific model config or default if model not found
    return MODEL_CONFIGS[targetModel] || DEFAULT_MODEL_CONFIG;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setCurrentModel(model: string): void {
    if (!MODEL_CONFIGS[model]) {
      logger.warn(`Model ${model} not found in configurations, using default config`);
    }
    this.currentModel = model;
  }

  getContextWindow(model?: string): number {
    return this.getModelConfig(model).contextWindow;
  }

  getMaxOutputTokens(model?: string): number {
    return this.getModelConfig(model).maxOutputTokens;
  }

  calculateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const config = this.getModelConfig(model);
    const inputCost = (inputTokens / 1000) * config.costPer1kInputTokens;
    const outputCost = (outputTokens / 1000) * config.costPer1kOutputTokens;
    return inputCost + outputCost;
  }

  getAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS);
  }

  getModelsByProvider(provider: 'claude' | 'gemini'): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter(config => config.provider === provider);
  }

  supportsFeature(feature: string, model?: string): boolean {
    const config = this.getModelConfig(model);
    return config.features.includes(feature);
  }

  getOptimalModel(requirements: {
    minContextWindow?: number;
    maxCostPer1kTokens?: number;
    requiredFeatures?: string[];
    provider?: 'claude' | 'gemini';
  }): ModelConfig | null {
    const availableModels = Object.values(MODEL_CONFIGS);
    
    const filteredModels = availableModels.filter(model => {
      // Filtra per context window minimo
      if (requirements.minContextWindow && model.contextWindow < requirements.minContextWindow) {
        return false;
      }
      
      // Filtra per costo massimo
      if (requirements.maxCostPer1kTokens && model.costPer1kInputTokens > requirements.maxCostPer1kTokens) {
        return false;
      }
      
      // Filtra per provider
      if (requirements.provider && model.provider !== requirements.provider) {
        return false;
      }
      
      // Filtra per features richieste
      if (requirements.requiredFeatures) {
        const hasAllFeatures = requirements.requiredFeatures.every(feature => 
          model.features.includes(feature)
        );
        if (!hasAllFeatures) {
          return false;
        }
      }
      
      return true;
    });

    if (filteredModels.length === 0) {
      return null;
    }

    // Ordina per costo (più economico prima)
    filteredModels.sort((a, b) => a.costPer1kInputTokens - b.costPer1kInputTokens);
    
    return filteredModels[0];
  }

  getModelInfo(model?: string): {
    config: ModelConfig;
    isCurrentModel: boolean;
    contextUtilization?: number;
    estimatedCostPer1kChars?: number;
  } {
    const targetModel = model || this.currentModel;
    const config = this.getModelConfig(targetModel);
    const isCurrentModel = targetModel === this.currentModel;
    
    // Stima costo per 1k caratteri (assumendo ~3 caratteri per token)
    const estimatedCostPer1kChars = (config.costPer1kInputTokens * 1000) / 3;

    return {
      config,
      isCurrentModel,
      estimatedCostPer1kChars
    };
  }

  validateModel(model: string): {
    isValid: boolean;
    exists: boolean;
    warnings: string[];
  } {
    const exists = !!MODEL_CONFIGS[model];
    const warnings: string[] = [];
    
    if (!exists) {
      warnings.push(`Model '${model}' not found in configuration`);
    }

    return {
      isValid: exists,
      exists,
      warnings
    };
  }
}