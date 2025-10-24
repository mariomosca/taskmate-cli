import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';

export interface APIUsageMetadata {
  timestamp: Date;
  model: string;
  provider: 'claude' | 'gemini';
  actualInputTokens: number;
  actualOutputTokens: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  inputText: string;
  outputText: string;
  operation: string;
}

export interface CalibrationData {
  model: string;
  provider: 'claude' | 'gemini';
  inputTokenRatio: number; // actual / estimated
  outputTokenRatio: number;
  sampleCount: number;
  lastUpdated: Date;
  confidence: number; // 0-1, based on sample count
}

export interface EstimationAccuracy {
  model: string;
  averageInputError: number; // percentage
  averageOutputError: number;
  inputStandardDeviation: number;
  outputStandardDeviation: number;
  recommendedAdjustment: number;
}

export class APIMetadataService {
  private metadataFile: string;
  private calibrationFile: string;
  private calibrationData: Map<string, CalibrationData> = new Map();

  constructor(dataDir?: string) {
    const baseDir = dataDir || path.join(process.cwd(), 'data');
    this.metadataFile = path.join(baseDir, 'api_metadata.json');
    this.calibrationFile = path.join(baseDir, 'calibration_data.json');
    this.loadCalibrationData();
  }

  async recordAPIUsage(
    model: string,
    provider: 'claude' | 'gemini',
    inputText: string,
    outputText: string,
    actualInputTokens: number,
    actualOutputTokens: number,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    operation: string
  ): Promise<void> {
    const metadata: APIUsageMetadata = {
      timestamp: new Date(),
      model,
      provider,
      actualInputTokens,
      actualOutputTokens,
      estimatedInputTokens,
      estimatedOutputTokens,
      inputText: inputText.substring(0, 500), // Store only first 500 chars for analysis
      outputText: outputText.substring(0, 500),
      operation
    };

    await this.saveMetadata(metadata);
    await this.updateCalibration(metadata);
  }

  async getCalibratedEstimate(
    model: string,
    estimatedTokens: number,
    type: 'input' | 'output'
  ): Promise<{
    calibratedEstimate: number;
    confidence: number;
    adjustment: number;
  }> {
    const calibration = this.calibrationData.get(model);
    
    if (!calibration || calibration.sampleCount < 5) {
      return {
        calibratedEstimate: estimatedTokens,
        confidence: 0.1,
        adjustment: 1.0
      };
    }

    const ratio = type === 'input' ? calibration.inputTokenRatio : calibration.outputTokenRatio;
    const calibratedEstimate = Math.round(estimatedTokens * ratio);
    
    return {
      calibratedEstimate,
      confidence: calibration.confidence,
      adjustment: ratio
    };
  }

  async getEstimationAccuracy(model: string): Promise<EstimationAccuracy | null> {
    const metadata = await this.loadMetadata();
    const modelData = metadata.filter(m => m.model === model);
    
    if (modelData.length < 3) {
      return null;
    }

    const inputErrors = modelData.map(m => {
      const error = Math.abs(m.actualInputTokens - m.estimatedInputTokens) / m.actualInputTokens;
      return error * 100;
    });

    const outputErrors = modelData.map(m => {
      if (m.actualOutputTokens === 0) return 0;
      const error = Math.abs(m.actualOutputTokens - m.estimatedOutputTokens) / m.actualOutputTokens;
      return error * 100;
    });

    const averageInputError = inputErrors.reduce((sum, err) => sum + err, 0) / inputErrors.length;
    const averageOutputError = outputErrors.reduce((sum, err) => sum + err, 0) / outputErrors.length;

    const inputStdDev = Math.sqrt(
      inputErrors.reduce((sum, err) => sum + Math.pow(err - averageInputError, 2), 0) / inputErrors.length
    );

    const outputStdDev = Math.sqrt(
      outputErrors.reduce((sum, err) => sum + Math.pow(err - averageOutputError, 2), 0) / outputErrors.length
    );

    // Calcola aggiustamento raccomandato basato sui dati storici
    const inputRatios = modelData.map(m => m.actualInputTokens / m.estimatedInputTokens);
    const recommendedAdjustment = inputRatios.reduce((sum, ratio) => sum + ratio, 0) / inputRatios.length;

    return {
      model,
      averageInputError,
      averageOutputError,
      inputStandardDeviation: inputStdDev,
      outputStandardDeviation: outputStdDev,
      recommendedAdjustment
    };
  }

