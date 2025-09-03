import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

export interface RpnCalculation {
  severity: number
  occurrence: number
  detection: number
  rpn: number
}

export interface RpnAnalysis {
  currentRpn: RpnCalculation
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requiresAction: boolean
  recommendations: string[]
  thresholds: {
    severity: number
    occurrence: number
    detection: number
    rpn: number
  }
}

export interface FmeaMetrics {
  totalFailureModes: number
  highRiskItems: number
  averageRpn: number
  criticalItems: number
  openActionItems: number
  completedActionItems: number
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

class FmeaCalculationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate RPN for a specific failure mode
   */
  async calculateRpn(failureModeId: string): Promise<RpnCalculation> {
    try {
      // Get failure mode with related data
      const failureMode = await this.prisma.failureMode.findUnique({
        where: { id: failureModeId },
        include: {
          causes: {
            include: {
              controls: {
                where: {
                  controlType: 'DETECTION'
                }
              }
            }
          }
        }
      })

      if (!failureMode) {
        throw new Error(`Failure mode ${failureModeId} not found`)
      }

      const severity = failureMode.severityRating

      // Get the highest occurrence rating from all causes
      const occurrence = failureMode.causes.length > 0
        ? Math.max(...failureMode.causes.map(cause => cause.occurrenceRating))
        : 1

      // Get the highest detection rating (worst detection capability)
      let detection = 10 // Default to worst case if no detection controls
      
      const detectionRatings = failureMode.causes
        .flatMap(cause => cause.controls.map(control => control.detectionRating))
      
      if (detectionRatings.length > 0) {
        detection = Math.max(...detectionRatings)
      }

      const rpn = severity * occurrence * detection

      return {
        severity,
        occurrence,
        detection,
        rpn
      }
    } catch (error) {
      logger.error('Error calculating RPN:', error)
      throw error
    }
  }

  /**
   * Analyze RPN and provide risk assessment
   */
  async analyzeRpn(failureModeId: string, fmeaId?: string): Promise<RpnAnalysis> {
    try {
      const rpnCalc = await this.calculateRpn(failureModeId)
      
      // Get FMEA thresholds
      let thresholds = {
        severity: 7,
        occurrence: 4,
        detection: 7,
        rpn: 100
      }

      if (fmeaId) {
        const fmea = await this.prisma.fmea.findUnique({
          where: { id: fmeaId }
        })
        
        if (fmea) {
          thresholds = {
            severity: fmea.severityThreshold,
            occurrence: fmea.occurrenceThreshold,
            detection: fmea.detectionThreshold,
            rpn: fmea.rpnThreshold
          }
        }
      }

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
      const recommendations: string[] = []

      if (rpnCalc.rpn >= 300) {
        riskLevel = 'CRITICAL'
        recommendations.push('Immediate action required - stop production if necessary')
        recommendations.push('Implement emergency controls')
        recommendations.push('Escalate to management')
      } else if (rpnCalc.rpn >= thresholds.rpn) {
        riskLevel = 'HIGH'
        recommendations.push('Action required - develop corrective action plan')
        recommendations.push('Target completion within 30 days')
      } else if (rpnCalc.rpn >= 50) {
        riskLevel = 'MEDIUM'
        recommendations.push('Consider preventive actions')
        recommendations.push('Monitor closely')
      } else {
        riskLevel = 'LOW'
        recommendations.push('Continue current controls')
      }

      // Additional recommendations based on individual ratings
      if (rpnCalc.severity >= thresholds.severity) {
        recommendations.push('Focus on reducing severity through design changes')
      }

      if (rpnCalc.occurrence >= thresholds.occurrence) {
        recommendations.push('Implement prevention controls to reduce occurrence')
      }

      if (rpnCalc.detection >= thresholds.detection) {
        recommendations.push('Improve detection methods and early warning systems')
      }

      const requiresAction = rpnCalc.rpn >= thresholds.rpn

      return {
        currentRpn: rpnCalc,
        riskLevel,
        requiresAction,
        recommendations,
        thresholds
      }
    } catch (error) {
      logger.error('Error analyzing RPN:', error)
      throw error
    }
  }

