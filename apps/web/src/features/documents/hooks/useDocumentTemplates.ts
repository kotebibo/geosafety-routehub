'use client'

import { useState, useEffect, useCallback } from 'react'
import { documentsService } from '@/services/documents.service'
import type { DocumentTemplate } from '../types/document'

export function useDocumentTemplates(boardId: string) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!boardId) return
    try {
      setLoading(true)
      setError(null)
      const data = await documentsService.getTemplates(boardId)
      setTemplates(data)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
  }
}
