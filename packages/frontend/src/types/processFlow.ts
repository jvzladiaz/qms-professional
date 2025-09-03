import { Node, Edge } from 'reactflow'

// Process Step Types matching backend enums
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

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum Status {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// Custom Node Data Interface
export interface ProcessStepNodeData {
  id: string
  stepNumber: number
  name: string
  description?: string
  stepType: ProcessStepType
  operationTime?: number
  setupTime?: number
  waitTime?: number
  transportTime?: number
  swimlaneId?: string
  backgroundColor?: string
  borderColor?: string
  qualityRequirements?: string
  safetyRequirements?: string
  environmentalRequirements?: string
  resources?: ProcessStepResource[]
  controlPoints?: ControlPoint[]
  inputs?: ProcessInput[]
  outputs?: ProcessOutput[]
}

// React Flow Node type for Process Steps
export type ProcessStepNode = Node<ProcessStepNodeData>

// Swimlane Interface
export interface Swimlane {
  id: string
  name: string
  description?: string
  department?: string
  responsibleRole?: string
  color: string
  positionOrder: number
  createdAt: string
  updatedAt: string
}

// Process Flow Interface
export interface ProcessFlow {
  id: string
  projectId?: string
  partId?: string
  name: string
  description?: string
  version: string
  status: Status
  priority: Priority
  processType?: string
  estimatedCycleTime?: number
  taktTime?: number
  canvasSettings?: CanvasSettings
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    name: string
    projectCode: string
    customer?: string
  }
  part?: {
    id: string
    partNumber: string
    name: string
    revision: string
  }
  createdBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  updatedBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  processSteps?: ProcessStep[]
  stepConnections?: StepConnection[]
  _count?: {
    processSteps: number
    stepConnections: number
  }
}

// Process Step Interface
export interface ProcessStep {
  id: string
  processFlowId: string
  swimlaneId?: string
  stepNumber: number
  name: string
  description?: string
  stepType: ProcessStepType
  operationTime?: number
  setupTime?: number
  waitTime?: number
  transportTime?: number
  positionX: number
  positionY: number
  width?: number
  height?: number
  backgroundColor?: string
  borderColor?: string
  qualityRequirements?: string
  safetyRequirements?: string
  environmentalRequirements?: string
  createdAt: string
  updatedAt: string
  swimlane?: {
    id: string
    name: string
    color: string
    department?: string
  }
  resources?: ProcessStepResource[]
  controlPoints?: ControlPoint[]
  inputs?: ProcessInput[]
  outputs?: ProcessOutput[]
}

// Step Connection Interface
export interface StepConnection {
  id: string
  processFlowId: string
  sourceStepId: string
  targetStepId: string
  connectionType: string
  conditionText?: string
  label?: string
  strokeColor: string
  strokeWidth: number
  strokeStyle: string
  animated: boolean
  createdAt: string
  sourceStep?: {
    id: string
    name: string
    stepNumber: number
    stepType: ProcessStepType
  }
  targetStep?: {
    id: string
    name: string
    stepNumber: number
    stepType: ProcessStepType
  }
}

// Resource Interfaces
export interface ProcessStepResource {
  id: string
  processStepId: string
  resourceId: string
  quantityRequired: number
  utilizationPercentage: number
  setupRequired: boolean
  notes?: string
  resource: {
    id: string
    name: string
    resourceType: string
    specification?: string
    hourlyRate?: number
  }
}

export interface ControlPoint {
  id: string
  processStepId: string
  name: string
  controlType: string
  specification: string
  measurementMethod?: string
  inspectionFrequency?: string
  sampleSize?: number
  upperSpecLimit?: number
  lowerSpecLimit?: number
  targetValue?: number
  unit?: string
  responsibleRole?: string
  reactionPlan?: string
}

export interface ProcessInput {
  id: string
  processStepId: string
  name: string
  description?: string
  specification?: string
  sourceLocation?: string
  quantityRequired?: number
  unit?: string
  isCritical: boolean
  supplier?: string
  partNumber?: string
}

export interface ProcessOutput {
  id: string
  processStepId: string
  name: string
  description?: string
  specification?: string
  destinationLocation?: string
  quantityProduced?: number
  unit?: string
  qualityCharacteristic?: string
  acceptanceCriteria?: string
}

// Canvas Settings Interface
export interface CanvasSettings {
  zoom?: number
  panX?: number
  panY?: number
  gridSize?: number
  snapToGrid?: boolean
  showGrid?: boolean
  showMinimap?: boolean
  theme?: 'light' | 'dark'
}

// Process Flow Editor State
export interface ProcessFlowEditorState {
  processFlow: ProcessFlow | null
  nodes: ProcessStepNode[]
  edges: Edge[]
  swimlanes: Swimlane[]
  selectedNode: ProcessStepNode | null
  selectedEdge: Edge | null
  isDirty: boolean
  isLoading: boolean
  error: string | null
}

// Toolbar Tool Types
export enum ToolType {
  SELECT = 'select',
  OPERATION = 'operation',
  INSPECTION = 'inspection',
  TRANSPORT = 'transport',
  DELAY = 'delay',
  STORAGE = 'storage',
  DECISION = 'decision',
  START = 'start',
  END = 'end',
  CONNECT = 'connect',
  DELETE = 'delete',
}

// Process Step Style Configuration
export interface ProcessStepStyle {
  backgroundColor: string
  borderColor: string
  textColor: string
  icon: string
  shape: 'rectangle' | 'circle' | 'diamond' | 'triangle'
  borderWidth: number
  borderStyle: 'solid' | 'dashed' | 'dotted'
}

// Process Step Type Configurations
export const PROCESS_STEP_CONFIGS: Record<ProcessStepType, ProcessStepStyle> = {
  [ProcessStepType.OPERATION]: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    textColor: '#1976D2',
    icon: 'settings',
    shape: 'rectangle',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  [ProcessStepType.INSPECTION]: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    textColor: '#2E7D32',
    icon: 'search',
    shape: 'rectangle',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  [ProcessStepType.TRANSPORT]: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    textColor: '#E65100',
    icon: 'local_shipping',
    shape: 'rectangle',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  [ProcessStepType.DELAY]: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    textColor: '#C62828',
    icon: 'schedule',
    shape: 'rectangle',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  [ProcessStepType.STORAGE]: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
    textColor: '#7B1FA2',
    icon: 'inventory',
    shape: 'triangle',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  [ProcessStepType.DECISION]: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFC107',
    textColor: '#F57F17',
    icon: 'help',
    shape: 'diamond',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  [ProcessStepType.START]: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    textColor: '#2E7D32',
    icon: 'play_arrow',
    shape: 'circle',
    borderWidth: 3,
    borderStyle: 'solid',
  },
  [ProcessStepType.END]: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    textColor: '#C62828',
    icon: 'stop',
    shape: 'circle',
    borderWidth: 3,
    borderStyle: 'solid',
  },
}