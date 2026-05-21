'use client'

import { Check, Save } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useLanguage } from '@/contexts/LanguageContext'

interface SaveButtonProps {
  onClick: () => void
  isSaving: boolean
  saveSuccess: boolean
}

export function SaveButton({ onClick, isSaving, saveSuccess }: SaveButtonProps) {
  const { t } = useLanguage()

  return (
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
}
