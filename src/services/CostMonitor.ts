import fs from 'fs/promises';
import path from 'path';
import { ModelManager } from './ModelManager.js';

export interface UsageRecord {
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  operation: string;
  sessionId?: string;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  operationCount: number;
  averageCostPerOperation: number;
  costByModel: Record<string, number>;
  costByOperation: Record<string, number>;
  period: {
    start: Date;
    end: Date;
  };
}

export interface CostAlert {
  type: 'daily_limit' | 'session_limit' | 'operation_cost' | 'model_cost';
  message: string;
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

export class CostMonitor {
  private modelManager: ModelManager;
  private usageFile: string;
  private dailyLimit: number;
  private sessionLimit: number;
  private currentSessionId: string;
  private currentSessionCost: number = 0;

  constructor(
    modelManager: ModelManager,
    options: {
      usageFile?: string;
      dailyLimit?: number;
      sessionLimit?: number;
    } = {}
  ) {
    this.modelManager = modelManager;
    this.usageFile = options.usageFile || path.join(process.cwd(), 'data', 'usage.json');
    this.dailyLimit = options.dailyLimit || 10.0; // $10 default daily limit
    this.sessionLimit = options.sessionLimit || 2.0; // $2 default session limit
    this.currentSessionId = this.generateSessionId();
  }

  async recordUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    operation: string
  ): Promise<UsageRecord> {
    const cost = this.modelManager.calculateCost(inputTokens, outputTokens, model);
    const config = this.modelManager.getModelConfig(model);
    
    const record: UsageRecord = {
      timestamp: new Date(),
      model,
      inputTokens,
      outputTokens,
      inputCost: (inputTokens / 1000) * config.costPer1kInputTokens,
      outputCost: (outputTokens / 1000) * config.costPer1kOutputTokens,
      totalCost: cost,
      operation,
      sessionId: this.currentSessionId
    };

    this.currentSessionCost += cost;

    // Salva il record
    await this.saveUsageRecord(record);

    return record;
  }

  async getDailySummary(date?: Date): Promise<CostSummary> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getSummary(startOfDay, endOfDay);
  }

  async getSessionSummary(sessionId?: string): Promise<CostSummary> {
    const targetSessionId = sessionId || this.currentSessionId;
    const records = await this.loadUsageRecords();
    const sessionRecords = records.filter(r => r.sessionId === targetSessionId);

    if (sessionRecords.length === 0) {
      const now = new Date();
      return {
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        operationCount: 0,
        averageCostPerOperation: 0,
        costByModel: {},
        costByOperation: {},
        period: { start: now, end: now }
      };
    }

    return this.calculateSummary(sessionRecords);
  }

  async getSummary(startDate: Date, endDate: Date): Promise<CostSummary> {
    const records = await this.loadUsageRecords();
    const filteredRecords = records.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= startDate && recordDate <= endDate;
    });

    return this.calculateSummary(filteredRecords);
  }

  async checkAlerts(): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];
    
    // Check daily limit
    const dailySummary = await this.getDailySummary();
    if (dailySummary.totalCost >= this.dailyLimit * 0.9) {
      alerts.push({
        type: 'daily_limit',
        message: `Daily cost approaching limit: $${dailySummary.totalCost.toFixed(4)} / $${this.dailyLimit}`,
        currentValue: dailySummary.totalCost,
        threshold: this.dailyLimit,
        severity: dailySummary.totalCost >= this.dailyLimit ? 'critical' : 'warning'
      });
    }

    // Check session limit
    if (this.currentSessionCost >= this.sessionLimit * 0.8) {
      alerts.push({
        type: 'session_limit',
        message: `Session cost approaching limit: $${this.currentSessionCost.toFixed(4)} / $${this.sessionLimit}`,
        currentValue: this.currentSessionCost,
        threshold: this.sessionLimit,
        severity: this.currentSessionCost >= this.sessionLimit ? 'critical' : 'warning'
      });
    }

    return alerts;
  }

  async getTopExpensiveOperations(limit: number = 10): Promise<Array<{
    operation: string;
    totalCost: number;
    count: number;
    averageCost: number;
  }>> {
    const records = await this.loadUsageRecords();
    const operationStats = new Map<string, { totalCost: number; count: number }>();

    records.forEach(record => {
      const existing = operationStats.get(record.operation) || { totalCost: 0, count: 0 };
      existing.totalCost += record.totalCost;
      existing.count += 1;
      operationStats.set(record.operation, existing);
    });

    return Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        totalCost: stats.totalCost,
        count: stats.count,
        averageCost: stats.totalCost / stats.count
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  async exportUsageData(startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json'): Promise<string> {
    const summary = await this.getSummary(startDate, endDate);
    const records = await this.loadUsageRecords();
    const filteredRecords = records.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= startDate && recordDate <= endDate;
    });

    if (format === 'csv') {
      const headers = ['timestamp', 'model', 'operation', 'inputTokens', 'outputTokens', 'totalCost'];
      const csvRows = [
        headers.join(','),
        ...filteredRecords.map(record => [
          record.timestamp.toISOString(),
          record.model,
          record.operation,
          record.inputTokens,
          record.outputTokens,
          record.totalCost.toFixed(6)
        ].join(','))
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify({
      summary,
      records: filteredRecords
    }, null, 2);
  }

  getCurrentSessionCost(): number {
    return this.currentSessionCost;
  }

  resetSession(): void {
    this.currentSessionId = this.generateSessionId();
    this.currentSessionCost = 0;
  }

  private calculateSummary(records: UsageRecord[]): CostSummary {
    if (records.length === 0) {
      const now = new Date();
      return {
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        operationCount: 0,
        averageCostPerOperation: 0,
        costByModel: {},
        costByOperation: {},
        period: { start: now, end: now }
      };
    }

    const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0);
    
    const costByModel: Record<string, number> = {};
    const costByOperation: Record<string, number> = {};
    
    records.forEach(record => {
      costByModel[record.model] = (costByModel[record.model] || 0) + record.totalCost;
      costByOperation[record.operation] = (costByOperation[record.operation] || 0) + record.totalCost;
    });

    const timestamps = records.map(r => new Date(r.timestamp));
    
    return {
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      operationCount: records.length,
      averageCostPerOperation: totalCost / records.length,
      costByModel,
      costByOperation,
      period: {
        start: new Date(Math.min(...timestamps.map(d => d.getTime()))),
        end: new Date(Math.max(...timestamps.map(d => d.getTime())))
      }
    };
  }

  private async saveUsageRecord(record: UsageRecord): Promise<void> {
    try {
      const records = await this.loadUsageRecords();
      records.push(record);
      
      // Mantieni solo gli ultimi 10000 record per evitare file troppo grandi
      if (records.length > 10000) {
        records.splice(0, records.length - 10000);
      }
      
      await this.ensureDirectoryExists();
      await fs.writeFile(this.usageFile, JSON.stringify(records, null, 2));
    } catch (error) {
      console.error('Error saving usage record:', error);
    }
  }

  private async loadUsageRecords(): Promise<UsageRecord[]> {
    try {
      const data = await fs.readFile(this.usageFile, 'utf-8');
      const records = JSON.parse(data);
      return records.map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp)
      }));
    } catch (error) {
      return [];
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = path.dirname(this.usageFile);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}