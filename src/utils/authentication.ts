import type { Request } from 'express'

import { AppError } from '../lib'
import logger from './logger'

/**
 * JWT Payload interface.
 * Customize based on your JWT structure.
 */
export interface JwtPayload {
  sub: string
  iat: number
  exp: number
  iss?: string
  aud?: string
  jti?: string
  roles?: string[]
}

/**
 * User ID extracted from JWT.
 */
export interface UserID {
  id: string
  token_exp: string
}

/**
 * Extended Request with user information.
 */
export interface AuthRequest extends Request {
  user: UserID
}

/**
 * TSOA Authentication handler.
 * Called by TSOA when a route has @Security decorator.
 *
 * Implement your JWT verification logic here.
 * Example uses Bearer token from Authorization header.
 */
export const expressAuthentication = async (
  request: Request,
  securityName: string,
  _scopes?: string[]
): Promise<UserID> => {
  let token: string | undefined

  switch (securityName) {
    case 'bearer':
      token = request.headers.authorization?.split(' ')[1]
      break
    default:
      throw new AppError({
        status: 401,
        code: 'UNSUPPORTED_AUTH_SCHEME',
        message: `Unsupported security scheme: ${securityName}`,
      })
  }

  if (!token) {
    throw new AppError({
      status: 401,
      code: 'NO_TOKEN',
      message: 'No authentication token provided',
    })
  }

  // TODO: Implement your JWT verification logic here
  // Example with jsonwebtoken:
  // import jwt from 'jsonwebtoken'
  // try {
  //   const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
  //   return { id: decoded.sub, token_exp: new Date(decoded.exp * 1000).toISOString() }
  // } catch (err) {
  //   throw new AppError({ status: 401, code: 'INVALID_TOKEN', message: 'Invalid or expired token' })
  // }

  // For now, throw an error - implement your own verification
  logger.warn('JWT verification not implemented - implement in src/utils/authentication.ts')
  throw new AppError({
    status: 501,
    code: 'NOT_IMPLEMENTED',
    message: 'JWT verification not implemented',
  })
}
