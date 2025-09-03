import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'
import { Server as SocketIOServer } from 'socket.io'

export interface ChangeDetectionResult {
  entityType: string
  entityId: string
  changeType: string
  changedFields: string[]
  oldValues: any
  newValues: any
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  affectedModules: string[]
  propagationRequired: boolean
}

export interface PropagationRule {
  id: string
  sourceEntityType: string
  sourceChangeType: string
  targetEntityType: string
  targetAction: string
  conditions?: any
  priority: number
  requiresApproval: boolean
}

export interface NotificationRequest {
  changeEventId: string
  notificationType: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  title: string
  message: string
  recipientCriteria: {
    roles?: string[]
    departments?: string[]
    userIds?: string[]
  }
  actionRequired?: boolean
  actionUrl?: string
  actionDeadline?: Date
}

class ChangeTrackingService {
  private io?: SocketIOServer

  constructor(private prisma: PrismaClient, socketServer?: SocketIOServer) {
    this.io = socketServer
  }

  /**
   * Track a change event and trigger propagation analysis
   */
  async trackChange(
    projectId: string,
    entityType: string,
    entityId: string,
    changeType: string,
    oldValues: any,
    newValues: any,
    triggeredById: string,
    batchId?: string
  ): Promise<string> {
    try {
      // Detect what changed
      const detection = this.detectChanges(entityType, oldValues, newValues)
      
      // Determine impact level
      const impactLevel = this.assessImpactLevel(entityType, changeType, detection.changedFields, newValues)
      
      // Identify affected modules
      const affectedModules = this.identifyAffectedModules(entityType, changeType)
      
      // Check if propagation is required
      const propagationRequired = await this.checkPropagationRules(
        entityType, changeType, detection.changedFields
      )

      // Create change event
      const changeEvent = await this.prisma.changeEvent.create({
        data: {
          projectId,
          entityType,
          entityId,
          changeType,
          changeAction: this.generateChangeAction(entityType, changeType, detection.changedFields),
          oldValues,
          newValues,
          changedFields: detection.changedFields,
          impactLevel,
          affectedModules,
          propagationRequired,
          triggeredById,
          batchId,
          approvalRequired: this.requiresApproval(impactLevel, entityType, changeType)
        }
      })

      // Perform impact analysis
      await this.performImpactAnalysis(changeEvent.id, projectId)

      // Send real-time notification
      this.emitRealTimeChange(projectId, changeEvent)

      // Trigger propagation if required
      if (propagationRequired) {
        await this.triggerChangePropagation(changeEvent.id)
      }

      // Generate notifications
      await this.generateNotifications(changeEvent.id)

      logger.info(`Change tracked: ${changeEvent.id} for ${entityType}:${entityId}`)
      return changeEvent.id
    } catch (error) {
      logger.error('Error tracking change:', error)
      throw error
    }
  }

  /**
   * Perform impact analysis for a change event
   */
  async performImpactAnalysis(changeEventId: string, projectId: string): Promise<void> {
    try {
      const changeEvent = await this.prisma.changeEvent.findUnique({
        where: { id: changeEventId }
      })

      if (!changeEvent) return

      // Calculate impact score (0-10)
      const impactScore = this.calculateImpactScore(
        changeEvent.entityType,
        changeEvent.changeType,
        changeEvent.changedFields,
        changeEvent.newValues
      )

      // Identify affected items
      const affectedItems = await this.identifyAffectedItems(
        projectId,
        changeEvent.entityType,
        changeEvent.entityId,
        changeEvent.changeType
      )

      // Determine stakeholders
      const affectedStakeholders = this.identifyAffectedStakeholders(
        changeEvent.entityType,
        changeEvent.affectedModules,
        affectedItems
      )

      // Estimate effort
      const estimatedEffortHours = this.estimateEffort(
        changeEvent.impactLevel,
        affectedItems,
        changeEvent.changeType
      )

      // Generate recommendations
      const riskMitigationActions = this.generateRiskMitigationActions(
        changeEvent.entityType,
        changeEvent.impactLevel,
        affectedItems
      )

      const recommendedApprovers = await this.getRecommendedApprovers(
        projectId,
        changeEvent.impactLevel,
        affectedStakeholders
      )

      // Create impact analysis record
      await this.prisma.changeImpactAnalysis.create({
        data: {
          changeEventId,
          projectId,
          impactScore,
          riskLevel: changeEvent.impactLevel,
          affectedStakeholders,
          estimatedEffortHours,
          affectedProcessSteps: affectedItems.processSteps,
          affectedFailureModes: affectedItems.failureModes,
          affectedControlItems: affectedItems.controlItems,
          riskMitigationActions,
          recommendedApprovers,
          analysisStatus: 'COMPLETED',
          analysisCompletedAt: new Date()
        }
      })

      logger.info(`Impact analysis completed for change ${changeEventId}`)
    } catch (error) {
      logger.error('Error performing impact analysis:', error)
      throw error
    }
  }

