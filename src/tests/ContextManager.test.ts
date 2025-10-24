import { ContextManager } from '../services/ContextManager.js';
import { LLMService } from '../services/LLMService.js';
import { TodoistAIService } from '../services/TodoistAIService.js';
import { TodoistService } from '../services/TodoistService.js';
import { Message } from '../types/index.js';

describe('ContextManager', () => {
  let contextManager: ContextManager;
  let llmService: LLMService;
  let todoistService: TodoistAIService;

  // Helper function to create a valid Message
  const createMessage = (role: 'user' | 'assistant' | 'system', content: string): Message => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    role,
    content,
    timestamp: new Date()
  });

  beforeEach(() => {
    llmService = new LLMService();
    const todoistBaseService = new TodoistService({ 
      apiKey: 'fake-token',
      baseUrl: 'https://api.todoist.com/rest/v2'
    });
    todoistService = new TodoistAIService(todoistBaseService);
    contextManager = new ContextManager(llmService, todoistService);
  });

  describe('calculateTotalTokens', () => {
    it('should calculate total tokens for a list of messages', () => {
      const messages: Message[] = [
        createMessage('user', 'Hello, how are you?'),
        createMessage('assistant', 'I am doing well, thank you for asking!'),
        createMessage('user', 'Great!')
      ];

      const totalTokens = contextManager.calculateTotalTokens(messages);
      expect(totalTokens).toBeGreaterThan(0);
      expect(typeof totalTokens).toBe('number');
    });

    it('should return 0 for empty message list', () => {
      const messages: Message[] = [];
      const totalTokens = contextManager.calculateTotalTokens(messages);
      expect(totalTokens).toBe(0);
    });

    it('should handle messages with different roles', () => {
      const messages: Message[] = [
        createMessage('system', 'You are a helpful assistant'),
        createMessage('user', 'What is the weather like?')
      ];

      const totalTokens = contextManager.calculateTotalTokens(messages);
      expect(totalTokens).toBeGreaterThan(0);
    });
  });

  describe('getContextStatus', () => {
    it('should return context status information', () => {
      const messages: Message[] = [
        createMessage('user', 'Test message'),
        createMessage('assistant', 'Test response')
      ];

      const status = contextManager.getContextStatus(messages);
      expect(status).toHaveProperty('totalTokens');
      expect(status).toHaveProperty('maxTokens');
      expect(status).toHaveProperty('percentage');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('needsSummarization');
      expect(status.totalTokens).toBeGreaterThan(0);
    });

    it('should handle empty context', () => {
      const messages: Message[] = [];
      const status = contextManager.getContextStatus(messages);
      expect(status.totalTokens).toBe(0);
    });
  });

  describe('summarizeContextIfNeeded', () => {
    it('should return summarization result', async () => {
      const messages: Message[] = [
        createMessage('user', 'Short message')
      ];

      const result = await contextManager.summarizeContextIfNeeded(messages);
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('wasSummarized');
      expect(Array.isArray(result.messages)).toBe(true);
    });
  });

  describe('prepareOptimizedContext', () => {
    it('should prepare optimized context for messages', async () => {
      const messages: Message[] = [
        createMessage('user', 'Test message'),
        createMessage('assistant', 'Test response')
      ];

      const optimized = await contextManager.prepareOptimizedContext(messages);
      expect(optimized).toHaveProperty('optimizedMessages');
      expect(optimized).toHaveProperty('contextInfo');
      expect(Array.isArray(optimized.optimizedMessages)).toBe(true);
    });
  });

  describe('prepareEnhancedContext', () => {
    it('should prepare enhanced context with todoist integration', async () => {
      const messages: Message[] = [
        createMessage('user', 'Show me my tasks'),
        createMessage('assistant', 'Here are your tasks')
      ];

      const enhanced = await contextManager.prepareEnhancedContext(messages);
      expect(enhanced).toHaveProperty('enhancedMessages');
      expect(enhanced).toHaveProperty('contextInfo');
      expect(Array.isArray(enhanced.enhancedMessages)).toBe(true);
      expect(enhanced.contextInfo).toHaveProperty('hasTodoistContext');
    });
  });

  describe('setTodoistAIService', () => {
    it('should set todoist AI service', () => {
      const newTodoistService = new TodoistAIService(new TodoistService({ 
        apiKey: 'new-token',
        baseUrl: 'https://api.todoist.com/rest/v2'
      }));
      
      expect(() => {
        contextManager.setTodoistAIService(newTodoistService);
      }).not.toThrow();
    });
  });

  describe('formatContextInfo', () => {
    it('should format context information', () => {
      const messages: Message[] = [
        createMessage('user', 'Test message'),
        createMessage('assistant', 'Test response')
      ];

      const formatted = contextManager.formatContextInfo(messages);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('getContextDescription', () => {
    it('should get context description', () => {
      const messages: Message[] = [
        createMessage('user', 'Test message'),
        createMessage('assistant', 'Test response')
      ];

      const description = contextManager.getContextDescription(messages);
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });
});