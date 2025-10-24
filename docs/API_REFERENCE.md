# 📚 API Reference - Todoist AI CLI

Documentazione completa delle API e interfacce di tutti i servizi.

## 📋 Indice

1. [LLMService](#llmservice)
2. [ModelManager](#modelmanager)
3. [CostMonitor](#costmonitor)
4. [EnhancedContextManager](#enhancedcontextmanager)
5. [APIMetadataService](#apimetadataservice)
6. [SessionManager](#sessionmanager)
7. [TodoistAIService](#todoistaiservice)
8. [DatabaseService](#databaseservice)
9. [Types & Interfaces](#types--interfaces)

---

## LLMService

### Constructor

```typescript
constructor(
  modelManager: ModelManager,
  costMonitor?: CostMonitor,
  contextManager?: EnhancedContextManager,
  metadataService?: APIMetadataService
)
```

**Parametri:**
- `modelManager`: Istanza di ModelManager (richiesto)
- `costMonitor`: Istanza di CostMonitor (opzionale)
- `contextManager`: Istanza di EnhancedContextManager (opzionale)
- `metadataService`: Istanza di APIMetadataService (opzionale)

### Metodi Pubblici

#### `chat(messages: Message[]): Promise<Message>`

Esegue una chat singola senza streaming.

**Parametri:**
- `messages`: Array di messaggi della conversazione

**Ritorna:** Promise che risolve con la risposta del modello

**Esempio:**
```typescript
const response = await llmService.chat([
  { role: 'user', content: 'Ciao!' }
]);
```

**Errori:**
- `Error`: Se il modello non è configurato
- `Error`: Se la richiesta API fallisce

---

#### `chatStream(messages: Message[]): AsyncIterable<StreamChunk>`

Esegue una chat con streaming per risposte in tempo reale.

**Parametri:**
- `messages`: Array di messaggi della conversazione

**Ritorna:** AsyncIterable di chunk di streaming

**Esempio:**
```typescript
const stream = llmService.chatStream(messages);
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    process.stdout.write(chunk.delta.text);
  }
}
```

---

#### `setModel(model: string): void`

Imposta il modello AI corrente.

**Parametri:**
- `model`: Nome del modello (es. 'claude-3-sonnet-20240229')

**Esempio:**
```typescript
llmService.setModel('claude-3-sonnet-20240229');
```

---

#### `getCurrentModel(): string`

Ottiene il modello correntemente attivo.

**Ritorna:** Nome del modello corrente

---

#### `getAvailableModels(): string[]`

Ottiene la lista dei modelli disponibili.

**Ritorna:** Array di nomi modelli

---

#### `exportCalibrationReport(format?: 'json' | 'csv'): Promise<string>`

Esporta il report di calibrazione.

**Parametri:**
- `format`: Formato di export (default: 'json')

**Ritorna:** Promise con dati serializzati

---

### Proprietà

- `currentModel: string` - Modello correntemente attivo (readonly)
- `isStreaming: boolean` - Indica se è in corso uno streaming (readonly)

---

## ModelManager

### Constructor

```typescript
constructor()
```

Inizializza il ModelManager con le configurazioni default.

### Metodi Pubblici

#### `setCurrentModel(model: string): void`

Imposta il modello corrente.

**Parametri:**
- `model`: Nome del modello

**Comportamento:**
- Se il modello non esiste, logga un warning e usa configurazione default
- Aggiorna `this.currentModel`

---

#### `getModelConfig(targetModel?: string): ModelConfig`

Ottiene la configurazione di un modello.

**Parametri:**
- `targetModel`: Nome del modello (opzionale, usa currentModel se non specificato)

**Ritorna:** Configurazione del modello

**Esempio:**
```typescript
const config = modelManager.getModelConfig('claude-3-sonnet-20240229');
// {
//   name: 'Claude 3 Sonnet',
//   maxTokens: 200000,
//   costPer1kInputTokens: 0.003,
//   costPer1kOutputTokens: 0.015,
//   contextWindow: 200000
// }
```

---

#### `calculateCost(model: string, inputTokens: number, outputTokens: number): number`

Calcola il costo per un usage specifico.

**Parametri:**
- `model`: Nome del modello
- `inputTokens`: Numero di token di input
- `outputTokens`: Numero di token di output

**Ritorna:** Costo totale in dollari

**Formula:**
```
cost = (inputTokens / 1000) * costPer1kInputTokens + 
       (outputTokens / 1000) * costPer1kOutputTokens
```

---

#### `getAllModels(): string[]`

Ottiene tutti i modelli configurati.

**Ritorna:** Array di nomi modelli

---

### Proprietà

- `currentModel: string` - Modello correntemente attivo

---

## CostMonitor

### Constructor

```typescript
constructor(
  dailyLimit: number,
  sessionLimit: number,
  modelManager?: ModelManager
)
```

**Parametri:**
- `dailyLimit`: Limite di costo giornaliero in dollari
- `sessionLimit`: Limite di costo per sessione in dollari
- `modelManager`: Istanza di ModelManager (opzionale)

### Metodi Pubblici

#### `recordUsage(model: string, inputTokens: number, outputTokens: number, responseTime?: number): Promise<void>`

Registra l'usage di una chiamata API.

**Parametri:**
- `model`: Nome del modello utilizzato
- `inputTokens`: Token di input
- `outputTokens`: Token di output
- `responseTime`: Tempo di risposta in ms (opzionale)

**Comportamento:**
- Calcola il costo usando ModelManager
- Aggiorna statistiche giornaliere e di sessione
- Persiste i dati

---

#### `getDailySummary(): CostSummary`

Ottiene il riassunto dei costi giornalieri.

**Ritorna:** Oggetto CostSummary

```typescript
interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  averageResponseTime: number;
}
```

---

#### `getSessionSummary(): CostSummary`

Ottiene il riassunto dei costi della sessione corrente.

**Ritorna:** Oggetto CostSummary

---

#### `checkAlerts(): Alert[]`

Controlla e genera alert per limiti di costo.

**Ritorna:** Array di alert attivi

```typescript
interface Alert {
  type: 'daily_limit' | 'session_limit';
  severity: 'warning' | 'critical';
  message: string;
  currentCost: number;
  limit: number;
}
```

**Logica Alert:**
- **Warning**: Costo >= 80% del limite
- **Critical**: Costo >= 100% del limite

---

#### `resetSession(): void`

Resetta i dati della sessione corrente.

---

### Proprietà

- `dailyLimit: number` - Limite giornaliero (readonly)
- `sessionLimit: number` - Limite di sessione (readonly)

---

## EnhancedContextManager

### Constructor

```typescript
constructor(modelManager: ModelManager)
```

**Parametri:**
- `modelManager`: Istanza di ModelManager

### Metodi Pubblici

#### `getOptimizedMessages(messages: Message[], model: string): Promise<Message[]>`

Ottimizza i messaggi per il context window del modello.

**Parametri:**
- `messages`: Array di messaggi originali
- `model`: Nome del modello target

**Ritorna:** Promise con messaggi ottimizzati

**Comportamento:**
- Se i messaggi superano il context window, riassume automaticamente
- Mantiene sempre l'ultimo messaggio utente
- Preserva messaggi di sistema importanti

---

#### `countTokens(text: string): number`

Conta i token in un testo.

**Parametri:**
- `text`: Testo da analizzare

**Ritorna:** Numero di token stimati

**Algoritmo:** Approssimazione basata su caratteri e parole

---

#### `countConversationTokens(messages: Message[]): number`

Conta i token totali di una conversazione.

**Parametri:**
- `messages`: Array di messaggi

**Ritorna:** Numero totale di token

---

#### `isWithinContextWindow(messages: Message[], model: string): boolean`

Verifica se i messaggi rientrano nel context window.

**Parametri:**
- `messages`: Array di messaggi
- `model`: Nome del modello

**Ritorna:** true se rientra nei limiti

---

#### `summarizeIfNeeded(messages: Message[], model: string): Promise<Message[]>`

Riassume la conversazione se necessario.

**Parametri:**
- `messages`: Array di messaggi originali
- `model`: Nome del modello

**Ritorna:** Promise con messaggi (riassunti se necessario)

---

## APIMetadataService

### Constructor

```typescript
constructor()
```

Inizializza il servizio con dati persistenti.

### Metodi Pubblici

#### `recordAPICall(model: string, responseTime: number, inputTokens: number, outputTokens: number, success: boolean): void`

Registra una chiamata API per statistiche.

**Parametri:**
- `model`: Nome del modello
- `responseTime`: Tempo di risposta in ms
- `inputTokens`: Token di input
- `outputTokens`: Token di output
- `success`: Se la chiamata è riuscita

---

#### `getModelStats(model: string): ModelStats`

Ottiene statistiche per un modello.

**Parametri:**
- `model`: Nome del modello

**Ritorna:** Oggetto ModelStats

```typescript
interface ModelStats {
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}
```

---

#### `calibrateModel(model: string, testPrompt: string): Promise<void>`

Esegue calibrazione di un modello.

**Parametri:**
- `model`: Nome del modello da calibrare
- `testPrompt`: Prompt di test per calibrazione

**Comportamento:**
- Esegue chiamata di test
- Registra metriche di performance
- Salva dati di calibrazione

---

#### `exportCalibrationReport(format: 'json' | 'csv' = 'json'): Promise<string>`

Esporta report di calibrazione.

**Parametri:**
- `format`: Formato di export

**Ritorna:** Promise con dati serializzati

---

#### `exportCostReport(format: 'json' | 'csv' = 'json'): Promise<string>`

Esporta report dei costi.

**Parametri:**
- `format`: Formato di export

**Ritorna:** Promise con dati serializzati

---

## SessionManager

### Constructor

```typescript
constructor()
```

### Metodi Pubblici

#### `createSession(id?: string): Session`

Crea una nuova sessione.

**Parametri:**
- `id`: ID personalizzato (opzionale, genera UUID se non specificato)

**Ritorna:** Oggetto Session

---

#### `loadSession(id: string): Session | null`

Carica una sessione esistente.

**Parametri:**
- `id`: ID della sessione

**Ritorna:** Session se trovata, null altrimenti

---

#### `saveSession(session: Session): void`

Salva una sessione.

**Parametri:**
- `session`: Oggetto sessione da salvare

---

#### `deleteSession(id: string): boolean`

Elimina una sessione.

**Parametri:**
- `id`: ID della sessione

**Ritorna:** true se eliminata con successo

---

#### `listSessions(): SessionInfo[]`

Lista tutte le sessioni salvate.

**Ritorna:** Array di informazioni sessioni

```typescript
interface SessionInfo {
  id: string;
  createdAt: Date;
  lastModified: Date;
  messageCount: number;
}
```

---

## TodoistAIService

### Constructor

```typescript
constructor(
  llmService: LLMService,
  todoistService: TodoistService
)
```

**Parametri:**
- `llmService`: Istanza di LLMService
- `todoistService`: Istanza di TodoistService

### Metodi Pubblici

#### `analyzeTasksWithAI(tasks: Task[]): Promise<TaskAnalysis>`

Analizza le attività usando AI.

**Parametri:**
- `tasks`: Array di attività Todoist

**Ritorna:** Promise con analisi AI

```typescript
interface TaskAnalysis {
  summary: string;
  suggestions: string[];
  priorities: TaskPriority[];
  categories: TaskCategory[];
}
```

---

#### `generateTaskSuggestions(context: string): Promise<string[]>`

Genera suggerimenti per nuove attività.

**Parametri:**
- `context`: Contesto per i suggerimenti

**Ritorna:** Promise con array di suggerimenti

---

#### `optimizeTaskSchedule(tasks: Task[]): Promise<ScheduleOptimization>`

Ottimizza la pianificazione delle attività.

**Parametri:**
- `tasks`: Array di attività

**Ritorna:** Promise con ottimizzazione pianificazione

---

## DatabaseService

### Constructor

```typescript
constructor(dbPath?: string)
```

**Parametri:**
- `dbPath`: Percorso del database SQLite (opzionale)

### Metodi Pubblici

#### `initialize(): Promise<void>`

Inizializza il database e crea le tabelle.

---

#### `saveSession(session: Session): Promise<void>`

Salva una sessione nel database.

**Parametri:**
- `session`: Oggetto sessione

---

#### `loadSession(id: string): Promise<Session | null>`

Carica una sessione dal database.

**Parametri:**
- `id`: ID della sessione

**Ritorna:** Promise con Session o null

---

#### `deleteSession(id: string): Promise<boolean>`

Elimina una sessione dal database.

**Parametri:**
- `id`: ID della sessione

**Ritorna:** Promise con boolean di successo

---

#### `listSessions(): Promise<SessionInfo[]>`

Lista tutte le sessioni nel database.

**Ritorna:** Promise con array di SessionInfo

---

#### `saveCostData(data: CostData): Promise<void>`

Salva dati di costo nel database.

**Parametri:**
- `data`: Dati di costo da salvare

---

#### `getCostData(date?: string): Promise<CostData[]>`

Ottiene dati di costo dal database.

**Parametri:**
- `date`: Data specifica (opzionale, default oggi)

**Ritorna:** Promise con array di CostData

---

## Types & Interfaces

### Core Types

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  contextWindow: number;
}

interface StreamChunk {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop';
  delta?: {
    text: string;
  };
}
```

### Cost Monitoring

```typescript
interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  averageResponseTime: number;
}

interface Alert {
  type: 'daily_limit' | 'session_limit';
  severity: 'warning' | 'critical';
  message: string;
  currentCost: number;
  limit: number;
}

interface CostData {
  id?: number;
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  responseTime: number;
  timestamp: Date;
}
```

### Session Management

```typescript
interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  lastModified: Date;
  metadata?: {
    model?: string;
    totalCost?: number;
    tokenCount?: number;
  };
}

interface SessionInfo {
  id: string;
  createdAt: Date;
  lastModified: Date;
  messageCount: number;
  totalCost?: number;
}
```

### API Metadata

```typescript
interface ModelStats {
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

interface CalibrationData {
  model: string;
  timestamp: Date;
  responseTime: number;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  testPrompt: string;
}
```

### Todoist Integration

```typescript
interface Task {
  id: string;
  content: string;
  description?: string;
  projectId: string;
  priority: number;
  dueDate?: Date;
  labels: string[];
  completed: boolean;
}

interface TaskAnalysis {
  summary: string;
  suggestions: string[];
  priorities: TaskPriority[];
  categories: TaskCategory[];
  estimatedTime?: number;
  complexity?: 'low' | 'medium' | 'high';
}

interface TaskPriority {
  taskId: string;
  priority: number;
  reason: string;
}

interface TaskCategory {
  name: string;
  tasks: string[];
  description: string;
}
```

---

## Error Handling

### Standard Error Types

```typescript
class LLMServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LLMServiceError';
  }
}

class CostLimitError extends Error {
  constructor(message: string, public currentCost: number, public limit: number) {
    super(message);
    this.name = 'CostLimitError';
  }
}

class ModelNotFoundError extends Error {
  constructor(model: string) {
    super(`Model ${model} not found in configurations`);
    this.name = 'ModelNotFoundError';
  }
}
```

### Error Codes

- `RATE_LIMIT_EXCEEDED`: Rate limit API superato
- `INVALID_API_KEY`: Chiave API non valida
- `MODEL_NOT_AVAILABLE`: Modello non disponibile
- `CONTEXT_TOO_LARGE`: Context supera limiti
- `COST_LIMIT_EXCEEDED`: Limite di costo superato
- `NETWORK_ERROR`: Errore di rete
- `INVALID_REQUEST`: Richiesta non valida

---

## Configuration

### Environment Variables

```typescript
interface EnvironmentConfig {
  // API Keys
  ANTHROPIC_API_KEY: string;
  GOOGLE_AI_API_KEY: string;
  TODOIST_API_KEY: string;

  // Model Settings
  CLAUDE_MODEL: string;
  GEMINI_MODEL: string;
  DEFAULT_MODEL: string;

  // Cost Limits
  DAILY_COST_LIMIT: number;
  SESSION_COST_LIMIT: number;

  // Database
  DATABASE_PATH: string;
  
  // Features
  ENABLE_STREAMING: boolean;
  ENABLE_COST_MONITORING: boolean;
  ENABLE_AUTO_SUMMARIZE: boolean;
  
  // Debug
  DEBUG: boolean;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  models: {
    claude: 'claude-3-sonnet-20240229',
    gemini: 'gemini-pro'
  },
  limits: {
    daily: 100,
    session: 50,
    contextTokens: 150000
  },
  features: {
    streaming: true,
    costMonitoring: true,
    autoSummarize: true,
    autoCalibrate: false
  },
  database: {
    path: './data/todoist-ai.db',
    autoBackup: true
  }
};
```

---

## Rate Limiting

### Built-in Rate Limiting

Tutti i servizi implementano rate limiting automatico:

```typescript
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  backoffStrategy: 'linear' | 'exponential';
}

// Default per Claude
const CLAUDE_RATE_LIMITS = {
  requestsPerMinute: 50,
  requestsPerHour: 1000,
  burstLimit: 5,
  backoffStrategy: 'exponential'
};
```

### Custom Rate Limiting

```typescript
// Configurazione personalizzata
llmService.setRateLimit({
  requestsPerMinute: 30,
  requestsPerHour: 500,
  burstLimit: 3
});
```

---

## Monitoring & Observability

### Built-in Metrics

Tutti i servizi espongono metriche standard:

```typescript
interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  successRate: number;
  lastError?: Error;
  uptime: number;
}
```

### Custom Monitoring

```typescript
// Setup monitoring personalizzato
const monitor = new ServiceMonitor();

monitor.on('metric', (metric) => {
  console.log(`${metric.service}: ${metric.name} = ${metric.value}`);
});

monitor.on('alert', (alert) => {
  if (alert.severity === 'critical') {
    sendNotification(alert);
  }
});
```

---

Questa documentazione API fornisce tutti i dettagli necessari per integrare e utilizzare i servizi del Todoist AI CLI. Per esempi pratici, consulta la [Guida ai Servizi](./SERVICES_GUIDE.md).