'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SaveButton } from './SaveButton'

interface LanguageTabProps {
  language: 'ka' | 'en'
  onLanguageChange: (lang: 'ka' | 'en') => void
  onSave: () => void
  isSaving: boolean
  saveSuccess: boolean
}

export function LanguageTab({
  language,
  onLanguageChange,
  onSave,
  isSaving,
  saveSuccess,
}: LanguageTabProps) {
  const t = useTranslations()

  return (
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
            onClick={() => onLanguageChange('ka')}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
              language === 'ka'
                ? 'border-monday-primary bg-monday-primary/5'
                : 'border-border-default hover:border-monday-primary'
            )}
          >
            <span className="text-2xl">🇬🇪</span>
            <div className="text-left">
              <p className="font-medium text-text-primary">ქართული</p>
              <p className="text-sm text-text-tertiary">Georgian</p>
            </div>
            {language === 'ka' && <Check className="w-5 h-5 text-monday-primary ml-2" />}
          </button>

          <button
            onClick={() => onLanguageChange('en')}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
              language === 'en'
                ? 'border-monday-primary bg-monday-primary/5'
                : 'border-border-default hover:border-monday-primary'
            )}
          >
            <span className="text-2xl">🇬🇧</span>
            <div className="text-left">
              <p className="font-medium text-text-primary">English</p>
              <p className="text-sm text-text-tertiary">ინგლისური</p>
            </div>
            {language === 'en' && <Check className="w-5 h-5 text-monday-primary ml-2" />}
          </button>
        </div>
      </div>

      <SaveButton onClick={onSave} isSaving={isSaving} saveSuccess={saveSuccess} />
    </div>
  )
}
