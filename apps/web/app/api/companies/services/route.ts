/**
 * @swagger
 * /api/companies/services:
 *   post:
 *     summary: Save or update services for a company
 *     description: >
 *       Syncs the full list of services for a company. Inserts new services,
 *       updates existing ones, and deletes any that are no longer in the list.
 *       Requires admin or dispatcher role.
 *     tags: [Services]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId, services]
 *             properties:
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     service_type_id:
 *                       type: string
 *                       format: uuid
 *                     next_inspection_date:
 *                       type: string
 *                       format: date
 *                     priority:
 *                       type: string
 *                     status:
 *                       type: string
 *                     assigned_inspector_id:
 *                       type: string
 *                       format: uuid
 *     responses:
 *       200:
 *         description: Services synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 inserted:
 *                   type: integer
 *                 updated:
 *                   type: integer
 *                 deleted:
 *                   type: integer
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { updateCompanyServicesSchema } from '@/lib/validations/service-type.schema'

export async function POST(request: NextRequest) {
  try {
    // Require admin or dispatcher role to manage company services
    await requireAdminOrDispatcher()
    const supabase = createServerClient()

    const body = await request.json()

    // Validate input
    const validatedData = updateCompanyServicesSchema.parse(body)
    const { companyId, services } = validatedData

    // Get existing services for this company
    const { data: existingServices } = await supabase
      .from('company_services')
      .select('id, service_type_id')
      .eq('company_id', companyId)

    const existingServiceIds = existingServices?.map(s => s.id) || []
    const existingServiceTypeIds = existingServices?.map(s => s.service_type_id) || []

    // Determine which to insert, update, or delete
    const toInsert = []
    const toUpdate = []
    const servicesToKeep: string[] = []

    for (const service of services) {
      const existing = existingServices?.find(es => es.service_type_id === service.service_type_id)

      if (existing) {
        // Update existing
        toUpdate.push({
          id: existing.id,
          ...service,
          company_id: companyId,
        })
        servicesToKeep.push(existing.id)
      } else {
        // Insert new
        toInsert.push({
          ...service,
          company_id: companyId,
        })
      }
    }

    // Delete services not in the new list
    const toDelete = existingServiceIds.filter(id => !servicesToKeep.includes(id))

    // Execute operations
    if (toDelete.length > 0) {
      const { error } = await supabase.from('company_services').delete().in('id', toDelete)

      if (error) throw error
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('company_services').insert(toInsert)

      if (error) throw error
    }

    if (toUpdate.length > 0) {
      for (const service of toUpdate) {
        const { id, ...updates } = service
        const { error } = await supabase.from('company_services').update(updates).eq('id', id)

        if (error) throw error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Services updated successfully',
      inserted: toInsert.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    })
  } catch (error: any) {
    console.error('Error saving company services:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin or dispatcher access required' }, { status: 403 })
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
