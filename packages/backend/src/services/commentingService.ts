import { PrismaClient } from '../generated/client'
import WebSocketService from './websocketService'
import NotificationService from './notificationService'
import logger from '../utils/logger'

interface Comment {
  id: string
  content: string
  entityType: 'FMEA' | 'FAILURE_MODE' | 'PROCESS_FLOW' | 'PROCESS_STEP' | 'CONTROL_PLAN' | 'CONTROL_PLAN_ITEM' | 'ACTION_ITEM'
  entityId: string
  parentCommentId?: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  isResolved: boolean
  isPrivate: boolean
  mentions: string[]
  attachments: string[]
  reactions: CommentReaction[]
  tags: string[]
}

interface CommentReaction {
  userId: string
  emoji: string
  createdAt: Date
}

interface CommentThread {
  rootComment: Comment
  replies: Comment[]
  totalReplies: number
  lastActivity: Date
  participants: string[]
  isResolved: boolean
}

interface CreateCommentOptions {
  content: string
  entityType: Comment['entityType']
  entityId: string
  parentCommentId?: string
  authorId: string
  mentions?: string[]
  tags?: string[]
  isPrivate?: boolean
  attachments?: string[]
}

interface UpdateCommentOptions {
  content?: string
  isResolved?: boolean
  tags?: string[]
  isPrivate?: boolean
}

interface CommentFilters {
  entityType?: Comment['entityType']
  entityId?: string
  authorId?: string
  isResolved?: boolean
  isPrivate?: boolean
  tags?: string[]
  mentions?: string
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  hasAttachments?: boolean
}

interface CommentAnalytics {
  totalComments: number
  commentsThisMonth: number
  commentsThisWeek: number
  resolvedComments: number
  unresolvedComments: number
  topCommenters: Array<{
    userId: string
    userName: string
    commentCount: number
  }>
  commentsByEntity: Array<{
    entityType: string
    count: number
  }>
  averageResolutionTime: number
  mostActiveThreads: Array<{
    commentId: string
    replyCount: number
    lastActivity: Date
  }>
}

class CommentingService {
  private prisma: PrismaClient
  private websocketService?: WebSocketService
  private notificationService?: NotificationService

  constructor(
    prisma: PrismaClient,
    websocketService?: WebSocketService,
    notificationService?: NotificationService
  ) {
    this.prisma = prisma
    this.websocketService = websocketService
    this.notificationService = notificationService
  }

  /**
   * Create a new comment
   */
  async createComment(options: CreateCommentOptions): Promise<Comment> {
    try {
      // Validate entity exists
      await this.validateEntityExists(options.entityType, options.entityId)

      // Extract mentions from content if not provided
      const mentions = options.mentions || this.extractMentions(options.content)

      // Create comment
      const comment = await this.prisma.comment.create({
        data: {
          content: options.content,
          entityType: options.entityType,
          entityId: options.entityId,
          parentCommentId: options.parentCommentId,
          authorId: options.authorId,
          mentions: mentions,
          tags: options.tags || [],
          isPrivate: options.isPrivate || false,
          attachments: options.attachments || [],
          isResolved: false
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true }
          },
          reactions: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        }
      })

      // Get project context for notifications
      const projectId = await this.getProjectIdForEntity(options.entityType, options.entityId)

      // Send real-time notification via WebSocket
      if (this.websocketService && projectId) {
        this.websocketService.emitChangeEvent(projectId, {
          id: comment.id,
          type: 'COMMENT_CREATED',
          entityType: options.entityType,
          entityId: options.entityId,
          author: comment.author,
          isReply: !!options.parentCommentId,
          timestamp: comment.createdAt
        })
      }

      // Send notifications to mentioned users
      if (mentions.length > 0 && this.notificationService) {
        await this.notifyMentionedUsers(comment, mentions, projectId)
      }

