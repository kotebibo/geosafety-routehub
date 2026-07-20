'use client'

import { useTranslations } from 'next-intl'
import { Toggle } from '@/shared/components/ui'
import { SaveButton } from './SaveButton'

interface NotificationSettings {
  email_notifications: boolean
  push_notifications: boolean
  assignment_alerts: boolean
  route_updates: boolean
}

interface NotificationsTabProps {
  notificationSettings: NotificationSettings
  onToggle: (key: keyof NotificationSettings) => void
  onSave: () => void
  isSaving: boolean
  saveSuccess: boolean
}

export function NotificationsTab({
  notificationSettings,
  onToggle,
  onSave,
  isSaving,
  saveSuccess,
}: NotificationsTabProps) {
  const t = useTranslations()

  return (
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
          <p className="text-sm text-text-tertiary">{t('settings.notifications.emailDesc')}</p>
        </div>
        <Toggle
          checked={notificationSettings.email_notifications}
          onToggle={() => onToggle('email_notifications')}
        />
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
        <Toggle
          checked={notificationSettings.assignment_alerts}
          onToggle={() => onToggle('assignment_alerts')}
        />
      </div>

      {/* Route Updates */}
      <div className="flex items-center justify-between max-w-md">
        <div>
          <label className="block text-sm font-medium text-text-primary">
            {t('settings.notifications.routes')}
          </label>
          <p className="text-sm text-text-tertiary">{t('settings.notifications.routesDesc')}</p>
        </div>
        <Toggle
          checked={notificationSettings.route_updates}
          onToggle={() => onToggle('route_updates')}
        />
      </div>

      <SaveButton onClick={onSave} isSaving={isSaving} saveSuccess={saveSuccess} />
    </div>
  )
}
