/**
 * @swagger
 * /api/inspectors:
 *   get:
 *     summary: List inspectors
 *     description: Returns all inspectors ordered by name. Optionally filter by status. Requires authentication.
 *     tags: [Inspectors]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter by status (omit or "all" to return every status)
 *     responses:
 *       200:
 *         description: Array of inspector records
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create an inspector
 *     description: Creates a new inspector record. Admin only.
 *     tags: [Inspectors]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               vehicle_type:
 *                 type: string
 *               license_plate:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inspector created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Inspector with this email already exists
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update an inspector
 *     description: Updates an existing inspector by ID. Admin only.
 *     tags: [Inspectors]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *               vehicle_type:
 *                 type: string
 *               license_plate:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inspector updated
 *       400:
 *         description: Validation failed or missing ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete an inspector
 *     description: Permanently deletes an inspector by ID. Admin only.
 *     tags: [Inspectors]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Inspector ID to delete
 *     responses:
 *       200:
 *         description: Inspector deleted
 *       400:
 *         description: Missing inspector ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/middleware/auth'
import { createInspectorSchema, updateInspectorSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    // Require authentication for reading inspectors
    await requireAuth()
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    let query = supabase.from('inspectors').select('*').order('full_name')

    // Filter by status if provided, otherwise get active ones
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) throw error

    // Add cache headers - inspector list is relatively stable
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: any) {
    console.error('Error fetching inspectors:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin for creating inspectors
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()

    // Validate input
    const validatedData = createInspectorSchema.parse(body)

    // Prepare inspector data
    const inspectorData = {
      full_name: validatedData.name,
      email: validatedData.email ?? undefined,
      phone: validatedData.phone || null,
      specialty: 'general', // Default
      role: 'officer' as const,
      status: validatedData.is_active ? 'active' : 'inactive',
      vehicle_type: validatedData.vehicle_type || null,
      license_plate: validatedData.license_plate || null,
      notes: validatedData.notes || null,
    }

    const { data, error } = await supabase
      .from('inspectors')
      .insert([inspectorData as any])
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'ინსპექტორი ამ ელ-ფოსტით უკვე არსებობს' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error creating inspector:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Zod validation error
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require admin for updating inspectors
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Inspector ID is required' }, { status: 400 })
    }

    // Validate input (partial validation)
    const validatedData = updateInspectorSchema.parse(updates)

    const { data, error } = await supabase
      .from('inspectors')
      .update(validatedData as any)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating inspector:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require admin for deleting inspectors
    await requireAdmin()
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Inspector ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('inspectors').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting inspector:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
