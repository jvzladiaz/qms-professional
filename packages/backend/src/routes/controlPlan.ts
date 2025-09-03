import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import controlPlanController from '../controllers/controlPlanController'

const router = Router()

// All control plan routes require authentication
router.use(requireAuth)

// =====================================================
// CONTROL PLAN MAIN ROUTES
// =====================================================

/**
 * @route GET /api/control-plans
 * @desc Get all control plans with filtering and pagination
 * @access Private
 */
router.get('/', controlPlanController.getControlPlans)

/**
 * @route GET /api/control-plans/:id
 * @desc Get single control plan by ID with full details
 * @access Private
 */
router.get('/:id', controlPlanController.getControlPlanById)

/**
 * @route POST /api/control-plans
 * @desc Create new control plan
 * @access Private
 */
router.post('/', controlPlanController.createControlPlan)

/**
 * @route PUT /api/control-plans/:id
 * @desc Update control plan
 * @access Private
 */
router.put('/:id', controlPlanController.updateControlPlan)

/**
 * @route DELETE /api/control-plans/:id
 * @desc Delete control plan and all related data
 * @access Private
 */
router.delete('/:id', controlPlanController.deleteControlPlan)

/**
 * @route POST /api/control-plans/:id/duplicate
 * @desc Duplicate a control plan
 * @access Private
 */
router.post('/:id/duplicate', controlPlanController.duplicateControlPlan)

/**
 * @route POST /api/control-plans/:id/auto-populate
 * @desc Auto-populate control plan from linked FMEA
 * @access Private
 */
router.post('/:id/auto-populate', controlPlanController.autoPopulateFromFmea)

/**
 * @route GET /api/control-plans/:id/metrics
 * @desc Get control plan metrics and analysis
 * @access Private
 */
router.get('/:id/metrics', controlPlanController.getControlPlanMetrics)

// =====================================================
// CONTROL PLAN ITEMS ROUTES
// =====================================================

/**
 * @route GET /api/control-plans/:controlPlanId/items
 * @desc Get all control plan items for a specific control plan
 * @access Private
 */
router.get('/:controlPlanId/items', controlPlanController.getControlPlanItems)

/**
 * @route POST /api/control-plans/items
 * @desc Create new control plan item
 * @access Private
 */
router.post('/items', controlPlanController.createControlPlanItem)

export default router