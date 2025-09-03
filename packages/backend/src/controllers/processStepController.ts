import { Response } from 'express'
import { PrismaClient } from '../generated/client'
import { AuthenticatedRequest } from '../middleware/auth'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export const getProcessSteps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId } = req.params
    const { includeDetails = 'false' } = req.query

    const includeOptions = includeDetails === 'true' ? {
      swimlane: {
        select: {
          id: true,
          name: true,
          color: true,
          department: true,
          responsibleRole: true,
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
              hourlyRate: true,
            },
          },
        },
      },
      controlPoints: true,
      inputs: true,
      outputs: true,
      sourceConnections: {
        select: {
          id: true,
          targetStepId: true,
          label: true,
          connectionType: true,
          conditionText: true,
        },
      },
      targetConnections: {
        select: {
          id: true,
          sourceStepId: true,
          label: true,
          connectionType: true,
          conditionText: true,
        },
      },
    } : {}

    const processSteps = await prisma.processStep.findMany({
      where: {
        processFlowId,
      },
      include: includeOptions,
      orderBy: {
        stepNumber: 'asc',
      },
    })

    res.json({
      success: true,
      data: processSteps,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting process steps:', error)
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

export const getProcessStepById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId, stepId } = req.params

    const processStep = await prisma.processStep.findFirst({
      where: {
        id: stepId,
        processFlowId,
      },
      include: {
        swimlane: {
          select: {
            id: true,
            name: true,
            color: true,
            department: true,
            responsibleRole: true,
          },
        },
        resources: {
          include: {
            resource: {
              select: {
                id: true,
                name: true,
                resourceType: true,
                description: true,
                specification: true,
                manufacturer: true,
                model: true,
                location: true,
                hourlyRate: true,
              },
            },
          },
        },
        controlPoints: true,
        inputs: true,
        outputs: true,
        sourceConnections: {
          include: {
            targetStep: {
              select: {
                id: true,
                name: true,
                stepNumber: true,
              },
            },
          },
        },
        targetConnections: {
          include: {
            sourceStep: {
              select: {
                id: true,
                name: true,
                stepNumber: true,
              },
            },
          },
        },
      },
    })

    if (!processStep) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Process step not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: processStep,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting process step:', error)
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

export const createProcessStep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId } = req.params

    // Verify process flow exists
    const processFlow = await prisma.processFlow.findUnique({
      where: { id: processFlowId },
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

    // Check for duplicate step number
    const existingStep = await prisma.processStep.findFirst({
      where: {
        processFlowId,
        stepNumber: req.body.stepNumber,
      },
    })

    if (existingStep) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Step number already exists in this process flow',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const processStep = await prisma.processStep.create({
      data: {
        processFlowId,
        ...req.body,
      },
      include: {
        swimlane: {
          select: {
            id: true,
            name: true,
            color: true,
            department: true,
          },
        },
      },
    })

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Process step created: ${processStep.id} in flow ${processFlowId} by ${req.user!.email}`)

    res.status(201).json({
      success: true,
      data: processStep,
      message: 'Process step created successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error creating process step:', error)
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

export const updateProcessStep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId, stepId } = req.params

    // Check if step exists in the specified process flow
    const existingStep = await prisma.processStep.findFirst({
      where: {
        id: stepId,
        processFlowId,
      },
    })

    if (!existingStep) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Process step not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Check for duplicate step number (if step number is being updated)
    if (req.body.stepNumber && req.body.stepNumber !== existingStep.stepNumber) {
      const duplicateStep = await prisma.processStep.findFirst({
        where: {
          processFlowId,
          stepNumber: req.body.stepNumber,
          id: { not: stepId },
        },
      })

      if (duplicateStep) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Step number already exists in this process flow',
            status: 400,
          },
          timestamp: new Date().toISOString(),
        })
      }
    }

    const processStep = await prisma.processStep.update({
      where: { id: stepId },
      data: req.body,
      include: {
        swimlane: {
          select: {
            id: true,
            name: true,
            color: true,
            department: true,
          },
        },
      },
    })

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Process step updated: ${stepId} by ${req.user!.email}`)

    res.json({
      success: true,
      data: processStep,
      message: 'Process step updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating process step:', error)
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

export const deleteProcessStep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId, stepId } = req.params

    // Check if step exists in the specified process flow
    const existingStep = await prisma.processStep.findFirst({
      where: {
        id: stepId,
        processFlowId,
      },
      include: {
        _count: {
          select: {
            sourceConnections: true,
            targetConnections: true,
          },
        },
      },
    })

    if (!existingStep) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Process step not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Delete the step (connections will be cascade deleted)
    await prisma.processStep.delete({
      where: { id: stepId },
    })

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Process step deleted: ${stepId} from flow ${processFlowId} by ${req.user!.email}`)

    res.json({
      success: true,
      message: 'Process step deleted successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error deleting process step:', error)
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

export const updateProcessStepPositions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId } = req.params
    const { steps } = req.body // Array of { id, positionX, positionY }

    if (!Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Steps array is required',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Update all step positions in a transaction
    await prisma.$transaction(
      steps.map(step =>
        prisma.processStep.update({
          where: {
            id: step.id,
            processFlowId, // Ensure step belongs to this process flow
          },
          data: {
            positionX: step.positionX,
            positionY: step.positionY,
          },
        })
      )
    )

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Process step positions updated in flow ${processFlowId} by ${req.user!.email}`)

    res.json({
      success: true,
      message: 'Process step positions updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating process step positions:', error)
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