import { describe, it, expect } from 'vitest'
import { parseEmails } from '@/features/documents/components/EmailStep'

describe('parseEmails', () => {
  it('parses a single email', () => {
    expect(parseEmails('info@company.ge')).toEqual(['info@company.ge'])
  })

  it('parses multiple space-separated emails (real board data shape)', () => {
    expect(
      parseEmails('m.zakaradze@mail.ru khatia@princessbatumi.com hr@princessbatumi.com')
    ).toEqual(['m.zakaradze@mail.ru', 'khatia@princessbatumi.com', 'hr@princessbatumi.com'])
  })

  it('parses comma/semicolon/newline separated emails', () => {
    expect(parseEmails('a@b.ge, c@d.com;\ne@f.org')).toEqual(['a@b.ge', 'c@d.com', 'e@f.org'])
  })

  it('extracts emails embedded in Georgian text', () => {
    expect(parseEmails('დირექტორი: keti.kruashvili@safety.ge (მთავარი)')).toEqual([
      'keti.kruashvili@safety.ge',
    ])
  })

  it('handles double spaces and mixed separators', () => {
    expect(parseEmails('a@b.ge  c@d.com  /  e@f.org')).toEqual(['a@b.ge', 'c@d.com', 'e@f.org'])
  })

  it('dedupes case-insensitively, keeping first casing', () => {
    expect(parseEmails('Info@Company.ge info@company.ge')).toEqual(['Info@Company.ge'])
  })

  it('returns empty array for empty/non-string values', () => {
    expect(parseEmails('')).toEqual([])
    expect(parseEmails(null)).toEqual([])
    expect(parseEmails(undefined)).toEqual([])
    expect(parseEmails('no emails here')).toEqual([])
  })

  it('stringifies non-string values before parsing', () => {
    expect(parseEmails(12345)).toEqual([])
  })
})
