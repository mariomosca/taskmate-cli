import { CostMonitor } from '../services/CostMonitor';
import { ModelManager } from '../services/ModelManager';
import fs from 'fs/promises';

describe('CostMonitor', () => {
  let costMonitor: CostMonitor;
  let modelManager: ModelManager;

  beforeEach(() => {
    modelManager = new ModelManager();
    costMonitor = new CostMonitor(modelManager, {
      usageFile: './test-usage.json'
    });
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink('./test-usage.json');
    } catch (error) {
      // File might not exist, ignore error
    }
    costMonitor.resetSession();
  });

  describe('recordUsage', () => {
    it('should record usage correctly', async () => {
      const result = await costMonitor.recordUsage(
        'claude-sonnet-4-5-20250929',
        1000,
        500,
        'chat'
      );

      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('inputTokens');
      expect(result).toHaveProperty('outputTokens');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('operation');
      expect(result).toHaveProperty('timestamp');

      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.inputTokens).toBe(1000);
      expect(result.outputTokens).toBe(500);
      expect(result.model).toBe('claude-sonnet-4-5-20250929');
      expect(result.operation).toBe('chat');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle zero tokens', async () => {
      const result = await costMonitor.recordUsage('claude-sonnet-4-5-20250929', 0, 0, 'chat');

      expect(result.totalCost).toBe(0);
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });
  });

  describe('getCurrentSessionCost', () => {
    it('should return zero for new session', () => {
      const sessionCost = costMonitor.getCurrentSessionCost();

      expect(typeof sessionCost).toBe('number');
      expect(sessionCost).toBe(0);
    });

    it('should accumulate costs correctly', async () => {
      await costMonitor.recordUsage('claude-sonnet-4-5-20250929', 1000, 500, 'chat');
      await costMonitor.recordUsage('claude-sonnet-4-5-20250929', 500, 250, 'completion');

      const sessionCost = costMonitor.getCurrentSessionCost();

      expect(sessionCost).toBeGreaterThan(0);
    });
  });

  describe('getDailySummary', () => {
    it('should return daily summary', async () => {
      const summary = await costMonitor.getDailySummary();

      expect(summary).toHaveProperty('totalCost');
      expect(summary).toHaveProperty('totalInputTokens');
      expect(summary).toHaveProperty('totalOutputTokens');
      expect(summary).toHaveProperty('operationCount');
      expect(summary).toHaveProperty('averageCostPerOperation');
      expect(summary).toHaveProperty('costByModel');
      expect(summary).toHaveProperty('costByOperation');
      expect(summary).toHaveProperty('period');

      expect(summary.totalCost).toBeGreaterThanOrEqual(0);
      expect(summary.totalInputTokens).toBeGreaterThanOrEqual(0);
      expect(summary.totalOutputTokens).toBeGreaterThanOrEqual(0);
      expect(summary.operationCount).toBeGreaterThanOrEqual(0);
      expect(typeof summary.costByModel).toBe('object');
      expect(typeof summary.costByOperation).toBe('object');
      expect(summary.period).toHaveProperty('start');
      expect(summary.period).toHaveProperty('end');
    });

    it('should include recorded usage in daily summary', async () => {
      await costMonitor.recordUsage('claude-3-sonnet-20240229', 1000, 500, 'chat');

      const summary = await costMonitor.getDailySummary();

      expect(summary.totalCost).toBeGreaterThan(0);
      expect(summary.totalInputTokens).toBe(1000);
      expect(summary.totalOutputTokens).toBe(500);
      expect(summary.operationCount).toBe(1);
      expect(summary.costByModel['claude-3-sonnet-20240229']).toBeDefined();
      expect(summary.costByOperation['chat']).toBeDefined();
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary', async () => {
      const summary = await costMonitor.getSessionSummary();

      expect(summary).toHaveProperty('totalCost');
      expect(summary).toHaveProperty('totalInputTokens');
      expect(summary).toHaveProperty('totalOutputTokens');
      expect(summary).toHaveProperty('operationCount');
      expect(summary).toHaveProperty('averageCostPerOperation');
      expect(summary).toHaveProperty('costByModel');
      expect(summary).toHaveProperty('costByOperation');
      expect(summary).toHaveProperty('period');

      expect(summary.totalCost).toBeGreaterThanOrEqual(0);
      expect(summary.operationCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSummary', () => {
    it('should return summary for date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      
      const summary = await costMonitor.getSummary(startDate, endDate);

      expect(summary).toHaveProperty('totalCost');
      expect(summary).toHaveProperty('totalInputTokens');
      expect(summary).toHaveProperty('totalOutputTokens');
      expect(summary).toHaveProperty('operationCount');
      expect(summary).toHaveProperty('averageCostPerOperation');
      expect(summary).toHaveProperty('costByModel');
      expect(summary).toHaveProperty('costByOperation');
      expect(summary).toHaveProperty('period');

      expect(summary.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkAlerts', () => {
    it('should check for cost alerts', async () => {
      const alerts = await costMonitor.checkAlerts();

      expect(Array.isArray(alerts)).toBe(true);
      alerts.forEach(alert => {
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('currentValue');
        expect(alert).toHaveProperty('threshold');
        expect(alert).toHaveProperty('severity');
      });
    });
  });

  describe('getTopExpensiveOperations', () => {
    it('should return top expensive operations', async () => {
      await costMonitor.recordUsage('claude-3-sonnet-20240229', 1000, 500, 'chat');
      await costMonitor.recordUsage('claude-3-sonnet-20240229', 500, 250, 'completion');

      const topOperations = await costMonitor.getTopExpensiveOperations(5);

      expect(Array.isArray(topOperations)).toBe(true);
      topOperations.forEach(op => {
        expect(op).toHaveProperty('operation');
        expect(op).toHaveProperty('totalCost');
        expect(op).toHaveProperty('count');
        expect(op).toHaveProperty('averageCost');
      });
    });
  });

  describe('exportUsageData', () => {
    it('should export usage data in JSON format', async () => {
      const startDate = new Date();
      const endDate = new Date();
      
      const data = await costMonitor.exportUsageData(startDate, endDate, 'json');

      expect(typeof data).toBe('string');
      expect(() => JSON.parse(data)).not.toThrow();
    });

    it('should export usage data in CSV format', async () => {
      const startDate = new Date();
      const endDate = new Date();
      
      const data = await costMonitor.exportUsageData(startDate, endDate, 'csv');

      expect(typeof data).toBe('string');
      expect(data).toContain('timestamp,model,operation,inputTokens,outputTokens,totalCost');
    });
  });

  describe('resetSession', () => {
    it('should reset current session data', async () => {
      await costMonitor.recordUsage('claude-3-sonnet-20240229', 1000, 500, 'chat');

      let sessionCost = costMonitor.getCurrentSessionCost();
      expect(sessionCost).toBeGreaterThan(0);

      costMonitor.resetSession();

      sessionCost = costMonitor.getCurrentSessionCost();
      expect(sessionCost).toBe(0);
    });
  });
});