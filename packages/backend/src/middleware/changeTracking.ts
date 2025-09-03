import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '../generated/client'
import ChangeTrackingService from '../services/changeTrackingService'
import logger from '../utils/logger'

const prisma = new PrismaClient()
const changeTrackingService = new ChangeTrackingService(prisma)

interface ChangeTrackingRequest extends Request {
  changeTracking?: {
    entityType: string
    projectId: string
    trackChanges: boolean
    originalData?: any
  }
}

/**
 * Middleware to initialize change tracking for an entity
 */
export const initializeChangeTracking = (
  entityType: string,
  getProjectId: (req: Request) => string | Promise<string>,
  getEntityId?: (req: Request) => string
) => {
  return async (req: ChangeTrackingRequest, res: Response, next: NextFunction) => {
    try {
      // Only track changes for non-GET requests
      if (req.method === 'GET') {
        return next()
      }

      const projectId = typeof getProjectId === 'function' 
        ? await getProjectId(req)
        : getProjectId

      req.changeTracking = {
        entityType,
        projectId,
        trackChanges: true
      }

      // For UPDATE operations, capture original data
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const entityId = getEntityId ? getEntityId(req) : req.params.id
        if (entityId) {
          req.changeTracking.originalData = await getOriginalEntityData(entityType, entityId)
        }
      }

      next()
    } catch (error) {
      logger.error('Error initializing change tracking:', error)
      next() // Continue without change tracking
    }
  }
}

/**
 * Middleware to finalize change tracking after successful operation
 */
export const finalizeChangeTracking = () => {
  return async (req: ChangeTrackingRequest, res: Response, next: NextFunction) => {
    try {
      // Capture the original response
      const originalSend = res.json
      let responseData: any = null

      res.json = function(body: any) {
        responseData = body
        return originalSend.call(this, body)
      }

      // Call the original middleware/route handler
      next()

      // After response is sent, track the change
      res.on('finish', async () => {
        if (req.changeTracking?.trackChanges && res.statusCode >= 200 && res.statusCode < 300) {
          await trackChangeEvent(req, responseData)
        }
      })
    } catch (error) {
      logger.error('Error setting up change tracking finalization:', error)
      next()
    }
  }
}

/**
 * Middleware specifically for tracking FMEA changes
 */
export const trackFmeaChanges = initializeChangeTracking(
  'FMEA',
  async (req) => {
    // Get project ID from FMEA
    const fmeaId = req.params.id || req.body.id
    if (fmeaId) {
      const fmea = await prisma.fmea.findUnique({
        where: { id: fmeaId },
        select: { projectId: true }
      })
      return fmea?.projectId || ''
    }
    return req.body.projectId || ''
  }
)

/**
 * Middleware for tracking process flow changes
 */
export const trackProcessFlowChanges = initializeChangeTracking(
  'PROCESS_FLOW',
  async (req) => {
    const processFlowId = req.params.id || req.body.id
    if (processFlowId) {
      const processFlow = await prisma.processFlow.findUnique({
        where: { id: processFlowId },
        select: { projectId: true }
      })
      return processFlow?.projectId || ''
    }
    return req.body.projectId || ''
  }
)

/**
 * Middleware for tracking process step changes
 */
export const trackProcessStepChanges = initializeChangeTracking(
  'PROCESS_STEP',
  async (req) => {
    const processStepId = req.params.id || req.body.id
    if (processStepId) {
      const processStep = await prisma.processStep.findUnique({
        where: { id: processStepId },
        include: { processFlow: { select: { projectId: true } } }
      })
      return processStep?.processFlow?.projectId || ''
    }
    
    // For new process steps, get project ID from process flow
    if (req.body.processFlowId) {
      const processFlow = await prisma.processFlow.findUnique({
        where: { id: req.body.processFlowId },
        select: { projectId: true }
      })
      return processFlow?.projectId || ''
    }
    
    return ''
  }
)

/**
 * Middleware for tracking failure mode changes
 */
export const trackFailureModeChanges = initializeChangeTracking(
  'FAILURE_MODE',
  async (req) => {
    const failureModeId = req.params.id || req.body.id
    if (failureModeId) {
      const failureMode = await prisma.failureMode.findUnique({
        where: { id: failureModeId },
        include: { fmea: { select: { projectId: true } } }
      })
      return failureMode?.fmea?.projectId || ''
    }
    
    // For new failure modes, get project ID from FMEA
    if (req.body.fmeaId) {
      const fmea = await prisma.fmea.findUnique({
        where: { id: req.body.fmeaId },
        select: { projectId: true }
      })
      return fmea?.projectId || ''
    }
    
    return ''
  }
)

/**
 * Middleware for tracking control plan changes
 */
