import { format, parseISO, formatDistanceToNow } from 'date-fns'

export const formatDate = (date: string | Date, formatString: string = 'MM/dd/yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatString)
}

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'MM/dd/yyyy HH:mm')
}

export const formatTimeAgo = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

export const formatNumber = (
  value: number,
  options: Intl.NumberFormatOptions = {}
): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)
}

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Bytes'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
}

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  } else {
    const days = Math.floor(minutes / 1440)
    const remainingHours = Math.floor((minutes % 1440) / 60)
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
}

export const formatPartNumber = (partNumber: string): string => {
  return partNumber.toUpperCase().replace(/\s+/g, '-')
}

export const formatRevision = (revision: string): string => {
  return revision.toUpperCase().padStart(2, '0')
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export const formatRPN = (severity: number, occurrence: number, detection: number): string => {
  const rpn = severity * occurrence * detection
  return `${rpn} (S:${severity} × O:${occurrence} × D:${detection})`
}

export const formatRiskLevel = (rpn: number): { level: string; color: string } => {
  if (rpn <= 40) {
    return { level: 'Low', color: '#4caf50' }
  } else if (rpn <= 100) {
    return { level: 'Medium', color: '#ff9800' }
  } else if (rpn <= 200) {
    return { level: 'High', color: '#ff5722' }
  } else {
    return { level: 'Very High', color: '#f44336' }
  }
}