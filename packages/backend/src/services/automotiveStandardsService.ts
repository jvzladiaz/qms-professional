import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

interface IATF16949Requirement {
  id: string
  section: string
  title: string
  description: string
  category: 'CUSTOMER_SATISFACTION' | 'LEADERSHIP' | 'PLANNING' | 'SUPPORT' | 'OPERATION' | 'EVALUATION' | 'IMPROVEMENT'
  applicableProcesses: string[]
  evidenceRequirements: string[]
  auditQuestions: string[]
  complianceLevel: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL'
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface AIAGVDAStandard {
  id: string
  version: string
  standardName: string
  fmeaType: 'DFMEA' | 'PFMEA' | 'FMEA-MSR'
  severityScale: SeverityScale
  occurrenceScale: OccurrenceScale
  detectionScale: DetectionScale
  riskMatrix: RiskMatrix
  actionPriority: ActionPriorityMatrix
}

interface SeverityScale {
  ratings: Array<{
    value: number
    description: string
    criteria: string
    examples: string[]
  }>
}

interface OccurrenceScale {
  ratings: Array<{
    value: number
    description: string
    probability: string
    cpkRange?: string
    failureRate?: string
  }>
}

interface DetectionScale {
  ratings: Array<{
    value: number
    description: string
    detectionMethod: string
    controlType: string
    likelihood: string
  }>
}

interface RiskMatrix {
  lowRisk: { rpnMax: number, color: string }
  mediumRisk: { rpnMin: number, rpnMax: number, color: string }
  highRisk: { rpnMin: number, rpnMax: number, color: string }
  criticalRisk: { rpnMin: number, color: string }
}

interface ActionPriorityMatrix {
  criteria: Array<{
    severity: number[]
    occurrence: number[]
    detection: number[]
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    action: string
  }>
}

interface ComplianceAssessment {
  projectId: string
  standardType: 'IATF_16949' | 'ISO_9001' | 'AIAG_VDA'
  overallScore: number
  assessmentDate: Date
  sections: Array<{
    sectionId: string
    sectionName: string
    score: number
    maxScore: number
    findings: ComplianceFinding[]
    recommendations: string[]
  }>
  nonConformities: NonConformity[]
  actionPlan: ComplianceActionPlan[]
}

interface ComplianceFinding {
  id: string
  requirementId: string
  status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE'
  evidence: string[]
  gaps: string[]
  risk: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface NonConformity {
  id: string
  section: string
  requirement: string
  description: string
  severity: 'MAJOR' | 'MINOR' | 'OBSERVATION'
  rootCause?: string
  correctiveAction?: string
  targetDate?: Date
  responsiblePerson?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'VERIFIED'
}

interface ComplianceActionPlan {
  id: string
  requirement: string
  currentGap: string
  plannedAction: string
  targetDate: Date
  responsiblePerson: string
  resources: string
  successCriteria: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'
}

interface AutomotiveTemplate {
  id: string
  name: string
  type: 'FMEA' | 'CONTROL_PLAN' | 'PROCESS_FLOW' | 'PPAP' | 'MSA'
  standard: 'IATF_16949' | 'AIAG_VDA' | 'VDA' | 'AIAG'
  version: string
  structure: any
  validationRules: any[]
  requiredFields: string[]
  optionalFields: string[]
  calculationRules: any[]
}

class AutomotiveStandardsService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Get IATF 16949 requirements
   */
  getIATF16949Requirements(): IATF16949Requirement[] {
    return [
      {
        id: 'IATF_4.1',
        section: '4.1',
        title: 'Understanding the organization and its context',
        description: 'Organization shall determine external and internal issues relevant to its purpose and strategic direction',
        category: 'PLANNING',
        applicableProcesses: ['MANAGEMENT_REVIEW', 'STRATEGIC_PLANNING'],
        evidenceRequirements: [
          'Context analysis documentation',
          'Risk and opportunity identification',
          'Stakeholder requirements analysis'
        ],
        auditQuestions: [
          'How does the organization identify and monitor internal and external issues?',
          'How are these issues considered in the QMS?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'MEDIUM'
      },
      {
        id: 'IATF_7.1.5.3',
        section: '7.1.5.3',
        title: 'Laboratory requirements',
        description: 'Internal laboratories shall be technically competent and shall have a defined scope',
        category: 'SUPPORT',
        applicableProcesses: ['LABORATORY', 'CALIBRATION', 'TESTING'],
        evidenceRequirements: [
          'Laboratory scope documentation',
          'Technical competence records',
          'ISO/IEC 17025 accreditation or equivalent'
        ],
        auditQuestions: [
          'Is the laboratory scope clearly defined?',
          'Are laboratory personnel technically competent?',
          'Is the laboratory accredited to ISO/IEC 17025 or equivalent?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'HIGH'
      },
      {
        id: 'IATF_8.3.2.2',
        section: '8.3.2.2',
        title: 'Product design skills',
        description: 'Organization shall have skills for product design including use of alternative materials and processes',
        category: 'OPERATION',
        applicableProcesses: ['PRODUCT_DESIGN', 'ENGINEERING'],
        evidenceRequirements: [
          'Design competency matrix',
          'Training records',
          'Design review processes'
        ],
        auditQuestions: [
          'What design skills are available in the organization?',
          'How are design competencies maintained and developed?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'HIGH'
      },
      {
        id: 'IATF_8.3.3.3',
        section: '8.3.3.3',
        title: 'Product approval process',
        description: 'Organization shall use a multi-disciplinary approach for design and development reviews',
        category: 'OPERATION',
        applicableProcesses: ['DESIGN_REVIEW', 'VALIDATION'],
        evidenceRequirements: [
          'Multi-disciplinary team records',
          'Design review documentation',
          'Cross-functional involvement evidence'
        ],
        auditQuestions: [
          'Is a multi-disciplinary approach used for design reviews?',
          'Who participates in design reviews?',
          'How are design review results documented and acted upon?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'MEDIUM'
      },
      {
        id: 'IATF_8.4.2.2',
        section: '8.4.2.2',
        title: 'Supplier monitoring',
        description: 'Organization shall monitor supplier performance and develop supplier report cards',
        category: 'OPERATION',
        applicableProcesses: ['SUPPLIER_MANAGEMENT', 'PURCHASING'],
        evidenceRequirements: [
          'Supplier performance data',
          'Report cards or scorecards',
          'Supplier improvement plans'
        ],
        auditQuestions: [
          'How is supplier performance monitored?',
          'Are supplier report cards maintained?',
          'How are underperforming suppliers managed?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'MEDIUM'
      },
      {
        id: 'IATF_8.5.1.1',
        section: '8.5.1.1',
        title: 'Control plan',
        description: 'Organization shall develop control plans at system, sub-system, and component levels',
        category: 'OPERATION',
        applicableProcesses: ['PRODUCTION', 'QUALITY_CONTROL'],
        evidenceRequirements: [
          'Control plans for all production levels',
          'Control plan reviews and updates',
          'Linkage to FMEA and other planning tools'
        ],
        auditQuestions: [
          'Are control plans developed for all production levels?',
          'How are control plans maintained and updated?',
          'Are control plans linked to FMEAs?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'HIGH'
      },
      {
        id: 'IATF_8.5.6.1.1',
        section: '8.5.6.1.1',
        title: 'Statistical concepts',
        description: 'Personnel shall be trained in statistical concepts required for their job function',
        category: 'OPERATION',
        applicableProcesses: ['TRAINING', 'STATISTICAL_PROCESS_CONTROL'],
        evidenceRequirements: [
          'Statistical training matrix',
          'Training records',
          'Competency assessments'
        ],
        auditQuestions: [
          'Are personnel trained in relevant statistical concepts?',
          'How is statistical competency verified?',
          'Are statistical methods properly applied?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'MEDIUM'
      },
      {
        id: 'IATF_9.1.1.1',
        section: '9.1.1.1',
        title: 'Manufacturing process monitoring',
        description: 'Organization shall implement statistical process control for all special characteristics',
        category: 'EVALUATION',
        applicableProcesses: ['SPC', 'MONITORING', 'MEASUREMENT'],
        evidenceRequirements: [
          'SPC implementation for special characteristics',
          'Control charts and analysis',
          'Out-of-control action plans'
        ],
        auditQuestions: [
          'Is SPC implemented for all special characteristics?',
          'How are out-of-control conditions handled?',
          'Are control charts properly maintained and analyzed?'
        ],
        complianceLevel: 'MANDATORY',
        riskLevel: 'HIGH'
      }
    ]
  }

  /**
   * Get AIAG-VDA FMEA standard
   */
  getAIAGVDAStandard(): AIAGVDAStandard {
    return {
      id: 'AIAG_VDA_2019',
      version: '2019',
      standardName: 'AIAG-VDA FMEA Handbook',
      fmeaType: 'PFMEA',
      severityScale: {
        ratings: [
          {
            value: 10,
            description: 'Hazardous without warning',
            criteria: 'Very high severity when a potential failure mode affects safe vehicle/product operation and/or involves noncompliance with government regulation without warning',
            examples: ['Loss of braking', 'Loss of steering', 'Fire/explosion risk']
          },
          {
            value: 9,
            description: 'Hazardous with warning',
            criteria: 'Very high severity when a potential failure mode affects safe vehicle/product operation and/or involves noncompliance with government regulation with warning',
            examples: ['Reduced braking capability', 'Engine stall with warning']
          },
          {
            value: 8,
            description: 'Very high',
            criteria: 'Vehicle/product inoperable (loss of primary function)',
            examples: ['Engine will not start', 'Vehicle will not move']
          },
          {
            value: 7,
            description: 'High',
            criteria: 'Vehicle/product operable but at reduced level of performance. Customer very dissatisfied',
            examples: ['Reduced acceleration', 'Hard starting']
          },
          {
            value: 6,
            description: 'Moderate',
            criteria: 'Vehicle/product operable but comfort/convenience items may not operate. Customer dissatisfied',
            examples: ['Air conditioning inoperative', 'Radio static']
          },
          {
            value: 5,
            description: 'Low',
            criteria: 'Vehicle/product operable but comfort/convenience items operate at reduced level. Customer somewhat dissatisfied',
            examples: ['Air conditioning reduced performance', 'Radio fade']
          },
          {
            value: 4,
            description: 'Very low',
            criteria: 'Fit and finish/squeak and rattle items do not conform. Defect noticed by most customers',
            examples: ['Gap and flush concerns', 'Wind noise']
          },
          {
            value: 3,
            description: 'Minor',
            criteria: 'Fit and finish/squeak and rattle items do not conform. Defect noticed by average customers',
            examples: ['Paint imperfections', 'Minor trim misalignment']
          },
          {
            value: 2,
            description: 'Very minor',
            criteria: 'Fit and finish/squeak and rattle items do not conform. Defect noticed by discriminating customers',
            examples: ['Small paint blemishes', 'Very minor trim concerns']
          },
          {
            value: 1,
            description: 'None',
            criteria: 'No effect',
            examples: ['No discernible effect on vehicle/product']
          }
        ]
      },
      occurrenceScale: {
        ratings: [
          {
            value: 10,
            description: 'Very high',
            probability: 'Failure is almost inevitable',
            cpkRange: 'Cpk ≤ 0.33',
            failureRate: '≥ 100 per thousand pieces'
          },
          {
            value: 9,
            description: 'Very high',
            probability: 'Very high probability of occurrence',
            cpkRange: '0.33 < Cpk ≤ 0.51',
            failureRate: '50 per thousand pieces'
          },
          {
            value: 8,
            description: 'High',
            probability: 'High probability of occurrence',
            cpkRange: '0.51 < Cpk ≤ 0.67',
            failureRate: '20 per thousand pieces'
          },
          {
            value: 7,
            description: 'High',
            probability: 'Moderately high probability',
            cpkRange: '0.67 < Cpk ≤ 0.83',
            failureRate: '10 per thousand pieces'
          },
          {
            value: 6,
            description: 'Moderate',
            probability: 'Moderate probability of occurrence',
            cpkRange: '0.83 < Cpk ≤ 1.00',
            failureRate: '5 per thousand pieces'
          },
          {
            value: 5,
            description: 'Moderate',
            probability: 'Moderate probability of occurrence',
            cpkRange: '1.00 < Cpk ≤ 1.17',
            failureRate: '2 per thousand pieces'
          },
          {
            value: 4,
            description: 'Relatively low',
            probability: 'Relatively low probability',
            cpkRange: '1.17 < Cpk ≤ 1.33',
            failureRate: '1 per thousand pieces'
          },
          {
            value: 3,
            description: 'Low',
            probability: 'Low probability of occurrence',
            cpkRange: '1.33 < Cpk ≤ 1.50',
            failureRate: '0.5 per thousand pieces'
          },
          {
            value: 2,
            description: 'Very low',
            probability: 'Very low probability',
            cpkRange: '1.50 < Cpk ≤ 1.67',
            failureRate: '0.1 per thousand pieces'
          },
          {
            value: 1,
            description: 'Remote',
            probability: 'Remote probability',
            cpkRange: 'Cpk > 1.67',
            failureRate: '≤ 0.01 per thousand pieces'
          }
        ]
      },
      detectionScale: {
        ratings: [
          {
            value: 10,
            description: 'Almost impossible',
            detectionMethod: 'No known controls available to detect failure mode',
            controlType: 'Cannot detect or is not checked',
            likelihood: 'Almost certain will not detect'
          },
          {
            value: 9,
            description: 'Very remote',
            detectionMethod: 'Controls probably will not detect failure mode',
            controlType: 'Controls have poor detection capability',
            likelihood: 'Very remote chance controls will detect'
          },
          {
            value: 8,
            description: 'Remote',
            detectionMethod: 'Controls have poor chance to detect failure mode',
            controlType: 'Controls have poor detection capability',
            likelihood: 'Remote chance controls will detect'
          },
          {
            value: 7,
            description: 'Very low',
            detectionMethod: 'Controls have poor chance to detect failure mode',
            controlType: 'Controls may detect failure mode',
            likelihood: 'Very low chance controls will detect'
          },
          {
            value: 6,
            description: 'Low',
            detectionMethod: 'Controls may detect failure mode',
            controlType: 'Controls may detect failure mode',
            likelihood: 'Low chance controls will detect'
          },
          {
            value: 5,
            description: 'Moderate',
            detectionMethod: 'Controls may detect failure mode',
            controlType: 'Controls have moderate detection capability',
            likelihood: 'Moderate chance controls will detect'
          },
          {
            value: 4,
            description: 'Moderately high',
            detectionMethod: 'Controls have good chance to detect failure mode',
            controlType: 'Controls have moderately high detection capability',
            likelihood: 'Moderately high chance controls will detect'
          },
          {
            value: 3,
            description: 'High',
            detectionMethod: 'Controls have good chance to detect failure mode',
            controlType: 'Controls have high detection capability',
            likelihood: 'High chance controls will detect'
          },
          {
            value: 2,
            description: 'Very high',
            detectionMethod: 'Controls almost certain to detect failure mode',
            controlType: 'Controls have very high detection capability',
            likelihood: 'Very high chance controls will detect'
          },
          {
            value: 1,
            description: 'Almost certain',
            detectionMethod: 'Controls almost certain to detect failure mode',
            controlType: 'Controls will almost certainly detect failure mode',
            likelihood: 'Controls will almost certainly detect'
          }
        ]
      },
      riskMatrix: {
        lowRisk: { rpnMax: 100, color: '#4CAF50' },
        mediumRisk: { rpnMin: 101, rpnMax: 200, color: '#FFC107' },
        highRisk: { rpnMin: 201, rpnMax: 300, color: '#FF9800' },
        criticalRisk: { rpnMin: 301, color: '#F44336' }
      },
      actionPriority: {
        criteria: [
          {
            severity: [9, 10],
            occurrence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            detection: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            priority: 'HIGH',
            action: 'Special attention required due to high severity'
          },
          {
            severity: [7, 8],
            occurrence: [4, 5, 6, 7, 8, 9, 10],
            detection: [4, 5, 6, 7, 8, 9, 10],
            priority: 'HIGH',
            action: 'High priority for risk reduction'
          },
          {
            severity: [1, 2, 3, 4, 5, 6],
            occurrence: [1, 2, 3],
            detection: [1, 2, 3],
            priority: 'LOW',
            action: 'Consider for improvement'
          }
        ]
      }
    }
  }

  /**
   * Perform IATF 16949 compliance assessment
   */
  async performIATF16949Assessment(projectId: string): Promise<ComplianceAssessment> {
    try {
      const requirements = this.getIATF16949Requirements()
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          fmeas: {
            include: {
              failureModes: {
                include: {
                  effects: true,
                  causes: {
                    include: { controls: true }
                  },
                  actionItems: true
                }
              }
            }
          },
          controlPlans: {
            include: {
              controlPlanItems: true
            }
          },
          processFlows: {
            include: {
              processSteps: true
            }
          }
        }
      })

      if (!project) {
        throw new Error('Project not found')
      }

      const sections: any[] = []
      const nonConformities: NonConformity[] = []
      const actionPlan: ComplianceActionPlan[] = []

      // Group requirements by category
      const categorizedRequirements = this.groupRequirementsByCategory(requirements)

      for (const [category, categoryRequirements] of Object.entries(categorizedRequirements)) {
        const findings: ComplianceFinding[] = []
        let sectionScore = 0
        const maxSectionScore = categoryRequirements.length * 10

        for (const requirement of categoryRequirements) {
          const finding = await this.assessRequirement(requirement, project)
          findings.push(finding)

          // Calculate score based on compliance status
          switch (finding.status) {
            case 'COMPLIANT':
              sectionScore += 10
              break
            case 'PARTIALLY_COMPLIANT':
              sectionScore += 5
              break
            case 'NON_COMPLIANT':
              sectionScore += 0
              // Create non-conformity
              nonConformities.push({
                id: `NC_${requirement.id}`,
                section: requirement.section,
                requirement: requirement.title,
                description: `Non-compliance with ${requirement.section}: ${requirement.description}`,
                severity: requirement.riskLevel === 'HIGH' ? 'MAJOR' : 'MINOR',
                status: 'OPEN'
              })
              
              // Create action plan item
              actionPlan.push({
                id: `AP_${requirement.id}`,
                requirement: requirement.title,
                currentGap: finding.gaps.join('; '),
                plannedAction: `Address compliance gap for ${requirement.section}`,
                targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                responsiblePerson: 'Quality Manager',
                resources: 'Internal team',
                successCriteria: 'Full compliance with requirement',
                status: 'PLANNED'
              })
              break
            case 'NOT_APPLICABLE':
              // Don't count towards score
              break
          }
        }

        sections.push({
          sectionId: category,
          sectionName: category.replace('_', ' '),
          score: sectionScore,
          maxScore: maxSectionScore,
          findings,
          recommendations: this.generateSectionRecommendations(findings)
        })
      }

      const totalScore = sections.reduce((sum, section) => sum + section.score, 0)
      const maxTotalScore = sections.reduce((sum, section) => sum + section.maxScore, 0)
      const overallScore = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0

      const assessment: ComplianceAssessment = {
        projectId,
        standardType: 'IATF_16949',
        overallScore,
        assessmentDate: new Date(),
        sections,
        nonConformities,
        actionPlan
      }

      // Save assessment to database
      await this.saveComplianceAssessment(assessment)

      return assessment

    } catch (error) {
      logger.error('Error performing IATF 16949 assessment:', error)
      throw error
    }
  }

  /**
   * Generate automotive templates
   */
  getAutomotiveTemplates(): AutomotiveTemplate[] {
    return [
      {
        id: 'AIAG_PFMEA_2019',
        name: 'AIAG-VDA Process FMEA (2019)',
        type: 'FMEA',
        standard: 'AIAG_VDA',
        version: '2019',
        structure: {
          header: {
            fmeaNumber: { required: true },
            fmeaDate: { required: true },
            teamLeader: { required: true },
            coreTeam: { required: true },
            process: { required: true },
            supplier: { required: false },
            keyDate: { required: false }
          },
          columns: [
            'Process Function',
            'Requirements',
            'Failure Mode',
            'Failure Effects',
            'Severity',
            'Failure Causes',
            'Occurrence',
            'Prevention Controls',
            'Detection Controls',
            'Detection',
            'Action Priority',
            'Recommended Actions',
            'Responsibility',
            'Actions Taken',
            'Severity',
            'Occurrence',
            'Detection',
            'Action Priority'
          ]
        },
        validationRules: [
          {
            field: 'severity',
            rule: 'range',
            min: 1,
            max: 10,
            message: 'Severity must be between 1 and 10'
          },
          {
            field: 'occurrence',
            rule: 'range',
            min: 1,
            max: 10,
            message: 'Occurrence must be between 1 and 10'
          },
          {
            field: 'detection',
            rule: 'range',
            min: 1,
            max: 10,
            message: 'Detection must be between 1 and 10'
          }
        ],
        requiredFields: ['processFunction', 'failureMode', 'failureEffects', 'severity', 'failureCauses', 'occurrence', 'detection'],
        optionalFields: ['requirements', 'preventionControls', 'detectionControls', 'recommendedActions'],
        calculationRules: [
          {
            field: 'rpn',
            formula: 'severity * occurrence * detection'
          },
          {
            field: 'actionPriority',
            formula: 'calculateActionPriority(severity, occurrence, detection)'
          }
        ]
      },
      {
        id: 'IATF_CONTROL_PLAN',
        name: 'IATF 16949 Control Plan',
        type: 'CONTROL_PLAN',
        standard: 'IATF_16949',
        version: '2016',
        structure: {
          header: {
            controlPlanNumber: { required: true },
            part: { required: true },
            supplier: { required: true },
            coreTeam: { required: true },
            keyContact: { required: true },
            supplierCode: { required: false },
            revisionDate: { required: true },
            revisionLevel: { required: true }
          },
          phases: ['Prototype', 'Pre-launch', 'Production'],
          characteristics: {
            productCharacteristics: { required: true },
            processCharacteristics: { required: true },
            specialCharacteristics: { required: true }
          }
        },
        validationRules: [
          {
            field: 'sampleSize',
            rule: 'numeric',
            message: 'Sample size must be numeric'
          },
          {
            field: 'frequency',
            rule: 'required',
            message: 'Sampling frequency is required'
          }
        ],
        requiredFields: ['processStep', 'characteristic', 'specification', 'evaluationMeasurement', 'sampleSize', 'frequency'],
        optionalFields: ['gages', 'notes'],
        calculationRules: []
      }
    ]
  }

  /**
   * Validate FMEA against automotive standards
   */
  async validateFMEAAgainstStandards(
    fmeaId: string,
    standard: 'AIAG_VDA' | 'VDA' | 'AIAG'
  ): Promise<{
    isValid: boolean
    violations: Array<{
      rule: string
      severity: 'ERROR' | 'WARNING' | 'INFO'
      message: string
      field?: string
      suggestion?: string
    }>
    complianceScore: number
  }> {
    try {
      const fmea = await this.prisma.fmea.findUnique({
        where: { id: fmeaId },
        include: {
          failureModes: {
            include: {
              effects: true,
              causes: {
                include: { controls: true }
              },
              actionItems: true
            }
          }
        }
      })

      if (!fmea) {
        throw new Error('FMEA not found')
      }

      const violations: any[] = []
      let totalChecks = 0
      let passedChecks = 0

      const standards = this.getAIAGVDAStandard()

      // Validate each failure mode
      for (const failureMode of fmea.failureModes) {
        totalChecks += 6 // Basic checks per failure mode

        // Check if all required fields are present
        if (!failureMode.description) {
          violations.push({
            rule: 'REQUIRED_FIELD',
            severity: 'ERROR',
            message: 'Failure mode description is required',
            field: 'description',
            suggestion: 'Provide a clear description of the failure mode'
          })
        } else {
          passedChecks++
        }

        if (!failureMode.processFunction) {
          violations.push({
            rule: 'REQUIRED_FIELD',
            severity: 'ERROR',
            message: 'Process function is required',
            field: 'processFunction',
            suggestion: 'Specify the process function associated with this failure mode'
          })
        } else {
          passedChecks++
        }

        // Validate severity ratings
        for (const effect of failureMode.effects) {
          if (!effect.severity || effect.severity < 1 || effect.severity > 10) {
            violations.push({
              rule: 'SEVERITY_RANGE',
              severity: 'ERROR',
              message: 'Severity rating must be between 1 and 10',
              field: 'severity',
              suggestion: 'Use AIAG-VDA severity scale (1-10)'
            })
          } else {
            passedChecks++
          }

          // Check for high severity without adequate controls
          if (effect.severity >= 9) {
            const hasAdequateControls = failureMode.causes.some(cause =>
              cause.controls.some(control => (control.detection || 10) <= 3)
            )
            
            if (!hasAdequateControls) {
              violations.push({
                rule: 'HIGH_SEVERITY_CONTROL',
                severity: 'WARNING',
                message: 'High severity items should have robust detection controls',
                suggestion: 'Add detection controls with rating ≤ 3 for safety-critical failure modes'
              })
            } else {
              passedChecks++
            }
          } else {
            passedChecks++
          }
        }

        // Validate occurrence ratings
        for (const cause of failureMode.causes) {
          if (!cause.occurrence || cause.occurrence < 1 || cause.occurrence > 10) {
            violations.push({
              rule: 'OCCURRENCE_RANGE',
              severity: 'ERROR',
              message: 'Occurrence rating must be between 1 and 10',
              field: 'occurrence',
              suggestion: 'Use AIAG-VDA occurrence scale (1-10)'
            })
          } else {
            passedChecks++
          }

          // Validate detection ratings
          for (const control of cause.controls) {
            if (!control.detection || control.detection < 1 || control.detection > 10) {
              violations.push({
                rule: 'DETECTION_RANGE',
                severity: 'ERROR',
                message: 'Detection rating must be between 1 and 10',
                field: 'detection',
                suggestion: 'Use AIAG-VDA detection scale (1-10)'
              })
            } else {
              passedChecks++
            }
          }
        }

        // Calculate and validate RPN
        const rpn = this.calculateRPN(failureMode)
        if (rpn > 300) {
          violations.push({
            rule: 'HIGH_RPN',
            severity: 'WARNING',
            message: `RPN (${rpn}) exceeds 300, consider immediate action`,
            suggestion: 'Develop action items to reduce severity, occurrence, or improve detection'
          })
        }

        // Check for action items on high-risk failure modes
        if (rpn > 200 && (!failureMode.actionItems || failureMode.actionItems.length === 0)) {
          violations.push({
            rule: 'MISSING_ACTION_ITEMS',
            severity: 'WARNING',
            message: 'High-risk failure modes should have action items',
            suggestion: 'Define specific actions to reduce risk'
          })
        }
      }

      const complianceScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0
      const isValid = violations.filter(v => v.severity === 'ERROR').length === 0

      return {
        isValid,
        violations,
        complianceScore
      }

    } catch (error) {
      logger.error('Error validating FMEA against standards:', error)
      throw error
    }
  }

  /**
   * Generate supplier FMEA requirements
   */
  generateSupplierFMEARequirements(supplierType: 'TIER1' | 'TIER2' | 'SERVICE'): {
    mandatoryElements: string[]
    recommendedElements: string[]
    deliverables: string[]
    reviewCriteria: string[]
  } {
    const baseRequirements = {
      mandatoryElements: [
        'FMEA team identification with roles',
        'Process flow diagram linked to FMEA',
        'Function and requirements definition',
        'All potential failure modes identified',
        'Severity, occurrence, and detection ratings per AIAG-VDA',
        'RPN calculation and risk assessment',
        'Action plan for high-risk items (RPN > 200)',
        'Responsible persons and target dates assigned',
        'Revised ratings after actions implemented'
      ],
      recommendedElements: [
        'Lessons learned from previous similar processes',
        'Benchmark data from industry best practices',
        'Statistical data to support occurrence ratings',
        'Design verification test results',
        'Customer-specific requirements integration'
      ],
      deliverables: [
        'Completed FMEA document in approved format',
        'Action item tracking log',
        'Monthly status reports',
        'Final certification upon completion'
      ],
      reviewCriteria: [
        'Completeness of failure mode identification',
        'Accuracy of severity ratings per customer requirements',
        'Validity of occurrence data and sources',
        'Effectiveness of detection methods',
        'Quality of recommended actions',
        'Timeline adherence for action implementation'
      ]
    }

    // Customize based on supplier type
    switch (supplierType) {
      case 'TIER1':
        return {
          ...baseRequirements,
          mandatoryElements: [
            ...baseRequirements.mandatoryElements,
            'System-level FMEA integration',
            'Interface failure mode analysis',
            'Warranty data analysis',
            'Field failure correlation'
          ],
          deliverables: [
            ...baseRequirements.deliverables,
            'System integration report',
            'Interface control document'
          ]
        }

      case 'TIER2':
        return {
          ...baseRequirements,
          mandatoryElements: [
            ...baseRequirements.mandatoryElements,
            'Component-level detailed analysis',
            'Material failure mode consideration'
          ]
        }

      case 'SERVICE':
        return {
          ...baseRequirements,
          mandatoryElements: baseRequirements.mandatoryElements.filter(req => 
            !req.includes('Process flow') && !req.includes('material')
          ).concat([
            'Service process mapping',
            'Customer interaction failure modes',
            'Service delivery failure analysis'
          ])
        }

      default:
        return baseRequirements
    }
  }

  /**
   * Helper methods
   */
  private groupRequirementsByCategory(requirements: IATF16949Requirement[]): Record<string, IATF16949Requirement[]> {
    return requirements.reduce((grouped, requirement) => {
      if (!grouped[requirement.category]) {
        grouped[requirement.category] = []
      }
      grouped[requirement.category].push(requirement)
      return grouped
    }, {} as Record<string, IATF16949Requirement[]>)
  }

  private async assessRequirement(requirement: IATF16949Requirement, project: any): Promise<ComplianceFinding> {
    // Simplified assessment logic - in reality, this would be much more complex
    const evidence: string[] = []
    const gaps: string[] = []
    let status: ComplianceFinding['status'] = 'NON_COMPLIANT'

    switch (requirement.section) {
      case '8.5.1.1': // Control plan requirement
        if (project.controlPlans && project.controlPlans.length > 0) {
          evidence.push('Control plans exist for the project')
          status = 'COMPLIANT'
        } else {
          gaps.push('No control plans found')
          status = 'NON_COMPLIANT'
        }
        break

      case '8.3.3.3': // Design review requirement
        if (project.fmeas && project.fmeas.length > 0) {
          evidence.push('FMEA documents exist indicating design review process')
          status = 'PARTIALLY_COMPLIANT'
        } else {
          gaps.push('No evidence of systematic design reviews')
        }
        break

      default:
        status = 'NOT_APPLICABLE'
    }

    return {
      id: `FINDING_${requirement.id}`,
      requirementId: requirement.id,
      status,
      evidence,
      gaps,
      risk: requirement.riskLevel
    }
  }

  private generateSectionRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = []
    
    const nonCompliantFindings = findings.filter(f => f.status === 'NON_COMPLIANT')
    const partiallyCompliantFindings = findings.filter(f => f.status === 'PARTIALLY_COMPLIANT')

    if (nonCompliantFindings.length > 0) {
      recommendations.push(`Address ${nonCompliantFindings.length} non-compliant requirements immediately`)
    }

    if (partiallyCompliantFindings.length > 0) {
      recommendations.push(`Improve ${partiallyCompliantFindings.length} partially compliant areas`)
    }

    const highRiskFindings = findings.filter(f => f.risk === 'HIGH' && f.status !== 'COMPLIANT')
    if (highRiskFindings.length > 0) {
      recommendations.push('Prioritize high-risk compliance gaps')
    }

    return recommendations
  }

  private async saveComplianceAssessment(assessment: ComplianceAssessment): Promise<void> {
    try {
      await this.prisma.complianceReport.create({
        data: {
          projectId: assessment.projectId,
          standardType: assessment.standardType,
          overallScore: assessment.overallScore,
          generatedAt: assessment.assessmentDate,
          sections: JSON.stringify(assessment.sections),
          findings: JSON.stringify(assessment.sections.flatMap(s => s.findings)),
          nonCompliantItems: assessment.nonConformities.length,
          actionPlan: JSON.stringify(assessment.actionPlan)
        }
      })
    } catch (error) {
      logger.error('Error saving compliance assessment:', error)
    }
  }

  private calculateRPN(failureMode: any): number {
    const severity = failureMode.effects?.[0]?.severity || 0
    const occurrence = failureMode.causes?.[0]?.occurrence || 0
    const detection = failureMode.causes?.[0]?.controls?.[0]?.detection || 0
    
    return severity * occurrence * detection
  }
}

export default AutomotiveStandardsService