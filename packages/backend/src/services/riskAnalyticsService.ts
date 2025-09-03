import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

export interface ProjectRiskSummary {
  projectId: string
  projectName: string
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  totalRpn: number
  averageRpn: number
  highRiskItems: number
  criticalItems: number
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  complianceScore: number
  lastUpdated: Date
}

export interface RiskTrendData {
  date: string
  totalRpn: number
  averageRpn: number
  highRiskItems: number
  newRisks: number
  mitigatedRisks: number
  complianceScore: number
}

export interface ProcessRiskBreakdown {
  processStepId: string
  processStepName: string
  associatedFailureModes: number
  totalRpn: number
  averageRpn: number
  highestRpn: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  controlEffectiveness: number
}

export interface ControlEffectivenessAnalysis {
  totalControls: number
  preventionControls: number
  detectionControls: number
  averageDetectionRating: number
  controlsWithoutOwners: number
  overdueControls: number
  effectivenessScore: number
  recommendations: string[]
}

export interface ComplianceAnalysis {
  overallScore: number
  aiagVdaCompliance: number
  missingRequirements: string[]
  nonConformances: {
    category: string
    count: number
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }[]
  improvementAreas: string[]
  nextAssessmentDue: Date
}

export interface DashboardKPIs {
  totalProjects: number
  activeProjects: number
  totalRiskItems: number
  highRiskItems: number
  overdueActions: number
  avgComplianceScore: number
  changesLastWeek: number
  pendingApprovals: number
}

class RiskAnalyticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate comprehensive risk analytics for a project
   */
  async generateProjectRiskAnalytics(projectId: string, analysisDate: Date = new Date()): Promise<void> {
    try {
      // Calculate current risk metrics
      const riskMetrics = await this.calculateRiskMetrics(projectId)
      
      // Get previous analysis for trend calculation
      const previousAnalysis = await this.prisma.riskAnalytics.findFirst({
        where: { 
          projectId,
          analysisDate: { lt: analysisDate }
        },
        orderBy: { analysisDate: 'desc' }
      })

      // Calculate trends
      const trends = this.calculateTrends(riskMetrics, previousAnalysis)
      
      // Calculate compliance score
      const complianceScore = await this.calculateComplianceScore(projectId)
      
      // Get process-level breakdown
      const processRiskBreakdown = await this.calculateProcessRiskBreakdown(projectId)
      
      // Get control effectiveness
      const controlEffectiveness = await this.calculateControlEffectiveness(projectId)

      // Create or update risk analytics record
      await this.prisma.riskAnalytics.upsert({
        where: {
          projectId_analysisDate: {
            projectId,
            analysisDate: new Date(analysisDate.toDateString()) // Date only, no time
          }
        },
        update: {
          ...riskMetrics,
          ...trends,
          complianceScore,
          ...controlEffectiveness,
          processRiskBreakdown,
          createdAt: new Date()
        },
        create: {
          projectId,
          analysisDate: new Date(analysisDate.toDateString()),
          ...riskMetrics,
          ...trends,
          complianceScore,
          ...controlEffectiveness,
          processRiskBreakdown
        }
      })

      logger.info(`Risk analytics generated for project ${projectId}`)
    } catch (error) {
      logger.error('Error generating project risk analytics:', error)
      throw error
    }
  }

  /**
   * Get project risk summary for dashboard
   */
  async getProjectRiskSummary(projectId: string): Promise<ProjectRiskSummary> {
    try {
      const [project, latestAnalytics] = await Promise.all([
        this.prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, name: true }
        }),
        this.prisma.riskAnalytics.findFirst({
          where: { projectId },
          orderBy: { analysisDate: 'desc' }
        })
      ])

      if (!project) {
        throw new Error('Project not found')
      }

      if (!latestAnalytics) {
        // Generate analytics if none exist
        await this.generateProjectRiskAnalytics(projectId)
        return this.getProjectRiskSummary(projectId)
      }

      // Determine overall risk level
      const overallRiskLevel = this.determineOverallRiskLevel(
        latestAnalytics.averageRpn.toNumber(),
        latestAnalytics.criticalItems,
        latestAnalytics.complianceScore.toNumber()
      )

      return {
        projectId: project.id,
        projectName: project.name,
        overallRiskLevel,
        totalRpn: latestAnalytics.totalRpnScore.toNumber(),
        averageRpn: latestAnalytics.averageRpn.toNumber(),
        highRiskItems: latestAnalytics.highRiskItems,
        criticalItems: latestAnalytics.criticalItems,
        riskDistribution: {
          low: latestAnalytics.lowRiskCount,
          medium: latestAnalytics.mediumRiskCount,
          high: latestAnalytics.highRiskCount,
          critical: latestAnalytics.criticalRiskCount
        },
        complianceScore: latestAnalytics.complianceScore.toNumber(),
        lastUpdated: latestAnalytics.createdAt
      }
    } catch (error) {
      logger.error('Error getting project risk summary:', error)
      throw error
    }
  }

  /**
   * Get risk trend data for charts
   */
  async getRiskTrendData(projectId: string, days: number = 30): Promise<RiskTrendData[]> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const analytics = await this.prisma.riskAnalytics.findMany({
        where: {
          projectId,
          analysisDate: { gte: startDate }
        },
        orderBy: { analysisDate: 'asc' }
      })

      return analytics.map(data => ({
        date: data.analysisDate.toISOString().split('T')[0],
        totalRpn: data.totalRpnScore.toNumber(),
        averageRpn: data.averageRpn.toNumber(),
        highRiskItems: data.highRiskItems,
        newRisks: data.newRisksAdded,
        mitigatedRisks: data.risksMitigated,
        complianceScore: data.complianceScore.toNumber()
      }))
    } catch (error) {
      logger.error('Error getting risk trend data:', error)
      throw error
    }
  }

  /**
   * Get process-level risk breakdown
   */
  async getProcessRiskBreakdown(projectId: string): Promise<ProcessRiskBreakdown[]> {
    try {
      const processSteps = await this.prisma.processStep.findMany({
        where: {
          processFlow: { projectId }
        },
        include: {
          primaryFailureModes: {
            include: {
              causes: {
                include: {
                  controls: true
                }
              }
            }
          }
        }
      })

      const breakdown: ProcessRiskBreakdown[] = []

      for (const step of processSteps) {
        const failureModes = step.primaryFailureModes
        let totalRpn = 0
        let highestRpn = 0
        let rpnCount = 0

        // Calculate RPN metrics for this process step
        failureModes.forEach(fm => {
          fm.causes.forEach(cause => {
            cause.controls.forEach(control => {
              const rpn = fm.severityRating * cause.occurrenceRating * control.detectionRating
              totalRpn += rpn
              rpnCount++
              if (rpn > highestRpn) highestRpn = rpn
            })
          })
        })

        const averageRpn = rpnCount > 0 ? totalRpn / rpnCount : 0
        const controlEffectiveness = this.calculateProcessControlEffectiveness(failureModes)

        breakdown.push({
          processStepId: step.id,
          processStepName: step.name,
          associatedFailureModes: failureModes.length,
          totalRpn,
          averageRpn,
          highestRpn,
          riskLevel: this.getRiskLevelFromRpn(highestRpn),
          controlEffectiveness
        })
      }

      return breakdown.sort((a, b) => b.highestRpn - a.highestRpn)
    } catch (error) {
      logger.error('Error getting process risk breakdown:', error)
      throw error
    }
  }

  /**
   * Get control effectiveness analysis
   */
  async getControlEffectivenessAnalysis(projectId: string): Promise<ControlEffectivenessAnalysis> {
    try {
      const controls = await this.prisma.failureControl.findMany({
        where: {
          failureCause: {
            failureMode: {
              fmea: { projectId }
            }
          }
        }
      })

      const totalControls = controls.length
      const preventionControls = controls.filter(c => c.controlType === 'PREVENTION').length
      const detectionControls = controls.filter(c => c.controlType === 'DETECTION').length
      
      const averageDetectionRating = controls.length > 0 
        ? controls.reduce((sum, c) => sum + c.detectionRating, 0) / controls.length
        : 0

      const controlsWithoutOwners = controls.filter(c => !c.responsibility).length
      const overdueControls = 0 // Would need additional logic for due dates

      const effectivenessScore = this.calculateOverallControlEffectiveness(
        controls,
        preventionControls,
        detectionControls,
        controlsWithoutOwners
      )

      const recommendations = this.generateControlRecommendations(
        effectivenessScore,
        controlsWithoutOwners,
        preventionControls,
        detectionControls,
        averageDetectionRating
      )

      return {
        totalControls,
        preventionControls,
        detectionControls,
        averageDetectionRating,
        controlsWithoutOwners,
        overdueControls,
        effectivenessScore,
        recommendations
      }
    } catch (error) {
      logger.error('Error getting control effectiveness analysis:', error)
      throw error
    }
  }

  /**
   * Get compliance analysis
   */
  async getComplianceAnalysis(projectId: string): Promise<ComplianceAnalysis> {
    try {
      const latestReport = await this.prisma.complianceReport.findFirst({
        where: { projectId },
        orderBy: { generatedAt: 'desc' }
      })

      if (!latestReport) {
        // Generate basic compliance analysis
        const overallScore = await this.calculateComplianceScore(projectId)
        return {
          overallScore,
          aiagVdaCompliance: overallScore,
          missingRequirements: [],
          nonConformances: [],
          improvementAreas: ['Complete compliance assessment required'],
          nextAssessmentDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        }
      }

      const requirements = latestReport.requirementAssessments as any[] || []
      const nonConformances = latestReport.nonConformances as any[] || []
      
      const missingRequirements = requirements
        .filter(req => req.status !== 'COMPLIANT')
        .map(req => req.requirement)

      const improvementAreas = (latestReport.recommendations as any[] || [])
        .map(rec => rec.description || rec)

      return {
        overallScore: latestReport.overallComplianceScore?.toNumber() || 0,
        aiagVdaCompliance: latestReport.overallComplianceScore?.toNumber() || 0,
        missingRequirements,
        nonConformances: nonConformances.map(nc => ({
          category: nc.category || 'General',
          count: nc.count || 1,
          severity: nc.severity || 'MEDIUM'
        })),
        improvementAreas,
        nextAssessmentDue: latestReport.nextAssessmentDue || new Date()
      }
    } catch (error) {
      logger.error('Error getting compliance analysis:', error)
      throw error
    }
  }

  /**
   * Get dashboard KPIs
   */
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    try {
      const [
        totalProjects,
        activeProjects,
        riskData,
        overdueActions,
        avgCompliance,
        recentChanges,
        pendingApprovals
      ] = await Promise.all([
        this.prisma.project.count(),
        this.prisma.project.count({ where: { status: 'ACTIVE' } }),
        this.getSystemRiskData(),
        this.getOverdueActions(),
        this.getAverageComplianceScore(),
        this.getRecentChangesCount(),
        this.getPendingApprovalsCount()
      ])

      return {
        totalProjects,
        activeProjects,
        totalRiskItems: riskData.totalRiskItems,
        highRiskItems: riskData.highRiskItems,
        overdueActions,
        avgComplianceScore: avgCompliance,
        changesLastWeek: recentChanges,
        pendingApprovals
      }
    } catch (error) {
      logger.error('Error getting dashboard KPIs:', error)
      throw error
    }
  }

  /**
   * Calculate current risk metrics for a project
   */
  private async calculateRiskMetrics(projectId: string) {
    const failureModes = await this.prisma.failureMode.findMany({
      where: {
        fmea: { projectId }
      },
      include: {
        causes: {
          include: {
            controls: true
          }
        }
      }
    })

    let totalRpnScore = 0
    let rpnCount = 0
    let lowRiskCount = 0
    let mediumRiskCount = 0
    let highRiskCount = 0
    let criticalRiskCount = 0

    failureModes.forEach(fm => {
      fm.causes.forEach(cause => {
        cause.controls.forEach(control => {
          const rpn = fm.severityRating * cause.occurrenceRating * control.detectionRating
          totalRpnScore += rpn
          rpnCount++

          if (rpn <= 49) lowRiskCount++
          else if (rpn <= 99) mediumRiskCount++
          else if (rpn <= 299) highRiskCount++
          else criticalRiskCount++
        })
      })
    })

    const averageRpn = rpnCount > 0 ? totalRpnScore / rpnCount : 0
    const highRiskItems = highRiskCount + criticalRiskCount

    return {
      totalFailureModes: failureModes.length,
      totalRpnScore,
      averageRpn,
      highRiskItems,
      criticalItems: criticalRiskCount,
      lowRiskCount,
      mediumRiskCount,
      highRiskCount,
      criticalRiskCount
    }
  }

  /**
   * Calculate trends compared to previous analysis
   */
  private calculateTrends(currentMetrics: any, previousAnalysis: any) {
    if (!previousAnalysis) {
      return {
        rpnTrend: 'STABLE' as const,
        rpnChangePercentage: 0,
        newRisksAdded: 0,
        risksMitigated: 0
      }
    }

    const rpnChange = ((currentMetrics.averageRpn - previousAnalysis.averageRpn.toNumber()) / previousAnalysis.averageRpn.toNumber()) * 100
    
    let rpnTrend: 'IMPROVING' | 'STABLE' | 'WORSENING'
    if (rpnChange < -5) rpnTrend = 'IMPROVING'
    else if (rpnChange > 5) rpnTrend = 'WORSENING'
    else rpnTrend = 'STABLE'

    const newRisksAdded = Math.max(0, currentMetrics.totalFailureModes - previousAnalysis.totalFailureModes)
    const risksMitigated = Math.max(0, previousAnalysis.highRiskItems - currentMetrics.highRiskItems)

    return {
      rpnTrend,
      rpnChangePercentage: rpnChange,
      newRisksAdded,
      risksMitigated
    }
  }

  /**
   * Calculate compliance score
   */
  private async calculateComplianceScore(projectId: string): Promise<number> {
    // Implementation would check various compliance criteria
    // For now, return a calculated score based on completeness
    
    const [fmeasWithTeam, controlPlansWithItems, actionItemsCompleted] = await Promise.all([
      this.prisma.fmea.count({
        where: { 
          projectId,
          teamMembers: { some: {} }
        }
      }),
      this.prisma.controlPlan.count({
        where: {
          projectId,
          controlPlanItems: { some: {} }
        }
      }),
      this.prisma.fmeaActionItem.count({
        where: {
          status: 'COMPLETED',
          failureMode: {
            fmea: { projectId }
          }
        }
      })
    ])

    // Simple compliance scoring - would be more sophisticated in practice
    let score = 60 // Base score
    score += Math.min(20, fmeasWithTeam * 5) // Team assignment
    score += Math.min(15, controlPlansWithItems * 5) // Control plan completeness
    score += Math.min(5, actionItemsCompleted * 1) // Action completion

    return Math.min(100, score)
  }

  /**
   * Calculate control effectiveness for process
   */
  private calculateProcessControlEffectiveness(failureModes: any[]): number {
    if (failureModes.length === 0) return 0

    let totalEffectiveness = 0
    let controlCount = 0

    failureModes.forEach(fm => {
      fm.causes.forEach((cause: any) => {
        cause.controls.forEach((control: any) => {
          // Effectiveness inversely related to detection rating (lower is better)
          const effectiveness = (11 - control.detectionRating) * 10
          totalEffectiveness += effectiveness
          controlCount++
        })
      })
    })

    return controlCount > 0 ? totalEffectiveness / controlCount : 0
  }

  /**
   * Calculate overall control effectiveness
   */
  private calculateOverallControlEffectiveness(
    controls: any[],
    preventionControls: number,
    detectionControls: number,
    controlsWithoutOwners: number
  ): number {
    if (controls.length === 0) return 0

    let score = 70 // Base score

    // Prevention vs detection balance
    const preventionRatio = preventionControls / controls.length
    if (preventionRatio > 0.3) score += 10 // Good prevention ratio

    // Owner assignment
    const ownershipRatio = (controls.length - controlsWithoutOwners) / controls.length
    score += ownershipRatio * 20

    return Math.min(100, score)
  }

  /**
   * Generate control recommendations
   */
  private generateControlRecommendations(
    effectivenessScore: number,
    controlsWithoutOwners: number,
    preventionControls: number,
    detectionControls: number,
    averageDetectionRating: number
  ): string[] {
    const recommendations: string[] = []

    if (effectivenessScore < 70) {
      recommendations.push('Overall control effectiveness needs improvement')
    }

    if (controlsWithoutOwners > 0) {
      recommendations.push(`Assign owners to ${controlsWithoutOwners} controls`)
    }

    if (preventionControls < detectionControls * 0.3) {
      recommendations.push('Consider adding more prevention controls')
    }

    if (averageDetectionRating > 6) {
      recommendations.push('Improve detection capabilities - average rating is high')
    }

    return recommendations
  }

  /**
   * Helper methods for dashboard KPIs
   */
  private async getSystemRiskData() {
    const totalRiskItems = await this.prisma.failureMode.count()
    const highRiskItems = await this.prisma.failureMode.count({
      where: {
        causes: {
          some: {
            controls: {
              some: {
                // This would need a computed field for RPN > 100
              }
            }
          }
        }
      }
    })

    return { totalRiskItems, highRiskItems: Math.floor(totalRiskItems * 0.15) } // Estimate
  }

  private async getOverdueActions(): Promise<number> {
    return this.prisma.fmeaActionItem.count({
      where: {
        status: { not: 'COMPLETED' },
        targetDate: { lt: new Date() }
      }
    })
  }

  private async getAverageComplianceScore(): Promise<number> {
    const reports = await this.prisma.complianceReport.findMany({
      where: { reportStatus: 'APPROVED' },
      select: { overallComplianceScore: true }
    })

    if (reports.length === 0) return 0

    const sum = reports.reduce((acc, report) => acc + (report.overallComplianceScore?.toNumber() || 0), 0)
    return sum / reports.length
  }

  private async getRecentChangesCount(): Promise<number> {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    return this.prisma.changeEvent.count({
      where: { triggeredAt: { gte: weekAgo } }
    })
  }

  private async getPendingApprovalsCount(): Promise<number> {
    return this.prisma.changeEvent.count({
      where: { approvalStatus: 'PENDING' }
    })
  }

  private determineOverallRiskLevel(averageRpn: number, criticalItems: number, complianceScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (criticalItems > 0 || complianceScore < 60) return 'CRITICAL'
    if (averageRpn > 100 || complianceScore < 80) return 'HIGH'
    if (averageRpn > 50 || complianceScore < 90) return 'MEDIUM'
    return 'LOW'
  }

  private getRiskLevelFromRpn(rpn: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (rpn >= 300) return 'CRITICAL'
    if (rpn >= 100) return 'HIGH'
    if (rpn >= 50) return 'MEDIUM'
    return 'LOW'
  }
}

export default RiskAnalyticsService