import fs from 'fs';
import path from 'path';

class FileLogger {
  private logFile: string;

  constructor(logFileName: string = 'debug.log') {
    this.logFile = path.join(process.cwd(), logFileName);
  }

  private writeLog(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };
    
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      // Fallback to stderr if file writing fails
      process.stderr.write(`Logger Error: ${error}\n`);
    }
  }

  debug(message: string, data?: any) {
    this.writeLog('debug', message, data);
  }

  info(message: string, data?: any) {
    this.writeLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.writeLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.writeLog('error', message, data);
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