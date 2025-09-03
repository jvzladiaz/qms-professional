import { PrismaClient } from '../generated/client'
import ReportGenerationService from './reportGenerationService'
import ExcelExportService from './excelExportService'
import logger from '../utils/logger'

interface TemplateConfig {
  templateId: string
  templateName: string
  stakeholderType: 'executive' | 'management' | 'engineering' | 'quality' | 'operator' | 'supplier' | 'auditor'
  format: 'pdf' | 'excel' | 'both'
  sections: {
    executiveSummary: boolean
    riskOverview: boolean
    processFlow: boolean
    fmeaDetails: boolean
    controlPlan: boolean
    actionItems: boolean
    complianceStatus: boolean
    trendAnalysis: boolean
    recommendations: boolean
    auditTrail: boolean
  }
  customization: {
    logo?: string
    headerText?: string
    footerText?: string
    colorScheme?: 'standard' | 'automotive' | 'corporate' | 'minimal'
    includeCharts: boolean
    includePhotos: boolean
    detailLevel: 'summary' | 'standard' | 'detailed'
  }
  filters?: {
    riskLevel?: string[]
    department?: string[]
    dateRange?: {
      startDate: Date
      endDate: Date
    }
    status?: string[]
  }
}

interface BatchExportOptions {
  projectIds: string[]
  templateId: string
  outputFormat: 'individual' | 'combined'
  fileNaming: 'projectName' | 'timestamp' | 'custom'
  customPrefix?: string
}

