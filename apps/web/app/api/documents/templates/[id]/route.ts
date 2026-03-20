export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/middleware/auth'

// GET - Get a single template
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update template (name, description, tag_mapping, is_active)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()
    const allowedFields = ['name', 'description', 'tag_mapping', 'is_active']
    const updates: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('document_templates')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete template and its storage file
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const supabase = createServerClient()

    // Get template to find storage path
    const { data: template, error: fetchError } = await supabase
      .from('document_templates')
      .select('file_path')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage
    if (template?.file_path) {
      await supabase.storage.from('attachments').remove([template.file_path])
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', params.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
