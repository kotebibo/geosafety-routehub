# Authentication & Security Plan

## Overview
Strengthen the authentication system and implement comprehensive security measures to protect user data and prevent unauthorized access.

## Current State Analysis

### Strengths
- Supabase Auth with PKCE flow
- Row Level Security (RLS) policies
- Role-based access (admin, dispatcher, inspector, manager)
- Middleware-based route protection

### Pain Points
- Auth temporarily disabled on some endpoints
- Inconsistent auth checks across API routes
- Missing CSRF protection
- No rate limiting on auth endpoints
- Missing audit logging
- No 2FA support

## Improvement Areas

### 1. Authentication Flow

#### 1.1 Secure Auth Service
```typescript
// lib/auth/auth.service.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

class AuthService {
  private getClient() {
    const cookieStore = cookies()
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => cookieStore.set({ name, value, ...options }),
          remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
        },
      }
    )
  }

  async signIn(email: string, password: string) {
    const supabase = this.getClient()

    // Rate limit check
    const attempts = await this.getLoginAttempts(email)
    if (attempts >= 5) {
      throw new Error('Too many login attempts. Please try again in 15 minutes.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      await this.recordLoginAttempt(email, false)
      throw error
    }

    await this.recordLoginAttempt(email, true)
    await this.logAuditEvent('auth.login', data.user.id)

    return data
  }

  async signOut() {
    const supabase = this.getClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      await this.logAuditEvent('auth.logout', session.user.id)
    }

    return supabase.auth.signOut()
  }

  async getSession() {
    const supabase = this.getClient()
    return supabase.auth.getSession()
  }

  async getUser() {
    const supabase = this.getClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch user profile with role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*, role:custom_roles(*)')
      .eq('user_id', user.id)
      .single()

    return { ...user, profile }
  }

  private async getLoginAttempts(email: string): Promise<number> {
    const supabase = this.getClient()
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    const { count } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .eq('success', false)
      .gte('created_at', fifteenMinutesAgo)

    return count || 0
  }

  private async recordLoginAttempt(email: string, success: boolean) {
    const supabase = this.getClient()
    await supabase.from('login_attempts').insert({
      email,
      success,
      ip_address: '', // Set from middleware
      user_agent: '', // Set from middleware
    })
  }

  private async logAuditEvent(event: string, userId: string) {
    const supabase = this.getClient()
    await supabase.from('audit_logs').insert({
      event,
      user_id: userId,
      timestamp: new Date().toISOString(),
    })
  }
}

export const authService = new AuthService()
```

#### 1.2 Session Management
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession()

  // Protected routes
  const protectedPaths = ['/dashboard', '/companies', '/routes', '/boards', '/admin']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Admin-only routes
  const adminPaths = ['/admin']
  const isAdminRoute = adminPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAdminRoute && session) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
}
```

### 2. API Security

#### 2.1 Authentication Middleware
```typescript
// lib/api/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function withAuth(
  request: NextRequest,
  handler: (
    request: NextRequest,
    context: { user: User; session: Session }
  ) => Promise<NextResponse>
) {
  const supabase = createServerClient(/* ... */)
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  return handler(request, { user: user!, session })
}

export async function withAdmin(
  request: NextRequest,
  handler: (
    request: NextRequest,
    context: { user: User; session: Session }
  ) => Promise<NextResponse>
) {
  return withAuth(request, async (req, ctx) => {
    const supabase = createServerClient(/* ... */)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', ctx.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return handler(req, ctx)
  })
}
```

#### 2.2 Rate Limiting
```typescript
// lib/api/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Different limits for different endpoints
export const rateLimiters = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  mutation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 mutations per minute
    analytics: true,
    prefix: 'ratelimit:mutation',
  }),
}

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'api'
): Promise<{ success: boolean; remaining: number }> {
  const limiter = rateLimiters[type]
  const { success, remaining } = await limiter.limit(identifier)

  return { success, remaining }
}
```

#### 2.3 Input Validation
```typescript
// lib/validations/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  })
}

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 10000) // Limit length
}

// Validation schema with sanitization
export const companySchema = z.object({
  name: z.string()
    .min(2)
    .max(255)
    .transform(sanitizeString),
  address: z.string()
    .max(500)
    .transform(sanitizeString),
  notes: z.string()
    .max(5000)
    .optional()
    .transform(val => val ? sanitizeHtml(val) : val),
})
```

### 3. Row Level Security

#### 3.1 Enhanced RLS Policies
```sql
-- User-based access control
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins_manage_all_profiles" ON user_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Company access based on role
CREATE POLICY "users_read_companies" ON companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dispatcher', 'inspector', 'manager')
    )
  );

CREATE POLICY "admins_manage_companies" ON companies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Inspectors see only assigned routes
CREATE POLICY "inspectors_read_own_routes" ON routes
  FOR SELECT
  USING (
    inspector_id IN (
      SELECT id FROM inspectors
      WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dispatcher', 'manager')
    )
  );
```

#### 3.2 Secure Functions
```sql
-- Secure function to check user role
CREATE OR REPLACE FUNCTION check_user_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to get current user's inspector ID
CREATE OR REPLACE FUNCTION get_current_inspector_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM inspectors
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Security Headers

