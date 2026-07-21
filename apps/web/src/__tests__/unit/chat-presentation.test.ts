import { describe, it, expect } from 'vitest'
import { parseFollowups, MAX_FOLLOWUPS } from '@/lib/chat/followups'
import { hastTableToRows, rowsToCsv } from '@/lib/chat/table-export'

describe('parseFollowups', () => {
  it('parses a valid array of questions', () => {
    expect(parseFollowups('["მაჩვენე გრაფიკზე","რომელი კომპანიები?"]')).toEqual([
      'მაჩვენე გრაფიკზე',
      'რომელი კომპანიები?',
    ])
  })

  it('returns null for partial JSON (mid-stream) and non-arrays', () => {
    expect(parseFollowups('["question one","quest')).toBeNull()
    expect(parseFollowups('{"a":1}')).toBeNull()
    expect(parseFollowups('')).toBeNull()
  })

  it('drops non-string, empty, and oversized entries', () => {
    expect(parseFollowups(`[1, "", "ok", "${'x'.repeat(300)}"]`)).toEqual(['ok'])
    expect(parseFollowups('[1, null]')).toBeNull()
  })

  it('caps the number of suggestions', () => {
    const many = JSON.stringify(Array.from({ length: 10 }, (_, i) => `q${i}`))
    expect(parseFollowups(many)).toHaveLength(MAX_FOLLOWUPS)
  })
})

function el(tagName: string, ...children: unknown[]) {
  return { type: 'element', tagName, children }
}
function text(value: string) {
  return { type: 'text', value }
}

describe('hastTableToRows', () => {
  it('extracts header and body cells including nested elements', () => {
    const table = el(
      'table',
      el('thead', el('tr', el('th', text('კომპანია')), el('th', text('თანხა')))),
      el(
        'tbody',
        el('tr', el('td', el('a', text('შპს ტესტი'))), el('td', text('₾1,500'))),
        el('tr', el('td', text('სს სხვა')), el('td', text('₾200')))
      )
    )
    expect(hastTableToRows(table)).toEqual([
      ['კომპანია', 'თანხა'],
      ['შპს ტესტი', '₾1,500'],
      ['სს სხვა', '₾200'],
    ])
  })

  it('returns no rows for an empty table', () => {
    expect(hastTableToRows(el('table'))).toEqual([])
  })
})

describe('rowsToCsv', () => {
  it('quotes fields containing commas, quotes, and newlines', () => {
    expect(
      rowsToCsv([
        ['a', 'b,c'],
        ['say "hi"', 'line\nbreak'],
      ])
    ).toBe('a,"b,c"\r\n"say ""hi""","line\nbreak"')
  })
})
