# API Architecture Improvement Plan

## Overview
Standardize and improve the API layer to provide consistent, type-safe, and maintainable endpoints with proper error handling, validation, and documentation.

## Current State Analysis

### Strengths
- Next.js 14 App Router API routes
- Zod validation on some endpoints
- Service layer pattern for data access
- Auth middleware (requireAuth, requireAdmin)
- Health check endpoint with system diagnostics

### Pain Points
- Inconsistent error handling patterns
- Mixed client/service key usage for Supabase
- Auth disabled on some endpoints for "testing"
- No standardized response format
- Duplicate Supabase client instantiation
- Missing API documentation
- No request/response logging
- No rate limiting

## Improvement Areas

### 1. Standardized Response Format

#### 1.1 Create Response Utilities
```typescript
// lib/api/response.ts
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

export function successResponse<T>(
  data: T,
  meta?: ApiResponse['meta'],
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, meta },
    { status }
  )
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status }
  )
}
```

#### 1.2 Standard Error Codes
```typescript
// lib/api/errors.ts
export const ErrorCodes = {
  // Authentication
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
} as const

export class ApiError extends Error {
  constructor(
    public code: keyof typeof ErrorCodes,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

### 2. Route Handler Pattern

#### 2.1 Create Handler Wrapper
```typescript
// lib/api/handler.ts
type RouteHandler<T = unknown> = (
  request: NextRequest,
  context: { params: Record<string, string> }
) => Promise<T>

interface HandlerOptions {
  auth?: 'required' | 'admin' | 'optional' | 'none'
  rateLimit?: { requests: number; window: number }
  cache?: { maxAge: number; staleWhileRevalidate?: number }
}

export function createHandler<T>(
  handler: RouteHandler<T>,
  options: HandlerOptions = {}
): RouteHandler<NextResponse> {
  return async (request, context) => {
    const startTime = Date.now()

    try {
      // Rate limiting
      if (options.rateLimit) {
        await checkRateLimit(request, options.rateLimit)
      }

      // Authentication
      const user = await handleAuth(request, options.auth)

      // Execute handler
      const result = await handler(request, { ...context, user })

      // Logging
      logRequest(request, 200, Date.now() - startTime)

      // Caching
      const response = successResponse(result)
      if (options.cache) {
        response.headers.set(
          'Cache-Control',
          `public, s-maxage=${options.cache.maxAge}, stale-while-revalidate=${options.cache.staleWhileRevalidate || 0}`
        )
      }

      return response
    } catch (error) {
      logRequest(request, error.status || 500, Date.now() - startTime, error)

      if (error instanceof ApiError) {
        return errorResponse(error.code, error.message, error.status, error.details)
      }

      if (error instanceof ZodError) {
        return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, error.errors)
      }

      return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500)
    }
  }
}
```

#### 2.2 Usage Example
```typescript
// app/api/inspectors/route.ts
import { createHandler } from '@/lib/api/handler'
import { inspectorsService } from '@/services/inspectors.service'

export const GET = createHandler(
  async (request) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    return inspectorsService.getAll({ status })
  },
  { auth: 'required', cache: { maxAge: 60, staleWhileRevalidate: 120 } }
)

export const POST = createHandler(
  async (request) => {
    const body = await request.json()
    const validated = createInspectorSchema.parse(body)

    return inspectorsService.create(validated)
  },
  { auth: 'admin' }
)
```

### 3. Service Layer Improvements

#### 3.1 Base Service Class
```typescript
// lib/services/base.service.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

export abstract class BaseService<T extends { id: string }> {
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  protected get db(): SupabaseClient {
    return createServerClient()
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as T | null
  }

  async findAll(options?: {
    filter?: Partial<T>
    orderBy?: { column: keyof T; ascending?: boolean }
    limit?: number
    offset?: number
  }): Promise<T[]> {
    let query = this.db.from(this.tableName).select('*')

    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column as string, {
        ascending: options.orderBy.ascending ?? true,
      })
    }

    if (options?.limit) query = query.limit(options.limit)
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10))

    const { data, error } = await query
    if (error) throw error
    return data as T[]
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const { data: created, error } = await this.db
      .from(this.tableName)
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created as T
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.db
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updated as T
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
```

#### 3.2 Typed Service Implementation
```typescript
// services/inspectors.service.ts
import { BaseService } from '@/lib/services/base.service'
import type { Inspector } from '@/types'

class InspectorsService extends BaseService<Inspector> {
  constructor() {
    super('inspectors')
  }

  async getByStatus(status: string): Promise<Inspector[]> {
    return this.findAll({
      filter: { status },
      orderBy: { column: 'full_name', ascending: true },
    })
  }

  async getActiveWithVehicle(): Promise<Inspector[]> {
    const { data, error } = await this.db
      .from('inspectors')
      .select('*')
      .eq('status', 'active')
      .not('vehicle_type', 'is', null)
      .order('full_name')

    if (error) throw error
    return data as Inspector[]
  }
}

export const inspectorsService = new InspectorsService()
```

### 4. Request Validation

#### 4.1 Validation Middleware
```typescript
// lib/api/validation.ts
import { z, ZodSchema } from 'zod'
import { ApiError } from './errors'

export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid request body', 400, error.errors)
    }
    throw new ApiError('INVALID_INPUT', 'Could not parse request body', 400)
  }
}

export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  const { searchParams } = new URL(request.url)
  const params = Object.fromEntries(searchParams.entries())

  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, error.errors)
    }
    throw error
  }
}
```

#### 4.2 Schema Organization
```typescript
// lib/validations/inspectors.schema.ts
import { z } from 'zod'

