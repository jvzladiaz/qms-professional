import { BaseEntity, Status, Priority, Attachment, Comment } from './common'

export interface ProcessFlow extends BaseEntity {
  name: string
  description?: string
  version: string
  status: Status
  priority: Priority
  productLine?: string
  part?: Part
  steps: ProcessStep[]
  attachments: Attachment[]
  comments: Comment[]
  approvals: ProcessApproval[]
}

export interface ProcessStep extends BaseEntity {
  stepNumber: number
  name: string
  description?: string
  stepType: ProcessStepType
  duration?: number
  resources: Resource[]
  inputs: ProcessInput[]
  outputs: ProcessOutput[]
  controlPoints: ControlPoint[]
  position: Position
  connections: Connection[]
}

export enum ProcessStepType {
  OPERATION = 'OPERATION',
  INSPECTION = 'INSPECTION',
  TRANSPORT = 'TRANSPORT',
  DELAY = 'DELAY',
  STORAGE = 'STORAGE',
  DECISION = 'DECISION',
  START = 'START',
  END = 'END',
}

export interface Resource {
  id: string
  type: ResourceType
  name: string
  description?: string
  specification?: string
}

export enum ResourceType {
  MACHINE = 'MACHINE',
  TOOL = 'TOOL',
  OPERATOR = 'OPERATOR',
  MATERIAL = 'MATERIAL',
  EQUIPMENT = 'EQUIPMENT',
}

export interface ProcessInput {
  id: string
  name: string
  specification?: string
  source?: string
  required: boolean
}

export interface ProcessOutput {
  id: string
  name: string
  specification?: string
  destination?: string
  qualityRequirement?: string
}

export interface ControlPoint {
  id: string
  name: string
  type: ControlPointType
  specification: string
  method: string
  frequency: string
  responsibility: string
}

export enum ControlPointType {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  INFORMATIONAL = 'INFORMATIONAL',
}

export interface Position {
  x: number
  y: number
}

export interface Connection {
  id: string
  sourceStepId: string
  targetStepId: string
  condition?: string
  label?: string
}

export interface Part {
  id: string
  partNumber: string
  name: string
  description?: string
  customer?: string
  revision: string
  specifications: PartSpecification[]
}

export interface PartSpecification {
  id: string
  characteristic: string
  specification: string
  tolerance?: string
  unit?: string
}

export interface ProcessApproval extends BaseEntity {
  approverRole: string
  approvedBy?: string
  approvedAt?: Date
  status: ApprovalStatus
  comments?: string
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}