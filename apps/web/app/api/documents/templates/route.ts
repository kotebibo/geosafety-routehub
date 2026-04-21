export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/middleware/auth'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import ExcelJS from 'exceljs'
import XLSX from 'xlsx'

const SUPPORTED_EXTENSIONS = ['.docx', '.xlsx', '.xls']

const CONTENT_TYPES: Record<string, string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
}

function getFileExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase()
}

function parseTagsFromDocx(buffer: ArrayBuffer): string[] {
  const zip = new PizZip(buffer)
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  })

  // Get all tags used in the template
  const tags = doc.getFullText().match(/\{\{([^}]+)\}\}/g)
  if (!tags) return []

  const uniqueTags = [...new Set(tags.map(tag => tag.replace(/\{\{|\}\}/g, '').trim()))]
  return uniqueTags
}

function parseTagsFromExcelSheetJS(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const tags: string[] = []
  const tagRegex = /\{\{([^}]+)\}\}/g

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
    for (const row of rows) {
      for (const cell of row) {
        const text = String(cell || '')
        let match
        while ((match = tagRegex.exec(text)) !== null) {
          tags.push(match[1].trim())
        }
      }
    }
  }

  return [...new Set(tags)]
}

async function parseTagsFromXlsx(buffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as any)

  const tags: string[] = []
  const tagRegex = /\{\{([^}]+)\}\}/g

  workbook.eachSheet(sheet => {
    sheet.eachRow(row => {
      row.eachCell(cell => {
        try {
          const value = cell.text || (typeof cell.value === 'string' ? cell.value : '')
          let match
          while ((match = tagRegex.exec(value)) !== null) {
            tags.push(match[1].trim())
          }
        } catch {
          // Skip cells that can't be read (e.g. merged cells with null values)
        }
      })
    })
  })

  return [...new Set(tags)]
}

// Note: .xls files are stored as-is (no conversion) to preserve watermarks and formatting.
// ExcelJS can't read .xls binary format, so tag generation won't auto-fill .xls templates.
// Users download and fill .xls manually. Only .xlsx supports auto-fill generation.

// GET - List templates for a board
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const supabase = createServerClient()

    const boardId = request.nextUrl.searchParams.get('boardId')
    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .or(`board_id.eq.${boardId},board_id.is.null`)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Upload a new template
export async function POST(request: NextRequest) {
  try {
    let authResult
    try {
      authResult = await requireAdmin()
    } catch (authError: any) {
      console.error('Auth failed in template upload:', authError.name, authError.message)
      throw authError
    }
    const { session } = authResult
    const supabase = createServerClient()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const boardId = formData.get('boardId') as string | null
    const workspaceId = formData.get('workspaceId') as string | null

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 })
    }

    const ext = getFileExtension(file.name)
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Only .docx, .xlsx, and .xls files are supported' },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const uploadBuffer: Buffer = Buffer.from(arrayBuffer)
    const storedFileName = file.name
    const contentType = CONTENT_TYPES[ext]

    // Parse tags based on file type
    let tags: string[] = []
    let tagParseWarning: string | null = null
    try {
      if (ext === '.docx') {
        tags = parseTagsFromDocx(arrayBuffer)
      } else if (ext === '.xlsx') {
        tags = await parseTagsFromXlsx(uploadBuffer)
      } else {
        // .xls — use SheetJS to read tags (can read .xls binary format)
        tags = parseTagsFromExcelSheetJS(arrayBuffer)
      }
      if (tags.length === 0) {
        tagParseWarning =
          'ტეგები ვერ მოიძებნა. დარწმუნდით რომ შაბლონი შეიცავს {{tag}} ფორმატის ველებს.'
      }
    } catch (parseError) {
      console.error('Error parsing template tags:', parseError)
      tagParseWarning =
        'ტეგების ამოცნობა ვერ მოხერხდა. შაბლონი აიტვირთა მაგრამ ტეგების მეპინგი ხელით უნდა შეავსოთ.'
    }

    // Upload to Supabase Storage
    const storagePath = `document-templates/${workspaceId || 'global'}/${Date.now()}_${storedFileName}`
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, uploadBuffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Create template record
    const { data: template, error: insertError } = await supabase
      .from('document_templates')
      .insert({
        name,
        description: description || null,
        board_id: boardId || null,
        workspace_id: workspaceId || null,
        file_path: storagePath,
        file_name: storedFileName,
        file_size: uploadBuffer.length,
        tags,
        tag_mapping: {},
        created_by: session.user.id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ ...template, warning: tagParseWarning }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Template upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
