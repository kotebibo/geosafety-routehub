import type {
  DocumentTemplate,
  GeneratedDocument,
  GenerateDocumentResponse,
} from '@/features/documents/types/document'

export const documentsService = {
  // ============================================
  // TEMPLATE METHODS
  // ============================================

  getTemplates: async (boardId: string): Promise<DocumentTemplate[]> => {
    const response = await fetch(`/api/documents/templates?boardId=${boardId}`)
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to fetch templates')
    }
    return response.json()
  },

  getTemplate: async (templateId: string): Promise<DocumentTemplate> => {
    const { data, error } = await getDb()
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) throw error
    return data as DocumentTemplate
  },

  uploadTemplate: async (
    file: File,
    metadata: { name: string; description?: string; boardId?: string; workspaceId?: string }
  ): Promise<DocumentTemplate> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', metadata.name)
    if (metadata.description) formData.append('description', metadata.description)
    if (metadata.boardId) formData.append('boardId', metadata.boardId)
    if (metadata.workspaceId) formData.append('workspaceId', metadata.workspaceId)

    const response = await fetch('/api/documents/templates', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to upload template')
    }

    return response.json()
  },

  updateTemplate: async (
    templateId: string,
    updates: Partial<Pick<DocumentTemplate, 'name' | 'description' | 'tag_mapping' | 'is_active'>>
  ): Promise<DocumentTemplate> => {
    const response = await fetch(`/api/documents/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to update template')
    }

    return response.json()
  },

  deleteTemplate: async (templateId: string): Promise<void> => {
    const response = await fetch(`/api/documents/templates/${templateId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to delete template')
    }
  },

  // ============================================
  // DOCUMENT GENERATION
  // ============================================

  generateDocument: async (input: {
    templateId: string
    itemId: string
    boardId: string
  }): Promise<GenerateDocumentResponse> => {
    const response = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to generate document')
    }

    return response.json()
  },

  sendDocument: async (input: {
    documentId: string
    to: string[]
    subject: string
    message?: string
  }): Promise<void> => {
    const response = await fetch('/api/documents/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to send document')
    }
  },

  // ============================================
  // GENERATED DOCUMENTS HISTORY
  // ============================================

  getGeneratedDocuments: async (itemId: string): Promise<GeneratedDocument[]> => {
    const response = await fetch(`/api/documents/generated?itemId=${itemId}`)
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to fetch generated documents')
    }
    return response.json()
  },
}
