import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

export interface WorkflowStep {
  stepNumber: number
  stepName: string
  approverRole: string
  approverUserId?: string
  timeoutHours: number
  escalationRoles?: string[]
  isParallel: boolean
  isOptional: boolean
  conditions?: any
}

export interface CreateWorkflowRequest {
  projectId: string
  workflowName: string
  description?: string
  triggerConditions: any
  approvalSteps: WorkflowStep[]
  parallelApproval: boolean
  autoApproveConditions?: any
  defaultTimeoutHours: number
  escalationRules?: any
  emergencyBypassRoles: string[]
}

export interface ApprovalDecision {
  approvalId: string
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'BYPASSED'
  comments?: string
  userId: string
}

export interface WorkflowExecution {
  workflowId: string
  changeEventId: string
  currentStep: number
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'TIMEOUT'
  startedAt: Date
  completedAt?: Date
  approvals: any[]
}

class ApprovalWorkflowService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new approval workflow
   */
  async createWorkflow(request: CreateWorkflowRequest): Promise<string> {
    try {
      const workflow = await this.prisma.changeApprovalWorkflow.create({
        data: {
          projectId: request.projectId,
          workflowName: request.workflowName,
          description: request.description,
          triggerConditions: request.triggerConditions,
          approvalSteps: request.approvalSteps,
          parallelApproval: request.parallelApproval,
          autoApproveConditions: request.autoApproveConditions,
          defaultTimeoutHours: request.defaultTimeoutHours,
          escalationRules: request.escalationRules,
          emergencyBypassRoles: request.emergencyBypassRoles
        }
      })

      logger.info(`Approval workflow created: ${workflow.id} for project ${request.projectId}`)
      return workflow.id
    } catch (error) {
      logger.error('Error creating approval workflow:', error)
      throw error
    }
  }

  /**
   * Start approval process for a change event
   */
  async startApprovalProcess(changeEventId: string): Promise<WorkflowExecution | null> {
    try {
      const changeEvent = await this.prisma.changeEvent.findUnique({
        where: { id: changeEventId },
        include: { project: true }
      })

      if (!changeEvent) {
        throw new Error('Change event not found')
      }

      // Find applicable workflow
      const workflow = await this.findApplicableWorkflow(changeEvent)
      
      if (!workflow) {
        logger.info(`No applicable workflow found for change event ${changeEventId}`)
        return null
      }

      // Check auto-approval conditions
      if (await this.checkAutoApprovalConditions(changeEvent, workflow)) {
        await this.prisma.changeEvent.update({
          where: { id: changeEventId },
          data: {
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            completedAt: new Date()
          }
        })

        logger.info(`Change event ${changeEventId} auto-approved`)
        return null
      }

      // Create approval records for all steps
      const approvalSteps = workflow.approvalSteps as WorkflowStep[]
      const approvals = []

      for (const step of approvalSteps) {
        const approval = await this.prisma.changeApproval.create({
          data: {
            changeEventId,
            workflowId: workflow.id,
            stepNumber: step.stepNumber,
            stepName: step.stepName,
            approverRole: step.approverRole,
            approverUserId: step.approverUserId,
            dueDate: new Date(Date.now() + step.timeoutHours * 60 * 60 * 1000)
          }
        })

        approvals.push(approval)
      }

      // Update change event status
      await this.prisma.changeEvent.update({
        where: { id: changeEventId },
        data: { approvalStatus: 'PENDING' }
      })

      // Notify first approver(s)
      await this.notifyApprovers(changeEventId, workflow, 1)

      const execution: WorkflowExecution = {
        workflowId: workflow.id,
        changeEventId,
        currentStep: 1,
        status: 'PENDING',
        startedAt: new Date(),
        approvals: approvals.map(a => ({
          id: a.id,
          stepNumber: a.stepNumber,
          stepName: a.stepName,
          approverRole: a.approverRole,
          status: a.approvalStatus,
          dueDate: a.dueDate
        }))
      }

      logger.info(`Approval process started for change event ${changeEventId} with workflow ${workflow.id}`)
      return execution
    } catch (error) {
      logger.error('Error starting approval process:', error)
      throw error
    }
  }

  /**
   * Process approval decision
   */
  async processApprovalDecision(decision: ApprovalDecision): Promise<void> {
    try {
      const approval = await this.prisma.changeApproval.findUnique({
        where: { id: decision.approvalId },
        include: {
          changeEvent: true,
          workflow: true
        }
      })

      if (!approval) {
        throw new Error('Approval not found')
      }

      // Update approval record
      await this.prisma.changeApproval.update({
        where: { id: decision.approvalId },
        data: {
          approvalStatus: decision.decision,
          decisionDate: new Date(),
          comments: decision.comments,
          approverUserId: decision.userId
        }
      })

      // Handle decision
      switch (decision.decision) {
        case 'APPROVED':
          await this.handleApprovalGranted(approval)
          break
        case 'REJECTED':
          await this.handleApprovalRejected(approval, decision.comments)
          break
        case 'ESCALATED':
          await this.handleApprovalEscalated(approval)
          break
        case 'BYPASSED':
          await this.handleApprovalBypassed(approval, decision.userId)
          break
      }

      logger.info(`Approval decision processed: ${decision.decision} for approval ${decision.approvalId}`)
    } catch (error) {
      logger.error('Error processing approval decision:', error)
      throw error
    }
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(userId: string, role: string): Promise<any[]> {
    try {
      const approvals = await this.prisma.changeApproval.findMany({
        where: {
          OR: [
            { approverUserId: userId },
            { approverRole: role }
          ],
          approvalStatus: 'PENDING',
          dueDate: { gt: new Date() }
        },
        include: {
          changeEvent: {
            include: {
              project: {
                select: { id: true, name: true, projectCode: true }
              },
              triggeredBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          workflow: {
            select: { id: true, workflowName: true, description: true }
          }
        },
        orderBy: { assignedAt: 'asc' }
      })

      return approvals
    } catch (error) {
      logger.error('Error getting pending approvals:', error)
      throw error
    }
  }

  /**
   * Get approval history for a change event
   */
  async getApprovalHistory(changeEventId: string): Promise<any[]> {
    try {
      const approvals = await this.prisma.changeApproval.findMany({
        where: { changeEventId },
        include: {
          approverUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          workflow: {
            select: { id: true, workflowName: true }
          }
        },
        orderBy: { stepNumber: 'asc' }
      })

      return approvals
    } catch (error) {
      logger.error('Error getting approval history:', error)
      throw error
    }
  }

  /**
   * Handle overdue approvals
   */
  async processOverdueApprovals(): Promise<void> {
    try {
      const overdueApprovals = await this.prisma.changeApproval.findMany({
        where: {
          approvalStatus: 'PENDING',
          dueDate: { lt: new Date() }
        },
        include: {
          changeEvent: true,
          workflow: true
        }
      })

      for (const approval of overdueApprovals) {
        await this.handleOverdueApproval(approval)
      }

      logger.info(`Processed ${overdueApprovals.length} overdue approvals`)
    } catch (error) {
      logger.error('Error processing overdue approvals:', error)
      throw error
    }
  }

  /**
   * Bypass approval (emergency procedure)
   */
  async bypassApproval(changeEventId: string, userId: string, reason: string): Promise<void> {
    try {
      // Verify user has bypass authority
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      const changeEvent = await this.prisma.changeEvent.findUnique({
        where: { id: changeEventId },
        include: {
          project: {
            include: {
              approvalWorkflows: {
                where: { isActive: true }
              }
            }
          }
        }
      })

      if (!user || !changeEvent) {
        throw new Error('User or change event not found')
      }

      // Check if user role is in emergency bypass roles
      const workflow = changeEvent.project?.approvalWorkflows?.[0]
      const canBypass = workflow?.emergencyBypassRoles?.includes(user.role) || user.role === 'ADMIN'

      if (!canBypass) {
        throw new Error('User does not have emergency bypass authority')
      }

      // Update all pending approvals as bypassed
      await this.prisma.changeApproval.updateMany({
        where: {
          changeEventId,
          approvalStatus: 'PENDING'
        },
        data: {
          approvalStatus: 'BYPASSED',
          decisionDate: new Date(),
          comments: `Emergency bypass: ${reason}`,
          approverUserId: userId
        }
      })

      // Update change event
      await this.prisma.changeEvent.update({
        where: { id: changeEventId },
        data: {
          approvalStatus: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
          completedAt: new Date()
        }
      })

      // Log the bypass action
      await this.prisma.userActivityLog.create({
        data: {
          userId,
          activityType: 'APPROVAL_BYPASS',
          entityType: 'CHANGE_EVENT',
          entityId: changeEventId,
          description: `Emergency approval bypass: ${reason}`,
          projectId: changeEvent.projectId
        }
      })

      logger.info(`Approval bypassed for change event ${changeEventId} by user ${userId}: ${reason}`)
    } catch (error) {
      logger.error('Error bypassing approval:', error)
      throw error
    }
  }

  /**
   * Find applicable workflow for a change event
   */
  private async findApplicableWorkflow(changeEvent: any) {
    const workflows = await this.prisma.changeApprovalWorkflow.findMany({
      where: {
        projectId: changeEvent.projectId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Find the first workflow whose trigger conditions match
    for (const workflow of workflows) {
      if (await this.matchesTriggerConditions(changeEvent, workflow.triggerConditions)) {
        return workflow
      }
    }

    return null
  }

  /**
   * Check if change event matches workflow trigger conditions
   */
  private async matchesTriggerConditions(changeEvent: any, triggerConditions: any): Promise<boolean> {
    if (!triggerConditions) return true

    // Simple condition matching (can be extended)
    if (triggerConditions.impactLevel && triggerConditions.impactLevel !== changeEvent.impactLevel) {
      return false
    }

    if (triggerConditions.entityType && triggerConditions.entityType !== changeEvent.entityType) {
      return false
    }

    if (triggerConditions.changeType && triggerConditions.changeType !== changeEvent.changeType) {
      return false
    }

    return true
  }

  /**
   * Check auto-approval conditions
   */
  private async checkAutoApprovalConditions(changeEvent: any, workflow: any): Promise<boolean> {
    const conditions = workflow.autoApproveConditions
    if (!conditions) return false

    // Check conditions (simplified)
    if (conditions.impactLevel === 'LOW' && changeEvent.impactLevel === 'LOW') {
      return true
    }

    if (conditions.entityType && conditions.entityType.includes(changeEvent.entityType)) {
      return true
    }

    return false
  }

  /**
   * Notify approvers
   */
  private async notifyApprovers(changeEventId: string, workflow: any, stepNumber: number): Promise<void> {
    const approvalSteps = workflow.approvalSteps as WorkflowStep[]
    const currentStep = approvalSteps.find(s => s.stepNumber === stepNumber)

    if (!currentStep) return

    // Get approvers for this step
    let approvers: any[] = []

    if (currentStep.approverUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentStep.approverUserId },
        select: { id: true, email: true, firstName: true, lastName: true }
      })
      if (user) approvers.push(user)
    } else if (currentStep.approverRole) {
      const users = await this.prisma.user.findMany({
        where: { role: currentStep.approverRole, isActive: true },
        select: { id: true, email: true, firstName: true, lastName: true }
      })
      approvers = users
    }

    // Create notifications
    for (const approver of approvers) {
      await this.prisma.changeNotification.create({
        data: {
          changeEventId,
          projectId: workflow.projectId,
          notificationType: 'APPROVAL_REQUIRED',
          priority: 'HIGH',
          title: 'Approval Required',
          message: `Change approval required for step ${stepNumber}: ${currentStep.stepName}`,
          recipientUserId: approver.id,
          actionRequired: true,
          actionUrl: `/approvals/${changeEventId}`,
          actionDeadline: new Date(Date.now() + currentStep.timeoutHours * 60 * 60 * 1000)
        }
      })
    }

    logger.info(`Notified ${approvers.length} approvers for step ${stepNumber} of change ${changeEventId}`)
  }

  /**
   * Handle approval granted
   */
  private async handleApprovalGranted(approval: any): Promise<void> {
    const workflow = approval.workflow
    const approvalSteps = workflow.approvalSteps as WorkflowStep[]
    const currentStep = approvalSteps.find(s => s.stepNumber === approval.stepNumber)

    if (!currentStep) return

    // Check if this completes the workflow
    const allApprovals = await this.prisma.changeApproval.findMany({
      where: { changeEventId: approval.changeEventId }
    })

    const isWorkflowComplete = this.checkWorkflowCompletion(allApprovals, approvalSteps, workflow.parallelApproval)

    if (isWorkflowComplete) {
      // Complete the approval process
      await this.prisma.changeEvent.update({
        where: { id: approval.changeEventId },
        data: {
          approvalStatus: 'APPROVED',
          approvedById: approval.approverUserId,
          approvedAt: new Date(),
          completedAt: new Date()
        }
      })

      logger.info(`Approval workflow completed for change event ${approval.changeEventId}`)
    } else {
      // Move to next step if sequential
      if (!workflow.parallelApproval) {
        const nextStep = approvalSteps.find(s => s.stepNumber === approval.stepNumber + 1)
        if (nextStep) {
          await this.notifyApprovers(approval.changeEventId, workflow, nextStep.stepNumber)
        }
      }
    }
  }

  /**
   * Handle approval rejected
   */
  private async handleApprovalRejected(approval: any, comments?: string): Promise<void> {
    await this.prisma.changeEvent.update({
      where: { id: approval.changeEventId },
      data: {
        approvalStatus: 'REJECTED',
        completedAt: new Date()
      }
    })

    // Notify change initiator
    await this.prisma.changeNotification.create({
      data: {
        changeEventId: approval.changeEventId,
        projectId: approval.workflow.projectId,
        notificationType: 'CHANGE_REJECTED',
        priority: 'HIGH',
        title: 'Change Rejected',
        message: `Your change request has been rejected. ${comments || ''}`,
        recipientUserId: approval.changeEvent.triggeredById
      }
    })

    logger.info(`Change event ${approval.changeEventId} rejected at step ${approval.stepNumber}`)
  }

  /**
   * Handle approval escalated
   */
  private async handleApprovalEscalated(approval: any): Promise<void> {
    // Implementation for escalation logic
    logger.info(`Approval escalated for change event ${approval.changeEventId}`)
  }

  /**
   * Handle approval bypassed
   */
  private async handleApprovalBypassed(approval: any, bypassUserId: string): Promise<void> {
    logger.info(`Approval bypassed for change event ${approval.changeEventId} by user ${bypassUserId}`)
  }

  /**
   * Handle overdue approval
   */
  private async handleOverdueApproval(approval: any): Promise<void> {
    // Update approval status
    await this.prisma.changeApproval.update({
      where: { id: approval.id },
      data: {
        approvalStatus: 'ESCALATED',
        escalatedAt: new Date()
      }
    })

    // Notify escalation contacts
    const escalationRules = approval.workflow.escalationRules
    if (escalationRules?.roles) {
      const escalationUsers = await this.prisma.user.findMany({
        where: {
          role: { in: escalationRules.roles },
          isActive: true
        }
      })

      for (const user of escalationUsers) {
        await this.prisma.changeNotification.create({
          data: {
            changeEventId: approval.changeEventId,
            projectId: approval.workflow.projectId,
            notificationType: 'APPROVAL_ESCALATED',
            priority: 'URGENT',
            title: 'Approval Escalated',
            message: `Approval for step ${approval.stepNumber} is overdue and has been escalated`,
            recipientUserId: user.id,
            actionRequired: true,
            actionUrl: `/approvals/${approval.changeEventId}`
          }
        })
      }
    }

    logger.info(`Overdue approval escalated: ${approval.id}`)
  }

  /**
   * Check if workflow is complete
   */
  private checkWorkflowCompletion(approvals: any[], approvalSteps: WorkflowStep[], isParallel: boolean): boolean {
    if (isParallel) {
      // All non-optional steps must be approved
      const requiredSteps = approvalSteps.filter(s => !s.isOptional)
      return requiredSteps.every(step =>
        approvals.some(a => a.stepNumber === step.stepNumber && a.approvalStatus === 'APPROVED')
      )
    } else {
      // Sequential: all steps up to the highest approved step must be approved
      const approvedSteps = approvals.filter(a => a.approvalStatus === 'APPROVED').map(a => a.stepNumber)
      if (approvedSteps.length === 0) return false

      const highestApproved = Math.max(...approvedSteps)
      const requiredSteps = approvalSteps.filter(s => s.stepNumber <= highestApproved && !s.isOptional)
      
      return requiredSteps.every(step =>
        approvals.some(a => a.stepNumber === step.stepNumber && a.approvalStatus === 'APPROVED')
      ) && highestApproved === Math.max(...approvalSteps.map(s => s.stepNumber))
    }
  }
}

export default ApprovalWorkflowService