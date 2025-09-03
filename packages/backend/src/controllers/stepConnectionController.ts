import { Response } from 'express'
import { PrismaClient } from '../generated/client'
import { AuthenticatedRequest } from '../middleware/auth'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export const getStepConnections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId } = req.params

    const connections = await prisma.stepConnection.findMany({
      where: {
        processFlowId,
      },
      include: {
        sourceStep: {
          select: {
            id: true,
            name: true,
            stepNumber: true,
            stepType: true,
          },
        },
        targetStep: {
          select: {
            id: true,
            name: true,
            stepNumber: true,
            stepType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    res.json({
      success: true,
      data: connections,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting step connections:', error)
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

export const createStepConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId } = req.params
    const { sourceStepId, targetStepId } = req.body

    // Verify both steps exist in the specified process flow
    const [sourceStep, targetStep] = await Promise.all([
      prisma.processStep.findFirst({
        where: { id: sourceStepId, processFlowId },
      }),
      prisma.processStep.findFirst({
        where: { id: targetStepId, processFlowId },
      }),
    ])

    if (!sourceStep) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Source step not found in this process flow',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    if (!targetStep) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Target step not found in this process flow',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Prevent self-connections
    if (sourceStepId === targetStepId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot create connection from step to itself',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Check for duplicate connection
    const existingConnection = await prisma.stepConnection.findFirst({
      where: {
        sourceStepId,
        targetStepId,
      },
    })

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Connection already exists between these steps',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const connection = await prisma.stepConnection.create({
      data: {
        processFlowId,
        ...req.body,
      },
      include: {
        sourceStep: {
          select: {
            id: true,
            name: true,
            stepNumber: true,
            stepType: true,
          },
        },
        targetStep: {
          select: {
            id: true,
            name: true,
            stepNumber: true,
            stepType: true,
          },
        },
      },
    })

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Step connection created: ${connection.id} in flow ${processFlowId} by ${req.user!.email}`)

    res.status(201).json({
      success: true,
      data: connection,
      message: 'Step connection created successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error creating step connection:', error)
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

export const updateStepConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId, connectionId } = req.params

    // Check if connection exists in the specified process flow
    const existingConnection = await prisma.stepConnection.findFirst({
      where: {
        id: connectionId,
        processFlowId,
      },
    })

    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Step connection not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const connection = await prisma.stepConnection.update({
      where: { id: connectionId },
      data: req.body,
      include: {
        sourceStep: {
          select: {
            id: true,
            name: true,
            stepNumber: true,
            stepType: true,
          },
        },
        targetStep: {
          select: {
            id: true,
            name: true,
            stepNumber: true,
            stepType: true,
          },
        },
      },
    })

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Step connection updated: ${connectionId} by ${req.user!.email}`)

    res.json({
      success: true,
      data: connection,
      message: 'Step connection updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating step connection:', error)
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

export const deleteStepConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId, connectionId } = req.params

    // Check if connection exists in the specified process flow
    const existingConnection = await prisma.stepConnection.findFirst({
      where: {
        id: connectionId,
        processFlowId,
      },
    })

    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Step connection not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    await prisma.stepConnection.delete({
      where: { id: connectionId },
    })

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Step connection deleted: ${connectionId} from flow ${processFlowId} by ${req.user!.email}`)

    res.json({
      success: true,
      message: 'Step connection deleted successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error deleting step connection:', error)
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

export const createBulkConnections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { processFlowId } = req.params
    const { connections } = req.body // Array of connection objects

    if (!Array.isArray(connections)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Connections array is required',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Verify all source and target steps exist in the process flow
    const stepIds = [
      ...new Set([
        ...connections.map(c => c.sourceStepId),
        ...connections.map(c => c.targetStepId),
      ]),
    ]

    const existingSteps = await prisma.processStep.findMany({
      where: {
        id: { in: stepIds },
        processFlowId,
      },
      select: { id: true },
    })

    const existingStepIds = new Set(existingSteps.map(s => s.id))
    const missingStepIds = stepIds.filter(id => !existingStepIds.has(id))

    if (missingStepIds.length > 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Steps not found in this process flow: ${missingStepIds.join(', ')}`,
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Create all connections in a transaction
    const createdConnections = await prisma.$transaction(
      connections.map(connection =>
        prisma.stepConnection.create({
          data: {
            processFlowId,
            ...connection,
          },
          include: {
            sourceStep: {
              select: {
                id: true,
                name: true,
                stepNumber: true,
                stepType: true,
              },
            },
            targetStep: {
              select: {
                id: true,
                name: true,
                stepNumber: true,
                stepType: true,
              },
            },
          },
        })
      )
    )

    // Update process flow updated timestamp
    await prisma.processFlow.update({
      where: { id: processFlowId },
      data: { updatedById: req.user!.id },
    })

    logger.info(`Bulk step connections created in flow ${processFlowId} by ${req.user!.email}`)

    res.status(201).json({
      success: true,
      data: createdConnections,
      message: 'Step connections created successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error creating bulk step connections:', error)
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