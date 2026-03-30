'use client'

import React, { useState, useRef, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import {
  Paperclip,
  Upload,
  X,
  File,
  Image,
  FileText,
  Download,
  Trash2,
  Plus,
  Eye,
} from 'lucide-react'
import { Tooltip } from '@/shared/components/ui/tooltip'
import { calculatePopupPosition } from './usePopupPosition'
import { FilePreviewModal } from './FilePreviewModal'

interface FileAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploaded_at: string
  path?: string // Storage path for refreshing signed URLs
}

interface FilesCellProps {
  value?: FileAttachment[] | string | null
  onEdit?: (value: FileAttachment[]) => void
  readOnly?: boolean
  itemId?: string
  onEditStart?: () => void
}

const ACCEPTED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  all: ['image/*', 'application/pdf', '.doc', '.docx'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Parse value to ensure it's always an array of FileAttachment
function parseFilesValue(value: FileAttachment[] | string | null | undefined): FileAttachment[] {
  if (!value) return []
  if (Array.isArray(value)) return value

  // Handle string values (from imports)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Not JSON, ignore
    }

    // Return empty - string file references can't be used directly
    return []
  }

  return []
}

export const FilesCell = memo(function FilesCell({
  value,
  onEdit,
  readOnly = false,
  itemId,
  onEditStart,
}: FilesCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<FileAttachment[]>(() => parseFilesValue(value))
  const [uploading, setUploading] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFiles(parseFilesValue(value))
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOpen = () => {
    if (buttonRef.current) {
      const position = calculatePopupPosition({
        triggerRect: buttonRef.current.getBoundingClientRect(),
        popupWidth: 320,
        popupHeight: 350,
      })
      setDropdownPosition(position)
    }
    if (!isOpen) {
      onEditStart?.()
    }
    setIsOpen(!isOpen)
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />
    }
    if (type === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-500" />
    }
    return <File className="w-4 h-4 text-text-secondary" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)

    try {
      const newFiles: FileAttachment[] = []

      for (const file of Array.from(selectedFiles)) {
        if (file.size > MAX_FILE_SIZE) {
          console.error(`File ${file.name} is too large (max 10MB)`)
          continue
        }

        // Generate unique file path
        const fileExt = file.name.split('.').pop()
        const fileName = `${itemId || 'item'}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `board-attachments/${fileName}`

        // Try to upload to Supabase Storage
        // Note: The 'attachments' bucket must be created in Supabase Dashboard
        try {
          const { data, error } = await supabase.storage.from('attachments').upload(filePath, file)

          if (error) {
            // Check if bucket doesn't exist
            if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
              console.warn(
                'Storage bucket "attachments" not found. Please create it in Supabase Dashboard.'
              )
              // Fall back to storing file metadata without actual upload
              // In production, you'd want to create the bucket
            } else {
              console.error('Upload error:', error)
            }
            continue
          }

          // Get signed URL for private bucket (expires in 1 year)
          const { data: urlData } = await supabase.storage
            .from('attachments')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

          newFiles.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: file.name,
            url: urlData?.signedUrl || '',
            type: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString(),
            path: filePath, // Store path for refreshing signed URL later
          })
        } catch (uploadError: any) {
          console.warn('File upload failed:', uploadError?.message || 'Unknown error')
        }
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles]
        setFiles(updatedFiles)
        onEdit?.(updatedFiles)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId)
    setFiles(updatedFiles)
    onEdit?.(updatedFiles)
  }

  const handleDownload = (file: FileAttachment) => {
    window.open(file.url, '_blank')
  }

  if (readOnly && files.length === 0) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-text-tertiary text-sm">-</div>
    )
  }

  return (
    <div className="relative h-full min-h-[36px]">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'h-full min-h-[36px] w-full flex items-center gap-2 px-3 text-left',
          !readOnly && 'hover:bg-bg-hover cursor-pointer',
          readOnly && 'cursor-default'
        )}
      >
        <Paperclip className="w-4 h-4 text-text-secondary flex-shrink-0" />
        {files.length > 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-text-primary">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            <div className="flex -space-x-1">
              {files.slice(0, 3).map((file, i) => (
                <div
                  key={file.id}
                  className="w-5 h-5 rounded bg-bg-secondary border border-white flex items-center justify-center"
                >
                  {getFileIcon(file.type)}
                </div>
              ))}
              {files.length > 3 && (
                <div className="w-5 h-5 rounded bg-border-light border border-white flex items-center justify-center text-[10px] text-text-secondary font-medium">
                  +{files.length - 3}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-text-tertiary">Add files...</span>
        )}
      </button>

      {/* Dropdown Portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              'fixed z-[9999]',
              'bg-bg-primary rounded-lg',
              'border border-border-light',
              'shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
              'p-3 min-w-[280px] max-w-[360px]'
            )}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">Attachments</span>
              {!readOnly && (
                <label className="flex items-center gap-1 px-2 py-1 text-xs text-text-link hover:bg-bg-hover rounded cursor-pointer transition-colors">
                  <Plus className="w-3 h-3" />
                  Add
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES.all.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* File List */}
            {files.length === 0 ? (
              <div className="py-6 text-center">
                {!readOnly ? (
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center">
                      <Upload className="w-6 h-6 text-text-secondary" />
                    </div>
                    <span className="text-sm text-text-secondary">
                      {uploading ? 'Uploading...' : 'Click to upload files'}
                    </span>
                    <span className="text-xs text-text-tertiary">Max 10MB per file</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_TYPES.all.join(',')}
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                ) : (
                  <span className="text-sm text-text-tertiary">No attachments</span>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-bg-hover group"
                  >
                    {/* Thumbnail or Icon — click to preview */}
                    <Tooltip content="Preview" side="top" delayDuration={200}>
                      <button
                        onClick={() => {
                          setPreviewIndex(index)
                          setIsOpen(false)
                        }}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        {file.type.startsWith('image/') ? (
                          <div className="w-10 h-10 rounded overflow-hidden bg-bg-secondary">
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-bg-secondary flex items-center justify-center">
                            {getFileIcon(file.type)}
                          </div>
                        )}
                      </button>
                    </Tooltip>

                    {/* File Info — click to preview */}
                    <Tooltip content="Preview" side="top" delayDuration={200}>
                      <button
                        onClick={() => {
                          setPreviewIndex(index)
                          setIsOpen(false)
                        }}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="text-sm text-text-primary truncate hover:text-text-link transition-colors">
                          {file.name}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {formatFileSize(file.size)}
                        </div>
                      </button>
                    </Tooltip>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip content="Preview" side="top" delayDuration={200}>
                        <button
                          onClick={() => {
                            setPreviewIndex(index)
                            setIsOpen(false)
                          }}
                          className="p-1 rounded hover:bg-bg-hover"
                        >
                          <Eye className="w-4 h-4 text-text-secondary" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Download" side="top" delayDuration={200}>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 rounded hover:bg-bg-hover"
                        >
                          <Download className="w-4 h-4 text-text-secondary" />
                        </button>
                      </Tooltip>
                      {!readOnly && (
                        <Tooltip content="Remove" side="top" delayDuration={200}>
                          <button
                            onClick={() => handleRemoveFile(file.id)}
                            className="p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload indicator */}
            {uploading && (
              <div className="mt-2 pt-2 border-t border-border-light">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <div className="w-4 h-4 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* File Preview Modal */}
      {previewIndex !== null && files[previewIndex] && (
        <FilePreviewModal
          file={files[previewIndex]}
          files={files}
          currentIndex={previewIndex}
          onNavigate={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  )
})
