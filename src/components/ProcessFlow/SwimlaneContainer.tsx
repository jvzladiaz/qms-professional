import { memo, useCallback, useMemo } from 'react'
import { Box, Typography, Paper, Divider, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Swimlane, ProcessStepNode } from '../../types/processFlow'
import useProcessFlowStore from '../../stores/processFlowStore'

const SwimlaneWrapper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'swimlaneColor',
})<{ swimlaneColor: string }>(({ theme, swimlaneColor }) => ({
  position: 'absolute',
  backgroundColor: `${swimlaneColor}20`,
  border: `2px solid ${swimlaneColor}`,
  borderRadius: theme.spacing(1),
  minHeight: 150,
  zIndex: -1,
  transition: theme.transitions.create(['background-color', 'border-color'], {
    duration: theme.transitions.duration.short,
  }),
  
  '&:hover': {
    backgroundColor: `${swimlaneColor}30`,
  },
}))

const SwimlaneHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'swimlaneColor',
})<{ swimlaneColor: string }>(({ theme, swimlaneColor }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  backgroundColor: swimlaneColor,
  color: theme.palette.getContrastText(swimlaneColor),
  padding: theme.spacing(1, 1.5),
  borderTopLeftRadius: theme.spacing(1),
  borderTopRightRadius: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 48,
  zIndex: 1,
}))

const SwimlaneTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '16px',
  flex: 1,
}))

const SwimlaneInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

const StepCount = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: 'inherit',
  fontSize: '12px',
  height: 24,
}))

interface SwimlaneContainerProps {
  swimlane: Swimlane
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

const SwimlaneContainer = memo(({ swimlane, bounds }: SwimlaneContainerProps) => {
  const { nodes } = useProcessFlowStore()
  
  // Calculate steps in this swimlane
  const swimlaneSteps = useMemo(() => {
    return nodes.filter(node => node.data.swimlaneId === swimlane.id)
  }, [nodes, swimlane.id])

  const stepCount = swimlaneSteps.length
  
  // Calculate total operation time for swimlane
  const totalTime = useMemo(() => {
    return swimlaneSteps.reduce((total, node) => {
      const operationTime = node.data.operationTime || 0
      const setupTime = node.data.setupTime || 0
      return total + operationTime + setupTime
    }, 0)
  }, [swimlaneSteps])

  const formatTime = useCallback((seconds: number) => {
    if (seconds === 0) return '0min'
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`
  }, [])

  return (
    <SwimlaneWrapper
      swimlaneColor={swimlane.color}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      <SwimlaneHeader swimlaneColor={swimlane.color}>
        <SwimlaneTitle variant="h6">
          {swimlane.name}
        </SwimlaneTitle>
        
        <SwimlaneInfo>
          {stepCount > 0 && (
            <StepCount
              label={`${stepCount} step${stepCount !== 1 ? 's' : ''}`}
              size="small"
            />
          )}
          
          {totalTime > 0 && (
            <StepCount
              label={formatTime(totalTime)}
              size="small"
            />
          )}
        </SwimlaneInfo>
      </SwimlaneHeader>
      
      {/* Optional: Department and Role Info */}
      {(swimlane.department || swimlane.responsibleRole) && (
        <Box
          sx={{
            position: 'absolute',
            top: 48,
            left: 0,
            right: 0,
            padding: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderBottom: `1px solid ${swimlane.color}40`,
          }}
        >
          {swimlane.department && (
            <Typography variant="caption" display="block" color="text.secondary">
              Department: {swimlane.department}
            </Typography>
          )}
          {swimlane.responsibleRole && (
            <Typography variant="caption" display="block" color="text.secondary">
              Role: {swimlane.responsibleRole}
            </Typography>
          )}
        </Box>
      )}
    </SwimlaneWrapper>
  )
})

SwimlaneContainer.displayName = 'SwimlaneContainer'

export default SwimlaneContainer