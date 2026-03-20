export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/middleware/auth'
import { z } from 'zod'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import mammoth from 'mammoth'

const generateSchema = z.object({
  templateId: z.string().uuid(),
  itemId: z.string().uuid(),
  boardId: z.string().uuid(),
})

function resolveComputedField(fieldName: string, itemData: Record<string, any>): string {
  const computed = fieldName.replace('@computed:', '')

  switch (computed) {
    case 'current_date': {
      return new Date().toLocaleDateString('ka-GE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
    case 'current_date_short': {
      return new Date().toLocaleDateString('ka-GE')
    }
    case 'current_year': {
      return new Date().getFullYear().toString()
    }
    case 'current_month': {
      return new Date().toLocaleDateString('ka-GE', { month: 'long' })
    }
    default:
      return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const supabase = createServerClient()
    const body = await request.json()
    const { templateId, itemId, boardId } = generateSchema.parse(body)

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Fetch board item
    const { data: item, error: itemError } = await supabase
      .from('board_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Board item not found' }, { status: 404 })
    }

    // Fetch columns for the board
    const { data: columns, error: columnsError } = await supabase
      .from('board_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position')

    if (columnsError) throw columnsError

    // Build merge data from tag mapping
    const mergeData: Record<string, any> = {}
    const tagMapping = template.tag_mapping as Record<string, string>

    for (const [tag, source] of Object.entries(tagMapping)) {
      if (source.startsWith('@computed:')) {
        mergeData[tag] = resolveComputedField(source, item.data || {})
      } else {
        // source is a column_id — get value from item data
        const column = columns?.find((c: any) => c.column_id === source)
        let value = item.data?.[source]

        // Format value based on column type
        if (column && value !== undefined && value !== null) {
          switch (column.column_type) {
            case 'date':
              value = new Date(value).toLocaleDateString('ka-GE')
              break
            case 'number':
              value = typeof value === 'number' ? value.toString() : value
              break
            case 'status':
              // Status values might be objects with label
              if (typeof value === 'object' && value?.label) {
                value = value.label
              }
              break
            case 'person':
              if (typeof value === 'object' && value?.name) {
                value = value.name
              }
              break
          }
        }

        // Also try item.name for the 'name' field
        if (source === 'name') {
          value = item.name
        }

        mergeData[tag] = value ?? ''
      }
    }

    // Download template file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('attachments')
      .download(template.file_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download template file' }, { status: 500 })
    }

    const templateBuffer = await fileData.arrayBuffer()

    // Apply merge tags with docxtemplater
    const zip = new PizZip(templateBuffer)
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: true,
      linebreaks: true,
      // Return empty string for missing tags instead of crashing
      nullGetter: () => '',
      // Keep formatting from original XML runs
      parser: (tag: string) => ({
        get: (scope: Record<string, any>) => {
          const trimmed = tag.trim()
          return scope[trimmed] !== undefined ? scope[trimmed] : ''
        },
      }),
    })

    doc.render(mergeData)

    const generatedBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    // Generate preview HTML using mammoth
    let previewHtml = ''
    try {
      const mammothResult = await mammoth.convertToHtml({ buffer: generatedBuffer })
      previewHtml = mammothResult.value
    } catch (previewError) {
      console.error('Preview generation failed:', previewError)
      previewHtml = '<p>Preview not available</p>'
    }

    // Upload generated document to storage
    const timestamp = Date.now()
    // Sanitize file name to ASCII-safe characters (Supabase Storage rejects non-ASCII keys)
    const safeName =
      (item.name || 'item')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50) || 'item'
    const outputFileName = `doc_${safeName}_${timestamp}.docx`
    const outputPath = `generated-documents/${boardId}/${outputFileName}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(outputPath, generatedBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const templateBaseName = template.file_name.replace(/\.docx$/i, '')
    const fileName = `${templateBaseName}_${safeName}.docx`

    // Save record in generated_documents table
    const { data: generatedDoc, error: insertError } = await supabase
      .from('generated_documents')
      .insert({
        template_id: templateId,
        board_id: boardId,
        item_id: itemId,
        file_path: outputPath,
        file_name: fileName,
        file_size: generatedBuffer.length,
        generated_by: session.user.id,
        metadata: mergeData,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      documentId: generatedDoc.id,
      downloadUrl: `/api/documents/download?id=${generatedDoc.id}`,
      previewHtml,
      fileName,
    })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Document generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
