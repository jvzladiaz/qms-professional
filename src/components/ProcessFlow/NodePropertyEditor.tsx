import { memo, useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Typography,
  Divider,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
} from '@mui/material'
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { ProcessStepNode, ProcessStepType, ProcessStepNodeData, PROCESS_STEP_CONFIGS } from '../../types/processFlow'
import useProcessFlowStore from '../../stores/processFlowStore'

const PropertyEditorContainer = styled(Card)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  width: 350,
  maxHeight: 'calc(100vh - 150px)',
  overflowY: 'auto',
  zIndex: 1000,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[8],
}))

const TimeInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '14px',
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: theme.spacing(1),
}))

interface NodePropertyEditorProps {
  node: ProcessStepNode
  onClose: () => void
}

const NodePropertyEditor = memo(({ node, onClose }: NodePropertyEditorProps) => {
  const { updateNode, deleteNode, duplicateNode, swimlanes } = useProcessFlowStore()
  const [localData, setLocalData] = useState<ProcessStepNodeData>(node.data)
  const [isDirty, setIsDirty] = useState(false)

  // Sync with external node changes
  useEffect(() => {
    setLocalData(node.data)
    setIsDirty(false)
  }, [node.data])

  const handleFieldChange = (field: keyof ProcessStepNodeData, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSave = () => {
    updateNode(node.id, localData)
    setIsDirty(false)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this process step?')) {
      deleteNode(node.id)
      onClose()
    }
  }

  const handleDuplicate = () => {
    duplicateNode(node.id)
  }

  const handleStepTypeChange = (newType: ProcessStepType) => {
    const config = PROCESS_STEP_CONFIGS[newType]
    setLocalData(prev => ({
      ...prev,
      stepType: newType,
      backgroundColor: config.backgroundColor,
      borderColor: config.borderColor,
    }))
    setIsDirty(true)
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return ''
    return Math.round(seconds / 60).toString()
  }

  const parseTime = (minutes: string) => {
    const mins = parseInt(minutes) || 0
    return mins * 60
  }

  return (
    <PropertyEditorContainer>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="div">
              Step Properties
            </Typography>
            {isDirty && (
              <Chip label="Modified" color="warning" size="small" />
            )}
          </Box>
        }
        action={
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        }
      />

      <CardContent sx={{ pt: 0 }}>
        {/* Basic Information */}
        <Box mb={3}>
          <SectionTitle>Basic Information</SectionTitle>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Step Number"
                type="number"
                fullWidth
                size="small"
                value={localData.stepNumber}
                onChange={(e) => handleFieldChange('stepNumber', parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Step Type</InputLabel>
                <Select
                  value={localData.stepType}
                  label="Step Type"
                  onChange={(e) => handleStepTypeChange(e.target.value as ProcessStepType)}
                >
                  {Object.values(ProcessStepType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            label="Name"
            fullWidth
            size="small"
            value={localData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            sx={{ mt: 2 }}
          />

          <TextField
            label="Description"
            fullWidth
            size="small"
            multiline
            rows={3}
            value={localData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            sx={{ mt: 2 }}
          />

          {swimlanes.length > 0 && (
            <FormControl fullWidth size="small" sx={{ mt: 2 }}>
              <InputLabel>Swimlane</InputLabel>
              <Select
                value={localData.swimlaneId || ''}
                label="Swimlane"
                onChange={(e) => handleFieldChange('swimlaneId', e.target.value)}
              >
                {swimlanes.map((swimlane) => (
                  <MenuItem key={swimlane.id} value={swimlane.id}>
                    {swimlane.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Divider />

        {/* Timing Information */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Timing Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Operation Time (min)"
                  type="number"
                  fullWidth
                  size="small"
                  value={formatTime(localData.operationTime)}
                  onChange={(e) => handleFieldChange('operationTime', parseTime(e.target.value))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Setup Time (min)"
                  type="number"
                  fullWidth
                  size="small"
                  value={formatTime(localData.setupTime)}
                  onChange={(e) => handleFieldChange('setupTime', parseTime(e.target.value))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Wait Time (min)"
                  type="number"
                  fullWidth
                  size="small"
                  value={formatTime(localData.waitTime)}
                  onChange={(e) => handleFieldChange('waitTime', parseTime(e.target.value))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Transport Time (min)"
                  type="number"
                  fullWidth
                  size="small"
                  value={formatTime(localData.transportTime)}
                  onChange={(e) => handleFieldChange('transportTime', parseTime(e.target.value))}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Requirements */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Requirements</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Quality Requirements"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={localData.qualityRequirements || ''}
                onChange={(e) => handleFieldChange('qualityRequirements', e.target.value)}
              />
              <TextField
                label="Safety Requirements"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={localData.safetyRequirements || ''}
                onChange={(e) => handleFieldChange('safetyRequirements', e.target.value)}
              />
              <TextField
                label="Environmental Requirements"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={localData.environmentalRequirements || ''}
                onChange={(e) => handleFieldChange('environmentalRequirements', e.target.value)}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Appearance */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Appearance</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Background Color"
                  type="color"
                  fullWidth
                  size="small"
                  value={localData.backgroundColor || '#ffffff'}
                  onChange={(e) => handleFieldChange('backgroundColor', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Border Color"
                  type="color"
                  fullWidth
                  size="small"
                  value={localData.borderColor || '#000000'}
                  onChange={(e) => handleFieldChange('borderColor', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Action Buttons */}
        <Box mt={3} display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!isDirty}
            size="small"
          >
            Save
          </Button>
          <Button
            variant="outlined"
            startIcon={<DuplicateIcon />}
            onClick={handleDuplicate}
            size="small"
          >
            Duplicate
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            size="small"
          >
            Delete
          </Button>
        </Box>

        {/* Node Info */}
        <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            Node ID: {node.id}
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            Position: ({Math.round(node.position.x)}, {Math.round(node.position.y)})
          </Typography>
        </Box>
      </CardContent>
    </PropertyEditorContainer>
  )
})

NodePropertyEditor.displayName = 'NodePropertyEditor'

export default NodePropertyEditor