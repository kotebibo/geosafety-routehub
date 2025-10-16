/**
 * Service Type Configuration
 * Maps service codes to database UUIDs
 * 
 * NOTE: These UUIDs need to be fetched from your database
 * Run /debug page to see actual UUIDs
 */

// Service type codes (used in code)
export const SERVICE_CODES = {
  PERSONAL_DATA_PROTECTION: 'personal_data_protection',
  FIRE_SAFETY: 'fire_safety',
  LABOR_SAFETY: 'labor_safety',
  FOOD_SAFETY: 'food_safety',
  ENVIRONMENTAL: 'environmental',
} as const

// Service type UUIDs from database
// TODO: Replace these with actual UUIDs from your service_types table
export const SERVICE_TYPE_UUIDS = {
  personal_data_protection: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Replace with actual UUID
  fire_safety: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  labor_safety: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  food_safety: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  environmental: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
} as const

// Helper to get UUID from code
export function getServiceTypeUUID(code: string): string | null {
  return SERVICE_TYPE_UUIDS[code as keyof typeof SERVICE_TYPE_UUIDS] || null
}

// Service display names
export const SERVICE_NAMES = {
  [SERVICE_CODES.PERSONAL_DATA_PROTECTION]: {
    ka: 'პერსონალურ მონაცემთა დაცვა',
    en: 'Personal Data Protection',
  },
  [SERVICE_CODES.FIRE_SAFETY]: {
    ka: 'ხანძარსაფრთხოება',
    en: 'Fire Safety',
  },
  [SERVICE_CODES.LABOR_SAFETY]: {
    ka: 'შრომის უსაფრთხოება',
    en: 'Labor Safety',
  },
  [SERVICE_CODES.FOOD_SAFETY]: {
    ka: 'სურსათის უსაფრთხოება',
    en: 'Food Safety',
  },
  [SERVICE_CODES.ENVIRONMENTAL]: {
    ka: 'გარემოს დაცვა',
    en: 'Environmental Protection',
  },
} as const
