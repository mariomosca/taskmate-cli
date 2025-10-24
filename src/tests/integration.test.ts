import { LLMService } from '../services/LLMService.js';
import { ModelManager } from '../services/ModelManager.js';
import { CostMonitor } from '../services/CostMonitor.js';
import { APIMetadataService } from '../services/APIMetadataService.js';
import { EnhancedContextManager, LLMMessage } from '../services/EnhancedContextManager.js';
import fs from 'fs/promises';

describe('Integration Tests', () => {
  let llmService: LLMService;
  let modelManager: ModelManager;
  let costMonitor: CostMonitor;
  let apiMetadataService: APIMetadataService;
  let contextManager: EnhancedContextManager;

  beforeEach(async () => {
    // Initialize services
    modelManager = new ModelManager();
    costMonitor = new CostMonitor(modelManager, {
      usageFile: './test-integration-usage.json',
      dailyLimit: 100,
      sessionLimit: 50
    });
    apiMetadataService = new APIMetadataService('./test-integration-data');
    contextManager = new EnhancedContextManager();
    
    llmService = new LLMService();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink('./test-integration-usage.json');
    } catch (error) {
      // File might not exist, ignore
    }
    try {
      await fs.unlink('./test-integration-metadata.json');
    } catch (error) {
      // File might not exist, ignore
    }
    costMonitor.resetSession();
  });

  describe('Complete Workflow', () => {
    it('should handle a complete LLM interaction workflow', async () => {
      // Set up model
      modelManager.setCurrentModel('claude-sonnet-4-5-20250929');
      
      // Verify model configuration
      const config = modelManager.getModelConfig('claude-sonnet-4-5-20250929');
      expect(config.name).toBe('Claude Sonnet 4.5');
      expect(config.contextWindow).toBeGreaterThan(0);
      
      // Test context management
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Test context for integration' }
      ];
      const optimizedContext = await contextManager.optimizeContext(messages, 0.3, 'claude-sonnet-4-5-20250929');
      expect(optimizedContext).toBeDefined();
      expect(optimizedContext.optimizedMessages).toBeDefined();
      expect(optimizedContext.optimizedMessages.length).toBeGreaterThan(0);
      
      // Simulate API usage recording
      await apiMetadataService.recordAPIUsage(
        'claude-sonnet-4-5-20250929',
        'claude',
        'Test input',
        'Test output',
        100,
        50,
        95,
        48,
        'integration-test'
      );
      
      // Record cost usage
      const usageRecord = await costMonitor.recordUsage(
        'claude-sonnet-4-5-20250929',
        100,
        50,
        'integration-test'
      );
      
      expect(usageRecord.model).toBe('claude-sonnet-4-5-20250929');
      expect(usageRecord.inputTokens).toBe(100);
      expect(usageRecord.outputTokens).toBe(50);
      expect(usageRecord.totalCost).toBeGreaterThan(0);
      
      // Verify cost tracking
      const sessionCost = costMonitor.getCurrentSessionCost();
      expect(sessionCost).toBeGreaterThan(0);
      
      // Test daily summary
      const dailySummary = await costMonitor.getDailySummary();
      expect(dailySummary.totalInputTokens).toBe(100);
      expect(dailySummary.totalOutputTokens).toBe(50);
      expect(dailySummary.operationCount).toBe(1);
      expect(dailySummary.costByModel['claude-sonnet-4-5-20250929']).toBeGreaterThan(0);
      
      // Test API metadata - get performance report instead
      const performanceReport = await apiMetadataService.getModelPerformanceReport('claude-sonnet-4-5-20250929');
      expect(performanceReport).toBeDefined();
      expect(performanceReport.calibration).toBeDefined();
      
      // Test calibration export
      const calibrationReport = await apiMetadataService.exportCalibrationReport('json');
      expect(typeof calibrationReport).toBe('string');
      const parsedCalibrationReport = JSON.parse(calibrationReport);
      expect(Array.isArray(parsedCalibrationReport)).toBe(true);
      
      // Test cost export
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      const costReport = await costMonitor.exportUsageData(startDate, endDate, 'json');
      const parsedCostReport = JSON.parse(costReport);
      expect(parsedCostReport.summary).toBeDefined();
      expect(parsedCostReport.records).toBeDefined();
      expect(parsedCostReport.records.length).toBe(1);
    });

    it('should handle multiple models and operations', async () => {
      const models = ['claude-3-sonnet-20240229', 'gpt-4'];
      const operations = ['chat', 'completion', 'analysis'];
      
      for (const model of models) {
        for (const operation of operations) {
          // Record API usage
          await apiMetadataService.recordAPIUsage(
            model,
            model.startsWith('gpt') ? 'gemini' : 'claude', // Use available providers
            `Input for ${operation}`,
            `Output for ${operation}`,
            50,
            25,
            48,
            24,
            operation
          );
          
          // Record cost
          await costMonitor.recordUsage(model, 50, 25, operation);
        }
      }
      
      // Verify aggregated data
      const dailySummary = await costMonitor.getDailySummary();
      expect(dailySummary.totalInputTokens).toBe(300); // 50 * 6 operations
      expect(dailySummary.totalOutputTokens).toBe(150); // 25 * 6 operations
      expect(dailySummary.operationCount).toBe(6);
      
      // Verify model-specific data using performance reports
      for (const model of models) {
        const performanceReport = await apiMetadataService.getModelPerformanceReport(model);
        expect(performanceReport).toBeDefined();
      }
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid model
      modelManager.setCurrentModel('invalid-model');
      const config = modelManager.getModelConfig('invalid-model');
      expect(config.name).toBe('Unknown Model');
      expect(config.contextWindow).toBe(8192); // Default value
      
      // Test cost monitoring with zero tokens
      const usageRecord = await costMonitor.recordUsage('claude-sonnet-4-5-20250929', 0, 0, 'test');
      expect(usageRecord.totalCost).toBe(0);
      
      // Test API metadata with failed request
      await apiMetadataService.recordAPIUsage(
        'claude-sonnet-4-5-20250929',
        'claude',
        'Failed input',
        'Failed output',
        0,
        0,
        100,
        50,
        'failed-test'
      );
      
      const performanceReport = await apiMetadataService.getModelPerformanceReport('claude-3-sonnet-20240229');
      expect(performanceReport).toBeDefined();
    });
  });

  describe('Performance and Limits', () => {
    it('should handle high volume of operations efficiently', async () => {
      const startTime = Date.now();
      const operationCount = 100;
      
      // Record many operations
      for (let i = 0; i < operationCount; i++) {
        await costMonitor.recordUsage('claude-3-sonnet-20240229', 10, 5, `operation-${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // Verify data integrity
      const dailySummary = await costMonitor.getDailySummary();
      expect(dailySummary.operationCount).toBe(operationCount);
      expect(dailySummary.totalInputTokens).toBe(operationCount * 10);
      expect(dailySummary.totalOutputTokens).toBe(operationCount * 5);
    });

    it('should generate alerts for cost limits', async () => {
      // Record usage that exceeds 80% of session limit ($50 * 0.8 = $40)
      // Need about $40 in costs: claude-3-sonnet costs $0.003/1k input + $0.015/1k output
      // Cost = (5000000/1000)*0.003 + (2500000/1000)*0.015 = 15 + 37.5 = $52.5
      await costMonitor.recordUsage('claude-3-sonnet-20240229', 5000000, 2500000, 'large-operation');
      
      const alerts = await costMonitor.checkAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const sessionAlert = alerts.find(alert => alert.type === 'session_limit');
      expect(sessionAlert).toBeDefined();
      expect(sessionAlert?.severity).toBe('critical'); // Cost exceeds session limit
    });
  });
});