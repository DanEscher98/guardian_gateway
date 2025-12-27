# Tentacle t2-services - Business Logic Services

## Scope
- `src/services/sanitizer.ts` - PII detection and redaction
- `src/services/mockAi.ts` - Mock AI with circuit breaker
- `src/services/auditLog.ts` - Encrypted audit logging

## Reference
- Contracts: `.octopus/contracts/types.ts` (use these types!)
- Plan: `~/.claude/plans/zazzy-spinning-bear.md`

## Dependencies
- **t1-core** provides: `encrypt()`, `decrypt()`, `getCurrentKeyVersion()` from `src/utils/crypto.ts`
- If crypto not ready, stub the imports and continue

## Other Tentacles (DO NOT touch these files)
- **t1-core**: `src/utils/crypto.ts`, `src/models/`, `src/env.ts`
- **t3-integration**: `src/controllers/`, `tests/`, `docker-compose.yml`

---

## Tasks

### 1. Create `src/services/sanitizer.ts`
- [x] Define regex patterns:
  ```typescript
  EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g
  SSN_REGEX = /\b(?:\d{3}-\d{2}-\d{4}|\d{9})\b/g
  ```
- [x] Implement `sanitize(message: string): SanitizeResult`
  - Replace matches with `<REDACTED: EMAIL>`, `<REDACTED: CREDIT_CARD>`, `<REDACTED: SSN>`
  - Count redacted items by type
  - Return `{ redactedMessage, redactedItems }`
- [x] Export `sanitize` function

### 2. Create `src/services/mockAi.ts`
- [x] Implement circuit breaker state machine:
  ```typescript
  interface CircuitBreakerState {
    state: 'closed' | 'open' | 'half-open'
    failures: number
    lastFailure: number | null
    lastSuccess: number | null
  }
  const FAILURE_THRESHOLD = 3
  const RESET_TIMEOUT = 30000  // 30 seconds
  ```
- [x] Implement `callMockAi(message: string): AsyncResult<MockAIResponse>`
  - Closed: 2s delay, 50% random failure for testing
  - Open: instant rejection with 503 "Service Busy" (use `Errors.serviceUnavailable` or custom)
  - Half-Open: allow one test request after 30s
- [x] Implement `getCircuitBreakerStatus(): CircuitBreakerStatus`
  - For health endpoint visibility
- [x] Use Result pattern for all returns

### 3. Create `src/services/auditLog.ts`
- [x] Define storage path: `data/audit-log.json`
- [x] Implement `writeAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AsyncResult<void>`
  - Generate UUID for `id`
  - Add ISO timestamp
  - Encrypt original message using `encrypt()` from crypto utility (stubbed until t1-core ready)
  - Append as JSON line to file
- [x] Ensure `data/` directory exists on first write
- [x] Handle file errors gracefully with Result pattern

---

## Notes
- Use Result pattern (`Result.ok()`, `Result.err()`) for all service methods
- Import types from `.octopus/contracts/types.ts`
- For 503 errors, create custom: `new AppError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service Busy' })`
- Circuit breaker state is in-memory (singleton module state)

## Blocked
<!-- If scope exceeded, document here and STOP -->

---
*Brain: feature/epic-secure-inquiry*
