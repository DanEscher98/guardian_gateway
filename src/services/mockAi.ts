/**
 * Mock AI Service with Circuit Breaker
 *
 * Simulates AI responses with circuit breaker pattern for resilience.
 * Used for development and testing without calling real AI APIs.
 */

import { AppError, type AsyncResult, Result } from '../lib'
import type { CircuitBreakerStatus, MockAIResponse } from '../models/contracts'
import logger from '../utils/logger'

// Circuit breaker configuration
const FAILURE_THRESHOLD = 3
const RESET_TIMEOUT = 30000 // 30 seconds
const SIMULATED_DELAY = 2000 // 2 seconds
const FAILURE_RATE = 0.5 // 50% failure rate for testing

// Circuit breaker state (in-memory singleton)
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  lastFailure: number | null
  lastSuccess: number | null
}

const circuitState: CircuitBreakerState = {
  state: 'closed',
  failures: 0,
  lastFailure: null,
  lastSuccess: null,
}

/**
 * Check if circuit should transition from OPEN to HALF-OPEN.
 */
function checkCircuitTransition(): void {
  if (
    circuitState.state === 'open' &&
    circuitState.lastFailure !== null &&
    Date.now() - circuitState.lastFailure >= RESET_TIMEOUT
  ) {
    logger.info('Circuit breaker transitioning to half-open')
    circuitState.state = 'half-open'
  }
}

/**
 * Record a successful call.
 */
function recordSuccess(): void {
  circuitState.lastSuccess = Date.now()

  if (circuitState.state === 'half-open') {
    logger.info('Circuit breaker closing after successful test request')
    circuitState.state = 'closed'
    circuitState.failures = 0
  } else if (circuitState.state === 'closed') {
    circuitState.failures = 0
  }
}

/**
 * Record a failed call.
 */
function recordFailure(): void {
  circuitState.failures++
  circuitState.lastFailure = Date.now()

  if (circuitState.state === 'half-open') {
    logger.warn('Circuit breaker opening after failure in half-open state')
    circuitState.state = 'open'
  } else if (circuitState.failures >= FAILURE_THRESHOLD) {
    logger.warn(`Circuit breaker opening after ${circuitState.failures} failures`)
    circuitState.state = 'open'
  }
}

/**
 * Simulate processing delay.
 */
async function simulateDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY))
}

/**
 * Simulate random failure based on failure rate.
 */
function shouldFail(): boolean {
  return Math.random() < FAILURE_RATE
}

/**
 * Create 503 Service Unavailable error.
 */
function serviceUnavailableError(): AppError {
  return new AppError({
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service Busy',
  })
}

/**
 * Call the mock AI service.
 *
 * @param message - The message to process
 * @returns AsyncResult with MockAIResponse or error
 */
export async function callMockAi(message: string): AsyncResult<MockAIResponse> {
  const startTime = Date.now()

  // Check circuit state transition
  checkCircuitTransition()

  // If circuit is open, reject immediately
  if (circuitState.state === 'open') {
    logger.warn('Circuit breaker is open, rejecting request')
    return Result.err(serviceUnavailableError())
  }

  try {
    // Simulate processing delay
    await simulateDelay()

    // Simulate random failure (50% rate)
    if (shouldFail()) {
      throw new Error('Simulated AI service failure')
    }

    // Generate mock response
    const processingTime = Date.now() - startTime
    const response: MockAIResponse = {
      answer: `This is a mock AI response to your message. Your query was ${message.length} characters long.`,
      processingTime,
    }

    recordSuccess()
    logger.debug('Mock AI request completed', { processingTime })

    return Result.ok(response)
  } catch (error) {
    recordFailure()

    const errorMessage = error instanceof Error ? error.message : 'Unknown AI service error'
    logger.error('Mock AI request failed', {
      error: errorMessage,
      circuitState: circuitState.state,
    })

    return Result.err(
      new AppError({
        status: 500,
        code: 'AI_SERVICE_ERROR',
        message: errorMessage,
      })
    )
  }
}

/**
 * Get the current circuit breaker status.
 *
 * @returns CircuitBreakerStatus for health endpoint visibility
 */
export function getCircuitBreakerStatus(): CircuitBreakerStatus {
  checkCircuitTransition()

  return {
    state: circuitState.state,
    failures: circuitState.failures,
    lastFailure: circuitState.lastFailure ? new Date(circuitState.lastFailure).toISOString() : null,
    lastSuccess: circuitState.lastSuccess ? new Date(circuitState.lastSuccess).toISOString() : null,
  }
}

/**
 * Reset the circuit breaker to closed state (for testing).
 */
export function resetCircuitBreaker(): void {
  circuitState.state = 'closed'
  circuitState.failures = 0
  circuitState.lastFailure = null
  circuitState.lastSuccess = null
  logger.info('Circuit breaker manually reset')
}

/**
 * Testing utilities - DO NOT USE IN PRODUCTION.
 * Allows tests to directly manipulate circuit breaker state.
 */
export const __testing__ = {
  getState: () => circuitState,
  setState: (state: Partial<CircuitBreakerState>) => {
    Object.assign(circuitState, state)
  },
}
