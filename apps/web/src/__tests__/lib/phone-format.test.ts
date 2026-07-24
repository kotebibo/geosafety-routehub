import { describe, it, expect } from 'vitest'

import {
  caretPositionInFormatted,
  cleanPhoneInput,
  countSignificantChars,
  formatPhoneInput,
} from '@/lib/phone/format'

describe('cleanPhoneInput', () => {
  it('keeps digits and a single leading plus', () => {
    expect(cleanPhoneInput('+995 (555) 99-22-12')).toBe('+995555992212')
    expect(cleanPhoneInput('555 99 22 12')).toBe('555992212')
    expect(cleanPhoneInput('abc')).toBe('')
    expect(cleanPhoneInput('+')).toBe('+')
    expect(cleanPhoneInput('')).toBe('')
  })
})

describe('formatPhoneInput', () => {
  it('formats Georgian international numbers as +995 XXX XX XX XX', () => {
    expect(formatPhoneInput('+995555992212')).toBe('+995 555 99 22 12')
  })

  it('formats partial input progressively', () => {
    expect(formatPhoneInput('+995')).toBe('+995')
    expect(formatPhoneInput('+9955')).toBe('+995 5')
    expect(formatPhoneInput('+9955559')).toBe('+995 555 9')
    expect(formatPhoneInput('+995555992')).toBe('+995 555 99 2')
  })

  it('formats national input using the default country (GE)', () => {
    expect(formatPhoneInput('555992212')).toBe('555 99 22 12')
  })

  it('applies each calling code’s own country format', () => {
    expect(formatPhoneInput('+14155552671')).toBe('+1 415 555 2671') // US
    expect(formatPhoneInput('+447911123456')).toBe('+44 7911 123456') // UK
    expect(formatPhoneInput('+493012345678')).toBe('+49 30 12345678') // Germany
    expect(formatPhoneInput('+33612345678')).toBe('+33 6 12 34 56 78') // France
    expect(formatPhoneInput('+380501234567')).toBe('+380 50 123 4567') // Ukraine
  })

  it('ignores letters and stray punctuation in the input', () => {
    expect(formatPhoneInput('+995 (555) 99-22-12abc')).toBe('+995 555 99 22 12')
  })

  it('returns empty string for empty input', () => {
    expect(formatPhoneInput('')).toBe('')
    expect(formatPhoneInput('   ')).toBe('')
  })
})

describe('countSignificantChars', () => {
  it('counts digits and plus, optionally up to a caret position', () => {
    expect(countSignificantChars('+995 555 99 22 12')).toBe(13)
    expect(countSignificantChars('+995 555', 5)).toBe(4) // "+995 " → +,9,9,5
    expect(countSignificantChars('+995 555', 0)).toBe(0)
  })
})

describe('caretPositionInFormatted', () => {
  it('places the caret after the same number of significant chars', () => {
    // after "+995" (4 significant) in "+995 555 99 22 12" → index 4
    expect(caretPositionInFormatted('+995 555 99 22 12', 4)).toBe(4)
    // after "+9955" (5 significant) → past the space, index 6
    expect(caretPositionInFormatted('+995 555 99 22 12', 5)).toBe(6)
    expect(caretPositionInFormatted('+995 555 99 22 12', 0)).toBe(0)
    // beyond the end clamps to length
    expect(caretPositionInFormatted('+995 555', 99)).toBe(8)
  })
})
