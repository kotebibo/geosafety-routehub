export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const supabase = createServerClient()

    const documentId = request.nextUrl.searchParams.get('id')
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Fetch document record
    const { data: doc, error: docError } = await supabase
      .from('generated_documents')
      .select('file_path, file_name')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('attachments')
      .download(doc.file_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Serve as binary download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${doc.file_name}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
