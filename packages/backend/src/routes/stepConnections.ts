import { Router } from 'express'
import { authenticateToken, authorizeRoles } from '../middleware/auth'
import { validateRequest, uuidSchema, stepConnectionCreateSchema } from '../middleware/validation'
import {
  getStepConnections,
  createStepConnection,
  updateStepConnection,
  deleteStepConnection,
  createBulkConnections,
} from '../controllers/stepConnectionController'

const router = Router({ mergeParams: true }) // Enable access to parent route parameters

// Apply authentication to all step connection routes
router.use(authenticateToken)

// GET /api/process-flows/:processFlowId/connections - Get all connections for a process flow
router.get(
  '/',
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
    }),
  }),
  getStepConnections
)

// POST /api/process-flows/:processFlowId/connections - Create new step connection
router.post(
  '/',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
    }),
    body: stepConnectionCreateSchema,
  }),
  createStepConnection
)

// POST /api/process-flows/:processFlowId/connections/bulk - Create multiple connections
router.post(
  '/bulk',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
    }),
    body: require('joi').object({
      connections: require('joi').array().items(stepConnectionCreateSchema).min(1).required(),
    }),
  }),
  createBulkConnections
)

// PUT /api/process-flows/:processFlowId/connections/:connectionId - Update step connection
router.put(
  '/:connectionId',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
      connectionId: uuidSchema,
    }),
    body: stepConnectionCreateSchema.fork(Object.keys(stepConnectionCreateSchema.describe().keys), (key) => key.optional()),
  }),
  updateStepConnection
)

// DELETE /api/process-flows/:processFlowId/connections/:connectionId - Delete step connection
router.delete(
  '/:connectionId',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
      connectionId: uuidSchema,
    }),
  }),
  deleteStepConnection
)

export default router