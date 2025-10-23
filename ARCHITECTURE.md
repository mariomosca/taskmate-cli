# 🏗️ Architettura Tecnica - Todoist AI CLI

## 📋 Panoramica

Il Todoist AI CLI è un'applicazione TypeScript che utilizza React + Ink per creare un'interfaccia a riga di comando moderna e interattiva. L'architettura è progettata per essere modulare, estensibile e facilmente testabile.

## 🎯 Principi Architetturali

### 1. Separation of Concerns
- **Componenti UI**: Gestiscono solo la presentazione
- **Servizi**: Contengono la logica di business
- **Types**: Definizioni di tipo centralizzate
- **Utils**: Funzioni di utilità riutilizzabili

### 2. Dependency Injection
- Servizi iniettati tramite React Context
- Facilita testing e mocking
- Permette configurazioni diverse per ambienti diversi

### 3. Event-Driven Architecture
- Comunicazione tra componenti tramite eventi
- State management reattivo con React hooks
- Streaming responses per migliore UX

### 4. Modular Design
- Ogni servizio è indipendente e sostituibile
- Interfacce ben definite tra moduli
- Plugin system per estensioni future

## 🏛️ Architettura High-Level

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Application                         │
├─────────────────────────────────────────────────────────────┤
│                    React + Ink UI Layer                     │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│                    External APIs                            │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Componenti Architetturali

### 1. UI Layer (React + Ink)

#### App.tsx - Orchestratore Principale
```typescript
interface AppState {
  currentView: 'splash' | 'chat' | 'session-selector';
  session: Session | null;
  context: ContextState;
  llmProvider: 'claude' | 'gemini';
}
```

**Responsabilità:**
- Gestione stato globale applicazione
- Routing tra diverse viste
- Inizializzazione servizi
- Gestione lifecycle applicazione

#### ChatInterface.tsx - Interfaccia Chat Principale
```typescript
interface ChatInterfaceProps {
  session: Session;
  onSessionUpdate: (session: Session) => void;
  llmService: LLMService;
}
```

**Responsabilità:**
- Gestione conversazione AI
- Rendering messaggi
- Integrazione con InputArea e ContentArea
- Gestione comandi slash

#### Componenti Specializzati
- **SplashScreen**: Branding e loading iniziale
- **InputArea**: Input utente con autocompletamento
- **ContentArea**: Rendering messaggi con formattazione
- **SessionSelector**: Navigazione sessioni salvate
- **ContextIndicator**: Monitoraggio stato context
- **CommandMenu**: Help system comandi slash

### 2. Service Layer

#### LLMService - Integrazione AI
```typescript
interface LLMService {
  sendMessage(message: string, context: string[]): AsyncIterable<string>;
  summarizeContext(messages: Message[]): Promise<string>;
  switchProvider(provider: 'claude' | 'gemini'): void;
  getProviderStatus(): ProviderStatus;
}
```

**Implementazioni:**
- **ClaudeService**: Anthropic SDK integration
- **GeminiService**: Google AI REST API
- **LLMFactory**: Provider instantiation

**Caratteristiche:**
- Streaming responses per UX fluida
- Context summarization automatica
- Fallback tra provider
- Rate limiting e retry logic

#### SessionManager - Gestione Sessioni
```typescript
interface SessionManager {
  createSession(name?: string): Session;
  loadSession(id: string): Promise<Session>;
  saveSession(session: Session): Promise<void>;
  listSessions(): Promise<SessionMetadata[]>;
  deleteSession(id: string): Promise<void>;
}
```

**Responsabilità:**
- CRUD operations su sessioni
- Persistenza messaggi (futuro: database)
- Session recovery
- Cleanup automatico sessioni vecchie

#### ContextManager - Gestione Context
```typescript
interface ContextManager {
  addMessage(message: Message): void;
  getContext(): string[];
  getTokenCount(): number;
  shouldSummarize(): boolean;
  summarize(): Promise<void>;
  clear(): void;
}
```

**Caratteristiche:**
- Token counting in tempo reale
- Auto-summarization quando necessario
- Context window management
- Integration con LLMService

#### TodoistService - Integrazione Todoist (In Sviluppo)
```typescript
interface TodoistService {
  // Authentication
  authenticate(apiKey: string): Promise<boolean>;
  
  // Tasks
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  createTask(task: CreateTaskRequest): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskRequest): Promise<Task>;
  completeTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  createProject(project: CreateProjectRequest): Promise<Project>;
  
  // Sync
  sync(): Promise<SyncResult>;
}
```

### 3. Data Layer

