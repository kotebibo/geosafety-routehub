'use client'

import { useRef, useState, useEffect } from 'react'

import { useTranslations } from 'next-intl'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Square, RotateCcw, Loader2, AlertTriangle } from 'lucide-react'

import { useLanguage } from '@/contexts/LanguageContext'

import type { HealthSnapshot } from '@/lib/health/ai-summary'

const markdownComponents: Components = {
  p: ({ children }) => <p className="text-sm text-text-primary leading-relaxed mb-2">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-text-primary leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h3 className="text-sm font-semibold text-text-primary mt-3 mb-1">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-sm font-semibold text-text-primary mt-3 mb-1">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-text-primary mt-3 mb-1">{children}</h3>
  ),
}

interface HealthAiAnalysisProps {
  current: HealthSnapshot | null
}

export function HealthAiAnalysis({ current }: HealthAiAnalysisProps) {
  const t = useTranslations()
  const { language } = useLanguage()
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleAnalyze = async () => {
    if (!current || streaming) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setText('')
    setError(false)
    setStreaming(true)
    try {
      const res = await fetch('/api/health/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, locale: language }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(`Analyze failed: ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setText(prev => prev + chunk)
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Health AI analysis failed:', err)
        setError(true)
      }
    } finally {
      if (abortRef.current === controller) setStreaming(false)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  return (
    <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          {t('health.ai.title')}
        </h2>
        {streaming ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-primary border border-border-light text-text-secondary hover:text-text-primary transition-colors"
          >
            <Square className="w-3 h-3" />
            {t('health.ai.stop')}
          </button>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!current}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {text || error ? <RotateCcw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {text || error ? t('health.ai.reanalyze') : t('health.ai.analyze')}
          </button>
        )}
      </div>
      <p className="text-xs text-text-secondary mb-3">{t('health.ai.description')}</p>

      {!current && !text && !error && (
        <p className="text-sm text-text-secondary py-4 text-center">{t('health.ai.empty')}</p>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t('health.ai.error')}
        </div>
      )}

      {streaming && !text && (
        <div className="flex items-center gap-2 py-4 text-sm text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('health.ai.analyzing')}
        </div>
      )}

      {text && (
        <div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {text}
          </ReactMarkdown>
          {!streaming && (
            <p className="text-[11px] text-text-secondary mt-3 pt-3 border-t border-border-light">
              {t('health.ai.disclaimer')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
