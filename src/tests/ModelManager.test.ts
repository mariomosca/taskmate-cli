import { ModelManager } from '../services/ModelManager';

describe('ModelManager', () => {
  let modelManager: ModelManager;

  beforeEach(() => {
    modelManager = new ModelManager();
  });

  describe('getCurrentModel', () => {
    it('should return default model initially', () => {
      const currentModel = modelManager.getCurrentModel();
      expect(currentModel).toBe('claude-sonnet-4-5-20250929');
    });
  });

  describe('setCurrentModel', () => {
    it('should set valid model', () => {
      modelManager.setCurrentModel('claude-3-opus-20240229');
      expect(modelManager.getCurrentModel()).toBe('claude-3-opus-20240229');
    });

    it('should accept invalid model with warning', () => {
      modelManager.setCurrentModel('invalid-model');
      expect(modelManager.getCurrentModel()).toBe('invalid-model');
    });
  });

  describe('getModelConfig', () => {
    it('should return config for valid model', () => {
      const config = modelManager.getModelConfig('claude-sonnet-4-5-20250929');
      
      expect(config).toBeDefined();
      expect(config.contextWindow).toBeGreaterThan(0);
      expect(config.maxOutputTokens).toBeGreaterThan(0);
      expect(config.costPer1kInputTokens).toBeGreaterThan(0);
      expect(config.costPer1kOutputTokens).toBeGreaterThan(0);
      expect(config.provider).toBe('claude');
    });

    it('should return default config for invalid model', () => {
      const config = modelManager.getModelConfig('invalid-model');
      expect(config).toBeDefined();
      expect(config.name).toBe('Unknown Model');
    });
  });

  describe('getContextWindow', () => {
    it('should return context window for current model', () => {
      const contextWindow = modelManager.getContextWindow();
      expect(contextWindow).toBeGreaterThan(0);
    });

    it('should return context window for specific model', () => {
      const contextWindow = modelManager.getContextWindow('claude-3-opus-20240229');
      expect(contextWindow).toBeGreaterThan(0);
    });

    it('should return default context window for invalid model', () => {
      const contextWindow = modelManager.getContextWindow('invalid-model');
      expect(contextWindow).toBe(8192); // DEFAULT_MODEL_CONFIG contextWindow
    });
  });

  describe('getMaxOutputTokens', () => {
    it('should return max output tokens for current model', () => {
      const maxOutput = modelManager.getMaxOutputTokens();
      expect(maxOutput).toBeGreaterThan(0);
    });

    it('should return max output tokens for specific model', () => {
      const maxOutput = modelManager.getMaxOutputTokens('gemini-1.5-pro');
      expect(maxOutput).toBeGreaterThan(0);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      const cost = modelManager.calculateCost(1000, 500, 'claude-sonnet-4-5-20250929');
      
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle zero tokens', () => {
      const cost = modelManager.calculateCost(0, 0, 'claude-sonnet-4-5-20250929');
      expect(cost).toBe(0);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = modelManager.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('provider');
    });
  });

  describe('getModelsByProvider', () => {
    it('should return Claude models', () => {
      const claudeModels = modelManager.getModelsByProvider('claude');
      
      expect(Array.isArray(claudeModels)).toBe(true);
      expect(claudeModels.length).toBeGreaterThan(0);
      expect(claudeModels.every(model => model.provider === 'claude')).toBe(true);
    });

    it('should return Gemini models', () => {
      const geminiModels = modelManager.getModelsByProvider('gemini');
      
      expect(Array.isArray(geminiModels)).toBe(true);
      expect(geminiModels.length).toBeGreaterThan(0);
      expect(geminiModels.every(model => model.provider === 'gemini')).toBe(true);
    });
  });

  describe('supportsFeature', () => {
    it('should detect vision capability', () => {
      const hasVision = modelManager.supportsFeature('vision', 'claude-sonnet-4-5-20250929');
      expect(typeof hasVision).toBe('boolean');
    });

    it('should detect function calling capability', () => {
      const hasFunctionCalling = modelManager.supportsFeature('function_calling', 'claude-sonnet-4-5-20250929');
      expect(typeof hasFunctionCalling).toBe('boolean');
    });
  });

  describe('getOptimalModel', () => {
    it('should find model within context requirements', () => {
      const optimal = modelManager.getOptimalModel({
        minContextWindow: 100000,
        provider: 'claude'
      });
      
      expect(optimal).toBeDefined();
      expect(optimal?.provider).toBe('claude');
    });

    it('should find model with specific features', () => {
      const optimal = modelManager.getOptimalModel({
        requiredFeatures: ['function_calling']
      });
      
      expect(optimal).toBeDefined();
    });

    it('should return null when no model meets requirements', () => {
      const optimal = modelManager.getOptimalModel({
        minContextWindow: 10000000 // Impossibly high requirement
      });
      
      expect(optimal).toBeNull();
    });
  });

  describe('getModelInfo', () => {
    it('should return detailed model information', () => {
      const info = modelManager.getModelInfo('claude-sonnet-4-5-20250929');
      
      expect(info).toHaveProperty('config');
      expect(info).toHaveProperty('isCurrentModel');
      
      expect(info.config).toBeDefined();
      expect(typeof info.isCurrentModel).toBe('boolean');
    });
  });

  describe('validateModel', () => {
    it('should validate existing model', () => {
      const result = modelManager.validateModel('claude-sonnet-4-5-20250929');
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('warnings');
      
      expect(result.isValid).toBe(true);
      expect(result.exists).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should reject invalid model', () => {
      const result = modelManager.validateModel('invalid-model');
      
      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(false);
    });

    it('should handle empty string', () => {
      const result = modelManager.validateModel('');
      
      expect(result.isValid).toBe(false);
    });
  });
});