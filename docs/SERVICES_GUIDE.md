# Guida ai Servizi - Todoist AI CLI

## Panoramica Architettura

Il progetto è strutturato attorno a 6 servizi principali che gestiscono diverse funzionalità dell'applicazione.

## 🤖 LLMService (810 righe)

### Responsabilità
- Integrazione con modelli AI (Claude, Gemini)
- Gestione delle conversazioni
- Tool calling per integrazione Todoist
- Context management automatico

### Funzionalità Principali
```typescript
// Invio messaggi con context automatico
await llmService.sendMessage(message, context);

// Tool calling per Todoist
await llmService.callTool('todoist_get_tasks', params);

// Gestione modelli multipli
llmService.switchModel('claude-3-sonnet');
```

### Coverage: 77.82% (60+ test)

## 📋 TodoistService (693 righe)

### Responsabilità
- Integrazione completa con Todoist API
- Gestione task, progetti, sezioni, label
- Operazioni CRUD complete
- Sincronizzazione automatica

### Funzionalità Principali
```typescript
// Gestione task
await todoistService.getTasks();
await todoistService.createTask(content, projectId);
await todoistService.completeTask(taskId);

// Gestione progetti
await todoistService.getProjects();
await todoistService.createProject(name);

// Gestione sezioni e label
await todoistService.getSections(projectId);
await todoistService.getLabels();
```

### Coverage: 87.68% (55+ test)

## 💾 SessionManager (410 righe)

### Responsabilità
- Gestione sessioni di chat
- Persistenza messaggi in SQLite
- Backup e restore automatico
- Search nei messaggi storici

### Funzionalità Principali
```typescript
// Gestione sessioni
await sessionManager.createSession(name);
await sessionManager.loadSession(sessionId);
await sessionManager.saveSession();

// Gestione messaggi
await sessionManager.addMessage(message);
await sessionManager.searchMessages(query);
```

### Coverage: 92.08% (50+ test)

## 🗄️ DatabaseService (494 righe)

### Responsabilità
- Gestione database SQLite
- Schema management automatico
- Operazioni CRUD ottimizzate
- Backup e recovery

### Funzionalità Principali
```typescript
// Operazioni database
await db.query(sql, params);
await db.transaction(operations);

// Schema management
await db.migrate();
await db.backup();
```

### Coverage: 96.15% (65+ test)

## 🎯 ContextManager (346 righe)

### Responsabilità
- Gestione context delle conversazioni
- Token counting automatico
- Summarization intelligente
- Context window optimization

### Funzionalità Principali
```typescript
// Gestione context
contextManager.addMessage(message);
contextManager.getContext();
contextManager.summarizeIfNeeded();

// Token management
const tokens = contextManager.countTokens(text);
```

### Coverage: 78.26% (35+ test)

## ⚡ CommandHandler (518 righe)

### Responsabilità
- Sistema comandi slash completo
- Routing comandi automatico
- Validazione parametri
- Help system integrato

### Funzionalità Principali
```typescript
// Registrazione comandi
commandHandler.register('/tasks', handleTasks);
commandHandler.register('/save', handleSave);

// Esecuzione comandi
await commandHandler.execute(command, args);
```

### Coverage: 75.00% (20+ test)

## 🔧 Servizi Ausiliari

### TodoistAIService
- Integrazione AI-Todoist
- Analisi intelligente task
- Suggerimenti automatici

### CostMonitor
- Monitoraggio costi AI
- Usage tracking
- Budget alerts

### ModelManager
- Gestione modelli AI
- Switching automatico
- Performance monitoring

### TokenCounter
- Conteggio token preciso
- Ottimizzazione context
- Cost estimation

## 🧪 Testing Strategy

### Coverage Totale: 84.57%
- **Statements**: 83.14%
- **Branches**: 71.46%
- **Functions**: 87.76%
- **Lines**: 84.57%

### Test Distribution
- **Core Services**: 77-96% coverage
- **UI Components**: 0% coverage (da implementare)
- **Total Tests**: 310

## 🚀 Performance

### Metriche Chiave
- **Startup time**: < 2s
- **Command response**: < 500ms
- **Database queries**: < 100ms
- **AI response**: 2-10s (dipende dal modello)

### Ottimizzazioni
- Connection pooling per database
- Context caching intelligente
- Lazy loading dei servizi
- Batch operations per Todoist API

## 🔒 Sicurezza

### Best Practices
- API keys in environment variables
- Input validation su tutti i comandi
- SQL injection prevention
- Rate limiting per API calls

### Configurazione
```bash
# Required environment variables
TODOIST_API_TOKEN=your_token
ANTHROPIC_API_KEY=your_key
GOOGLE_API_KEY=your_key
```

## 📈 Monitoring

### Metriche Disponibili
- Cost tracking per modello AI
- Usage statistics per comando
- Performance metrics per servizio
- Error rates e debugging info

### Logging
- Structured logging con Winston
- Log levels configurabili
- Rotation automatica
- Debug mode per development