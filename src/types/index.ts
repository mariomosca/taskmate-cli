export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    llmProvider?: string;
    processingTime?: number;
    tokens?: number;
    sessionId?: string;
    sessionName?: string;
  };
}

export interface Session {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  llmProvider: 'claude' | 'gemini';
  metadata?: {
    totalMessages: number;
    totalTokens: number;
    lastActivity: Date;
  };
}

export interface AppState {
  currentSession: Session | null;
  sessions: Session[];
  isLoading: boolean;
  loadingMessage: string;
  showSplash: boolean;
  showCommandMenu: boolean;
  llmProvider: 'claude' | 'gemini';
  config: AppConfig;
}

export interface AppConfig {
  todoistToken?: string;
  anthropicKey?: string;
  googleKey?: string;
  defaultLLM: 'claude' | 'gemini';
  sessionPath: string;
  autoSave: boolean;
  theme: 'dark' | 'light';
}

export interface SlashCommand {
  command: string;
  description: string;
  usage: string;
  handler: (args: string[]) => Promise<void> | void;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
  type: 'spinner' | 'progress' | 'dots';
}

export type AppAction = 
  | { type: 'SET_LOADING'; payload: LoadingState }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_SESSION'; payload: Session }
  | { type: 'TOGGLE_SPLASH'; payload: boolean }
  | { type: 'TOGGLE_COMMAND_MENU'; payload: boolean }
  | { type: 'SET_LLM_PROVIDER'; payload: 'claude' | 'gemini' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<AppConfig> };