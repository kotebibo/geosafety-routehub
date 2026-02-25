'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X, Download, ChevronLeft, ChevronRight, FileText, AlertTriangle } from 'lucide-react'

interface FilePreviewModalProps {
  file: {
    name: string
    url: string
    type: string
    size: number
  } | null
  onClose: () => void
  files?: { name: string; url: string; type: string; size: number }[]
  onNavigate?: (index: number) => void
  currentIndex?: number
}

export function FilePreviewModal({ file, onClose, files, onNavigate, currentIndex = 0 }: FilePreviewModalProps) {
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [docxLoading, setDocxLoading] = useState(false)
  const [docxError, setDocxError] = useState<string | null>(null)

  const isDocx = file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file?.name.endsWith('.docx')
  const isDoc = file?.type === 'application/msword' || file?.name.endsWith('.doc')
  const isPdf = file?.type === 'application/pdf' || file?.name.endsWith('.pdf')
  const isImage = file?.type.startsWith('image/')

  const canNavigate = files && files.length > 1
  const hasPrev = canNavigate && currentIndex > 0
  const hasNext = canNavigate && currentIndex < (files?.length ?? 0) - 1

  // Load docx content
  useEffect(() => {
    if (!file || !isDocx) {
      setDocxHtml(null)
      setDocxError(null)
      return
    }

    let cancelled = false
    setDocxLoading(true)
    setDocxError(null)

    async function loadDocx() {
      try {
        const response = await fetch(file!.url)
        if (!response.ok) throw new Error('Failed to fetch file')
        const arrayBuffer = await response.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.convertToHtml({ arrayBuffer })
        if (!cancelled) {
          setDocxHtml(result.value)
        }
      } catch (err) {
        if (!cancelled) {
          setDocxError('Failed to load document preview')
          console.error('DOCX preview error:', err)
        }
      } finally {
        if (!cancelled) {
          setDocxLoading(false)
        }
      }
    }

    loadDocx()
    return () => { cancelled = true }
  }, [file, isDocx])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && hasPrev) onNavigate?.(currentIndex - 1)
    if (e.key === 'ArrowRight' && hasNext) onNavigate?.(currentIndex + 1)
  }, [onClose, hasPrev, hasNext, currentIndex, onNavigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!file) return null

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    a.target = '_blank'
    a.click()
  }

  const renderPreview = () => {
    if (isImage) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded"
          />
        </div>
      )
    }

    if (isPdf) {
      return (
        <iframe
          src={file.url}
          className="w-full h-full border-0 rounded"
          title={file.name}
        />
      )
    }

    if (isDocx) {
      if (docxLoading) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-[#0073ea] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#676879]">Loading document...</span>
          </div>
        )
      }
      if (docxError) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertTriangle className="w-8 h-8 text-[#fdab3d]" />
            <span className="text-sm text-[#676879]">{docxError}</span>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm bg-[#0073ea] text-white rounded-md hover:bg-[#0060b9] transition-colors"
            >
              Download instead
            </button>
          </div>
        )
      }
      if (docxHtml) {
        return (
          <div className="h-full overflow-auto p-8 bg-white">
            <div
              className="max-w-[800px] mx-auto prose prose-sm"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          </div>
        )
      }
    }

    if (isDoc) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <FileText className="w-12 h-12 text-[#676879]" />
          <span className="text-sm text-[#676879]">.doc format preview not supported</span>
          <span className="text-xs text-[#9699a6]">Only .docx files can be previewed. Download to view this file.</span>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm bg-[#0073ea] text-white rounded-md hover:bg-[#0060b9] transition-colors"
          >
            Download file
          </button>
        </div>
      )
    }

    // Unsupported type
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FileText className="w-12 h-12 text-[#676879]" />
        <span className="text-sm text-[#676879]">Preview not available for this file type</span>
        <button
          onClick={handleDownload}
          className="px-4 py-2 text-sm bg-[#0073ea] text-white rounded-md hover:bg-[#0060b9] transition-colors"
        >
          Download file
        </button>
      </div>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal */}
      <div className="relative w-[90vw] h-[90vh] max-w-[1200px] bg-[#f5f6f8] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-[#323338] truncate">{file.name}</span>
            {canNavigate && (
              <span className="text-xs text-[#9699a6]">
                {currentIndex + 1} / {files?.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#323338] hover:bg-[#f0f1f3] rounded-md transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#f0f1f3] rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-[#676879]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {renderPreview()}

          {/* Navigation arrows */}
          {hasPrev && (
            <button
              onClick={() => onNavigate?.(currentIndex - 1)}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'w-10 h-10 rounded-full bg-white/90 shadow-md',
                'flex items-center justify-center',
                'hover:bg-white transition-colors'
              )}
            >
              <ChevronLeft className="w-5 h-5 text-[#323338]" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onNavigate?.(currentIndex + 1)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'w-10 h-10 rounded-full bg-white/90 shadow-md',
                'flex items-center justify-center',
                'hover:bg-white transition-colors'
              )}
            >
              <ChevronRight className="w-5 h-5 text-[#323338]" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
