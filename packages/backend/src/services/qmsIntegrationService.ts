import { PrismaClient } from '../generated/client'
import { Server as HTTPServer } from 'http'

// Import all Phase 5 services
import ReportGenerationService from './reportGenerationService'
import ExcelExportService from './excelExportService'
import ReportTemplateService from './reportTemplateService'
import AdvancedSearchService from './advancedSearchService'
import BulkOperationsService from './bulkOperationsService'
import DataImportService from './dataImportService'
import NotificationService from './notificationService'
import CommentingService from './commentingService'
import AdvancedAnalyticsService from './advancedAnalyticsService'
import AutomotiveStandardsService from './automotiveStandardsService'
import ErrorHandlingService from './errorHandlingService'

// Import Phase 4 services
import ChangeManagementIntegration from '../utils/changeManagementIntegration'
import WebSocketService from './websocketService'
import ChangeTrackingService from './changeTrackingService'
import VersionControlService from './versionControlService'
import RiskAnalyticsService from './riskAnalyticsService'
import ComplianceReportingService from './complianceReportingService'
import ApprovalWorkflowService from './approvalWorkflowService'

import logger from '../utils/logger'

interface QMSConfiguration {
  // Export & Reporting Configuration
  reporting: {
    enablePdfGeneration: boolean
    enableExcelExport: boolean
    enableBatchExport: boolean
    defaultTemplate: string
    maxExportSize: number
  }

  // Search & Operations Configuration
  search: {
    enableAdvancedSearch: boolean
    enableBulkOperations: boolean
    maxBulkOperationSize: number
    searchTimeout: number
  }

  // Import Configuration
  import: {
    enableExcelImport: boolean
    enableDataValidation: boolean
    maxImportSize: number
    supportedFormats: string[]
  }

  // Collaboration Configuration
  collaboration: {
    enableComments: boolean
    enableNotifications: boolean
    enableRealTimeUpdates: boolean
    notificationChannels: ('EMAIL' | 'IN_APP' | 'SMS')[]
  }

  // Analytics Configuration
  analytics: {
    enableAdvancedAnalytics: boolean
    enablePredictiveAnalytics: boolean
    enableTrendAnalysis: boolean
    analyticsRetentionDays: number
  }

  // Compliance Configuration
  compliance: {
    enableIATF16949: boolean
    enableAIAGVDA: boolean
    enableISO9001: boolean
    defaultStandard: 'IATF_16949' | 'AIAG_VDA' | 'ISO_9001'
  }

  // Security & Error Handling
  security: {
    enableRateLimit: boolean
    enableInputSanitization: boolean
    enableAuditLogging: boolean
    sessionTimeout: number
  }

  // Performance Configuration
  performance: {
    enableCaching: boolean
    enableCompression: boolean
    enableHealthMonitoring: boolean
    backupSchedule: string
  }
}

interface QMSSystemStatus {
  overall: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE' | 'DOWN'
  services: {
    core: ServiceStatus
    reporting: ServiceStatus
    analytics: ServiceStatus
    compliance: ServiceStatus
    collaboration: ServiceStatus
    import: ServiceStatus
  }
  performance: {
    averageResponseTime: number
    requestsPerMinute: number
    errorRate: number
    uptime: number
  }
  maintenance: {
    lastBackup: Date
    nextScheduledMaintenance: Date
    systemVersion: string
  }
}

interface ServiceStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  lastCheck: Date
  issues: string[]
}

interface QMSCapabilities {
  reporting: {
    pdfGeneration: boolean
    excelExport: boolean
    customTemplates: boolean
    batchExport: boolean
    scheduledReports: boolean
  }
  analytics: {
    riskAnalytics: boolean
    trendAnalysis: boolean
    predictiveInsights: boolean
    comparativeAnalysis: boolean
    heatMaps: boolean
  }
  compliance: {
    iatf16949: boolean
    aiagVda: boolean
    iso9001: boolean
    automatedAssessment: boolean
    auditTrail: boolean
  }
  collaboration: {
    realTimeComments: boolean
    userNotifications: boolean
    taskAssignment: boolean
    approvalWorkflows: boolean
    changeTracking: boolean
  }
  dataManagement: {
    bulkOperations: boolean
    excelImport: boolean
    advancedSearch: boolean
    dataValidation: boolean
    versionControl: boolean
  }
}

