/**
 * Admin Assign Role API
 * Assigns a role to a user (server-side protected)
 * Protected: Admin only
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/middleware/auth'

const assignRoleSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  roleName: z.string().min(1, 'roleName must be a non-empty string'),
  inspectorId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()
    const { userId, roleName, inspectorId } = assignRoleSchema.parse(body)

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
          inspector_id: inspectorId || null,
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
          inspector_id: inspectorId || null,
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
