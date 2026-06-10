/**
 * @swagger
 * /api/admin/assign-role:
 *   post:
 *     summary: Assign or update a user's role
 *     description: Upserts a role for a given user. If the user already has a role, it is updated; otherwise a new role assignment is created.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, roleName]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               roleName:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: The created or updated role assignment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 user_id:
 *                   type: string
 *                   format: uuid
 *                 role:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/middleware/auth'

const assignRoleSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  roleName: z.string().min(1, 'roleName must be a non-empty string'),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()
    const { userId, roleName } = assignRoleSchema.parse(body)

    // Check if user already has a role
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .single()

    let result

    if (existing) {
      // Update existing role
      const { data, error } = await supabase
        .from('user_roles')
        .update({
          role: roleName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new role assignment
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: roleName,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error assigning role:', error)

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
