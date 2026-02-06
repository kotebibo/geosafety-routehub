/**
 * Company Services API
 * Get company services with filters
 * Protected: Requires authentication
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: Request) {
  try {
    // Require authentication to view company services
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const serviceTypeId = searchParams.get('service_type_id');
    const inspectorId = searchParams.get('inspector_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('company_services')
      .select(`
        id,
        company_id,
        service_type_id,
        next_inspection_date,
        last_inspection_date,
        priority,
        status,
        assigned_inspector_id,
        company:companies (
          id,
          name,
          address,
          lat,
          lng
        ),
        service_type:service_types (
          name,
          name_ka
        )
      `)
      .order('next_inspection_date', { ascending: true });

    // Filter by inspector if provided
    if (inspectorId) {
      query = query.eq('assigned_inspector_id', inspectorId);
    }

    // Filter by service type if provided
    if (serviceTypeId) {
      query = query.eq('service_type_id', serviceTypeId);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching company services:', error);

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch company services', details: error.message },
      { status: 500 }
    );
  }
}
