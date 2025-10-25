import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Message, Session, AppConfig } from '../types/index.js';
import { DatabaseService } from './DatabaseService.js';
import { LLMService, llmService } from './LLMService.js';
import { ContextManager } from './ContextManager.js';
import { TodoistAIService } from './TodoistAIService.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { ErrorType } from '../types/errors.js';

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
    const baseDir = dataDir || './data';
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
      name: name || `Session ${new Date().toLocaleDateString()}`,
      messages: [],
      llmProvider,
      createdAt: new Date(),
      updatedAt: new Date(),
      isTemporary: true, // Temporary session, not yet saved to database
      metadata: {
        totalMessages: 0,
        totalTokens: 0,
        lastActivity: new Date()
      }
    };

    // Don't save immediately to database, session will be saved on first message
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
      // getSession throws an error if session is not found
      logger.debug(`Session ${sessionId} not found or error loading:`, error);
      return null;
    }
  }

  async saveSession(session: Session, force: boolean = false): Promise<void> {
    try {
      // Don't save temporary sessions or sessions with 0 messages, unless forced
      if (!force && (session.isTemporary || session.messages.length === 0)) {
        logger.debug(`Skipping save for ${session.isTemporary ? 'temporary' : 'empty'} session ${session.id}`);
        return;
      }

      // If forcing save, make the session non-temporary
      if (force && session.isTemporary) {
        session.isTemporary = false;
      }

      const updatedMetadata = {
        totalMessages: session.messages.length,
        totalTokens: session.metadata?.totalTokens || 0,
        lastActivity: new Date()
      };

      // First check if the session already exists
      try {
        const existingSession = await this.db.getSession(session.id);
        
        // Update existing session
        await this.db.updateSession(session.id, {
          name: session.name,
          metadata: updatedMetadata
        });
        logger.debug(`Updated existing session ${session.id} in database`);
      } catch (getError) {
        // Create session if it doesn't exist
        await this.db.createSession(session);
        logger.debug(`Created new session ${session.id} in database`);
      }
    } catch (error) {
      logger.error(`Error saving session ${session.id}:`, error);
      throw error;
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

    // If session is temporary (not yet saved), save it to database first
    if (this.currentSession.isTemporary) {
      // Remove temporary flag and save the session
      this.currentSession.isTemporary = false;
      const sessionToSave = { ...this.currentSession };
      delete sessionToSave.isTemporary; // Remove flag before saving
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
    
    // If there's a priority ID, put that session at the top
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
      // Use the new ContextManager to optimize context
      const result = await this.contextManager.prepareOptimizedContext(session.messages);
      
      // Update session with optimized messages if summarization was done
      if (result.contextInfo.wasSummarized && session.messages.length > 0) {
        session.messages = result.optimizedMessages;
        await this.saveSession(session);
      }

      // Build context text for summary
      const chatHistory = result.optimizedMessages
        .map(msg => {
          const roleLabel = msg.role === 'user' ? 'User' : 
                           msg.role === 'assistant' ? 'Assistant' : 
                           msg.role === 'system' ? 'System' : msg.role;
          return `${roleLabel}: ${msg.content}`;
        })
        .join('\n\n');

      return chatHistory;
    } catch (error) {
      logger.error('Error during context preparation:', error);
      // Fallback: return last messages
      const lastMessages = session.messages.slice(-5)
        .map(msg => {
          const roleLabel = msg.role === 'user' ? 'User' : 
                           msg.role === 'assistant' ? 'Assistant' : 
                           msg.role === 'system' ? 'System' : msg.role;
          return `${roleLabel}: ${msg.content}`;
        })
        .join('\n\n');
      return `Context of last messages:\n\n${lastMessages}`;
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
      context: context || 'Session resumed without previous context.'
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