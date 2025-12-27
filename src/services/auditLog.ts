/**
 * Audit Log Service
 *
 * Provides encrypted audit logging for secure inquiry processing.
 * Stores audit entries with encrypted original messages.
 */

import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { type AsyncResult, Errors, Result } from '../lib'
import type { AuditEntry } from '../models/contracts'
import { encrypt } from '../utils/crypto'
import logger from '../utils/logger'

// Storage configuration
const DATA_DIR = path.join(process.cwd(), 'data')
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit-log.json')

/**
 * Ensure the data directory exists.
 */
async function ensureDataDirectory(): AsyncResult<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    return Result.ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create data directory'
    logger.error('Failed to create data directory', { error: message })
    return Result.err(Errors.internal(message))
  }
}

/**
 * Write an audit entry to the log file.
 *
 * @param entry - Partial audit entry (id and timestamp will be generated)
 * @returns AsyncResult indicating success or failure
 */
export async function writeAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): AsyncResult<void> {
  // Ensure data directory exists
  const dirResult = await ensureDataDirectory()
  if (Result.isErr(dirResult)) {
    return dirResult
  }

  try {
    // Generate entry metadata
    const id = randomUUID()
    const timestamp = new Date().toISOString()

    // Encrypt the original message with per-user key derivation
    const encryptedPayload = encrypt(entry.originalMessage, entry.userId)
    const encryptedMessage = JSON.stringify(encryptedPayload)

    // Create the full audit entry
    const fullEntry: AuditEntry = {
      id,
      timestamp,
      userId: entry.userId,
      originalMessage: encryptedMessage,
      redactedMessage: entry.redactedMessage,
      aiResponse: entry.aiResponse,
      success: entry.success,
      keyVersion: encryptedPayload.keyVersion,
    }

    // Append as JSON line to file
    const line = JSON.stringify(fullEntry) + '\n'
    await fs.appendFile(AUDIT_LOG_FILE, line, 'utf-8')

    logger.debug('Audit entry written', { id, userId: entry.userId, success: entry.success })

    return Result.ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to write audit entry'
    logger.error('Failed to write audit entry', { error: message })
    return Result.err(Errors.internal(message))
  }
}

/**
 * Read all audit entries from the log file.
 * Note: For production, this should support pagination.
 *
 * @returns AsyncResult with array of audit entries
 */
export async function readAuditEntries(): AsyncResult<AuditEntry[]> {
  try {
    const content = await fs.readFile(AUDIT_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)
    const entries: AuditEntry[] = lines.map((line) => JSON.parse(line))
    return Result.ok(entries)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist yet, return empty array
      return Result.ok([])
    }
    const message = error instanceof Error ? error.message : 'Failed to read audit entries'
    logger.error('Failed to read audit entries', { error: message })
    return Result.err(Errors.internal(message))
  }
}
