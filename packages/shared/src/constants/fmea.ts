export const FMEA_SEVERITY_RATINGS = {
  1: { description: 'No effect', criteria: 'No discernible effect on product performance' },
  2: { description: 'Very minor', criteria: 'Very minor effect on product performance, customer unlikely to notice' },
  3: { description: 'Minor', criteria: 'Minor effect on product performance, customer may notice slight deterioration' },
  4: { description: 'Very low', criteria: 'Very low effect on product performance, customer notices some deterioration' },
  5: { description: 'Low', criteria: 'Low effect on product performance, customer dissatisfied' },
  6: { description: 'Moderate', criteria: 'Moderate effect on product performance, customer somewhat dissatisfied' },
  7: { description: 'High', criteria: 'High degree of customer dissatisfaction due to nature of failure' },
  8: { description: 'Very high', criteria: 'Very high degree of customer dissatisfaction, product inoperable but safe' },
  9: { description: 'Hazardous with warning', criteria: 'Hazardous effect, potential safety issue with warning' },
  10: { description: 'Hazardous without warning', criteria: 'Hazardous effect, potential safety issue without warning' }
}

export const FMEA_OCCURRENCE_RATINGS = {
  1: { description: 'Remote', criteria: 'Failure unlikely, no known causes', probability: '< 1 in 1,500,000' },
  2: { description: 'Very low', criteria: 'Very few failures', probability: '1 in 150,000' },
  3: { description: 'Very low', criteria: 'Very few failures', probability: '1 in 30,000' },
  4: { description: 'Low', criteria: 'Relatively few failures', probability: '1 in 4,500' },
  5: { description: 'Low', criteria: 'Relatively few failures', probability: '1 in 800' },
  6: { description: 'Moderate', criteria: 'Occasional failures', probability: '1 in 150' },
  7: { description: 'Moderate', criteria: 'Occasional failures', probability: '1 in 50' },
  8: { description: 'High', criteria: 'Repeated failures', probability: '1 in 15' },
  9: { description: 'Very high', criteria: 'Failure is almost inevitable', probability: '1 in 6' },
  10: { description: 'Very high', criteria: 'Failure is almost certain', probability: '> 1 in 3' }
}

export const FMEA_DETECTION_RATINGS = {
  1: { description: 'Very high', criteria: 'Design control will almost certainly detect potential cause/mechanism' },
  2: { description: 'Very high', criteria: 'Design control has a very high chance of detecting potential cause/mechanism' },
  3: { description: 'High', criteria: 'Design control has a high chance of detecting potential cause/mechanism' },
  4: { description: 'Moderately high', criteria: 'Design control has a moderately high chance of detecting potential cause/mechanism' },
  5: { description: 'Moderate', criteria: 'Design control may detect potential cause/mechanism' },
  6: { description: 'Low', criteria: 'Design control has a low chance of detecting potential cause/mechanism' },
  7: { description: 'Very low', criteria: 'Design control has a very low chance of detecting potential cause/mechanism' },
  8: { description: 'Remote', criteria: 'Design control has a remote chance of detecting potential cause/mechanism' },
  9: { description: 'Very remote', criteria: 'Design control has a very remote chance of detecting potential cause/mechanism' },
  10: { description: 'Absolute uncertainty', criteria: 'Design control will not and/or cannot detect potential cause/mechanism' }
}

export const RPN_RISK_LEVELS = {
  LOW: { min: 1, max: 40, color: '#4caf50' },
  MEDIUM: { min: 41, max: 100, color: '#ff9800' },
  HIGH: { min: 101, max: 200, color: '#ff5722' },
  VERY_HIGH: { min: 201, max: 1000, color: '#f44336' }
}

export const AIAG_VDA_ACTION_PRIORITY_MATRIX = {
  S9_S10: {
    O1_O3: { D1_D3: 'M', D4_D6: 'M', D7_D10: 'H' },
    O4_O6: { D1_D3: 'M', D4_D6: 'H', D7_D10: 'H' },
    O7_O10: { D1_D3: 'H', D4_D6: 'H', D7_D10: 'H' }
  },
  S7_S8: {
    O1_O3: { D1_D3: 'L', D4_D6: 'M', D7_D10: 'M' },
    O4_O6: { D1_D3: 'M', D4_D6: 'M', D7_D10: 'H' },
    O7_O10: { D1_D3: 'M', D4_D6: 'H', D7_D10: 'H' }
  },
  S4_S6: {
    O1_O3: { D1_D3: 'L', D4_D6: 'L', D7_D10: 'M' },
    O4_O6: { D1_D3: 'L', D4_D6: 'M', D7_D10: 'M' },
    O7_O10: { D1_D3: 'M', D4_D6: 'M', D7_D10: 'H' }
  },
  S1_S3: {
    O1_O3: { D1_D3: 'L', D4_D6: 'L', D7_D10: 'L' },
    O4_O6: { D1_D3: 'L', D4_D6: 'L', D7_D10: 'M' },
    O7_O10: { D1_D3: 'L', D4_D6: 'M', D7_D10: 'M' }
  }
}