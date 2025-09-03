import { Router } from 'express'
import { authenticateToken, authorizeRoles } from '../middleware/auth'
import { validateRequest, paginationSchema, uuidSchema, projectCreateSchema } from '../middleware/validation'
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController'

const router = Router()

// Apply authentication to all project routes
router.use(authenticateToken)

// GET /api/projects - Get all projects with pagination and filtering
router.get(
  '/',
  validateRequest({
    query: paginationSchema.keys({
      search: require('joi').string().optional(),
      status: require('joi').string().valid('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED').optional(),
      priority: require('joi').string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
      customer: require('joi').string().optional(),
    }),
  }),
  getProjects
)

// GET /api/projects/:id - Get project by ID
router.get(
  '/:id',
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
  }),
  getProjectById
)

// POST /api/projects - Create new project
router.post(
  '/',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    body: projectCreateSchema,
  }),
  createProject
)

// PUT /api/projects/:id - Update project
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER'),
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
    body: projectCreateSchema.fork(Object.keys(projectCreateSchema.describe().keys), (key) => key.optional()),
  }),
  updateProject
)

// DELETE /api/projects/:id - Delete project
router.delete(
  '/:id',
  authorizeRoles('ADMIN', 'QUALITY_MANAGER'),
  validateRequest({
    params: require('joi').object({
      id: uuidSchema,
    }),
  }),
  deleteProject
)

export default router