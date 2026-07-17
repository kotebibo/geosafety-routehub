import { describe, it, expect } from 'vitest'
import { parseCoordinates, haversineMeters, formatDuration } from '@/lib/geo-utils'

// ── parseCoordinates ────────────────────────────────────────────────

describe('parseCoordinates', () => {
  // ---------- Google Maps URLs ----------

  it('parses a Google Maps URL with query= decimal coords', () => {
    const text =
      'Altitude: 490.2m Latitude: N 41°42\'54.36" Longitude: E 44°49\'26.16" https://maps.google.com/?query=41.7151,44.8271'
    expect(parseCoordinates(text)).toEqual({ lat: 41.7151, lng: 44.8271 })
  })

  it('parses a Google Maps URL with @lat,lng path', () => {
    const text = 'https://www.google.com/maps/@41.7151,44.8271,15z'
    expect(parseCoordinates(text)).toEqual({ lat: 41.7151, lng: 44.8271 })
  })

  // ---------- DMS ----------

  it('parses DMS long-form with N/E directions (no URL)', () => {
    const text = 'Latitude: N 41°43\'21.46680" Longitude: E 44°47\'10.20"'
    const result = parseCoordinates(text)
    expect(result).not.toBeNull()
    expect(result!.lat).toBeCloseTo(41 + 43 / 60 + 21.4668 / 3600, 6)
    expect(result!.lng).toBeCloseTo(44 + 47 / 60 + 10.2 / 3600, 6)
  })

  it('parses DMS long-form with S/W directions as negative', () => {
    const text = 'Latitude: S 41°43\'21.46680" Longitude: W 44°47\'10.20"'
    const result = parseCoordinates(text)
    expect(result).not.toBeNull()
    expect(result!.lat).toBeLessThan(0)
    expect(result!.lng).toBeLessThan(0)
  })

  it('parses DMS with the "atitude:" typo (missing leading L on Latitude only)', () => {
    const text = 'atitude: N 41°43\'21.46680" Longitude: E 44°47\'10.20"'
    const result = parseCoordinates(text)
    expect(result).not.toBeNull()
    expect(result!.lat).toBeCloseTo(41 + 43 / 60 + 21.4668 / 3600, 6)
  })

  it('parses altitude-first DMS text (Altitude appears before Latitude)', () => {
    const text = 'Altitude: 490.2m Latitude: N 41°43\'21.46680" Longitude: E 44°47\'10.20"'
    const result = parseCoordinates(text)
    expect(result).not.toBeNull()
    expect(result!.lat).toBeCloseTo(41 + 43 / 60 + 21.4668 / 3600, 6)
    expect(result!.lng).toBeCloseTo(44 + 47 / 60 + 10.2 / 3600, 6)
  })

  it('parses compact DMS with no labels', () => {
    const text = `41°43'17.2"N 44°46'12.5"E`
    const result = parseCoordinates(text)
    expect(result).not.toBeNull()
    expect(result!.lat).toBeCloseTo(41 + 43 / 60 + 17.2 / 3600, 6)
    expect(result!.lng).toBeCloseTo(44 + 46 / 60 + 12.5 / 3600, 6)
  })

  // ---------- Decimal pairs ----------

  it('parses a comma-separated decimal pair with a space', () => {
    expect(parseCoordinates('41.7151, 44.8271')).toEqual({ lat: 41.7151, lng: 44.8271 })
  })

  it('parses a comma-separated decimal pair without a space', () => {
    expect(parseCoordinates('41.7151,44.8271')).toEqual({ lat: 41.7151, lng: 44.8271 })
  })

  it('parses a decimal pair with trailing text', () => {
    expect(parseCoordinates('41.7151, 44.8271 some address junk')).toEqual({
      lat: 41.7151,
      lng: 44.8271,
    })
  })

  it('parses a space-separated decimal pair', () => {
    expect(parseCoordinates('41.430795 45.101454')).toEqual({ lat: 41.430795, lng: 45.101454 })
  })

  // ---------- Invalid input ----------

  it('returns null for garbage strings', () => {
    expect(parseCoordinates('not a coordinate at all')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseCoordinates('')).toBeNull()
  })

  it('returns null for a whitespace-only string', () => {
    expect(parseCoordinates('   ')).toBeNull()
  })

  it('returns null for out-of-range decimal coordinates', () => {
    expect(parseCoordinates('91.0, 44.8271')).toBeNull()
    expect(parseCoordinates('41.7151, 181.0')).toBeNull()
  })

  it('returns null for out-of-range DMS coordinates', () => {
    const text = `100°43'17.2"N 44°46'12.5"E`
    expect(parseCoordinates(text)).toBeNull()
  })

  it('returns null for a short link with no embedded coords', () => {
    expect(parseCoordinates('https://maps.app.goo.gl/abcd1234')).toBeNull()
  })

  // ---------- Non-string / object inputs ----------

  it('returns null for null and undefined', () => {
    expect(parseCoordinates(null)).toBeNull()
    expect(parseCoordinates(undefined)).toBeNull()
  })

  it('returns null for a number', () => {
    expect(parseCoordinates(41.7151)).toBeNull()
  })

  it('parses a valid { lat, lng } object', () => {
    expect(parseCoordinates({ lat: 41.7151, lng: 44.8271 })).toEqual({
      lat: 41.7151,
      lng: 44.8271,
    })
  })

  it('returns null for an out-of-range { lat, lng } object', () => {
    expect(parseCoordinates({ lat: 200, lng: 44.8271 })).toBeNull()
  })

  it('returns null for a plain object without lat/lng', () => {
    expect(parseCoordinates({ foo: 'bar' })).toBeNull()
  })
})

// ── haversineMeters ─────────────────────────────────────────────────

describe('haversineMeters', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMeters(41.7151, 44.8271, 41.7151, 44.8271)).toBe(0)
  })

  it('computes the distance between two known Tbilisi points (~1km apart)', () => {
    // Freedom Square to Rustaveli Ave/Kostava St, Tbilisi — real ~1.05km pair
    const distance = haversineMeters(41.6934, 44.8015, 41.7028, 44.7975)
    expect(distance).toBeGreaterThan(900)
    expect(distance).toBeLessThan(1200)
  })

  it('is symmetric', () => {
    const a = haversineMeters(41.6934, 44.8015, 41.7028, 44.7975)
    const b = haversineMeters(41.7028, 44.7975, 41.6934, 44.8015)
    expect(a).toBeCloseTo(b, 9)
  })
})

// ── formatDuration ──────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats under an hour in Georgian by default', () => {
    expect(formatDuration(45)).toBe('45წთ')
  })

  it('formats under an hour in English', () => {
    expect(formatDuration(45, 'en')).toBe('45m')
  })

  it('formats an exact hour with no minute suffix', () => {
    expect(formatDuration(120, 'ka')).toBe('2სთ')
    expect(formatDuration(120, 'en')).toBe('2h')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(125, 'ka')).toBe('2სთ 5წთ')
    expect(formatDuration(125, 'en')).toBe('2h 5m')
  })

  it('formats 0 minutes', () => {
    expect(formatDuration(0)).toBe('0წთ')
  })
})
