import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config()

// Import services and utilities
import { PrismaClient } from './generated/client'
import logger from './utils/logger'
import QMSIntegrationService from './services/qmsIntegrationService'
import ErrorHandlingService from './services/errorHandlingService'

// Import routes (you'll need to create these)
// import authRoutes from './routes/auth'
// import projectRoutes from './routes/projects'
// import fmeaRoutes from './routes/fmea'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 8000

// Initialize Prisma
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// Initialize Error Handling Service
const errorHandlingService = new ErrorHandlingService(prisma)

// Initialize QMS Integration Service
const qmsService = new QMSIntegrationService(httpServer, prisma)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    }
  }
}))

// CORS configuration
app.use(cors({
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
}))

// Basic middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'))
}

// Performance monitoring
app.use(errorHandlingService.createPerformanceMonitor())

// Rate limiting
app.use('/api/', errorHandlingService.createRateLimiter(15 * 60 * 1000, 100)) // 100 requests per 15 minutes

// Input sanitization
app.use(errorHandlingService.sanitizeInput)

// Static files (for uploads, reports, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const systemHealth = await qmsService.performSystemHealthCheck()
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: systemHealth.services,
      version: '5.0.0',
      features: {
        pdfGeneration: process.env.ENABLE_PDF_GENERATION === 'true',
        excelExport: process.env.ENABLE_EXCEL_EXPORT === 'true',
        advancedAnalytics: process.env.ENABLE_ADVANCED_ANALYTICS === 'true',
        notifications: process.env.ENABLE_NOTIFICATIONS === 'true',
        websockets: process.env.ENABLE_WEBSOCKETS === 'true'
      }
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: 'Health check failed'
    })
  }
})

// System status endpoint
app.get('/api/system/status', async (req, res) => {
  try {
    const capabilities = qmsService.getCapabilities()
    const systemStatus = await qmsService.performSystemHealthCheck()
    
    res.json({
      system: 'QMS Professional',
      version: '5.0.0',
      status: systemStatus.overall,
      capabilities,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    })
  } catch (error) {
    logger.error('System status check failed:', error)
    res.status(500).json({
      error: 'System status check failed',
      timestamp: new Date()
    })
  }
})

// API Documentation endpoint (placeholder)
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'QMS Professional API',
    version: '5.0.0',
    description: 'Comprehensive Quality Management System API with automotive compliance',
    endpoints: {
      health: 'GET /api/health',
      status: 'GET /api/system/status',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        logout: 'POST /api/auth/logout'
      },
      projects: {
        list: 'GET /api/projects',
        create: 'POST /api/projects',
        get: 'GET /api/projects/:id',
        update: 'PUT /api/projects/:id',
        delete: 'DELETE /api/projects/:id'
      },
      fmea: {
        list: 'GET /api/projects/:projectId/fmeas',
        create: 'POST /api/projects/:projectId/fmeas',
        export: 'GET /api/fmeas/:id/export'
      },
      reports: {
        pdf: 'GET /api/reports/pdf/:projectId',
        excel: 'GET /api/reports/excel/:projectId',
        executive: 'GET /api/reports/executive/:projectId'
      },
      analytics: {
        dashboard: 'GET /api/analytics/dashboard/:projectId',
        trends: 'GET /api/analytics/trends/:projectId',
        heatmap: 'GET /api/analytics/heatmap/:projectId'
      },
      compliance: {
        assess: 'POST /api/compliance/iatf16949/:projectId',
        report: 'GET /api/compliance/report/:projectId'
      }
    },
    features: [
      'AIAG-VDA Compliant FMEA',
      'IATF 16949 Compliance Assessment',
      'Professional PDF Reports',
      'Excel Import/Export',
      'Real-time Collaboration',
      'Advanced Analytics',
      'Change Management',
      'Risk Heat Maps',
      'Bulk Operations',
      'Notifications System'
    ]
  })
})