  /**
   * Trigger change propagation based on rules
   */
  async triggerChangePropagation(changeEventId: string): Promise<void> {
    try {
      const changeEvent = await this.prisma.changeEvent.findUnique({
        where: { id: changeEventId }
      })

      if (!changeEvent) return

      // Get applicable propagation rules
      const rules = await this.getApplicablePropagationRules(
        changeEvent.entityType,
        changeEvent.changeType,
        changeEvent.changedFields
      )

      // Update propagation status
      await this.prisma.changeEvent.update({
        where: { id: changeEventId },
        data: { propagationStatus: 'IN_PROGRESS' }
      })

      let propagationSuccessful = true

      // Execute each rule
      for (const rule of rules) {
        try {
          await this.executePropagationRule(changeEvent, rule)
          logger.info(`Executed propagation rule ${rule.id} for change ${changeEventId}`)
        } catch (error) {
          logger.error(`Failed to execute propagation rule ${rule.id}:`, error)
          propagationSuccessful = false
        }
      }

      // Update final status
      await this.prisma.changeEvent.update({
        where: { id: changeEventId },
        data: { 
          propagationStatus: propagationSuccessful ? 'COMPLETED' : 'FAILED',
          completedAt: propagationSuccessful ? new Date() : null
        }
      })

      // Notify if propagation failed
      if (!propagationSuccessful) {
        await this.createNotification({
          changeEventId,
          notificationType: 'PROPAGATION_FAILED',
          priority: 'HIGH',
          title: 'Change Propagation Failed',
          message: `Failed to propagate changes for ${changeEvent.entityType} ${changeEvent.entityId}`,
          recipientCriteria: { roles: ['ADMIN', 'QUALITY_MANAGER'] },
          actionRequired: true
        })
      }
    } catch (error) {
      logger.error('Error triggering change propagation:', error)
      throw error
    }
  }

  /**
   * Generate notifications for change event
   */
  async generateNotifications(changeEventId: string): Promise<void> {
    try {
      const changeEvent = await this.prisma.changeEvent.findUnique({
        where: { id: changeEventId },
        include: { project: true }
      })

      if (!changeEvent) return

      const notifications: NotificationRequest[] = []

      // High impact changes
      if (['HIGH', 'CRITICAL'].includes(changeEvent.impactLevel)) {
        notifications.push({
          changeEventId,
          notificationType: 'IMPACT_HIGH',
          priority: changeEvent.impactLevel === 'CRITICAL' ? 'URGENT' : 'HIGH',
          title: `${changeEvent.impactLevel} Impact Change Detected`,
          message: `A ${changeEvent.impactLevel.toLowerCase()} impact change was made to ${changeEvent.entityType} in project ${changeEvent.project?.name}`,
          recipientCriteria: { roles: ['QUALITY_MANAGER', 'PROCESS_ENGINEER'] },
          actionRequired: true,
          actionUrl: `/projects/${changeEvent.projectId}/changes/${changeEvent.id}`
        })
      }

      // Approval required
      if (changeEvent.approvalRequired) {
        notifications.push({
          changeEventId,
          notificationType: 'APPROVAL_REQUIRED',
          priority: 'HIGH',
          title: 'Change Approval Required',
          message: `Change to ${changeEvent.entityType} requires approval before implementation`,
          recipientCriteria: { roles: ['QUALITY_MANAGER'] },
          actionRequired: true,
          actionUrl: `/approvals/${changeEvent.id}`,
          actionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
        })
      }

      // Process all notifications
      for (const notification of notifications) {
        await this.createNotification(notification)
      }
    } catch (error) {
      logger.error('Error generating notifications:', error)
      throw error
    }
  }

