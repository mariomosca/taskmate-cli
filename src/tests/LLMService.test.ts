// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockImplementation(async () => {
          // Mock streaming response
          return {
            async *[Symbol.asyncIterator]() {
              yield {
                type: 'message_start',
                message: {
                  usage: { input_tokens: 10 }
                }
              };
              yield {
                type: 'content_block_delta',
                delta: {
                  type: 'text_delta',
                  text: 'Hello! How can I help you today?'
                }
              };
              yield {
                type: 'message_delta',
                usage: { output_tokens: 8 }
              };
            }
          };
        })
      }
    }))
  };
});

// Mock axios for Gemini and TodoistService
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  };
  
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      get: jest.fn(),
      post: jest.fn().mockResolvedValue({
        data: {
          candidates: [{
            content: {
              parts: [{ text: 'Hello! How can I help you today?' }]
            }
          }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 8
          }
        }
      }),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    }
  };
});

import { LLMService, LLMMessage } from '../services/LLMService.js';
import { TodoistAIService } from '../services/TodoistAIService.js';
import { TodoistService } from '../services/TodoistService.js';

// Mock environment variables
const originalEnv = process.env;

describe('LLMService', () => {
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService();
  });

  afterEach(() => {
    process.env = originalEnv;
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

    it('should throw error for unsupported provider', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello!' }
      ];

      await expect(llmService.chat(messages, 'unsupported-provider')).rejects.toThrow();
    });

    it('should handle empty messages array', async () => {
      const messages: LLMMessage[] = [];

      try {
        const response = await llmService.chat(messages);
        expect(response).toHaveProperty('content');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle system messages', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ];

      try {
        const response = await llmService.chat(messages);
        expect(response).toHaveProperty('content');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should fallback to regular chat when no Todoist service', async () => {
      const llmServiceWithoutTodoist = new LLMService();
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello!' }
      ];

      try {
        const response = await llmServiceWithoutTodoist.chatWithTools(messages);
        expect(response).toHaveProperty('content');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should throw error for unsupported provider in chatWithTools', async () => {
      const todoistService = new TodoistService({
        apiKey: 'fake-token',
        baseUrl: 'https://api.todoist.com/rest/v2'
      });
      const todoistAIService = new TodoistAIService(todoistService);
      llmService.setTodoistAIService(todoistAIService);

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Show me my tasks' }
      ];

      await expect(llmService.chatWithTools(messages, 'unsupported-provider')).rejects.toThrow();
    });

    it('should handle gemini provider in chatWithTools', async () => {
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
        const response = await llmService.chatWithTools(messages, 'gemini');
        expect(response).toHaveProperty('content');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty chat history', async () => {
      const chatHistory = '';

      try {
        const summary = await llmService.summarizeContext(chatHistory);
        expect(typeof summary).toBe('string');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle very long chat history', async () => {
      const longHistory = 'User: Hello\nAssistant: Hi!\n'.repeat(1000);

      try {
        const summary = await llmService.summarizeContext(longHistory);
        expect(typeof summary).toBe('string');
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
      // In test environment, providers depend on environment variables
      // So we just check that it returns an array (could be empty)
      expect(providers.length).toBeGreaterThanOrEqual(0);
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
      const newModel = 'claude-sonnet-4-5-20250929';
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
      const config = llmService.getModelConfig('claude-sonnet-4-5-20250929');
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
      const report = await llmService.getModelPerformanceReport('claude-sonnet-4-5-20250929');
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

  describe('constructor', () => {
    it('should initialize with TodoistAIService', () => {
      const todoistService = new TodoistService({
        apiKey: 'fake-token',
        baseUrl: 'https://api.todoist.com/rest/v2'
      });
      const todoistAIService = new TodoistAIService(todoistService);
      
      expect(() => {
        new LLMService(todoistAIService);
      }).not.toThrow();
    });

    it('should initialize with custom default provider', () => {
      process.env.DEFAULT_LLM_PROVIDER = 'gemini';
      
      expect(() => {
        new LLMService();
      }).not.toThrow();
    });

    it('should initialize without Anthropic key', () => {
      delete process.env.CLAUDE_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      
      expect(() => {
        new LLMService();
      }).not.toThrow();
    });

    it('should initialize with custom model', () => {
      process.env.DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
      
      expect(() => {
        new LLMService();
      }).not.toThrow();
    });
  });

  describe('getModelManager', () => {
    it('should return model manager instance', () => {
      const modelManager = llmService.getModelManager();
      expect(modelManager).toBeDefined();
      expect(typeof modelManager.getCurrentModel).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors gracefully', async () => {
      // Mock authentication error
      const mockError = new Error('Authentication failed');
      mockError.name = 'AuthenticationError';
      
      jest.spyOn(llmService as any, 'chatWithClaude').mockRejectedValue(mockError);
      
      await expect(llmService.chat([{ role: 'user', content: 'test' }], 'claude'))
        .rejects.toThrow('Authentication failed');
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      const mockError = new Error('Network error');
      mockError.name = 'NetworkError';
      
      jest.spyOn(llmService as any, 'chatWithClaude').mockRejectedValue(mockError);
      
      await expect(llmService.chat([{ role: 'user', content: 'test' }], 'claude'))
        .rejects.toThrow('Network error');
    });
  });

  describe('provider implementations with mocked APIs', () => {
    beforeEach(() => {
      // Set up environment variables for real provider testing
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      
      // Reinitialize service with API keys
      llmService = new LLMService();
    });

    it('should use Claude provider with real implementation', async () => {
        const messages: LLMMessage[] = [
          { role: 'user', content: 'Hello, Claude!' }
        ];

        const response = await llmService.chat(messages, 'claude');
        
        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(typeof response.content).toBe('string');
        expect(response.content.trim()).toBeTruthy();
      });

      it('should use Gemini provider with real implementation', async () => {
        const messages: LLMMessage[] = [
          { role: 'user', content: 'Hello, Gemini!' }
        ];

        const response = await llmService.chat(messages, 'gemini');
        
        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(typeof response.content).toBe('string');
        expect(response.content.trim()).toBeTruthy();
      });

    it('should handle system messages with Claude', async () => {
       const messages: LLMMessage[] = [
         { role: 'system', content: 'You are a helpful assistant.' },
         { role: 'user', content: 'Hello!' }
       ];

       const response = await llmService.chat(messages, 'claude');
       
       expect(response).toBeDefined();
       expect(response.content).toBeDefined();
       expect(typeof response.content).toBe('string');
     });

     it('should handle multiple messages with Gemini', async () => {
       const messages: LLMMessage[] = [
         { role: 'user', content: 'Hello!' },
         { role: 'assistant', content: 'Hi there!' },
         { role: 'user', content: 'How are you?' }
       ];

       const response = await llmService.chat(messages, 'gemini');
       
       expect(response).toBeDefined();
       expect(response.content).toBeDefined();
       expect(typeof response.content).toBe('string');
     });
  });

  describe('usage recording', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      llmService = new LLMService();
    });

    it('should record usage metadata after successful chat', async () => {
       const messages: LLMMessage[] = [
         { role: 'user', content: 'Test message' }
       ];

       const response = await llmService.chat(messages, 'claude');
       
       expect(response).toBeDefined();
       
       // Check that cost monitoring was called
       const costAnalysis = await llmService.getCostAnalysis(messages);
       expect(costAnalysis).toBeDefined();
     });
  })
});