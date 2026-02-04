/**
 * Company Services API
 * POST - Save/update services for a company
 * Protected: Requires admin or dispatcher role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminOrDispatcher } from '@/middleware/auth';
import { updateCompanyServicesSchema } from '@/lib/validations/service-type.schema';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Require admin or dispatcher role to manage company services
    await requireAdminOrDispatcher();

    const body = await request.json();

    // Validate input
    const validatedData = updateCompanyServicesSchema.parse(body);
    const { companyId, services } = validatedData;

    // Get existing services for this company
    const { data: existingServices } = await supabase
      .from('company_services')
      .select('id, service_type_id')
      .eq('company_id', companyId);

    const existingServiceIds = existingServices?.map(s => s.id) || [];
    const existingServiceTypeIds = existingServices?.map(s => s.service_type_id) || [];

    // Determine which to insert, update, or delete
    const toInsert = [];
    const toUpdate = [];
    const servicesToKeep: string[] = [];

    for (const service of services) {
      const existing = existingServices?.find(
        es => es.service_type_id === service.service_type_id
      );

      if (existing) {
        // Update existing
        toUpdate.push({
          id: existing.id,
          ...service,
          company_id: companyId,
        });
        servicesToKeep.push(existing.id);
      } else {
        // Insert new
        toInsert.push({
          ...service,
          company_id: companyId,
        });
      }
    }

    // Delete services not in the new list
    const toDelete = existingServiceIds.filter(id => !servicesToKeep.includes(id));

    // Execute operations
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('company_services')
        .delete()
        .in('id', toDelete);

      if (error) throw error;
    }

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('company_services')
        .insert(toInsert);

      if (error) throw error;
    }

    if (toUpdate.length > 0) {
      for (const service of toUpdate) {
        const { id, ...updates } = service;
        const { error } = await supabase
          .from('company_services')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Services updated successfully',
      inserted: toInsert.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    });

  } catch (error: any) {
    console.error('Error saving company services:', error);

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin or dispatcher access required' }, { status: 403 });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to save services' },
      { status: 500 }
    );
  }
}
