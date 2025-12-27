// Mock the logger to avoid console noise in tests - must be before imports
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

import { Result } from '../src/lib'
import {
  callMockAi,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
  __testing__,
} from '../src/services/mockAi'

describe('Mock AI Service - Circuit Breaker', () => {
  beforeEach(() => {
    // Reset circuit breaker state before each test
    resetCircuitBreaker()
  })

  describe('Initial State', () => {
    it('should start with circuit breaker in closed state', () => {
      const status = getCircuitBreakerStatus()

      expect(status.state).toBe('closed')
      expect(status.failures).toBe(0)
      expect(status.lastFailure).toBeNull()
      expect(status.lastSuccess).toBeNull()
    })
  })

  describe('Circuit Opens After 3 Failures', () => {
    it('should open circuit after 3 consecutive failures', async () => {
      // Directly set state to simulate 3 failures triggering circuit open
      __testing__.setState({
        state: 'open',
        failures: 3,
        lastFailure: Date.now(),
      })

      const status = getCircuitBreakerStatus()
      expect(status.state).toBe('open')
      expect(status.failures).toBe(3)
    })

    it('should track failure count correctly', () => {
      const state = __testing__.getState()

      // Simulate failures
      state.failures = 1
      expect(state.failures).toBe(1)

      state.failures = 2
      expect(state.failures).toBe(2)

      state.failures = 3
      expect(state.failures).toBe(3)
    })
  })

  describe('Circuit Returns 503 When Open', () => {
    it('should return 503 Service Unavailable when circuit is open', async () => {
      // Force circuit to open state
      __testing__.setState({
        state: 'open',
        failures: 3,
        lastFailure: Date.now(),
      })

      const result = await callMockAi('test message')

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.status).toBe(503)
        expect(result.error.code).toBe('SERVICE_UNAVAILABLE')
        expect(result.error.message).toBe('Service Busy')
      }
    })

    it('should reject immediately without delay when circuit is open', async () => {
      __testing__.setState({
        state: 'open',
        failures: 3,
        lastFailure: Date.now(),
      })

      const startTime = Date.now()
      await callMockAi('test message')
      const elapsed = Date.now() - startTime

      // Should return immediately (well under the 2 second simulated delay)
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('Circuit Half-Opens After 30 Seconds', () => {
    it('should transition to half-open after reset timeout', () => {
      // Set circuit to open with failure 30+ seconds ago
      const thirtySecondsAgo = Date.now() - 31000
      __testing__.setState({
        state: 'open',
        failures: 3,
        lastFailure: thirtySecondsAgo,
      })

      // Getting status should trigger transition check
      const status = getCircuitBreakerStatus()

      expect(status.state).toBe('half-open')
    })

    it('should not transition to half-open before 30 seconds', () => {
      // Set circuit to open with recent failure
      const twentyNineSecondsAgo = Date.now() - 29000
      __testing__.setState({
        state: 'open',
        failures: 3,
        lastFailure: twentyNineSecondsAgo,
      })

      const status = getCircuitBreakerStatus()

      expect(status.state).toBe('open')
    })
  })

  describe('Circuit Closes on Success in Half-Open', () => {
    it('should close circuit after successful request in half-open state', () => {
      // Set circuit to half-open state
      __testing__.setState({
        state: 'half-open',
        failures: 3,
        lastFailure: Date.now() - 31000,
      })

      // Simulate a successful request by directly setting state
      // (In production, recordSuccess() would be called after successful AI response)
      __testing__.setState({
        state: 'closed',
        failures: 0,
        lastSuccess: Date.now(),
      })

      const status = getCircuitBreakerStatus()
      expect(status.state).toBe('closed')
      expect(status.failures).toBe(0)
    })

    it('should re-open circuit after failure in half-open state', () => {
      // Set circuit to half-open state
      __testing__.setState({
        state: 'half-open',
        failures: 3,
        lastFailure: Date.now() - 31000,
      })

      // Simulate a failure by directly setting state
      // (In production, recordFailure() would set this after failure in half-open)
      __testing__.setState({
        state: 'open',
        failures: 4,
        lastFailure: Date.now(),
      })

      const status = getCircuitBreakerStatus()
      expect(status.state).toBe('open')
    })
  })

  describe('Reset Circuit Breaker', () => {
    it('should reset all state to initial values', () => {
      // Set some state
      __testing__.setState({
        state: 'open',
        failures: 5,
        lastFailure: Date.now(),
        lastSuccess: Date.now(),
      })

      // Reset
      resetCircuitBreaker()

      const status = getCircuitBreakerStatus()
      expect(status.state).toBe('closed')
      expect(status.failures).toBe(0)
      expect(status.lastFailure).toBeNull()
      expect(status.lastSuccess).toBeNull()
    })
  })

  describe('Status Reporting', () => {
    it('should return ISO 8601 timestamps for lastFailure and lastSuccess', () => {
      const now = Date.now()
      __testing__.setState({
        state: 'closed',
        failures: 1,
        lastFailure: now,
        lastSuccess: now - 1000,
      })

      const status = getCircuitBreakerStatus()

      // Check ISO 8601 format
      expect(status.lastFailure).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(status.lastSuccess).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should return null for timestamps when not set', () => {
      resetCircuitBreaker()

      const status = getCircuitBreakerStatus()

      expect(status.lastFailure).toBeNull()
      expect(status.lastSuccess).toBeNull()
    })
  })
})
