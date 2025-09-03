import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

interface TrendDataPoint {
  date: Date
  value: number
  label?: string
  metadata?: Record<string, any>
}

interface HeatMapData {
  x: string | number
  y: string | number
  value: number
  label?: string
  color?: string
}

interface RiskHeatMapData {
  processStep: string
  failureMode: string
  severity: number
  occurrence: number
  detection: number
  rpn: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface TrendAnalysis {
  metric: string
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  startDate: Date
  endDate: Date
  dataPoints: TrendDataPoint[]
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING'
  trendPercentage: number
  forecast?: TrendDataPoint[]
}

interface ProcessRiskAnalysis {
  processId: string
  processName: string
  totalFailureModes: number
  averageRPN: number
  highRiskCount: number
  criticalRiskCount: number
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  controlEffectiveness: number
  improvementOpportunities: string[]
}

interface ComparativeAnalysis {
  metric: string
  periods: Array<{
    label: string
    startDate: Date
    endDate: Date
    value: number
    change?: number
    changePercentage?: number
  }>
  bestPeriod: {
    label: string
    value: number
  }
  worstPeriod: {
    label: string
    value: number
  }
}

interface PredictiveInsights {
  riskPrediction: {
    futureHighRiskItems: number
    confidenceLevel: number
    timeframe: string
    recommendations: string[]
  }
  controlEffectivenessDecline: {
    controlsAtRisk: Array<{
      controlId: string
      description: string
      currentEffectiveness: number
      predictedEffectiveness: number
      timeToDecline: number
    }>
  }
  maintenanceRecommendations: Array<{
    processStep: string
    recommendation: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    estimatedImpact: number
  }>
}

interface AnalyticsFilter {
  projectIds?: string[]
  departmentIds?: string[]
  processTypes?: string[]
  dateRange: {
    startDate: Date
    endDate: Date
  }
  riskLevels?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[]
  complianceStandards?: string[]
}

class AdvancedAnalyticsService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Generate RPN trend analysis over time
   */
  async generateRPNTrendAnalysis(
    projectId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    lookbackDays: number = 90
  ): Promise<TrendAnalysis> {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000)

