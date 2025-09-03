// FMEA Types for Frontend

export enum FmeaType {
  PROCESS = 'PROCESS',
  DESIGN = 'DESIGN',
  SYSTEM = 'SYSTEM'
}

export enum FmeaStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ControlType {
  PREVENTION = 'PREVENTION',
  DETECTION = 'DETECTION'
}

export enum ActionType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE',
  IMPROVEMENT = 'IMPROVEMENT'
}

export enum ActionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ActionItemStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD'
}

export interface Fmea {
  id: string
  projectId?: string
  processFlowId?: string
  partId?: string
  fmeaNumber: string
  title: string
  description?: string
  fmeaType: FmeaType
  revision: string
  status: FmeaStatus
  severityThreshold: number
  occurrenceThreshold: number
  detectionThreshold: number
  rpnThreshold: number
  analysisDate: string
  dueDate?: string
  teamLeaderId?: string
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string

  // Relations
  project?: {
    id: string
    name: string
    projectCode: string
    customer?: string
  }
  processFlow?: {
    id: string
    name: string
    version: string
    processType?: string
    processSteps?: ProcessStepSummary[]
  }
  part?: {
    id: string
    partNumber: string
    name: string
    revision: string
    description?: string
  }
  createdBy: UserSummary
  updatedBy: UserSummary
  teamLeader?: UserSummary
  teamMembers?: FmeaTeamMember[]
  failureModes?: FailureMode[]
  metrics?: FmeaMetrics
}

export interface UserSummary {
  id: string
  firstName: string
  lastName: string
  email: string
  department?: string
  role?: string
}

export interface ProcessStepSummary {
  id: string
  stepNumber: number
  name: string
  stepType: string
  description?: string
}

export interface FmeaTeamMember {
  id: string
  fmeaId: string
  userId: string
  role: string
  expertiseArea?: string
  responsibilities?: string
  addedAt: string
  user: UserSummary
}

export interface FailureMode {
  id: string
  fmeaId: string
  itemFunction: string
  failureMode: string
  sequenceNumber: number
  severityRating: number
  severityJustification?: string
  primaryProcessStepId?: string
  failureClassification: string
  specialCharacteristic: boolean
  createdAt: string
  updatedAt: string

  // Relations
  primaryProcessStep?: ProcessStepSummary
  effects: FailureEffect[]
  causes: FailureCause[]
  actionItems: FmeaActionItem[]
  processStepLinks: ProcessStepFailureMode[]

  // Calculated fields
  currentRpn?: number
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requiresAction?: boolean
  rpnBreakdown?: {
    severity: number
    occurrence: number
    detection: number
  }
}

export interface FailureEffect {
  id: string
  failureModeId: string
  effectDescription: string
  effectType: string
  customerImpact?: string
  safetyImpact: boolean
  regulatoryImpact: boolean
  warrantyImpact: boolean
  sequenceNumber: number
  createdAt: string
  updatedAt: string
}

export interface FailureCause {
  id: string
  failureModeId: string
  causeDescription: string
  causeCategory: string
  occurrenceRating: number
  occurrenceJustification?: string
  isRootCause: boolean
  causeMechanism?: string
  sequenceNumber: number
  createdAt: string
  updatedAt: string
  controls: FailureControl[]
}

export interface FailureControl {
  id: string
  failureCauseId: string
  controlDescription: string
  controlType: ControlType
  controlMethod?: string
  detectionRating: number
  detectionJustification?: string
  validationMethod?: string
  responsibility?: string
  frequency?: string
  sampleSize?: number
  processStepId?: string
  controlPointId?: string
  sequenceNumber: number
  createdAt: string
  updatedAt: string

  // Relations
  processStep?: ProcessStepSummary
  controlPoint?: {
    id: string
    name: string
    controlType: string
    specification: string
  }
}

export interface FmeaActionItem {
  id: string
  failureModeId: string
  actionDescription: string
  actionType: ActionType
  priority: ActionPriority
  assignedToId?: string
  assignedDepartment?: string
  targetDate?: string
  completedDate?: string
  status: ActionItemStatus
  estimatedCost?: number
  actualCost?: number
  estimatedHours?: number
  actualHours?: number
  completionNotes?: string
  verificationMethod?: string
  verificationDate?: string
  verifiedById?: string
  targetSeverity?: number
  targetOccurrence?: number
  targetDetection?: number
  targetRpn?: number
  actualSeverity?: number
  actualOccurrence?: number
  actualDetection?: number
  actualRpn?: number
  createdAt: string
  updatedAt: string

  // Relations
  failureMode?: {
    id: string
    itemFunction: string
    failureMode: string
    fmea: {
      id: string
      fmeaNumber: string
      title: string
    }
  }
  assignedTo?: UserSummary
  verifiedBy?: UserSummary

