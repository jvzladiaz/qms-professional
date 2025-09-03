export const PROCESS_STEP_TYPES = {
  OPERATION: {
    symbol: '○',
    color: '#2196f3',
    description: 'Processing or manufacturing operation'
  },
  INSPECTION: {
    symbol: '□',
    color: '#4caf50',
    description: 'Quality inspection or verification'
  },
  TRANSPORT: {
    symbol: '→',
    color: '#ff9800',
    description: 'Movement or transportation'
  },
  DELAY: {
    symbol: 'D',
    color: '#f44336',
    description: 'Waiting or delay'
  },
  STORAGE: {
    symbol: '▽',
    color: '#9c27b0',
    description: 'Storage or inventory'
  },
  DECISION: {
    symbol: '◇',
    color: '#795548',
    description: 'Decision point or branch'
  },
  START: {
    symbol: '●',
    color: '#4caf50',
    description: 'Process start'
  },
  END: {
    symbol: '●',
    color: '#f44336',
    description: 'Process end'
  }
}

export const RESOURCE_TYPES = {
  MACHINE: {
    icon: 'precision_manufacturing',
    color: '#1976d2',
    description: 'Manufacturing machine or equipment'
  },
  TOOL: {
    icon: 'build',
    color: '#388e3c',
    description: 'Tool or fixture'
  },
  OPERATOR: {
    icon: 'person',
    color: '#f57c00',
    description: 'Human operator'
  },
  MATERIAL: {
    icon: 'inventory',
    color: '#7b1fa2',
    description: 'Raw material or component'
  },
  EQUIPMENT: {
    icon: 'hardware',
    color: '#5d4037',
    description: 'Support equipment'
  }
}

export const CONTROL_POINT_TYPES = {
  CRITICAL: {
    priority: 1,
    color: '#f44336',
    description: 'Critical control point - must be monitored'
  },
  MAJOR: {
    priority: 2,
    color: '#ff9800',
    description: 'Major control point - important monitoring'
  },
  MINOR: {
    priority: 3,
    color: '#2196f3',
    description: 'Minor control point - routine monitoring'
  },
  INFORMATIONAL: {
    priority: 4,
    color: '#4caf50',
    description: 'Informational - data collection only'
  }
}

export const PROCESS_FLOW_TEMPLATES = [
  {
    name: 'Basic Manufacturing Process',
    description: 'Standard manufacturing process flow template',
    steps: ['Material Preparation', 'Processing', 'Inspection', 'Packaging']
  },
  {
    name: 'Quality Inspection Process',
    description: 'Quality inspection and testing process',
    steps: ['Incoming Inspection', 'Testing', 'Documentation', 'Disposition']
  },
  {
    name: 'Assembly Process',
    description: 'Product assembly process template',
    steps: ['Component Prep', 'Sub-Assembly', 'Final Assembly', 'Testing', 'Packaging']
  }
]