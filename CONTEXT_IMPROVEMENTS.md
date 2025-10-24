# 🚀 Piano di Miglioramento - Context Window Management

## 📋 Panoramica

Questo documento descrive il piano dettagliato per implementare 5 miglioramenti significativi al sistema di gestione della finestra di contesto nell'applicazione Todoist AI CLI.

## 🎯 Obiettivi

1. **Token Counting Preciso** - Sostituire la stima empirica con conteggi accurati
2. **Limiti Dinamici** - Utilizzare i limiti reali dei modelli invece di valori fissi
3. **Integrazione API Metadata** - Sfruttare i dati reali dalle API per calibrare le stime
4. **Context Manager Migliorato** - Implementare strategie diverse per diversi modelli
5. **Cost Monitoring** - Aggiungere monitoraggio dei costi basato sui token effettivi

---

## 📝 Task 1: Token Counting Preciso

### 🎯 Obiettivo
Sostituire il sistema di stima attuale (3 caratteri per token) con librerie specifiche per ogni modello.

### 🔧 Implementazione

#### 1.1 Installazione Dipendenze
```bash
npm install tiktoken @anthropic-ai/tokenizer
```

#### 1.2 Creazione TokenCounter Service
**File:** `src/services/TokenCounter.ts`

```typescript
import { encoding_for_model } from 'tiktoken';

export interface TokenCountResult {
  tokens: number;
  model: string;
  method: 'precise' | 'estimated';
}

export class TokenCounter {
  private encoders: Map<string, any> = new Map();

  async countTokens(text: string, model: string): Promise<TokenCountResult> {
    try {
      switch (model) {
        case 'claude-3-sonnet':
        case 'claude-3-opus':
          return this.countClaudeTokens(text, model);
        
        case 'gemini-pro':
        case 'gemini-2.5-pro':
          return this.countGeminiTokens(text, model);
        
        default:
          return this.estimateTokens(text, model);
      }
    } catch (error) {
      console.warn(`Fallback to estimation for model ${model}:`, error);
      return this.estimateTokens(text, model);
    }
  }

  private countClaudeTokens(text: string, model: string): TokenCountResult {
    // Implementazione specifica per Claude
    // Usa approssimazione basata su GPT-4 (simile tokenization)
    const encoder = encoding_for_model('gpt-4');
    const tokens = encoder.encode(text).length;
    encoder.free();
    
    return {
      tokens,
      model,
      method: 'precise'
    };
  }

  private countGeminiTokens(text: string, model: string): TokenCountResult {
    // Implementazione specifica per Gemini
    // Usa stima migliorata basata su caratteristiche del modello
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const tokens = Math.ceil(normalizedText.length / 2.5); // Gemini è più efficiente
    
    return {
      tokens,
      model,
      method: 'estimated'
    };
  }

  private estimateTokens(text: string, model: string): TokenCountResult {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const tokens = Math.ceil(normalizedText.length / 3);
    
    return {
      tokens,
      model,
      method: 'estimated'
    };
  }
}
```

#### 1.3 Integrazione in ContextManager
Modificare `src/services/ContextManager.ts` per utilizzare il nuovo TokenCounter.

### ⏱️ Stima Tempo: 4-6 ore

---

## 📝 Task 2: Limiti Dinamici per Modello

### 🎯 Obiettivo
Implementare limiti di contesto dinamici basati sui modelli reali invece di valori fissi.

### 🔧 Implementazione

#### 2.1 Configurazione Modelli
**File:** `src/config/ModelLimits.ts`

```typescript
export interface ModelConfig {
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  provider: 'claude' | 'gemini';
  features: string[];
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'claude-3-sonnet-20240229': {
    name: 'Claude 3 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    provider: 'claude',
    features: ['function_calling', 'vision']
  },
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    provider: 'claude',
    features: ['function_calling', 'vision']
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    contextWindow: 32000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    provider: 'gemini',
    features: ['function_calling']
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
    maxOutputTokens: 65535,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    provider: 'gemini',
    features: ['function_calling', 'large_context']
  }
};
```

#### 2.2 Model Manager Service
**File:** `src/services/ModelManager.ts`

