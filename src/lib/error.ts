/**
 * Application Error Types
 *
 * Provides structured error handling with HTTP status codes.
 */

/** Error information for API responses. */
export interface ErrorInfo {
  status: number
  code: string
  message: string
}

/** Custom error class for application errors. */
export class AppError extends Error {
  public status: number
  public code: string
  public timestamp: string

  constructor({
    status,
    code,
    message,
    timestamp = new Date().toISOString(),
  }: {
    status: number
    code: string
    message: string
    timestamp?: string
  }) {
    super(message)
    this.status = status
    this.code = code
    this.timestamp = timestamp

    Object.setPrototypeOf(this, AppError.prototype)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  public toResponse(): ErrorInfo {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
    }
  }
}

/** Common error factory functions. */
export const Errors = {
  badRequest: (message: string) => new AppError({ status: 400, code: 'BAD_REQUEST', message }),
  unauthorized: (message: string) => new AppError({ status: 401, code: 'UNAUTHORIZED', message }),
  forbidden: (message: string) => new AppError({ status: 403, code: 'FORBIDDEN', message }),
  notFound: (message: string) => new AppError({ status: 404, code: 'NOT_FOUND', message }),
  conflict: (message: string) => new AppError({ status: 409, code: 'CONFLICT', message }),
  validation: (message: string) => new AppError({ status: 422, code: 'VALIDATION_ERROR', message }),
  internal: (message: string) =>
    new AppError({ status: 500, code: 'INTERNAL_SERVER_ERROR', message }),
} as const
