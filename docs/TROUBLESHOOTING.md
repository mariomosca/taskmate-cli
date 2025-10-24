# 🔧 Troubleshooting & FAQ - Todoist AI CLI

Guida completa per risolvere problemi comuni e domande frequenti.

## 📋 Indice

1. [Problemi di Installazione](#problemi-di-installazione)
2. [Errori di Configurazione](#errori-di-configurazione)
3. [Problemi API](#problemi-api)
4. [Errori di Performance](#errori-di-performance)
5. [Problemi di Costo](#problemi-di-costo)
6. [Errori di Context](#errori-di-context)
7. [FAQ](#faq)
8. [Debug e Logging](#debug-e-logging)

---

## Problemi di Installazione

### ❌ Errore: `npm install` fallisce

**Sintomi:**
```bash
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Soluzioni:**

1. **Pulisci cache npm:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. **Usa flag legacy-peer-deps:**
```bash
npm install --legacy-peer-deps
```

3. **Verifica versione Node.js:**
```bash
node --version  # Deve essere >= 18.0.0
npm --version   # Deve essere >= 8.0.0
```

4. **Installa con yarn (alternativa):**
```bash
npm install -g yarn
yarn install
```

---

### ❌ Errore: TypeScript non trovato

**Sintomi:**
```bash
Error: Cannot find module 'typescript'
```

**Soluzione:**
```bash
# Installa TypeScript globalmente
npm install -g typescript

# O localmente nel progetto
npm install --save-dev typescript @types/node
```

---

### ❌ Errore: Permessi su macOS/Linux

**Sintomi:**
```bash
Error: EACCES: permission denied
```

**Soluzioni:**

1. **Usa nvm per gestire Node.js:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

2. **Cambia directory npm globale:**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## Errori di Configurazione

### ❌ Errore: API Keys non valide

**Sintomi:**
```bash
Error: Invalid API key
LLMServiceError: Authentication failed
```

**Diagnosi:**
```bash
# Verifica che le variabili siano impostate
echo $ANTHROPIC_API_KEY
echo $GOOGLE_AI_API_KEY
echo $TODOIST_API_KEY
```

**Soluzioni:**

1. **Verifica formato API keys:**
```bash
# Anthropic: sk-ant-api03-...
# Google AI: AIza...
# Todoist: token alfanumerico
```

2. **Ricrea file .env:**
```bash
cp .env.example .env
# Modifica .env con le tue chiavi
```

3. **Test API keys:**
```bash
# Test Anthropic
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.anthropic.com/v1/messages

# Test Google AI
curl "https://generativelanguage.googleapis.com/v1/models?key=$GOOGLE_AI_API_KEY"
```

---

### ❌ Errore: File .env non caricato

**Sintomi:**
```bash
Error: Environment variables not loaded
```

**Soluzioni:**

1. **Verifica posizione file .env:**
```bash
ls -la .env  # Deve essere nella root del progetto
```

2. **Verifica sintassi .env:**
```bash
# Corretto
ANTHROPIC_API_KEY=sk-ant-api03-...

# Sbagliato (spazi attorno =)
ANTHROPIC_API_KEY = sk-ant-api03-...
```

3. **Forza ricaricamento:**
```bash
source .env
npm run dev
```

---

## Problemi API

### ❌ Errore: Rate limit superato

**Sintomi:**
```bash
Error: Rate limit exceeded
Status: 429 Too Many Requests
```

**Soluzioni:**

1. **Implementa backoff automatico:**
```typescript
// Nel tuo codice
try {
  const response = await llmService.chat(messages);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Aspetta e riprova
    await new Promise(resolve => setTimeout(resolve, 60000));
    const response = await llmService.chat(messages);
  }
}
```

2. **Riduci frequenza richieste:**
```typescript
// Aggiungi delay tra richieste
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

for (const message of messages) {
  await llmService.chat([message]);
  await delay(2000); // 2 secondi tra richieste
}
```

3. **Verifica limiti del tuo piano:**
- Claude: 50 richieste/minuto (tier 1)
- Gemini: 60 richieste/minuto (free tier)

---

### ❌ Errore: Timeout di rete

**Sintomi:**
```bash
Error: Network request failed
Error: ETIMEDOUT
```

**Soluzioni:**

1. **Aumenta timeout:**
```typescript
// Configurazione custom timeout
const llmService = new LLMService(modelManager, {
  timeout: 60000 // 60 secondi
});
```

2. **Verifica connessione:**
```bash
# Test connettività
ping api.anthropic.com
ping generativelanguage.googleapis.com
```

3. **Usa proxy se necessario:**
```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

---

### ❌ Errore: Modello non disponibile

**Sintomi:**
```bash
Error: Model claude-3-sonnet-20240229 not available
```

**Soluzioni:**

1. **Verifica modelli disponibili:**
```typescript
const models = llmService.getAvailableModels();
console.log('Modelli disponibili:', models);
```

2. **Usa modello alternativo:**
```typescript
// Fallback automatico
try {
  llmService.setModel('claude-3-sonnet-20240229');
} catch (error) {
  llmService.setModel('claude-3-haiku-20240307'); // Fallback
}
```

3. **Aggiorna configurazione modelli:**
```typescript
// In ModelLimits.ts, aggiungi nuovi modelli
export const MODEL_CONFIGS = {
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    maxTokens: 200000,
    // ...
  }
};
```

---

## Errori di Performance

### ❌ Errore: Risposta troppo lenta

**Sintomi:**
- Risposte che impiegano >30 secondi
- UI che si blocca durante le richieste

**Soluzioni:**

1. **Usa streaming:**
```typescript
// Invece di chat normale
const response = await llmService.chat(messages);

// Usa streaming per UI reattiva
const stream = llmService.chatStream(messages);
for await (const chunk of stream) {
  updateUI(chunk);
}
```

2. **Ottimizza context:**
```typescript
// Riduci dimensione context
const optimizedMessages = await contextManager.getOptimizedMessages(
  messages,
  'claude-3-sonnet-20240229'
);
```

3. **Usa modelli più veloci:**
```typescript
// Claude Haiku è più veloce di Sonnet
llmService.setModel('claude-3-haiku-20240307');
```

---

### ❌ Errore: Memoria insufficiente

**Sintomi:**
```bash
Error: JavaScript heap out of memory
```

**Soluzioni:**

1. **Aumenta heap size:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

2. **Ottimizza gestione messaggi:**
```typescript
// Limita cronologia messaggi
const MAX_MESSAGES = 50;
const recentMessages = messages.slice(-MAX_MESSAGES);
```

3. **Pulisci cache periodicamente:**
```typescript
// Pulisci cache ogni 100 messaggi
if (messageCount % 100 === 0) {
  contextManager.clearCache();
}
```

---

## Problemi di Costo

### ❌ Errore: Limite di costo superato

**Sintomi:**
```bash
CostLimitError: Daily cost limit exceeded
Alert: Session cost limit reached
```

**Soluzioni:**

1. **Verifica costi correnti:**
```typescript
const dailySummary = costMonitor.getDailySummary();
const sessionSummary = costMonitor.getSessionSummary();

console.log(`Costo giornaliero: $${dailySummary.totalCost}`);
console.log(`Costo sessione: $${sessionSummary.totalCost}`);
```

2. **Aumenta limiti temporaneamente:**
```typescript
// Aumenta limite per task urgenti
const costMonitor = new CostMonitor(200, 100); // $200 daily, $100 session
```

3. **Ottimizza usage:**
```typescript
// Usa modelli meno costosi
llmService.setModel('claude-3-haiku-20240307'); // Più economico

// Riduci token di output
const config = modelManager.getModelConfig();
config.maxTokens = 1000; // Limita risposta
```

4. **Reset sessione:**
```typescript
// Reset costi sessione
costMonitor.resetSession();
```

---

### ❌ Errore: Calcolo costi errato

**Sintomi:**
- Costi che non corrispondono all'usage
- Alert che si attivano prematuramente

**Diagnosi:**
```typescript
// Debug calcolo costi
const cost = modelManager.calculateCost(
  'claude-3-sonnet-20240229',
  10000, // input tokens
  5000   // output tokens
);

console.log('Costo calcolato:', cost);
console.log('Input cost:', (10000/1000) * 0.003);
console.log('Output cost:', (5000/1000) * 0.015);
```

**Soluzioni:**

1. **Verifica configurazione prezzi:**
```typescript
// In ModelLimits.ts
'claude-3-sonnet-20240229': {
  costPer1kInputTokens: 0.003,  // Verifica prezzi aggiornati
  costPer1kOutputTokens: 0.015,
}
```

2. **Ricalibra token counter:**
```typescript
// Test accuratezza conteggio
const text = "Test message";
const estimatedTokens = contextManager.countTokens(text);
const actualTokens = await getActualTokenCount(text); // Da API
console.log(`Stimati: ${estimatedTokens}, Reali: ${actualTokens}`);
```

---

## Errori di Context

### ❌ Errore: Context troppo grande

**Sintomi:**
```bash
Error: Context window exceeded
Error: Request too large
```

**Soluzioni:**

1. **Abilita auto-summarization:**
```typescript
const contextManager = new EnhancedContextManager(modelManager);
const optimized = await contextManager.summarizeIfNeeded(
  messages,
  'claude-3-sonnet-20240229'
);
```

2. **Chunking manuale:**
```typescript
// Dividi conversazione in chunk
const CHUNK_SIZE = 50;
const chunks = [];

for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
  chunks.push(messages.slice(i, i + CHUNK_SIZE));
}

// Processa chunk separatamente
for (const chunk of chunks) {
  const response = await llmService.chat(chunk);
  // Processa risposta
}
```

3. **Rimuovi messaggi vecchi:**
```typescript
// Mantieni solo ultimi N messaggi
const KEEP_MESSAGES = 20;
const recentMessages = [
  messages[0], // Mantieni messaggio di sistema
  ...messages.slice(-KEEP_MESSAGES)
];
```

---

### ❌ Errore: Summarization fallisce

**Sintomi:**
```bash
Error: Failed to summarize conversation
Error: Summarization timeout
```

**Soluzioni:**

1. **Fallback a truncation:**
```typescript
try {
  const summarized = await contextManager.summarizeIfNeeded(messages, model);
  return summarized;
} catch (error) {
  console.warn('Summarization failed, using truncation');
  return messages.slice(-10); // Ultimi 10 messaggi
}
```

2. **Summarization incrementale:**
```typescript
// Riassumi in batch più piccoli
const BATCH_SIZE = 10;
let summarized = messages;

while (summarized.length > 20) {
  const batch = summarized.slice(0, BATCH_SIZE);
  const summary = await llmService.chat([
    { role: 'system', content: 'Riassumi questa conversazione brevemente.' },
    ...batch
  ]);
  
  summarized = [
    { role: 'assistant', content: summary.content },
    ...summarized.slice(BATCH_SIZE)
  ];
}
```

---

## FAQ

### ❓ Come posso cambiare il modello AI predefinito?

**Risposta:**
```typescript
// Nel codice
llmService.setModel('claude-3-haiku-20240307');

// O tramite environment
export CLAUDE_MODEL=claude-3-haiku-20240307
```

---

### ❓ Posso usare modelli locali invece di API esterne?

**Risposta:**
Attualmente il sistema supporta solo API esterne (Claude, Gemini). Per modelli locali:

1. **Implementa provider personalizzato:**
```typescript
class LocalLLMProvider implements LLMProvider {
  async chat(messages: Message[]): Promise<Message> {
    // Implementa chiamata a modello locale (Ollama, etc.)
  }
}
```

2. **Integra con Ollama:**
```bash
# Installa Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Scarica modello
ollama pull llama2

# Usa API locale
curl http://localhost:11434/api/generate
```

---

### ❓ Come posso esportare la cronologia delle conversazioni?

**Risposta:**
```typescript
// Esporta sessione corrente
const session = sessionManager.getCurrentSession();
const exported = JSON.stringify(session, null, 2);
fs.writeFileSync('conversation.json', exported);

// Esporta tutte le sessioni
const allSessions = sessionManager.listSessions();
const exportData = {
  exportDate: new Date(),
  sessions: allSessions
};
fs.writeFileSync('all_conversations.json', JSON.stringify(exportData, null, 2));
```

---

### ❓ Come posso limitare i costi per utente/progetto?

**Risposta:**
```typescript
// Crea monitor separati per utente
const userCostMonitors = new Map();

function getCostMonitor(userId: string) {
  if (!userCostMonitors.has(userId)) {
    userCostMonitors.set(userId, new CostMonitor(50, 25)); // Limiti per utente
  }
  return userCostMonitors.get(userId);
}

// Usa monitor specifico
const userMonitor = getCostMonitor('user123');
await userMonitor.recordUsage(model, inputTokens, outputTokens);
```

---

### ❓ Posso integrare con altri servizi di task management?

**Risposta:**
Sì, il sistema è modulare. Per integrare con altri servizi:

1. **Implementa interfaccia TaskService:**
```typescript
interface TaskService {
  getTasks(): Promise<Task[]>;
  createTask(task: CreateTaskRequest): Promise<Task>;
  updateTask(id: string, updates: TaskUpdate): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;
}

class NotionTaskService implements TaskService {
  // Implementa metodi per Notion API
}
```

2. **Registra provider:**
```typescript
const taskService = new NotionTaskService(notionApiKey);
const aiService = new TodoistAIService(llmService, taskService);
```

---

### ❓ Come posso personalizzare i prompt AI?

**Risposta:**
```typescript
// Modifica templates in src/prompts/templates.ts
export const CUSTOM_PROMPTS = {
  taskAnalysis: `
    Analizza queste attività con focus su:
    1. Priorità basata su urgenza e importanza
    2. Stima tempo necessario
    3. Dipendenze tra task
    4. Suggerimenti per ottimizzazione
    
    Attività: {tasks}
  `,
  
  taskSuggestion: `
    Basandoti su questo contesto: {context}
    Suggerisci 5 attività specifiche e actionable.
    Formato: - [Categoria] Descrizione attività
  `
};

// Usa prompt personalizzato
const analysis = await llmService.chat([
  { role: 'system', content: CUSTOM_PROMPTS.taskAnalysis.replace('{tasks}', tasksJson) }
]);
```

---

## Debug e Logging

### Abilitare Debug Mode

```bash
# Environment variable
export DEBUG=true
export LOG_LEVEL=debug

# O nel codice
process.env.DEBUG = 'true';
```

### Logging Dettagliato

```typescript
// Setup logger personalizzato
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Usa nel codice
logger.debug('Processing message', { messageLength: message.length });
logger.info('API call completed', { model, responseTime, cost });
logger.error('API call failed', { error: error.message, model });
```

### Monitoring in Tempo Reale

```typescript
// Setup monitoring dashboard
class DebugDashboard {
  constructor(services: any) {
    this.services = services;
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      console.clear();
      console.log('🔍 DEBUG DASHBOARD\n');
      
      // Stato servizi
      console.log('📊 SERVIZI:');
      console.log(`  LLM: ${this.services.llmService.currentModel}`);
      console.log(`  Costo: $${this.services.costMonitor.getDailySummary().totalCost}`);
      
      // Performance
      const stats = this.services.metadataService.getModelStats(
        this.services.llmService.currentModel
      );
      console.log(`  Chiamate: ${stats.totalCalls}`);
      console.log(`  Success Rate: ${stats.successRate}%`);
      console.log(`  Tempo Medio: ${stats.avgResponseTime}ms`);
      
      // Memory usage
      const memUsage = process.memoryUsage();
      console.log(`\n💾 MEMORIA:`);
      console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      console.log(`  Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      
    }, 2000);
  }
}

// Avvia dashboard
const dashboard = new DebugDashboard(services);
```

### Profiling Performance

```typescript
// Profiling automatico
class PerformanceProfiler {
  private timers = new Map<string, number>();

  start(operation: string) {
    this.timers.set(operation, Date.now());
  }

  end(operation: string) {
    const startTime = this.timers.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`⏱️ ${operation}: ${duration}ms`);
      this.timers.delete(operation);
      return duration;
    }
  }
}

// Uso
const profiler = new PerformanceProfiler();

profiler.start('llm-chat');
const response = await llmService.chat(messages);
profiler.end('llm-chat');
```

---

## Supporto e Risorse

### 📞 Come Ottenere Aiuto

1. **Controlla questa guida** per problemi comuni
2. **Consulta i log** con debug mode abilitato
3. **Verifica configurazione** con gli esempi forniti
4. **Apri issue** nel repository con:
   - Descrizione dettagliata del problema
   - Log di errore completi
   - Configurazione (senza API keys)
   - Passi per riprodurre

### 🔗 Risorse Utili

- [Documentazione API](./API_REFERENCE.md)
- [Guida ai Servizi](./SERVICES_GUIDE.md)
- [Test di Integrazione](../src/tests/integration.test.ts)
- [Configurazione Modelli](../src/config/ModelLimits.ts)

### 📧 Contatti

Per supporto tecnico o domande specifiche, apri un issue nel repository GitHub con il tag appropriato:

- `bug`: Per errori e malfunzionamenti
- `question`: Per domande d'uso
- `enhancement`: Per richieste di nuove funzionalità
- `documentation`: Per miglioramenti alla documentazione

---

**Ultimo aggiornamento:** $(date)  
**Versione guida:** 1.0.0