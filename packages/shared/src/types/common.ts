export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  department?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  ADMIN = 'ADMIN',
  QUALITY_MANAGER = 'QUALITY_MANAGER',
  PROCESS_ENGINEER = 'PROCESS_ENGINEER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum Status {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface Attachment {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
  uploadedAt: Date
  uploadedBy: string
}

export interface Comment {
  id: string
  content: string
  author: User
  createdAt: Date
  updatedAt: Date
  parentId?: string
  replies?: Comment[]
}

export interface AuditLog {
  id: string
  entityId: string
  entityType: string
  action: AuditAction
  changes: Record<string, any>
  performedBy: string
  performedAt: Date
  ipAddress?: string
  userAgent?: string
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}