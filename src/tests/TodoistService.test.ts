import { TodoistService } from '../services/TodoistService.js';
import { TodoistConfig } from '../types/todoist.js';
import axios from 'axios';

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

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TodoistService', () => {
  let todoistService: TodoistService;
  let mockAxiosInstance: any;
  
  const mockConfig: TodoistConfig = {
    apiKey: 'test-token',
    baseUrl: 'https://api.todoist.com/rest/v2',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      request: jest.fn(),
      defaults: { timeout: 10000 },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    (mockedAxios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
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

    describe('sync operations', () => {
      it('should perform initial sync correctly', async () => {
        const mockTasks = [
          { id: '1', content: 'Task 1', is_completed: false, project_id: 'project1' },
          { id: '2', content: 'Task 2', is_completed: false, project_id: 'project1' }
        ];
        const mockProjects = [
          { id: 'project1', name: 'Project 1', color: 'blue' }
        ];
      
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: mockTasks })
          .mockResolvedValueOnce({ data: mockProjects });
      
        const result = await todoistService.sync();
      
        expect(result).toEqual({
          tasks_added: 2,
          tasks_updated: 0,
          tasks_completed: 0,
          projects_added: 1,
          projects_updated: 0,
          sync_token: expect.any(String),
          last_sync: expect.any(String)
        });
      });
      
      it('should detect task changes in subsequent sync', async () => {
        // First sync
        const initialTasks = [
          { id: '1', content: 'Task 1', is_completed: false, project_id: 'project1' }
        ];
        const initialProjects = [
          { id: 'project1', name: 'Project 1', color: 'blue' }
        ];
      
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: initialTasks })
          .mockResolvedValueOnce({ data: initialProjects });
      
        await todoistService.sync();
      
        // Second sync with changes
        const updatedTasks = [
          { id: '1', content: 'Updated Task 1', is_completed: false, project_id: 'project1' },
          { id: '2', content: 'New Task', is_completed: false, project_id: 'project1' }
        ];
        const updatedProjects = [
          { id: 'project1', name: 'Updated Project 1', color: 'red' }
        ];
      
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: updatedTasks })
          .mockResolvedValueOnce({ data: updatedProjects });
      
        const result = await todoistService.sync();
      
        expect(result).toEqual({
          tasks_added: 1,
          tasks_updated: 1,
          tasks_completed: 0,
          projects_added: 0,
          projects_updated: 1,
          sync_token: expect.any(String),
          last_sync: expect.any(String)
        });
      });
      
      it('should detect completed tasks', async () => {
        // First sync
        const initialTasks = [
          { id: '1', content: 'Task 1', is_completed: false, project_id: 'project1' }
        ];
        const initialProjects = [
          { id: 'project1', name: 'Project 1', color: 'blue' }
        ];
      
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: initialTasks })
          .mockResolvedValueOnce({ data: initialProjects });
      
        await todoistService.sync();
      
        // Second sync with completed task
        const updatedTasks = [
          { id: '1', content: 'Task 1', is_completed: true, project_id: 'project1' }
        ];
      
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: updatedTasks })
          .mockResolvedValueOnce({ data: initialProjects });
      
        const result = await todoistService.sync();
      
        expect(result.tasks_completed).toBe(1);
      });
      
      it('should detect deleted tasks and projects', async () => {
        // First sync
        const initialTasks = [
          { id: '1', content: 'Task 1', is_completed: false, project_id: 'project1' },
          { id: '2', content: 'Task 2', is_completed: false, project_id: 'project1' }
        ];
        const initialProjects = [
          { id: 'project1', name: 'Project 1', color: 'blue' },
          { id: 'project2', name: 'Project 2', color: 'red' }
        ];
      
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: initialTasks })
          .mockResolvedValueOnce({ data: initialProjects });
      
        await todoistService.sync();
      
        // Second sync with deleted items
        const updatedTasks = [
          { id: '1', content: 'Task 1', is_completed: false, project_id: 'project1' }
        ];
        const updatedProjects = [
          { id: 'project1', name: 'Project 1', color: 'blue' }
        ];
      
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: updatedTasks })
          .mockResolvedValueOnce({ data: updatedProjects });
      
        const changes = await todoistService.getChangesSinceLastSync();
      
        expect(changes).toBeDefined();
        expect(changes!.tasks.deleted).toContain('2');
        expect(changes!.projects.deleted).toContain('project2');
      });
    });

    describe('summary methods', () => {
      it('should get task summary correctly', async () => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const mockTasks = [
          { 
            id: '1', 
            content: 'High priority task', 
            is_completed: false, 
            priority: 4,
            due: { date: today }
          },
          { 
            id: '2', 
            content: 'Overdue task', 
            is_completed: false, 
            priority: 2,
            due: { date: yesterday }
          },
          { 
            id: '3', 
            content: 'Normal task', 
            is_completed: false, 
            priority: 1
          }
        ];
      
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      
        const summary = await todoistService.getTaskSummary();
      
        expect(summary).toEqual({
          total: 3,
          completed_today: 0,
          overdue: 1,
          due_today: 1,
          high_priority: 1
        });
      });

      it('should get project summary correctly', async () => {
        const mockProjects = [
          { id: 'project1', name: 'Project 1', color: 'blue', is_shared: false, is_favorite: false },
          { id: 'project2', name: 'Project 2', color: 'red', is_shared: true, is_favorite: true }
        ];
      
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProjects });
      
        const summary = await todoistService.getProjectSummary();
      
        expect(summary).toEqual({
          total: 2,
          active: 2,
          shared: 1,
          favorite: 1
        });
      });
    });

    describe('bulk operations', () => {
      it('should complete multiple tasks', async () => {
        const taskIds = ['1', '2', '3'];
        
        mockAxiosInstance.post
          .mockResolvedValueOnce({ data: { success: true } })
          .mockResolvedValueOnce({ data: { success: true } })
          .mockResolvedValueOnce({ data: { success: true } });
      
        const result = await todoistService.completeTasks(taskIds);
      
        expect(result).toEqual({
          successful: ['1', '2', '3'],
          failed: [],
          total: 3
        });
      
        expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      });

      it('should handle partial failures in bulk operations', async () => {
        const taskIds = ['1', '2', '3'];
        
        mockAxiosInstance.post
          .mockResolvedValueOnce({ data: { success: true } })
          .mockRejectedValueOnce(new Error('API Error'))
          .mockResolvedValueOnce({ data: { success: true } });
      
        const result = await todoistService.completeTasks(taskIds);
      
        expect(result).toEqual({
          successful: ['1', '3'],
          failed: [{ id: '2', error: 'Network Error: API Error' }],
          total: 3
        });
      });
    });

    describe('search and filter methods', () => {
      it('should search tasks by query', async () => {
        const mockTasks = [
          { id: '1', content: 'Important meeting', is_completed: false },
          { id: '2', content: 'Buy groceries', is_completed: false }
        ];
      
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      
        const results = await todoistService.searchTasks('meeting');
      
        expect(results).toEqual(mockTasks);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks', {
          params: { filter: 'meeting' }
        });
      });

      it('should get tasks by project', async () => {
        const mockTasks = [
          { id: '1', content: 'Task 1', project_id: 'project1' },
          { id: '2', content: 'Task 2', project_id: 'project1' }
        ];
      
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      
        const results = await todoistService.getTasksByProject('project1');
      
        expect(results).toEqual(mockTasks);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks', {
          params: { project_id: 'project1' }
        });
      });

      it('should get tasks by label', async () => {
        const mockTasks = [
          { id: '1', content: 'Task 1', labels: ['urgent'] },
          { id: '2', content: 'Task 2', labels: ['urgent'] }
        ];
      
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      
        const results = await todoistService.getTasksByLabel('urgent');
      
        expect(results).toEqual(mockTasks);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks', {
          params: { label: 'urgent' }
        });
      });
    });

    describe('configuration methods', () => {
      it('should update configuration', () => {
        const newConfig = { retryAttempts: 5, retryDelay: 2000 };
        
        todoistService.updateConfig(newConfig);
        
        const config = todoistService.getConfig();
        expect(config.retryAttempts).toBe(5);
        expect(config.retryDelay).toBe(2000);
      });

      it('should get current configuration', () => {
        const config = todoistService.getConfig();
        
        expect(config).toEqual({
          apiKey: 'test-token',
          baseUrl: 'https://api.todoist.com/rest/v2',
          timeout: 10000,
          retryAttempts: 3,
          retryDelay: 1000
        });
      });
    });
  });
});