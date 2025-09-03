export const calculateRPN = (severity: number, occurrence: number, detection: number): number => {
  return severity * occurrence * detection
}

export const calculateActionPriority = (
  severity: number,
  occurrence: number,
  detection: number
): 'H' | 'M' | 'L' => {
  if (severity >= 9) {
    if (occurrence >= 7 || detection >= 7) return 'H'
    if (occurrence >= 4 || detection >= 4) return 'H'
    return 'M'
  }
  
  if (severity >= 7) {
    if (occurrence >= 7 && detection >= 7) return 'H'
    if (occurrence >= 4 && detection >= 7) return 'H'
    if (occurrence >= 7 && detection >= 4) return 'H'
    if (occurrence >= 4 && detection >= 4) return 'M'
    return 'L'
  }
  
  if (severity >= 4) {
    if (occurrence >= 7 && detection >= 7) return 'H'
    if (occurrence >= 4 && detection >= 7) return 'M'
    if (occurrence >= 7 && detection >= 4) return 'M'
    return 'L'
  }
  
  if (occurrence >= 7 && detection >= 7) return 'M'
  return 'L'
}

export const calculateCpk = (
  mean: number,
  stdDev: number,
  lowerSpec: number,
  upperSpec: number
): number => {
  const cpu = (upperSpec - mean) / (3 * stdDev)
  const cpl = (mean - lowerSpec) / (3 * stdDev)
  return Math.min(cpu, cpl)
}

export const calculateCp = (
  stdDev: number,
  lowerSpec: number,
  upperSpec: number
): number => {
  return (upperSpec - lowerSpec) / (6 * stdDev)
}

export const calculatePpk = (
  data: number[],
  lowerSpec: number,
  upperSpec: number
): number => {
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length
  const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (data.length - 1)
  const stdDev = Math.sqrt(variance)
  
  return calculateCpk(mean, stdDev, lowerSpec, upperSpec)
}

export const calculateControlLimits = (
  data: number[],
  subgroupSize: number = 1
): { ucl: number; lcl: number; centerline: number } => {
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length
  
  if (subgroupSize === 1) {
    const movingRanges = []
    for (let i = 1; i < data.length; i++) {
      movingRanges.push(Math.abs(data[i] - data[i - 1]))
    }
    const meanRange = movingRanges.reduce((sum, value) => sum + value, 0) / movingRanges.length
    const d2 = 1.128
    const stdDev = meanRange / d2
    
    return {
      ucl: mean + 3 * stdDev,
      lcl: mean - 3 * stdDev,
      centerline: mean
    }
  } else {
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (data.length - 1)
    const stdDev = Math.sqrt(variance)
    
    return {
      ucl: mean + 3 * stdDev / Math.sqrt(subgroupSize),
      lcl: mean - 3 * stdDev / Math.sqrt(subgroupSize),
      centerline: mean
    }
  }
}

export const calculateDefectRate = (defects: number, total: number): number => {
  return total > 0 ? (defects / total) * 100 : 0
}

export const calculateYield = (goodParts: number, totalParts: number): number => {
  return totalParts > 0 ? (goodParts / totalParts) * 100 : 0
}

export const calculateOEE = (
  availability: number,
  performance: number,
  quality: number
): number => {
  return (availability * performance * quality) / 10000
}

export const calculateSigmaLevel = (defectsPerMillion: number): number => {
  if (defectsPerMillion <= 0) return 6
  if (defectsPerMillion >= 1000000) return 0
  
  const sigmaLevels = [
    { dpm: 3.4, sigma: 6 },
    { dpm: 32, sigma: 5 },
    { dpm: 233, sigma: 4.5 },
    { dpm: 1350, sigma: 4 },
    { dpm: 6210, sigma: 3.5 },
    { dpm: 22750, sigma: 3 },
    { dpm: 66807, sigma: 2.5 },
    { dpm: 158655, sigma: 2 },
    { dpm: 308538, sigma: 1.5 },
    { dpm: 500000, sigma: 1 },
  ]
  
  for (const level of sigmaLevels) {
    if (defectsPerMillion <= level.dpm) {
      return level.sigma
    }
  }
  
  return 0
}

export const calculateConfidenceInterval = (
  mean: number,
  stdDev: number,
  sampleSize: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } => {
  const tValue = getTValue(sampleSize - 1, confidenceLevel)
  const marginOfError = tValue * (stdDev / Math.sqrt(sampleSize))
  
  return {
    lower: mean - marginOfError,
    upper: mean + marginOfError
  }
}

const getTValue = (degreesOfFreedom: number, confidenceLevel: number): number => {
  const tTable: Record<number, Record<number, number>> = {
    95: {
      1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
      10: 2.228, 15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042
    },
    99: {
      1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032,
      10: 3.169, 15: 2.947, 20: 2.845, 25: 2.787, 30: 2.750
    }
  }
  
  const confidence = Math.round(confidenceLevel * 100)
  const table = tTable[confidence]
  
  if (!table) return 1.96
  
  if (degreesOfFreedom in table) {
    return table[degreesOfFreedom]
  }
  
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b)
  for (const key of keys) {
    if (degreesOfFreedom <= key) {
      return table[key]
    }
  }
  
  return 1.96
}