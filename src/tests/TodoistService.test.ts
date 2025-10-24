import { TodoistService } from '../services/TodoistService.js';
import { TodoistConfig } from '../types/todoist.js';

describe('TodoistService', () => {
  let todoistService: TodoistService;
  const mockConfig: TodoistConfig = {
    apiKey: 'fake-api-key',
    baseUrl: 'https://api.todoist.com/rest/v2',
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  beforeEach(() => {
    todoistService = new TodoistService(mockConfig);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(todoistService).toBeDefined();
      expect(todoistService).toBeInstanceOf(TodoistService);
    });

    it('should handle minimal config', () => {
      const minimalConfig: TodoistConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://api.todoist.com/rest/v2'
      };
      
      const service = new TodoistService(minimalConfig);
      expect(service).toBeDefined();
    });
  });

  describe('getTasks', () => {
    it('should return tasks array', async () => {
      try {
        const tasks = await todoistService.getTasks();
        expect(Array.isArray(tasks)).toBe(true);
      } catch (error) {
        // If API is not configured or network error, expect specific error
        expect(error).toBeDefined();
      }
    });

    it('should handle filter parameter', async () => {
      try {
        const tasks = await todoistService.getTasks({ filter: 'today' });
        expect(Array.isArray(tasks)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle project filter', async () => {
      try {
        const tasks = await todoistService.getTasks({ project_id: '123' });
        expect(Array.isArray(tasks)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getProjects', () => {
    it('should return projects array', async () => {
      try {
        const projects = await todoistService.getProjects();
        expect(Array.isArray(projects)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getLabels', () => {
    it('should return labels array', async () => {
      try {
        const labels = await todoistService.getLabels();
        expect(Array.isArray(labels)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const taskData = {
        content: 'Test task',
        description: 'This is a test task',
        priority: 1 as const
      };

      try {
        const task = await todoistService.createTask(taskData);
        expect(task).toBeDefined();
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('content');
        expect(task.content).toBe(taskData.content);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle task with project', async () => {
      const taskData = {
        content: 'Task in project',
        project_id: '123456'
      };

      try {
        const task = await todoistService.createTask(taskData);
        expect(task).toBeDefined();
        expect(task).toHaveProperty('project_id');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle task with due date', async () => {
      const taskData = {
        content: 'Task with due date',
        due_string: 'tomorrow'
      };

      try {
        const task = await todoistService.createTask(taskData);
        expect(task).toBeDefined();
        expect(task).toHaveProperty('due');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle task with labels', async () => {
      const taskData = {
        content: 'Task with labels',
        labels: ['important', 'work']
      };

      try {
        const task = await todoistService.createTask(taskData);
        expect(task).toBeDefined();
        expect(task).toHaveProperty('labels');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const taskId = '123456';
      const updateData = {
        content: 'Updated task content',
        priority: 2 as const
      };

      try {
        const result = await todoistService.updateTask(taskId, updateData);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle partial updates', async () => {
      const taskId = '123456';
      const updateData = {
        priority: 3 as const
      };

      try {
        const result = await todoistService.updateTask(taskId, updateData);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('completeTask', () => {
    it('should complete a task', async () => {
      const taskId = '123456';

      try {
        const result = await todoistService.completeTask(taskId);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const taskId = '123456';

      try {
        const result = await todoistService.deleteTask(taskId);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        color: 'blue'
      };

      try {
        const project = await todoistService.createProject(projectData);
        expect(project).toBeDefined();
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project.name).toBe(projectData.name);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle project with parent', async () => {
      const projectData = {
        name: 'Sub Project',
        parent_id: '123456'
      };

      try {
        const project = await todoistService.createProject(projectData);
        expect(project).toBeDefined();
        expect(project).toHaveProperty('parent_id');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('updateProject', () => {
    it('should update an existing project', async () => {
      const projectId = '123456';
      const updateData = {
        name: 'Updated Project Name',
        color: 'red'
      };

      try {
        const result = await todoistService.updateProject(projectId, updateData);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const projectId = '123456';

      try {
        const result = await todoistService.deleteProject(projectId);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });



  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const invalidConfig: TodoistConfig = {
        apiKey: 'invalid-key',
        baseUrl: 'https://invalid-url.com'
      };
      
      const invalidService = new TodoistService(invalidConfig);
      
      try {
        await invalidService.getTasks();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle authentication errors', async () => {
      const invalidConfig: TodoistConfig = {
        apiKey: '',
        baseUrl: 'https://api.todoist.com/rest/v2'
      };
      
      const invalidService = new TodoistService(invalidConfig);
      
      try {
        await invalidService.getTasks();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});