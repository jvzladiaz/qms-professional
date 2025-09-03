import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'
import { errorHandler } from '@/middleware/errorHandler'
import { notFoundHandler } from '@/middleware/notFoundHandler'

// Import route handlers
import projectRoutes from '@/routes/projects'
import processFlowRoutes from '@/routes/processFlows'
import processStepRoutes from '@/routes/processSteps'
import stepConnectionRoutes from '@/routes/stepConnections'
import swimlaneRoutes from '@/routes/swimlanes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
}))

app.use(compression())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
})

// API Routes
app.use('/api/projects', projectRoutes)
app.use('/api/process-flows', processFlowRoutes)
app.use('/api/process-flows/:processFlowId/steps', processStepRoutes)
app.use('/api/process-flows/:processFlowId/connections', stepConnectionRoutes)
app.use('/api/swimlanes', swimlaneRoutes)

// Legacy FMEA and Control Plan routes (placeholder)
app.use('/api/fmea', (req, res) => {
  res.json({
    message: 'FMEA API endpoint - Phase 2 implementation',
    data: [],
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/control-plan', (req, res) => {
  res.json({
    message: 'Control Plan API endpoint - Phase 2 implementation',
    data: [],
    timestamp: new Date().toISOString(),
  })
})

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...')
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`🚀 QMS Backend server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📋 API Documentation: http://localhost:${PORT}/api`)
  }
})