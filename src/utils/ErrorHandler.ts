import { logger } from './logger';
import { 
  AppError, 
  ErrorType, 
  ErrorSeverity, 
  ErrorContext, 
  RetryConfig,
  NetworkError,
  ValidationError,
  AuthenticationError,
  FileSystemError,
  LLMError
} from '../types/errors';

/**
 * Gestore centralizzato degli errori con supporto per retry logic e logging strutturato
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryConfigs: Map<ErrorType, RetryConfig> = new Map();

  private constructor() {
    this.initializeRetryConfigs();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Inizializza le configurazioni di retry per diversi tipi di errore
   */
  private initializeRetryConfigs() {
    // Configurazione per errori di rete
    this.retryConfigs.set(ErrorType.NETWORK_ERROR, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [ErrorType.NETWORK_ERROR]
    });

    // Configurazione per errori API
    this.retryConfigs.set(ErrorType.API_ERROR, {
      maxAttempts: 2,
      baseDelay: 2000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      retryableErrors: [ErrorType.API_ERROR]
    });

    // Configurazione per rate limiting
    this.retryConfigs.set(ErrorType.RATE_LIMIT_ERROR, {
      maxAttempts: 5,
      baseDelay: 5000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
      retryableErrors: [ErrorType.RATE_LIMIT_ERROR]
    });

    // Configurazione per timeout LLM
    this.retryConfigs.set(ErrorType.LLM_TIMEOUT, {
      maxAttempts: 2,
      baseDelay: 3000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [ErrorType.LLM_TIMEOUT]
    });

    // Configurazione per errori di connessione database
    this.retryConfigs.set(ErrorType.DATABASE_CONNECTION_ERROR, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryableErrors: [ErrorType.DATABASE_CONNECTION_ERROR]
    });
  }

  /**
   * Gestisce un errore con logging strutturato
   */
  public handleError(error: Error | AppError, context?: ErrorContext): AppError {
    let appError: AppError;

    // Converte errori generici in AppError
    if (error instanceof AppError) {
      appError = error;
      // Aggiunge contesto aggiuntivo se fornito
      if (context) {
        appError = new AppError(
          appError.type,
          appError.message,
          {
            severity: appError.severity,
            context: { ...appError.context, ...context },
            originalError: appError.originalError,
            isRetryable: appError.isRetryable
          }
        );
      }
    } else {
      appError = AppError.fromError(error, ErrorType.UNKNOWN_ERROR, context);
    }

    // Log strutturato dell'errore
    this.logError(appError);

    return appError;
  }

  /**
   * Esegue un'operazione con retry automatico
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    let lastError: AppError;
    let attempt = 0;

    while (true) {
      attempt++;
      
      try {
        return await operation();
      } catch (error) {
        const appError = this.handleError(error as Error, { 
          ...context, 
          metadata: { ...context.metadata, attempt }
        });
        lastError = appError;

        // Determina se l'errore è retryable
        if (!AppError.isRetryableError(appError)) {
          throw appError;
        }

        // Ottiene la configurazione di retry
        const retryConfig = this.getRetryConfig(appError.type, customRetryConfig);
        
        if (attempt >= retryConfig.maxAttempts) {
          logger.error('Max retry attempts reached', {
            errorType: appError.type,
            attempts: attempt,
            operation: context.operation
          });
          throw appError;
        }

        // Calcola il delay per il prossimo tentativo
        const delay = this.calculateDelay(attempt, retryConfig);
        
        logger.warn('Retrying operation', {
          errorType: appError.type,
          attempt,
          nextAttemptIn: delay,
          operation: context.operation
        });

        await this.sleep(delay);
      }
    }
  }

  /**
   * Crea errori specifici con contesto
   */
  public createNetworkError(message: string, context?: ErrorContext): NetworkError {
    return new NetworkError(message, context);
  }

  public createValidationError(message: string, context?: ErrorContext): ValidationError {
    return new ValidationError(message, context);
  }

  public createAuthenticationError(message: string, context?: ErrorContext): AuthenticationError {
    return new AuthenticationError(message, context);
  }

  public createFileSystemError(type: ErrorType, message: string, context?: ErrorContext): FileSystemError {
    return new FileSystemError(type, message, context);
  }

  public createLLMError(type: ErrorType, message: string, context?: ErrorContext, isRetryable: boolean = false): LLMError {
    return new LLMError(type, message, context, isRetryable);
  }

  /**
   * Wrapper per operazioni che possono fallire
   */
  public async safeExecute<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      const appError = this.handleError(error as Error, context);
      
      if (fallback !== undefined) {
        logger.warn('Operation failed, using fallback', {
          errorType: appError.type,
          operation: context.operation,
          fallback
        });
        return fallback;
      }
      
      return undefined;
    }
  }

  /**
   * Log strutturato degli errori
   */
  private logError(error: AppError) {
    const logData = {
      type: error.type,
      severity: error.severity,
      context: error.context,
      isRetryable: error.isRetryable,
      stack: error.stack,
      originalError: error.originalError ? {
        name: error.originalError.name,
        message: error.originalError.message
      } : undefined
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`CRITICAL ERROR: ${error.message}`, logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error(`HIGH SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`MEDIUM SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.LOW:
        logger.info(`LOW SEVERITY: ${error.message}`, logData);
        break;
      default:
        logger.error(error.message, logData);
    }
  }

  /**
   * Ottiene la configurazione di retry per un tipo di errore
   */
  private getRetryConfig(errorType: ErrorType, customConfig?: Partial<RetryConfig>): RetryConfig {
    const defaultConfig = this.retryConfigs.get(errorType) || {
      maxAttempts: 1,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryableErrors: []
    };

    return { ...defaultConfig, ...customConfig };
  }

  /**
   * Calcola il delay per il retry con exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Utility per sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Aggiorna la configurazione di retry per un tipo di errore
   */
  public setRetryConfig(errorType: ErrorType, config: RetryConfig) {
    this.retryConfigs.set(errorType, config);
  }

  /**
   * Ottiene statistiche sugli errori (per debugging)
   */
  public getErrorStats(): { [key: string]: any } {
    return {
      retryConfigsCount: this.retryConfigs.size,
      configuredErrorTypes: Array.from(this.retryConfigs.keys())
    };
  }
}

// Esporta l'istanza singleton
export const errorHandler = ErrorHandler.getInstance();