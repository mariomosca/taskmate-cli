import { TokenCounter, TokenCountResult } from './TokenCounter.js';
import { ModelManager } from './ModelManager.js';
import { ModelConfig } from '../config/ModelLimits.js';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ContextStatus {
  status: 'safe' | 'warning' | 'critical' | 'overflow';
  currentTokens: number;
  maxTokens: number;
  utilizationPercentage: number;
  recommendedAction: string;
  costEstimate: number;
  tokenCountMethod: 'precise' | 'estimated';
}

export interface ContextOptimizationResult {
  optimizedMessages: LLMMessage[];
  removedMessages: number;
  tokensSaved: number;
  strategy: string;
  summary?: string;
}

export class EnhancedContextManager {
  private tokenCounter: TokenCounter;
  private modelManager: ModelManager;
  private warningThreshold: number = 0.8;
  private criticalThreshold: number = 0.9;

  constructor(defaultModel?: string, modelManager?: ModelManager) {
    this.tokenCounter = new TokenCounter();
    this.modelManager = modelManager || new ModelManager(defaultModel);
  }

  async getContextStatus(messages: LLMMessage[], model?: string): Promise<ContextStatus> {
    const currentModel = model || this.modelManager.getCurrentModel();
    const config = this.modelManager.getModelConfig(currentModel);
    
    // Conta i token con il metodo più preciso disponibile
    const tokenResult = await this.tokenCounter.countMessagesTokens(messages, currentModel);
    
    const utilizationPercentage = tokenResult.tokens / config.contextWindow;
    
    let status: ContextStatus['status'];
    let recommendedAction: string;
    
    if (utilizationPercentage >= 1.0) {
      status = 'overflow';
      recommendedAction = 'Immediate context reduction required - messages will be truncated';
    } else if (utilizationPercentage >= this.criticalThreshold) {
      status = 'critical';
      recommendedAction = 'Context optimization strongly recommended';
    } else if (utilizationPercentage >= this.warningThreshold) {
      status = 'warning';
      recommendedAction = 'Consider context summarization soon';
    } else {
      status = 'safe';
      recommendedAction = 'No action needed';
    }

    // Stima del costo basata sui token attuali
    const costEstimate = this.modelManager.calculateCost(tokenResult.tokens, 0, currentModel);

    return {
      status,
      currentTokens: tokenResult.tokens,
      maxTokens: config.contextWindow,
      utilizationPercentage,
      recommendedAction,
      costEstimate,
      tokenCountMethod: tokenResult.method
    };
  }

  async optimizeContext(messages: LLMMessage[], targetReduction: number = 0.3, model?: string): Promise<ContextOptimizationResult> {
    const currentModel = model || this.modelManager.getCurrentModel();
    const config = this.modelManager.getModelConfig(currentModel);
    
    const initialTokens = await this.tokenCounter.countMessagesTokens(messages, currentModel);
    const targetTokens = Math.floor(config.contextWindow * (1 - targetReduction));
    
    if (initialTokens.tokens <= targetTokens) {
      return {
        optimizedMessages: messages,
        removedMessages: 0,
        tokensSaved: 0,
        strategy: 'no_optimization_needed'
      };
    }

    // Strategia 1: Rimuovi messaggi più vecchi (preserva system e ultimi messaggi)
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    let optimizedMessages = [...systemMessages];
    let currentTokenCount = await this.tokenCounter.countMessagesTokens(systemMessages, currentModel);
    
    // Aggiungi messaggi dal più recente fino a raggiungere il limite
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const messageTokens = await this.tokenCounter.countTokens(conversationMessages[i].content, currentModel);
      
      if (currentTokenCount.tokens + messageTokens.tokens <= targetTokens) {
        optimizedMessages.unshift(conversationMessages[i]);
        currentTokenCount.tokens += messageTokens.tokens;
      } else {
        break;
      }
    }

    const removedMessages = messages.length - optimizedMessages.length;
    const tokensSaved = initialTokens.tokens - currentTokenCount.tokens;