class QMSIntegrationService {
  private prisma: PrismaClient
  private httpServer: HTTPServer
  private configuration: QMSConfiguration
  
  // Core Services
  private websocketService: WebSocketService
  private changeTrackingService: ChangeTrackingService
  private versionControlService: VersionControlService
  private riskAnalyticsService: RiskAnalyticsService
  private complianceReportingService: ComplianceReportingService
  private approvalWorkflowService: ApprovalWorkflowService
  
  // Phase 5 Advanced Services
  private reportGenerationService: ReportGenerationService
  private excelExportService: ExcelExportService
  private reportTemplateService: ReportTemplateService
  private advancedSearchService: AdvancedSearchService
  private bulkOperationsService: BulkOperationsService
  private dataImportService: DataImportService
  private notificationService: NotificationService
  private commentingService: CommentingService
  private advancedAnalyticsService: AdvancedAnalyticsService
  private automotiveStandardsService: AutomotiveStandardsService
  private errorHandlingService: ErrorHandlingService
  
  // Change Management Integration
  private changeManagementIntegration: ChangeManagementIntegration

  constructor(httpServer: HTTPServer, prisma: PrismaClient, configuration?: Partial<QMSConfiguration>) {
    this.httpServer = httpServer
    this.prisma = prisma
    this.configuration = this.mergeConfiguration(configuration || {})

    this.initializeServices()
    this.setupSystemMonitoring()

    logger.info('QMS Integration Service initialized with comprehensive feature set')
  }

  /**
   * Initialize all services with proper dependencies
   */
  private initializeServices(): void {
    try {
      // Initialize core WebSocket service
      this.websocketService = new WebSocketService(this.httpServer, this.prisma)

      // Initialize Phase 4 services
      this.changeTrackingService = new ChangeTrackingService(this.prisma, this.websocketService.getIO())
      this.versionControlService = new VersionControlService(this.prisma)
      this.riskAnalyticsService = new RiskAnalyticsService(this.prisma)
      this.complianceReportingService = new ComplianceReportingService(this.prisma)
      this.approvalWorkflowService = new ApprovalWorkflowService(this.prisma)

      // Initialize error handling first (needed by other services)
      this.errorHandlingService = new ErrorHandlingService(this.prisma)

      // Initialize notification service (needed by other services)
      this.notificationService = new NotificationService(
        this.prisma,
        this.websocketService
      )

      // Initialize Phase 5 advanced services
      this.reportGenerationService = new ReportGenerationService(this.prisma)
      this.excelExportService = new ExcelExportService(this.prisma)
      this.reportTemplateService = new ReportTemplateService(this.prisma)
      this.advancedSearchService = new AdvancedSearchService(this.prisma)
      
      this.bulkOperationsService = new BulkOperationsService(
        this.prisma,
        this.changeTrackingService,
        this.websocketService
      )

      this.dataImportService = new DataImportService(this.prisma, this.bulkOperationsService)
      
      this.commentingService = new CommentingService(
        this.prisma,
        this.websocketService,
        this.notificationService
      )

      this.advancedAnalyticsService = new AdvancedAnalyticsService(this.prisma)
      this.automotiveStandardsService = new AutomotiveStandardsService(this.prisma)

      // Initialize change management integration
      this.changeManagementIntegration = new ChangeManagementIntegration(
        this.httpServer,
        this.prisma,
        {
          enableRealTimeTracking: this.configuration.collaboration.enableRealTimeUpdates,
          enableAutomaticVersioning: true,
          enableRiskAnalytics: this.configuration.analytics.enableAdvancedAnalytics,
          enableComplianceReporting: this.configuration.compliance.enableIATF16949,
          enableApprovalWorkflows: true,
          analyticsRefreshInterval: 60,
          versioningThreshold: 10
        }
      )

      logger.info('All QMS services initialized successfully')

    } catch (error) {
      logger.error('Error initializing QMS services:', error)
      throw error
    }
  }

