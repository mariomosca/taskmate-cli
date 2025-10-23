import { Message, AppConfig } from '../types/index.js';
import { LLMService } from './LLMService.js';
import { DatabaseService } from './DatabaseService.js';
import { TodoistAIService } from './TodoistAIService.js';
import { PromptProcessor, SUMMARIZE_SESSION } from '../prompts/templates.js';

/**
 * Gestisce il contesto delle conversazioni e il token counting
 */
export class ContextManager {
  private llmService: LLMService;
  private todoistAIService?: TodoistAIService;
  private maxTokens: number;
  private warningThreshold: number; // Percentuale di warning (es. 80%)
  private criticalThreshold: number; // Percentuale critica per summarize (es. 90%)

  constructor(llmService: LLMService, todoistAIService?: TodoistAIService) {
    this.llmService = llmService;
    this.todoistAIService = todoistAIService;
    // Prende i max tokens dalla configurazione, con fallback
    this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '8192');
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
   * Stima approssimativa dei token per un testo
   * Usa una regola empirica: ~4 caratteri per token per l'inglese, ~3 per l'italiano
   */
  private estimateTokens(text: string): number {
    // Rimuovi spazi multipli e normalizza
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    
    // Stima conservativa: 3 caratteri per token (per essere sicuri)
    return Math.ceil(normalizedText.length / 3);
  }

  /**
   * Calcola i token totali per una lista di messaggi
   */
  public calculateTotalTokens(messages: Message[]): number {
    return messages.reduce((total, message) => {
      return total + this.estimateTokens(message.content);
    }, 0);
  }

  /**
   * Verifica se il contesto è vicino al limite
   */
  public getContextStatus(messages: Message[]): {
    totalTokens: number;
    maxTokens: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical';
    needsSummarization: boolean;
  } {
    const totalTokens = this.calculateTotalTokens(messages);
    const percentage = totalTokens / this.maxTokens;

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    if (percentage >= this.criticalThreshold) {
      status = 'critical';
    } else if (percentage >= this.warningThreshold) {
      status = 'warning';
    }

    return {
      totalTokens,
      maxTokens: this.maxTokens,
      percentage: Math.round(percentage * 100),
      status,
      needsSummarization: percentage >= this.criticalThreshold
    };
  }

  /**
   * Riassume automaticamente il contesto quando necessario
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

    try {
      // Mantieni sempre gli ultimi 3 messaggi per continuità
      const recentMessages = messages.slice(-3);
      const messagesToSummarize = messages.slice(0, -3);

      if (messagesToSummarize.length === 0) {
        // Se abbiamo solo 3 messaggi o meno, non possiamo riassumere
        return {
          messages,
          wasSummarized: false
        };
      }

      // Prepara il contenuto per il riassunto
      const chatHistory = messagesToSummarize
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Usa il template per il riassunto
      const summaryPrompt = PromptProcessor.process(
        SUMMARIZE_SESSION,
        { chatHistory }
      );

      // Genera il riassunto
      const summary = await this.llmService.summarizeContext(chatHistory);

      // Crea un nuovo messaggio di sistema con il riassunto
      const summaryMessage: Message = {
        id: `summary-${Date.now()}`,
        role: 'system',
        content: `[RIASSUNTO CONVERSAZIONE PRECEDENTE]\n${summary}`,
        timestamp: new Date(),
        metadata: {
          sessionId: messages[0]?.metadata?.sessionId || 'default'
        }
      };

      // Ritorna il riassunto + messaggi recenti
      const newMessages = [summaryMessage, ...recentMessages];

      return {
        messages: newMessages,
        wasSummarized: true,
        summary
      };

    } catch (error) {
      console.error('Errore durante il riassunto del contesto:', error);
      
      // Fallback: mantieni solo gli ultimi 5 messaggi
      return {
        messages: messages.slice(-5),
        wasSummarized: false
      };
    }
  }

  /**
   * Prepara il contesto ottimizzato per l'LLM
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

    // Prova a riassumere se necessario
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
   * Prepara il contesto arricchito con informazioni Todoist per l'AI
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
    // Prima ottimizza il contesto normale
    const optimizedResult = await this.prepareOptimizedContext(messages);
    let enhancedMessages = [...optimizedResult.optimizedMessages];
    let hasTodoistContext = false;

    // Aggiungi contesto Todoist se disponibile
    if (this.todoistAIService) {
      try {
        const todoistContext = await this.todoistAIService.getTodoistContext();
        
        // Crea un messaggio di sistema con il contesto Todoist
         const todoistContextMessage: Message = {
           id: `todoist-context-${Date.now()}`,
           role: 'system',
           content: `[CONTESTO TODOIST ATTUALE]\n${todoistContext}\n\n[STRUMENTI DISPONIBILI]\nHai accesso a strumenti per gestire task e progetti in Todoist. Usa questi strumenti quando l'utente vuole creare, modificare, completare o cercare task/progetti.`,
           timestamp: new Date(),
           metadata: {
             sessionId: messages[0]?.metadata?.sessionId || 'default'
           }
         };

        // Inserisci il contesto Todoist all'inizio (dopo eventuali riassunti)
        const systemMessages = enhancedMessages.filter(m => m.role === 'system');
        const otherMessages = enhancedMessages.filter(m => m.role !== 'system');
        
        enhancedMessages = [
          ...systemMessages,
          todoistContextMessage,
          ...otherMessages
        ];

        hasTodoistContext = true;
      } catch (error) {
        console.warn('Errore nel recupero del contesto Todoist:', error);
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
   * Formatta le informazioni del contesto per la UI
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
   * Ottiene una descrizione testuale dello stato del contesto
   */
  public getContextDescription(messages: Message[]): string {
    const status = this.getContextStatus(messages);
    
    switch (status.status) {
      case 'safe':
        return 'Contesto normale';
      case 'warning':
        return 'Contesto in crescita';
      case 'critical':
        return 'Contesto critico - riassunto automatico attivo';
      default:
        return 'Stato sconosciuto';
    }
  }
}