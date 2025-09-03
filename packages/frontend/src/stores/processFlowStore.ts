import { create } from 'zustand'
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow'
import type { NodeChange, EdgeChange } from 'reactflow'
import {
  ProcessFlow,
  ProcessStepNode,
  ProcessStepNodeData,
  Swimlane,
  StepConnection,
  ProcessStep,
  ToolType,
  ProcessStepType,
  PROCESS_STEP_CONFIGS,
} from '../types/processFlow'

interface ProcessFlowStore {
  // State
  processFlow: ProcessFlow | null
  nodes: ProcessStepNode[]
  edges: Edge[]
  swimlanes: Swimlane[]
  selectedTool: ToolType
  selectedNode: ProcessStepNode | null
  selectedEdge: Edge | null
  isDirty: boolean
  isLoading: boolean
  error: string | null
  reactFlowInstance: any

  // Actions
  setProcessFlow: (processFlow: ProcessFlow | null) => void
  setNodes: (nodes: ProcessStepNode[]) => void
  setEdges: (edges: Edge[]) => void
  setSwimlanes: (swimlanes: Swimlane[]) => void
  setSelectedTool: (tool: ToolType) => void
  setSelectedNode: (node: ProcessStepNode | null) => void
  setSelectedEdge: (edge: Edge | null) => void
  setReactFlowInstance: (instance: any) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setDirty: (dirty: boolean) => void

  // React Flow handlers
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onNodeClick: (event: React.MouseEvent, node: ProcessStepNode) => void
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void
  onPaneClick: (event: React.MouseEvent) => void

  // Node operations
  addNode: (type: ProcessStepType, position: { x: number; y: number }) => void
  updateNode: (nodeId: string, data: Partial<ProcessStepNodeData>) => void
  deleteNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void

  // Edge operations
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void
  deleteEdge: (edgeId: string) => void

  // Data operations
  loadFromProcessFlow: (processFlow: ProcessFlow) => void
  getNextStepNumber: () => number
  resetStore: () => void
}

