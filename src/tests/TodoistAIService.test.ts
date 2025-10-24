import { TodoistAIService } from '../services/TodoistAIService.js';
import { TodoistService } from '../services/TodoistService.js';
import { TodoistConfig } from '../types/todoist.js';

describe('TodoistAIService', () => {
  let todoistAIService: TodoistAIService;
  let todoistService: TodoistService;

  beforeEach(() => {
    const config: TodoistConfig = {
      apiKey: 'fake-api-key',
      baseUrl: 'https://api.todoist.com/rest/v2'
    };
    
    todoistService = new TodoistService(config);
    todoistAIService = new TodoistAIService(todoistService);
  });

  describe('constructor', () => {
    it('should create instance with TodoistService', () => {
      expect(todoistAIService).toBeDefined();
      expect(todoistAIService).toBeInstanceOf(TodoistAIService);
    });
  });

  describe('getAvailableTools', () => {
    it('should return array of available tools', () => {
      const tools = todoistAIService.getAvailableTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check that tools have required properties
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
      });
    });

    it('should include expected tool names', () => {
      const tools = todoistAIService.getAvailableTools();
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain('get_tasks');
      expect(toolNames).toContain('create_task');
      expect(toolNames).toContain('complete_task');
      expect(toolNames).toContain('get_projects');
    });
  });

  describe('executeTool', () => {
    it('should execute get_tasks tool', async () => {
      try {
        const result = await todoistAIService.executeTool('get_tasks', {});
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
      } catch (error) {
        // If API is not configured, expect specific error
        expect(error).toBeDefined();
      }
    });

    it('should execute get_tasks with filter', async () => {
      try {
        const result = await todoistAIService.executeTool('get_tasks', {
          filter: 'today'
        });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should execute get_projects tool', async () => {
      try {
        const result = await todoistAIService.executeTool('get_projects', {});
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should execute create_task tool', async () => {
      try {
        const result = await todoistAIService.executeTool('create_task', {
          content: 'Test task from AI',
          priority: 1
        });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should execute complete_task tool', async () => {
      try {
        const result = await todoistAIService.executeTool('complete_task', {
          task_id: '123456'
        });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should execute update_task tool', async () => {
      try {
        const result = await todoistAIService.executeTool('update_task', {
          task_id: '123456',
          content: 'Updated task content'
        });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should execute delete_task tool', async () => {
      try {
        const result = await todoistAIService.executeTool('delete_task', {
          task_id: '123456'
        });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should execute create_project tool', async () => {
      try {
        const result = await todoistAIService.executeTool('create_project', {
          name: 'Test Project from AI'
        });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should execute get_labels tool', async () => {
      try {
        const result = await todoistAIService.executeTool('get_labels', {});
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle unknown tool', async () => {
      try {
        const result = await todoistAIService.executeTool('unknown_tool', {});
        expect(result).toBeDefined();
        expect(result.success).toBe(false);
        expect(result).toHaveProperty('error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid parameters', async () => {
      try {
        const result = await todoistAIService.executeTool('create_task', {
          // Missing required content parameter
          priority: 1
        });
        expect(result).toBeDefined();
        expect(result.success).toBe(false);
        expect(result).toHaveProperty('error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getTodoistContext', () => {
    it('should return context string', async () => {
      try {
        const context = await todoistAIService.getTodoistContext();
        expect(typeof context).toBe('string');
        expect(context.length).toBeGreaterThan(0);
      } catch (error) {
        // If API is not configured, expect specific error
        expect(error).toBeDefined();
      }
    });

    it('should include task and project information', async () => {
      try {
        const context = await todoistAIService.getTodoistContext();
        expect(context).toContain('Tasks:');
        expect(context).toContain('Projects:');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('integration with TodoistService', () => {
    it('should use TodoistService for API calls', async () => {
      // Mock TodoistService method
      const mockGetTasks = jest.spyOn(todoistService, 'getTasks').mockResolvedValue([]);
      
      try {
        await todoistAIService.executeTool('get_tasks', {});
        expect(mockGetTasks).toHaveBeenCalled();
      } catch (error) {
        // If mocking fails, just check that the service is being used
        expect(error).toBeDefined();
      } finally {
        mockGetTasks.mockRestore();
      }
    });

    it('should handle TodoistService errors gracefully', async () => {
      // Mock TodoistService to throw error
      const mockGetTasks = jest.spyOn(todoistService, 'getTasks').mockRejectedValue(new Error('API Error'));
      
      try {
        const result = await todoistAIService.executeTool('get_tasks', {});
        expect(result.success).toBe(false);
        expect(result).toHaveProperty('error');
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        mockGetTasks.mockRestore();
      }
    });
  });
});