#### 4.1 Next.js Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://*.supabase.co wss://*.ably.io;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim(),
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

### 5. Audit Logging

#### 5.1 Audit Log Schema
```sql
-- Audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  resource_type VARCHAR(50),
  resource_id UUID,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_event ON audit_logs(event, created_at DESC);

-- Trigger for automatic auditing
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    event,
    user_id,
    resource_type,
    resource_id,
    action,
    old_values,
    new_values
  ) VALUES (
    TG_TABLE_NAME || '.' || TG_OP,
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to sensitive tables
CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_inspectors
  AFTER INSERT OR UPDATE OR DELETE ON inspectors
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

#### 5.2 Audit Service
```typescript
// services/audit.service.ts
import { supabase } from '@/lib/supabase/server'

interface AuditEvent {
  event: string
  userId?: string
  resourceType?: string
  resourceId?: string
  action: 'create' | 'read' | 'update' | 'delete'
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

class AuditService {
  async log(event: AuditEvent): Promise<void> {
    await supabase.from('audit_logs').insert({
      event: event.event,
      user_id: event.userId,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      action: event.action,
      old_values: event.oldValues,
      new_values: event.newValues,
      metadata: event.metadata,
    })
  }

  async getLogsForResource(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> {
    const { data } = await supabase
      .from('audit_logs')
      .select('*, user:user_profiles(full_name)')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })

    return data || []
  }

  async getLogsForUser(userId: string, limit = 100): Promise<AuditLog[]> {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return data || []
  }
}

export const auditService = new AuditService()
```

### 6. Two-Factor Authentication

#### 6.1 TOTP Setup
```typescript
// lib/auth/totp.service.ts
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

class TOTPService {
  generateSecret(email: string): { secret: string; uri: string } {
    const secret = authenticator.generateSecret()
    const uri = authenticator.keyuri(email, 'GeoSafety RouteHub', secret)

    return { secret, uri }
  }

  async generateQRCode(uri: string): Promise<string> {
    return QRCode.toDataURL(uri)
  }

  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret })
  }

  async enable2FA(userId: string, secret: string, token: string): Promise<boolean> {
    // Verify the token first
    if (!this.verifyToken(token, secret)) {
      return false
    }

    // Store encrypted secret
    const encrypted = await encryptSecret(secret)
    await supabase
      .from('user_profiles')
      .update({
        totp_secret: encrypted,
        two_factor_enabled: true,
      })
      .eq('user_id', userId)

    return true
  }

  async verify2FA(userId: string, token: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_profiles')
      .select('totp_secret')
      .eq('user_id', userId)
      .single()

    if (!data?.totp_secret) return false

    const secret = await decryptSecret(data.totp_secret)
    return this.verifyToken(token, secret)
  }
}

export const totpService = new TOTPService()
```

#### 6.2 2FA UI Component
```typescript
// components/auth/TwoFactorSetup.tsx
function TwoFactorSetup() {
  const [step, setStep] = useState<'generate' | 'verify' | 'complete'>('generate')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [token, setToken] = useState('')

  const handleGenerate = async () => {
    const response = await fetch('/api/auth/2fa/generate', { method: 'POST' })
    const { qrCode, secret } = await response.json()
    setQrCode(qrCode)
    setSecret(secret)
    setStep('verify')
  }

  const handleVerify = async () => {
    const response = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ token, secret }),
    })

    if (response.ok) {
      setStep('complete')
    }
  }

  return (
    <div>
      {step === 'generate' && (
        <Button onClick={handleGenerate}>Enable Two-Factor Authentication</Button>
      )}

      {step === 'verify' && qrCode && (
        <div>
          <p>Scan this QR code with your authenticator app:</p>
          <img src={qrCode} alt="QR Code" />
          <Input
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button onClick={handleVerify}>Verify and Enable</Button>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-green-600">
          Two-factor authentication is now enabled!
        </div>
      )}
    </div>
  )
}
```

### 7. Secret Management

#### 7.1 Environment Variables
```bash
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
ENCRYPTION_KEY=xxx  # 32 bytes, base64 encoded
```

#### 7.2 Encryption Utilities
```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64')

export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

## Implementation Priority

### Phase 1: Critical Security
1. Re-enable auth on all API routes
2. Add rate limiting to auth endpoints
3. Implement proper session management

### Phase 2: Enhanced Protection
1. Add security headers
2. Implement audit logging
3. Enhance RLS policies

### Phase 3: Advanced Features
1. Add 2FA support
2. Implement secret management
3. Add security monitoring

### Phase 4: Compliance
1. GDPR data handling
2. Data retention policies
3. Security documentation

## Success Metrics

| Metric | Target |
|--------|--------|
| Auth-protected API routes | 100% |
| RLS coverage | 100% |
| Audit log coverage | All sensitive operations |
| 2FA adoption | >50% of admin users |
| Security header score | A+ (securityheaders.com) |

## Dependencies

### To Add
- @upstash/ratelimit
- @upstash/redis
- otplib (2FA)
- qrcode
- isomorphic-dompurify

## Security Checklist

- [ ] All API routes require authentication
- [ ] Admin routes require admin role
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] RLS policies cover all tables
- [ ] Audit logging implemented
- [ ] Secrets encrypted at rest
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention via sanitization
