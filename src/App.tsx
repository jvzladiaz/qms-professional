import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import ProcessFlow from '@/pages/ProcessFlow'
import FMEA from '@/pages/FMEA'
import ControlPlan from '@/pages/ControlPlan'

function App() {
  return (
    <Box sx={{ height: '100vh' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/process-flow" element={<ProcessFlow />} />
          <Route path="/fmea" element={<FMEA />} />
          <Route path="/control-plan" element={<ControlPlan />} />
        </Routes>
      </Layout>
    </Box>
  )
}

export default App