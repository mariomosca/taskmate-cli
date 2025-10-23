// Todoist API Types and Interfaces

export interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  order: number;
  labels: string[];
  priority: 1 | 2 | 3 | 4; // 1 = normal, 4 = urgent
  due?: TodoistDue;
  url: string;
  comment_count: number;
  is_completed: boolean;
  created_at: string;
  creator_id: string;
  assignee_id?: string;
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: 'list' | 'board';
  url: string;
  parent_id?: string;
}

export interface TodoistSection {
  id: string;
  project_id: string;
  order: number;
  name: string;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

export interface TodoistDue {
  string: string; // Human readable format
  date: string; // YYYY-MM-DD format
  is_recurring: boolean;
  datetime?: string; // RFC3339 format
  timezone?: string;
}

export interface TodoistComment {
  id: string;
  task_id?: string;
  project_id?: string;
  posted_at: string;
  content: string;
  attachment?: TodoistAttachment;
}

export interface TodoistAttachment {
  file_name: string;
  file_type: string;
  file_url: string;
  resource_type: string;
}

// Request/Response Types
export interface CreateTaskRequest {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string;
  parent_id?: string;
  order?: number;
  labels?: string[];
  priority?: 1 | 2 | 3 | 4;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  assignee_id?: string;
}

export interface UpdateTaskRequest {
  content?: string;
  description?: string;
  labels?: string[];
  priority?: 1 | 2 | 3 | 4;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  assignee_id?: string;
}

export interface CreateProjectRequest {
  name: string;
  parent_id?: string;
  color?: string;
  is_favorite?: boolean;
  view_style?: 'list' | 'board';
}

export interface UpdateProjectRequest {
  name?: string;
  color?: string;
  is_favorite?: boolean;
  view_style?: 'list' | 'board';
}

export interface TaskFilter {
  project_id?: string;
  section_id?: string;
  label?: string;
  filter?: string;
  lang?: string;
  ids?: string[];
}

export interface ProjectFilter {
  ids?: string[];
}

// API Response Types
export interface TodoistApiError {
  error_code: number;
  error: string;
  error_extra?: Record<string, any>;
  http_code: number;
}

export interface SyncResult {
  tasks_added: number;
  tasks_updated: number;
  tasks_completed: number;
  projects_added: number;
  projects_updated: number;
  sync_token: string;
  last_sync: string;
}

export interface SyncChanges {
  tasks: {
    added: TodoistTask[];
    updated: TodoistTask[];
    completed: TodoistTask[];
    deleted: string[]; // IDs of deleted tasks
  };
  projects: {
    added: TodoistProject[];
    updated: TodoistProject[];
    deleted: string[]; // IDs of deleted projects
  };
  sync_token: string;
  timestamp: string;
}

export interface SyncState {
  last_sync_token?: string;
  last_sync_timestamp?: string;
  cached_tasks?: TodoistTask[];
  cached_projects?: TodoistProject[];
}

// Service Configuration
export interface TodoistConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Internal Types for CLI
export interface TaskSummary {
  total: number;
  completed_today: number;
  overdue: number;
  due_today: number;
  high_priority: number;
}

export interface ProjectSummary {
  total: number;
  active: number;
  shared: number;
  favorite: number;
}

export interface QuickAddResult {
  task: TodoistTask;
  success: boolean;
  message: string;
}

export interface BulkOperationResult {
  successful: string[];
  failed: { id: string; error: string }[];
  total: number;
}

// Command Types
export type TodoistCommand = 
  | 'tasks'
  | 'projects' 
  | 'add-task'
  | 'complete'
  | 'sync'
  | 'labels'
  | 'comments';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Utility Types
export type TaskPriority = 1 | 2 | 3 | 4;
export type ProjectViewStyle = 'list' | 'board';
export type TaskStatus = 'active' | 'completed';

// Export all types for easy importing
export type {
  TodoistTask as Task,
  TodoistProject as Project,
  TodoistSection as Section,
  TodoistLabel as Label,
  TodoistDue as Due,
  TodoistComment as Comment,
  TodoistAttachment as Attachment
};