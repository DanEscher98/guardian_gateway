import * as fc from 'fast-check'
import { faker } from '@faker-js/faker'

import { sanitize } from '../src/services/sanitizer'

// Custom arbitrary for realistic email addresses that match our regex
const alphaNumChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
const alphaChars = 'abcdefghijklmnopqrstuvwxyz'

const realisticEmail = fc
  .tuple(
    fc.array(fc.constantFrom(...alphaNumChars.split('')), { minLength: 3, maxLength: 10 }),
    fc.array(fc.constantFrom(...alphaNumChars.split('')), { minLength: 3, maxLength: 8 }),
    fc.array(fc.constantFrom(...alphaChars.split('')), { minLength: 2, maxLength: 4 })
  )
  .map(([local, domain, tld]) => `${local.join('')}@${domain.join('')}.${tld.join('')}`)

describe('Sanitizer Service', () => {
  describe('Email Redaction', () => {
    it('should redact all emails from a message', () => {
      fc.assert(
        fc.property(
          fc.array(realisticEmail, { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('@')),
          (emails, prefix) => {
            const message = `${prefix} Contact: ${emails.join(' or ')}`
            const result = sanitize(message)

            // No emails should remain in the output
            for (const email of emails) {
              expect(result.redactedMessage).not.toContain(email)
            }

            // Should have EMAIL redaction placeholder
            expect(result.redactedMessage).toContain('<REDACTED: EMAIL>')

            // Count should match unique emails
            const emailItem = result.redactedItems.find((item) => item.type === 'EMAIL')
            expect(emailItem).toBeDefined()
            expect(emailItem!.count).toBe(emails.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle various email formats', () => {
      const testEmails = [
        'simple@example.com',
        'very.common@example.com',
        'disposable.style.email.with+symbol@example.com',
        'other.email-with-hyphen@example.com',
        'fully-qualified-domain@example.com',
        'user.name+tag+sorting@example.com',
        'x@example.com',
        'example-indeed@strange-example.com',
        'admin@mailserver1.example.org',
        'example@s.example',
        'mailhost!username@example.org',
        'user%example.com@example.org',
        'user-@example.org',
      ]

      for (const email of testEmails) {
        const result = sanitize(`Contact ${email} for help`)
        expect(result.redactedMessage).not.toContain(email)
        expect(result.redactedMessage).toContain('<REDACTED: EMAIL>')
      }
    })
  })

  describe('Credit Card Redaction', () => {
    it('should redact credit card numbers', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 3 }), (count) => {
          const cards: string[] = []
          for (let i = 0; i < count; i++) {
            // Generate valid-looking 16-digit card numbers
            cards.push(faker.finance.creditCardNumber('################'))
          }

          const message = `Payment cards: ${cards.join(', ')}`
          const result = sanitize(message)

          // No card numbers should remain
          for (const card of cards) {
            expect(result.redactedMessage).not.toContain(card)
          }

          // Should have CREDIT_CARD redaction
          expect(result.redactedMessage).toContain('<REDACTED: CREDIT_CARD>')
        }),
        { numRuns: 30 }
      )
    })

    it('should handle credit cards with dashes and spaces', () => {
      const testCards = [
        '4111-1111-1111-1111',
        '4111 1111 1111 1111',
        '4111111111111111',
        '5500-0000-0000-0004',
        '3400 000000 00009',
      ]

      for (const card of testCards) {
        const result = sanitize(`Card: ${card}`)
        expect(result.redactedMessage).toContain('<REDACTED: CREDIT_CARD>')
      }
    })
  })

  describe('SSN Redaction', () => {
    it('should redact SSN numbers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 999 }),
          fc.integer({ min: 10, max: 99 }),
          fc.integer({ min: 1000, max: 9999 }),
          (area, group, serial) => {
            const ssnWithDashes = `${area}-${group}-${serial}`
            const ssnPlain = `${area}${group}${serial}`

            // Test with dashes
            let result = sanitize(`SSN: ${ssnWithDashes}`)
            expect(result.redactedMessage).not.toContain(ssnWithDashes)
            expect(result.redactedMessage).toContain('<REDACTED: SSN>')

            // Test without dashes
            result = sanitize(`SSN: ${ssnPlain}`)
            expect(result.redactedMessage).not.toContain(ssnPlain)
            expect(result.redactedMessage).toContain('<REDACTED: SSN>')
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should handle SSN edge cases', () => {
      const testSSNs = ['123-45-6789', '000-00-0000', '999-99-9999', '123456789']

      for (const ssn of testSSNs) {
        const result = sanitize(`SSN: ${ssn}`)
        expect(result.redactedMessage).toContain('<REDACTED: SSN>')
      }
    })
  })

  describe('Non-PII Preservation', () => {
    it('should preserve non-PII text exactly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }).filter(
            // Filter out strings that look like PII
            (s) =>
              !s.includes('@') &&
              !/\d{9}/.test(s) &&
              !/\d{3}-\d{2}-\d{4}/.test(s) &&
              !/\d{13,19}/.test(s)
          ),
          (text) => {
            const result = sanitize(text)

            // Text should be unchanged
            expect(result.redactedMessage).toBe(text)

            // No items should be redacted
            expect(result.redactedItems).toHaveLength(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should not false-positive on non-PII patterns', () => {
      const safeStrings = [
        'Hello, world!',
        'The quick brown fox jumps over the lazy dog.',
        'Price: $123.45',
        'Phone: 555-1234',
        'Date: 2024-01-15',
        'Reference #12345',
        'Order ID: ABC-12345',
        'Version 1.2.3',
      ]

      for (const str of safeStrings) {
        const result = sanitize(str)
        expect(result.redactedMessage).toBe(str)
        expect(result.redactedItems).toHaveLength(0)
      }
    })
  })

  describe('Redacted Items Count Accuracy', () => {
    it('should accurately count all redacted items', () => {
      fc.assert(
        fc.property(
          fc.record({
            emails: fc.array(realisticEmail, { minLength: 0, maxLength: 3 }),
            ssns: fc.array(
              fc
                .tuple(
                  fc.integer({ min: 100, max: 999 }),
                  fc.integer({ min: 10, max: 99 }),
                  fc.integer({ min: 1000, max: 9999 })
                )
                .map(([a, b, c]) => `${a}-${b}-${c}`),
              { minLength: 0, maxLength: 2 }
            ),
          }),
          ({ emails, ssns }) => {
            const parts: string[] = []
            if (emails.length > 0) parts.push(`Emails: ${emails.join(', ')}`)
            if (ssns.length > 0) parts.push(`SSNs: ${ssns.join(', ')}`)
            parts.push('Some regular text here.')

            const message = parts.join(' ')
            const result = sanitize(message)

            // Check email count
            const emailItem = result.redactedItems.find((item) => item.type === 'EMAIL')
            if (emails.length > 0) {
              expect(emailItem).toBeDefined()
              expect(emailItem!.count).toBe(emails.length)
            } else {
              expect(emailItem).toBeUndefined()
            }

            // Check SSN count
            const ssnItem = result.redactedItems.find((item) => item.type === 'SSN')
            if (ssns.length > 0) {
              expect(ssnItem).toBeDefined()
              expect(ssnItem!.count).toBe(ssns.length)
            } else {
              expect(ssnItem).toBeUndefined()
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Mixed PII Message', () => {
    it('should handle messages with multiple PII types', () => {
      const message = `
        Contact John at john.doe@example.com or jane@test.org.
        Payment card: 4111-1111-1111-1111.
        SSN on file: 123-45-6789.
        Please update the record.
      `

      const result = sanitize(message)

      // All PII should be redacted
      expect(result.redactedMessage).not.toContain('john.doe@example.com')
      expect(result.redactedMessage).not.toContain('jane@test.org')
      expect(result.redactedMessage).not.toContain('4111-1111-1111-1111')
      expect(result.redactedMessage).not.toContain('123-45-6789')

      // All redaction placeholders should be present
      expect(result.redactedMessage).toContain('<REDACTED: EMAIL>')
      expect(result.redactedMessage).toContain('<REDACTED: CREDIT_CARD>')
      expect(result.redactedMessage).toContain('<REDACTED: SSN>')

      // Regular text should be preserved
      expect(result.redactedMessage).toContain('Contact John at')
      expect(result.redactedMessage).toContain('Please update the record.')

      // Counts should be accurate
      expect(result.redactedItems).toHaveLength(3)
      expect(result.redactedItems.find((i) => i.type === 'EMAIL')?.count).toBe(2)
      expect(result.redactedItems.find((i) => i.type === 'CREDIT_CARD')?.count).toBe(1)
      expect(result.redactedItems.find((i) => i.type === 'SSN')?.count).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = sanitize('')
      expect(result.redactedMessage).toBe('')
      expect(result.redactedItems).toHaveLength(0)
    })

    it('should handle whitespace-only string', () => {
      const result = sanitize('   \n\t   ')
      expect(result.redactedMessage).toBe('   \n\t   ')
      expect(result.redactedItems).toHaveLength(0)
    })

    it('should handle very long messages', () => {
      const email = 'test@example.com'
      const longMessage = 'A'.repeat(10000) + ` ${email} ` + 'B'.repeat(10000)

      const result = sanitize(longMessage)

      expect(result.redactedMessage).not.toContain(email)
      expect(result.redactedMessage.length).toBe(
        longMessage.length - email.length + '<REDACTED: EMAIL>'.length
      )
    })
  })
})
