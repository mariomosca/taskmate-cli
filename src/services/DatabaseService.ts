import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { Session, Message } from '../types/index.js';

export interface DatabaseConfig {
  dbPath?: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  timeout?: number;
}

export interface SessionRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  metadata: string;
}

export interface MessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata: string;
}

export class DatabaseService {
  private db: Database.Database;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      enableWAL: true,
      enableForeignKeys: true,
      timeout: 5000,
      ...config
    };

    // Set default database path
    if (!this.config.dbPath) {
      const appDataDir = join(homedir(), '.todoist-ai-cli');
      if (!existsSync(appDataDir)) {
        mkdirSync(appDataDir, { recursive: true });
      }
      this.config.dbPath = join(appDataDir, 'sessions.db');
    }

    this.db = new Database(this.config.dbPath);
    this.setupDatabase();
  }

  private setupDatabase(): void {
    // Enable WAL mode for better concurrency
    if (this.config.enableWAL) {
      this.db.pragma('journal_mode = WAL');
    }

    // Enable foreign keys
    if (this.config.enableForeignKeys) {
      this.db.pragma('foreign_keys = ON');
    }

    // Set timeout (note: better-sqlite3 doesn't have timeout method, handled by connection)

    // Create tables
    this.createTables();
  }

  private createTables(): void {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT DEFAULT '{}'
      )
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp);
      CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions (updated_at);
    `);

    // Create trigger to update session updated_at when messages are added
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_session_timestamp
      AFTER INSERT ON messages
      BEGIN
        UPDATE sessions 
        SET updated_at = datetime('now') 
        WHERE id = NEW.session_id;
      END
    `);
  }

  // Session Operations
  async createSession(session: Omit<Session, 'createdAt' | 'updatedAt'>): Promise<Session> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, name, metadata)
      VALUES (?, ?, ?)
    `);

    const metadata = JSON.stringify(session.metadata || {});
    
    try {
      stmt.run(session.id, session.name, metadata);
      
      // Fetch the created session
      return this.getSession(session.id);
    } catch (error) {
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSession(id: string): Promise<Session> {
    const stmt = this.db.prepare(`
      SELECT id, name, created_at, updated_at, metadata
      FROM sessions
      WHERE id = ?
    `);

    const row = stmt.get(id) as SessionRow | undefined;
    
    if (!row) {
      throw new Error(`Session with id ${id} not found`);
    }

    return this.mapSessionRowToSession(row);
  }

  async getAllSessions(): Promise<Session[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, created_at, updated_at, metadata
      FROM sessions
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all() as SessionRow[];
    return rows.map(row => this.mapSessionRowToSession(row));
  }

  async updateSession(id: string, updates: Partial<Pick<Session, 'name' | 'metadata'>>): Promise<Session> {
    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      setParts.push('name = ?');
      values.push(updates.name);
    }

    if (updates.metadata !== undefined) {
      setParts.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (setParts.length === 0) {
      return this.getSession(id);
    }

    setParts.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE sessions
      SET ${setParts.join(', ')}
      WHERE id = ?
    `);

    try {
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error(`Session with id ${id} not found`);
      }

      return this.getSession(id);
    } catch (error) {
      throw new Error(`Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSession(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    
    try {
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error(`Session with id ${id} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sessionExists(id: string): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM sessions WHERE id = ? LIMIT 1');
    return stmt.get(id) !== undefined;
  }

  // Message Operations
  async addMessage(sessionId: string, message: Omit<Message, 'timestamp'>): Promise<Message> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    const metadata = JSON.stringify(message.metadata || {});
    
    try {
      stmt.run(
        message.id,
        sessionId,
        message.role,
        message.content,
        metadata
      );

      return this.getMessage(message.id);
    } catch (error) {
      throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessage(id: string): Promise<Message> {
    const stmt = this.db.prepare(`
      SELECT id, session_id, role, content, timestamp, metadata
      FROM messages
      WHERE id = ?
    `);

    const row = stmt.get(id) as MessageRow | undefined;
    
    if (!row) {
      throw new Error(`Message with id ${id} not found`);
    }

    return this.mapMessageRowToMessage(row);
  }

  async getSessionMessages(sessionId: string, limit?: number): Promise<Message[]> {
    let query = `
      SELECT id, session_id, role, content, timestamp, metadata
      FROM messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(sessionId) as MessageRow[];
    
    return rows.map(row => this.mapMessageRowToMessage(row));
  }

  async deleteMessage(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
    
    try {
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error(`Message with id ${id} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSessionMessages(sessionId: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM messages WHERE session_id = ?');
    
    try {
      stmt.run(sessionId);
    } catch (error) {
      throw new Error(`Failed to delete session messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessageCount(sessionId: string): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages WHERE session_id = ?');
    const result = stmt.get(sessionId) as { count: number };
    return result.count;
  }

  // Utility Operations
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, created_at, updated_at, metadata
      FROM sessions
      ORDER BY updated_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as SessionRow[];
    return rows.map(row => this.mapSessionRowToSession(row));
  }

  async searchSessions(query: string): Promise<Session[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, created_at, updated_at, metadata
      FROM sessions
      WHERE name LIKE ?
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all(`%${query}%`) as SessionRow[];
    return rows.map(row => this.mapSessionRowToSession(row));
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
  }> {
    const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
    const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };

    return {
      totalSessions: sessionCount.count,
      totalMessages: messageCount.count,
      averageMessagesPerSession: sessionCount.count > 0 ? messageCount.count / sessionCount.count : 0
    };
  }

  // Database Management
  async vacuum(): Promise<void> {
    this.db.exec('VACUUM');
  }

  async backup(backupPath: string): Promise<void> {
    try {
      this.db.backup(backupPath);
    } catch (error) {
      throw new Error(`Failed to backup database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  close(): void {
    this.db.close();
  }

  // Transaction Support
  transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  // Private Helper Methods
  private mapSessionRowToSession(row: SessionRow): Session {
    const metadata = JSON.parse(row.metadata || '{}');
    return {
      id: row.id,
      name: row.name,
      messages: [], // Messages are loaded separately
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      llmProvider: metadata.llmProvider || 'claude',
      metadata: metadata
    };
  }

  private mapMessageRowToMessage(row: MessageRow): Message {
    return {
      id: row.id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      timestamp: new Date(row.timestamp),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      // Test basic database operations
      this.db.prepare('SELECT 1').get();
      
      return {
        status: 'ok',
        message: 'Database is healthy'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Factory function
export function createDatabaseService(config?: DatabaseConfig): DatabaseService {
  return new DatabaseService(config);
}

export default DatabaseService;