'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { File, FileText, Download, Eye, FolderOpen, Grid3X3, List, Search } from 'lucide-react'

import { getFileIcon, formatFileSize, isPreviewable } from './helpers'

import type { AggregatedFile } from './types'

interface FilesTabProps {
  loading: boolean
  aggregatedFiles: AggregatedFile[]
  onOpenPreview: (file: AggregatedFile) => void
}

export function FilesTab({ loading, aggregatedFiles, onOpenPreview }: FilesTabProps) {
  const t = useTranslations()
  const [filesViewMode, setFilesViewMode] = useState<'grid' | 'list'>('grid')
  const [fileSearchQuery, setFileSearchQuery] = useState('')

  // Filtered files for search
  const filteredFiles = useMemo(() => {
    if (!fileSearchQuery.trim()) return aggregatedFiles
    const q = fileSearchQuery.toLowerCase()
    return aggregatedFiles.filter(
      f => f.name.toLowerCase().includes(q) || f.source.toLowerCase().includes(q)
    )
  }, [aggregatedFiles, fileSearchQuery])

  const getFileThumbnail = (file: AggregatedFile) => {
    if (file.type.startsWith('image/')) return file.url
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (aggregatedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-border-light flex items-center justify-center mb-3">
          <FolderOpen className="w-8 h-8 text-border-medium" />
        </div>
        <span className="text-base font-medium text-text-primary mb-1">
          {t('boards.updates.files.emptyTitle')}
        </span>
        <span className="text-sm text-text-secondary">
          {t('boards.updates.files.emptyDescription')}
        </span>
      </div>
    )
  }

  return (
    <>
      {/* Files toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light bg-bg-primary">
        <div className="relative flex-1 max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            value={fileSearchQuery}
            onChange={e => setFileSearchQuery(e.target.value)}
            placeholder={t('boards.updates.files.searchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-secondary border border-border-light rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-monday-primary"
          />
        </div>
        <div className="flex items-center gap-0.5 bg-bg-secondary rounded-md p-0.5">
          <button
            onClick={() => setFilesViewMode('grid')}
            className={cn(
              'p-1.5 rounded transition-colors',
              filesViewMode === 'grid'
                ? 'bg-bg-primary shadow-sm text-monday-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFilesViewMode('list')}
            className={cn(
              'p-1.5 rounded transition-colors',
              filesViewMode === 'list'
                ? 'bg-bg-primary shadow-sm text-monday-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-sm text-text-tertiary">
            {t('boards.updates.files.noFilesFound')}
          </div>
        ) : filesViewMode === 'grid' ? (
          /* Grid gallery view */
          <div className="space-y-4">
            {Object.entries(
              filteredFiles.reduce(
                (acc, file) => {
                  if (!acc[file.source]) acc[file.source] = []
                  acc[file.source].push(file)
                  return acc
                },
                {} as Record<string, AggregatedFile[]>
              )
            ).map(([source, files]) => (
              <div key={source}>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 px-0.5 flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  {source}
                  <span className="text-text-tertiary font-normal">({files.length})</span>
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {files.map(file => {
                    const thumb = getFileThumbnail(file)
                    const canPreview = isPreviewable(file)
                    return (
                      <div
                        key={file.id}
                        className="group relative bg-bg-primary border border-border-light rounded-lg overflow-hidden hover:border-monday-primary/40 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => canPreview && onOpenPreview(file)}
                      >
                        {/* Thumbnail area */}
                        <div className="aspect-[4/3] bg-bg-secondary flex items-center justify-center overflow-hidden">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={file.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              {file.type === 'application/pdf' ? (
                                <FileText className="w-8 h-8 text-red-400" />
                              ) : file.name.endsWith('.docx') || file.name.endsWith('.doc') ? (
                                <FileText className="w-8 h-8 text-blue-400" />
                              ) : (
                                <File className="w-8 h-8 text-text-tertiary" />
                              )}
                              <span className="text-[10px] text-text-tertiary uppercase font-medium">
                                {file.name.split('.').pop()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          {canPreview && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                onOpenPreview(file)
                              }}
                              className="p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
                            >
                              <Eye className="w-4 h-4 text-gray-700" />
                            </button>
                          )}
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
                          >
                            <Download className="w-4 h-4 text-gray-700" />
                          </a>
                        </div>

                        {/* File info */}
                        <div className="px-2.5 py-2">
                          <p className="text-xs font-medium text-text-primary truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-text-tertiary mt-0.5">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-4">
            {Object.entries(
              filteredFiles.reduce(
                (acc, file) => {
                  if (!acc[file.source]) acc[file.source] = []
                  acc[file.source].push(file)
                  return acc
                },
                {} as Record<string, AggregatedFile[]>
              )
            ).map(([source, files]) => (
              <div key={source}>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-0.5 flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  {source}
                  <span className="text-text-tertiary font-normal">({files.length})</span>
                </h4>
                <div className="space-y-1">
                  {files.map(file => {
                    const isImg = file.type.startsWith('image/')
                    const canPreview = isPreviewable(file)
                    return (
                      <div
                        key={file.id}
                        className="group flex items-center gap-3 px-3 py-2.5 bg-bg-primary border border-border-light rounded-lg hover:border-monday-primary/30 transition-colors"
                      >
                        {isImg ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-bg-secondary flex items-center justify-center flex-shrink-0">
                            {getFileIcon(file.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-text-tertiary">{formatFileSize(file.size)}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canPreview && (
                            <button
                              onClick={() => onOpenPreview(file)}
                              className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5 text-text-secondary" />
                            </button>
                          )}
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5 text-text-secondary" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
