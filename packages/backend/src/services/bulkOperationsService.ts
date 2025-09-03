import { PrismaClient } from '../generated/client'
import ChangeTrackingService from './changeTrackingService'
import WebSocketService from './websocketService'
import logger from '../utils/logger'

interface BulkUpdateOptions {
  entityType: 'FMEA' | 'FAILURE_MODE' | 'PROCESS_STEP' | 'CONTROL_PLAN_ITEM' | 'ACTION_ITEM'
  entityIds: string[]
  updates: Record<string, any>
  userId: string
  projectId?: string
  reason?: string
}

interface BulkAssignmentOptions {
  entityType: 'ACTION_ITEM' | 'FMEA' | 'CONTROL_PLAN'
  entityIds: string[]
  assigneeId: string
  role?: 'OWNER' | 'REVIEWER' | 'APPROVER' | 'TEAM_MEMBER'
  dueDate?: Date
  userId: string
  notifyAssignee: boolean
}

interface BulkDeleteOptions {
  entityType: 'FAILURE_MODE' | 'PROCESS_STEP' | 'CONTROL_PLAN_ITEM' | 'ACTION_ITEM'
  entityIds: string[]
  userId: string
  reason: string
  softDelete?: boolean
}

interface BulkStatusUpdateOptions {
  entityType: 'FMEA' | 'CONTROL_PLAN' | 'ACTION_ITEM' | 'FAILURE_MODE'
  entityIds: string[]
  newStatus: string
  userId: string
  comment?: string
}

interface BulkRiskUpdateOptions {
  failureModeIds: string[]
  riskUpdates: {
    severity?: number
    occurrence?: number
    detection?: number
  }
  userId: string
  reason: string
}

interface BulkImportOptions {
  entityType: 'FAILURE_MODE' | 'PROCESS_STEP' | 'CONTROL_PLAN_ITEM'
  projectId: string
  data: any[]
  userId: string
  skipValidation?: boolean
  updateExisting?: boolean
}

interface BulkOperationResult {
  success: boolean
  processedCount: number
  errorCount: number
  errors: Array<{
    entityId?: string
    error: string
    details?: any
  }>
  warnings: string[]
  batchId: string
}

class BulkOperationsService {
  private prisma: PrismaClient
  private changeTrackingService: ChangeTrackingService
  private websocketService?: WebSocketService

  constructor(
    prisma: PrismaClient,
    changeTrackingService: ChangeTrackingService,
    websocketService?: WebSocketService
  ) {
    this.prisma = prisma
    this.changeTrackingService = changeTrackingService
    this.websocketService = websocketService
  }

  /**
   * Bulk update multiple entities
   */
  async bulkUpdate(options: BulkUpdateOptions): Promise<BulkOperationResult> {
    const batchId = this.generateBatchId()
    let processedCount = 0
    const errors: Array<{ entityId?: string; error: string; details?: any }> = []
    const warnings: string[] = []

    try {
      logger.info(`Starting bulk update operation ${batchId} for ${options.entityIds.length} ${options.entityType} entities`)

      // Validate permissions and entities exist
      const validationResult = await this.validateBulkOperation(options.entityType, options.entityIds, options.userId)
      if (!validationResult.success) {
        return {
          success: false,
          processedCount: 0,
          errorCount: 1,
          errors: [{ error: validationResult.error! }],
          warnings: [],
          batchId
        }
      }

      // Process updates in batches to avoid overwhelming the database
      const batchSize = 50
      for (let i = 0; i < options.entityIds.length; i += batchSize) {
        const batchIds = options.entityIds.slice(i, i + batchSize)
        
        try {
          await this.processBulkUpdateBatch(options.entityType, batchIds, options.updates, options.userId, batchId)
          processedCount += batchIds.length
        } catch (error) {
          logger.error(`Error processing bulk update batch:`, error)
          batchIds.forEach(id => {
            errors.push({ entityId: id, error: 'Batch processing failed', details: error })
          })
        }
      }

      // Emit notifications for significant bulk operations
      if (processedCount > 10 && options.projectId && this.websocketService) {
        this.websocketService.emitChangeEvent(options.projectId, {
          id: batchId,
          entityType: 'BULK_OPERATION',
          changeType: 'BULK_UPDATE',
          affectedCount: processedCount,
          triggeredBy: options.userId
        })
      }

      return {
        success: errors.length === 0,
        processedCount,
        errorCount: errors.length,
        errors,
        warnings,
        batchId
      }

    } catch (error) {
      logger.error(`Bulk update operation ${batchId} failed:`, error)
      return {
        success: false,
        processedCount,
        errorCount: options.entityIds.length - processedCount,
        errors: [{ error: 'Bulk update operation failed', details: error }],
        warnings,
        batchId
      }
    }
  }

