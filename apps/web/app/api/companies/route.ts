/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Search companies
 *     description: Live-search companies by name or tax ID for autocomplete pickers.
 *     tags: [Companies]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Free-text search across company name and tax ID
 *     responses:
 *       200:
 *         description: Array of matching companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   inn:
 *                     type: string
 *                     nullable: true
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient() as any
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    if (!search || !search.trim()) {
      return NextResponse.json([])
    }

    // Escape PostgREST or()-filter syntax characters so search terms like
    // "Ltd, Tbilisi" or "(Note)" don't break the filter parser.
    const escapedSearch = search.replace(/[\\,()]/g, '\\$&')

    const { data, error } = await supabase
      .from('companies')
      .select('id, name, tax_id')
      .or(`name.ilike.%${escapedSearch}%,tax_id.ilike.%${escapedSearch}%`)
      .order('name')
      .limit(10)

    if (error) throw error

    const results = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      inn: c.tax_id,
    }))

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error searching companies:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
