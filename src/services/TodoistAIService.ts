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
      description: 'Recupera le task dell\'utente da Todoist. Può filtrare per progetto, sezione, etichetta o query personalizzata.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'ID del progetto per filtrare le task' },
          section_id: { type: 'string', description: 'ID della sezione per filtrare le task' },
          label: { type: 'string', description: 'Etichetta per filtrare le task' },
          filter: { type: 'string', description: 'Query di filtro personalizzata (es: "today", "overdue")' },
          ids: { type: 'array', items: { type: 'string' }, description: 'Array di ID specifici di task' }
        },
        required: []
      },
      handler: this.handleGetTasks.bind(this)
    });

    this.registerTool({
      name: 'create_task',
      description: 'Crea una nuova task in Todoist. Supporta contenuto, descrizione, progetto, priorità, scadenza e etichette.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Contenuto/titolo della task (obbligatorio)' },
          description: { type: 'string', description: 'Descrizione dettagliata della task' },
          project_id: { type: 'string', description: 'ID del progetto dove creare la task' },
          section_id: { type: 'string', description: 'ID della sezione dove creare la task' },
          priority: { type: 'number', enum: [1, 2, 3, 4], description: 'Priorità: 1=normale, 2=alta, 3=molto alta, 4=urgente' },
          due_string: { type: 'string', description: 'Scadenza in linguaggio naturale (es: "domani", "lunedì prossimo")' },
          due_date: { type: 'string', description: 'Data di scadenza in formato YYYY-MM-DD' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Array di etichette da assegnare' }
        },
        required: ['content']
      },
      handler: this.handleCreateTask.bind(this)
    });

    this.registerTool({
      name: 'complete_task',
      description: 'Completa una task esistente in Todoist.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID della task da completare' }
        },
        required: ['task_id']
      },
      handler: this.handleCompleteTask.bind(this)
    });

    this.registerTool({
      name: 'update_task',
      description: 'Aggiorna una task esistente in Todoist. Può modificare contenuto, descrizione, priorità, scadenza e etichette.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID della task da aggiornare' },
          content: { type: 'string', description: 'Nuovo contenuto/titolo della task' },
          description: { type: 'string', description: 'Nuova descrizione della task' },
          priority: { type: 'number', enum: [1, 2, 3, 4], description: 'Nuova priorità' },
          due_string: { type: 'string', description: 'Nuova scadenza in linguaggio naturale' },
          due_date: { type: 'string', description: 'Nuova data di scadenza in formato YYYY-MM-DD' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Nuove etichette' }
        },
        required: ['task_id']
      },
      handler: this.handleUpdateTask.bind(this)
    });

    this.registerTool({
      name: 'delete_task',
      description: 'Elimina una task da Todoist.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID della task da eliminare' }
        },
        required: ['task_id']
      },
      handler: this.handleDeleteTask.bind(this)
    });

    // Project Management Tools
    this.registerTool({
      name: 'get_projects',
      description: 'Recupera tutti i progetti dell\'utente da Todoist.',
      parameters: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' }, description: 'Array di ID specifici di progetti' }
        },
        required: []
      },
      handler: this.handleGetProjects.bind(this)
    });

    this.registerTool({
      name: 'create_project',
      description: 'Crea un nuovo progetto in Todoist.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome del progetto (obbligatorio)' },
          parent_id: { type: 'string', description: 'ID del progetto padre per creare un sottoprogetto' },
          color: { type: 'string', description: 'Colore del progetto' },
          is_favorite: { type: 'boolean', description: 'Se il progetto è preferito' }
        },
        required: ['name']
      },
      handler: this.handleCreateProject.bind(this)
    });

    // Summary and Analysis Tools
    this.registerTool({
      name: 'get_task_summary',
      description: 'Ottiene un riassunto delle task dell\'utente con statistiche utili.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: this.handleGetTaskSummary.bind(this)
    });

    this.registerTool({
      name: 'search_tasks',
      description: 'Cerca task usando una query di ricerca.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query di ricerca per le task' }
        },
        required: ['query']
      },
      handler: this.handleSearchTasks.bind(this)
    });

    this.registerTool({
       name: 'get_changes_since_last_sync',
       description: 'Ottiene informazioni dettagliate sui cambiamenti dall\'ultima sincronizzazione con Todoist.',
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
        message: `Tool '${toolName}' non trovato`,
        error: 'TOOL_NOT_FOUND'
      };
    }

    try {
      const result = await tool.handler(parameters);
      return {
        success: true,
        message: `Operazione '${toolName}' completata con successo`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Errore nell'esecuzione di '${toolName}': ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
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
**Contesto Todoist Attuale:**

**Progetti (${projects.length}):**
${projects.slice(0, 5).map(p => `- ${p.name} (${p.is_favorite ? '⭐ ' : ''}${p.comment_count} commenti)`).join('\n')}
${projects.length > 5 ? `... e altri ${projects.length - 5} progetti` : ''}

**Riassunto Task:**
- Totali: ${taskSummary.total}
- In scadenza oggi: ${taskSummary.due_today}
- In ritardo: ${taskSummary.overdue}
- Alta priorità: ${taskSummary.high_priority}

**Task Urgenti (${recentTasks.length}):**
${recentTasks.slice(0, 3).map(t => `- ${t.content} ${t.priority > 2 ? '🔥' : ''} ${t.due ? `(scade: ${t.due.date})` : ''}`).join('\n')}
${recentTasks.length > 3 ? `... e altre ${recentTasks.length - 3} task urgenti` : ''}
      `.trim();

      return context;
    } catch (error) {
      return `Errore nel recupero del contesto Todoist: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`;
    }
  }
}

export default TodoistAIService;