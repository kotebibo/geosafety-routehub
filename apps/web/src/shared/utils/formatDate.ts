import type { Language } from '@/contexts/LanguageContext'

function toLocale(language: Language): string {
  return language === 'ka' ? 'ka-GE' : 'en-US'
}

export function formatDate(
  date: Date | string,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(toLocale(language), options)
}

export function formatTime(
  date: Date | string,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(toLocale(language), options)
}
