'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

interface WalkthroughStep {
  targetSelector?: string
  titleKey: string
  descriptionKey: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  roles?: string[] // Only show step for these roles. undefined = show for all.
}

const allSteps: WalkthroughStep[] = [
  {
    titleKey: 'walkthrough.welcome.title',
    descriptionKey: 'walkthrough.welcome.description',
    position: 'center',
  },
  {
    targetSelector: '[data-walkthrough="sidebar"]',
    titleKey: 'walkthrough.sidebar.title',
    descriptionKey: 'walkthrough.sidebar.description',
    position: 'right',
  },
  {
    targetSelector: '[data-walkthrough="boards"]',
    titleKey: 'walkthrough.boards.title',
    descriptionKey: 'walkthrough.boards.description',
    position: 'right',
    roles: ['admin', 'dispatcher', 'officer'],
  },
  {
    targetSelector: '[data-walkthrough="companies"]',
    titleKey: 'walkthrough.companies.title',
    descriptionKey: 'walkthrough.companies.description',
    position: 'right',
    roles: ['admin', 'dispatcher'],
  },
  {
    targetSelector: '[data-walkthrough="routes"]',
    titleKey: 'walkthrough.routes.title',
    descriptionKey: 'walkthrough.routes.description',
    position: 'right',
  },
  {
    targetSelector: '[data-walkthrough="language-toggle"]',
    titleKey: 'walkthrough.language.title',
    descriptionKey: 'walkthrough.language.description',
    position: 'right',
  },
  {
    titleKey: 'walkthrough.done.title',
    descriptionKey: 'walkthrough.done.description',
    position: 'center',
  },
]

interface WalkthroughProps {
  onComplete: () => void
}

export function Walkthrough({ onComplete }: WalkthroughProps) {
  const { t } = useLanguage()
  const { userRole } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Filter steps by user role
  const steps = allSteps.filter(step => {
    if (!step.roles) return true
    if (!userRole) return false
    return step.roles.includes(userRole.role)
  })

  const step = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const isCentered = step?.position === 'center'

  const updateTargetRect = useCallback(() => {
    if (step?.targetSelector) {
      const el = document.querySelector(step.targetSelector)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
        return
      }
    }
    setTargetRect(null)
  }, [step?.targetSelector])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    updateTargetRect()
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)
    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [updateTargetRect])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [isLastStep, onComplete])

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }, [isFirstStep])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete()
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    },
    [onComplete, handleNext, handlePrev]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!mounted || !step) return null

  // Calculate tooltip position, clamped to viewport
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered || !targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 400,
      }
    }

    const padding = 16
    const tooltipWidth = 340
    const tooltipHeight = 200 // approximate
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top: number
    let left: number

    switch (step.position) {
      case 'right':
        top = targetRect.top
        left = targetRect.right + padding
        // If tooltip overflows right, put it on the left side
        if (left + tooltipWidth > vw - padding) {
          left = targetRect.left - tooltipWidth - padding
        }
        break
      case 'left':
        top = targetRect.top
        left = targetRect.left - tooltipWidth - padding
        // If tooltip overflows left, put it on the right side
        if (left < padding) {
          left = targetRect.right + padding
        }
        break
      case 'bottom':
        top = targetRect.bottom + padding
        left = targetRect.left
        break
      case 'top':
        top = targetRect.top - tooltipHeight - padding
        left = targetRect.left
        break
      default:
        top = targetRect.top
        left = targetRect.right + padding
    }

    // Clamp to viewport bounds
    top = Math.max(padding, Math.min(top, vh - tooltipHeight - padding))
    left = Math.max(padding, Math.min(left, vw - tooltipWidth - padding))

    return {
      position: 'fixed',
      top,
      left,
      maxWidth: tooltipWidth,
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10001]">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="walkthrough-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !isCentered && (
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#walkthrough-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={e => e.stopPropagation()}
        />
      </svg>

      {/* Highlight border around target */}
      {targetRect && !isCentered && (
        <div
          className="absolute border-2 border-blue-400 rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)',
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        style={getTooltipStyle()}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[10002]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {isCentered && <Sparkles className="w-5 h-5 text-blue-500" />}
            <h3 className="text-lg font-bold text-gray-900">{t(step.titleKey)}</h3>
          </div>
          <button
            onClick={onComplete}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{t(step.descriptionKey)}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep
                    ? 'bg-blue-500'
                    : i < currentStep
                      ? 'bg-blue-300'
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('common.previous')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {isLastStep ? t('walkthrough.finish') : t('common.next')}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Hook to manage walkthrough state
export function useWalkthrough() {
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('routehub-walkthrough-completed')
    if (!completed) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setShowWalkthrough(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const completeWalkthrough = useCallback(() => {
    setShowWalkthrough(false)
    localStorage.setItem('routehub-walkthrough-completed', 'true')
  }, [])

  const restartWalkthrough = useCallback(() => {
    setShowWalkthrough(true)
  }, [])

  return { showWalkthrough, completeWalkthrough, restartWalkthrough }
}
