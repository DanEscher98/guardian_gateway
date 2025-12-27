# CLAUDE.md

Instructions for AI assistants working on this codebase.

## Architecture

```
src/
├── lib/           # Framework code - DO NOT put app logic here
├── controllers/   # TSOA controllers - extend AppController
├── services/      # Business logic - return Result<T, AppError>
├── models/        # Domain models and types
├── db/            # Database schemas and client
└── utils/         # App utilities (logger, auth helpers)
```

## Type Safety with Zod (REQUIRED)

**Always infer types from Zod schemas. Never define types manually.**

### Database Models

Use `drizzle-zod` to generate Zod schemas from Drizzle tables, then infer types:

```ts
// src/db/schema/users.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'

// 1. Define Drizzle table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 2. Generate Zod schemas
export const userSelectSchema = createSelectSchema(users)
export const userInsertSchema = createInsertSchema(users)

// 3. Infer types from Zod (NOT manual interfaces)
export type User = z.infer<typeof userSelectSchema>
export type NewUser = z.infer<typeof userInsertSchema>
```

### Request/Response Types

Use the inferred types in controllers and services:

```ts
// CORRECT - Types inferred from Zod
import type { User, NewUser } from '../db/schema/users'

@Post('/')
public async createUser(@Body() data: NewUser): AppAsyncResponse<User> { ... }

// WRONG - Manual type definitions
interface User {  // DON'T DO THIS
  id: string
  email: string
}
```

### Custom Validation Schemas

For request bodies that don't map to database tables:

```ts
// src/models/requests.ts
import { z } from 'zod'

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
```

### Validation in Controllers

Validate request bodies using Zod schemas:

```ts
@Post('/login')
public async login(@Body() body: LoginRequest): AppAsyncResponse<AuthToken> {
  return this.execute(async () => {
    const parsed = loginRequestSchema.safeParse(body)
    if (!parsed.success) {
      return Result.err(Errors.validation(parsed.error.message))
    }
    return authService.login(parsed.data)
  })
}
```

## Framework Library (`src/lib`)

All framework utilities are exported from `src/lib`. Use a single import:

```ts
import { AppController, Result, Errors, type AppAsyncResponse } from '../lib'
```

## Result Pattern (REQUIRED)

**Always use the Result pattern for operations that can fail.** Do not throw errors in services.

### In Services

```ts
// CORRECT - Return Result
async function findUser(id: string): AsyncResult<User> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) return Result.err(Errors.notFound('User not found'))
  return Result.ok(user)
}

// WRONG - Throwing errors
async function findUser(id: string): Promise<User> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) throw new Error('User not found') // DON'T DO THIS
  return user
}
```

### In Controllers

Use `this.execute()` with Result pattern:

```ts
@Route('users')
export class UserController extends AppController {
  @Get('/:id')
  public async getUser(@Path() id: string): AppAsyncResponse<User> {
    return this.execute(async () => {
      const user = await userService.findById(id)
      if (!user) return Result.err(Errors.notFound('User not found'))
      return Result.ok(user)
    })
  }
}
```

Or pass through service results:

```ts
@Get('/:id')
public async getUser(@Path() id: string): AppAsyncResponse<User> {
  return this.execute(() => userService.findById(id))
}
```

### Result Utilities

```ts
// Create results
Result.ok(value)
Result.err(error)

// Check results
Result.isOk(result)
Result.isErr(result)

// Unwrap (use sparingly)
Result.unwrap(result)           // throws if Err
Result.unwrapOr(result, default)
Result.unwrapOrElse(result, fn)

// Transform
Result.map(result, fn)          // map Ok value
Result.mapErr(result, fn)       // map Err value
Result.andThen(result, fn)      // chain Result-returning fn

// Async
await Result.tryCatch(() => asyncFn())
await Result.mapAsync(result, asyncFn)

// Collections
Result.collect([results])       // Result<T[]> - first Err or all Ok
Result.partition([results])     // { ok: T[], err: E[] }
```

## Error Handling

### Use the Errors Factory

