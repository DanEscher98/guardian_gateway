import { z } from 'zod'

/**
 * PII types that can be detected and redacted
 */
export const piiTypeSchema = z.enum(['EMAIL', 'CREDIT_CARD', 'SSN'])
export type PIIType = z.infer<typeof piiTypeSchema>

/**
 * Summary of redacted items by type
 */
export const redactedItemSchema = z.object({
  type: piiTypeSchema,
  count: z.number().int().nonnegative(),
})
export type RedactedItem = z.infer<typeof redactedItemSchema>

/**
 * Request schema for POST /secure-inquiry
 */
export const secureInquiryRequestSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  message: z.string().min(1, 'message is required').max(10000, 'message must not exceed 10000 characters'),
})
export type SecureInquiryRequest = z.infer<typeof secureInquiryRequestSchema>

/**
 * Response schema for POST /secure-inquiry
 */
export const secureInquiryResponseSchema = z.object({
  userId: z.string(),
  redactedMessage: z.string(),
  aiResponse: z.string(),
  redactedItems: z.array(redactedItemSchema),
})
export type SecureInquiryResponse = z.infer<typeof secureInquiryResponseSchema>
