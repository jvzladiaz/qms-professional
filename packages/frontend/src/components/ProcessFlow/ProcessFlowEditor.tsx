import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import { Box, useTheme } from '@mui/material'
import { styled } from '@mui/material/styles'

// Import custom components
import ProcessStepNode from './ProcessStepNode'
import ProcessFlowToolbar from './ProcessFlowToolbar'
import SwimlaneContainer from './SwimlaneContainer'
import NodePropertyEditor from './NodePropertyEditor'
import ProcessFlowWelcome from './ProcessFlowWelcome'
import useProcessFlowStore from '../../stores/processFlowStore'
import { ProcessFlow } from '../../types/processFlow'

// Import React Flow styles
import 'reactflow/dist/style.css'

const EditorContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '600px',
  position: 'relative',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}))

// Custom node types
const nodeTypes = {
  processStep: ProcessStepNode,
}

// Custom edge types (can be expanded later)
const edgeTypes = {}

interface ProcessFlowEditorInternalProps {
  processFlow?: ProcessFlow
  onSave?: (data: { nodes: any[]; edges: any[] }) => void
  readOnly?: boolean
}

const ProcessFlowEditorInternal = ({
  processFlow,
  onSave,
  readOnly = false,
}: ProcessFlowEditorInternalProps) => {
  const theme = useTheme()
  const reactFlowInstance = useReactFlow()
  
  const {
    nodes,
    edges,
    swimlanes,
    isDirty,
    selectedNode,
    selectedEdge,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    setReactFlowInstance,
    setSelectedNode,
    loadFromProcessFlow,
  } = useProcessFlowStore()

  // Set React Flow instance when it's ready
  useEffect(() => {
    if (reactFlowInstance) {
      setReactFlowInstance(reactFlowInstance)
    }
  }, [reactFlowInstance, setReactFlowInstance])

  // Load process flow data
  useEffect(() => {
    if (processFlow) {
      loadFromProcessFlow(processFlow)
    }
  }, [processFlow, loadFromProcessFlow])

  // Calculate swimlane bounds based on nodes
  const swimlaneBounds = useMemo(() => {
    const bounds: Record<string, { x: number; y: number; width: number; height: number }> = {}
    
    swimlanes.forEach(swimlane => {
      const swimlaneNodes = nodes.filter(node => node.data.swimlaneId === swimlane.id)
      
      if (swimlaneNodes.length === 0) {
        // Default bounds if no nodes
        bounds[swimlane.id] = {
          x: 50,
          y: 50 + (swimlane.positionOrder * 200),
          width: 800,
          height: 150,
        }
      } else {
        // Calculate bounds based on node positions
        const positions = swimlaneNodes.map(node => ({
          x: node.position.x,
          y: node.position.y,
          right: node.position.x + 200, // Default node width
          bottom: node.position.y + 100, // Default node height
        }))
        
        const minX = Math.min(...positions.map(p => p.x)) - 50
        const minY = Math.min(...positions.map(p => p.y)) - 80
        const maxRight = Math.max(...positions.map(p => p.right)) + 50
        const maxBottom = Math.max(...positions.map(p => p.bottom)) + 50
        
        bounds[swimlane.id] = {
          x: minX,
          y: minY,
          width: Math.max(maxRight - minX, 300),
          height: Math.max(maxBottom - minY, 150),
        }
      }
    })
    
    return bounds
  }, [nodes, swimlanes])

  // Handle save operation
  const handleSave = useCallback(() => {
    if (onSave && isDirty) {
      const nodeData = nodes.map(node => ({
        id: node.id,
        stepNumber: node.data.stepNumber,
        name: node.data.name,
        description: node.data.description,
        stepType: node.data.stepType,
        positionX: node.position.x,
        positionY: node.position.y,
        swimlaneId: node.data.swimlaneId,
        operationTime: node.data.operationTime,
        setupTime: node.data.setupTime,
        waitTime: node.data.waitTime,
        transportTime: node.data.transportTime,
        backgroundColor: node.data.backgroundColor,
        borderColor: node.data.borderColor,
        qualityRequirements: node.data.qualityRequirements,
        safetyRequirements: node.data.safetyRequirements,
        environmentalRequirements: node.data.environmentalRequirements,
      }))
      
      const edgeData = edges.map(edge => ({
        id: edge.id,
        sourceStepId: edge.source,
        targetStepId: edge.target,
        connectionType: edge.data?.connectionType || 'default',
        conditionText: edge.data?.conditionText,
        label: edge.label,
        strokeColor: edge.style?.stroke || '#000000',
        strokeWidth: edge.style?.strokeWidth || 2,
        strokeStyle: edge.style?.strokeDasharray ? 'dashed' : 'solid',
        animated: edge.animated || false,
      }))
      
      onSave({ nodes: nodeData, edges: edgeData })
    }
  }, [onSave, isDirty, nodes, edges])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn()
  }, [reactFlowInstance])

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut()
  }, [reactFlowInstance])

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2 })
  }, [reactFlowInstance])

  // TODO: Implement undo/redo functionality
  const handleUndo = useCallback(() => {
    console.log('Undo functionality to be implemented')
  }, [])

  const handleRedo = useCallback(() => {
    console.log('Redo functionality to be implemented')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (readOnly) return
      
      // Prevent default shortcuts when editing
      if (event.target && (event.target as HTMLElement).tagName === 'INPUT') return
      if (event.target && (event.target as HTMLElement).tagName === 'TEXTAREA') return
      
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedNode) {
            onNodeClick(event as any, selectedNode)
          } else if (selectedEdge) {
            onEdgeClick(event as any, selectedEdge)
          }
          break
        case 's':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleSave()
          }
          break
        case 'z':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            if (event.shiftKey) {
              handleRedo()
            } else {
              handleUndo()
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [readOnly, selectedNode, selectedEdge, onNodeClick, onEdgeClick, handleSave, handleUndo, handleRedo])

  return (
    <EditorContainer>
      {/* Swimlane Containers (rendered behind nodes) */}
      {swimlanes.map(swimlane => {
        const bounds = swimlaneBounds[swimlane.id]
        return bounds ? (
          <SwimlaneContainer
            key={swimlane.id}
            swimlane={swimlane}
            bounds={bounds}
          />
        ) : null
      })}

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onNodeClick={readOnly ? undefined : onNodeClick}
        onEdgeClick={readOnly ? undefined : onEdgeClick}
        onPaneClick={readOnly ? undefined : onPaneClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: false }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        {/* Background Grid */}
        <Background
          variant="dots"
          gap={20}
          size={2}
          color={theme.palette.divider}
        />

        {/* Controls */}
        <Controls
          position="bottom-right"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />

        {/* Mini Map */}
        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            return node.data?.backgroundColor || theme.palette.primary.main
          }}
          nodeStrokeWidth={3}
          zoomable={true}
          pannable={true}
        />
      </ReactFlow>

      {/* Toolbar */}
      {!readOnly && (
        <ProcessFlowToolbar
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          canSave={isDirty}
          canUndo={false} // TODO: Implement undo/redo state
          canRedo={false} // TODO: Implement undo/redo state
        />
      )}

      {/* Node Property Editor */}
      {!readOnly && selectedNode && (
        <NodePropertyEditor
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Welcome Screen for Empty Process Flows */}
      {!readOnly && nodes.length === 0 && (
        <ProcessFlowWelcome processFlowName={processFlow?.name} />
      )}
    </EditorContainer>
  )
}

interface ProcessFlowEditorProps extends ProcessFlowEditorInternalProps {}

const ProcessFlowEditor = (props: ProcessFlowEditorProps) => {
  return (
    <ReactFlowProvider>
      <ProcessFlowEditorInternal {...props} />
    </ReactFlowProvider>
  )
}

export default ProcessFlowEditor