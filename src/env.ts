import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

/**
 * Environment schema with Zod validation.
 * Add your environment variables here with proper validation.
 */
const EnvSchema = z.object({
  APP_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_CERT: z
    .string()
    .optional()
    .transform((val) => (val ? val.replace(/\\n/g, '\n') : undefined)),
  PORT: z
    .string()
    .min(1, 'PORT is required')
    .transform((val) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num <= 0) {
        throw new Error('PORT must be a positive number')
      }
      return num
    }),
  // Encryption key for audit log (64-char hex = 32 bytes)
  // Optional in development (auto-generated), required in production
  AUDIT_MASTER_KEY: z
    .string()
    .length(64, 'AUDIT_MASTER_KEY must be a 64-character hex string')
    .regex(/^[0-9a-fA-F]+$/, 'AUDIT_MASTER_KEY must be a valid hex string')
    .optional(),
  // Key version for encryption (default: 1)
  AUDIT_KEY_VERSION: z
    .string()
    .optional()
    .default('1')
    .transform((val) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 1) {
        throw new Error('AUDIT_KEY_VERSION must be a positive integer')
      }
      return num
    }),
})

const _env = EnvSchema.safeParse(process.env)

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.format())
  process.exit(1)
}

// Validate production requirements
if (_env.data.APP_ENV === 'production' && !_env.data.AUDIT_MASTER_KEY) {
  console.error('AUDIT_MASTER_KEY is required in production')
  process.exit(1)
}

// Warn if using auto-generated key in development
if (_env.data.APP_ENV === 'development' && !_env.data.AUDIT_MASTER_KEY) {
  console.warn('[SECURITY WARNING] Using auto-generated encryption key in development mode')
}

export const env = _env.data
