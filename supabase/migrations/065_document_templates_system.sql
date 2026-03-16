-- Document Templates & Generated Documents System
-- Enables document generation from board item data using DOCX templates with merge tags

-- Document templates table
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  tags JSONB NOT NULL DEFAULT '[]',
  tag_mapping JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated documents table
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID NOT NULL,
  emailed_to TEXT[],
  emailed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_document_templates_board ON document_templates(board_id);
CREATE INDEX idx_document_templates_workspace ON document_templates(workspace_id);
CREATE INDEX idx_generated_documents_item ON generated_documents(item_id);
CREATE INDEX idx_generated_documents_board ON generated_documents(board_id);
CREATE INDEX idx_generated_documents_template ON generated_documents(template_id);

-- RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Template policies
CREATE POLICY "Users can view templates for accessible boards"
  ON document_templates FOR SELECT
  USING (
    board_id IS NULL
    OR EXISTS (
      SELECT 1 FROM board_members bm WHERE bm.board_id = document_templates.board_id AND bm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM boards b WHERE b.id = document_templates.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert templates"
  ON document_templates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY "Admins can update templates"
  ON document_templates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY "Admins can delete templates"
  ON document_templates FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Generated document policies
CREATE POLICY "Users can view generated documents for accessible boards"
  ON generated_documents FOR SELECT
  USING (
    generated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM board_members bm WHERE bm.board_id = generated_documents.board_id AND bm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM boards b WHERE b.id = generated_documents.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert generated documents"
  ON generated_documents FOR INSERT
  WITH CHECK (generated_by = auth.uid());

-- Updated_at trigger for templates
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
