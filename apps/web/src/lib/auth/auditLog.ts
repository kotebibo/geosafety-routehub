import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export type AuthEventType =
  | 'login_success'
  | 'login_failed'
  | 'login_locked'
  | '2fa_challenge_sent'
  | '2fa_verify_success'
  | '2fa_verify_failed'
  | '2fa_resend'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_disabled_by_admin'

export async function logAuthEvent(params: {
  userId?: string | null
  eventType: AuthEventType
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('auth_audit_log').insert({
    user_id: params.userId ?? null,
    event_type: params.eventType,
    ip: params.ip ?? null,
    user_agent: params.userAgent ?? null,
    metadata: (params.metadata ?? {}) as Json,
  })

  if (error) {
    console.error('Failed to write auth audit log:', error)
  }
}
