/**
 * @swagger
 * /api/chat/conversations/{id}:
 *   get:
 *     summary: Get messages of one of the current user's conversations
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Messages in order
 *       401:
 *         description: Admin access required
 *       404:
 *         description: Conversation not found
 *   patch:
 *     summary: Rename or pin/unpin one of the current user's conversations
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Admin access required
 *   delete:
 *     summary: Delete one of the current user's conversations
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Admin access required
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    pinned: z.boolean().optional(),
  })
  .refine(body => body.title !== undefined || body.pinned !== undefined, {
    message: 'Nothing to update',
  })

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  // RLS restricts rows to the caller's own conversations.
  // Cast: chat_* tables aren't in the generated Database types yet.
  const db = createServerClient() as unknown as SupabaseClient
  const { data: conversation } = await db
    .from('chat_conversations')
    .select('id, title')
    .eq('id', params.id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data: messages, error } = await db
    .from('chat_messages')
    .select('message')
    .eq('conversation_id', params.id)
    .order('position')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({
    conversation,
    messages: (messages || []).map(m => m.message),
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    )
  }

  // RLS restricts rows to the caller's own conversations.
  // Cast: chat_* tables aren't in the generated Database types yet.
  const db = createServerClient() as unknown as SupabaseClient
  const { data, error } = await db
    .from('chat_conversations')
    .update(parsed.data)
    .eq('id', params.id)
    .select('id, title, pinned')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }
  return NextResponse.json({ conversation: data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const db = createServerClient() as unknown as SupabaseClient
  const { error } = await db.from('chat_conversations').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
