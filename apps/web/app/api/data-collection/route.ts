/**
 * @swagger
 * /api/data-collection:
 *   post:
 *     summary: Submit a new data collection entry
 *     description: >
 *       Creates a board item in all data_collection boards with company info,
 *       GPS coordinates, and service details. Used by field inspectors.
 *     tags: [Data Collection]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sk_code, company_name, services, lat, lng]
 *             properties:
 *               sk_code:
 *                 type: string
 *                 description: Company registration code
 *               company_name:
 *                 type: string
 *               services:
 *                 type: string
 *                 description: Comma-separated service names
 *               lat:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               lng:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *               notes:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Entry created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No data collection board found
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get recent data collection entries for the current user
 *     description: >
 *       Returns the 20 most recent board items created by the authenticated user
 *       in data_collection boards.
 *     tags: [Data Collection]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of data collection entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   data:
 *                     type: object
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/middleware/auth'
import { z } from 'zod'

const createEntrySchema = z.object({
  sk_code: z.string().min(1),
  company_name: z.string().min(1),
  services: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  notes: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const supabase = createServerClient()
    const body = await request.json()
    const validated = createEntrySchema.parse(body)

    const createdBy = session.user.id

    // Find all data_collection boards
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('board_type', 'data_collection')

    if (!boards || boards.length === 0) {
      return NextResponse.json(
        { error: 'No data collection board found. Please create one first.' },
        { status: 404 }
      )
    }

    const coordinates = `${validated.lat.toFixed(6)}, ${validated.lng.toFixed(6)}`
    const results = []

    for (const board of boards) {
      // Get first group
      const { data: groups } = await supabase
        .from('board_groups')
        .select('id')
        .eq('board_id', board.id)
        .order('position', { ascending: true })
        .limit(1)

      const groupId = groups?.[0]?.id || null

      // Get item count for position
      const { count } = await supabase
        .from('board_items')
        .select('*', { count: 'exact', head: true })
        .eq('board_id', board.id)

      const { data: item, error: insertError } = await supabase
        .from('board_items')
        .insert({
          board_id: board.id,
          group_id: groupId,
          position: count || 0,
          name: validated.company_name,
          created_by: createdBy,
          data: {
            sk_code: validated.sk_code,
            company_name: validated.company_name,
            services: validated.services,
            coordinates,
            accuracy: validated.accuracy ? Math.round(validated.accuracy) : null,
            notes: validated.notes || '',
          },
          status: 'default',
        })
        .select()
        .single()

      if (insertError) {
        console.error(`Failed to insert into board ${board.id}:`, insertError)
      } else {
        results.push(item)
      }
    }

    return NextResponse.json(results[0] || {}, { status: 201 })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Data collection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const supabase = createServerClient()

    const createdBy = session.user.id

    // Find data_collection boards
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('board_type', 'data_collection')

    if (!boards || boards.length === 0) {
      return NextResponse.json([])
    }

    const boardIds = boards.map(b => b.id)

    const { data, error } = await supabase
      .from('board_items')
      .select('id, name, data, created_at')
      .in('board_id', boardIds)
      .eq('created_by', createdBy)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('Data collection fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
