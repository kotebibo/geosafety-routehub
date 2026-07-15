'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslations } from 'next-intl'
import { useWalkthrough } from '@/components/Walkthrough'
import { createClient } from '@/lib/supabase'
import { Button } from '@/shared/components/ui'
import { ArrowLeft, User, Bell, Globe, Shield, Palette } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { Theme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

import { ProfileTab } from './components/ProfileTab'
import { NotificationsTab } from './components/NotificationsTab'
import { LanguageTab } from './components/LanguageTab'
import { AppearanceTab } from './components/AppearanceTab'
import { SecurityTab } from './components/SecurityTab'

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

const TABS: { id: TabType; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] =
  [
    { id: 'profile', icon: User, labelKey: 'settings.tab.profile' },
    { id: 'notifications', icon: Bell, labelKey: 'settings.tab.notifications' },
    { id: 'language', icon: Globe, labelKey: 'settings.tab.language' },
    { id: 'appearance', icon: Palette, labelKey: 'settings.tab.appearance' },
    { id: 'security', icon: Shield, labelKey: 'settings.tab.security' },
  ]

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const t = useTranslations()
  const { language: currentLanguage, setLanguage } = useLanguage()
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

      const { data: profile } = (await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()) as { data: { full_name: string | null; phone: string | null } | null }

      if (profile) {
        setFullName(profile.full_name || '')
        setPhone(profile.phone || '')
      }

      const { data: userSettings } = (await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()) as {
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
          // The live UI language is sourced from LanguageContext (localStorage), not this
          // DB-persisted mirror — reading it back here would fight with whatever the user
          // already toggled via the Header/Sidebar and cause the tab to show a stale value.
          language: currentLanguage,
          notification_settings:
            userSettings.notification_settings || defaultSettings.notification_settings,
        })
        if (['light', 'dark', 'night', 'arctic', 'sunset', 'coffee'].includes(savedTheme)) {
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
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-bg-secondary text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {t(tab.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {activeTab === 'profile' && (
          <ProfileTab
            fullName={fullName}
            onFullNameChange={setFullName}
            phone={phone}
            onPhoneChange={setPhone}
            email={user.email || ''}
            onSave={handleSaveProfile}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            onRestartWalkthrough={() => {
              localStorage.removeItem('routehub-walkthrough-completed')
              restartWalkthrough()
              router.push('/')
            }}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            notificationSettings={settings.notification_settings}
            onToggle={key =>
              setSettings(s => ({
                ...s,
                notification_settings: {
                  ...s.notification_settings,
                  [key]: !s.notification_settings[key],
                },
              }))
            }
            onSave={handleSaveSettings}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
          />
        )}

        {activeTab === 'language' && (
          <LanguageTab
            language={settings.language}
            onLanguageChange={lang => {
              setLanguage(lang)
              setSettings(s => ({ ...s, language: lang }))
            }}
            onSave={handleSaveSettings}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
          />
        )}

        {activeTab === 'appearance' && (
          <AppearanceTab
            currentTheme={currentTheme}
            onThemeChange={theme => {
              setTheme(theme)
              setSettings(s => ({ ...s, theme }))
            }}
            onSave={handleSaveSettings}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
          />
        )}

        {activeTab === 'security' && <SecurityTab userEmail={user.email || ''} />}
      </div>
    </div>
  )
}
