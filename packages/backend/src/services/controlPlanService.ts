import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

export interface AutoPopulationResult {
  controlPlanId: string
  itemsCreated: number
  linksCreated: number
  summary: {
    fromPreventionControls: number
    fromDetectionControls: number
    fromProcessSteps: number
  }
}

export interface ControlPlanMetrics {
  totalItems: number
  preventionControls: number
  detectionControls: number
  measurementItems: number
  visualItems: number
  functionalItems: number
  attributeItems: number
  itemsWithEquipment: number
  overdueCalibrations: number
}

class ControlPlanService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Auto-populate control plan from linked FMEA
   */
  async autoPopulateFromFmea(controlPlanId: string, userId: string): Promise<AutoPopulationResult> {
    try {
      // Get control plan with FMEA
      const controlPlan = await this.prisma.controlPlan.findUnique({
        where: { id: controlPlanId },
        include: {
          fmea: {
            include: {
              failureModes: {
                include: {
                  causes: {
                    include: {
                      controls: {
                        include: {
                          processStep: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          processFlow: {
            include: {
              processSteps: {
                orderBy: { stepNumber: 'asc' }
              }
            }
          }
        }
      })

      if (!controlPlan) {
        throw new Error('Control plan not found')
      }

      if (!controlPlan.fmeaId || !controlPlan.fmea) {
        throw new Error('Control plan must be linked to an FMEA')
      }

      let itemsCreated = 0
      let linksCreated = 0
      let fromPreventionControls = 0
      let fromDetectionControls = 0
      let fromProcessSteps = 0

      // Get next sequence number
      const lastItem = await this.prisma.controlPlanItem.findFirst({
        where: { controlPlanId },
        orderBy: { sequenceNumber: 'desc' }
      })
      let sequenceNumber = lastItem ? lastItem.sequenceNumber + 1 : 1

      // Create control plan items from FMEA controls
      for (const failureMode of controlPlan.fmea.failureModes) {
        for (const cause of failureMode.causes) {
          for (const control of cause.controls) {
            // Create control plan item
            const controlPlanItem = await this.prisma.controlPlanItem.create({
              data: {
                controlPlanId,
                sequenceNumber,
                processStepId: control.processStepId,
                operationNumber: control.processStep?.stepNumber?.toString(),
                operationDescription: control.processStep?.name || 'Control Point',
                productCharacteristic: failureMode.itemFunction,
                processCharacteristic: cause.causeDescription,
                specificationRequirement: 'As per FMEA analysis',
                controlMethod: this.mapControlMethod(control.controlMethod || 'INSPECTION'),
                measurementTechnique: control.validationMethod || 'As specified',
                sampleSizeFrequency: this.mapFrequency(control.frequency || 'Each part'),
                controlType: control.controlType === 'PREVENTION' ? 'PREVENTION' : 'DETECTION',
                controlCategory: this.determineControlCategory(control.controlDescription),
                responsiblePerson: control.responsibility || 'Operator',
                reactionPlan: `Stop production and notify supervisor. Reference FMEA ${controlPlan.fmea.fmeaNumber}`,
                notes: `Generated from FMEA Control: ${control.controlDescription}`
              }
            })

            // Create link between control plan and FMEA
            await this.prisma.controlPlanFmeaLink.create({
              data: {
                controlPlanId,
                fmeaId: controlPlan.fmeaId!,
                failureModeId: failureMode.id,
                failureCauseId: cause.id,
                failureControlId: control.id,
                linkType: 'GENERATED_FROM',
                notes: `Auto-generated from failure control: ${control.controlDescription}`
              }
            })

            itemsCreated++
            linksCreated++
            sequenceNumber++

            if (control.controlType === 'PREVENTION') {
              fromPreventionControls++
            } else {
              fromDetectionControls++
            }
          }
        }
      }

      // Add basic process step controls if process flow is linked
      if (controlPlan.processFlowId && controlPlan.processFlow) {
        for (const processStep of controlPlan.processFlow.processSteps) {
          // Check if we don't already have a control for this step
          const existingItem = await this.prisma.controlPlanItem.findFirst({
            where: {
              controlPlanId,
              processStepId: processStep.id
            }
          })

          if (!existingItem) {
            await this.prisma.controlPlanItem.create({
              data: {
                controlPlanId,
                sequenceNumber,
                processStepId: processStep.id,
                operationNumber: processStep.stepNumber.toString(),
                operationDescription: processStep.name,
                processCharacteristic: `${processStep.stepType} operation`,
                specificationRequirement: processStep.qualityRequirements || 'As per process specification',
                controlMethod: this.getDefaultControlMethodForStepType(processStep.stepType),
                measurementTechnique: 'Visual inspection',
                sampleSizeFrequency: 'Each part',
                controlType: 'DETECTION',
                controlCategory: 'VISUAL',
                responsiblePerson: 'Operator',
                reactionPlan: 'Stop and notify supervisor',
                notes: `Auto-generated from process step: ${processStep.name}`
              }
            })

            itemsCreated++
            fromProcessSteps++
            sequenceNumber++
          }
        }
      }

      return {
        controlPlanId,
        itemsCreated,
        linksCreated,
        summary: {
          fromPreventionControls,
          fromDetectionControls,
          fromProcessSteps
        }
      }
    } catch (error) {
      logger.error('Error auto-populating control plan from FMEA:', error)
      throw error
    }
  }

  /**
   * Calculate control plan metrics
   */
  async calculateControlPlanMetrics(controlPlanId: string): Promise<ControlPlanMetrics> {
    try {
      const items = await this.prisma.controlPlanItem.findMany({
        where: { 
          controlPlanId,
          isActive: true
        },
        include: {
          measurementEquipment: true
        }
      })

      const metrics: ControlPlanMetrics = {
        totalItems: items.length,
        preventionControls: items.filter(item => item.controlType === 'PREVENTION').length,
        detectionControls: items.filter(item => item.controlType === 'DETECTION').length,
        measurementItems: items.filter(item => item.controlCategory === 'MEASUREMENT').length,
        visualItems: items.filter(item => item.controlCategory === 'VISUAL').length,
        functionalItems: items.filter(item => item.controlCategory === 'FUNCTIONAL').length,
        attributeItems: items.filter(item => item.controlCategory === 'ATTRIBUTE').length,
        itemsWithEquipment: items.filter(item => item.measurementEquipmentId).length,
        overdueCalibrations: 0
      }

      // Calculate overdue calibrations
      const now = new Date()
      metrics.overdueCalibrations = items.filter(item => 
        item.measurementEquipment && 
        item.measurementEquipment.calibrationDue && 
        item.measurementEquipment.calibrationDue < now
      ).length

      return metrics
    } catch (error) {
      logger.error('Error calculating control plan metrics:', error)
      throw error
    }
  }

  /**
   * Validate control plan completeness
   */
  async validateControlPlanCompleteness(controlPlanId: string): Promise<{
    isComplete: boolean
    missingFields: string[]
    recommendations: string[]
  }> {
    try {
      const controlPlan = await this.prisma.controlPlan.findUnique({
        where: { id: controlPlanId },
        include: {
          controlPlanItems: {
            include: {
              measurementEquipment: true
            }
          }
        }
      })

      if (!controlPlan) {
        throw new Error('Control plan not found')
      }

      const missingFields: string[] = []
      const recommendations: string[] = []

      // Check header completeness
      if (!controlPlan.processOwner) missingFields.push('Process Owner')
      if (!controlPlan.effectiveDate) missingFields.push('Effective Date')
      if (!controlPlan.reviewDate) missingFields.push('Review Date')

      // Check items completeness
      const itemsWithoutReactionPlan = controlPlan.controlPlanItems.filter(item => !item.reactionPlan)
      if (itemsWithoutReactionPlan.length > 0) {
        missingFields.push(`${itemsWithoutReactionPlan.length} items missing reaction plans`)
      }

      const itemsWithoutResponsiblePerson = controlPlan.controlPlanItems.filter(item => !item.responsiblePerson)
      if (itemsWithoutResponsiblePerson.length > 0) {
        missingFields.push(`${itemsWithoutResponsiblePerson.length} items missing responsible person`)
      }

      const measurementItemsWithoutEquipment = controlPlan.controlPlanItems.filter(item => 
        item.controlCategory === 'MEASUREMENT' && !item.measurementEquipmentId
      )
      if (measurementItemsWithoutEquipment.length > 0) {
        recommendations.push(`${measurementItemsWithoutEquipment.length} measurement items should specify equipment`)
      }

      // Check for overdue calibrations
      const now = new Date()
      const overdueEquipment = controlPlan.controlPlanItems.filter(item =>
        item.measurementEquipment &&
        item.measurementEquipment.calibrationDue &&
        item.measurementEquipment.calibrationDue < now
      )
      if (overdueEquipment.length > 0) {
        recommendations.push(`${overdueEquipment.length} items have overdue equipment calibrations`)
      }

      // General recommendations
      if (controlPlan.controlPlanItems.length === 0) {
        recommendations.push('Control plan has no items - consider auto-populating from FMEA')
      }

      const preventionCount = controlPlan.controlPlanItems.filter(item => item.controlType === 'PREVENTION').length
      const detectionCount = controlPlan.controlPlanItems.filter(item => item.controlType === 'DETECTION').length
      
      if (preventionCount === 0) {
        recommendations.push('Consider adding prevention controls to reduce occurrence of defects')
      }
      
      if (detectionCount < preventionCount * 2) {
        recommendations.push('Detection controls should typically outnumber prevention controls')
      }

      return {
        isComplete: missingFields.length === 0,
        missingFields,
        recommendations
      }
    } catch (error) {
      logger.error('Error validating control plan completeness:', error)
      throw error
    }
  }

  /**
   * Map FMEA control method to control plan control method
   */
  private mapControlMethod(fmeaMethod: string): string {
    const methodMap: Record<string, string> = {
      'SPC': 'Statistical Process Control (SPC)',
      'INSPECTION': 'Inspection',
      'POKA_YOKE': 'Poka-Yoke (Error Proofing)',
      'FIXTURE': 'Fixture/Tooling',
      'CHECKLIST': 'Checklist Verification',
      'CALIBRATION': 'Equipment Calibration',
      'OPERATOR_TRAINING': 'Operator Training',
      'PREVENTIVE_MAINTENANCE': 'Preventive Maintenance',
      'OTHER': 'Other'
    }
    
    return methodMap[fmeaMethod] || fmeaMethod
  }

  /**
   * Map FMEA frequency to control plan frequency
   */
  private mapFrequency(fmeaFrequency: string): string {
    const frequencyMap: Record<string, string> = {
      'CONTINUOUS': 'Continuous',
      'EACH_PART': 'Each part',
      'HOURLY': 'Every hour',
      'SHIFT': 'Each shift',
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'MONTHLY': 'Monthly'
    }
    
    return frequencyMap[fmeaFrequency.toUpperCase()] || fmeaFrequency
  }

  /**
   * Determine control category based on control description
   */
  private determineControlCategory(controlDescription: string): 'MEASUREMENT' | 'VISUAL' | 'FUNCTIONAL' | 'ATTRIBUTE' {
    const desc = controlDescription.toLowerCase()
    
    if (desc.includes('measure') || desc.includes('gauge') || desc.includes('dimension') || desc.includes('torque')) {
      return 'MEASUREMENT'
    } else if (desc.includes('visual') || desc.includes('inspect') || desc.includes('color') || desc.includes('surface')) {
      return 'VISUAL'
    } else if (desc.includes('test') || desc.includes('function') || desc.includes('performance') || desc.includes('operation')) {
      return 'FUNCTIONAL'
    } else {
      return 'ATTRIBUTE'
    }
  }

  /**
   * Get default control method for process step type
   */
  private getDefaultControlMethodForStepType(stepType: string): string {
    const stepTypeMap: Record<string, string> = {
      'OPERATION': 'Process Monitoring',
      'INSPECTION': 'Inspection',
      'TRANSPORT': 'Handling Verification',
      'DELAY': 'Queue Management',
      'STORAGE': 'Storage Verification',
      'DECISION': 'Decision Point Check',
      'START': 'Setup Verification',
      'END': 'Final Inspection'
    }
    
    return stepTypeMap[stepType] || 'Process Control'
  }
}

export default ControlPlanService