const useProcessFlowStore = create<ProcessFlowStore>((set, get) => ({
  // Initial state
  processFlow: null,
  nodes: [],
  edges: [],
  swimlanes: [],
  selectedTool: ToolType.SELECT,
  selectedNode: null,
  selectedEdge: null,
  isDirty: false,
  isLoading: false,
  error: null,
  reactFlowInstance: null,

  // State setters
  setProcessFlow: (processFlow) => set({ processFlow }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSwimlanes: (swimlanes) => set({ swimlanes }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge }),
  setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setDirty: (dirty) => set({ isDirty: dirty }),

  // React Flow event handlers
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: true,
    }))
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    }))
  },

  onConnect: (connection) => {
    const { nodes, edges } = get()
    
    // Find source and target nodes
    const sourceNode = nodes.find(node => node.id === connection.source)
    const targetNode = nodes.find(node => node.id === connection.target)
    
    if (!sourceNode || !targetNode) return

    const newEdge: Edge = {
      id: `${connection.source}-${connection.target}`,
      source: connection.source!,
      target: connection.target!,
      type: 'default',
      animated: false,
      style: {
        stroke: '#000000',
        strokeWidth: 2,
      },
      data: {
        connectionType: 'default',
        label: '',
      },
    }

    set((state) => ({
      edges: addEdge(newEdge, state.edges),
      isDirty: true,
    }))
  },

  onNodeClick: (event, node) => {
    event.stopPropagation()
    const { selectedTool } = get()
    
    if (selectedTool === ToolType.DELETE) {
      get().deleteNode(node.id)
    } else {
      set({ selectedNode: node, selectedEdge: null })
    }
  },

  onEdgeClick: (event, edge) => {
    event.stopPropagation()
    const { selectedTool } = get()
    
    if (selectedTool === ToolType.DELETE) {
      get().deleteEdge(edge.id)
    } else {
      set({ selectedEdge: edge, selectedNode: null })
    }
  },

  onPaneClick: (event) => {
    const { selectedTool, reactFlowInstance } = get()
    
    // Clear selections
    set({ selectedNode: null, selectedEdge: null })
    
    // If a step tool is selected, create a new node
    if (selectedTool !== ToolType.SELECT && selectedTool !== ToolType.CONNECT && selectedTool !== ToolType.DELETE) {
      if (reactFlowInstance) {
        const position = reactFlowInstance.project({
          x: event.clientX - 200, // Offset for sidebar
          y: event.clientY - 100, // Offset for header
        })
        
        get().addNode(selectedTool as ProcessStepType, position)
      }
    }
  },

  // Node operations
  addNode: (type, position) => {
    const { nodes, swimlanes, getNextStepNumber } = get()
    const stepNumber = getNextStepNumber()
    const config = PROCESS_STEP_CONFIGS[type]
    
    // Assign to first available swimlane or create default
    let swimlaneId = 'default-swimlane'
    if (swimlanes.length > 0) {
      swimlaneId = swimlanes[0].id
    }
    
    const newNode: ProcessStepNode = {
      id: `step-${Date.now()}`,
      type: 'processStep',
      position,
      data: {
        id: `step-${Date.now()}`,
        stepNumber,
        name: `${type.charAt(0)}${type.slice(1).toLowerCase()} ${stepNumber}`,
        stepType: type,
        swimlaneId,
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
      },
      draggable: true,
      selectable: true,
    }

    set((state) => {
      // Ensure we have at least one swimlane
      let updatedSwimlanes = state.swimlanes
      if (updatedSwimlanes.length === 0) {
        updatedSwimlanes = [{
          id: 'default-swimlane',
          name: 'Default Process',
          color: '#1976D2',
          positionOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }
      
      return {
        nodes: [...state.nodes, newNode],
        swimlanes: updatedSwimlanes,
        selectedNode: newNode,
        isDirty: true,
      }
    })
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      nodes: state.nodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      ),
      isDirty: true,
    }))
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter(node => node.id !== nodeId),
      edges: state.edges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
      isDirty: true,
    }))
  },

  duplicateNode: (nodeId) => {
    const { nodes } = get()
    const nodeToDuplicate = nodes.find(node => node.id === nodeId)
    
    if (!nodeToDuplicate) return

    const newNode: ProcessStepNode = {
      ...nodeToDuplicate,
      id: `step-${Date.now()}`,
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50,
      },
      data: {
        ...nodeToDuplicate.data,
        id: `step-${Date.now()}`,
        stepNumber: get().getNextStepNumber(),
        name: `${nodeToDuplicate.data.name} (Copy)`,
      },
    }

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNode: newNode,
      isDirty: true,
    }))
  },

  // Edge operations
  updateEdge: (edgeId, updates) => {
    set((state) => ({
      edges: state.edges.map(edge => 
        edge.id === edgeId ? { ...edge, ...updates } : edge
      ),
      isDirty: true,
    }))
  },

  deleteEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter(edge => edge.id !== edgeId),
      selectedEdge: state.selectedEdge?.id === edgeId ? null : state.selectedEdge,
      isDirty: true,
    }))
  },

  // Data operations
  loadFromProcessFlow: (processFlow) => {
    const nodes: ProcessStepNode[] = (processFlow.processSteps || []).map(step => ({
      id: step.id,
      type: 'processStep',
      position: { x: step.positionX, y: step.positionY },
      data: {
        id: step.id,
        stepNumber: step.stepNumber,
        name: step.name,
        description: step.description,
        stepType: step.stepType,
        operationTime: step.operationTime,
        setupTime: step.setupTime,
        waitTime: step.waitTime,
        transportTime: step.transportTime,
        swimlaneId: step.swimlaneId,
        backgroundColor: step.backgroundColor,
        borderColor: step.borderColor,
        qualityRequirements: step.qualityRequirements,
        safetyRequirements: step.safetyRequirements,
        environmentalRequirements: step.environmentalRequirements,
        resources: step.resources,
        controlPoints: step.controlPoints,
        inputs: step.inputs,
        outputs: step.outputs,
      },
      draggable: true,
      selectable: true,
    }))

    const edges: Edge[] = (processFlow.stepConnections || []).map(connection => ({
      id: connection.id,
      source: connection.sourceStepId,
      target: connection.targetStepId,
      type: connection.connectionType === 'conditional' ? 'step' : 'default',
      animated: connection.animated,
      style: {
        stroke: connection.strokeColor,
        strokeWidth: connection.strokeWidth,
        strokeDasharray: connection.strokeStyle === 'dashed' ? '5,5' : 
                         connection.strokeStyle === 'dotted' ? '2,2' : 'none',
      },
      label: connection.label,
      data: {
        connectionType: connection.connectionType,
        conditionText: connection.conditionText,
      },
    }))

    // Create default swimlanes if none exist
    let swimlanes: Swimlane[] = []
    if (processFlow.processSteps && processFlow.processSteps.length > 0) {
      // Extract unique swimlane info from process steps
      const swimlaneMap = new Map<string, Swimlane>()
      
      processFlow.processSteps.forEach(step => {
        if (step.swimlane && !swimlaneMap.has(step.swimlane.id)) {
          swimlaneMap.set(step.swimlane.id, {
            id: step.swimlane.id,
            name: step.swimlane.name,
            color: step.swimlane.color,
            department: step.swimlane.department,
            positionOrder: swimlaneMap.size,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      })
      
      swimlanes = Array.from(swimlaneMap.values())
      
      // If no swimlanes found, create a default one
      if (swimlanes.length === 0) {
        swimlanes = [{
          id: 'default-swimlane',
          name: 'Default Process',
          color: '#1976D2',
          positionOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }
    }

    set({
      processFlow,
      nodes,
      edges,
      swimlanes,
      isDirty: false,
      selectedNode: null,
      selectedEdge: null,
    })
  },

  getNextStepNumber: () => {
    const { nodes } = get()
    const stepNumbers = nodes.map(node => node.data.stepNumber).filter(Boolean)
    return stepNumbers.length === 0 ? 10 : Math.max(...stepNumbers) + 10
  },

  resetStore: () => {
    set({
      processFlow: null,
      nodes: [],
      edges: [],
      swimlanes: [],
      selectedTool: ToolType.SELECT,
      selectedNode: null,
      selectedEdge: null,
      isDirty: false,
      isLoading: false,
      error: null,
      reactFlowInstance: null,
    })
  },
}))

export default useProcessFlowStore