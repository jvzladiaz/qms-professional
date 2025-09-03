import { Router } from 'express'
import { authenticateToken, authorizeRoles } from '../middleware/auth'
import { validateRequest, paginationSchema, uuidSchema, swimlaneCreateSchema } from '../middleware/validation'
import {
  getSwimlanes,
  getSwimlaneById,
  createSwimlane,
  updateSwimlane,
  deleteSwimlane,
  updateSwimlaneOrder,
} from '../controllers/swimlaneController'

const router = Router()

// Apply authentication to all swimlane routes
router.use(authenticateToken)

// GET /api/swimlanes - Get all swimlanes with pagination and filtering
router.get(
  '/',
  validateRequest({
    query: paginationSchema.keys({
      search: require('joi').string().optional(),
      department: require('joi').string().optional(),
    }),
  }),
  getSwimlanes
)

// GET /api/swimlanes/:id - Get swimlane by ID
router.get(
  '/:id',
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
  }),
  getSwimlaneById
)

// POST /api/swimlanes - Create new swimlane
router.post(
  '/',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    body: swimlaneCreateSchema,
  }),
  createSwimlane
)

// PUT /api/swimlanes/:id - Update swimlane
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
    body: swimlaneCreateSchema.fork(Object.keys(swimlaneCreateSchema.describe().keys), (key) => key.optional()),
  }),
  updateSwimlane
)

// PUT /api/swimlanes/order - Update swimlane order
router.put(
  '/order',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    body: require('joi').object({
      swimlanes: require('joi').array().items(
        require('joi').object({
          id: uuidSchema,
          positionOrder: require('joi').number().integer().min(0).required(),
        })
      ).min(1).required(),
    }),
  }),
  updateSwimlaneOrder
)

// DELETE /api/swimlanes/:id - Delete swimlane
router.delete(
  '/:id',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER'),
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
  }),
  deleteSwimlane
)

export default router