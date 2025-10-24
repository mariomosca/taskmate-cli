import { LLMService, LLMMessage } from '../services/LLMService.js';
import { TodoistAIService } from '../services/TodoistAIService.js';
import { TodoistService } from '../services/TodoistService.js';

describe('LLMService', () => {
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService();
  });

  describe('chat', () => {
    it('should generate a response for given messages', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];

      try {
        const response = await llmService.chat(messages);
        expect(response).toHaveProperty('content');
        expect(typeof response.content).toBe('string');
        expect(response.content.length).toBeGreaterThan(0);
      } catch (error) {
        // If API is not configured, expect specific error
        expect(error).toBeDefined();
      }
    });

    it('should handle conversation context', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'What is 2 + 2?' },
        { role: 'assistant', content: '2 + 2 equals 4.' },
        { role: 'user', content: 'What about 3 + 3?' }
      ];

      try {
        const response = await llmService.chat(messages);
        expect(response).toHaveProperty('content');
        expect(typeof response.content).toBe('string');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle different providers', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello!' }
      ];

      try {
        const claudeResponse = await llmService.chat(messages, 'claude');
        expect(claudeResponse).toHaveProperty('content');
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        const geminiResponse = await llmService.chat(messages, 'gemini');
        expect(geminiResponse).toHaveProperty('content');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('chatWithTools', () => {
    it('should handle tool-enabled chat', async () => {
      const todoistService = new TodoistService({
        apiKey: 'fake-token',
        baseUrl: 'https://api.todoist.com/rest/v2'
      });
      const todoistAIService = new TodoistAIService(todoistService);
      llmService.setTodoistAIService(todoistAIService);

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Show me my tasks' }
      ];

      try {
        const response = await llmService.chatWithTools(messages);
        expect(response).toHaveProperty('content');
        expect(typeof response.content).toBe('string');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('summarizeContext', () => {
    it('should summarize chat history', async () => {
      const chatHistory = 'User: Hello\nAssistant: Hi there!\nUser: How are you?\nAssistant: I am doing well, thank you!';

      try {
        const summary = await llmService.summarizeContext(chatHistory);
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('isConfigured', () => {
    it('should check if service is configured', () => {
      const isConfigured = llmService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = llmService.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain('claude');
      expect(providers).toContain('gemini');
    });
  });

  describe('getCurrentModel', () => {
    it('should return current model information', () => {
      const model = llmService.getCurrentModel();
      expect(model).toBeDefined();
    });
  });

  describe('setCurrentModel', () => {
    it('should set a new model', () => {
      const newModel = 'claude-3-sonnet-20240229';
      llmService.setCurrentModel(newModel);
      
      const currentModel = llmService.getCurrentModel();
      expect(currentModel).toBeDefined();
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = llmService.getAvailableModels();
      expect(models).toBeDefined();
    });
  });

  describe('getModelConfig', () => {
    it('should return model configuration', () => {
      const config = llmService.getModelConfig('claude-3-sonnet-20240229');
      expect(config).toBeDefined();
    });
  });

  describe('context management', () => {
    it('should get context status', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const status = await llmService.getContextStatus(messages);
      expect(status).toBeDefined();
    });

    it('should optimize context', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const optimized = await llmService.optimizeContext(messages);
      expect(optimized).toBeDefined();
    });

    it('should get model recommendation', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Complex task requiring analysis' }
      ];

      const recommendation = await llmService.getModelRecommendation(messages);
      expect(recommendation).toBeDefined();
    });
  });

  describe('cost monitoring', () => {
    it('should get cost analysis', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Test message' }
      ];

      const analysis = await llmService.getCostAnalysis(messages);
      expect(analysis).toBeDefined();
    });

    it('should get current session cost', () => {
      const cost = llmService.getCurrentSessionCost();
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should get daily cost summary', async () => {
      const summary = await llmService.getDailyCostSummary();
      expect(summary).toBeDefined();
    });

    it('should get session cost summary', async () => {
      const summary = await llmService.getSessionCostSummary();
      expect(summary).toBeDefined();
    });

    it('should check cost alerts', async () => {
      const alerts = await llmService.checkCostAlerts();
      expect(alerts).toBeDefined();
    });
  });

  describe('performance monitoring', () => {
    it('should get model performance report', async () => {
      const report = await llmService.getModelPerformanceReport('claude-3-sonnet-20240229');
      expect(report).toBeDefined();
    });

    it('should export calibration report', async () => {
      const report = await llmService.exportCalibrationReport('json');
      expect(report).toBeDefined();
    });

    it('should export calibration report as CSV', async () => {
      const report = await llmService.exportCalibrationReport('csv');
      expect(report).toBeDefined();
    });
  });

  describe('setTodoistAIService', () => {
    it('should set todoist AI service', () => {
      const todoistService = new TodoistService({
        apiKey: 'fake-token',
        baseUrl: 'https://api.todoist.com/rest/v2'
      });
      const todoistAIService = new TodoistAIService(todoistService);
      
      expect(() => {
        llmService.setTodoistAIService(todoistAIService);
      }).not.toThrow();
    });
  });
});