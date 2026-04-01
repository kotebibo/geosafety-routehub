export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/middleware/auth'
import { z } from 'zod'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import mammoth from 'mammoth'
import ExcelJS from 'exceljs'

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
    case 'current_date_iso': {
      return new Date().toISOString().split('T')[0]
    }
    case 'current_day': {
      return new Date().getDate().toString()
    }
    case 'current_date_full': {
      return new Date().toLocaleDateString('ka-GE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
    case 'item_name': {
      return itemData._item_name || ''
    }
    case 'item_group': {
      return itemData._item_group || ''
    }
    case 'generation_timestamp': {
      return new Date().toLocaleString('ka-GE')
    }
    default:
      return ''
  }
}

function buildMergeData(
  tagMapping: Record<string, string>,
  item: any,
  columns: any[],
  enrichedItemData: Record<string, any>
): Record<string, any> {
  const mergeData: Record<string, any> = {}

  for (const [tag, source] of Object.entries(tagMapping)) {
    if (source.startsWith('@computed:')) {
      mergeData[tag] = resolveComputedField(source, enrichedItemData)
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

  return mergeData
}

function generateDocx(templateBuffer: ArrayBuffer, mergeData: Record<string, any>): Buffer {
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
    parser: (tag: string) => ({
      get: (scope: Record<string, any>) => {
        const trimmed = tag.trim()
        return scope[trimmed] !== undefined ? scope[trimmed] : ''
      },
    }),
  })

  doc.render(mergeData)

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

async function generateDocxPreview(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer })
    return result.value
  } catch {
    return '<p>Preview not available</p>'
  }
}

async function generateXlsx(
  templateBuffer: Buffer,
  mergeData: Record<string, any>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(templateBuffer as any)

  const tagRegex = /\{\{([^}]+)\}\}/g

  workbook.eachSheet(sheet => {
    sheet.eachRow(row => {
      row.eachCell(cell => {
        try {
          // Handle rich text cells
          if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
            const richText = (cell.value as ExcelJS.CellRichTextValue).richText
            let hasTag = false
            for (const part of richText) {
              if (typeof part.text === 'string' && tagRegex.test(part.text)) {
                hasTag = true
                part.text = part.text.replace(tagRegex, (_match, tagName) => {
                  const trimmed = tagName.trim()
                  return mergeData[trimmed] !== undefined ? String(mergeData[trimmed]) : ''
                })
              }
            }
            if (hasTag) {
              // If all rich text parts now form a simple string, flatten to plain value
              const fullText = richText.map(p => p.text).join('')
              // Check if it's a number after replacement
              const num = Number(fullText)
              if (fullText && !isNaN(num) && fullText.trim() !== '') {
                cell.value = num
              }
            }
            return
          }

          const text = cell.text || (typeof cell.value === 'string' ? cell.value : '')
          if (!text || !tagRegex.test(text)) return

          // Reset regex lastIndex
          tagRegex.lastIndex = 0

          const replaced = text.replace(tagRegex, (_match, tagName) => {
            const trimmed = tagName.trim()
            return mergeData[trimmed] !== undefined ? String(mergeData[trimmed]) : ''
          })

          // If the entire cell was a single tag and the result is numeric, store as number
          if (typeof cell.value === 'string' && cell.value.match(/^\{\{[^}]+\}\}$/)) {
            const num = Number(replaced)
            if (!isNaN(num) && replaced.trim() !== '') {
              cell.value = num
              return
            }
          }

          cell.value = replaced
        } catch {
          // Skip cells that can't be processed (e.g. merged cells with null values)
        }
      })
    })
  })

  const outputBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(outputBuffer)
}

async function generateXlsxPreviewAsync(buffer: Buffer): Promise<string> {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)

    let html = '<div style="font-family: sans-serif; font-size: 13px;">'

    workbook.eachSheet(sheet => {
      html += `<h3 style="margin: 16px 0 8px;">${sheet.name}</h3>`
      html += '<table style="border-collapse: collapse; width: 100%;">'

      sheet.eachRow(row => {
        html += '<tr>'
        row.eachCell({ includeEmpty: true }, cell => {
          let value = ''
          try {
            value = cell.text || ''
          } catch {
            value = String(cell.value ?? '')
          }
          const style = 'border: 1px solid #ddd; padding: 4px 8px; font-size: 12px;'
          html += `<td style="${style}">${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`
        })
        html += '</tr>'
      })

      html += '</table>'
    })

    html += '</div>'
    return html
  } catch {
    return '<p>Excel preview not available — download the file to view.</p>'
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
    const enrichedItemData = {
      ...item.data,
      _item_name: item.name || '',
      _item_group: '',
    }

    const mergeData = buildMergeData(
      template.tag_mapping as Record<string, string>,
      item,
      columns || [],
      enrichedItemData
    )

    // Download template file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('attachments')
      .download(template.file_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download template file' }, { status: 500 })
    }

    const templateBuffer = await fileData.arrayBuffer()

    // Determine file type and generate accordingly
    const isXlsx = template.file_name.match(/\.xlsx$/i)
    const isXls = template.file_name.match(/\.xls$/i) && !isXlsx
    const isExcel = isXlsx || isXls

    let generatedBuffer: Buffer
    let previewHtml: string
    let outputExt: string
    let contentType: string

    if (isXlsx) {
      generatedBuffer = await generateXlsx(Buffer.from(templateBuffer), mergeData)
      previewHtml = await generateXlsxPreviewAsync(generatedBuffer)
      outputExt = '.xlsx'
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (isXls) {
      // .xls binary format — can't modify while preserving watermarks/formatting
      // Serve the original template as-is for download
      generatedBuffer = Buffer.from(templateBuffer)
      previewHtml =
        '<p style="padding: 20px; text-align: center; color: #666;">' +
        'This is a .xls template — download it and fill in the fields manually in Excel.<br/>' +
        '<small>For automatic field replacement, re-save the template as .xlsx format.</small></p>'
      outputExt = '.xls'
      contentType = 'application/vnd.ms-excel'
    } else {
      generatedBuffer = generateDocx(templateBuffer, mergeData)
      previewHtml = await generateDocxPreview(generatedBuffer)
      outputExt = '.docx'
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

    // Upload generated document to storage
    const timestamp = Date.now()
    const safeName =
      (item.name || 'item')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50) || 'item'
    const outputFileName = `doc_${safeName}_${timestamp}${outputExt}`
    const outputPath = `generated-documents/${boardId}/${outputFileName}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(outputPath, generatedBuffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const templateBaseName = template.file_name.replace(/\.(docx|xlsx|xls)$/i, '')
    const fileName = `${templateBaseName}_${safeName}${outputExt}`

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
