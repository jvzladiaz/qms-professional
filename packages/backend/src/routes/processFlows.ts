import { Router } from 'express'
import { authenticateToken, authorizeRoles } from '../middleware/auth'
import { validateRequest, paginationSchema, uuidSchema, processFlowCreateSchema, processFlowUpdateSchema } from '../middleware/validation'
import {
  getProcessFlows,
  getProcessFlowById,
  createProcessFlow,
  updateProcessFlow,
  deleteProcessFlow,
  duplicateProcessFlow,
} from '../controllers/processFlowController'

const router = Router()

// Apply authentication to all process flow routes
router.use(authenticateToken)

// GET /api/process-flows - Get all process flows with pagination and filtering
router.get(
  '/',
  validateRequest({
    query: paginationSchema.keys({
      search: require('joi').string().optional(),
      status: require('joi').string().valid('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED').optional(),
      priority: require('joi').string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
      projectId: require('joi').string().uuid().optional(),
    }),
  }),
  getProcessFlows
)

// GET /api/process-flows/:id - Get process flow by ID with full details
router.get(
  '/:id',
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
  }),
  getProcessFlowById
)

// POST /api/process-flows - Create new process flow
router.post(
  '/',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    body: processFlowCreateSchema,
  }),
  createProcessFlow
)

// PUT /api/process-flows/:id - Update process flow
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
    body: processFlowUpdateSchema,
  }),
  updateProcessFlow
)

// POST /api/process-flows/:id/duplicate - Duplicate process flow
router.post(
  '/:id/duplicate',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
    body: require('joi').object({
      name: require('joi').string().min(1).max(255).optional(),
    }),
  }),
  duplicateProcessFlow
)

// DELETE /api/process-flows/:id - Delete process flow
router.delete(
  '/:id',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER'),
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
  }),
  deleteProcessFlow
)

export default router