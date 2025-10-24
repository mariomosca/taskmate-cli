import { DatabaseService } from '../services/DatabaseService.js';
import { ContextManager } from '../services/ContextManager.js';
import { llmService } from '../services/LLMService.js';
import { Message, Session, AppConfig } from '../types/index.js';
import { join } from 'path';
import { promises as fs } from 'fs';

/**
 * Testable version of SessionManager that avoids import.meta.url issues
 */
export class TestableSessionManager {
  private sessionsDir: string;
  private configPath: string;
  private currentSession: Session | null = null;
  private contextManager: ContextManager;
  private db: DatabaseService;

  constructor(dataDir?: string, dbService?: DatabaseService) {
    const baseDir = dataDir || join(process.cwd(), 'data');
    this.sessionsDir = join(baseDir, 'sessions');
    this.configPath = join(baseDir, 'config.json');
    this.contextManager = new ContextManager(llmService, undefined, llmService.getModelManager());
    this.db = dbService || new DatabaseService();
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  // Session Management
  async createSession(name?: string, llmProvider: 'claude' | 'gemini' = 'claude'): Promise<Session> {
    const sessionData: Session = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Session ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      llmProvider,
      isTemporary: true,
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
      return null;
    }
  }

  async saveSession(session: Session): Promise<void> {
    await this.db.updateSession(session.id, {
      name: session.name,
      metadata: session.metadata
    });
    if (this.currentSession?.id === session.id) {
      this.currentSession = session;
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
      return false;
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
      return [];
    }
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  // Message Management
  async addMessage(message: Message): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    // Add message to database
    await this.db.addMessage(this.currentSession.id, message);
    
    // Update current session in memory
    this.currentSession.messages.push(message);
    
    // Update session metadata
    if (this.currentSession.metadata) {
      this.currentSession.metadata.totalMessages = this.currentSession.messages.length;
      this.currentSession.metadata.totalTokens = (this.currentSession.metadata.totalTokens || 0) + (message.metadata?.tokens || 0);
      this.currentSession.metadata.lastActivity = new Date();
    }
    
    await this.saveSession(this.currentSession);
  }

  async searchMessages(query: string, sessionId?: string): Promise<Message[]> {
    const targetSessionId = sessionId || this.currentSession?.id;
    if (!targetSessionId) {
      throw new Error('No session specified for message search');
    }

    const messages = await this.db.getSessionMessages(targetSessionId);
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Context Management
  getContextInfo(messages: Message[]): any {
    return this.contextManager.getContextStatus(messages);
  }

  getContextDescription(messages: Message[]): string {
    return this.contextManager.getContextDescription(messages);
  }

  getContextManager(): ContextManager {
    return this.contextManager;
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
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  // Session Selection
  async getSessionsForSelection(page: number = 0, limit: number = 10, prioritySessionId?: string): Promise<{
    sessions: any[];
    totalSessions: number;
    hasMore: boolean;
  }> {
    const allSessions = await this.listSessions();
    const totalSessions = allSessions.length;
    
    let sessions = allSessions.slice(page * limit, (page + 1) * limit);
    
    // Add priority session if specified and not already in results
    if (prioritySessionId) {
      const prioritySession = allSessions.find(s => s.id === prioritySessionId);
      if (prioritySession && !sessions.find(s => s.id === prioritySessionId)) {
        sessions = [prioritySession, ...sessions.slice(0, limit - 1)];
      }
    }

    return {
      sessions: sessions.map(session => ({
        id: session.id,
        name: session.name,
        lastActivity: session.metadata?.lastActivity || session.updatedAt,
        messageCount: session.metadata?.totalMessages || (session.messages?.length || 0),
        llmProvider: session.llmProvider
      })),
      totalSessions,
      hasMore: (page + 1) * limit < totalSessions
    };
  }

  async getLastSession(): Promise<Session | null> {
    const sessions = await this.listSessions();
    if (sessions.length === 0) return null;
    
    return sessions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }

  async resumeLastSession(): Promise<Session | null> {
    const lastSession = await this.getLastSession();
    if (lastSession) {
      this.currentSession = lastSession;
    }
    return lastSession;
  }
}