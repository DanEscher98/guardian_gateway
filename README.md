# Guardian Gateway

Secure middleware service for PII-sensitive chat applications. Built as a coding challenge demonstrating production-grade patterns.

## Features

- **PII Sanitization**: Regex-based detection of emails, credit cards, SSNs
- **Encrypted Audit Logging**: AES-256-GCM with per-user HKDF key derivation
- **Circuit Breaker**: Auto-recovery pattern for external service resilience
- **PostgreSQL**: Indexed schema optimized for high-load message retrieval

## Tech Stack

- TypeScript, Express, TSOA (OpenAPI)
- Drizzle ORM, PostgreSQL
- Zod validation, Result pattern (no exceptions)
- Docker Compose, Jest + fast-check

## Quick Start

```bash
# Start database
docker compose up -d db

# Install & migrate
yarn install
yarn db:migrate

# Run
yarn dev
```

## API

```
POST /secure-inquiry
{
  "userId": "user-123",
  "message": "Contact me at john@example.com"
}

Response:
{
  "redactedMessage": "Contact me at <REDACTED: EMAIL>",
  "aiResponse": "...",
  "redactedItems": [{"type": "EMAIL", "count": 1}]
}
```

## Architecture

```
src/
├── controllers/   # TSOA endpoints
├── services/      # Business logic (sanitizer, mockAi, auditLog)
├── db/schema/     # Drizzle tables with indexes
└── utils/crypto   # HKDF + AES-256-GCM encryption
```

## Testing

```bash
yarn test  # 54 tests (property-based + unit)
```
