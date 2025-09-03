import { memo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
} from '@mui/material'
import {
  Settings as OperationIcon,
  Search as InspectionIcon,
  LocalShipping as TransportIcon,
  Schedule as DelayIcon,
  Storage as StorageIcon,
  Help as DecisionIcon,
  PlayArrow as StartIcon,
  Stop as EndIcon,
  TouchApp as ClickIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { ProcessStepType, ToolType } from '../../types/processFlow'
import useProcessFlowStore from '../../stores/processFlowStore'

const WelcomeContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  zIndex: 100,
  maxWidth: 800,
  width: '90%',
}))

const StepTypeCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}))

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 64,
  height: 64,
  backgroundColor: theme.palette.primary.main,
  borderRadius: '50%',
  margin: '0 auto 16px auto',
  color: theme.palette.primary.contrastText,
}))

interface ProcessFlowWelcomeProps {
  processFlowName?: string
}

const ProcessFlowWelcome = memo(({ processFlowName }: ProcessFlowWelcomeProps) => {
  const { setSelectedTool, addNode } = useProcessFlowStore()

  const stepTypes = [
    {
      type: ProcessStepType.START,
      icon: <StartIcon fontSize="large" />,
      title: 'Start',
      description: 'Begin your process flow',
      color: '#4CAF50',
    },
    {
      type: ProcessStepType.OPERATION,
      icon: <OperationIcon fontSize="large" />,
      title: 'Operation',
      description: 'Value-adding activity',
      color: '#1976D2',
    },
    {
      type: ProcessStepType.INSPECTION,
      icon: <InspectionIcon fontSize="large" />,
      title: 'Inspection',
      description: 'Quality check or verification',
      color: '#4CAF50',
    },
    {
      type: ProcessStepType.DECISION,
      icon: <DecisionIcon fontSize="large" />,
      title: 'Decision',
      description: 'Branching point in process',
      color: '#FFC107',
    },
  ]

  const handleStepTypeClick = (stepType: ProcessStepType) => {
    // Set the tool to the step type and let user click on canvas
    setSelectedTool(stepType as unknown as ToolType)
  }

  const handleQuickStart = () => {
    // Add a start node at the center
    addNode(ProcessStepType.START, { x: 300, y: 200 })
    addNode(ProcessStepType.OPERATION, { x: 500, y: 200 })
    addNode(ProcessStepType.END, { x: 700, y: 200 })
  }

  return (
    <WelcomeContainer>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom color="primary">
          Welcome to Process Flow Editor
        </Typography>
        
        {processFlowName && (
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {processFlowName}
          </Typography>
        )}

        <Typography variant="body1" color="text.secondary" paragraph>
          Create your manufacturing process flow by adding process steps to the canvas.
          Click on a step type below to select it, then click anywhere on the canvas to place it.
        </Typography>

        {/* Quick Start */}
        <Box mb={4}>
          <Button
            variant="contained"
            size="large"
            onClick={handleQuickStart}
            startIcon={<StartIcon />}
            sx={{ mr: 2 }}
          >
            Quick Start with Template
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Creates Start → Operation → End sequence
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Or choose a step type
          </Typography>
        </Divider>

        {/* Step Types Grid */}
        <Grid container spacing={2} justifyContent="center">
          {stepTypes.map((step) => (
            <Grid item xs={6} sm={3} key={step.type}>
              <StepTypeCard onClick={() => handleStepTypeClick(step.type)}>
                <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                  <IconContainer sx={{ backgroundColor: step.color }}>
                    {step.icon}
                  </IconContainer>
                  <Typography variant="h6" gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                  <Button size="small" startIcon={<ClickIcon />}>
                    Select Tool
                  </Button>
                </CardActions>
              </StepTypeCard>
            </Grid>
          ))}
        </Grid>

        {/* Instructions */}
        <Box mt={4} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Getting Started Tips:
          </Typography>
          <Typography variant="body2" component="div">
            • Select a tool from the left toolbar, then click on the canvas to add steps<br />
            • Drag nodes to reposition them<br />
            • Click and drag from connection handles to create connections<br />
            • Select nodes to edit their properties in the right panel<br />
            • Use Ctrl+S to save your changes
          </Typography>
        </Box>
      </Paper>
    </WelcomeContainer>
  )
})

ProcessFlowWelcome.displayName = 'ProcessFlowWelcome'

export default ProcessFlowWelcome