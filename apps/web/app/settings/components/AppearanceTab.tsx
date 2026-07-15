'use client'

import { Check, Sun, Moon, Star, Snowflake, Sunset, Coffee } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SaveButton } from './SaveButton'
import type { Theme } from '@/contexts/ThemeContext'

interface ThemeOption {
  id: Theme
  icon: React.ComponentType<{ className?: string }>
  previewBg: string
  sidebarBg: string
  sidebarBorder: string
  accentColor: string
  rowBg: string
  textColor: string
  activeBorderColor?: string
  activeCheckColor?: string
  sidebar: { accent: string; lines: string }
  rows: { color1: string; color2: string; color3: string }
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    icon: Sun,
    previewBg: 'bg-white',
    sidebarBg: 'bg-[#f7f7f7]',
    sidebarBorder: 'border-[#e6e9ef]',
    accentColor: '#6161ff',
    rowBg: 'bg-[#f7f7f7]',
    textColor: 'bg-[#323338]',
    sidebar: { accent: 'bg-[#6161ff]', lines: 'bg-[#e6e9ef]' },
    rows: { color1: 'bg-[#00c875]', color2: 'bg-[#ffca00]', color3: 'bg-[#6161ff]' },
  },
  {
    id: 'dark',
    icon: Moon,
    previewBg: 'bg-[#1e1e2e]',
    sidebarBg: 'bg-[#262637]',
    sidebarBorder: 'border-[#35354d]',
    accentColor: '#7c7cff',
    rowBg: 'bg-[#262637]',
    textColor: 'bg-[#e2e2e8]',
    sidebar: { accent: 'bg-[#7c7cff]', lines: 'bg-[#35354d]' },
    rows: { color1: 'bg-[#00c875]', color2: 'bg-[#ffca00]', color3: 'bg-[#7c7cff]' },
  },
  {
    id: 'night',
    icon: Star,
    previewBg: 'bg-[#0d1b2a]',
    sidebarBg: 'bg-[#142233]',
    sidebarBorder: 'border-[#1e3045]',
    accentColor: '#64b5f6',
    rowBg: 'bg-[#142233]',
    textColor: 'bg-[#d8e2ec]',
    sidebar: { accent: 'bg-[#64b5f6]', lines: 'bg-[#1e3045]' },
    rows: { color1: 'bg-[#00c875]', color2: 'bg-[#ffca00]', color3: 'bg-[#64b5f6]' },
  },
  {
    id: 'arctic',
    icon: Snowflake,
    previewBg: 'bg-[#f0f9ff]',
    sidebarBg: 'bg-[#e0f2fe]',
    sidebarBorder: 'border-[#bae6fd]',
    accentColor: '#0ea5e9',
    rowBg: 'bg-[#e0f2fe]',
    textColor: 'bg-[#0c4a6e]',
    activeBorderColor: 'border-[#0ea5e9]',
    activeCheckColor: 'text-[#0ea5e9]',
    sidebar: { accent: 'bg-[#0ea5e9]', lines: 'bg-[#bae6fd]' },
    rows: { color1: 'bg-[#00c875]', color2: 'bg-[#ffca00]', color3: 'bg-[#0ea5e9]' },
  },
  {
    id: 'sunset',
    icon: Sunset,
    previewBg: 'bg-[#1c1210]',
    sidebarBg: 'bg-[#271a15]',
    sidebarBorder: 'border-[#3d2b20]',
    accentColor: '#f59e0b',
    rowBg: 'bg-[#271a15]',
    textColor: 'bg-[#fef3c7]',
    activeBorderColor: 'border-[#f59e0b]',
    activeCheckColor: 'text-[#f59e0b]',
    sidebar: { accent: 'bg-[#f59e0b]', lines: 'bg-[#3d2b20]' },
    rows: { color1: 'bg-[#00c875]', color2: 'bg-[#fbbf24]', color3: 'bg-[#f59e0b]' },
  },
  {
    id: 'coffee',
    icon: Coffee,
    previewBg: 'bg-[#1a1614]',
    sidebarBg: 'bg-[#231e1b]',
    sidebarBorder: 'border-[#382f2a]',
    accentColor: '#d4a574',
    rowBg: 'bg-[#231e1b]',
    textColor: 'bg-[#ede9e3]',
    activeBorderColor: 'border-[#d4a574]',
    activeCheckColor: 'text-[#d4a574]',
    sidebar: { accent: 'bg-[#d4a574]', lines: 'bg-[#382f2a]' },
    rows: { color1: 'bg-[#00c875]', color2: 'bg-[#ffca00]', color3: 'bg-[#d4a574]' },
  },
]

