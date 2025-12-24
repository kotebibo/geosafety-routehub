/**
 * Inspectors API
 * Get list of inspectors and create new ones
 * Protected: Requires authentication
 * - GET: All authenticated users
 * - POST: Admin only
 * - PUT: Admin only
 * - DELETE: Admin only
 */

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin } from '@/middleware/auth';
import { createInspectorSchema, updateInspectorSchema } from '@/lib/validations';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Require authentication for reading inspectors
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    
    let query = supabase
      .from('inspectors')
      .select('*')
      .order('full_name');

    // Filter by status if provided, otherwise get active ones
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Add cache headers - inspector list is relatively stable
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Error fetching inspectors:', error);

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin for creating inspectors
    await requireAdmin();

    const body = await request.json();
    
    // Validate input
    const validatedData = createInspectorSchema.parse(body);

    // Prepare inspector data
    const inspectorData = {
      full_name: validatedData.name,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      specialty: 'general', // Default
      role: 'inspector',
      status: validatedData.is_active ? 'active' : 'inactive',
      vehicle_type: validatedData.vehicle_type || null,
      license_plate: validatedData.license_plate || null,
      notes: validatedData.notes || null,
    };

    const { data, error } = await supabase
      .from('inspectors')
      .insert([inspectorData])
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'ინსპექტორი ამ ელ-ფოსტით უკვე არსებობს' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating inspector:', error);
    
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Zod validation error
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require admin for updating inspectors
    await requireAdmin();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Inspector ID is required' },
        { status: 400 }
      );
    }

    // Validate input (partial validation)
    const validatedData = updateInspectorSchema.parse(updates);

    const { data, error } = await supabase
      .from('inspectors')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating inspector:', error);
    
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require admin for deleting inspectors
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Inspector ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('inspectors')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting inspector:', error);
    
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
