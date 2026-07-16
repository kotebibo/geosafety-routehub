'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase'
import { LogIn, AlertCircle, CheckCircle, Globe, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
          <div className="animate-spin text-4xl">⚙️</div>
        </div>
      }
    >
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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Show session expired message if redirected from expired session
  useEffect(() => {
    if (sessionStorage.getItem('routehub-session-expired')) {
      setError(t('login.sessionExpired'))
      sessionStorage.removeItem('routehub-session-expired')
    }
  }, [t])

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t('login.enterEmailFirst'))
      return
    }
    setError('')
    setResetLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSuccess(t('login.resetEmailSent'))
    } catch (err) {
      setError(t('login.resetError'))
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError(t('login.invalidCredentials'))
        } else if (error.message.includes('Email not confirmed')) {
          setError(t('login.emailNotConfirmed'))
        } else {
          setError(error.message)
        }
      } else {
        router.push(returnUrl)
        router.refresh()
      }
    } catch (err) {
      setError(t('login.signinError'))
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
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{success}</p>
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
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-monday-primary hover:text-monday-primary-hover font-medium disabled:opacity-50"
                >
                  {resetLoading ? t('common.loading') : t('login.forgotPassword')}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
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
