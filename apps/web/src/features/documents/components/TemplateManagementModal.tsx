'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, Trash2, FileText, Loader2, Settings2 } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useDocumentTemplates } from '../hooks/useDocumentTemplates'
import { documentsService } from '@/services/documents.service'
import { TemplateTagMapper } from './TemplateTagMapper'
import type { DocumentTemplate } from '../types/document'

interface TemplateManagementModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  workspaceId?: string
  columns: Array<{ column_id: string; column_name: string; column_type: string }>
}

type View = 'list' | 'upload' | 'mapping'

export function TemplateManagementModal({
  isOpen,
  onClose,
  boardId,
  workspaceId,
  columns,
}: TemplateManagementModalProps) {
  const [view, setView] = useState<View>('list')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { templates, loading, refresh } = useDocumentTemplates(boardId)

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) {
      setError('Please provide a name and select a file')
      return
    }

    setUploading(true)
    setError('')
    try {
      const result = await documentsService.uploadTemplate(selectedFile, {
        name: uploadName.trim(),
        description: uploadDescription.trim() || undefined,
        boardId,
        workspaceId,
      })
      console.log('Template uploaded:', result)
      await refresh()
      setView('list')
      resetUploadForm()
    } catch (err: any) {
      console.error('Template upload failed:', err)
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    setDeleting(templateId)
    try {
      await documentsService.deleteTemplate(templateId)
      await refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleSaveMapping = async (templateId: string, mapping: Record<string, string>) => {
    try {
      await documentsService.updateTemplate(templateId, { tag_mapping: mapping })
      await refresh()
      setEditingTemplate(null)
      setView('list')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetUploadForm = () => {
    setUploadName('')
    setUploadDescription('')
    setSelectedFile(null)
    setError('')
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-bg-primary rounded-lg shadow-monday-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button
                onClick={() => {
                  setView('list')
                  setEditingTemplate(null)
                  resetUploadForm()
                }}
                className="p-1 rounded hover:bg-bg-hover text-text-secondary mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Settings2 className="w-5 h-5 text-monday-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              {view === 'list'
                ? 'Document Templates'
                : view === 'upload'
                  ? 'Upload Template'
                  : 'Map Tags'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {view === 'list' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-text-secondary">
                  {templates.length} template{templates.length !== 1 ? 's' : ''}
                </p>
                <Button variant="primary" size="sm" onClick={() => setView('upload')}>
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Template
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 text-text-tertiary mb-3" />
                  <p className="text-text-secondary font-medium">No templates yet</p>
                  <p className="text-sm text-text-tertiary mt-1">
                    Upload a .docx, .xlsx, or .xls file with {'{{tag}}'} placeholders to get
                    started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(t => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border-light hover:bg-bg-hover"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-text-tertiary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{t.name}</p>
                          <p className="text-xs text-text-tertiary">
                            {t.tags.length} tags &middot;
                            {Object.keys(t.tag_mapping).length} mapped &middot;
                            {t.file_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setEditingTemplate(t)
                            setView('mapping')
                          }}
                        >
                          Map Tags
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                        >
                          {deleting === t.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="e.g. Invoice, Service Act"
                  className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent text-text-primary placeholder-text-tertiary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Description <span className="text-text-tertiary font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="What is this template used for?"
                  className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent text-text-primary placeholder-text-tertiary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Template File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.xlsx,.xls"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-border-default rounded-lg hover:border-monday-primary hover:bg-monday-primary/5 transition-colors"
                >
                  {selectedFile ? (
                    <>
                      <FileText className="w-5 h-5 text-monday-primary" />
                      <span className="text-sm text-text-primary">{selectedFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-text-tertiary" />
                      <span className="text-sm text-text-secondary">
                        Click to select a .docx, .xlsx, or .xls file
                      </span>
                    </>
                  )}
                </button>
                <div className="mt-3 p-3 rounded-lg bg-bg-secondary border border-border-light">
                  <p className="text-sm font-medium text-text-primary mb-2">
                    How to create a template:
                  </p>
                  <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside">
                    <li>Create a .docx, .xlsx, or .xls file in Word, Excel, or Google Docs</li>
                    <li>
                      Add placeholders using double curly braces:{' '}
                      <code className="px-1 py-0.5 rounded bg-bg-tertiary text-text-primary font-mono">
                        {'{{tag_name}}'}
                      </code>
                    </li>
                    <li>Upload the file here, then map each tag to a board column</li>
                  </ol>
                  <p className="text-xs text-text-tertiary mt-2">
                    Example: &quot;Company: {'{{company_name}}'}, Date: {'{{date}}'}, Amount:{' '}
                    {'{{amount}}'}&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setView('list')
                    resetUploadForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedFile || !uploadName.trim() || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Template'}
                </Button>
              </div>
            </div>
          )}

          {view === 'mapping' && editingTemplate && (
            <TemplateTagMapper
              template={editingTemplate}
              columns={columns}
              onSave={mapping => handleSaveMapping(editingTemplate.id, mapping)}
              onCancel={() => {
                setEditingTemplate(null)
                setView('list')
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