export const inspectorBaseSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  specialty: z.enum(['general', 'electrical', 'fire_safety', 'environmental']).default('general'),
  role: z.enum(['inspector', 'senior_inspector', 'supervisor']).default('inspector'),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
  vehicle_type: z.string().optional().nullable(),
  license_plate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const createInspectorSchema = inspectorBaseSchema
export const updateInspectorSchema = inspectorBaseSchema.partial()

export const inspectorQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'on_leave', 'all']).optional(),
  specialty: z.string().optional(),
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().max(100).optional().default(20),
})
```

### 5. Rate Limiting

#### 5.1 In-Memory Rate Limiter
```typescript
// lib/api/rate-limit.ts
interface RateLimitConfig {
  requests: number
  window: number // seconds
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<void> {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const key = `${ip}:${request.nextUrl.pathname}`
  const now = Date.now()

  const record = rateLimitStore.get(key)

  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.window * 1000 })
    return
  }

  if (record.count >= config.requests) {
    throw new ApiError(
      'RATE_LIMITED',
      'Too many requests',
      429
    )
  }

  record.count++
}
```

#### 5.2 Redis-Based Rate Limiter (Production)
```typescript
// lib/api/rate-limit-redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function checkRateLimitRedis(
  request: NextRequest,
  config: RateLimitConfig
): Promise<void> {
  const ip = request.ip || 'unknown'
  const key = `ratelimit:${ip}:${request.nextUrl.pathname}`

  const result = await redis.incr(key)

  if (result === 1) {
    await redis.expire(key, config.window)
  }

  if (result > config.requests) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429)
  }
}
```

### 6. API Documentation

#### 6.1 OpenAPI Spec Generation
```typescript
// lib/api/openapi.ts
import { generateOpenAPI } from '@anatine/zod-openapi'
import { createInspectorSchema, inspectorQuerySchema } from '@/lib/validations'

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'GeoSafety RouteHub API',
    version: '1.0.0',
    description: 'API for route optimization and inspection management',
  },
  paths: {
    '/api/inspectors': {
      get: {
        summary: 'List inspectors',
        parameters: generateOpenAPI(inspectorQuerySchema).parameters,
        responses: {
          200: {
            description: 'List of inspectors',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Inspector' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create inspector',
        requestBody: {
          content: {
            'application/json': {
              schema: generateOpenAPI(createInspectorSchema).schema,
            },
          },
        },
      },
    },
  },
}
```

#### 6.2 API Documentation Route
```typescript
// app/api/docs/route.ts
import { openApiSpec } from '@/lib/api/openapi'

export async function GET() {
  return NextResponse.json(openApiSpec)
}
```

### 7. Logging & Monitoring

#### 7.1 Request Logging
```typescript
// lib/api/logging.ts
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
})

export function logRequest(
  request: NextRequest,
  status: number,
  duration: number,
  error?: Error
) {
  const logData = {
    method: request.method,
    path: request.nextUrl.pathname,
    status,
    duration,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip,
  }

  if (error) {
    logger.error({ ...logData, error: error.message, stack: error.stack })
  } else if (status >= 400) {
    logger.warn(logData)
  } else {
    logger.info(logData)
  }
}
```

## New Folder Structure

```
apps/web/
├── app/
│   └── api/
│       ├── (protected)/           # Routes requiring auth
│       │   ├── inspectors/
│       │   │   ├── route.ts
│       │   │   └── [id]/route.ts
│       │   ├── companies/
│       │   ├── routes/
│       │   └── boards/
│       ├── (public)/              # Public routes
│       │   ├── health/
│       │   └── docs/
│       └── auth/                  # Auth routes
│           ├── login/
│           └── callback/
├── src/
│   ├── lib/
│   │   └── api/
│   │       ├── handler.ts
│   │       ├── response.ts
│   │       ├── errors.ts
│   │       ├── validation.ts
│   │       ├── rate-limit.ts
│   │       ├── logging.ts
│   │       └── openapi.ts
│   ├── services/
│   │   ├── base.service.ts
│   │   ├── inspectors.service.ts
│   │   ├── companies.service.ts
│   │   └── routes.service.ts
│   └── lib/
│       └── validations/
│           ├── index.ts
│           ├── inspectors.schema.ts
│           ├── companies.schema.ts
│           └── routes.schema.ts
```

## Implementation Priority

### Phase 1: Foundation
1. Create response utilities (successResponse, errorResponse)
2. Implement ApiError class
3. Create handler wrapper with auth support

### Phase 2: Standardization
1. Refactor existing routes to use new patterns
2. Implement consistent validation
3. Add proper error handling to all endpoints

### Phase 3: Security
1. Re-enable auth on all protected routes
2. Implement rate limiting
3. Add request logging

### Phase 4: Documentation
1. Create OpenAPI spec
2. Add API documentation route
3. Generate TypeScript types from spec

## Success Metrics

| Metric | Target |
|--------|--------|
| Response format consistency | 100% |
| Endpoints with validation | 100% |
| Protected routes with auth | 100% |
| API documentation coverage | 100% |
| Error handling coverage | 100% |

## Dependencies
- pino (logging)
- @upstash/redis (rate limiting - production)
- @anatine/zod-openapi (OpenAPI generation)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing clients | Version API, maintain backwards compat |
| Performance impact from middleware | Benchmark each addition |
| Auth re-enablement issues | Comprehensive testing before deployment |
