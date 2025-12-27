import { z } from 'zod'

/**
 * PII types that can be detected and redacted
 */
export type PIIType = 'EMAIL' | 'CREDIT_CARD' | 'SSN'

export const piiTypeSchema = z.enum(['EMAIL', 'CREDIT_CARD', 'SSN'])

/**
 * Summary of redacted items by type
 */
export interface RedactedItem {
  type: PIIType
  count: number
}

export const redactedItemSchema = z.object({
  type: piiTypeSchema,
  count: z.number().int().nonnegative(),
})

/**
 * Request body for POST /secure-inquiry
 */
export interface SecureInquiryRequest {
  userId: string
  message: string
}

export const secureInquiryRequestSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  message: z.string().min(1, 'message is required').max(10000, 'message must not exceed 10000 characters'),
})

/**
 * Response body for POST /secure-inquiry
 */
export interface SecureInquiryResponse {
  userId: string
  redactedMessage: string
  aiResponse: string
  redactedItems: RedactedItem[]
}

export const secureInquiryResponseSchema = z.object({
  userId: z.string(),
  redactedMessage: z.string(),
  aiResponse: z.string(),
  redactedItems: z.array(redactedItemSchema),
})