```ts
import { Errors } from '../lib'

Errors.badRequest('Invalid input') // 400
Errors.unauthorized('Not logged in') // 401
Errors.forbidden('Access denied') // 403
Errors.notFound('User not found') // 404
Errors.conflict('Already exists') // 409
Errors.validation('Invalid email') // 422
Errors.internal('Something broke') // 500
```

### Custom Errors

```ts
import { AppError } from '../lib'

new AppError({
  status: 429,
  code: 'RATE_LIMITED',
  message: 'Too many requests',
})
```

## Response Types

All endpoints return standardized responses:

```ts
// Success
{
  "success": true,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "data": { ... }
}

// Error
{
  "success": false,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

### Type Annotations

```ts
import type { AppAsyncResponse, AppAsyncPaginatedResponse } from '../lib'

// Standard response
async getUser(): AppAsyncResponse<User>

// Paginated response
async listUsers(): AppAsyncPaginatedResponse<User[]>
```

## Controller Methods

| Method                           | Use Case                                                      |
| -------------------------------- | ------------------------------------------------------------- |
| `this.execute(handler)`          | Standard endpoints returning `Result<T>`                      |
| `this.executePaginated(handler)` | Paginated endpoints returning `Result<[T[], PaginationInfo]>` |
| `this.fromResult(result)`        | Convert existing Result to response                           |

## Do NOT

- Put app logic in `src/lib/` - it's for framework code only
- Throw errors in services - return `Result.err()` instead
- Use `asyncExecute` - it's deprecated, use `execute` with Result
- Create custom response formats - use `createSuccessResponse`/`createErrorResponse`
- Import from individual lib files - use `from '../lib'`
- Define types manually - always infer from Zod schemas using `z.infer<typeof schema>`
- Skip validation - use `schema.safeParse()` for request body validation

## File Naming

- Controllers: `src/controllers/{resource}.ts` (e.g., `users.ts`)
- Services: `src/services/{resource}.ts`
- Models: `src/models/{resource}.ts`
- DB Schemas: `src/db/schema/{resource}.ts`

## Example: Full CRUD

```ts
// src/db/schema/users.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Zod schemas for validation
export const userSelectSchema = createSelectSchema(users)
export const userInsertSchema = createInsertSchema(users)

// Types inferred from Zod
export type User = z.infer<typeof userSelectSchema>
export type NewUser = z.infer<typeof userInsertSchema>

// src/services/users.ts
import { eq } from 'drizzle-orm'
import { type AsyncResult, Errors, Result } from '../lib'
import { db } from '../db/client'
import { users, userInsertSchema, type User, type NewUser } from '../db/schema'

export const userService = {
  async findById(id: string): AsyncResult<User> {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) })
    if (!user) return Result.err(Errors.notFound('User not found'))
    return Result.ok(user)
  },

  async create(data: NewUser): AsyncResult<User> {
    // Validate input with Zod
    const parsed = userInsertSchema.safeParse(data)
    if (!parsed.success) {
      return Result.err(Errors.validation(parsed.error.message))
    }
    const [user] = await db.insert(users).values(parsed.data).returning()
    return Result.ok(user)
  },
}

// src/controllers/users.ts
import { Body, Get, Path, Post, Route, Tags } from 'tsoa'
import { AppController, type AppAsyncResponse } from '../lib'
import { userService } from '../services/users'
import type { User, NewUser } from '../db/schema'

@Route('users')
@Tags('Users')
export class UserController extends AppController {
  @Get('/:id')
  public async getUser(@Path() id: string): AppAsyncResponse<User> {
    return this.execute(() => userService.findById(id))
  }

  @Post('/')
  public async createUser(@Body() data: NewUser): AppAsyncResponse<User> {
    return this.execute(() => userService.create(data))
  }
}
```

## MCP Servers

This project has MCP servers configured in `.mcp.json`:

- **postgres**: Query the database directly via MCP. Uses `DATABASE_URL` from environment.
- **fetch**: Make HTTP requests to external APIs for debugging/testing.

To enable, ensure `DATABASE_URL` is set in your `.env` file.
