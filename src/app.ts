import cors from 'cors'
import type {
  ErrorRequestHandler,
  NextFunction,
  Request as ExRequest,
  Response as ExResponse,
} from 'express'
import express, { urlencoded } from 'express'
import * as fs from 'fs/promises'
import * as yaml from 'js-yaml'
import * as path from 'path'
import swaggerUi from 'swagger-ui-express'

import { AppError, createErrorResponse } from './lib'
import { RegisterRoutes } from './routes'
import logger from './utils/logger'

const app = express()

// Body parsing
app.use(urlencoded({ extended: true }))
app.use(express.json())

// CORS configuration - customize for your domains
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (Postman, curl, etc.)
      if (!origin) return callback(null, true)

      // Configure your allowed origins here
      const allowed = ['http://localhost:3000', 'http://localhost:8080']

      if (allowed.includes(origin)) {
        callback(null, true)
      } else {
        logger.warn(`CORS blocked origin: ${origin}`)
        callback(new Error(`CORS policy violation: ${origin} not allowed`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  })
)

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// OpenAPI YAML endpoint
app.get('/openapi.yaml', async (_req: ExRequest, res: ExResponse) => {
  try {
    const swaggerJsonPath = path.resolve(process.cwd(), 'build', 'swagger.json')
    const jsonContent = await fs.readFile(swaggerJsonPath, 'utf8')
    const swaggerObject = JSON.parse(jsonContent)
    const yamlContent = yaml.dump(swaggerObject)

    res.setHeader('Content-Type', 'text/yaml')
    res.status(200).send(yamlContent)
  } catch (error: any) {
    logger.error('Failed to generate OpenAPI YAML:', error)
    res.status(500).send('Error: Could not generate the API specification.')
  }
})

// Swagger UI
app.use('/docs', swaggerUi.serve, async (_req: ExRequest, res: ExResponse) => {
  const swaggerOptions = {
    swaggerOptions: {
      requestInterceptor: (request: any) => {
        request.credentials = 'include'
        return request
      },
      persistAuthorization: true,
    },
  }

  res.send(swaggerUi.generateHTML(await import('../build/swagger.json'), swaggerOptions))
})

// Register TSOA routes
RegisterRoutes(app)

// 404 handler
app.use(function notFoundHandler(_req, res: ExResponse) {
  res.status(404).json(
    createErrorResponse({
      status: 404,
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    })
  )
})

// Global error handler - catches all errors including those outside asyncExecute
const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: ExRequest,
  res: ExResponse,
  _next: NextFunction
): void => {
  // Handle TSOA validation errors (thrown by @Body, @Query, etc. decorators)
  if (typeof err === 'object' && err !== null && 'errors' in err) {
    const validationError = err as { errors: { [key: string]: { message: string } } }
    logger.warn(`Validation Error for ${req.path}:`, validationError.errors)

    const errorDetails = Object.entries(validationError.errors)
      .map(([field, error]) => `${field}: ${error.message}`)
      .join('; ')

    res.status(422).json(
      createErrorResponse({
        status: 422,
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${errorDetails}`,
      })
    )
    return
  }

  // Handle our custom AppError (thrown anywhere in the app)
  if (err instanceof AppError) {
    logger.warn(`AppError for ${req.path}: [${err.code}] ${err.message}`)
    res.status(err.status).json(createErrorResponse(err.toResponse()))
    return
  }

  // Handle standard Error instances (unexpected errors)
  if (err instanceof Error) {
    logger.error(`Unhandled error for ${req.path}:`, {
      name: err.name,
      message: err.message,
      stack: err.stack,
    })

    const status = (err as any).status || (err as any).statusCode || 500
    res.status(status).json(
      createErrorResponse({
        status,
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An internal server error occurred',
      })
    )
    return
  }

  // Handle unknown error types (edge case)
  logger.error(`Unknown error type for ${req.path}:`, err)
  res.status(500).json(
    createErrorResponse({
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: String(err) || 'An unexpected error occurred',
    })
  )
}

app.use(errorHandler)

export default app
