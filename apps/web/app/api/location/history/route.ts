/**
 * @swagger
 * /api/location/history:
 *   get:
 *     summary: Get location history for an inspector
 *     description: Returns chronologically ordered GPS location points for a given inspector. Defaults to the last 24 hours if no `since` parameter is provided.
 *     tags: [Location]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: inspector_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The inspector whose history to retrieve
 *       - in: query
 *         name: since
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO 8601 timestamp to fetch records from (defaults to 24 hours ago)
 *     responses:
 *       200:
 *         description: Array of location points ordered by recorded_at ascending
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   recorded_at:
 *                     type: string
 *                     format: date-time
 *                   accuracy:
 *                     type: number
 *                     nullable: true
 *                   speed:
 *                     type: number
 *                     nullable: true
 *       400:
 *         description: Missing required inspector_id parameter
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher role required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { UnauthorizedError, ForbiddenError } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const inspectorId = searchParams.get('inspector_id')
    const since = searchParams.get('since')

    if (!inspectorId) {
      return NextResponse.json({ error: 'inspector_id is required' }, { status: 400 })
    }

    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // PostGIS table not in generated types
    const { data, error } = await (supabase as any)
      .from('inspector_location_history')
      .select('lat, lng, recorded_at, accuracy, speed')
      .eq('inspector_id', inspectorId)
      .gte('recorded_at', sinceDate)
      .order('recorded_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    console.error('Location history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
