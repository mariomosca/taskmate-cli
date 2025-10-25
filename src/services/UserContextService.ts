import { Session, Message } from '../types/index.js';
import { DatabaseService } from './DatabaseService.js';
import { LLMService } from './LLMService.js';
import { TodoistAIService } from './TodoistAIService.js';
import { logger } from '../utils/logger.js';

/**
 * UserProfile interface for storing analyzed user patterns
 */
interface UserProfile {
  // Usage patterns
  totalSessions: number;
  averageMessagesPerSession: number;
  mostActiveTimeOfDay: string;
  preferredLLMProvider: 'claude' | 'gemini';
  
  // Communication patterns
  communicationStyle: 'formal' | 'casual' | 'technical';
  averageMessageLength: number;
  commonTopics: string[];
  
  // Project patterns
  activeProjects: string[];
  commonTaskTypes: string[];
  goalPatterns: string[];
  
  // Recent context
  recentObjectives: string[];
  currentFocus: string;
  lastSessionSummary: string;
}

/**
 * UserContextService - Analyzes user session history to generate personalized context
 * 
 * This service:
 * - Analyzes recent sessions to understand user patterns and preferences
 * - Generates intelligent user profiles based on conversation history
 * - Creates personalized context summaries for new sessions
 * - Integrates with Todoist to understand current project status
 */
