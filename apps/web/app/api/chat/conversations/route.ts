/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: List the current user's AI assistant conversations
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Conversations ordered by last activity
 *       401:
 *         description: Admin access required
 */

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  // RLS restricts rows to the caller's own conversations.
  // Cast: chat_* tables aren't in the generated Database types yet.
  const db = createServerClient() as unknown as SupabaseClient
  const { data, error } = await db
    .from('chat_conversations')
    .select('id, title, pinned, created_at, updated_at')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ conversations: data || [] })
}
