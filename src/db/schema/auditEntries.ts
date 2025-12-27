import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'

/**
 * Audit entries table for secure inquiry logging.
 * Designed for high-load chat applications (e.g., bank messaging).
 *
 * Key features:
 * - Encrypted original messages (per-user HKDF-derived keys)
 * - Fast retrieval by userId + timestamp
 * - Key versioning for rotation support
 */
export const auditEntries = pgTable(
  'audit_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    originalMessage: text('original_message').notNull(), // Encrypted JSON (EncryptedPayload)
    redactedMessage: text('redacted_message').notNull(), // Plaintext for quick display
    aiResponse: text('ai_response'), // Nullable - null if request failed
    success: boolean('success').notNull().default(true),
    keyVersion: integer('key_version').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Index for fast user message retrieval (most common query)
    index('idx_audit_user_created').on(table.userId, table.createdAt.desc()),
    // Index for filtering by success status
    index('idx_audit_success').on(table.success),
    // Index for key rotation queries (find entries by key version)
    index('idx_audit_key_version').on(table.keyVersion),
  ]
)

// Zod schemas generated from Drizzle schema
export const auditEntrySelectSchema = createSelectSchema(auditEntries)
export const auditEntryInsertSchema = createInsertSchema(auditEntries)

// TypeScript types inferred from Zod schemas
export type AuditEntry = z.infer<typeof auditEntrySelectSchema>
export type NewAuditEntry = z.infer<typeof auditEntryInsertSchema>