  /**
   * Get all available services
   */
  getServices() {
    return {
      // Core services
      websocket: this.websocketService,
      changeTracking: this.changeTrackingService,
      versionControl: this.versionControlService,
      riskAnalytics: this.riskAnalyticsService,
      complianceReporting: this.complianceReportingService,
      approvalWorkflow: this.approvalWorkflowService,

      // Advanced reporting services
      reportGeneration: this.reportGenerationService,
      excelExport: this.excelExportService,
      reportTemplate: this.reportTemplateService,

      // Data management services
      advancedSearch: this.advancedSearchService,
      bulkOperations: this.bulkOperationsService,
      dataImport: this.dataImportService,

      // Collaboration services
      notification: this.notificationService,
      commenting: this.commentingService,

      // Analytics services
      advancedAnalytics: this.advancedAnalyticsService,

      // Compliance services
      automotiveStandards: this.automotiveStandardsService,

      // System services
      errorHandling: this.errorHandlingService,
      changeManagement: this.changeManagementIntegration
    }
  }

  /**
   * Get system capabilities
   */
  getCapabilities(): QMSCapabilities {
    return {
      reporting: {
        pdfGeneration: this.configuration.reporting.enablePdfGeneration,
        excelExport: this.configuration.reporting.enableExcelExport,
        customTemplates: true,
        batchExport: this.configuration.reporting.enableBatchExport,
        scheduledReports: true
      },
      analytics: {
        riskAnalytics: this.configuration.analytics.enableAdvancedAnalytics,
        trendAnalysis: this.configuration.analytics.enableTrendAnalysis,
        predictiveInsights: this.configuration.analytics.enablePredictiveAnalytics,
        comparativeAnalysis: true,
        heatMaps: true
      },
      compliance: {
        iatf16949: this.configuration.compliance.enableIATF16949,
        aiagVda: this.configuration.compliance.enableAIAGVDA,
        iso9001: this.configuration.compliance.enableISO9001,
        automatedAssessment: true,
        auditTrail: this.configuration.security.enableAuditLogging
      },
      collaboration: {
        realTimeComments: this.configuration.collaboration.enableComments,
        userNotifications: this.configuration.collaboration.enableNotifications,
        taskAssignment: true,
        approvalWorkflows: true,
        changeTracking: true
      },
      dataManagement: {
        bulkOperations: this.configuration.search.enableBulkOperations,
        excelImport: this.configuration.import.enableExcelImport,
        advancedSearch: this.configuration.search.enableAdvancedSearch,
        dataValidation: this.configuration.import.enableDataValidation,
        versionControl: true
      }
    }
  }

  /**
   * Setup comprehensive project for QMS
   */
  async setupProject(
    projectId: string, 
    userId: string,
    options: {
      enableChangeManagement?: boolean
      enableCompliance?: boolean
      enableAnalytics?: boolean
      createDefaultWorkflows?: boolean
      generateInitialReports?: boolean
    } = {}
  ): Promise<void> {
    try {
      logger.info(`Setting up comprehensive QMS for project ${projectId}`)

      const {
        enableChangeManagement = true,
        enableCompliance = true,
        enableAnalytics = true,
        createDefaultWorkflows = true,
        generateInitialReports = true
      } = options

      // Setup change management
      if (enableChangeManagement) {
        await this.changeManagementIntegration.setupProject(projectId, userId)
      }

      // Generate initial compliance assessment
      if (enableCompliance && this.configuration.compliance.enableIATF16949) {
        await this.automotiveStandardsService.performIATF16949Assessment(projectId)
      }

      // Generate initial analytics baseline
      if (enableAnalytics) {
        await this.riskAnalyticsService.generateProjectRiskAnalytics(projectId)
      }

      // Create default workflows
      if (createDefaultWorkflows) {
        await this.changeManagementIntegration.createDefaultWorkflows(projectId)
      }

      // Generate initial reports
      if (generateInitialReports) {
        // Generate executive summary
        const executiveSummary = await this.reportGenerationService.generateExecutiveSummaryReport(projectId)
        
        // Create initial templates
        const templates = await this.reportTemplateService.getAvailableTemplates()
        
        logger.info(`Generated ${templates.length} report templates for project`)
      }

      logger.info(`QMS setup complete for project ${projectId}`)

    } catch (error) {
      logger.error('Error setting up QMS project:', error)
      throw error
    }
  }

