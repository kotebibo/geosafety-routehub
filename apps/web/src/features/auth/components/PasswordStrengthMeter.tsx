'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'

interface PasswordStrengthMeterProps {
  password: string
}

interface Requirement {
  key: string
  met: boolean
}

export function getPasswordRequirements(password: string): Requirement[] {
  return [
    { key: 'minLength', met: password.length >= 8 },
    { key: 'uppercase', met: /[A-Z]/.test(password) },
    { key: 'lowercase', met: /[a-z]/.test(password) },
    { key: 'number', met: /[0-9]/.test(password) },
  ]
}

export function isPasswordPolicyMet(password: string): boolean {
  return getPasswordRequirements(password).every(r => r.met)
}

// Theme-token colors (globals.css) — the meter must read correctly on all 6 themes.
const LEVELS = [
  { labelKey: 'weak', color: 'var(--color-error)', segments: 1 },
  { labelKey: 'medium', color: 'var(--color-warning)', segments: 2 },
  { labelKey: 'strong', color: 'var(--color-success)', segments: 3 },
] as const

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const t = useTranslations()

  const requirements = useMemo(() => getPasswordRequirements(password), [password])

  // 0-5: the four policy requirements plus a length bonus at 12+.
  const score = requirements.filter(r => r.met).length + (password.length >= 12 ? 1 : 0)
  const level = score >= 5 ? LEVELS[2] : score >= 3 ? LEVELS[1] : LEVELS[0]

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3].map(segment => (
            <div
              key={segment}
              className="h-1.5 flex-1 rounded-full bg-bg-hover transition-colors"
              style={segment <= level.segments ? { backgroundColor: level.color } : undefined}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: level.color }}>
          {t(`reset.strength.${level.labelKey}`)}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {requirements.map(req => (
          <li key={req.key} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
            ) : (
              <X className="w-3.5 h-3.5 text-text-tertiary" />
            )}
            <span
              className={req.met ? '' : 'text-text-tertiary'}
              style={req.met ? { color: 'var(--color-success)' } : undefined}
            >
              {t(`reset.requirements.${req.key}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
