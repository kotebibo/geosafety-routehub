/**
 * Phone number as-you-type formatting.
 *
 * Formatting rules come from libphonenumber metadata, which holds the official
 * national grouping for every country keyed by its calling code — typing
 * "+995555992212" renders "+995 555 99 22 12", "+14155552671" renders
 * "+1 415 555 2671", and so on. Input without a leading "+" is treated as a
 * national number of the default country (Georgia).
 */

import { AsYouType, type CountryCode } from 'libphonenumber-js/min'

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'GE'

/** Strip everything except digits and a single leading "+". */
export function cleanPhoneInput(value: string): string {
  const hasPlus = value.trimStart().startsWith('+')
  const digits = value.replace(/\D/g, '')
  if (!digits) return hasPlus ? '+' : ''
  return hasPlus ? `+${digits}` : digits
}

/** Format arbitrary user input into the country-specific grouped form. */
export function formatPhoneInput(
  value: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
  const cleaned = cleanPhoneInput(value)
  if (!cleaned) return ''
  return new AsYouType(defaultCountry).input(cleaned)
}

/** Count significant chars (digits and "+") in `value`, optionally only before `upTo`. */
export function countSignificantChars(value: string, upTo?: number): number {
  const slice = upTo === undefined ? value : value.slice(0, upTo)
  return (slice.match(/[\d+]/g) || []).length
}

/**
 * Map a caret that sits after `significantBefore` significant chars in the raw
 * input to its position in the formatted string, so the caret doesn't jump
 * when separators are inserted.
 */
export function caretPositionInFormatted(formatted: string, significantBefore: number): number {
  if (significantBefore <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d+]/.test(formatted[i])) {
      seen++
      if (seen === significantBefore) return i + 1
    }
  }
  return formatted.length
}
