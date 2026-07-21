export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAdminOrDispatcher } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'

// One global price per fuel type. Stored as three key-value rows in app_settings.
const KEYS = {
  petrol: 'fuel_price_petrol',
  diesel: 'fuel_price_diesel',
  gas: 'fuel_price_gas',
} as const
type FuelType = keyof typeof KEYS

function parsePrice(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return isNaN(n) ? null : n
}

// GET — the global fuel price per type (₾/L). Any authenticated user.
export async function GET() {
  try {
    await requireAuth()
    const svc = createServiceClient() as any
    const { data } = await svc
      .from('app_settings')
      .select('key, value')
      .in('key', Object.values(KEYS))
    const byKey = new Map<string, string>((data || []).map((r: any) => [r.key, r.value]))
    const prices: Record<FuelType, number | null> = {
      petrol: parsePrice(byKey.get(KEYS.petrol)),
      diesel: parsePrice(byKey.get(KEYS.diesel)),
      gas: parsePrice(byKey.get(KEYS.gas)),
    }
    return NextResponse.json({ prices })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('fuel-price GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const priceField = z.number().min(0).max(100).nullable()
const putSchema = z.object({ petrol: priceField, diesel: priceField, gas: priceField })

// PUT — set all three global fuel prices in one save. Admin or dispatcher.
export async function PUT(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const prices = putSchema.parse(await request.json())

    const now = new Date().toISOString()
    const rows = (Object.keys(KEYS) as FuelType[]).map(type => ({
      key: KEYS[type],
      value: prices[type] == null ? null : String(prices[type]),
      updated_at: now,
    }))

    const svc = createServiceClient() as any
    const { error } = await svc.from('app_settings').upsert(rows, { onConflict: 'key' })
    if (error) throw error
    return NextResponse.json({ success: true, prices })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('fuel-price PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
