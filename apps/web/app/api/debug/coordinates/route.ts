/**
 * Debug Coordinates API - Admin only
 * GET /api/debug/coordinates
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('companies')
      .select('name, address, lat, lng')
      .limit(216)

    if (error) throw error

    // Find duplicates
    const coordMap = new Map<string, typeof data>()

    data?.forEach(company => {
      const key = `${company.lat.toFixed(6)},${company.lng.toFixed(6)}`
      if (!coordMap.has(key)) {
        coordMap.set(key, [])
      }
      coordMap.get(key)!.push(company)
    })

    const duplicates: any[] = []
    let duplicateCount = 0

    for (const [coords, companies] of coordMap.entries()) {
      if (companies.length > 1) {
        duplicateCount += companies.length
        duplicates.push({
          coordinates: coords,
          count: companies.length,
          companies: companies.map(c => ({
            name: c.name,
            address: c.address,
          })),
        })
      }
    }

    return NextResponse.json({
      totalCompanies: data?.length || 0,
      duplicateCoordinates: duplicates.length,
      companiesWithDuplicates: duplicateCount,
      duplicates: duplicates.slice(0, 10),
      message: `Found ${duplicateCount} companies sharing ${duplicates.length} coordinate pairs`,
    })
  } catch (error: any) {
    if (error?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Coordinate check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
