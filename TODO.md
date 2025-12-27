# Tentacle t1-core - Crypto & Models

## Scope
- `src/utils/crypto.ts` - HKDF per-user key derivation + AES-256-GCM encryption
- `src/models/inquiry.ts` - Zod schemas for secure-inquiry endpoint
- `src/env.ts` - Add encryption key environment variables

## Reference
- Contracts: `.octopus/contracts/types.ts` (use these types!)
- Plan: `~/.claude/plans/zazzy-spinning-bear.md`

## Other Tentacles (DO NOT touch these files)
- **t2-services**: `src/services/` (sanitizer, mockAi, auditLog)
- **t3-integration**: `src/controllers/`, `tests/`, `docker-compose.yml`

---

## Tasks

### 1. Create `src/utils/crypto.ts`
- [x] Implement `deriveUserKey(masterKey, userId, keyVersion)` using HKDF
  - Use Node.js `crypto.hkdfSync('sha256', masterKey, '', info, 32)`
  - Info string: `user:${userId}:v${keyVersion}`
- [x] Implement `encrypt(plaintext, userId, keyVersion)` → `EncryptedPayload`
  - AES-256-GCM with random 12-byte IV
  - Return `{ ciphertext, iv, tag, keyVersion }` (all base64 encoded)
- [x] Implement `decrypt(payload, userId)` → `string`
  - Use `payload.keyVersion` to get correct master key
- [x] Implement `getMasterKey(version)` → `Buffer`
  - v1: `AUDIT_MASTER_KEY` env var
  - v2+: `AUDIT_MASTER_KEY_V2`, etc. (for rotation)
  - Dev mode: auto-generate deterministic key if `APP_ENV=development`
- [x] Implement `getCurrentKeyVersion()` → `number`
  - From `AUDIT_KEY_VERSION` env var (default: 1)

### 2. Create `src/models/inquiry.ts`
- [x] Create `secureInquiryRequestSchema` (Zod)
  - `userId`: `z.string().min(1)`
  - `message`: `z.string().min(1).max(10000)`
- [x] Infer `SecureInquiryRequest` type from schema
- [x] Create `secureInquiryResponseSchema` (Zod)
  - `userId`: string
  - `redactedMessage`: string
  - `aiResponse`: string
  - `redactedItems`: array of `{ type, count }`
- [x] Infer `SecureInquiryResponse` type from schema
- [x] Export all schemas and types

### 3. Update `src/env.ts`
- [x] Add `AUDIT_MASTER_KEY` (optional in dev, required in production)
  - 64-char hex string (32 bytes)
- [x] Add `AUDIT_KEY_VERSION` (optional, default: 1)
- [x] Dev mode: log warning if using auto-generated key

---

## Notes
- Use Node.js built-in `crypto` module (no external deps)
- HKDF = Hash-based Key Derivation Function (RFC 5869)
- All crypto operations should be synchronous (no async needed)
- Test with: `echo -n "test" | xxd -p` to verify hex encoding

## Blocked
<!-- If scope exceeded, document here and STOP -->

---
*Brain: feature/epic-secure-inquiry*
