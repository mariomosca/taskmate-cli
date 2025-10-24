import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Message, Session, AppConfig } from '../types/index.js';
import { DatabaseService } from './DatabaseService.js';
import { LLMService, llmService } from './LLMService.js';
import { ContextManager } from './ContextManager.js';
import { TodoistAIService } from './TodoistAIService.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { ErrorType } from '../types/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SessionManager - Manages conversation sessions and their lifecycle
 * 
 * This class handles:
 * - Session creation, loading, and management
 * - Message storage and retrieval within sessions
 * - Integration with ContextManager for token tracking
 * - Session metadata and context information
 * 
 * Key responsibilities:
 * - Maintain active session state
 * - Provide context information for UI display
 * - Coordinate between database, context manager, and LLM service
 * - Handle session switching and cleanup
 */
export class SessionManager {
  private sessionsDir: string;
  private configPath: string;
  private currentSession: Session | null = null;
  private contextManager: ContextManager;
  private db: DatabaseService;

  constructor(dataDir?: string, dbService?: DatabaseService) {
    const baseDir = dataDir || join(__dirname, '../../data');
    this.sessionsDir = join(baseDir, 'sessions');
    this.configPath = join(baseDir, 'config.json');
    // Create ContextManager instance and share ModelManager from LLMService to avoid multiple instances
    this.contextManager = new ContextManager(llmService, undefined, llmService.getModelManager());
    this.db = dbService || new DatabaseService();
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      await fs.mkdir(dirname(this.configPath), { recursive: true });
    } catch (error) {
      logger.error('Error creating directories:', error);
    }
  }

  // Session Management
  async createSession(name?: string, llmProvider: 'claude' | 'gemini' = 'claude'): Promise<Session> {
    const sessionData: Session = {
      id: this.generateSessionId(),
      name: name || `Sessione ${new Date().toLocaleDateString()}`,
      messages: [],
      llmProvider,
      createdAt: new Date(),
      updatedAt: new Date(),
      isTemporary: true, // Sessione temporanea, non ancora salvata nel database
      metadata: {
        totalMessages: 0,
        totalTokens: 0,
        lastActivity: new Date()
      }
    };

    // Non salviamo immediatamente nel database, la sessione sarà salvata al primo messaggio
    this.currentSession = sessionData;
    return sessionData;
  }

  async loadSession(sessionId: string): Promise<Session | null> {
    try {
      const session = await this.db.getSession(sessionId);
      
      // Load messages for the session
      const messages = await this.db.getSessionMessages(sessionId);
      session.messages = messages;

      this.currentSession = session;
      return session;
    } catch (error) {
      logger.error(`Error loading session ${sessionId}:`, error);
      return null;
    }
  }

  async saveSession(session: Session): Promise<void> {
    try {
      // Non salvare sessioni temporanee o con 0 messaggi
      if (session.isTemporary || session.messages.length === 0) {
        logger.debug(`Skipping save for ${session.isTemporary ? 'temporary' : 'empty'} session ${session.id}`);
        return;
      }

      const updatedMetadata = {
        totalMessages: session.messages.length,
        totalTokens: session.metadata?.totalTokens || 0,
        lastActivity: new Date()
      };

      await this.db.updateSession(session.id, {
        name: session.name,
        metadata: updatedMetadata
      });
    } catch (error) {
      logger.error(`Error saving session ${session.id}:`, error);
    }
  }

  async listSessions(): Promise<Session[]> {
    try {
      const sessions = await this.db.getAllSessions();
      
      // Load messages for each session (optional - could be lazy loaded)
      for (const session of sessions) {
        session.messages = await this.db.getSessionMessages(session.id);
      }

      return sessions;
    } catch (error) {
      logger.error('Error listing sessions:', error);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.db.deleteSession(sessionId);
      
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }
      
      return true;
    } catch (error) {
      logger.error(`Error deleting session ${sessionId}:`, error);
      return false;
    }
  }

  // Message Management
  async addMessage(message: Message): Promise<void> {
    if (!this.currentSession) {
      throw errorHandler.createValidationError(
        'No active session',
        {
          operation: 'add_message',
          component: 'SessionManager',
          metadata: { messageRole: message.role }
        }
      );
    }

    // Se la sessione è temporanea (non ancora salvata), la salviamo prima nel database
    if (this.currentSession.isTemporary) {
      // Rimuoviamo il flag temporaneo e salviamo la sessione
      this.currentSession.isTemporary = false;
      const sessionToSave = { ...this.currentSession };
      delete sessionToSave.isTemporary; // Rimuoviamo il flag prima di salvare
      await this.db.createSession(sessionToSave);
    }

    // Add message to database
    await this.db.addMessage(this.currentSession.id, message);
    
    // Update current session in memory
    this.currentSession.messages.push(message);
    
    // Update session metadata
    await this.saveSession(this.currentSession);
  }

  async searchMessages(query: string, sessionId?: string): Promise<Message[]> {
    const sessions = sessionId 
      ? [await this.loadSession(sessionId)].filter(Boolean) as Session[]
      : await this.listSessions();

    const results: Message[] = [];
    const searchTerm = query.toLowerCase();

    for (const session of sessions) {
      for (const message of session.messages) {
        if (message.content.toLowerCase().includes(searchTerm)) {
          results.push({
            ...message,
            metadata: {
              ...message.metadata,
              sessionId: session.id,
              sessionName: session.name
            }
          });
        }
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Configuration Management
  async loadConfig(): Promise<AppConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return default config if file doesn't exist
      const defaultConfig: AppConfig = {
        defaultLLM: 'claude',
        sessionPath: this.sessionsDir,
        autoSave: true,
        theme: 'dark'
      };
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      logger.error('Error saving config:', error);
    }
  }

  // Session Selection and Context Preparation
  async getSessionsForSelection(page: number = 0, pageSize: number = 5, prioritySessionId?: string): Promise<{
    sessions: Array<{id: string, name: string, lastActivity: Date, messageCount: number}>,
    totalSessions: number,
    hasMore: boolean,
    currentPage: number
  }> {
    const allSessions = await this.listSessions();
    
    // Se c'è un ID prioritario, mettiamo quella sessione in cima
    let orderedSessions = allSessions;
    if (prioritySessionId) {
      const prioritySession = allSessions.find(s => s.id === prioritySessionId);
      if (prioritySession) {
        orderedSessions = [
          prioritySession,
          ...allSessions.filter(s => s.id !== prioritySessionId)
        ];
      }
    }
    
    const totalSessions = orderedSessions.length;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    
    const paginatedSessions = orderedSessions
      .slice(startIndex, endIndex)
      .map(session => ({
        id: session.id,
        name: session.name,
        lastActivity: session.metadata?.lastActivity 
          ? new Date(session.metadata.lastActivity) 
          : session.updatedAt,
        messageCount: session.messages.length
      }));

    return {
      sessions: paginatedSessions,
      totalSessions,
      hasMore: endIndex < totalSessions,
      currentPage: page
    };
  }

  async prepareSessionContext(sessionId: string): Promise<string | null> {
    const session = await this.loadSession(sessionId);
    if (!session || session.messages.length === 0) {
      return null;
    }

    try {
      // Usa il nuovo ContextManager per ottimizzare il contesto
      const result = await this.contextManager.prepareOptimizedContext(session.messages);
      
      // Aggiorna la sessione con i messaggi ottimizzati se è stata fatta una summarizzazione
      if (result.contextInfo.wasSummarized && session.messages.length > 0) {
        session.messages = result.optimizedMessages;
        await this.saveSession(session);
      }

      // Costruisci il testo del contesto per il riassunto
      const chatHistory = result.optimizedMessages
        .map(msg => {
          const roleLabel = msg.role === 'user' ? 'Utente' : 
                           msg.role === 'assistant' ? 'Assistente' : 
                           msg.role === 'system' ? 'Sistema' : msg.role;
          return `${roleLabel}: ${msg.content}`;
        })
        .join('\n\n');

      return chatHistory;
    } catch (error) {
      logger.error('Errore durante la preparazione del contesto:', error);
      // Fallback: restituisci gli ultimi messaggi
      const lastMessages = session.messages.slice(-5)
        .map(msg => {
          const roleLabel = msg.role === 'user' ? 'Utente' : 
                           msg.role === 'assistant' ? 'Assistente' : 
                           msg.role === 'system' ? 'Sistema' : msg.role;
          return `${roleLabel}: ${msg.content}`;
        })
        .join('\n\n');
      return `Contesto degli ultimi messaggi:\n\n${lastMessages}`;
    }
  }

  async resumeSessionWithContext(sessionId: string): Promise<{session: Session, context: string} | null> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      return null;
    }

    const context = await this.prepareSessionContext(sessionId);
    this.currentSession = session;
    
    return {
      session,
      context: context || 'Sessione ripresa senza contesto precedente.'
    };
  }

  // Utility Methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get formatted context information for the current session
   * 
   * This method:
   * 1. Checks if there's an active session
   * 2. Delegates to ContextManager to format context info
   * 3. Returns formatted string like "🟢 5% (1,234/200,000)"
   * 
   * @returns Formatted context string or null if no active session
   */
  getContextInfo(): string | null {
    if (!this.currentSession) {
      return null;
    }
    // Delegate to ContextManager to format context information for UI display
    return this.contextManager.formatContextInfo(this.currentSession.messages);
  }

  /**
   * Get detailed context description for the current session
   * 
   * This method:
   * 1. Checks if there's an active session
   * 2. Delegates to ContextManager to get detailed description
   * 3. Returns human-readable context status description
   * 
   * @returns Context description string or null if no active session
   */
  getContextDescription(): string | null {
    if (!this.currentSession) {
      return null;
    }
    
    // Delegate to ContextManager to get detailed context description
    return this.contextManager.getContextDescription(this.currentSession.messages);
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  async getLastSession(): Promise<Session | null> {
    const sessions = await this.listSessions();
    return sessions.length > 0 ? sessions[0] : null;
  }

  async resumeLastSession(): Promise<Session | null> {
    const lastSession = await this.getLastSession();
    if (lastSession) {
      this.currentSession = lastSession;
    }
    return lastSession;
  }
}