export class UserContextService {
  private db: DatabaseService;
  private llmService: LLMService;
  private todoistAIService?: TodoistAIService;
  private contextCache: Map<string, { context: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly FAST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for quick startup
  private isGenerating: boolean = false;

  constructor(
    dbService: DatabaseService,
    llmService: LLMService,
    todoistAIService?: TodoistAIService
  ) {
    this.db = dbService;
    this.llmService = llmService;
    this.todoistAIService = todoistAIService;
  }

  /**
   * Generate personalized user context based on recent session history
   * 
   * @param sessionLimit Number of recent sessions to analyze (default: 5)
   * @param forceRefresh Force refresh of cached context
   * @returns Personalized context string or null if insufficient data
   */
  /**
   * Generate user context with performance optimizations
   * - Uses fast cache for immediate startup
   * - Supports async generation for better UX
   */
  async generateUserContext(
    sessionLimit: number = 5, 
    forceRefresh: boolean = false,
    allowAsync: boolean = true
  ): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = `user_context_${sessionLimit}`;
      const cached = this.contextCache.get(cacheKey);
      
      if (!forceRefresh && cached) {
        const age = Date.now() - cached.timestamp;
        
        // Return immediately if cache is fresh
        if (age < this.CACHE_DURATION) {
          logger.debug('Returning cached user context');
          return cached.context;
        }
        
        // For startup performance, return slightly stale cache and refresh async
        if (allowAsync && age < this.FAST_CACHE_DURATION && !this.isGenerating) {
          logger.debug('Returning fast cache and refreshing async');
          this.refreshContextAsync(sessionLimit);
          return cached.context;
        }
      }

      return await this.generateFreshContext(sessionLimit);

    } catch (error) {
      logger.error('Error generating user context:', error);
      
      // Return cached context as fallback even if stale
      const cached = this.contextCache.get(`user_context_${sessionLimit}`);
      if (cached) {
        logger.debug('Returning stale cache as fallback');
        return cached.context;
      }
      
      return null;
    }
  }

  /**
   * Generate fresh context (extracted for reuse)
   */
  private async generateFreshContext(sessionLimit: number): Promise<string | null> {
    logger.debug('Generating fresh user context...');
    
    // Get recent sessions
    const recentSessions = await this.db.getRecentSessions(sessionLimit);
    
    if (recentSessions.length === 0) {
      logger.debug('No recent sessions found for context generation');
      return null;
    }

    // Load messages for each session
    const sessionsWithMessages = await Promise.all(
      recentSessions.map(async (session) => {
        const messages = await this.db.getSessionMessages(session.id);
        return { ...session, messages };
      })
    );

    // Filter sessions with meaningful content (at least 2 messages)
    const meaningfulSessions = sessionsWithMessages.filter(session => 
      session.messages.length >= 2
    );

    if (meaningfulSessions.length === 0) {
      logger.debug('No meaningful sessions found for context generation');
      return null;
    }

    // Analyze user patterns
    const userProfile = await this.analyzeUserPatterns(meaningfulSessions);
    
    // Generate context summary
    const contextSummary = await this.generateContextSummary(userProfile, meaningfulSessions);
    
    // Cache the result
    this.contextCache.set(`user_context_${sessionLimit}`, {
      context: contextSummary,
      timestamp: Date.now()
    });

    logger.info(`Generated user context from ${meaningfulSessions.length} sessions`);
    return contextSummary;
  }

  /**
   * Refresh context asynchronously for better performance
   */
  private async refreshContextAsync(sessionLimit: number): Promise<void> {
    if (this.isGenerating) {
      return; // Avoid multiple concurrent generations
    }

    this.isGenerating = true;
    try {
      await this.generateFreshContext(sessionLimit);
      logger.debug('Async context refresh completed');
    } catch (error) {
      logger.error('Error in async context refresh:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Analyze user patterns from session history
   */
  private async analyzeUserPatterns(sessions: Session[]): Promise<UserProfile> {
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const userMessages = sessions.flatMap(session => 
      session.messages.filter(msg => msg.role === 'user')
    );

    // Analyze LLM provider preference
    const providerCounts = sessions.reduce((counts, session) => {
      counts[session.llmProvider] = (counts[session.llmProvider] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const preferredProvider = Object.entries(providerCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as 'claude' | 'gemini' || 'claude';

    // Analyze communication style
    const avgMessageLength = userMessages.length > 0 
      ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length
      : 0;

    const communicationStyle = this.determineCommunicationStyle(userMessages);
    
    // Extract common topics and patterns
    const commonTopics = await this.extractCommonTopics(userMessages);
    const goalPatterns = await this.extractGoalPatterns(sessions);
    
    // Get current Todoist context if available
    let activeProjects: string[] = [];
    let commonTaskTypes: string[] = [];
    
    if (this.todoistAIService) {
        try {
          const todoistContext = await this.todoistAIService.getTodoistContext();
          if (todoistContext) {
            activeProjects = this.extractProjectNames(todoistContext);
            commonTaskTypes = this.extractTaskTypes(todoistContext);
          }
        } catch (error) {
          logger.debug('Could not fetch Todoist context:', error);
        }
      }

    // Analyze time patterns
    const mostActiveTimeOfDay = this.analyzeMostActiveTime(sessions);
    
    // Get recent objectives and current focus
    const recentObjectives = await this.extractRecentObjectives(sessions.slice(0, 3));
    const currentFocus = await this.determinCurrentFocus(sessions[0]);
    const lastSessionSummary = await this.generateLastSessionSummary(sessions[0]);

    return {
      totalSessions: sessions.length,
      averageMessagesPerSession: totalMessages / sessions.length,
      mostActiveTimeOfDay,
      preferredLLMProvider: preferredProvider,
      communicationStyle,
      averageMessageLength: avgMessageLength,
      commonTopics,
      activeProjects,
      commonTaskTypes,
      goalPatterns,
      recentObjectives,
      currentFocus,
      lastSessionSummary
    };
  }

  /**
   * Generate intelligent context summary using LLM
   */
  private async generateContextSummary(profile: UserProfile, sessions: Session[]): Promise<string> {
    const contextPrompt = `
Analizza il profilo utente e genera un contesto personalizzato conciso per iniziare una nuova sessione.

PROFILO UTENTE:
- Sessioni recenti: ${profile.totalSessions}
- Messaggi medi per sessione: ${profile.averageMessagesPerSession.toFixed(1)}
- Orario più attivo: ${profile.mostActiveTimeOfDay}
- Provider AI preferito: ${profile.preferredLLMProvider}
- Stile comunicazione: ${profile.communicationStyle}
- Lunghezza media messaggi: ${profile.averageMessageLength.toFixed(0)} caratteri

ARGOMENTI COMUNI:
${profile.commonTopics.join(', ')}

PROGETTI ATTIVI:
${profile.activeProjects.length > 0 ? profile.activeProjects.join(', ') : 'Nessun progetto Todoist attivo'}

TIPI DI TASK COMUNI:
${profile.commonTaskTypes.join(', ')}

OBIETTIVI RECENTI:
${profile.recentObjectives.join('\n')}

FOCUS ATTUALE:
${profile.currentFocus}

ULTIMA SESSIONE:
${profile.lastSessionSummary}

Genera un messaggio di contesto personalizzato (massimo 200 parole) che:
1. Riconosca i pattern di utilizzo dell'utente
2. Evidenzi i progetti e obiettivi attuali
3. Suggerisca come posso aiutare oggi
4. Mantenga un tono ${profile.communicationStyle === 'formal' ? 'professionale' : profile.communicationStyle === 'casual' ? 'amichevole' : 'tecnico'}

Inizia con "🧠 Contesto Personalizzato:" e mantieni il messaggio conciso ma informativo.
`;

    try {
      const response = await this.llmService.chat([{
        role: 'user',
        content: contextPrompt
      }]);

      return response.content;
    } catch (error) {
      logger.error('Error generating context summary with LLM:', error);
      
      // Fallback to template-based summary
      return this.generateFallbackContextSummary(profile);
    }
  }

  /**
   * Generate fallback context summary without LLM
   */
  private generateFallbackContextSummary(profile: UserProfile): string {
    const greeting = profile.communicationStyle === 'formal' ? 'Buongiorno' : 'Ciao';
    const projects = profile.activeProjects.length > 0 
      ? `\n📋 Progetti attivi: ${profile.activeProjects.slice(0, 3).join(', ')}`
      : '';
    
    const topics = profile.commonTopics.length > 0
      ? `\n🎯 Argomenti frequenti: ${profile.commonTopics.slice(0, 3).join(', ')}`
      : '';

    const focus = profile.currentFocus 
      ? `\n🔍 Focus attuale: ${profile.currentFocus}`
      : '';

    return `🧠 Contesto Personalizzato:

${greeting}! Basandomi sulle tue ultime ${profile.totalSessions} sessioni, vedo che preferisci ${profile.preferredLLMProvider} e hai uno stile ${profile.communicationStyle}. Sei più attivo ${profile.mostActiveTimeOfDay}.${projects}${topics}${focus}

Come posso aiutarti oggi? Sono pronto ad assistere con i tuoi progetti e obiettivi!`;
  }

  // Helper methods for pattern analysis

  private determineCommunicationStyle(messages: Message[]): 'formal' | 'casual' | 'technical' {
    if (messages.length === 0) return 'casual';

    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    // Count formal indicators
    const formalWords = ['prego', 'cortesemente', 'gentilmente', 'ringrazio', 'distinti saluti'];
    const formalCount = formalWords.reduce((count, word) => 
      count + (content.match(new RegExp(word, 'g'))?.length || 0), 0);

    // Count technical indicators
    const technicalWords = ['api', 'database', 'function', 'class', 'method', 'algorithm', 'implementation'];
    const technicalCount = technicalWords.reduce((count, word) => 
      count + (content.match(new RegExp(word, 'g'))?.length || 0), 0);

    // Count casual indicators
    const casualWords = ['ciao', 'ok', 'perfetto', 'grazie', 'bene', 'ottimo'];
    const casualCount = casualWords.reduce((count, word) => 
      count + (content.match(new RegExp(word, 'g'))?.length || 0), 0);

    if (technicalCount > formalCount && technicalCount > casualCount) return 'technical';
    if (formalCount > casualCount) return 'formal';
    return 'casual';
  }

  private async extractCommonTopics(messages: Message[]): Promise<string[]> {
    // Simple keyword extraction - could be enhanced with NLP
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    const keywords = [
      'progetto', 'task', 'obiettivo', 'sviluppo', 'codice', 'programmazione',
      'design', 'marketing', 'business', 'analisi', 'report', 'meeting',
      'deadline', 'priorità', 'planning', 'strategia', 'team', 'cliente'
    ];

    return keywords.filter(keyword => 
      content.includes(keyword)
    ).slice(0, 5);
  }

  private async extractGoalPatterns(sessions: Session[]): Promise<string[]> {
    const goalKeywords = ['obiettivo', 'goal', 'target', 'raggiungere', 'completare', 'finire'];
    const patterns: string[] = [];

    for (const session of sessions.slice(0, 3)) {
      const userMessages = session.messages.filter(m => m.role === 'user');
      for (const message of userMessages) {
        if (goalKeywords.some(keyword => message.content.toLowerCase().includes(keyword))) {
          // Extract sentence containing goal
          const sentences = message.content.split(/[.!?]/);
          const goalSentence = sentences.find(s => 
            goalKeywords.some(keyword => s.toLowerCase().includes(keyword))
          );
          if (goalSentence && goalSentence.trim().length > 10) {
            patterns.push(goalSentence.trim().substring(0, 100));
          }
        }
      }
    }

    return patterns.slice(0, 3);
  }

  private extractProjectNames(todoistContext: string): string[] {
    // Extract project names from Todoist context
    const projectMatches = todoistContext.match(/Progetto: ([^,\n]+)/g);
    return projectMatches 
      ? projectMatches.map(match => match.replace('Progetto: ', '')).slice(0, 5)
      : [];
  }

  private extractTaskTypes(todoistContext: string): string[] {
    // Extract common task types
    const taskTypes = ['riunione', 'call', 'email', 'report', 'analisi', 'sviluppo', 'design', 'review'];
    const content = todoistContext.toLowerCase();
    
    return taskTypes.filter(type => content.includes(type)).slice(0, 3);
  }

  private analyzeMostActiveTime(sessions: Session[]): string {
    const hourCounts = new Array(24).fill(0);
    
    sessions.forEach(session => {
      session.messages.forEach(message => {
        const hour = message.timestamp.getHours();
        hourCounts[hour]++;
      });
    });

    const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
    
    if (mostActiveHour >= 6 && mostActiveHour < 12) return 'mattina';
    if (mostActiveHour >= 12 && mostActiveHour < 18) return 'pomeriggio';
    if (mostActiveHour >= 18 && mostActiveHour < 22) return 'sera';
    return 'notte';
  }

  private async extractRecentObjectives(recentSessions: Session[]): Promise<string[]> {
    const objectives: string[] = [];
    
    for (const session of recentSessions) {
      const userMessages = session.messages.filter(m => m.role === 'user');
      for (const message of userMessages) {
        // Look for objective-related content
        if (message.content.toLowerCase().includes('voglio') || 
            message.content.toLowerCase().includes('devo') ||
            message.content.toLowerCase().includes('obiettivo')) {
          const shortObjective = message.content.substring(0, 80) + '...';
          objectives.push(shortObjective);
        }
      }
    }

    return objectives.slice(0, 3);
  }

  private async determinCurrentFocus(lastSession: Session): Promise<string> {
    if (!lastSession || lastSession.messages.length === 0) {
      return 'Nuovo inizio';
    }

    const lastUserMessage = lastSession.messages
      .filter(m => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return 'Continuazione conversazione';
    }

    // Extract main topic from last user message
    const content = lastUserMessage.content;
    if (content.length > 50) {
      return content.substring(0, 50) + '...';
    }

    return content;
  }

  private async generateLastSessionSummary(lastSession: Session): Promise<string> {
    if (!lastSession || lastSession.messages.length === 0) {
      return 'Nessuna sessione precedente';
    }

    const messageCount = lastSession.messages.length;
    const lastActivity = lastSession.updatedAt.toLocaleDateString();
    
    return `Ultima sessione: ${lastSession.name} (${messageCount} messaggi, ${lastActivity})`;
  }

  /**
   * Clear context cache
   */
  clearCache(): void {
    this.contextCache.clear();
    logger.debug('User context cache cleared');
  }

  /**
   * Set Todoist AI Service for enhanced context
   */
  setTodoistAIService(todoistAIService: TodoistAIService): void {
    this.todoistAIService = todoistAIService;
  }
}