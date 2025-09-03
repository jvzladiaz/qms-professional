import { Box, Typography, Paper, Button, Grid, Tabs, Tab } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { useState } from 'react'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function FMEA() {
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            FMEA Analysis
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Failure Mode and Effects Analysis (AIAG-VDA Methodology)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          New FMEA
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="FMEA tabs">
          <Tab label="Design FMEA (DFMEA)" />
          <Tab label="Process FMEA (PFMEA)" />
          <Tab label="Risk Assessment" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Design FMEA
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Analyze potential failure modes in product design and their effects on system performance.
          </Typography>
          <Box sx={{ 
            border: '2px dashed #ccc', 
            borderRadius: 2, 
            p: 4, 
            textAlign: 'center',
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              DFMEA Worksheet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Design FMEA analysis table with severity, occurrence, and detection ratings
            </Typography>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Process FMEA
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Analyze potential failure modes in manufacturing processes and their impact on product quality.
          </Typography>
          <Box sx={{ 
            border: '2px dashed #ccc', 
            borderRadius: 2, 
            p: 4, 
            textAlign: 'center',
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              PFMEA Worksheet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Process FMEA analysis table with RPN calculations and recommended actions
            </Typography>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Risk Assessment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Risk priority assessment and mitigation strategies based on FMEA analysis.
          </Typography>
          <Box sx={{ 
            border: '2px dashed #ccc', 
            borderRadius: 2, 
            p: 4, 
            textAlign: 'center',
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Risk Matrix
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visual risk assessment matrix and prioritization dashboard
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
}