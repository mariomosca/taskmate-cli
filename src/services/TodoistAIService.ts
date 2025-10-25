import { TodoistService } from './TodoistService.js';
import { 
  TodoistTask, 
  TodoistProject, 
  CreateTaskRequest, 
  CreateProjectRequest,
  TaskFilter,
  ProjectFilter,
  TaskSummary,
  ProjectSummary
} from '../types/todoist.js';
import { UIMessageManager } from '../utils/UIMessages.js';

/**
 * Tool definition for LLM function calling
 */
export interface TodoistTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  handler: (params: any) => Promise<any>;
}

/**
 * Result of a Todoist operation for LLM response
 */
export interface TodoistOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Enhanced Todoist service with AI function calling capabilities
 * This service wraps the existing TodoistService and provides
 * structured tools that can be called by the LLM
 */
export class TodoistAIService {
  private todoistService: TodoistService;
  private tools: Map<string, TodoistTool> = new Map();

  constructor(todoistService: TodoistService) {
    this.todoistService = todoistService;
    this.initializeTools();
  }

  /**
   * Initialize all available tools for the LLM
   */
  private initializeTools(): void {
    // Task Management Tools
    this.registerTool({
      name: 'get_tasks',
      description: 'Retrieve user tasks from Todoist. Can filter by project, section, label or custom query.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID to filter tasks' },
          section_id: { type: 'string', description: 'Section ID to filter tasks' },
          label: { type: 'string', description: 'Label to filter tasks' },
          filter: { type: 'string', description: 'Custom filter query (e.g., "today", "overdue")' },
          ids: { type: 'array', items: { type: 'string' }, description: 'Array of specific task IDs' }
        },
        required: []
      },
      handler: this.handleGetTasks.bind(this)
    });

    this.registerTool({
      name: 'create_task',
      description: UIMessageManager.getMessage('createTask'),
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Task content/title (required)' },
          description: { type: 'string', description: 'Detailed task description' },
          project_id: { type: 'string', description: 'Project ID where to create the task' },
          section_id: { type: 'string', description: 'Section ID where to create the task' },
          priority: { type: 'number', enum: [1, 2, 3, 4], description: 'Priority: 1=normal, 2=high, 3=very high, 4=urgent' },
          due_string: { type: 'string', description: 'Due date in natural language (e.g., "tomorrow", "next Monday")' },
          due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Array of labels to assign' }
        },
        required: ['content']
      },
      handler: this.handleCreateTask.bind(this)
    });

    this.registerTool({
      name: 'complete_task',
      description: 'Complete an existing task in Todoist.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID of the task to complete' }
        },
        required: ['id']
      },
      handler: this.handleCompleteTask.bind(this)
    });

    this.registerTool({
      name: 'update_task',
      description: UIMessageManager.getMessage('updateTask'),
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID of the task to update' },
          content: { type: 'string', description: 'New task content/title' },
          description: { type: 'string', description: UIMessageManager.getMessage('newDescription') },
          project_id: { type: 'string', description: 'New project ID' },
          section_id: { type: 'string', description: 'New section ID' },
          priority: { type: 'number', enum: [1, 2, 3, 4], description: UIMessageManager.getMessage('newPriority') },
          due_string: { type: 'string', description: UIMessageManager.getMessage('newDueDate') },
          due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format' },
          labels: { type: 'array', items: { type: 'string' }, description: 'New array of labels' }
        },
        required: ['id']
      },
      handler: this.handleUpdateTask.bind(this)
    });

    this.registerTool({
      name: 'delete_task',
      description: UIMessageManager.getMessage('deleteTask'),
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: UIMessageManager.getMessage('taskToDelete') }
        },
        required: ['id']
      },
      handler: this.handleDeleteTask.bind(this)
    });

    // Project Management Tools
    this.registerTool({
      name: 'get_projects',
      description: 'Retrieve all user projects from Todoist.',
      parameters: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' }, description: 'Array of specific project IDs' }
        },
        required: []
      },
      handler: this.handleGetProjects.bind(this)
    });

    this.registerTool({
      name: 'create_project',
      description: 'Create a new project in Todoist.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name (required)' },
          parent_id: { type: 'string', description: 'Parent project ID to create a subproject' },
          color: { type: 'string', description: 'Project color' },
          is_favorite: { type: 'boolean', description: 'Whether the project is favorite' }
        },
        required: ['name']
      },
      handler: this.handleCreateProject.bind(this)
    });

    // Summary and Analysis Tools
    this.registerTool({
      name: 'get_task_summary',
      description: 'Get a summary of user tasks with useful statistics.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: this.handleGetTaskSummary.bind(this)
    });

    this.registerTool({
      name: 'search_tasks',
      description: 'Search tasks using a search query.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for tasks' }
        },
        required: ['query']
      },
      handler: this.handleSearchTasks.bind(this)
    });

    this.registerTool({
       name: 'get_changes_since_last_sync',
       description: 'Get detailed information about changes since last synchronization with Todoist.',
       parameters: {
         type: 'object',
         properties: {},
         required: []
       },
       handler: this.handleGetChangesSinceLastSync.bind(this)
     });
  }

  /**
   * Register a new tool
   */
  private registerTool(tool: TodoistTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all available tools for the LLM
   */
  public getAvailableTools(): TodoistTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name with parameters
   */
  public async executeTool(toolName: string, parameters: any): Promise<TodoistOperationResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        message: `Tool '${toolName}' not found`,
        error: 'TOOL_NOT_FOUND'
      };
    }

    try {
      const result = await tool.handler(parameters);
      return {
        success: true,
        message: `Operation '${toolName}' completed successfully`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Error executing '${toolName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  // Tool Handlers
  private async handleGetTasks(params: any): Promise<TodoistTask[]> {
    const filter: TaskFilter = {};
    if (params.project_id) filter.project_id = params.project_id;
    if (params.section_id) filter.section_id = params.section_id;
    if (params.label) filter.label = params.label;
    if (params.filter) filter.filter = params.filter;
    if (params.ids) filter.ids = params.ids;

    return await this.todoistService.getTasks(filter);
  }

  private async handleCreateTask(params: any): Promise<TodoistTask> {
    const taskData: CreateTaskRequest = {
      content: params.content,
      description: params.description,
      project_id: params.project_id,
      section_id: params.section_id,
      priority: params.priority,
      due_string: params.due_string,
      due_date: params.due_date,
      labels: params.labels
    };

    return await this.todoistService.createTask(taskData);
  }

  private async handleCompleteTask(params: any): Promise<void> {
    await this.todoistService.completeTask(params.task_id);
  }

  private async handleUpdateTask(params: any): Promise<TodoistTask> {
    const { task_id, ...updates } = params;
    return await this.todoistService.updateTask(task_id, updates);
  }

  private async handleDeleteTask(params: any): Promise<void> {
    await this.todoistService.deleteTask(params.task_id);
  }

  private async handleGetProjects(params: any): Promise<TodoistProject[]> {
    const filter: ProjectFilter = {};
    if (params.ids) filter.ids = params.ids;

    return await this.todoistService.getProjects(filter);
  }

  private async handleCreateProject(params: any): Promise<TodoistProject> {
    const projectData: CreateProjectRequest = {
      name: params.name,
      parent_id: params.parent_id,
      color: params.color,
      is_favorite: params.is_favorite
    };

    return await this.todoistService.createProject(projectData);
  }

  private async handleGetTaskSummary(params: any): Promise<TaskSummary> {
    return await this.todoistService.getTaskSummary();
  }

  private async handleSearchTasks(params: any): Promise<TodoistTask[]> {
    return await this.todoistService.searchTasks(params.query);
  }

  private async handleGetChangesSinceLastSync(params: any): Promise<any> {
    return await this.todoistService.getChangesSinceLastSync();
  }

  /**
   * Get current Todoist context for LLM
   * This provides a summary of user's current state
   */
  public async getTodoistContext(): Promise<string> {
    try {
      const [projects, taskSummary, recentTasks] = await Promise.all([
        this.todoistService.getProjects(),
        this.todoistService.getTaskSummary(),
        this.todoistService.getTasks({ filter: 'today | overdue' })
      ]);

      const context = `
**Current Todoist Context:**

**Projects (${projects.length}):**
${projects.slice(0, 5).map(p => `- ${p.name} (${p.is_favorite ? '⭐ ' : ''}${p.comment_count} comments)`).join('\n')}
${projects.length > 5 ? `... and ${projects.length - 5} more projects` : ''}

**Task Summary:**
- Total: ${taskSummary.total}
- Due today: ${taskSummary.due_today}
- Overdue: ${taskSummary.overdue}
- High priority: ${taskSummary.high_priority}

**Urgent Tasks (${recentTasks.length}):**
${recentTasks.slice(0, 3).map(t => `- ${t.content} ${t.priority > 2 ? '🔥' : ''} ${t.due ? `(due: ${t.due.date})` : ''}`).join('\n')}
${recentTasks.length > 3 ? `... and ${recentTasks.length - 3} more urgent tasks` : ''}
      `.trim();

      return context;
    } catch (error) {
      return `Error retrieving Todoist context: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

export default TodoistAIService;