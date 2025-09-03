import ExcelJS from 'exceljs'
import { PrismaClient } from '../generated/client'
import BulkOperationsService from './bulkOperationsService'
import logger from '../utils/logger'

interface ImportMapping {
  sourceColumn: string
  targetField: string
  required?: boolean
  dataType?: 'string' | 'number' | 'date' | 'boolean'
  validator?: (value: any) => { valid: boolean; error?: string; normalizedValue?: any }
  defaultValue?: any
}

interface ImportTemplate {
  templateName: string
  entityType: 'FMEA' | 'PROCESS_FLOW' | 'CONTROL_PLAN' | 'FAILURE_MODE' | 'PROCESS_STEP' | 'CONTROL_PLAN_ITEM'
  worksheetName?: string
  headerRow: number
  mappings: ImportMapping[]
  validationRules?: {
    requiredFields: string[]
    uniqueFields?: string[]
    crossReferences?: {
      field: string
      referenceEntity: string
      referenceField: string
    }[]
  }
}

interface ImportOptions {
  templateId?: string
  customMapping?: ImportMapping[]
  skipValidation?: boolean
  updateExisting?: boolean
  createMissing?: boolean
  dryRun?: boolean
  maxErrors?: number
}

interface ImportResult {
  success: boolean
  recordsProcessed: number
  recordsImported: number
  recordsUpdated: number
  recordsSkipped: number
  errors: Array<{
    row: number
    column?: string
    error: string
    data?: any
  }>
  warnings: Array<{
    row: number
    column?: string
    message: string
  }>
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateRows: number
  }
}

class DataImportService {
  private prisma: PrismaClient
  private bulkOperationsService: BulkOperationsService

  constructor(prisma: PrismaClient, bulkOperationsService: BulkOperationsService) {
    this.prisma = prisma
    this.bulkOperationsService = bulkOperationsService
  }

