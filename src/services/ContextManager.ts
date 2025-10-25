import { Message } from '../types/index.js';
import { TokenCounter } from './TokenCounter.js';
import { LLMService } from './LLMService.js';
import { logger } from '../utils/logger.js';
import { DatabaseService } from './DatabaseService.js';
import { TodoistAIService } from './TodoistAIService.js';
import { PromptProcessor, SUMMARIZE_SESSION } from '../prompts/templates.js';
import { ModelManager } from './ModelManager.js';
import { errorHandler } from '../utils/ErrorHandler.js';

/**
 * ContextManager - Manages conversation context and token calculations
 * 
 * This class handles:
 * - Token estimation and calculation for messages
 * - Context window monitoring and status reporting
 * - Automatic context summarization when limits are approached
 * - Integration with ModelManager for accurate token limits
 * 
 * Key responsibilities:
 * - Calculate total tokens used by conversation messages
 * - Monitor context usage against model limits (200k for Claude)
 * - Provide status indicators (safe/warning/critical)
 * - Format context information for UI display
 * - Trigger summarization when context becomes critical
 */
export class ContextManager {
  private llmService: LLMService;
  private todoistAIService?: TodoistAIService;
  private modelManager: ModelManager;
  private warningThreshold: number; // Percentuale di warning (es. 80%)
  private criticalThreshold: number; // Percentuale critica per summarize (es. 90%)

  constructor(llmService: LLMService, todoistAIService?: TodoistAIService, modelManager?: ModelManager) {
    this.llmService = llmService;
    this.todoistAIService = todoistAIService;
    // Use provided ModelManager instance or create a new one
    // This allows sharing the same ModelManager instance across services
    this.modelManager = modelManager || new ModelManager();
    this.warningThreshold = 0.8; // 80%
    this.criticalThreshold = 0.9; // 90%
  }

  /**
   * Imposta il servizio Todoist AI
   */
  public setTodoistAIService(todoistAIService: TodoistAIService): void {
    this.todoistAIService = todoistAIService;
  }

  /**
   * Approximate token estimation for text
   * Uses empirical rule: ~4 characters per token for English, ~3 for Italian
   */
  private estimateTokens(text: string): number {
    // Remove multiple spaces and normalize
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    
    // Conservative estimate: 3 characters per token (to be safe)
    return Math.ceil(normalizedText.length / 3);
  }

  /**
   * Calculate total tokens for a list of messages
   */
  public calculateTotalTokens(messages: Message[]): number {
    return messages.reduce((total, message) => {
      return total + this.estimateTokens(message.content);
    }, 0);
  }

  /**
   * Check if context is close to the limit
   */
  /**
   * Calculate context status and token usage
   * 
   * This method:
   * 1. Calculates total tokens used by all messages
   * 2. Gets the current model's context window limit (200k for Claude)
   * 3. Calculates usage percentage
   * 4. Determines status based on thresholds (80% warning, 90% critical)
   * 
   * @param messages - Array of conversation messages
   * @returns Object with token counts, percentage, status, and summarization flag
   */
  public getContextStatus(messages: Message[]): {
    totalTokens: number;
    maxTokens: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical';
    needsSummarization: boolean;
  } {
    // Calculate total tokens used by all messages in the conversation
    const totalTokens = this.calculateTotalTokens(messages);
    
    // Get current model configuration to determine context window limit
    const currentModel = this.modelManager.getCurrentModel();
    const modelConfig = this.modelManager.getModelConfig(currentModel);
    const maxTokens = modelConfig.contextWindow; // 200,000 for Claude models
    
    // Calculate usage percentage
    const percentage = totalTokens / maxTokens;

    // Determine status based on usage thresholds
    let status: 'safe' | 'warning' | 'critical' = 'safe';
    if (percentage >= this.criticalThreshold) {
      status = 'critical';
    } else if (percentage >= this.warningThreshold) {
      status = 'warning';
    }

    return {
      totalTokens,
      maxTokens,
      percentage: Math.round(percentage * 100),
      status,
      needsSummarization: percentage >= this.criticalThreshold
    };
  }

