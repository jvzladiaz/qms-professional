import fs from 'fs'
import path from 'path'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private logLevel: LogLevel
  private logFile?: string

  constructor() {
    this.logLevel = this.getLogLevel()
    this.logFile = process.env.LOG_FILE
    this.ensureLogDirectory()
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase() || 'info'
    switch (level) {
      case 'error':
        return LogLevel.ERROR
      case 'warn':
        return LogLevel.WARN
      case 'info':
        return LogLevel.INFO
      case 'debug':
        return LogLevel.DEBUG
      default:
        return LogLevel.INFO
    }
  }

  private ensureLogDirectory() {
    if (this.logFile) {
      const logDir = path.dirname(this.logFile)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`
  }

  private writeLog(level: string, message: string, meta?: any) {
    const formattedMessage = this.formatMessage(level, message, meta)
    
    // Console output
    console.log(formattedMessage)
    
    // File output
    if (this.logFile) {
      fs.appendFileSync(this.logFile, formattedMessage + '\n')
    }
  }

  error(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.ERROR) {
      this.writeLog('error', message, meta)
    }
  }

  warn(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.WARN) {
      this.writeLog('warn', message, meta)
    }
  }

  info(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.INFO) {
      this.writeLog('info', message, meta)
    }
  }

  debug(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.writeLog('debug', message, meta)
    }
  }
}

export default new Logger()