import { Box, Typography, Paper, Button, Grid } from '@mui/material'
import { Add as AddIcon, Download as DownloadIcon } from '@mui/icons-material'

export default function ControlPlan() {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Control Plan
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Process control planning and critical control points management
          </Typography>
        </Box>
        <Box>
          <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 2 }}>
            Export
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            New Control Plan
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, minHeight: 600 }}>
            <Typography variant="h6" gutterBottom>
              Control Plan Matrix
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define critical control points, inspection methods, and reaction plans.
            </Typography>
            
            <Box sx={{ 
              border: '2px dashed #ccc', 
              borderRadius: 2, 
              p: 4, 
              textAlign: 'center',
              minHeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Control Plan Table
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Interactive table for defining:
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                • Process steps and characteristics
                <br />
                • Specification limits and targets
                <br />
                • Measurement systems and methods
                <br />
                • Sample sizes and frequencies
                <br />
                • Control methods and reaction plans
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Statistical Process Control
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SPC charts and process capability analysis will be displayed here.
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Control Plan Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current control plan status, alerts, and notifications.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}