  /**
   * Create and send notification
   */
  async createNotification(request: NotificationRequest): Promise<void> {
    try {
      // Get recipients based on criteria
      const recipients = await this.getNotificationRecipients(request.recipientCriteria)

      // Create notification records
      for (const recipient of recipients) {
        await this.prisma.changeNotification.create({
          data: {
            changeEventId: request.changeEventId,
            projectId: await this.getProjectIdFromChangeEvent(request.changeEventId),
            notificationType: request.notificationType,
            priority: request.priority,
            title: request.title,
            message: request.message,
            recipientUserId: recipient.userId,
            recipientRole: recipient.role,
            recipientDepartment: recipient.department,
            actionRequired: request.actionRequired || false,
            actionUrl: request.actionUrl,
            actionDeadline: request.actionDeadline
          }
        })

        // Send real-time notification
        this.emitNotification(recipient.userId, request)
      }
    } catch (error) {
      logger.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Emit real-time change event via WebSocket
   */
  private emitRealTimeChange(projectId: string, changeEvent: any): void {
    if (this.io) {
      this.io.to(`project:${projectId}`).emit('changeEvent', {
        id: changeEvent.id,
        entityType: changeEvent.entityType,
        entityId: changeEvent.entityId,
        changeType: changeEvent.changeType,
        impactLevel: changeEvent.impactLevel,
        affectedModules: changeEvent.affectedModules,
        triggeredAt: changeEvent.triggeredAt
      })
    }
  }

  /**
   * Emit real-time notification
   */
  private emitNotification(userId: string, notification: NotificationRequest): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification', {
        type: notification.notificationType,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        actionRequired: notification.actionRequired,
        actionUrl: notification.actionUrl,
        timestamp: new Date()
      })
    }
  }

  /**
   * Detect what changed between old and new values
   */
  private detectChanges(entityType: string, oldValues: any, newValues: any): { changedFields: string[] } {
    const changedFields: string[] = []

    if (!oldValues && newValues) {
      // New entity created
      return { changedFields: Object.keys(newValues) }
    }

    if (oldValues && !newValues) {
      // Entity deleted
      return { changedFields: Object.keys(oldValues) }
    }

    // Compare fields
    const allFields = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])
    
    allFields.forEach(field => {
      if (JSON.stringify(oldValues?.[field]) !== JSON.stringify(newValues?.[field])) {
        changedFields.push(field)
      }
    })

    return { changedFields }
  }

  /**
   * Assess impact level of changes
   */
  private assessImpactLevel(
    entityType: string,
    changeType: string,
    changedFields: string[],
    newValues: any
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Critical changes
    if (changeType === 'DELETE') return 'HIGH'
    
    // High impact fields by entity type
    const highImpactFields: Record<string, string[]> = {
      PROCESS_STEP: ['stepType', 'qualityRequirements', 'safetyRequirements'],
      FAILURE_MODE: ['severityRating', 'failureMode'],
      FAILURE_CAUSE: ['occurrenceRating', 'isRootCause'],
      FAILURE_CONTROL: ['detectionRating', 'controlType'],
      CONTROL_ITEM: ['controlType', 'reactionPlan', 'responsiblePerson']
    }

    const criticalThresholds = {
      severityRating: 8,
      occurrenceRating: 7,
      detectionRating: 8
    }

    // Check for critical values
    for (const field of changedFields) {
      if (criticalThresholds[field as keyof typeof criticalThresholds] && 
          newValues[field] >= criticalThresholds[field as keyof typeof criticalThresholds]) {
        return 'CRITICAL'
      }
    }

    // Check for high impact fields
    const entityHighImpactFields = highImpactFields[entityType] || []
    const hasHighImpactChange = changedFields.some(field => entityHighImpactFields.includes(field))
    
    if (hasHighImpactChange) return 'HIGH'
    if (changedFields.length > 3) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Identify affected modules based on entity type and change type
   */
  private identifyAffectedModules(entityType: string, changeType: string): string[] {
    const moduleMap: Record<string, string[]> = {
      PROCESS_STEP: ['PROCESS_FLOW', 'FMEA', 'CONTROL_PLAN'],
      PROCESS_FLOW: ['PROCESS_FLOW', 'FMEA'],
      FAILURE_MODE: ['FMEA', 'CONTROL_PLAN'],
      FAILURE_CAUSE: ['FMEA', 'CONTROL_PLAN'],
      FAILURE_CONTROL: ['FMEA', 'CONTROL_PLAN'],
      CONTROL_ITEM: ['CONTROL_PLAN']
    }

    return moduleMap[entityType] || [entityType.replace('_', '_FLOW')]
  }

  /**
   * Check if propagation rules apply
   */
  private async checkPropagationRules(
    entityType: string,
    changeType: string,
    changedFields: string[]
  ): Promise<boolean> {
    const rules = await this.prisma.changePropagationRule.findMany({
      where: {
        sourceEntityType: entityType,
        sourceChangeType: changeType,
        isActive: true
      }
    })

    return rules.some(rule => {
      if (!rule.sourceFieldPatterns) return true
      
      // Check if any changed field matches the patterns
      return rule.sourceFieldPatterns.some(pattern => 
        changedFields.some(field => field.match(new RegExp(pattern)))
      )
    })
  }

  /**
   * Generate descriptive change action
   */
  private generateChangeAction(entityType: string, changeType: string, changedFields: string[]): string {
    const entityName = entityType.toLowerCase().replace('_', ' ')
    
    switch (changeType) {
      case 'CREATE':
        return `Created new ${entityName}`
      case 'DELETE':
        return `Deleted ${entityName}`
      case 'UPDATE':
        return `Updated ${entityName} (${changedFields.join(', ')})`
      default:
        return `${changeType} on ${entityName}`
    }
  }

  /**
   * Determine if change requires approval
   */
  private requiresApproval(impactLevel: string, entityType: string, changeType: string): boolean {
    // High and critical impact changes always require approval
    if (['HIGH', 'CRITICAL'].includes(impactLevel)) return true
    
    // Deletions require approval
    if (changeType === 'DELETE') return true
    
    // Safety-critical entities require approval
    const criticalEntities = ['FAILURE_MODE', 'FAILURE_CONTROL', 'CONTROL_ITEM']
    if (criticalEntities.includes(entityType)) return true
    
    return false
  }

  // Additional private methods would continue here...
  // (Placeholder implementations for remaining methods)

  private calculateImpactScore(entityType: string, changeType: string, changedFields: string[], newValues: any): number {
    // Implementation for calculating numerical impact score (0-10)
    let score = 0
    
    if (changeType === 'DELETE') score += 3
    if (changeType === 'CREATE') score += 1
    
    score += Math.min(changedFields.length * 0.5, 3)
    
    // Add entity-specific scoring
    const entityWeights = { FAILURE_MODE: 2, FAILURE_CONTROL: 1.5, PROCESS_STEP: 1 }
    const weight = entityWeights[entityType as keyof typeof entityWeights] || 1
    
    return Math.min(score * weight, 10)
  }

  private async identifyAffectedItems(projectId: string, entityType: string, entityId: string, changeType: string) {
    // Implementation to find related items that might be affected
    return {
      processSteps: {},
      failureModes: {},
      controlItems: {}
    }
  }

  private identifyAffectedStakeholders(entityType: string, affectedModules: string[], affectedItems: any): string[] {
    const stakeholders = ['Process Engineer']
    if (affectedModules.includes('FMEA')) stakeholders.push('Quality Engineer')
    if (affectedModules.includes('CONTROL_PLAN')) stakeholders.push('Production Manager')
    return stakeholders
  }

  private estimateEffort(impactLevel: string, affectedItems: any, changeType: string): number {
    const baseHours = { LOW: 1, MEDIUM: 4, HIGH: 8, CRITICAL: 16 }
    return baseHours[impactLevel as keyof typeof baseHours] || 2
  }

  private generateRiskMitigationActions(entityType: string, impactLevel: string, affectedItems: any): string[] {
    const actions = ['Review change with team']
    if (impactLevel === 'CRITICAL') actions.push('Conduct risk assessment', 'Update documentation')
    return actions
  }

  private async getRecommendedApprovers(projectId: string, impactLevel: string, stakeholders: string[]): Promise<string[]> {
    // Get users with appropriate roles for approval
    const users = await this.prisma.user.findMany({
      where: { role: 'QUALITY_MANAGER' },
      select: { id: true }
    })
    return users.map(u => u.id)
  }

  private async getApplicablePropagationRules(entityType: string, changeType: string, changedFields: string[]) {
    // Get rules that match the change context
    return []
  }

  private async executePropagationRule(changeEvent: any, rule: PropagationRule) {
    // Execute the propagation rule
    logger.info(`Executing propagation rule ${rule.id}`)
  }

  private async getNotificationRecipients(criteria: any) {
    const recipients = []
    
    if (criteria.roles) {
      const users = await this.prisma.user.findMany({
        where: { role: { in: criteria.roles } },
        select: { id: true, role: true, department: true }
      })
      recipients.push(...users.map(u => ({ userId: u.id, role: u.role, department: u.department })))
    }
    
    return recipients
  }

  private async getProjectIdFromChangeEvent(changeEventId: string): Promise<string> {
    const event = await this.prisma.changeEvent.findUnique({
      where: { id: changeEventId },
      select: { projectId: true }
    })
    return event?.projectId || ''
  }
}

export default ChangeTrackingService