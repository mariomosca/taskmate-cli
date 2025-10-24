export interface ModelConfig {
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  provider: 'claude' | 'gemini';
  features: string[];
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'claude-sonnet-4-5-20250929': {
    name: 'Claude Sonnet 4.5',
    contextWindow: 200000,
    maxOutputTokens: 64000,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    provider: 'claude',
    features: ['function_calling', 'vision', 'extended_thinking']
  },
  'claude-sonnet-4-5': {
    name: 'Claude Sonnet 4.5 (Alias)',
    contextWindow: 200000,
    maxOutputTokens: 64000,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    provider: 'claude',
    features: ['function_calling', 'vision', 'extended_thinking']
  },
  'claude-3-7-sonnet-20250219': {
    name: 'Claude Sonnet 3.7',
    contextWindow: 200000,
    maxOutputTokens: 64000,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    provider: 'claude',
    features: ['function_calling', 'vision', 'extended_thinking']
  },
  'claude-3-sonnet-20240229': {
    name: 'Claude 3 Sonnet (Deprecated)',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    provider: 'claude',
    features: ['function_calling', 'vision']
  },
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    provider: 'claude',
    features: ['function_calling', 'vision']
  },
  'claude-3-haiku-20240307': {
    name: 'Claude 3 Haiku',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
    provider: 'claude',
    features: ['function_calling']
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet (Legacy)',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    provider: 'claude',
    features: ['function_calling', 'vision']
  },
  'claude-3-opus': {
    name: 'Claude 3 Opus (Legacy)',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    provider: 'claude',
    features: ['function_calling', 'vision']
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    contextWindow: 32000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    provider: 'gemini',
    features: ['function_calling']
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    provider: 'gemini',
    features: ['function_calling', 'large_context', 'vision']
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
    maxOutputTokens: 65535,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    provider: 'gemini',
    features: ['function_calling', 'large_context', 'vision']
  }
};

// Configurazioni di fallback per modelli non riconosciuti
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  name: 'Unknown Model',
  contextWindow: 8192,
  maxOutputTokens: 4096,
  costPer1kInputTokens: 0.001,
  costPer1kOutputTokens: 0.002,
  provider: 'claude',
  features: []
};

// Utility functions
export function getModelsByProvider(provider: 'claude' | 'gemini'): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter(config => config.provider === provider);
}

export function getModelsByFeature(feature: string): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter(config => config.features.includes(feature));
}

export function getLargeContextModels(): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter(config => config.contextWindow >= 500000);
}