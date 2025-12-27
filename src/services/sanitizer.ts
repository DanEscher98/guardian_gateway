/**
 * PII Sanitizer Service
 *
 * Detects and redacts personally identifiable information (PII)
 * from user messages including emails, credit cards, and SSNs.
 */

import type { PIIType, RedactedItem, SanitizeResult } from '../models/contracts'

// PII detection regex patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g
const SSN_REGEX = /\b(?:\d{3}-\d{2}-\d{4}|\d{9})\b/g

interface PIIPattern {
  type: PIIType
  regex: RegExp
  placeholder: string
}

const PII_PATTERNS: PIIPattern[] = [
  { type: 'EMAIL', regex: EMAIL_REGEX, placeholder: '<REDACTED: EMAIL>' },
  { type: 'CREDIT_CARD', regex: CREDIT_CARD_REGEX, placeholder: '<REDACTED: CREDIT_CARD>' },
  { type: 'SSN', regex: SSN_REGEX, placeholder: '<REDACTED: SSN>' },
]

/**
 * Sanitize a message by redacting PII.
 *
 * @param message - The message to sanitize
 * @returns SanitizeResult with redacted message and summary of redacted items
 */
export function sanitize(message: string): SanitizeResult {
  let redactedMessage = message
  const redactedCounts: Map<PIIType, number> = new Map()

  for (const pattern of PII_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0

    const matches = redactedMessage.match(pattern.regex)
    if (matches && matches.length > 0) {
      redactedCounts.set(pattern.type, matches.length)
      redactedMessage = redactedMessage.replace(pattern.regex, pattern.placeholder)
    }
  }

  const redactedItems: RedactedItem[] = []
  for (const [type, count] of redactedCounts) {
    redactedItems.push({ type, count })
  }

  return {
    redactedMessage,
    redactedItems,
  }
}

// Re-export types for convenience
export type { PIIType, RedactedItem, SanitizeResult }
