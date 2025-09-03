import { Request, Response } from 'express'
import { PrismaClient } from '../generated/client'
import ControlPlanService from '../services/controlPlanService'
import { ApiResponse, PaginatedResponse } from '../types/api'
import logger from '../utils/logger'

const prisma = new PrismaClient()
const controlPlanService = new ControlPlanService(prisma)

export interface CreateControlPlanRequest {
  projectId?: string
  processFlowId?: string
  fmeaId?: string
  partId?: string
  controlPlanNumber: string
  title: string
  description?: string
  revision?: string
  controlPlanType?: 'PROTOTYPE' | 'PRE_PRODUCTION' | 'PRODUCTION'
  processOwner?: string
  effectiveDate?: string
  reviewDate?: string
}

export interface UpdateControlPlanRequest extends Partial<CreateControlPlanRequest> {}

export interface ControlPlanQueryParams {
  page?: string
  limit?: string
  search?: string
  status?: string
  controlPlanType?: string
  projectId?: string
  processFlowId?: string
  fmeaId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateControlPlanItemRequest {
  controlPlanId: string
  sequenceNumber?: number
  processStepId?: string
  operationNumber?: string
  operationDescription: string
  machineDeviceFixture?: string
  productCharacteristic?: string
  processCharacteristic?: string
  specificationRequirement?: string
  controlMethod: string
  measurementTechnique?: string
  sampleSizeFrequency: string
  controlType?: 'PREVENTION' | 'DETECTION'
  controlCategory?: 'MEASUREMENT' | 'VISUAL' | 'FUNCTIONAL' | 'ATTRIBUTE'
  responsiblePerson?: string
  reactionPlan?: string
  upperSpecLimit?: number
  lowerSpecLimit?: number
  targetValue?: number
  unit?: string
  measurementEquipmentId?: string
  frequencyId?: string
  notes?: string
}

/**
 * Get all control plans with filtering and pagination
 */
export const getControlPlans = async (req: Request<{}, {}, {}, ControlPlanQueryParams>, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      status,
      controlPlanType,
      projectId,
      processFlowId,
      fmeaId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { controlPlanNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) where.status = status
    if (controlPlanType) where.controlPlanType = controlPlanType
    if (projectId) where.projectId = projectId
    if (processFlowId) where.processFlowId = processFlowId
    if (fmeaId) where.fmeaId = fmeaId

    // Get total count
    const total = await prisma.controlPlan.count({ where })

    // Get control plans with related data
    const controlPlans = await prisma.controlPlan.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
            customer: true
          }
        },
        processFlow: {
          select: {
            id: true,
            name: true,
            version: true,
            processType: true
          }
        },
        fmea: {
          select: {
            id: true,
            fmeaNumber: true,
            title: true,
            revision: true
          }
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
            revision: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            controlPlanItems: true,
            teamMembers: true
          }
        }
      }
    })

    const response: PaginatedResponse<any> = {
      success: true,
      data: controlPlans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching control plans:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_CONTROL_PLANS_ERROR',
        message: 'Failed to fetch control plans'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get a single control plan by ID
 */
export const getControlPlanById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    const controlPlan = await prisma.controlPlan.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
            customer: true
          }
        },
        processFlow: {
          select: {
            id: true,
            name: true,
            version: true,
            processType: true,
            processSteps: {
              select: {
                id: true,
                stepNumber: true,
                name: true,
                stepType: true
              },
              orderBy: { stepNumber: 'asc' }
            }
          }
        },
        fmea: {
          select: {
            id: true,
            fmeaNumber: true,
            title: true,
            revision: true
          }
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
            revision: true,
            description: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                department: true
              }
            }
          }
        },
        controlPlanItems: {
          include: {
            processStep: {
              select: {
                id: true,
                stepNumber: true,
                name: true,
                stepType: true
              }
            },
            measurementEquipment: {
              select: {
                id: true,
                equipmentId: true,
                name: true,
                equipmentType: true,
                calibrationDue: true
              }
            },
            frequency: {
              select: {
                id: true,
                name: true,
                description: true,
                interval: true
              }
            },
            controlMethods: {
              include: {
                controlMethod: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    category: true
                  }
                }
              }
            }
          },
          orderBy: { sequenceNumber: 'asc' }
        },
        fmeaLinks: {
          include: {
            fmea: {
              select: {
                id: true,
                fmeaNumber: true,
                title: true
              }
            },
            failureMode: {
              select: {
                id: true,
                itemFunction: true,
                failureMode: true
              }
            },
            failureCause: {
              select: {
                id: true,
                causeDescription: true,
                causeCategory: true
              }
            },
            failureControl: {
              select: {
                id: true,
                controlDescription: true,
                controlType: true
              }
            }
          }
        }
      }
    })

    if (!controlPlan) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'CONTROL_PLAN_NOT_FOUND',
          message: 'Control plan not found'
        }
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse<typeof controlPlan> = {
      success: true,
      data: controlPlan
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching control plan:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_CONTROL_PLAN_ERROR',
        message: 'Failed to fetch control plan'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create a new control plan
 */
export const createControlPlan = async (req: Request<{}, {}, CreateControlPlanRequest>, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const {
      projectId,
      processFlowId,
      fmeaId,
      partId,
      controlPlanNumber,
      title,
      description,
      revision = '1.0',
      controlPlanType = 'PRODUCTION',
      processOwner,
      effectiveDate,
      reviewDate
    } = req.body

    // Validate required fields
    if (!controlPlanNumber || !title) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELDS', message: 'Control plan number and title are required' }
      })
    }

    // Check for duplicate control plan number
    const existingControlPlan = await prisma.controlPlan.findUnique({
      where: { controlPlanNumber }
    })

    if (existingControlPlan) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_CONTROL_PLAN_NUMBER', message: 'Control plan number already exists' }
      })
    }

    // Create control plan
    const newControlPlan = await prisma.controlPlan.create({
      data: {
        projectId,
        processFlowId,
        fmeaId,
        partId,
        controlPlanNumber,
        title,
        description,
        revision,
        controlPlanType,
        processOwner,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        reviewDate: reviewDate ? new Date(reviewDate) : null,
        createdById: userId,
        updatedById: userId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true
          }
        },
        processFlow: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        fmea: {
          select: {
            id: true,
            fmeaNumber: true,
            title: true
          }
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Add creator as team member
    await prisma.controlPlanTeamMember.create({
      data: {
        controlPlanId: newControlPlan.id,
        userId,
        role: 'CONTROL_PLAN_OWNER',
        responsibilities: 'Overall control plan development and maintenance'
      }
    })

    const response: ApiResponse<typeof newControlPlan> = {
      success: true,
      data: newControlPlan
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating control plan:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_CONTROL_PLAN_ERROR',
        message: 'Failed to create control plan'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Update a control plan
 */
export const updateControlPlan = async (req: Request<{ id: string }, {}, UpdateControlPlanRequest>, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    // Check if control plan exists
    const existingControlPlan = await prisma.controlPlan.findUnique({
      where: { id }
    })

    if (!existingControlPlan) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONTROL_PLAN_NOT_FOUND', message: 'Control plan not found' }
      })
    }

    // Check for duplicate control plan number if being updated
    if (req.body.controlPlanNumber && req.body.controlPlanNumber !== existingControlPlan.controlPlanNumber) {
      const duplicateControlPlan = await prisma.controlPlan.findUnique({
        where: { controlPlanNumber: req.body.controlPlanNumber }
      })

      if (duplicateControlPlan) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_CONTROL_PLAN_NUMBER', message: 'Control plan number already exists' }
        })
      }
    }

    const updateData: any = { ...req.body, updatedById: userId }
    
    // Convert date strings to Date objects
    if (req.body.effectiveDate) {
      updateData.effectiveDate = new Date(req.body.effectiveDate)
    }
    if (req.body.reviewDate) {
      updateData.reviewDate = new Date(req.body.reviewDate)
    }

    const updatedControlPlan = await prisma.controlPlan.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true
          }
        },
        processFlow: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        fmea: {
          select: {
            id: true,
            fmeaNumber: true,
            title: true
          }
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    const response: ApiResponse<typeof updatedControlPlan> = {
      success: true,
      data: updatedControlPlan
    }

    res.json(response)
  } catch (error) {
    logger.error('Error updating control plan:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_CONTROL_PLAN_ERROR',
        message: 'Failed to update control plan'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Delete a control plan
 */
export const deleteControlPlan = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    // Check if control plan exists
    const existingControlPlan = await prisma.controlPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            controlPlanItems: true
          }
        }
      }
    })

    if (!existingControlPlan) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONTROL_PLAN_NOT_FOUND', message: 'Control plan not found' }
      })
    }

    // Delete control plan (cascade will handle related records)
    await prisma.controlPlan.delete({
      where: { id }
    })

    const response: ApiResponse<{ deleted: true }> = {
      success: true,
      data: { deleted: true }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error deleting control plan:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DELETE_CONTROL_PLAN_ERROR',
        message: 'Failed to delete control plan'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create control plan item
 */
export const createControlPlanItem = async (req: Request<{}, {}, CreateControlPlanItemRequest>, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const {
      controlPlanId,
      sequenceNumber,
      processStepId,
      operationNumber,
      operationDescription,
      machineDeviceFixture,
      productCharacteristic,
      processCharacteristic,
      specificationRequirement,
      controlMethod,
      measurementTechnique,
      sampleSizeFrequency,
      controlType = 'DETECTION',
      controlCategory = 'MEASUREMENT',
      responsiblePerson,
      reactionPlan,
      upperSpecLimit,
      lowerSpecLimit,
      targetValue,
      unit,
      measurementEquipmentId,
      frequencyId,
      notes
    } = req.body

    // Validate required fields
    if (!controlPlanId || !operationDescription || !controlMethod || !sampleSizeFrequency) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELDS', message: 'Control plan ID, operation description, control method, and sample size/frequency are required' }
      })
    }

    // Get next sequence number if not provided
    let nextSequenceNumber = sequenceNumber
    if (!nextSequenceNumber) {
      const lastItem = await prisma.controlPlanItem.findFirst({
        where: { controlPlanId },
        orderBy: { sequenceNumber: 'desc' }
      })
      nextSequenceNumber = lastItem ? lastItem.sequenceNumber + 1 : 1
    }

    // Create control plan item
    const newItem = await prisma.controlPlanItem.create({
      data: {
        controlPlanId,
        sequenceNumber: nextSequenceNumber,
        processStepId,
        operationNumber,
        operationDescription,
        machineDeviceFixture,
        productCharacteristic,
        processCharacteristic,
        specificationRequirement,
        controlMethod,
        measurementTechnique,
        sampleSizeFrequency,
        controlType,
        controlCategory,
        responsiblePerson,
        reactionPlan,
        upperSpecLimit,
        lowerSpecLimit,
        targetValue,
        unit,
        measurementEquipmentId,
        frequencyId,
        notes
      },
      include: {
        processStep: {
          select: {
            id: true,
            stepNumber: true,
            name: true,
            stepType: true
          }
        },
        measurementEquipment: {
          select: {
            id: true,
            equipmentId: true,
            name: true,
            equipmentType: true
          }
        },
        frequency: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    const response: ApiResponse<typeof newItem> = {
      success: true,
      data: newItem
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating control plan item:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_CONTROL_PLAN_ITEM_ERROR',
        message: 'Failed to create control plan item'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get control plan items for a specific control plan
 */
export const getControlPlanItems = async (req: Request<{ controlPlanId: string }>, res: Response) => {
  try {
    const { controlPlanId } = req.params

    const items = await prisma.controlPlanItem.findMany({
      where: { controlPlanId },
      include: {
        processStep: {
          select: {
            id: true,
            stepNumber: true,
            name: true,
            stepType: true
          }
        },
        measurementEquipment: {
          select: {
            id: true,
            equipmentId: true,
            name: true,
            equipmentType: true,
            calibrationDue: true
          }
        },
        frequency: {
          select: {
            id: true,
            name: true,
            description: true,
            interval: true
          }
        },
        controlMethods: {
          include: {
            controlMethod: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { sequenceNumber: 'asc' }
    })

    const response: ApiResponse<typeof items> = {
      success: true,
      data: items
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching control plan items:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_CONTROL_PLAN_ITEMS_ERROR',
        message: 'Failed to fetch control plan items'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Auto-populate control plan from linked FMEA
 */
export const autoPopulateFromFmea = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id: controlPlanId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const results = await controlPlanService.autoPopulateFromFmea(controlPlanId, userId)

    const response: ApiResponse<typeof results> = {
      success: true,
      data: results
    }

    res.json(response)
  } catch (error) {
    logger.error('Error auto-populating control plan:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'AUTO_POPULATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to auto-populate control plan'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get control plan metrics and analysis
 */
export const getControlPlanMetrics = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    // Verify control plan exists
    const controlPlan = await prisma.controlPlan.findUnique({
      where: { id }
    })

    if (!controlPlan) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONTROL_PLAN_NOT_FOUND', message: 'Control plan not found' }
      })
    }

    const metrics = await controlPlanService.calculateControlPlanMetrics(id)
    const validation = await controlPlanService.validateControlPlanCompleteness(id)

    const response: ApiResponse<{
      metrics: typeof metrics
      validation: typeof validation
    }> = {
      success: true,
      data: {
        metrics,
        validation
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting control plan metrics:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to calculate control plan metrics'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Duplicate a control plan
 */
export const duplicateControlPlan = async (req: Request<{ id: string }, {}, { title: string, controlPlanNumber: string }>, res: Response) => {
  try {
    const { id } = req.params
    const { title, controlPlanNumber } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    if (!title || !controlPlanNumber) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Title and control plan number are required' }
      })
    }

    // Check if new control plan number already exists
    const existingControlPlan = await prisma.controlPlan.findUnique({
      where: { controlPlanNumber }
    })

    if (existingControlPlan) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_CONTROL_PLAN_NUMBER', message: 'Control plan number already exists' }
      })
    }

    // Get source control plan with all related data
    const sourceControlPlan = await prisma.controlPlan.findUnique({
      where: { id },
      include: {
        controlPlanItems: {
          include: {
            controlMethods: true
          }
        },
        teamMembers: true
      }
    })

    if (!sourceControlPlan) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONTROL_PLAN_NOT_FOUND', message: 'Source control plan not found' }
      })
    }

    // Create new control plan
    const newControlPlan = await prisma.controlPlan.create({
      data: {
        projectId: sourceControlPlan.projectId,
        processFlowId: sourceControlPlan.processFlowId,
        fmeaId: sourceControlPlan.fmeaId,
        partId: sourceControlPlan.partId,
        controlPlanNumber,
        title,
        description: `Copy of ${sourceControlPlan.title}`,
        revision: '1.0',
        status: 'DRAFT',
        controlPlanType: sourceControlPlan.controlPlanType,
        processOwner: sourceControlPlan.processOwner,
        createdById: userId,
        updatedById: userId
      }
    })

    // Copy control plan items
    for (const sourceItem of sourceControlPlan.controlPlanItems) {
      await prisma.controlPlanItem.create({
        data: {
          controlPlanId: newControlPlan.id,
          sequenceNumber: sourceItem.sequenceNumber,
          processStepId: sourceItem.processStepId,
          operationNumber: sourceItem.operationNumber,
          operationDescription: sourceItem.operationDescription,
          machineDeviceFixture: sourceItem.machineDeviceFixture,
          productCharacteristic: sourceItem.productCharacteristic,
          processCharacteristic: sourceItem.processCharacteristic,
          specificationRequirement: sourceItem.specificationRequirement,
          controlMethod: sourceItem.controlMethod,
          measurementTechnique: sourceItem.measurementTechnique,
          sampleSizeFrequency: sourceItem.sampleSizeFrequency,
          controlType: sourceItem.controlType,
          controlCategory: sourceItem.controlCategory,
          responsiblePerson: sourceItem.responsiblePerson,
          reactionPlan: sourceItem.reactionPlan,
          upperSpecLimit: sourceItem.upperSpecLimit,
          lowerSpecLimit: sourceItem.lowerSpecLimit,
          targetValue: sourceItem.targetValue,
          unit: sourceItem.unit,
          measurementEquipmentId: sourceItem.measurementEquipmentId,
          frequencyId: sourceItem.frequencyId,
          notes: sourceItem.notes
        }
      })
    }

    // Add creator as team member
    await prisma.controlPlanTeamMember.create({
      data: {
        controlPlanId: newControlPlan.id,
        userId,
        role: 'CONTROL_PLAN_OWNER',
        responsibilities: 'Overall control plan development and maintenance'
      }
    })

    const response: ApiResponse<typeof newControlPlan> = {
      success: true,
      data: newControlPlan
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error duplicating control plan:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DUPLICATE_CONTROL_PLAN_ERROR',
        message: 'Failed to duplicate control plan'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  getControlPlans,
  getControlPlanById,
  createControlPlan,
  updateControlPlan,
  deleteControlPlan,
  createControlPlanItem,
  getControlPlanItems,
  autoPopulateFromFmea,
  getControlPlanMetrics,
  duplicateControlPlan
}