  /**
   * Bulk assign users to entities
   */
  async bulkAssign(options: BulkAssignmentOptions): Promise<BulkOperationResult> {
    const batchId = this.generateBatchId()
    let processedCount = 0
    const errors: Array<{ entityId?: string; error: string; details?: any }> = []
    const warnings: string[] = []

    try {
      logger.info(`Starting bulk assignment operation ${batchId}`)

      // Verify assignee exists
      const assignee = await this.prisma.user.findUnique({
        where: { id: options.assigneeId, isActive: true },
        select: { id: true, name: true, email: true }
      })

      if (!assignee) {
        return {
          success: false,
          processedCount: 0,
          errorCount: 1,
          errors: [{ error: 'Assignee not found or inactive' }],
          warnings: [],
          batchId
        }
      }

      for (const entityId of options.entityIds) {
        try {
          await this.processAssignment(options.entityType, entityId, options.assigneeId, options.role, options.dueDate)
          processedCount++

          // Track assignment change
          if (options.entityType === 'ACTION_ITEM') {
            await this.changeTrackingService.trackChange(
              'unknown', // We'd need to get project ID from entity
              'ACTION_ITEM',
              entityId,
              'UPDATE',
              null,
              { assignedTo: options.assigneeId },
              options.userId
            )
          }
        } catch (error) {
          logger.error(`Error assigning entity ${entityId}:`, error)
          errors.push({ entityId, error: 'Assignment failed', details: error })
        }
      }

      // Send notifications if enabled
      if (options.notifyAssignee && processedCount > 0 && this.websocketService) {
        this.websocketService.emitNotification(options.assigneeId, {
          type: 'BULK_ASSIGNMENT',
          title: 'Bulk Assignment Notification',
          message: `You have been assigned ${processedCount} ${options.entityType.toLowerCase().replace('_', ' ')} items`,
          actionRequired: true,
          timestamp: new Date()
        })
      }

      return {
        success: errors.length === 0,
        processedCount,
        errorCount: errors.length,
        errors,
        warnings,
        batchId
      }

    } catch (error) {
      logger.error(`Bulk assignment operation ${batchId} failed:`, error)
      return {
        success: false,
        processedCount,
        errorCount: options.entityIds.length - processedCount,
        errors: [{ error: 'Bulk assignment failed', details: error }],
        warnings,
        batchId
      }
    }
  }