  /**
   * Get predefined import templates
   */
  getPredefinedTemplates(): ImportTemplate[] {
    return [
      {
        templateName: 'Standard FMEA Import',
        entityType: 'FAILURE_MODE',
        worksheetName: 'FMEA',
        headerRow: 1,
        mappings: [
          { sourceColumn: 'Process Function', targetField: 'processFunction', required: true, dataType: 'string' },
          { sourceColumn: 'Failure Mode', targetField: 'description', required: true, dataType: 'string' },
          { sourceColumn: 'Failure Effect', targetField: 'effect.description', required: true, dataType: 'string' },
          { sourceColumn: 'Severity', targetField: 'effect.severity', required: true, dataType: 'number', validator: this.validateSeverity },
          { sourceColumn: 'Failure Cause', targetField: 'cause.description', required: true, dataType: 'string' },
          { sourceColumn: 'Occurrence', targetField: 'cause.occurrence', required: true, dataType: 'number', validator: this.validateOccurrence },
          { sourceColumn: 'Current Controls', targetField: 'control.description', dataType: 'string' },
          { sourceColumn: 'Detection', targetField: 'control.detection', required: true, dataType: 'number', validator: this.validateDetection },
          { sourceColumn: 'Recommended Actions', targetField: 'actionItem.description', dataType: 'string' },
          { sourceColumn: 'Responsibility', targetField: 'actionItem.assignedTo', dataType: 'string' },
          { sourceColumn: 'Target Date', targetField: 'actionItem.targetDate', dataType: 'date' },
          { sourceColumn: 'Status', targetField: 'status', dataType: 'string', defaultValue: 'ACTIVE' }
        ],
        validationRules: {
          requiredFields: ['processFunction', 'description', 'effect.description', 'effect.severity', 'cause.description', 'cause.occurrence', 'control.detection']
        }
      },
      {
        templateName: 'Process Flow Import',
        entityType: 'PROCESS_STEP',
        worksheetName: 'Process Steps',
        headerRow: 1,
        mappings: [
          { sourceColumn: 'Step Number', targetField: 'stepNumber', required: true, dataType: 'number' },
          { sourceColumn: 'Step Name', targetField: 'name', required: true, dataType: 'string' },
          { sourceColumn: 'Description', targetField: 'description', dataType: 'string' },
          { sourceColumn: 'Step Type', targetField: 'stepType', dataType: 'string' },
          { sourceColumn: 'Cycle Time', targetField: 'cycleTime', dataType: 'number' },
          { sourceColumn: 'Resources', targetField: 'resources', dataType: 'string' },
          { sourceColumn: 'Quality Requirements', targetField: 'qualityRequirements', dataType: 'string' },
          { sourceColumn: 'Control Points', targetField: 'controlPoints', dataType: 'string' }
        ],
        validationRules: {
          requiredFields: ['stepNumber', 'name'],
          uniqueFields: ['stepNumber']
        }
      },
      {
        templateName: 'Control Plan Import',
        entityType: 'CONTROL_PLAN_ITEM',
        worksheetName: 'Control Plan',
        headerRow: 1,
        mappings: [
          { sourceColumn: 'Process Step', targetField: 'processStep', required: true, dataType: 'string' },
          { sourceColumn: 'Characteristic', targetField: 'characteristic', required: true, dataType: 'string' },
          { sourceColumn: 'Specification', targetField: 'specification', dataType: 'string' },
          { sourceColumn: 'Control Method', targetField: 'controlMethod.description', dataType: 'string' },
          { sourceColumn: 'Measurement System', targetField: 'measurementSystem', dataType: 'string' },
          { sourceColumn: 'Sample Size', targetField: 'sampleSize', dataType: 'string' },
          { sourceColumn: 'Sample Frequency', targetField: 'sampleFrequency', dataType: 'string' },
          { sourceColumn: 'Control Limits', targetField: 'controlLimits', dataType: 'string' },
          { sourceColumn: 'Reaction Plan', targetField: 'reactionPlan', dataType: 'string' },
          { sourceColumn: 'Responsible Person', targetField: 'responsiblePerson', dataType: 'string' },
          { sourceColumn: 'Equipment', targetField: 'equipment.name', dataType: 'string' },
          { sourceColumn: 'Measurement Technique', targetField: 'measurementTechnique', dataType: 'string' }
        ],
        validationRules: {
          requiredFields: ['processStep', 'characteristic']
        }
      },
      {
        templateName: 'Automotive FMEA (AIAG-VDA)',
        entityType: 'FAILURE_MODE',
        worksheetName: 'FMEA Worksheet',
        headerRow: 7, // AIAG-VDA templates typically have headers at row 7
        mappings: [
          { sourceColumn: 'A', targetField: 'processFunction', required: true, dataType: 'string' },
          { sourceColumn: 'B', targetField: 'description', required: true, dataType: 'string' },
          { sourceColumn: 'C', targetField: 'effect.description', required: true, dataType: 'string' },
          { sourceColumn: 'D', targetField: 'effect.severity', required: true, dataType: 'number', validator: this.validateSeverity },
          { sourceColumn: 'E', targetField: 'cause.description', required: true, dataType: 'string' },
          { sourceColumn: 'F', targetField: 'cause.occurrence', required: true, dataType: 'number', validator: this.validateOccurrence },
          { sourceColumn: 'G', targetField: 'control.description', dataType: 'string' },
          { sourceColumn: 'H', targetField: 'control.detection', required: true, dataType: 'number', validator: this.validateDetection },
          { sourceColumn: 'I', targetField: 'rpn', dataType: 'number' },
          { sourceColumn: 'J', targetField: 'actionItem.description', dataType: 'string' },
          { sourceColumn: 'K', targetField: 'actionItem.assignedTo', dataType: 'string' },
          { sourceColumn: 'L', targetField: 'actionItem.completionNotes', dataType: 'string' },
          { sourceColumn: 'M', targetField: 'effect.revisedSeverity', dataType: 'number', validator: this.validateSeverity },
          { sourceColumn: 'N', targetField: 'cause.revisedOccurrence', dataType: 'number', validator: this.validateOccurrence },
          { sourceColumn: 'O', targetField: 'control.revisedDetection', dataType: 'number', validator: this.validateDetection }
        ]
      }
    ]
  }