class ReportTemplateService {
  private prisma: PrismaClient
  private reportGenerationService: ReportGenerationService
  private excelExportService: ExcelExportService

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.reportGenerationService = new ReportGenerationService(prisma)
    this.excelExportService = new ExcelExportService(prisma)
  }

  /**
   * Get predefined report templates
   */
  getPredefinedTemplates(): TemplateConfig[] {
    return [
      {
        templateId: 'executive-summary',
        templateName: 'Executive Summary Report',
        stakeholderType: 'executive',
        format: 'pdf',
        sections: {
          executiveSummary: true,
          riskOverview: true,
          processFlow: false,
          fmeaDetails: false,
          controlPlan: false,
          actionItems: true,
          complianceStatus: true,
          trendAnalysis: true,
          recommendations: true,
          auditTrail: false
        },
        customization: {
          colorScheme: 'corporate',
          includeCharts: true,
          includePhotos: false,
          detailLevel: 'summary'
        }
      },
      {
        templateId: 'management-dashboard',
        templateName: 'Management Dashboard Report',
        stakeholderType: 'management',
        format: 'both',
        sections: {
          executiveSummary: true,
          riskOverview: true,
          processFlow: true,
          fmeaDetails: false,
          controlPlan: true,
          actionItems: true,
          complianceStatus: true,
          trendAnalysis: true,
          recommendations: true,
          auditTrail: false
        },
        customization: {
          colorScheme: 'standard',
          includeCharts: true,
          includePhotos: false,
          detailLevel: 'standard'
        }
      },
      {
        templateId: 'engineering-technical',
        templateName: 'Engineering Technical Report',
        stakeholderType: 'engineering',
        format: 'both',
        sections: {
          executiveSummary: false,
          riskOverview: true,
          processFlow: true,
          fmeaDetails: true,
          controlPlan: true,
          actionItems: true,
          complianceStatus: false,
          trendAnalysis: true,
          recommendations: true,
          auditTrail: true
        },
        customization: {
          colorScheme: 'automotive',
          includeCharts: true,
          includePhotos: true,
          detailLevel: 'detailed'
        }
      },
      {
        templateId: 'quality-audit',
        templateName: 'Quality Audit Report',
        stakeholderType: 'quality',
        format: 'pdf',
        sections: {
          executiveSummary: true,
          riskOverview: true,
          processFlow: true,
          fmeaDetails: true,
          controlPlan: true,
          actionItems: true,
          complianceStatus: true,
          trendAnalysis: false,
          recommendations: true,
          auditTrail: true
        },
        customization: {
          colorScheme: 'standard',
          includeCharts: false,
          includePhotos: false,
          detailLevel: 'detailed'
        }
      },
      {
        templateId: 'operator-instructions',
        templateName: 'Operator Instructions',
        stakeholderType: 'operator',
        format: 'pdf',
        sections: {
          executiveSummary: false,
          riskOverview: false,
          processFlow: true,
          fmeaDetails: false,
          controlPlan: true,
          actionItems: false,
          complianceStatus: false,
          trendAnalysis: false,
          recommendations: false,
          auditTrail: false
        },
        customization: {
          colorScheme: 'minimal',
          includeCharts: false,
          includePhotos: true,
          detailLevel: 'summary'
        }
      },
      {
        templateId: 'supplier-requirements',
        templateName: 'Supplier Requirements Report',
        stakeholderType: 'supplier',
        format: 'both',
        sections: {
          executiveSummary: true,
          riskOverview: true,
          processFlow: true,
          fmeaDetails: false,
          controlPlan: true,
          actionItems: false,
          complianceStatus: true,
          trendAnalysis: false,
          recommendations: false,
          auditTrail: false
        },
        customization: {
          colorScheme: 'automotive',
          includeCharts: true,
          includePhotos: false,
          detailLevel: 'standard'
        }
      },
      {
        templateId: 'compliance-audit',
        templateName: 'Compliance Audit Report',
        stakeholderType: 'auditor',
        format: 'pdf',
        sections: {
          executiveSummary: true,
          riskOverview: true,
          processFlow: true,
          fmeaDetails: true,
          controlPlan: true,
          actionItems: true,
          complianceStatus: true,
          trendAnalysis: true,
          recommendations: true,
          auditTrail: true
        },
        customization: {
          colorScheme: 'standard',
          includeCharts: true,
          includePhotos: false,
          detailLevel: 'detailed'
        }
      }
    ]
  }

  /**
   * Generate report using template
   */
  async generateTemplateReport(
    projectId: string,
    templateId: string,
    customizations?: Partial<TemplateConfig>
  ): Promise<{ pdfBuffer?: Buffer, excelBuffer?: Buffer }> {
    try {
      const template = this.getTemplateById(templateId)
      if (!template) {
        throw new Error(`Template ${templateId} not found`)
      }

      // Apply customizations if provided
      const finalTemplate = customizations 
        ? this.mergeTemplateConfig(template, customizations)
        : template

      const result: { pdfBuffer?: Buffer, excelBuffer?: Buffer } = {}

      // Generate PDF if required
      if (finalTemplate.format === 'pdf' || finalTemplate.format === 'both') {
        result.pdfBuffer = await this.generateTemplatePDF(projectId, finalTemplate)
      }

      // Generate Excel if required
      if (finalTemplate.format === 'excel' || finalTemplate.format === 'both') {
        result.excelBuffer = await this.generateTemplateExcel(projectId, finalTemplate)
      }

      return result

    } catch (error) {
      logger.error(`Error generating template report for project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Generate batch reports for multiple projects
   */
  async generateBatchReports(options: BatchExportOptions): Promise<{
    files: Array<{
      projectId: string
      projectName: string
      fileName: string
      pdfBuffer?: Buffer
      excelBuffer?: Buffer
    }>
    combinedBuffer?: Buffer
  }> {
    try {
      const template = this.getTemplateById(options.templateId)
      if (!template) {
        throw new Error(`Template ${options.templateId} not found`)
      }

      const projects = await this.prisma.project.findMany({
        where: { id: { in: options.projectIds } },
        select: { id: true, name: true }
      })

      const files: Array<{
        projectId: string
        projectName: string
        fileName: string
        pdfBuffer?: Buffer
        excelBuffer?: Buffer
      }> = []

      // Generate individual reports
      for (const project of projects) {
        try {
          const reportResult = await this.generateTemplateReport(project.id, options.templateId)
          
          const fileName = this.generateFileName(
            project.name,
            options.fileNaming,
            options.customPrefix,
            template.format
          )

          files.push({
            projectId: project.id,
            projectName: project.name,
            fileName,
            pdfBuffer: reportResult.pdfBuffer,
            excelBuffer: reportResult.excelBuffer
          })

        } catch (error) {
          logger.error(`Error generating report for project ${project.id}:`, error)
          // Continue with other projects
        }
      }

      const result: {
        files: typeof files
        combinedBuffer?: Buffer
      } = { files }

      // Generate combined report if requested
      if (options.outputFormat === 'combined' && files.length > 1) {
        result.combinedBuffer = await this.generateCombinedReport(files, template)
      }

      return result

    } catch (error) {
      logger.error('Error generating batch reports:', error)
      throw error
    }
  }

  /**
   * Generate custom template report with full customization
   */
  async generateCustomReport(
    projectId: string,
    customTemplate: TemplateConfig
  ): Promise<{ pdfBuffer?: Buffer, excelBuffer?: Buffer }> {
    try {
      const result: { pdfBuffer?: Buffer, excelBuffer?: Buffer } = {}

      // Generate PDF if required
      if (customTemplate.format === 'pdf' || customTemplate.format === 'both') {
        result.pdfBuffer = await this.generateTemplatePDF(projectId, customTemplate)
      }

      // Generate Excel if required
      if (customTemplate.format === 'excel' || customTemplate.format === 'both') {
        result.excelBuffer = await this.generateTemplateExcel(projectId, customTemplate)
      }

      return result

    } catch (error) {
      logger.error(`Error generating custom report for project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Get available template configurations
   */
  async getAvailableTemplates(stakeholderType?: string): Promise<TemplateConfig[]> {
    const templates = this.getPredefinedTemplates()
    
    if (stakeholderType) {
      return templates.filter(template => template.stakeholderType === stakeholderType)
    }
    
    return templates
  }

  /**
   * Save custom template configuration
   */
  async saveCustomTemplate(
    userId: string,
    templateName: string,
    config: TemplateConfig
  ): Promise<string> {
    try {
      const customTemplate = await this.prisma.reportTemplate.create({
        data: {
          name: templateName,
          stakeholderType: config.stakeholderType,
          format: config.format,
          configuration: JSON.stringify(config),
          createdById: userId,
          isPublic: false
        }
      })

      return customTemplate.id
    } catch (error) {
      logger.error('Error saving custom template:', error)
      throw error
    }
  }

  /**
   * Get user's saved templates
   */
  async getUserTemplates(userId: string): Promise<TemplateConfig[]> {
    try {
      const savedTemplates = await this.prisma.reportTemplate.findMany({
        where: {
          OR: [
            { createdById: userId },
            { isPublic: true }
          ]
        }
      })

      return savedTemplates.map(template => ({
        ...JSON.parse(template.configuration),
        templateId: template.id,
        templateName: template.name
      }))
    } catch (error) {
      logger.error('Error getting user templates:', error)
      return []
    }
  }

  /**
   * Generate template-based PDF report
   */
  private async generateTemplatePDF(projectId: string, template: TemplateConfig): Promise<Buffer> {
    // Based on stakeholder type, generate appropriate report
    switch (template.stakeholderType) {
      case 'executive':
        return await this.reportGenerationService.generateExecutiveSummaryReport(projectId)
      
      case 'engineering':
      case 'quality':
      case 'auditor':
        // Get first FMEA for the project
        const fmea = await this.prisma.fmea.findFirst({
          where: { projectId },
          select: { id: true }
        })
        if (fmea) {
          return await this.reportGenerationService.generateFMEAPdfReport(fmea.id, {
            includeHeader: true,
            includeFooter: true,
            includeProcessFlow: template.sections.processFlow,
            includeFMEA: template.sections.fmeaDetails,
            includeControlPlan: template.sections.controlPlan,
            includeRiskAnalytics: template.sections.riskOverview,
            template: template.customization.colorScheme as any || 'automotive',
            format: 'pdf'
          })
        }
        return await this.reportGenerationService.generateExecutiveSummaryReport(projectId)
      
      default:
        return await this.reportGenerationService.generateExecutiveSummaryReport(projectId)
    }
  }

  /**
   * Generate template-based Excel export
   */
  private async generateTemplateExcel(projectId: string, template: TemplateConfig): Promise<Buffer> {
    return await this.excelExportService.generateProjectExport(
      { projectId },
      {
        includeProcessFlow: template.sections.processFlow,
        includeFMEA: template.sections.fmeaDetails,
        includeControlPlan: template.sections.controlPlan,
        includeRiskAnalytics: template.sections.riskOverview,
        includeAuditTrail: template.sections.auditTrail,
        template: template.customization.colorScheme as any || 'standard'
      }
    )
  }

  /**
   * Generate combined report from multiple individual reports
   */
  private async generateCombinedReport(
    files: Array<{
      projectId: string
      projectName: string
      fileName: string
      pdfBuffer?: Buffer
      excelBuffer?: Buffer
    }>,
    template: TemplateConfig
  ): Promise<Buffer> {
    // For simplicity, combine all project data into one Excel export
    // In a real implementation, you might want to create a multi-page PDF or combined Excel workbook
    const projectIds = files.map(f => f.projectId)
    
    if (template.format === 'excel' || template.format === 'both') {
      return await this.excelExportService.generateProjectExport(
        { projectIds },
        {
          includeProcessFlow: template.sections.processFlow,
          includeFMEA: template.sections.fmeaDetails,
          includeControlPlan: template.sections.controlPlan,
          includeRiskAnalytics: template.sections.riskOverview,
          includeAuditTrail: template.sections.auditTrail,
          template: template.customization.colorScheme as any || 'standard'
        }
      )
    }

    // Default to executive summary for PDF
    return await this.reportGenerationService.generateExecutiveSummaryReport(projectIds[0])
  }

  /**
   * Get template by ID
   */
  private getTemplateById(templateId: string): TemplateConfig | null {
    const predefinedTemplates = this.getPredefinedTemplates()
    return predefinedTemplates.find(t => t.templateId === templateId) || null
  }

  /**
   * Merge template configurations
   */
  private mergeTemplateConfig(
    baseTemplate: TemplateConfig,
    customizations: Partial<TemplateConfig>
  ): TemplateConfig {
    return {
      ...baseTemplate,
      ...customizations,
      sections: {
        ...baseTemplate.sections,
        ...(customizations.sections || {})
      },
      customization: {
        ...baseTemplate.customization,
        ...(customizations.customization || {})
      },
      filters: customizations.filters || baseTemplate.filters
    }
  }

  /**
   * Generate appropriate file name
   */
  private generateFileName(
    projectName: string,
    naming: string,
    customPrefix?: string,
    format?: string
  ): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const cleanProjectName = projectName.replace(/[^a-zA-Z0-9\-_]/g, '_')

    let baseName: string
    switch (naming) {
      case 'timestamp':
        baseName = `QMS_Report_${timestamp}`
        break
      case 'custom':
        baseName = `${customPrefix || 'Report'}_${cleanProjectName}`
        break
      case 'projectName':
      default:
        baseName = `${cleanProjectName}_Report`
        break
    }

    return `${baseName}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
  }
}

export default ReportTemplateService