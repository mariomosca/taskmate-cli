import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { PromptProcessor, SUMMARIZE_CONTEXT } from '../prompts/templates.js';
import { TodoistAIService, TodoistTool } from './TodoistAIService.js';
import { EnhancedContextManager } from './EnhancedContextManager.js';
import { CostMonitor } from './CostMonitor.js';
import { APIMetadataService } from './APIMetadataService.js';
import { ModelManager } from './ModelManager.js';
import { ContextManager } from './ContextManager.js';
import { TokenCounter } from './TokenCounter.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { ErrorType } from '../types/errors.js';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export interface ToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

export class LLMService {
  private anthropic?: Anthropic;
  private defaultProvider: string;
  private todoistAIService?: TodoistAIService;
  private enhancedContextManager: EnhancedContextManager;
  private costMonitor: CostMonitor;
  private apiMetadataService: APIMetadataService;
  private modelManager: ModelManager;

  constructor(todoistAIService?: TodoistAIService) {
    logger.debug('LLMService constructor starting...');
    
    this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'claude';
    logger.debug(`LLMService defaultProvider set to: ${this.defaultProvider}`);
    
    this.todoistAIService = todoistAIService;
    
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    logger.debug(`Anthropic key available: ${!!anthropicKey}`);
    
    if (anthropicKey) {
      logger.debug('Initializing Anthropic client...');
      this.anthropic = new Anthropic({
        apiKey: anthropicKey,
      });
      logger.debug('Anthropic client initialized successfully');
    }
    
    // Initialize enhanced services
    logger.debug('Initializing ModelManager...');
    this.modelManager = new ModelManager(process.env.DEFAULT_MODEL);
    
    logger.debug('Initializing EnhancedContextManager...');
    this.enhancedContextManager = new EnhancedContextManager(undefined, this.modelManager);

    logger.debug('Initializing CostMonitor...');
    this.costMonitor = new CostMonitor(this.modelManager);
    
    logger.debug('Initializing APIMetadataService...');
    this.apiMetadataService = new APIMetadataService();
    
    logger.debug('LLMService constructor completed successfully');
  }

  /**
   * Set the TodoistAIService for function calling
   */
  setTodoistAIService(todoistAIService: TodoistAIService): void {
    this.todoistAIService = todoistAIService;
  }

  async chat(messages: LLMMessage[], provider?: string): Promise<LLMResponse> {
    const selectedProvider = provider || this.defaultProvider;
    logger.debug('Chat method called', {
      provider,
      defaultProvider: this.defaultProvider,
      selectedProvider
    });

    return await errorHandler.executeWithRetry(
      async () => {
        switch (selectedProvider) {
          case 'claude':
            logger.debug('Using Claude provider');
            return this.chatWithClaude(messages);
          case 'gemini':
            logger.debug('Using Gemini provider');
            return this.chatWithGemini(messages);
          default:
            throw errorHandler.createValidationError(
              `Provider ${selectedProvider} non supportato`,
              {
                operation: 'chat',
                component: 'LLMService',
                metadata: { provider: selectedProvider, availableProviders: this.getAvailableProviders() }
              }
            );
        }
      },
      {
        operation: 'chat',
        component: 'LLMService',
        metadata: { 
          provider: selectedProvider, 
          messageCount: messages.length,
          availableProviders: this.getAvailableProviders()
        }
      }
    );
  }

  /**
   * Chat with function calling support for Todoist operations
   */
  async chatWithTools(messages: LLMMessage[], provider?: string): Promise<LLMResponse> {
    if (!this.todoistAIService) {
      // Fallback to regular chat if no Todoist service
      logger.debug('No Todoist service, falling back to regular chat');
      return this.chat(messages, provider);
    }

    const selectedProvider = provider || this.defaultProvider;
    logger.debug('ChatWithTools called', {
      hasTodoistService: !!this.todoistAIService,
      provider,
      defaultProvider: this.defaultProvider,
      selectedProvider
    });

    return await errorHandler.executeWithRetry(
      async () => {
        switch (selectedProvider) {
          case 'claude':
            logger.debug('Using Claude provider with tools');
            return this.chatWithClaudeTools(messages);
          case 'gemini':
            // Gemini function calling implementation would go here
            // For now, fallback to regular chat
            logger.debug('Using Gemini provider (fallback to regular chat)');
            return this.chatWithGemini(messages);
          default:
            throw errorHandler.createValidationError(
              `Provider ${selectedProvider} non supportato in chatWithTools`,
              {
                operation: 'chatWithTools',
                component: 'LLMService',
                metadata: { provider: selectedProvider, availableProviders: this.getAvailableProviders() }
              }
            );
        }
      },
      {
        operation: 'chatWithTools',
        component: 'LLMService',
        metadata: { 
          provider: selectedProvider, 
          messageCount: messages.length,
          hasTodoistService: !!this.todoistAIService,
          availableProviders: this.getAvailableProviders()
        }
      }
    );
  }

