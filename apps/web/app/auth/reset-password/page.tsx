'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslations } from 'next-intl'
import { getSupabase } from '@/lib/supabase'
import { Lock, AlertCircle, CheckCircle, Globe, Eye, EyeOff } from 'lucide-react'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'
import {
  PasswordStrengthMeter,
  isPasswordPolicyMet,
} from '@/features/auth/components/PasswordStrengthMeter'

type SessionState = 'checking' | 'ready' | 'missing'

export default function ResetPasswordPage() {
  const t = useTranslations()
  const { language, setLanguage } = useLanguage()
  const [sessionState, setSessionState] = useState<SessionState>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // The form is useless without a recovery session — verify we have one.
  // Session sources: /auth/confirm (token_hash, cookie session) or the
  // legacy ?code= PKCE param (only works in the browser that requested
  // the reset — exchange it here as a fallback).
  useEffect(() => {
    const supabase = getSupabase()
    ;(async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSessionState(session ? 'ready' : 'missing')
    })()
  }, [])

  if (sessionState === 'checking') {
    return <AuthSkeleton />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Same policy as signup (passwordSchema) — also enforced server-side by
    // /api/auth/recovery/complete.
    if (!isPasswordPolicyMet(password)) {
      setError(t('reset.policyNotMet'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('reset.mismatch'))
      return
    }

    setLoading(true)
    try {
      // The server route validates the policy, updates the password, writes
      // the audit event, emails a "password changed" notice, revokes trusted
      // 2FA devices, and globally signs out — so the recovery session dies
      // and any session an attacker holds on the old password is revoked.
      const response = await fetch('/api/auth/recovery/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()

      if (!response.ok) {
        const msg = String(data?.error || '')
        if (msg.includes('different from the old password')) {
          setError(t('reset.samePassword'))
        } else if (
          response.status === 401 ||
          msg.includes('session missing') ||
          msg.includes('not authenticated')
        ) {
          setError(t('reset.invalidLink'))
        } else if (msg === 'Validation failed') {
          setError(t('reset.policyNotMet'))
        } else {
          setError(t('reset.error'))
        }
        return
      }

      // Server-side sign-out cleared the cookies; drop any client-held state too.
      await getSupabase()
        .auth.signOut({ scope: 'local' })
        .catch(() => {})
      setSuccess(true)
    } catch {
      setError(t('reset.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Language Toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setLanguage(language === 'ka' ? 'en' : 'ka')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
          >
            <Globe className="w-4 h-4" />
            {language === 'ka' ? 'English' : 'ქართული'}
          </button>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-monday-primary rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            RH
          </div>
          <h2 className="text-3xl font-bold text-text-primary">{t('reset.title')}</h2>
        </div>

        {sessionState === 'missing' ? (
          <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{t('reset.invalidLink')}</p>
            </div>
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-monday-primary text-white font-medium rounded-lg hover:bg-monday-primary-hover transition-colors"
            >
              {t('reset.goToLogin')}
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-500">{t('reset.success')}</p>
            </div>
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-monday-primary text-white font-medium rounded-lg hover:bg-monday-primary-hover transition-colors"
            >
              {t('reset.goToLogin')}
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* New Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-secondary mb-1"
                >
                  {t('reset.newPassword')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-border-medium rounded-lg placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-text-secondary mb-1"
                >
                  {t('reset.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-border-medium rounded-lg placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-monday-primary text-white font-medium rounded-lg hover:bg-monday-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-monday-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Lock className="w-5 h-5" />
              {loading ? t('reset.submitting') : t('reset.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
