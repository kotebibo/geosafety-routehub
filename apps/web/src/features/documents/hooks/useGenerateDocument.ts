'use client'

import { useState } from 'react'
import { documentsService } from '@/services/documents.service'
import type { GenerateDocumentResponse } from '../types/document'

export function useGenerateDocument() {
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<GenerateDocumentResponse | null>(null)

  const generate = async (input: {
    templateId: string
    itemId: string
    boardId: string
  }): Promise<GenerateDocumentResponse> => {
    try {
      setGenerating(true)
      setError(null)
      const data = await documentsService.generateDocument(input)
      setResult(data)
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setGenerating(false)
    }
  }

  const send = async (input: {
    documentId: string
    to: string[]
    subject: string
    message?: string
  }) => {
    try {
      setSending(true)
      setError(null)
      await documentsService.sendDocument(input)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return {
    generate,
    send,
    reset,
    generating,
    sending,
    error,
    result,
  }
}
