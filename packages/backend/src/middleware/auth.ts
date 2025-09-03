import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '../generated/client'

const prisma = new PrismaClient()

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    firstName: string
    lastName: string
  }
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access token required',
          status: 401,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured')
      return res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          status: 500,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload

    // Verify user still exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          status: 401,
        },
        timestamp: new Date().toISOString(),
      })
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid token',
        status: 403,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          status: 401,
        },
        timestamp: new Date().toISOString(),
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          status: 403,
        },
        timestamp: new Date().toISOString(),
      })
    }

    next()
  }
}

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return next() // No token provided, continue without authentication
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return next() // No JWT secret configured, continue without authentication
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    })

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    }

    next()
  } catch (error) {
    // Invalid token, but continue without authentication
    next()
  }
}