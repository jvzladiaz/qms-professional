import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridActionsCellItem,
  GridRowId,
  GridSortModel,
  GridFilterModel,
  GridRowSelectionModel,
} from '@mui/x-data-grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Assignment as ActionIcon,
  Calculate as CalculateIcon,
  ImportExport as ImportIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { Fmea, FailureMode, FmeaMetrics, RPN_RISK_LEVELS } from '../../types/fmea'
import api from '../../services/api'

const WorksheetContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '80vh',
}))

const MetricsCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  height: '100%',
}))

const RiskChip = styled(Chip)<{ riskLevel: string }>(({ theme, riskLevel }) => {
  const colors = RPN_RISK_LEVELS[riskLevel as keyof typeof RPN_RISK_LEVELS]
  return {
    backgroundColor: colors.color,
    color: theme.palette.common.white,
    fontWeight: 'bold',
    '& .MuiChip-label': {
      paddingLeft: 12,
      paddingRight: 12,
    },
  }
})

interface FmeaWorksheetProps {
  fmea: Fmea
  onFmeaUpdate: (fmea: Fmea) => void
  readOnly?: boolean
}

const FmeaWorksheet = ({ fmea, onFmeaUpdate, readOnly = false }: FmeaWorksheetProps) => {
  const [failureModes, setFailureModes] = useState<FailureMode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<GridRowSelectionModel>([])
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'sequenceNumber', sort: 'asc' }
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<FmeaMetrics | null>(null)

  // Load failure modes
  const loadFailureModes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get(`/fmeas/${fmea.id}/failure-modes`)
      setFailureModes(response.data.data || [])
      
      // Load metrics
      const metricsResponse = await api.get(`/fmeas/${fmea.id}/metrics`)
      setMetrics(metricsResponse.data.data.metrics)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load failure modes')
    } finally {
      setLoading(false)
    }
  }, [fmea.id])

  useEffect(() => {
    loadFailureModes()
  }, [loadFailureModes])

  // Calculate RPN color
  const getRpnColor = useCallback((rpn: number) => {
    if (rpn >= 300) return RPN_RISK_LEVELS.CRITICAL.color
    if (rpn >= 100) return RPN_RISK_LEVELS.HIGH.color
    if (rpn >= 50) return RPN_RISK_LEVELS.MEDIUM.color
    return RPN_RISK_LEVELS.LOW.color
  }, [])

  // Data Grid columns
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'sequenceNumber',
      headerName: '#',
      width: 60,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'primaryProcessStep',
      headerName: 'Process Step',
      width: 150,
      valueGetter: (params) => params.row.primaryProcessStep?.name || 'N/A',
      renderCell: (params) => (
        <Tooltip title={`Step ${params.row.primaryProcessStep?.stepNumber || 'N/A'}: ${params.row.primaryProcessStep?.stepType || ''}`}>
          <span>{params.value}</span>
        </Tooltip>
      ),
    },
    {
      field: 'itemFunction',
      headerName: 'Item Function',
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Box sx={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            cursor: 'pointer'
          }}>
            {params.value}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'failureMode',
      headerName: 'Failure Mode',
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Box sx={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            cursor: 'pointer'
          }}>
            {params.value}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'effects',
      headerName: 'Effects',
      width: 200,
      valueGetter: (params) => params.row.effects?.map((e: any) => e.effectDescription).join('; ') || '',
      renderCell: (params) => (
        <Tooltip title={params.value || 'No effects defined'}>
          <Box sx={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            cursor: 'pointer',
            fontStyle: params.value ? 'normal' : 'italic',
            color: params.value ? 'inherit' : 'text.secondary'
          }}>
            {params.value || 'No effects defined'}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'severityRating',
      headerName: 'S',
      width: 60,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value >= fmea.severityThreshold ? 'error' : 'default'}
          variant={params.value >= fmea.severityThreshold ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'causes',
      headerName: 'Causes',
      width: 200,
      valueGetter: (params) => params.row.causes?.map((c: any) => c.causeDescription).join('; ') || '',
      renderCell: (params) => (
        <Tooltip title={params.value || 'No causes defined'}>
          <Box sx={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            cursor: 'pointer',
            fontStyle: params.value ? 'normal' : 'italic',
            color: params.value ? 'inherit' : 'text.secondary'
          }}>
            {params.value || 'No causes defined'}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'occurrenceRating',
      headerName: 'O',
      width: 60,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => params.row.rpnBreakdown?.occurrence || 1,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value >= fmea.occurrenceThreshold ? 'warning' : 'default'}
          variant={params.value >= fmea.occurrenceThreshold ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'controls',
      headerName: 'Controls',
      width: 200,
      valueGetter: (params) => {
        const controls = params.row.causes?.flatMap((c: any) => c.controls || []) || []
        return controls.map((ctrl: any) => ctrl.controlDescription).join('; ')
      },
      renderCell: (params) => (
        <Tooltip title={params.value || 'No controls defined'}>
          <Box sx={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            cursor: 'pointer',
            fontStyle: params.value ? 'normal' : 'italic',
            color: params.value ? 'inherit' : 'text.secondary'
          }}>
            {params.value || 'No controls defined'}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'detectionRating',
      headerName: 'D',
      width: 60,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => params.row.rpnBreakdown?.detection || 10,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value >= fmea.detectionThreshold ? 'error' : 'default'}
          variant={params.value >= fmea.detectionThreshold ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'currentRpn',
      headerName: 'RPN',
      width: 80,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <RiskChip
          label={params.value || 0}
          size="small"
          riskLevel={params.row.riskLevel || 'LOW'}
        />
      ),
    },
    {
      field: 'actionItems',
      headerName: 'Actions',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const actionCount = params.row.actionItems?.length || 0
        const openActions = params.row.actionItems?.filter((a: any) => 
          a.status === 'OPEN' || a.status === 'IN_PROGRESS'
        ).length || 0
        
        return (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Chip
              label={actionCount}
              size="small"
              color={actionCount > 0 ? 'primary' : 'default'}
              variant="outlined"
            />
            {openActions > 0 && (
              <Chip
                label={openActions}
                size="small"
                color="warning"
                variant="filled"
              />
            )}
          </Box>
        )
      },
    },
    {
      field: 'specialCharacteristic',
      headerName: 'SC',
      width: 60,
      type: 'boolean',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => params.value && (
        <Tooltip title="Special Characteristic">
          <WarningIcon color="warning" />
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => {
        const actions = []
        
        if (!readOnly) {
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<EditIcon />}
              label="Edit"
              onClick={() => handleEditFailureMode(params.id as string)}
            />
          )
          
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<DeleteIcon />}
              label="Delete"
              onClick={() => handleDeleteFailureMode(params.id as string)}
            />
          )
        }

        actions.push(
          <GridActionsCellItem
            key="calculate"
            icon={<CalculateIcon />}
            label="Calculate RPN"
            onClick={() => handleCalculateRpn(params.id as string)}
          />
        )

        return actions
      },
    },
  ], [fmea.severityThreshold, fmea.occurrenceThreshold, fmea.detectionThreshold, readOnly])

  // Handlers
  const handleEditFailureMode = useCallback((id: string) => {
    console.log('Edit failure mode:', id)
    // TODO: Open failure mode edit dialog
  }, [])

  const handleDeleteFailureMode = useCallback((id: string) => {
    setItemToDelete(id)
    setDeleteDialogOpen(true)
  }, [])

  const handleCalculateRpn = useCallback(async (id: string) => {
    try {
      await api.post(`/fmeas/failure-modes/${id}/calculate-rpn`)
      loadFailureModes() // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to calculate RPN')
    }
  }, [loadFailureModes])

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return

    try {
      await api.delete(`/fmeas/failure-modes/${itemToDelete}`)
      loadFailureModes()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete failure mode')
    }
  }, [itemToDelete, loadFailureModes])

  const handleAutoPopulate = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.post(`/fmeas/${fmea.id}/auto-populate`)
      const { created, skipped } = response.data.data
      
      if (created > 0) {
        loadFailureModes()
        alert(`Successfully created ${created} failure modes. ${skipped} were skipped.`)
      } else {
        alert('No new failure modes were created.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to auto-populate FMEA')
    } finally {
      setLoading(false)
    }
  }, [fmea.id, loadFailureModes])

  const handleExport = useCallback(() => {
    console.log('Export FMEA data')
    // TODO: Implement export functionality
  }, [])

  // Convert failure modes to DataGrid rows
  const rows: GridRowsProp = useMemo(() => {
    return failureModes.map(fm => ({
      id: fm.id,
      sequenceNumber: fm.sequenceNumber,
      itemFunction: fm.itemFunction,
      failureMode: fm.failureMode,
      effects: fm.effects,
      causes: fm.causes,
      severityRating: fm.severityRating,
      currentRpn: fm.currentRpn || 0,
      riskLevel: fm.riskLevel || 'LOW',
      actionItems: fm.actionItems,
      specialCharacteristic: fm.specialCharacteristic,
      primaryProcessStep: fm.primaryProcessStep,
      rpnBreakdown: fm.rpnBreakdown,
      requiresAction: fm.requiresAction || false,
    }))
  }, [failureModes])

  // Metrics cards
  const metricsCards = useMemo(() => [
    {
      title: 'Total Failure Modes',
      value: metrics?.totalFailureModes || 0,
      icon: <Assignment />,
      color: 'primary.main'
    },
    {
      title: 'High Risk Items',
      value: metrics?.highRiskItems || 0,
      icon: <ErrorIcon />,
      color: 'error.main'
    },
    {
      title: 'Average RPN',
      value: metrics?.averageRpn || 0,
      icon: <CalculateIcon />,
      color: 'info.main'
    },
    {
      title: 'Open Actions',
      value: metrics?.openActionItems || 0,
      icon: <ActionIcon />,
      color: 'warning.main'
    },
  ], [metrics])

  if (loading && failureModes.length === 0) {
    return (
      <WorksheetContainer>
        <LinearProgress />
        <Box mt={2}>
          <Typography>Loading FMEA worksheet...</Typography>
        </Box>
      </WorksheetContainer>
    )
  }

  return (
    <WorksheetContainer>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            FMEA Worksheet
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {fmea.fmeaNumber} - {fmea.title}
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadFailureModes}
          >
            Refresh
          </Button>
          
          {fmea.processFlowId && !readOnly && (
            <Button
              variant="outlined"
              startIcon={<ImportIcon />}
              onClick={handleAutoPopulate}
            >
              Import from Process Flow
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => console.log('Add new failure mode')}
            >
              Add Failure Mode
            </Button>
          )}
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {metricsCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MetricsCard>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                    <Box color={card.color}>
                      {card.icon}
                    </Box>
                  </Box>
                  <Typography variant="h4" component="div" gutterBottom>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.title}
                  </Typography>
                </CardContent>
              </MetricsCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Data Grid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } }
          }}
          checkboxSelection={!readOnly}
          disableRowSelectionOnClick
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
          rowSelectionModel={selectedRowIds}
          onRowSelectionModelChange={setSelectedRowIds}
          loading={loading}
          getRowClassName={(params) => {
            if (params.row.requiresAction) return 'row-requires-action'
            return ''
          }}
          sx={{
            '& .row-requires-action': {
              backgroundColor: 'rgba(255, 152, 0, 0.08)',
              '&:hover': {
                backgroundColor: 'rgba(255, 152, 0, 0.12)',
              },
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'grey.50',
              fontWeight: 'bold',
            },
          }}
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this failure mode? This action cannot be undone and will also delete all related effects, causes, controls, and action items.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </WorksheetContainer>
  )
}

export default FmeaWorksheet