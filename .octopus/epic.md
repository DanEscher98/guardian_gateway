# Epic: Secure Inquiry Endpoint

## Acceptance Criteria

- [ ] POST /secure-inquiry accepts `{ userId, message }` and returns sanitized response
- [ ] PII sanitization: emails, credit cards, SSNs are redacted with `<REDACTED: TYPE>`
- [ ] Mock AI call with 2s delay and 50% random failure rate
- [ ] Circuit breaker: 3 failures → open (503 "Service Busy"), auto-reset after 30s
- [ ] Audit log: original (encrypted) + redacted (plaintext) to JSON file
- [ ] HKDF per-user key derivation with key versioning for rotation
- [ ] Health endpoint shows circuit breaker status
- [ ] Docker-compose with PostgreSQL + app service
- [ ] Property-based tests for sanitizer (fast-check)
- [ ] Circuit breaker tests

## Exit Criteria

- [ ] All ACs demonstrated (manual or automated)
- [ ] All tentacles merged
- [ ] Full test suite passes (`yarn test`)
- [ ] Build passes (`yarn build`)
- [ ] Lint passes (`yarn lint`)
- [ ] Docker containers start and app responds

## Out of Scope

- Real AI integration (mock only)
- User registration/login (use existing schema)
- Production key management

## Technical Decisions

| Decision        | Choice             | Rationale                                 |
| --------------- | ------------------ | ----------------------------------------- |
| Encryption      | AES-256-GCM + HKDF | Per-user keys, authenticated encryption   |
| Key rotation    | Version in payload | Decrypt old data with old keys            |
| Circuit breaker | Half-open pattern  | Auto-recovery without restart             |
| Audit storage   | JSON Lines file    | Simple, append-only, easy to parse        |
| PII detection   | Regex              | Fast, deterministic, testable             |
| Testing         | fast-check + Jest  | Property-based for comprehensive coverage |

## Tentacle Breakdown

| ID             | Scope                                                  | Dependencies         | Status  |
| -------------- | ------------------------------------------------------ | -------------------- | ------- |
| t1-core        | src/utils/crypto.ts, src/models/inquiry.ts, src/env.ts | none                 | pending |
| t2-services    | src/services/sanitizer.ts, mockAi.ts, auditLog.ts      | t1-core (types)      | pending |
| t3-integration | src/controllers/, tests/, docker-compose.yml           | t1-core, t2-services | pending |
