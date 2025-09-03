import { PrismaClient } from '../generated/client'
import WebSocketService from './websocketService'
import logger from '../utils/logger'
import nodemailer from 'nodemailer'

interface NotificationTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  channels: ('EMAIL' | 'IN_APP' | 'SMS')[]
}

interface NotificationPreferences {
  userId: string
  actionItemAssigned: ('EMAIL' | 'IN_APP' | 'SMS')[]
  actionItemDueSoon: ('EMAIL' | 'IN_APP' | 'SMS')[]
  actionItemOverdue: ('EMAIL' | 'IN_APP' | 'SMS')[]
  riskLevelCritical: ('EMAIL' | 'IN_APP' | 'SMS')[]
  approvalRequired: ('EMAIL' | 'IN_APP' | 'SMS')[]
  approvalCompleted: ('EMAIL' | 'IN_APP' | 'SMS')[]
  changeEventHigh: ('EMAIL' | 'IN_APP' | 'SMS')[]
  complianceAlert: ('EMAIL' | 'IN_APP' | 'SMS')[]
  systemMaintenance: ('EMAIL' | 'IN_APP' | 'SMS')[]
}

interface NotificationContext {
  userId: string
  projectId?: string
  entityType?: string
  entityId?: string
  actionItemId?: string
  changeEventId?: string
  variables?: Record<string, any>
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  scheduledFor?: Date
}

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
}

class NotificationService {
  private prisma: PrismaClient
  private websocketService?: WebSocketService
  private emailTransporter?: nodemailer.Transporter
  private emailConfig: EmailConfig

