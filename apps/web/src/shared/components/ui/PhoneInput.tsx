'use client'

import { ChangeEvent } from 'react'

import {
  caretPositionInFormatted,
  cleanPhoneInput,
  countSignificantChars,
  formatPhoneInput,
} from '@/lib/phone/format'

import type { CountryCode } from 'libphonenumber-js/min'

interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  value: string
  onChange: (formatted: string) => void
  /** Country whose national format applies when no "+<code>" is typed. */
  defaultCountry?: CountryCode
}

/**
 * Text input that formats phone numbers as you type using the official
 * per-country grouping for the dialed country code (e.g. "+995 555 99 22 12",
 * "+1 415 555 2671"). Keeps the caret in place across reformatting and lets
 * backspace over a separator delete the digit before it.
 */
export function PhoneInput({ value, onChange, defaultCountry, ...props }: PhoneInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const raw = input.value
    const caret = input.selectionStart ?? raw.length

    let significantBefore = countSignificantChars(raw, caret)
    let cleaned = cleanPhoneInput(raw)

    // Backspace over a separator removes no digits, so reformatting would put
    // the separator right back — delete the digit before the caret instead.
    if (raw.length < value.length && cleaned === cleanPhoneInput(value) && significantBefore > 0) {
      cleaned = cleaned.slice(0, significantBefore - 1) + cleaned.slice(significantBefore)
      significantBefore -= 1
    }

    const formatted = formatPhoneInput(cleaned, defaultCountry)
    const nextCaret = caretPositionInFormatted(formatted, significantBefore)

    // Write the DOM directly so the caret can be positioned synchronously even
    // when React bails out of re-rendering (formatted value unchanged).
    input.value = formatted
    input.setSelectionRange(nextCaret, nextCaret)
    onChange(formatted)
  }

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={handleChange}
      {...props}
    />
  )
}
