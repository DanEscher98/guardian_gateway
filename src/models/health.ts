import { z } from 'zod'

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

export const circuitBreakerStateSchema = z.enum(['closed', 'open', 'half-open'])

/**
 * Circuit breaker status for monitoring
 */
export interface CircuitBreakerStatus {
  state: CircuitBreakerState
  failures: number
  lastFailure: string | null
  lastSuccess: string | null
}

export const circuitBreakerStatusSchema = z.object({
  state: circuitBreakerStateSchema,
  failures: z.number().int().min(0),
  lastFailure: z.string().nullable(),
  lastSuccess: z.string().nullable(),
})

/**
 * Mock AI service status
 */
export interface MockAiServiceStatus {
  status: 'available' | 'unavailable'
  circuitBreaker: CircuitBreakerStatus
}

/**
 * Services status container
 */
export interface ServicesStatus {
  mockAi: MockAiServiceStatus
}

/**
 * Enhanced health status with service info
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded'
  timestamp: string
  uptime: number
  services: ServicesStatus
}

export const healthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  timestamp: z.string(),
  uptime: z.number(),
  services: z.object({
    mockAi: z.object({
      status: z.enum(['available', 'unavailable']),
      circuitBreaker: circuitBreakerStatusSchema,
    }),
  }),
})
