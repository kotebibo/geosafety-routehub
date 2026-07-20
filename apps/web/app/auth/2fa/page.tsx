'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslations } from 'next-intl'
import { KeyRound, ShieldCheck, AlertCircle, Globe } from 'lucide-react'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

const RESEND_COOLDOWN_SECONDS = 60

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <TwoFactorForm />
    </Suspense>
  )
}

function TwoFactorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const { completeServerLogin } = useAuth()
  const { language, setLanguage } = useLanguage()

  const returnUrl = searchParams.get('from') || '/'
  const linkToken = searchParams.get('link')

  const [code, setCode] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!linkToken) codeInputRef.current?.focus()
  }, [linkToken])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const finishLogin = async () => {
    // Session cookies were set server-side by the verify call — sync
    // user/userRole state from them so RouteGuard lets us through immediately.
    await completeServerLogin()
    router.push(returnUrl)
    router.refresh()
  }

  const submitVerify = async (body: { code?: string; linkToken?: string }) => {
    setErrorKey(null)
    setLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (!response.ok) {
        setErrorKey(
          data.retryAfterSeconds ? 'login.twoFactor.tooManyAttempts' : 'login.twoFactor.invalidCode'
        )
        setLoading(false)
        return
      }

      await finishLogin()
    } catch {
      setErrorKey('login.twoFactor.verifyError')
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitVerify({ code: code.trim() })
  }

  const handleConfirmLink = async () => {
    if (!linkToken) return
    await submitVerify({ linkToken })
  }

  const handleResend = async () => {
    setErrorKey(null)
    setLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/resend', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        setErrorKey(
          data.retryAfterSeconds ? 'login.twoFactor.tooManyAttempts' : 'login.twoFactor.resendError'
        )
        return
      }
      setCode('')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      setErrorKey('login.twoFactor.resendError')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-end">
          <button
            onClick={() => setLanguage(language === 'ka' ? 'en' : 'ka')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
          >
            <Globe className="w-4 h-4" />
            {language === 'ka' ? 'English' : 'ქართული'}
          </button>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-monday-primary rounded-xl flex items-center justify-center text-white mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary">{t('login.twoFactor.title')}</h2>
          <p className="mt-2 text-sm text-text-secondary">{t('login.twoFactor.subtitle')}</p>
        </div>

        {errorKey && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-500">{t(errorKey)}</p>
          </div>
        )}

        {linkToken ? (
          <div className="space-y-6">
            <button
              type="button"
              onClick={handleConfirmLink}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-monday-primary text-white font-medium rounded-lg hover:bg-monday-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-monday-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ShieldCheck className="w-5 h-5" />
              {loading ? t('login.twoFactor.verifying') : t('login.twoFactor.confirmLink')}
            </button>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-text-secondary mb-1">
                {t('login.twoFactor.codeLabel')}
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                ref={codeInputRef}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="appearance-none block w-full px-3 py-2 border border-border-medium rounded-lg placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-monday-primary text-white font-medium rounded-lg hover:bg-monday-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-monday-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <KeyRound className="w-5 h-5" />
              {loading ? t('login.twoFactor.verifying') : t('login.twoFactor.submit')}
            </button>

            <div className="text-center text-sm">
              {resendCooldown > 0 ? (
                <span className="text-text-tertiary">
                  {t('login.twoFactor.resendIn', { seconds: resendCooldown })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-monday-primary hover:text-monday-primary-hover font-medium disabled:opacity-50"
                >
                  {t('login.twoFactor.resend')}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
