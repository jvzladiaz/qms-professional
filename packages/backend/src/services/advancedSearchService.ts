import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

interface SearchFilters {
  // Text search
  query?: string
  
  // Risk-based filters
  riskLevel?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[]
  rpnRange?: {
    min?: number
    max?: number
  }
  severity?: number[]
  occurrence?: number[]
  detection?: number[]
  
  // Process/Department filters
  department?: string[]
  processType?: string[]
  processStep?: string[]
  
  // Status filters
  status?: string[]
  approvalStatus?: string[]
  
  // Date filters
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  
  // User/Assignment filters
  assignedTo?: string[]
  createdBy?: string[]
  teamLead?: string[]
  
  // Entity type filters
  entityTypes?: ('FMEA' | 'PROCESS_FLOW' | 'CONTROL_PLAN' | 'ACTION_ITEM' | 'CHANGE_EVENT')[]
  
  // Compliance filters
  complianceStatus?: ('COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW')[]
  standardType?: ('IATF_16949' | 'ISO_9001' | 'AIAG_VDA' | 'CUSTOM')[]
}

interface SearchOptions {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  includeRelated?: boolean
  highlightMatches?: boolean
}

interface SearchResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  facets?: {
    riskLevels: { value: string, count: number }[]
    departments: { value: string, count: number }[]
    statuses: { value: string, count: number }[]
    assignees: { value: string, count: number }[]
  }
  suggestions?: string[]
}

