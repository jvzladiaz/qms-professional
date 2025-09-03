import { PrismaClient } from '../generated/client'
import { Server as HTTPServer } from 'http'
import WebSocketService from '../services/websocketService'
import ChangeTrackingService from '../services/changeTrackingService'
import VersionControlService from '../services/versionControlService'
import RiskAnalyticsService from '../services/riskAnalyticsService'
import ComplianceReportingService from '../services/complianceReportingService'
import ApprovalWorkflowService from '../services/approvalWorkflowService'
import logger from './logger'

export interface ChangeManagementConfig {
  enableRealTimeTracking: boolean
  enableAutomaticVersioning: boolean
  enableRiskAnalytics: boolean
  enableComplianceReporting: boolean
  enableApprovalWorkflows: boolean
  analyticsRefreshInterval: number // minutes
  versioningThreshold: number // number of changes before auto-version
}

class ChangeManagementIntegration {
  private prisma: PrismaClient
  private websocketService: WebSocketService
  private changeTrackingService: ChangeTrackingService
  private versionControlService: VersionControlService
  private riskAnalyticsService: RiskAnalyticsService
  private complianceReportingService: ComplianceReportingService
  private approvalWorkflowService: ApprovalWorkflowService
  private config: ChangeManagementConfig
  private analyticsInterval?: NodeJS.Timeout
  private approvalCheckInterval?: NodeJS.Timeout

  constructor(
    httpServer: HTTPServer, 
    prisma: PrismaClient, 
    config: ChangeManagementConfig
  ) {
    this.prisma = prisma
    this.config = config
    
    // Initialize services
    this.websocketService = new WebSocketService(httpServer, prisma)
    this.changeTrackingService = new ChangeTrackingService(prisma, this.websocketService.getIO())
    this.versionControlService = new VersionControlService(prisma)
    this.riskAnalyticsService = new RiskAnalyticsService(prisma)
    this.complianceReportingService = new ComplianceReportingService(prisma)
    this.approvalWorkflowService = new ApprovalWorkflowService(prisma)

    this.initializeBackgroundServices()
    logger.info('Change Management Integration initialized')
  }

  /**
   * Get all service instances
   */
  getServices() {
    return {
      websocket: this.websocketService,
      changeTracking: this.changeTrackingService,
      versionControl: this.versionControlService,
      riskAnalytics: this.riskAnalyticsService,
      complianceReporting: this.complianceReportingService,
      approvalWorkflow: this.approvalWorkflowService
    }
  }

  /**
   * Initialize background services and intervals
   */
  private initializeBackgroundServices(): void {
    // Risk Analytics Refresh Interval
    if (this.config.enableRiskAnalytics) {
      this.analyticsInterval = setInterval(
        () => this.refreshProjectAnalytics(),
        this.config.analyticsRefreshInterval * 60 * 1000
      )
    }

    // Approval Check Interval (every 5 minutes)
    if (this.config.enableApprovalWorkflows) {
      this.approvalCheckInterval = setInterval(
        () => this.checkOverdueApprovals(),
        5 * 60 * 1000
      )
    }

    logger.info('Background services initialized')
  }

