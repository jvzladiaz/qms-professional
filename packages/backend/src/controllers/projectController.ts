import { Response } from 'express'
import { PrismaClient } from '../generated/client'
import { AuthenticatedRequest } from '../middleware/auth'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export const getProjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      search,
      status,
      priority,
      customer,
    } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { projectCode: { contains: search as string, mode: 'insensitive' } },
        { customer: { contains: search as string, mode: 'insensitive' } },
        { productLine: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (customer) {
      where.customer = { contains: customer as string, mode: 'insensitive' }
    }

    // Get projects with counts
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc',
        },
        include: {
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
              processFlows: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ])

    const totalPages = Math.ceil(total / take)

    res.json({
      success: true,
      data: projects,
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
    logger.error('Error getting projects:', error)
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

export const getProjectById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
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
        processFlows: {
          select: {
            id: true,
            name: true,
            version: true,
            status: true,
            priority: true,
            processType: true,
            estimatedCycleTime: true,
            updatedAt: true,
            _count: {
              select: {
                processSteps: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting project:', error)
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

export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Check for duplicate project code
    const existingProject = await prisma.project.findUnique({
      where: { projectCode: req.body.projectCode },
    })

    if (existingProject) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Project code already exists',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const project = await prisma.project.create({
      data: {
        ...req.body,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    logger.info(`Project created: ${project.id} by ${req.user!.email}`)

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error creating project:', error)
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

export const updateProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Check for duplicate project code (if being updated)
    if (req.body.projectCode && req.body.projectCode !== existingProject.projectCode) {
      const duplicateProject = await prisma.project.findFirst({
        where: {
          projectCode: req.body.projectCode,
          id: { not: id },
        },
      })

      if (duplicateProject) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Project code already exists',
            status: 400,
          },
          timestamp: new Date().toISOString(),
        })
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...req.body,
        updatedById: userId,
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    logger.info(`Project updated: ${project.id} by ${req.user!.email}`)

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating project:', error)
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

export const deleteProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            processFlows: true,
          },
        },
      },
    })

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
          status: 404,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Check if project has process flows
    if (existingProject._count.processFlows > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete project with existing process flows',
          status: 400,
        },
        timestamp: new Date().toISOString(),
      })
    }

    await prisma.project.delete({
      where: { id },
    })

    logger.info(`Project deleted: ${id} by ${req.user!.email}`)

    res.json({
      success: true,
      message: 'Project deleted successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error deleting project:', error)
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