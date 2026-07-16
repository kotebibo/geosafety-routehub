-- Per-template email subject/body templates for document sendouts.
--
-- Same {{tag}} syntax as the docx templates, resolved with the template's
-- tag_mapping at generation time (server-side, /api/documents/generate).
-- NULL means the send dialog falls back to the old defaults
-- ("Document: <filename>" subject, empty body). The resolved values only
-- PREFILL the send dialog — the sender can still edit both by hand.

ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS email_subject_template TEXT,
  ADD COLUMN IF NOT EXISTS email_body_template TEXT;
