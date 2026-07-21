'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslations } from 'next-intl'
import { LogIn, AlertCircle, Globe, Eye, EyeOff } from 'lucide-react'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('from') || '/'
  const { signIn } = useAuth()
  const t = useTranslations()
  const { language, setLanguage } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)

  // Show session expired message if redirected from expired session
  useEffect(() => {
    if (sessionStorage.getItem('routehub-session-expired')) {
      setErrorKey('login.sessionExpired')
      sessionStorage.removeItem('routehub-session-expired')
    }
  }, [])

  // Tick the lockout countdown down once per second; clear the error with it.
  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = setTimeout(() => {
      setRetryAfter(s => {
        if (s <= 1) setErrorKey(current => (current === 'login.tooManyAttempts' ? null : current))
        return s - 1
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [retryAfter])

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorKey(null)
    setLoading(true)

    try {
      const { error, mfaRequired } = await signIn(email, password)

      if (mfaRequired) {
        router.push(`/auth/2fa?from=${encodeURIComponent(returnUrl)}`)
        return
      }

      if (error) {
        if (error.retryAfterSeconds) {
          setErrorKey('login.tooManyAttempts')
          setRetryAfter(error.retryAfterSeconds)
        } else if (
          error.message?.includes('Invalid credentials') ||
          error.message?.includes('Invalid login credentials')
        ) {
          setErrorKey('login.invalidCredentials')
        } else if (error.message?.includes('Email not confirmed')) {
          setErrorKey('login.emailNotConfirmed')
        } else {
          console.error('Sign in error:', error.message)
          setErrorKey('login.genericError')
        }
      } else {
        router.push(returnUrl)
        router.refresh()
      }
    } catch (err) {
      setErrorKey('login.signinError')
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
          <h2 className="text-3xl font-bold text-text-primary">{t('login.title')}</h2>
          <p className="mt-2 text-sm text-text-secondary">{t('login.loginToSystem')}</p>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {/* Error Message */}
          {errorKey && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-500">
                <p>{t(errorKey)}</p>
                {retryAfter > 0 && (
                  <p className="mt-1 font-medium">
                    {t('login.lockedRetryIn', { time: formatCountdown(retryAfter) })}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
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
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-border-medium rounded-lg placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
              <div className="mt-1 text-right">
                <Link
                  href={`/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="text-xs text-monday-primary hover:text-monday-primary-hover font-medium"
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || retryAfter > 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-monday-primary text-white font-medium rounded-lg hover:bg-monday-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-monday-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <LogIn className="w-5 h-5" />
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}
