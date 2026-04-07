'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
} from 'lucide-react'

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

export function FilePreviewModal({
  file,
  onClose,
  files,
  onNavigate,
  currentIndex = 0,
}: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const isDocx =
    file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file?.name.endsWith('.docx')
  const isDoc = file?.type === 'application/msword' || file?.name.endsWith('.doc')
  const isOfficeDoc = isDocx || isDoc
  const isPdf = file?.type === 'application/pdf' || file?.name.endsWith('.pdf')
  const isImage = file?.type.startsWith('image/')

  const canNavigate = files && files.length > 1
  const hasPrev = canNavigate && currentIndex > 0
  const hasNext = canNavigate && currentIndex < (files?.length ?? 0) - 1

  // Reset zoom/rotation on file change
  useEffect(() => {
    setZoom(1)
    setRotation(0)
  }, [currentIndex, file?.url])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate?.(currentIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate?.(currentIndex + 1)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 5))
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.25))
      if (e.key === '0') {
        setZoom(1)
        setRotation(0)
      }
    },
    [onClose, hasPrev, hasNext, currentIndex, onNavigate]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
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
        <div className="flex items-center justify-center h-full p-8 overflow-hidden">
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        </div>
      )
    }

    if (isPdf) {
      return (
        <iframe
          src={file.url}
          className="w-full h-full border-0"
          title={file.name}
          style={{ backgroundColor: '#525659' }}
        />
      )
    }

    if (isOfficeDoc) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`
      return <iframe src={officeViewerUrl} className="w-full h-full border-0" title={file.name} />
    }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
          <FileText className="w-10 h-10 text-white/60" />
        </div>
        <p className="text-white/80 text-sm font-medium">{file.name}</p>
        <p className="text-white/40 text-xs">Preview not available for this file type</p>
        <button
          onClick={handleDownload}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-monday-primary text-white rounded-lg hover:bg-[var(--monday-primary-hover)] transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download file
        </button>
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-[#1a1a2e]/95 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/40">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-white/90 truncate max-w-[400px]">
            {file.name}
          </span>
          {canNavigate && (
            <span className="text-xs text-white/40 tabular-nums">
              {currentIndex + 1} / {files?.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom/Rotate controls for images */}
          {isImage && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/50 min-w-[40px] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(z + 0.25, 5))}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation(r => r + 90)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1)
                  setRotation(0)
                }}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-white/20 mx-1" />
            </>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">ჩამოტვირთვა</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        {renderPreview()}

        {/* Navigation arrows */}
        {hasPrev && (
          <button
            onClick={() => onNavigate?.(currentIndex - 1)}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2',
              'w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm',
              'flex items-center justify-center',
              'text-white/70 hover:text-white hover:bg-black/70',
              'transition-all duration-150'
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => onNavigate?.(currentIndex + 1)}
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2',
              'w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm',
              'flex items-center justify-center',
              'text-white/70 hover:text-white hover:bg-black/70',
              'transition-all duration-150'
            )}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom filmstrip for multiple files */}
      {canNavigate && files && files.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-black/40 overflow-x-auto">
          {files.map((f, idx) => {
            const isActive = idx === currentIndex
            const isImg = f.type.startsWith('image/')
            return (
              <button
                key={idx}
                onClick={() => onNavigate?.(idx)}
                className={cn(
                  'w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden border-2 transition-all',
                  isActive
                    ? 'border-monday-primary ring-1 ring-monday-primary/50 scale-105'
                    : 'border-transparent opacity-60 hover:opacity-90'
                )}
              >
                {isImg ? (
                  <img
                    src={f.url}
                    alt={f.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white/50" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>,
    document.body
  )
}