      // Get historical risk analytics data
      const historicalData = await this.prisma.riskAnalytics.findMany({
        where: {
          projectId,
          analysisDate: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { analysisDate: 'asc' }
      })

      // Group data by period
      const groupedData = this.groupDataByPeriod(historicalData, period)
      
      const dataPoints: TrendDataPoint[] = groupedData.map(group => ({
        date: group.date,
        value: group.averageRpn || 0,
        metadata: {
          totalRpn: group.totalRpn,
          highRiskItems: group.highRiskItems,
          criticalRiskItems: group.criticalRiskItems
        }
      }))

      // Calculate trend
      const { trend, trendPercentage } = this.calculateTrend(dataPoints)

      // Generate forecast
      const forecast = this.generateForecast(dataPoints, 4) // 4 periods ahead

      return {
        metric: 'Average RPN',
        period,
        startDate,
        endDate,
        dataPoints,
        trend,
        trendPercentage,
        forecast
      }

    } catch (error) {
      logger.error('Error generating RPN trend analysis:', error)
      throw error
    }
  }

  /**
   * Generate process risk heat map
   */
  async generateProcessRiskHeatMap(projectId: string): Promise<RiskHeatMapData[]> {
    try {
      const failureModes = await this.prisma.failureMode.findMany({
        where: {
          fmea: { projectId }
        },
        include: {
          effects: true,
          causes: {
            include: { controls: true }
          }
        }
      })

      const heatMapData: RiskHeatMapData[] = failureModes.map(failureMode => {
        const severity = failureMode.effects?.[0]?.severity || 0
        const occurrence = failureMode.causes?.[0]?.occurrence || 0
        const detection = failureMode.causes?.[0]?.controls?.[0]?.detection || 0
        const rpn = severity * occurrence * detection

        return {
          processStep: failureMode.processFunction || 'Unknown Process',
          failureMode: failureMode.description,
          severity,
          occurrence,
          detection,
          rpn,
          riskLevel: this.determineRiskLevel(rpn)
        }
      })

      return heatMapData

    } catch (error) {
      logger.error('Error generating process risk heat map:', error)
      throw error
    }
  }

  /**
   * Generate control effectiveness heat map
   */
  async generateControlEffectivenessHeatMap(projectId: string): Promise<HeatMapData[]> {
    try {
      const controls = await this.prisma.failureControl.findMany({
        where: {
          failureCause: {
            failureMode: {
              fmea: { projectId }
            }
          }
        },
        include: {
          failureCause: {
            include: {
              failureMode: true
            }
          }
        }
      })

      // Group controls by type and calculate effectiveness
      const controlGroups = new Map<string, { total: number, effectiveCount: number, detection: number[] }>()

      controls.forEach(control => {
        const controlType = this.categorizeControl(control.description)
        
        if (!controlGroups.has(controlType)) {
          controlGroups.set(controlType, { total: 0, effectiveCount: 0, detection: [] })
        }

        const group = controlGroups.get(controlType)!
        group.total++
        group.detection.push(control.detection || 0)
        
        // Consider control effective if detection <= 3
        if ((control.detection || 10) <= 3) {
          group.effectiveCount++
        }
      })

      const heatMapData: HeatMapData[] = []
      
      controlGroups.forEach((group, controlType) => {
        const effectiveness = (group.effectiveCount / group.total) * 100
        const averageDetection = group.detection.reduce((a, b) => a + b, 0) / group.detection.length

        heatMapData.push({
          x: controlType,
          y: 'Effectiveness',
          value: effectiveness,
          label: `${effectiveness.toFixed(1)}%`,
          color: this.getEffectivenessColor(effectiveness)
        })

        heatMapData.push({
          x: controlType,
          y: 'Detection Rating',
          value: averageDetection,
          label: averageDetection.toFixed(1),
          color: this.getDetectionColor(averageDetection)
        })
      })

      return heatMapData

    } catch (error) {
      logger.error('Error generating control effectiveness heat map:', error)
      throw error
    }
  }

  /**
   * Generate comparative analysis between time periods
   */
  async generateComparativeAnalysis(
    projectId: string,
    metric: 'rpn' | 'riskItems' | 'complianceScore' | 'actionItemCompletion'
  ): Promise<ComparativeAnalysis> {
    try {
      const now = new Date()
      const periods = [
        {
          label: 'Current Month',
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: now
        },
        {
          label: 'Previous Month',
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), 0)
        },
        {
          label: 'Same Month Last Year',
          startDate: new Date(now.getFullYear() - 1, now.getMonth(), 1),
          endDate: new Date(now.getFullYear() - 1, now.getMonth() + 1, 0)
        }
      ]

      const periodsWithValues = await Promise.all(
        periods.map(async (period, index) => {
          const value = await this.calculateMetricForPeriod(projectId, metric, period.startDate, period.endDate)
          
          let change = 0
          let changePercentage = 0
          
          if (index > 0) {
            const previousValue = await this.calculateMetricForPeriod(
              projectId, 
              metric, 
              periods[index - 1].startDate, 
              periods[index - 1].endDate
            )
            change = value - previousValue
            changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0
          }

          return {
            ...period,
            value,
            change,
            changePercentage
          }
        })
      )

      const values = periodsWithValues.map(p => p.value)
      const bestPeriod = periodsWithValues[values.indexOf(Math.max(...values))]
      const worstPeriod = periodsWithValues[values.indexOf(Math.min(...values))]

      return {
        metric: this.getMetricDisplayName(metric),
        periods: periodsWithValues,
        bestPeriod: {
          label: bestPeriod.label,
          value: bestPeriod.value
        },
        worstPeriod: {
          label: worstPeriod.label,
          value: worstPeriod.value
        }
      }

    } catch (error) {
      logger.error('Error generating comparative analysis:', error)
      throw error
    }
  }

  /**
   * Generate process-level risk analysis
   */
  async generateProcessRiskAnalysis(projectId: string): Promise<ProcessRiskAnalysis[]> {
    try {
      const processFlows = await this.prisma.processFlow.findMany({
        where: { projectId },
        include: {
          processSteps: true
        }
      })

      const analysisResults: ProcessRiskAnalysis[] = []

      for (const processFlow of processFlows) {
        // Get failure modes for this process
        const failureModes = await this.prisma.failureMode.findMany({
          where: {
            fmea: { projectId },
            processFunction: { in: processFlow.processSteps.map(step => step.name) }
          },
          include: {
            effects: true,
            causes: {
              include: { controls: true }
            }
          }
        })

        if (failureModes.length === 0) continue

        const rpnValues = failureModes.map(fm => this.calculateRPN(fm))
        const averageRPN = rpnValues.reduce((a, b) => a + b, 0) / rpnValues.length

        const riskDistribution = {
          low: rpnValues.filter(rpn => rpn <= 100).length,
          medium: rpnValues.filter(rpn => rpn > 100 && rpn <= 200).length,
          high: rpnValues.filter(rpn => rpn > 200 && rpn <= 300).length,
          critical: rpnValues.filter(rpn => rpn > 300).length
        }

        const controlEffectiveness = this.calculateControlEffectiveness(failureModes)
        const improvementOpportunities = this.identifyImprovementOpportunities(failureModes, averageRPN)

        analysisResults.push({
          processId: processFlow.id,
          processName: processFlow.name,
          totalFailureModes: failureModes.length,
          averageRPN,
          highRiskCount: riskDistribution.high,
          criticalRiskCount: riskDistribution.critical,
          riskDistribution,
          controlEffectiveness,
          improvementOpportunities
        })
      }

      return analysisResults.sort((a, b) => b.averageRPN - a.averageRPN)

    } catch (error) {
      logger.error('Error generating process risk analysis:', error)
      throw error
    }
  }

  /**
   * Generate predictive insights using historical data
   */
  async generatePredictiveInsights(projectId: string): Promise<PredictiveInsights> {
    try {
      // Get historical risk data for trend analysis
      const historicalRiskData = await this.prisma.riskAnalytics.findMany({
        where: { projectId },
        orderBy: { analysisDate: 'asc' },
        take: 12 // Last 12 data points
      })

      // Predict future high-risk items
      const riskTrend = this.calculateRiskTrend(historicalRiskData)
      const futureHighRiskItems = Math.max(0, Math.round(
        riskTrend.currentHighRisk + (riskTrend.monthlyIncrease * 3)
      ))

      // Analyze control effectiveness decline
      const controlsAtRisk = await this.predictControlEffectivenessDecline(projectId)

      // Generate maintenance recommendations
      const maintenanceRecommendations = await this.generateMaintenanceRecommendations(projectId)

      return {
        riskPrediction: {
          futureHighRiskItems,
          confidenceLevel: riskTrend.confidence,
          timeframe: '3 months',
          recommendations: this.generateRiskRecommendations(futureHighRiskItems, riskTrend)
        },
        controlEffectivenessDecline: {
          controlsAtRisk
        },
        maintenanceRecommendations
      }

    } catch (error) {
      logger.error('Error generating predictive insights:', error)
      throw error
    }
  }

  /**
   * Generate compliance trend analysis
   */
  async generateComplianceTrendAnalysis(
    filter: AnalyticsFilter,
    standard: 'IATF_16949' | 'ISO_9001' | 'AIAG_VDA'
  ): Promise<TrendAnalysis> {
    try {
      const complianceReports = await this.prisma.complianceReport.findMany({
        where: {
          projectId: { in: filter.projectIds },
          generatedAt: {
            gte: filter.dateRange.startDate,
            lte: filter.dateRange.endDate
          },
          standardType: standard
        },
        orderBy: { generatedAt: 'asc' }
      })

      const dataPoints: TrendDataPoint[] = complianceReports.map(report => ({
        date: report.generatedAt,
        value: report.overallScore || 0,
        metadata: {
          reportId: report.id,
          findings: report.findings?.length || 0,
          nonCompliantItems: report.nonCompliantItems || 0
        }
      }))

      const { trend, trendPercentage } = this.calculateTrend(dataPoints)
      const forecast = this.generateForecast(dataPoints, 3)

      return {
        metric: `${standard} Compliance Score`,
        period: 'monthly',
        startDate: filter.dateRange.startDate,
        endDate: filter.dateRange.endDate,
        dataPoints,
        trend,
        trendPercentage,
        forecast
      }

    } catch (error) {
      logger.error('Error generating compliance trend analysis:', error)
      throw error
    }
  }

  /**
   * Helper methods
   */
  private groupDataByPeriod(data: any[], period: string): any[] {
    const grouped = new Map()
    
    data.forEach(item => {
      const date = new Date(item.analysisDate)
      let key: string

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]
          break
        case 'weekly':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
          key = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: new Date(key),
          items: []
        })
      }
      
      grouped.get(key).items.push(item)
    })

    return Array.from(grouped.values()).map(group => ({
      date: group.date,
      totalRpn: group.items.reduce((sum: number, item: any) => sum + (item.totalRpn || 0), 0) / group.items.length,
      averageRpn: group.items.reduce((sum: number, item: any) => sum + (item.averageRpn || 0), 0) / group.items.length,
      highRiskItems: group.items.reduce((sum: number, item: any) => sum + (item.highRiskItems || 0), 0) / group.items.length,
      criticalRiskItems: group.items.reduce((sum: number, item: any) => sum + (item.criticalRiskItems || 0), 0) / group.items.length
    }))
  }

  private calculateTrend(dataPoints: TrendDataPoint[]): { trend: 'IMPROVING' | 'STABLE' | 'WORSENING'; trendPercentage: number } {
    if (dataPoints.length < 2) {
      return { trend: 'STABLE', trendPercentage: 0 }
    }

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2))
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2))

    const firstHalfAverage = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length
    const secondHalfAverage = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length

    const change = secondHalfAverage - firstHalfAverage
    const changePercentage = firstHalfAverage !== 0 ? (change / firstHalfAverage) * 100 : 0

    let trend: 'IMPROVING' | 'STABLE' | 'WORSENING'
    if (Math.abs(changePercentage) < 5) {
      trend = 'STABLE'
    } else if (changePercentage < 0) {
      trend = 'IMPROVING' // Lower values are better for risk metrics
    } else {
      trend = 'WORSENING'
    }

    return { trend, trendPercentage: Math.abs(changePercentage) }
  }

  private generateForecast(dataPoints: TrendDataPoint[], periods: number): TrendDataPoint[] {
    if (dataPoints.length < 3) return []

    // Simple linear regression for forecasting
    const n = dataPoints.length
    const sumX = dataPoints.reduce((sum, _, index) => sum + index, 0)
    const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0)
    const sumXY = dataPoints.reduce((sum, point, index) => sum + (index * point.value), 0)
    const sumXX = dataPoints.reduce((sum, _, index) => sum + (index * index), 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    const forecast: TrendDataPoint[] = []
    const lastDate = dataPoints[dataPoints.length - 1].date

    for (let i = 1; i <= periods; i++) {
      const futureIndex = dataPoints.length + i - 1
      const predictedValue = slope * futureIndex + intercept
      const futureDate = new Date(lastDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000)) // Weekly intervals

      forecast.push({
        date: futureDate,
        value: Math.max(0, predictedValue), // Ensure non-negative values
        label: 'Forecast'
      })
    }

    return forecast
  }

  private determineRiskLevel(rpn: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (rpn <= 100) return 'LOW'
    if (rpn <= 200) return 'MEDIUM'
    if (rpn <= 300) return 'HIGH'
    return 'CRITICAL'
  }

  private categorizeControl(description: string): string {
    const lowerDesc = description.toLowerCase()
    
    if (lowerDesc.includes('inspection') || lowerDesc.includes('check')) return 'Inspection'
    if (lowerDesc.includes('test') || lowerDesc.includes('measurement')) return 'Testing'
    if (lowerDesc.includes('training') || lowerDesc.includes('procedure')) return 'Procedural'
    if (lowerDesc.includes('machine') || lowerDesc.includes('equipment')) return 'Equipment'
    if (lowerDesc.includes('software') || lowerDesc.includes('system')) return 'Software'
    
    return 'Other'
  }

  private getEffectivenessColor(effectiveness: number): string {
    if (effectiveness >= 80) return '#4CAF50' // Green
    if (effectiveness >= 60) return '#FFC107' // Yellow
    if (effectiveness >= 40) return '#FF9800' // Orange
    return '#F44336' // Red
  }

  private getDetectionColor(detection: number): string {
    if (detection <= 3) return '#4CAF50' // Green - Good detection
    if (detection <= 6) return '#FFC107' // Yellow - Moderate detection
    if (detection <= 8) return '#FF9800' // Orange - Poor detection
    return '#F44336' // Red - Very poor detection
  }

  private async calculateMetricForPeriod(
    projectId: string,
    metric: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    switch (metric) {
      case 'rpn':
        const riskAnalytics = await this.prisma.riskAnalytics.findFirst({
          where: {
            projectId,
            analysisDate: { gte: startDate, lte: endDate }
          },
          orderBy: { analysisDate: 'desc' }
        })
        return riskAnalytics?.averageRpn || 0

      case 'complianceScore':
        const complianceReport = await this.prisma.complianceReport.findFirst({
          where: {
            projectId,
            generatedAt: { gte: startDate, lte: endDate }
          },
          orderBy: { generatedAt: 'desc' }
        })
        return complianceReport?.overallScore || 0

      default:
        return 0
    }
  }

  private getMetricDisplayName(metric: string): string {
    switch (metric) {
      case 'rpn': return 'Average RPN'
      case 'riskItems': return 'High Risk Items'
      case 'complianceScore': return 'Compliance Score'
      case 'actionItemCompletion': return 'Action Item Completion Rate'
      default: return metric
    }
  }

  private calculateRPN(failureMode: any): number {
    const severity = failureMode.effects?.[0]?.severity || 0
    const occurrence = failureMode.causes?.[0]?.occurrence || 0
    const detection = failureMode.causes?.[0]?.controls?.[0]?.detection || 0
    return severity * occurrence * detection
  }

  private calculateControlEffectiveness(failureModes: any[]): number {
    const totalControls = failureModes.reduce((total, fm) => {
      return total + (fm.causes?.reduce((causeTotal: number, cause: any) => {
        return causeTotal + (cause.controls?.length || 0)
      }, 0) || 0)
    }, 0)

    const effectiveControls = failureModes.reduce((effective, fm) => {
      return effective + (fm.causes?.reduce((causeEffective: number, cause: any) => {
        return causeEffective + (cause.controls?.filter((c: any) => (c.detection || 10) <= 3).length || 0)
      }, 0) || 0)
    }, 0)

    return totalControls > 0 ? (effectiveControls / totalControls) * 100 : 0
  }

  private identifyImprovementOpportunities(failureModes: any[], averageRPN: number): string[] {
    const opportunities: string[] = []

    if (averageRPN > 150) {
      opportunities.push('High average RPN indicates need for risk reduction')
    }

    const highSeverityCount = failureModes.filter(fm => 
      (fm.effects?.[0]?.severity || 0) >= 8
    ).length

    if (highSeverityCount > failureModes.length * 0.3) {
      opportunities.push('Focus on severity reduction through design changes')
    }

    const poorDetectionCount = failureModes.filter(fm =>
      (fm.causes?.[0]?.controls?.[0]?.detection || 10) >= 7
    ).length

    if (poorDetectionCount > failureModes.length * 0.4) {
      opportunities.push('Improve detection methods and controls')
    }

    return opportunities
  }

  private calculateRiskTrend(historicalData: any[]): any {
    if (historicalData.length < 3) {
      return {
        currentHighRisk: 0,
        monthlyIncrease: 0,
        confidence: 0
      }
    }

    const recentData = historicalData.slice(-6) // Last 6 data points
    const currentHighRisk = recentData[recentData.length - 1]?.highRiskItems || 0
    
    // Calculate monthly increase
    const monthlyChanges = []
    for (let i = 1; i < recentData.length; i++) {
      const change = (recentData[i].highRiskItems || 0) - (recentData[i-1].highRiskItems || 0)
      monthlyChanges.push(change)
    }

    const monthlyIncrease = monthlyChanges.reduce((sum, change) => sum + change, 0) / monthlyChanges.length
    const confidence = Math.min(90, Math.max(10, 100 - (Math.abs(monthlyIncrease) * 10)))

    return {
      currentHighRisk,
      monthlyIncrease,
      confidence
    }
  }

  private async predictControlEffectivenessDecline(projectId: string): Promise<any[]> {
    // Simplified implementation - in reality, this would use ML models
    const controls = await this.prisma.failureControl.findMany({
      where: {
        failureCause: {
          failureMode: {
            fmea: { projectId }
          }
        }
      },
      include: {
        failureCause: {
          include: {
            failureMode: true
          }
        }
      }
    })

    return controls
      .filter(control => (control.detection || 0) >= 6) // Controls with poor detection
      .slice(0, 5) // Top 5 at-risk controls
      .map(control => ({
        controlId: control.id,
        description: control.description,
        currentEffectiveness: Math.max(0, 100 - ((control.detection || 0) * 10)),
        predictedEffectiveness: Math.max(0, 100 - ((control.detection || 0) * 10) - 15),
        timeToDecline: Math.floor(Math.random() * 12) + 1 // 1-12 months
      }))
  }

  private async generateMaintenanceRecommendations(projectId: string): Promise<any[]> {
    // Simplified implementation
    const recommendations = [
      {
        processStep: 'Quality Inspection',
        recommendation: 'Upgrade inspection equipment for better detection capability',
        priority: 'HIGH' as const,
        estimatedImpact: 25
      },
      {
        processStep: 'Material Handling',
        recommendation: 'Implement automated handling system to reduce human error',
        priority: 'MEDIUM' as const,
        estimatedImpact: 15
      },
      {
        processStep: 'Final Assembly',
        recommendation: 'Add torque verification sensors to critical joints',
        priority: 'HIGH' as const,
        estimatedImpact: 30
      }
    ]

    return recommendations
  }

  private generateRiskRecommendations(futureHighRiskItems: number, riskTrend: any): string[] {
    const recommendations: string[] = []

    if (futureHighRiskItems > riskTrend.currentHighRisk) {
      recommendations.push('Implement proactive risk mitigation measures')
      recommendations.push('Increase frequency of risk assessments')
    }

    if (riskTrend.monthlyIncrease > 2) {
      recommendations.push('Focus on root cause analysis of increasing risk trends')
      recommendations.push('Consider additional control measures for high-occurrence failure modes')
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current risk management practices')
    }

    return recommendations
  }
}

export default AdvancedAnalyticsService