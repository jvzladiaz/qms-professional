import { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message } = err

  console.error(`Error ${statusCode}: ${message}`)
  console.error(err.stack)

  const response = {
    error: {
      message: statusCode === 500 ? 'Internal Server Error' : message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  }

  res.status(statusCode).json(response)
}