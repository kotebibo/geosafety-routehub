export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'checkin-photos'
const MAX_BYTES = 5 * 1024 * 1024

// POST (multipart: file) — upload a check-in photo, return its storage path.
// The officer uploads their own; the row is finalized when the check-in is
// created (photo_path is stored on location_checkins). Files auto-prune ~14d.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File))
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 })
    if (!file.type.startsWith('image/'))
      return NextResponse.json({ error: 'Only images allowed' }, { status: 415 })

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const path = `${session.user.id}/${stamp}.${ext}`

    const svc = createServiceClient() as any
    const { error } = await svc.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error

    return NextResponse.json({ path })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('checkin photo upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// GET ?path= — a short-lived signed URL to view a check-in photo (private bucket).
// Photos are stored under `${uploaderId}/…`, so the caller may fetch only their
// own photos; managers (admin/dispatcher) may view any officer's.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const path = new URL(request.url).searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })

    const ownerId = path.split('/')[0]
    if (ownerId !== session.user.id) {
      const supabase = createServerClient() as any
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()
      const isManager = role?.role === 'admin' || role?.role === 'dispatcher'
      if (!isManager)
        return NextResponse.json({ error: 'Cannot view another officer’s photo' }, { status: 403 })
    }

    const svc = createServiceClient() as any
    const { data, error } = await svc.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
    if (error) throw error
    return NextResponse.json({ url: data?.signedUrl ?? null })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('checkin photo url error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
