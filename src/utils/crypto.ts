import crypto from 'node:crypto'

import { env } from '../env'

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

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

/**
 * Get the current key version from environment.
 * Defaults to 1 if not specified.
 */
export function getCurrentKeyVersion(): number {
  return env.AUDIT_KEY_VERSION
}

/**
 * Get master key for a specific version.
 * - v1: AUDIT_MASTER_KEY
 * - v2+: AUDIT_MASTER_KEY_V{version}
 *
 * In development mode with no key configured, generates a deterministic key.
 */
export function getMasterKey(version: number): Buffer {
  const envKey = version === 1 ? 'AUDIT_MASTER_KEY' : `AUDIT_MASTER_KEY_V${version}`
  const keyHex = process.env[envKey]

  if (keyHex) {
    if (keyHex.length !== 64) {
      throw new Error(`${envKey} must be a 64-character hex string (32 bytes)`)
    }
    return Buffer.from(keyHex, 'hex')
  }

  // Dev mode: auto-generate deterministic key
  if (env.APP_ENV === 'development') {
    // Deterministic key based on version for consistent dev behavior
    return crypto.createHash('sha256').update(`dev-master-key-v${version}`).digest()
  }

  throw new Error(`${envKey} is required in production`)
}

/**
 * Derive a per-user encryption key using HKDF.
 * Info string format: "user:{userId}:v{keyVersion}"
 */
export function deriveUserKey(masterKey: Buffer, userId: string, keyVersion: number): Buffer {
  const info = `user:${userId}:v${keyVersion}`
  return Buffer.from(crypto.hkdfSync('sha256', masterKey, '', info, KEY_LENGTH))
}

/**
 * Encrypt plaintext using AES-256-GCM with a per-user derived key.
 * Returns an EncryptedPayload with base64-encoded values.
 */
export function encrypt(plaintext: string, userId: string, keyVersion?: number): EncryptedPayload {
  const version = keyVersion ?? getCurrentKeyVersion()
  const masterKey = getMasterKey(version)
  const userKey = deriveUserKey(masterKey, userId, version)

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, userKey, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyVersion: version,
  }
}

/**
 * Decrypt an EncryptedPayload using the key version stored in the payload.
 * Returns the original plaintext string.
 */
export function decrypt(payload: EncryptedPayload, userId: string): string {
  const masterKey = getMasterKey(payload.keyVersion)
  const userKey = deriveUserKey(masterKey, userId, payload.keyVersion)

  const ciphertext = Buffer.from(payload.ciphertext, 'base64')
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, userKey, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}
