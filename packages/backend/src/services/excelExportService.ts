import ExcelJS from 'exceljs'
import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

interface ExportConfig {
  includeProcessFlow: boolean
  includeFMEA: boolean
  includeControlPlan: boolean
  includeRiskAnalytics: boolean
  includeAuditTrail: boolean
  template: 'standard' | 'automotive' | 'custom'
}

interface ExcelExportOptions {
  projectId?: string
  fmeaIds?: string[]
  controlPlanIds?: string[]
  processFlowIds?: string[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  filters?: {
    riskLevel?: string[]
    department?: string[]
    status?: string[]
  }
}

class ExcelExportService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Generate comprehensive Excel export with multiple worksheets
   */
  async generateProjectExport(
    options: ExcelExportOptions,
    config: ExportConfig = {
      includeProcessFlow: true,
      includeFMEA: true,
      includeControlPlan: true,
      includeRiskAnalytics: true,
      includeAuditTrail: false,
      template: 'automotive'
    }
  ): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook()
      
      // Set workbook properties
      workbook.creator = 'QMS - Quality Management System'
      workbook.created = new Date()
      workbook.modified = new Date()

      // Get project data
      const projectData = await this.getExportData(options, config)

      // Create worksheets based on configuration
      if (config.includeProcessFlow && projectData.processFlows?.length > 0) {
        await this.createProcessFlowWorksheet(workbook, projectData.processFlows)
      }

      if (config.includeFMEA && projectData.fmeas?.length > 0) {
        await this.createFMEAWorksheet(workbook, projectData.fmeas)
      }

      if (config.includeControlPlan && projectData.controlPlans?.length > 0) {
        await this.createControlPlanWorksheet(workbook, projectData.controlPlans)
      }

      if (config.includeRiskAnalytics && projectData.riskAnalytics?.length > 0) {
        await this.createRiskAnalyticsWorksheet(workbook, projectData.riskAnalytics)
      }

      if (config.includeAuditTrail && projectData.auditTrail?.length > 0) {
        await this.createAuditTrailWorksheet(workbook, projectData.auditTrail)
      }

