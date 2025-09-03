import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

export interface CreateVersionRequest {
  projectId: string
  versionName?: string
  description?: string
  isBaseline?: boolean
}

export interface VersionComparison {
  version1Id: string
  version2Id: string
  differences: {
    processFlow: {
      added: any[]
      modified: any[]
      deleted: any[]
    }
    fmea: {
      added: any[]
      modified: any[]
      deleted: any[]
    }
    controlPlan: {
      added: any[]
      modified: any[]
      deleted: any[]
    }
  }
  summary: {
    totalChanges: number
    riskImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    affectedStakeholders: string[]
  }
}

export interface RestoreResult {
  versionId: string
  restoredItems: {
    processSteps: number
    failureModes: number
    controlItems: number
  }
  warnings: string[]
}

class VersionControlService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a snapshot version of the entire project
   */
  async createProjectSnapshot(request: CreateVersionRequest, userId: string): Promise<string> {
    try {
      const { projectId, versionName, description, isBaseline = false } = request

      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        throw new Error('Project not found')
      }

      // Get next version number
      const lastVersion = await this.prisma.projectVersion.findFirst({
        where: { projectId },
        orderBy: { majorVersion: 'desc' }
      })

      const nextMajorVersion = lastVersion ? lastVersion.majorVersion + 1 : 1
      const versionNumber = `${nextMajorVersion}.0.0`

      // Capture complete project state
      const processFlowSnapshot = await this.captureProcessFlowSnapshot(projectId)
      const fmeaSnapshot = await this.captureFmeaSnapshot(projectId)
      const controlPlanSnapshot = await this.captureControlPlanSnapshot(projectId)

      // Calculate summary metrics
      const metrics = await this.calculateProjectMetrics(projectId)

      // Create version record
      const version = await this.prisma.projectVersion.create({
        data: {
          projectId,
          versionNumber,
          versionName: versionName || `Version ${nextMajorVersion}`,
          description,
          majorVersion: nextMajorVersion,
          isBaseline,
          processFlowSnapshot,
          fmeaSnapshot,
          controlPlanSnapshot,
          totalProcessSteps: metrics.processSteps,
          totalFailureModes: metrics.failureModes,
          totalControlItems: metrics.controlItems,
          totalRpnScore: metrics.totalRpn,
          highRiskItems: metrics.highRiskItems,
          createdById: userId
        }
      })

      // Mark other versions as non-active if this is a baseline
      if (isBaseline) {
        await this.prisma.projectVersion.updateMany({
          where: { 
            projectId,
            id: { not: version.id }
          },
          data: { isBaseline: false }
        })
      }

      logger.info(`Created project snapshot: ${version.id} for project ${projectId}`)
      return version.id
    } catch (error) {
      logger.error('Error creating project snapshot:', error)
      throw error
    }
  }

  /**
   * Compare two versions and return differences
   */
  async compareVersions(version1Id: string, version2Id: string): Promise<VersionComparison> {
    try {
      const [version1, version2] = await Promise.all([
        this.prisma.projectVersion.findUnique({ where: { id: version1Id } }),
        this.prisma.projectVersion.findUnique({ where: { id: version2Id } })
      ])

      if (!version1 || !version2) {
        throw new Error('One or both versions not found')
      }

      if (version1.projectId !== version2.projectId) {
        throw new Error('Versions must be from the same project')
      }

      // Compare process flows
      const processFlowDiffs = this.compareProcessFlowSnapshots(
        version1.processFlowSnapshot as any,
        version2.processFlowSnapshot as any
      )

      // Compare FMEAs
      const fmeaDiffs = this.compareFmeaSnapshots(
        version1.fmeaSnapshot as any,
        version2.fmeaSnapshot as any
      )

      // Compare control plans
      const controlPlanDiffs = this.compareControlPlanSnapshots(
        version1.controlPlanSnapshot as any,
        version2.controlPlanSnapshot as any
      )

      // Calculate overall impact
      const totalChanges = 
        processFlowDiffs.added.length + processFlowDiffs.modified.length + processFlowDiffs.deleted.length +
        fmeaDiffs.added.length + fmeaDiffs.modified.length + fmeaDiffs.deleted.length +
        controlPlanDiffs.added.length + controlPlanDiffs.modified.length + controlPlanDiffs.deleted.length

      const riskImpact = this.calculateRiskImpact(totalChanges, fmeaDiffs, controlPlanDiffs)
      const affectedStakeholders = this.identifyAffectedStakeholders(processFlowDiffs, fmeaDiffs, controlPlanDiffs)

      return {
        version1Id,
        version2Id,
        differences: {
          processFlow: processFlowDiffs,
          fmea: fmeaDiffs,
          controlPlan: controlPlanDiffs
        },
        summary: {
          totalChanges,
          riskImpact,
          affectedStakeholders
        }
      }
    } catch (error) {
      logger.error('Error comparing versions:', error)
      throw error
    }
  }

  /**
   * Restore project to a previous version
   */
  async restoreToVersion(versionId: string, userId: string): Promise<RestoreResult> {
    try {
      const version = await this.prisma.projectVersion.findUnique({
        where: { id: versionId },
        include: { project: true }
      })

      if (!version) {
        throw new Error('Version not found')
      }

      const warnings: string[] = []
      
      // Start transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create new version as restoration point
        const restorationVersion = await tx.projectVersion.create({
          data: {
            projectId: version.projectId,
            versionNumber: `${version.majorVersion}.${version.minorVersion}.${version.patchVersion + 1}`,
            versionName: `Restored from ${version.versionName}`,
            description: `Restored from version ${version.versionNumber}`,
            majorVersion: version.majorVersion,
            minorVersion: version.minorVersion,
            patchVersion: version.patchVersion + 1,
            restoredFromVersionId: versionId,
            createdById: userId,
            processFlowSnapshot: version.processFlowSnapshot,
            fmeaSnapshot: version.fmeaSnapshot,
            controlPlanSnapshot: version.controlPlanSnapshot,
            totalProcessSteps: version.totalProcessSteps,
            totalFailureModes: version.totalFailureModes,
            totalControlItems: version.totalControlItems,
            totalRpnScore: version.totalRpnScore,
            highRiskItems: version.highRiskItems
          }
        })

        // Restore process flows
        const processStepsRestored = await this.restoreProcessFlowsFromSnapshot(
          tx, version.projectId, version.processFlowSnapshot as any
        )

        // Restore FMEAs
        const failureModesRestored = await this.restoreFmeaFromSnapshot(
          tx, version.projectId, version.fmeaSnapshot as any
        )

        // Restore control plans
        const controlItemsRestored = await this.restoreControlPlanFromSnapshot(
          tx, version.projectId, version.controlPlanSnapshot as any
        )

        // Log restoration event
        await tx.changeEvent.create({
          data: {
            projectId: version.projectId,
            versionId: restorationVersion.id,
            entityType: 'PROJECT',
            entityId: version.projectId,
            changeType: 'RESTORE',
            changeAction: `Restored to version ${version.versionNumber}`,
            impactLevel: 'HIGH',
            affectedModules: ['PROCESS_FLOW', 'FMEA', 'CONTROL_PLAN'],
            triggeredById: userId,
            completedAt: new Date()
          }
        })

        return {
          versionId: restorationVersion.id,
          restoredItems: {
            processSteps: processStepsRestored,
            failureModes: failureModesRestored,
            controlItems: controlItemsRestored
          }
        }
      })

      logger.info(`Restored project ${version.projectId} to version ${version.versionNumber}`)
      return { ...result, warnings }
    } catch (error) {
      logger.error('Error restoring version:', error)
      throw error
    }
  }

  /**
   * Get version history for a project
   */
  async getVersionHistory(projectId: string, limit: number = 50) {
    try {
      const versions = await this.prisma.projectVersion.findMany({
        where: { projectId },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          restoredFromVersion: {
            select: {
              id: true,
              versionNumber: true,
              versionName: true
            }
          },
          _count: {
            select: {
              changeEvents: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return versions.map(version => ({
        ...version,
        changeCount: version._count.changeEvents
      }))
    } catch (error) {
      logger.error('Error getting version history:', error)
      throw error
    }
  }

  /**
   * Calculate project metrics from current state
   */
  private async calculateProjectMetrics(projectId: string) {
    const [processStepCount, failureModeData, controlItemCount] = await Promise.all([
      // Count process steps
      this.prisma.processStep.count({
        where: {
          processFlow: { projectId }
        }
      }),
      
      // Count failure modes and calculate total RPN
      this.prisma.failureMode.findMany({
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
      }),
      
      // Count control plan items
      this.prisma.controlPlanItem.count({
        where: {
          controlPlan: { projectId }
        }
      })
    ])

    // Calculate RPN metrics
    let totalRpn = 0
    let highRiskItems = 0

    failureModeData.forEach(fm => {
      fm.causes.forEach(cause => {
        cause.controls.forEach(control => {
          const rpn = fm.severityRating * cause.occurrenceRating * control.detectionRating
          totalRpn += rpn
          if (rpn >= 100) highRiskItems++
        })
      })
    })

    return {
      processSteps: processStepCount,
      failureModes: failureModeData.length,
      controlItems: controlItemCount,
      totalRpn,
      highRiskItems
    }
  }

  /**
   * Capture process flow snapshot
   */
  private async captureProcessFlowSnapshot(projectId: string) {
    const processFlows = await this.prisma.processFlow.findMany({
      where: { projectId },
      include: {
        processSteps: {
          include: {
            resources: {
              include: { resource: true }
            },
            controlPoints: true,
            inputs: true,
            outputs: true
          }
        },
        stepConnections: true
      }
    })

    return processFlows
  }

  /**
   * Capture FMEA snapshot
   */
  private async captureFmeaSnapshot(projectId: string) {
    const fmeas = await this.prisma.fmea.findMany({
      where: { projectId },
      include: {
        failureModes: {
          include: {
            effects: true,
            causes: {
              include: {
                controls: true
              }
            },
            actionItems: true,
            processStepLinks: true
          }
        },
        teamMembers: {
          include: { user: true }
        }
      }
    })

    return fmeas
  }

  /**
   * Capture control plan snapshot
   */
  private async captureControlPlanSnapshot(projectId: string) {
    const controlPlans = await this.prisma.controlPlan.findMany({
      where: { projectId },
      include: {
        controlPlanItems: {
          include: {
            controlMethods: {
              include: { controlMethod: true }
            },
            measurementEquipment: true,
            frequency: true
          }
        },
        teamMembers: {
          include: { user: true }
        },
        fmeaLinks: true
      }
    })

    return controlPlans
  }

  /**
   * Compare process flow snapshots
   */
  private compareProcessFlowSnapshots(snapshot1: any, snapshot2: any) {
    // Implementation for comparing process flow snapshots
    // Returns { added: [], modified: [], deleted: [] }
    const added: any[] = []
    const modified: any[] = []
    const deleted: any[] = []

    // Compare process flows and steps
    const flows1 = snapshot1 || []
    const flows2 = snapshot2 || []

    // Find added/deleted process flows
    flows2.forEach((flow2: any) => {
      const flow1 = flows1.find((f: any) => f.id === flow2.id)
      if (!flow1) {
        added.push({ type: 'process_flow', item: flow2 })
      } else {
        // Compare process steps within flows
        if (JSON.stringify(flow1) !== JSON.stringify(flow2)) {
          modified.push({ type: 'process_flow', item: flow2, changes: this.getObjectChanges(flow1, flow2) })
        }
      }
    })

    flows1.forEach((flow1: any) => {
      const flow2 = flows2.find((f: any) => f.id === flow1.id)
      if (!flow2) {
        deleted.push({ type: 'process_flow', item: flow1 })
      }
    })

    return { added, modified, deleted }
  }

  /**
   * Compare FMEA snapshots
   */
  private compareFmeaSnapshots(snapshot1: any, snapshot2: any) {
    const added: any[] = []
    const modified: any[] = []
    const deleted: any[] = []

    const fmeas1 = snapshot1 || []
    const fmeas2 = snapshot2 || []

    // Compare FMEAs and failure modes
    fmeas2.forEach((fmea2: any) => {
      const fmea1 = fmeas1.find((f: any) => f.id === fmea2.id)
      if (!fmea1) {
        added.push({ type: 'fmea', item: fmea2 })
      } else if (JSON.stringify(fmea1) !== JSON.stringify(fmea2)) {
        modified.push({ type: 'fmea', item: fmea2, changes: this.getObjectChanges(fmea1, fmea2) })
      }
    })

    fmeas1.forEach((fmea1: any) => {
      const fmea2 = fmeas2.find((f: any) => f.id === fmea1.id)
      if (!fmea2) {
        deleted.push({ type: 'fmea', item: fmea1 })
      }
    })

    return { added, modified, deleted }
  }

  /**
   * Compare control plan snapshots
   */
  private compareControlPlanSnapshots(snapshot1: any, snapshot2: any) {
    const added: any[] = []
    const modified: any[] = []
    const deleted: any[] = []

    const plans1 = snapshot1 || []
    const plans2 = snapshot2 || []

    plans2.forEach((plan2: any) => {
      const plan1 = plans1.find((p: any) => p.id === plan2.id)
      if (!plan1) {
        added.push({ type: 'control_plan', item: plan2 })
      } else if (JSON.stringify(plan1) !== JSON.stringify(plan2)) {
        modified.push({ type: 'control_plan', item: plan2, changes: this.getObjectChanges(plan1, plan2) })
      }
    })

    plans1.forEach((plan1: any) => {
      const plan2 = plans2.find((p: any) => p.id === plan1.id)
      if (!plan2) {
        deleted.push({ type: 'control_plan', item: plan1 })
      }
    })

    return { added, modified, deleted }
  }

  /**
   * Calculate risk impact of changes
   */
  private calculateRiskImpact(totalChanges: number, fmeaDiffs: any, controlPlanDiffs: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (totalChanges === 0) return 'LOW'
    
    // High impact if safety-critical items changed
    const hasHighRiskChanges = 
      fmeaDiffs.modified.some((item: any) => item.item.severityRating >= 8) ||
      controlPlanDiffs.deleted.length > 0

    if (hasHighRiskChanges) return 'CRITICAL'
    if (totalChanges > 20) return 'HIGH'
    if (totalChanges > 5) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Identify affected stakeholders
   */
  private identifyAffectedStakeholders(processFlowDiffs: any, fmeaDiffs: any, controlPlanDiffs: any): string[] {
    const stakeholders = new Set<string>()

    // Add default stakeholders based on change types
    if (processFlowDiffs.modified.length > 0 || processFlowDiffs.added.length > 0) {
      stakeholders.add('Process Engineers')
    }
    
    if (fmeaDiffs.modified.length > 0 || fmeaDiffs.added.length > 0) {
      stakeholders.add('Quality Engineers')
      stakeholders.add('FMEA Team')
    }
    
    if (controlPlanDiffs.modified.length > 0 || controlPlanDiffs.added.length > 0) {
      stakeholders.add('Production Managers')
      stakeholders.add('Quality Control')
    }

    return Array.from(stakeholders)
  }

  /**
   * Get detailed changes between two objects
   */
  private getObjectChanges(obj1: any, obj2: any): any {
    const changes: any = {}
    
    // Simple change detection
    Object.keys(obj2).forEach(key => {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        changes[key] = {
          from: obj1[key],
          to: obj2[key]
        }
      }
    })

    return changes
  }

  /**
   * Restore process flows from snapshot
   */
  private async restoreProcessFlowsFromSnapshot(tx: any, projectId: string, snapshot: any): Promise<number> {
    // Delete existing process flows
    await tx.processFlow.deleteMany({
      where: { projectId }
    })

    let restoredCount = 0

    // Restore from snapshot
    if (snapshot && Array.isArray(snapshot)) {
      for (const flow of snapshot) {
        await tx.processFlow.create({
          data: {
            ...flow,
            processSteps: {
              create: flow.processSteps?.map((step: any) => ({
                ...step,
                id: undefined, // Let Prisma generate new IDs
                processFlowId: undefined
              })) || []
            }
          }
        })
        restoredCount += flow.processSteps?.length || 0
      }
    }

    return restoredCount
  }

  /**
   * Restore FMEA from snapshot
   */
  private async restoreFmeaFromSnapshot(tx: any, projectId: string, snapshot: any): Promise<number> {
    // Delete existing FMEAs
    await tx.fmea.deleteMany({
      where: { projectId }
    })

    let restoredCount = 0

    // Restore from snapshot
    if (snapshot && Array.isArray(snapshot)) {
      for (const fmea of snapshot) {
        await tx.fmea.create({
          data: {
            ...fmea,
            failureModes: {
              create: fmea.failureModes?.map((fm: any) => ({
                ...fm,
                id: undefined,
                fmeaId: undefined
              })) || []
            }
          }
        })
        restoredCount += fmea.failureModes?.length || 0
      }
    }

    return restoredCount
  }

  /**
   * Restore control plan from snapshot
   */
  private async restoreControlPlanFromSnapshot(tx: any, projectId: string, snapshot: any): Promise<number> {
    // Delete existing control plans
    await tx.controlPlan.deleteMany({
      where: { projectId }
    })

    let restoredCount = 0

    // Restore from snapshot
    if (snapshot && Array.isArray(snapshot)) {
      for (const plan of snapshot) {
        await tx.controlPlan.create({
          data: {
            ...plan,
            controlPlanItems: {
              create: plan.controlPlanItems?.map((item: any) => ({
                ...item,
                id: undefined,
                controlPlanId: undefined
              })) || []
            }
          }
        })
        restoredCount += plan.controlPlanItems?.length || 0
      }
    }

    return restoredCount
  }
}

export default VersionControlService