/**
 * Base Controller
 *
 * Extended TSOA Controller with standardized error handling.
 */

import type { Request as ExRequest } from 'express'
import { Controller } from 'tsoa'

import { AppError } from './error'
import type {
  AppAsyncPaginatedResponse,
  AppAsyncResponse,
  AppResponse,
  PaginatedResult,
} from './response'
import {
  createErrorResponse,
  createPaginatedErrorResponse,
  createPaginatedSuccessResponse,
  createSuccessResponse,
} from './response'
import type { AsyncResult, ResultType } from './result'
import { Result } from './result'

/**
 * Base controller with standardized error handling.
 *
 * Provides multiple execution methods:
 * - `execute` / `executePaginated`: Work with Result<T, AppError> (recommended)
 * - `asyncExecute` / `asyncExecutePaginated`: Work with thrown errors (legacy)
 *
 * @example
 * import { AppController, Result, Errors } from '../lib'
 *
 * class UserController extends AppController {
 *   @Get('/:id')
 *   async getUser(@Path() id: string) {
 *     return this.execute(async () => {
 *       const user = await userService.findById(id)
 *       if (!user) return Result.err(Errors.notFound('User not found'))
 *       return Result.ok(user)
 *     })
 *   }
 * }
 */
export default class AppController extends Controller {
  // ---------------------------------------------------------------------------
  // Result-based methods (recommended)
  // ---------------------------------------------------------------------------

  /**
   * Execute a handler that returns a Result<T, AppError>.
   */
  protected async execute<T>(handler: () => AsyncResult<T, AppError>): AppAsyncResponse<T> {
    const result = await Result.tryCatch(async () => {
      const innerResult = await handler()
      if (!innerResult.ok) throw innerResult.error
      return innerResult.value
    })

    if (result.ok) {
      return createSuccessResponse(result.value)
    } else {
      this.setStatus(result.error.status)
      return createErrorResponse(result.error.toResponse())
    }
  }

  /**
   * Execute a handler that returns a Result with pagination.
   */
  protected async executePaginated<T>(
    handler: () => AsyncResult<PaginatedResult<T>, AppError>
  ): AppAsyncPaginatedResponse<T> {
    const result = await Result.tryCatch(async () => {
      const innerResult = await handler()
      if (!innerResult.ok) throw innerResult.error
      return innerResult.value
    })

    if (result.ok) {
      const [data, pagination] = result.value
      return createPaginatedSuccessResponse(data, pagination)
    } else {
      this.setStatus(result.error.status)
      return createPaginatedErrorResponse(result.error.toResponse())
    }
  }

  /**
   * Convert a Result to an API response directly.
   */
  protected fromResult<T>(result: ResultType<T, AppError>): AppResponse<T> {
    if (result.ok) {
      return createSuccessResponse(result.value)
    } else {
      this.setStatus(result.error.status)
      return createErrorResponse(result.error.toResponse())
    }
  }

  // ---------------------------------------------------------------------------
  // Exception-based methods (legacy)
  // ---------------------------------------------------------------------------

  /** @deprecated Prefer `execute()` with Result pattern. */
  protected async asyncExecute<T>(req: ExRequest, handler: () => Promise<T>): AppAsyncResponse<T> {
    try {
      const data = await handler()
      return createSuccessResponse(data)
    } catch (err: any) {
      if (err instanceof AppError) {
        this.setStatus(err.status)
        return createErrorResponse(err.toResponse())
      }
      const status = 500
      this.setStatus(status)
      return createErrorResponse({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error at '${req.route?.path || req.path}': ${err.message || 'Unknown error'}`,
        status,
      })
    }
  }

  /** @deprecated Prefer `executePaginated()` with Result pattern. */
  protected async asyncExecutePaginated<T>(
    req: ExRequest,
    handler: () => Promise<PaginatedResult<T>>
  ): AppAsyncPaginatedResponse<T> {
    try {
      const [data, pagination] = await handler()
      return createPaginatedSuccessResponse(data, pagination)
    } catch (err: any) {
      if (err instanceof AppError) {
        this.setStatus(err.status)
        return createPaginatedErrorResponse(err.toResponse())
      }
      const status = 500
      this.setStatus(status)
      return createPaginatedErrorResponse({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error at '${req.route?.path || req.path}': ${err.message || 'Unknown error'}`,
        status,
      })
    }
  }
}
