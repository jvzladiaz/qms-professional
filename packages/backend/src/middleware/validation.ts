import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'

export const validateRequest = (schema: {
  body?: Joi.ObjectSchema
  params?: Joi.ObjectSchema
  query?: Joi.ObjectSchema
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: any[] = []

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body)
      if (error) {
        validationErrors.push({
          location: 'body',
          messages: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            code: detail.type,
          })),
        })
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params)
      if (error) {
        validationErrors.push({
          location: 'params',
          messages: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            code: detail.type,
          })),
        })
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query)
      if (error) {
        validationErrors.push({
          location: 'query',
          messages: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            code: detail.type,
          })),
        })
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          details: validationErrors,
        },
        timestamp: new Date().toISOString(),
      })
    }

    next()
  }
}

// Common validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
})

export const uuidSchema = Joi.string().uuid().required()

export const processFlowCreateSchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  partId: Joi.string().uuid().optional(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  version: Joi.string().max(20).default('1.0'),
  status: Joi.string().valid('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED').default('DRAFT'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
  processType: Joi.string().max(100).optional(),
  estimatedCycleTime: Joi.number().integer().min(0).optional(),
  taktTime: Joi.number().integer().min(0).optional(),
  canvasSettings: Joi.object().optional(),
})

export const processFlowUpdateSchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  partId: Joi.string().uuid().optional(),
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  version: Joi.string().max(20).optional(),
  status: Joi.string().valid('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED').optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  processType: Joi.string().max(100).optional(),
  estimatedCycleTime: Joi.number().integer().min(0).optional(),
  taktTime: Joi.number().integer().min(0).optional(),
  canvasSettings: Joi.object().optional(),
})

export const processStepCreateSchema = Joi.object({
  swimlaneId: Joi.string().uuid().optional(),
  stepNumber: Joi.number().integer().min(1).required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  stepType: Joi.string().valid('OPERATION', 'INSPECTION', 'TRANSPORT', 'DELAY', 'STORAGE', 'DECISION', 'START', 'END').required(),
  operationTime: Joi.number().integer().min(0).optional(),
  setupTime: Joi.number().integer().min(0).optional(),
  waitTime: Joi.number().integer().min(0).optional(),
  transportTime: Joi.number().integer().min(0).optional(),
  positionX: Joi.number().default(0),
  positionY: Joi.number().default(0),
  width: Joi.number().min(50).default(200),
  height: Joi.number().min(50).default(100),
  backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  borderColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  qualityRequirements: Joi.string().optional(),
  safetyRequirements: Joi.string().optional(),
  environmentalRequirements: Joi.string().optional(),
})

export const processStepUpdateSchema = Joi.object({
  swimlaneId: Joi.string().uuid().optional(),
  stepNumber: Joi.number().integer().min(1).optional(),
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  stepType: Joi.string().valid('OPERATION', 'INSPECTION', 'TRANSPORT', 'DELAY', 'STORAGE', 'DECISION', 'START', 'END').optional(),
  operationTime: Joi.number().integer().min(0).optional(),
  setupTime: Joi.number().integer().min(0).optional(),
  waitTime: Joi.number().integer().min(0).optional(),
  transportTime: Joi.number().integer().min(0).optional(),
  positionX: Joi.number().optional(),
  positionY: Joi.number().optional(),
  width: Joi.number().min(50).optional(),
  height: Joi.number().min(50).optional(),
  backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  borderColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  qualityRequirements: Joi.string().optional(),
  safetyRequirements: Joi.string().optional(),
  environmentalRequirements: Joi.string().optional(),
})

export const stepConnectionCreateSchema = Joi.object({
  sourceStepId: Joi.string().uuid().required(),
  targetStepId: Joi.string().uuid().required(),
  connectionType: Joi.string().valid('default', 'conditional', 'parallel').default('default'),
  conditionText: Joi.string().max(500).optional(),
  label: Joi.string().max(255).optional(),
  strokeColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#000000'),
  strokeWidth: Joi.number().min(0.5).max(10).default(2),
  strokeStyle: Joi.string().valid('solid', 'dashed', 'dotted').default('solid'),
  animated: Joi.boolean().default(false),
})

export const projectCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  projectCode: Joi.string().min(1).max(50).required(),
  customer: Joi.string().max(255).optional(),
  productLine: Joi.string().max(255).optional(),
  status: Joi.string().valid('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED').default('DRAFT'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
  startDate: Joi.date().optional(),
  targetDate: Joi.date().min(Joi.ref('startDate')).optional(),
})

export const swimlaneCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  department: Joi.string().max(100).optional(),
  responsibleRole: Joi.string().max(100).optional(),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#E3F2FD'),
  positionOrder: Joi.number().integer().min(0).default(0),
})