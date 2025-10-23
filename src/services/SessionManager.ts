import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Session, Message, AppConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SessionManager {
  private sessionsDir: string;
  private configPath: string;
  private currentSession: Session | null = null;

  constructor(dataDir?: string) {
    const baseDir = dataDir || join(__dirname, '../../data');
    this.sessionsDir = join(baseDir, 'sessions');
    this.configPath = join(baseDir, 'config.json');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      await fs.mkdir(dirname(this.configPath), { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  // Session Management
  async createSession(name?: string, llmProvider: 'claude' | 'gemini' = 'claude'): Promise<Session> {
    const session: Session = {
      id: this.generateSessionId(),
      name: name || `Sessione ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      llmProvider,
      metadata: {
        totalMessages: 0,
        totalTokens: 0,
        lastActivity: new Date()
      }
    };

    await this.saveSession(session);
    this.currentSession = session;
    return session;
  }

  async loadSession(sessionId: string): Promise<Session | null> {
    try {
      const sessionPath = join(this.sessionsDir, `${sessionId}.json`);
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(data);
      
      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);
      session.metadata.lastActivity = new Date(session.metadata.lastActivity);
      session.messages = session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      this.currentSession = session;
      return session;
    } catch (error) {
      console.error(`Error loading session ${sessionId}:`, error);
      return null;
    }
  }

  async saveSession(session: Session): Promise<void> {
    try {
      session.updatedAt = new Date();
      session.metadata = {
        totalMessages: session.messages.length,
        totalTokens: session.metadata?.totalTokens || 0,
        lastActivity: new Date()
      };

      const sessionPath = join(this.sessionsDir, `${session.id}.json`);
      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error(`Error saving session ${session.id}:`, error);
    }
  }

  async listSessions(): Promise<Session[]> {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions: Session[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const session = await this.loadSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }
      }

      // Sort by last activity (most recent first)
      return sessions.sort((a, b) => 
        b.metadata!.lastActivity.getTime() - a.metadata!.lastActivity.getTime()
      );
    } catch (error) {
      console.error('Error listing sessions:', error);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionPath = join(this.sessionsDir, `${sessionId}.json`);
      await fs.unlink(sessionPath);
      
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting session ${sessionId}:`, error);
      return false;
    }
  }

  // Message Management
  async addMessage(message: Message): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.messages.push(message);
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
      console.error('Error saving config:', error);
    }
  }

  // Utility Methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
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