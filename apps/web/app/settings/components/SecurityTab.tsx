'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui-monday/Toast'
import { createClient } from '@/lib/supabase'
import { Button, Toggle } from '@/shared/components/ui'
import { ShieldCheck } from 'lucide-react'

interface SecurityTabProps {
  userEmail: string
}

type TwoFactorMode = 'idle' | 'enrolling' | 'disabling'

export function SecurityTab({ userEmail }: SecurityTabProps) {
  const router = useRouter()
  const t = useTranslations()
  const { showToast } = useToast()

  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null)
  const [mode, setMode] = useState<TwoFactorMode>('idle')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const loadStatus = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('mfa_enabled')
        .eq('id', user.id)
        .maybeSingle()
      setMfaEnabled(Boolean((data as { mfa_enabled: boolean } | null)?.mfa_enabled))
    }
    loadStatus()
  }, [])

  const startEnroll = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/settings/2fa/enroll/start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || t('settings.security.twoFactor.genericError'), 'error')
        return
      }
      setMode('enrolling')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const confirmEnroll = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/settings/2fa/enroll/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || t('settings.security.twoFactor.invalidCode'), 'error')
        return
      }
      setMfaEnabled(true)
      setMode('idle')
      showToast(t('settings.security.twoFactor.enabledSuccess'), 'success')
    } finally {
      setBusy(false)
    }
  }

  const confirmDisable = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/settings/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || t('settings.security.twoFactor.incorrectPassword'), 'error')
        return
      }
      setMfaEnabled(false)
      setMode('idle')
      setPassword('')
      showToast(t('settings.security.twoFactor.disabledSuccess'), 'success')
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => {
    setMode('idle')
    setCode('')
    setPassword('')
  }

  return (
    <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {t('settings.security.title')}
      </h3>

      {/* Password Change */}
      <div className="p-4 border border-border-default rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium text-text-primary">
              {t('settings.security.changePassword')}
            </h4>
            <p className="text-sm text-text-tertiary mt-1">
              {t('settings.security.changePasswordDesc')}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!userEmail) return
              const supabase = createClient()
              const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                redirectTo: `${window.location.origin}/auth/confirm`,
              })
              if (error) {
                showToast(error.message || 'Failed to send reset email', 'error')
              } else {
                showToast(t('settings.security.passwordSent'), 'success')
              }
            }}
          >
            {t('settings.security.changePassword')}
          </Button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="p-4 border border-border-default rounded-lg space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-text-primary">
                {t('settings.security.twoFactor.title')}
              </h4>
              <p className="text-sm text-text-tertiary mt-1">
                {t('settings.security.twoFactor.description')}
              </p>
            </div>
          </div>
          <Toggle
            checked={Boolean(mfaEnabled)}
            disabled={mfaEnabled === null || busy || mode !== 'idle'}
            onToggle={() => (mfaEnabled ? setMode('disabling') : startEnroll())}
          />
        </div>

        {mode === 'enrolling' && (
          <div className="pt-2 border-t border-border-light space-y-3">
            <p className="text-sm text-text-secondary">
              {t('settings.security.twoFactor.enterCode')}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-40 px-3 py-2 border border-border-medium rounded-lg text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent"
            />
            <div className="flex gap-2">
              <Button onClick={confirmEnroll} disabled={busy || code.length < 6}>
                {t('settings.security.twoFactor.confirm')}
              </Button>
              <Button variant="secondary" onClick={cancel} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button variant="secondary" onClick={startEnroll} disabled={busy}>
                {t('login.twoFactor.resend')}
              </Button>
            </div>
          </div>
        )}

        {mode === 'disabling' && (
          <div className="pt-2 border-t border-border-light space-y-3">
            <p className="text-sm text-text-secondary">
              {t('settings.security.twoFactor.confirmPassword')}
            </p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-64 px-3 py-2 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent"
            />
            <div className="flex gap-2">
              <Button onClick={confirmDisable} disabled={busy || password.length === 0}>
                {t('settings.security.twoFactor.disable')}
              </Button>
              <Button variant="secondary" onClick={cancel} disabled={busy}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="p-4 border border-border-default rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium text-text-primary">{t('settings.security.sessions')}</h4>
            <p className="text-sm text-text-tertiary mt-1">{t('settings.security.sessionsDesc')}</p>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut({ scope: 'global' })
              router.push('/auth/login')
            }}
          >
            {t('settings.security.signOutAll')}
          </Button>
        </div>
      </div>
    </div>
  )
}
