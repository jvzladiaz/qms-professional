import { Router } from 'express'
import { authenticateToken, authorizeRoles } from '../middleware/auth'
import { validateRequest, uuidSchema, processStepCreateSchema, processStepUpdateSchema } from '../middleware/validation'
import {
  getProcessSteps,
  getProcessStepById,
  createProcessStep,
  updateProcessStep,
  deleteProcessStep,
  updateProcessStepPositions,
} from '../controllers/processStepController'

const router = Router({ mergeParams: true }) // Enable access to parent route parameters

// Apply authentication to all process step routes
router.use(authenticateToken)

// GET /api/process-flows/:processFlowId/steps - Get all steps for a process flow
router.get(
  '/',
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
    }),
    query: require('joi').object({
      includeDetails: require('joi').string().valid('true', 'false').default('false'),
    }),
  }),
  getProcessSteps
)

// GET /api/process-flows/:processFlowId/steps/:stepId - Get specific step
router.get(
  '/:stepId',
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
      stepId: uuidSchema,
    }),
  }),
  getProcessStepById
)

// POST /api/process-flows/:processFlowId/steps - Create new process step
router.post(
  '/',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
    }),
    body: processStepCreateSchema,
  }),
  createProcessStep
)

// PUT /api/process-flows/:processFlowId/steps/:stepId - Update process step
router.put(
  '/:stepId',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
      stepId: uuidSchema,
    }),
    body: processStepUpdateSchema,
  }),
  updateProcessStep
)

// PUT /api/process-flows/:processFlowId/steps/positions - Update multiple step positions
router.put(
  '/positions',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
    }),
    body: require('joi').object({
      steps: require('joi').array().items(
        require('joi').object({
          id: uuidSchema,
          positionX: require('joi').number().required(),
          positionY: require('joi').number().required(),
        })
      ).min(1).required(),
    }),
  }),
  updateProcessStepPositions
)

// DELETE /api/process-flows/:processFlowId/steps/:stepId - Delete process step
router.delete(
  '/:stepId',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      processFlowId: uuidSchema,
      stepId: uuidSchema,
    }),
  }),
  deleteProcessStep
)

export default router