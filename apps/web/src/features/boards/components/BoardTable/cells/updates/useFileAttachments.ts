'use client'

import React, { useState, useRef, useMemo } from 'react'

import { supabase } from '@/lib/supabase/client'

import { MAX_FILE_SIZE } from './types'
import { isPreviewable } from './helpers'

import type { ItemComment, BoardColumn } from '@/types/board'
import type { FileAttachment, AggregatedFile } from './types'

interface UseFileAttachmentsOptions {
  itemId: string
  comments: ItemComment[]
  row?: any
  allColumns?: BoardColumn[]
}

export function useFileAttachments({
  itemId,
  comments,
  row,
  allColumns,
}: UseFileAttachmentsOptions) {
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File preview
  const [previewFile, setPreviewFile] = useState<AggregatedFile | null>(null)
  const [previewFileIndex, setPreviewFileIndex] = useState(0)

  // Aggregate files from all file columns + comment attachments
  const aggregatedFiles: AggregatedFile[] = useMemo(() => {
    const files: AggregatedFile[] = []

    // Files from file columns
    if (row?.data && allColumns) {
      allColumns
        .filter(col => col.column_type === 'files')
        .forEach(col => {
          const colFiles = row.data[col.column_id]
          if (Array.isArray(colFiles)) {
            colFiles.forEach((f: any) => {
              if (f && f.url) {
                files.push({
                  ...f,
                  id: f.id || `${col.column_id}_${f.name}`,
                  source: col.column_name,
                })
              }
            })
          }
        })
    }

    // Files from comment attachments
    comments.forEach(comment => {
      if (comment.attachments && comment.attachments.length > 0) {
        comment.attachments.forEach((att, idx) => {
          let parsed: any = att
          try {
            parsed = typeof att === 'string' ? JSON.parse(att) : att
          } catch {
            parsed = { name: `File ${idx + 1}`, url: att, type: '', size: 0 }
          }
          if (parsed.url) {
            files.push({
              id: `comment_${comment.id}_${idx}`,
              name: parsed.name || `File ${idx + 1}`,
              url: parsed.url,
              type: parsed.type || '',
              size: parsed.size || 0,
              path: parsed.path,
              source: 'კომენტარი',
            })
          }
        })
      }
      // Also check replies
      comment.replies?.forEach(reply => {
        if (reply.attachments && reply.attachments.length > 0) {
          reply.attachments.forEach((att, idx) => {
            let parsed: any = att
            try {
              parsed = typeof att === 'string' ? JSON.parse(att) : att
            } catch {
              parsed = { name: `File ${idx + 1}`, url: att, type: '', size: 0 }
            }
            if (parsed.url) {
              files.push({
                id: `reply_${reply.id}_${idx}`,
                name: parsed.name || `File ${idx + 1}`,
                url: parsed.url,
                type: parsed.type || '',
                size: parsed.size || 0,
                path: parsed.path,
                source: 'კომენტარი',
              })
            }
          })
        }
      })
    })

    return files
  }, [row, allColumns, comments])

  // Previewable files for navigation in the preview modal
  const previewableFiles = useMemo(() => aggregatedFiles.filter(isPreviewable), [aggregatedFiles])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    try {
      const newFiles: FileAttachment[] = []
      for (const file of Array.from(selectedFiles)) {
        if (file.size > MAX_FILE_SIZE) {
          console.error(`File ${file.name} is too large (max 100MB)`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${itemId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `comment-attachments/${fileName}`

        try {
          const { error } = await supabase.storage.from('attachments').upload(filePath, file)
          if (error) {
            console.error('Upload error:', error)
            continue
          }

          const { data: urlData } = await supabase.storage
            .from('attachments')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365)

          newFiles.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: file.name,
            url: urlData?.signedUrl || '',
            type: file.type,
            size: file.size,
            path: filePath,
          })
        } catch (err) {
          console.error('Upload failed:', err)
        }
      }
      setPendingFiles(prev => [...prev, ...newFiles])
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePendingFile = (fileId: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const clearPendingFiles = () => setPendingFiles([])

  const openFilePreview = (file: AggregatedFile) => {
    const idx = previewableFiles.findIndex(f => f.id === file.id)
    setPreviewFile(file)
    setPreviewFileIndex(idx >= 0 ? idx : 0)
  }

  const closeFilePreview = () => setPreviewFile(null)

  const handlePreviewNavigate = (index: number) => {
    if (previewableFiles[index]) {
      setPreviewFile(previewableFiles[index])
      setPreviewFileIndex(index)
    }
  }

  return {
    pendingFiles,
    clearPendingFiles,
    uploading,
    fileInputRef,
    handleFileSelect,
    removePendingFile,
    aggregatedFiles,
    previewableFiles,
    previewFile,
    previewFileIndex,
    openFilePreview,
    closeFilePreview,
    handlePreviewNavigate,
  }
}
