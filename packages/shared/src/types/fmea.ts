import { BaseEntity, Status, Priority, Attachment, Comment } from './common'

export interface FMEA extends BaseEntity {
  name: string
  description?: string
  type: FMEAType
  methodology: FMEAMethodology
  version: string
  status: Status
  priority: Priority
  productLine?: string
  part?: string
  process?: string
  team: FMEATeamMember[]
  failureModes: FailureMode[]
  attachments: Attachment[]
  comments: Comment[]
  completedAt?: Date
  reviewedAt?: Date
  reviewedBy?: string
}

export enum FMEAType {
  DESIGN = 'DESIGN',
  PROCESS = 'PROCESS',
  SYSTEM = 'SYSTEM',
}

export enum FMEAMethodology {
  AIAG_VDA = 'AIAG_VDA',
  AIAG_4TH = 'AIAG_4TH',
  IEC_60812 = 'IEC_60812',
}

export interface FMEATeamMember {
  id: string
  userId: string
  role: FMEARole
  responsibility: string
  assignedAt: Date
}

export enum FMEARole {
  TEAM_LEADER = 'TEAM_LEADER',
  DESIGN_ENGINEER = 'DESIGN_ENGINEER',
  PROCESS_ENGINEER = 'PROCESS_ENGINEER',
  QUALITY_ENGINEER = 'QUALITY_ENGINEER',
  SUPPLIER_REPRESENTATIVE = 'SUPPLIER_REPRESENTATIVE',
  CUSTOMER_REPRESENTATIVE = 'CUSTOMER_REPRESENTATIVE',
}

export interface FailureMode extends BaseEntity {
  fmeaId: string
  item: string
  function: string
  functionalRequirement: string
  failureMode: string
  effectsLocal: string
  effectsHigher: string
  effectsEnd: string
  cause: string
  currentControls: CurrentControls
  ratings: FMEARatings
  actions: RecommendedAction[]
  riskAssessment: RiskAssessment
}

export interface CurrentControls {
  prevention: string
  detection: string
  preventionType: ControlType
  detectionType: ControlType
}

export enum ControlType {
  DESIGN = 'DESIGN',
  PROCESS = 'PROCESS',
  INSPECTION = 'INSPECTION',
  TEST = 'TEST',
  VALIDATION = 'VALIDATION',
  NONE = 'NONE',
}

export interface FMEARatings {
  severity: number
  occurrence: number
  detection: number
  rpn: number
  ap?: ActionPriority
}

export enum ActionPriority {
  H = 'H',
  M = 'M',
  L = 'L',
}

export interface RecommendedAction extends BaseEntity {
  description: string
  responsibility: string
  targetDate: Date
  status: ActionStatus
  completedDate?: Date
  verification?: string
  effectivenesss?: ActionEffectiveness
  revisedRatings?: FMEARatings
}

export enum ActionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED',
}

export enum ActionEffectiveness {
  VERY_EFFECTIVE = 'VERY_EFFECTIVE',
  EFFECTIVE = 'EFFECTIVE',
  PARTIALLY_EFFECTIVE = 'PARTIALLY_EFFECTIVE',
  NOT_EFFECTIVE = 'NOT_EFFECTIVE',
}

export interface RiskAssessment {
  riskLevel: RiskLevel
  riskCategory: RiskCategory
  acceptability: RiskAcceptability
  justification?: string
}

export enum RiskLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum RiskCategory {
  SAFETY = 'SAFETY',
  REGULATORY = 'REGULATORY',
  CUSTOMER_SATISFACTION = 'CUSTOMER_SATISFACTION',
  OPERATIONAL = 'OPERATIONAL',
}

export enum RiskAcceptability {
  ACCEPTABLE = 'ACCEPTABLE',
  ACCEPTABLE_WITH_ACTIONS = 'ACCEPTABLE_WITH_ACTIONS',
  NOT_ACCEPTABLE = 'NOT_ACCEPTABLE',
}