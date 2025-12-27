import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'

/**
 * Example users table schema.
 * Demonstrates Drizzle ORM with Zod validation integration.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Zod schemas generated from Drizzle schema
export const userSelectSchema = createSelectSchema(users)
export const userInsertSchema = createInsertSchema(users)

// TypeScript types inferred from Zod schemas
export type User = z.infer<typeof userSelectSchema>
export type NewUser = z.infer<typeof userInsertSchema>
