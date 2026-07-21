'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/components/ui/select'

const EVENT_TYPES = [
  'login_success',
  'login_failed',
  'login_locked',
  '2fa_challenge_sent',
  '2fa_verify_success',
  '2fa_verify_failed',
  '2fa_resend',
  '2fa_enabled',
  '2fa_disabled',
  '2fa_disabled_by_admin',
  '2fa_trusted_device_used',
  'password_reset_requested',
  'password_reset_completed',
] as const

// Theme-safe severity tints (opacity tints of solid colors — no light-only shades)
const EVENT_BADGE: Record<string, string> = {
  login_failed: 'bg-red-500/10 text-red-500 border-red-500/30',
  login_locked: 'bg-red-500/10 text-red-500 border-red-500/30',
  '2fa_verify_failed': 'bg-red-500/10 text-red-500 border-red-500/30',
  '2fa_disabled': 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  '2fa_disabled_by_admin': 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  password_reset_requested: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  password_reset_completed: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  login_success: 'bg-green-500/10 text-green-500 border-green-500/30',
  '2fa_verify_success': 'bg-green-500/10 text-green-500 border-green-500/30',
  '2fa_enabled': 'bg-green-500/10 text-green-500 border-green-500/30',
  '2fa_trusted_device_used': 'bg-green-500/10 text-green-500 border-green-500/30',
}
const DEFAULT_BADGE = 'bg-blue-500/10 text-blue-500 border-blue-500/30'

interface AuditRow {
  id: string
  user_id: string | null
  event_type: string
  ip: string | null
  user_agent: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export default function SecurityLogPage() {
  const t = useTranslations()
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()

  const [rows, setRows] = useState<AuditRow[]>([])
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/')
  }, [authLoading, isAdmin, router])

  const fetchLog = async (filter: string) => {
    setLoading(true)
    setLoadError(false)
    try {
      const supabase = getSupabase()
      // Reads go through the admin-only RLS policy on auth_audit_log.
      let query = supabase
        .from('auth_audit_log')
        .select('id, user_id, event_type, ip, user_agent, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (filter !== 'all') {
        query = query.eq('event_type', filter)
      }
      const { data, error } = await query
      if (error) throw error

      const logRows = (data ?? []) as AuditRow[]
      setRows(logRows)

      // Resolve display names from public.users (inspector ids are auth ids).
      const userIds = Array.from(new Set(logRows.map(r => r.user_id).filter(Boolean))) as string[]
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds)
        const names: Record<string, string> = {}
        for (const u of (users ?? []) as {
          id: string
          full_name: string | null
          email: string | null
        }[]) {
          names[u.id] = u.full_name || u.email || u.id
        }
        setUserNames(names)
      }
    } catch (error) {
      console.error('Failed to load security log:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) fetchLog(eventFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, eventFilter])

  const displayRows = useMemo(
    () =>
      rows.map(row => ({
        ...row,
        userLabel:
          (row.user_id && userNames[row.user_id]) ||
          (typeof row.metadata?.email === 'string' ? (row.metadata.email as string) : '—'),
      })),
    [rows, userNames]
  )

  if (authLoading || !isAdmin) return null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-monday-primary rounded-lg flex items-center justify-center text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('admin.securityLog.title')}</h1>
            <p className="text-sm text-text-secondary">{t('admin.securityLog.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.securityLog.allEvents')}</SelectItem>
              {EVENT_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {t(`admin.securityLog.events.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => fetchLog(eventFilter)}
            disabled={loading}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-50"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-sm text-red-500">{t('admin.securityLog.loadError')}</p>
        </div>
      )}

      <div className="bg-bg-primary border border-border-light rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light text-left text-text-tertiary">
              <th className="px-4 py-3 font-medium">{t('admin.securityLog.columns.time')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.securityLog.columns.event')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.securityLog.columns.user')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.securityLog.columns.ip')}</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(row => (
              <tr key={row.id} className="border-b border-border-light last:border-b-0">
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                  {format(new Date(row.created_at), 'dd.MM.yyyy HH:mm:ss')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${EVENT_BADGE[row.event_type] || DEFAULT_BADGE}`}
                  >
                    {t(`admin.securityLog.events.${row.event_type}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-primary">{row.userLabel}</td>
                <td className="px-4 py-3 text-text-secondary font-mono text-xs">{row.ip || '—'}</td>
              </tr>
            ))}
            {!loading && displayRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-tertiary">
                  {t('admin.securityLog.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
