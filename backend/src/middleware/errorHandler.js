import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
      },
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'VALIDATION_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
      },
    });
  }

  // Default: 500 Internal Server Error
  console.error('[errorHandler] Unhandled Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
    },
  });
};
