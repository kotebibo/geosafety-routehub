/**
 * @swagger
 * /api/debug/coordinates:
 *   get:
 *     summary: Find companies with duplicate GPS coordinates
 *     description: >
 *       Scans companies for duplicate lat/lng pairs (6 decimal precision).
 *       Returns the top 10 duplicate coordinate groups. Admin only.
 *     tags: [Debug]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Duplicate coordinate analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCompanies:
 *                   type: integer
 *                 duplicateCoordinates:
 *                   type: integer
 *                   description: Number of shared coordinate pairs
 *                 companiesWithDuplicates:
 *                   type: integer
 *                 duplicates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       coordinates:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       companies:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             address:
 *                               type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
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
      if (company.lat == null || company.lng == null) return
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
