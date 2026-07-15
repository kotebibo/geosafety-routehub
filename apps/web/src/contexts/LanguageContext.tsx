'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import kaMessages from '../../messages/ka.json'
import enMessages from '../../messages/en.json'

export type Language = 'ka' | 'en'

const messages: Record<Language, Record<string, unknown>> = {
  ka: kaMessages,
  en: enMessages,
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