  async summarizeContext(chatHistory: string): Promise<string> {
    // Usa il template centralizzato per il riassunto
    const prompt = PromptProcessor.process(SUMMARIZE_CONTEXT, { chatHistory });
    
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.chat(messages);
    return response.content;
  }

  private async chatWithClaude(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw errorHandler.createAuthenticationError(
        'Chiave API Claude non configurata',
        {
          operation: 'chatWithClaude',
          component: 'LLMService',
          metadata: { provider: 'claude' }
        }
      );
    }

    // Separa i messaggi di sistema dagli altri
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemContent = systemMessages.map(m => m.content).join('\n\n');

    // Use ModelManager to get current model and its configuration
    const currentModel = this.modelManager.getCurrentModel();
    const modelConfig = this.modelManager.getModelConfig(currentModel);
    logger.debug(`Using model: ${currentModel}, context window: ${modelConfig.contextWindow}`);

    return await errorHandler.executeWithRetry(
      async () => {
        const stream = await this.anthropic!.messages.create({
          model: currentModel,
          max_tokens: modelConfig.maxOutputTokens,
          temperature: 0.7,
          system: systemContent || undefined,
          messages: conversationMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })),
          stream: true
        });

        let fullContent = '';
        let inputTokens = 0;
        let outputTokens = 0;

        // Process the streaming response
        for await (const chunk of stream) {
          if (chunk.type === 'message_start') {
            inputTokens = chunk.message.usage.input_tokens;
          } else if (chunk.type === 'content_block_delta') {
            if (chunk.delta.type === 'text_delta') {
              fullContent += chunk.delta.text;
            }
          } else if (chunk.type === 'message_delta') {
            if (chunk.usage) {
              outputTokens = chunk.usage.output_tokens;
            }
          }
        }

        // Debug logging per vedere la risposta completa di Claude
        logger.debug('Claude API Streaming Response', {
          fullContent,
          contentLength: fullContent.length,
          inputTokens,
          outputTokens
        });
        
        logger.debug('Claude streaming response completed', {
          contentLength: fullContent.length,
          inputTokens,
          outputTokens
        });

        if (fullContent) {
          logger.debug('Claude text response details', {
            textValue: fullContent,
            textType: typeof fullContent,
            textLength: fullContent.length
          });
          
          return {
            content: fullContent,
            usage: {
              input_tokens: inputTokens,
              output_tokens: outputTokens
            }
          };
        }

        throw errorHandler.createLLMError(
            ErrorType.LLM_ERROR,
            'Risposta non valida da Claude',
            {
              operation: 'chatWithClaude',
              component: 'LLMService',
              metadata: { model: currentModel, provider: 'claude' }
            }
          );
       },
       {
         operation: 'chatWithClaude',
         component: 'LLMService',
         metadata: { model: currentModel, provider: 'claude', messageCount: messages.length }
       }
    );
  }

  private async recordUsageAndMetadata(
    model: string,
    provider: 'claude' | 'gemini',
    messages: LLMMessage[],
    response: string,
    actualInputTokens: number,
    actualOutputTokens: number,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    operation: string
  ): Promise<void> {
    // Record cost monitoring
    await this.costMonitor.recordUsage(
      model,
      actualInputTokens,
      actualOutputTokens,
      operation
    );

    // Record API metadata
    const inputText = messages.map(m => m.content).join('\n');
    await this.apiMetadataService.recordAPIUsage(
      model,
      provider,
      inputText,
      response,
      actualInputTokens,
      actualOutputTokens,
      estimatedInputTokens,
      estimatedOutputTokens,
      operation
    );
  }

  private async chatWithClaudeTools(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.anthropic || !this.todoistAIService) {
      throw errorHandler.createConfigError('Claude o TodoistAIService non configurato');
    }

    // Get current model configuration
    const currentModel = this.modelManager.getCurrentModel();
    const modelConfig = this.modelManager.getModelConfig(currentModel);
    
    // Check context status before making the request
    const contextStatus = await this.enhancedContextManager.getContextStatus(messages, currentModel);
    
    if (contextStatus.status === 'critical') {
      logger.warn('Context window critical:', contextStatus.recommendedAction);
      // Optimize context if critical
      const optimized = await this.enhancedContextManager.optimizeContext(messages, 0.3, currentModel);
      messages = optimized.optimizedMessages;
    }

    // Separa i messaggi di sistema dagli altri
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Aggiungi contesto Todoist al system prompt
    const todoistContext = await this.todoistAIService.getTodoistContext();
    const enhancedSystemContent = [
      ...systemMessages.map(m => m.content),
      `\n**CONTESTO TODOIST:**\n${todoistContext}`,
      `\n**STRUMENTI DISPONIBILI:**\nHai accesso a strumenti per gestire task e progetti in Todoist. Usa questi strumenti quando l'utente vuole creare, modificare, completare o cercare task/progetti.`
    ].join('\n\n');

    // Prepara i tools per Claude
    const availableTools = this.todoistAIService.getAvailableTools();
    const claudeTools = availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));

    // Estimate tokens for cost monitoring
    const tokenResult = await this.enhancedContextManager.getTokenCounter().countMessagesTokens(messages, currentModel);
    const estimatedInputTokens = tokenResult.tokens;
    const estimatedOutputTokens = modelConfig?.maxOutputTokens || 4096;

    try {
      const response = await this.anthropic.messages.create({
        model: currentModel,
        max_tokens: modelConfig.maxOutputTokens,
        temperature: 0.7,
        system: enhancedSystemContent,
        tools: claudeTools,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        stream: true
      });

      // Handle streaming response for initial call
      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;
      const content: any[] = [];

      for await (const chunk of response) {
        if (chunk.type === 'content_block_start') {
          content.push(chunk.content_block);
        } else if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            fullContent += chunk.delta.text;
            // Update the text content in the content array
            const textBlock = content.find(c => c.type === 'text');
            if (textBlock) {
              textBlock.text = (textBlock.text || '') + chunk.delta.text;
            }
          } else if (chunk.delta.type === 'input_json_delta') {
            // Handle tool use input accumulation
            const toolBlock = content.find(c => c.type === 'tool_use' && c.id === chunk.index);
            if (toolBlock) {
              toolBlock.input = (toolBlock.input || '') + chunk.delta.partial_json;
            }
          }
        } else if (chunk.type === 'message_start') {
          inputTokens = chunk.message.usage.input_tokens;
        } else if (chunk.type === 'message_delta' && chunk.usage) {
          outputTokens = chunk.usage.output_tokens;
        }
      }

      // Parse tool use inputs that were accumulated as JSON strings
      for (const block of content) {
        if (block.type === 'tool_use' && typeof block.input === 'string') {
          try {
            block.input = JSON.parse(block.input);
          } catch (e) {
            logger.error('Failed to parse tool input JSON', { input: block.input, error: e });
          }
        }
      }

      // Create a response object that matches the expected structure
      const processedResponse = {
        content,
        usage: { input_tokens: inputTokens, output_tokens: outputTokens }
      };

      // Debug logging per la risposta iniziale di Claude con tools
      logger.debug('Initial Claude response with tools', {
        fullResponse: processedResponse,
        contentArray: processedResponse.content
      });

      // Gestisci tool calls se presenti
      const toolCalls: ToolCall[] = [];
      const toolResults: ToolResult[] = [];
      let hasToolCalls = false;

      for (const content of processedResponse.content) {
        if (content.type === 'tool_use') {
          hasToolCalls = true;
          toolCalls.push({
            id: content.id,
            name: content.name,
            parameters: content.input
          });

          // Esegui il tool call
          try {
            const result = await this.todoistAIService.executeTool(content.name, content.input);
            toolResults.push({
              toolCallId: content.id,
              result: result,
              error: result.success ? undefined : result.message
            });
          } catch (error) {
            toolResults.push({
              toolCallId: content.id,
              result: null,
              error: error instanceof Error ? error.message : 'Errore sconosciuto'
            });
          }
        }
      }

      // Se ci sono stati tool calls, fai una seconda chiamata per elaborare i risultati
      if (hasToolCalls && toolResults.length > 0) {
        const toolResultsContent = toolResults.map(tr => {
          if (tr.error) {
            return `❌ Errore nell'esecuzione del tool: ${tr.error}`;
          }
          return `✅ Tool eseguito con successo:\n${JSON.stringify(tr.result, null, 2)}`;
        }).join('\n\n');

        const followUpMessages = [
           ...conversationMessages.map(msg => ({
             role: msg.role as 'user' | 'assistant',
             content: msg.content
           })),
           {
             role: 'assistant' as const,
             content: processedResponse.content.find((c: any) => c.type === 'text')?.text || 'Sto eseguendo le operazioni richieste...'
           },
           {
             role: 'user' as const,
             content: `I tool sono stati eseguiti con i seguenti risultati:\n\n${toolResultsContent}\n\nPer favore, elabora questi risultati e fornisci una risposta user-friendly in italiano, riassumendo le informazioni in modo chiaro e utile.`
           }
         ];

        const followUpResponse = await this.anthropic.messages.create({
          model: currentModel,
          max_tokens: modelConfig.maxOutputTokens,
          temperature: 0.7,
          system: enhancedSystemContent,
          messages: followUpMessages,
          stream: true
        });

        // Handle streaming response for follow-up
        let followUpContent = '';
        let followUpInputTokens = 0;
        let followUpOutputTokens = 0;

        for await (const chunk of followUpResponse) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            followUpContent += chunk.delta.text;
          } else if (chunk.type === 'message_start') {
            followUpInputTokens = chunk.message.usage.input_tokens;
          } else if (chunk.type === 'message_delta' && chunk.usage) {
            followUpOutputTokens = chunk.usage.output_tokens;
          }
        }

        // Debug logging per la risposta di follow-up
        logger.debug('Claude follow-up response', {
          followUpContent,
          followUpInputTokens,
          followUpOutputTokens
        });

        const finalContent = followUpContent || 'Operazione completata.';
        logger.debug('Final content from follow-up', {
          finalContent,
          finalContentType: typeof finalContent
        });
        
        const totalUsage = {
          input_tokens: processedResponse.usage.input_tokens + followUpInputTokens,
          output_tokens: processedResponse.usage.output_tokens + followUpOutputTokens
        };

        // Record usage for cost monitoring and API metadata
        await this.recordUsageAndMetadata(
          currentModel,
          'claude',
          messages,
          finalContent,
          totalUsage.input_tokens,
          totalUsage.output_tokens,
          estimatedInputTokens,
          estimatedOutputTokens,
          'chat_with_tools'
        );
        
        return {
          content: finalContent,
          usage: totalUsage,
          toolCalls
        };
      }

      // Se non ci sono tool calls, restituisci la risposta normale
      const responseContent = processedResponse.content.find((c: any) => c.type === 'text')?.text || '';
      logger.debug('Normal response content', {
        responseContent,
        responseContentType: typeof responseContent
      });
      
      // Record usage for cost monitoring and API metadata
      await this.recordUsageAndMetadata(
        currentModel,
        'claude',
        messages,
        responseContent,
        processedResponse.usage.input_tokens,
        processedResponse.usage.output_tokens,
        estimatedInputTokens,
        estimatedOutputTokens,
        'chat'
      );

      return {
        content: responseContent,
        usage: {
          input_tokens: processedResponse.usage.input_tokens,
          output_tokens: processedResponse.usage.output_tokens
        },
        toolCalls
      };
    } catch (error) {
      logger.error('Errore chiamata Claude con tools:', error);
      throw errorHandler.createLLMError(
        ErrorType.LLM_ERROR, 
        `Errore Claude: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        { component: 'LLMService', operation: 'chatWithClaudeTools' },
        true
      );
    }
  }

  private async chatWithGemini(messages: LLMMessage[]): Promise<LLMResponse> {
    const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      throw errorHandler.createAuthenticationError(
        'Chiave API Gemini non configurata',
        {
          operation: 'chatWithGemini',
          component: 'LLMService',
          metadata: { provider: 'gemini' }
        }
      );
    }

    // Get current model configuration
    const currentModel = this.modelManager.getCurrentModel();
    const modelConfig = this.modelManager.getModelConfig(currentModel);
    
    // Check context status before making the request
    const contextStatus = await this.enhancedContextManager.getContextStatus(messages, currentModel);
    
    if (contextStatus.status === 'critical') {
      logger.warn('Context window critical:', contextStatus.recommendedAction);
      // Optimize context if critical
      const optimized = await this.enhancedContextManager.optimizeContext(messages, 0.3, currentModel);
      messages = optimized.optimizedMessages;
    }

    return await errorHandler.executeWithRetry(
      async () => {
        // Converti i messaggi nel formato Gemini
        const contents = messages
          .filter(m => m.role !== 'system')
          .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          }));

        const systemInstruction = messages
          .filter(m => m.role === 'system')
          .map(m => m.content)
          .join('\n\n');

        // Estimate tokens for cost monitoring
        const tokenResult = await this.enhancedContextManager.getTokenCounter().countMessagesTokens(messages, currentModel);
        const estimatedInputTokens = tokenResult.tokens;
        const estimatedOutputTokens = modelConfig?.maxOutputTokens || 4096;

        const requestBody = {
          contents,
          generationConfig: {
            temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
            maxOutputTokens: Math.min(modelConfig?.maxOutputTokens || 4096, parseInt(process.env.GEMINI_MAX_TOKENS || '4096')),
          },
          ...(systemInstruction && {
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          })
        };

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${googleApiKey}`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000
          }
        );

        const candidate = response.data.candidates?.[0];
        if (!candidate?.content?.parts?.[0]?.text) {
          throw errorHandler.createLLMError(
            ErrorType.LLM_ERROR,
            'Risposta non valida da Gemini',
            {
              operation: 'chatWithGemini',
              component: 'LLMService',
              metadata: { model: currentModel, provider: 'gemini' }
            }
          );
        }

        const actualInputTokens = response.data.usageMetadata?.promptTokenCount || 0;
        const actualOutputTokens = response.data.usageMetadata?.candidatesTokenCount || 0;
        
        // Record usage for cost monitoring and API metadata
        await this.recordUsageAndMetadata(
          currentModel,
          'gemini',
          messages,
          candidate.content.parts[0].text,
          actualInputTokens,
          actualOutputTokens,
          estimatedInputTokens,
          estimatedOutputTokens,
          'chat'
        );

        return {
          content: candidate.content.parts[0].text,
          usage: {
            input_tokens: actualInputTokens,
            output_tokens: actualOutputTokens
          }
        };
      },
      {
        operation: 'chatWithGemini',
        component: 'LLMService',
        metadata: { model: currentModel, provider: 'gemini', messageCount: messages.length }
      }
    );
  }

  private async chatWithGeminiTools(messages: LLMMessage[]): Promise<LLMResponse> {
    // Per ora, Gemini con tools non è implementato completamente
    // Fallback al metodo normale
    logger.warn('Function calling con Gemini non ancora implementato, uso metodo normale');
    return this.chatWithGemini(messages);
  }

  isConfigured(): boolean {
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    return !!(anthropicKey || googleKey);
  }

  getAvailableProviders(): string[] {
    const providers: string[] = [];
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (anthropicKey) providers.push('claude');
    if (googleKey) providers.push('gemini');
    return providers;
  }

  // Enhanced context management methods
  async getContextStatus(messages: LLMMessage[], model?: string) {
    return this.enhancedContextManager.getContextStatus(messages, model);
  }

  async optimizeContext(messages: LLMMessage[], targetReduction?: number, model?: string) {
    return this.enhancedContextManager.optimizeContext(messages, targetReduction, model);
  }

  async getModelRecommendation(messages: LLMMessage[], requirements?: any) {
    return this.enhancedContextManager.getModelRecommendation(messages, requirements);
  }

  async getCostAnalysis(messages: LLMMessage[], model?: string) {
    return this.enhancedContextManager.getCostAnalysis(messages, model);
  }

  // Cost monitoring methods
  async getDailyCostSummary(date?: Date) {
    return this.costMonitor.getDailySummary(date);
  }

  async getSessionCostSummary(sessionId?: string) {
    return this.costMonitor.getSessionSummary(sessionId);
  }

  async checkCostAlerts() {
    return this.costMonitor.checkAlerts();
  }

  getCurrentSessionCost() {
    return this.costMonitor.getCurrentSessionCost();
  }

  // Model management methods
  getCurrentModel() {
    return this.modelManager.getCurrentModel();
  }

  setCurrentModel(model: string) {
    return this.modelManager.setCurrentModel(model);
  }

  getAvailableModels() {
    return this.modelManager.getAvailableModels();
  }

  getModelConfig(model: string) {
    return this.modelManager.getModelConfig(model);
  }

  getModelManager() {
    return this.modelManager;
  }

  // API metadata methods
  async getModelPerformanceReport(model: string) {
    return this.apiMetadataService.getModelPerformanceReport(model);
  }

  async exportCalibrationReport(format?: 'json' | 'csv') {
    return this.apiMetadataService.exportCalibrationReport(format);
  }
}

export const llmService = new LLMService();