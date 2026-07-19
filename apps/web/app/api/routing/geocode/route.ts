export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'

/**
 * Address → coordinates via OpenStreetMap Nominatim.
 * Proxied server-side so we avoid client CSP restrictions and can set the
 * User-Agent Nominatim's usage policy requires. The project already uses OSM
 * (NEXT_PUBLIC_MAP_PROVIDER=openstreetmap), so no extra API key is needed.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const query = new URL(request.url).searchParams.get('q')?.trim()
    if (!query) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 })
    }

    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '5')
    // Bias toward Georgia — this is a Georgian field-ops app
    url.searchParams.set('countrycodes', 'ge')
    url.searchParams.set('accept-language', 'ka')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'RouteHub/1.0 (routehub.ge)',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
    }

    const data = (await res.json()) as Array<{
      lat: string
      lon: string
      display_name: string
    }>

    const results = data
      .map(r => ({
        lat: Number(r.lat),
        lng: Number(r.lon),
        label: r.display_name,
      }))
      .filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng))

    return NextResponse.json(results)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('Geocode error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