  constructor(
    prisma: PrismaClient, 
    websocketService?: WebSocketService
  ) {
    this.prisma = prisma
    this.websocketService = websocketService
    
    // Configure email settings from environment
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || ''
      },
      from: process.env.SMTP_FROM || 'noreply@qms.local'
    }

    if (this.emailConfig.auth.user) {
      this.initializeEmailTransporter()
    }

    this.startNotificationScheduler()
  }

  /**
   * Send notification for action item assignment
   */
  async sendActionItemAssignment(
    actionItemId: string,
    assigneeId: string,
    assignedById: string
  ): Promise<void> {
    try {
      const [actionItem, assignee, assignedBy] = await Promise.all([
        this.prisma.actionItem.findUnique({
          where: { id: actionItemId },
          include: {
            failureMode: {
              include: {
                fmea: {
                  include: { project: true }
                }
              }
            }
          }
        }),
        this.prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, name: true, email: true }
        }),
        this.prisma.user.findUnique({
          where: { id: assignedById },
          select: { id: true, name: true, email: true }
        })
      ])

      if (!actionItem || !assignee || !assignedBy) {
        throw new Error('Required entities not found for notification')
      }

      const context: NotificationContext = {
        userId: assigneeId,
        projectId: actionItem.failureMode?.fmea?.projectId,
        entityType: 'ACTION_ITEM',
        entityId: actionItemId,
        actionItemId,
        priority: this.determinePriority(actionItem.targetDate),
        variables: {
          assigneeName: assignee.name,
          assignedByName: assignedBy.name,
          actionDescription: actionItem.description,
          targetDate: actionItem.targetDate?.toLocaleDateString() || 'Not set',
          projectName: actionItem.failureMode?.fmea?.project?.name || 'Unknown',
          fmeaName: actionItem.failureMode?.fmea?.name || 'Unknown'
        }
      }

      await this.sendNotification('action_item_assigned', context)

    } catch (error) {
      logger.error('Error sending action item assignment notification:', error)
    }
  }

  /**
   * Send due date reminder notifications
   */
  async sendDueDateReminders(): Promise<void> {
    try {
      const upcomingItems = await this.prisma.actionItem.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          targetDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        },
        include: {
          assignedToUser: true,
          failureMode: {
            include: {
              fmea: {
                include: { project: true }
              }
            }
          }
        }
      })

      const overdueItems = await this.prisma.actionItem.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          targetDate: {
            lt: new Date()
          }
        },
        include: {
          assignedToUser: true,
          failureMode: {
            include: {
              fmea: {
                include: { project: true }
              }
            }
          }
        }
      })

      // Send due soon notifications
      for (const item of upcomingItems) {
        if (item.assignedToUser) {
          const context: NotificationContext = {
            userId: item.assignedToUser.id,
            projectId: item.failureMode?.fmea?.projectId,
            entityType: 'ACTION_ITEM',
            entityId: item.id,
            actionItemId: item.id,
            priority: 'MEDIUM',
            variables: {
              assigneeName: item.assignedToUser.name,
              actionDescription: item.description,
              targetDate: item.targetDate?.toLocaleDateString() || 'Not set',
              daysUntilDue: Math.ceil((item.targetDate!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
              projectName: item.failureMode?.fmea?.project?.name || 'Unknown'
            }
          }

          await this.sendNotification('action_item_due_soon', context)
        }
      }

      // Send overdue notifications
      for (const item of overdueItems) {
        if (item.assignedToUser) {
          const context: NotificationContext = {
            userId: item.assignedToUser.id,
            projectId: item.failureMode?.fmea?.projectId,
            entityType: 'ACTION_ITEM',
            entityId: item.id,
            actionItemId: item.id,
            priority: 'HIGH',
            variables: {
              assigneeName: item.assignedToUser.name,
              actionDescription: item.description,
              targetDate: item.targetDate?.toLocaleDateString() || 'Not set',
              daysPastDue: Math.ceil((Date.now() - item.targetDate!.getTime()) / (24 * 60 * 60 * 1000)),
              projectName: item.failureMode?.fmea?.project?.name || 'Unknown'
            }
          }

          await this.sendNotification('action_item_overdue', context)
        }
      }

    } catch (error) {
      logger.error('Error sending due date reminders:', error)
    }
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequest(
    workflowExecutionId: string,
    approverId: string,
    entityType: string,
    entityId: string
  ): Promise<void> {
    try {
      const [workflowExecution, approver] = await Promise.all([
        this.prisma.workflowExecution.findUnique({
          where: { id: workflowExecutionId },
          include: {
            workflow: true,
            changeEvent: {
              include: { project: true }
            }
          }
        }),
        this.prisma.user.findUnique({
          where: { id: approverId },
          select: { id: true, name: true, email: true }
        })
      ])

      if (!workflowExecution || !approver) {
        throw new Error('Required entities not found for approval notification')
      }

      const context: NotificationContext = {
        userId: approverId,
        projectId: workflowExecution.changeEvent?.projectId,
        entityType,
        entityId,
        priority: 'HIGH',
        variables: {
          approverName: approver.name,
          workflowName: workflowExecution.workflow?.workflowName || 'Approval Workflow',
          entityType: entityType.replace('_', ' '),
          projectName: workflowExecution.changeEvent?.project?.name || 'Unknown',
          timeoutHours: workflowExecution.currentStepTimeoutHours || 48
        }
      }

      await this.sendNotification('approval_required', context)

    } catch (error) {
      logger.error('Error sending approval request notification:', error)
    }
  }

  /**
   * Send critical risk alert
   */
  async sendCriticalRiskAlert(
    projectId: string,
    failureModeId: string,
    rpnValue: number
  ): Promise<void> {
    try {
      const [project, failureMode, stakeholders] = await Promise.all([
        this.prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, name: true }
        }),
        this.prisma.failureMode.findUnique({
          where: { id: failureModeId },
          include: {
            fmea: {
              include: {
                teamLeader: true,
                teamMembers: {
                  include: { user: true }
                }
              }
            }
          }
        }),
        this.getProjectStakeholders(projectId, ['QUALITY_MANAGER', 'PROCESS_ENGINEER'])
      ])

      if (!project || !failureMode) {
        throw new Error('Required entities not found for risk alert')
      }

      const recipients = new Set<string>()
      
      // Add team leader
      if (failureMode.fmea.teamLeader) {
        recipients.add(failureMode.fmea.teamLeader.id)
      }

      // Add team members
      failureMode.fmea.teamMembers?.forEach(member => {
        recipients.add(member.user.id)
      })

      // Add stakeholders
      stakeholders.forEach(user => recipients.add(user.id))

      // Send notifications to all recipients
      for (const userId of recipients) {
        const context: NotificationContext = {
          userId,
          projectId,
          entityType: 'FAILURE_MODE',
          entityId: failureModeId,
          priority: 'CRITICAL',
          variables: {
            projectName: project.name,
            fmeaName: failureMode.fmea.name,
            failureMode: failureMode.description,
            rpnValue: rpnValue.toString(),
            processFunction: failureMode.processFunction || 'Unknown'
          }
        }

        await this.sendNotification('risk_level_critical', context)
      }

    } catch (error) {
      logger.error('Error sending critical risk alert:', error)
    }
  }

  /**
   * Send compliance alert
   */
  async sendComplianceAlert(
    projectId: string,
    complianceIssue: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<void> {
    try {
      const [project, stakeholders] = await Promise.all([
        this.prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, name: true }
        }),
        this.getProjectStakeholders(projectId, ['QUALITY_MANAGER', 'ADMIN'])
      ])

      if (!project) {
        throw new Error('Project not found for compliance alert')
      }

      for (const user of stakeholders) {
        const context: NotificationContext = {
          userId: user.id,
          projectId,
          priority: severity,
          variables: {
            userName: user.name,
            projectName: project.name,
            complianceIssue,
            severity: severity.toLowerCase()
          }
        }

        await this.sendNotification('compliance_alert', context)
      }

    } catch (error) {
      logger.error('Error sending compliance alert:', error)
    }
  }

  /**
   * Send notification using specified template
   */
  private async sendNotification(
    templateId: string,
    context: NotificationContext
  ): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserNotificationPreferences(context.userId)
      const template = this.getNotificationTemplate(templateId)
      
      if (!template) {
        throw new Error(`Notification template ${templateId} not found`)
      }

      const channels = this.getEnabledChannels(templateId, preferences)

      // Create notification record
      const notification = await this.prisma.notification.create({
        data: {
          userId: context.userId,
          notificationType: templateId.toUpperCase(),
          title: this.interpolateTemplate(template.subject, context.variables || {}),
          message: this.interpolateTemplate(template.body, context.variables || {}),
          priority: context.priority,
          projectId: context.projectId,
          entityType: context.entityType,
          entityId: context.entityId,
          actionRequired: this.isActionRequired(templateId),
          scheduledFor: context.scheduledFor || new Date(),
          channels: channels.join(',')
        }
      })

      // Send via enabled channels
      for (const channel of channels) {
        switch (channel) {
          case 'IN_APP':
            await this.sendInAppNotification(notification)
            break
          case 'EMAIL':
            await this.sendEmailNotification(notification, context.variables || {})
            break
          case 'SMS':
            // SMS implementation would go here
            logger.info(`SMS notification sent to user ${context.userId}`)
            break
        }
      }

      // Mark as sent
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() }
      })

    } catch (error) {
      logger.error('Error sending notification:', error)
    }
  }

  /**
   * Send in-app notification via WebSocket
   */
  private async sendInAppNotification(notification: any): Promise<void> {
    if (this.websocketService) {
      this.websocketService.emitNotification(notification.userId, {
        id: notification.id,
        type: notification.notificationType,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        actionRequired: notification.actionRequired,
        actionUrl: notification.actionUrl,
        actionDeadline: notification.actionDeadline,
        timestamp: notification.createdAt
      })
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any, variables: Record<string, any>): Promise<void> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not configured')
      return
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, name: true }
      })

      if (!user?.email) {
        logger.warn(`No email address for user ${notification.userId}`)
        return
      }

      const mailOptions = {
        from: this.emailConfig.from,
        to: user.email,
        subject: notification.title,
        html: this.generateEmailHTML(notification, variables, user.name)
      }

      await this.emailTransporter.sendMail(mailOptions)
      logger.info(`Email notification sent to ${user.email}`)

    } catch (error) {
      logger.error('Error sending email notification:', error)
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId }
    })

    // Default preferences if none set
    const defaultPreferences: NotificationPreferences = {
      userId,
      actionItemAssigned: ['IN_APP', 'EMAIL'],
      actionItemDueSoon: ['IN_APP', 'EMAIL'],
      actionItemOverdue: ['IN_APP', 'EMAIL'],
      riskLevelCritical: ['IN_APP', 'EMAIL'],
      approvalRequired: ['IN_APP', 'EMAIL'],
      approvalCompleted: ['IN_APP'],
      changeEventHigh: ['IN_APP'],
      complianceAlert: ['IN_APP', 'EMAIL'],
      systemMaintenance: ['IN_APP', 'EMAIL']
    }

    return preferences?.notificationSettings ? 
      { ...defaultPreferences, ...JSON.parse(preferences.notificationSettings) } : 
      defaultPreferences
  }

  /**
   * Get notification templates
   */
  private getNotificationTemplate(templateId: string): NotificationTemplate | null {
    const templates: Record<string, NotificationTemplate> = {
      action_item_assigned: {
        id: 'action_item_assigned',
        name: 'Action Item Assigned',
        subject: 'New Action Item Assigned: {{actionDescription}}',
        body: 'Hello {{assigneeName}},\n\nYou have been assigned a new action item by {{assignedByName}}.\n\n' +
              'Action: {{actionDescription}}\nProject: {{projectName}}\nFMEA: {{fmeaName}}\nTarget Date: {{targetDate}}\n\n' +
              'Please review and take necessary action.',
        variables: ['assigneeName', 'assignedByName', 'actionDescription', 'targetDate', 'projectName', 'fmeaName'],
        channels: ['EMAIL', 'IN_APP']
      },
      action_item_due_soon: {
        id: 'action_item_due_soon',
        name: 'Action Item Due Soon',
        subject: 'Action Item Due in {{daysUntilDue}} days',
        body: 'Hello {{assigneeName}},\n\nYour action item is due in {{daysUntilDue}} days.\n\n' +
              'Action: {{actionDescription}}\nProject: {{projectName}}\nDue Date: {{targetDate}}\n\n' +
              'Please complete this action item before the due date.',
        variables: ['assigneeName', 'actionDescription', 'targetDate', 'daysUntilDue', 'projectName'],
        channels: ['EMAIL', 'IN_APP']
      },
      action_item_overdue: {
        id: 'action_item_overdue',
        name: 'Action Item Overdue',
        subject: 'OVERDUE: Action Item Past Due Date',
        body: 'Hello {{assigneeName}},\n\nYour action item is {{daysPastDue}} days overdue.\n\n' +
              'Action: {{actionDescription}}\nProject: {{projectName}}\nOriginal Due Date: {{targetDate}}\n\n' +
              'Please complete this action item immediately.',
        variables: ['assigneeName', 'actionDescription', 'targetDate', 'daysPastDue', 'projectName'],
        channels: ['EMAIL', 'IN_APP']
      },
      risk_level_critical: {
        id: 'risk_level_critical',
        name: 'Critical Risk Level Alert',
        subject: 'CRITICAL RISK ALERT: RPN {{rpnValue}}',
        body: 'CRITICAL RISK ALERT\n\nA failure mode has reached critical risk level:\n\n' +
              'Project: {{projectName}}\nFMEA: {{fmeaName}}\nProcess: {{processFunction}}\nFailure Mode: {{failureMode}}\nRPN: {{rpnValue}}\n\n' +
              'Immediate action required to mitigate this risk.',
        variables: ['projectName', 'fmeaName', 'processFunction', 'failureMode', 'rpnValue'],
        channels: ['EMAIL', 'IN_APP']
      },
      approval_required: {
        id: 'approval_required',
        name: 'Approval Required',
        subject: 'Approval Required: {{workflowName}}',
        body: 'Hello {{approverName}},\n\nYour approval is required for the following:\n\n' +
              'Workflow: {{workflowName}}\nEntity: {{entityType}}\nProject: {{projectName}}\n\n' +
              'Please review and provide your approval within {{timeoutHours}} hours.',
        variables: ['approverName', 'workflowName', 'entityType', 'projectName', 'timeoutHours'],
        channels: ['EMAIL', 'IN_APP']
      },
      compliance_alert: {
        id: 'compliance_alert',
        name: 'Compliance Alert',
        subject: 'Compliance Alert: {{complianceIssue}}',
        body: 'Hello {{userName}},\n\nA compliance issue has been identified:\n\n' +
              'Project: {{projectName}}\nIssue: {{complianceIssue}}\nSeverity: {{severity}}\n\n' +
              'Please review and address this compliance issue.',
        variables: ['userName', 'projectName', 'complianceIssue', 'severity'],
        channels: ['EMAIL', 'IN_APP']
      }
    }

    return templates[templateId] || null
  }

  /**
   * Helper methods
   */
  private determinePriority(targetDate?: Date | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (!targetDate) return 'MEDIUM'
    
    const daysUntilDue = Math.ceil((targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    
    if (daysUntilDue < 0) return 'CRITICAL'
    if (daysUntilDue <= 2) return 'HIGH'
    if (daysUntilDue <= 7) return 'MEDIUM'
    return 'LOW'
  }

  private getEnabledChannels(templateId: string, preferences: NotificationPreferences): ('EMAIL' | 'IN_APP' | 'SMS')[] {
    const mapping: Record<string, keyof NotificationPreferences> = {
      action_item_assigned: 'actionItemAssigned',
      action_item_due_soon: 'actionItemDueSoon',
      action_item_overdue: 'actionItemOverdue',
      risk_level_critical: 'riskLevelCritical',
      approval_required: 'approvalRequired',
      compliance_alert: 'complianceAlert'
    }

    const preferenceKey = mapping[templateId]
    return preferenceKey ? preferences[preferenceKey] as ('EMAIL' | 'IN_APP' | 'SMS')[] : ['IN_APP']
  }

  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match
    })
  }

  private isActionRequired(templateId: string): boolean {
    const actionRequiredTemplates = [
      'action_item_assigned',
      'action_item_overdue',
      'approval_required',
      'risk_level_critical'
    ]
    return actionRequiredTemplates.includes(templateId)
  }

  private async getProjectStakeholders(projectId: string, roles: string[]): Promise<Array<{id: string, name: string, email: string}>> {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: roles },
        isActive: true
      },
      select: { id: true, name: true, email: true }
    })

    return users
  }

  private generateEmailHTML(notification: any, variables: Record<string, any>, userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>${notification.title}</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
              .priority-high { border-left: 4px solid #ef4444; }
              .priority-critical { border-left: 4px solid #dc2626; background: #fef2f2; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h2>QMS - Quality Management System</h2>
              </div>
              <div class="content ${notification.priority === 'HIGH' ? 'priority-high' : ''} ${notification.priority === 'CRITICAL' ? 'priority-critical' : ''}">
                  <h3>${notification.title}</h3>
                  <p>Hello ${userName},</p>
                  <div>${notification.message.replace(/\n/g, '<br>')}</div>
                  ${notification.actionRequired ? '<p><strong>Action Required</strong></p>' : ''}
              </div>
              <div class="footer">
                  <p>This is an automated message from the QMS system. Please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `
  }

  private initializeEmailTransporter(): void {
    this.emailTransporter = nodemailer.createTransporter(this.emailConfig)
  }

  private startNotificationScheduler(): void {
    // Run due date reminders daily at 9 AM
    setInterval(async () => {
      const now = new Date()
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        await this.sendDueDateReminders()
      }
    }, 60 * 1000) // Check every minute

    logger.info('Notification scheduler started')
  }
}

export default NotificationService