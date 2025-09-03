import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import fmeaController from '../controllers/fmeaController'
import failureModeController from '../controllers/failureModeController'
import actionItemController from '../controllers/actionItemController'

const router = Router()

// All FMEA routes require authentication
router.use(requireAuth)

// =====================================================
// FMEA MAIN ROUTES
// =====================================================

/**
 * @route GET /api/fmeas
 * @desc Get all FMEAs with filtering and pagination
 * @access Private
 */
router.get('/', fmeaController.getFmeas)

/**
 * @route GET /api/fmeas/:id
 * @desc Get single FMEA by ID with full details
 * @access Private
 */
router.get('/:id', fmeaController.getFmeaById)

/**
 * @route POST /api/fmeas
 * @desc Create new FMEA
 * @access Private
 */
router.post('/', fmeaController.createFmea)

/**
 * @route PUT /api/fmeas/:id
 * @desc Update FMEA
 * @access Private
 */
router.put('/:id', fmeaController.updateFmea)

/**
 * @route DELETE /api/fmeas/:id
 * @desc Delete FMEA and all related data
 * @access Private
 */
router.delete('/:id', fmeaController.deleteFmea)

/**
 * @route POST /api/fmeas/:id/duplicate
 * @desc Duplicate an FMEA
 * @access Private
 */
router.post('/:id/duplicate', fmeaController.duplicateFmea)

/**
 * @route POST /api/fmeas/:id/auto-populate
 * @desc Auto-populate FMEA from linked process flow
 * @access Private
 */
router.post('/:id/auto-populate', fmeaController.autoPopulateFmea)

/**
 * @route GET /api/fmeas/:id/metrics
 * @desc Get FMEA metrics and analysis
 * @access Private
 */
router.get('/:id/metrics', fmeaController.getFmeaMetrics)

// =====================================================
// FAILURE MODE ROUTES
// =====================================================

/**
 * @route GET /api/fmeas/:fmeaId/failure-modes
 * @desc Get all failure modes for an FMEA
 * @access Private
 */
router.get('/:fmeaId/failure-modes', failureModeController.getFailureModes)

/**
 * @route GET /api/fmeas/failure-modes/:id
 * @desc Get single failure mode by ID with full details
 * @access Private
 */
router.get('/failure-modes/:id', failureModeController.getFailureModeById)

/**
 * @route POST /api/fmeas/failure-modes
 * @desc Create new failure mode
 * @access Private
 */
router.post('/failure-modes', failureModeController.createFailureMode)

/**
 * @route PUT /api/fmeas/failure-modes/:id
 * @desc Update failure mode
 * @access Private
 */
router.put('/failure-modes/:id', failureModeController.updateFailureMode)

/**
 * @route DELETE /api/fmeas/failure-modes/:id
 * @desc Delete failure mode and all related data
 * @access Private
 */
router.delete('/failure-modes/:id', failureModeController.deleteFailureMode)

/**
 * @route POST /api/fmeas/failure-modes/:id/calculate-rpn
 * @desc Calculate RPN for failure mode
 * @access Private
 */
router.post('/failure-modes/:id/calculate-rpn', failureModeController.calculateRpn)

// =====================================================
// FAILURE EFFECTS, CAUSES, AND CONTROLS ROUTES
// =====================================================

/**
 * @route POST /api/fmeas/failure-effects
 * @desc Create failure effect
 * @access Private
 */
router.post('/failure-effects', failureModeController.createFailureEffect)

/**
 * @route POST /api/fmeas/failure-causes
 * @desc Create failure cause
 * @access Private
 */
router.post('/failure-causes', failureModeController.createFailureCause)

/**
 * @route POST /api/fmeas/failure-controls
 * @desc Create failure control
 * @access Private
 */
router.post('/failure-controls', failureModeController.createFailureControl)

// =====================================================
// ACTION ITEMS ROUTES
// =====================================================

/**
 * @route GET /api/fmeas/action-items
 * @desc Get all action items with filtering and pagination
 * @access Private
 */
router.get('/action-items', actionItemController.getActionItems)

/**
 * @route GET /api/fmeas/action-items/dashboard
 * @desc Get action items dashboard summary
 * @access Private
 */
router.get('/action-items/dashboard', actionItemController.getActionItemDashboard)

/**
 * @route GET /api/fmeas/failure-modes/:failureModeId/action-items
 * @desc Get action items for specific failure mode
 * @access Private
 */
router.get('/failure-modes/:failureModeId/action-items', actionItemController.getActionItemsByFailureMode)

/**
 * @route GET /api/fmeas/action-items/:id
 * @desc Get single action item by ID
 * @access Private
 */
router.get('/action-items/:id', actionItemController.getActionItemById)

/**
 * @route POST /api/fmeas/action-items
 * @desc Create new action item
 * @access Private
 */
router.post('/action-items', actionItemController.createActionItem)

/**
 * @route PUT /api/fmeas/action-items/:id
 * @desc Update action item
 * @access Private
 */
router.put('/action-items/:id', actionItemController.updateActionItem)

/**
 * @route DELETE /api/fmeas/action-items/:id
 * @desc Delete action item
 * @access Private
 */
router.delete('/action-items/:id', actionItemController.deleteActionItem)

export default router