  /**
   * Refresh risk analytics for all active projects
   */
  private async refreshProjectAnalytics(): Promise<void> {
    try {
      const activeProjects = await this.prisma.project.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true }
      })

      for (const project of activeProjects) {
        try {
          await this.riskAnalyticsService.generateProjectRiskAnalytics(project.id)
          
          // Get updated risk summary
          const riskSummary = await this.riskAnalyticsService.getProjectRiskSummary(project.id)
          
          // Emit real-time update
          this.websocketService.emitAnalyticsUpdate(project.id, {
            totalRpn: riskSummary.totalRpn,
            averageRpn: riskSummary.averageRpn,
            highRiskItems: riskSummary.highRiskItems,
            complianceScore: riskSummary.complianceScore,
            riskTrend: 'STABLE' // Would be calculated from trend analysis
          })

          // Check for risk alerts
          if (riskSummary.overallRiskLevel === 'CRITICAL') {
            this.websocketService.emitRiskAlert(project.id, {
              type: 'CRITICAL_FAILURE',
              severity: 'CRITICAL',
              title: 'Critical Risk Level Detected',
              message: `Project ${project.name} has reached critical risk level`,
              entityType: 'PROJECT',
              entityId: project.id
            })
          }

          logger.debug(`Risk analytics refreshed for project ${project.id}`)
        } catch (error) {
          logger.error(`Error refreshing analytics for project ${project.id}:`, error)
        }
      }
    } catch (error) {
      logger.error('Error in refreshProjectAnalytics:', error)
    }
  }

  /**
   * Check for overdue approvals and handle escalations
   */
  private async checkOverdueApprovals(): Promise<void> {
    try {
      await this.approvalWorkflowService.processOverdueApprovals()
    } catch (error) {
      logger.error('Error checking overdue approvals:', error)
    }
  }

  /**
   * Create default workflows for a project
   */
  async createDefaultWorkflows(projectId: string): Promise<void> {
    try {
      if (!this.config.enableApprovalWorkflows) return

      // High Impact Change Workflow
      await this.approvalWorkflowService.createWorkflow({
        projectId,
        workflowName: 'High Impact Change Approval',
        description: 'Required approval workflow for high and critical impact changes',
        triggerConditions: {
          impactLevel: ['HIGH', 'CRITICAL']
        },
        approvalSteps: [
          {
            stepNumber: 1,
            stepName: 'Process Engineer Review',
            approverRole: 'PROCESS_ENGINEER',
            timeoutHours: 24,
            isParallel: false,
            isOptional: false
          },
          {
            stepNumber: 2,
            stepName: 'Quality Manager Approval',
            approverRole: 'QUALITY_MANAGER',
            timeoutHours: 48,
            escalationRoles: ['ADMIN'],
            isParallel: false,
            isOptional: false
          }
        ],
        parallelApproval: false,
        defaultTimeoutHours: 48,
        emergencyBypassRoles: ['ADMIN'],
        autoApproveConditions: {
          impactLevel: 'LOW',
          entityType: ['PROCESS_INPUT', 'PROCESS_OUTPUT']
        }
      })

      // FMEA Change Workflow
      await this.approvalWorkflowService.createWorkflow({
        projectId,
        workflowName: 'FMEA Change Approval',
        description: 'Approval workflow for FMEA-related changes',
        triggerConditions: {
          entityType: ['FMEA', 'FAILURE_MODE', 'FAILURE_CAUSE', 'FAILURE_CONTROL']
        },
        approvalSteps: [
          {
            stepNumber: 1,
            stepName: 'FMEA Team Lead Review',
            approverRole: 'PROCESS_ENGINEER',
            timeoutHours: 24,
            isParallel: false,
            isOptional: false
          },
          {
            stepNumber: 2,
            stepName: 'Quality Approval',
            approverRole: 'QUALITY_MANAGER',
            timeoutHours: 48,
            isParallel: false,
            isOptional: false
          }
        ],
        parallelApproval: false,
        defaultTimeoutHours: 48,
        emergencyBypassRoles: ['ADMIN'],
        autoApproveConditions: {
          impactLevel: 'LOW'
        }
      })

      logger.info(`Default workflows created for project ${projectId}`)
    } catch (error) {
      logger.error('Error creating default workflows:', error)
      throw error
    }
  }

  /**
   * Setup project for change management
   */
  async setupProject(projectId: string, userId: string): Promise<void> {
    try {
      // Create initial baseline version
      if (this.config.enableAutomaticVersioning) {
        await this.versionControlService.createProjectSnapshot({
          projectId,
          versionName: 'Initial Baseline',
          description: 'Initial project baseline for change tracking',
          isBaseline: true
        }, userId)
      }

      // Generate initial risk analytics
      if (this.config.enableRiskAnalytics) {
        await this.riskAnalyticsService.generateProjectRiskAnalytics(projectId)
      }

      // Create default workflows
      await this.createDefaultWorkflows(projectId)

      logger.info(`Project ${projectId} setup complete for change management`)
    } catch (error) {
      logger.error('Error setting up project for change management:', error)
      throw error
    }
  }

  /**
   * Generate comprehensive project report
   */
  async generateProjectReport(projectId: string, userId: string): Promise<{
    riskSummary: any
    complianceReport: string
    auditTrail: any
    changesSummary: any
  }> {
    try {
      const [
        riskSummary,
        complianceReportId,
        auditTrail,
        changesSummary
      ] = await Promise.all([
        this.riskAnalyticsService.getProjectRiskSummary(projectId),
        this.complianceReportingService.generateAiagVdaReport(projectId, userId),
        this.complianceReportingService.getAuditTrail({
          projectId,
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          limit: 100
        }),
        this.getChangesSummary(projectId)
      ])

      return {
        riskSummary,
        complianceReport: complianceReportId,
        auditTrail,
        changesSummary
      }
    } catch (error) {
      logger.error('Error generating project report:', error)
      throw error
    }
  }

  /**
   * Get changes summary for a project
   */
  private async getChangesSummary(projectId: string): Promise<any> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalChanges,
      recentChanges,
      highImpactChanges,
      pendingApprovals
    ] = await Promise.all([
      this.prisma.changeEvent.count({
        where: { projectId }
      }),
      this.prisma.changeEvent.count({
        where: {
          projectId,
          triggeredAt: { gte: last30Days }
        }
      }),
      this.prisma.changeEvent.count({
        where: {
          projectId,
          impactLevel: { in: ['HIGH', 'CRITICAL'] }
        }
      }),
      this.prisma.changeEvent.count({
        where: {
          projectId,
          approvalStatus: 'PENDING'
        }
      })
    ])

    return {
      totalChanges,
      recentChanges,
      highImpactChanges,
      pendingApprovals,
      period: '30 days'
    }
  }

  /**
   * Health check for change management system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: Record<string, boolean>
    metrics: any
  }> {
    const services = {
      database: false,
      websocket: false,
      analytics: false
    }

    try {
      // Database check
      await this.prisma.$queryRaw`SELECT 1`
      services.database = true
    } catch (error) {
      logger.error('Database health check failed:', error)
    }

    try {
      // WebSocket check
      const stats = this.websocketService.getConnectionStats()
      services.websocket = stats.totalConnections >= 0
    } catch (error) {
      logger.error('WebSocket health check failed:', error)
    }

    try {
      // Analytics check (try to get KPIs)
      await this.riskAnalyticsService.getDashboardKPIs()
      services.analytics = true
    } catch (error) {
      logger.error('Analytics health check failed:', error)
    }

    const healthyServices = Object.values(services).filter(Boolean).length
    const totalServices = Object.keys(services).length
    
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyServices === totalServices) {
      status = 'healthy'
    } else if (healthyServices >= totalServices * 0.5) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    const metrics = {
      websocketConnections: this.websocketService.getConnectionStats(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }

    return { status, services, metrics }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval)
    }

    if (this.approvalCheckInterval) {
      clearInterval(this.approvalCheckInterval)
    }

    logger.info('Change Management Integration shut down')
  }
}

export default ChangeManagementIntegration