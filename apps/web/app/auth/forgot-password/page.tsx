'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslations } from 'next-intl'
import { getSupabase } from '@/lib/supabase'
import { KeyRound, Mail, AlertCircle, CheckCircle, Globe, ArrowLeft } from 'lucide-react'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

const RESEND_COOLDOWN_SECONDS = 60

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}

function ForgotPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const { language, setLanguage } = useLanguage()

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Tick down the resend cooldown once per second
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  const sendCode = async () => {
    setErrorKey(null)
    setLoading(true)
    try {
      const supabase = getSupabase()
      // redirectTo lands in the email as {{ .RedirectTo }} — the /auth/confirm
      // route verifies the token_hash query param and forwards to reset-password.
      // Must be in the Supabase redirect allowlist or it falls back to site_url.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm`,
      })
      if (error) throw error
      setStep('code')
      setCode('')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err: any) {
      const msg = String(err?.message || '')
      setErrorKey(
        msg.includes('rate limit') || msg.includes('security purposes')
          ? 'forgot.tooManyRequests'
          : 'forgot.sendError'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendCode()
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorKey(null)
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'recovery',
      })
      if (error) throw error
      // Recovery session established — set the new password there
      router.push('/auth/reset-password')
    } catch (err) {
      setErrorKey('forgot.invalidCode')
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
          <h2 className="text-3xl font-bold text-text-primary">{t('forgot.title')}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {step === 'email' ? t('forgot.subtitle') : t('forgot.codeSentTo', { email })}
          </p>
        </div>

        {errorKey && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-500">{t(errorKey)}</p>
          </div>
        )}

        {step === 'email' ? (
          <form className="mt-6 space-y-6" onSubmit={handleSendCode}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-border-medium rounded-lg placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-monday-primary text-white font-medium rounded-lg hover:bg-monday-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-monday-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Mail className="w-5 h-5" />
              {loading ? t('forgot.sending') : t('forgot.sendCode')}
            </button>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1 text-sm text-monday-primary hover:text-monday-primary-hover font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('forgot.backToLogin')}
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleVerifyCode}>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-500">{t('forgot.linkHint')}</p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-text-secondary mb-1">
                {t('forgot.codeLabel')}
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
              {loading ? t('forgot.verifying') : t('forgot.verify')}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setErrorKey(null)
                }}
                className="inline-flex items-center gap-1 text-monday-primary hover:text-monday-primary-hover font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('forgot.changeEmail')}
              </button>
              {resendCooldown > 0 ? (
                <span className="text-text-tertiary">
                  {t('forgot.resendIn', { seconds: resendCooldown })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading}
                  className="text-monday-primary hover:text-monday-primary-hover font-medium disabled:opacity-50"
                >
                  {t('forgot.resend')}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
