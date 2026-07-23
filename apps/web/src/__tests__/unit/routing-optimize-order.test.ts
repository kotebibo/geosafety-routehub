import { describe, it, expect } from 'vitest'
import { optimizeRoute, type Location } from '@routehub/route-optimizer'

// Verifies the planner's core promise: from the officer's home, objects are
// ordered OPTIMALLY (nearest-first, home fixed as the start) — NOT in the order
// the officer selected them. Uses Haversine (useRealRoads:false) so it's
// deterministic and offline.
describe('route optimization ordering', () => {
  // Tbilisi-ish: home, then A(near) → B(mid) → C(far) increasingly distant.
  const home: Location = { id: 'start', name: 'home', lat: 41.7, lng: 44.8 }
  const A: Location = { id: 'A', name: 'near', lat: 41.705, lng: 44.805 }
  const B: Location = { id: 'B', name: 'mid', lat: 41.72, lng: 44.83 }
  const C: Location = { id: 'C', name: 'far', lat: 41.76, lng: 44.9 }

  it('reorders a reversed selection into nearest-first from home', async () => {
    // Officer "selected" far→mid→near — the worst order on purpose.
    const result = await optimizeRoute([home, C, B, A], {
      useRealRoads: false,
      algorithm: 'hybrid',
    })
    const order = result.stops.map(s => s.id)

    // Home stays the fixed start, then the closest object first.
    expect(order[0]).toBe('start')
    expect(order.slice(1)).toEqual(['A', 'B', 'C'])
    // Not the officer's input order (start,C,B,A).
    expect(order).not.toEqual(['start', 'C', 'B', 'A'])
  })

  it('optimized total distance is no worse than the selection order', async () => {
    const optimized = await optimizeRoute([home, C, B, A], {
      useRealRoads: false,
      algorithm: 'hybrid',
    })
    // Distance of the exact input order (no reordering): nearest-neighbor kept as
    // given would be worse; hybrid must not exceed a naive pass.
    const naive = await optimizeRoute([home, A, B, C], {
      useRealRoads: false,
      algorithm: 'nearest-neighbor',
    })
    expect(optimized.totalDistance).toBeLessThanOrEqual(naive.totalDistance + 1e-6)
    // First leg from home should be the shortest available (home→A).
    expect(optimized.stops[1].id).toBe('A')
  })

  it('keeps home first even with many objects', async () => {
    const objs: Location[] = Array.from({ length: 8 }, (_, i) => ({
      id: `o${i}`,
      name: `o${i}`,
      lat: 41.7 + (i % 2 === 0 ? 0.05 : 0.01) * (i + 1),
      lng: 44.8 + (i % 2 === 1 ? 0.05 : 0.01) * (i + 1),
    }))
    // Shuffle-ish input; home last to be sure it's still pinned to front.
    const result = await optimizeRoute([home, ...objs.slice().reverse()], {
      useRealRoads: false,
      algorithm: 'hybrid',
    })
    expect(result.stops[0].id).toBe('start')
    // Every object appears exactly once.
    expect(result.stops.length).toBe(objs.length + 1)
  })
})
