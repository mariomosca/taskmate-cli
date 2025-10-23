# Todoist AI CLI - Piano di Implementazione

## 1. OVERVIEW DEL PROGETTO

### 1.1 Descrizione
CLI interattivo che integra AI (Claude, Gemini) con Todoist per gestire task in modo intelligente attraverso conversazioni naturali con l'AI.

### 1.2 Obiettivi Principali
- Interfaccia CLI moderna e interattiva simile a Claude Code/Gemini CLI
- Supporto multi-LLM (Claude, Gemini) con architettura estensibile
- Integrazione completa con Todoist API
- Gestione sessioni persistenti
- Capacità di leggere e processare file markdown
- Sistema di comandi slash per operazioni rapide

---

## 2. STACK TECNOLOGICO

### 2.1 Linguaggio: Python 3.9+
**Motivazioni:**
- SDK ufficiali per Claude e Gemini
- Eccellenti librerie per CLI interattivi
- Facile integrazione con API REST
- Gestione semplice di persistenza dati

### 2.2 Dipendenze Core

#### UI/CLI Framework
- **`rich`** (v13+): UI/TUI elegante, progress bars, tabelle, sintassi highlighting
- **`prompt_toolkit`** (v3+): Input interattivo avanzato, autocomplete, history
- **`typer`** (v0.9+): Framework moderno per CLI con type hints

#### AI/LLM Integration
- **`anthropic`** (latest): SDK ufficiale Claude API
- **`google-genai`** (latest): SDK ufficiale Google Gemini API

#### Todoist Integration
- **`todoist-api-python`** o **`requests`**: Integrazione Todoist REST API v1

#### Data & Storage
- **`sqlalchemy`** (v2+): ORM per gestione database sessioni
- **`pydantic`** (v2+): Validazione dati e settings
- **`python-dotenv`**: Gestione variabili ambiente

#### Utilities
- **`markdown`**: Parser markdown per file .md
- **`click`** (opzionale): Alternative a typer
- **`aiohttp`**: Chiamate API async (performance)

---

## 3. ARCHITETTURA DEL SISTEMA

### 3.1 Struttura Directory

```
todoist-ai-cli/
├── src/
│   ├── __init__.py
│   ├── main.py                 # Entry point
│   ├── cli/
│   │   ├── __init__.py
│   │   ├── app.py             # Main CLI application loop
│   │   ├── commands.py        # Slash commands handler
│   │   ├── ui.py              # Rich UI components
│   │   └── splash.py          # Splash screen
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── base.py            # Abstract LLM interface
│   │   ├── claude.py          # Claude implementation
│   │   ├── gemini.py          # Gemini implementation
│   │   └── factory.py         # LLM factory pattern
│   ├── todoist/
│   │   ├── __init__.py
│   │   ├── client.py          # Todoist API wrapper
│   │   ├── models.py          # Pydantic models per tasks
│   │   └── operations.py      # CRUD operations
│   ├── session/
│   │   ├── __init__.py
│   │   ├── manager.py         # Session persistence
│   │   ├── models.py          # SQLAlchemy models
│   │   └── database.py        # DB setup
│   ├── markdown/
│   │   ├── __init__.py
│   │   └── parser.py          # MD file reader & processor
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py        # Pydantic settings
│   │   └── .env.example       # Template env variables
│   └── utils/
│       ├── __init__.py
│       ├── logger.py          # Logging setup
│       └── helpers.py         # Utility functions
├── tests/
│   ├── __init__.py
│   ├── test_llm/
│   ├── test_todoist/
│   └── test_cli/
├── data/
│   └── sessions.db            # SQLite database (gitignored)
├── docs/
│   ├── USAGE.md
│   └── COMMANDS.md
├── .env                        # Gitignored
├── .env.example
├── .gitignore
├── requirements.txt
├── setup.py
├── pyproject.toml             # Poetry/modern packaging
└── README.md
```

### 3.2 Componenti Architetturali

#### 3.2.1 CLI Layer (cli/)
**Responsabilità:**
- REPL loop interattivo
- Gestione input/output
- Rendering UI con Rich
- Routing comandi slash
- Splash screen e welcome

**Flusso:**
```
Start → Splash Screen → Main Loop → [Input] → Command Router → Action → Output → Loop
```

#### 3.2.2 LLM Layer (llm/)
**Pattern:** Strategy + Factory

