# 🤖 Todoist AI CLI

Un'interfaccia a riga di comando intelligente che integra Todoist con AI (Claude/Gemini) per una gestione avanzata delle attività.

## 🚀 Caratteristiche

### ✅ Implementate
- **Interfaccia CLI moderna** con React + Ink
- **Integrazione AI** con Claude (Anthropic) e Gemini
- **Chat interattiva** con streaming responses
- **Gestione sessioni** in memoria con context management
- **Comandi slash** con autocompletamento
- **Splash screen** animata con branding
- **Context awareness** con token counting automatico

### 🚧 In Sviluppo
- **Integrazione Todoist API** per gestione task
- **Persistenza database** SQLite per sessioni
- **Comandi slash funzionanti** (/tasks, /projects, /add-task, etc.)
- **Lettura file Markdown** per context esteso
- **Sistema di testing** completo

## 📋 Prerequisiti

- **Node.js** 18+ 
- **npm** o **yarn**
- **API Keys**:
  - Todoist API Token
  - Anthropic API Key (per Claude)
  - Google AI API Key (per Gemini)

## 🛠️ Installazione

### 1. Clone del Repository
```bash
git clone <repository-url>
cd todoist-ai-cli
```

### 2. Installazione Dipendenze
```bash
npm install
```

### 3. Configurazione Environment
```bash
cp .env.example .env
```

Modifica `.env` con le tue API keys:
```env
# Todoist Configuration
TODOIST_API_KEY=your_todoist_api_key_here
TODOIST_BASE_URL=https://api.todoist.com/rest/v2

# Claude Configuration (Anthropic)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7

# Gemini Configuration (Google AI)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
GEMINI_MODEL=gemini-pro
GEMINI_MAX_TOKENS=4000
GEMINI_TEMPERATURE=0.7

# Application Settings
DEBUG=false
SESSION_AUTOSAVE=true
SESSION_TIMEOUT=3600
```

## 🚀 Utilizzo

### Avvio Applicazione
```bash
# Development
npm run dev

# Build e Run
npm run build
npm start
```

### Opzioni CLI
```bash
# Riprendi ultima sessione
npm start -- --resume

# Specifica sessione
npm start -- --session-id <session-id>

# Debug mode
npm start -- --debug

# Specifica provider AI
npm start -- --provider claude
npm start -- --provider gemini
```

### Comandi Slash Disponibili

#### 🔧 Comandi Generali
- `/help` - Mostra tutti i comandi disponibili
- `/clear` - Pulisce la chat corrente
- `/exit` - Esce dall'applicazione

#### 📋 Comandi Todoist (In Sviluppo)
- `/tasks` - Lista tutte le attività
- `/projects` - Lista tutti i progetti
- `/add-task <content>` - Aggiunge una nuova attività
- `/complete <task-id>` - Completa un'attività
- `/sync` - Sincronizza con Todoist

#### 💾 Comandi Sessione (In Sviluppo)
- `/sessions` - Lista tutte le sessioni salvate
- `/new` - Crea una nuova sessione
- `/save` - Salva la sessione corrente

#### 🤖 Comandi AI (In Sviluppo)
- `/analyze` - Analizza le attività con AI
- `/suggest` - Suggerimenti AI per organizzazione
- `/summarize` - Riassume la sessione corrente

#### 📁 Comandi Context (In Sviluppo)
- `/read <file-path>` - Legge file Markdown nel context
- `/context` - Mostra context corrente
- `/clear-context` - Pulisce il context

## 🏗️ Architettura

### Stack Tecnologico
- **Frontend**: React + Ink (CLI UI)
- **Language**: TypeScript
- **Build**: tsx per development
- **AI Integration**: Anthropic SDK, Axios
- **State Management**: React Hooks
- **Configuration**: dotenv, conf
- **CLI Parsing**: yargs

### Struttura Progetto
```
src/
├── components/          # Componenti React CLI
│   ├── App.tsx         # Componente principale
│   ├── ChatInterface.tsx
│   ├── SplashScreen.tsx
│   ├── InputArea.tsx
│   ├── ContentArea.tsx
│   ├── SessionSelector.tsx
│   ├── ContextIndicator.tsx
│   └── CommandMenu.tsx
├── services/           # Servizi core
│   ├── LLMService.ts   # Integrazione AI
│   ├── SessionManager.ts
│   ├── ContextManager.ts
│   └── TodoistService.ts  # (In sviluppo)
├── types/              # Type definitions
├── utils/              # Utilities
│   └── cli.ts         # CLI argument parsing
└── prompts/
    └── templates.ts    # Template prompt AI
```

