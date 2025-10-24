import { TestableSessionManager } from './TestableSessionManager.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { LLMService } from '../services/LLMService.js';
import { ContextManager } from '../services/ContextManager.js';
import { ModelManager } from '../services/ModelManager.js';
import { Message, Session, AppConfig } from '../types/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SessionManager Integration Tests', () => {
  let sessionManager: TestableSessionManager;
  let mockDbService: jest.Mocked<DatabaseService>;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sessionmanager-integration-test-'));
    
    // Create mock DatabaseService
    mockDbService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      getAllSessions: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
      addMessage: jest.fn(),
      getSessionMessages: jest.fn(),
      close: jest.fn()
    } as any;

    // Create TestableSessionManager with temp directory and mock database
    sessionManager = new TestableSessionManager(tempDir, mockDbService);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('Session Management', () => {
    it('should create a new session with default name', async () => {
      const result = await sessionManager.createSession();

      // createSession creates a temporary session, not saved to DB immediately
      expect(result.name).toMatch(/^Session \d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result.llmProvider).toBe('claude');
      expect(result.isTemporary).toBe(true);
      expect(sessionManager.getCurrentSession()).toBe(result);
    });

    it('should create a new session with custom name', async () => {
      const customName = 'My Custom Session';

      const result = await sessionManager.createSession(customName);

      // createSession creates a temporary session, not saved to DB immediately
      expect(result.name).toBe(customName);
      expect(result.llmProvider).toBe('claude');
      expect(result.isTemporary).toBe(true);
      expect(sessionManager.getCurrentSession()).toBe(result);
    });

    it('should create session with gemini provider', async () => {
      const mockSession: Session = {
        id: 'gemini-session-id',
        name: 'Gemini Session',
        messages: [],
        llmProvider: 'gemini',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      mockDbService.createSession.mockResolvedValue(mockSession);

      const result = await sessionManager.createSession('Gemini Session', 'gemini');

      expect(result.llmProvider).toBe('gemini');
    });

    it('should load an existing session', async () => {
      const mockSession: Session = {
        id: 'existing-session',
        name: 'Existing Session',
        messages: [],
        llmProvider: 'claude',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      mockDbService.getSession.mockResolvedValue(mockSession);

      const result = await sessionManager.loadSession('existing-session');

      expect(mockDbService.getSession).toHaveBeenCalledWith('existing-session');
      expect(result).toEqual(mockSession);
      expect(sessionManager.getCurrentSession()).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      mockDbService.getSession.mockRejectedValue(new Error('Session not found'));

      const result = await sessionManager.loadSession('non-existent');

      expect(result).toBeNull();
    });

    it('should list all sessions', async () => {
      const mockSessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          messages: [],
          llmProvider: 'claude',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            totalMessages: 0,
            totalTokens: 0,
            lastActivity: new Date()
          }
        },
        {
          id: 'session-2',
          name: 'Session 2',
          messages: [],
          llmProvider: 'gemini',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            totalMessages: 5,
            totalTokens: 100,
            lastActivity: new Date()
          }
        }
      ];

      mockDbService.getAllSessions.mockResolvedValue(mockSessions);

      const result = await sessionManager.listSessions();

      expect(mockDbService.getAllSessions).toHaveBeenCalled();
      expect(result).toEqual(mockSessions);
    });

    it('should delete a session successfully', async () => {
      mockDbService.deleteSession.mockResolvedValue();

      const result = await sessionManager.deleteSession('delete-session');

      expect(mockDbService.deleteSession).toHaveBeenCalledWith('delete-session');
      expect(result).toBe(true);
    });

    it('should handle delete session error', async () => {
      mockDbService.deleteSession.mockRejectedValue(new Error('Delete failed'));

      const result = await sessionManager.deleteSession('error-session');

      expect(result).toBe(false);
    });

    it('should get current session', () => {
      const result = sessionManager.getCurrentSession();
      expect(result).toBeNull(); // Initially null
    });
  });

  describe('Message Management', () => {
    beforeEach(async () => {
      // Set up a current session for message tests
      const mockSession: Session = {
        id: 'current-session',
        name: 'Current Session',
        messages: [],
        llmProvider: 'claude',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      mockDbService.createSession.mockResolvedValue(mockSession);
      await sessionManager.createSession('Current Session');
    });

    it('should add a message to current session', async () => {
      // Create a session first
      const session = await sessionManager.createSession('Test Session');
      
      const mockMessage: Message = {
        id: 'test-message',
        role: 'user',
        content: 'Test content',
        timestamp: new Date(),
        metadata: {
          sessionId: session.id
        }
      };

      mockDbService.addMessage.mockResolvedValue(mockMessage);

      await sessionManager.addMessage(mockMessage);

      expect(mockDbService.addMessage).toHaveBeenCalledWith(session.id, mockMessage);
    });

    it('should handle add message when no current session', async () => {
      // Reset current session
      const sessionManagerWithoutSession = new TestableSessionManager(tempDir, mockDbService);
      
      const mockMessage: Message = {
        id: 'test-message',
        role: 'user',
        content: 'Test content',
        timestamp: new Date(),
        metadata: {}
      };

      await expect(sessionManagerWithoutSession.addMessage(mockMessage)).rejects.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should load default configuration when file does not exist', async () => {
      const config = await sessionManager.loadConfig();
      
      expect(config).toEqual({
        defaultLLM: 'claude',
        sessionPath: expect.any(String),
        autoSave: true,
        theme: 'dark'
      });
    });

    it('should save and load configuration', async () => {
      const config: AppConfig = {
        defaultLLM: 'gemini',
        sessionPath: tempDir,
        autoSave: true,
        theme: 'dark',
        todoistToken: 'test-token',
        anthropicKey: 'test-key',
        googleKey: 'test-google-key'
      };

      await sessionManager.saveConfig(config);

      // Verify file was created
      const configPath = path.join(tempDir, 'config.json');
      const exists = await fs.promises.access(configPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Load and verify config
      const loadedConfig = await sessionManager.loadConfig();
      expect(loadedConfig).toEqual(config);
    });

    it('should handle malformed config file', async () => {
      // Create malformed config file
      const configPath = path.join(tempDir, 'config.json');
      await fs.promises.writeFile(configPath, 'invalid json');

      const result = await sessionManager.loadConfig();

      // Should return default config
      expect(result).toEqual({
        defaultLLM: 'claude',
        sessionPath: path.join(tempDir, 'sessions'),
        autoSave: true,
        theme: 'dark'
      });
    });
  });

  describe('Context Management', () => {
    it('should get context info', () => {
      const mockMessages: Message[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
          metadata: { sessionId: 'test-session' }
        }
      ];

      const contextInfo = sessionManager.getContextInfo(mockMessages);
      expect(contextInfo).toBeDefined();
    });

    it('should get context description', () => {
      const mockMessages: Message[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
          metadata: { sessionId: 'test-session' }
        }
      ];

      const result = sessionManager.getContextDescription(mockMessages);
      expect(typeof result).toBe('string');
    });

    it('should get context manager', () => {
      const result = sessionManager.getContextManager();
      expect(result).toBeDefined();
    });
  });

  describe('Session Selection', () => {
    it('should get sessions for selection', async () => {
      const mockSessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          messages: [],
          llmProvider: 'claude',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          metadata: {
            totalMessages: 5,
            totalTokens: 100,
            lastActivity: new Date('2023-01-01')
          }
        },
        {
          id: 'session-2',
          name: 'Session 2',
          messages: [],
          llmProvider: 'gemini',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
          metadata: {
            totalMessages: 3,
            totalTokens: 50,
            lastActivity: new Date('2023-01-02')
          }
        }
      ];

      mockDbService.getAllSessions.mockResolvedValue(mockSessions);

      const result = await sessionManager.getSessionsForSelection();

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].messageCount).toBe(5);
      expect(result.sessions[1].messageCount).toBe(3);
      expect(result.totalSessions).toBe(2);
      expect(result.hasMore).toBe(false);

    });

    it('should get sessions for selection with pagination', async () => {
      const mockSessions: Session[] = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        name: `Session ${i}`,
        messages: [],
        llmProvider: 'claude' as const,
        createdAt: new Date(`2023-01-${String(i + 1).padStart(2, '0')}`),
        updatedAt: new Date(`2023-01-${String(i + 1).padStart(2, '0')}`),
        metadata: {
          totalMessages: i,
          totalTokens: i * 10,
          lastActivity: new Date(`2023-01-${String(i + 1).padStart(2, '0')}`)
        }
      }));

      mockDbService.getAllSessions.mockResolvedValue(mockSessions);

      const result = await sessionManager.getSessionsForSelection(0, 5);

      expect(result.sessions).toHaveLength(5);
      expect(result.totalSessions).toBe(10);
      expect(result.hasMore).toBe(true);

    });

    it('should get last session', async () => {
      const mockSessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          messages: [],
          llmProvider: 'claude',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          metadata: {
            totalMessages: 0,
            totalTokens: 0,
            lastActivity: new Date('2023-01-01')
          }
        },
        {
          id: 'session-2',
          name: 'Session 2',
          messages: [],
          llmProvider: 'claude',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
          metadata: {
            totalMessages: 0,
            totalTokens: 0,
            lastActivity: new Date('2023-01-02')
          }
        }
      ];

      mockDbService.getAllSessions.mockResolvedValue(mockSessions);

      const result = await sessionManager.getLastSession();

      expect(result?.id).toBe('session-2'); // Most recent session
    });

    it('should return null when no sessions exist', async () => {
      mockDbService.getAllSessions.mockResolvedValue([]);

      const result = await sessionManager.getLastSession();

      expect(result).toBeNull();
    });

    it('should resume last session', async () => {
      const mockSession: Session = {
        id: 'last-session',
        name: 'Last Session',
        messages: [],
        llmProvider: 'claude',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: new Date()
        }
      };

      mockDbService.getAllSessions.mockResolvedValue([mockSession]);

      const result = await sessionManager.resumeLastSession();

      expect(result).toEqual(mockSession);
      expect(sessionManager.getCurrentSession()).toEqual(mockSession);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDbService.getAllSessions.mockRejectedValue(new Error('Database error'));

      const result = await sessionManager.listSessions();

      expect(result).toEqual([]);
    });
  });
});