  /**
   * Import data from Excel buffer
   */
  async importFromExcel(
    buffer: Buffer,
    projectId: string,
    parentEntityId: string, // FMEA ID for failure modes, Process Flow ID for steps, etc.
    userId: string,
    templateId: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    try {
      logger.info(`Starting Excel import for project ${projectId} with template ${templateId}`)

      // Get import template
      const template = this.getTemplateById(templateId)
      if (!template) {
        throw new Error(`Import template ${templateId} not found`)
      }

      // Parse Excel file
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheetName = template.worksheetName || workbook.worksheets[0].name
      const worksheet = workbook.getWorksheet(worksheetName)
      
      if (!worksheet) {
        throw new Error(`Worksheet ${worksheetName} not found`)
      }

      // Extract and validate data
      const extractedData = this.extractDataFromWorksheet(worksheet, template)
      const validationResult = this.validateImportData(extractedData, template, options)

      if (!validationResult.success && !options.skipValidation) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsImported: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          summary: {
            totalRows: extractedData.length,
            validRows: 0,
            invalidRows: extractedData.length,
            duplicateRows: 0
          }
        }
      }

      // Perform dry run if requested
      if (options.dryRun) {
        return {
          success: true,
          recordsProcessed: extractedData.length,
          recordsImported: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          errors: validationResult.errors,
          warnings: validationResult.warnings.concat([{ row: 0, message: 'Dry run - no data was actually imported' }]),
          summary: {
            totalRows: extractedData.length,
            validRows: validationResult.validRows,
            invalidRows: validationResult.invalidRows,
            duplicateRows: validationResult.duplicateRows
          }
        }
      }

      // Import data
      const importResult = await this.importData(
        template.entityType,
        extractedData,
        projectId,
        parentEntityId,
        userId,
        options
      )

