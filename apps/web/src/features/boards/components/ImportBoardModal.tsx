'use client'

import React, { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import type { BoardColumn, ColumnType } from '../types/board'
import {
  parseFile,
  parseExcelFile,
  readFileAsText,
  readFileAsArrayBuffer,
  isModernExcel,
  autoMapColumns,
  transformRows,
  validateImport,
  type ParsedRow,
  type ImportMapping,
  type ImportError,
} from '../utils/importBoard'

interface ImportBoardModalProps {
  columns: BoardColumn[]
  onImport: (items: Array<{ name: string; data: Record<string, any>; group_id: string }>) => Promise<void>
  onClose: () => void
  defaultGroupId?: string
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

export function ImportBoardModal({
  columns,
  onImport,
  onClose,
  defaultGroupId = 'default',
}: ImportBoardModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mappings, setMappings] = useState<ImportMapping[]>([])
  const [errors, setErrors] = useState<ImportError[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setErrors([])

    try {
      let parsedHeaders: string[]
      let parsedRows: ParsedRow[]

      // Use different parsing methods based on file type
      if (isModernExcel(selectedFile.name)) {
        // Modern Excel files (.xlsx, .xls) - read as ArrayBuffer
        const buffer = await readFileAsArrayBuffer(selectedFile)
        const result = parseExcelFile(buffer)
        parsedHeaders = result.headers
        parsedRows = result.rows
      } else {
        // CSV and old XML-based files - read as text
        const content = await readFileAsText(selectedFile)
        const result = parseFile(content, selectedFile.name)
        parsedHeaders = result.headers
        parsedRows = result.rows
      }

      if (parsedHeaders.length === 0) {
        setErrors([{ row: 0, message: 'No data found in file. Please check the file format.' }])
        return
      }

      setHeaders(parsedHeaders)
      setRows(parsedRows)

      // Auto-map columns
      const autoMappings = autoMapColumns(parsedHeaders, columns)
      setMappings(autoMappings)

      setStep('mapping')
    } catch (error) {
      console.error('Error parsing file:', error)
      setErrors([{ row: 0, message: 'Failed to parse file. Please check the file format.' }])
    }
  }, [columns])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const extension = droppedFile.name.toLowerCase().split('.').pop()
      if (['csv', 'xls', 'xlsx'].includes(extension || '')) {
        handleFileSelect(droppedFile)
      } else {
        setErrors([{ row: 0, message: 'Please upload a CSV or Excel file.' }])
      }
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // Update mapping for a source column
  const updateMapping = (sourceColumn: string, targetColumn: string | null) => {
    if (targetColumn === null) {
      // Remove mapping
      setMappings(prev => prev.filter(m => m.sourceColumn !== sourceColumn))
    } else {
      const targetCol = columns.find(c => c.column_id === targetColumn)
      const targetType: ColumnType = targetColumn === 'name' ? 'text' : (targetCol?.column_type || 'text')

      setMappings(prev => {
        const existing = prev.find(m => m.sourceColumn === sourceColumn)
        if (existing) {
          return prev.map(m =>
            m.sourceColumn === sourceColumn
              ? { ...m, targetColumn, targetColumnType: targetType }
              : m
          )
        } else {
          return [...prev, { sourceColumn, targetColumn, targetColumnType: targetType }]
        }
      })
    }
  }

  // Validate and go to preview
  const handleValidateAndPreview = () => {
    const validationErrors = validateImport(rows, mappings)
    setErrors(validationErrors.filter(e => !e.message.includes('No "Name" column')))
    setStep('preview')
  }

  // Perform import
  const handleImport = async () => {
    setStep('importing')
    setImportProgress(0)

    try {
      const transformedItems = transformRows(rows, mappings, defaultGroupId)

      // Import in batches to show progress
      const batchSize = 10
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < transformedItems.length; i += batchSize) {
        const batch = transformedItems.slice(i, i + batchSize)

        try {
          await onImport(batch)
          successCount += batch.length
        } catch (error) {
          console.error('Batch import error:', error)
          failCount += batch.length
        }

        setImportProgress(Math.round(((i + batch.length) / transformedItems.length) * 100))
      }

      setImportResult({ success: successCount, failed: failCount })
      setStep('complete')
    } catch (error) {
      console.error('Import error:', error)
      setErrors([{ row: 0, message: 'Import failed. Please try again.' }])
      setStep('preview')
    }
  }

  // Get mapped target for a source column
  const getMappedTarget = (sourceColumn: string): string | null => {
    const mapping = mappings.find(m => m.sourceColumn === sourceColumn)
    return mapping?.targetColumn || null
  }

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="p-6">
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
                'border-border-light hover:border-monday-primary hover:bg-monday-primary/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />

              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Drop your file here or click to upload
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Supported formats: CSV, XLS, XLSX
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-text-tertiary">
                <Upload className="w-4 h-4" />
                <span>Maximum file size: 10MB</span>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{errors[0].message}</span>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-bg-secondary rounded-lg">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Tips for importing:</h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>- First row should contain column headers</li>
                <li>- Export from Monday.com using "Export to Excel"</li>
                <li>- Make sure dates are in a consistent format</li>
                <li>- Status values should match your board's status options</li>
              </ul>
            </div>
          </div>
        )

      case 'mapping':
        return (
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{file?.name}</span>
                <span className="text-text-tertiary">({rows.length} rows)</span>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Map columns from your file to board columns
              </h3>
              <p className="text-xs text-text-tertiary mb-2">
                Columns are mapped by position (same order as your board). First column becomes item name.
              </p>
              <p className="text-xs text-text-tertiary mb-4">
                Adjust mappings below if needed.
              </p>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {headers.map((sourceHeader, index) => {
                const mapping = mappings.find(m => m.sourceColumn === sourceHeader)
                return (
                <div
                  key={sourceHeader}
                  className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg"
                >
                  <div className="w-6 text-xs text-text-tertiary text-center">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {sourceHeader}
                    </div>
                    <div className="text-xs text-text-tertiary truncate">
                      Sample: {rows[0]?.[sourceHeader] || '(empty)'}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <select
                      value={getMappedTarget(sourceHeader) || ''}
                      onChange={(e) => updateMapping(sourceHeader, e.target.value || null)}
                      className="w-full px-3 py-2 border border-border-light rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-monday-primary"
                    >
                      <option value="">-- Skip this column --</option>
                      <option value="name">Name (Item Title)</option>
                      {columns.map(col => (
                        <option key={col.id} value={col.column_id}>
                          {col.column_name} ({col.column_type})
                        </option>
                      ))}
                    </select>
                    {mapping && (
                      <div className="text-xs text-text-tertiary mt-1">
                        Type: {mapping.targetColumnType}
                      </div>
                    )}
                  </div>
                </div>
              )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Back
              </button>
              <button
                onClick={handleValidateAndPreview}
                disabled={mappings.length === 0}
                className="px-4 py-2 text-sm bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Import
              </button>
            </div>
          </div>
        )

      case 'preview':
        const previewItems = transformRows(rows.slice(0, 5), mappings, defaultGroupId)

        return (
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Preview ({rows.length} items will be imported)
              </h3>

              {errors.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{errors.length} warning(s)</span>
                  </div>
                  <ul className="text-xs text-yellow-600 space-y-1 max-h-24 overflow-y-auto">
                    {errors.slice(0, 5).map((error, i) => (
                      <li key={i}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {errors.length > 5 && (
                      <li>...and {errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="border border-border-light rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">
                      Name
                    </th>
                    {mappings
                      .filter(m => m.targetColumn !== 'name')
                      .slice(0, 4)
                      .map(mapping => {
                        const col = columns.find(c => c.column_id === mapping.targetColumn)
                        return (
                          <th key={mapping.targetColumn} className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">
                            {col?.column_name || mapping.targetColumn}
                          </th>
                        )
                      })}
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item, index) => (
                    <tr key={index} className="border-t border-border-light">
                      <td className="px-3 py-2 text-text-primary">{item.name}</td>
                      {mappings
                        .filter(m => m.targetColumn !== 'name')
                        .slice(0, 4)
                        .map(mapping => (
                          <td key={mapping.targetColumn} className="px-3 py-2 text-text-secondary">
                            {String(item.data[mapping.targetColumn] ?? '')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <div className="px-3 py-2 bg-bg-secondary text-xs text-text-tertiary text-center">
                  ...and {rows.length - 5} more items
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover"
              >
                Import {rows.length} Items
              </button>
            </div>
          </div>
        )

      case 'importing':
        return (
          <div className="p-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-monday-primary animate-spin" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Importing items...
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Please don't close this window
            </p>

            <div className="w-full bg-bg-secondary rounded-full h-2 mb-2">
              <div
                className="bg-monday-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-sm text-text-tertiary">{importProgress}% complete</p>
          </div>
        )

      case 'complete':
        return (
          <div className="p-6 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-status-done" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Import Complete!
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Successfully imported {importResult?.success} items
              {importResult?.failed ? ` (${importResult.failed} failed)` : ''}
            </p>

            <button
              onClick={onClose}
              className="px-6 py-2 text-sm bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover"
            >
              Done
            </button>
          </div>
        )
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Import Data</h2>
            <p className="text-sm text-text-tertiary">
              Import items from CSV or Excel file
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-hover rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'complete' && step !== 'importing' && (
          <div className="flex items-center gap-2 px-6 py-3 bg-bg-secondary border-b border-border-light">
            {(['upload', 'mapping', 'preview'] as const).map((s, index) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    step === s ? 'text-monday-primary font-medium' : 'text-text-tertiary'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                      step === s
                        ? 'bg-monday-primary text-white'
                        : (['mapping', 'preview'].indexOf(step) > ['upload', 'mapping', 'preview'].indexOf(s))
                          ? 'bg-status-done text-white'
                          : 'bg-bg-secondary border border-border-light'
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="hidden sm:inline">
                    {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Columns' : 'Preview'}
                  </span>
                </div>
                {index < 2 && (
                  <div className="flex-1 h-px bg-border-light" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 150px)' }}>
          {renderStepContent()}
        </div>
      </div>
    </div>,
    document.body
  )
}
