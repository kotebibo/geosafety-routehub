'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import kaMessages from '../../messages/ka.json'
import enMessages from '../../messages/en.json'

export type Language = 'ka' | 'en'

type Messages = Record<string, unknown>

// Deep-merge: values from `primary` win, `fallback` fills gaps. Keeps a
// missing key from rendering as a raw dotted key — the other language's
// text shows instead.
function mergeMessages(fallback: Messages, primary: Messages): Messages {
  const result: Messages = { ...fallback }
  for (const [key, value] of Object.entries(primary)) {
    const existing = result[key]
    if (
      value !== null &&
      typeof value === 'object' &&
      existing !== null &&
      typeof existing === 'object'
    ) {
      result[key] = mergeMessages(existing as Messages, value as Messages)
    } else {
      result[key] = value
    }
  }
  return result
}

const messages: Record<Language, Messages> = {
  ka: mergeMessages(enMessages, kaMessages),
  en: mergeMessages(kaMessages, enMessages),
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ka')

  useEffect(() => {
    const stored = localStorage.getItem('routehub-language') as Language | null
    if (stored && (stored === 'ka' || stored === 'en')) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('routehub-language', lang)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <NextIntlClientProvider
        locale={language}
        messages={messages[language]}
        onError={() => {}}
        getMessageFallback={({ key }) => key}
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
