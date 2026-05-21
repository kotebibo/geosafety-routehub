'use client'

import { PlayCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { SaveButton } from './SaveButton'

interface ProfileTabProps {
  fullName: string
  onFullNameChange: (value: string) => void
  phone: string
  onPhoneChange: (value: string) => void
  email: string
  onSave: () => void
  isSaving: boolean
  saveSuccess: boolean
  onRestartWalkthrough: () => void
}

export function ProfileTab({
  fullName,
  onFullNameChange,
  phone,
  onPhoneChange,
  email,
  onSave,
  isSaving,
  saveSuccess,
  onRestartWalkthrough,
}: ProfileTabProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-bg-primary rounded-lg border border-border-light p-6 space-y-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {t('settings.profile.title')}
      </h3>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-monday-primary flex items-center justify-center text-white text-2xl font-semibold">
          {fullName?.charAt(0) || email?.charAt(0) || 'U'}
        </div>
        <div>
          <p className="font-medium text-text-primary">{fullName || t('settings.profile.user')}</p>
          <p className="text-sm text-text-tertiary">{email}</p>
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
          onChange={e => onFullNameChange(e.target.value)}
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
          value={email}
          disabled
          className={cn(
            'w-full max-w-md px-3 py-2 border border-border-default rounded-lg',
            'bg-bg-secondary text-text-tertiary cursor-not-allowed'
          )}
        />
        <p className="text-sm text-text-tertiary mt-1">{t('settings.profile.emailReadonly')}</p>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          {t('settings.profile.phone')}
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
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
            <h4 className="font-medium text-text-primary">{t('settings.walkthrough.title')}</h4>
            <p className="text-sm text-text-tertiary mt-1">
              {t('settings.walkthrough.description')}
            </p>
          </div>
          <Button variant="secondary" onClick={onRestartWalkthrough}>
            <PlayCircle className="w-4 h-4 mr-2" />
            {t('settings.walkthrough.restart')}
          </Button>
        </div>
      </div>

      <SaveButton onClick={onSave} isSaving={isSaving} saveSuccess={saveSuccess} />
    </div>
  )
}