export const trackControlPlanChanges = initializeChangeTracking(
  'CONTROL_PLAN',
  async (req) => {
    const controlPlanId = req.params.id || req.body.id
    if (controlPlanId) {
      const controlPlan = await prisma.controlPlan.findUnique({
        where: { id: controlPlanId },
        select: { projectId: true }
      })
      return controlPlan?.projectId || ''
    }
    return req.body.projectId || ''
  }
)

/**
 * Generic middleware for entities that have direct project relationship
 */
export const trackProjectEntityChanges = (entityType: string) => {
  return initializeChangeTracking(
    entityType,
    (req) => req.body.projectId || req.params.projectId || ''
  )
}

/**
 * Track the actual change event
 */
async function trackChangeEvent(req: ChangeTrackingRequest, responseData: any): Promise<void> {
  try {
    if (!req.changeTracking || !req.user?.id) return

    const { entityType, projectId, originalData } = req.changeTracking
    const userId = req.user.id

    // Determine change type based on HTTP method
    let changeType: string
    switch (req.method) {
      case 'POST':
        changeType = 'CREATE'
        break
      case 'PUT':
      case 'PATCH':
        changeType = 'UPDATE'
        break
      case 'DELETE':
        changeType = 'DELETE'
        break
      default:
        return // Don't track other methods
    }

    // Extract entity ID from response or request
    const entityId = responseData?.data?.id || req.params.id || req.body.id

    if (!entityId) {
      logger.warn('No entity ID found for change tracking')
      return
    }

    // Get new values from response or request body
    let newValues: any = null
    if (changeType === 'CREATE' || changeType === 'UPDATE') {
      newValues = responseData?.data || req.body
    }

    // Track the change
    await changeTrackingService.trackChange(
      projectId,
      entityType,
      entityId,
      changeType,
      originalData,
      newValues,
      userId
    )

    logger.info(`Change tracked: ${changeType} ${entityType} ${entityId} by user ${userId}`)
  } catch (error) {
    logger.error('Error tracking change event:', error)
    // Don't throw - we don't want to break the main operation
  }
}

/**
 * Get original entity data for comparison
 */
async function getOriginalEntityData(entityType: string, entityId: string): Promise<any> {
  try {
    switch (entityType) {
      case 'FMEA':
        return await prisma.fmea.findUnique({
          where: { id: entityId },
          include: {
            failureModes: {
              include: {
                effects: true,
                causes: {
                  include: { controls: true }
                },
                actionItems: true
              }
            },
            teamMembers: true
          }
        })

      case 'PROCESS_FLOW':
        return await prisma.processFlow.findUnique({
          where: { id: entityId },
          include: {
            processSteps: true,
            stepConnections: true
          }
        })

      case 'PROCESS_STEP':
        return await prisma.processStep.findUnique({
          where: { id: entityId },
          include: {
            resources: true,
            controlPoints: true,
            inputs: true,
            outputs: true
          }
        })

      case 'FAILURE_MODE':
        return await prisma.failureMode.findUnique({
          where: { id: entityId },
          include: {
            effects: true,
            causes: {
              include: { controls: true }
            },
            actionItems: true
          }
        })

      case 'CONTROL_PLAN':
        return await prisma.controlPlan.findUnique({
          where: { id: entityId },
          include: {
            controlPlanItems: true,
            teamMembers: true
          }
        })

      case 'CONTROL_ITEM':
        return await prisma.controlPlanItem.findUnique({
          where: { id: entityId },
          include: {
            controlMethods: true,
            measurementEquipment: true
          }
        })

      default:
        logger.warn(`Unknown entity type for original data retrieval: ${entityType}`)
        return null
    }
  } catch (error) {
    logger.error(`Error getting original data for ${entityType} ${entityId}:`, error)
    return null
  }
}

/**
 * Middleware to skip change tracking (for bulk operations, etc.)
 */
export const skipChangeTracking = () => {
  return (req: ChangeTrackingRequest, res: Response, next: NextFunction) => {
    if (req.changeTracking) {
      req.changeTracking.trackChanges = false
    }
    next()
  }
}

/**
 * Middleware to set batch ID for related changes
 */
export const setBatchId = (batchId: string) => {
  return (req: ChangeTrackingRequest, res: Response, next: NextFunction) => {
    if (req.changeTracking) {
      req.changeTracking.originalData = { ...req.changeTracking.originalData, batchId }
    }
    next()
  }
}

export default {
  initializeChangeTracking,
  finalizeChangeTracking,
  trackFmeaChanges,
  trackProcessFlowChanges,
  trackProcessStepChanges,
  trackFailureModeChanges,
  trackControlPlanChanges,
  trackProjectEntityChanges,
  skipChangeTracking,
  setBatchId
}