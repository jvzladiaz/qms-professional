export const APP_NAME = 'QMS Automotive'
export const APP_VERSION = '1.0.0'

export const ROUTES = {
  HOME: '/',
  PROCESS_FLOW: '/process-flow',
  FMEA: '/fmea',
  CONTROL_PLAN: '/control-plan',
} as const

export const API_ENDPOINTS = {
  PROCESS_FLOW: '/process-flow',
  FMEA: '/fmea',
  CONTROL_PLAN: '/control-plan',
  USERS: '/users',
  AUTH: '/auth',
} as const

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  THEME: 'theme',
} as const

export const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  LONG: 'MMMM dd, yyyy',
  WITH_TIME: 'MM/dd/yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
} as const