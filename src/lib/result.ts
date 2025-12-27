/**
 * Result Pattern
 *
 * Type-safe error handling inspired by Rust's Result<T, E>.
 */

import { AppError } from './error'

/** Represents a successful result containing a value. */
export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

/** Represents a failed result containing an error. */
export interface Err<E> {
  readonly ok: false
  readonly error: E
}

/** A Result is either Ok (success) or Err (failure). */
export type ResultType<T, E = AppError> = Ok<T> | Err<E>

/** Async version of Result. */
export type AsyncResult<T, E = AppError> = Promise<ResultType<T, E>>

/**
 * Result pattern utilities.
 *
 * @example
 * import { Result } from '../lib'
 *
 * const success = Result.ok(user)
 * const failure = Result.err(Errors.notFound('User not found'))
 *
 * if (Result.isOk(result)) {
 *   console.log(result.value)
 * }
 */
export const Result = {
  // Constructors
  ok<T>(value: T): Ok<T> {
    return { ok: true, value }
  },

  err<E>(error: E): Err<E> {
    return { ok: false, error }
  },

  // Type Guards
  isOk<T, E>(result: ResultType<T, E>): result is Ok<T> {
    return result.ok === true
  },

  isErr<T, E>(result: ResultType<T, E>): result is Err<E> {
    return result.ok === false
  },

  // Unwrap
  unwrap<T, E>(result: ResultType<T, E>): T {
    if (result.ok) return result.value
    throw result.error
  },

  unwrapOr<T, E>(result: ResultType<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue
  },

  unwrapOrElse<T, E>(result: ResultType<T, E>, fn: (error: E) => T): T {
    return result.ok ? result.value : fn(result.error)
  },

  // Transform
  map<T, U, E>(result: ResultType<T, E>, fn: (value: T) => U): ResultType<U, E> {
    return result.ok ? Result.ok(fn(result.value)) : result
  },

  mapErr<T, E, F>(result: ResultType<T, E>, fn: (error: E) => F): ResultType<T, F> {
    return result.ok ? result : Result.err(fn(result.error))
  },

  andThen<T, U, E>(result: ResultType<T, E>, fn: (value: T) => ResultType<U, E>): ResultType<U, E> {
    return result.ok ? fn(result.value) : result
  },

  or<T, E>(result: ResultType<T, E>, other: ResultType<T, E>): ResultType<T, E> {
    return result.ok ? result : other
  },

  // Async
  async tryCatch<T>(fn: () => Promise<T>): AsyncResult<T, AppError> {
    try {
      return Result.ok(await fn())
    } catch (error) {
      if (error instanceof AppError) return Result.err(error)
      return Result.err(
        new AppError({
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : String(error),
        })
      )
    }
  },

  async mapAsync<T, U, E>(
    result: ResultType<T, E>,
    fn: (value: T) => Promise<U>
  ): AsyncResult<U, E> {
    return result.ok ? Result.ok(await fn(result.value)) : result
  },

  async andThenAsync<T, U, E>(
    result: ResultType<T, E>,
    fn: (value: T) => AsyncResult<U, E>
  ): AsyncResult<U, E> {
    return result.ok ? fn(result.value) : result
  },

  // Collections
  collect<T, E>(results: ResultType<T, E>[]): ResultType<T[], E> {
    const values: T[] = []
    for (const result of results) {
      if (!result.ok) return result
      values.push(result.value)
    }
    return Result.ok(values)
  },

  partition<T, E>(results: ResultType<T, E>[]): { ok: T[]; err: E[] } {
    const ok: T[] = []
    const err: E[] = []
    for (const result of results) {
      if (result.ok) ok.push(result.value)
      else err.push(result.error)
    }
    return { ok, err }
  },
} as const