```typescript
import { MODEL_CONFIGS, ModelConfig } from '../config/ModelLimits.js';

export class ModelManager {
  private currentModel: string;

  constructor(defaultModel?: string) {
    this.currentModel = defaultModel || process.env.DEFAULT_MODEL || 'claude-3-sonnet-20240229';
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setCurrentModel(model: string): void {
    if (!MODEL_CONFIGS[model]) {
      throw new Error(`Model ${model} not supported`);
    }
    this.currentModel = model;
  }

  getModelConfig(model?: string): ModelConfig {
    const targetModel = model || this.currentModel;
    const config = MODEL_CONFIGS[targetModel];
    
    if (!config) {
      throw new Error(`Configuration not found for model: ${targetModel}`);
    }
    
    return config;
  }

  getContextWindow(model?: string): number {
    return this.getModelConfig(model).contextWindow;
  }

  getMaxOutputTokens(model?: string): number {
    return this.getModelConfig(model).maxOutputTokens;
  }

  calculateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const config = this.getModelConfig(model);
    const inputCost = (inputTokens / 1000) * config.costPer1kInputTokens;
    const outputCost = (outputTokens / 1000) * config.costPer1kOutputTokens;
    return inputCost + outputCost;
  }

  getAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS);
  }
}
```

### ⏱️ Stima Tempo: 3-4 ore

---

## 📝 Task 3: Integrazione API Metadata

### 🎯 Obiettivo
Utilizzare i metadati reali dalle API per calibrare le stime future e migliorare la precisione.

### 🔧 Implementazione

#### 3.1 Usage Tracker Service
**File:** `src/services/UsageTracker.ts`

```typescript
export interface UsageRecord {
  timestamp: Date;
  model: string;
  estimatedInputTokens: number;
  actualInputTokens: number;
  estimatedOutputTokens: number;
  actualOutputTokens: number;
  accuracy: number;
}

export class UsageTracker {
  private usageHistory: UsageRecord[] = [];
  private maxHistorySize = 1000;

  recordUsage(record: Omit<UsageRecord, 'timestamp' | 'accuracy'>): void {
    const accuracy = this.calculateAccuracy(
      record.estimatedInputTokens,
      record.actualInputTokens
    );

    const usageRecord: UsageRecord = {
      ...record,
      timestamp: new Date(),
      accuracy
    };

    this.usageHistory.push(usageRecord);

    // Mantieni solo gli ultimi N record
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory = this.usageHistory.slice(-this.maxHistorySize);
    }
  }

  getAverageAccuracy(model: string, days: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentRecords = this.usageHistory.filter(
      record => record.model === model && record.timestamp >= cutoffDate
    );

    if (recentRecords.length === 0) return 1.0;

    const totalAccuracy = recentRecords.reduce(
      (sum, record) => sum + record.accuracy, 0
    );

    return totalAccuracy / recentRecords.length;
  }

  getCorrectionFactor(model: string): number {
    const accuracy = this.getAverageAccuracy(model);
    // Se sottostimiamo (accuracy > 1), aumentiamo la stima
    // Se sovrastimiamo (accuracy < 1), diminuiamo la stima
    return accuracy;
  }

  private calculateAccuracy(estimated: number, actual: number): number {
    if (estimated === 0) return actual === 0 ? 1.0 : 0.0;
    return actual / estimated;
  }

  getUsageStats(model: string): {
    totalRequests: number;
    averageAccuracy: number;
    totalTokensUsed: number;
    estimatedCost: number;
  } {
    const modelRecords = this.usageHistory.filter(r => r.model === model);
    
    return {
      totalRequests: modelRecords.length,
      averageAccuracy: this.getAverageAccuracy(model),
      totalTokensUsed: modelRecords.reduce(
        (sum, r) => sum + r.actualInputTokens + r.actualOutputTokens, 0
      ),
      estimatedCost: modelRecords.reduce((sum, r) => {
        // Calcola costo usando ModelManager
        return sum; // Implementare calcolo costo
      }, 0)
    };
  }
}
```

#### 3.2 Integrazione in LLMService
Modificare `src/services/LLMService.ts` per registrare l'utilizzo effettivo.

### ⏱️ Stima Tempo: 5-6 ore

---

## 📝 Task 4: Context Manager Migliorato

### 🎯 Obiettivo
Creare un ContextManager avanzato con strategie diverse per diversi modelli.

