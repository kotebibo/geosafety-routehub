// Shared fuel-pricing constants/helpers for the routing analytics routes.
// One global price per fuel type is stored as three key-value rows in
// app_settings; an officer inherits the price for the fuel type on their profile
// unless they have a per-officer override.

/** app_settings key holding the global ₾/L price for each fuel type. */
export const FUEL_KEYS = {
  petrol: 'fuel_price_petrol',
  diesel: 'fuel_price_diesel',
  gas: 'fuel_price_gas',
} as const

export type FuelType = keyof typeof FUEL_KEYS

/** Parse a stored app_settings price value → number, or null when blank/invalid. */
export function toPrice(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return isNaN(n) ? null : n
}
