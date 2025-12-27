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
})

const _env = EnvSchema.safeParse(process.env)

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.format())
  process.exit(1)
}

export const env = _env.data