### 🔧 Implementazione

#### 4.1 Enhanced Context Manager
**File:** `src/services/EnhancedContextManager.ts`

```typescript
import { Message } from '../types/index.js';
import { TokenCounter } from './TokenCounter.js';
import { ModelManager } from './ModelManager.js';
import { UsageTracker } from './UsageTracker.js';

export interface ContextStrategy {
  name: string;
  shouldSummarize: (tokens: number, limit: number) => boolean;
  getOptimalChunkSize: (limit: number) => number;
  prioritizeMessages: (messages: Message[]) => Message[];
}

export class EnhancedContextManager {
  private tokenCounter: TokenCounter;
  private modelManager: ModelManager;
  private usageTracker: UsageTracker;
  private strategies: Map<string, ContextStrategy> = new Map();

  constructor(
    tokenCounter: TokenCounter,
    modelManager: ModelManager,
    usageTracker: UsageTracker
  ) {
    this.tokenCounter = tokenCounter;
    this.modelManager = modelManager;
    this.usageTracker = usageTracker;
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Strategia per modelli con context window grande (Gemini 2.5 Pro)
    this.strategies.set('large_context', {
      name: 'Large Context Strategy',
      shouldSummarize: (tokens, limit) => tokens > limit * 0.95,
      getOptimalChunkSize: (limit) => Math.floor(limit * 0.8),
      prioritizeMessages: (messages) => {
        // Mantieni più messaggi recenti
        return messages.slice(-50);
      }
    });

    // Strategia per modelli standard (Claude, Gemini Pro)
    this.strategies.set('standard', {
      name: 'Standard Strategy',
      shouldSummarize: (tokens, limit) => tokens > limit * 0.9,
      getOptimalChunkSize: (limit) => Math.floor(limit * 0.7),
      prioritizeMessages: (messages) => {
        // Mantieni messaggi più importanti
        return this.prioritizeByImportance(messages);
      }
    });

    // Strategia per modelli con context limitato
    this.strategies.set('limited_context', {
      name: 'Limited Context Strategy',
      shouldSummarize: (tokens, limit) => tokens > limit * 0.8,
      getOptimalChunkSize: (limit) => Math.floor(limit * 0.6),
      prioritizeMessages: (messages) => {
        // Mantieni solo i messaggi più recenti
        return messages.slice(-10);
      }
    });
  }

  async optimizeContext(messages: Message[], model?: string): Promise<{
    optimizedMessages: Message[];
    strategy: string;
    tokenInfo: {
      original: number;
      optimized: number;
      saved: number;
      percentage: number;
    };
    actions: string[];
  }> {
    const targetModel = model || this.modelManager.getCurrentModel();
    const config = this.modelManager.getModelConfig(targetModel);
    const strategy = this.getStrategyForModel(targetModel);
    
    // Calcola token attuali
    const originalTokens = await this.calculateTotalTokens(messages, targetModel);
    
    let optimizedMessages = [...messages];
    const actions: string[] = [];

    // Applica strategia se necessario
    if (strategy.shouldSummarize(originalTokens, config.contextWindow)) {
      optimizedMessages = await this.applySummarizationStrategy(
        messages, strategy, config.contextWindow, targetModel
      );
      actions.push('summarization');
    }

    // Calcola token finali
    const optimizedTokens = await this.calculateTotalTokens(optimizedMessages, targetModel);
    
    return {
      optimizedMessages,
      strategy: strategy.name,
      tokenInfo: {
        original: originalTokens,
        optimized: optimizedTokens,
        saved: originalTokens - optimizedTokens,
        percentage: Math.round((optimizedTokens / originalTokens) * 100)
      },
      actions
    };
  }

  private getStrategyForModel(model: string): ContextStrategy {
    const config = this.modelManager.getModelConfig(model);
    
    if (config.contextWindow >= 500000) {
      return this.strategies.get('large_context')!;
    } else if (config.contextWindow >= 100000) {
      return this.strategies.get('standard')!;
    } else {
      return this.strategies.get('limited_context')!;
    }
  }

  private async calculateTotalTokens(messages: Message[], model: string): Promise<number> {
    let total = 0;
    for (const message of messages) {
      const result = await this.tokenCounter.countTokens(message.content, model);
      total += result.tokens;
    }
    return total;
  }

  private prioritizeByImportance(messages: Message[]): Message[] {
    // Implementa logica di prioritizzazione
    // Es: system messages > recent user messages > older messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role === 'user').slice(-10);
    const assistantMessages = messages.filter(m => m.role === 'assistant').slice(-10);
    
    return [...systemMessages, ...userMessages, ...assistantMessages];
  }

  private async applySummarizationStrategy(
    messages: Message[],
    strategy: ContextStrategy,
    contextLimit: number,
    model: string
  ): Promise<Message[]> {
    // Implementa logica di riassunto basata sulla strategia
    const prioritized = strategy.prioritizeMessages(messages);
    const chunkSize = strategy.getOptimalChunkSize(contextLimit);
    
    // Mantieni i messaggi che rientrano nel chunk size
    let currentTokens = 0;
    const result: Message[] = [];
    
    for (const message of prioritized.reverse()) {
      const messageTokens = await this.tokenCounter.countTokens(message.content, model);
      if (currentTokens + messageTokens.tokens <= chunkSize) {
        result.unshift(message);
        currentTokens += messageTokens.tokens;
      } else {
        break;
      }
    }
    
    return result;
  }
}
```

