'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'profile' | 'notifications' | 'language' | 'security'

interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
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
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', user.id)
        .single() as { data: { full_name: string | null; phone: string | null } | null }

      if (profile) {
        setFullName(profile.full_name || '')
        setPhone(profile.phone || '')
      }

      // Fetch user settings
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single() as { data: { theme?: string; language?: string; notification_settings?: UserSettings['notification_settings'] } | null }

      if (userSettings) {
        setSettings({
          theme: (userSettings.theme as UserSettings['theme']) || 'light',
          language: (userSettings.language as UserSettings['language']) || 'ka',
          notification_settings: userSettings.notification_settings || defaultSettings.notification_settings,
        })
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

      const { error } = await (supabase
        .from('users') as any)
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

      const { error } = await (supabase
        .from('user_settings') as any)
        .upsert({
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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">იტვირთება...</span>
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
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-h2 font-bold text-text-primary">
                პარამეტრები
              </h1>
              <p className="text-text-secondary">
                მომხმარებლის პარამეტრები და პრეფერენციები
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                activeTab === 'profile'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <User className="w-4 h-4 inline mr-2" />
              პროფილი
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                activeTab === 'notifications'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              შეტყობინებები
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                activeTab === 'language'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              ენა
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                activeTab === 'security'
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              უსაფრთხოება
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              პროფილის ინფორმაცია
            </h3>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-monday-primary flex items-center justify-center text-white text-2xl font-semibold">
                {fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-medium text-text-primary">{fullName || 'მომხმარებელი'}</p>
                <p className="text-sm text-text-tertiary">{user.email}</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                სახელი და გვარი
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary'
                )}
                placeholder="შეიყვანეთ სახელი და გვარი"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                ელ-ფოსტა
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
                  'bg-gray-50 text-text-tertiary cursor-not-allowed'
                )}
              />
              <p className="text-sm text-text-tertiary mt-1">
                ელ-ფოსტის შეცვლა შეუძლებელია
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                ტელეფონი
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={cn(
                  'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary'
                )}
                placeholder="+995 5XX XXX XXX"
              />
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-border-light">
              <Button
                variant="primary"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    შენახულია
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'ინახება...' : 'შენახვა'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              შეტყობინებების პარამეტრები
            </h3>

            {/* Email Notifications */}
            <div className="flex items-center justify-between max-w-md">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  ელ-ფოსტის შეტყობინებები
                </label>
                <p className="text-sm text-text-tertiary">
                  მიიღეთ შეტყობინებები ელ-ფოსტით
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    notification_settings: {
                      ...s.notification_settings,
                      email_notifications: !s.notification_settings.email_notifications,
                    },
                  }))
                }
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.notification_settings.email_notifications
                    ? 'bg-monday-primary'
                    : 'bg-gray-300'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.notification_settings.email_notifications
                      ? 'right-1'
                      : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Assignment Alerts */}
            <div className="flex items-center justify-between max-w-md">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  დავალებების შეტყობინებები
                </label>
                <p className="text-sm text-text-tertiary">
                  შეტყობინება ახალი დავალებების შესახებ
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    notification_settings: {
                      ...s.notification_settings,
                      assignment_alerts: !s.notification_settings.assignment_alerts,
                    },
                  }))
                }
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.notification_settings.assignment_alerts
                    ? 'bg-monday-primary'
                    : 'bg-gray-300'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.notification_settings.assignment_alerts
                      ? 'right-1'
                      : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Route Updates */}
            <div className="flex items-center justify-between max-w-md">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  მარშრუტის განახლებები
                </label>
                <p className="text-sm text-text-tertiary">
                  შეტყობინება მარშრუტის ცვლილებების შესახებ
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    notification_settings: {
                      ...s.notification_settings,
                      route_updates: !s.notification_settings.route_updates,
                    },
                  }))
                }
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.notification_settings.route_updates
                    ? 'bg-monday-primary'
                    : 'bg-gray-300'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.notification_settings.route_updates
                      ? 'right-1'
                      : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-border-light">
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    შენახულია
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'ინახება...' : 'შენახვა'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Language Tab */}
        {activeTab === 'language' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              ენის პარამეტრები
            </h3>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-4">
                ინტერფეისის ენა
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSettings((s) => ({ ...s, language: 'ka' }))}
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
                  onClick={() => setSettings((s) => ({ ...s, language: 'en' }))}
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

            {/* Save Button */}
            <div className="pt-4 border-t border-border-light">
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    შენახულია
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'ინახება...' : 'შენახვა'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              უსაფრთხოება
            </h3>

            {/* Password Change */}
            <div className="p-4 border border-border-default rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-text-primary">პაროლის შეცვლა</h4>
                  <p className="text-sm text-text-tertiary mt-1">
                    პაროლის შეცვლა ხდება ელ-ფოსტით. დააჭირეთ ღილაკს და მიიღებთ ბმულს ელ-ფოსტაზე.
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
                      alert('პაროლის შეცვლის ბმული გამოგზავნილია თქვენს ელ-ფოსტაზე')
                    }
                  }}
                >
                  პაროლის შეცვლა
                </Button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="p-4 border border-border-default rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-text-primary">აქტიური სესიები</h4>
                  <p className="text-sm text-text-tertiary mt-1">
                    ყველა სესიიდან გამოსვლა სხვა მოწყობილობებზე
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
                  ყველასგან გამოსვლა
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
