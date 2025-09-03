import { Request, Response, NextFunction } from 'express'
import { PrismaClient, PrismaClientKnownRequestError, PrismaClientUnknownRequestError, PrismaClientRustPanicError, PrismaClientInitializationError, PrismaClientValidationError } from '../generated/client'
import logger from '../utils/logger'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import cors from 'cors'

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    timestamp: Date
    requestId?: string
    stack?: string
  }
  support?: {
    contact: string
    documentationUrl: string
  }
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  services: {
    database: ServiceHealth
    redis: ServiceHealth
    fileSystem: ServiceHealth
    externalApis: ServiceHealth
  }
  metrics: {
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: number
    activeConnections: number
    responseTime: number
  }
  alerts: SystemAlert[]
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastCheck: Date
  responseTime?: number
  error?: string
  details?: any
}

interface SystemAlert {
  id: string
  type: 'WARNING' | 'ERROR' | 'CRITICAL'
  message: string
  timestamp: Date
  service?: string
  resolved?: boolean
}

interface ValidationError {
  field: string
  message: string
  value?: any
  code: string
}

class ErrorHandlingService {
  private prisma: PrismaClient
  private healthCheckInterval?: NodeJS.Timeout
  private systemHealth: SystemHealth
  private alerts: Map<string, SystemAlert> = new Map()

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.systemHealth = this.initializeSystemHealth()
    this.startHealthMonitoring()
  }

  /**
   * Global error handler middleware
   */
  globalErrorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const requestId = req.headers['x-request-id'] as string || this.generateRequestId()
    const timestamp = new Date()

    // Log error with context
    logger.error('Global error handler:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      requestId,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    // Determine error type and response
    const errorResponse = this.categorizeError(error, requestId, timestamp)

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      delete errorResponse.error.stack
      if (errorResponse.error.code === 'INTERNAL_SERVER_ERROR') {
        errorResponse.error.details = undefined
      }
    }

    // Set appropriate status code
    const statusCode = this.getStatusCode(error)
    
    // Send error response
    res.status(statusCode).json(errorResponse)

    // Create system alert for critical errors
    if (statusCode >= 500) {
      this.createSystemAlert('ERROR', error.message, 'application')
    }
  }

  /**
   * Async error handler wrapper
   */
  asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  }

  /**
   * Validation error handler
   */
  handleValidationError = (errors: ValidationError[]): ErrorResponse => {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          errors: errors,
          count: errors.length
        },
        timestamp: new Date()
      },
      support: {
        contact: 'support@qms.local',
        documentationUrl: '/api/docs'
      }
    }
  }

  /**
   * Database error handler
   */
  handleDatabaseError = (error: any, operation: string): ErrorResponse => {
    let message = 'Database operation failed'
    let code = 'DATABASE_ERROR'
    let details: any = {}

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          code = 'DUPLICATE_ENTRY'
          message = 'A record with this information already exists'
          details = {
            constraint: error.meta?.target,
            fields: error.meta?.target
          }
          break
        case 'P2025':
          code = 'RECORD_NOT_FOUND'
          message = 'The requested record was not found'
          break
        case 'P2003':
          code = 'FOREIGN_KEY_CONSTRAINT'
          message = 'Cannot complete operation due to data relationships'
          details = { field: error.meta?.field_name }
          break
        case 'P2004':
          code = 'CONSTRAINT_VIOLATION'
          message = 'Operation violates database constraints'
          break
        default:
          details = { prismaCode: error.code }
      }
    } else if (error instanceof PrismaClientValidationError) {
      code = 'DATABASE_VALIDATION_ERROR'
      message = 'Invalid data provided for database operation'
    } else if (error instanceof PrismaClientInitializationError) {
      code = 'DATABASE_CONNECTION_ERROR'
      message = 'Unable to connect to database'
      this.createSystemAlert('CRITICAL', 'Database connection failed', 'database')
    }

    return {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date()
      },
      support: {
        contact: 'support@qms.local',
        documentationUrl: '/api/docs/database-errors'
      }
    }
  }

  /**
   * Rate limiting configuration
   */
  createRateLimiter = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
    return rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later',
          timestamp: new Date()
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded:', {
          ip: req.ip,
          url: req.url,
          userAgent: req.get('User-Agent')
        })
        
        this.createSystemAlert('WARNING', `Rate limit exceeded for IP: ${req.ip}`, 'security')
        
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP, please try again later',
            timestamp: new Date()
          }
        })
      }
    })
  }

  /**
   * Security middleware configuration
   */
  getSecurityMiddleware = () => {
    return [
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        }
      }),
      cors({
        origin: (origin, callback) => {
          const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
          
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
          } else {
            logger.warn('CORS violation:', { origin })
            callback(new Error('Not allowed by CORS'))
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
      })
    ]
  }

  /**
   * Input sanitization middleware
   */
  sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Remove potential XSS and injection attempts
      this.sanitizeObject(req.body)
      this.sanitizeObject(req.query)
      this.sanitizeObject(req.params)
      
      next()
    } catch (error) {
      logger.error('Input sanitization error:', error)
      next(error)
    }
  }

  /**
   * System health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now()

    // Check database
    const databaseHealth = await this.checkDatabaseHealth()
    
    // Check file system
    const fileSystemHealth = await this.checkFileSystemHealth()
    
    // Check external APIs (if any)
    const externalApisHealth = await this.checkExternalApisHealth()

    // Collect system metrics
    const metrics = await this.collectSystemMetrics()
    
    const responseTime = Date.now() - startTime

    // Determine overall status
    const services = {
      database: databaseHealth,
      redis: { status: 'healthy' as const, lastCheck: new Date() }, // Placeholder
      fileSystem: fileSystemHealth,
      externalApis: externalApisHealth
    }

    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy').length
    const degradedServices = Object.values(services).filter(s => s.status === 'degraded').length

    let overallStatus: SystemHealth['status']
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedServices > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }

    this.systemHealth = {
      status: overallStatus,
      timestamp: new Date(),
      services,
      metrics: {
        ...metrics,
        responseTime
      },
      alerts: Array.from(this.alerts.values()).filter(alert => !alert.resolved)
    }

    return this.systemHealth
  }

  /**
   * Get current system health
   */
  getSystemHealth(): SystemHealth {
    return this.systemHealth
  }

  /**
   * Create backup and recovery procedures
   */
  async createBackup(type: 'FULL' | 'INCREMENTAL' = 'FULL'): Promise<{
    success: boolean
    backupId: string
    location: string
    size: number
    timestamp: Date
  }> {
    try {
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = new Date()

      logger.info(`Starting ${type} backup: ${backupId}`)

      // In a real implementation, this would:
      // 1. Create database backup
      // 2. Backup file uploads
      // 3. Backup configuration files
      // 4. Store in secure location (S3, etc.)

      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000))

      const backupInfo = {
        success: true,
        backupId,
        location: `/backups/${backupId}`,
        size: 1024 * 1024 * 100, // 100MB placeholder
        timestamp
      }

      // Log backup completion
      logger.info('Backup completed:', backupInfo)

      return backupInfo

    } catch (error) {
      logger.error('Backup failed:', error)
      this.createSystemAlert('ERROR', 'Backup operation failed', 'backup')
      
      return {
        success: false,
        backupId: '',
        location: '',
        size: 0,
        timestamp: new Date()
      }
    }
  }

  /**
   * Data validation utilities
   */
  validateRequiredFields = (data: any, requiredFields: string[]): ValidationError[] => {
    const errors: ValidationError[] = []

    for (const field of requiredFields) {
      if (!this.hasValue(data[field])) {
        errors.push({
          field,
          message: `${field} is required`,
          code: 'REQUIRED_FIELD_MISSING'
        })
      }
    }

    return errors
  }

  validateDataTypes = (data: any, schema: Record<string, string>): ValidationError[] => {
    const errors: ValidationError[] = []

    for (const [field, expectedType] of Object.entries(schema)) {
      if (data[field] !== undefined && !this.isValidType(data[field], expectedType)) {
        errors.push({
          field,
          message: `${field} must be of type ${expectedType}`,
          value: data[field],
          code: 'INVALID_DATA_TYPE'
        })
      }
    }

    return errors
  }

  validateBusinessRules = async (data: any, entityType: string): Promise<ValidationError[]> => {
    const errors: ValidationError[] = []

    switch (entityType) {
      case 'FMEA':
        if (data.severity && (data.severity < 1 || data.severity > 10)) {
          errors.push({
            field: 'severity',
            message: 'Severity must be between 1 and 10',
            value: data.severity,
            code: 'SEVERITY_OUT_OF_RANGE'
          })
        }
        break

      case 'ACTION_ITEM':
        if (data.targetDate && new Date(data.targetDate) < new Date()) {
          errors.push({
            field: 'targetDate',
            message: 'Target date cannot be in the past',
            value: data.targetDate,
            code: 'INVALID_TARGET_DATE'
          })
        }
        break
    }

    return errors
  }

  /**
   * Performance monitoring
   */
  createPerformanceMonitor = () => {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now()
      
      res.on('finish', () => {
        const duration = Date.now() - startTime
        
        logger.info('Request performance:', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        })

        // Alert on slow requests
        if (duration > 5000) { // 5 seconds
          this.createSystemAlert('WARNING', `Slow request detected: ${req.url} (${duration}ms)`, 'performance')
        }
      })

      next()
    }
  }

  /**
   * Private helper methods
   */
  private categorizeError(error: Error, requestId: string, timestamp: Date): ErrorResponse {
    let code = 'INTERNAL_SERVER_ERROR'
    let message = 'An internal server error occurred'

    if (error.name === 'ValidationError') {
      code = 'VALIDATION_ERROR'
      message = 'Request validation failed'
    } else if (error.name === 'UnauthorizedError') {
      code = 'UNAUTHORIZED'
      message = 'Authentication required'
    } else if (error.name === 'ForbiddenError') {
      code = 'FORBIDDEN'
      message = 'Insufficient permissions'
    } else if (error.message.includes('not found')) {
      code = 'NOT_FOUND'
      message = 'Requested resource not found'
    }

    return {
      success: false,
      error: {
        code,
        message,
        details: error.message,
        timestamp,
        requestId,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      support: {
        contact: 'support@qms.local',
        documentationUrl: '/api/docs'
      }
    }
  }

  private getStatusCode(error: Error): number {
    if (error.name === 'ValidationError') return 400
    if (error.name === 'UnauthorizedError') return 401
    if (error.name === 'ForbiddenError') return 403
    if (error.message.includes('not found')) return 404
    if (error.name === 'ConflictError') return 409
    return 500
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sanitizeObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS patterns
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
      } else if (typeof obj[key] === 'object') {
        this.sanitizeObject(obj[key])
      }
    }
  }

  private initializeSystemHealth(): SystemHealth {
    return {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: { status: 'healthy', lastCheck: new Date() },
        redis: { status: 'healthy', lastCheck: new Date() },
        fileSystem: { status: 'healthy', lastCheck: new Date() },
        externalApis: { status: 'healthy', lastCheck: new Date() }
      },
      metrics: {
        uptime: 0,
        memoryUsage: process.memoryUsage(),
        cpuUsage: 0,
        activeConnections: 0,
        responseTime: 0
      },
      alerts: []
    }
  }

  private startHealthMonitoring(): void {
    // Perform health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        logger.error('Health check failed:', error)
        this.createSystemAlert('ERROR', 'Health check failed', 'monitoring')
      }
    }, 5 * 60 * 1000)

    logger.info('Health monitoring started')
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      await this.prisma.$queryRaw`SELECT 1`
      
      return {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database check failed'
      }
    }
  }

  private async checkFileSystemHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      // Check if uploads directory is accessible
      const fs = require('fs')
      const path = require('path')
      
      const uploadsDir = path.join(process.cwd(), 'uploads')
      await fs.promises.access(uploadsDir, fs.constants.R_OK | fs.constants.W_OK)
      
      return {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'degraded',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: 'File system access limited'
      }
    }
  }

  private async checkExternalApisHealth(): Promise<ServiceHealth> {
    // Placeholder for external API health checks
    return {
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 0
    }
  }

  private async collectSystemMetrics() {
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    return {
      uptime,
      memoryUsage,
      cpuUsage: 0, // Would implement actual CPU monitoring
      activeConnections: 0, // Would track active connections
      responseTime: 0
    }
  }

  private createSystemAlert(type: SystemAlert['type'], message: string, service?: string): void {
    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      service,
      resolved: false
    }

    this.alerts.set(alert.id, alert)
    
    logger.warn('System alert created:', alert)

    // Auto-resolve warnings after 1 hour
    if (type === 'WARNING') {
      setTimeout(() => {
        const existingAlert = this.alerts.get(alert.id)
        if (existingAlert) {
          existingAlert.resolved = true
        }
      }, 60 * 60 * 1000)
    }
  }

  private hasValue(value: any): boolean {
    return value !== null && value !== undefined && value !== ''
  }

  private isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value))
      case 'array':
        return Array.isArray(value)
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value)
      default:
        return true
    }
  }

  /**
   * Cleanup resources
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    logger.info('Error handling service shutdown complete')
  }
}

export default ErrorHandlingService