#### Type Definitions
```typescript
// Core Types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  metadata?: MessageMetadata;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  context: ContextState;
  createdAt: Date;
  updatedAt: Date;
}

// Todoist Types
interface Task {
  id: string;
  content: string;
  description?: string;
  projectId: string;
  sectionId?: string;
  labels: string[];
  priority: 1 | 2 | 3 | 4;
  due?: Due;
  completed: boolean;
  createdAt: Date;
}

interface Project {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  order: number;
  commentCount: number;
  shared: boolean;
}
```

#### Database Schema (Futuro)
```sql
-- Sessions Table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  context_state TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  content TEXT NOT NULL,
  role TEXT CHECK(role IN ('user', 'assistant')),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT -- JSON
);

-- Context Table
CREATE TABLE contexts (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Configuration Layer

#### Environment Configuration
```typescript
interface AppConfig {
  // Todoist
  todoist: {
    apiKey: string;
    baseUrl: string;
  };
  
  // AI Providers
  claude: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  gemini: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Application
  app: {
    debug: boolean;
    sessionAutosave: boolean;
    sessionTimeout: number;
    databasePath: string;
  };
}
```

## 🔄 Data Flow

### 1. Startup Flow
```
1. CLI Args Parsing (yargs)
2. Environment Loading (.env)
3. Service Initialization
4. Session Recovery (se --resume)
5. UI Rendering (Splash → Chat)
```

### 2. Message Flow
```
User Input → InputArea → ChatInterface → LLMService → Streaming Response → ContentArea
                    ↓
              SessionManager → ContextManager → Auto-summarization (se necessario)
```

### 3. Command Flow
```
Slash Command → CommandHandler → Service Router → Specific Service → Response → UI Update
```

### 4. Session Flow
```
Session Creation → SessionManager → Database (futuro) → UI State Update
Session Loading → Database Query → State Hydration → UI Rendering
```

## 🔌 Integration Patterns

### 1. Service Integration
```typescript
// Dependency Injection via React Context
const ServiceContext = createContext<{
  llmService: LLMService;
  sessionManager: SessionManager;
  contextManager: ContextManager;
  todoistService: TodoistService;
}>();

// Usage in Components
const { llmService, sessionManager } = useContext(ServiceContext);
```

### 2. Event Handling
```typescript
// Custom Hooks per State Management
const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const { sessionManager } = useContext(ServiceContext);
  
  const loadSession = useCallback(async (id: string) => {
    const loadedSession = await sessionManager.loadSession(id);
    setSession(loadedSession);
  }, [sessionManager]);
  
  return { session, loadSession };
};
```

### 3. Error Handling
```typescript
// Centralized Error Handling
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Service-level Error Handling
class LLMServiceError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LLMServiceError';
  }
}
```

## 🧪 Testing Strategy

### 1. Unit Tests
```typescript
// Service Testing
describe('LLMService', () => {
  let service: LLMService;
  
  beforeEach(() => {
    service = new ClaudeService(mockConfig);
  });
  
  it('should send message and return stream', async () => {
    const stream = service.sendMessage('test', []);
    // Test streaming response
  });
});
```

### 2. Integration Tests
```typescript
// Component Integration
describe('ChatInterface', () => {
  it('should handle slash commands', async () => {
    render(<ChatInterface {...props} />);
    // Test command execution
  });
});
```

### 3. E2E Tests
```typescript
// Full Application Flow
describe('Application Flow', () => {
  it('should complete full conversation flow', async () => {
    // Test complete user journey
  });
});
```

## 🚀 Performance Considerations

### 1. Memory Management
- Context window management per evitare memory leaks
- Session cleanup automatico
- Streaming responses per ridurre memory footprint

### 2. API Optimization
- Request batching per Todoist API
- Caching responses quando appropriato
- Rate limiting e retry logic

### 3. UI Performance
- React.memo per componenti pesanti
- Virtualization per liste lunghe (sessioni, task)
- Debouncing per input utente

## 🔒 Security Considerations

### 1. API Key Management
- Environment variables per API keys
- Nessun hardcoding di secrets
- Validation API keys all'avvio

### 2. Data Protection
- Nessun logging di dati sensibili
- Encryption per database locale (futuro)
- Secure storage per sessioni

### 3. Input Validation
- Sanitization input utente
- Validation comandi slash
- Protection contro injection attacks

## 🔮 Future Architecture

### 1. Plugin System
```typescript
interface Plugin {
  name: string;
  version: string;
  commands: SlashCommand[];
  services: Service[];
  initialize(app: App): Promise<void>;
}
```

### 2. Microservices (v2.0)
- Service separation per scalabilità
- API Gateway per routing
- Event bus per comunicazione

### 3. Web Interface
- Shared core logic
- REST API per web client
- WebSocket per real-time updates

---

**Documento Versione**: 1.0  
**Ultimo Aggiornamento**: $(date)  
**Stato**: Living Document - Aggiornato con implementazione