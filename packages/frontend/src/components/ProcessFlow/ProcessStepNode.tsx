import { memo, useCallback } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Box, Typography, Chip, Tooltip, Icon } from '@mui/material'
import { styled } from '@mui/material/styles'
import { ProcessStepNodeData, ProcessStepType, PROCESS_STEP_CONFIGS } from '../../types/processFlow'

const NodeContainer = styled(Box, {
  shouldForwardProp: (prop) => !['stepType', 'isSelected'].includes(prop as string),
})<{
  stepType: ProcessStepType
  isSelected?: boolean
}>(({ theme, stepType, isSelected }) => {
  const config = PROCESS_STEP_CONFIGS[stepType]
  
  return {
    minWidth: 200,
    minHeight: 100,
    padding: theme.spacing(1.5),
    backgroundColor: config.backgroundColor,
    border: `${config.borderWidth}px ${config.borderStyle} ${config.borderColor}`,
    borderRadius: config.shape === 'circle' ? '50%' : 
                  config.shape === 'diamond' ? '0' : theme.spacing(1),
    transform: config.shape === 'diamond' ? 'rotate(45deg)' : 'none',
    boxShadow: isSelected 
      ? `0 0 0 3px ${theme.palette.primary.main}40`
      : theme.shadows[2],
    transition: theme.transitions.create(['box-shadow', 'transform'], {
      duration: theme.transitions.duration.short,
    }),
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    
    '&:hover': {
      boxShadow: theme.shadows[4],
      transform: config.shape === 'diamond' ? 'rotate(45deg) scale(1.02)' : 'scale(1.02)',
    },
  }
})

const NodeContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'stepType',
})<{ stepType: ProcessStepType }>(({ stepType }) => ({
  transform: stepType === ProcessStepType.DECISION ? 'rotate(-45deg)' : 'none',
  textAlign: 'center',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
}))

const StepIcon = styled(Icon, {
  shouldForwardProp: (prop) => prop !== 'stepType',
})<{ stepType: ProcessStepType }>(({ theme, stepType }) => {
  const config = PROCESS_STEP_CONFIGS[stepType]
  
  return {
    fontSize: '24px',
    color: config.textColor,
    marginBottom: theme.spacing(0.5),
  }
})

const StepTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'stepType',
})<{ stepType: ProcessStepType }>(({ stepType }) => {
  const config = PROCESS_STEP_CONFIGS[stepType]
  
  return {
    color: config.textColor,
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: 1.2,
    textAlign: 'center',
    wordBreak: 'break-word',
  }
})

const StepNumber = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'stepType',
})<{ stepType: ProcessStepType }>(({ theme, stepType }) => {
  const config = PROCESS_STEP_CONFIGS[stepType]
  
  return {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 24,
    height: 24,
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: config.borderColor,
    color: theme.palette.common.white,
    
    '& .MuiChip-label': {
      padding: '0 6px',
    },
  }
})

const TimeIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: -8,
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(0.5),
  padding: '2px 6px',
  fontSize: '10px',
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
}))

interface ProcessStepNodeProps extends NodeProps<ProcessStepNodeData> {
  selected?: boolean
}

const ProcessStepNode = memo(({ data, selected }: ProcessStepNodeProps) => {
  const config = PROCESS_STEP_CONFIGS[data.stepType]
  
  const getTotalTime = useCallback(() => {
    const times = [
      data.operationTime || 0,
      data.setupTime || 0,
      data.waitTime || 0,
      data.transportTime || 0,
    ]
    const total = times.reduce((sum, time) => sum + time, 0)
    return total > 0 ? `${Math.round(total / 60)}min` : null
  }, [data])

  const getTooltipContent = useCallback(() => {
    const items = []
    
    if (data.description) {
      items.push(data.description)
    }
    
    if (data.operationTime) {
      items.push(`Operation: ${Math.round(data.operationTime / 60)}min`)
    }
    
    if (data.setupTime) {
      items.push(`Setup: ${Math.round(data.setupTime / 60)}min`)
    }
    
    if (data.qualityRequirements) {
      items.push(`Quality: ${data.qualityRequirements}`)
    }
    
    if (data.safetyRequirements) {
      items.push(`Safety: ${data.safetyRequirements}`)
    }
    
    return items.join('\n') || 'No additional information'
  }, [data])

  const totalTime = getTotalTime()

  return (
    <Tooltip
      title={<pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{getTooltipContent()}</pre>}
      placement="top"
      arrow
    >
      <NodeContainer stepType={data.stepType} isSelected={selected}>
        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: config.borderColor,
            width: 12,
            height: 12,
            border: '2px solid white',
          }}
        />
        
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: config.borderColor,
            width: 12,
            height: 12,
            border: '2px solid white',
          }}
        />
        
        {/* Step Number Badge */}
        <StepNumber
          stepType={data.stepType}
          label={data.stepNumber.toString()}
          size="small"
        />
        
        {/* Node Content */}
        <NodeContent stepType={data.stepType}>
          <StepIcon stepType={data.stepType}>
            {config.icon}
          </StepIcon>
          
          <StepTitle stepType={data.stepType} variant="body2">
            {data.name}
          </StepTitle>
          
          {/* Resource/Control Point Indicators */}
          {(data.resources && data.resources.length > 0) && (
            <Tooltip title={`${data.resources.length} resource(s) assigned`}>
              <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>
                engineering
              </Icon>
            </Tooltip>
          )}
          
          {(data.controlPoints && data.controlPoints.length > 0) && (
            <Tooltip title={`${data.controlPoints.length} control point(s)`}>
              <Icon sx={{ fontSize: 16, color: 'error.main' }}>
                gpp_maybe
              </Icon>
            </Tooltip>
          )}
        </NodeContent>
        
        {/* Time Indicator */}
        {totalTime && (
          <TimeIndicator>
            {totalTime}
          </TimeIndicator>
        )}
      </NodeContainer>
    </Tooltip>
  )
})

ProcessStepNode.displayName = 'ProcessStepNode'

export default ProcessStepNode