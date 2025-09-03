import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import ProcessFlowEditor from '../components/ProcessFlow/ProcessFlowEditor'
import { ProcessFlow, Priority, Status } from '../types/processFlow'
import api from '../services/api'

interface ProcessFlowWithStats extends ProcessFlow {
  _count: {
    processSteps: number
    stepConnections: number
  }
}

export default function ProcessFlowPage() {
  const [processFlows, setProcessFlows] = useState<ProcessFlowWithStats[]>([])
  const [selectedFlow, setSelectedFlow] = useState<ProcessFlow | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New process flow form state
  const [newFlowData, setNewFlowData] = useState({
    name: '',
    description: '',
    priority: Priority.MEDIUM,
    processType: '',
  })

  // Load process flows on mount
  useEffect(() => {
    loadProcessFlows()
  }, [])

  const loadProcessFlows = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/process-flows')
      setProcessFlows(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load process flows')
      console.error('Error loading process flows:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFlow = async () => {
    if (!newFlowData.name.trim()) {
      setError('Process flow name is required')
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/process-flows', newFlowData)
      const createdFlow = response.data.data
      
      setProcessFlows(prev => [createdFlow, ...prev])
      setIsCreateDialogOpen(false)
      setNewFlowData({ name: '', description: '', priority: Priority.MEDIUM, processType: '' })
      
      // Open the new flow for editing
      handleEditFlow(createdFlow.id)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create process flow')
      console.error('Error creating process flow:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditFlow = async (flowId: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/process-flows/${flowId}`)
      setSelectedFlow(response.data.data)
      setIsEditing(true)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load process flow')
      console.error('Error loading process flow:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewFlow = async (flowId: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/process-flows/${flowId}`)
      setSelectedFlow(response.data.data)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load process flow')
      console.error('Error loading process flow:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFlow = async (data: { nodes: any[]; edges: any[] }) => {
    if (!selectedFlow) return

    try {
      setLoading(true)
      
      // Update process steps
      await api.put(`/process-flows/${selectedFlow.id}/steps/positions`, {
        steps: data.nodes.map(node => ({
          id: node.id,
          positionX: node.positionX,
          positionY: node.positionY,
        }))
      })

      // TODO: Update step connections, create new steps, etc.
      // This would require more sophisticated API calls to handle
      // creating, updating, and deleting steps and connections

      alert('Process flow saved successfully!')
      
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save process flow')
      console.error('Error saving process flow:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateFlow = async (flowId: string, name: string) => {
    try {
      setLoading(true)
      const response = await api.post(`/process-flows/${flowId}/duplicate`, { name })
      const duplicatedFlow = response.data.data
      
      setProcessFlows(prev => [duplicatedFlow, ...prev])
      alert('Process flow duplicated successfully!')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to duplicate process flow')
      console.error('Error duplicating process flow:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFlow = async (flowId: string) => {
    if (!window.confirm('Are you sure you want to delete this process flow? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await api.delete(`/process-flows/${flowId}`)
      setProcessFlows(prev => prev.filter(flow => flow.id !== flowId))
      alert('Process flow deleted successfully!')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete process flow')
      console.error('Error deleting process flow:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToList = () => {
    setSelectedFlow(null)
    setIsEditing(false)
    loadProcessFlows() // Refresh the list
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.ACTIVE:
        return 'success'
      case Status.APPROVED:
        return 'info'
      case Status.IN_REVIEW:
        return 'warning'
      case Status.DRAFT:
        return 'default'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return 'error'
      case Priority.HIGH:
        return 'warning'
      case Priority.MEDIUM:
        return 'info'
      case Priority.LOW:
        return 'default'
      default:
        return 'default'
    }
  }

  // Show process flow editor
  if (selectedFlow) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {isEditing ? 'Edit' : 'View'} Process Flow
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {selectedFlow.name} (v{selectedFlow.version})
            </Typography>
          </Box>
          <Button variant="outlined" onClick={handleBackToList}>
            Back to List
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <ProcessFlowEditor
          processFlow={selectedFlow}
          onSave={handleSaveFlow}
          readOnly={!isEditing}
        />
      </Box>
    )
  }

  // Show process flows list
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Process Flow
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage and visualize manufacturing process flows
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateDialogOpen(true)}
        >
          New Process Flow
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {processFlows.map((flow) => (
            <Grid item xs={12} md={6} lg={4} key={flow.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {flow.name}
                    </Typography>
                    <Chip
                      label={flow.status}
                      color={getStatusColor(flow.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  {flow.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {flow.description}
                    </Typography>
                  )}

                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <Chip
                      label={`Priority: ${flow.priority}`}
                      color={getPriorityColor(flow.priority) as any}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`v${flow.version}`}
                      size="small"
                      variant="outlined"
                    />
                    {flow.processType && (
                      <Chip
                        label={flow.processType}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {flow._count?.processSteps || 0} steps • {flow._count?.stepConnections || 0} connections
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Updated {new Date(flow.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewFlow(flow.id)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditFlow(flow.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DuplicateIcon />}
                    onClick={() => {
                      const name = prompt('Enter name for duplicated process flow:', `${flow.name} (Copy)`)
                      if (name) handleDuplicateFlow(flow.id, name)
                    }}
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteFlow(flow.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Process Flow Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Process Flow</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Name"
              fullWidth
              value={newFlowData.name}
              onChange={(e) => setNewFlowData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newFlowData.description}
              onChange={(e) => setNewFlowData(prev => ({ ...prev, description: e.target.value }))}
            />
            
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newFlowData.priority}
                label="Priority"
                onChange={(e) => setNewFlowData(prev => ({ ...prev, priority: e.target.value as Priority }))}
              >
                <MenuItem value={Priority.LOW}>Low</MenuItem>
                <MenuItem value={Priority.MEDIUM}>Medium</MenuItem>
                <MenuItem value={Priority.HIGH}>High</MenuItem>
                <MenuItem value={Priority.CRITICAL}>Critical</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Process Type"
              fullWidth
              value={newFlowData.processType}
              onChange={(e) => setNewFlowData(prev => ({ ...prev, processType: e.target.value }))}
              placeholder="e.g., Manufacturing, Assembly, Inspection"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateFlow} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}