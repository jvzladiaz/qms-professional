export const CONTROL_PLAN_TYPES = {
  PROTOTYPE: {
    description: 'Prototype/Development phase control plan',
    color: '#2196f3',
    requirements: ['Design verification', 'Initial capability studies']
  },
  PRE_LAUNCH: {
    description: 'Pre-launch/Pre-production control plan',
    color: '#ff9800',
    requirements: ['Process validation', 'Production trial runs']
  },
  PRODUCTION: {
    description: 'Full production control plan',
    color: '#4caf50',
    requirements: ['Ongoing process control', 'Continuous monitoring']
  }
}

export const CONTROL_METHOD_TYPES = {
  SPC: {
    description: 'Statistical Process Control',
    requirements: ['Control charts', 'Capability studies'],
    dataType: 'variable'
  },
  INSPECTION: {
    description: 'Inspection/Verification',
    requirements: ['Go/No-go gages', 'Measurement systems'],
    dataType: 'both'
  },
  FUNCTIONAL_TEST: {
    description: 'Functional Testing',
    requirements: ['Test procedures', 'Test equipment'],
    dataType: 'attribute'
  },
  VISUAL_INSPECTION: {
    description: 'Visual Inspection',
    requirements: ['Visual standards', 'Lighting requirements'],
    dataType: 'attribute'
  },
  MEASUREMENT: {
    description: 'Dimensional Measurement',
    requirements: ['Measurement equipment', 'MSA studies'],
    dataType: 'variable'
  },
  GO_NO_GO: {
    description: 'Go/No-Go Check',
    requirements: ['Go/No-go gages', 'Calibration procedures'],
    dataType: 'attribute'
  }
}

export const STATISTICAL_METHODS = {
  XBAR_R: {
    name: 'X̄-R Chart',
    description: 'Average and Range chart for subgrouped data',
    dataType: 'variable',
    subgroupSize: '2-10'
  },
  XBAR_S: {
    name: 'X̄-S Chart',
    description: 'Average and Standard Deviation chart',
    dataType: 'variable',
    subgroupSize: '≥10'
  },
  X_MR: {
    name: 'X-mR Chart',
    description: 'Individual and Moving Range chart',
    dataType: 'variable',
    subgroupSize: '1'
  },
  P_CHART: {
    name: 'p Chart',
    description: 'Proportion defective chart',
    dataType: 'attribute',
    subgroupSize: 'variable'
  },
  NP_CHART: {
    name: 'np Chart',
    description: 'Number defective chart',
    dataType: 'attribute',
    subgroupSize: 'constant'
  },
  C_CHART: {
    name: 'c Chart',
    description: 'Count of defects chart',
    dataType: 'attribute',
    subgroupSize: 'constant'
  },
  U_CHART: {
    name: 'u Chart',
    description: 'Defects per unit chart',
    dataType: 'attribute',
    subgroupSize: 'variable'
  }
}

export const FREQUENCY_TYPES = {
  CONTINUOUS: {
    description: '100% inspection',
    example: 'Every part'
  },
  PERIODIC: {
    description: 'Time-based sampling',
    example: 'Every hour, shift, day'
  },
  BATCH: {
    description: 'Batch or lot sampling',
    example: 'Per batch/lot'
  },
  SETUP: {
    description: 'Setup verification',
    example: 'First piece, last piece'
  }
}

export const SPECIFICATION_TYPES = {
  VARIABLE: {
    description: 'Measurable characteristic',
    examples: ['Dimension', 'Weight', 'Temperature', 'Pressure'],
    units: true
  },
  ATTRIBUTE: {
    description: 'Pass/Fail characteristic',
    examples: ['Presence/Absence', 'Go/No-go', 'Function/No function'],
    units: false
  },
  VISUAL: {
    description: 'Visual characteristic',
    examples: ['Color', 'Surface finish', 'Appearance'],
    units: false
  }
}

export const REACTION_PLAN_TRIGGERS = {
  OUT_OF_SPEC: [
    'Single point outside specification limits',
    'Multiple consecutive points trending toward limits',
    'Process capability below requirements'
  ],
  CONTROL_CHART_RULES: [
    'One point beyond 3σ control limits',
    'Two of three points beyond 2σ limits',
    'Four of five points beyond 1σ limits',
    'Seven consecutive points on same side of centerline',
    'Seven consecutive points trending up or down'
  ],
  PROCESS_CHANGES: [
    'Material change',
    'Tooling change',
    'Operator change',
    'Setup change',
    'Environmental conditions change'
  ]
}