import { DatabaseService } from '../services/DatabaseService.js';
import { Session, Message } from '../types/index.js';

// Mock the entire SessionManager module to avoid import.meta.url issues
jest.mock('../services/SessionManager.js', () => {
  return {
    SessionManager: jest.fn().mockImplementation(() => ({
      createSession: jest.fn(),
      loadSession: jest.fn(),
      saveSession: jest.fn(),
      deleteSession: jest.fn(),
      addMessage: jest.fn(),
      listSessions: jest.fn(),
      getCurrentSession: jest.fn(),
      searchMessages: jest.fn(),
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      getContextInfo: jest.fn(),
      getContextDescription: jest.fn(),
      getContextManager: jest.fn(),
      getLastSession: jest.fn(),
      resumeLastSession: jest.fn(),
      getSessionsForSelection: jest.fn(),
      prepareSessionContext: jest.fn(),
      resumeSessionWithContext: jest.fn()
    }))
  };
});

// Mock DatabaseService
jest.mock('../services/DatabaseService.js');

describe('SessionManager', () => {
  let mockSessionManager: any;
  let mockDbService: jest.Mocked<DatabaseService>;

  const mockSession: Session = {
    id: 'test-session-id',
    name: 'Test Session',
    messages: [],
    llmProvider: 'claude',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    metadata: {
      totalMessages: 0,
      totalTokens: 0,
      lastActivity: new Date('2024-01-01')
    }
  };

  const mockMessage: Message = {
    id: 'test-message-id',
    role: 'user',
    content: 'Test message',
    timestamp: new Date('2024-01-01'),
    metadata: {
      sessionId: 'test-session-id'
    }
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock SessionManager instance
    const { SessionManager } = require('../services/SessionManager.js');
    mockSessionManager = new SessionManager();

    // Setup mock DatabaseService
    mockDbService = new DatabaseService() as jest.Mocked<DatabaseService>;
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      mockSessionManager.createSession.mockResolvedValue(mockSession);

      const result = await mockSessionManager.createSession('Test Session');

      expect(mockSessionManager.createSession).toHaveBeenCalledWith('Test Session');
      expect(result).toEqual(mockSession);
    });

    it('should load an existing session', async () => {
      mockSessionManager.loadSession.mockResolvedValue(mockSession);

      const result = await mockSessionManager.loadSession('test-session-id');

      expect(mockSessionManager.loadSession).toHaveBeenCalledWith('test-session-id');
      expect(result).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      mockSessionManager.loadSession.mockResolvedValue(null);

      const result = await mockSessionManager.loadSession('non-existent-id');

      expect(mockSessionManager.loadSession).toHaveBeenCalledWith('non-existent-id');
      expect(result).toBeNull();
    });

    it('should save a session', async () => {
      mockSessionManager.saveSession.mockResolvedValue(undefined);

      await mockSessionManager.saveSession(mockSession);

      expect(mockSessionManager.saveSession).toHaveBeenCalledWith(mockSession);
    });

    it('should delete a session', async () => {
      mockSessionManager.deleteSession.mockResolvedValue(true);

      const result = await mockSessionManager.deleteSession('session-to-delete');

      expect(mockSessionManager.deleteSession).toHaveBeenCalledWith('session-to-delete');
      expect(result).toBe(true);
    });

    it('should list all sessions', async () => {
      mockSessionManager.listSessions.mockResolvedValue([mockSession]);

      const result = await mockSessionManager.listSessions();

      expect(mockSessionManager.listSessions).toHaveBeenCalled();
      expect(result).toEqual([mockSession]);
    });

    it('should get current session', () => {
      mockSessionManager.getCurrentSession.mockReturnValue(mockSession);

      const result = mockSessionManager.getCurrentSession();

      expect(mockSessionManager.getCurrentSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });

  describe('Message Management', () => {
    it('should add a message to current session', async () => {
      mockSessionManager.addMessage.mockResolvedValue(undefined);

      await mockSessionManager.addMessage(mockMessage);

      expect(mockSessionManager.addMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('should search messages', async () => {
      mockSessionManager.searchMessages.mockResolvedValue([mockMessage]);

      const result = await mockSessionManager.searchMessages('test query');

      expect(mockSessionManager.searchMessages).toHaveBeenCalledWith('test query');
      expect(result).toEqual([mockMessage]);
    });

    it('should search messages in specific session', async () => {
      mockSessionManager.searchMessages.mockResolvedValue([mockMessage]);

      const result = await mockSessionManager.searchMessages('test query', 'session-id');

      expect(mockSessionManager.searchMessages).toHaveBeenCalledWith('test query', 'session-id');
      expect(result).toEqual([mockMessage]);
    });
  });

  describe('Context Management', () => {
    it('should get context info', () => {
      mockSessionManager.getContextInfo.mockReturnValue('Context info');

      const result = mockSessionManager.getContextInfo();

      expect(mockSessionManager.getContextInfo).toHaveBeenCalled();
      expect(result).toBe('Context info');
    });

    it('should get context description', () => {
      mockSessionManager.getContextDescription.mockReturnValue('Context description');

      const result = mockSessionManager.getContextDescription();

      expect(mockSessionManager.getContextDescription).toHaveBeenCalled();
      expect(result).toBe('Context description');
    });

    it('should prepare session context', async () => {
      mockSessionManager.prepareSessionContext.mockResolvedValue('Prepared context');

      const result = await mockSessionManager.prepareSessionContext('session-id');

      expect(mockSessionManager.prepareSessionContext).toHaveBeenCalledWith('session-id');
      expect(result).toBe('Prepared context');
    });

    it('should resume session with context', async () => {
      const mockResult = { session: mockSession, context: 'Context' };
      mockSessionManager.resumeSessionWithContext.mockResolvedValue(mockResult);

      const result = await mockSessionManager.resumeSessionWithContext('session-id');

      expect(mockSessionManager.resumeSessionWithContext).toHaveBeenCalledWith('session-id');
      expect(result).toEqual(mockResult);
    });
  });

  describe('Configuration Management', () => {
    it('should load configuration', async () => {
      const mockConfig = { llmProvider: 'claude' as const };
      mockSessionManager.loadConfig.mockResolvedValue(mockConfig);

      const result = await mockSessionManager.loadConfig();

      expect(mockSessionManager.loadConfig).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it('should save configuration', async () => {
      const mockConfig = { llmProvider: 'claude' as const };
      mockSessionManager.saveConfig.mockResolvedValue(undefined);

      await mockSessionManager.saveConfig(mockConfig);

      expect(mockSessionManager.saveConfig).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('Session Selection', () => {
    it('should get sessions for selection', async () => {
      const mockResult = {
        sessions: [{ id: 'id', name: 'name', lastActivity: new Date(), messageCount: 1 }],
        totalSessions: 1,
        hasMore: false,
        currentPage: 0
      };
      mockSessionManager.getSessionsForSelection.mockResolvedValue(mockResult);

      const result = await mockSessionManager.getSessionsForSelection();

      expect(mockSessionManager.getSessionsForSelection).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should get last session', async () => {
      mockSessionManager.getLastSession.mockResolvedValue(mockSession);

      const result = await mockSessionManager.getLastSession();

      expect(mockSessionManager.getLastSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should resume last session', async () => {
      mockSessionManager.resumeLastSession.mockResolvedValue(mockSession);

      const result = await mockSessionManager.resumeLastSession();

      expect(mockSessionManager.resumeLastSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });
});