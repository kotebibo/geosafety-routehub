'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowLeft, ArrowRight, Loader2, CheckCircle, FileText } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useDocumentTemplates } from '../hooks/useDocumentTemplates'
import { useGenerateDocument } from '../hooks/useGenerateDocument'
import { TemplateSelector } from './TemplateSelector'
import { EmailStep } from './EmailStep'
import { FilePreviewModal } from '@/features/boards/components/BoardTable/cells/FilePreviewModal'
import type { BoardItem } from '@/features/boards/types/board'

interface GenerateDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  items: BoardItem[]
  onSuccess?: () => void
}

type Step = 'template' | 'generating' | 'preview' | 'email' | 'complete'

export function GenerateDocumentModal({
  isOpen,
  onClose,
  boardId,
  items,
  onSuccess,
}: GenerateDocumentModalProps) {
  const [step, setStep] = useState<Step>('template')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [showFilePreview, setShowFilePreview] = useState(false)

  const { templates, loading: templatesLoading } = useDocumentTemplates(boardId)
  const { generate, send, reset, generating, sending, result, error } = useGenerateDocument()

  const currentItem = items[currentItemIndex]

  const handleClose = useCallback(() => {
    setStep('template')
    setSelectedTemplateId(null)
    setCurrentItemIndex(0)
    setDownloading(false)
    reset()
    onClose()
  }, [onClose, reset])

  const handleGeneratePreview = useCallback(async () => {
    if (!selectedTemplateId || !currentItem) return

    setStep('generating')
    try {
      await generate({
        templateId: selectedTemplateId,
        itemId: currentItem.id,
        boardId,
      })
      setStep('preview')
    } catch {
      setStep('template')
    }
  }, [selectedTemplateId, currentItem, boardId, generate])

  const handleDownload = useCallback(() => {
    if (!result?.downloadUrl) return
    // Use a direct link to our API download endpoint which serves the binary properly
    const a = document.createElement('a')
    a.href = result.downloadUrl
    a.download = result.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [result])

  const handleSendEmail = useCallback(
    async (to: string[], subject: string, message?: string) => {
      if (!result?.documentId) return
      try {
        await send({ documentId: result.documentId, to, subject, message })
        setStep('complete')
        onSuccess?.()
      } catch {
        // error state is handled by the hook
      }
    },
    [result, send, onSuccess]
  )

  const handleSkipEmail = useCallback(() => {
    handleDownload()
    setStep('complete')
    onSuccess?.()
  }, [handleDownload, onSuccess])

  if (!isOpen) return null

  const stepTitles: Record<Step, string> = {
    template: 'Select Template',
    generating: 'Generating Document...',
    preview: 'Document Preview',
    email: 'Send via Email',
    complete: 'Done',
  }

  const stepDescriptions: Record<Step, string> = {
    template: 'Choose a document template to generate from.',
    generating: '',
    preview: 'Review the generated document before downloading or sending.',
    email: 'Send the document as an email attachment, or skip to just download.',
    complete: '',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-bg-primary rounded-lg shadow-monday-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-3">
            {(step === 'preview' || step === 'email') && (
              <button
                onClick={() => setStep(step === 'email' ? 'preview' : 'template')}
                className="p-1 rounded hover:bg-bg-hover text-text-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-monday-primary" />
              <h2 className="text-lg font-semibold text-text-primary">{stepTitles[step]}</h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {step !== 'generating' && step !== 'complete' && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border-light bg-bg-secondary">
            {(['template', 'preview', 'email'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === s
                      ? 'bg-monday-primary text-white'
                      : ['template', 'preview', 'email'].indexOf(step) > i
                        ? 'bg-green-500 text-white'
                        : 'bg-bg-tertiary text-text-tertiary'
                  }`}
                >
                  {['template', 'preview', 'email'].indexOf(step) > i ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs ${step === s ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}
                >
                  {s === 'template' ? 'Template' : s === 'preview' ? 'Preview' : 'Email'}
                </span>
                {i < 2 && <ArrowRight className="w-3 h-3 text-text-tertiary" />}
              </div>
            ))}
            {stepDescriptions[step] && (
              <p className="text-xs text-text-tertiary ml-auto">{stepDescriptions[step]}</p>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Item info */}
          {currentItem && step !== 'complete' && step !== 'generating' && (
            <div className="mb-4 px-3 py-2 rounded-md bg-bg-secondary border border-border-light">
              <p className="text-sm text-text-secondary">
                Generating for:{' '}
                <span className="font-medium text-text-primary">{currentItem.name}</span>
                {items.length > 1 && (
                  <span className="text-text-tertiary ml-1">
                    ({currentItemIndex + 1} of {items.length})
                  </span>
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error.message}
            </div>
          )}

          {step === 'template' && (
            <TemplateSelector
              templates={templates}
              loading={templatesLoading}
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-monday-primary mb-3" />
              <p className="text-text-secondary">Generating document...</p>
            </div>
          )}

          {step === 'preview' && result && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Generated:{' '}
                  <span className="font-medium text-text-primary">{result.fileName}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowFilePreview(true)}>
                    <FileText className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownload}>
                    Download
                  </Button>
                </div>
              </div>
              {/* Inline mammoth preview */}
              <div
                className="overflow-auto border border-border-light rounded-lg bg-bg-primary p-6"
                style={{ maxHeight: '400px' }}
              >
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: result.previewHtml }}
                />
              </div>
            </div>
          )}

          {step === 'email' && result && (
            <EmailStep
              defaultSubject={`Document: ${result.fileName}`}
              sending={sending}
              onSend={handleSendEmail}
              onSkip={handleSkipEmail}
            />
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">Document Generated</h3>
              <p className="text-sm text-text-secondary text-center">
                Your document has been saved and is ready for download.
              </p>
              {result && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={handleDownload}>
                  Download Again
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'generating' && step !== 'email' && (
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border-light">
            {step === 'complete' ? (
              <Button variant="primary" size="sm" onClick={handleClose}>
                Close
              </Button>
            ) : step === 'template' ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedTemplateId || generating}
                  onClick={handleGeneratePreview}
                >
                  Generate Preview
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            ) : step === 'preview' ? (
              <Button variant="primary" size="sm" onClick={() => setStep('email')}>
                Next: Email
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : null}
          </div>
        )}
      </div>
      {showFilePreview && result && (
        <FilePreviewModal
          file={{
            name: result.fileName,
            url: result.downloadUrl,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 0,
          }}
          onClose={() => setShowFilePreview(false)}
        />
      )}
    </div>,
    document.body
  )
}
