# API Reference - Todoist AI CLI

## Comandi Slash Disponibili

### 🔧 Comandi Generali

#### `/help`
Mostra tutti i comandi disponibili con descrizioni dettagliate.

**Sintassi**: `/help [comando]`

**Esempi**:
```bash
/help                    # Lista tutti i comandi
/help tasks             # Help specifico per /tasks
```

#### `/clear`
Pulisce la chat corrente mantenendo la sessione attiva.

**Sintassi**: `/clear`

#### `/exit`
Esce dall'applicazione salvando automaticamente la sessione corrente.

**Sintassi**: `/exit`

#### `/status`
Mostra informazioni dettagliate sullo stato del sistema.

**Sintassi**: `/status`

**Output**:
- Sessione corrente
- Modello AI attivo
- Costi accumulati
- Statistiche utilizzo
- Stato connessioni (Todoist, AI)

### 💾 Comandi Sessione

#### `/sessions`
Lista tutte le sessioni salvate con informazioni dettagliate.

**Sintassi**: `/sessions [--limit N]`

**Opzioni**:
- `--limit N`: Limita il numero di sessioni mostrate (default: 10)

**Output**:
```
ID  | Nome              | Messaggi | Ultimo Accesso
1   | Progetto Alpha    | 45       | 2024-01-15 14:30
2   | Debug Session     | 23       | 2024-01-14 09:15
```

#### `/new`
Crea una nuova sessione di chat.

**Sintassi**: `/new [nome]`

**Esempi**:
```bash
/new                     # Crea sessione con nome automatico
/new "Progetto Beta"     # Crea sessione con nome specifico
```

#### `/save`
Salva la sessione corrente con un nome opzionale.

**Sintassi**: `/save [nome]`

**Esempi**:
```bash
/save                    # Salva con nome automatico
/save "Sessione Debug"   # Salva con nome specifico
```

#### `/load`
Carica una sessione specifica.

**Sintassi**: `/load <session_id|nome>`

**Esempi**:
```bash
/load 1                  # Carica sessione per ID
/load "Progetto Alpha"   # Carica sessione per nome
```

#### `/delete-session`
Elimina una sessione specifica.

**Sintassi**: `/delete-session <session_id|nome>`

**Conferma richiesta**: Sì

#### `/search`
Cerca nei messaggi delle sessioni.

**Sintassi**: `/search <query> [--session session_id]`

**Opzioni**:
- `--session ID`: Cerca solo nella sessione specificata
- `--limit N`: Limita risultati (default: 20)

**Esempi**:
```bash
/search "todoist api"           # Cerca in tutte le sessioni
/search "bug fix" --session 1   # Cerca solo nella sessione 1
```

### 📋 Comandi Todoist

#### Gestione Task

##### `getTasks()`
Recupera tutte le attività dell'utente.

**Parametri**:
```typescript
interface GetTasksParams {
  project_id?: string;
  section_id?: string;
  label?: string;
  filter?: string;
  lang?: string;
}
```

**Esempio**:
```typescript
// Tutte le attività
const tasks = await todoistService.getTasks();

// Attività di un progetto specifico
const projectTasks = await todoistService.getTasks({
  project_id: "2203306141"
});

// Attività con filtro
const todayTasks = await todoistService.getTasks({
  filter: "today"
});
```

##### `createTask()`
Crea una nuova attività.

**Parametri**:
```typescript
interface CreateTaskParams {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string;
  parent_id?: string;
  order?: number;
  labels?: string[];
  priority?: number;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  due_lang?: string;
  assignee_id?: string;
}
```

**Esempio**:
```typescript
const task = await todoistService.createTask({
  content: "Completare documentazione API",
  project_id: "2203306141",
  priority: 4,
  due_string: "tomorrow",
  labels: ["documentation", "urgent"]
});
```

##### `updateTask()`
Aggiorna un'attività esistente.

**Parametri**:
```typescript
interface UpdateTaskParams {
  id: string;
  content?: string;
  description?: string;
  labels?: string[];
  priority?: number;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
}
```

##### `completeTask()`
Completa un'attività.

**Parametri**:
```typescript
await todoistService.completeTask("task_id");
```

##### `deleteTask()`
Elimina un'attività.

**Parametri**:
```typescript
await todoistService.deleteTask("task_id");
```

#### Gestione Progetti

##### `getProjects()`
Recupera tutti i progetti dell'utente.

**Esempio**:
```typescript
const projects = await todoistService.getProjects();
```

##### `createProject()`
Crea un nuovo progetto.