  /**
   * Automatically summarize context when necessary
   */
  public async summarizeContextIfNeeded(messages: Message[]): Promise<{
    messages: Message[];
    wasSummarized: boolean;
    summary?: string;
  }> {
    const contextStatus = this.getContextStatus(messages);
    
    if (!contextStatus.needsSummarization) {
      return {
        messages,
        wasSummarized: false
      };
    }

    // Always keep the last 3 messages for continuity
    const recentMessages = messages.slice(-3);
    const messagesToSummarize = messages.slice(0, -3);

    try {

      if (messagesToSummarize.length === 0) {
        // If we have only 3 messages or less, we cannot summarize
        return {
          messages,
          wasSummarized: false
        };
      }

      // Prepare content for summary
      const chatHistory = messagesToSummarize
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Use template for summary
      const summaryPrompt = PromptProcessor.process(
        SUMMARIZE_SESSION,
        { chatHistory }
      );

      // Generate summary
      const summary = await this.llmService.summarizeContext(chatHistory);

      // Create a new system message with the summary
      const summaryMessage: Message = {
        id: `summary-${Date.now()}`,
        role: 'system',
        content: `[PREVIOUS CONVERSATION SUMMARY]\n${summary}`,
        timestamp: new Date(),
        metadata: {
          sessionId: messages[0]?.metadata?.sessionId || 'default'
        }
      };

      // Return summary + recent messages
      const newMessages = [summaryMessage, ...recentMessages];

      return {
        messages: newMessages,
        wasSummarized: true,
        summary
      };

    } catch (error) {
      const handledError = errorHandler.handleError(
        error as Error,
        {
          operation: 'summarize_context',
          component: 'ContextManager',
          metadata: { 
            messageCount: messages.length,
            messagesToSummarize: messagesToSummarize.length 
          }
        }
      );
      
      logger.error('Error during context summarization:', handledError);
      
      // Fallback: keep only the last 5 messages
      return {
        messages: messages.slice(-5),
        wasSummarized: false
      };
    }
  }

  /**
   * Prepare optimized context for LLM
   */
  public async prepareOptimizedContext(messages: Message[]): Promise<{
    optimizedMessages: Message[];
    contextInfo: {
      originalTokens: number;
      finalTokens: number;
      wasSummarized: boolean;
      status: 'safe' | 'warning' | 'critical';
    };
  }> {
    const originalTokens = this.calculateTotalTokens(messages);
    const originalStatus = this.getContextStatus(messages);

    // Try to summarize if necessary
    const result = await this.summarizeContextIfNeeded(messages);
    
    const finalTokens = this.calculateTotalTokens(result.messages);
    const finalStatus = this.getContextStatus(result.messages);

    return {
      optimizedMessages: result.messages,
      contextInfo: {
        originalTokens,
        finalTokens,
        wasSummarized: result.wasSummarized,
        status: finalStatus.status
      }
    };
  }

  /**
   * Prepare enhanced context with Todoist information for AI
   */
  public async prepareEnhancedContext(messages: Message[]): Promise<{
    enhancedMessages: Message[];
    contextInfo: {
      originalTokens: number;
      finalTokens: number;
      wasSummarized: boolean;
      status: 'safe' | 'warning' | 'critical';
      hasTodoistContext: boolean;
    };
  }> {
    // First optimize normal context
    const optimizedResult = await this.prepareOptimizedContext(messages);
    let enhancedMessages = [...optimizedResult.optimizedMessages];
    let hasTodoistContext = false;

    // Add Todoist context if available
    if (this.todoistAIService) {
      try {
        const todoistContext = await this.todoistAIService.getTodoistContext();
        
        // Create a system message with Todoist context
         const todoistContextMessage: Message = {
           id: `todoist-context-${Date.now()}`,
           role: 'system',
           content: `[CURRENT TODOIST CONTEXT]\n${todoistContext}\n\n[AVAILABLE TOOLS]\nYou have access to tools for managing tasks and projects in Todoist. Use these tools when the user wants to create, modify, complete or search for tasks/projects.`,
           timestamp: new Date(),
           metadata: {
             sessionId: messages[0]?.metadata?.sessionId || 'default'
           }
         };

        // Insert Todoist context at the beginning (after any summaries)
        const systemMessages = enhancedMessages.filter(m => m.role === 'system');
        const otherMessages = enhancedMessages.filter(m => m.role !== 'system');
        
        enhancedMessages = [
          ...systemMessages,
          todoistContextMessage,
          ...otherMessages
        ];

        hasTodoistContext = true;
      } catch (error) {
        logger.warn('Error retrieving Todoist context:', error);
      }
    }

    const finalTokens = this.calculateTotalTokens(enhancedMessages);
    const finalStatus = this.getContextStatus(enhancedMessages);

    return {
      enhancedMessages,
      contextInfo: {
        originalTokens: optimizedResult.contextInfo.originalTokens,
        finalTokens,
        wasSummarized: optimizedResult.contextInfo.wasSummarized,
        status: finalStatus.status,
        hasTodoistContext
      }
    };
  }

  /**
   * Format context information for UI
   */
  public formatContextInfo(messages: Message[]): string {
    const status = this.getContextStatus(messages);
    
    const statusEmoji = {
      safe: '🟢',
      warning: '🟡', 
      critical: '🔴'
    }[status.status];

    return `${statusEmoji} ${status.percentage}% (${status.totalTokens}/${status.maxTokens})`;
  }

  /**
   * Get textual description of context status
   */
  public getContextDescription(messages: Message[]): string {
    const status = this.getContextStatus(messages);
    
    switch (status.status) {
      case 'safe':
        return 'Normal context';
      case 'warning':
        return 'Growing context';
      case 'critical':
        return 'Critical context - automatic summary active';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Returns the ModelManager to access model configuration
   */
  public getModelManager(): ModelManager {
    return this.modelManager;
  }
}