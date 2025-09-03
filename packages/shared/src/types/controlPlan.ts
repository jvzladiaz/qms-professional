import { BaseEntity, Status, Priority, Attachment, Comment } from './common'

export interface ControlPlan extends BaseEntity {
  name: string
  description?: string
  version: string
  status: Status
  priority: Priority
  productLine?: string
  part?: string
  process?: string
  planType: ControlPlanType
  controlPoints: ControlPlanPoint[]
  attachments: Attachment[]
  comments: Comment[]
  approvals: ControlPlanApproval[]
  effectiveDate?: Date
  reviewDate?: Date
}

export enum ControlPlanType {
  PROTOTYPE = 'PROTOTYPE',
  PRE_LAUNCH = 'PRE_LAUNCH',
  PRODUCTION = 'PRODUCTION',
}

export interface ControlPlanPoint extends BaseEntity {
  controlPlanId: string
  sequenceNumber: number
  processStep: string
  characteristic: string
  specification: Specification
  controlMethod: ControlMethod
  sampleSize: SampleSize
  frequency: Frequency
  responsibleRole: string
  reactionPlan: ReactionPlan
  statisticalMethod?: StatisticalMethod
}

export interface Specification {
  nominal?: number
  lowerLimit?: number
  upperLimit?: number
  unit?: string
  type: SpecificationType
  toleranceType?: ToleranceType
}

export enum SpecificationType {
  VARIABLE = 'VARIABLE',
  ATTRIBUTE = 'ATTRIBUTE',
  VISUAL = 'VISUAL',
}

export enum ToleranceType {
  BILATERAL = 'BILATERAL',
  UNILATERAL_UPPER = 'UNILATERAL_UPPER',
  UNILATERAL_LOWER = 'UNILATERAL_LOWER',
}

export interface ControlMethod {
  type: ControlMethodType
  description: string
  equipment?: string
  procedure?: string
  standardWork?: string
  trainingRequired?: boolean
}

export enum ControlMethodType {
  SPC = 'SPC',
  INSPECTION = 'INSPECTION',
  FUNCTIONAL_TEST = 'FUNCTIONAL_TEST',
  VISUAL_INSPECTION = 'VISUAL_INSPECTION',
  MEASUREMENT = 'MEASUREMENT',
  GO_NO_GO = 'GO_NO_GO',
  ATTRIBUTE_CHECK = 'ATTRIBUTE_CHECK',
}

export interface SampleSize {
  size: number
  frequency: string
  rationale?: string
  isSubgrouped?: boolean
  subgroupSize?: number
}

export interface Frequency {
  interval: string
  type: FrequencyType
  schedule?: string
}

export enum FrequencyType {
  CONTINUOUS = 'CONTINUOUS',
  PERIODIC = 'PERIODIC',
  BATCH = 'BATCH',
  LOT = 'LOT',
  SHIFT = 'SHIFT',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  SETUP = 'SETUP',
}

export interface ReactionPlan {
  outOfSpec: OutOfSpecAction
  trend: TrendAction
  processOut: ProcessOutAction
  escalation: EscalationAction
}

export interface OutOfSpecAction {
  immediateAction: string
  containmentAction: string
  correctionAction: string
  responsibleRole: string
}

export interface TrendAction {
  triggerCriteria: string
  action: string
  responsibleRole: string
}

export interface ProcessOutAction {
  triggerCriteria: string
  action: string
  responsibleRole: string
}

export interface EscalationAction {
  criteria: string
  escalationLevel: string
  responsibleRole: string
  timeframe: string
}

export interface StatisticalMethod {
  type: StatisticalMethodType
  controlLimits?: ControlLimits
  cpkRequirement?: number
  ppkRequirement?: number
}

export enum StatisticalMethodType {
  XBAR_R = 'XBAR_R',
  XBAR_S = 'XBAR_S',
  X_MR = 'X_MR',
  P_CHART = 'P_CHART',
  NP_CHART = 'NP_CHART',
  C_CHART = 'C_CHART',
  U_CHART = 'U_CHART',
}

export interface ControlLimits {
  upperControlLimit: number
  lowerControlLimit: number
  upperSpecLimit?: number
  lowerSpecLimit?: number
  target?: number
}

export interface ControlPlanApproval extends BaseEntity {
  approverRole: string
  approvedBy?: string
  approvedAt?: Date
  status: ControlPlanApprovalStatus
  comments?: string
}

export enum ControlPlanApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}