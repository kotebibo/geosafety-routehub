'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useWalkthrough } from '@/components/Walkthrough'
import { createClient } from '@/lib/supabase'
import { Button } from '@/shared/components/ui'
import {
  ArrowLeft,
  User,
  Bell,
  Globe,
  Shield,
  Save,
  Check,
  PlayCircle,
  Palette,
  Sun,
  Moon,
  Star,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { Theme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

type TabType = 'profile' | 'notifications' | 'language' | 'security' | 'appearance'

interface UserSettings {
  theme: Theme
  language: 'ka' | 'en'
  notification_settings: {
    email_notifications: boolean
    push_notifications: boolean
    assignment_alerts: boolean
    route_updates: boolean
  }
}

const defaultSettings: UserSettings = {
  theme: 'light',
  language: 'ka',
  notification_settings: {
    email_notifications: true,
    push_notifications: true,
    assignment_alerts: true,
    route_updates: true,
  },
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const { theme: currentTheme, setTheme } = useTheme()
  const { restartWalkthrough } = useWalkthrough()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Profile state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Settings state
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchUserData()
    }
  }, [user, authLoading, router])

  const fetchUserData = async () => {
    if (!user) return

    try {
      const supabase = createClient()

      // Fetch user profile
      const { data: profile } = (await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()) as { data: { full_name: string | null; phone: string | null } | null }

      if (profile) {
        setFullName(profile.full_name || '')
        setPhone(profile.phone || '')
      }

      // Fetch user settings
      const { data: userSettings } = (await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()) as {
        data: {
          theme?: string
          language?: string
          notification_settings?: UserSettings['notification_settings']
        } | null
      }

      if (userSettings) {
        const savedTheme = (userSettings.theme as Theme) || 'light'
        setSettings({
          theme: savedTheme,
          language: (userSettings.language as UserSettings['language']) || 'ka',
          notification_settings:
            userSettings.notification_settings || defaultSettings.notification_settings,
        })
        // Sync theme context with saved preference
        if (['light', 'dark', 'night'].includes(savedTheme)) {
          setTheme(savedTheme)
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const supabase = createClient()

      const { error } = await (supabase as any)
        .from('users')
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!user) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const supabase = createClient()

      const { error } = await (supabase as any).from('user_settings').upsert({
        user_id: user.id,
        theme: settings.theme,
        language: settings.language,
        notification_settings: settings.notification_settings,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const SaveButton = ({ onClick }: { onClick: () => void }) => (
    <div className="pt-4 border-t border-border-light">
      <Button variant="primary" onClick={onClick} disabled={isSaving}>
        {saveSuccess ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            {t('settings.saved')}
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? t('settings.saving') : t('common.save')}
          </>
        )}
      </Button>
    </div>
  )

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-h2 font-bold text-text-primary">{t('settings.title')}</h1>
              <p className="text-text-secondary">{t('settings.subtitle')}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap',
                activeTab === 'profile'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <User className="w-4 h-4 inline mr-2" />
              {t('settings.tab.profile')}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap',
                activeTab === 'notifications'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              {t('settings.tab.notifications')}
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap',
                activeTab === 'language'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              {t('settings.tab.language')}
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap',
                activeTab === 'appearance'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Palette className="w-4 h-4 inline mr-2" />
              {t('settings.tab.appearance')}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap',
                activeTab === 'security'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              {t('settings.tab.security')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {t('settings.profile.title')}
            </h3>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-monday-primary flex items-center justify-center text-white text-2xl font-semibold">
                {fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {fullName || t('settings.profile.user')}
                </p>
                <p className="text-sm text-text-tertiary">{user.email}</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('settings.profile.name')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary'
                )}
                placeholder={t('settings.profile.namePlaceholder')}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('settings.profile.email')}
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
                  'bg-bg-secondary text-text-tertiary cursor-not-allowed'
                )}
              />
              <p className="text-sm text-text-tertiary mt-1">
                {t('settings.profile.emailReadonly')}
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('settings.profile.phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary'
                )}
                placeholder="+995 5XX XXX XXX"
              />
            </div>

            {/* Walkthrough Restart */}
            <div className="p-4 border border-border-default rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-text-primary">
                    {t('settings.walkthrough.title')}
                  </h4>
                  <p className="text-sm text-text-tertiary mt-1">
                    {t('settings.walkthrough.description')}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    localStorage.removeItem('routehub-walkthrough-completed')
                    restartWalkthrough()
                    router.push('/')
                  }}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {t('settings.walkthrough.restart')}
                </Button>
              </div>
            </div>

            <SaveButton onClick={handleSaveProfile} />
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {t('settings.notifications.title')}
            </h3>

            {/* Email Notifications */}
            <div className="flex items-center justify-between max-w-md">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  {t('settings.notifications.email')}
                </label>
                <p className="text-sm text-text-tertiary">
                  {t('settings.notifications.emailDesc')}
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings(s => ({
                    ...s,
                    notification_settings: {
                      ...s.notification_settings,
                      email_notifications: !s.notification_settings.email_notifications,
                    },
                  }))
                }
                role="switch"
                aria-checked={settings.notification_settings.email_notifications}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                  settings.notification_settings.email_notifications
                    ? 'bg-monday-primary'
                    : 'bg-text-disabled'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.notification_settings.email_notifications ? 'right-1' : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Assignment Alerts */}
            <div className="flex items-center justify-between max-w-md">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  {t('settings.notifications.assignments')}
                </label>
                <p className="text-sm text-text-tertiary">
                  {t('settings.notifications.assignmentsDesc')}
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings(s => ({
                    ...s,
                    notification_settings: {
                      ...s.notification_settings,
                      assignment_alerts: !s.notification_settings.assignment_alerts,
                    },
                  }))
                }
                role="switch"
                aria-checked={settings.notification_settings.assignment_alerts}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                  settings.notification_settings.assignment_alerts
                    ? 'bg-monday-primary'
                    : 'bg-text-disabled'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.notification_settings.assignment_alerts ? 'right-1' : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Route Updates */}
            <div className="flex items-center justify-between max-w-md">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  {t('settings.notifications.routes')}
                </label>
                <p className="text-sm text-text-tertiary">
                  {t('settings.notifications.routesDesc')}
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings(s => ({
                    ...s,
                    notification_settings: {
                      ...s.notification_settings,
                      route_updates: !s.notification_settings.route_updates,
                    },
                  }))
                }
                role="switch"
                aria-checked={settings.notification_settings.route_updates}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                  settings.notification_settings.route_updates
                    ? 'bg-monday-primary'
                    : 'bg-text-disabled'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.notification_settings.route_updates ? 'right-1' : 'left-1'
                  )}
                />
              </button>
            </div>

            <SaveButton onClick={handleSaveSettings} />
          </div>
        )}

        {/* Language Tab */}
        {activeTab === 'language' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {t('settings.language.title')}
            </h3>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-4">
                {t('settings.language.interface')}
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSettings(s => ({ ...s, language: 'ka' }))}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
                    settings.language === 'ka'
                      ? 'border-monday-primary bg-monday-primary/5'
                      : 'border-border-default hover:border-monday-primary'
                  )}
                >
                  <span className="text-2xl">🇬🇪</span>
                  <div className="text-left">
                    <p className="font-medium text-text-primary">ქართული</p>
                    <p className="text-sm text-text-tertiary">Georgian</p>
                  </div>
                  {settings.language === 'ka' && (
                    <Check className="w-5 h-5 text-monday-primary ml-2" />
                  )}
                </button>

                <button
                  onClick={() => setSettings(s => ({ ...s, language: 'en' }))}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
                    settings.language === 'en'
                      ? 'border-monday-primary bg-monday-primary/5'
                      : 'border-border-default hover:border-monday-primary'
                  )}
                >
                  <span className="text-2xl">🇬🇧</span>
                  <div className="text-left">
                    <p className="font-medium text-text-primary">English</p>
                    <p className="text-sm text-text-tertiary">ინგლისური</p>
                  </div>
                  {settings.language === 'en' && (
                    <Check className="w-5 h-5 text-monday-primary ml-2" />
                  )}
                </button>
              </div>
            </div>

            <SaveButton onClick={handleSaveSettings} />
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {t('settings.appearance.title')}
            </h3>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('settings.appearance.theme')}
              </label>
              <p className="text-sm text-text-tertiary mb-4">
                {t('settings.appearance.themeDesc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                {/* Light Theme */}
                <button
                  onClick={() => {
                    setTheme('light')
                    setSettings(s => ({ ...s, theme: 'light' }))
                  }}
                  className={cn(
                    'group relative rounded-lg border-2 p-1 transition-all',
                    currentTheme === 'light'
                      ? 'border-monday-primary ring-2 ring-monday-primary/20'
                      : 'border-border-light hover:border-monday-primary/40'
                  )}
                >
                  {/* Theme preview */}
                  <div className="rounded-md overflow-hidden bg-white">
                    {/* Mini sidebar + content preview */}
                    <div className="flex h-[100px]">
                      <div className="w-10 bg-[#f7f7f7] border-r border-[#e6e9ef] flex flex-col items-center pt-2 gap-1.5">
                        <div className="w-5 h-5 rounded bg-[#6161ff]" />
                        <div className="w-5 h-1.5 rounded bg-[#e6e9ef]" />
                        <div className="w-5 h-1.5 rounded bg-[#e6e9ef]" />
                        <div className="w-5 h-1.5 rounded bg-[#e6e9ef]" />
                      </div>
                      <div className="flex-1 p-2">
                        <div className="h-3 w-16 rounded bg-[#323338] mb-2" />
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#f7f7f7]" />
                            <div className="h-2 w-8 rounded bg-[#00c875]" />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#f7f7f7]" />
                            <div className="h-2 w-8 rounded bg-[#ffca00]" />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#f7f7f7]" />
                            <div className="h-2 w-8 rounded bg-[#6161ff]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Sun className="w-4 h-4 text-text-secondary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">
                        {t('settings.theme.light')}
                      </p>
                      <p className="text-xs text-text-tertiary">{t('settings.theme.lightDesc')}</p>
                    </div>
                    {currentTheme === 'light' && (
                      <Check className="w-4 h-4 text-monday-primary ml-auto shrink-0" />
                    )}
                  </div>
                </button>

                {/* Dark Theme */}
                <button
                  onClick={() => {
                    setTheme('dark')
                    setSettings(s => ({ ...s, theme: 'dark' }))
                  }}
                  className={cn(
                    'group relative rounded-lg border-2 p-1 transition-all',
                    currentTheme === 'dark'
                      ? 'border-monday-primary ring-2 ring-monday-primary/20'
                      : 'border-border-light hover:border-monday-primary/40'
                  )}
                >
                  <div className="rounded-md overflow-hidden bg-[#1e1e2e]">
                    <div className="flex h-[100px]">
                      <div className="w-10 bg-[#262637] border-r border-[#35354d] flex flex-col items-center pt-2 gap-1.5">
                        <div className="w-5 h-5 rounded bg-[#7c7cff]" />
                        <div className="w-5 h-1.5 rounded bg-[#35354d]" />
                        <div className="w-5 h-1.5 rounded bg-[#35354d]" />
                        <div className="w-5 h-1.5 rounded bg-[#35354d]" />
                      </div>
                      <div className="flex-1 p-2">
                        <div className="h-3 w-16 rounded bg-[#e2e2e8] mb-2" />
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#262637]" />
                            <div className="h-2 w-8 rounded bg-[#00c875]" />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#262637]" />
                            <div className="h-2 w-8 rounded bg-[#ffca00]" />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#262637]" />
                            <div className="h-2 w-8 rounded bg-[#7c7cff]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Moon className="w-4 h-4 text-text-secondary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">
                        {t('settings.theme.dark')}
                      </p>
                      <p className="text-xs text-text-tertiary">{t('settings.theme.darkDesc')}</p>
                    </div>
                    {currentTheme === 'dark' && (
                      <Check className="w-4 h-4 text-monday-primary ml-auto shrink-0" />
                    )}
                  </div>
                </button>

                {/* Night Theme */}
                <button
                  onClick={() => {
                    setTheme('night')
                    setSettings(s => ({ ...s, theme: 'night' }))
                  }}
                  className={cn(
                    'group relative rounded-lg border-2 p-1 transition-all',
                    currentTheme === 'night'
                      ? 'border-monday-primary ring-2 ring-monday-primary/20'
                      : 'border-border-light hover:border-monday-primary/40'
                  )}
                >
                  <div className="rounded-md overflow-hidden bg-[#0d1b2a]">
                    <div className="flex h-[100px]">
                      <div className="w-10 bg-[#142233] border-r border-[#1e3045] flex flex-col items-center pt-2 gap-1.5">
                        <div className="w-5 h-5 rounded bg-[#64b5f6]" />
                        <div className="w-5 h-1.5 rounded bg-[#1e3045]" />
                        <div className="w-5 h-1.5 rounded bg-[#1e3045]" />
                        <div className="w-5 h-1.5 rounded bg-[#1e3045]" />
                      </div>
                      <div className="flex-1 p-2">
                        <div className="h-3 w-16 rounded bg-[#d8e2ec] mb-2" />
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#142233]" />
                            <div className="h-2 w-8 rounded bg-[#00c875]" />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#142233]" />
                            <div className="h-2 w-8 rounded bg-[#ffca00]" />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="h-2 flex-1 rounded bg-[#142233]" />
                            <div className="h-2 w-8 rounded bg-[#64b5f6]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Star className="w-4 h-4 text-text-secondary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">
                        {t('settings.theme.night')}
                      </p>
                      <p className="text-xs text-text-tertiary">{t('settings.theme.nightDesc')}</p>
                    </div>
                    {currentTheme === 'night' && (
                      <Check className="w-4 h-4 text-monday-primary ml-auto shrink-0" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            <SaveButton onClick={handleSaveSettings} />
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
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
                    if (!user?.email) return
                    const supabase = createClient()
                    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                      redirectTo: `${window.location.origin}/auth/reset-password`,
                    })
                    if (!error) {
                      alert(t('settings.security.passwordSent'))
                    }
                  }}
                >
                  {t('settings.security.changePassword')}
                </Button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="p-4 border border-border-default rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-text-primary">
                    {t('settings.security.sessions')}
                  </h4>
                  <p className="text-sm text-text-tertiary mt-1">
                    {t('settings.security.sessionsDesc')}
                  </p>
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
        )}
      </div>
    </div>
  )
}
