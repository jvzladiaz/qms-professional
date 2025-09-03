import { Response } from 'express'
import { PrismaClient } from '../generated/client'
import { AuthenticatedRequest } from '../middleware/auth'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export const getProcessFlows = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      search,
      status,
      priority,
      projectId,
    } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { processType: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (projectId) {
      where.projectId = projectId as string
    }

    // Get process flows with counts
    const [processFlows, total] = await Promise.all([
      prisma.processFlow.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc',
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              projectCode: true,
              customer: true,
            },
          },
          part: {
            select: {
              id: true,
              partNumber: true,
              name: true,
              revision: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              processSteps: true,
              stepConnections: true,
            },
          },
        },
      }),
      prisma.processFlow.count({ where }),
    ])

    const totalPages = Math.ceil(total / take)

    res.json({
      success: true,
      data: processFlows,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting process flows:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        status: 500,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

export const getProcessFlowById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const processFlow = await prisma.processFlow.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
            customer: true,
            productLine: true,
          },
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
            revision: true,
            description: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        processSteps: {
          include: {
            swimlane: {
              select: {
                id: true,
                name: true,
                color: true,
                department: true,
              },
            },
            resources: {
              include: {
                resource: {
                  select: {
                    id: true,
                    name: true,
                    resourceType: true,
                    specification: true,
                  },
                },
              },
            },
            controlPoints: {
              select: {
                id: true,
                name: true,
                controlType: true,
                specification: true,
              },
            },
            inputs: {
              select: {
                id: true,
                name: true,
                specification: true,
                isCritical: true,
              },
            },
            outputs: {
              select: {
                id: true,
                name: true,
                specification: true,
                qualityCharacteristic: true,
              },
            },
          },
          orderBy: {
            stepNumber: 'asc',
          },
        },
        stepConnections: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        approvals: {
          include: {
            approverUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            approvalLevel: 'asc',
          },
        },
      },
    })

    if (!processFlow) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Process flow not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: processFlow,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting process flow:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        status: 500,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

export const createProcessFlow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const processFlow = await prisma.processFlow.create({
      data: {
        ...req.body,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    logger.info(`Process flow created: ${processFlow.id} by ${req.user!.email}`)

    res.status(201).json({
      success: true,
      data: processFlow,
      message: 'Process flow created successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error creating process flow:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        status: 500,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

export const updateProcessFlow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if process flow exists
    const existingProcessFlow = await prisma.processFlow.findUnique({
      where: { id },
    })

    if (!existingProcessFlow) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Process flow not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const processFlow = await prisma.processFlow.update({
      where: { id },
      data: {
        ...req.body,
        updatedById: userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    logger.info(`Process flow updated: ${processFlow.id} by ${req.user!.email}`)

    res.json({
      success: true,
      data: processFlow,
      message: 'Process flow updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating process flow:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        status: 500,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

export const deleteProcessFlow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if process flow exists
    const existingProcessFlow = await prisma.processFlow.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            processSteps: true,
          },
        },
      },
    })

    if (!existingProcessFlow) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Process flow not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    await prisma.processFlow.delete({
      where: { id },
    })

    logger.info(`Process flow deleted: ${id} by ${req.user!.email}`)

    res.json({
      success: true,
      message: 'Process flow deleted successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error deleting process flow:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        status: 500,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

export const duplicateProcessFlow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name: newName } = req.body
    const userId = req.user!.id

    // Get the original process flow with all related data
    const originalFlow = await prisma.processFlow.findUnique({
      where: { id },
      include: {
        processSteps: {
          include: {
            resources: true,
            controlPoints: true,
            inputs: true,
            outputs: true,
          },
        },
        stepConnections: true,
      },
    })

    if (!originalFlow) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Process flow not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Create new process flow with duplicated data
    const newProcessFlow = await prisma.processFlow.create({
      data: {
        projectId: originalFlow.projectId,
        partId: originalFlow.partId,
        name: newName || `${originalFlow.name} (Copy)`,
        description: originalFlow.description,
        version: '1.0',
        status: 'DRAFT',
        priority: originalFlow.priority,
        processType: originalFlow.processType,
        estimatedCycleTime: originalFlow.estimatedCycleTime,
        taktTime: originalFlow.taktTime,
        canvasSettings: originalFlow.canvasSettings,
        createdById: userId,
        updatedById: userId,
        processSteps: {
          create: originalFlow.processSteps.map(step => ({
            swimlaneId: step.swimlaneId,
            stepNumber: step.stepNumber,
            name: step.name,
            description: step.description,
            stepType: step.stepType,
            operationTime: step.operationTime,
            setupTime: step.setupTime,
            waitTime: step.waitTime,
            transportTime: step.transportTime,
            positionX: step.positionX,
            positionY: step.positionY,
            width: step.width,
            height: step.height,
            backgroundColor: step.backgroundColor,
            borderColor: step.borderColor,
            qualityRequirements: step.qualityRequirements,
            safetyRequirements: step.safetyRequirements,
            environmentalRequirements: step.environmentalRequirements,
            resources: {
              create: step.resources.map(resource => ({
                resourceId: resource.resourceId,
                quantityRequired: resource.quantityRequired,
                utilizationPercentage: resource.utilizationPercentage,
                setupRequired: resource.setupRequired,
                notes: resource.notes,
              })),
            },
            controlPoints: {
              create: step.controlPoints.map(cp => ({
                name: cp.name,
                controlType: cp.controlType,
                specification: cp.specification,
                measurementMethod: cp.measurementMethod,
                inspectionFrequency: cp.inspectionFrequency,
                sampleSize: cp.sampleSize,
                upperSpecLimit: cp.upperSpecLimit,
                lowerSpecLimit: cp.lowerSpecLimit,
                targetValue: cp.targetValue,
                unit: cp.unit,
                responsibleRole: cp.responsibleRole,
                reactionPlan: cp.reactionPlan,
              })),
            },
            inputs: {
              create: step.inputs.map(input => ({
                name: input.name,
                description: input.description,
                specification: input.specification,
                sourceLocation: input.sourceLocation,
                quantityRequired: input.quantityRequired,
                unit: input.unit,
                isCritical: input.isCritical,
                supplier: input.supplier,
                partNumber: input.partNumber,
              })),
            },
            outputs: {
              create: step.outputs.map(output => ({
                name: output.name,
                description: output.description,
                specification: output.specification,
                destinationLocation: output.destinationLocation,
                quantityProduced: output.quantityProduced,
                unit: output.unit,
                qualityCharacteristic: output.qualityCharacteristic,
                acceptanceCriteria: output.acceptanceCriteria,
              })),
            },
          })),
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
          },
        },
      },
    })

    logger.info(`Process flow duplicated: ${id} -> ${newProcessFlow.id} by ${req.user!.email}`)

    res.status(201).json({
      success: true,
      data: newProcessFlow,
      message: 'Process flow duplicated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error duplicating process flow:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        status: 500,
      },
      timestamp: new Date().toISOString(),
    })
  }
}