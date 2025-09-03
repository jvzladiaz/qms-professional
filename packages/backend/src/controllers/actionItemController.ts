import { Request, Response } from 'express'
import { PrismaClient } from '../generated/client'
import FmeaCalculationService from '../services/fmeaCalculationService'
import { ApiResponse, PaginatedResponse } from '../types/api'
import logger from '../utils/logger'

const prisma = new PrismaClient()
const fmeaCalcService = new FmeaCalculationService(prisma)

export interface CreateActionItemRequest {
  failureModeId: string
  actionDescription: string
  actionType?: 'CORRECTIVE' | 'PREVENTIVE' | 'IMPROVEMENT'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  assignedToId?: string
  assignedDepartment?: string
  targetDate?: string
  estimatedCost?: number
  estimatedHours?: number
  targetSeverity?: number
  targetOccurrence?: number
  targetDetection?: number
}

export interface UpdateActionItemRequest extends Partial<CreateActionItemRequest> {
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  completedDate?: string
  actualCost?: number
  actualHours?: number
  completionNotes?: string
  verificationMethod?: string
  verificationDate?: string
  verifiedById?: string
  actualSeverity?: number
  actualOccurrence?: number
  actualDetection?: number
}

export interface ActionItemQueryParams {
  page?: string
  limit?: string
  status?: string
  priority?: string
  assignedToId?: string
  overdue?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Get all action items with filtering and pagination
 */
export const getActionItems = async (req: Request<{}, {}, {}, ActionItemQueryParams>, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      priority,
      assignedToId,
      overdue,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (status) where.status = status
    if (priority) where.priority = priority
    if (assignedToId) where.assignedToId = assignedToId
    
    if (overdue === 'true') {
      where.AND = [
        {
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        },
        {
          targetDate: {
            lt: new Date()
          }
        }
      ]
    }

    // Get total count
    const total = await prisma.fmeaActionItem.count({ where })

    // Get action items with related data
    const actionItems = await prisma.fmeaActionItem.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        failureMode: {
          select: {
            id: true,
            itemFunction: true,
            failureMode: true,
            sequenceNumber: true,
            fmea: {
              select: {
                id: true,
                fmeaNumber: true,
                title: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Calculate additional metrics
    const actionItemsWithMetrics = actionItems.map(item => {
      const isOverdue = item.targetDate && item.targetDate < new Date() && 
        (item.status === 'OPEN' || item.status === 'IN_PROGRESS')
      
      const daysOverdue = isOverdue && item.targetDate 
        ? Math.floor((Date.now() - item.targetDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const targetRpn = item.targetSeverity && item.targetOccurrence && item.targetDetection
        ? item.targetSeverity * item.targetOccurrence * item.targetDetection
        : null

      const actualRpn = item.actualSeverity && item.actualOccurrence && item.actualDetection
        ? item.actualSeverity * item.actualOccurrence * item.actualDetection
        : null

      return {
        ...item,
        isOverdue,
        daysOverdue,
        targetRpn,
        actualRpn,
        rpnImprovement: targetRpn && actualRpn ? targetRpn - actualRpn : null
      }
    })

    const response: PaginatedResponse<typeof actionItemsWithMetrics> = {
      success: true,
      data: actionItemsWithMetrics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching action items:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ACTION_ITEMS_ERROR',
        message: 'Failed to fetch action items'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get action items for a specific failure mode
 */
export const getActionItemsByFailureMode = async (req: Request<{ failureModeId: string }>, res: Response) => {
  try {
    const { failureModeId } = req.params

    const actionItems = await prisma.fmeaActionItem.findMany({
      where: { failureModeId },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { targetDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Calculate metrics for each action item
    const actionItemsWithMetrics = actionItems.map(item => {
      const isOverdue = item.targetDate && item.targetDate < new Date() && 
        (item.status === 'OPEN' || item.status === 'IN_PROGRESS')
      
      const daysOverdue = isOverdue && item.targetDate 
        ? Math.floor((Date.now() - item.targetDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const targetRpn = item.targetSeverity && item.targetOccurrence && item.targetDetection
        ? item.targetSeverity * item.targetOccurrence * item.targetDetection
        : null

      const actualRpn = item.actualSeverity && item.actualOccurrence && item.actualDetection
        ? item.actualSeverity * item.actualOccurrence * item.actualDetection
        : null

      return {
        ...item,
        isOverdue,
        daysOverdue,
        targetRpn,
        actualRpn,
        rpnImprovement: targetRpn && actualRpn ? targetRpn - actualRpn : null
      }
    })

    const response: ApiResponse<typeof actionItemsWithMetrics> = {
      success: true,
      data: actionItemsWithMetrics
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching action items by failure mode:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ACTION_ITEMS_ERROR',
        message: 'Failed to fetch action items'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get a single action item by ID
 */
export const getActionItemById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    const actionItem = await prisma.fmeaActionItem.findUnique({
      where: { id },
      include: {
        failureMode: {
          include: {
            fmea: {
              select: {
                id: true,
                fmeaNumber: true,
                title: true,
                rpnThreshold: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            role: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!actionItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'ACTION_ITEM_NOT_FOUND', message: 'Action item not found' }
      })
    }

    // Calculate current RPN for the failure mode
    const currentRpnCalc = await fmeaCalcService.calculateRpn(actionItem.failureModeId)

    // Calculate metrics
    const isOverdue = actionItem.targetDate && actionItem.targetDate < new Date() && 
      (actionItem.status === 'OPEN' || actionItem.status === 'IN_PROGRESS')
    
    const daysOverdue = isOverdue && actionItem.targetDate 
      ? Math.floor((Date.now() - actionItem.targetDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const targetRpn = actionItem.targetSeverity && actionItem.targetOccurrence && actionItem.targetDetection
      ? actionItem.targetSeverity * actionItem.targetOccurrence * actionItem.targetDetection
      : null

    const actualRpn = actionItem.actualSeverity && actionItem.actualOccurrence && actionItem.actualDetection
      ? actionItem.actualSeverity * actionItem.actualOccurrence * actionItem.actualDetection
      : null

    const actionItemWithMetrics = {
      ...actionItem,
      currentFailureModeRpn: currentRpnCalc.rpn,
      isOverdue,
      daysOverdue,
      targetRpn,
      actualRpn,
      rpnImprovement: targetRpn && actualRpn ? targetRpn - actualRpn : null
    }

    const response: ApiResponse<typeof actionItemWithMetrics> = {
      success: true,
      data: actionItemWithMetrics
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching action item:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ACTION_ITEM_ERROR',
        message: 'Failed to fetch action item'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create a new action item
 */
export const createActionItem = async (req: Request<{}, {}, CreateActionItemRequest>, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const {
      failureModeId,
      actionDescription,
      actionType = 'CORRECTIVE',
      priority = 'MEDIUM',
      assignedToId,
      assignedDepartment,
      targetDate,
      estimatedCost,
      estimatedHours,
      targetSeverity,
      targetOccurrence,
      targetDetection
    } = req.body

    // Validate required fields
    if (!failureModeId || !actionDescription) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Failure mode ID and action description are required'
        }
      })
    }

    // Verify failure mode exists
    const failureMode = await prisma.failureMode.findUnique({
      where: { id: failureModeId }
    })

    if (!failureMode) {
      return res.status(404).json({
        success: false,
        error: { code: 'FAILURE_MODE_NOT_FOUND', message: 'Failure mode not found' }
      })
    }

    // Validate target ratings if provided
    if (targetSeverity && (targetSeverity < 1 || targetSeverity > 10)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TARGET_SEVERITY', message: 'Target severity must be between 1 and 10' }
      })
    }

    if (targetOccurrence && (targetOccurrence < 1 || targetOccurrence > 10)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TARGET_OCCURRENCE', message: 'Target occurrence must be between 1 and 10' }
      })
    }

    if (targetDetection && (targetDetection < 1 || targetDetection > 10)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TARGET_DETECTION', message: 'Target detection must be between 1 and 10' }
      })
    }

    // Calculate target RPN if all components provided
    const targetRpn = targetSeverity && targetOccurrence && targetDetection
      ? targetSeverity * targetOccurrence * targetDetection
      : null

    const newActionItem = await prisma.fmeaActionItem.create({
      data: {
        failureModeId,
        actionDescription,
        actionType,
        priority,
        assignedToId,
        assignedDepartment,
        targetDate: targetDate ? new Date(targetDate) : null,
        estimatedCost,
        estimatedHours,
        targetSeverity,
        targetOccurrence,
        targetDetection,
        targetRpn,
        status: 'OPEN'
      },
      include: {
        failureMode: {
          select: {
            id: true,
            itemFunction: true,
            failureMode: true,
            fmea: {
              select: {
                id: true,
                fmeaNumber: true,
                title: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        }
      }
    })

    const response: ApiResponse<typeof newActionItem> = {
      success: true,
      data: newActionItem
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating action item:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_ACTION_ITEM_ERROR',
        message: 'Failed to create action item'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Update an action item
 */
export const updateActionItem = async (req: Request<{ id: string }, {}, UpdateActionItemRequest>, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    // Check if action item exists
    const existingActionItem = await prisma.fmeaActionItem.findUnique({
      where: { id }
    })

    if (!existingActionItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'ACTION_ITEM_NOT_FOUND', message: 'Action item not found' }
      })
    }

    const updateData: any = { ...req.body }

    // Convert date strings to Date objects
    if (req.body.targetDate) {
      updateData.targetDate = new Date(req.body.targetDate)
    }
    if (req.body.completedDate) {
      updateData.completedDate = new Date(req.body.completedDate)
    }
    if (req.body.verificationDate) {
      updateData.verificationDate = new Date(req.body.verificationDate)
    }

    // Calculate actual RPN if all components provided
    if (req.body.actualSeverity && req.body.actualOccurrence && req.body.actualDetection) {
      updateData.actualRpn = req.body.actualSeverity * req.body.actualOccurrence * req.body.actualDetection
    }

    // If status is being set to COMPLETED, set completion date if not provided
    if (req.body.status === 'COMPLETED' && !req.body.completedDate && !existingActionItem.completedDate) {
      updateData.completedDate = new Date()
    }

    const updatedActionItem = await prisma.fmeaActionItem.update({
      where: { id },
      data: updateData,
      include: {
        failureMode: {
          select: {
            id: true,
            itemFunction: true,
            failureMode: true,
            fmea: {
              select: {
                id: true,
                fmeaNumber: true,
                title: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Log RPN calculation if actual ratings were updated
    if (updateData.actualRpn) {
      const rpnCalc = await fmeaCalcService.calculateRpn(existingActionItem.failureModeId)
      await fmeaCalcService.logRpnCalculation(
        existingActionItem.failureModeId,
        rpnCalc,
        userId,
        `Action item completed - Target RPN: ${updateData.actualRpn}, Actual RPN: ${rpnCalc.rpn}`
      )
    }

    const response: ApiResponse<typeof updatedActionItem> = {
      success: true,
      data: updatedActionItem
    }

    res.json(response)
  } catch (error) {
    logger.error('Error updating action item:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_ACTION_ITEM_ERROR',
        message: 'Failed to update action item'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Delete an action item
 */
export const deleteActionItem = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    // Check if action item exists
    const existingActionItem = await prisma.fmeaActionItem.findUnique({
      where: { id }
    })

    if (!existingActionItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'ACTION_ITEM_NOT_FOUND', message: 'Action item not found' }
      })
    }

    // Delete action item
    await prisma.fmeaActionItem.delete({
      where: { id }
    })

    const response: ApiResponse<{ deleted: true }> = {
      success: true,
      data: { deleted: true }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error deleting action item:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DELETE_ACTION_ITEM_ERROR',
        message: 'Failed to delete action item'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get action item dashboard/summary
 */
export const getActionItemDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    // Get counts by status
    const statusCounts = await prisma.fmeaActionItem.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    // Get counts by priority
    const priorityCounts = await prisma.fmeaActionItem.groupBy({
      by: ['priority'],
      _count: {
        id: true
      },
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      }
    })

    // Get overdue items count
    const overdueCount = await prisma.fmeaActionItem.count({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        },
        targetDate: {
          lt: new Date()
        }
      }
    })

    // Get items due in next 7 days
    const dueSoonCount = await prisma.fmeaActionItem.count({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        },
        targetDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    // Get items assigned to current user (if applicable)
    let myItemsCount = 0
    if (userId) {
      myItemsCount = await prisma.fmeaActionItem.count({
        where: {
          assignedToId: userId,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        }
      })
    }

    // Get recent completions (last 30 days)
    const recentCompletions = await prisma.fmeaActionItem.count({
      where: {
        status: 'COMPLETED',
        completedDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })

    const dashboard = {
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id
        return acc
      }, {} as Record<string, number>),
      priorityCounts: priorityCounts.reduce((acc, item) => {
        acc[item.priority] = item._count.id
        return acc
      }, {} as Record<string, number>),
      overdueCount,
      dueSoonCount,
      myItemsCount,
      recentCompletions
    }

    const response: ApiResponse<typeof dashboard> = {
      success: true,
      data: dashboard
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching action item dashboard:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to fetch action item dashboard'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  getActionItems,
  getActionItemsByFailureMode,
  getActionItemById,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  getActionItemDashboard
}