/**
 * Check Coordinates API
 * GET /api/debug/coordinates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('name, address, lat, lng')
      .limit(216); // All companies

    if (error) throw error;

    // Find duplicates
    const coordMap = new Map<string, typeof data>();
    
    data?.forEach(company => {
      const key = `${company.lat.toFixed(6)},${company.lng.toFixed(6)}`;
      if (!coordMap.has(key)) {
        coordMap.set(key, []);
      }
      coordMap.get(key)!.push(company);
    });

    const duplicates: any[] = [];
    let duplicateCount = 0;

    for (const [coords, companies] of coordMap.entries()) {
      if (companies.length > 1) {
        duplicateCount += companies.length;
        duplicates.push({
          coordinates: coords,
          count: companies.length,
          companies: companies.map(c => ({
            name: c.name,
            address: c.address,
          })),
        });
      }
    }

    return NextResponse.json({
      totalCompanies: data?.length || 0,
      duplicateCoordinates: duplicates.length,
      companiesWithDuplicates: duplicateCount,
      duplicates: duplicates.slice(0, 10), // First 10
      message: `Found ${duplicateCount} companies sharing ${duplicates.length} coordinate pairs`,
    });

  } catch (error: any) {
    console.error('Coordinate check error:', error);
    return NextResponse.json(
      { error: 'Failed to check coordinates', details: error.message },
      { status: 500 }
    );
  }
}
