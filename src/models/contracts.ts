/**
 * Contract Types for Secure Inquiry Services
 *
 * These types are copied from .octopus/contracts/types.ts
 * They define the shared interfaces between tentacles.
 */

// ============================================================
// CRYPTO TYPES (from t1-core)
// ============================================================

/** Encrypted payload structure with key versioning for rotation */
export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string
  /** Base64-encoded initialization vector (12 bytes) */
  iv: string
  /** Base64-encoded authentication tag (16 bytes) */
  tag: string
  /** Key version used for encryption (for rotation support) */
  keyVersion: number
}

// ============================================================
// SANITIZER TYPES
// ============================================================

/** Types of PII that can be detected and redacted */
export type PIIType = 'EMAIL' | 'CREDIT_CARD' | 'SSN'

/** Summary of redacted items by type */
export interface RedactedItem {
  type: PIIType
  count: number
}

/** Result of sanitizing a message */
export interface SanitizeResult {
  /** Message with PII replaced by <REDACTED: TYPE> */
  redactedMessage: string
  /** Summary of what was redacted */
  redactedItems: RedactedItem[]
}

// ============================================================
// CIRCUIT BREAKER TYPES
// ============================================================

/** Circuit breaker states */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

/** Circuit breaker status for monitoring */
export interface CircuitBreakerStatus {
  state: CircuitBreakerState
  failures: number
  lastFailure: string | null // ISO 8601
  lastSuccess: string | null // ISO 8601
}

/** Mock AI response */
export interface MockAIResponse {
  answer: string
  processingTime: number
}

// ============================================================
// AUDIT LOG TYPES
// ============================================================

/** Single audit log entry */
export interface AuditEntry {
  id: string // UUID
  timestamp: string // ISO 8601
  userId: string
  originalMessage: string // Encrypted (EncryptedPayload as JSON string)
  redactedMessage: string // Plaintext
  aiResponse: string | null
  success: boolean
  keyVersion: number
}
