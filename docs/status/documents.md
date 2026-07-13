# Document Generation — STABLE

Template-based document generation from board item data. Complete end-to-end; no work needed.

## What exists

- **Templates**: upload DOCX/XLSX/XLS, automatic `{{tag}}` merge-field extraction, tag→column mapping per board, template management UI (rename, remap, delete)
- **Generation**: merge board item data into the template (docxtemplater for Word, exceljs for Excel; `.xls` binary served as-is to preserve formatting), HTML preview (mammoth), download, and direct email send via Resend
- **Record-keeping**: `generated_documents` tracks every generation (who, when, from which item, emailed to whom)
- Triggered from board item UI; used in production for client-facing documents

## Tables

`document_templates`, `generated_documents` (+ Supabase Storage for files)

## Gaps

None blocking. Audit found no TODOs or stubs. Possible future niceties: bulk generation for a filtered set of items; PDF output (currently Word/Excel only).
