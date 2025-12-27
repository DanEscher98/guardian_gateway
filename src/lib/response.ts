/**
 * API Response Types and Helpers
 *
 * Standardized response format for all API endpoints.
 */

import type { ErrorInfo } from './error'

/** Pagination information for list responses. */
export interface PaginationInfo {
  total_items: number
  total_pages: number
  current_page: number
  page_size: number
  has_more: boolean
}

/** Base response type with common fields. */
export type AppBaseResponse = {
  timestamp: string
  success: boolean
}

/** Error response type. */
export type AppErrorResponse = AppBaseResponse & {
  success: false
  error: ErrorInfo
}

/** Success response type with data payload. */
export type AppSuccessResponse<T> = AppBaseResponse & {
  success: true
  data: T
}

/** Union type for all possible responses (Result pattern). */
export type AppResponse<T> = AppSuccessResponse<T> | AppErrorResponse

/** Paginated success response type. */
export type AppPaginatedSuccessResponse<T> = AppBaseResponse & {
  success: true
  data: T
  pagination: PaginationInfo
}

/** Union type for paginated responses. */
export type AppPaginatedResponse<T> = AppPaginatedSuccessResponse<T> | AppErrorResponse

/** Helper type for paginated results from services. */
export type PaginatedResult<T> = [T, PaginationInfo]

/** Async response types for controller methods. */
export type AppAsyncResponse<T> = Promise<AppResponse<T>>
export type AppAsyncPaginatedResponse<T> = Promise<AppPaginatedResponse<T>>

// =============================================================================
// Response Helpers
// =============================================================================

/** Creates a standardized success response object. */
export function createSuccessResponse<T>(data: T): AppResponse<T> {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
  }
}

/** Creates a standardized paginated success response object. */
export function createPaginatedSuccessResponse<T>(
  data: T,
  pagination: PaginationInfo
): AppPaginatedResponse<T> {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
    pagination,
  }
}

/** Creates a standardized error response object. */
export function createErrorResponse(errorInfo: ErrorInfo): AppResponse<never> {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    error: errorInfo,
  }
}

/** Creates a standardized paginated error response object. */
export function createPaginatedErrorResponse(errorInfo: ErrorInfo): AppPaginatedResponse<never> {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    error: errorInfo,
  }
}

/** Calculate pagination info from query parameters and total count. */
export function getPaginationInfo({
  page,
  page_size,
  total_items,
}: {
  page: number
  page_size: number
  total_items: number
}): PaginationInfo {
  const total_pages = Math.ceil(total_items / page_size)
  return {
    total_items,
    total_pages,
    current_page: page,
    page_size,
    has_more: page < total_pages,
  }
}
