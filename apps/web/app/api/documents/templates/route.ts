export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireAdmin } from '@/middleware/auth'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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

// GET - List templates for a board
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

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
    return NextResponse.json({ error: error.message }, { status: 500 })
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const boardId = formData.get('boardId') as string | null
    const workspaceId = formData.get('workspaceId') as string | null

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 })
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 400 })
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()

    // Parse tags from DOCX
    let tags: string[] = []
    try {
      tags = parseTagsFromDocx(arrayBuffer)
    } catch (parseError) {
      console.error('Error parsing template tags:', parseError)
      // Continue without tags — user can still upload
    }

    // Upload to Supabase Storage
    const storagePath = `document-templates/${workspaceId || 'global'}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
        file_name: file.name,
        file_size: file.size,
        tags,
        tag_mapping: {},
        created_by: session.user.id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json(template, { status: 201 })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Template upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
