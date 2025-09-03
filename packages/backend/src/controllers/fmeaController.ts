import { Request, Response } from 'express'
import { PrismaClient } from '../generated/client'
import FmeaCalculationService from '../services/fmeaCalculationService'
import { ApiResponse, PaginatedResponse } from '../types/api'
import logger from '../utils/logger'

const prisma = new PrismaClient()
const fmeaCalcService = new FmeaCalculationService(prisma)

export interface CreateFmeaRequest {
  projectId?: string
  processFlowId?: string
  partId?: string
  fmeaNumber: string
  title: string
  description?: string
  fmeaType?: 'PROCESS' | 'DESIGN' | 'SYSTEM'
  revision?: string
  severityThreshold?: number
  occurrenceThreshold?: number
  detectionThreshold?: number
  rpnThreshold?: number
  analysisDate?: string
  dueDate?: string
  teamLeaderId?: string
}

export interface UpdateFmeaRequest extends Partial<CreateFmeaRequest> {}

export interface FmeaQueryParams {
  page?: string
  limit?: string
  search?: string
  status?: string
  fmeaType?: string
  projectId?: string
  processFlowId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Get all FMEAs with filtering and pagination
 */
export const getFmeas = async (req: Request<{}, {}, {}, FmeaQueryParams>, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      status,
      fmeaType,
      projectId,
      processFlowId,
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
        { fmeaNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) where.status = status
    if (fmeaType) where.fmeaType = fmeaType
    if (projectId) where.projectId = projectId
    if (processFlowId) where.processFlowId = processFlowId

    // Get total count
    const total = await prisma.fmea.count({ where })

    // Get FMEAs with related data
    const fmeas = await prisma.fmea.findMany({
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
        teamLeader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            failureModes: true,
            teamMembers: true
          }
        }
      }
    })

    // Calculate metrics for each FMEA
    const fmeasWithMetrics = await Promise.all(
      fmeas.map(async (fmea) => {
        const metrics = await fmeaCalcService.calculateFmeaMetrics(fmea.id)
        return {
          ...fmea,
          metrics
        }
      })
    )

    const response: PaginatedResponse<any> = {
      success: true,
      data: fmeasWithMetrics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching FMEAs:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_FMEAS_ERROR',
        message: 'Failed to fetch FMEAs'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get a single FMEA by ID
 */
export const getFmeaById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    const fmea = await prisma.fmea.findUnique({
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
        teamLeader: {
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
        failureModes: {
          include: {
            effects: true,
            causes: {
              include: {
                controls: true
              }
            },
            actionItems: {
              include: {
                assignedTo: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            processStepLinks: {
              include: {
                processStep: {
                  select: {
                    id: true,
                    stepNumber: true,
                    name: true,
                    stepType: true
                  }
                }
              }
            }
          },
          orderBy: { sequenceNumber: 'asc' }
        }
      }
    })

    if (!fmea) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'FMEA_NOT_FOUND',
          message: 'FMEA not found'
        }
      }
      return res.status(404).json(response)
    }

    // Calculate metrics
    const metrics = await fmeaCalcService.calculateFmeaMetrics(fmea.id)
    
    // Calculate RPN for each failure mode
    const failureModesWithRpn = await Promise.all(
      fmea.failureModes.map(async (fm) => {
        const rpnCalc = await fmeaCalcService.calculateRpn(fm.id)
        const rpnAnalysis = await fmeaCalcService.analyzeRpn(fm.id, fmea.id)
        return {
          ...fm,
          currentRpn: rpnCalc.rpn,
          riskLevel: rpnAnalysis.riskLevel,
          requiresAction: rpnAnalysis.requiresAction
        }
      })
    )

    const fmeaWithMetrics = {
      ...fmea,
      failureModes: failureModesWithRpn,
      metrics
    }

    const response: ApiResponse<typeof fmeaWithMetrics> = {
      success: true,
      data: fmeaWithMetrics
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching FMEA:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_FMEA_ERROR',
        message: 'Failed to fetch FMEA'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create a new FMEA
 */
export const createFmea = async (req: Request<{}, {}, CreateFmeaRequest>, res: Response) => {
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
      partId,
      fmeaNumber,
      title,
      description,
      fmeaType = 'PROCESS',
      revision = '1.0',
      severityThreshold = 7,
      occurrenceThreshold = 4,
      detectionThreshold = 7,
      rpnThreshold = 100,
      analysisDate,
      dueDate,
      teamLeaderId
    } = req.body

    // Validate required fields
    if (!fmeaNumber || !title) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELDS', message: 'FMEA number and title are required' }
      })
    }

    // Check for duplicate FMEA number
    const existingFmea = await prisma.fmea.findUnique({
      where: { fmeaNumber }
    })

    if (existingFmea) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_FMEA_NUMBER', message: 'FMEA number already exists' }
      })
    }

    // Create FMEA
    const newFmea = await prisma.fmea.create({
      data: {
        projectId,
        processFlowId,
        partId,
        fmeaNumber,
        title,
        description,
        fmeaType,
        revision,
        severityThreshold,
        occurrenceThreshold,
        detectionThreshold,
        rpnThreshold,
        analysisDate: analysisDate ? new Date(analysisDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        teamLeaderId: teamLeaderId || userId,
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
        teamLeader: {
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
    await prisma.fmeaTeamMember.create({
      data: {
        fmeaId: newFmea.id,
        userId,
        role: 'TEAM_LEADER',
        expertiseArea: 'Process Engineering',
        responsibilities: 'Overall FMEA coordination and completion'
      }
    })

    const response: ApiResponse<typeof newFmea> = {
      success: true,
      data: newFmea
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating FMEA:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_FMEA_ERROR',
        message: 'Failed to create FMEA'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Update an FMEA
 */
export const updateFmea = async (req: Request<{ id: string }, {}, UpdateFmeaRequest>, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    // Check if FMEA exists
    const existingFmea = await prisma.fmea.findUnique({
      where: { id }
    })

    if (!existingFmea) {
      return res.status(404).json({
        success: false,
        error: { code: 'FMEA_NOT_FOUND', message: 'FMEA not found' }
      })
    }

    // Check for duplicate FMEA number if being updated
    if (req.body.fmeaNumber && req.body.fmeaNumber !== existingFmea.fmeaNumber) {
      const duplicateFmea = await prisma.fmea.findUnique({
        where: { fmeaNumber: req.body.fmeaNumber }
      })

      if (duplicateFmea) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_FMEA_NUMBER', message: 'FMEA number already exists' }
        })
      }
    }

    const updateData: any = { ...req.body, updatedById: userId }
    
    // Convert date strings to Date objects
    if (req.body.analysisDate) {
      updateData.analysisDate = new Date(req.body.analysisDate)
    }
    if (req.body.dueDate) {
      updateData.dueDate = new Date(req.body.dueDate)
    }

    const updatedFmea = await prisma.fmea.update({
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
        },
        teamLeader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    const response: ApiResponse<typeof updatedFmea> = {
      success: true,
      data: updatedFmea
    }

    res.json(response)
  } catch (error) {
    logger.error('Error updating FMEA:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_FMEA_ERROR',
        message: 'Failed to update FMEA'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Delete an FMEA
 */
export const deleteFmea = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    // Check if FMEA exists
    const existingFmea = await prisma.fmea.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            failureModes: true
          }
        }
      }
    })

    if (!existingFmea) {
      return res.status(404).json({
        success: false,
        error: { code: 'FMEA_NOT_FOUND', message: 'FMEA not found' }
      })
    }

    // Delete FMEA (cascade will handle related records)
    await prisma.fmea.delete({
      where: { id }
    })

    const response: ApiResponse<{ deleted: true }> = {
      success: true,
      data: { deleted: true }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error deleting FMEA:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DELETE_FMEA_ERROR',
        message: 'Failed to delete FMEA'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Auto-populate FMEA from process flow
 */
export const autoPopulateFmea = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id: fmeaId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    // Get FMEA with process flow
    const fmea = await prisma.fmea.findUnique({
      where: { id: fmeaId },
      include: {
        processFlow: true
      }
    })

    if (!fmea) {
      return res.status(404).json({
        success: false,
        error: { code: 'FMEA_NOT_FOUND', message: 'FMEA not found' }
      })
    }

    if (!fmea.processFlowId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_PROCESS_FLOW', message: 'FMEA must be linked to a process flow' }
      })
    }

    // Auto-populate from process flow
    const results = await fmeaCalcService.autoPopulateFromProcessFlow(
      fmeaId,
      fmea.processFlowId,
      userId
    )

    const response: ApiResponse<typeof results> = {
      success: true,
      data: results
    }

    res.json(response)
  } catch (error) {
    logger.error('Error auto-populating FMEA:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'AUTO_POPULATE_ERROR',
        message: 'Failed to auto-populate FMEA'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get FMEA metrics and analysis
 */
export const getFmeaMetrics = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    // Verify FMEA exists
    const fmea = await prisma.fmea.findUnique({
      where: { id }
    })

    if (!fmea) {
      return res.status(404).json({
        success: false,
        error: { code: 'FMEA_NOT_FOUND', message: 'FMEA not found' }
      })
    }

    const metrics = await fmeaCalcService.calculateFmeaMetrics(id)
    const validation = await fmeaCalcService.validateFmeaCompleteness(id)

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
    logger.error('Error getting FMEA metrics:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to calculate FMEA metrics'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Duplicate an FMEA
 */
export const duplicateFmea = async (req: Request<{ id: string }, {}, { name: string, fmeaNumber: string }>, res: Response) => {
  try {
    const { id } = req.params
    const { name, fmeaNumber } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    if (!name || !fmeaNumber) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Name and FMEA number are required' }
      })
    }

    // Check if new FMEA number already exists
    const existingFmea = await prisma.fmea.findUnique({
      where: { fmeaNumber }
    })

    if (existingFmea) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_FMEA_NUMBER', message: 'FMEA number already exists' }
      })
    }

    // Get source FMEA with all related data
    const sourceFmea = await prisma.fmea.findUnique({
      where: { id },
      include: {
        failureModes: {
          include: {
            effects: true,
            causes: {
              include: {
                controls: true
              }
            },
            actionItems: true
          }
        },
        teamMembers: true
      }
    })

    if (!sourceFmea) {
      return res.status(404).json({
        success: false,
        error: { code: 'FMEA_NOT_FOUND', message: 'Source FMEA not found' }
      })
    }

    // Create new FMEA
    const newFmea = await prisma.fmea.create({
      data: {
        projectId: sourceFmea.projectId,
        processFlowId: sourceFmea.processFlowId,
        partId: sourceFmea.partId,
        fmeaNumber,
        title: name,
        description: `Copy of ${sourceFmea.title}`,
        fmeaType: sourceFmea.fmeaType,
        revision: '1.0',
        status: 'DRAFT',
        severityThreshold: sourceFmea.severityThreshold,
        occurrenceThreshold: sourceFmea.occurrenceThreshold,
        detectionThreshold: sourceFmea.detectionThreshold,
        rpnThreshold: sourceFmea.rpnThreshold,
        teamLeaderId: userId,
        createdById: userId,
        updatedById: userId
      }
    })

    // Add creator as team member
    await prisma.fmeaTeamMember.create({
      data: {
        fmeaId: newFmea.id,
        userId,
        role: 'TEAM_LEADER',
        expertiseArea: 'Process Engineering',
        responsibilities: 'Overall FMEA coordination and completion'
      }
    })

    const response: ApiResponse<typeof newFmea> = {
      success: true,
      data: newFmea
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error duplicating FMEA:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DUPLICATE_FMEA_ERROR',
        message: 'Failed to duplicate FMEA'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  getFmeas,
  getFmeaById,
  createFmea,
  updateFmea,
  deleteFmea,
  autoPopulateFmea,
  getFmeaMetrics,
  duplicateFmea
}