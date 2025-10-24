import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { PromptProcessor, SUMMARIZE_CONTEXT } from '../prompts/templates.js';
import { TodoistAIService, TodoistTool } from './TodoistAIService.js';
import { EnhancedContextManager } from './EnhancedContextManager.js';
import { CostMonitor } from './CostMonitor.js';
import { APIMetadataService } from './APIMetadataService.js';
import { ModelManager } from './ModelManager.js';

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
    this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'claude';
    this.todoistAIService = todoistAIService;
    
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.anthropic = new Anthropic({
        apiKey: anthropicKey,
      });
    }
    
    // Initialize enhanced services
    this.modelManager = new ModelManager();
    this.enhancedContextManager = new EnhancedContextManager(undefined, this.modelManager);
    this.costMonitor = new CostMonitor(this.modelManager);
    this.apiMetadataService = new APIMetadataService();
  }

  /**
   * Set the TodoistAIService for function calling
   */
  setTodoistAIService(todoistAIService: TodoistAIService): void {
    this.todoistAIService = todoistAIService;
  }

  async chat(messages: LLMMessage[], provider?: string): Promise<LLMResponse> {
    const selectedProvider = provider || this.defaultProvider;

    switch (selectedProvider) {
      case 'claude':
        return this.chatWithClaude(messages);
      case 'gemini':
        return this.chatWithGemini(messages);
      default:
        throw new Error(`Provider ${selectedProvider} non supportato`);
    }
  }

  /**
   * Chat with function calling support for Todoist operations
   */
  async chatWithTools(messages: LLMMessage[], provider?: string): Promise<LLMResponse> {
    if (!this.todoistAIService) {
      // Fallback to regular chat if no Todoist service
      return this.chat(messages, provider);
    }

    const selectedProvider = provider || this.defaultProvider;

    switch (selectedProvider) {
      case 'claude':
        return this.chatWithClaudeTools(messages);
      case 'gemini':
        // Gemini function calling implementation would go here
        // For now, fallback to regular chat
        return this.chatWithGemini(messages);
      default:
        throw new Error(`Provider ${selectedProvider} non supportato`);
    }
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
      throw new Error('Chiave API Claude non configurata');
    }

    // Separa i messaggi di sistema dagli altri
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemContent = systemMessages.map(m => m.content).join('\n\n');

    // Use ModelManager to get current model and its configuration
    const currentModel = this.modelManager.getCurrentModel();
    const modelConfig = this.modelManager.getModelConfig(currentModel);
    console.log(`[DEBUG] Using model: ${currentModel}, context window: ${modelConfig.contextWindow}`);

    try {
      const response = await this.anthropic.messages.create({
        model: currentModel,
        max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || modelConfig.maxOutputTokens.toString()),
        temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
        system: systemContent || undefined,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return {
          content: content.text,
          usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens
          }
        };
      }

      throw new Error('Risposta non valida da Claude');
    } catch (error) {
      console.error('Errore chiamata Claude:', error);
      throw new Error(`Errore Claude: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
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
      throw new Error('Claude o TodoistAIService non configurato');
    }

    // Get current model configuration
    const currentModel = this.modelManager.getCurrentModel();
    const modelConfig = this.modelManager.getModelConfig(currentModel);
    
    // Check context status before making the request
    const contextStatus = await this.enhancedContextManager.getContextStatus(messages, currentModel);
    
    if (contextStatus.status === 'critical') {
      console.warn('Context window critical:', contextStatus.recommendedAction);
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
        max_tokens: Math.min(modelConfig?.maxOutputTokens || 4096, parseInt(process.env.CLAUDE_MAX_TOKENS || '4096')),
        temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
        system: enhancedSystemContent,
        tools: claudeTools,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      });

      // Gestisci tool calls se presenti
      const toolCalls: ToolCall[] = [];
      const toolResults: ToolResult[] = [];
      let hasToolCalls = false;

      for (const content of response.content) {
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
             content: response.content.find(c => c.type === 'text')?.text || 'Sto eseguendo le operazioni richieste...'
           },
           {
             role: 'user' as const,
             content: `I tool sono stati eseguiti con i seguenti risultati:\n\n${toolResultsContent}\n\nPer favore, elabora questi risultati e fornisci una risposta user-friendly in italiano, riassumendo le informazioni in modo chiaro e utile.`
           }
         ];

        const followUpResponse = await this.anthropic.messages.create({
          model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
          max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
          temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
          system: enhancedSystemContent,
          messages: followUpMessages
        });

        const finalContent = followUpResponse.content.find(c => c.type === 'text')?.text || 'Operazione completata.';
        
        const totalUsage = {
          input_tokens: response.usage.input_tokens + followUpResponse.usage.input_tokens,
          output_tokens: response.usage.output_tokens + followUpResponse.usage.output_tokens
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
      const responseContent = response.content.find(c => c.type === 'text')?.text || '';
      
      // Record usage for cost monitoring and API metadata
      await this.recordUsageAndMetadata(
        currentModel,
        'claude',
        messages,
        responseContent,
        response.usage.input_tokens,
        response.usage.output_tokens,
        estimatedInputTokens,
        estimatedOutputTokens,
        'chat'
      );

      return {
        content: responseContent,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        },
        toolCalls
      };
    } catch (error) {
      console.error('Errore chiamata Claude con tools:', error);
      throw new Error(`Errore Claude: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private async chatWithGemini(messages: LLMMessage[]): Promise<LLMResponse> {
    const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      throw new Error('Chiave API Gemini non configurata');
    }

    // Get current model configuration
    const currentModel = this.modelManager.getCurrentModel();
    const modelConfig = this.modelManager.getModelConfig(currentModel);
    
    // Check context status before making the request
    const contextStatus = await this.enhancedContextManager.getContextStatus(messages, currentModel);
    
    if (contextStatus.status === 'critical') {
      console.warn('Context window critical:', contextStatus.recommendedAction);
      // Optimize context if critical
      const optimized = await this.enhancedContextManager.optimizeContext(messages, 0.3, currentModel);
      messages = optimized.optimizedMessages;
    }

    try {
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
        throw new Error('Risposta non valida da Gemini');
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
    } catch (error) {
      console.error('Errore chiamata Gemini:', error);
      throw new Error(`Errore Gemini: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private async chatWithGeminiTools(messages: LLMMessage[]): Promise<LLMResponse> {
    // Per ora, Gemini con tools non è implementato completamente
    // Fallback al metodo normale
    console.warn('Function calling con Gemini non ancora implementato, uso metodo normale');
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