      return {
        success: importResult.success,
        recordsProcessed: extractedData.length,
        recordsImported: importResult.created,
        recordsUpdated: importResult.updated,
        recordsSkipped: importResult.skipped,
        errors: validationResult.errors.concat(importResult.errors),
        warnings: validationResult.warnings,
        summary: {
          totalRows: extractedData.length,
          validRows: validationResult.validRows,
          invalidRows: validationResult.invalidRows,
          duplicateRows: validationResult.duplicateRows
        }
      }

    } catch (error) {
      logger.error('Excel import failed:', error)
      return {
        success: false,
        recordsProcessed: 0,
        recordsImported: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [{ row: 0, error: `Import failed: ${error.message}` }],
        warnings: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          duplicateRows: 0
        }
      }
    }
  }

  /**
   * Generate import template Excel file
   */
  async generateImportTemplate(templateId: string): Promise<Buffer> {
    try {
      const template = this.getTemplateById(templateId)
      if (!template) {
        throw new Error(`Template ${templateId} not found`)
      }

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(template.worksheetName || 'Import Template')

      // Add header row
      const headerRow = worksheet.getRow(template.headerRow)
      template.mappings.forEach((mapping, index) => {
        const cell = headerRow.getCell(index + 1)
        cell.value = mapping.sourceColumn
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'CCCCCC' } }
        
        // Add data validation if available
        if (mapping.validator || mapping.dataType === 'number') {
          // Add validation rules based on field type
          this.addCellValidation(worksheet, index + 1, mapping)
        }
      })

      // Add sample data row
      const sampleRow = worksheet.getRow(template.headerRow + 1)
      template.mappings.forEach((mapping, index) => {
        const cell = sampleRow.getCell(index + 1)
        cell.value = this.getSampleValue(mapping)
        cell.font = { italic: true, color: { argb: '666666' } }
      })

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 20
      })

      // Add instructions
      if (template.headerRow > 2) {
        worksheet.getCell('A1').value = `${template.templateName} - Import Template`
        worksheet.getCell('A1').font = { size: 14, bold: true }
        
        worksheet.getCell('A3').value = 'Instructions:'
        worksheet.getCell('A3').font = { bold: true }
        
        const instructions = [
          '1. Fill in data starting from row ' + (template.headerRow + 1),
          '2. Do not modify header row',
          '3. Required fields are marked in the template',
          '4. Save file and import through the application'
        ]
        
        instructions.forEach((instruction, index) => {
          worksheet.getCell(`A${4 + index}`).value = instruction
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      return buffer as Buffer

    } catch (error) {
      logger.error('Error generating import template:', error)
      throw error
    }
  }

  /**
   * Validate import file structure
   */
  async validateImportFile(buffer: Buffer, templateId: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
    preview: any[]
  }> {
    try {
      const template = this.getTemplateById(templateId)
      if (!template) {
        return {
          valid: false,
          errors: [`Template ${templateId} not found`],
          warnings: [],
          preview: []
        }
      }

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheetName = template.worksheetName || workbook.worksheets[0].name
      const worksheet = workbook.getWorksheet(worksheetName)

      if (!worksheet) {
        return {
          valid: false,
          errors: [`Worksheet ${worksheetName} not found`],
          warnings: [],
          preview: []
        }
      }

      const errors: string[] = []
      const warnings: string[] = []

      // Validate headers
      const headerRow = worksheet.getRow(template.headerRow)
      const expectedHeaders = template.mappings.map(m => m.sourceColumn)
      const actualHeaders: string[] = []

      for (let col = 1; col <= expectedHeaders.length; col++) {
        const cellValue = headerRow.getCell(col).value?.toString() || ''
        actualHeaders.push(cellValue)
      }

      expectedHeaders.forEach((expectedHeader, index) => {
        if (actualHeaders[index] !== expectedHeader) {
          errors.push(`Header mismatch at column ${index + 1}: expected "${expectedHeader}", found "${actualHeaders[index]}"`)
        }
      })

      // Get preview data (first 5 rows after header)
      const preview: any[] = []
      for (let row = template.headerRow + 1; row <= Math.min(template.headerRow + 5, worksheet.rowCount); row++) {
        const rowData: any = {}
        template.mappings.forEach((mapping, index) => {
          const cellValue = worksheet.getRow(row).getCell(index + 1).value
          rowData[mapping.targetField] = cellValue
        })
        preview.push(rowData)
      }

      if (worksheet.rowCount <= template.headerRow) {
        warnings.push('No data rows found in worksheet')
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        preview
      }

    } catch (error) {
      logger.error('Error validating import file:', error)
      return {
        valid: false,
        errors: [`File validation failed: ${error.message}`],
        warnings: [],
        preview: []
      }
    }
  }

  /**
   * Extract data from worksheet
   */
  private extractDataFromWorksheet(worksheet: ExcelJS.Worksheet, template: ImportTemplate): any[] {
    const data: any[] = []

    for (let rowNumber = template.headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber)
      const rowData: any = { _rowNumber: rowNumber }

      let hasData = false
      template.mappings.forEach((mapping, index) => {
        const cellValue = row.getCell(index + 1).value
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          hasData = true
          rowData[mapping.targetField] = this.normalizeValue(cellValue, mapping)
        } else if (mapping.defaultValue !== undefined) {
          rowData[mapping.targetField] = mapping.defaultValue
        }
      })

      if (hasData) {
        data.push(rowData)
      }
    }

    return data
  }

  /**
   * Validate import data
   */
  private validateImportData(
    data: any[],
    template: ImportTemplate,
    options: ImportOptions
  ): {
    success: boolean
    validRows: number
    invalidRows: number
    duplicateRows: number
    errors: Array<{ row: number; column?: string; error: string }>
    warnings: Array<{ row: number; column?: string; message: string }>
  } {
    const errors: Array<{ row: number; column?: string; error: string }> = []
    const warnings: Array<{ row: number; column?: string; message: string }> = []
    let validRows = 0
    let duplicateRows = 0

    const seenRows = new Set<string>()

    for (const rowData of data) {
      const rowNumber = rowData._rowNumber
      let rowValid = true

      // Check required fields
      if (template.validationRules?.requiredFields) {
        for (const requiredField of template.validationRules.requiredFields) {
          if (!this.getNestedValue(rowData, requiredField)) {
            errors.push({
              row: rowNumber,
              column: requiredField,
              error: `Required field '${requiredField}' is missing or empty`
            })
            rowValid = false
          }
        }
      }

      // Check field-specific validations
      for (const mapping of template.mappings) {
        const value = this.getNestedValue(rowData, mapping.targetField)
        
        if (value !== undefined && mapping.validator) {
          const validationResult = mapping.validator(value)
          if (!validationResult.valid) {
            errors.push({
              row: rowNumber,
              column: mapping.sourceColumn,
              error: validationResult.error || 'Validation failed'
            })
            rowValid = false
          }
        }
      }

      // Check for duplicates
      if (template.validationRules?.uniqueFields) {
        const uniqueKey = template.validationRules.uniqueFields
          .map(field => this.getNestedValue(rowData, field))
          .join('|')
        
        if (seenRows.has(uniqueKey)) {
          duplicateRows++
          warnings.push({
            row: rowNumber,
            message: 'Duplicate row detected'
          })
        } else {
          seenRows.add(uniqueKey)
        }
      }

      if (rowValid) {
        validRows++
      }
    }

    return {
      success: errors.length === 0 || (options.maxErrors && errors.length <= options.maxErrors),
      validRows,
      invalidRows: data.length - validRows,
      duplicateRows,
      errors,
      warnings
    }
  }

  /**
   * Import processed data
   */
  private async importData(
    entityType: string,
    data: any[],
    projectId: string,
    parentEntityId: string,
    userId: string,
    options: ImportOptions
  ): Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<{ row: number; error: string }>
  }> {
    let created = 0
    let updated = 0
    let skipped = 0
    const errors: Array<{ row: number; error: string }> = []

    for (const rowData of data) {
      try {
        const result = await this.importSingleRecord(
          entityType,
          rowData,
          projectId,
          parentEntityId,
          userId,
          options
        )

        if (result === 'created') created++
        else if (result === 'updated') updated++
        else if (result === 'skipped') skipped++

      } catch (error) {
        logger.error(`Error importing row ${rowData._rowNumber}:`, error)
        errors.push({
          row: rowData._rowNumber,
          error: error.message
        })
      }
    }

    return {
      success: errors.length === 0,
      created,
      updated,
      skipped,
      errors
    }
  }

  /**
   * Import single record
   */
  private async importSingleRecord(
    entityType: string,
    rowData: any,
    projectId: string,
    parentEntityId: string,
    userId: string,
    options: ImportOptions
  ): Promise<'created' | 'updated' | 'skipped'> {
    switch (entityType) {
      case 'FAILURE_MODE':
        return await this.importFailureMode(rowData, parentEntityId, userId)
      
      case 'PROCESS_STEP':
        return await this.importProcessStep(rowData, parentEntityId, userId)
      
      case 'CONTROL_PLAN_ITEM':
        return await this.importControlPlanItem(rowData, parentEntityId, userId)
      
      default:
        throw new Error(`Import not supported for entity type: ${entityType}`)
    }
  }

  /**
   * Import failure mode
   */
  private async importFailureMode(rowData: any, fmeaId: string, userId: string): Promise<'created' | 'updated' | 'skipped'> {
    // Create failure mode with related entities
    const failureMode = await this.prisma.failureMode.create({
      data: {
        fmeaId,
        processFunction: rowData.processFunction,
        description: rowData.description,
        status: rowData.status || 'ACTIVE'
      }
    })

    // Create failure effect if data provided
    if (rowData['effect.description']) {
      await this.prisma.failureEffect.create({
        data: {
          failureModeId: failureMode.id,
          description: rowData['effect.description'],
          severity: rowData['effect.severity']
        }
      })
    }

    // Create failure cause if data provided
    if (rowData['cause.description']) {
      const cause = await this.prisma.failureCause.create({
        data: {
          failureModeId: failureMode.id,
          description: rowData['cause.description'],
          occurrence: rowData['cause.occurrence']
        }
      })

      // Create failure control if data provided
      if (rowData['control.description'] || rowData['control.detection']) {
        await this.prisma.failureControl.create({
          data: {
            failureCauseId: cause.id,
            description: rowData['control.description'] || '',
            detection: rowData['control.detection']
          }
        })
      }
    }

    // Create action item if data provided
    if (rowData['actionItem.description']) {
      await this.prisma.actionItem.create({
        data: {
          failureModeId: failureMode.id,
          description: rowData['actionItem.description'],
          assignedTo: rowData['actionItem.assignedTo'],
          targetDate: rowData['actionItem.targetDate'],
          status: 'OPEN'
        }
      })
    }

    return 'created'
  }

  /**
   * Import process step
   */
  private async importProcessStep(rowData: any, processFlowId: string, userId: string): Promise<'created' | 'updated' | 'skipped'> {
    await this.prisma.processStep.create({
      data: {
        processFlowId,
        stepNumber: rowData.stepNumber,
        name: rowData.name,
        description: rowData.description,
        stepType: rowData.stepType,
        cycleTime: rowData.cycleTime,
        qualityRequirements: rowData.qualityRequirements
      }
    })

    return 'created'
  }

  /**
   * Import control plan item
   */
  private async importControlPlanItem(rowData: any, controlPlanId: string, userId: string): Promise<'created' | 'updated' | 'skipped'> {
    await this.prisma.controlPlanItem.create({
      data: {
        controlPlanId,
        processStep: rowData.processStep,
        characteristic: rowData.characteristic,
        specification: rowData.specification,
        measurementSystem: rowData.measurementSystem,
        sampleSize: rowData.sampleSize,
        sampleFrequency: rowData.sampleFrequency,
        controlLimits: rowData.controlLimits,
        reactionPlan: rowData.reactionPlan,
        responsiblePerson: rowData.responsiblePerson,
        measurementTechnique: rowData.measurementTechnique
      }
    })

    return 'created'
  }

  /**
   * Helper methods
   */
  private getTemplateById(templateId: string): ImportTemplate | null {
    return this.getPredefinedTemplates().find(t => t.templateName === templateId) || null
  }

  private normalizeValue(value: any, mapping: ImportMapping): any {
    if (value === null || value === undefined) return null

    switch (mapping.dataType) {
      case 'number':
        return typeof value === 'number' ? value : parseFloat(value.toString())
      case 'date':
        return value instanceof Date ? value : new Date(value)
      case 'boolean':
        return Boolean(value)
      default:
        return value.toString().trim()
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private getSampleValue(mapping: ImportMapping): any {
    switch (mapping.targetField) {
      case 'processFunction':
        return 'Example Process Function'
      case 'description':
        return 'Example Description'
      case 'effect.severity':
      case 'cause.occurrence':
      case 'control.detection':
        return 5
      default:
        return 'Sample Value'
    }
  }

  private addCellValidation(worksheet: ExcelJS.Worksheet, column: number, mapping: ImportMapping): void {
    // Add data validation based on field type
    if (mapping.targetField.includes('severity') || mapping.targetField.includes('occurrence') || mapping.targetField.includes('detection')) {
      worksheet.dataValidations.add(`${String.fromCharCode(64 + column)}:${String.fromCharCode(64 + column)}`, {
        type: 'whole',
        operator: 'between',
        formulae: [1, 10],
        showErrorMessage: true,
        errorTitle: 'Invalid Rating',
        error: 'Rating must be between 1 and 10'
      })
    }
  }

  /**
   * Validation functions
   */
  private validateSeverity = (value: any): { valid: boolean; error?: string; normalizedValue?: any } => {
    const num = Number(value)
    if (isNaN(num) || num < 1 || num > 10) {
      return { valid: false, error: 'Severity must be a number between 1 and 10' }
    }
    return { valid: true, normalizedValue: num }
  }

  private validateOccurrence = (value: any): { valid: boolean; error?: string; normalizedValue?: any } => {
    const num = Number(value)
    if (isNaN(num) || num < 1 || num > 10) {
      return { valid: false, error: 'Occurrence must be a number between 1 and 10' }
    }
    return { valid: true, normalizedValue: num }
  }

  private validateDetection = (value: any): { valid: boolean; error?: string; normalizedValue?: any } => {
    const num = Number(value)
    if (isNaN(num) || num < 1 || num > 10) {
      return { valid: false, error: 'Detection must be a number between 1 and 10' }
    }
    return { valid: true, normalizedValue: num }
  }
}

export default DataImportService