**Base Interface (`base.py`):**
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseLLM(ABC):
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        """Send chat messages and get response"""
        pass

    @abstractmethod
    async def stream_chat(self, messages: List[Dict[str, str]]):
        """Stream chat response"""
        pass

    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Get model metadata"""
        pass
```

**Implementations:**
- `claude.py`: Anthropic API implementation
- `gemini.py`: Google Gemini API implementation

**Factory (`factory.py`):**
```python
def get_llm(provider: str) -> BaseLLM:
    if provider == "claude":
        return ClaudeLLM()
    elif provider == "gemini":
        return GeminiLLM()
    raise ValueError(f"Unknown provider: {provider}")
```

#### 3.2.3 Todoist Layer (todoist/)
**Responsabilità:**
- API client wrapper
- Task CRUD operations
- Projects/Labels/Filters management
- Data models validation

**Capabilities:**
- Creare/aggiornare/eliminare task
- Gestire progetti e sezioni
- Applicare labels e priorità
- Quick Add con natural language
- Sincronizzazione bidirezionale

#### 3.2.4 Session Layer (session/)
**Responsabilità:**
- Persistenza conversazioni
- History management
- Context retrieval

**Schema Database:**
```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    session_id TEXT UNIQUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    llm_provider TEXT,
    metadata JSON
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    role TEXT,  -- 'user', 'assistant', 'system'
    content TEXT,
    timestamp TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE contexts (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    file_path TEXT,
    content TEXT,
    added_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

#### 3.2.5 Markdown Parser (markdown/)
**Responsabilità:**
- Leggere file .md
- Estrarre contenuto strutturato
- Fornire context all'LLM

---

## 4. FUNZIONALITÀ DETTAGLIATE

### 4.1 Splash Screen
**Libreria:** Rich

**Elementi:**
- ASCII art logo
- Versione app
- LLM provider attivo
- Todoist account info
- Tips/shortcuts

**Esempio output:**
```
╔══════════════════════════════════════════╗
║                                          ║
║      TODOIST AI CLI v1.0.0              ║
║      Powered by Claude & Gemini         ║
║                                          ║
╚══════════════════════════════════════════╝

[✓] Connected to Todoist as: user@example.com
[✓] LLM Provider: Claude (Sonnet 4.5)
[✓] Session: session_123abc

Type /help for commands or start chatting!
```

### 4.2 Main Loop (REPL)
**Libreria:** prompt_toolkit + rich

**Features:**
- Input con autocomplete
- Syntax highlighting
- Command history (↑/↓)
- Multiline input (Alt+Enter)
- Ctrl+C interrupt graceful
- Ctrl+D exit

**Prompt format:**
```
todoist-ai › |
```

### 4.3 Sistema Comandi Slash

#### Comandi Core
```
/help               - Mostra aiuto
/exit, /quit        - Esci dal CLI
/clear              - Pulisci schermo
/session            - Info sessione corrente
/sessions           - Lista sessioni salvate
/load <id>          - Carica sessione precedente
/new                - Nuova sessione
/llm <provider>     - Cambia LLM (claude/gemini)
/status             - Stato Todoist e LLM
```

#### Comandi Todoist
```
/tasks              - Lista task di oggi
/projects           - Lista progetti
/add <task>         - Quick add task
/complete <id>      - Completa task
/sync               - Sincronizza con Todoist
```

#### Comandi Context
```
/read <path>        - Leggi file .md e aggiungi a context
/context            - Mostra context corrente
/clear-context      - Pulisci context
```

#### Comandi AI
```
/suggest            - AI suggerisce task basati su context
/organize           - AI organizza/prioritizza task
/summarize          - AI riassume sessione
/analyze            - AI analizza produttività
```

### 4.4 Persistenza Sessioni

**Funzionalità:**
- Auto-save ogni N messaggi
- Resume sessione all'avvio
- Export sessione in MD
- Search nelle sessioni passate

**API:**
```python
session_manager.create_session(llm_provider="claude")
session_manager.save_message(role="user", content="...")
session_manager.load_session(session_id)
session_manager.get_context()
session_manager.add_context_file(file_path)
```

### 4.5 Integrazione Markdown

**Use Cases:**
1. Leggere note personali per generare task
2. Processare meeting notes → task automatici
3. Context per AI (progetti, goals, ecc.)

**Esempio:**
```
› /read ~/notes/weekly-goals.md
✓ File caricato: weekly-goals.md (2.3 KB)
✓ Aggiunto a context sessione

› Basandoti sul file che ho caricato, suggerisci task per questa settimana

🤖 Ho analizzato i tuoi obiettivi settimanali. Ecco i task suggeriti:
...
```

---

## 5. FLUSSO UTENTE

### 5.1 Primo Avvio

```
1. Utente lancia: $ todoist-ai
2. Check configurazione (.env)
3. Se mancano API keys → Interactive setup
4. Splash screen
5. Connessione Todoist + LLM
6. Welcome message
7. Main loop ready
```

### 5.2 Sessione Tipica

```
1. Avvio CLI
2. Resume ultima sessione o nuova
3. (Opzionale) /read file.md per context
4. Conversazione naturale con AI:
   User: "Dammi i task di oggi"
   AI: [Fetches da Todoist, mostra lista formattata]

   User: "Aggiungi task: Chiamare Mario domani alle 15"
   AI: [Crea task con due date, conferma]

   User: "Suggerisci come organizzare la giornata"
   AI: [Analizza task, suggerisce priorità e ordine]

5. /exit → Salvataggio automatico sessione
```

### 5.3 AI Workflow

**L'AI può:**
- Leggere task da Todoist
- Creare/modificare/completare task
- Organizzare per priorità
- Suggerire breakdown di task complessi
- Analizzare produttività
- Rispondere domande sui task
- Processare markdown files per estrarre action items

**Esempio conversazione:**
```
› Ho un meeting domani alle 10 sul progetto Alpha. Prepara i task necessari.

🤖 Perfetto! Ho creato i seguenti task in Todoist:

1. [✓] Preparare agenda meeting Progetto Alpha
   📅 Domani alle 9:00
   🏷️  #lavoro #meeting

2. [✓] Rivedere documenti progetto Alpha
   📅 Oggi
   🏷️  #preparazione

3. [✓] Meeting: Progetto Alpha
   📅 Domani alle 10:00
   🏷️  #meeting

Vuoi che aggiunga altri task di follow-up?
```

---

## 6. CONFIGURAZIONE

### 6.1 File .env

```env
# Todoist
TODOIST_API_TOKEN=your_token_here

# Claude
ANTHROPIC_API_KEY=your_key_here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# Gemini
GOOGLE_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash

# App Settings
DEFAULT_LLM=claude
SESSION_AUTOSAVE=true
SESSION_AUTOSAVE_INTERVAL=5
LOG_LEVEL=INFO
DATABASE_PATH=data/sessions.db
```

### 6.2 Pydantic Settings

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Todoist
    todoist_api_token: str

    # LLM
    anthropic_api_key: str | None = None
    google_api_key: str | None = None
    default_llm: str = "claude"
    claude_model: str = "claude-sonnet-4-5-20250929"
    gemini_model: str = "gemini-2.5-flash"

    # App
    session_autosave: bool = True
    session_autosave_interval: int = 5
    log_level: str = "INFO"
    database_path: str = "data/sessions.db"

    class Config:
        env_file = ".env"
```

---

## 7. IMPLEMENTAZIONE FASI

### FASE 1: Setup & Foundation (Settimana 1)
**Deliverables:**
- [ ] Struttura progetto
- [ ] Setup dependencies (requirements.txt, pyproject.toml)
- [ ] Configuration system (settings.py, .env)
- [ ] Logging setup
- [ ] Basic CLI skeleton (typer + rich)
- [ ] Splash screen
- [ ] Main REPL loop

**Priorità:** ALTA

### FASE 2: Todoist Integration (Settimana 1-2)
**Deliverables:**
- [ ] Todoist client wrapper
- [ ] Pydantic models per tasks/projects
- [ ] CRUD operations base
- [ ] Test connessione API
- [ ] Quick add implementation
- [ ] Sync functionality

**Priorità:** ALTA

### FASE 3: LLM Integration (Settimana 2)
**Deliverables:**
- [ ] Base LLM interface (abstract)
- [ ] Claude implementation
- [ ] Gemini implementation
- [ ] LLM Factory
- [ ] Test conversazioni base
- [ ] Streaming support

**Priorità:** ALTA

### FASE 4: Session Management (Settimana 2-3)
**Deliverables:**
- [ ] SQLAlchemy models
- [ ] Database initialization
- [ ] Session CRUD
- [ ] Message persistence
- [ ] Context management
- [ ] Session resume/load

**Priorità:** MEDIA

### FASE 5: Slash Commands (Settimana 3)
**Deliverables:**
- [ ] Command parser
- [ ] Core commands (/help, /exit, etc.)
- [ ] Todoist commands
- [ ] Context commands
- [ ] AI commands
- [ ] Command autocomplete

**Priorità:** MEDIA

### FASE 6: Markdown Integration (Settimana 3)
**Deliverables:**
- [ ] MD parser
- [ ] File reader
- [ ] Context extraction
- [ ] /read command implementation

**Priorità:** BASSA

### FASE 7: AI Workflows (Settimana 4)
**Deliverables:**
- [ ] System prompts per AI
- [ ] Tool calling (AI → Todoist operations)
- [ ] Suggestion engine
- [ ] Organization logic
- [ ] Analytics/summaries

**Priorità:** MEDIA

### FASE 8: Polish & UX (Settimana 4)
**Deliverables:**
- [ ] UI refinements
- [ ] Error handling robusto
- [ ] Loading states
- [ ] Progress indicators
- [ ] Help system completo
- [ ] Documentazione utente

**Priorità:** MEDIA

### FASE 9: Testing & QA (Settimana 4-5)
**Deliverables:**
- [ ] Unit tests (>70% coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Bug fixing
- [ ] Performance optimization

**Priorità:** ALTA

### FASE 10: Deployment & Docs (Settimana 5)
**Deliverables:**
- [ ] PyPI package setup
- [ ] Installation script
- [ ] README completo
- [ ] USAGE guide
- [ ] Video tutorial (opzionale)
- [ ] Release v1.0.0

**Priorità:** MEDIA

---

## 8. API REFERENCE RAPIDA

### 8.1 Todoist API v1 Endpoints
```
GET  /tasks           - Get all tasks
POST /tasks           - Create task
GET  /tasks/:id       - Get task
POST /tasks/:id       - Update task
DELETE /tasks/:id     - Delete task
POST /tasks/:id/close - Complete task

GET  /projects        - Get projects
POST /projects        - Create project
```

### 8.2 Claude API
```python
import anthropic

client = anthropic.Anthropic(api_key="...")
response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
```

### 8.3 Gemini API
```python
import google.generativeai as genai

genai.configure(api_key="...")
model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content("Hello!")
```

---

## 9. CONSIDERAZIONI TECNICHE

### 9.1 Performance
- Async I/O per chiamate API (aiohttp)
- Caching responses quando possibile
- Lazy loading per UI
- Database indexing per sessions

### 9.2 Security
- API keys in .env (gitignored)
- No hardcoded secrets
- Input validation (Pydantic)
- SQL injection prevention (SQLAlchemy ORM)

### 9.3 Error Handling
- Retry logic per API failures
- Graceful degradation
- User-friendly error messages
- Logging dettagliato

### 9.4 Testing Strategy
- Unit: Tutti i moduli isolati
- Integration: LLM + Todoist
- E2E: Full user flows
- Mock API calls per tests

---

## 10. ESTENSIONI FUTURE

### v1.1+
- [ ] Plugin system per custom commands
- [ ] Multi-account Todoist
- [ ] Voice input (Whisper API)
- [ ] Web dashboard companion
- [ ] Mobile notifications
- [ ] Team collaboration features
- [ ] More LLM providers (OpenAI, etc.)
- [ ] MCP (Model Context Protocol) support
- [ ] Export to other task managers

### v2.0+
- [ ] Local LLM support (Ollama)
- [ ] Advanced analytics dashboard
- [ ] Habit tracking integration
- [ ] Calendar sync (Google Calendar, etc.)
- [ ] Time tracking
- [ ] Pomodoro timer integration

---

## 11. METRICHE DI SUCCESSO

### MVP (v1.0)
- ✓ Connessione stabile a Todoist
- ✓ Almeno 2 LLM funzionanti (Claude + Gemini)
- ✓ REPL interattivo fluido
- ✓ 10+ comandi slash
- ✓ Persistenza sessioni
- ✓ Leggere file MD
- ✓ AI in grado di fare CRUD su Todoist
- ✓ Documentazione completa

### KPI
- Response time < 2s per operazioni standard
- Uptime API > 99%
- Test coverage > 70%
- Zero secrets in repo
- Installation < 5 minuti

---

## 12. RISORSE & RIFERIMENTI

### Documentazione
- [Claude API Docs](https://docs.anthropic.com/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Todoist API Docs](https://developer.todoist.com/)
- [Rich Docs](https://rich.readthedocs.io/)
- [Prompt Toolkit](https://python-prompt-toolkit.readthedocs.io/)

### Ispirazione
- Claude Code CLI
- Gemini CLI
- GitHub CLI (gh)
- Vercel CLI

### Community
- GitHub Discussions
- Discord (opzionale)
- Issue tracker

---

## CONCLUSIONI

Questo documento fornisce una roadmap completa per implementare il Todoist AI CLI. L'architettura proposta è:

✅ **Modulare**: Ogni componente è isolato e testabile
✅ **Estensibile**: Facile aggiungere nuovi LLM/features
✅ **User-friendly**: Interfaccia moderna e intuitiva
✅ **Production-ready**: Best practices per security, testing, logging

**Linguaggio scelto: Python 3.9+**

**Timeline stimata: 4-5 settimane** per MVP v1.0

**Next Steps:**
1. Review questo documento
2. Conferma requirements
3. Setup repo GitHub
4. Inizio Fase 1

Pronto a iniziare l'implementazione! 🚀
