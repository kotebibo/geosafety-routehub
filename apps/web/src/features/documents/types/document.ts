export interface DocumentTemplate {
  id: string
  name: string
  description?: string
  board_id?: string
  workspace_id?: string
  file_path: string
  file_name: string
  file_size?: number
  tags: string[]
  tag_mapping: Record<string, string>
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface GeneratedDocument {
  id: string
  template_id?: string
  board_id: string
  item_id: string
  file_path: string
  file_name: string
  file_size?: number
  generated_by: string
  emailed_to?: string[]
  emailed_at?: string
  metadata: Record<string, any>
  created_at: string
}

export interface GenerateDocumentInput {
  templateId: string
  itemId: string
  boardId: string
}

export interface GenerateDocumentResponse {
  documentId: string
  downloadUrl: string
  previewHtml: string
  fileName: string
}

export interface SendDocumentInput {
  documentId: string
  to: string[]
  subject: string
  message?: string
}

export interface TemplateUploadInput {
  name: string
  description?: string
  boardId?: string
  workspaceId?: string
}