  /**
   * Bulk delete entities
   */
  async bulkDelete(options: BulkDeleteOptions): Promise<BulkOperationResult> {
    const batchId = this.generateBatchId()
    let processedCount = 0
    const errors: Array<{ entityId?: string; error: string; details?: any }> = []
    const warnings: string[] = []

    try {
      logger.info(`Starting bulk delete operation ${batchId}`)

      // Validate deletion permissions
      const canDelete = await this.validateDeletionPermissions(options.entityType, options.entityIds, options.userId)
      if (!canDelete.success) {
        return {
          success: false,
          processedCount: 0,
          errorCount: 1,
          errors: [{ error: canDelete.error! }],
          warnings: [],
          batchId
        }
      }

      for (const entityId of options.entityIds) {
        try {
          if (options.softDelete) {
            await this.softDeleteEntity(options.entityType, entityId, options.userId, options.reason)
          } else {
            await this.hardDeleteEntity(options.entityType, entityId, options.userId, options.reason)
          }
          processedCount++
        } catch (error) {
          logger.error(`Error deleting entity ${entityId}:`, error)
          errors.push({ entityId, error: 'Deletion failed', details: error })
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errorCount: errors.length,
        errors,
        warnings: warnings.concat(canDelete.warnings || []),
        batchId
      }

    } catch (error) {
      logger.error(`Bulk delete operation ${batchId} failed:`, error)
      return {
        success: false,
        processedCount,
        errorCount: options.entityIds.length - processedCount,
        errors: [{ error: 'Bulk delete failed', details: error }],
        warnings,
        batchId
      }
    }
  }

  /**
   * Bulk status updates
   */
  async bulkStatusUpdate(options: BulkStatusUpdateOptions): Promise<BulkOperationResult> {
    const batchId = this.generateBatchId()
    let processedCount = 0
    const errors: Array<{ entityId?: string; error: string; details?: any }> = []
    const warnings: string[] = []

    try {
      logger.info(`Starting bulk status update operation ${batchId}`)

      for (const entityId of options.entityIds) {
        try {
          await this.updateEntityStatus(options.entityType, entityId, options.newStatus, options.userId, options.comment)
          processedCount++
        } catch (error) {
          logger.error(`Error updating status for entity ${entityId}:`, error)
          errors.push({ entityId, error: 'Status update failed', details: error })
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errorCount: errors.length,
        errors,
        warnings,
        batchId
      }

    } catch (error) {
      logger.error(`Bulk status update operation ${batchId} failed:`, error)
      return {
        success: false,
        processedCount,
        errorCount: options.entityIds.length - processedCount,
        errors: [{ error: 'Bulk status update failed', details: error }],
        warnings,
        batchId
      }
    }
  }

  /**
   * Bulk risk assessment updates for failure modes
   */
  async bulkRiskUpdate(options: BulkRiskUpdateOptions): Promise<BulkOperationResult> {
    const batchId = this.generateBatchId()
    let processedCount = 0
    const errors: Array<{ entityId?: string; error: string; details?: any }> = []
    const warnings: string[] = []

    try {
      logger.info(`Starting bulk risk update operation ${batchId}`)

      for (const failureModeId of options.failureModeIds) {
        try {
          // Get existing failure mode with effects and causes
          const failureMode = await this.prisma.failureMode.findUnique({
            where: { id: failureModeId },
            include: {
              effects: true,
              causes: {
                include: { controls: true }
              }
            }
          })

          if (!failureMode) {
            errors.push({ entityId: failureModeId, error: 'Failure mode not found' })
            continue
          }

          // Update risk values
          if (options.riskUpdates.severity && failureMode.effects.length > 0) {
            await this.prisma.failureEffect.updateMany({
              where: { failureModeId },
              data: { severity: options.riskUpdates.severity }
            })
          }

          if (options.riskUpdates.occurrence && failureMode.causes.length > 0) {
            await this.prisma.failureCause.updateMany({
              where: { failureModeId },
              data: { occurrence: options.riskUpdates.occurrence }
            })
          }

          if (options.riskUpdates.detection && failureMode.causes.length > 0) {
            for (const cause of failureMode.causes) {
              if (cause.controls.length > 0) {
                await this.prisma.failureControl.updateMany({
                  where: { failureCauseId: cause.id },
                  data: { detection: options.riskUpdates.detection }
                })
              }
            }
          }

          processedCount++
        } catch (error) {
          logger.error(`Error updating risk for failure mode ${failureModeId}:`, error)
          errors.push({ entityId: failureModeId, error: 'Risk update failed', details: error })
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errorCount: errors.length,
        errors,
        warnings,
        batchId
      }

    } catch (error) {
      logger.error(`Bulk risk update operation ${batchId} failed:`, error)
      return {
        success: false,
        processedCount,
        errorCount: options.failureModeIds.length - processedCount,
        errors: [{ error: 'Bulk risk update failed', details: error }],
        warnings,
        batchId
      }
    }
  }

  /**
   * Bulk import data from external source
   */
  async bulkImport(options: BulkImportOptions): Promise<BulkOperationResult> {
    const batchId = this.generateBatchId()
    let processedCount = 0
    const errors: Array<{ entityId?: string; error: string; details?: any }> = []
    const warnings: string[] = []

    try {
      logger.info(`Starting bulk import operation ${batchId} for ${options.data.length} records`)

      // Validate project exists
      const project = await this.prisma.project.findUnique({
        where: { id: options.projectId }
      })

      if (!project) {
        return {
          success: false,
          processedCount: 0,
          errorCount: 1,
          errors: [{ error: 'Project not found' }],
          warnings: [],
          batchId
        }
      }

      // Process import data
      for (let i = 0; i < options.data.length; i++) {
        const record = options.data[i]
        try {
          if (!options.skipValidation) {
            const validation = this.validateImportRecord(options.entityType, record)
            if (!validation.valid) {
              errors.push({ error: `Row ${i + 1}: ${validation.error}`, details: record })
              continue
            }
            if (validation.warnings) {
              warnings.push(...validation.warnings.map(w => `Row ${i + 1}: ${w}`))
            }
          }

          await this.importRecord(options.entityType, record, options.projectId, options.userId, options.updateExisting)
          processedCount++
        } catch (error) {
          logger.error(`Error importing record ${i + 1}:`, error)
          errors.push({ error: `Row ${i + 1}: Import failed`, details: error })
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errorCount: errors.length,
        errors,
        warnings,
        batchId
      }

    } catch (error) {
      logger.error(`Bulk import operation ${batchId} failed:`, error)
      return {
        success: false,
        processedCount,
        errorCount: options.data.length - processedCount,
        errors: [{ error: 'Bulk import failed', details: error }],
        warnings,
        batchId
      }
    }
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(batchId: string): Promise<{
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    progress?: number
    results?: BulkOperationResult
  }> {
    // In a real implementation, you'd store operation status in database or cache
    // For now, return a simple response
    return {
      status: 'COMPLETED',
      progress: 100
    }
  }

  /**
   * Process bulk update batch
   */
  private async processBulkUpdateBatch(
    entityType: string,
    entityIds: string[],
    updates: Record<string, any>,
    userId: string,
    batchId: string
  ): Promise<void> {
    switch (entityType) {
      case 'FMEA':
        await this.prisma.fmea.updateMany({
          where: { id: { in: entityIds } },
          data: { ...updates, updatedById: userId }
        })
        break

      case 'FAILURE_MODE':
        await this.prisma.failureMode.updateMany({
          where: { id: { in: entityIds } },
          data: updates
        })
        break

      case 'PROCESS_STEP':
        await this.prisma.processStep.updateMany({
          where: { id: { in: entityIds } },
          data: updates
        })
        break

      case 'CONTROL_PLAN_ITEM':
        await this.prisma.controlPlanItem.updateMany({
          where: { id: { in: entityIds } },
          data: updates
        })
        break

      case 'ACTION_ITEM':
        await this.prisma.actionItem.updateMany({
          where: { id: { in: entityIds } },
          data: updates
        })
        break

      default:
        throw new Error(`Unsupported entity type for bulk update: ${entityType}`)
    }
  }

  /**
   * Process individual assignment
   */
  private async processAssignment(
    entityType: string,
    entityId: string,
    assigneeId: string,
    role?: string,
    dueDate?: Date
  ): Promise<void> {
    switch (entityType) {
      case 'ACTION_ITEM':
        await this.prisma.actionItem.update({
          where: { id: entityId },
          data: { 
            assignedTo: assigneeId,
            ...(dueDate && { targetDate: dueDate })
          }
        })
        break

      case 'FMEA':
        if (role === 'TEAM_MEMBER') {
          // Add as team member if not already exists
          await this.prisma.fmeaTeamMember.upsert({
            where: {
              fmeaId_userId: {
                fmeaId: entityId,
                userId: assigneeId
              }
            },
            update: {},
            create: {
              fmeaId: entityId,
              userId: assigneeId,
              role: 'TEAM_MEMBER'
            }
          })
        } else {
          await this.prisma.fmea.update({
            where: { id: entityId },
            data: { teamLeaderId: assigneeId }
          })
        }
        break

      default:
        throw new Error(`Unsupported entity type for assignment: ${entityType}`)
    }
  }

  /**
   * Validate bulk operation permissions and entity existence
   */
  private async validateBulkOperation(
    entityType: string,
    entityIds: string[],
    userId: string
  ): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    try {
      // Basic validation - in production, you'd have more sophisticated permission checks
      if (entityIds.length === 0) {
        return { success: false, error: 'No entities specified' }
      }

      if (entityIds.length > 1000) {
        return { success: false, error: 'Too many entities for bulk operation (max 1000)' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Validation failed' }
    }
  }

  /**
   * Validate deletion permissions
   */
  private async validateDeletionPermissions(
    entityType: string,
    entityIds: string[],
    userId: string
  ): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    // Simplified validation - in production, check actual permissions
    const warnings: string[] = []

    if (entityIds.length > 100) {
      warnings.push('Large deletion operation - consider breaking into smaller batches')
    }

    return { success: true, warnings }
  }

  /**
   * Soft delete entity
   */
  private async softDeleteEntity(entityType: string, entityId: string, userId: string, reason: string): Promise<void> {
    const deleteData = {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      deletionReason: reason
    }

    switch (entityType) {
      case 'FAILURE_MODE':
        await this.prisma.failureMode.update({
          where: { id: entityId },
          data: deleteData
        })
        break
      // Add other entity types as needed
      default:
        throw new Error(`Soft delete not implemented for entity type: ${entityType}`)
    }
  }

  /**
   * Hard delete entity
   */
  private async hardDeleteEntity(entityType: string, entityId: string, userId: string, reason: string): Promise<void> {
    switch (entityType) {
      case 'FAILURE_MODE':
        await this.prisma.failureMode.delete({
          where: { id: entityId }
        })
        break
      // Add other entity types as needed
      default:
        throw new Error(`Hard delete not implemented for entity type: ${entityType}`)
    }
  }

  /**
   * Update entity status
   */
  private async updateEntityStatus(
    entityType: string,
    entityId: string,
    newStatus: string,
    userId: string,
    comment?: string
  ): Promise<void> {
    switch (entityType) {
      case 'FMEA':
        await this.prisma.fmea.update({
          where: { id: entityId },
          data: { status: newStatus }
        })
        break

      case 'ACTION_ITEM':
        await this.prisma.actionItem.update({
          where: { id: entityId },
          data: { 
            status: newStatus,
            ...(comment && { completionNotes: comment })
          }
        })
        break

      default:
        throw new Error(`Status update not implemented for entity type: ${entityType}`)
    }
  }

  /**
   * Validate import record
   */
  private validateImportRecord(
    entityType: string,
    record: any
  ): { valid: boolean; error?: string; warnings?: string[] } {
    const warnings: string[] = []

    switch (entityType) {
      case 'FAILURE_MODE':
        if (!record.description) {
          return { valid: false, error: 'Description is required' }
        }
        if (!record.processFunction) {
          warnings.push('Process function not specified')
        }
        break

      case 'PROCESS_STEP':
        if (!record.name) {
          return { valid: false, error: 'Name is required' }
        }
        break

      default:
        warnings.push(`Validation not implemented for entity type: ${entityType}`)
    }

    return { valid: true, warnings: warnings.length > 0 ? warnings : undefined }
  }

  /**
   * Import single record
   */
  private async importRecord(
    entityType: string,
    record: any,
    projectId: string,
    userId: string,
    updateExisting?: boolean
  ): Promise<void> {
    switch (entityType) {
      case 'FAILURE_MODE':
        // This would need a parent FMEA - simplified for demonstration
        throw new Error('Failure mode import requires FMEA context')

      case 'PROCESS_STEP':
        // This would need a parent Process Flow - simplified for demonstration
        throw new Error('Process step import requires Process Flow context')

      default:
        throw new Error(`Import not implemented for entity type: ${entityType}`)
    }
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export default BulkOperationsService