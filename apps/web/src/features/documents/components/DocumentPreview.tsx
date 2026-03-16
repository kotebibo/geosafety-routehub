'use client'

import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui'

interface DocumentPreviewProps {
  previewHtml: string
  downloading: boolean
  fileName: string
  onDownload: () => void
}

export function DocumentPreview({
  previewHtml,
  downloading,
  fileName,
  onDownload,
}: DocumentPreviewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">
          Preview: <span className="font-medium text-text-primary">{fileName}</span>
        </p>
        <Button variant="secondary" size="sm" onClick={onDownload} disabled={downloading}>
          {downloading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          Download
        </Button>
      </div>

      <div
        className="flex-1 overflow-auto border border-border-light rounded-lg bg-white p-6"
        style={{ maxHeight: '400px' }}
      >
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    </div>
  )
}
