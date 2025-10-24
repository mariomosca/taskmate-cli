# 🛠️ Guida ai Servizi - Todoist AI CLI

Questa guida fornisce esempi pratici e documentazione dettagliata per tutti i servizi implementati nel Todoist AI CLI.

## 📋 Indice

1. [LLMService](#llmservice) - Gestione AI e modelli linguistici
2. [ModelManager](#modelmanager) - Configurazione e gestione modelli
3. [CostMonitor](#costmonitor) - Monitoraggio costi e usage
4. [EnhancedContextManager](#enhancedcontextmanager) - Gestione context avanzata
5. [APIMetadataService](#apimetadataservice) - Calibrazione e metadata API
6. [SessionManager](#sessionmanager) - Gestione sessioni
7. [TodoistAIService](#todoistaiservice) - Integrazione AI con Todoist
8. [DatabaseService](#databaseservice) - Persistenza dati

---

## LLMService

Il **LLMService** è il cuore dell'integrazione AI, gestendo le interazioni con Claude e Gemini.

### Caratteristiche Principali

- ✅ Supporto multi-provider (Claude, Gemini)
- ✅ Streaming responses in tempo reale
- ✅ Context management automatico
- ✅ Calibrazione performance
- ✅ Gestione errori robusta

### Esempi d'Uso

#### Inizializzazione Base

```typescript
import { LLMService } from './services/LLMService';
import { ModelManager } from './services/ModelManager';
import { CostMonitor } from './services/CostMonitor';

// Setup servizi dipendenti
const modelManager = new ModelManager();
const costMonitor = new CostMonitor(100, 50); // $100 daily, $50 session

// Inizializza LLMService
const llmService = new LLMService(modelManager, costMonitor);
```

#### Chat Semplice

```typescript
// Chat singola senza streaming
const response = await llmService.chat([
  { role: 'user', content: 'Ciao! Come stai?' }
]);

console.log(response.content);
// Output: "Ciao! Sto bene, grazie. Come posso aiutarti oggi?"
```

#### Chat con Streaming

```typescript
// Chat con streaming per UI reattiva
const messages = [
  { role: 'user', content: 'Spiegami la teoria della relatività' }
];

const stream = llmService.chatStream(messages);

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    process.stdout.write(chunk.delta.text);
  }
}
```

#### Cambio Modello Dinamico

```typescript
// Inizia con Claude
llmService.setModel('claude-3-sonnet-20240229');
const claudeResponse = await llmService.chat([
  { role: 'user', content: 'Analizza questo codice TypeScript...' }
]);

// Passa a Gemini per task diverso
llmService.setModel('gemini-pro');
const geminiResponse = await llmService.chat([
  { role: 'user', content: 'Genera idee creative per...' }
]);
```

#### Context Management Avanzato

```typescript
// Chat con context esteso
const longConversation = [
  { role: 'user', content: 'Parliamo di programmazione...' },
  { role: 'assistant', content: 'Certo! Di cosa vorresti parlare?' },
  // ... molti altri messaggi
];

// LLMService gestisce automaticamente il context
// Se supera i limiti, riassume automaticamente
const response = await llmService.chat(longConversation);
```

#### Calibrazione Performance

```typescript
// Esporta dati di calibrazione
const calibrationData = await llmService.exportCalibrationReport();
const parsedData = JSON.parse(calibrationData);

console.log('Modelli testati:', parsedData.length);
console.log('Performance media:', parsedData.map(d => d.avgResponseTime));
```

---

## ModelManager

Il **ModelManager** gestisce configurazioni, limiti e costi dei modelli AI.

### Caratteristiche Principali

- ✅ Configurazione centralizzata modelli
- ✅ Calcolo costi automatico
- ✅ Gestione limiti token
- ✅ Fallback su configurazioni default

### Esempi d'Uso

#### Configurazione Modelli

```typescript
import { ModelManager } from './services/ModelManager';

const modelManager = new ModelManager();

// Imposta modello corrente
modelManager.setCurrentModel('claude-3-sonnet-20240229');

// Ottieni configurazione
const config = modelManager.getModelConfig('claude-3-sonnet-20240229');
console.log(config);
// Output:
// {
//   name: 'Claude 3 Sonnet',
//   maxTokens: 200000,
//   costPer1kInputTokens: 0.003,
//   costPer1kOutputTokens: 0.015,
//   contextWindow: 200000
// }
```

#### Calcolo Costi

```typescript
// Calcola costo per usage specifico
const cost = modelManager.calculateCost(
  'claude-3-sonnet-20240229',
  10000,  // input tokens
  5000    // output tokens
);

console.log(`Costo totale: $${cost.toFixed(4)}`);
// Output: "Costo totale: $0.1050"

// Breakdown del costo
const inputCost = (10000 / 1000) * 0.003;  // $0.030
const outputCost = (5000 / 1000) * 0.015; // $0.075
// Totale: $0.105
```

#### Gestione Modelli Multipli

```typescript
// Lista tutti i modelli disponibili
const availableModels = Object.keys(MODEL_CONFIGS);
console.log('Modelli disponibili:', availableModels);

// Confronta costi tra modelli
const models = ['claude-3-sonnet-20240229', 'gemini-pro'];
const usage = { input: 10000, output: 5000 };

models.forEach(model => {
  const cost = modelManager.calculateCost(model, usage.input, usage.output);
  const config = modelManager.getModelConfig(model);
  console.log(`${config.name}: $${cost.toFixed(4)}`);
});
```

#### Validazione Limiti

```typescript
// Verifica se l'usage è entro i limiti
const config = modelManager.getModelConfig('claude-3-sonnet-20240229');
const requestTokens = 150000;

if (requestTokens > config.maxTokens) {
  console.warn(`Request troppo grande: ${requestTokens} > ${config.maxTokens}`);
  // Implementa logica di chunking o riassunto
}
```

---

## CostMonitor

Il **CostMonitor** traccia usage, costi e genera alert per limiti di budget.

### Caratteristiche Principali

- ✅ Tracking costi in tempo reale
- ✅ Limiti giornalieri e per sessione
- ✅ Alert automatici (warning/critical)
- ✅ Report dettagliati usage

### Esempi d'Uso

#### Setup e Configurazione

```typescript
import { CostMonitor } from './services/CostMonitor';
import { ModelManager } from './services/ModelManager';

const modelManager = new ModelManager();
const costMonitor = new CostMonitor(
  100,  // $100 limite giornaliero
  50,   // $50 limite per sessione
  modelManager
);
```

#### Tracking Usage

```typescript
// Registra usage per una chiamata API
await costMonitor.recordUsage(
  'claude-3-sonnet-20240229',
  10000,  // input tokens
  5000,   // output tokens
  1200    // response time in ms
);

// Ottieni summary corrente
const dailySummary = costMonitor.getDailySummary();
console.log('Costo giornaliero:', dailySummary);
// Output:
// {
//   totalCost: 0.105,
//   totalInputTokens: 10000,
//   totalOutputTokens: 5000,
//   requestCount: 1,
//   averageResponseTime: 1200
// }

const sessionSummary = costMonitor.getSessionSummary();
console.log('Costo sessione:', sessionSummary);
```

#### Sistema di Alert

```typescript
// Controlla alert dopo ogni usage
const alerts = costMonitor.checkAlerts();

alerts.forEach(alert => {
  console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
  
  if (alert.severity === 'critical') {
    // Blocca ulteriori richieste
    console.log('❌ Limite superato! Blocco richieste.');
  } else if (alert.severity === 'warning') {
    // Avvisa utente
    console.log('⚠️ Avvicinamento al limite.');
  }
});
```

#### Monitoraggio Continuo

```typescript
// Setup monitoraggio automatico
setInterval(() => {
  const alerts = costMonitor.checkAlerts();
  const dailySummary = costMonitor.getDailySummary();
  
  console.log(`💰 Costo giornaliero: $${dailySummary.totalCost.toFixed(4)}`);
  console.log(`📊 Richieste: ${dailySummary.requestCount}`);
  
  if (alerts.length > 0) {
    alerts.forEach(alert => {
      console.log(`🚨 ${alert.type}: ${alert.message}`);
    });
  }
}, 60000); // Ogni minuto
```

#### Report Dettagliati

```typescript
// Genera report completo
const report = {
  daily: costMonitor.getDailySummary(),
  session: costMonitor.getSessionSummary(),
  alerts: costMonitor.checkAlerts(),
  limits: {
    daily: costMonitor.dailyLimit,
    session: costMonitor.sessionLimit
  }
};

console.log('📋 Report Completo:', JSON.stringify(report, null, 2));
```

---

## EnhancedContextManager

L'**EnhancedContextManager** gestisce il context delle conversazioni con ottimizzazioni avanzate.

### Caratteristiche Principali

- ✅ Token counting preciso
- ✅ Summarization automatica
- ✅ Context window management
- ✅ Ottimizzazioni performance

### Esempi d'Uso

#### Setup Base

```typescript
import { EnhancedContextManager } from './services/EnhancedContextManager';
import { ModelManager } from './services/ModelManager';

const modelManager = new ModelManager();
const contextManager = new EnhancedContextManager(modelManager);
```

#### Gestione Messaggi

```typescript
// Aggiungi messaggi alla conversazione
const messages = [
  { role: 'user', content: 'Ciao! Parliamo di TypeScript.' },
  { role: 'assistant', content: 'Certo! TypeScript è un superset di JavaScript...' },
  { role: 'user', content: 'Spiegami i generics.' }
];

// Ottieni messaggi ottimizzati per il modello corrente
const optimizedMessages = await contextManager.getOptimizedMessages(
  messages,
  'claude-3-sonnet-20240229'
);

console.log(`Messaggi originali: ${messages.length}`);
console.log(`Messaggi ottimizzati: ${optimizedMessages.length}`);
```

#### Token Management

```typescript
// Conta token per messaggio specifico
const message = { role: 'user', content: 'Questa è una domanda complessa...' };
const tokenCount = contextManager.countTokens(message.content);

console.log(`Token nel messaggio: ${tokenCount}`);

// Conta token per intera conversazione
const totalTokens = contextManager.countConversationTokens(messages);
console.log(`Token totali conversazione: ${totalTokens}`);
```

#### Summarization Automatica

```typescript
// Forza summarization quando necessario
const longConversation = [
  // ... molti messaggi che superano context window
];

const summarized = await contextManager.summarizeIfNeeded(
  longConversation,
  'claude-3-sonnet-20240229'
);

if (summarized.length < longConversation.length) {
  console.log('✂️ Conversazione riassunta automaticamente');
  console.log(`Da ${longConversation.length} a ${summarized.length} messaggi`);
}
```

#### Context Window Optimization

```typescript
// Verifica se conversazione supera limiti
const isWithinLimits = contextManager.isWithinContextWindow(
  messages,
  'claude-3-sonnet-20240229'
);

if (!isWithinLimits) {
  console.log('⚠️ Conversazione supera context window');
  
  // Ottimizza automaticamente
  const optimized = await contextManager.getOptimizedMessages(
    messages,
    'claude-3-sonnet-20240229'
  );
  
  console.log('✅ Conversazione ottimizzata');
}
```

---

## APIMetadataService

L'**APIMetadataService** gestisce calibrazione e metadata delle performance API.

### Caratteristiche Principali

- ✅ Calibrazione automatica modelli
- ✅ Tracking performance in tempo reale
- ✅ Export dati per analisi
- ✅ Ottimizzazioni basate su dati storici

### Esempi d'Uso

#### Calibrazione Modelli

```typescript
import { APIMetadataService } from './services/APIMetadataService';

const metadataService = new APIMetadataService();

// Calibra un modello specifico
await metadataService.calibrateModel(
  'claude-3-sonnet-20240229',
  'Questo è un test di calibrazione per misurare le performance.'
);

console.log('✅ Calibrazione completata');
```

#### Tracking Performance

```typescript
// Registra performance di una chiamata
metadataService.recordAPICall(
  'claude-3-sonnet-20240229',
  1200,    // response time in ms
  10000,   // input tokens
  5000,    // output tokens
  true     // success
);

// Ottieni statistiche
const stats = metadataService.getModelStats('claude-3-sonnet-20240229');
console.log('📊 Statistiche modello:', stats);
// Output:
// {
//   totalCalls: 1,
//   successRate: 100,
//   avgResponseTime: 1200,
//   avgInputTokens: 10000,
//   avgOutputTokens: 5000
// }
```

#### Export Dati

```typescript
// Esporta report di calibrazione
const calibrationReport = await metadataService.exportCalibrationReport('json');
const parsedReport = JSON.parse(calibrationReport);

console.log('📋 Report Calibrazione:');
parsedReport.forEach(model => {
  console.log(`${model.modelName}: ${model.avgResponseTime}ms avg`);
});

// Esporta dati costi
const costReport = await metadataService.exportCostReport('json');
console.log('💰 Report Costi:', JSON.parse(costReport));
```

#### Analisi Performance

```typescript
// Confronta performance tra modelli
const models = ['claude-3-sonnet-20240229', 'gemini-pro'];

models.forEach(model => {
  const stats = metadataService.getModelStats(model);
  console.log(`${model}:`);
  console.log(`  - Tempo medio: ${stats.avgResponseTime}ms`);
  console.log(`  - Success rate: ${stats.successRate}%`);
  console.log(`  - Token medi: ${stats.avgInputTokens}/${stats.avgOutputTokens}`);
});
```

---

## Integrazione Completa

### Esempio: Setup Completo Sistema

```typescript
// Setup completo di tutti i servizi
import { 
  LLMService, 
  ModelManager, 
  CostMonitor, 
  EnhancedContextManager,
  APIMetadataService 
} from './services';

class TodoistAISystem {
  private modelManager: ModelManager;
  private costMonitor: CostMonitor;
  private contextManager: EnhancedContextManager;
  private metadataService: APIMetadataService;
  private llmService: LLMService;

  constructor() {
    // Inizializza servizi base
    this.modelManager = new ModelManager();
    this.costMonitor = new CostMonitor(100, 50, this.modelManager);
    this.contextManager = new EnhancedContextManager(this.modelManager);
    this.metadataService = new APIMetadataService();
    
    // Inizializza LLM service con tutte le dipendenze
    this.llmService = new LLMService(
      this.modelManager,
      this.costMonitor,
      this.contextManager,
      this.metadataService
    );
  }

  async processUserQuery(query: string, conversationHistory: any[]) {
    try {
      // 1. Controlla limiti di costo
      const alerts = this.costMonitor.checkAlerts();
      if (alerts.some(a => a.severity === 'critical')) {
        throw new Error('Limite di costo superato');
      }

      // 2. Ottimizza context
      const optimizedHistory = await this.contextManager.getOptimizedMessages(
        conversationHistory,
        this.modelManager.currentModel
      );

      // 3. Aggiungi query utente
      const messages = [...optimizedHistory, { role: 'user', content: query }];

      // 4. Esegui chat con streaming
      const response = await this.llmService.chat(messages);

      // 5. Genera report se necessario
      if (Math.random() < 0.1) { // 10% delle volte
        const report = await this.metadataService.exportCalibrationReport('json');
        console.log('📊 Report aggiornato');
      }

      return response;
    } catch (error) {
      console.error('❌ Errore nel processamento:', error);
      throw error;
    }
  }
}

// Utilizzo
const aiSystem = new TodoistAISystem();
const response = await aiSystem.processUserQuery(
  'Aiutami a organizzare le mie attività',
  conversationHistory
);
```

### Esempio: Monitoraggio in Tempo Reale

```typescript
// Sistema di monitoraggio completo
class AIMonitoringDashboard {
  constructor(private services: {
    costMonitor: CostMonitor;
    metadataService: APIMetadataService;
    modelManager: ModelManager;
  }) {}

  startMonitoring() {
    setInterval(() => {
      this.displayDashboard();
    }, 5000); // Aggiorna ogni 5 secondi
  }

  private displayDashboard() {
    console.clear();
    console.log('🤖 TODOIST AI - DASHBOARD MONITORAGGIO\n');

    // Costi
    const daily = this.services.costMonitor.getDailySummary();
    const session = this.services.costMonitor.getSessionSummary();
    
    console.log('💰 COSTI:');
    console.log(`  Giornaliero: $${daily.totalCost.toFixed(4)} / $${this.services.costMonitor.dailyLimit}`);
    console.log(`  Sessione: $${session.totalCost.toFixed(4)} / $${this.services.costMonitor.sessionLimit}`);

    // Performance
    const currentModel = this.services.modelManager.currentModel;
    const stats = this.services.metadataService.getModelStats(currentModel);
    
    console.log('\n📊 PERFORMANCE:');
    console.log(`  Modello: ${currentModel}`);
    console.log(`  Chiamate: ${stats.totalCalls}`);
    console.log(`  Success Rate: ${stats.successRate}%`);
    console.log(`  Tempo Medio: ${stats.avgResponseTime}ms`);

    // Alert
    const alerts = this.services.costMonitor.checkAlerts();
    if (alerts.length > 0) {
      console.log('\n🚨 ALERT:');
      alerts.forEach(alert => {
        console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }
}
```

---

## 🔧 Configurazione Avanzata

### Environment Variables

```env
# Limiti di costo
DAILY_COST_LIMIT=100
SESSION_COST_LIMIT=50

# Configurazione context
MAX_CONTEXT_TOKENS=150000
AUTO_SUMMARIZE=true

# Calibrazione
AUTO_CALIBRATE=true
CALIBRATION_INTERVAL=3600

# Monitoring
ENABLE_MONITORING=true
MONITORING_INTERVAL=5000
```

### Configurazione Personalizzata

```typescript
// Configurazione custom per casi specifici
const customConfig = {
  models: {
    'claude-3-sonnet-20240229': {
      maxTokens: 180000,  // Override default
      costPer1kInputTokens: 0.003,
      costPer1kOutputTokens: 0.015,
      contextWindow: 180000
    }
  },
  limits: {
    daily: 200,    // $200 per sviluppo
    session: 100   // $100 per sessione
  },
  features: {
    autoSummarize: true,
    autoCalibrate: true,
    realTimeMonitoring: true
  }
};
```

---

## 🚀 Best Practices

### 1. Gestione Errori

```typescript
try {
  const response = await llmService.chat(messages);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Implementa backoff exponential
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Riprova
  } else if (error.message.includes('cost limit')) {
    // Notifica utente e blocca richieste
    console.log('❌ Limite di costo raggiunto');
  } else {
    // Log errore e fallback
    console.error('Errore imprevisto:', error);
  }
}
```

### 2. Ottimizzazione Performance

```typescript
// Usa streaming per UI reattiva
const stream = llmService.chatStream(messages);
for await (const chunk of stream) {
  // Aggiorna UI in tempo reale
  updateUI(chunk);
}

// Batch operations per efficienza
const operations = [
  () => costMonitor.recordUsage(...),
  () => metadataService.recordAPICall(...),
  () => contextManager.updateContext(...)
];

await Promise.all(operations.map(op => op()));
```

### 3. Monitoraggio Proattivo

```typescript
// Setup alert personalizzati
costMonitor.onAlert((alert) => {
  if (alert.severity === 'critical') {
    // Invia notifica push
    sendNotification(alert.message);
  }
});

// Metriche custom
setInterval(() => {
  const metrics = {
    cost: costMonitor.getDailySummary().totalCost,
    requests: metadataService.getModelStats(currentModel).totalCalls,
    performance: metadataService.getModelStats(currentModel).avgResponseTime
  };
  
  // Invia a sistema di monitoring
  sendMetrics(metrics);
}, 60000);
```

---

Questa guida fornisce una base solida per utilizzare tutti i servizi del Todoist AI CLI. Per esempi più specifici o casi d'uso avanzati, consulta i test di integrazione in `src/tests/integration.test.ts`.