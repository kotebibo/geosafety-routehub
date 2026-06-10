/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users with roles
 *     description: Returns all users ordered by creation date, each merged with their role from user_roles.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of users with their assigned roles
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
 *                   email:
 *                     type: string
 *                   full_name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                     nullable: true
 *                   is_active:
 *                     type: boolean
 *                   role:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       role:
 *                         type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new user account
 *     description: Creates a user in Supabase Auth (auto-confirmed), inserts a profile in the users table, and optionally assigns a role.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, full_name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               full_name:
 *                 type: string
 *                 minLength: 1
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       409:
 *         description: User with this email already exists
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update a user profile
 *     description: Updates user fields (full_name, phone, is_active) by user ID.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated user object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
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
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/middleware/auth'

const updateUserSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
})

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  role: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createServerClient()

    // Fetch users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) throw usersError

    // Fetch all roles
    const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*')

    if (rolesError) throw rolesError

    // Merge users with their roles
    const usersWithRoles = (users || []).map((user: any) => ({
      ...user,
      role: roles?.find((r: any) => r.user_id === user.id) || null,
    }))

    return NextResponse.json(usersWithRoles)
  } catch (error: any) {
    console.error('Error fetching users:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { email, password, full_name, phone, role } = createUserSchema.parse(body)

    // Use service role client for admin.createUser
    const serviceClient = createServiceClient()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm since admin is creating
      user_metadata: { full_name },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
      }
      throw authError
    }

    // Update profile in users table
    await serviceClient.from('users').upsert({
      id: authData.user.id,
      email,
      full_name,
      phone: phone || null,
      is_active: true,
    })

    // Assign role if provided
    if (role) {
      await serviceClient.from('user_roles').upsert({
        user_id: authData.user.id,
        role: role,
      })
    }

    return NextResponse.json({ success: true, userId: authData.user.id }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)

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

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createServerClient()

    const body = await request.json()
    const { userId, ...updates } = updateUserSchema.parse(body)

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.full_name !== undefined) payload.full_name = updates.full_name
    if (updates.phone !== undefined) payload.phone = updates.phone
    if (updates.is_active !== undefined) payload.is_active = updates.is_active

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating user:', error)

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
