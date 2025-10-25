import { SessionManager } from '../services/SessionManager.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { Session, Message, AppConfig } from '../types/index.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let dbService: DatabaseService;
  let testDataDir: string;
  let configPath: string;

  beforeEach(async () => {
     // Create a temporary directory for testing
     testDataDir = join(tmpdir(), `sessionmanager-test-${Date.now()}`);
     await fs.mkdir(testDataDir, { recursive: true });
     
     configPath = join(testDataDir, 'config.json');
     
     // Create a test database service
     dbService = new DatabaseService({ dbPath: join(testDataDir, 'test.db') });
     
     // Create SessionManager instance
     sessionManager = new SessionManager(testDataDir, dbService);
   });

  afterEach(async () => {
    // Clean up
    await dbService.close();
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Session Management', () => {
    test('should create a new session', async () => {
      const session = await sessionManager.createSession('Test Session', 'claude');
      
      expect(session).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.llmProvider).toBe('claude');
      expect(session.messages).toEqual([]);
      expect(session.id).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    test('should create session with default name when none provided', async () => {
      const session = await sessionManager.createSession();
      
      expect(session.name).toMatch(/^Session \d{1,2}\/\d{1,2}\/\d{4}$/);
      expect(session.llmProvider).toBe('claude');
    });

    test('should load an existing session', async () => {
      const createdSession = await sessionManager.createSession('Load Test');
      await sessionManager.saveSession(createdSession, true); // Save to database
      const loadedSession = await sessionManager.loadSession(createdSession.id);
      
      expect(loadedSession).toBeDefined();
      expect(loadedSession!.id).toBe(createdSession.id);
      expect(loadedSession!.name).toBe('Load Test');
    });

    test('should return null when loading non-existent session', async () => {
      const loadedSession = await sessionManager.loadSession('non-existent-id');
      expect(loadedSession).toBeNull();
    });

    test('should save session successfully', async () => {
      const session = await sessionManager.createSession('Save Test');
      session.name = 'Updated Name'; // Update the name before saving
      await sessionManager.saveSession(session, true);
      const loadedSession = await sessionManager.loadSession(session.id);
      
      expect(loadedSession).toBeDefined();
      expect(loadedSession!.name).toBe('Updated Name');
    });

    test('should list all sessions', async () => {
      const session1 = await sessionManager.createSession('Session 1');
      await sessionManager.saveSession(session1, true);
      
      const session2 = await sessionManager.createSession('Session 2');
      await sessionManager.saveSession(session2, true);
      
      const sessions = await sessionManager.listSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.name)).toContain('Session 1');
      expect(sessions.map(s => s.name)).toContain('Session 2');
    });

    test('should delete session successfully', async () => {
      const session = await sessionManager.createSession('Delete Test');
      await sessionManager.saveSession(session, true);
      
      const result = await sessionManager.deleteSession(session.id);
      expect(result).toBe(true);
      
      const loadedSession = await sessionManager.loadSession(session.id);
      expect(loadedSession).toBeNull();
    });

    test('should clear current session when deleting active session', async () => {
      const session = await sessionManager.createSession('Active Session');
      
      // Make it the current session by adding a message
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message);
      expect(sessionManager.getCurrentSession()).toBeDefined();
      
      await sessionManager.deleteSession(session.id);
      expect(sessionManager.getCurrentSession()).toBeNull();
    });
  });

  describe('Message Management', () => {
    test('should add message to current session', async () => {
      const session = await sessionManager.createSession('Message Test');
      
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message);
      
      const currentSession = sessionManager.getCurrentSession();
      expect(currentSession).toBeDefined();
      expect(currentSession!.messages).toHaveLength(1);
      expect(currentSession!.messages[0].content).toBe('Hello world');
    });

    test('should throw error when adding message without active session', async () => {
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date()
      };
      
      await expect(sessionManager.addMessage(message)).rejects.toThrow('No active session');
    });

    test('should search messages across sessions', async () => {
      const session1 = await sessionManager.createSession('Search Test 1');
      const session2 = await sessionManager.createSession('Search Test 2');
      
      const message1: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date()
      };
      
      const message2: Message = {
        id: 'msg2',
        role: 'user',
        content: 'Goodbye world',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message1);
      
      // Switch to second session
      await sessionManager.loadSession(session2.id);
      await sessionManager.addMessage(message2);
      
      const results = await sessionManager.searchMessages('world');
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.content)).toContain('Hello world');
      expect(results.map(r => r.content)).toContain('Goodbye world');
    });

    test('should search messages in specific session', async () => {
      const session1 = await sessionManager.createSession('Specific Search 1');
      await sessionManager.saveSession(session1, true);
      
      const session2 = await sessionManager.createSession('Specific Search 2');
      await sessionManager.saveSession(session2, true);
      
      const message1: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date()
      };
      
      const message2: Message = {
        id: 'msg2',
        role: 'user',
        content: 'Goodbye world',
        timestamp: new Date()
      };
      
      // Load session1 and add message
      await sessionManager.loadSession(session1.id);
      await sessionManager.addMessage(message1);
      
      // Switch to second session and add message
      await sessionManager.loadSession(session2.id);
      await sessionManager.addMessage(message2);
      
      const results = await sessionManager.searchMessages('Hello', session1.id);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Hello world');
    });
  });

  describe('Configuration Management', () => {
    test('should load default config when file does not exist', async () => {
      const config = await sessionManager.loadConfig();
      
      expect(config).toBeDefined();
      expect(config.defaultLLM).toBe('claude');
      expect(config.autoSave).toBe(true);
      expect(config.theme).toBe('dark');
    });

    test('should save and load config', async () => {
      const testConfig: AppConfig = {
        defaultLLM: 'gemini',
        sessionPath: '/test/path',
        autoSave: false,
        theme: 'light'
      };
      
      await sessionManager.saveConfig(testConfig);
      const loadedConfig = await sessionManager.loadConfig();
      
      expect(loadedConfig).toEqual(testConfig);
    });
  });

  describe('Session Selection and Pagination', () => {
    test('should get sessions for selection with pagination', async () => {
      // Create multiple sessions
      for (let i = 1; i <= 7; i++) {
        const session = await sessionManager.createSession(`Session ${i}`);
        await sessionManager.saveSession(session, true);
      }
      
      const result = await sessionManager.getSessionsForSelection(0, 3);
      
      expect(result.sessions).toHaveLength(3);
      expect(result.totalSessions).toBe(7);
      expect(result.hasMore).toBe(true);
      expect(result.currentPage).toBe(0);
    });

    test('should prioritize specific session in selection', async () => {
      const session1 = await sessionManager.createSession('Session 1');
      await sessionManager.saveSession(session1, true);
      
      const session2 = await sessionManager.createSession('Session 2');
      await sessionManager.saveSession(session2, true);
      
      const session3 = await sessionManager.createSession('Session 3');
      await sessionManager.saveSession(session3, true);
      
      const result = await sessionManager.getSessionsForSelection(0, 5, session2.id);
      
      expect(result.sessions[0].id).toBe(session2.id);
      expect(result.sessions[0].name).toBe('Session 2');
    });
  });

  describe('Context Management', () => {
    test('should prepare session context', async () => {
      const session = await sessionManager.createSession('Context Test');
      
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Test message for context',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message);
      
      const context = await sessionManager.prepareSessionContext(session.id);
      
      expect(context).toBeDefined();
      expect(context).toContain('Test message for context');
    });

    test('should return null for empty session context', async () => {
      const session = await sessionManager.createSession('Empty Context Test');
      
      const context = await sessionManager.prepareSessionContext(session.id);
      
      expect(context).toBeNull();
    });

    test('should resume session with context', async () => {
      const session = await sessionManager.createSession('Resume Test');
      
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Resume message',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message);
      
      const result = await sessionManager.resumeSessionWithContext(session.id);
      
      expect(result).toBeDefined();
      expect(result!.session.id).toBe(session.id);
      expect(result!.context).toContain('Resume message');
      expect(sessionManager.getCurrentSession()?.id).toBe(session.id);
    });

    test('should return null when resuming non-existent session', async () => {
      const result = await sessionManager.resumeSessionWithContext('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    test('should get current session', async () => {
      expect(sessionManager.getCurrentSession()).toBeNull();
      
      const session = await sessionManager.createSession('Current Test');
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message);
      
      expect(sessionManager.getCurrentSession()).toBeDefined();
      expect(sessionManager.getCurrentSession()!.id).toBe(session.id);
    });

    test('should get context info for current session', async () => {
      expect(sessionManager.getContextInfo()).toBeNull();
      
      const session = await sessionManager.createSession('Context Info Test');
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message);
      
      const contextInfo = sessionManager.getContextInfo();
      expect(contextInfo).toBeDefined();
      expect(typeof contextInfo).toBe('string');
    });

    test('should get context description for current session', async () => {
      expect(sessionManager.getContextDescription()).toBeNull();
      
      const session = await sessionManager.createSession('Context Description Test');
      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      };
      
      await sessionManager.addMessage(message);
      
      const contextDescription = sessionManager.getContextDescription();
      expect(contextDescription).toBeDefined();
      expect(typeof contextDescription).toBe('string');
    });

    test('should get context manager', () => {
      const contextManager = sessionManager.getContextManager();
      expect(contextManager).toBeDefined();
    });

    test('should get last session', async () => {
      expect(await sessionManager.getLastSession()).toBeNull();
      
      const session1 = await sessionManager.createSession('First Session');
      await sessionManager.saveSession(session1, true);
      
      const session2 = await sessionManager.createSession('Second Session');
      await sessionManager.saveSession(session2, true);
      
      const lastSession = await sessionManager.getLastSession();
      expect(lastSession).toBeDefined();
      // Should be the most recent one
      expect(lastSession!.name).toBe('Second Session');
    });

    test('should resume last session', async () => {
      expect(await sessionManager.resumeLastSession()).toBeNull();
      
      const session = await sessionManager.createSession('Resume Test');
      await sessionManager.saveSession(session, true);
      
      const resumedSession = await sessionManager.resumeLastSession();
      expect(resumedSession).toBeDefined();
      expect(resumedSession!.id).toBe(session.id);
      expect(sessionManager.getCurrentSession()?.id).toBe(session.id);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in saveSession gracefully', async () => {
      const session = await sessionManager.createSession('Error Test');
      
      // Close the database to simulate an error
      await dbService.close();
      
      // Should not throw, but log error internally
      await expect(sessionManager.saveSession(session)).resolves.not.toThrow();
    });

    test('should handle errors in listSessions gracefully', async () => {
      // Close the database to simulate an error
      await dbService.close();
      
      const sessions = await sessionManager.listSessions();
      expect(sessions).toEqual([]);
    });

    test('should handle errors in deleteSession gracefully', async () => {
      const session = await sessionManager.createSession('Delete Error Test');
      
      // Close the database to simulate an error
      await dbService.close();
      
      const result = await sessionManager.deleteSession(session.id);
      expect(result).toBe(false);
    });
  });
});