  /**
   * Get comprehensive project dashboard data
   */
  async getProjectDashboard(projectId: string, userId: string): Promise<{
    overview: any
    riskSummary: any
    complianceSummary: any
    recentActivity: any[]
    pendingTasks: any[]
    systemHealth: any
    recommendations: string[]
  }> {
    try {
      const [
        projectReport,
        riskAnalytics,
        complianceReport,
        recentChanges,
        pendingApprovals,
        systemHealth
      ] = await Promise.all([
        this.changeManagementIntegration.generateProjectReport(projectId, userId),
        this.riskAnalyticsService.getProjectRiskSummary(projectId),
        this.complianceReportingService.getLatestComplianceReport(projectId),
        this.changeTrackingService.getRecentChanges(projectId, { limit: 10 }),
        this.approvalWorkflowService.getPendingApprovals(userId),
        this.errorHandlingService.getSystemHealth()
      ])

      // Generate recommendations based on current state
      const recommendations = this.generateProjectRecommendations({
        riskAnalytics,
        complianceReport,
        recentChanges,
        pendingApprovals
      })

      return {
        overview: {
          projectName: projectReport.project?.name || 'Unknown Project',
          lastUpdated: new Date(),
          totalProcesses: projectReport.processStepsCount || 0,
          totalFMEAItems: projectReport.fmeaItemsCount || 0,
          overallRiskLevel: riskAnalytics.overallRiskLevel || 'UNKNOWN'
        },
        riskSummary: {
          totalRPN: riskAnalytics.totalRpn || 0,
          averageRPN: riskAnalytics.averageRpn || 0,
          highRiskItems: riskAnalytics.highRiskItems || 0,
          criticalRiskItems: riskAnalytics.criticalRiskItems || 0,
          riskTrend: 'STABLE' // Would be calculated from trend analysis
        },
        complianceSummary: {
          overallScore: complianceReport?.overallScore || 0,
          standardType: complianceReport?.standardType || 'IATF_16949',
          nonConformities: complianceReport?.nonCompliantItems || 0,
          lastAssessment: complianceReport?.generatedAt || null
        },
        recentActivity: recentChanges.slice(0, 5),
        pendingTasks: pendingApprovals.slice(0, 10),
        systemHealth: {
          status: systemHealth.status,
          services: systemHealth.services,
          uptime: systemHealth.metrics.uptime
        },
        recommendations
      }

    } catch (error) {
      logger.error('Error getting project dashboard:', error)
      throw error
    }
  }