**Parametri**:
```typescript
interface CreateProjectParams {
  name: string;
  parent_id?: string;
  color?: string;
  is_favorite?: boolean;
  view_style?: string;
}
```

##### `updateProject()`
Aggiorna un progetto esistente.

##### `deleteProject()`
Elimina un progetto.

#### Gestione Sezioni

##### `getSections()`
Recupera le sezioni di un progetto.

**Parametri**:
```typescript
const sections = await todoistService.getSections("project_id");
```

##### `createSection()`
Crea una nuova sezione.

**Parametri**:
```typescript
interface CreateSectionParams {
  name: string;
  project_id: string;
  order?: number;
}
```

#### Gestione Label

##### `getLabels()`
Recupera tutte le etichette dell'utente.

##### `createLabel()`
Crea una nuova etichetta.

**Parametri**:
```typescript
interface CreateLabelParams {
  name: string;
  order?: number;
  color?: string;
  is_favorite?: boolean;
}
```

### 🤖 Comandi AI

#### Modelli Supportati

##### Claude (Anthropic)
- `claude-3-haiku-20240307`
- `claude-3-sonnet-20240229`
- `claude-3-opus-20240229`
- `claude-3-5-sonnet-20241022`

##### Gemini (Google)
- `gemini-1.5-flash`
- `gemini-1.5-pro`

#### Tool Calls Disponibili

##### `todoist_get_tasks`
```typescript
{
  "name": "todoist_get_tasks",
  "description": "Get all tasks from Todoist",
  "parameters": {
    "project_id": "string (optional)",
    "filter": "string (optional)"
  }
}
```

##### `todoist_create_task`
```typescript
{
  "name": "todoist_create_task",
  "description": "Create a new task in Todoist",
  "parameters": {
    "content": "string (required)",
    "project_id": "string (optional)",
    "priority": "number (optional, 1-4)",
    "due_string": "string (optional)"
  }
}
```

##### `todoist_complete_task`
```typescript
{
  "name": "todoist_complete_task",
  "description": "Complete a task in Todoist",
  "parameters": {
    "task_id": "string (required)"
  }
}
```

##### `todoist_get_projects`
```typescript
{
  "name": "todoist_get_projects",
  "description": "Get all projects from Todoist",
  "parameters": {}
}
```

### 📊 Monitoring e Debugging

#### Cost Monitoring
```typescript
interface CostInfo {
  session_cost: number;
  total_cost: number;
  model: string;
  tokens_used: number;
  requests_count: number;
}
```

#### Error Handling
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}
```

### 🔧 Configurazione

#### Environment Variables
```bash
# Required
TODOIST_API_TOKEN=your_todoist_token
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Optional
DEFAULT_MODEL=claude-3-sonnet-20240229
MAX_CONTEXT_TOKENS=100000
DATABASE_PATH=./data/sessions.db
LOG_LEVEL=info
```

#### Database Schema

##### Sessions Table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);
```

##### Messages Table
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  tokens INTEGER,
  cost REAL,
  model TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions (id)
);
```

### 🚨 Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `TODOIST_AUTH_ERROR` | Token Todoist non valido | Verificare TODOIST_API_TOKEN |
| `AI_API_ERROR` | Errore API AI | Verificare API keys |
| `DATABASE_ERROR` | Errore database SQLite | Verificare permessi file |
| `COMMAND_NOT_FOUND` | Comando slash non riconosciuto | Usare /help per lista comandi |
| `INVALID_PARAMS` | Parametri comando non validi | Verificare sintassi comando |
| `SESSION_NOT_FOUND` | Sessione non trovata | Verificare ID sessione |
| `CONTEXT_OVERFLOW` | Context troppo lungo | Usare /clear o /new |

### 📝 Esempi Completi

#### Workflow Tipico
```bash
# 1. Creare nuova sessione
/new "Pianificazione Sprint"

# 2. Ottenere task correnti
Mostrami tutti i task del progetto "Sviluppo App"

# 3. Creare nuovi task
Crea un task "Implementare login" con priorità alta per domani

# 4. Salvare sessione
/save "Sprint Planning Completato"

# 5. Verificare stato
/status
```

#### Integrazione AI + Todoist
```bash
# L'AI può automaticamente:
# - Analizzare i tuoi task
# - Suggerire priorità
# - Creare task basati su conversazione
# - Organizzare progetti
# - Fornire insights sui pattern di lavoro

"Analizza i miei task e suggerisci come organizzare meglio la settimana"
```