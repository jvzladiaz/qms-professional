import PDFDocument from 'pdfkit'
import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'
import * as fs from 'fs'
import * as path from 'path'

interface ReportConfig {
  includeHeader: boolean
  includeFooter: boolean
  includeProcessFlow: boolean
  includeFMEA: boolean
  includeControlPlan: boolean
  includeRiskAnalytics: boolean
  template: 'standard' | 'executive' | 'technical' | 'automotive'
  format: 'pdf' | 'excel'
}

interface FMEAReportData {
  project: any
  fmea: any
  processFlow?: any
  riskAnalytics?: any
}

class ReportGenerationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Generate comprehensive FMEA PDF report with automotive formatting
   */
  async generateFMEAPdfReport(
    fmeaId: string, 
    config: ReportConfig = { 
      includeHeader: true, 
      includeFooter: true, 
      includeProcessFlow: true,
      includeFMEA: true,
      includeControlPlan: false,
      includeRiskAnalytics: true,
      template: 'automotive',
      format: 'pdf'
    }
  ): Promise<Buffer> {
    try {
      const reportData = await this.getFMEAReportData(fmeaId, config)
      
      // Create PDF document with automotive standard page setup
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape', // FMEA worksheets are typically landscape
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      })

      // Collect PDF data in buffer
      const chunks: Buffer[] = []
      doc.on('data', chunk => chunks.push(chunk))

      // Generate report sections
      await this.addPdfHeader(doc, reportData, config)
      
      if (config.includeProcessFlow && reportData.processFlow) {
        await this.addProcessFlowSection(doc, reportData.processFlow)
      }

      if (config.includeFMEA) {
        await this.addFMEAWorksheet(doc, reportData.fmea)
      }

      if (config.includeRiskAnalytics && reportData.riskAnalytics) {
        await this.addRiskAnalyticsSection(doc, reportData.riskAnalytics)
      }

      await this.addPdfFooter(doc, reportData, config)

      // Finalize PDF
      doc.end()

      // Return buffer when PDF is complete
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        doc.on('error', reject)
      })

    } catch (error) {
      logger.error('Error generating FMEA PDF report:', error)
      throw error
    }
  }

  /**
   * Generate executive summary PDF report
   */
  async generateExecutiveSummaryReport(projectId: string): Promise<Buffer> {
    try {
      const projectData = await this.getProjectReportData(projectId)
      
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      })

      const chunks: Buffer[] = []
      doc.on('data', chunk => chunks.push(chunk))

      // Executive Summary Header
      doc.fontSize(18).font('Helvetica-Bold')
      doc.text('EXECUTIVE SUMMARY - QUALITY MANAGEMENT SYSTEM', 50, 50)
      doc.fontSize(12).font('Helvetica')
      doc.text(`Project: ${projectData.project.name}`, 50, 80)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 50, 100)

      let yPosition = 140

      // Key Metrics Summary
      doc.fontSize(14).font('Helvetica-Bold')
      doc.text('KEY METRICS', 50, yPosition)
      yPosition += 30

      doc.fontSize(10).font('Helvetica')
      const metrics = [
        `Total Process Steps: ${projectData.processStepsCount}`,
        `Total FMEA Items: ${projectData.fmeaItemsCount}`,
        `High Risk Items (RPN > 200): ${projectData.highRiskItemsCount}`,
        `Critical Risk Items (RPN > 300): ${projectData.criticalRiskItemsCount}`,
        `Average RPN: ${projectData.averageRPN?.toFixed(1) || 'N/A'}`,
        `Control Plan Coverage: ${projectData.controlPlanCoverage}%`,
        `Compliance Score: ${projectData.complianceScore}%`
      ]

      metrics.forEach(metric => {
        doc.text(metric, 70, yPosition)
        yPosition += 20
      })

      // Top Risk Areas
      yPosition += 20
      doc.fontSize(14).font('Helvetica-Bold')
      doc.text('TOP RISK AREAS', 50, yPosition)
      yPosition += 30

      if (projectData.topRiskAreas?.length > 0) {
        projectData.topRiskAreas.slice(0, 5).forEach((risk: any, index: number) => {
          doc.fontSize(10).font('Helvetica-Bold')
          doc.text(`${index + 1}. ${risk.processStep} - ${risk.failureMode}`, 70, yPosition)
          yPosition += 15
          doc.fontSize(9).font('Helvetica')
          doc.text(`   RPN: ${risk.rpn} | Severity: ${risk.severity} | Occurrence: ${risk.occurrence} | Detection: ${risk.detection}`, 70, yPosition)
          yPosition += 20
        })
      }

      // Recommendations
      yPosition += 20
      doc.fontSize(14).font('Helvetica-Bold')
      doc.text('RECOMMENDATIONS', 50, yPosition)
      yPosition += 30

      const recommendations = this.generateRecommendations(projectData)
      doc.fontSize(10).font('Helvetica')
      recommendations.forEach(rec => {
        doc.text(`• ${rec}`, 70, yPosition, { width: 450 })
        yPosition += 25
      })

      doc.end()

      return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
      })

    } catch (error) {
      logger.error('Error generating executive summary report:', error)
      throw error
    }
  }

  /**
   * Add PDF header with company branding and report info
   */
  private async addPdfHeader(doc: PDFKit.PDFDocument, reportData: FMEAReportData, config: ReportConfig): Promise<void> {
    if (!config.includeHeader) return

    // Header background
    doc.rect(0, 0, doc.page.width, 80).fill('#2563eb')

    // Company logo area (placeholder)
    doc.fill('white')
    doc.fontSize(16).font('Helvetica-Bold')
    doc.text('QMS - QUALITY MANAGEMENT SYSTEM', 50, 20)
    
    doc.fontSize(12).font('Helvetica')
    doc.text(`FMEA Worksheet: ${reportData.fmea.name}`, 50, 45)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, doc.page.width - 200, 20)
    doc.text(`Project: ${reportData.project.name}`, doc.page.width - 200, 35)
    doc.text(`Version: ${reportData.fmea.version || '1.0'}`, doc.page.width - 200, 50)

    // Reset fill color
    doc.fill('black')
  }

  /**
   * Add FMEA worksheet in automotive standard format
   */
  private async addFMEAWorksheet(doc: PDFKit.PDFDocument, fmea: any): Promise<void> {
    let yPosition = 120

    // FMEA Header Information
    doc.fontSize(14).font('Helvetica-Bold')
    doc.text('FAILURE MODE AND EFFECTS ANALYSIS (FMEA)', 50, yPosition)
    yPosition += 30

    // FMEA Info Table
    doc.fontSize(9).font('Helvetica')
    const infoTable = [
      ['FMEA Number:', fmea.fmeaNumber || 'N/A', 'FMEA Date:', fmea.createdAt ? new Date(fmea.createdAt).toLocaleDateString() : 'N/A'],
      ['Team Lead:', fmea.teamLeader?.name || 'N/A', 'Review Date:', fmea.reviewDate ? new Date(fmea.reviewDate).toLocaleDateString() : 'N/A'],
      ['Process/Product:', fmea.processName || 'N/A', 'Page:', '1 of 1']
    ]

    infoTable.forEach(row => {
      doc.text(row[0], 50, yPosition, { width: 100 })
      doc.text(row[1], 150, yPosition, { width: 150 })
      doc.text(row[2], 320, yPosition, { width: 100 })
      doc.text(row[3], 420, yPosition, { width: 150 })
      yPosition += 20
    })

    yPosition += 20

    // FMEA Table Headers
    const headers = [
      'Process\nFunction',
      'Potential\nFailure Mode',
      'Potential Effect\nof Failure',
      'S\nE\nV',
      'Potential\nCause',
      'O\nC\nC',
      'Current\nControls',
      'D\nE\nT',
      'RPN',
      'Recommended\nActions',
      'Resp.',
      'Action\nTaken',
      'S\nE\nV',
      'O\nC\nC',
      'D\nE\nT',
      'RPN'
    ]

    // Table structure for automotive FMEA format
    const columnWidths = [60, 70, 80, 25, 80, 25, 70, 25, 30, 80, 40, 60, 25, 25, 25, 30]
    let xPosition = 50

    // Draw table headers
    doc.fontSize(8).font('Helvetica-Bold')
    doc.rect(50, yPosition, doc.page.width - 100, 40).stroke()
    
    headers.forEach((header, index) => {
      doc.text(header, xPosition + 5, yPosition + 10, { 
        width: columnWidths[index] - 10, 
        align: 'center' 
      })
      
      // Draw column separator
      if (index < headers.length - 1) {
        doc.moveTo(xPosition + columnWidths[index], yPosition)
           .lineTo(xPosition + columnWidths[index], yPosition + 40)
           .stroke()
      }
      
      xPosition += columnWidths[index]
    })

    yPosition += 40

    // FMEA Data Rows
    doc.fontSize(7).font('Helvetica')
    
    if (fmea.failureModes && fmea.failureModes.length > 0) {
      for (const failureMode of fmea.failureModes) {
        const rowHeight = Math.max(30, Math.ceil(failureMode.description?.length / 10) * 10)
        
        // Draw row background
        doc.rect(50, yPosition, doc.page.width - 100, rowHeight).stroke()
        
        xPosition = 50
        const rowData = [
          failureMode.processFunction || '',
          failureMode.description || '',
          failureMode.effects?.[0]?.description || '',
          failureMode.effects?.[0]?.severity || '',
          failureMode.causes?.[0]?.description || '',
          failureMode.causes?.[0]?.occurrence || '',
          failureMode.causes?.[0]?.controls?.[0]?.description || '',
          failureMode.causes?.[0]?.controls?.[0]?.detection || '',
          this.calculateRPN(failureMode).toString(),
          failureMode.actionItems?.[0]?.description || '',
          failureMode.actionItems?.[0]?.assignedTo || '',
          failureMode.actionItems?.[0]?.completionNotes || '',
          failureMode.effects?.[0]?.revisedSeverity || failureMode.effects?.[0]?.severity || '',
          failureMode.causes?.[0]?.revisedOccurrence || failureMode.causes?.[0]?.occurrence || '',
          failureMode.causes?.[0]?.controls?.[0]?.revisedDetection || failureMode.causes?.[0]?.controls?.[0]?.detection || '',
          this.calculateRevisedRPN(failureMode).toString()
        ]

        rowData.forEach((data, index) => {
          doc.text(data, xPosition + 2, yPosition + 5, { 
            width: columnWidths[index] - 4,
            height: rowHeight - 10
          })
          
          // Draw column separator
          if (index < rowData.length - 1) {
            doc.moveTo(xPosition + columnWidths[index], yPosition)
               .lineTo(xPosition + columnWidths[index], yPosition + rowHeight)
               .stroke()
          }
          
          xPosition += columnWidths[index]
        })

        yPosition += rowHeight

        // Check if we need a new page
        if (yPosition > doc.page.height - 150) {
          doc.addPage()
          yPosition = 50
        }
      }
    }
  }

  /**
   * Add process flow section to PDF
   */
  private async addProcessFlowSection(doc: PDFKit.PDFDocument, processFlow: any): Promise<void> {
    doc.addPage()
    let yPosition = 50

    doc.fontSize(14).font('Helvetica-Bold')
    doc.text('PROCESS FLOW DIAGRAM', 50, yPosition)
    yPosition += 40

    doc.fontSize(10).font('Helvetica')
    doc.text(`Process: ${processFlow.name}`, 50, yPosition)
    doc.text(`Description: ${processFlow.description || 'N/A'}`, 50, yPosition + 20)
    yPosition += 60

    // Process Steps
    if (processFlow.processSteps && processFlow.processSteps.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold')
      doc.text('PROCESS STEPS', 50, yPosition)
      yPosition += 30

      processFlow.processSteps.forEach((step: any, index: number) => {
        doc.fontSize(10).font('Helvetica-Bold')
        doc.text(`${index + 1}. ${step.name}`, 70, yPosition)
        yPosition += 20

        doc.fontSize(9).font('Helvetica')
        if (step.description) {
          doc.text(`Description: ${step.description}`, 90, yPosition)
          yPosition += 15
        }
        
        if (step.resources && step.resources.length > 0) {
          doc.text(`Resources: ${step.resources.map((r: any) => r.name).join(', ')}`, 90, yPosition)
          yPosition += 15
        }

        yPosition += 10
      })
    }
  }

  /**
   * Add risk analytics section
   */
  private async addRiskAnalyticsSection(doc: PDFKit.PDFDocument, riskAnalytics: any): Promise<void> {
    doc.addPage()
    let yPosition = 50

    doc.fontSize(14).font('Helvetica-Bold')
    doc.text('RISK ANALYTICS SUMMARY', 50, yPosition)
    yPosition += 40

    const metrics = [
      ['Total RPN:', riskAnalytics.totalRpn?.toString() || 'N/A'],
      ['Average RPN:', riskAnalytics.averageRpn?.toFixed(2) || 'N/A'],
      ['High Risk Items:', riskAnalytics.highRiskItems?.toString() || '0'],
      ['Critical Risk Items:', riskAnalytics.criticalRiskItems?.toString() || '0'],
      ['Overall Risk Level:', riskAnalytics.overallRiskLevel || 'N/A'],
      ['Compliance Score:', `${riskAnalytics.complianceScore || 0}%`]
    ]

    doc.fontSize(11).font('Helvetica')
    metrics.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 70, yPosition)
      doc.font('Helvetica').text(value, 200, yPosition)
      yPosition += 25
    })
  }

  /**
   * Add PDF footer
   */
  private async addPdfFooter(doc: PDFKit.PDFDocument, reportData: FMEAReportData, config: ReportConfig): Promise<void> {
    if (!config.includeFooter) return

    const footerY = doc.page.height - 50

    doc.fontSize(8).font('Helvetica')
    doc.text(`Generated by QMS - ${new Date().toLocaleString()}`, 50, footerY)
    doc.text(`Project: ${reportData.project.name}`, doc.page.width - 200, footerY)
  }

  /**
   * Get FMEA report data with related information
   */
  private async getFMEAReportData(fmeaId: string, config: ReportConfig): Promise<FMEAReportData> {
    const fmea = await this.prisma.fmea.findUnique({
      where: { id: fmeaId },
      include: {
        project: true,
        failureModes: {
          include: {
            effects: true,
            causes: {
              include: {
                controls: true
              }
            },
            actionItems: true
          }
        },
        teamLeader: true,
        teamMembers: {
          include: {
            user: true
          }
        }
      }
    })

    if (!fmea) {
      throw new Error('FMEA not found')
    }

    const reportData: FMEAReportData = {
      project: fmea.project,
      fmea
    }

    // Get process flow if needed
    if (config.includeProcessFlow) {
      reportData.processFlow = await this.prisma.processFlow.findFirst({
        where: { projectId: fmea.projectId },
        include: {
          processSteps: {
            include: {
              resources: true,
              controlPoints: true,
              inputs: true,
              outputs: true
            }
          }
        }
      })
    }

    // Get risk analytics if needed
    if (config.includeRiskAnalytics) {
      reportData.riskAnalytics = await this.prisma.riskAnalytics.findFirst({
        where: { projectId: fmea.projectId },
        orderBy: { analysisDate: 'desc' }
      })
    }

    return reportData
  }

  /**
   * Get comprehensive project report data
   */
  private async getProjectReportData(projectId: string): Promise<any> {
    const [
      project,
      processStepsCount,
      fmeaItemsCount,
      highRiskItems,
      riskAnalytics
    ] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          fmeas: {
            include: {
              failureModes: {
                include: {
                  effects: true,
                  causes: {
                    include: { controls: true }
                  }
                }
              }
            }
          }
        }
      }),
      this.prisma.processStep.count({
        where: {
          processFlow: { projectId }
        }
      }),
      this.prisma.failureMode.count({
        where: {
          fmea: { projectId }
        }
      }),
      this.prisma.failureMode.findMany({
        where: {
          fmea: { projectId }
        },
        include: {
          effects: true,
          causes: {
            include: { controls: true }
          }
        }
      }),
      this.prisma.riskAnalytics.findFirst({
        where: { projectId },
        orderBy: { analysisDate: 'desc' }
      })
    ])

    // Calculate risk metrics
    const rpnValues = highRiskItems.map(item => this.calculateRPN(item)).filter(rpn => rpn > 0)
    const averageRPN = rpnValues.length > 0 ? rpnValues.reduce((a, b) => a + b, 0) / rpnValues.length : 0
    const highRiskItemsCount = rpnValues.filter(rpn => rpn > 200).length
    const criticalRiskItemsCount = rpnValues.filter(rpn => rpn > 300).length

    // Top risk areas
    const topRiskAreas = highRiskItems
      .map(item => ({
        processStep: item.processFunction || 'N/A',
        failureMode: item.description,
        rpn: this.calculateRPN(item),
        severity: item.effects?.[0]?.severity || 0,
        occurrence: item.causes?.[0]?.occurrence || 0,
        detection: item.causes?.[0]?.controls?.[0]?.detection || 0
      }))
      .sort((a, b) => b.rpn - a.rpn)

    return {
      project,
      processStepsCount,
      fmeaItemsCount,
      highRiskItemsCount,
      criticalRiskItemsCount,
      averageRPN,
      controlPlanCoverage: 85, // Placeholder - calculate based on actual data
      complianceScore: riskAnalytics?.complianceScore || 0,
      topRiskAreas
    }
  }

  /**
   * Generate recommendations based on project data
   */
  private generateRecommendations(projectData: any): string[] {
    const recommendations: string[] = []

    if (projectData.criticalRiskItemsCount > 0) {
      recommendations.push(`Immediate attention required: ${projectData.criticalRiskItemsCount} critical risk items (RPN > 300) need urgent mitigation actions.`)
    }

    if (projectData.highRiskItemsCount > projectData.fmeaItemsCount * 0.2) {
      recommendations.push(`High proportion of high-risk items (${Math.round(projectData.highRiskItemsCount / projectData.fmeaItemsCount * 100)}%) suggests need for comprehensive process review.`)
    }

    if (projectData.averageRPN > 100) {
      recommendations.push(`Average RPN of ${projectData.averageRPN.toFixed(1)} exceeds recommended threshold. Focus on improving detection and prevention controls.`)
    }

    if (projectData.complianceScore < 90) {
      recommendations.push(`Compliance score of ${projectData.complianceScore}% requires improvement to meet automotive industry standards.`)
    }

    if (recommendations.length === 0) {
      recommendations.push('Risk profile appears well-managed. Continue monitoring and regular reviews.')
    }

    return recommendations
  }

  /**
   * Calculate RPN for failure mode
   */
  private calculateRPN(failureMode: any): number {
    const severity = failureMode.effects?.[0]?.severity || 0
    const occurrence = failureMode.causes?.[0]?.occurrence || 0
    const detection = failureMode.causes?.[0]?.controls?.[0]?.detection || 0
    
    return severity * occurrence * detection
  }

  /**
   * Calculate revised RPN for failure mode
   */
  private calculateRevisedRPN(failureMode: any): number {
    const severity = failureMode.effects?.[0]?.revisedSeverity || failureMode.effects?.[0]?.severity || 0
    const occurrence = failureMode.causes?.[0]?.revisedOccurrence || failureMode.causes?.[0]?.occurrence || 0
    const detection = failureMode.causes?.[0]?.controls?.[0]?.revisedDetection || failureMode.causes?.[0]?.controls?.[0]?.detection || 0
    
    return severity * occurrence * detection
  }
}

export default ReportGenerationService