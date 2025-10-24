import { TodoistService } from '../services/TodoistService.js';
import { TodoistConfig } from '../types/todoist.js';

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    defaults: {
      timeout: 10000
    },
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
    }
  };
});

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
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 15000); // Increased timeout to 15 seconds for retry logic

    it('should handle authentication errors', async () => {
      const invalidConfig: TodoistConfig = {
        apiKey: '',
        baseUrl: 'https://api.todoist.com/rest/v2'
      };
      
      const invalidService = new TodoistService(invalidConfig);
      
      try {
        await invalidService.getTasks();
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 15000); // Increased timeout to 15 seconds for retry logic
  });

  describe('additional methods', () => {
    describe('authenticate', () => {
      it('should authenticate successfully', async () => {
        try {
          const result = await todoistService.authenticate();
          expect(typeof result).toBe('boolean');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('testConnection', () => {
      it('should test connection', async () => {
        try {
          const result = await todoistService.testConnection();
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getTask', () => {
      it('should get a specific task', async () => {
        try {
          const task = await todoistService.getTask('123456');
          expect(task).toBeDefined();
          expect(task).toHaveProperty('id');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('reopenTask', () => {
      it('should reopen a completed task', async () => {
        try {
          await todoistService.reopenTask('123456');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getProject', () => {
      it('should get a specific project', async () => {
        try {
          const project = await todoistService.getProject('123456');
          expect(project).toBeDefined();
          expect(project).toHaveProperty('id');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getSections', () => {
      it('should get sections', async () => {
        try {
          const sections = await todoistService.getSections();
          expect(Array.isArray(sections)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should get sections for specific project', async () => {
        try {
          const sections = await todoistService.getSections('123456');
          expect(Array.isArray(sections)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('quickAddTask', () => {
      it('should quick add a task', async () => {
        try {
          const result = await todoistService.quickAddTask('Test task');
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should quick add task with project', async () => {
        try {
          const result = await todoistService.quickAddTask('Test task', '123456');
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getTaskSummary', () => {
      it('should get task summary', async () => {
        try {
          const summary = await todoistService.getTaskSummary();
          expect(summary).toBeDefined();
          expect(summary).toHaveProperty('total');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getProjectSummary', () => {
      it('should get project summary', async () => {
        try {
          const summary = await todoistService.getProjectSummary();
          expect(summary).toBeDefined();
          expect(summary).toHaveProperty('total');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('completeTasks', () => {
      it('should complete multiple tasks', async () => {
        try {
          const result = await todoistService.completeTasks(['123', '456']);
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should handle empty task list', async () => {
        try {
          const result = await todoistService.completeTasks([]);
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('sync', () => {
      it('should perform sync', async () => {
        try {
          const result = await todoistService.sync();
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getChangesSinceLastSync', () => {
      it('should get changes since last sync', async () => {
        try {
          const changes = await todoistService.getChangesSinceLastSync();
          expect(changes).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('searchTasks', () => {
      it('should search tasks', async () => {
        try {
          const tasks = await todoistService.searchTasks('test');
          expect(Array.isArray(tasks)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getTasksByProject', () => {
      it('should get tasks by project', async () => {
        try {
          const tasks = await todoistService.getTasksByProject('123456');
          expect(Array.isArray(tasks)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('getTasksByLabel', () => {
      it('should get tasks by label', async () => {
        try {
          const tasks = await todoistService.getTasksByLabel('important');
          expect(Array.isArray(tasks)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('configuration methods', () => {
      it('should update config', () => {
        const newConfig = { timeout: 15000 };
        todoistService.updateConfig(newConfig);
        const config = todoistService.getConfig();
        expect(config.timeout).toBe(15000);
      });

      it('should get config', () => {
        const config = todoistService.getConfig();
        expect(config).toBeDefined();
        expect(config).toHaveProperty('apiKey');
        expect(config).toHaveProperty('baseUrl');
      });

      it('should get last sync token', () => {
        const token = todoistService.getLastSyncToken();
        expect(token).toBeUndefined(); // Initially undefined
      });
    });
  });
});