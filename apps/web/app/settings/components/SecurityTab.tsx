'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui-monday/Toast'
import { createClient } from '@/lib/supabase'
import { Button } from '@/shared/components/ui'

interface SecurityTabProps {
  userEmail: string
}

export function SecurityTab({ userEmail }: SecurityTabProps) {
  const router = useRouter()
  const t = useTranslations()
  const { showToast } = useToast()

  return (
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
              if (!userEmail) return
              const supabase = createClient()
              const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
              })
              if (error) {
                showToast(error.message || 'Failed to send reset email', 'error')
              } else {
                showToast(t('settings.security.passwordSent'), 'success')
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
            <h4 className="font-medium text-text-primary">{t('settings.security.sessions')}</h4>
            <p className="text-sm text-text-tertiary mt-1">{t('settings.security.sessionsDesc')}</p>
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
  )
}
