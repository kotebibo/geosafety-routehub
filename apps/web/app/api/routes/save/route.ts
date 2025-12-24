/**
 * Enhanced Save Route API Endpoint (Phase 4)
 * POST /api/routes/save
 * Service-aware route saving with inspection tracking
 * Protected: Requires authentication (admin/dispatcher)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminOrDispatcher } from '@/middleware/auth';
import { createRouteSchema } from '@/lib/validations';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface SaveRouteRequest {
  name: string;
  date: string; // YYYY-MM-DD
  inspectorId?: string;
  serviceTypeId?: string; // NEW: Service type for this route
  startTime?: string; // HH:mm
  totalDistance: number;
  totalDuration?: number;
  optimizationType?: string;
  routeGeometry?: number[][];
  stops: Array<{
    companyId: string;
    companyServiceId?: string; // NEW: Link to specific service
    position: number;
    distanceFromPrevious?: number;
    durationFromPrevious?: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Require admin or dispatcher role to save routes
    await requireAdminOrDispatcher();

    const body: SaveRouteRequest = await request.json();

    // Validate input
    if (!body.name || !body.date || !body.stops || body.stops.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, date, stops' },
        { status: 400 }
      );
    }

    // Insert route with service_type_id
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert({
        name: body.name,
        date: body.date,
        inspector_id: body.inspectorId || null,
        service_type_id: body.serviceTypeId || null, // NEW
        status: 'planned',
        start_time: body.startTime || null,
        total_distance_km: body.totalDistance,
        total_duration_minutes: body.totalDuration || null,
        optimization_type: body.optimizationType || 'distance',
        route_geometry: body.routeGeometry ? JSON.stringify(body.routeGeometry) : null,
      })
      .select()
      .single();

    if (routeError) {
      console.error('Route insert error:', routeError);
      return NextResponse.json(
        { error: 'Failed to create route', details: routeError.message },
        { status: 500 }
      );
    }

    // Insert route stops
    const stops = body.stops.map(stop => ({
      route_id: route.id,
      company_id: stop.companyId,
      position: stop.position,
      distance_from_previous_km: stop.distanceFromPrevious || 0,
      duration_from_previous_minutes: stop.durationFromPrevious || null,
      status: 'pending',
    }));

    const { error: stopsError } = await supabase
      .from('route_stops')
      .insert(stops);

    if (stopsError) {
      console.error('Route stops insert error:', stopsError);
      await supabase.from('routes').delete().eq('id', route.id);
      return NextResponse.json(
        { error: 'Failed to create route stops', details: stopsError.message },
        { status: 500 }
      );
    }

    // NEW: Service-aware route saving
    if (body.serviceTypeId && body.inspectorId) {
      // Get service type details for frequency calculation
      const { data: serviceType } = await supabase
        .from('service_types')
        .select('default_frequency_days')
        .eq('id', body.serviceTypeId)
        .single();

      const frequencyDays = serviceType?.default_frequency_days || 90;

      // Update company_services for each stop
      for (const stop of body.stops) {
        if (stop.companyServiceId) {
          // Calculate next inspection date
          const routeDate = new Date(body.date);
          const nextDate = new Date(routeDate);
          nextDate.setDate(nextDate.getDate() + frequencyDays);

          // Update company service
          await supabase
            .from('company_services')
            .update({
              last_inspection_date: body.date,
              next_inspection_date: nextDate.toISOString().split('T')[0],
              assigned_inspector_id: body.inspectorId,
            })
            .eq('id', stop.companyServiceId);

          // Create placeholder inspection_history record
          await supabase
            .from('inspection_history')
            .insert({
              company_id: stop.companyId,
              service_type_id: body.serviceTypeId,
              inspector_id: body.inspectorId,
              route_id: route.id,
              inspection_date: body.date,
              status: 'in_progress', // Will be updated when route is completed
              notes: `Route: ${body.name}`,
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        name: route.name,
        date: route.date,
        serviceTypeId: body.serviceTypeId,
        totalStops: body.stops.length,
      },
      message: 'Route saved successfully! Inspection dates updated.',
    });

  } catch (error) {
    console.error('Save route error:', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.name === 'UnauthorizedError') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to save route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