  /**
   * Log RPN calculation for audit trail
   */
  async logRpnCalculation(
    failureModeId: string,
    rpn: RpnCalculation,
    calculatedById: string,
    notes?: string
  ): Promise<void> {
    try {
      await this.prisma.rpnCalculation.create({
        data: {
          failureModeId,
          severity: rpn.severity,
          occurrence: rpn.occurrence,
          detection: rpn.detection,
          rpn: rpn.rpn,
          calculatedById,
          notes
        }
      })
    } catch (error) {
      logger.error('Error logging RPN calculation:', error)
      throw error
    }
  }

  /**
   * Calculate FMEA metrics and statistics
   */
  async calculateFmeaMetrics(fmeaId: string): Promise<FmeaMetrics> {
    try {
      // Get all failure modes for this FMEA
      const failureModes = await this.prisma.failureMode.findMany({
        where: { fmeaId },
        include: {
          actionItems: true,
          fmea: true
        }
      })

      const totalFailureModes = failureModes.length
      let totalRpn = 0
      let criticalItems = 0
      let highRiskItems = 0

      const riskDistribution = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }

      // Calculate RPN for each failure mode and categorize
      for (const failureMode of failureModes) {
        const rpnCalc = await this.calculateRpn(failureMode.id)
        totalRpn += rpnCalc.rpn

        const thresholds = {
          rpn: failureMode.fmea.rpnThreshold
        }

        if (rpnCalc.rpn >= 300) {
          riskDistribution.critical++
          criticalItems++
          highRiskItems++
        } else if (rpnCalc.rpn >= thresholds.rpn) {
          riskDistribution.high++
          highRiskItems++
        } else if (rpnCalc.rpn >= 50) {
          riskDistribution.medium++
        } else {
          riskDistribution.low++
        }
      }

      // Calculate action item statistics
      const actionItems = failureModes.flatMap(fm => fm.actionItems)
      const openActionItems = actionItems.filter(ai => 
        ai.status === 'OPEN' || ai.status === 'IN_PROGRESS'
      ).length
      const completedActionItems = actionItems.filter(ai => 
        ai.status === 'COMPLETED'
      ).length

      const averageRpn = totalFailureModes > 0 ? Math.round(totalRpn / totalFailureModes) : 0

      return {
        totalFailureModes,
        highRiskItems,
        averageRpn,
        criticalItems,
        openActionItems,
        completedActionItems,
        riskDistribution
      }
    } catch (error) {
      logger.error('Error calculating FMEA metrics:', error)
      throw error
    }
  }

  /**
   * Auto-populate FMEA from process flow steps
   */
  async autoPopulateFromProcessFlow(
    fmeaId: string,
    processFlowId: string,
    userId: string
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    try {
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as string[]
      }

      // Get process steps
      const processSteps = await this.prisma.processStep.findMany({
        where: { processFlowId },
        orderBy: { stepNumber: 'asc' }
      })

      // Get existing failure modes to avoid duplicates
      const existingFailureModes = await this.prisma.failureMode.findMany({
        where: { fmeaId },
        include: {
          processStepLinks: true
        }
      })

      for (const step of processSteps) {
        try {
          // Check if failure mode already exists for this step
          const existingFM = existingFailureModes.find(fm =>
            fm.processStepLinks.some(link => link.processStepId === step.id)
          )

          if (existingFM) {
            results.skipped++
            continue
          }

          // Create base failure mode template based on step type
          const failureModeData = this.generateFailureModeTemplate(step, fmeaId)
          
          const newFailureMode = await this.prisma.failureMode.create({
            data: failureModeData
          })

          // Link to process step
          await this.prisma.processStepFailureMode.create({
            data: {
              processStepId: step.id,
              failureModeId: newFailureMode.id,
              relationshipType: 'AFFECTS',
              impactLevel: 'HIGH',
              notes: 'Auto-generated from process step'
            }
          })

          // Create basic effect
          await this.prisma.failureEffect.create({
            data: {
              failureModeId: newFailureMode.id,
              effectDescription: this.generateEffectTemplate(step.stepType),
              effectType: 'LOCAL',
              sequenceNumber: 1
            }
          })

          // Create basic cause
          const newCause = await this.prisma.failureCause.create({
            data: {
              failureModeId: newFailureMode.id,
              causeDescription: this.generateCauseTemplate(step.stepType),
              causeCategory: this.getCauseCategory(step.stepType),
              occurrenceRating: 3, // Default moderate rating
              sequenceNumber: 1
            }
          })

          // Create basic control
          await this.prisma.failureControl.create({
            data: {
              failureCauseId: newCause.id,
              controlDescription: this.generateControlTemplate(step.stepType),
              controlType: 'DETECTION',
              controlMethod: 'INSPECTION',
              detectionRating: 5, // Default moderate detection
              processStepId: step.id,
              sequenceNumber: 1
            }
          })

          results.created++
        } catch (error) {
          results.errors.push(`Error processing step ${step.name}: ${error}`)
        }
      }

      return results
    } catch (error) {
      logger.error('Error auto-populating FMEA:', error)
      throw error
    }
  }

  /**
   * Generate failure mode template based on process step
   */
  private generateFailureModeTemplate(step: any, fmeaId: string) {
    const stepTypeTemplates = {
      OPERATION: {
        itemFunction: `Perform ${step.name.toLowerCase()} operation`,
        failureMode: `${step.name} not performed correctly`,
        severityRating: 6
      },
      INSPECTION: {
        itemFunction: `Inspect ${step.name.toLowerCase()}`,
        failureMode: 'Defects not detected during inspection',
        severityRating: 8
      },
      TRANSPORT: {
        itemFunction: `Transport material/parts`,
        failureMode: 'Material damaged or lost during transport',
        severityRating: 5
      },
      DELAY: {
        itemFunction: `Temporary storage/delay`,
        failureMode: 'Excessive delay or storage damage',
        severityRating: 4
      },
      STORAGE: {
        itemFunction: `Store material/parts safely`,
        failureMode: 'Material degradation during storage',
        severityRating: 5
      },
      DECISION: {
        itemFunction: `Make process decision`,
        failureMode: 'Incorrect decision made',
        severityRating: 7
      },
      START: {
        itemFunction: `Initiate process`,
        failureMode: 'Process fails to start',
        severityRating: 6
      },
      END: {
        itemFunction: `Complete process`,
        failureMode: 'Process not properly completed',
        severityRating: 5
      }
    }

    const template = stepTypeTemplates[step.stepType as keyof typeof stepTypeTemplates] || 
      stepTypeTemplates.OPERATION

    return {
      fmeaId,
      itemFunction: template.itemFunction,
      failureMode: template.failureMode,
      severityRating: template.severityRating,
      primaryProcessStepId: step.id,
      sequenceNumber: step.stepNumber
    }
  }

  /**
   * Generate effect template based on step type
   */
  private generateEffectTemplate(stepType: string): string {
    const effectTemplates = {
      OPERATION: 'Defective product, rework required',
      INSPECTION: 'Defects passed to customer',
      TRANSPORT: 'Production delays, damaged parts',
      DELAY: 'Production schedule disruption',
      STORAGE: 'Material waste, quality degradation',
      DECISION: 'Wrong process path, quality issues',
      START: 'Production cannot begin',
      END: 'Incomplete product delivery'
    }

    return effectTemplates[stepType as keyof typeof effectTemplates] || 
      'Process disruption, potential quality impact'
  }

  /**
   * Generate cause template based on step type
   */
  private generateCauseTemplate(stepType: string): string {
    const causeTemplates = {
      OPERATION: 'Equipment malfunction, operator error, material variation',
      INSPECTION: 'Inspector fatigue, measurement error, lighting issues',
      TRANSPORT: 'Handling damage, wrong routing, equipment failure',
      DELAY: 'Scheduling issues, resource unavailability',
      STORAGE: 'Environmental conditions, contamination, handling',
      DECISION: 'Insufficient information, human error, system failure',
      START: 'Material shortage, equipment not ready, authorization issues',
      END: 'Incomplete checklist, missing documentation, time pressure'
    }

    return causeTemplates[stepType as keyof typeof causeTemplates] || 
      'Human error, equipment failure, material issues'
  }

  /**
   * Get cause category based on step type
   */
  private getCauseCategory(stepType: string): string {
    const categoryMap = {
      OPERATION: 'MACHINE',
      INSPECTION: 'MEASUREMENT',
      TRANSPORT: 'METHOD',
      DELAY: 'METHOD',
      STORAGE: 'ENVIRONMENT',
      DECISION: 'MANPOWER',
      START: 'METHOD',
      END: 'METHOD'
    }

    return categoryMap[stepType as keyof typeof categoryMap] || 'OTHER'
  }

  /**
   * Generate control template based on step type
   */
  private generateControlTemplate(stepType: string): string {
    const controlTemplates = {
      OPERATION: 'Visual inspection, parameter monitoring',
      INSPECTION: 'Calibrated measuring equipment, procedure verification',
      TRANSPORT: 'Handling procedures, damage inspection',
      DELAY: 'Schedule monitoring, condition checks',
      STORAGE: 'Environmental monitoring, inventory checks',
      DECISION: 'Decision criteria verification, supervisor review',
      START: 'Readiness checklist, authorization verification',
      END: 'Completion checklist, final inspection'
    }

    return controlTemplates[stepType as keyof typeof controlTemplates] || 
      'Process monitoring, periodic inspection'
  }

  /**
   * Validate FMEA completeness
   */
  async validateFmeaCompleteness(fmeaId: string): Promise<{
    isComplete: boolean
    missingFields: string[]
    recommendations: string[]
  }> {
    try {
      const missingFields: string[] = []
      const recommendations: string[] = []

      // Check FMEA header completeness
      const fmea = await this.prisma.fmea.findUnique({
        where: { id: fmeaId },
        include: {
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
          }
        }
      })

      if (!fmea) {
        throw new Error('FMEA not found')
      }

      // Check for empty FMEA
      if (fmea.failureModes.length === 0) {
        missingFields.push('failure_modes')
        recommendations.push('Add failure modes to the FMEA')
      }

      let incompleteFailureModes = 0

      for (const failureMode of fmea.failureModes) {
        let modeIncomplete = false

        // Check for missing effects
        if (failureMode.effects.length === 0) {
          modeIncomplete = true
          incompleteFailureModes++
        }

        // Check for missing causes
        if (failureMode.causes.length === 0) {
          modeIncomplete = true
          incompleteFailureModes++
        }

        // Check for missing controls
        const hasControls = failureMode.causes.some(cause => cause.controls.length > 0)
        if (!hasControls) {
          modeIncomplete = true
          incompleteFailureModes++
        }

        // Check for high RPN without actions
        const rpn = await this.calculateRpn(failureMode.id)
        if (rpn.rpn >= fmea.rpnThreshold && failureMode.actionItems.length === 0) {
          recommendations.push(
            `Failure mode "${failureMode.failureMode}" has RPN ${rpn.rpn} but no action items`
          )
        }
      }

      if (incompleteFailureModes > 0) {
        missingFields.push('incomplete_failure_modes')
        recommendations.push(
          `${incompleteFailureModes} failure mode(s) are missing effects, causes, or controls`
        )
      }

      const isComplete = missingFields.length === 0 && incompleteFailureModes === 0

      return {
        isComplete,
        missingFields,
        recommendations
      }
    } catch (error) {
      logger.error('Error validating FMEA completeness:', error)
      throw error
    }
  }
}

export default FmeaCalculationService