  /**
   * Perform comprehensive system health check
   */
  async performSystemHealthCheck(): Promise<QMSSystemStatus> {
    try {
      const [
        systemHealth,
        websocketStats,
        databaseHealth
      ] = await Promise.all([
        this.errorHandlingService.performHealthCheck(),
        this.websocketService.getConnectionStats(),
        this.checkDatabasePerformance()
      ])

      const serviceStatus = this.evaluateServiceHealth(systemHealth)

      return {
        overall: this.determineOverallStatus(serviceStatus),
        services: serviceStatus,
        performance: {
          averageResponseTime: systemHealth.metrics.responseTime,
          requestsPerMinute: 0, // Would calculate from actual metrics
          errorRate: 0, // Would calculate from actual metrics
          uptime: systemHealth.metrics.uptime
        },
        maintenance: {
          lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000), // Placeholder
          nextScheduledMaintenance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Placeholder
          systemVersion: '5.0.0'
        }
      }

    } catch (error) {
      logger.error('Error performing system health check:', error)
      return this.getEmergencyHealthStatus()
    }
  }

  /**
   * Generate comprehensive system report
   */
  async generateSystemReport(
    startDate: Date,
    endDate: Date,
    includeProjects?: string[]
  ): Promise<{
    summary: any
    performance: any
    usage: any
    compliance: any
    recommendations: string[]
  }> {
    try {
      // Get analytics for the period
      const analyticsResults = await Promise.all((includeProjects || []).map(async projectId => {
        return await this.advancedAnalyticsService.generateRPNTrendAnalysis(projectId, 'monthly', 90)
      }))

      // Get compliance assessments
      const complianceResults = await Promise.all((includeProjects || []).map(async projectId => {
        return await this.automotiveStandardsService.performIATF16949Assessment(projectId)
      }))

      const summary = {
        reportPeriod: { startDate, endDate },
        projectsAnalyzed: includeProjects?.length || 0,
        totalUsers: await this.prisma.user.count({ where: { isActive: true } }),
        totalProjects: await this.prisma.project.count(),
        systemUptime: process.uptime()
      }

      const performance = {
        averageResponseTime: 150, // Would calculate from actual metrics
        systemUtilization: 75, // Would calculate from actual metrics
        errorRate: 0.1, // Would calculate from actual metrics
        peakUsageHours: '9:00-17:00'
      }

      const usage = {
        totalFMEAs: await this.prisma.fmea.count(),
        totalFailureModes: await this.prisma.failureMode.count(),
        totalActionItems: await this.prisma.actionItem.count(),
        reportsGenerated: 0, // Would track in database
        exportOperations: 0 // Would track in database
      }

      const compliance = {
        projectsAssessed: complianceResults.length,
        averageComplianceScore: complianceResults.reduce((sum, result) => sum + result.overallScore, 0) / (complianceResults.length || 1),
        totalNonConformities: complianceResults.reduce((sum, result) => sum + result.nonConformities.length, 0),
        criticalFindings: complianceResults.reduce((sum, result) => 
          sum + result.nonConformities.filter(nc => nc.severity === 'MAJOR').length, 0
        )
      }

      const recommendations = this.generateSystemRecommendations({
        analyticsResults,
        complianceResults,
        performance,
        usage
      })

      return {
        summary,
        performance,
        usage,
        compliance,
        recommendations
      }

    } catch (error) {
      logger.error('Error generating system report:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */
  private mergeConfiguration(userConfig: Partial<QMSConfiguration>): QMSConfiguration {
    const defaultConfig: QMSConfiguration = {
      reporting: {
        enablePdfGeneration: true,
        enableExcelExport: true,
        enableBatchExport: true,
        defaultTemplate: 'engineering-technical',
        maxExportSize: 10000
      },
      search: {
        enableAdvancedSearch: true,
        enableBulkOperations: true,
        maxBulkOperationSize: 1000,
        searchTimeout: 30000
      },
      import: {
        enableExcelImport: true,
        enableDataValidation: true,
        maxImportSize: 5000,
        supportedFormats: ['xlsx', 'csv']
      },
      collaboration: {
        enableComments: true,
        enableNotifications: true,
        enableRealTimeUpdates: true,
        notificationChannels: ['EMAIL', 'IN_APP']
      },
      analytics: {
        enableAdvancedAnalytics: true,
        enablePredictiveAnalytics: true,
        enableTrendAnalysis: true,
        analyticsRetentionDays: 365
      },
      compliance: {
        enableIATF16949: true,
        enableAIAGVDA: true,
        enableISO9001: false,
        defaultStandard: 'IATF_16949'
      },
      security: {
        enableRateLimit: true,
        enableInputSanitization: true,
        enableAuditLogging: true,
        sessionTimeout: 3600
      },
      performance: {
        enableCaching: true,
        enableCompression: true,
        enableHealthMonitoring: true,
        backupSchedule: '0 2 * * *' // Daily at 2 AM
      }
    }

    return {
      reporting: { ...defaultConfig.reporting, ...userConfig.reporting },
      search: { ...defaultConfig.search, ...userConfig.search },
      import: { ...defaultConfig.import, ...userConfig.import },
      collaboration: { ...defaultConfig.collaboration, ...userConfig.collaboration },
      analytics: { ...defaultConfig.analytics, ...userConfig.analytics },
      compliance: { ...defaultConfig.compliance, ...userConfig.compliance },
      security: { ...defaultConfig.security, ...userConfig.security },
      performance: { ...defaultConfig.performance, ...userConfig.performance }
    }
  }

  private setupSystemMonitoring(): void {
    // Setup periodic health checks
    setInterval(async () => {
      try {
        const health = await this.performSystemHealthCheck()
        if (health.overall === 'DEGRADED' || health.overall === 'DOWN') {
          logger.warn('System health degraded:', health)
          // Send alert to administrators
        }
      } catch (error) {
        logger.error('Health monitoring error:', error)
      }
    }, 5 * 60 * 1000) // Every 5 minutes

    logger.info('System monitoring started')
  }

  private async checkDatabasePerformance(): Promise<any> {
    const startTime = Date.now()
    
    try {
      await this.prisma.$queryRaw`SELECT 1`
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 100 ? 'HEALTHY' : responseTime < 500 ? 'DEGRADED' : 'UNHEALTHY',
        responseTime,
        connectionPool: 'HEALTHY' // Would check actual pool status
      }
    } catch (error) {
      return {
        status: 'UNHEALTHY',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database check failed'
      }
    }
  }

  private evaluateServiceHealth(systemHealth: any): QMSSystemStatus['services'] {
    return {
      core: {
        status: systemHealth.services.database.status === 'healthy' ? 'HEALTHY' : 'UNHEALTHY',
        lastCheck: new Date(),
        issues: systemHealth.services.database.status !== 'healthy' ? ['Database connectivity issues'] : []
      },
      reporting: {
        status: 'HEALTHY',
        lastCheck: new Date(),
        issues: []
      },
      analytics: {
        status: systemHealth.services.analytics ? 'HEALTHY' : 'DEGRADED',
        lastCheck: new Date(),
        issues: []
      },
      compliance: {
        status: 'HEALTHY',
        lastCheck: new Date(),
        issues: []
      },
      collaboration: {
        status: systemHealth.services.websocket ? 'HEALTHY' : 'DEGRADED',
        lastCheck: new Date(),
        issues: []
      },
      import: {
        status: systemHealth.services.fileSystem.status === 'healthy' ? 'HEALTHY' : 'DEGRADED',
        lastCheck: new Date(),
        issues: systemHealth.services.fileSystem.status !== 'healthy' ? ['File system access limited'] : []
      }
    }
  }

  private determineOverallStatus(services: QMSSystemStatus['services']): QMSSystemStatus['overall'] {
    const serviceStatuses = Object.values(services).map(s => s.status)
    
    if (serviceStatuses.some(s => s === 'UNHEALTHY')) {
      return 'DEGRADED'
    }
    
    if (serviceStatuses.every(s => s === 'HEALTHY')) {
      return 'OPERATIONAL'
    }
    
    return 'DEGRADED'
  }

  private getEmergencyHealthStatus(): QMSSystemStatus {
    return {
      overall: 'DOWN',
      services: {
        core: { status: 'UNHEALTHY', lastCheck: new Date(), issues: ['System check failed'] },
        reporting: { status: 'UNHEALTHY', lastCheck: new Date(), issues: ['System check failed'] },
        analytics: { status: 'UNHEALTHY', lastCheck: new Date(), issues: ['System check failed'] },
        compliance: { status: 'UNHEALTHY', lastCheck: new Date(), issues: ['System check failed'] },
        collaboration: { status: 'UNHEALTHY', lastCheck: new Date(), issues: ['System check failed'] },
        import: { status: 'UNHEALTHY', lastCheck: new Date(), issues: ['System check failed'] }
      },
      performance: {
        averageResponseTime: 0,
        requestsPerMinute: 0,
        errorRate: 100,
        uptime: process.uptime()
      },
      maintenance: {
        lastBackup: new Date(),
        nextScheduledMaintenance: new Date(),
        systemVersion: '5.0.0'
      }
    }
  }

  private generateProjectRecommendations(data: any): string[] {
    const recommendations: string[] = []

    if (data.riskAnalytics?.criticalRiskItems > 0) {
      recommendations.push(`Address ${data.riskAnalytics.criticalRiskItems} critical risk items immediately`)
    }

    if (data.riskAnalytics?.averageRpn > 150) {
      recommendations.push('Overall risk level is elevated - consider comprehensive risk reduction program')
    }

    if (data.complianceReport?.overallScore < 85) {
      recommendations.push('Compliance score below target - review and address gaps')
    }

    if (data.pendingApprovals?.length > 10) {
      recommendations.push('High number of pending approvals - review workflow efficiency')
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating within normal parameters - maintain current practices')
    }

    return recommendations
  }

  private generateSystemRecommendations(data: any): string[] {
    const recommendations: string[] = []

    if (data.performance?.errorRate > 1) {
      recommendations.push('Error rate elevated - investigate system stability')
    }

    if (data.compliance?.averageComplianceScore < 80) {
      recommendations.push('Average compliance scores below target across projects')
    }

    if (data.usage?.totalActionItems > data.usage?.totalFMEAs * 5) {
      recommendations.push('High action item to FMEA ratio - consider process improvement')
    }

    recommendations.push('Regular system monitoring and maintenance schedules are active')
    recommendations.push('Consider upgrading to latest security patches')

    return recommendations
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down QMS Integration Service...')

    try {
      // Shutdown services in reverse order of initialization
      await this.changeManagementIntegration.shutdown()
      this.errorHandlingService.shutdown()
      
      logger.info('QMS Integration Service shutdown complete')
    } catch (error) {
      logger.error('Error during QMS shutdown:', error)
    }
  }
}

export default QMSIntegrationService