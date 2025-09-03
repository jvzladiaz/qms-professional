import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '../generated/client'
import logger from '../utils/logger'

interface AuthenticatedSocket extends Socket {
  userId?: string
  userRole?: string
}

interface SocketUser {
  socketId: string
  userId: string
  userRole: string
  projectIds: string[]
}

class WebSocketService {
  private io: SocketIOServer
  private prisma: PrismaClient
  private connectedUsers: Map<string, SocketUser> = new Map()
  private userSockets: Map<string, Set<string>> = new Map() // userId -> Set of socketIds

  constructor(httpServer: HTTPServer, prisma: PrismaClient) {
    this.prisma = prisma
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupMiddleware()
    this.setupEventHandlers()
    this.startCleanupInterval()

    logger.info('WebSocket service initialized')
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): SocketIOServer {
    return this.io
  }

  /**
   * Emit change event to project subscribers
   */
  emitChangeEvent(projectId: string, changeEvent: any): void {
    this.io.to(`project:${projectId}`).emit('changeEvent', {
      id: changeEvent.id,
      entityType: changeEvent.entityType,
      entityId: changeEvent.entityId,
      changeType: changeEvent.changeType,
      impactLevel: changeEvent.impactLevel,
      affectedModules: changeEvent.affectedModules,
      triggeredAt: changeEvent.triggeredAt,
      triggeredBy: changeEvent.triggeredBy
    })

    logger.info(`Change event ${changeEvent.id} emitted to project ${projectId}`)
  }

  /**
   * Emit notification to specific user
   */
  emitNotification(userId: string, notification: any): void {
    const userSocketIds = this.userSockets.get(userId)
    if (userSocketIds) {
      userSocketIds.forEach(socketId => {
        this.io.to(socketId).emit('notification', {
          id: notification.id,
          type: notification.notificationType,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          actionRequired: notification.actionRequired,
          actionUrl: notification.actionUrl,
          actionDeadline: notification.actionDeadline,
          timestamp: new Date()
        })
      })

      logger.info(`Notification emitted to user ${userId} (${userSocketIds.size} sockets)`)
    }
  }

  /**
   * Emit risk alert to project subscribers
   */
  emitRiskAlert(projectId: string, alert: {
    type: 'HIGH_RPN' | 'CRITICAL_FAILURE' | 'COMPLIANCE_ISSUE'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    title: string
    message: string
    entityType: string
    entityId: string
    data?: any
  }): void {
    this.io.to(`project:${projectId}`).emit('riskAlert', {
      ...alert,
      timestamp: new Date(),
      projectId
    })

    logger.info(`Risk alert ${alert.type} emitted to project ${projectId}`)
  }

  /**
   * Emit real-time analytics update
   */
  emitAnalyticsUpdate(projectId: string, analytics: {
    totalRpn: number
    averageRpn: number
    highRiskItems: number
    complianceScore: number
    riskTrend: 'IMPROVING' | 'STABLE' | 'WORSENING'
  }): void {
    this.io.to(`project:${projectId}`).emit('analyticsUpdate', {
      ...analytics,
      timestamp: new Date(),
      projectId
    })

    logger.debug(`Analytics update emitted to project ${projectId}`)
  }

  /**
   * Broadcast system-wide announcement
   */
  broadcastSystemAnnouncement(announcement: {
    type: 'MAINTENANCE' | 'UPDATE' | 'ALERT' | 'INFO'
    title: string
    message: string
    level: 'INFO' | 'WARNING' | 'ERROR'
    expiresAt?: Date
  }): void {
    this.io.emit('systemAnnouncement', {
      ...announcement,
      timestamp: new Date()
    })

    logger.info(`System announcement broadcast: ${announcement.type}`)
  }

