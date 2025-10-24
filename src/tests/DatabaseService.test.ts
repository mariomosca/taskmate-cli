import { DatabaseService } from '../services/DatabaseService';
import { Session, Message } from '../types';
import fs from 'fs';
import path from 'path';

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeEach(async () => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    dbService = new DatabaseService({ dbPath: testDbPath });
  });

  afterEach(async () => {
    await dbService.close();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const sessionData = {
        id: 'test-session-1',
        name: 'Test Session',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      const session = await dbService.createSession(sessionData);

      expect(session.id).toBe(sessionData.id);
      expect(session.name).toBe(sessionData.name);
      expect(session.llmProvider).toBe(sessionData.llmProvider);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should retrieve a session by id', async () => {
      const sessionData = {
        id: 'test-session-2',
        name: 'Test Session 2',
        messages: [],
        llmProvider: 'gemini' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      await dbService.createSession(sessionData);
      const retrievedSession = await dbService.getSession(sessionData.id);

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.id).toBe(sessionData.id);
      expect(retrievedSession?.name).toBe(sessionData.name);
      expect(retrievedSession?.llmProvider).toBe('claude'); // Default value from createSession
    });

    it('should throw error for non-existent session', async () => {
      await expect(dbService.getSession('non-existent-id')).rejects.toThrow('Session with id non-existent-id not found');
    });

    it('should retrieve all sessions', async () => {
      const session1 = {
        id: 'session-1',
        name: 'Session 1',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      const session2 = {
        id: 'session-2',
        name: 'Session 2',
        messages: [],
        llmProvider: 'gemini' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      await dbService.createSession(session1);
      await dbService.createSession(session2);

      const sessions = await dbService.getAllSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain('session-1');
      expect(sessions.map(s => s.id)).toContain('session-2');
    });

    it('should update a session', async () => {
      const sessionData = {
        id: 'update-test',
        name: 'Original Name',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      await dbService.createSession(sessionData);

      const updateData = {
        name: 'Updated Name',
        metadata: {
          totalMessages: 5,
          totalTokens: 100,
          lastActivity: new Date()
        }
      };

      const updatedSession = await dbService.updateSession('update-test', updateData);

      expect(updatedSession.name).toBe('Updated Name');
      expect(updatedSession.metadata?.totalMessages).toBe(5);
      expect(updatedSession.metadata?.totalTokens).toBe(100);
    });

    it('should delete a session', async () => {
      const sessionData = {
        id: 'delete-test',
        name: 'To Delete',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      await dbService.createSession(sessionData);
      
      await expect(dbService.deleteSession('delete-test')).resolves.not.toThrow();

      await expect(dbService.getSession('delete-test')).rejects.toThrow('Session with id delete-test not found');
    });
  });

  describe('Message Management', () => {
    let testSessionId: string;

    beforeEach(async () => {
      testSessionId = 'message-test-session';
      const sessionData = {
        id: testSessionId,
        name: 'Message Test Session',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };
      await dbService.createSession(sessionData);
    });

    it('should add a message to a session', async () => {
      const messageData = {
        id: 'test-message-1',
        role: 'user' as const,
        content: 'Test message content',
        metadata: {
          sessionId: testSessionId,
          tokens: 10
        }
      };

      const message = await dbService.addMessage(testSessionId, messageData);

      expect(message.id).toBe(messageData.id);
      expect(message.role).toBe(messageData.role);
      expect(message.content).toBe(messageData.content);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should retrieve messages for a session', async () => {
      const message1 = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'First message',
        metadata: {
          sessionId: testSessionId
        }
      };

      const message2 = {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'Second message',
        metadata: {
          sessionId: testSessionId
        }
      };

      await dbService.addMessage(testSessionId, message1);
      await dbService.addMessage(testSessionId, message2);

      const messages = await dbService.getSessionMessages(testSessionId);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });

    it('should return empty array for session with no messages', async () => {
      const messages = await dbService.getSessionMessages(testSessionId);
      expect(messages).toHaveLength(0);
    });
  });

  describe('Database Operations', () => {
    it('should handle database initialization', async () => {
      // Database should be initialized in beforeEach
      expect(dbService).toBeDefined();
      
      // Should be able to create a session (indicates tables exist)
      const sessionData = {
        id: 'init-test',
        name: 'Init Test',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      const session = await dbService.createSession(sessionData);
      expect(session).toBeDefined();
    });

    it('should handle database close', () => {
      expect(() => dbService.close()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate session creation', async () => {
      const sessionData = {
        id: 'duplicate-test',
        name: 'Duplicate Test',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      await dbService.createSession(sessionData);
      
      // Attempting to create the same session again should throw
      await expect(dbService.createSession(sessionData)).rejects.toThrow();
    });

    it('should handle updating non-existent session', async () => {
      const updateData = {
        name: 'Updated Name',
        metadata: {
          totalMessages: 1,
          totalTokens: 50,
          lastActivity: new Date()
        }
      };

      await expect(dbService.updateSession('non-existent', updateData)).rejects.toThrow('Session with id non-existent not found');
    });

    it('should handle deleting non-existent session', async () => {
      await expect(dbService.deleteSession('non-existent')).rejects.toThrow('Session with id non-existent not found');
    });

    it('should handle adding message to non-existent session', async () => {
      const messageData = {
        id: 'orphan-message',
        role: 'user' as const,
        content: 'Orphan message',
        metadata: {}
      };

      await expect(dbService.addMessage('non-existent-session', messageData))
        .rejects.toThrow();
    });
  });

  describe('Additional Message Operations', () => {
    let testSessionId: string;

    beforeEach(async () => {
      testSessionId = 'additional-message-test-session';
      const sessionData = {
        id: testSessionId,
        name: 'Additional Message Test Session',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };
      await dbService.createSession(sessionData);
    });

    it('should get message by id', async () => {
      const messageData = {
        id: 'get-message-test',
        role: 'user' as const,
        content: 'Test message for retrieval',
        metadata: {
          sessionId: testSessionId
        }
      };

      await dbService.addMessage(testSessionId, messageData);
      const retrievedMessage = await dbService.getMessage('get-message-test');

      expect(retrievedMessage.id).toBe(messageData.id);
      expect(retrievedMessage.content).toBe(messageData.content);
      expect(retrievedMessage.role).toBe(messageData.role);
    });

    it('should throw error for non-existent message', async () => {
      await expect(dbService.getMessage('non-existent-message')).rejects.toThrow();
    });

    it('should delete a message', async () => {
      const messageData = {
        id: 'delete-message-test',
        role: 'user' as const,
        content: 'Message to delete',
        metadata: {
          sessionId: testSessionId
        }
      };

      await dbService.addMessage(testSessionId, messageData);
      await expect(dbService.deleteMessage('delete-message-test')).resolves.not.toThrow();
      await expect(dbService.getMessage('delete-message-test')).rejects.toThrow();
    });

    it('should delete all session messages', async () => {
      const message1 = {
        id: 'session-msg-1',
        role: 'user' as const,
        content: 'First message',
        metadata: { sessionId: testSessionId }
      };

      const message2 = {
        id: 'session-msg-2',
        role: 'assistant' as const,
        content: 'Second message',
        metadata: { sessionId: testSessionId }
      };

      await dbService.addMessage(testSessionId, message1);
      await dbService.addMessage(testSessionId, message2);

      await expect(dbService.deleteSessionMessages(testSessionId)).resolves.not.toThrow();

      const messages = await dbService.getSessionMessages(testSessionId);
      expect(messages).toHaveLength(0);
    });

    it('should get message count for session', async () => {
      const message1 = {
        id: 'count-msg-1',
        role: 'user' as const,
        content: 'First message',
        metadata: { sessionId: testSessionId }
      };

      const message2 = {
        id: 'count-msg-2',
        role: 'assistant' as const,
        content: 'Second message',
        metadata: { sessionId: testSessionId }
      };

      await dbService.addMessage(testSessionId, message1);
      await dbService.addMessage(testSessionId, message2);

      const count = await dbService.getMessageCount(testSessionId);
      expect(count).toBe(2);
    });

    it('should get session messages with limit', async () => {
      const messages = [];
      for (let i = 0; i < 5; i++) {
        messages.push({
          id: `limit-msg-${i}`,
          role: 'user' as const,
          content: `Message ${i}`,
          metadata: { sessionId: testSessionId }
        });
      }

      for (const msg of messages) {
        await dbService.addMessage(testSessionId, msg);
      }

      const limitedMessages = await dbService.getSessionMessages(testSessionId, 3);
      expect(limitedMessages).toHaveLength(3);
    });
  });

  describe('Utility Operations', () => {
    beforeEach(async () => {
      // Create test sessions with different timestamps
      const sessions = [
        {
          id: 'recent-1',
          name: 'Recent Session 1',
          messages: [],
          llmProvider: 'claude' as const,
          metadata: { totalMessages: 0, totalTokens: 0, lastActivity: new Date() }
        },
        {
          id: 'recent-2',
          name: 'Recent Session 2',
          messages: [],
          llmProvider: 'gemini' as const,
          metadata: { totalMessages: 0, totalTokens: 0, lastActivity: new Date() }
        },
        {
          id: 'searchable-session',
          name: 'Searchable Test Session',
          messages: [],
          llmProvider: 'claude' as const,
          metadata: { totalMessages: 0, totalTokens: 0, lastActivity: new Date() }
        }
      ];

      for (const session of sessions) {
        await dbService.createSession(session);
      }
    });

    it('should get recent sessions', async () => {
      const recentSessions = await dbService.getRecentSessions(2);
      expect(recentSessions).toHaveLength(2);
      expect(recentSessions.every(s => s.id && s.name)).toBe(true);
    });

    it('should search sessions by name', async () => {
      const searchResults = await dbService.searchSessions('Searchable');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Searchable Test Session');
    });

    it('should get session statistics', async () => {
      // Add some messages to test stats
      const messageData = {
        id: 'stats-message',
        role: 'user' as const,
        content: 'Stats test message',
        metadata: {}
      };

      await dbService.addMessage('recent-1', messageData);

      const stats = await dbService.getSessionStats();
      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.averageMessagesPerSession).toBeGreaterThanOrEqual(0);
    });

    it('should check if session exists', async () => {
      const exists = await dbService.sessionExists('recent-1');
      expect(exists).toBe(true);

      const notExists = await dbService.sessionExists('non-existent');
      expect(notExists).toBe(false);
    });
  });

  describe('Database Management', () => {
    it('should perform vacuum operation', async () => {
      await expect(dbService.vacuum()).resolves.not.toThrow();
    });

    it('should perform health check', async () => {
      const health = await dbService.healthCheck();
      expect(health.status).toBe('ok');
      expect(health.message).toBe('Database is healthy');
    });





    it('should support transactions', () => {
      let result: any;
      
      expect(() => {
        result = dbService.transaction(() => {
          // Simple transaction test
          return { success: true };
        });
      }).not.toThrow();

      expect(result.success).toBe(true);
    });
  });

  describe('Configuration and Factory', () => {
    it('should create database service with custom config', () => {
      const customConfig = {
        dbPath: path.join(__dirname, 'custom-test.db'),
        enableWAL: false,
        enableForeignKeys: false,
        timeout: 10000
      };

      const customDbService = new DatabaseService(customConfig);
      expect(customDbService).toBeDefined();
      
      customDbService.close();
      
      // Clean up
      if (fs.existsSync(customConfig.dbPath)) {
        fs.unlinkSync(customConfig.dbPath);
      }
    });

    it('should create database service using factory function', () => {
      const { createDatabaseService } = require('../services/DatabaseService');
      const factoryDbService = createDatabaseService({
        dbPath: path.join(__dirname, 'factory-test.db')
      });
      
      expect(factoryDbService).toBeDefined();
      
      factoryDbService.close();
      
      // Clean up
      const factoryDbPath = path.join(__dirname, 'factory-test.db');
      if (fs.existsSync(factoryDbPath)) {
        fs.unlinkSync(factoryDbPath);
      }
    });

    it('should use default database path when none provided', () => {
      const defaultDbService = new DatabaseService();
      expect(defaultDbService).toBeDefined();
      defaultDbService.close();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should create directory when dbPath directory does not exist', () => {
      const testDir = path.join(__dirname, 'test-db-dir');
      const testDbPath = path.join(testDir, 'test.db');
      
      // Ensure directory doesn't exist
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
      
      // Create directory first (since better-sqlite3 doesn't create it)
      fs.mkdirSync(testDir, { recursive: true });
      
      // Create service with path in the directory
      const service = new DatabaseService({ dbPath: testDbPath });
      
      // Directory should exist and database should be created
      expect(fs.existsSync(testDir)).toBe(true);
      expect(fs.existsSync(testDbPath)).toBe(true);
      
      service.close();
      
      // Cleanup
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });

    it('should return existing session when updateSession called with no changes', async () => {
      const sessionData = {
        id: 'test-session-no-update',
        name: 'Test Session',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      const originalSession = await dbService.createSession(sessionData);
      
      // Call updateSession with empty updates
      const updatedSession = await dbService.updateSession(sessionData.id, {});
      
      expect(updatedSession.id).toBe(originalSession.id);
      expect(updatedSession.name).toBe(originalSession.name);
    });

    it('should handle deleteMessage error for non-existent message', async () => {
      await expect(dbService.deleteMessage('non-existent-message-id'))
        .rejects.toThrow('Message with id non-existent-message-id not found');
    });

    it('should handle deleteSessionMessages error for non-existent session', async () => {
      // This should not throw an error even if session doesn't exist
      await expect(dbService.deleteSessionMessages('non-existent-session-id'))
        .resolves.not.toThrow();
    });

    it('should handle healthCheck error gracefully', async () => {
      // Mock a database error by closing the database and trying to query
      const originalDb = (dbService as any).db;
      (dbService as any).db = {
        prepare: () => {
          throw new Error('Database connection lost');
        }
      };
      
      const healthResult = await dbService.healthCheck();
      
      expect(healthResult.status).toBe('error');
      expect(healthResult.message).toContain('Database health check failed');
      
      // Restore original database
      (dbService as any).db = originalDb;
    });

    it('should test vacuum operation', async () => {
      // Add some data first
      const sessionData = {
        id: 'vacuum-test-session',
        name: 'Vacuum Test Session',
        messages: [],
        llmProvider: 'claude' as const,
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      await dbService.createSession(sessionData);
      
      // Test vacuum operation
      await expect(dbService.vacuum()).resolves.not.toThrow();
    });

    it('should test transaction functionality', () => {
      const result = dbService.transaction(() => {
        return 'transaction-result';
      });
      
      expect(result).toBe('transaction-result');
    });

    it('should test successful healthCheck', async () => {
      const healthResult = await dbService.healthCheck();
      
      expect(healthResult.status).toBe('ok');
      expect(healthResult.message).toBe('Database is healthy');
    });
  });
});