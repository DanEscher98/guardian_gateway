import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '../env'
import * as schema from './schema'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: env.DATABASE_CERT
    ? {
        rejectUnauthorized: env.APP_ENV === 'production',
        ca: env.DATABASE_CERT,
      }
    : undefined,
})

export const db = drizzle(pool, { schema })
