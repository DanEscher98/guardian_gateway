import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

import { env } from '../env'

const logDir = 'logs'

/**
 * Console transport configuration.
 * - Production: JSON format for Cloud Run/GCP structured logging
 * - Development: Colorized, human-readable format
 */
const consoleTransport = new winston.transports.Console({
  level: env.APP_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    ...(env.APP_ENV === 'production'
      ? [
          // Production: JSON format for cloud logging (GCP, AWS, etc.)
          winston.format.printf(({ level, message, ...meta }) => {
            return JSON.stringify({
              severity: level.toUpperCase(),
              message,
              ...meta,
            })
          }),
        ]
      : [
          // Development: colorized, readable format
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ level, message, ...meta }) => {
            delete meta.timestamp
            return `[${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`
          }),
        ])
  ),
})

/**
 * File transport with daily rotation.
 * Logs are stored in JSON format for easy parsing.
 */
const fileTransport = new DailyRotateFile({
  level: 'info',
  dirname: logDir,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxFiles: '30d',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
})

const logger = winston.createLogger({
  transports: [consoleTransport, fileTransport],
  exitOnError: false,
})

export default logger