  async getModelPerformanceReport(model: string): Promise<{
    accuracy: EstimationAccuracy | null;
    calibration: CalibrationData | null;
    recentSamples: number;
    recommendations: string[];
  }> {
    const accuracy = await this.getEstimationAccuracy(model);
    const calibration = this.calibrationData.get(model) || null;
    
    const metadata = await this.loadMetadata();
    const recentSamples = metadata.filter(m => 
      m.model === model && 
      new Date(m.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length;

    const recommendations: string[] = [];

    if (!calibration || calibration.sampleCount < 10) {
      recommendations.push('Collect more samples for better calibration (minimum 10 recommended)');
    }

    if (accuracy) {
      if (accuracy.averageInputError > 20) {
        recommendations.push('Input token estimation has high error rate - consider model-specific counting');
      }
      if (accuracy.averageOutputError > 30) {
        recommendations.push('Output token estimation needs improvement - analyze response patterns');
      }
      if (accuracy.inputStandardDeviation > 25) {
        recommendations.push('High variance in input estimation - review text preprocessing');
      }
    }

    if (calibration && calibration.confidence < 0.5) {
      recommendations.push('Low confidence in calibration data - increase sample size');
    }

    return {
      accuracy,
      calibration,
      recentSamples,
      recommendations
    };
  }

  async exportCalibrationReport(format: 'json' | 'csv' = 'json'): Promise<string> {
    const allCalibrations = Array.from(this.calibrationData.values());
    
    if (format === 'csv') {
      const headers = ['model', 'provider', 'inputTokenRatio', 'outputTokenRatio', 'sampleCount', 'confidence', 'lastUpdated'];
      const csvRows = [
        headers.join(','),
        ...allCalibrations.map(cal => [
          cal.model,
          cal.provider,
          cal.inputTokenRatio.toFixed(4),
          cal.outputTokenRatio.toFixed(4),
          cal.sampleCount,
          cal.confidence.toFixed(3),
          cal.lastUpdated.toISOString()
        ].join(','))
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify(allCalibrations, null, 2);
  }

  private async updateCalibration(metadata: APIUsageMetadata): Promise<void> {
    const key = metadata.model;
    const existing = this.calibrationData.get(key);

    const inputRatio = metadata.estimatedInputTokens > 0 
      ? metadata.actualInputTokens / metadata.estimatedInputTokens 
      : 1;
    
    const outputRatio = metadata.estimatedOutputTokens > 0 
      ? metadata.actualOutputTokens / metadata.estimatedOutputTokens 
      : 1;

    if (existing) {
      // Weighted average with more weight on recent data
      const weight = Math.min(existing.sampleCount, 50); // Cap at 50 for responsiveness
      const newWeight = 1;
      const totalWeight = weight + newWeight;

      existing.inputTokenRatio = (existing.inputTokenRatio * weight + inputRatio * newWeight) / totalWeight;
      existing.outputTokenRatio = (existing.outputTokenRatio * weight + outputRatio * newWeight) / totalWeight;
      existing.sampleCount += 1;
      existing.lastUpdated = new Date();
      existing.confidence = Math.min(0.95, existing.sampleCount / 20); // Max confidence at 20 samples
    } else {
      this.calibrationData.set(key, {
        model: metadata.model,
        provider: metadata.provider,
        inputTokenRatio: inputRatio,
        outputTokenRatio: outputRatio,
        sampleCount: 1,
        lastUpdated: new Date(),
        confidence: 0.05 // Low confidence with single sample
      });
    }

    await this.saveCalibrationData();
  }

  private async saveMetadata(metadata: APIUsageMetadata): Promise<void> {
    try {
      const existing = await this.loadMetadata();
      existing.push(metadata);
      
      // Keep only last 1000 records to prevent file from growing too large
      if (existing.length > 1000) {
        existing.splice(0, existing.length - 1000);
      }

      await this.ensureDirectoryExists(this.metadataFile);
      await fs.writeFile(this.metadataFile, JSON.stringify(existing, null, 2));
    } catch (error) {
      errorHandler.handleError(error as Error, {
        operation: 'saveMetadata',
        component: 'APIMetadataService',
        metadata: { 
          metadataFile: this.metadataFile,
          model: metadata.model,
          provider: metadata.provider
        }
      });
    }
  }

  private async loadMetadata(): Promise<APIUsageMetadata[]> {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf-8');
      const records = JSON.parse(data);
      return records.map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp)
      }));
    } catch (error) {
      return [];
    }
  }

  private async saveCalibrationData(): Promise<void> {
    try {
      const data = Array.from(this.calibrationData.values());
      await this.ensureDirectoryExists(this.calibrationFile);
      await fs.writeFile(this.calibrationFile, JSON.stringify(data, null, 2));
    } catch (error) {
      errorHandler.handleError(error as Error, {
        operation: 'saveCalibrationData',
        component: 'APIMetadataService',
        metadata: { 
          calibrationFile: this.calibrationFile,
          dataCount: this.calibrationData.size
        }
      });
    }
  }

  private async loadCalibrationData(): Promise<void> {
    try {
      const data = await fs.readFile(this.calibrationFile, 'utf-8');
      const records = JSON.parse(data);
      
      this.calibrationData.clear();
      records.forEach((record: any) => {
        this.calibrationData.set(record.model, {
          ...record,
          lastUpdated: new Date(record.lastUpdated)
        });
      });
    } catch (error) {
      // File doesn't exist yet, start with empty calibration data
    }
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}