interface AppearanceTabProps {
  currentTheme: Theme
  onThemeChange: (theme: Theme) => void
  onSave: () => void
  isSaving: boolean
  saveSuccess: boolean
}

export function AppearanceTab({
  currentTheme,
  onThemeChange,
  onSave,
  isSaving,
  saveSuccess,
}: AppearanceTabProps) {
  const t = useTranslations()

  return (
    <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {t('settings.appearance.title')}
      </h3>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t('settings.appearance.theme')}
        </label>
        <p className="text-sm text-text-tertiary mb-4">{t('settings.appearance.themeDesc')}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl">
          {THEME_OPTIONS.map(option => {
            const Icon = option.icon
            const isActive = currentTheme === option.id
            const borderColor = option.activeBorderColor || 'border-monday-primary'
            const checkColor = option.activeCheckColor || 'text-monday-primary'

            return (
              <button
                key={option.id}
                onClick={() => onThemeChange(option.id)}
                className={cn(
                  'group relative rounded-lg border-2 p-1 transition-all',
                  isActive
                    ? `${borderColor} ring-2 ring-monday-primary/20`
                    : 'border-border-light hover:border-monday-primary/40'
                )}
              >
                {/* Theme preview */}
                <div className={`rounded-md overflow-hidden ${option.previewBg}`}>
                  <div className="flex h-[100px]">
                    <div
                      className={`w-10 ${option.sidebarBg} border-r ${option.sidebarBorder} flex flex-col items-center pt-2 gap-1.5`}
                    >
                      <div className={`w-5 h-5 rounded ${option.sidebar.accent}`} />
                      <div className={`w-5 h-1.5 rounded ${option.sidebar.lines}`} />
                      <div className={`w-5 h-1.5 rounded ${option.sidebar.lines}`} />
                      <div className={`w-5 h-1.5 rounded ${option.sidebar.lines}`} />
                    </div>
                    <div className="flex-1 p-2">
                      <div className={`h-3 w-16 rounded ${option.textColor} mb-2`} />
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <div className={`h-2 flex-1 rounded ${option.rowBg}`} />
                          <div className={`h-2 w-8 rounded ${option.rows.color1}`} />
                        </div>
                        <div className="flex gap-1.5">
                          <div className={`h-2 flex-1 rounded ${option.rowBg}`} />
                          <div className={`h-2 w-8 rounded ${option.rows.color2}`} />
                        </div>
                        <div className="flex gap-1.5">
                          <div className={`h-2 flex-1 rounded ${option.rowBg}`} />
                          <div className={`h-2 w-8 rounded ${option.rows.color3}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Label */}
                <div className="flex items-center gap-2 px-2 py-2">
                  <Icon className="w-4 h-4 text-text-secondary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">
                      {t(`settings.theme.${option.id}`)}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {t(`settings.theme.${option.id}Desc`)}
                    </p>
                  </div>
                  {isActive && <Check className={`w-4 h-4 ${checkColor} ml-auto shrink-0`} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <SaveButton onClick={onSave} isSaving={isSaving} saveSuccess={saveSuccess} />
    </div>
  )
}