    return {
      optimizedMessages,
      removedMessages,
      tokensSaved,
      strategy: 'remove_oldest_messages'
    };
  }

  async summarizeOldMessages(messages: LLMMessage[], keepRecentCount: number = 5, model?: string): Promise<ContextOptimizationResult> {
    if (messages.length <= keepRecentCount + 1) { // +1 for system message
      return {
        optimizedMessages: messages,
        removedMessages: 0,
        tokensSaved: 0,
        strategy: 'no_summarization_needed'
      };
    }

    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    if (conversationMessages.length <= keepRecentCount) {
      return {
        optimizedMessages: messages,
        removedMessages: 0,
        tokensSaved: 0,
        strategy: 'no_summarization_needed'
      };
    }

    const messagesToSummarize = conversationMessages.slice(0, -keepRecentCount);
    const recentMessages = conversationMessages.slice(-keepRecentCount);
    
    // Crea un riassunto dei messaggi più vecchi
    const summaryContent = this.createConversationSummary(messagesToSummarize);
    const summaryMessage: LLMMessage = {
      role: 'system',
      content: `Previous conversation summary: ${summaryContent}`
    };

    const optimizedMessages = [
      ...systemMessages,
      summaryMessage,
      ...recentMessages
    ];

    const currentModel = model || this.modelManager.getCurrentModel();
    const originalTokens = await this.tokenCounter.countMessagesTokens(messages, currentModel);
    const optimizedTokens = await this.tokenCounter.countMessagesTokens(optimizedMessages, currentModel);

    return {
      optimizedMessages,
      removedMessages: messagesToSummarize.length,
      tokensSaved: originalTokens.tokens - optimizedTokens.tokens,
      strategy: 'summarize_old_messages',
      summary: summaryContent
    };
  }

  private createConversationSummary(messages: LLMMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    const topics = userMessages.map(m => {
      const content = m.content.substring(0, 100);
      return content.includes('?') ? content.split('?')[0] + '?' : content + '...';
    });

    return `Conversation covered ${topics.length} topics including: ${topics.slice(0, 3).join(', ')}. ${assistantMessages.length} responses provided.`;
  }

  async getModelRecommendation(messages: LLMMessage[], requirements?: {
    maxCost?: number;
    requiredFeatures?: string[];
    preferredProvider?: 'claude' | 'gemini';
  }): Promise<{
    recommendedModel: string;
    reason: string;
    config: ModelConfig;
    estimatedCost: number;
  } | null> {
    const currentTokens = await this.tokenCounter.countMessagesTokens(messages, 'claude-3-sonnet-20240229');
    
    const optimalModel = this.modelManager.getOptimalModel({
      minContextWindow: currentTokens.tokens * 1.2, // 20% buffer
      maxCostPer1kTokens: requirements?.maxCost,
      requiredFeatures: requirements?.requiredFeatures,
      provider: requirements?.preferredProvider
    });

    if (!optimalModel) {
      return null;
    }

    const estimatedCost = this.modelManager.calculateCost(currentTokens.tokens, 1000); // Assume 1k output tokens
    
    return {
      recommendedModel: Object.keys(this.modelManager.getAvailableModels()).find(key => 
        this.modelManager.getModelConfig(key).name === optimalModel.name
      ) || 'claude-3-sonnet-20240229',
      reason: `Optimal balance of context window (${optimalModel.contextWindow.toLocaleString()}) and cost ($${optimalModel.costPer1kInputTokens}/1k tokens)`,
      config: optimalModel,
      estimatedCost
    };
  }

  async getCostAnalysis(messages: LLMMessage[], model?: string): Promise<{
    inputCost: number;
    estimatedOutputCost: number;
    totalEstimatedCost: number;
    tokenBreakdown: {
      inputTokens: number;
      estimatedOutputTokens: number;
      method: 'precise' | 'estimated';
    };
  }> {
    const currentModel = model || this.modelManager.getCurrentModel();
    const tokenResult = await this.tokenCounter.countMessagesTokens(messages, currentModel);
    const config = this.modelManager.getModelConfig(currentModel);
    
    // Stima token di output basata sulla lunghezza dell'input (tipicamente 10-30% dell'input)
    const estimatedOutputTokens = Math.min(
      Math.floor(tokenResult.tokens * 0.2),
      config.maxOutputTokens
    );

    const inputCost = (tokenResult.tokens / 1000) * config.costPer1kInputTokens;
    const estimatedOutputCost = (estimatedOutputTokens / 1000) * config.costPer1kOutputTokens;

    return {
      inputCost,
      estimatedOutputCost,
      totalEstimatedCost: inputCost + estimatedOutputCost,
      tokenBreakdown: {
        inputTokens: tokenResult.tokens,
        estimatedOutputTokens,
        method: tokenResult.method
      }
    };
  }

  setThresholds(warning: number, critical: number): void {
    if (warning >= critical || warning <= 0 || critical <= 0 || critical > 1) {
      throw new Error('Invalid thresholds: warning must be < critical, both must be > 0 and critical <= 1');
    }
    this.warningThreshold = warning;
    this.criticalThreshold = critical;
  }

  getModelManager(): ModelManager {
    return this.modelManager;
  }

  getTokenCounter(): TokenCounter {
    return this.tokenCounter;
  }
}