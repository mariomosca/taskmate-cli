/**
 * Standardized error types for the error handling system
 */

export enum ErrorType {
  // Network and API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_PERMISSION_ERROR = 'FILE_PERMISSION_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  
  // Configuration errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  MISSING_CONFIG = 'MISSING_CONFIG',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // LLM errors
  LLM_ERROR = 'LLM_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_QUOTA_EXCEEDED = 'LLM_QUOTA_EXCEEDED',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',
  
  // Todoist errors
  TODOIST_ERROR = 'TODOIST_ERROR',
  TODOIST_SYNC_ERROR = 'TODOIST_SYNC_ERROR',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operation?: string;
  component?: string;
  timestamp?: Date;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly isRetryable: boolean;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity;
      context?: ErrorContext;
      originalError?: Error;
      isRetryable?: boolean;
    } = {}
  ) {
    super(message);
    
    this.name = 'AppError';
    this.type = type;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.context = {
      timestamp: new Date(),
      ...options.context
    };
    this.originalError = options.originalError;
    this.isRetryable = options.isRetryable || false;
    this.timestamp = new Date();

    // Mantiene lo stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Serializza l'errore per il logging
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      severity: this.severity,
      context: this.context,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }

  /**
   * Crea un AppError da un errore generico
   */
  static fromError(error: Error, type: ErrorType = ErrorType.UNKNOWN_ERROR, context?: ErrorContext): AppError {
    return new AppError(type, error.message, {
      originalError: error,
      context,
      severity: ErrorSeverity.MEDIUM
    });
  }

  /**
   * Determina se un errore è retryable basandosi sul tipo
   */
  static isRetryableError(error: AppError): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.API_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.LLM_TIMEOUT,
      ErrorType.DATABASE_CONNECTION_ERROR,
      ErrorType.TODOIST_SYNC_ERROR
    ];
    
    return retryableTypes.includes(error.type) || error.isRetryable;
  }
}

/**
 * Errori specifici per operazioni comuni
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(ErrorType.NETWORK_ERROR, message, {
      severity: ErrorSeverity.HIGH,
      context,
      isRetryable: true
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(ErrorType.VALIDATION_ERROR, message, {
      severity: ErrorSeverity.LOW,
      context,
      isRetryable: false
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(ErrorType.AUTHENTICATION_ERROR, message, {
      severity: ErrorSeverity.HIGH,
      context,
      isRetryable: false
    });
  }
}

export class FileSystemError extends AppError {
  constructor(type: ErrorType, message: string, context?: ErrorContext) {
    super(type, message, {
      severity: ErrorSeverity.MEDIUM,
      context,
      isRetryable: false
    });
  }
}

export class LLMError extends AppError {
  constructor(type: ErrorType, message: string, context?: ErrorContext, isRetryable: boolean = false) {
    super(type, message, {
      severity: ErrorSeverity.HIGH,
      context,
      isRetryable
    });
  }
}