  /**
   * Get connected users for a project
   */
  getProjectUsers(projectId: string): SocketUser[] {
    const projectUsers: SocketUser[] = []
    
    this.connectedUsers.forEach(user => {
      if (user.projectIds.includes(projectId)) {
        projectUsers.push(user)
      }
    })

    return projectUsers
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number
    totalUsers: number
    usersByRole: Record<string, number>
    averageProjectsPerUser: number
  } {
    const totalConnections = this.connectedUsers.size
    const userIds = new Set(Array.from(this.connectedUsers.values()).map(u => u.userId))
    const totalUsers = userIds.size

    const usersByRole: Record<string, number> = {}
    const projectCounts: number[] = []

    this.connectedUsers.forEach(user => {
      usersByRole[user.userRole] = (usersByRole[user.userRole] || 0) + 1
      projectCounts.push(user.projectIds.length)
    })

    const averageProjectsPerUser = projectCounts.length > 0 
      ? projectCounts.reduce((a, b) => a + b, 0) / projectCounts.length 
      : 0

    return {
      totalConnections,
      totalUsers,
      usersByRole,
      averageProjectsPerUser
    }
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
        
        // Verify user exists and is active
        const user = await this.prisma.user.findUnique({
          where: { id: decoded.userId, isActive: true },
          select: { id: true, role: true }
        })

        if (!user) {
          return next(new Error('User not found or inactive'))
        }

        socket.userId = user.id
        socket.userRole = user.role

        next()
      } catch (error) {
        logger.error('WebSocket authentication error:', error)
        next(new Error('Authentication failed'))
      }
    })
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      if (!socket.userId) return

      logger.info(`User ${socket.userId} connected via WebSocket (${socket.id})`)

      try {
        // Get user's accessible projects
        const userProjects = await this.getUserProjects(socket.userId)
        const projectIds = userProjects.map(p => p.id)

        // Store user connection
        this.connectedUsers.set(socket.id, {
          socketId: socket.id,
          userId: socket.userId,
          userRole: socket.userRole!,
          projectIds
        })

        // Update user sockets mapping
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set())
        }
        this.userSockets.get(socket.userId)!.add(socket.id)

        // Join project rooms
        projectIds.forEach(projectId => {
          socket.join(`project:${projectId}`)
        })

        // Join user-specific room
        socket.join(`user:${socket.userId}`)

        // Send connection confirmation
        socket.emit('connected', {
          userId: socket.userId,
          projectIds,
          serverTime: new Date()
        })

        // Handle project subscription
        socket.on('subscribeToProject', (projectId: string) => {
          if (projectIds.includes(projectId)) {
            socket.join(`project:${projectId}`)
            socket.emit('subscribedToProject', { projectId })
            logger.debug(`User ${socket.userId} subscribed to project ${projectId}`)
          } else {
            socket.emit('error', { message: 'Unauthorized to access project' })
          }
        })

        // Handle project unsubscription
        socket.on('unsubscribeFromProject', (projectId: string) => {
          socket.leave(`project:${projectId}`)
          socket.emit('unsubscribedFromProject', { projectId })
          logger.debug(`User ${socket.userId} unsubscribed from project ${projectId}`)
        })

        // Handle typing indicators for collaborative editing
        socket.on('startTyping', (data: { entityType: string, entityId: string, field?: string }) => {
          socket.broadcast.emit('userTyping', {
            userId: socket.userId,
            ...data,
            timestamp: new Date()
          })
        })

        socket.on('stopTyping', (data: { entityType: string, entityId: string, field?: string }) => {
          socket.broadcast.emit('userStoppedTyping', {
            userId: socket.userId,
            ...data,
            timestamp: new Date()
          })
        })

        // Handle presence updates
        socket.on('updatePresence', (presence: { status: 'ACTIVE' | 'AWAY' | 'BUSY', activity?: string }) => {
          this.updateUserPresence(socket.userId, presence)
          
          // Broadcast presence to project members
          projectIds.forEach(projectId => {
            socket.to(`project:${projectId}`).emit('userPresenceUpdate', {
              userId: socket.userId,
              ...presence,
              timestamp: new Date()
            })
          })
        })

        // Handle ping/pong for connection health
        socket.on('ping', (callback) => {
          if (typeof callback === 'function') {
            callback({ serverTime: new Date() })
          }
        })

        // Handle disconnection
        socket.on('disconnect', (reason) => {
          this.handleDisconnection(socket, reason)
        })

      } catch (error) {
        logger.error(`Error handling WebSocket connection for user ${socket.userId}:`, error)
        socket.emit('error', { message: 'Connection setup failed' })
        socket.disconnect()
      }
    })
  }

  /**
   * Handle user disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    if (!socket.userId) return

    logger.info(`User ${socket.userId} disconnected (${socket.id}): ${reason}`)

    // Remove from connected users
    this.connectedUsers.delete(socket.id)

    // Update user sockets mapping
    const userSocketIds = this.userSockets.get(socket.userId)
    if (userSocketIds) {
      userSocketIds.delete(socket.id)
      
      // Remove mapping if no more sockets
      if (userSocketIds.size === 0) {
        this.userSockets.delete(socket.userId)
        
        // Broadcast user offline status to project members
        const userData = this.connectedUsers.get(socket.id)
        if (userData) {
          userData.projectIds.forEach(projectId => {
            socket.to(`project:${projectId}`).emit('userOffline', {
              userId: socket.userId,
              timestamp: new Date()
            })
          })
        }
      }
    }
  }

  /**
   * Get user's accessible projects
   */
  private async getUserProjects(userId: string): Promise<Array<{ id: string, name: string }>> {
    try {
      // Get projects where user is creator, team member, or has appropriate role access
      const projects = await this.prisma.project.findMany({
        where: {
          OR: [
            { createdById: userId },
            { updatedById: userId },
            {
              fmeas: {
                some: {
                  OR: [
                    { createdById: userId },
                    { teamLeaderId: userId },
                    { teamMembers: { some: { userId } } }
                  ]
                }
              }
            },
            {
              controlPlans: {
                some: {
                  OR: [
                    { createdById: userId },
                    { teamMembers: { some: { userId } } }
                  ]
                }
              }
            }
          ]
        },
        select: { id: true, name: true },
        distinct: ['id']
      })

      return projects
    } catch (error) {
      logger.error(`Error getting user projects for ${userId}:`, error)
      return []
    }
  }

  /**
   * Update user presence
   */
  private updateUserPresence(userId: string, presence: { status: string, activity?: string }): void {
    // In a production system, you might want to store this in Redis or database
    // For now, we'll just track it in memory
    logger.debug(`User ${userId} presence updated:`, presence)
  }

  /**
   * Start cleanup interval for stale connections
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      // Clean up any stale connections or perform maintenance
      const stats = this.getConnectionStats()
      logger.debug('WebSocket connection stats:', stats)
    }, 5 * 60 * 1000) // Every 5 minutes
  }
}

export default WebSocketService