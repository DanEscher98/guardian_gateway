import app from './app'
import { pool } from './db/client'
import { env } from './env'
import logger from './utils/logger'

const { PORT, APP_ENV } = env
const HOST = '0.0.0.0' // Essential for Docker/Cloud Run

/**
 * Connect to the database pool and verify connectivity.
 */
async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect()
    client.release()
    logger.info('Successfully connected to PostgreSQL database.')
  } catch (err: any) {
    logger.error('Failed to connect to PostgreSQL database:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    })
    throw new Error(`Database connection failed: ${err.message}`)
  }
}

/**
 * Start the server with database connection.
 */
async function startServer(): Promise<ReturnType<typeof app.listen>> {
  try {
    await connectDatabase()

    return app.listen(PORT, HOST, () => {
      logger.info(`Swagger Docs: http://${HOST}:${PORT}/docs`)
      logger.info(`Environment: ${APP_ENV}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Main entry point
;(async () => {
  const server = await startServer()

  // Handle pool errors
  pool.on('error', (err: Error) => {
    logger.error('Unexpected error on idle client in PostgreSQL pool', err)
  })

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully')
    server.close(() => {
      logger.info('Process terminated')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully')
    server.close(() => {
      logger.info('Process terminated')
      process.exit(0)
    })
  })

  // Handle server errors
  server.on('error', (error: any) => {
    if (error.syscall !== 'listen') {
      throw error
    }

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT

    switch (error.code) {
      case 'EACCES':
        logger.error(bind + ' requires elevated privileges')
        process.exit(1)
        break
      case 'EADDRINUSE':
        logger.error(bind + ' is already in use')
        process.exit(1)
        break
      default:
        throw error
    }
  })
})()
