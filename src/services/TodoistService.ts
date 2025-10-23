import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  TodoistTask,
  TodoistProject,
  TodoistSection,
  TodoistLabel,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
  TaskFilter,
  ProjectFilter,
  TodoistConfig,
  TodoistApiError,
  SyncResult,
  TaskSummary,
  ProjectSummary,
  QuickAddResult,
  BulkOperationResult,
  CommandResult
} from '../types/todoist.js';

export class TodoistService {
  private client: AxiosInstance;
  private config: TodoistConfig;
  private lastSyncToken?: string;

  constructor(config: TodoistConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Request-Id': this.generateRequestId()
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging and retry logic
    this.client.interceptors.request.use(
      (config) => {
        config.headers['X-Request-Id'] = this.generateRequestId();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          // Rate limiting - wait and retry
          await this.delay(this.config.retryDelay!);
          return this.client.request(error.config!);
        }
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private generateRequestId(): string {
    return `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleApiError(error: AxiosError): Error {
    if (error.response?.data) {
      const apiError = error.response.data as TodoistApiError;
      return new Error(`Todoist API Error: ${apiError.error} (Code: ${apiError.error_code})`);
    }
    return new Error(`Network Error: ${error.message}`);
  }

  // Authentication and Connection
  async authenticate(): Promise<boolean> {
    try {
      await this.getProjects();
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<CommandResult> {
    try {
      const projects = await this.getProjects();
      return {
        success: true,
        message: `Connected successfully. Found ${projects.length} projects.`,
        data: { projectCount: projects.length }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Task Operations
  async getTasks(filter?: TaskFilter): Promise<TodoistTask[]> {
    try {
      const params: Record<string, any> = {};
      
      if (filter?.project_id) params.project_id = filter.project_id;
      if (filter?.section_id) params.section_id = filter.section_id;
      if (filter?.label) params.label = filter.label;
      if (filter?.filter) params.filter = filter.filter;
      if (filter?.lang) params.lang = filter.lang;
      if (filter?.ids) params.ids = filter.ids.join(',');

      const response = await this.client.get<TodoistTask[]>('/tasks', { params });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async getTask(id: string): Promise<TodoistTask> {
    try {
      const response = await this.client.get<TodoistTask>(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async createTask(taskData: CreateTaskRequest): Promise<TodoistTask> {
    try {
      const response = await this.client.post<TodoistTask>('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async updateTask(id: string, updates: UpdateTaskRequest): Promise<TodoistTask> {
    try {
      const response = await this.client.post<TodoistTask>(`/tasks/${id}`, updates);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async completeTask(id: string): Promise<void> {
    try {
      await this.client.post(`/tasks/${id}/close`);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async reopenTask(id: string): Promise<void> {
    try {
      await this.client.post(`/tasks/${id}/reopen`);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      await this.client.delete(`/tasks/${id}`);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  // Project Operations
  async getProjects(filter?: ProjectFilter): Promise<TodoistProject[]> {
    try {
      const params: Record<string, any> = {};
      if (filter?.ids) params.ids = filter.ids.join(',');

      const response = await this.client.get<TodoistProject[]>('/projects', { params });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async getProject(id: string): Promise<TodoistProject> {
    try {
      const response = await this.client.get<TodoistProject>(`/projects/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async createProject(projectData: CreateProjectRequest): Promise<TodoistProject> {
    try {
      const response = await this.client.post<TodoistProject>('/projects', projectData);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async updateProject(id: string, updates: UpdateProjectRequest): Promise<TodoistProject> {
    try {
      const response = await this.client.post<TodoistProject>(`/projects/${id}`, updates);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await this.client.delete(`/projects/${id}`);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  // Section Operations
  async getSections(projectId?: string): Promise<TodoistSection[]> {
    try {
      const params = projectId ? { project_id: projectId } : {};
      const response = await this.client.get<TodoistSection[]>('/sections', { params });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  // Label Operations
  async getLabels(): Promise<TodoistLabel[]> {
    try {
      const response = await this.client.get<TodoistLabel[]>('/labels');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  // Quick Operations for CLI
  async quickAddTask(content: string, projectId?: string): Promise<QuickAddResult> {
    try {
      const taskData: CreateTaskRequest = {
        content,
        project_id: projectId
      };

      const task = await this.createTask(taskData);
      
      return {
        task,
        success: true,
        message: `Task "${content}" added successfully`
      };
    } catch (error) {
      return {
        task: {} as TodoistTask,
        success: false,
        message: `Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getTaskSummary(): Promise<TaskSummary> {
    try {
      const tasks = await this.getTasks();
      const today = new Date().toISOString().split('T')[0];
      
      const summary: TaskSummary = {
        total: tasks.length,
        completed_today: 0,
        overdue: 0,
        due_today: 0,
        high_priority: tasks.filter(t => t.priority >= 3).length
      };

      tasks.forEach(task => {
        if (task.due) {
          const dueDate = task.due.date;
          if (dueDate === today) {
            summary.due_today++;
          } else if (dueDate < today) {
            summary.overdue++;
          }
        }
      });

      return summary;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async getProjectSummary(): Promise<ProjectSummary> {
    try {
      const projects = await this.getProjects();
      
      return {
        total: projects.length,
        active: projects.length, // All fetched projects are active
        shared: projects.filter(p => p.is_shared).length,
        favorite: projects.filter(p => p.is_favorite).length
      };
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  // Bulk Operations
  async completeTasks(taskIds: string[]): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      total: taskIds.length
    };

    for (const id of taskIds) {
      try {
        await this.completeTask(id);
        result.successful.push(id);
      } catch (error) {
        result.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Sync Operations
  async sync(): Promise<SyncResult> {
    try {
      // For now, we'll implement a simple sync by fetching current data
      const [tasks, projects] = await Promise.all([
        this.getTasks(),
        this.getProjects()
      ]);

      const result: SyncResult = {
        tasks_added: 0,
        tasks_updated: tasks.length,
        tasks_completed: 0,
        projects_added: 0,
        projects_updated: projects.length,
        last_sync: new Date().toISOString()
      };

      this.lastSyncToken = Date.now().toString();
      return result;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  // Utility Methods
  getLastSyncToken(): string | undefined {
    return this.lastSyncToken;
  }

  async searchTasks(query: string): Promise<TodoistTask[]> {
    try {
      const tasks = await this.getTasks({ filter: query });
      return tasks;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  async getTasksByProject(projectId: string): Promise<TodoistTask[]> {
    return this.getTasks({ project_id: projectId });
  }

  async getTasksByLabel(label: string): Promise<TodoistTask[]> {
    return this.getTasks({ label });
  }

  // Configuration
  updateConfig(newConfig: Partial<TodoistConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.apiKey) {
      this.client.defaults.headers['Authorization'] = `Bearer ${newConfig.apiKey}`;
    }
    
    if (newConfig.baseUrl) {
      this.client.defaults.baseURL = newConfig.baseUrl;
    }
    
    if (newConfig.timeout) {
      this.client.defaults.timeout = newConfig.timeout;
    }
  }

  getConfig(): TodoistConfig {
    return { ...this.config };
  }
}

// Factory function for creating TodoistService instance
export function createTodoistService(config: TodoistConfig): TodoistService {
  return new TodoistService(config);
}

// Default export
export default TodoistService;