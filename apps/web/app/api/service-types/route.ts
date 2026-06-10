/**
 * @swagger
 * /api/service-types:
 *   get:
 *     summary: List all service types
 *     description: Returns all service types ordered by name. Cached for 5 minutes.
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Array of service type objects
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
 *                   name_ka:
 *                     type: string
 *                   is_active:
 *                     type: boolean
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new service type
 *     description: Admin only. Validates input with Zod schema.
 *     tags: [Services]
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
 *               name_ka:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Created service type object
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update a service type
 *     description: Admin only. Requires id in the request body.
 *     tags: [Services]
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
 *               name:
 *                 type: string
 *               name_ka:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated service type object
 *       400:
 *         description: Missing id or validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a service type
 *     description: Admin only. Pass id as query parameter.
 *     tags: [Services]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service type ID to delete
 *     responses:
 *       200:
 *         description: Deletion successful
 *       400:
 *         description: Missing id parameter
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/middleware/auth'
import {
  createServiceTypeSchema,
  updateServiceTypeSchema,
} from '@/lib/validations/service-type.schema'

// GET - List all service types
export async function GET() {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase.from('service_types').select('*').order('name')

    if (error) throw error

    // Add cache headers - service types change rarely
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error: any) {
    console.error('Error fetching service types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new service type (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Require admin role to create service types
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()

    // Validate input
    const validatedData = createServiceTypeSchema.parse(body)

    const { data, error } = await supabase
      .from('service_types')
      .insert(validatedData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating service type:', error)

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

// PUT - Update service type (Admin only)
export async function PUT(request: NextRequest) {
  try {
    // Require admin role to update service types
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Validate input
    const validatedData = updateServiceTypeSchema.parse(updates)

    const { data, error } = await supabase
      .from('service_types')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating service type:', error)

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

// DELETE - Delete service type (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Require admin role to delete service types
    await requireAdmin()
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('service_types').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting service type:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
