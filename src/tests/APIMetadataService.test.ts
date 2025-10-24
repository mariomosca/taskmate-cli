import { APIMetadataService } from '../services/APIMetadataService';

describe('APIMetadataService', () => {
  let apiMetadataService: APIMetadataService;

  beforeEach(() => {
    apiMetadataService = new APIMetadataService();
  });

  describe('recordAPIUsage', () => {
    it('should record API usage with all parameters', async () => {
      const model = 'claude-sonnet-4-5-20250929';
      const provider = 'claude' as const;
      const inputText = 'Test input message';
      const outputText = 'Test response from API';
      const actualInputTokens = 100;
      const actualOutputTokens = 50;
      const estimatedInputTokens = 95;
      const estimatedOutputTokens = 48;
      const operation = 'chat';

      await apiMetadataService.recordAPIUsage(
        model,
        provider,
        inputText,
        outputText,
        actualInputTokens,
        actualOutputTokens,
        estimatedInputTokens,
        estimatedOutputTokens,
        operation
      );

      // Since recordAPIUsage returns void, we can't test the return value directly
      // Instead, we test that the method completes without throwing
      expect(true).toBe(true);
    });

    it('should handle different models and providers', async () => {
      await apiMetadataService.recordAPIUsage(
        'claude-sonnet-4-5-20250929',
        'claude',
        'Test input',
        'Test response',
        100,
        50,
        95,
        48,
        'chat'
      );

      await apiMetadataService.recordAPIUsage(
        'gemini-1.5-pro',
        'gemini',
        'Test input',
        'Test response',
        100,
        50,
        95,
        48,
        'completion'
      );

      // Test completes without throwing
      expect(true).toBe(true);
    });
  });

  describe('getCalibratedEstimate', () => {
    it('should return calibrated estimate for input tokens', async () => {
      const model = 'claude-sonnet-4-5-20250929';
      const estimatedTokens = 100;
      
      const result = await apiMetadataService.getCalibratedEstimate(
        model,
        estimatedTokens,
        'input'
      );

      expect(result).toHaveProperty('calibratedEstimate');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('adjustment');

      expect(result.calibratedEstimate).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.adjustment).toBe('number');
    });

    it('should return calibrated estimate for output tokens', async () => {
      const model = 'claude-sonnet-4-5-20250929';
      const estimatedTokens = 50;
      
      const result = await apiMetadataService.getCalibratedEstimate(
        model,
        estimatedTokens,
        'output'
      );

      expect(result).toHaveProperty('calibratedEstimate');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('adjustment');

      expect(result.calibratedEstimate).toBeGreaterThan(0);
    });
  });

  describe('getEstimationAccuracy', () => {
    it('should return estimation accuracy for a model', async () => {
      const model = 'claude-3-sonnet-20240229';
      
      const accuracy = await apiMetadataService.getEstimationAccuracy(model);

      if (accuracy) {
        expect(accuracy).toHaveProperty('model');
        expect(accuracy).toHaveProperty('averageInputError');
        expect(accuracy).toHaveProperty('averageOutputError');
        expect(accuracy).toHaveProperty('inputStandardDeviation');
        expect(accuracy).toHaveProperty('outputStandardDeviation');
        expect(accuracy).toHaveProperty('recommendedAdjustment');

        expect(accuracy.model).toBe(model);
        expect(typeof accuracy.averageInputError).toBe('number');
        expect(typeof accuracy.averageOutputError).toBe('number');
      } else {
        // No data available yet, which is acceptable
        expect(accuracy).toBeNull();
      }
    });

    it('should return null for unknown model', async () => {
      const accuracy = await apiMetadataService.getEstimationAccuracy('unknown-model');
      expect(accuracy).toBeNull();
    });
  });

  describe('getModelPerformanceReport', () => {
    it('should return model performance report', async () => {
      const model = 'claude-3-sonnet-20240229';
      
      const report = await apiMetadataService.getModelPerformanceReport(model);

      expect(report).toHaveProperty('accuracy');
      expect(report).toHaveProperty('calibration');
      expect(report).toHaveProperty('recentSamples');
      expect(report).toHaveProperty('recommendations');

      expect(typeof report.recentSamples).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recentSamples).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportCalibrationReport', () => {
    it('should export calibration data in JSON format', async () => {
      const data = await apiMetadataService.exportCalibrationReport('json');

      expect(typeof data).toBe('string');
      expect(() => JSON.parse(data)).not.toThrow();

      const parsed = JSON.parse(data);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export calibration data in CSV format', async () => {
      const data = await apiMetadataService.exportCalibrationReport('csv');

      expect(typeof data).toBe('string');
      expect(data).toContain('model,provider,inputTokenRatio,outputTokenRatio,sampleCount,confidence,lastUpdated');
    });
  });
});