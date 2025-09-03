import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')

export const requiredStringSchema = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`).trim()

export const optionalStringSchema = z.string().optional().nullable()

export const positiveIntegerSchema = (fieldName: string) =>
  z.number().int().positive(`${fieldName} must be a positive integer`)

export const nonNegativeIntegerSchema = (fieldName: string) =>
  z.number().int().min(0, `${fieldName} must be a non-negative integer`)

export const positiveNumberSchema = (fieldName: string) =>
  z.number().positive(`${fieldName} must be a positive number`)

export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be between 0 and 100')
  .max(100, 'Percentage must be between 0 and 100')

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const dateSchema = z.coerce.date()

export const futureDateSchema = z.coerce
  .date()
  .refine((date) => date > new Date(), 'Date must be in the future')

export const createPaginationSchema = () =>
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })

export const validateRating = (rating: number, min: number = 1, max: number = 10): boolean => {
  return Number.isInteger(rating) && rating >= min && rating <= max
}

export const validateRPN = (severity: number, occurrence: number, detection: number): number => {
  if (!validateRating(severity) || !validateRating(occurrence) || !validateRating(detection)) {
    throw new Error('Invalid rating values. All ratings must be integers between 1 and 10.')
  }
  return severity * occurrence * detection
}

export const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

export const validatePassword = (password: string): string[] => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return errors
}

export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '')
}

export const validateFileType = (filename: string, allowedTypes: string[]): boolean => {
  const extension = filename.toLowerCase().split('.').pop()
  return extension ? allowedTypes.includes(extension) : false
}

export const validateFileSize = (size: number, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return size <= maxSizeInBytes
}