      // Send notification to thread participants if this is a reply
      if (options.parentCommentId && this.notificationService) {
        await this.notifyThreadParticipants(comment, options.parentCommentId, projectId)
      }

      // Log comment activity
      await this.logCommentActivity(comment.id, 'CREATED', options.authorId)

      return this.formatComment(comment)

    } catch (error) {
      logger.error('Error creating comment:', error)
      throw error
    }
  }

  /**
   * Get comments for an entity
   */
  async getComments(
    entityType: Comment['entityType'],
    entityId: string,
    options: {
      includeReplies?: boolean
      includePrivate?: boolean
      userId?: string
      limit?: number
      offset?: number
      orderBy?: 'createdAt' | 'updatedAt'
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<{ comments: Comment[], totalCount: number }> {
    try {
      const {
        includeReplies = true,
        includePrivate = false,
        userId,
        limit = 50,
        offset = 0,
        orderBy = 'createdAt',
        orderDirection = 'desc'
      } = options

      const whereClause: any = {
        entityType,
        entityId,
        ...(includeReplies ? {} : { parentCommentId: null }),
        ...(includePrivate ? {} : { 
          OR: [
            { isPrivate: false },
            ...(userId ? [{ authorId: userId }] : [])
          ]
        })
      }

      const [comments, totalCount] = await Promise.all([
        this.prisma.comment.findMany({
          where: whereClause,
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            },
            reactions: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            },
            ...(includeReplies ? {
              replies: {
                include: {
                  author: {
                    select: { id: true, name: true, avatar: true }
                  },
                  reactions: {
                    include: {
                      user: {
                        select: { id: true, name: true }
                      }
                    }
                  }
                },
                orderBy: { createdAt: 'asc' }
              }
            } : {})
          },
          orderBy: { [orderBy]: orderDirection },
          skip: offset,
          take: limit
        }),
        this.prisma.comment.count({ where: whereClause })
      ])

      return {
        comments: comments.map(comment => this.formatComment(comment)),
        totalCount
      }

    } catch (error) {
      logger.error('Error getting comments:', error)
      throw error
    }
  }

  /**
   * Get comment threads (root comments with their replies)
   */
  async getCommentThreads(
    entityType: Comment['entityType'],
    entityId: string,
    options: {
      includeResolved?: boolean
      userId?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ threads: CommentThread[], totalCount: number }> {
    try {
      const {
        includeResolved = true,
        userId,
        limit = 20,
        offset = 0
      } = options

      const whereClause: any = {
        entityType,
        entityId,
        parentCommentId: null,
        ...(includeResolved ? {} : { isResolved: false }),
        ...(userId ? {} : { isPrivate: false })
      }

      const [rootComments, totalCount] = await Promise.all([
        this.prisma.comment.findMany({
          where: whereClause,
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            },
            reactions: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, avatar: true }
                },
                reactions: {
                  include: {
                    user: {
                      select: { id: true, name: true }
                    }
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        this.prisma.comment.count({ where: whereClause })
      ])

      const threads: CommentThread[] = rootComments.map(rootComment => {
        const allParticipants = new Set<string>()
        allParticipants.add(rootComment.authorId)
        rootComment.replies.forEach((reply: any) => allParticipants.add(reply.authorId))

        const lastActivity = rootComment.replies.length > 0 
          ? new Date(Math.max(
              new Date(rootComment.updatedAt).getTime(),
              ...rootComment.replies.map((r: any) => new Date(r.updatedAt).getTime())
            ))
          : rootComment.updatedAt

        return {
          rootComment: this.formatComment(rootComment),
          replies: rootComment.replies.map((reply: any) => this.formatComment(reply)),
          totalReplies: rootComment.replies.length,
          lastActivity,
          participants: Array.from(allParticipants),
          isResolved: rootComment.isResolved
        }
      })

      return { threads, totalCount }

    } catch (error) {
      logger.error('Error getting comment threads:', error)
      throw error
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    updates: UpdateCommentOptions,
    userId: string
  ): Promise<Comment> {
    try {
      // Verify comment exists and user can edit it
      const existingComment = await this.prisma.comment.findUnique({
        where: { id: commentId },
        include: { author: true }
      })

      if (!existingComment) {
        throw new Error('Comment not found')
      }

      if (existingComment.authorId !== userId) {
        throw new Error('Unauthorized to edit this comment')
      }

      // Update comment
      const updatedComment = await this.prisma.comment.update({
        where: { id: commentId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true }
          },
          reactions: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        }
      })

      // Send real-time update
      const projectId = await this.getProjectIdForEntity(updatedComment.entityType, updatedComment.entityId)
      if (this.websocketService && projectId) {
        this.websocketService.emitChangeEvent(projectId, {
          id: commentId,
          type: 'COMMENT_UPDATED',
          entityType: updatedComment.entityType,
          entityId: updatedComment.entityId,
          updates,
          timestamp: new Date()
        })
      }

      // Log activity
      await this.logCommentActivity(commentId, 'UPDATED', userId)

      return this.formatComment(updatedComment)

    } catch (error) {
      logger.error('Error updating comment:', error)
      throw error
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      // Verify comment exists and user can delete it
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
        include: { replies: true }
      })

      if (!comment) {
        throw new Error('Comment not found')
      }

      if (comment.authorId !== userId) {
        // Check if user has admin privileges
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        })

        if (user?.role !== 'ADMIN') {
          throw new Error('Unauthorized to delete this comment')
        }
      }

      // Delete comment and all replies
      await this.prisma.comment.deleteMany({
        where: {
          OR: [
            { id: commentId },
            { parentCommentId: commentId }
          ]
        }
      })

      // Send real-time notification
      const projectId = await this.getProjectIdForEntity(comment.entityType, comment.entityId)
      if (this.websocketService && projectId) {
        this.websocketService.emitChangeEvent(projectId, {
          id: commentId,
          type: 'COMMENT_DELETED',
          entityType: comment.entityType,
          entityId: comment.entityId,
          timestamp: new Date()
        })
      }

      // Log activity
      await this.logCommentActivity(commentId, 'DELETED', userId)

    } catch (error) {
      logger.error('Error deleting comment:', error)
      throw error
    }
  }

  /**
   * Add reaction to comment
   */
  async addReaction(
    commentId: string,
    emoji: string,
    userId: string
  ): Promise<CommentReaction> {
    try {
      // Remove existing reaction from this user if it exists
      await this.prisma.commentReaction.deleteMany({
        where: {
          commentId,
          userId
        }
      })

      // Add new reaction
      const reaction = await this.prisma.commentReaction.create({
        data: {
          commentId,
          userId,
          emoji
        },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      })

      // Send real-time update
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
        select: { entityType: true, entityId: true }
      })

      if (comment) {
        const projectId = await this.getProjectIdForEntity(comment.entityType, comment.entityId)
        if (this.websocketService && projectId) {
          this.websocketService.emitChangeEvent(projectId, {
            id: commentId,
            type: 'COMMENT_REACTION_ADDED',
            reaction: {
              emoji,
              user: reaction.user
            },
            timestamp: new Date()
          })
        }
      }

      return {
        userId: reaction.userId,
        emoji: reaction.emoji,
        createdAt: reaction.createdAt
      }

    } catch (error) {
      logger.error('Error adding reaction:', error)
      throw error
    }
  }

  /**
   * Remove reaction from comment
   */
  async removeReaction(commentId: string, userId: string): Promise<void> {
    try {
      await this.prisma.commentReaction.deleteMany({
        where: {
          commentId,
          userId
        }
      })

      // Send real-time update
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
        select: { entityType: true, entityId: true }
      })

      if (comment) {
        const projectId = await this.getProjectIdForEntity(comment.entityType, comment.entityId)
        if (this.websocketService && projectId) {
          this.websocketService.emitChangeEvent(projectId, {
            id: commentId,
            type: 'COMMENT_REACTION_REMOVED',
            userId,
            timestamp: new Date()
          })
        }
      }

    } catch (error) {
      logger.error('Error removing reaction:', error)
      throw error
    }
  }

  /**
   * Resolve a comment thread
   */
  async resolveThread(commentId: string, userId: string): Promise<void> {
    try {
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { 
          isResolved: true,
          resolvedAt: new Date(),
          resolvedById: userId
        }
      })

      // Log activity
      await this.logCommentActivity(commentId, 'RESOLVED', userId)

    } catch (error) {
      logger.error('Error resolving thread:', error)
      throw error
    }
  }

  /**
   * Search comments
   */
  async searchComments(
    query: string,
    filters: CommentFilters = {},
    options: {
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ comments: Comment[], totalCount: number }> {
    try {
      const { limit = 50, offset = 0 } = options

      const whereClause: any = {
        content: { contains: query, mode: 'insensitive' },
        ...filters,
        ...(filters.dateRange && {
          createdAt: {
            gte: filters.dateRange.startDate,
            lte: filters.dateRange.endDate
          }
        }),
        ...(filters.mentions && {
          mentions: { has: filters.mentions }
        })
      }

      const [comments, totalCount] = await Promise.all([
        this.prisma.comment.findMany({
          where: whereClause,
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            },
            reactions: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        this.prisma.comment.count({ where: whereClause })
      ])

      return {
        comments: comments.map(comment => this.formatComment(comment)),
        totalCount
      }

    } catch (error) {
      logger.error('Error searching comments:', error)
      throw error
    }
  }

  /**
   * Get comment analytics
   */
  async getCommentAnalytics(
    projectId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<CommentAnalytics> {
    try {
      const whereClause: any = {
        ...(dateRange && {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        })
      }

      // If projectId is provided, filter by entities belonging to that project
      if (projectId) {
        // This would need to be implemented based on how you want to associate comments with projects
        // For now, we'll use a simplified approach
      }

      const [
        totalComments,
        commentsThisMonth,
        commentsThisWeek,
        resolvedComments,
        topCommenters,
        commentsByEntity
      ] = await Promise.all([
        this.prisma.comment.count({ where: whereClause }),
        this.prisma.comment.count({
          where: {
            ...whereClause,
            createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
          }
        }),
        this.prisma.comment.count({
          where: {
            ...whereClause,
            createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
          }
        }),
        this.prisma.comment.count({
          where: { ...whereClause, isResolved: true }
        }),
        this.prisma.comment.groupBy({
          by: ['authorId'],
          where: whereClause,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        this.prisma.comment.groupBy({
          by: ['entityType'],
          where: whereClause,
          _count: { id: true }
        })
      ])

      // Get user details for top commenters
      const topCommentersWithDetails = await Promise.all(
        topCommenters.map(async (commenter) => {
          const user = await this.prisma.user.findUnique({
            where: { id: commenter.authorId },
            select: { id: true, name: true }
          })
          return {
            userId: commenter.authorId,
            userName: user?.name || 'Unknown',
            commentCount: commenter._count.id
          }
        })
      )

      return {
        totalComments,
        commentsThisMonth,
        commentsThisWeek,
        resolvedComments,
        unresolvedComments: totalComments - resolvedComments,
        topCommenters: topCommentersWithDetails,
        commentsByEntity: commentsByEntity.map(item => ({
          entityType: item.entityType,
          count: item._count.id
        })),
        averageResolutionTime: 0, // Would calculate based on resolved comments
        mostActiveThreads: [] // Would calculate based on reply counts
      }

    } catch (error) {
      logger.error('Error getting comment analytics:', error)
      throw error
    }
  }

  /**
   * Helper methods
   */
  private async validateEntityExists(entityType: Comment['entityType'], entityId: string): Promise<void> {
    let exists = false

    switch (entityType) {
      case 'FMEA':
        exists = await this.prisma.fmea.findUnique({ where: { id: entityId } }) !== null
        break
      case 'FAILURE_MODE':
        exists = await this.prisma.failureMode.findUnique({ where: { id: entityId } }) !== null
        break
      case 'PROCESS_FLOW':
        exists = await this.prisma.processFlow.findUnique({ where: { id: entityId } }) !== null
        break
      case 'PROCESS_STEP':
        exists = await this.prisma.processStep.findUnique({ where: { id: entityId } }) !== null
        break
      case 'CONTROL_PLAN':
        exists = await this.prisma.controlPlan.findUnique({ where: { id: entityId } }) !== null
        break
      case 'CONTROL_PLAN_ITEM':
        exists = await this.prisma.controlPlanItem.findUnique({ where: { id: entityId } }) !== null
        break
      case 'ACTION_ITEM':
        exists = await this.prisma.actionItem.findUnique({ where: { id: entityId } }) !== null
        break
    }

    if (!exists) {
      throw new Error(`${entityType} with ID ${entityId} not found`)
    }
  }

  private async getProjectIdForEntity(entityType: Comment['entityType'], entityId: string): Promise<string | null> {
    try {
      switch (entityType) {
        case 'FMEA':
          const fmea = await this.prisma.fmea.findUnique({ where: { id: entityId }, select: { projectId: true } })
          return fmea?.projectId || null
        case 'FAILURE_MODE':
          const failureMode = await this.prisma.failureMode.findUnique({ where: { id: entityId }, include: { fmea: { select: { projectId: true } } } })
          return failureMode?.fmea?.projectId || null
        case 'PROCESS_FLOW':
          const processFlow = await this.prisma.processFlow.findUnique({ where: { id: entityId }, select: { projectId: true } })
          return processFlow?.projectId || null
        case 'PROCESS_STEP':
          const processStep = await this.prisma.processStep.findUnique({ where: { id: entityId }, include: { processFlow: { select: { projectId: true } } } })
          return processStep?.processFlow?.projectId || null
        case 'CONTROL_PLAN':
          const controlPlan = await this.prisma.controlPlan.findUnique({ where: { id: entityId }, select: { projectId: true } })
          return controlPlan?.projectId || null
        default:
          return null
      }
    } catch (error) {
      logger.error('Error getting project ID for entity:', error)
      return null
    }
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }

    return mentions
  }

  private formatComment(comment: any): Comment {
    return {
      id: comment.id,
      content: comment.content,
      entityType: comment.entityType,
      entityId: comment.entityId,
      parentCommentId: comment.parentCommentId,
      authorId: comment.authorId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isResolved: comment.isResolved,
      isPrivate: comment.isPrivate,
      mentions: comment.mentions || [],
      attachments: comment.attachments || [],
      reactions: comment.reactions?.map((reaction: any) => ({
        userId: reaction.userId,
        emoji: reaction.emoji,
        createdAt: reaction.createdAt
      })) || [],
      tags: comment.tags || []
    }
  }

  private async notifyMentionedUsers(comment: any, mentions: string[], projectId: string | null): Promise<void> {
    // Implementation would send notifications to mentioned users
    logger.info(`Notifying ${mentions.length} mentioned users for comment ${comment.id}`)
  }

  private async notifyThreadParticipants(comment: any, parentCommentId: string, projectId: string | null): Promise<void> {
    // Implementation would notify thread participants of new reply
    logger.info(`Notifying thread participants for reply to comment ${parentCommentId}`)
  }

  private async logCommentActivity(commentId: string, activity: string, userId: string): Promise<void> {
    try {
      await this.prisma.userActivity.create({
        data: {
          userId,
          action: `COMMENT_${activity}`,
          entityType: 'COMMENT',
          entityId: commentId,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.error('Error logging comment activity:', error)
    }
  }
}

export default CommentingService