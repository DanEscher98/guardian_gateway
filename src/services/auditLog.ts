/**
 * Audit Log Service
 *
 * Provides encrypted audit logging for secure inquiry processing.
 * Stores audit entries with encrypted original messages in PostgreSQL.
 */

import { desc, eq } from 'drizzle-orm'

import { db } from '../db/client'
import { auditEntries } from '../db/schema'
import { type AsyncResult, Errors, Result } from '../lib'
import type { AuditEntry } from '../models/contracts'
import { encrypt } from '../utils/crypto'
import logger from '../utils/logger'

/**
 * Write an audit entry to the database.
 *
 * @param entry - Partial audit entry (id and timestamp will be generated)
 * @returns AsyncResult indicating success or failure
 */
export async function writeAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'timestamp' | 'keyVersion'>
): AsyncResult<void> {
  try {
    // Encrypt the original message with per-user key derivation
    const encryptedPayload = encrypt(entry.originalMessage, entry.userId)
    const encryptedMessage = JSON.stringify(encryptedPayload)

    // Insert into database
    await db.insert(auditEntries).values({
      userId: entry.userId,
      originalMessage: encryptedMessage,
      redactedMessage: entry.redactedMessage,
      aiResponse: entry.aiResponse,
      success: entry.success,
      keyVersion: encryptedPayload.keyVersion,
    })

    logger.debug('Audit entry written', { userId: entry.userId, success: entry.success })

    return Result.ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to write audit entry'
    logger.error('Failed to write audit entry', { error: message })
    return Result.err(Errors.internal(message))
  }
}

/**
 * Read audit entries for a specific user.
 *
 * @param userId - User ID to filter by
 * @param limit - Maximum number of entries to return (default 100)
 * @returns AsyncResult with array of audit entries
 */
export async function readAuditEntriesByUser(
  userId: string,
  limit = 100
): AsyncResult<AuditEntry[]> {
  try {
    const rows = await db
      .select()
      .from(auditEntries)
      .where(eq(auditEntries.userId, userId))
      .orderBy(desc(auditEntries.createdAt))
      .limit(limit)

    // Map DB rows to AuditEntry interface
    const entries: AuditEntry[] = rows.map((row) => ({
      id: row.id,
      timestamp: row.createdAt.toISOString(),
      userId: row.userId,
      originalMessage: row.originalMessage,
      redactedMessage: row.redactedMessage,
      aiResponse: row.aiResponse,
      success: row.success,
      keyVersion: row.keyVersion,
    }))

    return Result.ok(entries)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read audit entries'
    logger.error('Failed to read audit entries', { error: message })
    return Result.err(Errors.internal(message))
  }
}

/**
 * Read all audit entries from the database.
 * Note: For production, prefer readAuditEntriesByUser with pagination.
 *
 * @param limit - Maximum number of entries to return (default 1000)
 * @returns AsyncResult with array of audit entries
 */
export async function readAuditEntries(limit = 1000): AsyncResult<AuditEntry[]> {
  try {
    const rows = await db
      .select()
      .from(auditEntries)
      .orderBy(desc(auditEntries.createdAt))
      .limit(limit)

    // Map DB rows to AuditEntry interface
    const entries: AuditEntry[] = rows.map((row) => ({
      id: row.id,
      timestamp: row.createdAt.toISOString(),
      userId: row.userId,
      originalMessage: row.originalMessage,
      redactedMessage: row.redactedMessage,
      aiResponse: row.aiResponse,
      success: row.success,
      keyVersion: row.keyVersion,
    }))

    return Result.ok(entries)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read audit entries'
    logger.error('Failed to read audit entries', { error: message })
    return Result.err(Errors.internal(message))
  }
}
