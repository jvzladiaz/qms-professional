export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: ApiError
  timestamp: string
  pagination?: PaginationInfo
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  field?: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  status?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
  assignee?: string
  department?: string
}

export interface QueryParams extends PaginationParams, FilterParams {
  include?: string[]
}

export interface BulkOperationRequest {
  ids: string[]
  action: BulkAction
  data?: Record<string, any>
}

export enum BulkAction {
  DELETE = 'DELETE',
  UPDATE = 'UPDATE',
  ARCHIVE = 'ARCHIVE',
  ACTIVATE = 'ACTIVATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export interface BulkOperationResponse {
  success: boolean
  processed: number
  failed: number
  errors?: ApiError[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  services: ServiceStatus[]
}

export interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  details?: Record<string, any>
}