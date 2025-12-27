import { Get, Request, Route, Security, SuccessResponse, Tags } from 'tsoa'

import { type AppAsyncResponse, AppController, createSuccessResponse, Errors, Result } from '../lib'
import type { HealthStatus } from '../models/health'
import { getCircuitBreakerStatus } from '../services/mockAi'
import type { AuthRequest, UserID } from '../utils/authentication'
import logger from '../utils/logger'

@Route('health')
@Tags('Health')
export class HealthController extends AppController {
  /**
   * Health check endpoint with service status.
   * Returns 200 OK with service health information.
   * Status is 'degraded' when circuit breaker is open.
   */
  @Get('/')
  @SuccessResponse('200', 'Health check successful')
  public async checkHealth(): AppAsyncResponse<HealthStatus> {
    const circuitBreakerStatus = getCircuitBreakerStatus()
    const isCircuitOpen = circuitBreakerStatus.state === 'open'

    return createSuccessResponse({
      status: isCircuitOpen ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mockAi: {
          status: isCircuitOpen ? 'unavailable' : 'available',
          circuitBreaker: circuitBreakerStatus,
        },
      },
    })
  }

  /**
   * Protected health check endpoint.
   * Validates JWT and returns user info.
   * Use this to test authentication is working.
   *
   * Demonstrates the Result pattern with `execute()`.
   */
  @Get('auth')
  @Security('bearer')
  @SuccessResponse('200', 'Authenticated successfully')
  public async checkAuth(@Request() req: AuthRequest): AppAsyncResponse<UserID> {
    return this.execute(async () => {
      if (!req.user) {
        return Result.err(Errors.unauthorized('User not authenticated'))
      }
      logger.debug(`Authenticated user: ${req.user.id}`)
      return Result.ok(req.user)
    })
  }
}