// Test endpoint for creating sample data
app.post('/api/test/setup', async (req, res) => {
  try {
    // Create a test user (if not exists)
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!existingUser) {
      const testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: '$2a$10$rQsqP0k/0GGV8p0QjXqQD.xzVh6L8vhWs4d4L4pOy4Xr5y6z7A8B2', // password: 'password123'
          role: 'ADMIN',
          isActive: true
        }
      })

      // Create a test project
      const testProject = await prisma.project.create({
        data: {
          name: 'Test Automotive Project',
          description: 'Sample project for testing QMS features',
          department: 'Quality Engineering',
          industry: 'AUTOMOTIVE',
          status: 'ACTIVE',
          createdById: testUser.id
        }
      })

      // Setup the project with QMS features
      await qmsService.setupProject(testProject.id, testUser.id)

      res.json({
        success: true,
        message: 'Test environment set up successfully',
        data: {
          user: { id: testUser.id, email: testUser.email, name: testUser.name },
          project: { id: testProject.id, name: testProject.name }
        }
      })
    } else {
      res.json({
        success: true,
        message: 'Test environment already exists',
        data: {
          user: { id: existingUser.id, email: existingUser.email, name: existingUser.name }
        }
      })
    }
  } catch (error) {
    logger.error('Test setup failed:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to set up test environment',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Mount API routes (uncomment when you create them)
// app.use('/api/auth', authRoutes)
// app.use('/api/projects', projectRoutes)
// app.use('/api/fmea', fmeaRoutes)

// Demo routes for testing without database
app.get('/api/process-flows', (req, res) => {
  res.json({
    data: [
      {
        id: "demo-flow-1",
        name: "Engine Assembly Process",
        description: "Main engine assembly line process flow",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { processSteps: 5, stepConnections: 4 }
      },
      {
        id: "demo-flow-2", 
        name: "Quality Control Process",
        description: "Quality inspection and testing process",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { processSteps: 3, stepConnections: 2 }
      }
    ],
    total: 2
  })
})

app.get('/api/process-flows/:id', (req, res) => {
  const { id } = req.params
  res.json({
    data: {
      id: id,
      name: id === "demo-flow-1" ? "Engine Assembly Process" : "Quality Control Process",
      description: id === "demo-flow-1" ? "Main engine assembly line process flow" : "Quality inspection and testing process",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      processSteps: [
        {
          id: `step-${id}-1`,
          name: "Start Process",
          type: "START",
          position: { x: 100, y: 100 }
        },
        {
          id: `step-${id}-2`, 
          name: "Main Operation",
          type: "OPERATION",
          position: { x: 300, y: 100 }
        }
      ],
      stepConnections: [
        {
          id: `conn-${id}-1`,
          source: `step-${id}-1`,
          target: `step-${id}-2`
        }
      ]
    }
  })
})

app.post('/api/process-flows', (req, res) => {
  res.json({
    data: {
      id: `demo-flow-${Date.now()}`,
      name: req.body.name || "New Process Flow",
      description: req.body.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { processSteps: 0, stepConnections: 0 }
    }
  })
})

app.get('/api/fmeas', (req, res) => {
  res.json({
    data: [
      {
        id: "demo-fmea-1",
        name: "Engine FMEA",
        description: "FMEA for engine assembly process",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    total: 1
  })
})

app.get('/api/fmeas/:id', (req, res) => {
  const { id } = req.params
  res.json({
    data: {
      id: id,
      name: "Engine FMEA",
      description: "FMEA for engine assembly process",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failureModes: [
        {
          id: `fm-${id}-1`,
          name: "Insufficient torque",
          potential_failure: "Bolt not properly tightened",
          potential_effects: "Component failure",
          severity: 8,
          potential_causes: "Incorrect tool calibration",
          occurrence: 4,
          current_controls: "Torque wrench calibration",
          detection: 3,
          rpn: 96
        }
      ]
    }
  })
})

app.post('/api/fmeas', (req, res) => {
  res.json({
    data: {
      id: `demo-fmea-${Date.now()}`,
      name: req.body.name || "New FMEA",
      description: req.body.description || "",
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
})

// Additional endpoints that might be needed
app.put('/api/process-flows/:id', (req, res) => {
  res.json({
    data: {
      id: req.params.id,
      ...req.body,
      updatedAt: new Date().toISOString()
    }
  })
})

app.put('/api/fmeas/:id', (req, res) => {
  res.json({
    data: {
      id: req.params.id,
      ...req.body,
      updatedAt: new Date().toISOString()
    }
  })
})

// Projects endpoint if needed
app.get('/api/projects', (req, res) => {
  res.json({
    data: [
      {
        id: "demo-project-1",
        name: "Automotive Engine Project",
        description: "Main engine assembly project",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    total: 1
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date()
  })
})

// Global error handler
app.use(errorHandlingService.globalErrorHandler)

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`)
  
  httpServer.close(async () => {
    logger.info('HTTP server closed')
    
    try {
      await qmsService.shutdown()
      await prisma.$disconnect()
      logger.info('QMS services shut down complete')
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown:', error)
      process.exit(1)
    }
  })

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 30000)
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

// Start server
httpServer.listen(PORT, () => {
  logger.info(`🚀 QMS Professional System starting...`)
  logger.info(`📡 Server running on http://localhost:${PORT}`)
  logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`)
  logger.info(`📊 System status: http://localhost:${PORT}/api/system/status`)
  logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`)
  logger.info(`🧪 Test setup: POST http://localhost:${PORT}/api/test/setup`)
  logger.info(`🌟 Environment: ${process.env.NODE_ENV}`)
  logger.info(`🎯 Features enabled:`)
  logger.info(`   - PDF Generation: ${process.env.ENABLE_PDF_GENERATION === 'true' ? '✅' : '❌'}`)
  logger.info(`   - Excel Export: ${process.env.ENABLE_EXCEL_EXPORT === 'true' ? '✅' : '❌'}`)
  logger.info(`   - Advanced Analytics: ${process.env.ENABLE_ADVANCED_ANALYTICS === 'true' ? '✅' : '❌'}`)
  logger.info(`   - Notifications: ${process.env.ENABLE_NOTIFICATIONS === 'true' ? '✅' : '❌'}`)
  logger.info(`   - WebSockets: ${process.env.ENABLE_WEBSOCKETS === 'true' ? '✅' : '❌'}`)
  
  console.log('\n🎉 QMS Professional System is ready for testing!')
  console.log('📖 Check the README.md for testing instructions')
})

export default app