class AdvancedSearchService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Global search across all modules
   */
  async globalSearch(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<{
    fmeas: SearchResult<any>
    processFlows: SearchResult<any>
    controlPlans: SearchResult<any>
    actionItems: SearchResult<any>
    changeEvents: SearchResult<any>
  }> {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = options

      const [
        fmeas,
        processFlows,
        controlPlans,
        actionItems,
        changeEvents
      ] = await Promise.all([
        this.searchFMEAs(filters, { ...options, pageSize: Math.min(pageSize, 10) }),
        this.searchProcessFlows(filters, { ...options, pageSize: Math.min(pageSize, 10) }),
        this.searchControlPlans(filters, { ...options, pageSize: Math.min(pageSize, 10) }),
        this.searchActionItems(filters, { ...options, pageSize: Math.min(pageSize, 10) }),
        this.searchChangeEvents(filters, { ...options, pageSize: Math.min(pageSize, 10) })
      ])

      return {
        fmeas,
        processFlows,
        controlPlans,
        actionItems,
        changeEvents
      }

    } catch (error) {
      logger.error('Error in global search:', error)
      throw error
    }
  }

  /**
   * Search FMEA documents with advanced filtering
   */
  async searchFMEAs(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        includeRelated = true
      } = options

      // Build where clause
      const whereClause = this.buildFMEAWhereClause(filters)

      // Get total count
      const totalCount = await this.prisma.fmea.count({ where: whereClause })

      // Get paginated results
      const items = await this.prisma.fmea.findMany({
        where: whereClause,
        include: includeRelated ? {
          project: { select: { id: true, name: true, department: true } },
          teamLeader: { select: { id: true, name: true, email: true } },
          failureModes: {
            include: {
              effects: true,
              causes: {
                include: { controls: true }
              },
              actionItems: {
                include: {
                  assignedToUser: { select: { id: true, name: true } }
                }
              }
            }
          }
        } : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize
      })

      // Generate facets
      const facets = await this.generateFMEAFacets(filters)

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        facets
      }

    } catch (error) {
      logger.error('Error searching FMEAs:', error)
      throw error
    }
  }

  /**
   * Search Process Flows with advanced filtering
   */
  async searchProcessFlows(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        includeRelated = true
      } = options

      const whereClause = this.buildProcessFlowWhereClause(filters)
      const totalCount = await this.prisma.processFlow.count({ where: whereClause })

      const items = await this.prisma.processFlow.findMany({
        where: whereClause,
        include: includeRelated ? {
          project: { select: { id: true, name: true, department: true } },
          processSteps: {
            include: {
              resources: true,
              controlPoints: true,
              inputs: true,
              outputs: true
            }
          }
        } : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize
      })

      const facets = await this.generateProcessFlowFacets(filters)

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        facets
      }

    } catch (error) {
      logger.error('Error searching Process Flows:', error)
      throw error
    }
  }

  /**
   * Search Control Plans with advanced filtering
   */
  async searchControlPlans(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        includeRelated = true
      } = options

      const whereClause = this.buildControlPlanWhereClause(filters)
      const totalCount = await this.prisma.controlPlan.count({ where: whereClause })

      const items = await this.prisma.controlPlan.findMany({
        where: whereClause,
        include: includeRelated ? {
          project: { select: { id: true, name: true, department: true } },
          controlPlanItems: {
            include: {
              controlMethods: true,
              measurementEquipment: true
            }
          }
        } : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize
      })

      const facets = await this.generateControlPlanFacets(filters)

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        facets
      }

    } catch (error) {
      logger.error('Error searching Control Plans:', error)
      throw error
    }
  }

  /**
   * Search Action Items with advanced filtering
   */
  async searchActionItems(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'targetDate',
        sortOrder = 'asc',
        includeRelated = true
      } = options

      const whereClause = this.buildActionItemWhereClause(filters)
      const totalCount = await this.prisma.actionItem.count({ where: whereClause })

      const items = await this.prisma.actionItem.findMany({
        where: whereClause,
        include: includeRelated ? {
          assignedToUser: { select: { id: true, name: true, email: true } },
          failureMode: {
            include: {
              fmea: {
                include: {
                  project: { select: { id: true, name: true } }
                }
              }
            }
          }
        } : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize
      })

      const facets = await this.generateActionItemFacets(filters)

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        facets
      }

    } catch (error) {
      logger.error('Error searching Action Items:', error)
      throw error
    }
  }

  /**
   * Search Change Events with advanced filtering
   */
  async searchChangeEvents(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'triggeredAt',
        sortOrder = 'desc',
        includeRelated = true
      } = options

      const whereClause = this.buildChangeEventWhereClause(filters)
      const totalCount = await this.prisma.changeEvent.count({ where: whereClause })

      const items = await this.prisma.changeEvent.findMany({
        where: whereClause,
        include: includeRelated ? {
          project: { select: { id: true, name: true } },
          triggeredBy: { select: { id: true, name: true } }
        } : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize
      })

      const facets = await this.generateChangeEventFacets(filters)

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        facets
      }

    } catch (error) {
      logger.error('Error searching Change Events:', error)
      throw error
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(query: string, entityType?: string): Promise<string[]> {
    try {
      const suggestions: Set<string> = new Set()

      if (query.length < 2) return []

      // Search in different fields based on entity type
      if (!entityType || entityType === 'FMEA') {
        const fmeaSuggestions = await this.prisma.fmea.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { processName: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          select: { name: true, processName: true },
          take: 10
        })

        fmeaSuggestions.forEach(fmea => {
          if (fmea.name) suggestions.add(fmea.name)
          if (fmea.processName) suggestions.add(fmea.processName)
        })
      }

      if (!entityType || entityType === 'PROCESS_FLOW') {
        const processFlowSuggestions = await this.prisma.processFlow.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          select: { name: true },
          take: 10
        })

        processFlowSuggestions.forEach(pf => {
          if (pf.name) suggestions.add(pf.name)
        })
      }

      return Array.from(suggestions).slice(0, 10)

    } catch (error) {
      logger.error('Error getting search suggestions:', error)
      return []
    }
  }

  /**
   * Build FMEA where clause from filters
   */
  private buildFMEAWhereClause(filters: SearchFilters): any {
    const where: any = {}

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { processName: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        {
          failureModes: {
            some: {
              OR: [
                { description: { contains: filters.query, mode: 'insensitive' } },
                { processFunction: { contains: filters.query, mode: 'insensitive' } }
              ]
            }
          }
        }
      ]
    }

    if (filters.department?.length) {
      where.project = {
        department: { in: filters.department }
      }
    }

    if (filters.status?.length) {
      where.status = { in: filters.status }
    }

    if (filters.createdBy?.length) {
      where.createdById = { in: filters.createdBy }
    }

    if (filters.teamLead?.length) {
      where.teamLeaderId = { in: filters.teamLead }
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate
      }
    }

    // Risk-based filtering for FMEA
    if (filters.rpnRange || filters.severity?.length || filters.occurrence?.length || filters.detection?.length) {
      where.failureModes = {
        some: this.buildFailureModeRiskFilter(filters)
      }
    }

    return where
  }

  /**
   * Build Process Flow where clause from filters
   */
  private buildProcessFlowWhereClause(filters: SearchFilters): any {
    const where: any = {}

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        {
          processSteps: {
            some: {
              OR: [
                { name: { contains: filters.query, mode: 'insensitive' } },
                { description: { contains: filters.query, mode: 'insensitive' } }
              ]
            }
          }
        }
      ]
    }

    if (filters.department?.length) {
      where.project = {
        department: { in: filters.department }
      }
    }

    if (filters.status?.length) {
      where.status = { in: filters.status }
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate
      }
    }

    return where
  }

  /**
   * Build Control Plan where clause from filters
   */
  private buildControlPlanWhereClause(filters: SearchFilters): any {
    const where: any = {}

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        {
          controlPlanItems: {
            some: {
              OR: [
                { characteristic: { contains: filters.query, mode: 'insensitive' } },
                { processStep: { contains: filters.query, mode: 'insensitive' } }
              ]
            }
          }
        }
      ]
    }

    if (filters.department?.length) {
      where.project = {
        department: { in: filters.department }
      }
    }

    if (filters.status?.length) {
      where.status = { in: filters.status }
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate
      }
    }

    return where
  }

  /**
   * Build Action Item where clause from filters
   */
  private buildActionItemWhereClause(filters: SearchFilters): any {
    const where: any = {}

    if (filters.query) {
      where.OR = [
        { description: { contains: filters.query, mode: 'insensitive' } },
        { completionNotes: { contains: filters.query, mode: 'insensitive' } }
      ]
    }

    if (filters.assignedTo?.length) {
      where.assignedTo = { in: filters.assignedTo }
    }

    if (filters.status?.length) {
      where.status = { in: filters.status }
    }

    if (filters.dateRange) {
      where.OR = [
        {
          targetDate: {
            gte: filters.dateRange.startDate,
            lte: filters.dateRange.endDate
          }
        },
        {
          createdAt: {
            gte: filters.dateRange.startDate,
            lte: filters.dateRange.endDate
          }
        }
      ]
    }

    return where
  }

  /**
   * Build Change Event where clause from filters
   */
  private buildChangeEventWhereClause(filters: SearchFilters): any {
    const where: any = {}

    if (filters.query) {
      where.OR = [
        { entityType: { contains: filters.query, mode: 'insensitive' } },
        { changeDescription: { contains: filters.query, mode: 'insensitive' } }
      ]
    }

    if (filters.entityTypes?.length) {
      where.entityType = { in: filters.entityTypes }
    }

    if (filters.approvalStatus?.length) {
      where.approvalStatus = { in: filters.approvalStatus }
    }

    if (filters.dateRange) {
      where.triggeredAt = {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate
      }
    }

    return where
  }

  /**
   * Build failure mode risk filter
   */
  private buildFailureModeRiskFilter(filters: SearchFilters): any {
    const riskFilter: any = {}

    if (filters.severity?.length) {
      riskFilter.effects = {
        some: {
          severity: { in: filters.severity }
        }
      }
    }

    if (filters.occurrence?.length) {
      riskFilter.causes = {
        some: {
          occurrence: { in: filters.occurrence }
        }
      }
    }

    if (filters.detection?.length) {
      riskFilter.causes = {
        some: {
          controls: {
            some: {
              detection: { in: filters.detection }
            }
          }
        }
      }
    }

    return riskFilter
  }

  /**
   * Generate facets for FMEA search results
   */
  private async generateFMEAFacets(filters: SearchFilters): Promise<any> {
    // This is a simplified version - in production, you'd want more sophisticated facet generation
    return {
      riskLevels: [
        { value: 'LOW', count: 0 },
        { value: 'MEDIUM', count: 0 },
        { value: 'HIGH', count: 0 },
        { value: 'CRITICAL', count: 0 }
      ],
      departments: [],
      statuses: [],
      assignees: []
    }
  }

  /**
   * Generate facets for Process Flow search results
   */
  private async generateProcessFlowFacets(filters: SearchFilters): Promise<any> {
    return {
      departments: [],
      statuses: [],
      processTypes: []
    }
  }

  /**
   * Generate facets for Control Plan search results
   */
  private async generateControlPlanFacets(filters: SearchFilters): Promise<any> {
    return {
      departments: [],
      statuses: [],
      characteristics: []
    }
  }

  /**
   * Generate facets for Action Item search results
   */
  private async generateActionItemFacets(filters: SearchFilters): Promise<any> {
    return {
      statuses: [],
      assignees: [],
      priorities: []
    }
  }

  /**
   * Generate facets for Change Event search results
   */
  private async generateChangeEventFacets(filters: SearchFilters): Promise<any> {
    return {
      entityTypes: [],
      impactLevels: [],
      approvalStatuses: []
    }
  }
}

export default AdvancedSearchService