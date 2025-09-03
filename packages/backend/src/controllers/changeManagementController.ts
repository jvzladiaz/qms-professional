import { Request, Response } from 'express'
import { PrismaClient } from '../generated/client'
import VersionControlService from '../services/versionControlService'
import ChangeTrackingService from '../services/changeTrackingService'
import RiskAnalyticsService from '../services/riskAnalyticsService'
import { ApiResponse, PaginatedResponse } from '../types/api'
import logger from '../utils/logger'

const prisma = new PrismaClient()
const versionControlService = new VersionControlService(prisma)
const changeTrackingService = new ChangeTrackingService(prisma)
const riskAnalyticsService = new RiskAnalyticsService(prisma)

// =====================================================
// VERSION CONTROL ENDPOINTS
// =====================================================

/**
 * Create project snapshot
 */
export const createProjectSnapshot = async (req: Request<{ id: string }, {}, { versionName?: string, description?: string, isBaseline?: boolean }>, res: Response) => {
  try {
    const { id: projectId } = req.params
    const { versionName, description, isBaseline } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const versionId = await versionControlService.createProjectSnapshot(
      { projectId, versionName, description, isBaseline },
      userId
    )

    const response: ApiResponse<{ versionId: string }> = {
      success: true,
      data: { versionId }
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating project snapshot:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_SNAPSHOT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create project snapshot'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get version history
 */
export const getVersionHistory = async (req: Request<{ id: string }, {}, {}, { limit?: string }>, res: Response) => {
  try {
    const { id: projectId } = req.params
    const { limit = '50' } = req.query

    const versions = await versionControlService.getVersionHistory(projectId, parseInt(limit))

    const response: ApiResponse<typeof versions> = {
      success: true,
      data: versions
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting version history:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_VERSION_HISTORY_ERROR',
        message: 'Failed to get version history'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Compare versions
 */
export const compareVersions = async (req: Request<{}, {}, {}, { version1: string, version2: string }>, res: Response) => {
  try {
    const { version1, version2 } = req.query

    if (!version1 || !version2) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMETERS', message: 'Both version1 and version2 parameters are required' }
      })
    }

    const comparison = await versionControlService.compareVersions(version1, version2)

    const response: ApiResponse<typeof comparison> = {
      success: true,
      data: comparison
    }

    res.json(response)
  } catch (error) {
    logger.error('Error comparing versions:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'COMPARE_VERSIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to compare versions'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Restore to version
 */
export const restoreToVersion = async (req: Request<{ versionId: string }>, res: Response) => {
  try {
    const { versionId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const result = await versionControlService.restoreToVersion(versionId, userId)

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result
    }

    res.json(response)
  } catch (error) {
    logger.error('Error restoring to version:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'RESTORE_VERSION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to restore to version'
      }
    }
    res.status(500).json(response)
  }
}

// =====================================================
// CHANGE TRACKING ENDPOINTS
// =====================================================

/**
 * Get change events for project
 */
export const getChangeEvents = async (req: Request<{ id: string }, {}, {}, { 
  page?: string, 
  limit?: string, 
  entityType?: string,
  impactLevel?: string,
  startDate?: string,
  endDate?: string 
}>, res: Response) => {
  try {
    const { id: projectId } = req.params
    const { 
      page = '1', 
      limit = '20', 
      entityType, 
      impactLevel, 
      startDate, 
      endDate 
    } = req.query

    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = { projectId }
    
    if (entityType) where.entityType = entityType
    if (impactLevel) where.impactLevel = impactLevel
    if (startDate || endDate) {
      where.triggeredAt = {}
      if (startDate) where.triggeredAt.gte = new Date(startDate)
      if (endDate) where.triggeredAt.lte = new Date(endDate)
    }

    const [total, changeEvents] = await Promise.all([
      prisma.changeEvent.count({ where }),
      prisma.changeEvent.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { triggeredAt: 'desc' },
        include: {
          triggeredBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          impactAnalysis: true,
          notifications: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    ])

    const response: PaginatedResponse<typeof changeEvents> = {
      success: true,
      data: changeEvents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting change events:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_CHANGE_EVENTS_ERROR',
        message: 'Failed to get change events'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get change event details
 */
export const getChangeEventById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    const changeEvent = await prisma.changeEvent.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true }
        },
        version: {
          select: { id: true, versionNumber: true, versionName: true }
        },
        triggeredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        impactAnalysis: true,
        notifications: {
          orderBy: { createdAt: 'desc' }
        },
        approvals: {
          include: {
            approverUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { stepNumber: 'asc' }
        }
      }
    })

    if (!changeEvent) {
      return res.status(404).json({
        success: false,
        error: { code: 'CHANGE_EVENT_NOT_FOUND', message: 'Change event not found' }
      })
    }

    const response: ApiResponse<typeof changeEvent> = {
      success: true,
      data: changeEvent
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting change event:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_CHANGE_EVENT_ERROR',
        message: 'Failed to get change event'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Approve change event
 */
export const approveChangeEvent = async (req: Request<{ id: string }, {}, { comments?: string }>, res: Response) => {
  try {
    const { id } = req.params
    const { comments } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    // Update change event
    const updatedEvent = await prisma.changeEvent.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        completedAt: new Date()
      }
    })

    // Create notification for approval
    await changeTrackingService.createNotification({
      changeEventId: id,
      notificationType: 'CHANGE_APPROVED',
      priority: 'MEDIUM',
      title: 'Change Approved',
      message: `Change ${id} has been approved${comments ? `: ${comments}` : ''}`,
      recipientCriteria: { userIds: [updatedEvent.triggeredById] }
    })

    const response: ApiResponse<typeof updatedEvent> = {
      success: true,
      data: updatedEvent
    }

    res.json(response)
  } catch (error) {
    logger.error('Error approving change event:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'APPROVE_CHANGE_ERROR',
        message: 'Failed to approve change event'
      }
    }
    res.status(500).json(response)
  }
}

// =====================================================
// RISK ANALYTICS ENDPOINTS
// =====================================================

/**
 * Get project risk summary
 */
export const getProjectRiskSummary = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id: projectId } = req.params

    const riskSummary = await riskAnalyticsService.getProjectRiskSummary(projectId)

    const response: ApiResponse<typeof riskSummary> = {
      success: true,
      data: riskSummary
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting project risk summary:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_RISK_SUMMARY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get project risk summary'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get risk trend data
 */
export const getRiskTrendData = async (req: Request<{ id: string }, {}, {}, { days?: string }>, res: Response) => {
  try {
    const { id: projectId } = req.params
    const { days = '30' } = req.query

    const trendData = await riskAnalyticsService.getRiskTrendData(projectId, parseInt(days))

    const response: ApiResponse<typeof trendData> = {
      success: true,
      data: trendData
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting risk trend data:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_RISK_TREND_ERROR',
        message: 'Failed to get risk trend data'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get process risk breakdown
 */
export const getProcessRiskBreakdown = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id: projectId } = req.params

    const breakdown = await riskAnalyticsService.getProcessRiskBreakdown(projectId)

    const response: ApiResponse<typeof breakdown> = {
      success: true,
      data: breakdown
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting process risk breakdown:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_PROCESS_RISK_ERROR',
        message: 'Failed to get process risk breakdown'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get control effectiveness analysis
 */
export const getControlEffectivenessAnalysis = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id: projectId } = req.params

    const analysis = await riskAnalyticsService.getControlEffectivenessAnalysis(projectId)

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting control effectiveness analysis:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_CONTROL_EFFECTIVENESS_ERROR',
        message: 'Failed to get control effectiveness analysis'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get compliance analysis
 */
export const getComplianceAnalysis = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id: projectId } = req.params

    const analysis = await riskAnalyticsService.getComplianceAnalysis(projectId)

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting compliance analysis:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_COMPLIANCE_ANALYSIS_ERROR',
        message: 'Failed to get compliance analysis'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Generate risk analytics
 */
export const generateRiskAnalytics = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id: projectId } = req.params

    await riskAnalyticsService.generateProjectRiskAnalytics(projectId)

    const response: ApiResponse<{ generated: boolean }> = {
      success: true,
      data: { generated: true }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error generating risk analytics:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GENERATE_ANALYTICS_ERROR',
        message: 'Failed to generate risk analytics'
      }
    }
    res.status(500).json(response)
  }
}

