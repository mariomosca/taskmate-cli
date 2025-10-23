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
  SyncChanges,
  SyncState,
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
  private syncState: SyncState = {};

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
      // Fetch current data from Todoist
      const [currentTasks, currentProjects] = await Promise.all([
        this.getTasks(),
        this.getProjects()
      ]);

      // If this is the first sync, just cache the data
      if (!this.syncState.cached_tasks || !this.syncState.cached_projects) {
        this.syncState = {
          last_sync_token: Date.now().toString(),
          last_sync_timestamp: new Date().toISOString(),
          cached_tasks: currentTasks,
          cached_projects: currentProjects
        };

        const result: SyncResult = {
           tasks_added: currentTasks.length,
           tasks_updated: 0,
           tasks_completed: 0,
           projects_added: currentProjects.length,
           projects_updated: 0,
           sync_token: this.syncState.last_sync_token!,
           last_sync: this.syncState.last_sync_timestamp!
         };

        this.lastSyncToken = this.syncState.last_sync_token;
        return result;
      }

      // Compare with cached data to find changes
      const changes = this.detectChanges(
        this.syncState.cached_tasks,
        this.syncState.cached_projects,
        currentTasks,
        currentProjects
      );

      // Update cache
      this.syncState = {
        last_sync_token: Date.now().toString(),
        last_sync_timestamp: new Date().toISOString(),
        cached_tasks: currentTasks,
        cached_projects: currentProjects
      };

      const result: SyncResult = {
         tasks_added: changes.tasks.added.length,
         tasks_updated: changes.tasks.updated.length,
         tasks_completed: changes.tasks.completed.length,
         projects_added: changes.projects.added.length,
         projects_updated: changes.projects.updated.length,
         sync_token: this.syncState.last_sync_token!,
         last_sync: this.syncState.last_sync_timestamp!
       };

      this.lastSyncToken = this.syncState.last_sync_token;
      return result;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get detailed changes since last sync
   */
  async getChangesSinceLastSync(): Promise<SyncChanges | null> {
    try {
      if (!this.syncState.cached_tasks || !this.syncState.cached_projects) {
        // No previous sync data available
        return null;
      }

      const [currentTasks, currentProjects] = await Promise.all([
        this.getTasks(),
        this.getProjects()
      ]);

      return this.detectChanges(
        this.syncState.cached_tasks,
        this.syncState.cached_projects,
        currentTasks,
        currentProjects
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Detect changes between cached and current data
   */
  private detectChanges(
    cachedTasks: TodoistTask[],
    cachedProjects: TodoistProject[],
    currentTasks: TodoistTask[],
    currentProjects: TodoistProject[]
  ): SyncChanges {
    const changes: SyncChanges = {
      tasks: {
        added: [],
        updated: [],
        completed: [],
        deleted: []
      },
      projects: {
        added: [],
        updated: [],
        deleted: []
      },
      sync_token: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    // Create maps for efficient lookup
    const cachedTasksMap = new Map(cachedTasks.map(t => [t.id, t]));
    const cachedProjectsMap = new Map(cachedProjects.map(p => [p.id, p]));
    const currentTasksMap = new Map(currentTasks.map(t => [t.id, t]));
    const currentProjectsMap = new Map(currentProjects.map(p => [p.id, p]));

    // Detect task changes
    for (const currentTask of currentTasks) {
      const cachedTask = cachedTasksMap.get(currentTask.id);
      
      if (!cachedTask) {
        // New task
        changes.tasks.added.push(currentTask);
      } else {
        // Check if task was completed
        if (!cachedTask.is_completed && currentTask.is_completed) {
          changes.tasks.completed.push(currentTask);
        }
        // Check if task was updated (compare relevant fields)
        else if (this.hasTaskChanged(cachedTask, currentTask)) {
          changes.tasks.updated.push(currentTask);
        }
      }
    }

    // Detect deleted tasks
    for (const cachedTask of cachedTasks) {
      if (!currentTasksMap.has(cachedTask.id)) {
        changes.tasks.deleted.push(cachedTask.id);
      }
    }

    // Detect project changes
    for (const currentProject of currentProjects) {
      const cachedProject = cachedProjectsMap.get(currentProject.id);
      
      if (!cachedProject) {
        // New project
        changes.projects.added.push(currentProject);
      } else if (this.hasProjectChanged(cachedProject, currentProject)) {
        // Updated project
        changes.projects.updated.push(currentProject);
      }
    }

    // Detect deleted projects
    for (const cachedProject of cachedProjects) {
      if (!currentProjectsMap.has(cachedProject.id)) {
        changes.projects.deleted.push(cachedProject.id);
      }
    }

    return changes;
  }

  /**
   * Check if a task has changed (excluding completion status)
   */
  private hasTaskChanged(cached: TodoistTask, current: TodoistTask): boolean {
    return (
      cached.content !== current.content ||
      cached.description !== current.description ||
      cached.priority !== current.priority ||
      cached.project_id !== current.project_id ||
      cached.section_id !== current.section_id ||
      JSON.stringify(cached.labels) !== JSON.stringify(current.labels) ||
      JSON.stringify(cached.due) !== JSON.stringify(current.due)
    );
  }

  /**
   * Check if a project has changed
   */
  private hasProjectChanged(cached: TodoistProject, current: TodoistProject): boolean {
    return (
      cached.name !== current.name ||
      cached.color !== current.color ||
      cached.is_favorite !== current.is_favorite ||
      cached.view_style !== current.view_style ||
      cached.parent_id !== current.parent_id
    );
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