  // Calculated fields
  isOverdue?: boolean
  daysOverdue?: number
  rpnImprovement?: number
}

export interface ProcessStepFailureMode {
  id: string
  processStepId: string
  failureModeId: string
  relationshipType: string
  impactLevel: string
  notes?: string
  createdAt: string

  // Relations
  processStep: ProcessStepSummary
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

export interface FmeaValidation {
  isComplete: boolean
  missingFields: string[]
  recommendations: string[]
}

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

// Rating Scale Reference Types
export interface SeverityRatingScale {
  rating: number
  description: string
  criteria: string
  examples?: string
  automotiveStandard: string
}

export interface OccurrenceRatingScale {
  rating: number
  description: string
  probabilityCriteria: string
  failureRates: string
  automotiveStandard: string
}

export interface DetectionRatingScale {
  rating: number
  description: string
  detectionCriteria: string
  controlTypes: string
  automotiveStandard: string
}

// Form Interfaces
export interface CreateFmeaForm {
  projectId?: string
  processFlowId?: string
  partId?: string
  fmeaNumber: string
  title: string
  description?: string
  fmeaType: FmeaType
  revision?: string
  severityThreshold?: number
  occurrenceThreshold?: number
  detectionThreshold?: number
  rpnThreshold?: number
  analysisDate?: string
  dueDate?: string
  teamLeaderId?: string
}

export interface CreateFailureModeForm {
  fmeaId: string
  itemFunction: string
  failureMode: string
  sequenceNumber?: number
  severityRating: number
  severityJustification?: string
  primaryProcessStepId?: string
  failureClassification?: string
  specialCharacteristic?: boolean
}

export interface CreateFailureEffectForm {
  failureModeId: string
  effectDescription: string
  effectType?: string
  customerImpact?: string
  safetyImpact?: boolean
  regulatoryImpact?: boolean
  warrantyImpact?: boolean
  sequenceNumber?: number
}

export interface CreateFailureCauseForm {
  failureModeId: string
  causeDescription: string
  causeCategory?: string
  occurrenceRating: number
  occurrenceJustification?: string
  isRootCause?: boolean
  causeMechanism?: string
  sequenceNumber?: number
}

export interface CreateFailureControlForm {
  failureCauseId: string
  controlDescription: string
  controlType: ControlType
  controlMethod?: string
  detectionRating: number
  detectionJustification?: string
  validationMethod?: string
  responsibility?: string
  frequency?: string
  sampleSize?: number
  processStepId?: string
  controlPointId?: string
  sequenceNumber?: number
}

export interface CreateActionItemForm {
  failureModeId: string
  actionDescription: string
  actionType?: ActionType
  priority?: ActionPriority
  assignedToId?: string
  assignedDepartment?: string
  targetDate?: string
  estimatedCost?: number
  estimatedHours?: number
  targetSeverity?: number
  targetOccurrence?: number
  targetDetection?: number
}

// Constants
export const CAUSE_CATEGORIES = [
  'MACHINE',
  'METHOD', 
  'MATERIAL',
  'MANPOWER',
  'MEASUREMENT',
  'ENVIRONMENT',
  'OTHER'
] as const

export const EFFECT_TYPES = [
  'LOCAL',
  'NEXT_LEVEL', 
  'END_USER'
] as const

export const CONTROL_METHODS = [
  'SPC',
  'INSPECTION',
  'POKA_YOKE',
  'FIXTURE',
  'CHECKLIST',
  'CALIBRATION',
  'OPERATOR_TRAINING',
  'PREVENTIVE_MAINTENANCE',
  'OTHER'
] as const

export const RELATIONSHIP_TYPES = [
  'AFFECTS',
  'CONTROLS', 
  'MONITORS'
] as const

export const IMPACT_LEVELS = [
  'LOW',
  'MEDIUM',
  'HIGH', 
  'CRITICAL'
] as const

export const RPN_RISK_LEVELS = {
  LOW: { min: 1, max: 49, color: '#4CAF50', label: 'Low Risk' },
  MEDIUM: { min: 50, max: 99, color: '#FF9800', label: 'Medium Risk' },
  HIGH: { min: 100, max: 299, color: '#F44336', label: 'High Risk' },
  CRITICAL: { min: 300, max: 1000, color: '#9C27B0', label: 'Critical Risk' }
} as const

export type CauseCategory = typeof CAUSE_CATEGORIES[number]
export type EffectType = typeof EFFECT_TYPES[number]
export type ControlMethod = typeof CONTROL_METHODS[number]
export type RelationshipType = typeof RELATIONSHIP_TYPES[number]
export type ImpactLevel = typeof IMPACT_LEVELS[number]