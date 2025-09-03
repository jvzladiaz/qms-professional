import { memo } from 'react'
import {
  Box,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  IconButton,
  Tooltip,
  Button,
  ButtonGroup,
} from '@mui/material'
import {
  Mouse as SelectIcon,
  Link as ConnectIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitViewIcon,
} from '@mui/icons-material'
import {
  Settings as OperationIcon,
  Search as InspectionIcon,
  LocalShipping as TransportIcon,
  Schedule as DelayIcon,
  Storage as StorageIcon,
  Help as DecisionIcon,
  PlayArrow as StartIcon,
  Stop as EndIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { ToolType, ProcessStepType } from '../../types/processFlow'
import useProcessFlowStore from '../../stores/processFlowStore'

const ToolbarContainer = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 1000,
  padding: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  minWidth: 200,
  maxWidth: 250,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
}))

const ToolSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}))

const SectionTitle = styled(Box)(({ theme }) => ({
  fontSize: '12px',
  fontWeight: 600,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: theme.spacing(0.5),
}))

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  justifyContent: 'flex-start',
  textTransform: 'none',
  padding: theme.spacing(0.75, 1),
  gap: theme.spacing(1),
  fontSize: '14px',
  
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}))

interface ProcessFlowToolbarProps {
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  canUndo?: boolean
  canRedo?: boolean
  canSave?: boolean
}

const ProcessFlowToolbar = memo(({
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  canUndo = false,
  canRedo = false,
  canSave = false,
}: ProcessFlowToolbarProps) => {
  const { selectedTool, setSelectedTool } = useProcessFlowStore()

  const handleToolChange = (
    event: React.MouseEvent<HTMLElement>,
    newTool: ToolType | null,
  ) => {
    if (newTool !== null) {
      setSelectedTool(newTool)
    }
  }

  const stepTools = [
    { type: ToolType.OPERATION, icon: <OperationIcon />, label: 'Operation' },
    { type: ToolType.INSPECTION, icon: <InspectionIcon />, label: 'Inspection' },
    { type: ToolType.TRANSPORT, icon: <TransportIcon />, label: 'Transport' },
    { type: ToolType.DELAY, icon: <DelayIcon />, label: 'Delay' },
    { type: ToolType.STORAGE, icon: <StorageIcon />, label: 'Storage' },
    { type: ToolType.DECISION, icon: <DecisionIcon />, label: 'Decision' },
    { type: ToolType.START, icon: <StartIcon />, label: 'Start' },
    { type: ToolType.END, icon: <EndIcon />, label: 'End' },
  ]

  const actionTools = [
    { type: ToolType.SELECT, icon: <SelectIcon />, label: 'Select' },
    { type: ToolType.CONNECT, icon: <ConnectIcon />, label: 'Connect' },
    { type: ToolType.DELETE, icon: <DeleteIcon />, label: 'Delete' },
  ]

  return (
    <ToolbarContainer>
      {/* File Operations */}
      <ToolSection>
        <SectionTitle>File</SectionTitle>
        <ButtonGroup orientation="vertical" size="small" fullWidth>
          <Button
            startIcon={<SaveIcon />}
            onClick={onSave}
            disabled={!canSave}
            variant="outlined"
            size="small"
          >
            Save
          </Button>
          <Box display="flex" gap={0.5}>
            <Tooltip title="Undo">
              <span>
                <IconButton
                  size="small"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <UndoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo">
              <span>
                <IconButton
                  size="small"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <RedoIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </ButtonGroup>
      </ToolSection>

      <Divider />

      {/* Action Tools */}
      <ToolSection>
        <SectionTitle>Tools</SectionTitle>
        <ToggleButtonGroup
          value={selectedTool}
          exclusive
          onChange={handleToolChange}
          orientation="vertical"
          size="small"
          fullWidth
        >
          {actionTools.map((tool) => (
            <StyledToggleButton
              key={tool.type}
              value={tool.type}
              aria-label={tool.label}
            >
              {tool.icon}
              {tool.label}
            </StyledToggleButton>
          ))}
        </ToggleButtonGroup>
      </ToolSection>

      <Divider />

      {/* Process Step Tools */}
      <ToolSection>
        <SectionTitle>Process Steps</SectionTitle>
        <ToggleButtonGroup
          value={selectedTool}
          exclusive
          onChange={handleToolChange}
          orientation="vertical"
          size="small"
          fullWidth
        >
          {stepTools.map((tool) => (
            <StyledToggleButton
              key={tool.type}
              value={tool.type}
              aria-label={tool.label}
            >
              {tool.icon}
              {tool.label}
            </StyledToggleButton>
          ))}
        </ToggleButtonGroup>
      </ToolSection>

      <Divider />

      {/* View Controls */}
      <ToolSection>
        <SectionTitle>View</SectionTitle>
        <Box display="flex" gap={0.5} justifyContent="space-between">
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={onZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={onZoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit View">
            <IconButton size="small" onClick={onFitView}>
              <FitViewIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </ToolSection>
    </ToolbarContainer>
  )
})

ProcessFlowToolbar.displayName = 'ProcessFlowToolbar'

export default ProcessFlowToolbar