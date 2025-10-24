import fs from 'fs';
import path from 'path';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class FileLogger {
  private logFile: string;
  private isDevelopment: boolean;
  private isTest: boolean;
  private minLogLevel: LogLevel;

  constructor(logFileName: string = 'debug.log') {
    this.logFile = path.join(process.cwd(), logFileName);
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    
    // Set minimum log level based on environment
    if (this.isTest) {
      this.minLogLevel = LogLevel.ERROR; // Only errors in test
    } else if (this.isDevelopment) {
      this.minLogLevel = LogLevel.DEBUG; // All logs in development
    } else {
      this.minLogLevel = LogLevel.WARN; // Warn and error in production
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLogLevel;
  }

  private writeLog(level: string, logLevel: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(logLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };
    
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    
    try {
      // In test environment, don't write to file to avoid pollution
      if (!this.isTest) {
        fs.appendFileSync(this.logFile, logLine);
      }
    } catch (error) {
      // Fallback to stderr if file writing fails
      if (!this.isTest) {
        process.stderr.write(`Logger Error: ${error}\n`);
      }
    }
  }

  debug(message: string, data?: any) {
    this.writeLog('debug', LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.writeLog('info', LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.writeLog('warn', LogLevel.WARN, message, data);
  }

  error(message: string, data?: any) {
    this.writeLog('error', LogLevel.ERROR, message, data);
  }

  // Clear log file
  clear() {
    try {
      fs.writeFileSync(this.logFile, '');
    } catch (error) {
      process.stderr.write(`Logger Clear Error: ${error}\n`);
    }
  }
}

export const logger = new FileLogger();