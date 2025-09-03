import { Response } from 'express'
import { PrismaClient } from '../generated/client'
import { AuthenticatedRequest } from '../middleware/auth'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export const getSwimlanes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'positionOrder',
      sortOrder = 'asc',
      search,
      department,
    } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { department: { contains: search as string, mode: 'insensitive' } },
        { responsibleRole: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (department) {
      where.department = { contains: department as string, mode: 'insensitive' }
    }

    // Get swimlanes with counts
    const [swimlanes, total] = await Promise.all([
      prisma.swimlane.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc',
        },
        include: {
          _count: {
            select: {
              processSteps: true,
            },
          },
        },
      }),
      prisma.swimlane.count({ where }),
    ])

    const totalPages = Math.ceil(total / take)

    res.json({
      success: true,
      data: swimlanes,
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
    logger.error('Error getting swimlanes:', error)
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

export const getSwimlaneById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const swimlane = await prisma.swimlane.findUnique({
      where: { id },
      include: {
        processSteps: {
          select: {
            id: true,
            name: true,
            stepNumber: true,
            stepType: true,
            processFlow: {
              select: {
                id: true,
                name: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    projectCode: true,
                  },
                },
              },
            },
          },
          orderBy: {
            stepNumber: 'asc',
          },
        },
        _count: {
          select: {
            processSteps: true,
          },
        },
      },
    })

    if (!swimlane) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Swimlane not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: swimlane,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting swimlane:', error)
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

export const createSwimlane = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const swimlane = await prisma.swimlane.create({
      data: req.body,
    })

    logger.info(`Swimlane created: ${swimlane.id} by ${req.user!.email}`)

    res.status(201).json({
      success: true,
      data: swimlane,
      message: 'Swimlane created successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error creating swimlane:', error)
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

export const updateSwimlane = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if swimlane exists
    const existingSwimlane = await prisma.swimlane.findUnique({
      where: { id },
    })

    if (!existingSwimlane) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Swimlane not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const swimlane = await prisma.swimlane.update({
      where: { id },
      data: req.body,
    })

    logger.info(`Swimlane updated: ${swimlane.id} by ${req.user!.email}`)

    res.json({
      success: true,
      data: swimlane,
      message: 'Swimlane updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating swimlane:', error)
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

export const deleteSwimlane = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if swimlane exists and has process steps
    const existingSwimlane = await prisma.swimlane.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            processSteps: true,
          },
        },
      },
    })

    if (!existingSwimlane) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Swimlane not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Check if swimlane has process steps
    if (existingSwimlane._count.processSteps > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete swimlane with existing process steps',
          status: 400,
          details: {
            stepCount: existingSwimlane._count.processSteps,
          },
        },
        timestamp: new Date().toISOString(),
      })
    }

    await prisma.swimlane.delete({
      where: { id },
    })

    logger.info(`Swimlane deleted: ${id} by ${req.user!.email}`)

    res.json({
      success: true,
      message: 'Swimlane deleted successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error deleting swimlane:', error)
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

export const updateSwimlaneOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { swimlanes } = req.body // Array of { id, positionOrder }

    if (!Array.isArray(swimlanes)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Swimlanes array is required',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Update all swimlane positions in a transaction
    await prisma.$transaction(
      swimlanes.map(swimlane =>
        prisma.swimlane.update({
          where: { id: swimlane.id },
          data: { positionOrder: swimlane.positionOrder },
        })
      )
    )

    logger.info(`Swimlane order updated by ${req.user!.email}`)

    res.json({
      success: true,
      message: 'Swimlane order updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating swimlane order:', error)
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