// =====================================================
// DASHBOARD ENDPOINTS
// =====================================================

/**
 * Get dashboard KPIs
 */
export const getDashboardKPIs = async (req: Request, res: Response) => {
  try {
    const kpis = await riskAnalyticsService.getDashboardKPIs()

    const response: ApiResponse<typeof kpis> = {
      success: true,
      data: kpis
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting dashboard KPIs:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_DASHBOARD_KPIS_ERROR',
        message: 'Failed to get dashboard KPIs'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get user notifications
 */
export const getUserNotifications = async (req: Request<{}, {}, {}, { 
  page?: string, 
  limit?: string, 
  unreadOnly?: string 
}>, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const { page = '1', limit = '20', unreadOnly = 'false' } = req.query
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    const where: any = { recipientUserId: userId }
    if (unreadOnly === 'true') {
      where.isRead = false
    }

    const [total, notifications] = await Promise.all([
      prisma.changeNotification.count({ where }),
      prisma.changeNotification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          changeEvent: {
            select: {
              id: true,
              entityType: true,
              entityId: true,
              changeType: true,
              impactLevel: true
            }
          },
          project: {
            select: {
              id: true,
              name: true,
              projectCode: true
            }
          }
        }
      })
    ])

    const response: PaginatedResponse<typeof notifications> = {
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error getting user notifications:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_NOTIFICATIONS_ERROR',
        message: 'Failed to get notifications'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const notification = await prisma.changeNotification.update({
      where: { 
        id,
        recipientUserId: userId 
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    const response: ApiResponse<typeof notification> = {
      success: true,
      data: notification
    }

    res.json(response)
  } catch (error) {
    logger.error('Error marking notification as read:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'MARK_NOTIFICATION_ERROR',
        message: 'Failed to mark notification as read'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  // Version Control
  createProjectSnapshot,
  getVersionHistory,
  compareVersions,
  restoreToVersion,
  
  // Change Tracking
  getChangeEvents,
  getChangeEventById,
  approveChangeEvent,
  
  // Risk Analytics
  getProjectRiskSummary,
  getRiskTrendData,
  getProcessRiskBreakdown,
  getControlEffectivenessAnalysis,
  getComplianceAnalysis,
  generateRiskAnalytics,
  
  // Dashboard
  getDashboardKPIs,
  getUserNotifications,
  markNotificationAsRead
}