### ⏱️ Stima Tempo: 6-8 ore

---

## 📝 Task 5: Cost Monitoring

### 🎯 Obiettivo
Implementare un sistema di monitoraggio dei costi basato sui token effettivi utilizzati.

### 🔧 Implementazione

#### 5.1 Cost Monitor Service
**File:** `src/services/CostMonitor.ts`

```typescript
export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
  timestamp: Date;
}

export interface CostSummary {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
  breakdown: CostBreakdown[];
}

export class CostMonitor {
  private costHistory: CostBreakdown[] = [];
  private modelManager: ModelManager;

  constructor(modelManager: ModelManager) {
    this.modelManager = modelManager;
    this.loadCostHistory();
  }

  recordCost(
    inputTokens: number,
    outputTokens: number,
    model: string
  ): CostBreakdown {
    const cost = this.modelManager.calculateCost(inputTokens, outputTokens, model);
    const config = this.modelManager.getModelConfig(model);
    
    const breakdown: CostBreakdown = {
      inputTokens,
      outputTokens,
      inputCost: (inputTokens / 1000) * config.costPer1kInputTokens,
      outputCost: (outputTokens / 1000) * config.costPer1kOutputTokens,
      totalCost: cost,
      model,
      timestamp: new Date()
    };

    this.costHistory.push(breakdown);
    this.saveCostHistory();
    
    return breakdown;
  }

  getCostSummary(days?: number): CostSummary {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const dailyCosts = this.getCostsInPeriod(now, 1 * dayMs);
    const weeklyCosts = this.getCostsInPeriod(now, 7 * dayMs);
    const monthlyCosts = this.getCostsInPeriod(now, 30 * dayMs);
    
    const relevantCosts = days 
      ? this.getCostsInPeriod(now, days * dayMs)
      : this.costHistory;

    return {
      daily: this.sumCosts(dailyCosts),
      weekly: this.sumCosts(weeklyCosts),
      monthly: this.sumCosts(monthlyCosts),
      total: this.sumCosts(this.costHistory),
      breakdown: relevantCosts
    };
  }

  getCostsByModel(): Record<string, number> {
    const costsByModel: Record<string, number> = {};
    
    for (const cost of this.costHistory) {
      if (!costsByModel[cost.model]) {
        costsByModel[cost.model] = 0;
      }
      costsByModel[cost.model] += cost.totalCost;
    }
    
    return costsByModel;
  }

  getProjectedMonthlyCost(): number {
    const last7Days = this.getCostSummary(7);
    const dailyAverage = last7Days.weekly / 7;
    return dailyAverage * 30;
  }

  private getCostsInPeriod(endDate: Date, periodMs: number): CostBreakdown[] {
    const startDate = new Date(endDate.getTime() - periodMs);
    
    return this.costHistory.filter(
      cost => cost.timestamp >= startDate && cost.timestamp <= endDate
    );
  }

  private sumCosts(costs: CostBreakdown[]): number {
    return costs.reduce((sum, cost) => sum + cost.totalCost, 0);
  }

  private saveCostHistory(): void {
    try {
      const data = JSON.stringify(this.costHistory);
      localStorage.setItem('todoist-ai-cost-history', data);
    } catch (error) {
      console.warn('Failed to save cost history:', error);
    }
  }

  private loadCostHistory(): void {
    try {
      const data = localStorage.getItem('todoist-ai-cost-history');
      if (data) {
        this.costHistory = JSON.parse(data).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load cost history:', error);
      this.costHistory = [];
    }
  }
}
```