### Componenti Principali

#### LLMService
Gestisce l'integrazione con i provider AI:
- Supporto Claude e Gemini
- Streaming responses
- Context summarization automatica
- Switch dinamico tra provider

#### SessionManager
Gestione delle sessioni di chat:
- Creazione/caricamento sessioni
- Gestione messaggi in memoria
- Integrazione con ContextManager

#### ContextManager
Monitoraggio e gestione del context:
- Token counting in tempo reale
- Auto-summarization quando necessario
- Indicatori visivi stato context

## 🧪 Testing

### Setup Testing (In Sviluppo)
```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test

# Coverage report
npm run test:coverage
```

## 📚 Documentazione

### File di Documentazione
- [`docs/SERVICES_GUIDE.md`](docs/SERVICES_GUIDE.md) - Guida completa ai servizi con esempi pratici
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) - Riferimento API dettagliato per tutti i servizi
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) - Guida troubleshooting e FAQ
- `PROJECT_ANALYSIS.md` - Analisi completa stato progetto
- `IMPLEMENTATION_PLAN.md` - Piano implementazione originale
- `.env.example` - Template configurazione

### Guide Rapide
- **Primi Passi**: Segui la sezione [Installazione](#installazione) e [Configurazione](#configurazione)
- **Uso dei Servizi**: Consulta [`SERVICES_GUIDE.md`](docs/SERVICES_GUIDE.md) per esempi pratici
- **Risoluzione Problemi**: Vedi [`TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) per soluzioni comuni
- **API Reference**: Consulta [`API_REFERENCE.md`](docs/API_REFERENCE.md) per dettagli tecnici

## 🐛 Troubleshooting

### Problemi Comuni

Per una guida completa alla risoluzione dei problemi, consulta [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

#### Problemi Rapidi

1. **Errori API Keys**: Verifica che le API keys in `.env` siano corrette
2. **Errori di Connessione**: Controlla connessione internet e stato servizi API  
3. **Errori di Build**: Reinstalla dipendenze con `npm install`

### Debug Mode
Attiva il debug mode per log dettagliati:
```bash
npm start -- --debug
```

### Supporto
- 📖 **Guida Completa**: [`TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)
- 🔧 **API Reference**: [`API_REFERENCE.md`](docs/API_REFERENCE.md)
- 💡 **Esempi Pratici**: [`SERVICES_GUIDE.md`](docs/SERVICES_GUIDE.md)

## 🗺️ Roadmap

### v1.0 (MVP) - Target: 4 settimane
- [x] Interfaccia CLI base
- [x] Integrazione AI (Claude/Gemini)
- [x] Chat interattiva
- [ ] Integrazione Todoist completa
- [ ] Persistenza sessioni
- [ ] Comandi slash funzionanti
- [ ] Lettura file Markdown

### v1.1 (Miglioramenti)
- [ ] Plugin system
- [ ] Custom commands
- [ ] Advanced filtering
- [ ] Bulk operations
- [ ] Export/Import sessioni

### v2.0 (Espansioni)
- [ ] Multi-account support
- [ ] Voice input
- [ ] Local LLM support
- [ ] Web interface
- [ ] Mobile companion

## 🤝 Contribuire

### Development Setup
1. Fork del repository
2. Crea feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Apri Pull Request

### Coding Standards
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Test coverage >70%

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi `LICENSE` per dettagli.

## 🙏 Riconoscimenti

- [Ink](https://github.com/vadimdemedes/ink) - React per CLI
- [Anthropic](https://www.anthropic.com/) - Claude AI
- [Google AI](https://ai.google.dev/) - Gemini
- [Todoist](https://todoist.com/) - Task management API

---

**Stato Progetto**: 🚧 In Sviluppo Attivo  
**Versione Corrente**: 0.5.0-alpha  
**Ultimo Aggiornamento**: $(date)

Per domande o supporto, apri un issue nel repository.