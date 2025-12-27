/**
 * Framework Library
 *
 * Internal framework utilities for the application.
 * Single import point for all framework code.
 *
 * @example
 * import { AppController, Result, Errors, AppError } from '../lib'
 */

// Error handling
export type { ErrorInfo } from './error'
export { AppError, Errors } from './error'

// Result pattern
export type { AsyncResult, Err, Ok, ResultType } from './result'
export { Result } from './result'

// Response types and helpers
export type {
  AppAsyncPaginatedResponse,
  AppAsyncResponse,
  AppBaseResponse,
  AppErrorResponse,
  AppPaginatedResponse,
  AppPaginatedSuccessResponse,
  AppResponse,
  AppSuccessResponse,
  PaginatedResult,
  PaginationInfo,
} from './response'
export {
  createErrorResponse,
  createPaginatedErrorResponse,
  createPaginatedSuccessResponse,
  createSuccessResponse,
  getPaginationInfo,
} from './response'

// Base controller
export { default as AppController } from './controller'