#### 5.2 Cost Dashboard Component
**File:** `src/components/CostDashboard.tsx`

```typescript
import React from 'react';
import { CostMonitor, CostSummary } from '../services/CostMonitor.js';

interface CostDashboardProps {
  costMonitor: CostMonitor;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({ costMonitor }) => {
  const [costSummary, setCostSummary] = React.useState<CostSummary | null>(null);

  React.useEffect(() => {
    const summary = costMonitor.getCostSummary();
    setCostSummary(summary);
  }, [costMonitor]);

  if (!costSummary) return <div>Loading cost data...</div>;

  return (
    <div className="cost-dashboard">
      <h3>💰 Cost Monitoring</h3>
      
      <div className="cost-summary">
        <div className="cost-item">
          <span>Today:</span>
          <span>${costSummary.daily.toFixed(4)}</span>
        </div>
        <div className="cost-item">
          <span>This Week:</span>
          <span>${costSummary.weekly.toFixed(4)}</span>
        </div>
        <div className="cost-item">
          <span>This Month:</span>
          <span>${costSummary.monthly.toFixed(4)}</span>
        </div>
        <div className="cost-item">
          <span>Projected Monthly:</span>
          <span>${costMonitor.getProjectedMonthlyCost().toFixed(2)}</span>
        </div>
      </div>

      <div className="cost-by-model">
        <h4>Costs by Model</h4>
        {Object.entries(costMonitor.getCostsByModel()).map(([model, cost]) => (
          <div key={model} className="model-cost">
            <span>{model}:</span>
            <span>${cost.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### ⏱️ Stima Tempo: 4-5 ore

---

## 📅 Timeline di Implementazione

### Fase 1 (Settimana 1)
- ✅ **Task 1**: Token Counting Preciso (4-6 ore)
- ✅ **Task 2**: Limiti Dinamici (3-4 ore)

### Fase 2 (Settimana 2)
- ✅ **Task 3**: Integrazione API Metadata (5-6 ore)
- ✅ **Task 4**: Context Manager Migliorato (6-8 ore)

### Fase 3 (Settimana 3)
- ✅ **Task 5**: Cost Monitoring (4-5 ore)
- ✅ **Testing e Integrazione** (4-6 ore)

**Tempo Totale Stimato: 26-35 ore**

---

## 🧪 Piano di Testing

### Unit Tests
- TokenCounter per ogni modello
- ModelManager configurazioni
- UsageTracker accuracy calculation
- CostMonitor calculations

### Integration Tests
- EnhancedContextManager con diversi modelli
- LLMService con nuovo sistema di tracking
- End-to-end context optimization

### Performance Tests
- Benchmark token counting vs stima attuale
- Memory usage con context window grandi
- Response time con nuovo sistema

---

## 📊 Metriche di Successo

### Precisione
- ✅ Accuratezza token counting > 95%
- ✅ Riduzione errori di stima > 80%

### Performance
- ✅ Overhead aggiuntivo < 100ms per richiesta
- ✅ Memory footprint stabile

### Usabilità
- ✅ Dashboard costi user-friendly
- ✅ Indicatori context status chiari
- ✅ Strategie automatiche trasparenti

---

## 🔄 Manutenzione

### Aggiornamenti Regolari
- Configurazioni modelli (nuovi modelli, prezzi)
- Calibrazione algoritmi di stima
- Ottimizzazione strategie context

### Monitoring
- Accuracy trends
- Cost trends
- Performance metrics

---

## 📚 Riferimenti

- [Claude API Documentation](https://docs.anthropic.com/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Tiktoken Library](https://github.com/openai/tiktoken)
- [Token Counting Best Practices](https://platform.openai.com/docs/guides/text-generation)

---

*Documento creato il: 2024-12-23*  
*Ultima modifica: 2024-12-23*  
*Versione: 1.0*