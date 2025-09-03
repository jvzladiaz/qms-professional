import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import changeManagementController from '../controllers/changeManagementController'

const router = Router()

// All change management routes require authentication
router.use(requireAuth)

// =====================================================
// VERSION CONTROL ROUTES
// =====================================================

/**
 * @route POST /api/change-management/projects/:id/snapshots
 * @desc Create a snapshot version of the project
 * @access Private
 */
router.post('/projects/:id/snapshots', changeManagementController.createProjectSnapshot)

/**
 * @route GET /api/change-management/projects/:id/versions
 * @desc Get version history for a project
 * @access Private
 */
router.get('/projects/:id/versions', changeManagementController.getVersionHistory)

/**
 * @route GET /api/change-management/versions/compare
 * @desc Compare two versions
 * @access Private
 */
router.get('/versions/compare', changeManagementController.compareVersions)

/**
 * @route POST /api/change-management/versions/:versionId/restore
 * @desc Restore project to a previous version
 * @access Private
 */
router.post('/versions/:versionId/restore', changeManagementController.restoreToVersion)

// =====================================================
// CHANGE TRACKING ROUTES
// =====================================================

/**
 * @route GET /api/change-management/projects/:id/changes
 * @desc Get change events for a project
 * @access Private
 */
router.get('/projects/:id/changes', changeManagementController.getChangeEvents)

/**
 * @route GET /api/change-management/changes/:id
 * @desc Get detailed information about a change event
 * @access Private
 */
router.get('/changes/:id', changeManagementController.getChangeEventById)

/**
 * @route POST /api/change-management/changes/:id/approve
 * @desc Approve a change event
 * @access Private
 */
router.post('/changes/:id/approve', changeManagementController.approveChangeEvent)

// =====================================================
// RISK ANALYTICS ROUTES
// =====================================================

/**
 * @route GET /api/change-management/projects/:id/risk-summary
 * @desc Get project risk summary
 * @access Private
 */
router.get('/projects/:id/risk-summary', changeManagementController.getProjectRiskSummary)

/**
 * @route GET /api/change-management/projects/:id/risk-trends
 * @desc Get risk trend data for charts
 * @access Private
 */
router.get('/projects/:id/risk-trends', changeManagementController.getRiskTrendData)

/**
 * @route GET /api/change-management/projects/:id/process-risk-breakdown
 * @desc Get process-level risk breakdown
 * @access Private
 */
router.get('/projects/:id/process-risk-breakdown', changeManagementController.getProcessRiskBreakdown)

/**
 * @route GET /api/change-management/projects/:id/control-effectiveness
 * @desc Get control effectiveness analysis
 * @access Private
 */
router.get('/projects/:id/control-effectiveness', changeManagementController.getControlEffectivenessAnalysis)

/**
 * @route GET /api/change-management/projects/:id/compliance-analysis
 * @desc Get compliance analysis
 * @access Private
 */
router.get('/projects/:id/compliance-analysis', changeManagementController.getComplianceAnalysis)

/**
 * @route POST /api/change-management/projects/:id/generate-analytics
 * @desc Generate/refresh risk analytics for a project
 * @access Private
 */
router.post('/projects/:id/generate-analytics', changeManagementController.generateRiskAnalytics)

// =====================================================
// DASHBOARD & NOTIFICATIONS ROUTES
// =====================================================

/**
 * @route GET /api/change-management/dashboard/kpis
 * @desc Get dashboard KPIs
 * @access Private
 */
router.get('/dashboard/kpis', changeManagementController.getDashboardKPIs)

/**
 * @route GET /api/change-management/notifications
 * @desc Get user notifications
 * @access Private
 */
router.get('/notifications', changeManagementController.getUserNotifications)

/**
 * @route PUT /api/change-management/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.put('/notifications/:id/read', changeManagementController.markNotificationAsRead)

export default router