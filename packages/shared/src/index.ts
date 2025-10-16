// Shared constants
export const LOCATION_TYPES = [
  'commercial',
  'residential', 
  'industrial',
  'healthcare',
  'education'
] as const

export const INSPECTION_STATUS = [
  'pending',
  'in_progress', 
  'completed',
  'cancelled'
] as const

export const PRIORITY_LEVELS = [
  'low',
  'medium',
  'high'
] as const

// Shared utility functions
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(value: number): number {
  return (value * Math.PI) / 180
}

export function estimateDuration(distanceKm: number): number {
  // Assuming average speed of 40 km/h in city
  const avgSpeed = 40
  const baseTime = (distanceKm / avgSpeed) * 60 // minutes
  const stopTime = 25 // minutes per stop
  return Math.round(baseTime + stopTime)
}

// Type guards
export function isValidLocation(location: any): boolean {
  return (
    typeof location === 'object' &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number' &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180
  )
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}