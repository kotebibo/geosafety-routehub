/**
 * @swagger
 * /api/health/analyze:
 *   post:
 *     summary: AI analysis of system health
 *     description: >
 *       Streams a short AI-generated diagnosis of the current health snapshot
 *       against the persisted health_check_logs baseline (fetched server-side).
 *       Plain text stream. Requires admin role.
 *     tags: [Health]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current]
 *             properties:
 *               current:
 *                 type: object
 *                 description: Health snapshot as returned by GET /api/health
 *               locale:
 *                 type: string
 *                 enum: [ka, en]
 *     responses:
 *       200:
 *         description: Streamed AI analysis (text/plain)
 *       401:
 *         description: Admin access required
 */

import { streamText } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getChatModel } from '@/lib/chat/model'
import { summarizeHealthForAI, type HealthHistoryRow } from '@/lib/health/ai-summary'

export const runtime = 'nodejs'
export const maxDuration = 60

const checkSchema = z.object({
  name: z.string().max(100),
  status: z.enum(['ok', 'slow', 'error']),
  time_ms: z.number(),
  result: z.unknown().optional(),
  error: z.string().max(500).optional(),
})

const bodySchema = z.object({
  current: z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: z.string(),
    checks: z.array(checkSchema).max(30),
    summary: z.object({
      total: z.number(),
      ok: z.number(),
      slow: z.number(),
      failed: z.number(),
    }),
  }),
  locale: z.enum(['ka', 'en']).default('ka'),
})

const SYSTEM_PROMPT = `You are the SRE assistant for RouteHub — a Next.js app on Vercel backed by Supabase (Postgres) instances. You are given one current health snapshot and a 24h baseline from persisted checks. Produce a short, actionable diagnosis for an administrator.

CHECK MEANINGS:
- db_ping / rls_query: primary Supabase DB query latency (rls_query goes through row-level security).
- auth_latency: Supabase Auth round-trip.
- storage: Supabase Storage bucket listing.
- team2_ping / team3_ping: secondary Supabase instances (other prod teams).
- *_count / recent_checkins: table counts — their value matters less than their latency; a count of 0 on recent_checkins just means no site visits in 24h, not an outage.

RULES:
- Use ONLY the numbers provided. Never invent metrics or history.
- Compare current values against the provided baselines; call out meaningful deviations (roughly 2x baseline or crossing the 2000ms slow threshold), and say when everything is normal.
- Typical causes to consider: Supabase cold start / free-tier pause, network/region latency (checks run from Vercel), RLS policy cost, a slow table scan, an instance being down.
- Keep it under ~180 words. Structure: one-line verdict in bold, then "Anomalies", "Likely causes", "Recommendations" sections (omit a section if empty). Markdown, no tables, no code blocks.
- Recommendations must be concrete and read-only-safe (e.g. "re-run the check", "check Supabase dashboard for Team 2", "investigate RLS policy on board_items") — you cannot change anything yourself.`

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    )
  }
  const { current, locale } = parsed.data

  // Baseline comes from the server, not the client — last 24h of persisted logs.
  const supabase = createServerClient() as any
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('health_check_logs')
    .select('status, avg_ms, max_ms, checks, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200)

  const summary = summarizeHealthForAI(current, (logs || []) as HealthHistoryRow[])

  const result = streamText({
    model: getChatModel(),
    system: SYSTEM_PROMPT,
    prompt:
      `Respond in ${locale === 'ka' ? 'Georgian' : 'English'}.\n\n` + `Health data:\n${summary}`,
  })

  return result.toTextStreamResponse()
}
