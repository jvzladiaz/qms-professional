import { Grid, Paper, Typography, Box, Card, CardContent } from '@mui/material'
import {
  AccountTree as ProcessFlowIcon,
  BugReport as FMEAIcon,
  Assignment as ControlPlanIcon,
  TrendingUp as MetricsIcon,
} from '@mui/icons-material'

const statsCards = [
  {
    title: 'Active Process Flows',
    value: '12',
    icon: <ProcessFlowIcon sx={{ fontSize: 40 }} />,
    color: '#1976d2',
  },
  {
    title: 'FMEA Analyses',
    value: '8',
    icon: <FMEAIcon sx={{ fontSize: 40 }} />,
    color: '#dc004e',
  },
  {
    title: 'Control Plans',
    value: '15',
    icon: <ControlPlanIcon sx={{ fontSize: 40 }} />,
    color: '#2e7d32',
  },
  {
    title: 'Quality Metrics',
    value: '98.5%',
    icon: <MetricsIcon sx={{ fontSize: 40 }} />,
    color: '#ed6c02',
  },
]

export default function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Quality Management System Overview
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {statsCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="h6">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recent QMS activities and updates will be displayed here.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quick action buttons and shortcuts will be available here.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}