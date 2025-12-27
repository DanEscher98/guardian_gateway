import { Body, Post, Route, SuccessResponse, Tags } from 'tsoa'

import { type AppAsyncResponse, AppController, Errors, Result } from '../lib'
import type { SecureInquiryRequest, SecureInquiryResponse } from '../models/inquiry'
import { secureInquiryRequestSchema } from '../models/inquiry'
import { writeAuditEntry } from '../services/auditLog'
import { callMockAi } from '../services/mockAi'
import { sanitize } from '../services/sanitizer'

@Route('secure-inquiry')
@Tags('Inquiry')
export class InquiryController extends AppController {
  /**
   * Process a secure inquiry with PII sanitization.
   *
   * 1. Validates request with Zod schema
   * 2. Sanitizes message (removes PII)
   * 3. Calls mock AI service (with circuit breaker)
   * 4. Writes audit log entry
   * 5. Returns sanitized response
   */
  @Post('/')
  @SuccessResponse('200', 'Inquiry processed successfully')
  public async processInquiry(
    @Body() body: SecureInquiryRequest
  ): AppAsyncResponse<SecureInquiryResponse> {
    return this.execute(async () => {
      // 1. Validate request
      const parsed = secureInquiryRequestSchema.safeParse(body)
      if (!parsed.success) {
        return Result.err(Errors.validation(parsed.error.message))
      }

      const { userId, message } = parsed.data

      // 2. Sanitize the message
      const sanitizeResult = sanitize(message)

      // 3. Call mock AI service
      const aiResult = await callMockAi(sanitizeResult.redactedMessage)
      if (Result.isErr(aiResult)) {
        // Circuit breaker is open - return 503
        const error = aiResult.error
        if (error.status === 503) {
          // Still write audit log for failed request
          await writeAuditEntry({
            userId,
            originalMessage: message,
            redactedMessage: sanitizeResult.redactedMessage,
            aiResponse: null,
            success: false,
          })
          return Result.err(error)
        }
        return Result.err(error)
      }

      const aiResponse = aiResult.value

      // 4. Write audit log entry
      const auditResult = await writeAuditEntry({
        userId,
        originalMessage: message,
        redactedMessage: sanitizeResult.redactedMessage,
        aiResponse: aiResponse.answer,
        success: true,
      })

      if (Result.isErr(auditResult)) {
        // Log failure but don't fail the request
        // The main operation succeeded
      }

      // 5. Return response
      return Result.ok({
        userId,
        redactedMessage: sanitizeResult.redactedMessage,
        aiResponse: aiResponse.answer,
        redactedItems: sanitizeResult.redactedItems,
      })
    })
  }
}