      // Create summary worksheet
      await this.createSummaryWorksheet(workbook, projectData)

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer()
      return buffer as Buffer

    } catch (error) {
      logger.error('Error generating Excel export:', error)
      throw error
    }
  }

  /**
   * Generate FMEA-specific Excel export in automotive format
   */
  async generateFMEAExport(fmeaId: string): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'QMS - FMEA Export'
      workbook.created = new Date()

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

      await this.createAutomotiveFMEAWorksheet(workbook, fmea)
      
      const buffer = await workbook.xlsx.writeBuffer()
      return buffer as Buffer

    } catch (error) {
      logger.error('Error generating FMEA Excel export:', error)
      throw error
    }
  }

  /**
   * Generate Control Plan Excel export
   */
  async generateControlPlanExport(controlPlanId: string): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'QMS - Control Plan Export'
      workbook.created = new Date()

      const controlPlan = await this.prisma.controlPlan.findUnique({
        where: { id: controlPlanId },
        include: {
          project: true,
          controlPlanItems: {
            include: {
              controlMethods: true,
              measurementEquipment: true
            }
          },
          teamMembers: {
            include: {
              user: true
            }
          }
        }
      })

      if (!controlPlan) {
        throw new Error('Control Plan not found')
      }

      await this.createAutomotiveControlPlanWorksheet(workbook, controlPlan)
      
      const buffer = await workbook.xlsx.writeBuffer()
      return buffer as Buffer

    } catch (error) {
      logger.error('Error generating Control Plan Excel export:', error)
      throw error
    }
  }

  /**
   * Create Process Flow worksheet
   */
  private async createProcessFlowWorksheet(workbook: ExcelJS.Workbook, processFlows: any[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Process Flow', {
      pageSetup: { orientation: 'landscape', paperSize: 9 }
    })

    // Headers
    const headers = [
      'Process Flow Name',
      'Description', 
      'Department',
      'Step Number',
      'Step Name',
      'Step Description',
      'Step Type',
      'Resources',
      'Control Points',
      'Inputs',
      'Outputs',
      'Cycle Time',
      'Quality Requirements',
      'Created Date',
      'Updated Date'
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } }

    // Data rows
    for (const processFlow of processFlows) {
      if (processFlow.processSteps && processFlow.processSteps.length > 0) {
        for (const step of processFlow.processSteps) {
          worksheet.addRow([
            processFlow.name,
            processFlow.description || '',
            processFlow.department || '',
            step.stepNumber,
            step.name,
            step.description || '',
            step.stepType || '',
            step.resources?.map((r: any) => r.name).join(', ') || '',
            step.controlPoints?.map((c: any) => c.name).join(', ') || '',
            step.inputs?.map((i: any) => i.name).join(', ') || '',
            step.outputs?.map((o: any) => o.name).join(', ') || '',
            step.cycleTime || '',
            step.qualityRequirements || '',
            processFlow.createdAt ? new Date(processFlow.createdAt).toLocaleDateString() : '',
            processFlow.updatedAt ? new Date(processFlow.updatedAt).toLocaleDateString() : ''
          ])
        }
      } else {
        // Add row for process flow without steps
        worksheet.addRow([
          processFlow.name,
          processFlow.description || '',
          processFlow.department || '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          processFlow.createdAt ? new Date(processFlow.createdAt).toLocaleDateString() : '',
          processFlow.updatedAt ? new Date(processFlow.updatedAt).toLocaleDateString() : ''
        ])
      }
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20
    })

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  /**
   * Create FMEA worksheet
   */
  private async createFMEAWorksheet(workbook: ExcelJS.Workbook, fmeas: any[]): Promise<void> {
    const worksheet = workbook.addWorksheet('FMEA', {
      pageSetup: { orientation: 'landscape', paperSize: 9 }
    })

    // FMEA Headers (Automotive standard)
    const headers = [
      'FMEA Name',
      'Process Function',
      'Failure Mode',
      'Failure Effect',
      'Severity',
      'Failure Cause',
      'Occurrence',
      'Current Controls',
      'Detection',
      'RPN',
      'Recommended Actions',
      'Responsibility',
      'Target Date',
      'Actions Taken',
      'Revised Severity',
      'Revised Occurrence', 
      'Revised Detection',
      'Revised RPN',
      'Status',
      'Created Date'
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D32F2F' } }

    // Data rows
    for (const fmea of fmeas) {
      if (fmea.failureModes && fmea.failureModes.length > 0) {
        for (const failureMode of fmea.failureModes) {
          // Handle multiple effects, causes, and controls
          const effects = failureMode.effects || []
          const causes = failureMode.causes || []
          
          if (effects.length > 0 && causes.length > 0) {
            for (const effect of effects) {
              for (const cause of causes) {
                const controls = cause.controls || [{}]
                
                for (const control of controls) {
                  const actionItems = failureMode.actionItems || [{}]
                  
                  for (const actionItem of actionItems) {
                    worksheet.addRow([
                      fmea.name,
                      failureMode.processFunction || '',
                      failureMode.description || '',
                      effect.description || '',
                      effect.severity || '',
                      cause.description || '',
                      cause.occurrence || '',
                      control.description || '',
                      control.detection || '',
                      this.calculateRPN(effect.severity, cause.occurrence, control.detection),
                      actionItem.description || '',
                      actionItem.assignedTo || '',
                      actionItem.targetDate ? new Date(actionItem.targetDate).toLocaleDateString() : '',
                      actionItem.completionNotes || '',
                      effect.revisedSeverity || '',
                      cause.revisedOccurrence || '',
                      control.revisedDetection || '',
                      this.calculateRPN(
                        effect.revisedSeverity || effect.severity,
                        cause.revisedOccurrence || cause.occurrence,
                        control.revisedDetection || control.detection
                      ),
                      actionItem.status || failureMode.status || '',
                      fmea.createdAt ? new Date(fmea.createdAt).toLocaleDateString() : ''
                    ])
                  }
                }
              }
            }
          } else {
            // Add row with failure mode data even if no effects/causes
            worksheet.addRow([
              fmea.name,
              failureMode.processFunction || '',
              failureMode.description || '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              failureMode.status || '',
              fmea.createdAt ? new Date(fmea.createdAt).toLocaleDateString() : ''
            ])
          }
        }
      }
    }

    // Auto-fit columns and apply conditional formatting
    worksheet.columns.forEach((column, index) => {
      column.width = index === 1 || index === 2 || index === 3 ? 30 : 15
    })

    // Conditional formatting for RPN values
    worksheet.addConditionalFormatting({
      ref: `J2:J${worksheet.rowCount}`, // RPN column
      rules: [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulae: [300],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFCDD2' } } }
        },
        {
          type: 'cellIs',
          operator: 'between',
          formulae: [200, 300],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF3E0' } } }
        }
      ]
    })

    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  /**
   * Create Control Plan worksheet
   */
  private async createControlPlanWorksheet(workbook: ExcelJS.Workbook, controlPlans: any[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Control Plan', {
      pageSetup: { orientation: 'landscape', paperSize: 9 }
    })

    const headers = [
      'Control Plan Name',
      'Process Step',
      'Characteristic',
      'Specification',
      'Control Method',
      'Measurement System',
      'Sample Size',
      'Sample Frequency',
      'Control Limits',
      'Reaction Plan',
      'Responsible Person',
      'Equipment',
      'Measurement Technique',
      'Status',
      'Created Date',
      'Updated Date'
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '388E3C' } }

    // Data rows
    for (const controlPlan of controlPlans) {
      if (controlPlan.controlPlanItems && controlPlan.controlPlanItems.length > 0) {
        for (const item of controlPlan.controlPlanItems) {
          worksheet.addRow([
            controlPlan.name,
            item.processStep || '',
            item.characteristic || '',
            item.specification || '',
            item.controlMethods?.map((m: any) => m.description).join('; ') || '',
            item.measurementSystem || '',
            item.sampleSize || '',
            item.sampleFrequency || '',
            item.controlLimits || '',
            item.reactionPlan || '',
            item.responsiblePerson || '',
            item.measurementEquipment?.map((e: any) => e.name).join('; ') || '',
            item.measurementTechnique || '',
            item.status || 'ACTIVE',
            controlPlan.createdAt ? new Date(controlPlan.createdAt).toLocaleDateString() : '',
            controlPlan.updatedAt ? new Date(controlPlan.updatedAt).toLocaleDateString() : ''
          ])
        }
      }
    }

    worksheet.columns.forEach(column => {
      column.width = 18
    })

    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  /**
   * Create Risk Analytics worksheet
   */
  private async createRiskAnalyticsWorksheet(workbook: ExcelJS.Workbook, riskAnalytics: any[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Risk Analytics')

    const headers = [
      'Project Name',
      'Analysis Date',
      'Total RPN',
      'Average RPN',
      'High Risk Items',
      'Critical Risk Items',
      'Overall Risk Level',
      'Compliance Score',
      'Control Effectiveness',
      'Process Coverage',
      'Recommendations'
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9800' } }

    for (const analytics of riskAnalytics) {
      worksheet.addRow([
        analytics.project?.name || '',
        analytics.analysisDate ? new Date(analytics.analysisDate).toLocaleDateString() : '',
        analytics.totalRpn || 0,
        analytics.averageRpn || 0,
        analytics.highRiskItems || 0,
        analytics.criticalRiskItems || 0,
        analytics.overallRiskLevel || '',
        `${analytics.complianceScore || 0}%`,
        `${analytics.controlEffectiveness || 0}%`,
        `${analytics.processCoverage || 0}%`,
        analytics.recommendations || ''
      ])
    }

    worksheet.columns.forEach(column => {
      column.width = 16
    })
  }

  /**
   * Create Audit Trail worksheet
   */
  private async createAuditTrailWorksheet(workbook: ExcelJS.Workbook, auditTrail: any[]): Promise<void> {
    const worksheet = workbook.addWorksheet('Audit Trail')

    const headers = [
      'Date',
      'User',
      'Action',
      'Entity Type',
      'Entity ID',
      'Field Changed',
      'Old Value',
      'New Value',
      'Impact Level',
      'Project',
      'Session ID'
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '607D8B' } }

    for (const entry of auditTrail) {
      worksheet.addRow([
        entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '',
        entry.user?.name || entry.userId || '',
        entry.action || '',
        entry.entityType || '',
        entry.entityId || '',
        entry.fieldName || '',
        entry.oldValue || '',
        entry.newValue || '',
        entry.impactLevel || '',
        entry.project?.name || '',
        entry.sessionId || ''
      ])
    }

    worksheet.columns.forEach(column => {
      column.width = 18
    })
  }

  /**
   * Create Summary worksheet
   */
  private async createSummaryWorksheet(workbook: ExcelJS.Workbook, projectData: any): Promise<void> {
    const worksheet = workbook.addWorksheet('Summary', { tabColor: { argb: '4CAF50' } })

    // Title
    worksheet.mergeCells('A1:D1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'QMS Export Summary'
    titleCell.font = { size: 18, bold: true }
    titleCell.alignment = { horizontal: 'center' }

    // Export Information
    worksheet.getCell('A3').value = 'Export Date:'
    worksheet.getCell('B3').value = new Date().toLocaleString()
    worksheet.getCell('A4').value = 'Generated By:'
    worksheet.getCell('B4').value = 'QMS - Quality Management System'

    // Statistics
    worksheet.getCell('A6').value = 'Export Statistics:'
    worksheet.getCell('A6').font = { bold: true, size: 14 }

    let row = 8
    if (projectData.processFlows?.length > 0) {
      worksheet.getCell(`A${row}`).value = 'Process Flows:'
      worksheet.getCell(`B${row}`).value = projectData.processFlows.length
      row++
    }

    if (projectData.fmeas?.length > 0) {
      worksheet.getCell(`A${row}`).value = 'FMEA Documents:'
      worksheet.getCell(`B${row}`).value = projectData.fmeas.length
      row++
    }

    if (projectData.controlPlans?.length > 0) {
      worksheet.getCell(`A${row}`).value = 'Control Plans:'
      worksheet.getCell(`B${row}`).value = projectData.controlPlans.length
      row++
    }

    if (projectData.riskAnalytics?.length > 0) {
      worksheet.getCell(`A${row}`).value = 'Risk Analytics Records:'
      worksheet.getCell(`B${row}`).value = projectData.riskAnalytics.length
      row++
    }

    // Format columns
    worksheet.getColumn('A').width = 25
    worksheet.getColumn('B').width = 15
    worksheet.getColumn('C').width = 25
    worksheet.getColumn('D').width = 15
  }

  /**
   * Create automotive-standard FMEA worksheet
   */
  private async createAutomotiveFMEAWorksheet(workbook: ExcelJS.Workbook, fmea: any): Promise<void> {
    const worksheet = workbook.addWorksheet('FMEA Worksheet')

    // FMEA Header Information
    worksheet.mergeCells('A1:P1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'FAILURE MODE AND EFFECTS ANALYSIS (FMEA)'
    titleCell.font = { size: 14, bold: true }
    titleCell.alignment = { horizontal: 'center' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'CCCCCC' } }

    // FMEA Info
    worksheet.getCell('A3').value = 'FMEA Number:'
    worksheet.getCell('B3').value = fmea.fmeaNumber || 'N/A'
    worksheet.getCell('E3').value = 'FMEA Date:'
    worksheet.getCell('F3').value = fmea.createdAt ? new Date(fmea.createdAt).toLocaleDateString() : 'N/A'

    worksheet.getCell('A4').value = 'Team Leader:'
    worksheet.getCell('B4').value = fmea.teamLeader?.name || 'N/A'
    worksheet.getCell('E4').value = 'Review Date:'
    worksheet.getCell('F4').value = fmea.reviewDate ? new Date(fmea.reviewDate).toLocaleDateString() : 'N/A'

    worksheet.getCell('A5').value = 'Process/Product:'
    worksheet.getCell('B5').value = fmea.processName || 'N/A'
    worksheet.getCell('E5').value = 'Page:'
    worksheet.getCell('F5').value = '1 of 1'

    // Headers starting at row 7
    const headers = [
      'Process\nFunction',
      'Potential\nFailure Mode',
      'Potential Effect\nof Failure',
      'SEV',
      'Potential\nCause/Mechanism',
      'OCC',
      'Current Process\nControls',
      'DET',
      'RPN',
      'Recommended\nAction(s)',
      'Responsibility\n& Target Date',
      'Action\nTaken',
      'SEV',
      'OCC',
      'DET',
      'RPN'
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true, size: 9 }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D3D3D3' } }

    // Set row height for headers
    headerRow.height = 40

    // Add FMEA data
    if (fmea.failureModes && fmea.failureModes.length > 0) {
      for (const failureMode of fmea.failureModes) {
        const effects = failureMode.effects || [{}]
        const causes = failureMode.causes || [{}]

        for (const effect of effects) {
          for (const cause of causes) {
            const controls = cause.controls || [{}]
            
            for (const control of controls) {
              const actionItems = failureMode.actionItems || [{}]
              
              for (const actionItem of actionItems) {
                const dataRow = worksheet.addRow([
                  failureMode.processFunction || '',
                  failureMode.description || '',
                  effect.description || '',
                  effect.severity || '',
                  cause.description || '',
                  cause.occurrence || '',
                  control.description || '',
                  control.detection || '',
                  this.calculateRPN(effect.severity, cause.occurrence, control.detection),
                  actionItem.description || '',
                  `${actionItem.assignedTo || ''}\n${actionItem.targetDate ? new Date(actionItem.targetDate).toLocaleDateString() : ''}`,
                  actionItem.completionNotes || '',
                  effect.revisedSeverity || '',
                  cause.revisedOccurrence || '',
                  control.revisedDetection || '',
                  this.calculateRPN(
                    effect.revisedSeverity || effect.severity,
                    cause.revisedOccurrence || cause.occurrence,
                    control.revisedDetection || control.detection
                  )
                ])

                dataRow.height = 30
                dataRow.alignment = { vertical: 'top', wrapText: true }
                dataRow.font = { size: 8 }
              }
            }
          }
        }
      }
    }

    // Set column widths
    const columnWidths = [15, 20, 25, 6, 25, 6, 20, 6, 8, 25, 15, 20, 6, 6, 6, 8]
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width
    })

    // Add borders to all cells
    const range = `A7:P${worksheet.rowCount}`
    worksheet.getCell(range).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  }

  /**
   * Create automotive-standard Control Plan worksheet
   */
  private async createAutomotiveControlPlanWorksheet(workbook: ExcelJS.Workbook, controlPlan: any): Promise<void> {
    const worksheet = workbook.addWorksheet('Control Plan')

    // Control Plan Header
    worksheet.mergeCells('A1:N1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'CONTROL PLAN'
    titleCell.font = { size: 14, bold: true }
    titleCell.alignment = { horizontal: 'center' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } }

    // Control Plan Info
    worksheet.getCell('A3').value = 'Control Plan Name:'
    worksheet.getCell('B3').value = controlPlan.name
    worksheet.getCell('G3').value = 'Created Date:'
    worksheet.getCell('H3').value = controlPlan.createdAt ? new Date(controlPlan.createdAt).toLocaleDateString() : 'N/A'

    // Headers
    const headers = [
      'Process\nStep/Operation',
      'Characteristic',
      'Specification\nLimit',
      'Evaluation\nMeasurement\nTechnique',
      'Sample\nSize',
      'Sample\nFrequency',
      'Control\nMethod',
      'Reaction\nPlan',
      'Responsible\nPerson',
      'Control\nLimits',
      'Equipment',
      'Measurement\nSystem',
      'Status',
      'Notes'
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true, size: 9 }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C8E6C9' } }
    headerRow.height = 40

    // Add control plan data
    if (controlPlan.controlPlanItems && controlPlan.controlPlanItems.length > 0) {
      for (const item of controlPlan.controlPlanItems) {
        const dataRow = worksheet.addRow([
          item.processStep || '',
          item.characteristic || '',
          item.specification || '',
          item.measurementTechnique || '',
          item.sampleSize || '',
          item.sampleFrequency || '',
          item.controlMethods?.map((m: any) => m.description).join('; ') || '',
          item.reactionPlan || '',
          item.responsiblePerson || '',
          item.controlLimits || '',
          item.measurementEquipment?.map((e: any) => e.name).join('; ') || '',
          item.measurementSystem || '',
          item.status || 'ACTIVE',
          item.notes || ''
        ])

        dataRow.height = 25
        dataRow.alignment = { vertical: 'top', wrapText: true }
        dataRow.font = { size: 9 }
      }
    }

    // Set column widths
    const columnWidths = [20, 20, 15, 18, 10, 12, 20, 25, 15, 15, 18, 15, 10, 20]
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width
    })
  }

  /**
   * Get comprehensive export data based on options and config
   */
  private async getExportData(options: ExcelExportOptions, config: ExportConfig): Promise<any> {
    const data: any = {}

    // Build where clause
    const whereClause: any = {}
    if (options.projectId) {
      whereClause.projectId = options.projectId
    }

    if (config.includeProcessFlow) {
      data.processFlows = await this.prisma.processFlow.findMany({
        where: whereClause,
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

    if (config.includeFMEA) {
      data.fmeas = await this.prisma.fmea.findMany({
        where: whereClause,
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
    }

    if (config.includeControlPlan) {
      data.controlPlans = await this.prisma.controlPlan.findMany({
        where: whereClause,
        include: {
          project: true,
          controlPlanItems: {
            include: {
              controlMethods: true,
              measurementEquipment: true
            }
          },
          teamMembers: {
            include: {
              user: true
            }
          }
        }
      })
    }

    if (config.includeRiskAnalytics) {
      data.riskAnalytics = await this.prisma.riskAnalytics.findMany({
        where: whereClause,
        include: {
          project: true
        }
      })
    }

    if (config.includeAuditTrail) {
      data.auditTrail = await this.prisma.userActivity.findMany({
        where: {
          ...whereClause,
          ...(options.dateRange && {
            timestamp: {
              gte: options.dateRange.startDate,
              lte: options.dateRange.endDate
            }
          })
        },
        include: {
          user: true,
          project: true
        },
        orderBy: { timestamp: 'desc' },
        take: 1000 // Limit audit trail records
      })
    }

    return data
  }

  /**
   * Calculate RPN value
   */
  private calculateRPN(severity?: number | null, occurrence?: number | null, detection?: number | null): number {
    const s = severity || 0
    const o = occurrence || 0
    const d = detection || 0
    
    return s * o * d
  }
}

export default ExcelExportService