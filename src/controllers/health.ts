import { Get, Request, Route, Security, SuccessResponse, Tags } from 'tsoa'

import { type AppAsyncResponse, AppController, createSuccessResponse, Errors, Result } from '../lib'
import type { AuthRequest, UserID } from '../utils/authentication'
import logger from '../utils/logger'

interface HealthStatus {
  status: string
  timestamp: string
  uptime: number
}

@Route('health')
@Tags('Health')
export class HealthController extends AppController {
  /**
   * Basic health check endpoint.
   * Returns 200 OK if the server is running.
   */
  @Get('/')
  @SuccessResponse('200', 'Health check successful')
  public async checkHealth(): AppAsyncResponse<HealthStatus> {
    return createSuccessResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
