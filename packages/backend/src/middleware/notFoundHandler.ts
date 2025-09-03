import { Request, Response, NextFunction } from 'express'

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Route ${req.originalUrl} not found`)
  res.status(404).json({
    error: {
      message: error.message,
      status: 404,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  })
}